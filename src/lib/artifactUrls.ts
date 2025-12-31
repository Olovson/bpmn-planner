import { supabase } from '@/integrations/supabase/client';
import { getFileDocViewerPath, getNodeDocViewerPath, getNodeDocFileKey, getFeatureGoalDocFileKey } from './nodeArtifactPaths';

/**
 * Get the public URL for a documentation file in Supabase Storage.
 * Documentation is generated per BPMN file, not per element.
 * Uses Supabase Storage public URLs to ensure files are accessible.
 * 
 * For subprocesses (non-root files), when no elementId is provided, links to Feature Goal
 * documentation instead of combined file-level documentation (which only exists for root processes).
 * 
 * @param bpmnFile - The BPMN file name (e.g., 'mortgage-se-application.bpmn')
 * @param elementId - Optional element ID for node-specific documentation
 * @returns The hash router URL to the documentation viewer
 */
export function getDocumentationUrl(bpmnFile: string, elementId?: string): string {
  if (elementId) {
    return `#/doc-viewer/${encodeURIComponent(getNodeDocViewerPath(bpmnFile, elementId))}`;
  }
  
  // For file-level documentation, check if this is a root process or subprocess
  // Subprocesses have Process Feature Goals (non-hierarchical), root processes have file-level docs
  // Note: This is a synchronous function, so we can't use async imports.
  // We'll use a simple heuristic: if the file is not "mortgage.bpmn", assume it's a subprocess.
  // This works for the current mortgage domain where mortgage.bpmn is the root.
  // For a more robust solution, we'd need to make this async or pass rootProcessId as a parameter.
  const baseName = bpmnFile.replace('.bpmn', '');
  const isLikelyRootProcess = bpmnFile === 'mortgage.bpmn' || baseName === 'mortgage';
  
  if (isLikelyRootProcess) {
    // Root process: use file-level documentation
    return `#/doc-viewer/${encodeURIComponent(getFileDocViewerPath(bpmnFile))}`;
  } else {
    // Subprocess: use Process Feature Goal (non-hierarchical)
    const processFeatureGoalPath = `feature-goals/${baseName}`;
    return `#/doc-viewer/${encodeURIComponent(processFeatureGoalPath)}`;
  }
}

/**
 * Get the public URL for a test file in Supabase Storage
 * @param testFilePath - The test file path from node_test_links (e.g., 'tests/application.spec.ts')
 * @returns The public URL to the test file
 */
export function getTestFileUrl(testFilePath: string): string {
  const { data } = supabase.storage
    .from('bpmn-files')
    .getPublicUrl(testFilePath);
  
  return data.publicUrl;
}

export async function storageFileExists(filePath: string): Promise<boolean> {
  if (!filePath) return false;

  try {
    // Först: Försök direkt download (snabbast och mest pålitligt)
    // Detta fungerar bättre för versioned paths med långa directory-strukturer
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(filePath);

    if (!error && data) {
      return true;
    }

    // Fallback: Använd list() method om download misslyckas
    // Split path into directory and filename
    const parts = filePath.split('/');
    const fileName = parts.pop();
    const dir = parts.join('/');
    
    if (!fileName) return false;

    // List files in directory and search for the filename
    // This method doesn't use v1 object API and won't cause 400 errors
    const { data: listData, error: listError } = await supabase.storage
      .from('bpmn-files')
      .list(dir || undefined, { 
        search: fileName, 
        limit: 1 
      });

    if (listError) {
      // Only log unexpected errors (not expected errors for missing files)
      return false;
    }

    const exists = Boolean(listData?.find((entry) => entry.name === fileName));
    return exists;
  } catch (error) {
    // Network errors or other exceptions - return false silently
    return false;
  }
}

/**
 * Get storage path for node documentation (Epic, Business Rule).
 * Uses buildDocStoragePaths() for consistency - requires version hash.
 */
export async function getNodeDocStoragePath(
  bpmnFile: string,
  elementId: string,
  versionHash: string | null
): Promise<string> {
  if (!versionHash) {
    throw new Error(`getNodeDocStoragePath: version hash is required for ${bpmnFile}::${elementId}`);
  }
  
  const { buildDocStoragePaths } = await import('./artifactPaths');
  const docFileKey = getNodeDocFileKey(bpmnFile, elementId);
  
  const { modePath } = buildDocStoragePaths(
    docFileKey,
    'slow', // mode
    'claude', // provider
    bpmnFile,
    versionHash
  );
  
  return modePath;
}

