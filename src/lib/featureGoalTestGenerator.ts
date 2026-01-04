/**
 * Feature Goal Test Generator - Helper Functions
 * 
 * Denna fil innehåller endast helper-funktioner för att ladda Feature Goal-dokumentation.
 * Feature Goal-test-generering görs nu direkt med Claude via featureGoalTestGeneratorDirect.ts.
 */

import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import { supabase } from '@/integrations/supabase/client';
import { loadChildDocFromStorage } from './bpmnGenerators/docRendering';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import { loadBpmnMapFromStorage } from './bpmn/bpmnMapStorage';
import { findParentBpmnFileForSubprocess } from './bpmn/bpmnMapLoader';

/**
 * Laddar Feature Goal-dokumentation från Storage för en specifik Call Activity.
 * Används av featureGoalTestGeneratorDirect.ts och e2eScenarioGenerator.ts.
 */
export async function loadFeatureGoalDocFromStorage(
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

