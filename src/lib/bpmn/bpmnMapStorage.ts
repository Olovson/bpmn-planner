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

// Mutex för att förhindra race conditions när flera anrop försöker skapa filen samtidigt
let isCreatingMap = false;
let createMapPromise: Promise<void> | null = null;

export interface BpmnMapValidationResult {
  valid: boolean;
  map: BpmnMap | null;
  error?: string;
  details?: string;
  source: 'storage' | 'project' | 'created';
}

/**
 * Validera bpmn-map.json struktur
 */
function validateBpmnMapStructure(raw: unknown): { valid: boolean; error?: string; details?: string } {
  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      error: 'bpmn-map.json är inte ett giltigt JSON-objekt',
      details: 'Filen är tom eller innehåller ogiltig JSON',
    };
  }

  const map = raw as any;
  
  if (!Array.isArray(map.processes)) {
    return {
      valid: false,
      error: 'bpmn-map.json saknar "processes"-array',
      details: 'Filen måste innehålla en "processes"-array med process-definitioner',
    };
  }

  // Validera att varje process har nödvändiga fält
  for (let i = 0; i < map.processes.length; i++) {
    const proc = map.processes[i];
    if (!proc || typeof proc !== 'object') {
      return {
        valid: false,
        error: `Process ${i} är ogiltig`,
        details: `processes[${i}] måste vara ett objekt`,
      };
    }
    if (!proc.bpmn_file || typeof proc.bpmn_file !== 'string') {
      return {
        valid: false,
        error: `Process ${i} saknar "bpmn_file"`,
        details: `processes[${i}].bpmn_file måste vara en sträng`,
      };
    }
    if (!Array.isArray(proc.call_activities)) {
      return {
        valid: false,
        error: `Process ${i} har ogiltig "call_activities"`,
        details: `processes[${i}].call_activities måste vara en array`,
      };
    }
  }

  return { valid: true };
}

/**
 * Ladda bpmn-map.json från Supabase storage, med validering och tydlig felhantering
 * 
 * VIKTIGT: Om filen i storage är korrupt eller har problem, kommunicerar vi detta tydligt
 * och använder projektfilen. Vi skapar bara filen från projektfilen om den VERKLIGEN saknas.
 */
