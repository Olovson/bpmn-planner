import type { NodeDocumentationContext } from './documentationContext';
import type { TemplateLinks } from './documentationTemplates';
import type { BpmnProcessNode } from './bpmnProcessGraph';
import { generateChatCompletion, isLlmEnabled } from './llmClient';
import { saveLlmDebugArtifact } from './llmDebugStorage';
import type { LlmProvider } from './llmClientAbstraction';
import { getDefaultLlmProvider } from './llmClients';
import { LocalLlmUnavailableError } from './llmClients/localLlmClient';
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
): Promise<DocumentationLlmResult | null> {
  if (!isLlmEnabled()) return null;

  const { processContext, currentNodeContext } = buildContextPayload(context, links);
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
    localAvailable,
    allowFallback,
  });

  const profileDocType: DocType =
    docType === 'businessRule' ? 'businessRule' : docType === 'feature' ? 'feature' : 'epic';

  // JSON-input som skickas till LLM enligt promptdefinitionerna.
  const llmInput = {
    type: docLabel,
    processContext,
    currentNodeContext,
  };

  const userPrompt = JSON.stringify(llmInput, null, 2);

  // Håller senaste validerade JSON-modellen (om vi lyckas parsa + validera)
  let lastValidDoc: unknown | null = null;

  // Valideringsfunktion för response
  const validateResponse = (response: string): { valid: boolean; errors: string[] } => {
    try {
      let jsonText = response.trim();

      // Hantera vanliga markdown-fences, t.ex. ```json ... ```
      if (jsonText.startsWith('```')) {
        const fenceMatch = jsonText.match(/^```[a-zA-Z0-9_-]*\s*([\s\S]*?)```$/);
        if (fenceMatch && fenceMatch[1]) {
          jsonText = fenceMatch[1].trim();
        } else {
          // Ta bort första raden om den bara innehåller ``` eller ```json
          const lines = jsonText.split('\n');
          if (lines[0].trim().startsWith('```')) {
            lines.shift();
          }
          // Ta bort sista raden om den är en avslutande fence
          if (lines.length && lines[lines.length - 1].trim() === '```') {
            lines.pop();
          }
          jsonText = lines.join('\n').trim();
        }
      }

      // Försök sanera bort ev. förklarande text före/efter JSON-objektet,
      // t.ex. "Here is the JSON object:" eller kommentarer.
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1).trim();
      }

      const parsed = JSON.parse(jsonText);
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

  try {
    // Använd hybrid/fallback-strategi
    const result = await generateWithFallback({
      docType: profileDocType,
      resolution,
      systemPrompt: basePrompt,
      userPrompt,
      validateResponse,
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
    // För andra fel, kasta vidare
    throw error;
  }
}

export function buildContextPayload(context: NodeDocumentationContext, links: TemplateLinks) {
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
  if (!docJson || typeof docJson !== 'object') return;
  const obj = docJson as any;
  const scenarios = Array.isArray(obj.scenarios) ? obj.scenarios : null;
  if (!scenarios || !scenarios.length) return;

  const labels = new Set<string>();

  if (processContext?.processName) {
    labels.add(String(processContext.processName).toLowerCase());
  }
  if (Array.isArray(processContext?.keyNodes)) {
    processContext.keyNodes.forEach((node: any) => {
      if (node?.name) labels.add(String(node.name).toLowerCase());
    });
  }

  if (currentNodeContext?.node?.name) {
    labels.add(String(currentNodeContext.node.name).toLowerCase());
  }
  const addRelNames = (collection?: any[]) => {
    if (!Array.isArray(collection)) return;
    collection.forEach((n) => {
      if (n?.name) labels.add(String(n.name).toLowerCase());
    });
  };
  addRelNames(currentNodeContext?.parents);
  addRelNames(currentNodeContext?.siblings);
  addRelNames(currentNodeContext?.children);

  const knownLabels = Array.from(labels).filter((s) => s.length > 0);
  if (!knownLabels.length) return;

  const warnings: string[] = [];

  scenarios.forEach((scenario: any, index: number) => {
    if (!scenario || typeof scenario !== 'object') return;
    const textParts = [
      scenario.name,
      scenario.description,
      scenario.input,
      scenario.outcome,
    ]
      .filter(Boolean)
      .map((v: unknown) => String(v).toLowerCase());

    if (!textParts.length) return;
    const combined = textParts.join(' ');

    const hasKnownLabel = knownLabels.some((label) =>
      label.length > 3 ? combined.includes(label) : false,
    );

    if (!hasKnownLabel) {
      warnings.push(
        `scenarios[${index}] verkar inte referera till någon känd nod/processterm i processContext/currentNodeContext`,
      );
      // Markera scenariot i JSON som kontext-osäkert så vi kan visualisera det i UI senare.
      (scenario as any).contextWarning = true;
    } else {
      // Säkerställ att vi inte lämnar kvar gammal flagga om förutsättningarna ändras
      if ('contextWarning' in scenario) {
        delete (scenario as any).contextWarning;
      }
    }
  });

  if (warnings.length) {
    const prefix = `[LLM Scenario Validation] ${provider}/${docType}${
      elementId ? `/${elementId}` : ''
    }`;
    console.warn(`${prefix} Context warnings:`, warnings);
  }
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
 * Enkel heuristik för att mappa noder till "lane"/roll i kreditprocessen.
 * Vi skiljer grovt på Kund, Handläggare och Regelmotor.
 */
function inferLane(node: BpmnProcessNode): string {
  const name = (node.name || '').toLowerCase();

  // Kund-centrerade aktiviteter
  if (
    name.includes('kund') ||
    name.includes('customer') ||
    name.includes('applicant') ||
    name.includes('ansökan') ||
    name.includes('stakeholder') ||
    name.includes('household')
  ) {
    return 'Kund';
  }

  // Regelmotor / system
  if (node.type === 'businessRuleTask' || node.type === 'serviceTask' || node.type === 'dmnDecision') {
    return 'Regelmotor';
  }

  // Användaruppgifter hamnar normalt hos handläggare
  if (node.type === 'userTask') {
    return 'Handläggare';
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
