import { supabase } from '@/integrations/supabase/client';
import { parseBpmnFile, type BpmnParseResult } from '@/lib/bpmnParser';
import type { BpmnMap } from './bpmnMapLoader';
import { loadBpmnMap as parseBpmnMap } from './bpmnMapLoader';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite/ts-node hanterar JSON-import enligt bundler-konfigurationen.
import rawBpmnMap from '../../../bpmn-map.json';

export async function loadAllBpmnParseResults(): Promise<
  Map<string, BpmnParseResult>
> {
  const results = new Map<string, BpmnParseResult>();

  const { data, error } = await supabase
    .from('bpmn_files')
    .select('file_name, storage_path')
    .eq('file_type', 'bpmn');

  if (error) {
    // Check if this is an authentication error (common after db reset)
    const isAuthError = error.message?.includes('User from sub claim in JWT does not exist') ||
      error.message?.includes('JWT') ||
      error.message?.includes('401') ||
      error.message?.includes('403') ||
      (error as any).status === 401 ||
      (error as any).status === 403;
    
    if (isAuthError) {
      // Sign out user and throw a more descriptive error
      await supabase.auth.signOut();
      throw new Error('Din session är ogiltig (troligen efter databasreset). Logga in igen.');
    }
    throw error;
  }

  const loadedFiles: string[] = [];
  const failedFiles: Array<{ fileName: string; error: string }> = [];

  for (const row of data ?? []) {
    const fileName = row.file_name as string;
    const storagePath = row.storage_path as string | null;
    
    let loaded = false;
    
    // Try loading directly from storage first (most reliable)
    if (storagePath) {
      try {
        const { data: fileData, error: storageError } = await supabase.storage
          .from('bpmn-files')
          .download(storagePath);
        
        if (!storageError && fileData) {
          const xml = await fileData.text();
          if (xml && xml.includes('<bpmn:definitions')) {
            // Use a temporary blob URL to parse
            const blobUrl = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
            try {
              const parsed = await parseBpmnFile(blobUrl);
              results.set(fileName, parsed);
              loadedFiles.push(fileName);
              loaded = true;
              if (import.meta.env.DEV) {
                console.log(`[debugDataLoader] ✓ Loaded ${fileName} from storage`);
              }
            } catch (parseErr) {
              const errorMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
              failedFiles.push({ fileName, error: `Parse error: ${errorMessage}` });
              console.warn(`[debugDataLoader] Failed to parse ${fileName}:`, errorMessage);
            } finally {
              URL.revokeObjectURL(blobUrl);
            }
          } else {
            failedFiles.push({ fileName, error: 'Invalid XML content' });
            console.warn(`[debugDataLoader] Invalid XML for ${fileName}`);
          }
        } else if (storageError) {
          failedFiles.push({ fileName, error: `Storage error: ${storageError.message}` });
          console.warn(`[debugDataLoader] Storage error for ${fileName}:`, storageError);
        }
      } catch (storageErr) {
        const errorMessage = storageErr instanceof Error ? storageErr.message : String(storageErr);
        failedFiles.push({ fileName, error: `Storage exception: ${errorMessage}` });
        console.warn(`[debugDataLoader] Storage exception for ${fileName}:`, errorMessage);
      }
    }
    
    // Fallback: try loading from /bpmn/ path (for local development)
    if (!loaded) {
      try {
        const parsed = await parseBpmnFile(`/bpmn/${fileName}`);
        results.set(fileName, parsed);
        loadedFiles.push(fileName);
        if (import.meta.env.DEV) {
          console.log(`[debugDataLoader] ✓ Loaded ${fileName} from /bpmn/ path`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (!failedFiles.find(f => f.fileName === fileName)) {
          failedFiles.push({ fileName, error: `Path error: ${errorMessage}` });
        }
        console.warn(`[debugDataLoader] Failed to load ${fileName} from /bpmn/:`, errorMessage);
      }
    }
  }

  console.log(`[debugDataLoader] Loaded ${loadedFiles.length} files, ${failedFiles.length} failed`);
  console.log(`[debugDataLoader] Loaded files:`, loadedFiles);
  if (failedFiles.length > 0) {
    console.warn('[debugDataLoader] Failed files:', failedFiles);
  }

  // Log summary of what was loaded
  const fileCount = results.size;
  const processCount = Array.from(results.values()).reduce(
    (sum, result) => sum + (result.meta.processes?.length || 0),
    0
  );
  console.log(`[debugDataLoader] Summary: ${fileCount} files, ${processCount} processes`);

  return results;
}

export async function loadBpmnMap(): Promise<BpmnMap | undefined> {
  try {
    // Försök ladda från storage först, fallback till projektfilen
    const { loadBpmnMapFromStorage } = await import('./bpmnMapStorage');
    return await loadBpmnMapFromStorage();
  } catch {
    // Fallback till projektfilen om storage-laddning misslyckas
    try {
      return parseBpmnMap(rawBpmnMap);
    } catch {
      return undefined;
    }
  }
}

