import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import { buildJiraName, buildParentPath } from '@/lib/jiraNaming';
import { savePlannedScenarios } from '@/lib/plannedScenariosHelper';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';
import { createGenerationJob, updateGenerationJob, setJobStatus } from '@/pages/BpmnFileManager/utils/jobHelpers';
import type { GenerationJob, GenerationStatus } from '@/hooks/useGenerationJobs';
import type { BpmnFile } from '@/hooks/useBpmnFiles';
import type { HierarchyBuildResult } from '@/pages/BpmnFileManager/types';

/**
 * Creates a summary from ProcessGraph and ProcessTree
 */
function createGraphSummaryFromNewGraph(
  graph: ProcessGraph,
  tree: ProcessTreeNode,
): {
  totalFiles: number;
  totalNodes: number;
} {
  const fileSet = new Set<string>();
  let nodeCount = 0;

  const traverse = (node: ProcessTreeNode) => {
    if (node.type !== 'process') {
      nodeCount++;
    }
    fileSet.add(node.bpmnFile);
    for (const child of node.children) {
      traverse(child);
    }
  };

  traverse(tree);

  return {
    totalFiles: fileSet.size,
    totalNodes: nodeCount,
  };
}

export interface UseHierarchyBuildingProps {
  refreshGenerationJobs: () => void;
  resetGenerationState: () => void;
  setGeneratingFile: (file: string | null) => void;
  setOverlayMessage: (message: string) => void;
  setOverlayDescription: (description: string) => void;
  setShowTransitionOverlay: (show: boolean) => void;
  setHierarchyResult: (result: HierarchyBuildResult | null) => void;
  setShowHierarchyReport: (show: boolean) => void;
}

