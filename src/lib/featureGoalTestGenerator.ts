import { extractFeatureGoalTestsWithGatewayContext } from './e2eToFeatureGoalTestExtractor';
import { savePlannedScenarios } from './plannedScenariosHelper';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import type { ProcessPath } from '@/lib/bpmnFlowExtractor';
// Feature Goal-dokumentation loading kommer implementeras separat

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
 * Laddar Feature Goal-dokumentation för alla BPMN-filer
 * TODO: Implementera faktisk loading från Supabase Storage
 * För nu, returnera tom map (tester mockar detta)
 */
async function loadFeatureGoalDocs(
  bpmnFiles: string[]
): Promise<Map<string, FeatureGoalDocModel>> {
  const docs = new Map<string, FeatureGoalDocModel>();
  
  // TODO: Implementera faktisk loading från Supabase Storage
  // Se src/lib/e2eScenarioFeatureGoalLoader.ts för referens
  
  return docs;
}

