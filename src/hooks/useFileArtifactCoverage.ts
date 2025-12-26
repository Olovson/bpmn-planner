import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBpmnFiles } from './useBpmnFiles';
import { sanitizeElementId, getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';
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
      
      // VIKTIGT: total_nodes ska bara räkna noder som tillhör själva filen, inte alla subprocesses
      // Detta är för att visa korrekt antal dokument som förväntas för denna specifika fil
      const nodesInThisFile = relevantNodes.filter(n => n.bpmnFile === fileName);
      const total_nodes = nodesInThisFile.length + (rootIsRelevant && graph.root.bpmnFile === fileName ? 1 : 0);


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

      const hasHierarchyTests = await hasHierarchicalTestsForFile(fileName);
      const hierarchyCovered = hasHierarchyTests ? 1 : 0;

      // Docs: Check documentation for nodes in THIS file only (not subprocesses)
      // VIKTIGT: Vi räknar bara dokumentation för noder i själva filen, inte alla subprocesses
      let docs_covered = 0;
      try {
        // Get version hash for THIS file only
        const versionHash = await getCurrentVersionHash(fileName);
        
        // Try multiple paths: versioned path, legacy path
        const pathsToTry = versionHash
          ? [
              `docs/claude/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
              `docs/ollama/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
              `docs/local/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
              `docs/nodes/${fileName.replace('.bpmn', '')}`, // Legacy path
            ]
          : [
              `docs/claude/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
              `docs/ollama/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
              `docs/local/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
              `docs/nodes/${fileName.replace('.bpmn', '')}`, // Legacy path
            ];
        
        let docNames = new Set<string>();
        let foundPath: string | null = null;
        for (const docFolder of pathsToTry) {
          const { data: docEntries, error } = await supabase.storage
            .from('bpmn-files')
            .list(docFolder, { limit: 1000 });
          
          
          if (docEntries && docEntries.length > 0) {
            docNames = new Set(docEntries.map(entry => entry.name));
            foundPath = docFolder;
            break; // Found docs, stop trying other paths
          }
        }
        
        // VIKTIGT: För versioned paths, behåll .bpmn i filnamnet eftersom filen är sparad så
        const fileForVersionedPath = fileName.endsWith('.bpmn') ? fileName : `${fileName}.bpmn`;
        const featureGoalPathsToTry = versionHash
          ? [
              `docs/claude/${fileForVersionedPath}/${versionHash}/feature-goals`,
              `docs/ollama/${fileForVersionedPath}/${versionHash}/feature-goals`,
              `docs/local/${fileForVersionedPath}/${versionHash}/feature-goals`,
              `docs/claude/feature-goals`,
              `docs/ollama/feature-goals`,
              `docs/local/feature-goals`,
              `docs/feature-goals`,
            ]
          : [
              `docs/claude/feature-goals`,
              `docs/ollama/feature-goals`,
              `docs/local/feature-goals`,
              `docs/feature-goals`,
            ];
        
        let featureGoalNames = new Set<string>();
        for (const featureGoalPath of featureGoalPathsToTry) {
          const { data: featureGoalEntries, error } = await supabase.storage
            .from('bpmn-files')
            .list(featureGoalPath, { limit: 1000 });
          
          if (!error && featureGoalEntries && featureGoalEntries.length > 0) {
            featureGoalNames = new Set(featureGoalEntries.map(e => e.name));
            break;
          }
        }
        
        // Count docs for nodes that belong to THIS file only
        // VIKTIGT: Vi räknar bara dokumentation för faktiska noder (tasks, call activities),
        // INTE process Feature Goal dokumentation (t.ex. mortgage-se-object-control.html)
        for (const node of nodesInThisFile) {
          let foundDoc = false;
          
          if (node.type === 'callActivity' && node.subprocessFile) {
            // För call activities, kolla Feature Goal-dokumentation i feature-goals/ mappen
            // VIKTIGT: Använd BARA hierarchical naming för att undvika att matcha fel filer
            // Legacy naming kan matcha samma fil för call activities från olika parent-filer
            const hierarchicalKey = getFeatureGoalDocFileKey(
              node.subprocessFile,
              node.bpmnElementId,
              undefined, // no version suffix
              node.bpmnFile, // parent BPMN file (där call activity är definierad)
            );
            
            // Extrahera filnamn från key (ta bort "feature-goals/" prefix)
            const hierarchicalFileName = hierarchicalKey.replace('feature-goals/', '');
            
            // Kolla om Feature Goal-filen finns
            // VIKTIGT: Vi matchar exakt - process Feature Goals (t.ex. mortgage-se-object-control.html)
            // matchar INTE call activity dokumentation (t.ex. mortgage-se-object-control-credit-evaluation.html)
            // VIKTIGT: Använd BARA hierarchical naming - legacy naming kan matcha fel filer
            if (featureGoalNames.has(hierarchicalFileName)) {
              foundDoc = true;
            }
          } else if (node.type !== 'process') {
            // För vanliga noder (userTask, serviceTask, businessRuleTask), använd standard-logik
            // VIKTIGT: Ignorera process-noder - de har Feature Goal dokumentation som inte räknas här
            const safeId = sanitizeElementId(node.bpmnElementId);
            const docFileName = `${safeId}.html`;
            foundDoc = docNames.has(docFileName);
          }
          // Note: process-noder (type === 'process') räknas inte - de har Feature Goal dokumentation
          // som är separat och räknas inte som "node documentation"
          
          if (foundDoc) {
            docs_covered++;
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
          
          // VIKTIGT: total_nodes ska bara räkna noder som tillhör själva filen, inte alla subprocesses
          // Detta är för att visa korrekt antal dokument som förväntas för denna specifika fil
          const nodesInThisFile = relevantNodes.filter(n => n.bpmnFile === file.file_name);
          const total_nodes = nodesInThisFile.length + (rootIsRelevant && graph.root.bpmnFile === file.file_name ? 1 : 0);
          
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
          }

          // Check documentation for nodes in THIS file only (not subprocesses)
          // VIKTIGT: Vi räknar bara dokumentation för noder i själva filen, inte alla subprocesses
          let docs_covered = 0;
          try {
            // Get version hash for THIS file only
            const versionHash = await getCurrentVersionHash(file.file_name);
            
            // Try multiple paths: versioned path, legacy path
            const pathsToTry = versionHash
              ? [
                  `docs/claude/${file.file_name}/${versionHash}/nodes/${file.file_name.replace('.bpmn', '')}`,
                  `docs/ollama/${file.file_name}/${versionHash}/nodes/${file.file_name.replace('.bpmn', '')}`,
                  `docs/local/${file.file_name}/${versionHash}/nodes/${file.file_name.replace('.bpmn', '')}`,
                  `docs/nodes/${file.file_name.replace('.bpmn', '')}`, // Legacy path
                ]
              : [
                  `docs/claude/${file.file_name}/nodes/${file.file_name.replace('.bpmn', '')}`,
                  `docs/ollama/${file.file_name}/nodes/${file.file_name.replace('.bpmn', '')}`,
                  `docs/local/${file.file_name}/nodes/${file.file_name.replace('.bpmn', '')}`,
                  `docs/nodes/${file.file_name.replace('.bpmn', '')}`, // Legacy path
                ];
            
            let docNames = new Set<string>();
            let foundPath: string | null = null;
            for (const docFolder of pathsToTry) {
              const { data: docEntries, error } = await supabase.storage
                .from('bpmn-files')
                .list(docFolder, { limit: 1000 });
              
              
              if (docEntries && docEntries.length > 0) {
                docNames = new Set(docEntries.map(entry => entry.name));
                foundPath = docFolder;
                break; // Found docs, stop trying other paths
              }
            }
            
            // VIKTIGT: För versioned paths, behåll .bpmn i filnamnet eftersom filen är sparad så
            const fileForVersionedPath = file.file_name.endsWith('.bpmn') ? file.file_name : `${file.file_name}.bpmn`;
            const featureGoalPathsToTry = versionHash
              ? [
                  `docs/claude/${fileForVersionedPath}/${versionHash}/feature-goals`,
                  `docs/ollama/${fileForVersionedPath}/${versionHash}/feature-goals`,
                  `docs/local/${fileForVersionedPath}/${versionHash}/feature-goals`,
                  `docs/claude/feature-goals`,
                  `docs/ollama/feature-goals`,
                  `docs/local/feature-goals`,
                  `docs/feature-goals`,
                ]
              : [
                  `docs/claude/feature-goals`,
                  `docs/ollama/feature-goals`,
                  `docs/local/feature-goals`,
                  `docs/feature-goals`,
                ];
            
            let featureGoalNames = new Set<string>();
            for (const featureGoalPath of featureGoalPathsToTry) {
              const { data: featureGoalEntries, error } = await supabase.storage
                .from('bpmn-files')
                .list(featureGoalPath, { limit: 1000 });
              
              if (!error && featureGoalEntries && featureGoalEntries.length > 0) {
                featureGoalNames = new Set(featureGoalEntries.map(e => e.name));
                break;
              }
            }
            
            // Count docs for nodes that belong to THIS file only
            // VIKTIGT: Vi räknar bara dokumentation för faktiska noder (tasks, call activities),
            // INTE process Feature Goal dokumentation (t.ex. mortgage-se-object-control.html)
            for (const node of nodesInThisFile) {
              let foundDoc = false;
              
              if (node.type === 'callActivity' && node.subprocessFile) {
                // För call activities, kolla Feature Goal-dokumentation i feature-goals/ mappen
                // VIKTIGT: Använd BARA hierarchical naming för att undvika att matcha fel filer
                // Legacy naming kan matcha samma fil för call activities från olika parent-filer
                const hierarchicalKey = getFeatureGoalDocFileKey(
                  node.subprocessFile,
                  node.bpmnElementId,
                  undefined, // no version suffix
                  node.bpmnFile, // parent BPMN file (där call activity är definierad)
                );
                
                // Extrahera filnamn från key (ta bort "feature-goals/" prefix)
                const hierarchicalFileName = hierarchicalKey.replace('feature-goals/', '');
                
                // Kolla om Feature Goal-filen finns
                // VIKTIGT: Vi matchar exakt - process Feature Goals (t.ex. mortgage-se-object-control.html)
                // matchar INTE call activity dokumentation (t.ex. mortgage-se-object-control-credit-evaluation.html)
                // VIKTIGT: Använd BARA hierarchical naming - legacy naming kan matcha fel filer
                if (featureGoalNames.has(hierarchicalFileName)) {
                  foundDoc = true;
                }
              } else if (node.type !== 'process') {
                // För vanliga noder (userTask, serviceTask, businessRuleTask), använd standard-logik
                // VIKTIGT: Ignorera process-noder - de har Feature Goal dokumentation som inte räknas här
                const safeId = sanitizeElementId(node.bpmnElementId);
                const docFileName = `${safeId}.html`;
                foundDoc = docNames.has(docFileName);
              }
              // Note: process-noder (type === 'process') räknas inte - de har Feature Goal dokumentation
              // som är separat och räknas inte som "node documentation"
              
              if (foundDoc) {
                docs_covered++;
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
