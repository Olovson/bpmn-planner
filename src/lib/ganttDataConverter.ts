import type { ProcessTreeNode } from '@/lib/processTree';
import {
  computeLeafCountsAndDurations,
  scheduleTree,
  type ScheduledNode,
} from '@/lib/timelineScheduling';

export type SortMode = 'root' | 'subprocess';

/**
 * DHTMLX Gantt task format
 */
export interface GanttTask {
  id: string;
  text: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration: number; // Days
  progress: number; // 0-1
  parent?: string | number;
  type?: 'task' | 'project';
  orderIndex?: number;
  branchId?: string | null;
  bpmnFile?: string;
  bpmnElementId?: string;
  jira_name?: string | null;
  jira_type?: 'feature goal' | 'epic' | null;
  meta?: GanttTaskMeta;
}

export interface GanttTaskMeta {
  kind: ProcessTreeNode['type'] | 'process';
  bpmnFile?: string;
  bpmnElementId?: string;
  processId?: string;
  orderIndex: number | null;
  visualOrderIndex: number | null;
  branchId: string | null;
  scenarioPath: string[];
  subprocessFile?: string | null;
  matchedProcessId?: string | null;
  isReusedSubprocess?: boolean;
}

/**
 * Extracts all callActivity nodes (subprocesses/feature goals) from a ProcessTree recursively
 * @deprecated Hierarchical gantt build now uses the tree directly. Kept for backwards compatibility.
 */
export function extractCallActivities(node: ProcessTreeNode): ProcessTreeNode[] {
  const result: ProcessTreeNode[] = [];
  
  if (node.type === 'callActivity') {
    result.push(node);
  }
  
  // Recursively extract from children
  node.children.forEach(child => {
    result.push(...extractCallActivities(child));
  });
  
  return result;
}

/**
 * Sorts call activities by visual order (visualOrderIndex is primary, then orderIndex, then branchId, then label)
 * Visual order is the primary sorting method based on DI coordinates from the BPMN diagram
 */
export function sortCallActivities(
  nodes: ProcessTreeNode[],
  mode: SortMode = 'root',
): ProcessTreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
    const bVisual = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aVisual !== bVisual) {
      return aVisual - bVisual;
    }

    const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Tertiary (root mode only): branchId (main before branches)
    if (mode === 'root' && a.branchId !== b.branchId) {
      if (a.branchId === 'main') return -1;
      if (b.branchId === 'main') return 1;
      return (a.branchId || '').localeCompare(b.branchId || '');
    }
    
    // Final fallback: label (alphabetical)
    return a.label.localeCompare(b.label);
  });
  
  // Debug logging for sorting (development only)
  if (import.meta.env.DEV && nodes.length > 0 && nodes[0].bpmnFile === 'mortgage.bpmn') {
    console.log('[Timeline Sorting Debug] mortgage.bpmn callActivities sorted order:');
    sorted.forEach((node, index) => {
      console.log(`  ${index}: ${node.label} - orderIndex:${node.orderIndex ?? 'N/A'}, visualOrderIndex:${node.visualOrderIndex ?? 'N/A'}, branchId:${node.branchId ?? 'N/A'}`);
    });
  }
  
  return sorted;
}

/**
 * Formats a Date to YYYY-MM-DD format for DHTMLX Gantt
 */
