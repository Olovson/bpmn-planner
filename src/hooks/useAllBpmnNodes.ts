import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRootBpmnFile } from './useRootBpmnFile';
import { useProcessTree } from './useProcessTree';
import { ProcessTreeNode } from '@/lib/processTree';
import { getDocumentationUrl, storageFileExists, getNodeDocStoragePath, getTestFileUrl } from '@/lib/artifactUrls';
import { getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
import { checkDocsAvailable, checkDorDodAvailable, checkTestReportAvailable } from '@/lib/artifactAvailability';
// Removed buildJiraName import - no longer using fallback logic

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
  orderIndex?: number;
  visualOrderIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];
  staccIntegrationSource?: string | null;
  replaceWithBankIntegrationSource?: boolean;
}

type FlattenedProcessNode = ProcessTreeNode & { 
  parentLabels: string[];
  parentNodes: Array<{ label: string; type: string }>; // Keep type info for filtering
};

/**
 * Hook to fetch and aggregate all relevant BPMN nodes across all files
 */
export const useAllBpmnNodes = () => {
  const [nodes, setNodes] = useState<BpmnNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { data: rootFile } = useRootBpmnFile();
  const root = rootFile || 'mortgage.bpmn';
  const { data: processTree, isLoading: treeLoading } = useProcessTree(root);

  // Listen for artifact generation events to trigger refresh
  useEffect(() => {
    const handleArtifactUpdate = () => {
      // Trigger a refresh by incrementing the trigger counter
      // This will cause the main useEffect to re-run
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('bpmn-artifacts-updated', handleArtifactUpdate);
    return () => {
      window.removeEventListener('bpmn-artifacts-updated', handleArtifactUpdate);
    };
  }, []);

  useEffect(() => {
    if (treeLoading) return;

    let isMounted = true;

    const fetchAllNodes = async () => {
      try {
        setLoading(true);
        setError(null);

        const allNodes: BpmnNodeData[] = [];

        if (!processTree) {
          if (import.meta.env.DEV) {
            console.warn('[useAllBpmnNodes] processTree is null - no nodes will be displayed');
          }
          setNodes([]);
          setLoading(false);
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

        const flattenTree = (node: ProcessTreeNode, parents: Array<{ label: string; type: string }> = []): FlattenedProcessNode[] => {
          // Only include non-process nodes in parent labels (for Jira naming)
          const parentLabels = parents
            .filter(p => p.type !== 'process')
            .map(p => p.label);
          const current: FlattenedProcessNode = { 
            ...node, 
            parentLabels,
            parentNodes: parents.filter(p => p.type !== 'process') // Keep type info for filtering
          };
          const childParents = [...parents, { label: node.label, type: node.type }];
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

          // Removed defaultJiraName and defaultJiraType generation
          // Only use data from database - no fallback to generated names
          // This makes it clear when Jira names need to be generated via handleBuildHierarchy

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
            jiraType: (mapping?.jira_type as 'feature goal' | 'epic' | null) || null,
            jiraName: mapping?.jira_name || null,
            hierarchyPath: null, // Deprecated - no longer used, kept for backward compatibility
            subprocessMatchStatus: node.subprocessLink?.matchStatus,
            diagnosticsSummary,
            orderIndex: node.orderIndex,
            visualOrderIndex: node.visualOrderIndex,
            branchId: node.branchId ?? null,
            scenarioPath: node.scenarioPath,
            staccIntegrationSource: mapping?.stacc_integration_source || null,
            replaceWithBankIntegrationSource:
              typeof mapping?.replace_with_bank_integration_source === 'boolean'
                ? mapping.replace_with_bank_integration_source
                : true,
          };

          nodeMap.set(nodeKey, nodeData);
        }

        // Convert Map to array
        allNodes.push(...Array.from(nodeMap.values()));

        // Resolve storage-based artifacts (docs + test reports)
        const enriched = await Promise.all(
          allNodes.map(async (node) => {
            try {
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
            } catch (error) {
              // If checking docs fails, still include the node but mark docs as unavailable
              console.warn(`[useAllBpmnNodes] Failed to check docs for ${node.bpmnFile}:${node.elementId}:`, error);
              return {
                ...node,
                hasDocs: false,
                hasTestReport: false,
              };
            }
          }),
        );

        if (isMounted) {
          if (import.meta.env.DEV) {
            console.log(`[useAllBpmnNodes] Loaded ${enriched.length} nodes (${enriched.filter(n => n.hasDocs).length} with docs)`);
          }
          setNodes(enriched);
          setLoading(false);
        }
      } catch (err) {
        console.error('[useAllBpmnNodes] Error fetching all BPMN nodes:', err);
        if (isMounted) {
          setError(err as Error);
          setNodes([]); // Set empty array on error to avoid stale data
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
  }, [processTree, treeLoading, refreshTrigger]);

  return { nodes, loading: loading || treeLoading, error };
};

const docPathFromNode = (node: { bpmnFile: string; elementId: string }) =>
  getNodeDocStoragePath(node.bpmnFile, node.elementId);
