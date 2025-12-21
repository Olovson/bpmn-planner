import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBpmnFiles } from './useBpmnFiles';
import { sanitizeElementId } from '@/lib/nodeArtifactPaths';
import { buildBpmnProcessGraph, getTestableNodes, type BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import { collectDescendants } from '@/lib/documentationContext';
import { getCurrentVersionHash } from '@/lib/bpmnVersioning';

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
          // Get version hash for the file
          const versionHash = await getCurrentVersionHash(fileInGraph);
          
          // Try multiple paths: versioned path, legacy path
          const pathsToTry = versionHash
            ? [
                `docs/slow/chatgpt/${fileInGraph}/${versionHash}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                `docs/slow/ollama/${fileInGraph}/${versionHash}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                `docs/local/${fileInGraph}/${versionHash}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                `docs/nodes/${fileInGraph.replace('.bpmn', '')}`, // Legacy path
              ]
            : [
                `docs/slow/chatgpt/${fileInGraph}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                `docs/slow/ollama/${fileInGraph}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                `docs/local/${fileInGraph}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                `docs/nodes/${fileInGraph.replace('.bpmn', '')}`, // Legacy path
              ];
          
          let docNames = new Set<string>();
          let foundPath: string | null = null;
          for (const docFolder of pathsToTry) {
            const { data: docEntries, error } = await supabase.storage
              .from('bpmn-files')
              .list(docFolder, { limit: 1000 });
            
            if (error && import.meta.env.DEV) {
              console.debug(`[Coverage] Error listing ${docFolder}:`, error.message);
            }
            
            if (docEntries && docEntries.length > 0) {
              docNames = new Set(docEntries.map(entry => entry.name));
              foundPath = docFolder;
              if (import.meta.env.DEV && fileInGraph === fileName) {
                console.log(`[Coverage] Found ${docEntries.length} docs in ${docFolder} for ${fileInGraph}:`, Array.from(docNames));
              }
              break; // Found docs, stop trying other paths
            }
          }
          
          // Count docs for nodes that belong to this process
          for (const node of relevantNodes) {
            if (node.bpmnFile === fileInGraph) {
              const safeId = sanitizeElementId(node.bpmnElementId);
              const fileName = `${safeId}.html`;
              if (docNames.has(fileName)) {
                docs_covered++;
                if (import.meta.env.DEV && fileInGraph === fileName) {
                  console.log(`[Coverage] ✓ Found doc for ${node.bpmnElementId} in ${fileInGraph}`);
                }
              } else if (import.meta.env.DEV && fileInGraph === fileName && foundPath) {
                console.log(`[Coverage] ✗ Missing doc for ${node.bpmnElementId} in ${fileInGraph} (expected: ${fileName}, found: ${Array.from(docNames).join(', ')})`);
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
      if (import.meta.env.DEV) {
        // Starting all-files-artifact-coverage query
      }
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
          
          // Graph built (logged only if verbose)
          
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

          // Debug logging for coverage calculation (only for Household or when issues detected)
          if (import.meta.env.DEV && file.file_name === 'mortgage-se-household.bpmn') {
            const householdNodes = relevantNodes.filter(n => n.bpmnFile === 'mortgage-se-household.bpmn');
            const nodesByFile = new Map<string, number>();
            relevantNodes.forEach(n => {
              nodesByFile.set(n.bpmnFile, (nodesByFile.get(n.bpmnFile) || 0) + 1);
            });
            console.log(`[Coverage] ${file.file_name}:`, {
              total_nodes,
              household_nodes_count: householdNodes.length,
              nodes_by_file: Object.fromEntries(nodesByFile),
            });
          }

          // Check documentation for all nodes in the process (including subprocesses)
          let docs_covered = 0;
          try {
            // Check docs for each file in the graph
            for (const fileInGraph of allFilesInGraph) {
              // Get version hash for the file
              const versionHash = await getCurrentVersionHash(fileInGraph);
              
              // Try multiple paths: versioned path, legacy path
              const pathsToTry = versionHash
                ? [
                    `docs/slow/chatgpt/${fileInGraph}/${versionHash}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                    `docs/slow/ollama/${fileInGraph}/${versionHash}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                    `docs/local/${fileInGraph}/${versionHash}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                    `docs/nodes/${fileInGraph.replace('.bpmn', '')}`, // Legacy path
                  ]
                : [
                    `docs/slow/chatgpt/${fileInGraph}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                    `docs/slow/ollama/${fileInGraph}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                    `docs/local/${fileInGraph}/nodes/${fileInGraph.replace('.bpmn', '')}`,
                    `docs/nodes/${fileInGraph.replace('.bpmn', '')}`, // Legacy path
                  ];
              
              let docNames = new Set<string>();
              let foundPath: string | null = null;
              for (const docFolder of pathsToTry) {
                const { data: docEntries, error } = await supabase.storage
                  .from('bpmn-files')
                  .list(docFolder, { limit: 1000 });
                
                if (error && import.meta.env.DEV) {
                  console.debug(`[Coverage] Error listing ${docFolder}:`, error.message);
                }
                
                if (docEntries && docEntries.length > 0) {
                  docNames = new Set(docEntries.map(entry => entry.name));
                  foundPath = docFolder;
                  if (import.meta.env.DEV && fileInGraph === file.file_name) {
                    console.log(`[Coverage] Found ${docEntries.length} docs in ${docFolder} for ${fileInGraph}:`, Array.from(docNames));
                  }
                  break; // Found docs, stop trying other paths
                }
              }
              
              if (import.meta.env.DEV && fileInGraph === file.file_name) {
                if (!foundPath) {
                  console.log(`[Coverage] ⚠️ No docs found for ${fileInGraph} in any path. Tried:`, pathsToTry);
                } else {
                  console.log(`[Coverage] ✓ Found docs in ${foundPath}, checking ${relevantNodes.filter(n => n.bpmnFile === fileInGraph).length} nodes from ${fileInGraph}`);
                }
              }
              
              // Count docs for nodes that belong to this process
              // First, try to match each doc file to a node
              const matchedDocs = new Set<string>();
              
              // Debug: Log nodes and docs for Household only if there's a mismatch
              if (import.meta.env.DEV && fileInGraph === file.file_name && file.file_name === 'mortgage-se-household.bpmn' && docNames.size > 0) {
                const householdNodes = relevantNodes.filter(n => n.bpmnFile === fileInGraph);
                if (householdNodes.length === 0) {
                  console.warn(`[Coverage] ⚠️ Household: Found ${docNames.size} docs but 0 nodes with bpmnFile='mortgage-se-household.bpmn'`);
                }
              }
              
              for (const docName of docNames) {
                const docBase = docName.replace('.html', '');
                let matched = false;
                
                // Try exact match first
                for (const node of relevantNodes) {
                  if (node.bpmnFile === fileInGraph) {
                    const safeId = sanitizeElementId(node.bpmnElementId);
                    if (docBase === safeId || docBase.toLowerCase() === safeId.toLowerCase()) {
                      matchedDocs.add(docName);
                      matched = true;
                      docs_covered++;
                      if (import.meta.env.DEV && fileInGraph === file.file_name) {
                        console.log(`[Coverage] ✓ Found doc for ${node.bpmnElementId} in ${fileInGraph} (file: ${docName})`);
                      }
                      break;
                    }
                  }
                }
                
                // If no exact match, try partial match (check if doc name contains elementId or vice versa)
                if (!matched) {
                  for (const node of relevantNodes) {
                    if (node.bpmnFile === fileInGraph) {
                      const safeId = sanitizeElementId(node.bpmnElementId);
                      // Check if doc name contains elementId or vice versa
                      if (docBase.includes(safeId) || safeId.includes(docBase) ||
                          docBase.toLowerCase().includes(safeId.toLowerCase()) ||
                          safeId.toLowerCase().includes(docBase.toLowerCase())) {
                        matchedDocs.add(docName);
                        matched = true;
                        docs_covered++;
                        // Doc matched with partial match (logged only if verbose)
                        break;
                      }
                    }
                  }
                }
                
                // Doc file doesn't match any node (logged only if verbose)
              }
              
              // Log missing docs for nodes
              if (import.meta.env.DEV && fileInGraph === file.file_name && foundPath) {
                for (const node of relevantNodes) {
                  if (node.bpmnFile === fileInGraph) {
                    const safeId = sanitizeElementId(node.bpmnElementId);
                    const fileName = `${safeId}.html`;
                    const isMatched = matchedDocs.has(fileName) || Array.from(matchedDocs).some(doc => {
                      const docBase = doc.replace('.html', '');
                      return docBase.includes(safeId) || safeId.includes(docBase) ||
                             docBase.toLowerCase().includes(safeId.toLowerCase()) ||
                             safeId.toLowerCase().includes(docBase.toLowerCase());
                    });
                    if (!isMatched) {
                      console.log(`[Coverage] ✗ Missing doc for ${node.bpmnElementId} in ${fileInGraph} (expected: ${fileName}, found files: ${Array.from(docNames).join(', ')})`);
                    }
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

          // Final result logged only if there are issues (see above)

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
          console.error(`[Coverage Debug] Error parsing ${file.file_name}:`, error);
          if (file.file_name === 'mortgage-se-household.bpmn') {
            console.error(`[Coverage Debug] Full error for household:`, error);
          }
        }
      }

      if (import.meta.env.DEV) {
        // Coverage query completed
      }
      return coverageMap;
    },
    enabled: bpmnFiles.length > 0,
  });
};
