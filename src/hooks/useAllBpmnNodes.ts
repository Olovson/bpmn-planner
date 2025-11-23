import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRootBpmnFile } from './useRootBpmnFile';
import { useProcessTree } from './useProcessTree';
import { ProcessTreeNode } from '@/lib/processTree';
import { getDocumentationUrl, storageFileExists, getNodeDocStoragePath, getTestFileUrl } from '@/lib/artifactUrls';
import { getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
import { checkDocsAvailable, checkDorDodAvailable, checkTestReportAvailable } from '@/lib/artifactAvailability';

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
  hasDocs?: boolean;
  hasTestReport?: boolean;
  hasDorDod?: boolean;
  documentationUrl?: string;
  jiraType?: 'feature goal' | 'epic' | null;
  jiraName?: string | null;
  hierarchyPath?: string;
  subprocessMatchStatus?: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
  diagnosticsSummary?: string | null;
}

type FlattenedProcessNode = ProcessTreeNode & { parentLabels: string[] };

/**
 * Hook to fetch and aggregate all relevant BPMN nodes across all files
 */
export const useAllBpmnNodes = () => {
  const [nodes, setNodes] = useState<BpmnNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: rootFile } = useRootBpmnFile();
  const root = rootFile || 'mortgage.bpmn';
  const { data: processTree, isLoading: treeLoading } = useProcessTree(root);

  useEffect(() => {
    if (treeLoading) return;

    let isMounted = true;

    const fetchAllNodes = async () => {
      try {
        setLoading(true);
        setError(null);

        const allNodes: BpmnNodeData[] = [];

        if (!processTree) {
          setNodes([]);
          return;
        }

        // Fetch mappings and test links
        const { data: allMappings } = await supabase
          .from('bpmn_element_mappings')
          .select('*');

        const { data: allTestLinks } = await supabase
          .from('node_test_links')
          .select('*');

        const { data: allDorDod } = await supabase
          .from('dor_dod_status')
          .select('bpmn_file, bpmn_element_id, subprocess_name');

        const flattenTree = (node: ProcessTreeNode, parents: string[] = []): FlattenedProcessNode[] => {
          const current: FlattenedProcessNode = { ...node, parentLabels: parents };
          const childParents = [...parents, node.label];
          const descendants = node.children.flatMap(child => flattenTree(child, childParents));
          return [current, ...descendants];
        };

        const collectDiagnosticsSummary = (node: ProcessTreeNode): string | null => {
          const messages: string[] = [];
          if (node.subprocessLink && node.subprocessLink.matchStatus && node.subprocessLink.matchStatus !== 'matched') {
            messages.push(`Subprocess: ${node.subprocessLink.matchStatus}`);
          }
          const allDiagnostics = [
            ...(node.diagnostics ?? []),
            ...(node.subprocessLink?.diagnostics ?? []),
          ];
          allDiagnostics.forEach((diag) => {
            if (diag.message) {
              messages.push(diag.message);
            }
          });
          return messages.length ? messages.join(' • ') : null;
        };

        const flattened = flattenTree(processTree);

        const relevantNodes = flattened.filter(node =>
          node.type === 'callActivity' ||
          node.type === 'userTask' ||
          node.type === 'serviceTask' ||
          node.type === 'businessRuleTask'
        );

        const nodeTypeMap: Record<string, BpmnNodeData['nodeType']> = {
          callActivity: 'CallActivity',
          userTask: 'UserTask',
          serviceTask: 'ServiceTask',
          businessRuleTask: 'BusinessRuleTask',
        };

        // Use a Map to deduplicate nodes by bpmnFile:elementId
        // If a node appears multiple times (e.g., in parent and subprocess), keep the first occurrence
        const nodeMap = new Map<string, BpmnNodeData>();

        for (const node of relevantNodes) {
          const elementId = node.bpmnElementId || node.id;
          const bpmnFile = node.bpmnFile;
          const nodeKey = `${bpmnFile}:${elementId}`;

          // Skip if we've already processed this node
          if (nodeMap.has(nodeKey)) {
            continue;
          }

          const mapping = allMappings?.find(
            m => m.bpmn_file === bpmnFile && m.element_id === elementId
          );

          const testLink = allTestLinks?.find(
            t => t.bpmn_file === bpmnFile && t.bpmn_element_id === elementId
          );

          const defaultJiraType =
            node.type === 'callActivity' ? 'feature goal'
            : (node.type === 'userTask' || node.type === 'serviceTask' || node.type === 'businessRuleTask')
              ? 'epic'
              : null;

          const defaultJiraName = [...node.parentLabels, node.label].filter(Boolean).join(' - ') || node.label;

          const dorDodUrl = `/subprocess/${encodeURIComponent(elementId)}`;
          const diagnosticsSummary = collectDiagnosticsSummary(node);
          const hasDorDod = checkDorDodAvailable(
            allDorDod,
            elementId,
            node.label,
          );

          const docPath = getNodeDocStoragePath(bpmnFile, elementId);
          const docUrl = getDocumentationUrl(bpmnFile, elementId);

          const nodeData: BpmnNodeData = {
            bpmnFile,
            elementId,
            elementName: node.label,
            nodeType: nodeTypeMap[node.type] ?? 'UserTask',
            figmaUrl: mapping?.figma_url || undefined,
            confluenceUrl: mapping?.confluence_url || undefined,
            testFilePath: testLink?.test_file_path || undefined,
            jiraIssues: (mapping?.jira_issues as any) || undefined,
            testReportUrl: mapping?.test_report_url || undefined,
            dorDodUrl,
            hasDocs: false, // resolved below
            documentationUrl: docUrl,
            hasTestReport: false, // resolved below
            hasDorDod,
            jiraType: (mapping?.jira_type as 'feature goal' | 'epic' | null) ?? defaultJiraType ?? null,
            jiraName: mapping?.jira_name || defaultJiraName,
            hierarchyPath: defaultJiraName,
            subprocessMatchStatus: node.subprocessLink?.matchStatus,
            diagnosticsSummary,
          };

          nodeMap.set(nodeKey, nodeData);
        }

        // Convert Map to array
        allNodes.push(...Array.from(nodeMap.values()));

        // Resolve storage-based artifacts (docs + test reports)
        const enriched = await Promise.all(
          allNodes.map(async (node) => {
            const resolvedDocs = await checkDocsAvailable(
              node.confluenceUrl,
              docPathFromNode(node),
              storageFileExists,
            );
            const resolvedTestReport = await checkTestReportAvailable(
              node.testReportUrl,
            );

            return {
              ...node,
              hasDocs: resolvedDocs,
              hasTestReport: resolvedTestReport,
            };
          }),
        );

        if (isMounted) {
          setNodes(enriched);
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

    if (processTree) {
      fetchAllNodes();
    }

    return () => {
      isMounted = false;
    };
  }, [processTree, treeLoading]);

  return { nodes, loading: loading || treeLoading, error };
};

const docPathFromNode = (node: { bpmnFile: string; elementId: string }) =>
  getNodeDocStoragePath(node.bpmnFile, node.elementId);
