import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRootBpmnFile } from './useRootBpmnFile';
import { useProcessTree } from './useProcessTree';
import { ProcessTreeNode } from '@/lib/processTree';
import { getDocumentationUrl, storageFileExists, getNodeDocStoragePath, getTestFileUrl, getFeatureGoalDocStoragePaths } from '@/lib/artifactUrls';
import { getNodeDocFileKey, getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';
import { checkDocsAvailable, checkTestReportAvailable } from '@/lib/artifactAvailability';
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
  hasDocs?: boolean;
  hasTestReport?: boolean;
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
  isSubprocess?: boolean; // ✅ För Process-noder: true om filen är en subprocess (refereras av CallActivities)
  isProcessFeatureGoal?: boolean; // ✅ För Process Feature Goal-noder: true om detta är en Process Feature Goal (subprocess-fil utan callActivities)
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

        // DoR/DoD generation has been removed - no longer used

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

          const diagnosticsSummary = collectDiagnosticsSummary(node);

          // För call activities, använd Feature Goal-sökvägar istället för vanliga node-sökvägar
          // Note: docPath is not used for call activities, they use Feature Goal paths
          const docPath = node.type === 'callActivity' 
            ? null // Använd inte getNodeDocStoragePath för call activities
            : null; // Will be resolved async with version hash if needed
          
          // För call activities, länka till Process Feature Goal för subprocess-filen (non-hierarchical)
          // VIKTIGT: CallActivities länkar till Process Feature Goal för subprocess-filen, INTE till Epic-dokumentation
          // Process Feature Goals använder non-hierarchical naming: feature-goals/{subprocessBaseName}
          const docUrl = node.type === 'callActivity' && node.subprocessFile
            ? getDocumentationUrl(node.subprocessFile) // Länka till Process Feature Goal för subprocess-filen
            : getDocumentationUrl(bpmnFile, elementId); // För tasks/epics, använd normal dokumentation

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
            hasDocs: false, // resolved below
            documentationUrl: docUrl,
            hasTestReport: false, // resolved below
            jiraType: (mapping?.jira_type as 'feature goal' | 'epic' | null) || null,
            jiraName: mapping?.jira_name || null,
            hierarchyPath: null, // Deprecated - no longer used, kept for backward compatibility
            subprocessMatchStatus: node.subprocessLink?.matchStatus,
            diagnosticsSummary,
            orderIndex: node.orderIndex,
            visualOrderIndex: node.visualOrderIndex,
            branchId: node.branchId ?? null,
            scenarioPath: node.scenarioPath,
            staccIntegrationSource: (mapping as any)?.stacc_integration_source || null,
            replaceWithBankIntegrationSource:
              typeof (mapping as any)?.replace_with_bank_integration_source === 'boolean'
                ? (mapping as any).replace_with_bank_integration_source
                : true,
            // ✅ Spara subprocessFile för call activities så vi kan använda det senare
            subprocessFile: node.subprocessFile,
          };

          nodeMap.set(nodeKey, nodeData);
        }

        // Identifiera vilka filer som är subprocesser (refereras av CallActivities)
        // Detta används för att markera Process-noder som subprocesser (men vi visar dem fortfarande)
        const subprocessFiles = new Set<string>();
        for (const node of relevantNodes) {
          if (node.type === 'callActivity' && node.subprocessFile) {
            // Normalisera filnamnet (säkra att det har .bpmn extension för jämförelse)
            const normalizedFile = node.subprocessFile.endsWith('.bpmn')
              ? node.subprocessFile
              : `${node.subprocessFile}.bpmn`;
            subprocessFiles.add(normalizedFile);
          }
        }

        // VIKTIGT: Identifiera subprocess-filer som har Process Feature Goals (utan callActivities)
        // Dessa filer har tasks/epics men INGA callActivities
        // Vi behöver skapa "virtuella" noder för dessa så att de visas i NodeMatrix
        const processFeatureGoalFiles = new Set<string>();
        
        // Samla alla filer som har tasks/epics
        const filesWithTasks = new Set<string>();
        const filesWithCallActivities = new Set<string>();
        
        for (const node of relevantNodes) {
          const normalizedFile = node.bpmnFile.endsWith('.bpmn')
            ? node.bpmnFile
            : `${node.bpmnFile}.bpmn`;
          
          if (node.type === 'userTask' || node.type === 'serviceTask' || node.type === 'businessRuleTask') {
            filesWithTasks.add(normalizedFile);
          } else if (node.type === 'callActivity') {
            // För callActivities, markera både parent-filen och subprocess-filen
            filesWithCallActivities.add(normalizedFile);
            if (node.subprocessFile) {
              const normalizedSubprocessFile = node.subprocessFile.endsWith('.bpmn')
                ? node.subprocessFile
                : `${node.subprocessFile}.bpmn`;
              filesWithCallActivities.add(normalizedSubprocessFile);
            }
          }
        }
        
        // Process Feature Goal-filer: har tasks/epics men INGA callActivities
        for (const fileWithTasks of filesWithTasks) {
          if (!filesWithCallActivities.has(fileWithTasks)) {
            // Kolla att filen INTE är root-processen (mortgage.bpmn)
            const baseName = fileWithTasks.replace('.bpmn', '');
            const isRootProcess = fileWithTasks === 'mortgage.bpmn' || baseName === 'mortgage';
            
            if (!isRootProcess) {
              processFeatureGoalFiles.add(fileWithTasks);
              if (import.meta.env.DEV) {
                console.log(`[useAllBpmnNodes] Found Process Feature Goal file: ${fileWithTasks}`);
              }
            }
          }
        }
        
        // Skapa "virtuella" noder för Process Feature Goals
        for (const processFeatureGoalFile of processFeatureGoalFiles) {
          const baseName = processFeatureGoalFile.replace('.bpmn', '');
          const processElementId = baseName; // För Process Feature Goals är elementId = baseName
          const nodeKey = `${processFeatureGoalFile}:${processElementId}`;
          
          // Skip om vi redan har en nod för denna fil (t.ex. från callActivity)
          if (nodeMap.has(nodeKey)) {
            continue;
          }
          
          // Hitta process-noden för att få label (leta i flattened tree)
          const allFlattenedNodes = flattenTree(processTree);
          const processNode = allFlattenedNodes.find(node => 
            node.type === 'process' && 
            (node.bpmnFile === processFeatureGoalFile || 
             (node.bpmnFile.endsWith('.bpmn') ? node.bpmnFile : `${node.bpmnFile}.bpmn`) === processFeatureGoalFile)
          );
          const elementName = processNode?.label || baseName;
          
          // Hämta mapping från databasen (om den finns)
          // Process Feature Goals kan ha mappings i databasen om de har genererats via handleBuildHierarchy
          const mapping = allMappings?.find(
            m => m.bpmn_file === processFeatureGoalFile && m.element_id === processElementId
          );
          
          // Använd mapping från databasen om den finns, annars använd process-nodens label som fallback
          // Detta säkerställer att Process Feature Goals har ett Jira-namn även om de inte har genererats via handleBuildHierarchy
          const jiraName = mapping?.jira_name || elementName || baseName;
          
          // Skapa en "virtuell" nod för Process Feature Goal
          const processFeatureGoalNode: BpmnNodeData = {
            bpmnFile: processFeatureGoalFile,
            elementId: processElementId,
            elementName: elementName,
            nodeType: 'CallActivity', // Använd CallActivity-typ för att få Feature Goal-stöd i UI
            hasDocs: false, // resolved below
            documentationUrl: getDocumentationUrl(processFeatureGoalFile), // Process Feature Goal URL
            hasTestReport: false,
            jiraType: (mapping?.jira_type as 'feature goal' | 'epic' | null) || 'feature goal', // Default till 'feature goal' om ingen mapping finns
            jiraName: jiraName, // Använd mapping från databasen eller process-nodens label som fallback
            hierarchyPath: null,
            subprocessMatchStatus: undefined,
            diagnosticsSummary: null,
            orderIndex: undefined,
            visualOrderIndex: undefined,
            branchId: null,
            scenarioPath: undefined,
            staccIntegrationSource: (mapping as any)?.stacc_integration_source || null,
            replaceWithBankIntegrationSource:
              typeof (mapping as any)?.replace_with_bank_integration_source === 'boolean'
                ? (mapping as any).replace_with_bank_integration_source
                : true,
            subprocessFile: processFeatureGoalFile, // Sätt subprocessFile så att UI vet att det är en subprocess
            isProcessFeatureGoal: true, // ✅ Flagga för att identifiera Process Feature Goal-noder
          };
          
          nodeMap.set(nodeKey, processFeatureGoalNode);
          if (import.meta.env.DEV) {
            console.log(`[useAllBpmnNodes] Created Process Feature Goal node: ${nodeKey}`, {
              ...processFeatureGoalNode,
              mappingFound: !!mapping,
              jiraName: mapping?.jira_name || 'null',
            });
          }
        }

        // Convert Map to array (efter att Process Feature Goal-noder har lagts till)
        allNodes.push(...Array.from(nodeMap.values()));

        // VIKTIGT: Process-noder (file-level documentation) ska INTE visas i node-matrix
        // File-level documentation är bara för E2E-scenarier och ger inget värde för användaren
        // Dessa filtreras bort - bara Feature Goals, Epics och Business Rules visas

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
              let featureGoalPaths: string | undefined = undefined;
              let epicDocPaths: string[] | undefined = undefined;
              
              if (node.nodeType === 'CallActivity') {
                // VIKTIGT: Identifiera Process Feature Goals (subprocess-filer utan callActivities)
                // Process Feature Goals har: node.bpmnFile === node.subprocessFile (samma fil)
                const normalizedBpmnFile = node.bpmnFile.endsWith('.bpmn')
                  ? node.bpmnFile
                  : `${node.bpmnFile}.bpmn`;
                const normalizedSubprocessFile = node.subprocessFile?.endsWith('.bpmn')
                  ? node.subprocessFile
                  : node.subprocessFile ? `${node.subprocessFile}.bpmn` : undefined;
                
                const isProcessFeatureGoal = normalizedSubprocessFile && 
                  normalizedBpmnFile === normalizedSubprocessFile && 
                  node.elementId === normalizedBpmnFile.replace('.bpmn', '');
                
                if (isProcessFeatureGoal) {
                  // Process Feature Goal: använd non-hierarchical naming (utan parentBpmnFile)
                  const subprocessFile = normalizedSubprocessFile;
                  const subprocessVersionHash = await getVersionHash(subprocessFile);
                  
                  if (import.meta.env.DEV) {
                    console.log(`[useAllBpmnNodes] Process Feature Goal ${node.elementId}:`, {
                      subprocessFile,
                      subprocessVersionHash,
                      elementId: node.elementId,
                    });
                  }
                  
                  // Använd Process Feature Goal-sökvägar (non-hierarchical, utan parentBpmnFile)
                  const { buildDocStoragePaths } = await import('@/lib/artifactPaths');
                  const processFeatureGoalKey = getFeatureGoalDocFileKey(
                    subprocessFile,
                    node.elementId,
                    undefined, // no version suffix
                    undefined, // no parent (non-hierarchical) - detta gör det till Process Feature Goal
                    false, // not a root process
                  );
                  
                  if (subprocessVersionHash) {
                    const { modePath } = buildDocStoragePaths(
                      processFeatureGoalKey,
                      'slow',
                      'cloud', // ArtifactProvider: 'cloud' | 'local' | 'fallback'
                      subprocessFile,
                      subprocessVersionHash
                    );
                    featureGoalPaths = modePath;
                    
                    if (import.meta.env.DEV && featureGoalPaths) {
                      console.log(`[useAllBpmnNodes] Process Feature Goal path for ${node.elementId}:`, featureGoalPaths);
                    }
                  }
                  
                } else {
                  // VIKTIGT: CallActivity Feature Goals genereras INTE längre
                  // Process Feature Goals används istället för subprocess-filer (non-hierarchical naming)
                  // För callActivities, peka på Process Feature Goal för subprocess-filen
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
                    
                    // VIKTIGT: Använd subprocess-filens version hash
                    const subprocessVersionHash = await getVersionHash(subprocessFile);
                    
                    if (import.meta.env.DEV) {
                      console.log(`[useAllBpmnNodes] CallActivity ${node.elementId} -> Process Feature Goal for ${subprocessFile}:`, {
                        subprocessFile,
                        subprocessVersionHash,
                        elementId: node.elementId,
                      });
                    }
                    
                    // Använd Process Feature Goal (non-hierarchical naming, ingen parent)
                    const { buildDocStoragePaths } = await import('@/lib/artifactPaths');
                    const processFeatureGoalKey = getFeatureGoalDocFileKey(
                      subprocessFile,
                      subprocessFile.replace('.bpmn', ''), // elementId är filens baseName för Process Feature Goals
                      undefined, // no version suffix
                      undefined, // no parent (non-hierarchical)
                      false, // not a root process
                    );
                    
                    if (subprocessVersionHash) {
                      const { modePath } = buildDocStoragePaths(
                        processFeatureGoalKey,
                        'slow',
                        'cloud',
                        subprocessFile,
                        subprocessVersionHash
                      );
                      featureGoalPaths = modePath;
                      
                      if (import.meta.env.DEV && featureGoalPaths) {
                        console.log(`[useAllBpmnNodes] Process Feature Goal path for CallActivity ${node.elementId}:`, featureGoalPaths);
                      }
                    }
                  }
                }
              } else {
                // Process-noder (file-level documentation) filtreras bort - de visas inte i node-matrix
                // För Epic-dokumentation (UserTask, ServiceTask, BusinessRuleTask): 
                // VIKTIGT: Använd alltid nodens egen BPMN-fil och dess version hash
                // Dokumentationen sparas nu under varje fils egen version hash
                const bpmnFileName = node.bpmnFile.endsWith('.bpmn') 
                  ? node.bpmnFile 
                  : `${node.bpmnFile}.bpmn`;
                const versionHash = await getVersionHash(bpmnFileName);
                
                if (import.meta.env.DEV) {
                  console.log(`[useAllBpmnNodes] Epic node ${node.elementId} (${node.nodeType}):`, {
                    bpmnFileName,
                    versionHash: versionHash || 'MISSING',
                    elementId: node.elementId,
                  });
                }
                
                epicDocPaths = [];
                if (versionHash) {
                  // Använd getEpicDocStoragePaths för att bygga korrekt versioned path
                  // Detta säkerställer att pathen matchar exakt hur dokumentationen sparas
                  const { getEpicDocStoragePaths } = await import('@/lib/artifactUrls');
                  try {
                    const epicDocPath = await getEpicDocStoragePaths(bpmnFileName, node.elementId, versionHash);
                    epicDocPaths.push(epicDocPath);
                    if (import.meta.env.DEV) {
                      console.log(`[useAllBpmnNodes] ✓ Epic doc path for ${node.elementId}:`, epicDocPath);
                    }
                  } catch (error) {
                    console.warn(`[useAllBpmnNodes] ✗ Failed to get Epic doc path for ${bpmnFileName}::${node.elementId}:`, error);
                  }
                } else {
                  if (import.meta.env.DEV) {
                    console.warn(`[useAllBpmnNodes] ✗ No version hash for ${bpmnFileName}, cannot build Epic doc path for ${node.elementId}`);
                  }
                }
              }
              
              // Only log for call activities with feature goal paths (most verbose case)
              if (import.meta.env.DEV && node.nodeType === 'CallActivity' && featureGoalPaths) {
              }
              
              // Bygg additionalPaths array korrekt
              const additionalPaths: string[] = [];
              if (featureGoalPaths) {
                // Feature Goal returnerar en string, inte array
                additionalPaths.push(featureGoalPaths);
              } else if (epicDocPaths) {
                // Epic paths är redan en array
                additionalPaths.push(...epicDocPaths);
              }
              
              const resolvedDocs = await checkDocsAvailable(
                node.confluenceUrl,
                docPathFromNode(node), // Main path (non-versioned, for backward compatibility)
                storageFileExists,
                additionalPaths.length > 0 ? additionalPaths : undefined, // ✅ Skicka med Feature Goal-sökvägar för call activities ELLER Epic-sökvägar för tasks/epics (inkl. versioned paths)
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

// Note: docPathFromNode is deprecated - paths should be built with version hash using buildDocStoragePaths
// This function is kept for backward compatibility but should not be used for new code
// For Epic nodes, this returns null since they use epicDocPaths instead
const docPathFromNode = (node: { bpmnFile: string; elementId: string; nodeType?: string }) => {
  // Process-noder (file-level documentation) visas inte längre i node-matrix
  // For Epic nodes (UserTask, ServiceTask, BusinessRuleTask), return null
  // They use epicDocPaths instead (versioned paths)
  // This is deprecated - should use getNodeDocStoragePath with version hash
  return null;
};
