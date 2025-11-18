import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBpmnFiles } from './useBpmnFiles';

/**
 * Identifies the root BPMN file by analyzing the dependency hierarchy.
 * The root file is the one that appears as parent but never as child.
 * Falls back to 'mortgage.bpmn' if no dependencies exist.
 */
export const useRootBpmnFile = () => {
  const { data: allFiles } = useBpmnFiles();
  
  return useQuery({
    queryKey: ['root-bpmn-file'],
    queryFn: async (): Promise<string> => {
      // Get all dependencies
      const { data: dependencies, error } = await supabase
        .from('bpmn_dependencies')
        .select('parent_file, child_file');

      if (error) {
        console.error('Error fetching dependencies:', error);
        return 'mortgage.bpmn'; // Default fallback
      }

      // If no dependencies exist, return mortgage.bpmn as default
      if (!dependencies || dependencies.length === 0) {
        console.log('[useRootBpmnFile] No dependencies found, defaulting to mortgage.bpmn');
        return 'mortgage.bpmn';
      }

      // Find all parent files
      const parentFiles = new Set(dependencies.map(d => d.parent_file));
      
      // Find all child files (that exist in DB)
      const childFiles = new Set(
        dependencies
          .map(d => d.child_file)
          .filter(Boolean) as string[]
      );

      // Root file is a parent that is never a child
      const rootFiles = Array.from(parentFiles).filter(
        parent => !childFiles.has(parent)
      );

      console.log('[useRootBpmnFile] Parents:', Array.from(parentFiles));
      console.log('[useRootBpmnFile] Children:', Array.from(childFiles));
      console.log('[useRootBpmnFile] Root files:', rootFiles);

      if (rootFiles.length === 0) {
        // Fallback: if no clear root, take the first parent file
        const fallback = dependencies[0]?.parent_file || 'mortgage.bpmn';
        console.log('[useRootBpmnFile] No root found, using fallback:', fallback);
        return fallback;
      }

      // Return the first root file (there should typically be only one)
      console.log('[useRootBpmnFile] Using root file:', rootFiles[0]);
      return rootFiles[0];
    },
    enabled: !!allFiles,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
