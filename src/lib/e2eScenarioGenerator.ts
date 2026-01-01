/**
 * E2E Scenario Generator
 * 
 * Genererar E2E-scenarios med Claude baserat på:
 * - BPMN-processgraf och paths
 * - Gateway-conditions
 * - Feature Goal-dokumentation
 */

import { generateChatCompletion, isLlmEnabled } from './llmClient';
import { getE2eScenarioPrompt } from './promptLoader';
import type { ProcessPath } from './bpmnFlowExtractor';
import type { LlmProvider } from './llmClientAbstraction';
import { getDefaultLlmProvider } from './llmClients';
import { resolveLlmProvider } from './llmProviderResolver';
import { generateWithFallback } from './llmFallback';
import { logLlmEvent } from './llmLogging';
import { saveLlmDebugArtifact } from './llmDebugStorage';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import { buildE2eScenarioJsonSchema } from './e2eScenarioJsonSchema';
import { validateE2eScenarioOutput, validateE2eScenarioContent } from './e2eScenarioValidator';
import { loadChildDocFromStorage } from './bpmnGenerators/docRendering';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import { getFeatureGoalDocStoragePaths } from './artifactUrls';
import { supabase } from '@/integrations/supabase/client';
import { parseBpmnFile } from './bpmnParser';
import { buildFlowGraph, findStartEvents, findPathsThroughProcess } from './bpmnFlowExtractor';
import type { BpmnProcessGraph } from './bpmnProcessGraph';
import { loadBpmnMapFromStorage } from './bpmn/bpmnMapStorage';
import { findParentBpmnFileForSubprocess } from './bpmn/bpmnMapLoader';

export interface FeatureGoalDoc {
  callActivityId: string;
  bpmnFile: string;
  summary: string;
  flowSteps: string[];
  userStories?: Array<{
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>;
  dependencies?: string[]; // Includes both process context (prerequisites) and technical systems
  subprocesses?: Array<{
    id: string;
    name: string;
    type: 'CallActivity';
    bpmnFile: string;
  }>;
  serviceTasks?: Array<{
    id: string;
    name: string;
    type: 'ServiceTask';
  }>;
  userTasks?: Array<{
    id: string;
    name: string;
    type: 'UserTask';
    isCustomer?: boolean;
  }>;
  businessRules?: Array<{
    id: string;
    name: string;
    type: 'BusinessRuleTask' | 'dmnDecision';
  }>;
}

export interface E2eScenarioContext {
  path: ProcessPath;
  featureGoals: FeatureGoalDoc[];
  processInfo: {
    bpmnFile: string;
    processName: string;
    initiative: string;
  };
}

export interface E2eScenarioLlmResult {
  scenario: E2eScenario | null;
  provider: LlmProvider;
  fallbackUsed: boolean;
  latencyMs: number;
}

/**
 * Genererar ett E2E-scenario med Claude baserat på path och Feature Goal-dokumentation.
 */
export async function generateE2eScenarioWithLlm(
  context: E2eScenarioContext,
  llmProvider?: LlmProvider,
  allowFallback: boolean = true,
  abortSignal?: AbortSignal
): Promise<E2eScenarioLlmResult | null> {
  if (!isLlmEnabled()) {
    return null;
  }

  // Hämta prompt
  const prompt = getE2eScenarioPrompt();
  
  // Resolvera provider
  const globalDefault = getDefaultLlmProvider();
  const resolution = resolveLlmProvider({
    userChoice: llmProvider,
    globalDefault,
    allowFallback,
  });

  // Bygg input för Claude - OPTIMERAD: Ta bort stora arrays, behåll viktiga data
  // VIKTIGT: Vi behåller ALLA flowSteps och userStories (kritiskt för kvalitet)
  // Vi tar bort subprocesses/serviceTasks/userTasks/businessRules (kan infereras från BPMN)
  const llmInput = {
    path: {
      startEvent: context.path.startEvent,
      endEvent: context.path.endEvent,
      featureGoals: context.path.featureGoals,
      gatewayConditions: context.path.gatewayConditions.map(gc => ({
        gatewayId: gc.gatewayId,
        gatewayName: gc.gatewayName,
        condition: gc.condition,
        conditionText: gc.conditionText,
        targetNodeId: gc.targetNodeId,
      })),
    },
    featureGoals: context.featureGoals.map(fg => ({
      callActivityId: fg.callActivityId,
      bpmnFile: fg.bpmnFile,
      summary: fg.summary,
      flowSteps: fg.flowSteps, // BEHÅLL ALLA - kritiskt för action/assertion
      userStories: fg.userStories || [], // BEHÅLL ALLA - kritiskt för assertion
      dependencies: fg.dependencies || [], // Behåll för kontext
      businessRules: fg.businessRules || [], // Behåll - viktigt för DMN-beslut i scenarios
      userTasks: fg.userTasks || [], // Behåll - viktigt för att veta vem som gör vad (kund vs handläggare)
      // Ta bort: subprocesses, serviceTasks
      // (dessa kan LLM inferera från BPMN-struktur och Feature Goal-namn om nödvändigt)
    })),
    processInfo: context.processInfo,
  };

  const userPrompt = JSON.stringify(llmInput, null, 2);

  const startTime = Date.now();

  try {
    // Anropa Claude med structured output
    // VIKTIGT: generateWithFallback förväntar sig GenerateWithFallbackOptions format
    console.log(`[e2eScenarioGenerator] Calling generateWithFallback with provider: ${resolution.chosen}`);
    console.log(`[e2eScenarioGenerator] Input size: systemPrompt=${prompt.length} chars, userPrompt=${userPrompt.length} chars`);
    const result = await generateWithFallback({
      docType: 'testscript', // E2E scenarios använder testscript profile (närmast relaterat)
      resolution,
      systemPrompt: prompt,
      userPrompt,
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'E2EScenario',
          strict: true,
          schema: buildE2eScenarioJsonSchema(),
        },
      },
      validateResponse: (response: string) => {
        // Validera att response är giltig JSON och matchar schema
        // OBS: validateE2eScenarioOutput förväntar sig en sträng (den parsar JSON själv)
        try {
          // validateE2eScenarioOutput förväntar sig en sträng, inte ett objekt
          const validated = validateE2eScenarioOutput(response);
          return {
            valid: validated !== null,
            errors: validated === null ? ['Invalid E2E scenario structure'] : [],
          };
        } catch (error) {
          return {
            valid: false,
            errors: [error instanceof Error ? error.message : 'Invalid JSON'],
          };
        }
      },
      abortSignal,
    });
    console.log(`[e2eScenarioGenerator] generateWithFallback returned. Result: ${result ? 'not null' : 'null'}`);

