import type { NodeDocumentationContext } from './documentationContext';
import type { TemplateLinks } from './documentationTemplates';
import type { BpmnProcessNode } from './bpmnProcessGraph';
import { generateChatCompletion, isLlmEnabled } from './llmClient';
import { enrichNodeContextWithStructuralInfo } from './structuralInfoEnricher';
import type { ProcessPath } from './bpmnFlowExtractor';
import type { FlowGraph } from './bpmnFlowExtractor';
import { saveLlmDebugArtifact } from './llmDebugStorage';
import type { LlmProvider } from './llmClientAbstraction';
import { getDefaultLlmProvider } from './llmClients';
import { LocalLlmUnavailableError } from './llmClients/localLlmClient';
import { CloudLlmAccountInactiveError, CloudLlmRateLimitError } from './llmClients/cloudLlmClient';
import {
  getFeaturePrompt,
  getEpicPrompt,
  getBusinessRulePrompt,
} from './promptLoader';
import {
  getPromptForDocType,
} from './llmDocumentationShared';
import type { DocType } from './llmProfiles';
import { getLlmProfile } from './llmProfiles';
import {
  validateBusinessRuleJson,
  validateFeatureGoalJson,
  validateEpicJson,
  validateHtmlContent,
  logValidationResult,
} from './llmValidation';
import { resolveLlmProvider } from './llmProviderResolver';
import { generateWithFallback } from './llmFallback';
import { logLlmEvent, extractErrorCode } from './llmLogging';
import { estimatePromptTokens } from './tokenUtils';
import {
  buildFeatureGoalJsonSchema,
  buildEpicJsonSchema,
  buildBusinessRuleJsonSchema,
} from './llmJsonSchemas';

export type DocumentationDocType = 'feature' | 'epic' | 'businessRule';

// Själva prompterna (system/instruction) hämtas från externa markdown-filer
// via FEATURE_EPIC_PROMPT och DMN_BUSINESSRULE_PROMPT. Den här modulen
// ansvarar för att bygga upp JSON-input från BPMN-kontexten.

export interface DocumentationLlmResult {
  text: string;
  provider: LlmProvider;
  fallbackUsed: boolean;
  latencyMs?: number;
  /**
   * Validerad JSON-modell (Feature/Epic/BusinessRule) om valideringen lyckades.
   * Används för t.ex. scenariomapping/testdesign, inte för HTML-renderingen.
   */
  docJson?: unknown;
}

