import { extractFeatureGoalTestsWithGatewayContext } from './e2eToFeatureGoalTestExtractor';
import { savePlannedScenarios } from './plannedScenariosHelper';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import type { ProcessPath } from '@/lib/bpmnFlowExtractor';
import { getFeatureGoalDocStoragePaths } from './artifactUrls';
import { supabase } from '@/integrations/supabase/client';
import { loadChildDocFromStorage } from './bpmnGenerators/docRendering';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import { loadBpmnMapFromStorage } from './bpmn/bpmnMapStorage';
import { findParentBpmnFileForSubprocess } from './bpmn/bpmnMapLoader';

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
          // bpmnFile är parent-filen, hitta subprocess-filen från parseResult.subprocesses
          const subprocessInfo = parseResult.subprocesses.find(
            (sp) => sp.id === callActivity.id
          );
          const subprocessFile = subprocessInfo?.file 
            ? subprocessInfo.file.replace('/bpmn/', '').replace('.bpmn', '') + '.bpmn'
            : bpmnFile; // Fallback om subprocess-fil saknas
          
          const doc = await loadFeatureGoalDocFromStorage(subprocessFile, callActivity.id, bpmnFile);
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
  elementId: string,
  parentBpmnFile?: string
): Promise<FeatureGoalDocModel | null> {
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
        console.warn(`[featureGoalTestGenerator] Could not load bpmn-map to find parent for ${bpmnFile}::${elementId}:`, error);
      }
    }

    // VIKTIGT: CallActivity Feature Goals genereras INTE längre.
    // Istället genereras Process Feature Goals för subprocess-filen (non-hierarchical naming).
    // Process Feature Goals använder format: feature-goals/{subprocessBaseName}.html
    // (inte hierarchical: feature-goals/{parent}-{elementId}.html)
    // 
    // resolvedParentBpmnFile behövs INTE längre för att ladda Process Feature Goals.

    // Get version hash (required)
    const { getCurrentVersionHash } = await import('./bpmnVersioning');
    const versionHash = await getCurrentVersionHash(bpmnFile);
    
    if (!versionHash) {
      console.warn(`[featureGoalTestGenerator] No version hash found for ${bpmnFile}, cannot load Feature Goal doc`);
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
    const jsonMatch = htmlContent.match(/<script[^>]*type=["']application\/json["'][^>]*>(.*?)<\/script>/s);
    if (jsonMatch) {
      try {
        const docJson = JSON.parse(jsonMatch[1]);
        
        // Convert to FeatureGoalDocModel format
        return {
          summary: docJson.summary || '',
          flowSteps: Array.isArray(docJson.flowSteps) ? docJson.flowSteps : [],
          dependencies: Array.isArray(docJson.dependencies) ? docJson.dependencies : [], // Includes both process context (prerequisites) and technical systems
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
    // VIKTIGT: Använd Process Feature Goal key (non-hierarchical) istället för CallActivity Feature Goal key (hierarchical)
    // Använd samma processFeatureGoalKey som redan beräknats ovan
    const docInfo = await loadChildDocFromStorage(
      bpmnFile,
      elementId,
      processFeatureGoalKey,
      null,
      'feature-goal-test-generation'
    );
    
    if (docInfo) {
      return {
        summary: docInfo.summary || '',
        flowSteps: docInfo.flowSteps || [],
        dependencies: [...(docInfo.inputs || []), ...(docInfo.outputs || [])], // Combine inputs (prerequisites) and outputs (technical systems) into dependencies
        userStories: [], // Not available from this source
      };
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

