/**
 * Helper functions for uploading documentation to Supabase Storage
 */

import { supabase } from '@/integrations/supabase/client';
import { buildDocStoragePaths } from '@/lib/artifactPaths';
import { extractBpmnFileFromDocFileName, getVersionHashForDoc } from './docFileHelpers';
import type { BpmnFile } from '@/hooks/useBpmnFiles';
import type { LlmGenerationMode } from '@/lib/llmMode';
import type { LlmProvider } from '@/lib/llmClientAbstraction';

export interface DocUploadProgress {
  planned: number;
  completed: number;
}

export interface DocUploadResult {
  docsCount: number;
  detailedDocFiles: string[];
}

/**
 * Uploads documentation files to Supabase Storage
 */
export async function uploadDocumentation(
  docs: Map<string, string>,
  rootFile: BpmnFile,
  filesIncluded: string[],
  effectiveLlmMode: LlmGenerationMode,
  llmProvider: LlmProvider,
  getVersionHashForFile: (fileName: string) => Promise<string | null>,
  onProgress?: (progress: DocUploadProgress) => void,
  checkCancel?: () => void,
  onError?: (error: string) => void,
  onStepUpdate?: (step: string, detail: string) => void,
  incrementJobProgress?: (label: string) => Promise<void>
): Promise<DocUploadResult> {
  let docsCount = 0;
  const detailedDocFiles: string[] = [];
  const versionHashCache = new Map<string, string | null>();

  for (const [docFileName, docContent] of docs.entries()) {
    if (checkCancel) checkCancel();
    
    // Extract BPMN file from docFileName
    const docBpmnFile = extractBpmnFileFromDocFileName(docFileName, filesIncluded) || rootFile.file_name;
    const docVersionHash = await getVersionHashForDoc(
      docBpmnFile,
      rootFile.file_name,
      getVersionHashForFile,
      versionHashCache
    );
    
    // Validate version hash before proceeding
    if (!docVersionHash) {
      const errorMsg = `Missing version hash for BPMN file "${docBpmnFile}" (doc: ${docFileName}). Cannot upload documentation.`;
      if (onError) {
        onError(errorMsg);
      }
      continue; // Skip this document and continue with others
    }
    
    const { modePath: docPath } = buildDocStoragePaths(
      docFileName,
      effectiveLlmMode ?? null,
      llmProvider,
      docBpmnFile, // Use the extracted BPMN file, not the root file
      docVersionHash // Use the version hash for that specific file
    );
    
    const htmlBlob = new Blob([docContent], { type: 'text/html; charset=utf-8' });
    const { error: uploadError } = await supabase.storage
      .from('bpmn-files')
      .upload(docPath, htmlBlob, {
        upsert: true,
        contentType: 'text/html; charset=utf-8',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error(`[BpmnFileManager] Error uploading ${docFileName} to ${docPath}:`, uploadError);
    } else {
      docsCount++;
      detailedDocFiles.push(docFileName);
    }
    
    if (checkCancel) checkCancel();
    
    // Update progress
    if (onProgress) {
      onProgress({
        planned: docs.size,
        completed: docsCount,
      });
    }
    
    // Update step details if provided
    if (onStepUpdate) {
      const uploadDetail = docs.size > 0
        ? `Laddar upp: ${docsCount}/${docs.size} filer`
        : `Laddar upp: ${docFileName}`;
      onStepUpdate('Laddar upp dokumentation', uploadDetail);
    }
    
    // Increment job progress if provided
    if (incrementJobProgress) {
      const label = docs.size > 0
        ? `Dokumentation ${docsCount} av ${docs.size} filer`
        : `Dokumentation: ${docFileName}`;
      await incrementJobProgress(label);
    }
  }

  return { docsCount, detailedDocFiles };
}

