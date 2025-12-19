/**
 * BPMN Map Storage
 * 
 * Hanterar bpmn-map.json i Supabase storage istället för projektfilen.
 * Detta gör det möjligt att uppdatera mappningen direkt i appen.
 */

import { supabase } from '@/integrations/supabase/client';
import type { BpmnMap } from './bpmnMapLoader';
import { loadBpmnMap } from './bpmnMapLoader';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite/ts-node hanterar JSON-import enligt bundler-konfigurationen.
import rawBpmnMap from '../../../bpmn-map.json';

const BPMN_MAP_STORAGE_PATH = 'bpmn-map.json';

/**
 * Ladda bpmn-map.json från Supabase storage, med fallback till projektfilen
 */
export async function loadBpmnMapFromStorage(): Promise<BpmnMap> {
  try {
    // Försök ladda från storage
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(BPMN_MAP_STORAGE_PATH);

    if (!error && data) {
      const content = await data.text();
      const mapJson = JSON.parse(content);
      return loadBpmnMap(mapJson);
    }
  } catch (error) {
    console.warn('[bpmnMapStorage] Could not load from storage, using project file:', error);
  }

  // Fallback till projektfilen
  return loadBpmnMap(rawBpmnMap);
}

/**
 * Spara bpmn-map.json till Supabase storage
 */
export async function saveBpmnMapToStorage(
  bpmnMap: BpmnMap,
  syncToGitHub: boolean = false
): Promise<{ success: boolean; error?: string; githubSynced?: boolean }> {
  try {
    const jsonStr = JSON.stringify(bpmnMap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    // Spara till Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('bpmn-files')
      .upload(BPMN_MAP_STORAGE_PATH, blob, {
        upsert: true,
        contentType: 'application/json',
        cacheControl: '3600',
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    let githubSynced = false;
    
    // Synka till GitHub om det är konfigurerat
    if (syncToGitHub) {
      try {
        const { data, error: githubError } = await supabase.functions.invoke('update-github-file', {
          body: {
            path: 'bpmn-map.json',
            content: jsonStr,
            message: 'chore: update bpmn-map.json',
          },
        });

        if (!githubError && data?.success) {
          githubSynced = true;
        } else {
          console.warn('[bpmnMapStorage] GitHub sync failed:', githubError || data?.error);
        }
      } catch (githubErr) {
        console.warn('[bpmnMapStorage] GitHub sync error:', githubErr);
      }
    }

    return { success: true, githubSynced };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Kolla om bpmn-map.json finns i storage
 */
export async function bpmnMapExistsInStorage(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(BPMN_MAP_STORAGE_PATH.split('/').slice(0, -1).join('/') || '', {
        search: BPMN_MAP_STORAGE_PATH.split('/').pop(),
      });

    return !error && (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

