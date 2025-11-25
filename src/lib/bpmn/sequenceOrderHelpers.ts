/**
 * Shared helpers for sequence-flow based ordering
 * 
 * These functions are used by multiple pipelines to ensure consistent
 * ordering logic across the application.
 */

import type { BpmnSequenceFlow, BpmnElement } from '@/lib/bpmnParser';

export interface OrderInfo {
  orderIndex: number;
  branchId: string;
  scenarioPath: string[];
}

/**
 * Calculates orderIndex, branchId, and scenarioPath from sequence flows
 * 
 * This is the core logic used by all ordering implementations.
 * It performs DFS traversal starting from nodes without incoming edges.
 */
export function calculateOrderFromSequenceFlows(
  sequenceFlows: BpmnSequenceFlow[],
  nodeIds: string[],
): Map<string, OrderInfo> {
  // Build adjacency graph
  const sequenceRelevant = new Set<string>();
  sequenceFlows.forEach((flow) => {
    sequenceRelevant.add(flow.sourceRef);
    sequenceRelevant.add(flow.targetRef);
  });

  const adjacency = new Map<string, string[]>();
  const incoming = new Map<string, number>();

  // Initialize adjacency for sequence-relevant nodes
  nodeIds.forEach((nodeId) => {
    if (!sequenceRelevant.has(nodeId)) {
      return;
    }
    adjacency.set(nodeId, []);
    incoming.set(nodeId, 0);
  });

  // Build adjacency from sequence flows
  for (const flow of sequenceFlows) {
    if (!adjacency.has(flow.sourceRef) || !adjacency.has(flow.targetRef)) {
      continue;
    }
    adjacency.get(flow.sourceRef)!.push(flow.targetRef);
    incoming.set(flow.targetRef, (incoming.get(flow.targetRef) ?? 0) + 1);
  }

  // Find start nodes (no incoming edges)
  const sequenceRelevantNodeIds = nodeIds.filter((id) => sequenceRelevant.has(id));
  const startNodes = sequenceRelevantNodeIds.filter(
    (id) => (incoming.get(id) ?? 0) === 0,
  );

  // If no start nodes found, return empty map (no orderIndex can be assigned)
  // This ensures we can debug the issue rather than silently falling back
  if (!startNodes.length) {
    return new Map<string, OrderInfo>();
  }

  const orderMap = new Map<string, OrderInfo>();
  const visited = new Set<string>();
  let globalOrder = 0;

  const dfs = (nodeId: string, branchId: string, scenarioPath: string[]) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    orderMap.set(nodeId, {
      orderIndex: globalOrder++,
      branchId,
      scenarioPath,
    });

    const successors = adjacency.get(nodeId) ?? [];
    if (!successors.length) return;

    if (successors.length === 1) {
      dfs(successors[0], branchId, scenarioPath);
    } else {
      const [first, ...rest] = successors;
      dfs(first, branchId, scenarioPath);

      rest.forEach((id, idx) => {
        const newBranchId = `${branchId}-branch-${idx + 1}`;
        const newScenarioPath = [...scenarioPath, newBranchId];
        dfs(id, newBranchId, newScenarioPath);
      });
    }
  };

  startNodes.forEach((nodeId, idx) => {
    const branchId = idx === 0 ? 'main' : `entry-${idx + 1}`;
    const path = [branchId];
    dfs(nodeId, branchId, path);
  });

  return orderMap;
}

/**
 * Calculates visualOrderIndex from DI coordinates (x, y)
 * 
 * Sorts nodes by x (ascending), then y (ascending), and assigns indices 0, 1, 2, ...
 */
export function calculateVisualOrderFromCoordinates(
  elements: BpmnElement[],
  nodeElementIds: string[],
): Map<string, number> {
  // Build elementId -> coordinates map
  const elementCoords = new Map<string, { x: number; y: number }>();
  for (const element of elements) {
    if (element.x !== undefined && element.y !== undefined) {
      elementCoords.set(element.id, { x: element.x, y: element.y });
    }
  }

  // Get nodes with coordinates
  const nodesWithCoords = nodeElementIds
    .map((elementId) => ({
      elementId,
      coords: elementCoords.get(elementId),
    }))
    .filter((item) => item.coords !== undefined);

  // Sort by x (ascending), then y (ascending)
  const sorted = [...nodesWithCoords].sort((a, b) => {
    const aCoords = a.coords!;
    const bCoords = b.coords!;
    if (aCoords.x !== bCoords.x) {
      return aCoords.x - bCoords.x;
    }
    return aCoords.y - bCoords.y;
  });

  // Assign visualOrderIndex
  const visualOrderMap = new Map<string, number>();
  sorted.forEach((item, index) => {
    visualOrderMap.set(item.elementId, index);
  });

  return visualOrderMap;
}

