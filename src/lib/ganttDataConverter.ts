import type { ProcessTreeNode } from '@/lib/processTree';

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
  orderIndex?: number;
  branchId?: string | null;
  bpmnFile?: string;
  bpmnElementId?: string;
}

/**
 * Extracts all callActivity nodes (subprocesses/feature goals) from a ProcessTree recursively
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
 * Sorts call activities by time order (orderIndex, then branchId, then label)
 */
export function sortCallActivities(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
  return [...nodes].sort((a, b) => {
    // Primary: orderIndex
    const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Secondary: branchId (main before branches)
    if (a.branchId !== b.branchId) {
      if (a.branchId === 'main') return -1;
      if (b.branchId === 'main') return 1;
      return (a.branchId || '').localeCompare(b.branchId || '');
    }
    
    // Tertiary: label (alphabetical)
    return a.label.localeCompare(b.label);
  });
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
      orderIndex: node.orderIndex,
      branchId: node.branchId,
      bpmnFile: node.bpmnFile,
      bpmnElementId: node.bpmnElementId,
    };
  });
}

/**
 * Main function: Extract, sort, and convert callActivities to Gantt tasks
 */
export function buildGanttTasksFromProcessTree(
  processTree: ProcessTreeNode | null,
  baseDate: Date = new Date('2026-01-01'),
  defaultDurationDays: number = 14
): GanttTask[] {
  if (!processTree) {
    return [];
  }

  const callActivities = extractCallActivities(processTree);
  const sorted = sortCallActivities(callActivities);
  return convertToGanttTasks(sorted, baseDate, defaultDurationDays);
}

