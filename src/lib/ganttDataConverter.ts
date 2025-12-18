import type { ProcessTreeNode } from '@/lib/processTree';
import {
  computeLeafCountsAndDurations,
  scheduleTree,
  type ScheduledNode,
} from '@/lib/timelineScheduling';
import type { CustomActivity } from '@/types/globalProjectConfig';

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
  isCustomActivity?: boolean;
  customActivityId?: string;
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
 * Main function: Extract, sort, and convert callActivities to Gantt tasks
 */
/**
 * Builds Gantt tasks from ProcessTree using the new hierarchical scheduling algorithm.
 * 
 * New algorithm:
 * - Each leaf node (timeline node with no timeline node children) gets duration from durationCalculator
 * - Each non-leaf node gets duration = sum of children's durations
 * - Leaf nodes are scheduled sequentially (each starts when previous ends)
 * - Non-leaf nodes get startDate = min of children's startDates, endDate = max of children's endDates
 * - Custom activities are inserted before or after BPMN activities based on placement
 * 
 * @param processTree - The process tree to build tasks from
 * @param baseDate - Start date for the project
 * @param durationCalculator - Optional function to calculate duration for each node (defaults to 14 days)
 * @param customActivities - Optional array of custom project activities to include in timeline
 * @returns Array of Gantt tasks
 */
