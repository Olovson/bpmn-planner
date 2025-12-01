import type { ProcessGraph, ProcessGraphEdge } from '@/lib/bpmn/processGraph';
import type { GanttTask } from '@/lib/ganttDataConverter';

/**
 * DHTMLX Gantt link format
 * https://docs.dhtmlx.com/gantt/desktop__links.html
 */
export interface GanttLink {
  id: string;
  source: string | number; // Task ID
  target: string | number; // Task ID
  type: 0 | 1 | 2 | 3; // 0=finish_to_start, 1=start_to_start, 2=finish_to_finish, 3=start_to_finish
}

/**
 * Builds Gantt links from ProcessGraph edges.
 * Only creates links for sequence edges between timeline nodes (tasks that appear in Gantt).
 * 
 * @param graph - ProcessGraph containing nodes and edges
 * @param tasks - Gantt tasks (used to map ProcessGraph node IDs to Gantt task IDs)
 * @returns Array of Gantt links
 */
export function buildGanttLinksFromGraph(
  graph: ProcessGraph,
  tasks: GanttTask[]
): GanttLink[] {
  // Create a map from ProcessGraph node ID to Gantt task ID
  // ProcessGraph node IDs are in format: "type:bpmnFile:elementId"
  // Gantt task IDs are in format: node.id (which should match ProcessGraph node ID for timeline nodes)
  const nodeIdToTaskId = new Map<string, string>();
  tasks.forEach((task) => {
    if (task.bpmnFile && task.bpmnElementId) {
      // Try to match by bpmnFile:elementId
      const graphNodeId = `${task.bpmnFile}:${task.bpmnElementId}`;
      // Also try with type prefix (callActivity, userTask, etc.)
      const typePrefixes = ['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'];
      for (const typePrefix of typePrefixes) {
        const fullGraphNodeId = `${typePrefix}:${task.bpmnFile}:${task.bpmnElementId}`;
        nodeIdToTaskId.set(fullGraphNodeId, task.id);
      }
      // Direct match
      nodeIdToTaskId.set(graphNodeId, task.id);
    }
    // Also map by task.id directly (in case they match)
    nodeIdToTaskId.set(task.id, task.id);
  });

  const links: GanttLink[] = [];
  let linkIdCounter = 1;

  // Process all sequence edges
  for (const edge of graph.edges.values()) {
    if (edge.type !== 'sequence') {
      continue; // Only process sequence edges
    }

    // Find corresponding Gantt tasks
    const sourceTaskId = nodeIdToTaskId.get(edge.from);
    const targetTaskId = nodeIdToTaskId.get(edge.to);

    // Only create link if both tasks exist in Gantt
    if (sourceTaskId && targetTaskId && sourceTaskId !== targetTaskId) {
      links.push({
        id: `link_${linkIdCounter++}`,
        source: sourceTaskId,
        target: targetTaskId,
        type: 0, // finish_to_start (most common dependency type)
      });
    }
  }

  return links;
}

/**
 * Builds Gantt links from ProcessTree orderIndex.
 * Creates links between tasks based on their orderIndex (sequential dependencies).
 * This is a fallback when ProcessGraph is not available.
 * 
 * @param tasks - Gantt tasks sorted by orderIndex
 * @returns Array of Gantt links
 */
export function buildGanttLinksFromOrderIndex(tasks: GanttTask[]): GanttLink[] {
  const links: GanttLink[] = [];
  let linkIdCounter = 1;

  // Filter tasks that have orderIndex and are not root/project tasks
  const orderedTasks = tasks
    .filter((t) => t.orderIndex !== undefined && t.type !== 'project')
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // Create finish-to-start links between consecutive tasks
  for (let i = 0; i < orderedTasks.length - 1; i++) {
    const current = orderedTasks[i];
    const next = orderedTasks[i + 1];

    // Only create link if tasks are in the same branch (same branchId or both null)
    if (
      current.branchId === next.branchId &&
      current.id !== next.id
    ) {
      links.push({
        id: `link_${linkIdCounter++}`,
        source: current.id,
        target: next.id,
        type: 0, // finish_to_start
      });
    }
  }

  return links;
}

