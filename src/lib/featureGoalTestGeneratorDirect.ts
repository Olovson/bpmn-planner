import { savePlannedScenarios } from './plannedScenariosHelper';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import type { TestScenario } from '@/data/testMapping';
import { isLlmEnabled } from './llmClient';
import { loadFeatureGoalDocFromStorage } from './featureGoalTestGenerator';
import featureGoalTestPromptMd from '../../prompts/llm/feature_goal_test_prompt.md?raw';
import { getDefaultLlmProvider } from './llmClients';
import { resolveLlmProvider } from './llmProviderResolver';
import { generateWithFallback } from './llmFallback';
import type { LlmProvider } from './llmClientAbstraction';
import { loadBpmnMapFromStorage } from './bpmn/bpmnMapStorage';
import { matchCallActivityUsingMap } from './bpmn/bpmnMapLoader';

export interface FeatureGoalTestGenerationDirectResult {
  generated: number;
  skipped: number;
  errors: Array<{ callActivityId: string; error: string }>;
}

/**
 * Genererar Feature Goal-tester direkt från dokumentation med Claude
 * Istället för att extrahera från E2E-scenarios
 */
export async function generateFeatureGoalTestsDirect(
  bpmnFiles: string[],
  llmProvider?: LlmProvider,
  abortSignal?: AbortSignal,
  availableBpmnFiles?: string[]
): Promise<FeatureGoalTestGenerationDirectResult> {
  const result: FeatureGoalTestGenerationDirectResult = {
    generated: 0,
    skipped: 0,
    errors: [],
  };

  if (!isLlmEnabled()) {
    console.warn('[generateFeatureGoalTestsDirect] LLM is not enabled, skipping Feature Goal test generation');
    return result;
  }

  // 1. Ladda bpmn-map för att hitta subprocess-filer korrekt
  const bpmnMapResult = await loadBpmnMapFromStorage();
  const bpmnMap = bpmnMapResult.valid && bpmnMapResult.map ? bpmnMapResult.map : null;
  
  // 2. Hitta alla callActivities i alla filer
  const callActivities = new Map<string, { bpmnFile: string; callActivityId: string; parentBpmnFile: string }>();
  const knownBpmnFiles = availableBpmnFiles && availableBpmnFiles.length > 0 ? availableBpmnFiles : bpmnFiles;

  for (const bpmnFile of bpmnFiles) {
    try {
      const { parseBpmnFile } = await import('./bpmnParser');
      const parseResult = await parseBpmnFile(bpmnFile);
      
      if (!parseResult) continue;
      
      let foundCallActivity = false;

      // Hitta alla callActivities i filen
      for (const element of parseResult.elements) {
        if (element.type === 'callActivity' && element.id) {
          foundCallActivity = true;

          // Hitta callActivity-metadata för att få calledElement
          const callActivityMeta = parseResult.meta?.callActivities?.find(ca => ca.id === element.id);
          
          let subprocessFile: string | null = null;
          
          // Försök först med bpmn-map.json (mest pålitligt)
          if (bpmnMap) {
            const mapMatch = matchCallActivityUsingMap(
              {
                id: element.id,
                name: element.name || callActivityMeta?.name,
                calledElement: callActivityMeta?.calledElement,
              },
              bpmnFile,
              bpmnMap
            );
            
            if (mapMatch.matchedFileName) {
              subprocessFile = mapMatch.matchedFileName;
            }
          }
          
          // Fallback: Använd subprocesses från parseResult
          if (!subprocessFile) {
            const subprocessInfo = parseResult.subprocesses.find(sp => sp.id === element.id);
            if (subprocessInfo?.file) {
              subprocessFile = subprocessInfo.file.replace('/bpmn/', '').replace(/\.bpmn$/, '') + '.bpmn';
            }
          }
          
          // Ytterligare fallback: Använd calledElement direkt
          if (!subprocessFile && callActivityMeta?.calledElement) {
            const potentialFiles = [
              `mortgage-se-${callActivityMeta.calledElement}.bpmn`,
              `${callActivityMeta.calledElement}.bpmn`,
            ];
            
            // Kolla om någon av de potentiella filerna finns i bpmnFiles
            for (const potentialFile of potentialFiles) {
              if (knownBpmnFiles.includes(potentialFile)) {
                subprocessFile = potentialFile;
                break;
              }
            }
          }
          
          if (subprocessFile) {
            const key = `${subprocessFile}::${element.id}`;
            if (!callActivities.has(key)) {
              callActivities.set(key, {
                bpmnFile: subprocessFile,
                callActivityId: element.id,
                parentBpmnFile: bpmnFile,
              });
            }
          }
        }
      }

      if (!foundCallActivity) {
        const baseName = bpmnFile.replace('.bpmn', '');
        const key = `${bpmnFile}::${baseName}`;
        if (!callActivities.has(key)) {
          callActivities.set(key, {
            bpmnFile,
            callActivityId: baseName,
            parentBpmnFile: bpmnFile,
          });
        }
      }
    } catch (error) {
      console.warn(`[generateFeatureGoalTestsDirect] Failed to parse ${bpmnFile}:`, error);
    }
  }

  // 2. Generera tester för varje callActivity
  for (const [key, callActivity] of callActivities.entries()) {
    try {
      // Ladda Feature Goal-dokumentation
      const featureGoalDoc = await loadFeatureGoalDocFromStorage(
        callActivity.bpmnFile,
        callActivity.callActivityId,
        callActivity.parentBpmnFile
      );

      if (!featureGoalDoc) {
        result.skipped++;
        continue;
      }

      // Generera test med Claude
      const testScenario = await generateFeatureGoalTestWithClaude(
        callActivity.bpmnFile,
        callActivity.callActivityId,
        callActivity.parentBpmnFile,
        featureGoalDoc,
        llmProvider,
        abortSignal
      );

      if (!testScenario) {
        // Testgenerering misslyckades - logga endast om det är oväntat (t.ex. om dokumentation fanns)
        result.skipped++;
        continue;
      }

      // Spara test
      const rows = [{
        bpmn_file: callActivity.parentBpmnFile,
        bpmn_element_id: callActivity.callActivityId,
        provider: 'claude' as const,
        origin: 'claude-direct' as const,
        scenarios: [testScenario],
      }];

      await savePlannedScenarios(rows, 'claude-direct');
      result.generated++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[generateFeatureGoalTestsDirect] Error generating test for ${key}:`, error);
      result.errors.push({
        callActivityId: callActivity.callActivityId,
        error: errorMessage,
      });
    }
  }

  return result;
}

/**
 * Genererar Feature Goal-test med Claude direkt från dokumentation
 */
async function generateFeatureGoalTestWithClaude(
  bpmnFile: string,
  callActivityId: string,
  parentBpmnFile: string,
  featureGoalDoc: FeatureGoalDocModel,
  llmProvider?: LlmProvider,
  abortSignal?: AbortSignal
): Promise<TestScenario | null> {
  if (!isLlmEnabled()) {
    return null;
  }

  try {
    // Ladda prompt
    const prompt = featureGoalTestPromptMd;
    
    // Resolvera provider
    const globalDefault = getDefaultLlmProvider();
    const resolution = resolveLlmProvider({
      userChoice: llmProvider,
      globalDefault,
      allowFallback: true,
    });
    
    // Bygg kontext
    const context = {
      featureGoalDoc: {
        summary: featureGoalDoc.summary,
        flowSteps: featureGoalDoc.flowSteps,
        userStories: featureGoalDoc.userStories,
        dependencies: featureGoalDoc.dependencies || [],
        businessRules: featureGoalDoc.businessRules || [],
      },
      context: {
        bpmnFile,
        callActivityId,
        parentBpmnFile,
      },
    };

    // Bygg JSON schema
    const jsonSchema = buildFeatureGoalTestJsonSchema();

    const userPrompt = JSON.stringify(context, null, 2);

    // Generera med Claude
    const result = await generateWithFallback({
      docType: 'testscript', // Använd testscript profile
      resolution,
      systemPrompt: prompt,
      userPrompt,
      responseFormat: {
        type: 'json_schema',
        json_schema: jsonSchema,
      },
      validateResponse: (response: string) => {
        try {
          const parsed = JSON.parse(response);
          const hasRequired = parsed.name && parsed.description && parsed.given && parsed.when && parsed.then && parsed.category;
          return {
            valid: hasRequired,
            errors: hasRequired ? [] : ['Missing required fields'],
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

    if (!result || !result.text) {
      throw new Error('No response from Claude');
    }

    // Parse JSON
    const testData = JSON.parse(result.text);

    // Skapa TestScenario
    const testScenario: TestScenario = {
      id: `${callActivityId}-${Date.now()}`,
      name: testData.name || `${callActivityId} - ${featureGoalDoc.summary.substring(0, 50)}`,
      description: testData.description || featureGoalDoc.summary,
      status: 'pending',
      category: testData.category || 'happy-path',
      given: testData.given,
      when: testData.when,
      then: testData.then,
    };

    return testScenario;
  } catch (error) {
    console.error('[generateFeatureGoalTestWithClaude] Error:', error);
    return null;
  }
}

/**
 * Bygger JSON schema för Feature Goal test
 */
function buildFeatureGoalTestJsonSchema() {
  return {
    name: 'FeatureGoalTestModel',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'description', 'given', 'when', 'then', 'category'],
      properties: {
        name: {
          type: 'string',
          description: 'Kort, beskrivande namn för testet',
        },
        description: {
          type: 'string',
          description: 'Kort beskrivning av vad Feature Goal gör (1-2 meningar)',
        },
        given: {
          type: 'string',
          description: 'Given-conditions för Feature Goal (max 10 meningar). Fokusera på prerequisites, initialtillstånd och kontext som påverkar testet. Undvik generiska beskrivningar.',
        },
        when: {
          type: 'string',
          description: 'When-actions för Feature Goal (max 10 meningar). Fokusera på huvudflödet och kritiska steg. Undvik detaljerade tekniska implementationer.',
        },
        then: {
          type: 'string',
          description: 'Then-assertions för Feature Goal (max 10 meningar). Fokusera på testbara assertions. Undvik generiska beskrivningar eller information som inte kan verifieras.',
        },
        category: {
          type: 'string',
          enum: ['happy-path', 'edge-case', 'error-case'],
          description: 'Test-kategori',
        },
      },
    },
  };
}
