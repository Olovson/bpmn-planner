/**
 * Helper functions for hierarchy building
 */

import type { BpmnFile } from '@/hooks/useBpmnFiles';
import { supabase } from '@/integrations/supabase/client';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { buildJiraName } from '@/lib/jiraNaming';
import { savePlannedScenarios } from '@/lib/plannedScenariosHelper';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';
import type { QueryClient } from '@tanstack/react-query';

export async function buildHierarchySilently(
  file: BpmnFile,
  queryClient: QueryClient,
): Promise<boolean> {
  if (file.file_type !== 'bpmn' || !file.storage_path) {
    return false;
  }

  try {
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

    // Extract Jira mappings from ProcessTree
    const mappingsToInsert: any[] = [];

    const collectMappings = (
      node: ProcessTreeNode,
      parentPath: string[] = [],
    ): void => {
      if (node.type !== 'process') {
        const jiraType =
          node.type === 'callActivity'
            ? 'feature goal'
            : node.type === 'userTask' || node.type === 'serviceTask' || node.type === 'businessRuleTask'
              ? 'epic'
              : null;

        const jiraName = buildJiraName(node, tree, []);

        mappingsToInsert.push({
          bpmn_file: node.bpmnFile,
          element_id: node.bpmnElementId,
          jira_type: jiraType,
          jira_name: jiraName,
        });
      }

      for (const child of node.children) {
        collectMappings(child, parentPath);
      }
    };

    collectMappings(tree);

    // DISABLED: Create base planned scenarios for all testable nodes in ProcessTree
    // Detta skapar testscenarios med origin: 'design' som saknar given/when/then.
    // Testscenarios ska istället genereras via testgenerering (origin: 'claude-direct'). 
    // if (!result.success) {
    //   console.warn('Could not save all planned scenarios:', result.error?.message);
    // } else if (result.count > 0) {
    //   queryClient.invalidateQueries({ queryKey: ['global-planned-scenarios'] });
    // }

    // Deduplicate mappings
    const uniqueMappings = new Map<string, typeof mappingsToInsert[0]>();
    for (const mapping of mappingsToInsert) {
      const key = `${mapping.bpmn_file}:${mapping.element_id}`;
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
        // Check if it's a foreign key constraint error (user_id doesn't exist)
        // This can happen after database reset when user session is invalid
        const isForeignKeyError = mappingsError.code === '23503' || 
          mappingsError.message?.includes('foreign key constraint') ||
          mappingsError.message?.includes('user_id');
        
        if (isForeignKeyError) {
          // Save element mappings error (user session invalid - mappings saved but version creation skipped)
          // Mappings are still saved, but version creation failed - this is ok
        } else {
          console.error('Save element mappings error:', mappingsError);
        }
      }
    }

    // Invalidate queries
    invalidateStructureQueries(queryClient);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
      queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
      queryClient.invalidateQueries({ queryKey: ['bpmn-files'] }),
      queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] }),
      queryClient.invalidateQueries({ queryKey: ['root-bpmn-file'] }),
    ]);

    return true;
  } catch (error) {
    console.error('Silent hierarchy build error:', error);
    return false;
  }
}

