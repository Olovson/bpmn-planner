/**
 * E2E Scenario Storage
 * 
 * Functions for saving and loading E2E scenarios to/from storage.
 * 
 * VIKTIGT: E2E scenarios använder nu version hash (som dokumentation) för att säkerställa
 * att scenarios är kopplade till rätt version av BPMN-filen.
 */

import { supabase } from '@/integrations/supabase/client';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import { getCurrentVersionHash } from './bpmnVersioning';

/**
 * Saves E2E scenarios to Supabase Storage as JSON.
 * Uses version hash (like documentation) to ensure scenarios are linked to the correct BPMN file version.
 */
export async function saveE2eScenariosToStorage(
  bpmnFile: string,
  scenarios: E2eScenario[]
): Promise<void> {
  try {
    const baseName = bpmnFile.replace('.bpmn', '');
    
    // Get version hash for the BPMN file (same as documentation)
    const versionHash = await getCurrentVersionHash(bpmnFile);
    
    if (!versionHash) {
      throw new Error(`No version hash found for ${bpmnFile}. Cannot save E2E scenarios without version hash.`);
    }
    
    // Build storage path with version hash (consistent with documentation)
    // Format: e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json
    const storagePath = `e2e-scenarios/${bpmnFile}/${versionHash}/${baseName}-scenarios.json`;
    
    const jsonContent = JSON.stringify(scenarios, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    const { error } = await supabase.storage
      .from('bpmn-files')
      .upload(storagePath, blob, {
        upsert: true,
        contentType: 'application/json',
      });
    
    if (error) {
      console.error(`[e2eScenarioStorage] Error saving E2E scenarios to ${storagePath}:`, error);
      throw error;
    }
    
    console.log(`[e2eScenarioStorage] Saved ${scenarios.length} E2E scenarios to ${storagePath} (version hash: ${versionHash})`);
  } catch (error) {
    console.error('[e2eScenarioStorage] Failed to save E2E scenarios:', error);
    throw error;
  }
}

/**
 * Loads E2E scenarios from Supabase Storage.
 * Uses versioned path (with version hash) - consistent with documentation.
 */
export async function loadE2eScenariosFromStorage(
  bpmnFile: string
): Promise<E2eScenario[]> {
  try {
    const baseName = bpmnFile.replace('.bpmn', '');
    
    // Get version hash for the BPMN file (same as documentation)
    const versionHash = await getCurrentVersionHash(bpmnFile);
    
    if (!versionHash) {
      console.warn(`[e2eScenarioStorage] No version hash found for ${bpmnFile}, cannot load E2E scenarios`);
      return [];
    }
    
    // Use versioned path (consistent with documentation)
    const versionedPath = `e2e-scenarios/${bpmnFile}/${versionHash}/${baseName}-scenarios.json`;
    
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(versionedPath);
    
    if (error || !data) {
      // File doesn't exist - return empty array
      return [];
    }
    
    const text = await data.text();
    const scenarios = JSON.parse(text) as E2eScenario[];
    console.log(`[e2eScenarioStorage] Loaded ${scenarios.length} E2E scenarios from ${versionedPath}`);
    return scenarios;
  } catch (error) {
    console.warn(`[e2eScenarioStorage] Failed to load E2E scenarios from ${bpmnFile}:`, error);
    return [];
  }
}

/**
 * Loads E2E scenarios for all BPMN files.
 * Uses versioned paths only (e2e-scenarios/{bpmnFile}/{versionHash}/*.json) - consistent with documentation.
 */
export async function loadAllE2eScenarios(): Promise<E2eScenario[]> {
  try {
    const allScenarios: E2eScenario[] = [];
    
    // List BPMN file folders (e2e-scenarios/{bpmnFile}/)
    const { data: bpmnFileFolders, error: listError } = await supabase.storage
      .from('bpmn-files')
      .list('e2e-scenarios', {
        limit: 1000,
      });
    
    if (listError || !bpmnFileFolders || bpmnFileFolders.length === 0) {
      return [];
    }
    
    // Iterate through BPMN file folders
    for (const bpmnFileFolder of bpmnFileFolders) {
      // Only process BPMN file folders (contain .bpmn)
      if (!bpmnFileFolder.name.includes('.bpmn')) {
        continue;
      }
      
      // Look for version hash folders inside
      const { data: versionFolders, error: versionError } = await supabase.storage
        .from('bpmn-files')
        .list(`e2e-scenarios/${bpmnFileFolder.name}`, {
          limit: 100,
        });
      
      if (versionError || !versionFolders) {
        continue;
      }
      
      for (const versionFolder of versionFolders) {
        // List JSON files in this version folder
        const { data: jsonFiles, error: jsonError } = await supabase.storage
          .from('bpmn-files')
          .list(`e2e-scenarios/${bpmnFileFolder.name}/${versionFolder.name}`, {
            limit: 100,
          });
        
        if (jsonError || !jsonFiles) {
          continue;
        }
        
        for (const jsonFile of jsonFiles) {
          if (jsonFile.name.endsWith('.json')) {
            const { data, error: downloadError } = await supabase.storage
              .from('bpmn-files')
              .download(`e2e-scenarios/${bpmnFileFolder.name}/${versionFolder.name}/${jsonFile.name}`);
            
            if (!downloadError && data) {
              try {
                const text = await data.text();
                const scenarios = JSON.parse(text) as E2eScenario[];
                allScenarios.push(...scenarios);
              } catch (parseError) {
                console.warn(`[e2eScenarioStorage] Failed to parse ${jsonFile.name}:`, parseError);
              }
            }
          }
        }
      }
    }
    
    console.log(`[e2eScenarioStorage] Loaded ${allScenarios.length} total E2E scenarios from versioned paths`);
    return allScenarios;
  } catch (error) {
    console.warn('[e2eScenarioStorage] Failed to load all E2E scenarios:', error);
    return [];
  }
}

