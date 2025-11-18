import { useState, useEffect } from 'react';
import { useDynamicBpmnFiles, getBpmnFileUrl } from './useDynamicBpmnFiles';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { useBpmnMappings } from './useBpmnMappings';
import { supabase } from '@/integrations/supabase/client';

export interface BpmnNodeData {
  bpmnFile: string;
  elementId: string;
  elementName: string;
  nodeType: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'CallActivity';
  figmaUrl?: string;
  confluenceUrl?: string;
  testFilePath?: string;
  jiraIssues?: Array<{ id: string; url: string; title?: string }>;
  testReportUrl?: string;
  dorDodUrl?: string;
  jiraType?: 'feature goal' | 'epic' | null;
  jiraName?: string | null;
}

/**
 * Hook to fetch and aggregate all relevant BPMN nodes across all files
 */
export const useAllBpmnNodes = () => {
  const [nodes, setNodes] = useState<BpmnNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: bpmnFiles = [], isLoading: filesLoading } = useDynamicBpmnFiles();

  useEffect(() => {
    if (filesLoading) return;

    let isMounted = true;

    const fetchAllNodes = async () => {
      try {
        setLoading(true);
        setError(null);

        const allNodes: BpmnNodeData[] = [];

        // Fetch all mappings and test links in parallel
        const { data: allMappings } = await supabase
          .from('bpmn_element_mappings')
          .select('*');

        const { data: allTestLinks } = await supabase
          .from('node_test_links')
          .select('*');

        // Parse each BPMN file and extract relevant nodes
        for (const fileName of bpmnFiles) {
          try {
            const url = await getBpmnFileUrl(fileName);
            const parseResult = await parseBpmnFile(url);

            // Process each relevant node type
            const relevantNodes = [
              ...parseResult.userTasks.map(n => ({ ...n, nodeType: 'UserTask' as const })),
              ...parseResult.serviceTasks.map(n => ({ ...n, nodeType: 'ServiceTask' as const })),
              ...parseResult.businessRuleTasks.map(n => ({ ...n, nodeType: 'BusinessRuleTask' as const })),
              ...parseResult.callActivities.map(n => ({ ...n, nodeType: 'CallActivity' as const })),
            ];

            for (const node of relevantNodes) {
              // Find mapping for this node
              const mapping = allMappings?.find(
                m => m.bpmn_file === fileName && m.element_id === node.id
              );

              // Find test links for this node
              const testLink = allTestLinks?.find(
                t => t.bpmn_file === fileName && t.bpmn_element_id === node.id
              );

              // Build DoR/DoD URL if applicable
              const dorDodUrl = `/subprocess/${encodeURIComponent(node.id)}`;

              allNodes.push({
                bpmnFile: fileName,
                elementId: node.id,
                elementName: node.name,
                nodeType: node.nodeType,
                figmaUrl: mapping?.figma_url || undefined,
                confluenceUrl: mapping?.confluence_url || undefined,
                testFilePath: testLink?.test_file_path || undefined,
                jiraIssues: (mapping?.jira_issues as any) || undefined,
                testReportUrl: mapping?.test_report_url || undefined,
                dorDodUrl,
                jiraType: mapping?.jira_type as 'feature goal' | 'epic' | null || null,
                jiraName: mapping?.jira_name || undefined,
              });
            }
          } catch (err) {
            console.error(`Error parsing ${fileName}:`, err);
          }
        }

        if (isMounted) {
          setNodes(allNodes);
        }
      } catch (err) {
        console.error('Error fetching all BPMN nodes:', err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllNodes();

    return () => {
      isMounted = false;
    };
  }, [bpmnFiles, filesLoading]);

  return { nodes, loading, error };
};
