import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBpmnFiles } from './useBpmnFiles';
import { sanitizeElementId } from '@/lib/nodeArtifactPaths';
import { buildBpmnProcessGraph, getTestableNodes, type BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import { collectDescendants } from '@/lib/documentationContext';

export type CoverageStatus = 'none' | 'partial' | 'full' | 'noApplicableNodes';

export interface ArtifactCoverage {
  status: CoverageStatus;
  total: number;
  covered: number;
}
export interface FileArtifactCoverage {
  bpmn_file: string;
  total_nodes: number;
  docs: ArtifactCoverage;
  tests: ArtifactCoverage;
  dorDod: ArtifactCoverage;
  hierarchy: ArtifactCoverage;
}

const getCoverageStatus = (covered: number, total: number): CoverageStatus => {
  if (total === 0) return 'noApplicableNodes';
  if (covered === 0) return 'none';
  if (covered === total) return 'full';
  return 'partial';
};

/**
 * Checks if a BPMN node type is relevant for coverage calculation
 */
const isRelevantNodeType = (node: BpmnProcessNode): boolean => {
  return ['userTask', 'serviceTask', 'businessRuleTask', 'callActivity'].includes(node.type);
};

export const getHierarchicalTestFileName = (fileName: string) =>
  fileName.replace('.bpmn', '.hierarchical.spec.ts');

export const hasHierarchicalTestsForFile = async (fileName: string): Promise<boolean> => {
  const hierarchicalFileName = getHierarchicalTestFileName(fileName);
  try {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list('tests', {
        search: hierarchicalFileName,
        limit: 1,
      });

    if (error) {
      console.error(`[Coverage Debug] Error listing hierarchical tests for ${fileName}:`, error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error(`[Coverage Debug] Error checking hierarchical tests for ${fileName}:`, error);
    return false;
  }
};

export const useFileArtifactCoverage = (fileName: string) => {
  const { data: files = [] } = useBpmnFiles();
  const bpmnFiles = files.filter(f => f.file_type === 'bpmn').map(f => f.file_name);

  return useQuery({
    queryKey: ['file-artifact-coverage', fileName, bpmnFiles.join(',')],
    queryFn: async (): Promise<FileArtifactCoverage> => {
      // Build process graph to get all nodes recursively (including subprocesses)
      const graph = await buildBpmnProcessGraph(fileName, bpmnFiles);
      
      // Collect all descendant nodes recursively (including subprocesses and leaf nodes)
      const allDescendants = collectDescendants(graph.root);
      
      // Filter to only relevant node types (userTask, serviceTask, businessRuleTask, callActivity)
      const relevantNodes = allDescendants.filter(isRelevantNodeType);
      
      // Also include the root node if it's a relevant type (though it's usually 'process')
      const rootIsRelevant = isRelevantNodeType(graph.root);
      const total_nodes = relevantNodes.length + (rootIsRelevant ? 1 : 0);

      if (import.meta.env.DEV) {
        console.log(`[Coverage Debug] ${fileName}:`, {
          total_nodes,
          relevant_node_ids: relevantNodes.map(n => `${n.bpmnFile}:${n.bpmnElementId}`),
          graph_total_nodes: graph.allNodes.size,
        });
      }

      // Get DoR/DoD coverage from database for all nodes in the process (including subprocesses)
      // We need to check all files that are part of this process graph
      const allFilesInGraph = Array.from(new Set(relevantNodes.map(n => n.bpmnFile)));
      const { data: dorDodData } = await supabase
        .from('dor_dod_status')
        .select('bpmn_file, bpmn_element_id, subprocess_name')
        .in('bpmn_file', allFilesInGraph);

      // Count unique nodes with DoR/DoD that belong to this process
      const relevantNodeIds = new Set(
        relevantNodes.map(n => `${n.bpmnFile}:${n.bpmnElementId}`)
      );
      const uniqueDoRDoDNodes = new Set(
        dorDodData
          ?.filter(d => {
            const nodeId = `${d.bpmn_file}:${d.bpmn_element_id}`;
            return relevantNodeIds.has(nodeId);
          })
          .map(d => `${d.bpmn_file}:${d.bpmn_element_id}`)
          .filter(Boolean) || []
      );
      const dorDod_covered = uniqueDoRDoDNodes.size;

      // Check test coverage from node_test_links for all nodes in the process
      const { data: testLinksData } = await supabase
        .from('node_test_links')
        .select('bpmn_file, bpmn_element_id')
        .in('bpmn_file', allFilesInGraph);

      const uniqueTestNodes = new Set(
        testLinksData
          ?.filter(t => {
            const nodeId = `${t.bpmn_file}:${t.bpmn_element_id}`;
            return relevantNodeIds.has(nodeId);
          })
          .map(t => `${t.bpmn_file}:${t.bpmn_element_id}`)
          .filter(Boolean) || []
      );
      const tests_covered = uniqueTestNodes.size;

      if (import.meta.env.DEV) {
        console.log(`[Coverage Debug] ${fileName} - Tests:`, {
          test_links_found: testLinksData?.length || 0,
          unique_test_nodes: Array.from(uniqueTestNodes),
          tests_covered,
          coverage_status: getCoverageStatus(tests_covered, total_nodes),
        });
      }

      const hasHierarchyTests = await hasHierarchicalTestsForFile(fileName);
      const hierarchyCovered = hasHierarchyTests ? 1 : 0;

      // Docs: Check documentation for all nodes in the process (including subprocesses)
      // We need to check all files that are part of this process graph
      let docs_covered = 0;
      try {
        // Check docs for each file in the graph
        for (const fileInGraph of allFilesInGraph) {
          const docFolder = `docs/nodes/${fileInGraph.replace('.bpmn', '')}`;
          const { data: docEntries } = await supabase.storage
            .from('bpmn-files')
            .list(docFolder, { limit: 1000 });
          const docNames = new Set(docEntries?.map(entry => entry.name));
          
          // Count docs for nodes that belong to this process
          for (const node of relevantNodes) {
            if (node.bpmnFile === fileInGraph) {
              const safeId = sanitizeElementId(node.bpmnElementId);
              if (docNames.has(`${safeId}.html`)) {
                docs_covered++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Coverage Debug] Error checking docs for ${fileName}:`, error);
      }

      return {
        bpmn_file: fileName,
        total_nodes,
        docs: {
          status: getCoverageStatus(docs_covered, total_nodes),
          total: total_nodes,
          covered: docs_covered,
        },
        tests: {
          status: getCoverageStatus(tests_covered, total_nodes),
          total: total_nodes,
          covered: tests_covered,
        },
        dorDod: {
          status: getCoverageStatus(dorDod_covered, total_nodes),
          total: total_nodes,
          covered: dorDod_covered,
        },
        hierarchy: {
          status: getCoverageStatus(hierarchyCovered, 1),
          total: 1,
          covered: hierarchyCovered,
        },
      };
    },
    enabled: !!fileName && fileName.endsWith('.bpmn'),
  });
};

export const useAllFilesArtifactCoverage = () => {
  const { data: files = [] } = useBpmnFiles();
  const bpmnFiles = files.filter(f => f.file_type === 'bpmn');

  return useQuery({
    queryKey: ['all-files-artifact-coverage', bpmnFiles.map(f => f.file_name).join(',')],
    queryFn: async (): Promise<Map<string, FileArtifactCoverage>> => {
      const coverageMap = new Map<string, FileArtifactCoverage>();

      // Get all DoR/DoD data in one query
      const { data: allDorDodData } = await supabase
        .from('dor_dod_status')
        .select('bpmn_file, bpmn_element_id, subprocess_name');

      // Get all test link data
      const { data: allTestLinksData } = await supabase
        .from('node_test_links')
        .select('bpmn_file, bpmn_element_id');

      for (const file of bpmnFiles) {
        try {
          // Build process graph to get all nodes recursively (including subprocesses)
          const graph = await buildBpmnProcessGraph(file.file_name, bpmnFiles.map(f => f.file_name));
          
          // Collect all descendant nodes recursively (including subprocesses and leaf nodes)
          const allDescendants = collectDescendants(graph.root);
          
          // Filter to only relevant node types
          const relevantNodes = allDescendants.filter(isRelevantNodeType);
          
          // Also include the root node if it's a relevant type
          const rootIsRelevant = isRelevantNodeType(graph.root);
          const total_nodes = relevantNodes.length + (rootIsRelevant ? 1 : 0);
          
          // Get all files in the graph for this process
          const allFilesInGraph = Array.from(new Set(relevantNodes.map(n => n.bpmnFile)));
          const relevantNodeIds = new Set(
            relevantNodes.map(n => `${n.bpmnFile}:${n.bpmnElementId}`)
          );

          // Count DoR/DoD coverage for all nodes in the process (including subprocesses)
          const uniqueDoRDoDNodes = new Set(
            allDorDodData
              ?.filter(d => {
                const nodeId = `${d.bpmn_file}:${d.bpmn_element_id}`;
                return relevantNodeIds.has(nodeId);
              })
              .map(d => `${d.bpmn_file}:${d.bpmn_element_id}`)
              .filter(Boolean) || []
          );
          const dorDod_covered = uniqueDoRDoDNodes.size;

          // Check test coverage for all nodes in the process (including subprocesses)
          const uniqueTestNodes = new Set(
            allTestLinksData
              ?.filter(t => {
                const nodeId = `${t.bpmn_file}:${t.bpmn_element_id}`;
                return relevantNodeIds.has(nodeId);
              })
              .map(t => `${t.bpmn_file}:${t.bpmn_element_id}`)
              .filter(Boolean) || []
          );
          const tests_covered = uniqueTestNodes.size;

          // Debug logging only for specific files or when explicitly needed
          // Removed verbose logging to reduce console noise

          // Check documentation for all nodes in the process (including subprocesses)
          let docs_covered = 0;
          try {
            // Check docs for each file in the graph
            for (const fileInGraph of allFilesInGraph) {
              const docFolder = `docs/nodes/${fileInGraph.replace('.bpmn', '')}`;
              const { data: docEntries } = await supabase.storage
                .from('bpmn-files')
                .list(docFolder, { limit: 1000 });
              const docNames = new Set(docEntries?.map(entry => entry.name));
              
              // Count docs for nodes that belong to this process
              for (const node of relevantNodes) {
                if (node.bpmnFile === fileInGraph) {
                  const safeId = sanitizeElementId(node.bpmnElementId);
                  if (docNames.has(`${safeId}.html`)) {
                    docs_covered++;
                  }
                }
              }
            }
          } catch (error) {
            console.error(`[Coverage Debug] Error checking docs for ${file.file_name}:`, error);
          }

          // Debug logging only for specific files or when explicitly needed
          // Removed verbose logging to reduce console noise

          const hasHierarchyTests = await hasHierarchicalTestsForFile(file.file_name);
          const hierarchyCovered = hasHierarchyTests ? 1 : 0;

          coverageMap.set(file.file_name, {
            bpmn_file: file.file_name,
            total_nodes,
            docs: {
              status: getCoverageStatus(docs_covered, total_nodes),
              total: total_nodes,
              covered: docs_covered,
            },
            tests: {
              status: getCoverageStatus(tests_covered, total_nodes),
              total: total_nodes,
              covered: tests_covered,
            },
            dorDod: {
              status: getCoverageStatus(dorDod_covered, total_nodes),
              total: total_nodes,
              covered: dorDod_covered,
            },
            hierarchy: {
              status: getCoverageStatus(hierarchyCovered, 1),
              total: 1,
              covered: hierarchyCovered,
            },
          });
        } catch (error) {
          console.error(`Error parsing ${file.file_name}:`, error);
        }
      }

      return coverageMap;
    },
    enabled: bpmnFiles.length > 0,
  });
};
