/**
 * E2E Scenario Storage
 * 
 * Functions for saving and loading E2E scenarios to/from storage.
 */

import { supabase } from '@/integrations/supabase/client';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

/**
 * Saves E2E scenarios to Supabase Storage as JSON.
 */
export async function saveE2eScenariosToStorage(
  bpmnFile: string,
  scenarios: E2eScenario[]
): Promise<void> {
  try {
    const baseName = bpmnFile.replace('.bpmn', '');
    const storagePath = `e2e-scenarios/${baseName}-scenarios.json`;
    
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
    
    console.log(`[e2eScenarioStorage] Saved ${scenarios.length} E2E scenarios to ${storagePath}`);
  } catch (error) {
    console.error('[e2eScenarioStorage] Failed to save E2E scenarios:', error);
    throw error;
  }
}

/**
 * Loads E2E scenarios from Supabase Storage.
 */
export async function loadE2eScenariosFromStorage(
  bpmnFile: string
): Promise<E2eScenario[]> {
  try {
    const baseName = bpmnFile.replace('.bpmn', '');
    const storagePath = `e2e-scenarios/${baseName}-scenarios.json`;
    
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(storagePath);
    
    if (error || !data) {
      // File doesn't exist - return empty array
      return [];
    }
    
    const text = await data.text();
    const scenarios = JSON.parse(text) as E2eScenario[];
    
    return scenarios;
  } catch (error) {
    console.warn(`[e2eScenarioStorage] Failed to load E2E scenarios from ${bpmnFile}:`, error);
    return [];
  }
}

/**
 * Loads E2E scenarios for all BPMN files (finds all e2e-scenarios/*.json files).
 */
export async function loadAllE2eScenarios(): Promise<E2eScenario[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from('bpmn-files')
      .list('e2e-scenarios', {
        search: '.json',
      });
    
    if (error || !files || files.length === 0) {
      return [];
    }
    
    const allScenarios: E2eScenario[] = [];
    
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const { data, error: downloadError } = await supabase.storage
          .from('bpmn-files')
          .download(`e2e-scenarios/${file.name}`);
        
        if (!downloadError && data) {
          try {
            const text = await data.text();
            const scenarios = JSON.parse(text) as E2eScenario[];
            allScenarios.push(...scenarios);
          } catch (parseError) {
            console.warn(`[e2eScenarioStorage] Failed to parse ${file.name}:`, parseError);
          }
        }
      }
    }
    
    return allScenarios;
  } catch (error) {
    console.warn('[e2eScenarioStorage] Failed to load all E2E scenarios:', error);
    return [];
  }
}

