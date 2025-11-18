import { supabase } from '@/integrations/supabase/client';

/**
 * Get the public URL for a documentation file in Supabase Storage.
 * Documentation is generated per BPMN file, not per element.
 * Uses Supabase Storage public URLs to ensure files are accessible.
 * @param bpmnFile - The BPMN file name (e.g., 'mortgage-se-application.bpmn')
 * @returns The Supabase public URL to the documentation HTML file
 */
export function getDocumentationUrl(bpmnFile: string): string {
  // Remove .bpmn extension and construct storage path
  const base = bpmnFile.replace('.bpmn', '');
  const docPath = `docs/${base}.html`;
  
  // Get public URL from Supabase Storage (same pattern as test files)
  const { data } = supabase.storage
    .from('bpmn-files')
    .getPublicUrl(docPath);
  
  return data.publicUrl;
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