export function useHierarchyBuilding({
  refreshGenerationJobs,
  resetGenerationState,
  setGeneratingFile,
  setOverlayMessage,
  setOverlayDescription,
  setShowTransitionOverlay,
  setHierarchyResult,
  setShowHierarchyReport,
}: UseHierarchyBuildingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBuildHierarchy = useCallback(async (file: BpmnFile) => {
    if (file.file_type !== 'bpmn') {
      toast({
        title: 'Ej stödd filtyp',
        description: 'Endast BPMN-filer stöds för hierarkibyggnad',
        variant: 'destructive',
      });
      return;
    }
    if (!file.storage_path) {
      toast({
        title: 'Filen är inte uppladdad än',
        description: 'Ladda upp BPMN-filen innan du bygger hierarkin.',
        variant: 'destructive',
      });
      return;
    }

    resetGenerationState();
    setGeneratingFile(file.file_name);
    setOverlayMessage(`Bygger hierarki för ${file.file_name.replace('.bpmn', '')}`);
    setOverlayDescription('Vi uppdaterar endast strukturen så att du kan verifiera processträdet innan artefakter genereras.');
    setShowTransitionOverlay(true);

    let hierarchyJob: GenerationJob | null = null;

    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Error getting Supabase session:', authError);
      }
      const isAuthenticated = !!authData?.session;

      if (!isAuthenticated) {
        toast({
          title: 'Inloggning krävs',
          description: 'Logga in via Auth-sidan för att kunna uppdatera hierarkin.',
          variant: 'destructive',
        });
        return;
      }

      // Check if user still exists in database (common after db reset)
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          toast({
            title: 'Användare saknas',
            description: 'Din användare finns inte i databasen. Logga in igen.',
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        console.error('Error checking user:', error);
        toast({
          title: 'Fel vid användarkontroll',
          description: 'Kunde inte verifiera användare. Försök igen.',
          variant: 'destructive',
        });
        return;
      }

      hierarchyJob = await createGenerationJob(file.file_name, 'hierarchy', undefined, refreshGenerationJobs);
      await setJobStatus(hierarchyJob.id, 'running', {
        started_at: new Date().toISOString(),
        progress: 0,
        total: 3,
      }, refreshGenerationJobs);

      // Load all BPMN parse results and bpmn-map
      const parseResults = await loadAllBpmnParseResults();
      const bpmnMap = await loadBpmnMap();

      // Build ProcessGraph using the new implementation
      const graph = buildProcessGraph(parseResults, {
        bpmnMap,
        preferredRootProcessId: file.file_name.replace('.bpmn', ''),
      });

      // Build ProcessTree from graph
      const tree = buildProcessTreeFromGraph(graph, {
        rootProcessId: file.file_name.replace('.bpmn', ''),
        preferredRootFile: file.file_name,
        artifactBuilder: () => [],
      });

      // Create summary
      const summary = createGraphSummaryFromNewGraph(graph, tree);
      if (hierarchyJob) {
        await updateGenerationJob(hierarchyJob.id, { progress: 1 }, refreshGenerationJobs);
      }

      // Extract dependencies from graph edges
      const dependenciesToInsert: Array<{ parent_file: string; child_process: string; child_file: string }> = [];
      for (const edge of graph.edges.values()) {
        if (edge.type === 'subprocess') {
          const fromNode = graph.nodes.get(edge.from);
          const toNode = graph.nodes.get(edge.to);
          if (fromNode && toNode && toNode.type === 'process') {
            dependenciesToInsert.push({
              parent_file: fromNode.bpmnFile,
              child_process: fromNode.bpmnElementId,
              child_file: toNode.bpmnFile,
            });
          }
        }
      }

      if (dependenciesToInsert.length > 0) {
        const { error: depError } = await supabase
          .from('bpmn_dependencies')
          .upsert(dependenciesToInsert, {
            onConflict: 'parent_file,child_process',
            ignoreDuplicates: false,
          });

        if (depError) {
          console.error('Save dependencies error:', depError);
        }
      }
      if (hierarchyJob) {
        await updateGenerationJob(hierarchyJob.id, { progress: 2 }, refreshGenerationJobs);
      }

      // Extract Jira mappings from ProcessTree
      const mappingsToInsert: any[] = [];

      // Traverse tree and collect mappings using new Jira naming scheme
      const collectMappings = (
        node: ProcessTreeNode,
        parentPath: string[] = [],
      ): void => {
        // Skip root process node itself
        if (node.type !== 'process') {
          // Determine Jira type based on node type
          const jiraType =
            node.type === 'callActivity'
              ? 'feature goal'
              : node.type === 'userTask' || node.type === 'serviceTask' || node.type === 'businessRuleTask'
                ? 'epic'
                : null;

          // Use new Jira naming scheme: full path from root to node (excluding root)
          const jiraName = buildJiraName(node, tree, []);

          // Debug logging for specific node
          // Jira name generation debug (DEV only)
          if (import.meta.env.DEV && node.bpmnElementId === 'calculate-household-affordability') {
            const fullPath = buildParentPath(node, tree);
            console.log('[handleBuildHierarchy] Jira name generation:', {
              nodeLabel: node.label,
              nodeType: node.type,
              bpmnFile: node.bpmnFile,
              fullPath,
              jiraName,
              rootLabel: tree.label,
            });
          }

          mappingsToInsert.push({
            bpmn_file: node.bpmnFile,
            element_id: node.bpmnElementId,
            jira_type: jiraType,
            jira_name: jiraName,
          });
        }

        // Recursively process children
        // parentPath is no longer used for naming, but kept for backward compatibility
        for (const child of node.children) {
          collectMappings(child, parentPath);
        }
      };

      collectMappings(tree);

      // DISABLED: Create base planned scenarios for all testable nodes in ProcessTree
      // Detta skapar testscenarios med origin: 'design' som saknar given/when/then.
      // Testscenarios ska istället genereras via testgenerering (origin: 'claude-direct').
      const result = { success: true, count: 0 };

      // OLD CODE (disabled - scenarios are no longer created here):
      // if (!result.success) {
      //   toast({
      //     title: 'Varning',
      //     description: `Kunde inte spara alla planerade scenarion: ${result.error?.message || 'Okänt fel'}`,
      //     variant: 'destructive',
      //   });
      // } else if (result.count > 0) {
      //   queryClient.invalidateQueries({ queryKey: ['global-planned-scenarios'] });
      // }
      
      // Scenarios are now generated via test generation, not during hierarchy building
      if (false) {
        // Invalidate planned scenarios queries
        queryClient.invalidateQueries({ queryKey: ['global-planned-scenarios'] });
      }

      // Deduplicate mappings by bpmn_file:element_id to avoid PostgreSQL error:
      // "ON CONFLICT DO UPDATE command cannot affect row a second time"
      // This can happen if the same node appears multiple times in the tree
      const uniqueMappings = new Map<string, typeof mappingsToInsert[0]>();
      for (const mapping of mappingsToInsert) {
        const key = `${mapping.bpmn_file}:${mapping.element_id}`;
        // Keep the first occurrence (or we could keep the last one)
        if (!uniqueMappings.has(key)) {
          uniqueMappings.set(key, mapping);
        }
      }
      const deduplicatedMappings = Array.from(uniqueMappings.values());

      if (deduplicatedMappings.length > 0) {
        const { error: mappingsError } = await supabase
          .from('bpmn_element_mappings')
          .upsert(deduplicatedMappings, {
            onConflict: 'bpmn_file,element_id',
            ignoreDuplicates: false,
          });

        if (mappingsError) {
          console.error('Save element mappings error:', mappingsError);
        }
      }
      if (hierarchyJob) {
        await updateGenerationJob(hierarchyJob.id, { progress: 3 }, refreshGenerationJobs);
      }

      // Invalidate queries to refresh UI
      invalidateStructureQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-element-mappings'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
      ]);

      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'succeeded', {
          finished_at: new Date().toISOString(),
          progress: 3,
          total: 3,
        }, refreshGenerationJobs);
      }

      // Create hierarchy result
      const filesAnalyzed = Array.from(new Set(parseResults.map(r => r.fileName)));
      const hierarchyResult: HierarchyBuildResult = {
        fileName: file.file_name,
        filesAnalyzed,
        totalNodes: summary.totalNodes,
        totalFiles: summary.totalFiles,
        hierarchyDepth: tree.children.length > 0 ? Math.max(...tree.children.map(c => c.orderIndex || 0)) : 0,
        missingDependencies: dependenciesToInsert.filter(dep => {
          // Check if the child_file exists in parseResults
          return !parseResults.some(r => r.fileName === dep.child_file);
        }).map(dep => ({
          parent: dep.parent_file,
          childProcess: dep.child_process,
        })),
      };

      setHierarchyResult(hierarchyResult);
      setShowHierarchyReport(true);

      toast({
        title: 'Hierarki byggd',
        description: `Hierarkin för ${file.file_name.replace('.bpmn', '')} har byggts och sparats.`,
      });
    } catch (error) {
      console.error('Error building hierarchy:', error);
      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'failed', {
          error: error instanceof Error ? error.message : 'Okänt fel',
          finished_at: new Date().toISOString(),
        }, refreshGenerationJobs);
      }
      toast({
        title: 'Fel vid hierarkibyggnad',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setGeneratingFile(null);
        setShowTransitionOverlay(false);
        setOverlayMessage('');
        setOverlayDescription('');
      }, 200);
    }
  }, [
    refreshGenerationJobs,
    resetGenerationState,
    setGeneratingFile,
    setOverlayMessage,
    setOverlayDescription,
    setShowTransitionOverlay,
    setHierarchyResult,
    setShowHierarchyReport,
    toast,
    queryClient,
  ]);

  return {
    handleBuildHierarchy,
  };
}