/**
 * Get storage path for Feature Goal documentation (call activities).
 * Uses buildDocStoragePaths() for consistency - requires version hash.
 * 
 * VIKTIGT: Process Feature Goals genereras INTE längre (ersatta av file-level documentation).
 * Denna funktion hanterar bara CallActivity Feature Goals (hierarchical naming med parent).
 * 
 * @param subprocessBpmnFile - The subprocess BPMN file (e.g., "mortgage-se-internal-data-gathering.bpmn")
 * @param elementId - The call activity element ID (e.g., "internal-data-gathering")
 * @param parentBpmnFile - Required parent BPMN file where call activity is defined (e.g., "mortgage-se-application.bpmn")
 * @param versionHash - Required version hash for the BPMN file
 * @param bpmnFileForVersion - Optional BPMN file name to use for versioned paths (defaults to subprocessBpmnFile)
 * @returns Storage path (empty string if parentBpmnFile is not provided)
 */
export async function getFeatureGoalDocStoragePaths(
  subprocessBpmnFile: string,
  elementId: string,
  parentBpmnFile?: string,
  versionHash?: string | null,
  bpmnFileForVersion?: string,
): Promise<string> {
  // VIKTIGT: Process Feature Goals genereras inte längre - parentBpmnFile måste finnas
  if (!parentBpmnFile) {
    return '';
  }
  
  if (!versionHash) {
    throw new Error(
      `getFeatureGoalDocStoragePaths: version hash is required for ${subprocessBpmnFile}::${elementId}`
    );
  }
  
  // Determine which BPMN file to use for versioned paths
  // VIKTIGT: Varje subprocess-fil använder sin egen version hash
  const fileForVersion = bpmnFileForVersion || subprocessBpmnFile;
  const bpmnFileName = fileForVersion.endsWith('.bpmn') ? fileForVersion : `${fileForVersion}.bpmn`;
  
  const hierarchicalKey = getFeatureGoalDocFileKey(
    subprocessBpmnFile,
    elementId,
    undefined, // no version suffix
    parentBpmnFile,
  );
  
  const { buildDocStoragePaths } = await import('./artifactPaths');
  const { modePath } = buildDocStoragePaths(
    hierarchicalKey,
    'slow', // mode
    'claude', // provider
    bpmnFileName,
    versionHash
  );
  
  return modePath;
}

/**
 * Get storage path for Epic documentation.
 * Uses buildDocStoragePaths() for consistency - requires version hash.
 */
export async function getEpicDocStoragePaths(
  bpmnFile: string,
  elementId: string,
  versionHash: string | null
): Promise<string> {
  if (!versionHash) {
    throw new Error(`getEpicDocStoragePaths: version hash is required for ${bpmnFile}::${elementId}`);
  }
  
  const { buildDocStoragePaths } = await import('./artifactPaths');
  const docFileKey = getNodeDocFileKey(bpmnFile, elementId);
  
  const { modePath } = buildDocStoragePaths(
    docFileKey,
    'slow', // mode
    'claude', // provider
    bpmnFile,
    versionHash
  );
  
  return modePath;
}

/**
 * Get storage path for documentation variant.
 * NOTE: This function is deprecated - use buildDocStoragePaths() with version hash instead.
 * Kept for backward compatibility with useDocVariantAvailability hook.
 */
export function getDocVariantPaths(docId: string): {
  claude: string;
} {
  const safe = docId.replace(/^\/+/, '');
  return {
    claude: `docs/claude/${safe}.html`,
  };
}

/**
 * Build URL for node-specific test report page
 * @param bpmnFile - The BPMN file name (e.g., 'mortgage-se-application.bpmn')
 * @param elementId - The BPMN element ID (e.g., 'credit-decision')
 * @returns The hash router URL to the node test report page
 */
export function getNodeTestReportUrl(bpmnFile: string, elementId: string): string {
  return `#/node-tests?bpmnFile=${encodeURIComponent(bpmnFile)}&elementId=${encodeURIComponent(elementId)}`;
}