export async function generateDocumentationWithLlm(
  docType: DocumentationDocType,
  context: NodeDocumentationContext,
  links: TemplateLinks,
  llmProvider?: LlmProvider,
  localAvailable: boolean = false,
  allowFallback: boolean = true,
  childrenDocumentation?: Map<string, ChildNodeDocumentation>,
  abortSignal?: AbortSignal,
  structuralInfo?: { paths: ProcessPath[]; flowGraph?: FlowGraph },
): Promise<DocumentationLlmResult | null> {
  if (!isLlmEnabled()) return null;

  // Berika context med strukturell information om tillgänglig
  const enrichedContext = structuralInfo
    ? enrichNodeContextWithStructuralInfo(context, structuralInfo.paths, structuralInfo.flowGraph)
    : context;

  const { processContext, currentNodeContext } = buildContextPayload(enrichedContext, links, childrenDocumentation);
  const docLabel =
    docType === 'feature'
      ? 'Feature'
      : docType === 'epic'
      ? 'Epic'
      : 'BusinessRule';

  // Hämta prompt via central promptLoader (reusing shared logic)
  const basePrompt = getPromptForDocType(docType);

  // Resolvera provider med smart logik
  const globalDefault = getDefaultLlmProvider();
  const resolution = resolveLlmProvider({
    userChoice: llmProvider,
    globalDefault,
    allowFallback,
  });

  const profileDocType: DocType =
    docType === 'businessRule' ? 'businessRule' : docType === 'feature' ? 'feature' : 'epic';

  // JSON-input som skickas till LLM enligt promptdefinitionerna.
  // Inkludera strukturell information om den finns
  const llmInput: any = {
    type: docLabel,
    processContext,
    currentNodeContext,
  };

  // Lägg till strukturell information om den finns
  if ('structuralInfo' in enrichedContext && enrichedContext.structuralInfo) {
    llmInput.structuralInfo = enrichedContext.structuralInfo;
  }

  const userPrompt = JSON.stringify(llmInput, null, 2);

  // Håller senaste validerade JSON-modellen (om vi lyckas parsa + validera)
  let lastValidDoc: unknown | null = null;
  
  // Identifier för debugging
  const identifier = `${context.node.bpmnFile || 'unknown'}-${context.node.bpmnElementId || context.node.id}`;

  // Valideringsfunktion för response
  const validateResponse = (response: string): { valid: boolean; errors: string[] } => {
    // Logga rå LLM-respons INNAN sanitizering för debugging
    saveLlmDebugArtifact('doc-raw', identifier, response).catch(err => {
      console.warn('[LLM Debug] Failed to save raw response:', err);
    });
    
    // Logga till konsol också (trunkera om för lång)
    const preview = response.length > 2000 
      ? response.slice(0, 1000) + '\n\n...[trunkated ' + (response.length - 2000) + ' chars]...\n\n' + response.slice(-1000)
      : response;
    console.log(`[LLM Raw Response] ${docType} for ${identifier}:`, preview);
    
    try {
      let jsonText = response.trim();

      // OBS: Med structured outputs borde Claude returnera ren JSON, men vi hanterar fallback
      // Använd alltid robust parsing för att hantera markdown-code blocks, kommentarer och extra text
      
      // Steg 1: Ta bort markdown-code blocks (```json ... ``` eller ``` ... ```)
      jsonText = jsonText.replace(/```(?:json|javascript)?/gi, '').replace(/```/g, '').trim();
      
      // Steg 1.1: Ta bort JSON-kommentarer (// och /* */)
      // Ta bort single-line comments (// ...)
      jsonText = jsonText.replace(/\/\/.*$/gm, '');
      // Ta bort multi-line comments (/* ... */)
      jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');

      // Steg 2: Hitta första JSON-struktur ({ eller [)
      const firstBrace = jsonText.indexOf('{');
      const firstBracket = jsonText.indexOf('[');
      const startCandidates = [firstBrace, firstBracket].filter((idx) => idx >= 0);
      
      if (startCandidates.length === 0) {
        throw new Error('No JSON structure found (no { or [)');
      }

      const start = Math.min(...startCandidates);
      if (start > 0) {
        jsonText = jsonText.slice(start);
      }

      // Steg 3: Hitta sista matchande avslutning med balanserad parsing
      let braceCount = 0;
      let bracketCount = 0;
      let end = -1;
      let inStringStep3 = false;
      let escapeNextStep3 = false;
      
      for (let i = 0; i < jsonText.length; i++) {
        const char = jsonText[i];
        
        if (escapeNextStep3) {
          escapeNextStep3 = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNextStep3 = true;
          continue;
        }
        
        if (char === '"' && !escapeNextStep3) {
          inStringStep3 = !inStringStep3;
          continue;
        }
        
        if (inStringStep3) continue;
        
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0 && firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
            end = i;
            break;
          }
        }
        if (char === '[') bracketCount++;
        if (char === ']') {
          bracketCount--;
          if (bracketCount === 0 && firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) {
            end = i;
            break;
          }
        }
      }

      if (end >= 0 && end + 1 < jsonText.length) {
        jsonText = jsonText.slice(0, end + 1);
      }

      jsonText = jsonText.trim();
      
      // Steg 4: Fixa vanliga JSON-syntaxfel
      // Fix trailing commas
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      
      // Steg 4.1: Fixa oavslutade strängar först (innan vi fixar property names)
      // Hitta strängar som inte är avslutade korrekt och avsluta dem
      let stringFixed = '';
      let inStringStep4_1 = false;
      let escapeNextStep4_1 = false;
      let stringStartPos = -1;
      let k = 0;
      
      while (k < jsonText.length) {
        const char = jsonText[k];
        
        if (escapeNextStep4_1) {
          stringFixed += char;
          escapeNextStep4_1 = false;
          k++;
          continue;
        }
        
        if (char === '\\') {
          stringFixed += char;
          escapeNextStep4_1 = true;
          k++;
          continue;
        }
        
        if (char === '"') {
          if (inStringStep4_1) {
            // Avsluta sträng
            inStringStep4_1 = false;
            stringStartPos = -1;
          } else {
            // Starta sträng
            inStringStep4_1 = true;
            stringStartPos = k;
          }
          stringFixed += char;
          k++;
          continue;
        }
        
        if (inStringStep4_1) {
          // Vi är i en sträng - kontrollera om den är oavslutad vid slutet
          if (k === jsonText.length - 1) {
            // Vi är vid slutet och strängen är fortfarande öppen - avsluta den
            stringFixed += char;
            stringFixed += '"';
            inStringStep4_1 = false;
            stringStartPos = -1;
          } else {
            stringFixed += char;
          }
          k++;
          continue;
        }
        
        stringFixed += char;
        k++;
      }
      
      // Om vi fortfarande är i en sträng vid slutet, avsluta den
      if (inStringStep4_1) {
        stringFixed += '"';
      }
      
      jsonText = stringFixed;
      
      // Steg 4.2: Fix unquoted property names (endast utanför strings)
      // Använd en mer selektiv approach som inte påverkar strings
      let fixed = '';
      let inStringStep4 = false;
      let escapeNextStep4 = false;
      let i = 0;
      
      while (i < jsonText.length) {
        const char = jsonText[i];
        
        if (escapeNextStep4) {
          fixed += char;
          escapeNextStep4 = false;
          i++;
          continue;
        }
        
        if (char === '\\') {
          fixed += char;
          escapeNextStep4 = true;
          i++;
          continue;
        }
        
        if (char === '"') {
          inStringStep4 = !inStringStep4;
          fixed += char;
          i++;
          continue;
        }
        
        if (inStringStep4) {
          fixed += char;
          i++;
          continue;
        }
        
        // Utanför string: fixa unquoted property names
        // Matcha: { eller , eller } följt av whitespace, sedan identifier, sedan :
        // Också matcha start av objekt: { identifier :
        if ((char === '{' || char === ',' || char === '}') && i + 1 < jsonText.length) {
          const rest = jsonText.slice(i);
          // Matcha både med och utan whitespace
          const propMatch = rest.match(/^([{,}]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/);
          if (propMatch) {
            fixed += propMatch[1] + '"' + propMatch[2] + '":';
            i += propMatch[0].length;
            continue;
          }
        }
        
        // Också matcha start av objekt direkt: {identifier: (utan whitespace)
        if (char === '{' && i + 1 < jsonText.length) {
          const rest = jsonText.slice(i + 1);
          const propMatchNoSpace = rest.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/);
          if (propMatchNoSpace) {
            fixed += '{' + '"' + propMatchNoSpace[1] + '":';
            i += 1 + propMatchNoSpace[0].length;
            continue;
          }
        }
        
        fixed += char;
        i++;
      }
      
      jsonText = fixed;
      
      // Fix missing commas between array/object elements
      // Detta är komplext, så vi gör det selektivt för vanliga fall
      jsonText = jsonText.replace(/\]\s*\[/g, '],[');
      jsonText = jsonText.replace(/}\s*{/g, '},{');
      
      // Fix missing commas efter closing brackets/braces följt av nytt element
      // Endast utanför strings - använd balanserad parsing för att undvika att påverka strings
      let commaFixed = '';
      let inString2 = false;
      let escapeNext2 = false;
      let j = 0;
      
      while (j < jsonText.length) {
        const char = jsonText[j];
        
        if (escapeNext2) {
          commaFixed += char;
          escapeNext2 = false;
          j++;
          continue;
        }
        
        if (char === '\\') {
          commaFixed += char;
          escapeNext2 = true;
          j++;
          continue;
        }
        
        if (char === '"') {
          inString2 = !inString2;
          commaFixed += char;
          j++;
          continue;
        }
        
        if (inString2) {
          commaFixed += char;
          j++;
          continue;
        }
        
        // Utanför string: fixa saknade kommatecken
        // Matcha: } eller ] eller " följt av whitespace och sedan { eller [ eller "
        if (j + 1 < jsonText.length) {
          const nextChars = jsonText.slice(j, Math.min(j + 10, jsonText.length));
          const commaMatch = nextChars.match(/^([}\]"])\s+(["{[])/);
          if (commaMatch) {
            commaFixed += commaMatch[1] + ',' + commaMatch[2];
            j += commaMatch[0].length;
            continue;
          }
        }
        
        commaFixed += char;
        j++;
      }
      
      jsonText = commaFixed;

      // Försök parse JSON - om det misslyckas, logga för debugging
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        // Logga den råa JSON-strängen för debugging (trunkera om den är för lång)
        const preview = jsonText.length > 1000 
          ? jsonText.slice(0, 500) + '...\n...[trunkated]...\n' + jsonText.slice(-500)
          : jsonText;
        console.error(`[JSON Parse Error] Failed to parse JSON for ${docType}:`, {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          preview,
          length: jsonText.length,
          nodeId: context.node.bpmnElementId,
        });
        throw parseError;
      }
      let validationResult;
      if (docType === 'businessRule') {
        validationResult = validateBusinessRuleJson(parsed, resolution.chosen);
      } else if (docType === 'feature') {
        validationResult = validateFeatureGoalJson(parsed, resolution.chosen);
      } else {
        validationResult = validateEpicJson(parsed, resolution.chosen);
      }

      logValidationResult(
        validationResult,
        resolution.chosen,
        docType,
        context.node.bpmnElementId
      );

      if (validationResult.valid) {
        // Spara senaste validerade JSON-modell för vidare användning (t.ex. scenariolagring)
        lastValidDoc = parsed;
        // Kör extra, kontextmedveten scenariovalidering mot processContext/currentNodeContext
        runScenarioContextChecks(
          docType,
          parsed,
          processContext,
          currentNodeContext,
          resolution.chosen,
          context.node.bpmnElementId
        );
      }

      return {
        valid: validationResult.valid,
        errors: validationResult.errors,
      };
    } catch (parseError) {
      return {
        valid: false,
        errors: [`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
      };
    }
  };

  // Bygg JSON schema för structured outputs (endast för cloud provider)
  const jsonSchemaObj = 
    docType === 'feature' ? buildFeatureGoalJsonSchema() :
    docType === 'epic' ? buildEpicJsonSchema() :
    buildBusinessRuleJsonSchema();

  // Använd structured outputs för cloud provider (Claude stödjer det via beta-header)
  // För local provider (Ollama) används robust parsing istället
  const responseFormat = resolution.chosen === 'cloud' ? {
    type: 'json_schema' as const,
    json_schema: jsonSchemaObj,
  } : undefined;

  try {
    // Använd hybrid/fallback-strategi
    const result = await generateWithFallback({
      docType: profileDocType,
      resolution,
      systemPrompt: basePrompt,
      userPrompt,
      validateResponse,
      responseFormat,
      abortSignal,
    });

    // Validera HTML-innehåll (om det finns HTML i svaret)
    if (result.text.includes('<') && result.text.includes('>')) {
      const htmlValidation = validateHtmlContent(result.text, result.provider, docType);
      logValidationResult(
        htmlValidation,
        result.provider,
        docType,
        `${context.node.bpmnElementId}/html`
      );
      if (!htmlValidation.valid) {
        console.warn(
          `[LLM Documentation] HTML validation warnings for ${docType} (${result.provider})`
        );
      }
    }

    // Beräkna enkel token-telemetri för loggning (påverkar inte själva anropet)
    let estimatedTokens: number | undefined;
    let maxTokens: number | undefined;
    try {
      const profile = getLlmProfile(profileDocType, result.provider);
      maxTokens = profile.maxTokens;
      estimatedTokens = estimatePromptTokens(basePrompt, userPrompt);
    } catch {
      // Telemetrifel ska aldrig stoppa flödet
    }

    // Logga event
    logLlmEvent({
      eventType: 'INFO',
      docType: profileDocType,
      attemptedProviders: result.attemptedProviders,
      finalProvider: result.provider,
      fallbackUsed: result.fallbackUsed,
      success: true,
      validationOk: true,
      latencyMs: result.latencyMs,
      estimatedTokens,
      maxTokens,
    });

    const identifier = `${context.node.bpmnFile || 'unknown'}-${context.node.bpmnElementId || context.node.id}`;
    await saveLlmDebugArtifact('doc', identifier, result.text);
    return {
      text: result.text,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      // Exponera LLM-latens för t.ex. smoke-tester (inte del av JSON-kontraktet mot LLM)
      ...(typeof result.latencyMs === 'number' ? { latencyMs: result.latencyMs } : {}),
      ...(lastValidDoc ? { docJson: lastValidDoc } : {}),
    };
  } catch (error) {
    // Logga fel-event
    const errorCode = extractErrorCode(error);
    logLlmEvent({
      eventType: 'ERROR',
      docType: profileDocType,
      attemptedProviders: resolution.attempted,
      finalProvider: resolution.chosen,
      fallbackUsed: false,
      success: false,
      errorCode,
      validationOk: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Hantera LocalLlmUnavailableError gracefully
    if (error instanceof LocalLlmUnavailableError) {
      console.warn('Local LLM unavailable during documentation generation:', error.message);
      return null;
    }
    
    // Hantera CloudLlmAccountInactiveError - stoppa alla anrop
    if (error instanceof CloudLlmAccountInactiveError) {
      console.error('[LLM Documentation] Cloud account is inactive:', error.message);
      logLlmEvent({
        eventType: 'ERROR',
        docType: profileDocType,
        attemptedProviders: resolution.attempted,
        finalProvider: resolution.chosen,
        fallbackUsed: false,
        success: false,
        errorCode: 'ACCOUNT_INACTIVE',
        validationOk: false,
        errorMessage: error.message,
      });
      // Returnera null istället för att kasta - detta stoppar generering men kraschar inte appen
      return null;
    }
    
    // Hantera CloudLlmRateLimitError - logga men fortsätt inte
    if (error instanceof CloudLlmRateLimitError) {
      console.error('[LLM Documentation] Rate limit error:', error.message);
      logLlmEvent({
        eventType: 'ERROR',
        docType: profileDocType,
        attemptedProviders: resolution.attempted,
        finalProvider: resolution.chosen,
        fallbackUsed: false,
        success: false,
        errorCode: error.isPermanent ? 'RATE_LIMIT_PERMANENT' : 'RATE_LIMIT_TEMPORARY',
        validationOk: false,
        errorMessage: error.message,
      });
      // Om permanent rate limit (t.ex. inaktivt konto), returnera null
      if (error.isPermanent) {
        return null;
      }
      // Annars kasta vidare för retry-logik
      throw error;
    }
    
    // För andra fel, kasta vidare
    throw error;
  }
}

export interface ChildNodeDocumentation {
  id: string;
  name: string;
  type: string;
  summary: string;
  flowSteps: string[];
  inputs?: string[];
  outputs?: string[];
  // OBS: scenarios har tagits bort - testinformation genereras i separat steg
}

export function buildContextPayload(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  childrenDocumentation?: Map<string, ChildNodeDocumentation>
) {
  const parentChain = context.parentChain || [];
  const trail = [...parentChain, context.node];
  const hierarchyTrail = trail.map((node) => ({
    id: node.bpmnElementId,
    name: formatNodeName(node),
    type: node.type,
    file: node.bpmnFile,
  }));
  const hierarchyPath = hierarchyTrail.map((node) => `${node.name} (${node.type})`).join(' → ');
  const featureGoalAncestor = findAncestorOfType(trail, 'callActivity');
  const descendantTypeCounts = context.descendantNodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {});
  const descendantPaths = buildDescendantPathSummaries(context.node);
  const derivedJiraName = buildJiraNameFromTrail(trail);
  const nodeJiraType = inferJiraType(context.node.type);

  const incomingFlows = extractFlowRefs(context.node.element?.businessObject?.incoming, 'incoming');
  const outgoingFlows = extractFlowRefs(context.node.element?.businessObject?.outgoing, 'outgoing');
  const documentationSnippets = extractDocumentationSnippets(context.node.element);

  const mapPhaseAndLane = (node: BpmnProcessNode) => ({
    phase: inferPhase(node),
    lane: inferLane(node),
  });

  const processContext = {
    processName: hierarchyTrail[0]?.name || context.node.bpmnFile || 'Okänd process',
    fileName: context.node.bpmnFile,
    entryPoints: hierarchyTrail.length
      ? [
          {
            ...hierarchyTrail[0],
            ...mapPhaseAndLane(context.parentChain[0] || context.node),
          },
        ]
      : [],
    endPoints: [], // kan utökas senare vid behov
    keyNodes: [
      ...hierarchyTrail,
      ...context.childNodes.map((node) => ({
        id: node.bpmnElementId,
        name: formatNodeName(node),
        type: node.type,
        file: node.bpmnFile,
      })),
    ]
      .filter((n, index, arr) => n && n.id && arr.findIndex((m) => m.id === n.id) === index)
      .map((n) => ({
        ...n,
        ...mapPhaseAndLane(
          n.id === context.node.bpmnElementId
            ? context.node
            : context.childNodes.find((c) => c.bpmnElementId === n.id) ||
              context.parentChain.find((p) => p.bpmnElementId === n.id) ||
              context.node,
        ),
      }))
      .slice(0, 12),
  };

  const currentNodeContext = {
    node: {
      id: context.node.bpmnElementId,
      name: context.node.name,
      type: context.node.type,
      file: context.node.bpmnFile,
      jiraType: nodeJiraType,
      derivedJiraName,
    },
    hierarchy: {
      trail: hierarchyTrail,
      pathLabel: hierarchyPath,
      depthFromRoot: hierarchyTrail.length - 1,
      featureGoalAncestor,
      parentProcess: hierarchyTrail[0],
    },
    parents: context.parentChain.map((node) => ({
      id: node.bpmnElementId,
      name: node.name,
      type: node.type,
    })),
    siblings: context.siblingNodes.map((node) => ({
      id: node.bpmnElementId,
      name: node.name,
      type: node.type,
    })),
    children: context.childNodes.map((node) => ({
      id: node.bpmnElementId,
      name: node.name,
      type: node.type,
    })),
    // Inkludera dokumentation från child nodes om den finns (för Feature Goals med child epics)
    // För Feature Goals (callActivities): inkludera dokumentation från alla descendant nodes
    // För Epics/Tasks: inkludera bara från direkta children
    // 
    // BEGRÄNSNING för stora processer:
    // - Max 40 items totalt för Feature Goals (för att undvika token overflow)
    // - Prioriterar: 1) Direkta children (subprocesser), 2) Leaf nodes (tasks/epics), 3) Övriga
    // - Scenarios begränsas till max 3 per node för att spara tokens
    childrenDocumentation: childrenDocumentation
      ? (context.node.type === 'callActivity'
          ? // För Feature Goals: mappa mot alla descendant nodes (inklusive leaf nodes i subprocesser)
            (() => {
              // Skapa en Map för snabb lookup av descendant index
              const descendantIndexMap = new Map<string, number>();
              context.descendantNodes.forEach((desc, idx) => {
                descendantIndexMap.set(desc.id, idx);
              });
              
              const allDocs = context.descendantNodes
                .map((descendant, index) => {
                  const descendantDoc = childrenDocumentation && childrenDocumentation instanceof Map 
                    ? childrenDocumentation.get(descendant.id)
                    : undefined;
                  if (!descendantDoc) return null;
                  
                  // OBS: scenarios har tagits bort - testinformation genereras i separat steg
                  
                  // Inkludera lane-information för att Claude ska kunna identifiera om det är kund eller handläggare
                  const lane = inferLane(descendant);
                  
                  return {
                    id: descendant.bpmnElementId,
                    name: descendant.name,
                    type: descendant.type,
                    lane: lane, // ✅ Lägg till lane-information för att Claude ska kunna identifiera användare korrekt
                    summary: descendantDoc.summary,
                    flowSteps: descendantDoc.flowSteps,
                    inputs: descendantDoc.inputs,
                    outputs: descendantDoc.outputs,
                    // Metadata för prioritetsordning
                    _isDirectChild: context.childNodes.some(c => c.id === descendant.id),
                    _isLeafNode: descendant.children.length === 0,
                    _index: index,
                  };
                })
                .filter((doc): doc is NonNullable<typeof doc> => doc !== null);
              
              // Sortera efter prioritet: direkta children först, sedan leaf nodes, sedan övriga
              allDocs.sort((a, b) => {
                // Direkta children först
                if (a._isDirectChild && !b._isDirectChild) return -1;
                if (!a._isDirectChild && b._isDirectChild) return 1;
                // Leaf nodes näst (om båda är direkta children eller båda inte)
                if (a._isLeafNode && !b._isLeafNode) return -1;
                if (!a._isLeafNode && b._isLeafNode) return 1;
                // Sedan efter index (behåller ursprunglig ordning)
                return a._index - b._index;
              });
              
              // Ta bort metadata och begränsa till max 40 items
              const limited = allDocs.slice(0, 40).map(({ _isDirectChild, _isLeafNode, _index, ...doc }) => doc);
              
              if (allDocs.length > 40) {
                console.warn(
                  `[LLM Context] Truncated childrenDocumentation for ${context.node.bpmnElementId}: ` +
                  `${allDocs.length} items → ${limited.length} items (max 40)`
                );
              }
              
              return limited;
            })()
          : // För Epics/Tasks: mappa bara mot direkta children
            context.childNodes
              .map((child) => {
                const childDoc = childrenDocumentation && childrenDocumentation instanceof Map
                  ? childrenDocumentation.get(child.id)
                  : undefined;
                if (!childDoc) return null;
                
                // OBS: scenarios har tagits bort - testinformation genereras i separat steg
                
                return {
                  id: child.bpmnElementId,
                  name: child.name,
                  type: child.type,
                  summary: childDoc.summary,
                  flowSteps: childDoc.flowSteps,
                  inputs: childDoc.inputs,
                  outputs: childDoc.outputs,
                };
              })
              .filter((doc): doc is NonNullable<typeof doc> => doc !== null))
      : undefined,
    descendantHighlights: descendantPaths.slice(0, 10),
    descendantTypeCounts,
    flows: {
      incoming: incomingFlows,
      outgoing: outgoingFlows,
    },
    documentation: documentationSnippets,
    jiraGuidance: {
      hierarchy: 'Projekt → Initiativ → Feature Goal → Epic → Stories',
      nodeJiraType,
      derivedJiraName,
      notes:
        nodeJiraType === 'feature goal'
          ? 'Feature Goals är multi-team leveranser och bör beskriva flera epics.'
          : 'Epics ägs av ett team och ska länka vidare till stories/tester.',
    },
    links,
  };

  // Lägg till strukturell information om den finns i context
  if ('structuralInfo' in context && context.structuralInfo) {
    (currentNodeContext as any).structuralInfo = context.structuralInfo;
  }

  // Lägg till usage cases om de finns i context (endast för Process Feature Goals)
  if ('usageCases' in context && context.usageCases) {
    (currentNodeContext as any).usageCases = context.usageCases;
  }

  return { processContext, currentNodeContext };
}

function formatNodeName(node: BpmnProcessNode) {
  return node.name || node.bpmnElementId || node.id;
}

function findAncestorOfType(
  trail: BpmnProcessNode[],
  type: BpmnProcessNode['type']
): { id: string; name: string; type: string } | null {
  for (let i = trail.length - 2; i >= 0; i -= 1) {
    const candidate = trail[i];
    if (candidate.type === type) {
      return {
        id: candidate.bpmnElementId,
        name: formatNodeName(candidate),
        type: candidate.type,
      };
    }
  }
  return null;
}

function buildDescendantPathSummaries(node: BpmnProcessNode, maxItems = 25) {
  const results: Array<{
    id: string;
    name: string;
    type: string;
    file: string;
    depth: number;
    path: string;
  }> = [];

  const rootLabel = `${formatNodeName(node)} (${node.type})`;

  function walk(current: BpmnProcessNode, path: string[], depth: number) {
    if (!current.children?.length) return;

    for (const child of current.children) {
      if (results.length >= maxItems) return;

      const childLabel = `${formatNodeName(child)} (${child.type})`;
      const childPath = [...path, childLabel];
      results.push({
        id: child.bpmnElementId,
        name: formatNodeName(child),
        type: child.type,
        file: child.bpmnFile,
        depth,
        path: childPath.join(' → '),
      });

      walk(child, childPath, depth + 1);
      if (results.length >= maxItems) return;
    }
  }

  walk(node, [rootLabel], 1);
  return results;
}

function buildJiraNameFromTrail(trail: BpmnProcessNode[]) {
  const relevant = trail.filter(
    (node) => node.type !== 'process' && node.type !== 'gateway' && node.type !== 'event'
  );
  return relevant.map((node) => formatNodeName(node)).join(' - ');
}

function inferJiraType(nodeType: BpmnProcessNode['type']) {
  if (nodeType === 'callActivity') return 'feature goal';
  if (nodeType === 'businessRuleTask') return 'epic (business rule)';
  return 'epic';
}

/**
 * Enkel, kontextmedveten sanity-check av scenarion i LLM-output.
 * 
 * Syfte: flagga scenarion som inte verkar använda någon känd nod-/processkontext
 * (men aldrig stoppa flödet eller ändra JSON).
 */
function runScenarioContextChecks(
  docType: DocumentationDocType,
  docJson: unknown,
  processContext: any,
  currentNodeContext: any,
  provider: LlmProvider,
  elementId?: string,
) {
  // OBS: Denna funktion har tagits bort - testinformation (scenarios) genereras inte längre i dokumentationssteget
  // Testinformation genereras i ett separat steg och ska inte valideras här
  return;
}

/**
 * Enkel heuristik för att mappa BPMN-noder till kreditprocess-faser.
 * Syftet är att ge LLM:et en grov fasindikation, inte exakt processmodellering.
 */
function inferPhase(node: BpmnProcessNode): string {
  const name = (node.name || '').toLowerCase();

  // Namnbaserade hints går först
  if (name.includes('ansökan') || name.includes('application')) {
    return 'Ansökan';
  }

  if (
    name.includes('insamling') ||
    name.includes('collect') ||
    name.includes('gather') ||
    name.includes('register') ||
    name.includes('data')
  ) {
    return 'Datainsamling';
  }

  if (name.includes('risk') || name.includes('kreditvärdighet') || name.includes('score')) {
    return 'Riskbedömning';
  }

  if (
    name.includes('beslut') ||
    name.includes('decision') ||
    name.includes('approve') ||
    name.includes('avslag')
  ) {
    return 'Beslut';
  }

  // Typbaserade fall-back-regler
  if (node.type === 'businessRuleTask' || node.type === 'dmnDecision') {
    return 'Riskbedömning';
  }

  if (node.type === 'callActivity' && name.includes('approve')) {
    return 'Beslut';
  }

  return 'Okänd fas';
}

/**
 * Extraherar lane/swimlane-namn från BPMN-element om det finns.
 * I BPMN kan en task tillhöra en lane via process -> laneSet -> lane -> flowNodeRef.
 * Vi letar efter lane-information i businessObject-hierarkin.
 */
function extractLaneFromBpmnElement(node: BpmnProcessNode): string | null {
  if (!node.element?.businessObject) {
    return null;
  }

  const bo = node.element.businessObject;
  const taskId = node.bpmnElementId;
  
  // Gå uppåt i hierarkin för att hitta processen
  let current: any = bo;
  while (current) {
    if (current.$type === 'bpmn:Process') {
      // Hitta laneSet i processen
      // laneSets kan vara en array eller ett enskilt objekt
      const laneSets = current.laneSets 
        ? (Array.isArray(current.laneSets) ? current.laneSets : [current.laneSets])
        : [];
      
      // Sök igenom alla laneSets och deras lanes
      for (const laneSet of laneSets) {
        if (laneSet.lanes) {
          const lanes = Array.isArray(laneSet.lanes) ? laneSet.lanes : [laneSet.lanes];
          
          // Sök igenom alla lanes för att hitta den som innehåller denna task
          for (const lane of lanes) {
            if (lane.flowNodeRef) {
              // flowNodeRef kan vara en array eller en enskild referens
              const flowNodeRefs = Array.isArray(lane.flowNodeRef) 
                ? lane.flowNodeRef 
                : [lane.flowNodeRef];
              
              // Kolla om denna task finns i lane:ns flowNodeRef
              // flowNodeRef kan vara en ID-sträng eller ett objekt med id
              for (const ref of flowNodeRefs) {
                const refId = typeof ref === 'string' ? ref : (ref?.id || ref);
                if (refId === taskId) {
                  // Hittade lane! Returnera lane-namnet
                  return lane.name || null;
                }
              }
            }
          }
        }
      }
      break;
    }
    current = current.$parent;
  }
  
  return null;
}

/**
 * Mappar BPMN lane-namn till våra interna lane-kategorier.
 * Baserat på vanliga lane-namn i kreditprocesser.
 */
function mapBpmnLaneToInternalLane(bpmnLaneName: string | null): string | null {
  if (!bpmnLaneName) return null;
  
  const laneName = bpmnLaneName.toLowerCase();
  
  // Kund/stakeholder-lanes
  if (
    laneName.includes('kund') ||
    laneName.includes('customer') ||
    laneName.includes('stakeholder') ||
    laneName.includes('applicant') ||
    laneName.includes('sökande') ||
    laneName.includes('application') // ⚠️ OBS: "application" kan vara både kund och processnamn
  ) {
    // ⚠️ SPECIALFALL: Om lane heter "application" men task-namnet innehåller interna nyckelord,
    // kan det vara en handläggare-uppgift i application-lanen
    // Vi hanterar detta i inferLane() genom att kolla task-namnet också
    return 'Kund';
  }
  
  // Handläggare/anställd-lanes
  if (
    laneName.includes('handläggare') ||
    laneName.includes('caseworker') ||
    laneName.includes('valuator') ||
    laneName.includes('employee') ||
    laneName.includes('anställd') ||
    laneName.includes('credit evaluator') ||
    laneName.includes('evaluator')
  ) {
    return 'Handläggare';
  }
  
  // System/regelmotor-lanes
  if (
    laneName.includes('system') ||
    laneName.includes('regelmotor') ||
    laneName.includes('backend') ||
    laneName.includes('integration')
  ) {
    return 'Regelmotor';
  }
  
  return null;
}

/**
 * Enkel heuristik för att mappa noder till "lane"/roll i kreditprocessen.
 * Vi skiljer grovt på Kund, Handläggare och Regelmotor.
 * 
 * För User Tasks:
 * 1. Först: Försök extrahera faktisk BPMN lane/swimlane från elementet
 * 2. Om lane finns: Mappa lane-namnet till våra interna kategorier
 * 3. Om lane saknas eller är otydlig: Använd heuristik baserat på task-namn
 *    - Default = Kund/stakeholder (t.ex. "register ...", "consent ...")
 *    - Om namnet innehåller interna nyckelord ("review", "assess", "evaluate", etc.) = Handläggare
 */
function inferLane(node: BpmnProcessNode): string {
  const name = (node.name || '').toLowerCase();

  // Regelmotor / system
  if (node.type === 'businessRuleTask' || node.type === 'serviceTask' || node.type === 'dmnDecision') {
    return 'Regelmotor';
  }

  // User Tasks: försök först använda faktisk BPMN lane
  if (node.type === 'userTask') {
    // 1. Extrahera faktisk BPMN lane om den finns
    const bpmnLaneName = extractLaneFromBpmnElement(node);
    const mappedLane = mapBpmnLaneToInternalLane(bpmnLaneName);
    
    // 2. Om vi hittade en tydlig lane-mappning, använd den
    // Men ⚠️ SPECIALFALL: Om lane heter "application" men task-namnet innehåller interna nyckelord,
    // kan det vara en handläggare-uppgift i application-lanen
    if (mappedLane) {
      // Om lane är "Kund" men task-namnet innehåller interna nyckelord, 
      // kan det vara en handläggare-uppgift (t.ex. "evaluate application" i application-lanen)
      const internalKeywords = [
        'review', 'granska', 'assess', 'utvärdera', 'evaluate',
        'advanced-underwriting', 'board', 'committee',
        'four eyes', 'four-eyes', 'manual', 'distribute',
        'distribuera', 'archive', 'arkivera', 'verify', 'handläggare',
      ];
      
      if (mappedLane === 'Kund' && internalKeywords.some((keyword) => name.includes(keyword))) {
        // Task-namnet indikerar handläggare trots att lane är "Kund"
        // Detta kan hända om lane heter "application" men task är "evaluate application"
        return 'Handläggare';
      }
      
      return mappedLane;
    }
    
    // 3. Fallback: använd heuristik baserat på task-namn (samma logik som process-explorer)
    const internalKeywords = [
      'review',
      'granska',
      'assess',
      'utvärdera',
      'evaluate', // ✅ Inkludera "evaluate" för evaluate-application-* i credit decision
      'advanced-underwriting',
      'board',
      'committee',
      'four eyes',
      'four-eyes',
      'manual',
      'distribute',
      'distribuera',
      'archive',
      'arkivera',
      'verify',
      'handläggare',
    ];

    // Om den matchar interna ord → behandla som intern/backoffice (Handläggare)
    if (internalKeywords.some((keyword) => name.includes(keyword))) {
      return 'Handläggare';
    }

    // Default: kund- eller stakeholder-interaktion (t.ex. "register ...", "consent to credit check" osv.)
    // Detta inkluderar "register-source-of-equity" som ska göras av primary stakeholder
    return 'Kund';
  }

  // Call activities utan tydlig signal behandlas som system/regelmotor
  if (node.type === 'callActivity') {
    return 'Regelmotor';
  }

  return 'Handläggare';
}

function extractFlowRefs(flows: any, direction: 'incoming' | 'outgoing') {
  if (!flows) return [];
  const flowArray = Array.isArray(flows) ? flows : [flows];
  return flowArray
    .map((flow: any) => ({
      id: flow?.id || flow?.businessObject?.id,
      name: flow?.name || flow?.businessObject?.name || '',
      source: flow?.sourceRef ? flow.sourceRef.name || flow.sourceRef.id : undefined,
      target: flow?.targetRef ? flow.targetRef.name || flow.targetRef.id : undefined,
      direction,
    }))
    .filter((flow) => flow.id);
}

function extractDocumentationSnippets(nodeElement?: BpmnProcessNode['element']) {
  const docs = nodeElement?.businessObject?.documentation;
  if (!docs) return [];
  const entries = Array.isArray(docs) ? docs : [docs];
  return entries
    .map((entry: any) => entry?.text || entry?.body || '')
    .filter((text: string | undefined) => Boolean(text?.trim()))
    .slice(0, 5);
}