export async function loadBpmnMapFromStorage(): Promise<BpmnMapValidationResult> {
  try {
    // Försök ladda från storage
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(BPMN_MAP_STORAGE_PATH);

    // Log error details för debugging (endast i dev)
    if (error && import.meta.env.DEV) {
      console.log('[bpmnMapStorage] Storage error details:', {
        statusCode: error.statusCode,
        status: (error as any)?.status,
        message: error.message,
        name: error.name,
        error: error,
      });
    }

    // Om filen finns i storage, validera den tydligt
    if (!error && data) {
      try {
        const content = await data.text();
        const mapJson = JSON.parse(content);
        
        // Validera strukturen tydligt
        const validation = validateBpmnMapStructure(mapJson);
        if (!validation.valid) {
          // Filen är korrupt eller har problem - kommunicera detta tydligt
          return {
            valid: false,
            map: null,
            error: validation.error || 'bpmn-map.json i storage är ogiltig',
            details: validation.details || 'Filen kan inte användas för generering. Kontrollera filen i storage.',
            source: 'storage',
          };
        }
        
        // Filen är giltig, ladda den
        const map = loadBpmnMap(mapJson);
        return {
          valid: true,
          map,
          source: 'storage',
        };
      } catch (parseError) {
        // JSON-parse misslyckades
        return {
          valid: false,
          map: null,
          error: 'bpmn-map.json i storage är korrupt',
          details: `JSON-parse misslyckades: ${parseError instanceof Error ? parseError.message : String(parseError)}. Filen kan inte användas för generering.`,
          source: 'storage',
        };
      }
    }
    
    // Om filen VERKLIGEN saknas (400, 404, eller "not found" i meddelandet), skapa den automatiskt från projektfilen
    // Supabase Storage kan returnera StorageUnknownError med statusCode undefined men HTTP 400
    const errorStatus = error?.statusCode || (error as any)?.status;
    const errorName = error?.name || '';
    const errorMessage = error?.message || '';
    
    // Om vi får ett fel OCH (det är 400/404 ELLER det är StorageUnknownError), anta att filen saknas
    // StorageUnknownError med tom message och undefined statusCode är ofta ett tecken på att filen saknas
    const isFileNotFound = error && (
      errorStatus === 400 || 
      errorStatus === 404 || 
      (errorName === 'StorageUnknownError' && (!errorMessage || errorMessage === '{}')) || // Supabase kan returnera detta för saknade filer
      errorMessage?.toLowerCase().includes('not found') ||
      errorMessage?.toLowerCase().includes('does not exist') ||
      errorMessage?.toLowerCase().includes('bad request')
    );
    
    if (isFileNotFound) {
      // Använd mutex för att förhindra race conditions när flera anrop försöker skapa filen samtidigt
      if (!isCreatingMap) {
        isCreatingMap = true;
        createMapPromise = (async () => {
          try {
            console.log('[bpmnMapStorage] bpmn-map.json saknas helt i storage, försöker generera automatiskt från BPMN-filer...');
            
            let mapToSave: BpmnMap;
            
            // Försök generera automatiskt från alla BPMN-filer
            try {
              const { generateBpmnMapFromFiles } = await import('./bpmnMapAutoGenerator');
              mapToSave = await generateBpmnMapFromFiles();
              console.log('[bpmnMapStorage] ✓ Automatisk generering lyckades');
            } catch (autoGenError) {
              // Fallback till projektfil om automatisk generering misslyckas
              console.warn('[bpmnMapStorage] Automatisk generering misslyckades, använder projektfil:', autoGenError);
              mapToSave = loadBpmnMap(rawBpmnMap);
            }
            
            // Spara den genererade map:en till storage
            const jsonStr = JSON.stringify(mapToSave, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            
            const { error: uploadError } = await supabase.storage
              .from('bpmn-files')
              .upload(BPMN_MAP_STORAGE_PATH, blob, {
                upsert: false, // VIKTIGT: upsert: false så vi INTE skriver över befintlig fil
                contentType: 'application/json',
                cacheControl: '3600',
              });

            if (!uploadError) {
              console.log('[bpmnMapStorage] ✓ bpmn-map.json skapad i storage');
            } else {
              // Om upload misslyckas (t.ex. filen finns redan), logga varning men fortsätt
              console.warn('[bpmnMapStorage] Kunde inte skapa bpmn-map.json i storage (kan bero på att den redan finns):', uploadError.message);
            }
          } catch (createError) {
            console.warn('[bpmnMapStorage] Kunde inte skapa bpmn-map.json i storage:', createError);
          } finally {
            isCreatingMap = false;
            createMapPromise = null;
          }
        })();
      }
      
      // Vänta på att skapandet är klart (eller om det redan pågår, vänta på det)
      if (createMapPromise) {
        await createMapPromise;
      }
      
      // Försök ladda den nyss skapade filen, annars använd projektfilen
      try {
        const { data: newData, error: newError } = await supabase.storage
          .from('bpmn-files')
          .download(BPMN_MAP_STORAGE_PATH);
        
        if (!newError && newData) {
          const content = await newData.text();
          const mapJson = JSON.parse(content);
          const map = loadBpmnMap(mapJson);
          return {
            valid: true,
            map,
            source: 'created',
          };
        }
      } catch {
        // Fallback till projektfilen
      }
      
      // Returnera projektfilen som fallback
      const map = loadBpmnMap(rawBpmnMap);
      return {
        valid: true,
        map,
        source: 'created',
      };
    }
  } catch (error) {
    // För andra fel, returnera felmeddelande
    return {
      valid: false,
      map: null,
      error: 'Kunde inte ladda bpmn-map.json från storage',
      details: error instanceof Error ? error.message : String(error),
      source: 'storage',
    };
  }

  // Fallback till projektfilen (används om allt annat misslyckas)
  const map = loadBpmnMap(rawBpmnMap);
  return {
    valid: true,
    map,
    source: 'project',
  };
}

/**
 * Ladda bpmn-map.json från storage (enkelt API för bakåtkompatibilitet)
 * Kasta fel om filen i storage är korrupt - användaren måste veta om problem
 */
export async function loadBpmnMapFromStorageSimple(): Promise<BpmnMap> {
  const result = await loadBpmnMapFromStorage();
  
  if (!result.valid || !result.map) {
    // Om filen i storage är korrupt, kasta ett tydligt fel
    throw new Error(
      result.error || 'bpmn-map.json är ogiltig' + 
      (result.details ? `: ${result.details}` : '')
    );
  }
  
  return result.map;
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

