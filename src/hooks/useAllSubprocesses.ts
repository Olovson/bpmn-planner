import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubprocessData {
  subprocess_name: string;
  bpmn_file: string;
  bpmn_element_id: string;
  node_type: string;
}

/**
 * Hook to fetch all unique subprocesses from bpmn_element_mappings
 * Returns unique subprocesses based on subprocess_bpmn_file
 */
export function useAllSubprocesses() {
  return useQuery({
    queryKey: ['all-subprocesses'],
    queryFn: async (): Promise<SubprocessData[]> => {
      // Fetch all mappings that have a subprocess_bpmn_file (i.e., Call Activities)
      const { data, error } = await supabase
        .from('bpmn_element_mappings')
        .select('bpmn_file, element_id, subprocess_bpmn_file, jira_type')
        .not('subprocess_bpmn_file', 'is', null);

      if (error) {
        console.error('[useAllSubprocesses] Error fetching subprocesses:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Map to SubprocessData format, using subprocess_bpmn_file as subprocess_name
      // Deduplicate by subprocess_bpmn_file
      const subprocessMap = new Map<string, SubprocessData>();
      
      for (const row of data) {
        if (!row.subprocess_bpmn_file) continue;
        
        const subprocessName = row.subprocess_bpmn_file.replace('.bpmn', '');
        const key = subprocessName;
        
        // Only add if not already in map (deduplicate)
        if (!subprocessMap.has(key)) {
          subprocessMap.set(key, {
            subprocess_name: subprocessName,
            bpmn_file: row.bpmn_file,
            bpmn_element_id: row.element_id,
            node_type: (row.jira_type || 'CallActivity') as string,
          });
        }
      }

      return Array.from(subprocessMap.values());
    },
  });
}


