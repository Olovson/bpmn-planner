import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBpmnFiles } from './useBpmnFiles';

type DependencyRow = { parent_file: string; child_file?: string | null };
type BpmnFileRow = { file_name: string };

/**
 * Identifies the root BPMN file by analyzing the dependency hierarchy.
 * The root file is the one that appears as parent but never as child.
 * Falls back to 'mortgage.bpmn' if no dependencies exist.
 */
export const useRootBpmnFile = () => {
  const { data: allFiles } = useBpmnFiles();
  
  return useQuery({
    queryKey: ['root-bpmn-file'],
    queryFn: async (): Promise<string | null> => {
      // Guard when files are not loaded yet
      if (!allFiles || allFiles.length === 0) {
        return null;
      }

      const mortgageExists = allFiles.some((f) => f.file_name === 'mortgage.bpmn');

      // Get all dependencies
      const { data: dependencies, error } = await supabase
        .from('bpmn_dependencies')
        .select('parent_file, child_file');

      if (error) {
        console.error('Error fetching dependencies:', error);
        return mortgageExists ? 'mortgage.bpmn' : allFiles[0].file_name;
      }

      const root = pickRootBpmnFile(allFiles, dependencies || []);
      return root;
    },
    enabled: Array.isArray(allFiles),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/**
 * Pure helper to pick a root BPMN file from available files + dependencies.
 * Exposed for unit testing.
 */
export function pickRootBpmnFile(
  allFiles: BpmnFileRow[] = [],
  dependencies: DependencyRow[] = [],
): string | null {
  if (!allFiles.length) return null;

  const mortgageExists = allFiles.some((f) => f.file_name === 'mortgage.bpmn');

  if (!dependencies || dependencies.length === 0) {
    return mortgageExists ? 'mortgage.bpmn' : allFiles[0].file_name;
  }

  const parentFiles = new Set(dependencies.map((d) => d.parent_file));
  const childFiles = new Set(
    dependencies
      .map((d) => d.child_file)
      .filter(Boolean) as string[],
  );

  const rootFiles = Array.from(parentFiles).filter((parent) => !childFiles.has(parent));
  if (rootFiles.length > 0) {
    // Prefer mortgage if it is one of the roots; otherwise first root
    const mortgageRoot = rootFiles.find((r) => r === 'mortgage.bpmn');
    return mortgageRoot ?? rootFiles[0];
  }

  // Fallback: if no clear root, prefer mortgage, else first available file
  return mortgageExists ? 'mortgage.bpmn' : allFiles[0].file_name;
}