    if (!result) {
      console.error('[e2eScenarioGenerator] generateWithFallback returned null - LLM call failed');
      return null;
    }

    console.log(`[e2eScenarioGenerator] LLM call completed. Provider: ${result.provider}, Latency: ${result.latencyMs}ms, Text length: ${result.text?.length || 0}, Text type: ${typeof result.text}`);

    // Validera output (validering sker redan i validateResponse callback)
    // OBS: validateE2eScenarioOutput förväntar sig en sträng och returnerar ett parsad objekt
    let parsed: any;
    try {
      if (typeof result.text === 'string') {
        // validateE2eScenarioOutput parsar JSON själv, så vi anropar den med strängen
        parsed = validateE2eScenarioOutput(result.text);
        if (!parsed) {
          throw new Error('validateE2eScenarioOutput returned null');
        }
        console.log('[e2eScenarioGenerator] Successfully parsed and validated LLM output as JSON from string');
      } else if (typeof result.text === 'object' && result.text !== null) {
        // Structured outputs returnerar redan ett objekt - validera det direkt
        // Men validateE2eScenarioOutput förväntar sig en sträng, så stringify först
        parsed = validateE2eScenarioOutput(JSON.stringify(result.text));
        if (!parsed) {
          throw new Error('validateE2eScenarioOutput returned null');
        }
        console.log('[e2eScenarioGenerator] Successfully validated LLM output object (structured outputs)');
      } else {
        throw new Error(`Unexpected response type: ${typeof result.text}`);
      }
    } catch (error) {
      console.error('[e2eScenarioGenerator] Failed to parse/validate LLM output:', error);
      console.error('[e2eScenarioGenerator] Raw output type:', typeof result.text);
      console.error('[e2eScenarioGenerator] Raw output (first 500 chars):', 
        typeof result.text === 'string' ? result.text.substring(0, 500) : JSON.stringify(result.text).substring(0, 500));
      return {
        scenario: null,
        provider: result.provider,
        fallbackUsed: false, // Ingen fallback längre
        latencyMs: result.latencyMs,
      };
    }

    // parsed är redan validerat av validateE2eScenarioOutput
    const validated = parsed;
    if (!validated) {
      console.error('[e2eScenarioGenerator] Invalid E2E scenario structure from LLM');
      console.error('[e2eScenarioGenerator] Parsed structure:', JSON.stringify(parsed, null, 2).substring(0, 1000));
      return {
        scenario: null,
        provider: result.provider,
        fallbackUsed: false, // Ingen fallback längre
        latencyMs: result.latencyMs,
      };
    }
    
