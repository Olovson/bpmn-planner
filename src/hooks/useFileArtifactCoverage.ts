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
  const allBpmnFiles = files.filter(f => f.file_type === 'bpmn').map(f => f.file_name);

  return useQuery({
    queryKey: ['file-artifact-coverage', fileName, allBpmnFiles.join(',')],
    queryFn: async (): Promise<FileArtifactCoverage> => {
      // VIKTIGT: Hämta bara filer som faktiskt är relevanta för hierarkin från denna fil
      // Detta förhindrar att vi räknar noder från alla filer i databasen
      // Men använd fallback till alla filer om hierarkin inte kan byggas korrekt
      let relevantFiles: string[];
      try {
        const hierarchyFiles = new Set<string>([fileName]);
        
        // Hämta alla children rekursivt från filen
        const getChildrenRecursively = async (parent: string) => {
          const { data: children } = await supabase
            .from('bpmn_dependencies')
            .select('child_file')
            .eq('parent_file', parent);
          
          if (children) {
            for (const child of children) {
              if (child.child_file && allBpmnFiles.includes(child.child_file)) {
                if (!hierarchyFiles.has(child.child_file)) {
                  hierarchyFiles.add(child.child_file);
                  // Rekursivt hämta children till children
                  await getChildrenRecursively(child.child_file);
                }
              }
            }
          }
        };
        
        await getChildrenRecursively(fileName);
        relevantFiles = Array.from(hierarchyFiles);
        
        // VIKTIGT: Om hierarkin bara innehåller root-filen, använd BARA root-filen
        // Använd INTE alla filer som fallback, eftersom det inkluderar noder från andra filer
        // vilket ger felaktig coverage-räkning (t.ex. "3/135" istället för "3/4")
        if (relevantFiles.length === 1) {
          if (import.meta.env.DEV) {
            console.warn(
              `[useFileArtifactCoverage] Hierarchy for ${fileName} only contains root file. ` +
              `Using only root file for coverage calculation to avoid counting nodes from other files.`
            );
          }
          // Behåll bara root-filen - använd INTE alla filer som fallback
          relevantFiles = [fileName];
        } else if (import.meta.env.DEV && relevantFiles.length < allBpmnFiles.length) {
          console.log(
            `[useFileArtifactCoverage] Using ${relevantFiles.length} files in hierarchy for ${fileName} ` +
            `(out of ${allBpmnFiles.length} total files in database)`
          );
        }
      } catch (error) {
        // Om något går fel med hierarki-byggandet, använd BARA den aktuella filen
        // Använd INTE alla filer som fallback, eftersom det inkluderar noder från andra filer
        console.warn(`[useFileArtifactCoverage] Error building hierarchy for ${fileName}, using only root file:`, error);
        relevantFiles = [fileName];
      }
      
      // Build process graph to get all nodes recursively (including subprocesses)
      // VIKTIGT: Om buildBpmnProcessGraph kastar ett fel, försök bara med root-filen
      let graph;
      try {
        graph = await buildBpmnProcessGraph(fileName, relevantFiles);
      } catch (graphError) {
        // Om grafen inte kan byggas med relevanta filer, försök bara med root-filen
        console.warn(`[useFileArtifactCoverage] Error building graph for ${fileName} with relevant files, trying only root file:`, graphError);
        try {
          graph = await buildBpmnProcessGraph(fileName, [fileName]);
        } catch (fallbackError) {
          // Om det också misslyckas, kasta felet så att queryn misslyckas och komponenten kan hantera det
          console.error(`[useFileArtifactCoverage] Error building graph for ${fileName} even with only root file:`, fallbackError);
          throw fallbackError;
        }
      }
      
      // Collect all descendant nodes recursively (including subprocesses and leaf nodes)
      const allDescendants = collectDescendants(graph.root);
      
      // Filter to only relevant node types (userTask, serviceTask, businessRuleTask, callActivity)
      const relevantNodes = allDescendants.filter(isRelevantNodeType);
      
      // VIKTIGT: För coverage-räkning, räkna BARA noder från själva filen, inte från hela hierarkin
      // Detta säkerställer att "4/4" visas istället för "4/220" när filen bara har 4 noder
      const nodesInThisFile = relevantNodes.filter(n => n.bpmnFile === fileName);
      
      // Also include the root node if it's a relevant type and belongs to this file
      const rootIsRelevant = isRelevantNodeType(graph.root) && graph.root.bpmnFile === fileName;
      const total_nodes = nodesInThisFile.length + (rootIsRelevant ? 1 : 0);


      // DoR/DoD generation has been removed - no longer used
      const dorDod_covered = 0;

      // Check test coverage from node_test_links for nodes in this file only
      const { data: testLinksData } = await supabase
        .from('node_test_links')
        .select('bpmn_file, bpmn_element_id')
        .eq('bpmn_file', fileName);

      // Create node IDs set for this file only
      const relevantNodeIds = new Set(
        nodesInThisFile.map(n => `${n.bpmnFile}:${n.bpmnElementId}`)
      );

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

      // Docs: Check documentation for nodes in this file only
      // VIKTIGT: Räkna bara dokumentation för noder i själva filen, inte från hela hierarkin
      let docs_covered = 0;
      try {
        // Get version hash for this file
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
        
        // Count docs for nodes that belong to this file only
        for (const node of nodesInThisFile) {
              let foundDoc = false;
              
              if (node.type === 'callActivity' && node.subprocessFile) {
                // För call activities, kolla Feature Goal-dokumentation i feature-goals/ mappen
                // Process Feature Goals genereras INTE längre (ersatta av file-level docs)
                const hierarchicalKey = getFeatureGoalDocFileKey(
                  node.subprocessFile,
                  node.bpmnElementId,
                  undefined, // no version suffix
                  node.bpmnFile, // parent BPMN file
                );
                
                // Extrahera filnamn från key (ta bort "feature-goals/" prefix)
                const hierarchicalFileName = hierarchicalKey.replace('feature-goals/', '');
                
                // Kolla feature-goals/ mappen separat
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
                
                // Kolla om Feature Goal-filen finns
                for (const featureGoalPath of featureGoalPathsToTry) {
                  const { data: featureGoalEntries, error } = await supabase.storage
                    .from('bpmn-files')
                    .list(featureGoalPath, { limit: 1000 });
                  
                  if (!error && featureGoalEntries) {
                    const featureGoalNames = new Set(featureGoalEntries.map(e => e.name));
                    // Process Feature Goals genereras INTE längre (ersatta av file-level docs)
                    if (featureGoalNames.has(hierarchicalFileName)) {
                      foundDoc = true;
                      break;
                    }
                  }
                }
              } else {
                // För vanliga noder, använd standard-logik
                const safeId = sanitizeElementId(node.bpmnElementId);
                const fileName = `${safeId}.html`;
                foundDoc = docNames.has(fileName);
              }
              
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

      // VIKTIGT: Om något går fel, returnera åtminstone en tom Map istället för att låta queryn misslyckas
      try {
        // DoR/DoD generation has been removed - no longer used
        const allDorDodData: never[] = [];

        // Get all test link data
        const { data: allTestLinksData } = await supabase
          .from('node_test_links')
          .select('bpmn_file, bpmn_element_id');

      for (const file of bpmnFiles) {
        try {
          // VIKTIGT: Hämta bara filer som faktiskt är relevanta för hierarkin från denna fil
          // Detta förhindrar att vi räknar noder från alla filer i databasen
          // Men använd fallback till alla filer om hierarkin inte kan byggas korrekt
          let relevantFiles: string[];
          try {
            const hierarchyFiles = new Set<string>([file.file_name]);
            
            // Hämta alla children rekursivt från filen
            const getChildrenRecursively = async (parent: string) => {
              const { data: children } = await supabase
                .from('bpmn_dependencies')
                .select('child_file')
                .eq('parent_file', parent);
              
              if (children) {
                for (const child of children) {
                  if (child.child_file && bpmnFiles.some(f => f.file_name === child.child_file)) {
                    if (!hierarchyFiles.has(child.child_file)) {
                      hierarchyFiles.add(child.child_file);
                      // Rekursivt hämta children till children
                      await getChildrenRecursively(child.child_file);
                    }
                  }
                }
              }
            };
            
            await getChildrenRecursively(file.file_name);
            relevantFiles = Array.from(hierarchyFiles);
            
            // VIKTIGT: Om hierarkin bara innehåller root-filen, använd BARA root-filen
            // Använd INTE alla filer som fallback, eftersom det inkluderar noder från andra filer
            // vilket ger felaktig coverage-räkning (t.ex. "3/135" istället för "3/4")
            // Om hierarkin inte är byggd ännu, räkna bara noder från den aktuella filen
            if (relevantFiles.length === 1) {
              if (import.meta.env.DEV) {
                console.warn(
                  `[useFileArtifactCoverage] Hierarchy for ${file.file_name} only contains root file. ` +
                  `Using only root file for coverage calculation to avoid counting nodes from other files.`
                );
              }
              // Behåll bara root-filen - använd INTE alla filer som fallback
              relevantFiles = [file.file_name];
            }
          } catch (error) {
            // Om något går fel med hierarki-byggandet, använd BARA den aktuella filen
            // Använd INTE alla filer som fallback, eftersom det inkluderar noder från andra filer
            console.warn(`[useFileArtifactCoverage] Error building hierarchy for ${file.file_name}, using only root file:`, error);
            relevantFiles = [file.file_name];
          }
          
          // Build process graph to get all nodes recursively (including subprocesses)
          // VIKTIGT: Om buildBpmnProcessGraph kastar ett fel, hoppa över denna fil
          // istället för att låta hela queryn misslyckas
          let graph;
          try {
            graph = await buildBpmnProcessGraph(file.file_name, relevantFiles);
          } catch (graphError) {
            console.error(`[useFileArtifactCoverage] Error building graph for ${file.file_name}, skipping:`, graphError);
            continue; // Hoppa över denna fil och fortsätt med nästa
          }
          
          // Graph built (logged only if verbose)
          
          // Collect all descendant nodes recursively (including subprocesses and leaf nodes)
          const allDescendants = collectDescendants(graph.root);
          
          // Filter to only relevant node types
          const relevantNodes = allDescendants.filter(isRelevantNodeType);
          
          // VIKTIGT: För coverage-räkning, räkna BARA noder från själva filen, inte från hela hierarkin
          // Detta säkerställer att "4/4" visas istället för "4/220" när filen bara har 4 noder
          const nodesInThisFile = relevantNodes.filter(n => n.bpmnFile === file.file_name);
          
          // Also include the root node if it's a relevant type and belongs to this file
          const rootIsRelevant = isRelevantNodeType(graph.root) && graph.root.bpmnFile === file.file_name;
          const total_nodes = nodesInThisFile.length + (rootIsRelevant ? 1 : 0);
          
          // Debug logging för att identifiera problem med coverage-räkning
          if (import.meta.env.DEV && (total_nodes > 50 || nodesInThisFile.length !== relevantNodes.filter(n => n.bpmnFile === file.file_name).length)) {
            console.log(`[useAllFilesArtifactCoverage] Coverage calculation for ${file.file_name}:`, {
              totalRelevantNodes: relevantNodes.length,
              nodesInThisFile: nodesInThisFile.length,
              total_nodes,
              rootIsRelevant,
              relevantFilesCount: relevantFiles.length,
              nodesByFile: Array.from(new Set(relevantNodes.map(n => n.bpmnFile))).map(f => ({
                file: f,
                count: relevantNodes.filter(n => n.bpmnFile === f).length,
              })),
            });
          }
          
          // Create node IDs set for this file only
          const relevantNodeIds = new Set(
            nodesInThisFile.map(n => `${n.bpmnFile}:${n.bpmnElementId}`)
          );

          // DoR/DoD generation has been removed - no longer used
          const dorDod_covered = 0;

          // Check test coverage for nodes in this file only
          const uniqueTestNodes = new Set(
            allTestLinksData
              ?.filter(t => {
                const nodeId = `${t.bpmn_file}:${t.bpmn_element_id}`;
                return relevantNodeIds.has(nodeId) && t.bpmn_file === file.file_name;
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

          // Check documentation for nodes in this file only
          // VIKTIGT: Räkna bara dokumentation för noder i själva filen, inte från hela hierarkin
          let docs_covered = 0;
          try {
            // Get version hash for this file
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
            
            // För call activities, kolla också feature-goals/ mappen
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
            
            // First, try to match each doc file to a node in this file
            const matchedDocs = new Set<string>();
            
            // Match call activities against feature-goals/ files
            for (const node of nodesInThisFile) {
              if (node.type === 'callActivity' && node.subprocessFile) {
                const hierarchicalKey = getFeatureGoalDocFileKey(
                  node.subprocessFile,
                  node.bpmnElementId,
                  undefined, // no version suffix
                  node.bpmnFile,
                );
                // Process Feature Goals genereras INTE längre (ersatta av file-level docs)
                const hierarchicalFileName = hierarchicalKey.replace('feature-goals/', '');
                
                if (featureGoalNames.has(hierarchicalFileName)) {
                  matchedDocs.add(`${node.bpmnFile}:${node.bpmnElementId}`);
                  docs_covered++;
                }
              }
            }
            
            // Debug: Log nodes and docs for Household only if there's a mismatch
            if (import.meta.env.DEV && file.file_name === 'mortgage-se-household.bpmn' && docNames.size > 0) {
              if (nodesInThisFile.length === 0) {
                console.warn(`[Coverage] ⚠️ Household: Found ${docNames.size} docs but 0 nodes with bpmnFile='mortgage-se-household.bpmn'`);
              }
            }
            
            for (const docName of docNames) {
              const docBase = docName.replace('.html', '');
              let matched = false;
              
              // Try exact match first
              for (const node of nodesInThisFile) {
                const safeId = sanitizeElementId(node.bpmnElementId);
                if (docBase === safeId || docBase.toLowerCase() === safeId.toLowerCase()) {
                  matchedDocs.add(docName);
                  matched = true;
                  docs_covered++;
                  break;
                }
              }
              
              // If no exact match, try partial match (check if doc name contains elementId or vice versa)
              if (!matched) {
                for (const node of nodesInThisFile) {
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
              
              // Doc file doesn't match any node (logged only if verbose)
            }
            
            // Debug logging disabled for cleaner output
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
      } catch (error) {
        // VIKTIGT: Om något går fel, returnera åtminstone en tom Map istället för att låta queryn misslyckas
        // Detta säkerställer att komponenterna alltid får data (även om det är tomt) och kan rendera
        console.error(`[useAllFilesArtifactCoverage] Error in coverage query, returning empty map:`, error);
        return new Map<string, FileArtifactCoverage>();
      }
    },
    enabled: bpmnFiles.length > 0,
  });
};
