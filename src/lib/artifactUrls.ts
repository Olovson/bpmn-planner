import { supabase } from '@/integrations/supabase/client';
import { getFileDocViewerPath, getNodeDocViewerPath, getNodeDocFileKey } from './nodeArtifactPaths';

/**
 * Get the public URL for a documentation file in Supabase Storage.
 * Documentation is generated per BPMN file, not per element.
 * Uses Supabase Storage public URLs to ensure files are accessible.
 * @param bpmnFile - The BPMN file name (e.g., 'mortgage-se-application.bpmn')
 * @returns The Supabase public URL to the documentation HTML file
 */
export function getDocumentationUrl(bpmnFile: string, elementId?: string): string {
  if (elementId) {
    return `#/doc-viewer/${encodeURIComponent(getNodeDocViewerPath(bpmnFile, elementId))}`;
  }
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
  const parts = filePath.split('/');
  const fileName = parts.pop();
  const dir = parts.join('/');
  if (!fileName) return false;

  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .list(dir || undefined, { search: fileName, limit: 1 });

  if (error) {
    console.warn('[storageFileExists] list error for', filePath, error);
    return false;
  }

  return Boolean((data ?? []).find((entry) => entry.name === fileName));
}

export const getNodeDocStoragePath = (bpmnFile: string, elementId: string) =>
  // Docs lagras i Supabase Storage under 'docs/<node-doc-key>'
  `docs/${getNodeDocFileKey(bpmnFile, elementId)}`;

export function getDocVariantPaths(docId: string): {
  local: string;
  chatgpt: string;
  ollama: string;
} {
  const safe = docId.replace(/^\/+/, '');
  return {
    local: `docs/local/${safe}.html`,
    chatgpt: `docs/slow/chatgpt/${safe}.html`,
    ollama: `docs/slow/ollama/${safe}.html`,
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
