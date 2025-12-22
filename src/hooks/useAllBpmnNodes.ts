import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRootBpmnFile } from './useRootBpmnFile';
import { useProcessTree } from './useProcessTree';
import { ProcessTreeNode } from '@/lib/processTree';
import { getDocumentationUrl, storageFileExists, getNodeDocStoragePath, getTestFileUrl, getFeatureGoalDocStoragePaths } from '@/lib/artifactUrls';
import { getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
import { checkDocsAvailable, checkDorDodAvailable, checkTestReportAvailable } from '@/lib/artifactAvailability';
import { getCurrentVersionHash } from '@/lib/bpmnVersioning';
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
  subprocessFile?: string; // ✅ För call activities: subprocess BPMN file
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

        // Helper function to get all BPMN files from process tree
        const getAllFilesFromTree = (node: ProcessTreeNode): string[] => {
          const files = new Set<string>();
          if (node.bpmnFile) {
            files.add(node.bpmnFile);
          }
          node.children.forEach(child => {
            getAllFilesFromTree(child).forEach(file => files.add(file));
          });
          return Array.from(files);
        };
        
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

          // För call activities, använd Feature Goal-sökvägar istället för vanliga node-sökvägar
          const docPath = node.type === 'callActivity' 
            ? null // Använd inte getNodeDocStoragePath för call activities
            : getNodeDocStoragePath(bpmnFile, elementId);
          
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
            // ✅ Spara subprocessFile för call activities så vi kan använda det senare
            subprocessFile: node.subprocessFile,
          };

          nodeMap.set(nodeKey, nodeData);
        }

        // Convert Map to array
        allNodes.push(...Array.from(nodeMap.values()));

        // Resolve storage-based artifacts (docs + test reports)
        // Get version hashes for all unique BPMN files (cache to avoid duplicate queries)
        const versionHashCache = new Map<string, string | null>();
        const getVersionHash = async (fileName: string): Promise<string | null> => {
          if (versionHashCache.has(fileName)) {
            return versionHashCache.get(fileName) || null;
          }
          try {
            const hash = await getCurrentVersionHash(fileName);
            versionHashCache.set(fileName, hash);
            return hash;
          } catch (error) {
            console.warn(`[useAllBpmnNodes] Failed to get version hash for ${fileName}:`, error);
            versionHashCache.set(fileName, null);
            return null;
          }
        };
        
        const enriched = await Promise.all(
          allNodes.map(async (node) => {
            try {
              // För call activities, använd Feature Goal-sökvägar med version hash
              let featureGoalPaths: string[] | undefined = undefined;
              let epicDocPaths: string[] | undefined = undefined;
              
              if (node.nodeType === 'CallActivity') {
                if (!node.subprocessFile) {
                  if (import.meta.env.DEV) {
                    console.warn(`[useAllBpmnNodes] CallActivity ${node.bpmnFile}:${node.elementId} has no subprocessFile - trying to infer from elementId`);
                  }
                  // Fallback: Försök inferera subprocessFile från elementId om det matchar ett filnamn
                  // T.ex. elementId "household" → "mortgage-se-household.bpmn"
                  const possibleSubprocessFile = `mortgage-se-${node.elementId}.bpmn`;
                  // Kolla om filen finns i processTree
                  const allFiles = processTree ? getAllFilesFromTree(processTree) : [];
                  if (allFiles.includes(possibleSubprocessFile)) {
                    node.subprocessFile = possibleSubprocessFile;
                    if (import.meta.env.DEV) {
                      console.log(`[useAllBpmnNodes] Inferred subprocessFile: ${possibleSubprocessFile}`);
                    }
                  }
                }
                
                if (node.subprocessFile) {
                  // Normalize subprocessFile (ensure it has .bpmn extension)
                  const subprocessFile = node.subprocessFile.endsWith('.bpmn')
                    ? node.subprocessFile
                    : `${node.subprocessFile}.bpmn`;
                  
                  // VIKTIGT: Använd subprocess-filens version hash, inte parent-filens
                  // Dokumentationen sparas nu under varje fils egen version hash
                  const subprocessVersionHash = await getVersionHash(subprocessFile);
                  
                  featureGoalPaths = getFeatureGoalDocStoragePaths(
                    subprocessFile.replace('.bpmn', ''), // subprocess BPMN file (without .bpmn for getFeatureGoalDocFileKey)
                    node.elementId,       // call activity element ID
                    node.bpmnFile,       // parent BPMN file (där call activity är definierad)
                    subprocessVersionHash, // VIKTIGT: Använd subprocess-filens version hash
                    subprocessFile,      // VIKTIGT: Använd subprocess-filen för versioned paths
                  );
                }
              } else {
                // För Epic-dokumentation (UserTask, ServiceTask, BusinessRuleTask): 
                // VIKTIGT: Använd alltid nodens egen BPMN-fil och dess version hash
                // Dokumentationen sparas nu under varje fils egen version hash
                const bpmnFileName = node.bpmnFile.endsWith('.bpmn') 
                  ? node.bpmnFile 
                  : `${node.bpmnFile}.bpmn`;
                const versionHash = await getVersionHash(bpmnFileName);
                const docFileKey = getNodeDocFileKey(node.bpmnFile, node.elementId);
                
                epicDocPaths = [];
                if (versionHash) {
                  // Versioned path: docs/claude/{bpmnFileName}/{versionHash}/nodes/...
                  epicDocPaths.push(`docs/claude/${bpmnFileName}/${versionHash}/${docFileKey}`);
                }
                // Non-versioned path: docs/claude/nodes/...
                epicDocPaths.push(`docs/claude/${docFileKey}`);
              }
              
              // Only log for call activities with feature goal paths (most verbose case)
              if (import.meta.env.DEV && node.nodeType === 'CallActivity' && featureGoalPaths && featureGoalPaths.length > 0) {
                console.debug(`[useAllBpmnNodes] Checking ${featureGoalPaths.length} paths for CallActivity ${node.bpmnFile}:${node.elementId}`);
              }
              
              const resolvedDocs = await checkDocsAvailable(
                node.confluenceUrl,
                docPathFromNode(node), // Main path (non-versioned, for backward compatibility)
                storageFileExists,
                featureGoalPaths || epicDocPaths, // ✅ Skicka med Feature Goal-sökvägar för call activities ELLER Epic-sökvägar för tasks/epics (inkl. versioned paths)
              );
              
              // Only log when docs are found (success case)
              if (import.meta.env.DEV && resolvedDocs && node.nodeType === 'CallActivity') {
                console.debug(`[useAllBpmnNodes] ✓ Found docs for CallActivity ${node.bpmnFile}:${node.elementId}`);
              }
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