    console.log(`[e2eScenarioGenerator] Successfully validated E2E scenario structure. Scenario ID: ${validated.id}, Name: ${validated.name}`);

    // Konvertera validerad output till E2eScenario
    const scenario = convertLlmOutputToE2eScenario(validated, context);

    // Logga event
    logLlmEvent({
      eventType: 'INFO',
      docType: 'testscript',
      attemptedProviders: [result.provider],
      finalProvider: result.provider,
      fallbackUsed: false, // Ingen fallback längre
      success: true,
      validationOk: true,
      latencyMs: result.latencyMs,
    });

    // Spara debug artifact
    const artifactContent = JSON.stringify({
      prompt,
      input: userPrompt,
      output: result.text,
      provider: result.provider,
      nodeId: context.path.startEvent,
      bpmnFile: context.processInfo.bpmnFile,
    }, null, 2);
    await saveLlmDebugArtifact(
      'test',
      `${context.processInfo.bpmnFile}-${context.path.startEvent}`,
      artifactContent
    );

    console.log(`[e2eScenarioGenerator] Successfully created scenario. ID: ${scenario.id}, Name: ${scenario.name}`);
    return {
      scenario,
      provider: result.provider,
      fallbackUsed: false, // Ingen fallback längre
      latencyMs: result.latencyMs,
    };
  } catch (error) {
    console.error('[e2eScenarioGenerator] Error generating E2E scenario:', error);
    if (error instanceof Error) {
      console.error('[e2eScenarioGenerator] Error details:', {
        message: error.message,
        stack: error.stack?.substring(0, 500),
      });
    }
    return null;
  }
}

/**
 * Konverterar LLM-output till E2eScenario-format.
 */
function convertLlmOutputToE2eScenario(
  llmOutput: any,
  context: E2eScenarioContext
): E2eScenario {
  // Generera ID baserat på path och scenario-typ
  const scenarioId = `e2e-${context.path.startEvent}-${context.path.endEvent}-${llmOutput.type || 'happy-path'}-${Date.now()}`;

  return {
    id: scenarioId,
    name: llmOutput.name || 'Unnamed E2E Scenario',
    priority: llmOutput.priority || 'P1',
    type: llmOutput.type || 'happy-path',
    iteration: llmOutput.iteration || 'Kreditansökan',
    bpmnProcess: context.processInfo.bpmnFile,
    featureGoalFile: context.featureGoals[0]?.bpmnFile || '',
    testFile: `tests/e2e/${scenarioId}.spec.ts`,
    command: `npx playwright test tests/e2e/${scenarioId}.spec.ts`,
    summary: llmOutput.summary || '',
    given: llmOutput.given || '',
    when: llmOutput.when || '',
    then: llmOutput.then || '',
    notesForBankProject: llmOutput.notesForBankProject || '',
    // Spara path-metadata för bättre matchning med Feature Goal-tester
    pathMetadata: {
      startEvent: context.path.startEvent,
      endEvent: context.path.endEvent,
      featureGoals: context.path.featureGoals,
      gatewayConditions: context.path.gatewayConditions.map(gc => ({
        gatewayId: gc.gatewayId,
        conditionText: gc.conditionText,
      })),
      nodeIds: context.path.nodeIds,
    },
    bankProjectTestSteps: (llmOutput.bankProjectTestSteps || []).map((step: any) => ({
      bpmnNodeId: step.bpmnNodeId || '',
      bpmnNodeType: step.bpmnNodeType || 'CallActivity',
      bpmnNodeName: step.bpmnNodeName || '',
      action: step.action || '',
      assertion: step.assertion || '',
      backendState: step.backendState,
    })),
    subprocessSteps: (llmOutput.subprocessSteps || []).map((step: any, index: number) => ({
      order: step.order || index + 1,
      bpmnFile: step.bpmnFile || context.featureGoals[index]?.bpmnFile || '',
      callActivityId: step.callActivityId || context.path.featureGoals[index] || '',
      featureGoalFile: context.featureGoals[index]?.bpmnFile,
      description: step.description || '',
      hasPlaywrightSupport: false, // TODO: Implementera stöd för att kontrollera detta
      given: step.given,
      when: step.when,
      then: step.then,
      subprocessesSummary: step.subprocessesSummary,
      serviceTasksSummary: step.serviceTasksSummary,
      userTasksSummary: step.userTasksSummary,
      businessRulesSummary: step.businessRulesSummary,
    })),
  };
}

/**
 * Laddar file-level dokumentation från Storage för processer utan callActivities.
 */