export function formatDateForGantt(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts ProcessTreeNode callActivities to DHTMLX Gantt tasks
 * @deprecated Use buildGanttTasksFromProcessTree for hierarchical timelines.
 * 
 * @param callActivities - Array of callActivity nodes (already sorted)
 * @param baseDate - Base date for all tasks (default: 2026-01-01)
 * @param defaultDurationDays - Default duration in days (default: 14 = 2 weeks)
 * @returns Array of GanttTask objects
 */
export function convertToGanttTasks(
  callActivities: ProcessTreeNode[],
  baseDate: Date = new Date('2026-01-01'),
  defaultDurationDays: number = 14
): GanttTask[] {
  return callActivities.map((node) => {
    // All tasks start at base date initially
    // (User can edit dates later)
    const startDate = new Date(baseDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + defaultDurationDays);

    return {
      id: node.id,
      text: node.label,
      start_date: formatDateForGantt(startDate),
      end_date: formatDateForGantt(endDate),
      duration: defaultDurationDays,
      progress: 0,
      type: 'task',
      orderIndex: node.orderIndex,
      branchId: node.branchId,
      bpmnFile: node.bpmnFile,
      bpmnElementId: node.bpmnElementId,
      meta: {
        kind: node.type,
        bpmnFile: node.bpmnFile,
        bpmnElementId: node.bpmnElementId,
        processId: node.processId,
        orderIndex: node.orderIndex ?? null,
        visualOrderIndex: node.visualOrderIndex ?? null,
        branchId: node.branchId ?? null,
        scenarioPath: node.scenarioPath ?? [],
      },
    };
  });
}

/**
 * Main function: Extract, sort, and convert callActivities to Gantt tasks
 */
/**
 * Builds Gantt tasks from ProcessTree using the new hierarchical scheduling algorithm.
 * 
 * New algorithm:
 * - Each leaf node (timeline node with no timeline node children) gets 2 weeks duration
 * - Each non-leaf node gets duration = 2 weeks × number of leaf nodes in its subtree
 * - Leaf nodes are scheduled sequentially (each starts when previous ends)
 * - Non-leaf nodes get startDate = min of children's startDates, endDate = max of children's endDates
 * 
 * This is the recommended function to use for timeline scheduling.
 */
export function buildGanttTasksFromProcessTree(
  processTree: ProcessTreeNode | null,
  baseDate: Date = new Date('2026-01-01'),
  defaultDurationDays: number = 14
): GanttTask[] {
  if (!processTree) {
    return [];
  }

  // Use new hierarchical scheduling algorithm
  return buildGanttTasksWithHierarchicalScheduling(processTree, baseDate);
}

/**
 * Legacy function: Builds Gantt tasks using the old sequential row-based algorithm.
 * Kept for backward compatibility and testing.
 * 
 * @deprecated Use buildGanttTasksFromProcessTree instead, which uses hierarchical scheduling.
 */
export function buildGanttTasksFromProcessTreeLegacy(
  processTree: ProcessTreeNode | null,
  baseDate: Date = new Date('2026-01-01'),
  defaultDurationDays: number = 14
): GanttTask[] {
  if (!processTree) {
    return [];
  }

  const tasks: GanttTask[] = [];
  const rootTaskId = `process:${processTree.bpmnFile}:${processTree.processId ?? processTree.bpmnElementId ?? processTree.id}`;
  const rootDates = calculateTaskDates(baseDate, 0, defaultDurationDays);

  tasks.push({
    id: rootTaskId,
    text: processTree.label,
    start_date: rootDates.start,
    end_date: rootDates.end,
    duration: defaultDurationDays,
    progress: 0,
    type: 'project',
    parent: '0',
    orderIndex: processTree.orderIndex,
    branchId: processTree.branchId ?? null,
    bpmnFile: processTree.bpmnFile,
    bpmnElementId: processTree.bpmnElementId,
    meta: {
      kind: 'process',
      bpmnFile: processTree.bpmnFile,
      bpmnElementId: processTree.bpmnElementId,
      processId: processTree.processId ?? processTree.bpmnElementId ?? processTree.id,
      orderIndex: processTree.orderIndex ?? null,
      visualOrderIndex: processTree.visualOrderIndex ?? null,
      branchId: processTree.branchId ?? null,
      scenarioPath: processTree.scenarioPath ?? [],
    },
  });

  const subprocessUsage = buildSubprocessUsageIndex(processTree);
  // Use a global counter to ensure each row gets 2 weeks offset
  let globalRowIndex = 0;
  addRootCallActivities(
    processTree,
    rootTaskId,
    tasks,
    baseDate,
    defaultDurationDays,
    subprocessUsage,
    () => globalRowIndex++,
  );

  return tasks;
}

/**
 * New hierarchical scheduling implementation.
 * Uses leaf-count based duration calculation and sequential leaf scheduling.
 */
function buildGanttTasksWithHierarchicalScheduling(
  processTree: ProcessTreeNode,
  projectStartDate: Date,
): GanttTask[] {
  // Step 1: Compute leafCount and durationDays for all nodes
  const scheduledTree = computeLeafCountsAndDurations(processTree);

  // Step 2: Schedule all nodes (assign startDate and endDate)
  const scheduled = scheduleTree(scheduledTree, projectStartDate);

  // Step 3: Convert scheduled tree to Gantt tasks
  const tasks: GanttTask[] = [];
  const rootTaskId = `process:${scheduled.bpmnFile}:${scheduled.processId ?? scheduled.bpmnElementId ?? scheduled.id}`;

  // Add root process node
  if (scheduled.startDate && scheduled.endDate) {
    tasks.push({
      id: rootTaskId,
      text: scheduled.label,
      start_date: formatDateForGantt(scheduled.startDate),
      end_date: formatDateForGantt(scheduled.endDate),
      duration: scheduled.durationDays ?? 14,
      progress: 0,
      type: 'project',
      parent: '0',
      orderIndex: scheduled.orderIndex,
      branchId: scheduled.branchId ?? null,
      bpmnFile: scheduled.bpmnFile,
      bpmnElementId: scheduled.bpmnElementId,
      meta: {
        kind: 'process',
        bpmnFile: scheduled.bpmnFile,
        bpmnElementId: scheduled.bpmnElementId,
        processId: scheduled.processId ?? scheduled.bpmnElementId ?? scheduled.id,
        orderIndex: scheduled.orderIndex ?? null,
        visualOrderIndex: scheduled.visualOrderIndex ?? null,
        branchId: scheduled.branchId ?? null,
        scenarioPath: scheduled.scenarioPath ?? [],
      },
    });
  }

  // Recursively add all timeline nodes
  const addScheduledNodes = (
    node: ScheduledNode,
    parentTaskId: string,
    usageIndex: Map<string, number>,
  ) => {
    // Only process timeline nodes (skip process root itself)
    if (node.type !== 'process' && isTimelineNode(node)) {
      if (node.startDate && node.endDate) {
        const subprocessFile = resolveSubprocessFile(node);
        const isCallActivity = node.type === 'callActivity';

        tasks.push({
          id: node.id,
          text: node.label,
          start_date: formatDateForGantt(node.startDate),
          end_date: formatDateForGantt(node.endDate),
          duration: node.durationDays ?? 14,
          progress: 0,
          type: isCallActivity ? 'project' : 'task',
          parent: parentTaskId,
          orderIndex: node.orderIndex,
          branchId: node.branchId ?? null,
          bpmnFile: node.bpmnFile,
          bpmnElementId: node.bpmnElementId,
          meta: {
            kind: node.type,
            bpmnFile: node.bpmnFile,
            bpmnElementId: node.bpmnElementId,
            processId: node.processId,
            orderIndex: node.orderIndex ?? null,
            visualOrderIndex: node.visualOrderIndex ?? null,
            branchId: node.branchId ?? null,
            scenarioPath: node.scenarioPath ?? [],
            subprocessFile,
            matchedProcessId: node.subprocessLink?.matchedProcessId ?? null,
            isReusedSubprocess:
              isCallActivity &&
              !!subprocessFile &&
              (usageIndex.get(subprocessFile) ?? 0) > 1,
          },
        });

        // Recursively process children
        const childParentId = isCallActivity ? node.id : parentTaskId;
        for (const child of node.children) {
          addScheduledNodes(child as ScheduledNode, childParentId, usageIndex);
        }
      }
    } else {
      // For process nodes, process all children
      for (const child of node.children) {
        addScheduledNodes(child as ScheduledNode, parentTaskId, usageIndex);
      }
    }
  };

  const subprocessUsage = buildSubprocessUsageIndex(processTree);
  addScheduledNodes(scheduled, rootTaskId, subprocessUsage);

  return tasks;
}

function addRootCallActivities(
  root: ProcessTreeNode,
  parentTaskId: string,
  tasks: GanttTask[],
  baseDate: Date,
  defaultDurationDays: number,
  usageIndex: Map<string, number>,
  getNextRowIndex: () => number,
) {
  // Include all timeline-relevant nodes from root process (callActivities, userTasks, serviceTasks, etc.)
  const rootNodes = root.children.filter(
    (node) => isTimelineNode(node) && node.bpmnFile === root.bpmnFile,
  );

  const sorted = sortCallActivities(rootNodes, 'root');

  sorted.forEach((node) => {
    const rowIndex = getNextRowIndex();
    const dates = calculateTaskDates(baseDate, rowIndex, defaultDurationDays);
    const subprocessFile = resolveSubprocessFile(node);
    const taskId = node.id;
    const isCallActivity = node.type === 'callActivity';

    tasks.push({
      id: taskId,
      text: node.label,
      start_date: dates.start,
      end_date: dates.end,
      duration: defaultDurationDays,
      progress: 0,
      type: isCallActivity ? 'project' : 'task',
      parent: parentTaskId,
      orderIndex: node.orderIndex,
      branchId: node.branchId ?? null,
      bpmnFile: node.bpmnFile,
      bpmnElementId: node.bpmnElementId,
      meta: {
        kind: node.type,
        bpmnFile: node.bpmnFile,
        bpmnElementId: node.bpmnElementId,
        processId: node.processId,
        orderIndex: node.orderIndex ?? null,
        visualOrderIndex: node.visualOrderIndex ?? null,
        branchId: node.branchId ?? null,
        scenarioPath: node.scenarioPath ?? [],
        subprocessFile,
        matchedProcessId: node.subprocessLink?.matchedProcessId ?? null,
        isReusedSubprocess:
          isCallActivity &&
          !!subprocessFile &&
          (usageIndex.get(subprocessFile) ?? 0) > 1,
      },
    });

    // Only add subprocess children for callActivities
    if (isCallActivity && node.children?.length) {
      addSubprocessChildren(
        node,
        taskId,
        tasks,
        baseDate,
        defaultDurationDays,
        usageIndex,
        getNextRowIndex,
      );
    }
  });
}

function addSubprocessChildren(
  parentNode: ProcessTreeNode,
  parentTaskId: string,
  tasks: GanttTask[],
  baseDate: Date,
  defaultDurationDays: number,
  usageIndex: Map<string, number>,
  getNextRowIndex: () => number,
) {
  const childNodes = parentNode.children.filter(isTimelineNode);
  if (!childNodes.length) {
    return;
  }

  const sorted = sortCallActivities(childNodes, 'subprocess');

  sorted.forEach((node) => {
    const rowIndex = getNextRowIndex();
    const dates = calculateTaskDates(baseDate, rowIndex, defaultDurationDays);
    const subprocessFile = resolveSubprocessFile(node);
    const isCallActivity = node.type === 'callActivity';
    const taskId = node.id;

    tasks.push({
      id: taskId,
      text: node.label,
      start_date: dates.start,
      end_date: dates.end,
      duration: defaultDurationDays,
      progress: 0,
      type: isCallActivity ? 'project' : 'task',
      parent: parentTaskId,
      orderIndex: node.orderIndex,
      branchId: node.branchId ?? null,
      bpmnFile: node.bpmnFile,
      bpmnElementId: node.bpmnElementId,
      meta: {
        kind: node.type,
        bpmnFile: node.bpmnFile,
        bpmnElementId: node.bpmnElementId,
        processId: node.processId,
        orderIndex: node.orderIndex ?? null,
        visualOrderIndex: node.visualOrderIndex ?? null,
        branchId: node.branchId ?? null,
        scenarioPath: node.scenarioPath ?? [],
        subprocessFile,
        matchedProcessId: node.subprocessLink?.matchedProcessId ?? null,
        isReusedSubprocess:
          isCallActivity &&
          !!subprocessFile &&
          (usageIndex.get(subprocessFile) ?? 0) > 1,
      },
    });

    if (node.children?.length) {
      addSubprocessChildren(
        node,
        taskId,
        tasks,
        baseDate,
        defaultDurationDays,
        usageIndex,
        getNextRowIndex,
      );
    }
  });
}

function isTimelineNode(node: ProcessTreeNode): boolean {
  return (
    node.type === 'callActivity' ||
    node.type === 'userTask' ||
    node.type === 'serviceTask' ||
    node.type === 'businessRuleTask' ||
    node.type === 'dmnDecision'
  );
}

function buildSubprocessUsageIndex(root: ProcessTreeNode): Map<string, number> {
  const counts = new Map<string, number>();

  const visit = (node: ProcessTreeNode) => {
    const subprocessFile = resolveSubprocessFile(node);
    if (node.type === 'callActivity' && subprocessFile) {
      counts.set(subprocessFile, (counts.get(subprocessFile) ?? 0) + 1);
    }
    node.children.forEach(visit);
  };

  visit(root);
  return counts;
}

function resolveSubprocessFile(node: ProcessTreeNode): string | null {
  return (
    node.subprocessFile ??
    node.subprocessLink?.matchedFileName ??
    null
  );
}

function calculateTaskDates(
  baseDate: Date,
  positionIndex: number,
  defaultDurationDays: number,
): { start: string; end: string } {
  const start = offsetDate(baseDate, positionIndex * defaultDurationDays);
  const end = offsetDate(start, defaultDurationDays);
  return {
    start: formatDateForGantt(start),
    end: formatDateForGantt(end),
  };
}

function offsetDate(baseDate: Date, daysOffset: number): Date {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + daysOffset);
  return date;
}

