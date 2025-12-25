import { extractFeatureGoalTestsWithGatewayContext } from './e2eToFeatureGoalTestExtractor';
import { savePlannedScenarios } from './plannedScenariosHelper';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import type { ProcessPath } from '@/lib/bpmnFlowExtractor';
import { getFeatureGoalDocStoragePaths } from './artifactUrls';
import { supabase } from '@/integrations/supabase/client';
import { loadChildDocFromStorage } from './bpmnGenerators/docRendering';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';

export interface FeatureGoalTestGenerationOptions {
  e2eScenarios: E2eScenario[];
  paths: ProcessPath[];
  bpmnFiles: string[];
}

export interface FeatureGoalTestGenerationResult {
  generated: number;
  skipped: number;
  errors: Array<{ callActivityId: string; error: string }>;
}

/**
 * Genererar Feature Goal-tester från E2E-scenarios
 * Använder hybrid approach: deterministisk först, Claude som fallback
 */
export async function generateFeatureGoalTestsFromE2e(
  options: FeatureGoalTestGenerationOptions
): Promise<FeatureGoalTestGenerationResult> {
  const result: FeatureGoalTestGenerationResult = {
    generated: 0,
    skipped: 0,
    errors: [],
  };

  // 1. Ladda Feature Goal-dokumentation
  const featureGoalDocs = await loadFeatureGoalDocs(options.bpmnFiles);

  // 2. Extrahera Feature Goal-tester från E2E-scenarios (hybrid approach)
  const extractions = await extractFeatureGoalTestsWithGatewayContext(
    options.e2eScenarios,
    options.paths,
    featureGoalDocs
  );

  // 3. Spara Feature Goal-tester till databas
  for (const [key, extraction] of extractions.entries()) {
    try {
      const [bpmnFile, callActivityId] = key.split('::');
      
      const rows = [{
        bpmn_file: bpmnFile,
        bpmn_element_id: callActivityId,
        provider: 'claude' as const,
        origin: 'llm-doc' as const,
        scenarios: extraction.testScenarios,
      }];

      const saveResult = await savePlannedScenarios(rows, 'e2e-to-feature-goal');
      
      if (saveResult.success) {
        result.generated += extraction.testScenarios.length;
      } else {
        result.skipped += extraction.testScenarios.length;
        result.errors.push({
          callActivityId,
          error: saveResult.error?.message || 'Unknown error',
        });
      }
    } catch (error) {
      result.skipped += extraction.testScenarios.length;
      result.errors.push({
        callActivityId: extraction.callActivityId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * Laddar Feature Goal-dokumentation för alla BPMN-filer från Supabase Storage.
 * 
 * Denna funktion laddar Feature Goal-dokumentation för alla Call Activities
 * som finns i de angivna BPMN-filerna. Dokumentationen används för att berika
 * Feature Goal-tester som extraheras från E2E-scenarios.
 */
async function loadFeatureGoalDocs(
  bpmnFiles: string[]
): Promise<Map<string, FeatureGoalDocModel>> {
  const docs = new Map<string, FeatureGoalDocModel>();
  
  // För varje BPMN-fil, hitta alla Call Activities och ladda deras dokumentation
  for (const bpmnFile of bpmnFiles) {
    try {
      // Parse BPMN file to find Call Activities
      const { parseBpmnFile } = await import('./bpmnParser');
      const parseResult = await parseBpmnFile(bpmnFile);
      
      if (!parseResult) {
        console.warn(`[loadFeatureGoalDocs] Failed to parse BPMN file: ${bpmnFile}`);
        continue;
      }
      
      // Find all Call Activities in this file
      const callActivities = parseResult.elements.filter(
        (e) => e.type === 'bpmn:CallActivity' || e.type === 'callActivity'
      );
      
      // Load documentation for each Call Activity
      for (const callActivity of callActivities) {
        const key = `${bpmnFile}::${callActivity.id}`;
        
        // Skip if already loaded
        if (docs.has(key)) {
          continue;
        }
        
        try {
          const doc = await loadFeatureGoalDocFromStorage(bpmnFile, callActivity.id);
          if (doc) {
            docs.set(key, doc);
          }
        } catch (error) {
          console.warn(
            `[loadFeatureGoalDocs] Failed to load Feature Goal doc for ${bpmnFile}::${callActivity.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.warn(`[loadFeatureGoalDocs] Error processing BPMN file ${bpmnFile}:`, error);
    }
  }
  
  return docs;
}

/**
 * Laddar Feature Goal-dokumentation från Storage för en specifik Call Activity.
 * Använder samma logik som i e2eScenarioGenerator.ts.
 */
async function loadFeatureGoalDocFromStorage(
  bpmnFile: string,
  elementId: string
): Promise<FeatureGoalDocModel | null> {
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
      const jsonMatch = htmlContent.match(/<script[^>]*type=["']application\/json["'][^>]*>(.*?)<\/script>/s);
      if (jsonMatch) {
        try {
          const docJson = JSON.parse(jsonMatch[1]);
          
          // Convert to FeatureGoalDocModel format
          return {
            summary: docJson.summary || '',
            prerequisites: Array.isArray(docJson.prerequisites) ? docJson.prerequisites : [],
            flowSteps: Array.isArray(docJson.flowSteps) ? docJson.flowSteps : [],
            dependencies: Array.isArray(docJson.dependencies) ? docJson.dependencies : [],
            userStories: Array.isArray(docJson.userStories) ? docJson.userStories.map((us: any) => ({
              id: us.id || '',
              role: (us.role === 'Kund' || us.role === 'Handläggare' || us.role === 'Processägare') 
                ? us.role 
                : 'Kund',
              goal: us.goal || '',
              value: us.value || '',
              acceptanceCriteria: Array.isArray(us.acceptanceCriteria) ? us.acceptanceCriteria : [],
            })) : [],
          };
        } catch (parseError) {
          console.warn(
            `[loadFeatureGoalDocFromStorage] Failed to parse JSON from HTML for ${bpmnFile}::${elementId}:`,
            parseError
          );
        }
      }
      
      // Fallback: Försök ladda från llm-debug/docs-raw
      const docInfo = await loadChildDocFromStorage(
        bpmnFile,
        elementId,
        getFeatureGoalDocFileKey(bpmnFile, elementId),
        null,
        'feature-goal-test-generation'
      );
      
      if (docInfo) {
        return {
          summary: docInfo.summary || '',
          prerequisites: docInfo.inputs || [],
          flowSteps: docInfo.flowSteps || [],
          dependencies: docInfo.outputs || [],
          userStories: [], // Not available from this source
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn(
      `[loadFeatureGoalDocFromStorage] Error loading Feature Goal doc for ${bpmnFile}::${elementId}:`,
      error
    );
    return null;
  }
}