async function loadFileLevelDocFromStorage(
  bpmnFile: string
): Promise<{
  summary: string;
  flowSteps: string[];
  userStories?: Array<{
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>;
  dependencies?: string[];
} | null> {
  try {
    const baseName = bpmnFile.replace('.bpmn', '');
    const docFileName = `${baseName}.html`;
    const { storageFileExists } = await import('./artifactUrls');
    const { supabase } = await import('@/integrations/supabase/client');
    const { getCurrentVersionHash } = await import('./bpmnVersioning');
    const { buildDocStoragePaths } = await import('./artifactPaths');
    
    // Get version hash for the BPMN file
    const versionHash = await getCurrentVersionHash(bpmnFile);
    
    if (!versionHash) {
      console.warn(`[e2eScenarioGenerator] No version hash found for ${bpmnFile}, cannot load file-level doc`);
      return null;
    }
    
    // Build storage path using the same logic as when saving (versioned path only)
    const { modePath: docPath } = buildDocStoragePaths(
      docFileName,
      'slow', // mode
      'cloud', // provider
      bpmnFile,
      versionHash
    );
    
    console.log(`[e2eScenarioGenerator] Attempting to load file-level doc from: ${docPath}`);
    
    const exists = await storageFileExists(docPath);
    if (!exists) {
      console.warn(`[e2eScenarioGenerator] File-level doc does not exist at ${docPath}`);
      return null;
    }
    
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(docPath);
    
    if (error || !data) {
      console.warn(`[e2eScenarioGenerator] Failed to download file-level doc from ${docPath}:`, error);
      return null;
    }
    
    const htmlContent = await data.text();
    
    // Extract JSON from HTML (file-level docs use wrapLlmContentAsDocument which embeds JSON)
    const jsonMatch = htmlContent.match(/<script[^>]*type=["']application\/json["'][^>]*>(.*?)<\/script>/s);
    if (jsonMatch) {
      try {
        const docJson = JSON.parse(jsonMatch[1]);
        
        // File-level docs might have a different structure - try to extract relevant info
        // They might have a combined structure with multiple nodes, so we need to extract a summary
        let summary = '';
        let flowSteps: string[] = [];
        let userStories: Array<{
          id: string;
          role: string;
          goal: string;
          value: string;
          acceptanceCriteria: string[];
        }> = [];
        let dependencies: string[] = [];
        
        // Try to extract from docJson directly
        if (docJson.summary) {
          summary = docJson.summary;
        } else if (typeof docJson === 'string') {
          // If it's a string, try to extract summary from HTML content
          const summaryMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
          if (summaryMatch) {
            summary = summaryMatch[1].replace(/<[^>]+>/g, '').trim();
          }
        }
        
        if (Array.isArray(docJson.flowSteps)) {
          flowSteps = docJson.flowSteps;
        }
        
        if (Array.isArray(docJson.userStories)) {
          userStories = docJson.userStories.map((us: any) => ({
            id: us.id || '',
            role: us.role || 'Kund',
            goal: us.goal || '',
            value: us.value || '',
            acceptanceCriteria: Array.isArray(us.acceptanceCriteria) ? us.acceptanceCriteria : [],
          }));
        }
        
        if (Array.isArray(docJson.dependencies)) {
          dependencies = docJson.dependencies;
        }
        
        console.log(`[e2eScenarioGenerator] ✓ Successfully loaded file-level doc for ${bpmnFile} from ${docPath}`);
        return {
          summary,
          flowSteps,
          userStories,
          dependencies,
        };
      } catch (parseError) {
        console.warn(`[e2eScenarioGenerator] Failed to parse JSON from HTML for ${bpmnFile}:`, parseError);
        // Try to extract basic info from HTML even if JSON parsing fails
        const summaryMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (summaryMatch) {
          return {
            summary: summaryMatch[1].replace(/<[^>]+>/g, '').trim(),
            flowSteps: [],
            userStories: [],
            dependencies: [],
          };
        }
      }
    } else {
      // No JSON found - try to extract basic info from HTML
      console.warn(`[e2eScenarioGenerator] No JSON found in file-level doc for ${bpmnFile}, trying to extract from HTML`);
      const summaryMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (summaryMatch) {
        return {
          summary: summaryMatch[1].replace(/<[^>]+>/g, '').trim(),
          flowSteps: [],
          userStories: [],
          dependencies: [],
        };
      }
    }
    
    console.warn(`[e2eScenarioGenerator] Could not extract data from file-level doc for ${bpmnFile}`);
    return null;
  } catch (error) {
    console.warn(`[e2eScenarioGenerator] Failed to load file-level doc for ${bpmnFile}:`, error);
    return null;
  }
}

/**
 * Laddar Feature Goal-dokumentation från Storage.
 */
async function loadFeatureGoalDocFromStorage(
  bpmnFile: string,
  elementId: string,
  parentBpmnFile?: string
): Promise<FeatureGoalDoc | null> {
  try {
    // Hitta parentBpmnFile om den saknas
    let resolvedParentBpmnFile = parentBpmnFile;
    if (!resolvedParentBpmnFile) {
      try {
        const bpmnMapResult = await loadBpmnMapFromStorage();
        if (bpmnMapResult.valid && bpmnMapResult.map) {
          resolvedParentBpmnFile = findParentBpmnFileForSubprocess(
            bpmnFile,
            elementId,
            bpmnMapResult.map
          ) || undefined;
        }
      } catch (error) {
        console.warn(`[e2eScenarioGenerator] Could not load bpmn-map to find parent for ${bpmnFile}::${elementId}:`, error);
      }
    }

    // VIKTIGT: CallActivity Feature Goals genereras INTE längre.
    // Istället genereras Process Feature Goals för subprocess-filen (non-hierarchical naming).
    // Process Feature Goals använder format: feature-goals/{subprocessBaseName}.html
    // (inte hierarchical: feature-goals/{parent}-{elementId}.html)
    // 
    // För att ladda Process Feature Goal, använd subprocess-filens baseName och ingen parent.
    // resolvedParentBpmnFile behövs INTE längre för att ladda Process Feature Goals.

    // Get version hash (required)
    const { getCurrentVersionHash } = await import('./bpmnVersioning');
    const versionHash = await getCurrentVersionHash(bpmnFile);
    
    if (!versionHash) {
      console.warn(`[e2eScenarioGenerator] No version hash found for ${bpmnFile}, cannot load Feature Goal doc`);
      return null;
    }
    
    // VIKTIGT: Använd Process Feature Goal (non-hierarchical) istället för CallActivity Feature Goal (hierarchical)
    // Process Feature Goals använder subprocess-filens baseName som elementId och ingen parent
    const subprocessBaseName = bpmnFile.replace('.bpmn', '');
    const { getFeatureGoalDocFileKey } = await import('./nodeArtifactPaths');
    const { buildDocStoragePaths } = await import('./artifactPaths');
    
    // Non-hierarchical naming för Process Feature Goal (ingen parent)
    const processFeatureGoalKey = getFeatureGoalDocFileKey(
      bpmnFile,
      subprocessBaseName, // För Process Feature Goals är elementId = baseName
      undefined, // no version suffix
      undefined, // no parent (non-hierarchical)
      false, // isRootProcess = false (detta är en subprocess)
    );
    
    const { modePath: docPath } = buildDocStoragePaths(
      processFeatureGoalKey,
      'slow', // mode
      'cloud', // provider (claude är cloud provider)
      bpmnFile, // bpmnFileForVersion: use subprocess file for versioned paths
      versionHash,
    );
    
    if (!docPath) {
      return null;
    }
    
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(docPath);
    
    if (error || !data) {
      return null;
    }
    
    const htmlContent = await data.text();
    
    // Extrahera JSON från HTML (samma logik som i docRendering.ts)
    // Försök hitta JSON i HTML
    const jsonMatch = htmlContent.match(/<script[^>]*type=["']application\/json["'][^>]*>(.*?)<\/script>/s);
    if (jsonMatch) {
      try {
        const docJson = JSON.parse(jsonMatch[1]);
        return {
          callActivityId: elementId,
          bpmnFile: bpmnFile,
          summary: docJson.summary || '',
          flowSteps: Array.isArray(docJson.flowSteps) ? docJson.flowSteps : [],
          userStories: Array.isArray(docJson.userStories) ? docJson.userStories.map((us: any) => ({
            id: us.id || '',
            role: us.role || 'Kund',
            goal: us.goal || '',
            value: us.value || '',
            acceptanceCriteria: Array.isArray(us.acceptanceCriteria) ? us.acceptanceCriteria : [],
          })) : [],
          dependencies: Array.isArray(docJson.dependencies) ? docJson.dependencies : [], // Includes both process context (prerequisites) and technical systems
        };
      } catch (parseError) {
        console.warn(`[e2eScenarioGenerator] Failed to parse JSON from HTML for ${bpmnFile}::${elementId}:`, parseError);
      }
    }
    
    // Fallback: Försök ladda från llm-debug/docs-raw
    // VIKTIGT: Använd Process Feature Goal key (non-hierarchical) istället för CallActivity Feature Goal key (hierarchical)
    // Använd samma processFeatureGoalKey som redan beräknats ovan
    const docInfo = await loadChildDocFromStorage(
      bpmnFile,
      elementId,
      processFeatureGoalKey,
      null,
      'e2e-scenario-generation'
    );
    
    if (docInfo) {
      return {
        callActivityId: elementId,
        bpmnFile: bpmnFile,
        summary: docInfo.summary || '',
        flowSteps: docInfo.flowSteps || [],
        dependencies: [...(docInfo.inputs || []), ...(docInfo.outputs || [])], // Combine inputs (prerequisites) and outputs (technical systems) into dependencies
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`[e2eScenarioGenerator] Error loading Feature Goal doc for ${bpmnFile}::${elementId}:`, error);
    return null;
  }
}

export interface E2eScenarioGenerationResult {
  scenarios: E2eScenario[];
  paths: ProcessPath[];
  skippedPaths?: {
    noDocs: number;
    noMatch: number;
    noResult: number;
    total: number;
  };
}

/**
 * Genererar E2E-scenarios för alla paths i en BPMN-process.
 * Returnerar både scenarios och paths för vidare användning (t.ex. Feature Goal-test-generering).
 */
export async function generateE2eScenariosForProcess(
  rootBpmnFile: string,
  processName: string,
  initiative: string,
  llmProvider?: LlmProvider,
  allowFallback: boolean = true,
  abortSignal?: AbortSignal,
  progressCallback?: (progress: { current: number; total: number; currentPath?: string }) => void
): Promise<E2eScenarioGenerationResult> {
  const scenarios: E2eScenario[] = [];
  
  try {
    // 1. Parse BPMN file
    const parseResult = await parseBpmnFile(rootBpmnFile);
    if (!parseResult) {
      throw new Error(`Failed to parse BPMN file: ${rootBpmnFile}`);
    }
    
    // 2. Build flow graph
    const flowGraph = buildFlowGraph(parseResult);
    
    // 3. Find start events
    const startEvents = findStartEvents(flowGraph);
    if (startEvents.length === 0) {
      console.warn(`[e2eScenarioGenerator] No start events found in ${rootBpmnFile}`);
      return { scenarios: [], paths: [] };
    }
    
    // 4. Find paths for each start event
    const allPaths: ProcessPath[] = [];
    for (const startEvent of startEvents) {
      const paths = findPathsThroughProcess(flowGraph, startEvent.id);
      allPaths.push(...paths);
    }
    
    if (allPaths.length === 0) {
      console.warn(`[e2eScenarioGenerator] No paths found in ${rootBpmnFile}`);
      return { scenarios: [], paths: [] };
    }
    
    console.log(`[e2eScenarioGenerator] Found ${allPaths.length} paths to process for ${rootBpmnFile}`);
    
    if (allPaths.length === 0) {
      console.warn(`[e2eScenarioGenerator] No paths found in ${rootBpmnFile} - cannot generate E2E scenarios`);
      return { scenarios: [], paths: [] };
    }
    
    progressCallback?.({ current: 0, total: allPaths.length });
    
    // Store paths that were used for generation (for Feature Goal test extraction)
    const usedPaths: ProcessPath[] = [];
    let skippedNoDocs = 0;
    let skippedNoMatch = 0;
    let skippedNoResult = 0;
    
    // 5. Generate E2E scenario for each path
    for (let i = 0; i < allPaths.length; i++) {
      if (abortSignal?.aborted) {
        throw new Error('E2E scenario generation cancelled');
      }
      
      const path = allPaths[i];
      progressCallback?.({
        current: i,
        total: allPaths.length,
        currentPath: `Path ${i + 1}/${allPaths.length}: ${path.startEvent} → ${path.endEvent}`,
      });
      
      // 6. Load Feature Goal documentation for each Feature Goal in path
      // OR load file-level documentation if path has no Feature Goals (processes without callActivities)
      const featureGoalDocs: FeatureGoalDoc[] = [];
      
      if (path.featureGoals.length === 0) {
        // Process without callActivities: Load file-level documentation instead
        console.log(`[e2eScenarioGenerator] Path ${path.startEvent} → ${path.endEvent} has no Feature Goals, loading file-level documentation for ${rootBpmnFile}`);
        
        const fileLevelDoc = await loadFileLevelDocFromStorage(rootBpmnFile);
        if (fileLevelDoc) {
          // Create a dummy FeatureGoalDoc from file-level documentation
          featureGoalDocs.push({
            callActivityId: rootBpmnFile.replace('.bpmn', ''),
            bpmnFile: rootBpmnFile,
            summary: fileLevelDoc.summary || '',
            flowSteps: fileLevelDoc.flowSteps || [],
            userStories: fileLevelDoc.userStories || [],
            dependencies: fileLevelDoc.dependencies || [],
          });
        } else {
          console.warn(`[e2eScenarioGenerator] Could not load file-level doc for ${rootBpmnFile}`);
        }
      } else {
        // Process with callActivities: Load Feature Goal documentation
        for (const featureGoalId of path.featureGoals) {
          // Hitta BPMN-fil för Feature Goal (behöver hitta från graph)
          const featureGoalNode = flowGraph.nodes.get(featureGoalId);
          if (!featureGoalNode) {
            console.warn(`[e2eScenarioGenerator] Feature Goal node not found: ${featureGoalId}`);
            continue;
          }
          
          // Försök hitta BPMN-fil från parseResult
          // BpmnElement har inte bpmnFile, men vi kan använda parseResult.fileName
          // eller hitta subprocess-filen från graph
          const bpmnFile = rootBpmnFile; // Use root file as default, subprocess file should be found via graph
          // bpmnFile är subprocess-filen, parent-filen är rootBpmnFile (där callActivity är definierad)
          const parentBpmnFile = rootBpmnFile;
          
          const doc = await loadFeatureGoalDocFromStorage(bpmnFile, featureGoalId, parentBpmnFile);
          if (doc) {
            featureGoalDocs.push(doc);
          } else {
            console.warn(`[e2eScenarioGenerator] Could not load Feature Goal doc for ${bpmnFile}::${featureGoalId}`);
          }
        }
      }
      
      // FORBÄTTRING: Samla information om misslyckade dokumentationsladdningar för tydlig feedback
      if (featureGoalDocs.length === 0) {
        const missingFeatureGoals = path.featureGoals.length > 0 
          ? path.featureGoals.join(', ')
          : 'file-level documentation';
        console.warn(
          `[e2eScenarioGenerator] No documentation loaded for path ${path.startEvent} → ${path.endEvent}. ` +
          `Missing: ${missingFeatureGoals}`
        );
        skippedNoDocs++;
        continue;
      }

      // FORBÄTTRING: Validera dokumentationskvalitet innan generering
      const { validateFeatureGoalDocQuality, validateFileLevelDocQuality } = await import('./documentationQualityValidator');
      const qualityResults = featureGoalDocs.map(doc => {
        if (path.featureGoals.length === 0) {
          // File-level documentation
          return validateFileLevelDocQuality(doc);
        } else {
          // Feature Goal documentation
          return validateFeatureGoalDocQuality(doc);
        }
      });

      // Kontrollera om någon dokumentation är ogiltig
      const invalidDocs = qualityResults.filter(r => !r.isValid);
      if (invalidDocs.length > 0) {
        const missingFields = invalidDocs.flatMap(r => r.missingFields);
        console.warn(
          `[e2eScenarioGenerator] Documentation quality issues for path ${path.startEvent} → ${path.endEvent}. ` +
          `Missing fields: ${missingFields.join(', ')}. Continuing anyway but quality may be reduced.`
        );
      }

      // Logga varningar om dokumentationskvalitet
      const allWarnings = qualityResults.flatMap(r => r.warnings);
      if (allWarnings.length > 0) {
        console.warn(
          `[e2eScenarioGenerator] Documentation quality warnings for path ${path.startEvent} → ${path.endEvent}: ` +
          allWarnings.join('; ')
        );
      }
      
      // 7. Check if path matches one of the three prioritized scenarios
      // For processes without callActivities (using file-level docs), always allow generation
      // The prioritized scenario check is mainly for processes with Feature Goals
      const matchesPrioritizedScenario = path.featureGoals.length === 0 
        ? true // Always allow for processes without callActivities
        : checkIfPathMatchesPrioritizedScenario(path, featureGoalDocs);
      
      if (!matchesPrioritizedScenario) {
        console.log(`[e2eScenarioGenerator] Path ${path.startEvent} → ${path.endEvent} does not match prioritized scenarios, skipping`);
        skippedNoMatch++;
        continue;
      }
      
      // 8. Generate E2E scenario with Claude
      const context: E2eScenarioContext = {
        path,
        featureGoals: featureGoalDocs,
        processInfo: {
          bpmnFile: rootBpmnFile,
          processName,
          initiative,
        },
      };
      
      console.log(`[e2eScenarioGenerator] Generating E2E scenario for path ${path.startEvent} → ${path.endEvent} (${featureGoalDocs.length} docs loaded)`);
      
      try {
        const result = await generateE2eScenarioWithLlm(
          context,
          llmProvider,
          allowFallback,
          abortSignal
        );
        
        if (result && result.scenario) {
          scenarios.push(result.scenario);
          // Store the path that was used for this scenario
          usedPaths.push(path);
          console.log(`[e2eScenarioGenerator] ✓ Successfully generated E2E scenario for path ${path.startEvent} → ${path.endEvent}`);
        } else {
          console.warn(`[e2eScenarioGenerator] ✗ No scenario generated for path ${path.startEvent} → ${path.endEvent} (result: ${result ? 'null scenario' : 'null result'})`);
          skippedNoResult++;
        }
      } catch (error) {
        console.error(`[e2eScenarioGenerator] ✗ Error generating E2E scenario for path ${path.startEvent} → ${path.endEvent}:`, error);
        skippedNoResult++;
      }
    }
    
    console.log(`[e2eScenarioGenerator] Summary: ${scenarios.length} scenarios generated, ${skippedNoDocs} skipped (no docs), ${skippedNoMatch} skipped (no match), ${skippedNoResult} skipped (no result)`);
    
    progressCallback?.({ current: allPaths.length, total: allPaths.length });
    
    // FORBÄTTRING: Returnera information om hoppade över paths för tydlig feedback
    return {
      scenarios,
      paths: usedPaths, // Return only paths that were actually used for generation
      skippedPaths: {
        noDocs: skippedNoDocs,
        noMatch: skippedNoMatch,
        noResult: skippedNoResult,
        total: skippedNoDocs + skippedNoMatch + skippedNoResult,
      }
    };
  } catch (error) {
    console.error('[e2eScenarioGenerator] Error generating E2E scenarios:', error);
    throw error;
  }
}

/**
 * Kontrollerar om en path matchar en av de tre prioriterade scenarios.
 * 
 * De tre scenarios:
 * 1. Lyckad sökning för en sökare (bostadsrätt) - happy path, en sökande
 * 2. Lyckad sökning för en sökare med en medsökare (bostadsrätt) - happy path, medsökande
 * 3. En sökare som behöver genomgå mest möjliga steg (bostadsrätt) - alt path med manuella steg
 */
function checkIfPathMatchesPrioritizedScenario(
  path: ProcessPath,
  featureGoalDocs: FeatureGoalDoc[]
): boolean {
  // Kontrollera om det är en error path (inte en av de tre)
  const isErrorPath = path.endEvent.toLowerCase().includes('error') || 
                      path.endEvent.toLowerCase().includes('reject') ||
                      path.endEvent.toLowerCase().includes('fail');
  
  if (isErrorPath) {
    return false;
  }
  
  // Kontrollera gateway-conditions för att identifiera en sökande vs medsökande
  const hasSingleStakeholder = path.gatewayConditions.some(gc => 
    gc.conditionText.toLowerCase().includes('stakeholders.length === 1') ||
    gc.conditionText.toLowerCase().includes('stakeholders.length == 1') ||
    gc.conditionText.toLowerCase().includes('stakeholder.length === 1')
  );
  
  const hasMultipleStakeholders = path.gatewayConditions.some(gc => 
    gc.conditionText.toLowerCase().includes('stakeholders.length > 1') ||
    gc.conditionText.toLowerCase().includes('stakeholders.length >= 2') ||
    gc.conditionText.toLowerCase().includes('stakeholder.length > 1')
  );
  
  // Kontrollera om det finns manuella steg (scenario 3)
  const hasManualSteps = featureGoalDocs.some(doc => 
    doc.summary.toLowerCase().includes('manuell') ||
    doc.summary.toLowerCase().includes('manual') ||
    doc.flowSteps.some(step => 
      step.toLowerCase().includes('manuell') ||
      step.toLowerCase().includes('manual') ||
      step.toLowerCase().includes('granskning') ||
      step.toLowerCase().includes('review')
    )
  );
  
  // Scenario 1: En sökande, happy path, inga manuella steg
  if (hasSingleStakeholder && !hasManualSteps) {
    return true;
  }
  
  // Scenario 2: Medsökande, happy path, inga manuella steg
  if (hasMultipleStakeholders && !hasManualSteps) {
    return true;
  }
  
  // Scenario 3: En sökande, med manuella steg
  if (hasSingleStakeholder && hasManualSteps) {
    return true;
  }
  
  // Om ingen tydlig match, acceptera happy paths (kan vara scenario 1 eller 2)
  // Men hoppa över om det är tydligt att det inte är en av de tre
  if (!hasManualSteps && (hasSingleStakeholder || hasMultipleStakeholders)) {
    return true;
  }
  
  return false;
}

