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
  prerequisites?: string[];
  dependencies?: string[];
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

  // Bygg input för Claude
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
      flowSteps: fg.flowSteps,
      userStories: fg.userStories || [],
      prerequisites: fg.prerequisites || [],
      dependencies: fg.dependencies || [],
      subprocesses: fg.subprocesses || [],
      serviceTasks: fg.serviceTasks || [],
      userTasks: fg.userTasks || [],
      businessRules: fg.businessRules || [],
    })),
    processInfo: context.processInfo,
  };

  const userPrompt = JSON.stringify(llmInput, null, 2);

  const startTime = Date.now();

  try {
    // Anropa Claude med structured output
    const result = await generateWithFallback(
      {
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userPrompt },
        ],
        provider: resolution.provider,
        schema: buildE2eScenarioJsonSchema(),
        temperature: 0.3, // Lägre temperatur för mer konsistent output
      },
      resolution.fallbackProvider,
      abortSignal
    );

    if (!result) {
      return null;
    }

    const latencyMs = Date.now() - startTime;

    // Validera output
    const validated = validateE2eScenarioOutput(result.text);
    if (!validated) {
      console.error('[e2eScenarioGenerator] Invalid output from LLM');
      return {
        scenario: null,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        latencyMs,
      };
    }

    // Konvertera validerad output till E2eScenario
    const scenario = convertLlmOutputToE2eScenario(validated, context);

    // Logga event
    await logLlmEvent({
      event: 'e2e-scenario-generation',
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      latencyMs,
      nodeId: context.path.startEvent,
      bpmnFile: context.processInfo.bpmnFile,
    });

    // Spara debug artifact
    await saveLlmDebugArtifact({
      type: 'e2e-scenario',
      nodeId: context.path.startEvent,
      bpmnFile: context.processInfo.bpmnFile,
      prompt,
      input: userPrompt,
      output: result.text,
      provider: result.provider,
    });

    return {
      scenario,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      latencyMs,
    };
  } catch (error) {
    console.error('[e2eScenarioGenerator] Error generating E2E scenario:', error);
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
 * Laddar Feature Goal-dokumentation från Storage.
 */
async function loadFeatureGoalDocFromStorage(
  bpmnFile: string,
  elementId: string
): Promise<FeatureGoalDoc | null> {
  try {
    // Försök ladda dokumentation från Storage
    const storagePaths = getFeatureGoalDocStoragePaths(bpmnFile, elementId);
    
    for (const docPath of storagePaths) {
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .download(docPath);
      
      if (error || !data) {
        continue; // Försök nästa path
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
            prerequisites: Array.isArray(docJson.prerequisites) ? docJson.prerequisites : [],
            dependencies: Array.isArray(docJson.dependencies) ? docJson.dependencies : [],
          };
        } catch (parseError) {
          console.warn(`[e2eScenarioGenerator] Failed to parse JSON from HTML for ${bpmnFile}::${elementId}:`, parseError);
        }
      }
      
      // Fallback: Försök ladda från llm-debug/docs-raw
      const docInfo = await loadChildDocFromStorage(
        bpmnFile,
        elementId,
        getFeatureGoalDocFileKey(bpmnFile, elementId),
        null,
        'e2e-scenario-generation'
      );
      
      if (docInfo) {
        return {
          callActivityId: elementId,
          bpmnFile: bpmnFile,
          summary: docInfo.summary || '',
          flowSteps: docInfo.flowSteps || [],
          prerequisites: docInfo.inputs || [],
          dependencies: docInfo.outputs || [],
        };
      }
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
    
    progressCallback?.({ current: 0, total: allPaths.length });
    
    // Store paths that were used for generation (for Feature Goal test extraction)
    const usedPaths: ProcessPath[] = [];
    
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
      const featureGoalDocs: FeatureGoalDoc[] = [];
      
      for (const featureGoalId of path.featureGoals) {
        // Hitta BPMN-fil för Feature Goal (behöver hitta från graph)
        const featureGoalNode = flowGraph.nodes.get(featureGoalId);
        if (!featureGoalNode) {
          console.warn(`[e2eScenarioGenerator] Feature Goal node not found: ${featureGoalId}`);
          continue;
        }
        
        // Försök hitta BPMN-fil från parseResult
        const element = parseResult.elements.find(e => e.id === featureGoalId);
        const bpmnFile = element?.bpmnFile || rootBpmnFile;
        
        const doc = await loadFeatureGoalDocFromStorage(bpmnFile, featureGoalId);
        if (doc) {
          featureGoalDocs.push(doc);
        } else {
          console.warn(`[e2eScenarioGenerator] Could not load Feature Goal doc for ${bpmnFile}::${featureGoalId}`);
        }
      }
      
      if (featureGoalDocs.length === 0) {
        console.warn(`[e2eScenarioGenerator] No Feature Goal docs loaded for path ${path.startEvent} → ${path.endEvent}`);
        continue;
      }
      
      // 7. Check if path matches one of the three prioritized scenarios
      const matchesPrioritizedScenario = checkIfPathMatchesPrioritizedScenario(path, featureGoalDocs);
      
      if (!matchesPrioritizedScenario) {
        console.log(`[e2eScenarioGenerator] Path ${path.startEvent} → ${path.endEvent} does not match prioritized scenarios, skipping`);
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
      }
    }
    
    progressCallback?.({ current: allPaths.length, total: allPaths.length });
    
    return {
      scenarios,
      paths: usedPaths, // Return only paths that were actually used for generation
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

