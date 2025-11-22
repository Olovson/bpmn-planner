import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTestFileUrl } from '@/lib/artifactUrls';

export type TestMode = 'local' | 'slow' | null;

export interface NodeTestLinkVariant {
  mode: TestMode;
  testFilePath: string;
  fileUrl: string;
}

export interface NodeTestLinkEntry {
  bpmnFile: string;
  elementId: string;
  variants: NodeTestLinkVariant[];
}

export const useNodeTestLinks = () => {
  return useQuery({
    queryKey: ['node-test-links'],
    queryFn: async (): Promise<NodeTestLinkEntry[]> => {
      const { data, error } = await supabase
        .from('node_test_links')
        .select('bpmn_file, bpmn_element_id, test_file_path, mode');

      if (error) {
        // Vi vill inte krascha hela vyn om node_test_links skulle saknas,
        // utan bara logga och visa tom lista.
        console.error('[useNodeTestLinks] Failed to load node_test_links:', error);
        return [];
      }

      const map = new Map<string, NodeTestLinkEntry>();

      for (const row of data ?? []) {
        const bpmnFile = row.bpmn_file as string;
        const elementId = row.bpmn_element_id as string;
        const testFilePath = row.test_file_path as string;
        const mode = (row.mode as TestMode) ?? null;

        const key = `${bpmnFile}:${elementId}`;
        const existing = map.get(key);

        const variant: NodeTestLinkVariant = {
          mode,
          testFilePath,
          fileUrl: getTestFileUrl(testFilePath),
        };

        if (existing) {
          existing.variants.push(variant);
        } else {
          map.set(key, {
            bpmnFile,
            elementId,
            variants: [variant],
          });
        }
      }

      return Array.from(map.values());
    },
  });
};

