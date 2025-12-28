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
  // Subprocesses don't have combined file-level docs, so link to Feature Goal instead
  // Note: This is a synchronous function, so we can't use async imports.
  // We'll use a simple heuristic: if the file is not "mortgage.bpmn", assume it's a subprocess.
  // This works for the current mortgage domain where mortgage.bpmn is the root.
  // For a more robust solution, we'd need to make this async or pass rootProcessId as a parameter.
  const baseName = bpmnFile.replace('.bpmn', '');
  const isLikelyRootProcess = bpmnFile === 'mortgage.bpmn' || baseName === 'mortgage';
  
  // Both root and subprocess files use file-level documentation
  // File-level docs are now generated for both root and subprocess files
  return `#/doc-viewer/${encodeURIComponent(getFileDocViewerPath(bpmnFile))}`;
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

  // Use list() method - it's the most reliable and doesn't cause 400 errors
  // Split path into directory and filename
  const parts = filePath.split('/');
  const fileName = parts.pop();
  const dir = parts.join('/');
  
  if (!fileName) return false;

  try {
    // List files in directory and search for the filename
    // This method doesn't use v1 object API and won't cause 400 errors
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(dir || undefined, { 
        search: fileName, 
        limit: 1 
      });

    if (error) {
      // Only log unexpected errors (not expected errors for missing files)
      return false;
    }

    const exists = Boolean(data?.find((entry) => entry.name === fileName));
    return exists;
  } catch (error) {
    // Network errors or other exceptions - return false silently
    return false;
  }
}

export const getNodeDocStoragePath = (bpmnFile: string, elementId: string) =>
  // Docs lagras i Supabase Storage under 'docs/claude/<node-doc-key>'
  // Claude-only: All documentation is generated using Claude
  `docs/claude/${getNodeDocFileKey(bpmnFile, elementId)}`;

/**
 * Get all possible storage paths for Feature Goal documentation (call activities).
 * Returns an array of paths to check, ordered by priority (most specific first).
 * 
 * VIKTIGT: Process Feature Goals genereras INTE längre (ersatta av file-level documentation).
 * Denna funktion hanterar bara CallActivity Feature Goals (hierarchical naming med parent).
 * Om parentBpmnFile saknas, returneras tom array.
 * 
 * @param subprocessBpmnFile - The subprocess BPMN file (e.g., "mortgage-se-internal-data-gathering.bpmn")
 * @param elementId - The call activity element ID (e.g., "internal-data-gathering")
 * @param parentBpmnFile - Required parent BPMN file where call activity is defined (e.g., "mortgage-se-application.bpmn")
 *   If not provided, returns empty array (Process Feature Goals genereras inte längre)
 * @param versionHash - Optional version hash for the BPMN file (for versioned paths)
 * @param bpmnFileForVersion - Optional BPMN file name to use for versioned paths (defaults to subprocessBpmnFile)
 * @returns Array of storage paths to check (empty if parentBpmnFile is not provided)
 */
export function getFeatureGoalDocStoragePaths(
  subprocessBpmnFile: string,
  elementId: string,
  parentBpmnFile?: string,
  versionHash?: string | null,
  bpmnFileForVersion?: string,
): string[] {
  const paths: string[] = [];
  
  // Determine which BPMN file to use for versioned paths
  // VIKTIGT: Varje subprocess-fil använder sin egen version hash
  // bpmnFileForVersion ska vara subprocess-filen (inte parent-filen)
  const fileForVersion = bpmnFileForVersion || subprocessBpmnFile;
  const bpmnFileName = fileForVersion.endsWith('.bpmn') ? fileForVersion : `${fileForVersion}.bpmn`;
  // VIKTIGT: Filen är sparad MED .bpmn i sökvägen, så vi behåller .bpmn för versioned paths
  const bpmnFileBaseName = bpmnFileName.replace('.bpmn', ''); // För non-versioned paths
  const bpmnFileNameForVersionedPath = bpmnFileName; // För versioned paths, behåll .bpmn
  
  // VIKTIGT: För call activities använder vi ALLTID hierarchical naming (med parent)
  // men filen sparas under subprocess-filens version hash (inte parent-filens).
  // Process Feature Goals genereras INTE längre (ersatta av file-level documentation),
  // så parentBpmnFile måste alltid finnas för Feature Goals.
  if (!parentBpmnFile) {
    // Process Feature Goals genereras inte längre - returnera tom array
    // Om parentBpmnFile saknas, finns det ingen Feature Goal att hitta
    return [];
  }
  
  const hierarchicalKey = getFeatureGoalDocFileKey(
    subprocessBpmnFile,
    elementId,
    undefined, // no version suffix
    parentBpmnFile,
  );
  
  // Versioned paths (if version hash is provided)
  if (versionHash) {
    // Versioned paths: docs/claude/{bpmnFileName}/{versionHash}/feature-goals/...
    // VIKTIGT: Behåll .bpmn i filnamnet eftersom filen är sparad så
    paths.push(`docs/claude/${bpmnFileNameForVersionedPath}/${versionHash}/${hierarchicalKey}`);
  }
  
  // Non-versioned paths (fallback when version hash is not available)
  paths.push(`docs/claude/${hierarchicalKey}`);
  
  return paths;
}

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