export function buildGanttTasksFromProcessTree(
  processTree: ProcessTreeNode | null,
  baseDate: Date = new Date('2026-01-01'),
  durationCalculator?: (node: ProcessTreeNode) => number,
  customActivities: CustomActivity[] = []
): GanttTask[] {
  if (!processTree) {
    return [];
  }

  // Use new hierarchical scheduling algorithm
  return buildGanttTasksWithHierarchicalScheduling(processTree, baseDate, durationCalculator, customActivities);
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
 * Calculate duration in days for a custom activity
 */
function calculateCustomActivityDuration(activity: CustomActivity): number {
  const totalWeeks =
    (activity.analysisWeeks ?? 0) +
    (activity.implementationWeeks ?? 0) +
    (activity.testingWeeks ?? 0) +
    (activity.validationWeeks ?? 0);
  
  // If no work items specified, use legacy weeks field
  if (totalWeeks === 0 && activity.weeks > 0) {
    return activity.weeks * 7;
  }
  
  return totalWeeks * 7; // Convert weeks to days
}

/**
 * New hierarchical scheduling implementation.
 * Uses duration calculator for leaf nodes and sequential leaf scheduling.
 * Includes custom activities placed before or after BPMN activities.
 */
function buildGanttTasksWithHierarchicalScheduling(
  processTree: ProcessTreeNode,
  projectStartDate: Date,
  durationCalculator?: (node: ProcessTreeNode) => number,
  customActivities: CustomActivity[] = [],
): GanttTask[] {
  // Step 1: Compute leafCount and durationDays for all nodes
  const scheduledTree = computeLeafCountsAndDurations(processTree, durationCalculator);

  // Step 2: Separate custom activities by placement
  const beforeActivities = customActivities
    .filter((a) => a.placement === 'before-all')
    .sort((a, b) => a.order - b.order);
  
  const afterActivities = customActivities
    .filter((a) => a.placement === 'after-all')
    .sort((a, b) => a.order - b.order);

  // Step 3: Calculate total duration for before-activities
  const beforeActivitiesDuration = beforeActivities.reduce(
    (sum, activity) => sum + calculateCustomActivityDuration(activity),
    0
  );

  // Step 4: Schedule BPMN activities starting after before-activities
  const bpmnStartDate = new Date(projectStartDate);
  bpmnStartDate.setDate(bpmnStartDate.getDate() + beforeActivitiesDuration);
  const scheduled = scheduleTree(scheduledTree, bpmnStartDate);

  // Step 5: Calculate when after-activities should start (after all BPMN activities)
  const bpmnEndDate = scheduled.endDate || bpmnStartDate;
  const afterActivitiesStartDate = new Date(bpmnEndDate);

  // Step 6: Convert scheduled tree to Gantt tasks
  const tasks: GanttTask[] = [];
  const rootTaskId = `process:${scheduled.bpmnFile}:${scheduled.processId ?? scheduled.bpmnElementId ?? scheduled.id}`;

  // Step 7: Add before-activities
  let currentDate = new Date(projectStartDate);
  for (const activity of beforeActivities) {
    const durationDays = calculateCustomActivityDuration(activity);
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + durationDays);

    tasks.push({
      id: `custom-activity-${activity.id}`,
      text: activity.name,
      start_date: formatDateForGantt(startDate),
      end_date: formatDateForGantt(endDate),
      duration: durationDays,
      progress: 0,
      type: 'task',
      parent: rootTaskId,
      meta: {
        kind: 'process',
        isCustomActivity: true,
        customActivityId: activity.id,
      },
    });

    currentDate = new Date(endDate);
  }

  // Step 8: Add root process node (adjusted to include before-activities)
  if (scheduled.startDate && scheduled.endDate) {
    // Root should start from project start (to include before-activities)
    const rootStartDate = new Date(projectStartDate);
    // Root should end at the latest of: BPMN end or after-activities end
    const afterActivitiesEndDate = new Date(afterActivitiesStartDate);
    for (const activity of afterActivities) {
      afterActivitiesEndDate.setDate(
        afterActivitiesEndDate.getDate() + calculateCustomActivityDuration(activity)
      );
    }
    const rootEndDate = new Date(
      Math.max(scheduled.endDate.getTime(), afterActivitiesEndDate.getTime())
    );

    tasks.push({
      id: rootTaskId,
      text: scheduled.label,
      start_date: formatDateForGantt(rootStartDate),
      end_date: formatDateForGantt(rootEndDate),
      duration: Math.ceil((rootEndDate.getTime() - rootStartDate.getTime()) / (1000 * 60 * 60 * 24)),
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
  let addedNodesCount = 0;
  let skippedNodesCount = 0;
  const skippedNodes: Array<{ label: string; id: string; reason: string }> = [];
  
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
        
        addedNodesCount++;

        // Recursively process children
        const childParentId = isCallActivity ? node.id : parentTaskId;
        for (const child of node.children) {
          addScheduledNodes(child as ScheduledNode, childParentId, usageIndex);
        }
      } else {
        // Debug: Log nodes missing dates
        skippedNodesCount++;
        skippedNodes.push({
          label: node.label,
          id: node.id,
          reason: 'missing startDate or endDate',
        });
        if (import.meta.env.DEV) {
          console.warn(
            `[ganttDataConverter] Node "${node.label}" (${node.id}) missing startDate or endDate.`,
            { startDate: node.startDate, endDate: node.endDate, type: node.type, leafCount: node.leafCount, durationDays: node.durationDays }
          );
        }
        // Still process children even if this node is missing dates
        const childParentId = node.type === 'callActivity' ? node.id : parentTaskId;
        for (const child of node.children) {
          addScheduledNodes(child as ScheduledNode, childParentId, usageIndex);
        }
      }
    } else {
      // For process nodes or non-timeline nodes, process all children
      if (node.type === 'process') {
        // Process nodes are skipped but children are processed
      } else if (!isTimelineNode(node)) {
        skippedNodesCount++;
        skippedNodes.push({
          label: node.label,
          id: node.id,
          reason: 'not a timeline node',
        });
      }
      for (const child of node.children) {
        addScheduledNodes(child as ScheduledNode, parentTaskId, usageIndex);
      }
    }
  };

  const subprocessUsage = buildSubprocessUsageIndex(processTree);
  addScheduledNodes(scheduled, rootTaskId, subprocessUsage);

  // Debug: Log summary of added vs skipped nodes
  if (import.meta.env.DEV) {
    console.log(
      `[ganttDataConverter] Node conversion summary:`,
      {
        addedNodes: addedNodesCount,
        skippedNodes: skippedNodesCount,
        totalTasks: tasks.length,
        skippedNodesList: skippedNodes.slice(0, 20), // First 20 skipped nodes
      }
    );
  }

  // Step 9: Add after-activities
  let afterCurrentDate = new Date(afterActivitiesStartDate);
  for (const activity of afterActivities) {
    const durationDays = calculateCustomActivityDuration(activity);
    const startDate = new Date(afterCurrentDate);
    const endDate = new Date(afterCurrentDate);
    endDate.setDate(endDate.getDate() + durationDays);

    tasks.push({
      id: `custom-activity-${activity.id}`,
      text: activity.name,
      start_date: formatDateForGantt(startDate),
      end_date: formatDateForGantt(endDate),
      duration: durationDays,
      progress: 0,
      type: 'task',
      parent: rootTaskId,
      meta: {
        kind: 'process',
        isCustomActivity: true,
        customActivityId: activity.id,
      },
    });

    afterCurrentDate = new Date(endDate);
  }

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

