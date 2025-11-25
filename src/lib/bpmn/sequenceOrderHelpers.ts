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
 * 
 * @param sequenceFlows - Sequence flows from BPMN (using element IDs)
 * @param nodeIds - ProcessGraphNode IDs (format: "type:fileName:elementId")
 * @param elementIdToNodeIdMap - Optional mapping from element ID to ProcessGraphNode ID
 *                                When provided, includes intermediate events/gateways in graph
 *                                and propagates orderIndex to call activities
 */
export function calculateOrderFromSequenceFlows(
  sequenceFlows: BpmnSequenceFlow[],
  nodeIds: string[],
  elementIdToNodeIdMap?: Map<string, string>,
): Map<string, OrderInfo> {
  const adjacency = new Map<string, string[]>();
  const incoming = new Map<string, number>();

  // Step 1: Collect all element IDs mentioned in sequence flows
  const allSequenceElementIds = new Set<string>();
  sequenceFlows.forEach((flow) => {
    allSequenceElementIds.add(flow.sourceRef);
    allSequenceElementIds.add(flow.targetRef);
  });

  // Step 2: Build set of call activity element IDs (from nodeIds via mapping)
  const callActivityElementIds = new Set<string>();
  if (elementIdToNodeIdMap) {
    nodeIds.forEach((nodeId) => {
      const elementId = Array.from(elementIdToNodeIdMap.entries())
        .find(([_, nId]) => nId === nodeId)?.[0];
      if (elementId) {
        callActivityElementIds.add(elementId);
      }
    });
  } else {
    // If no mapping, assume nodeIds are element IDs
    nodeIds.forEach((nodeId) => {
      if (allSequenceElementIds.has(nodeId)) {
        callActivityElementIds.add(nodeId);
      }
    });
  }

  // Step 3: Include all element IDs that are on paths between call activities
  // This includes intermediate events/gateways that connect call activities
  // Use BFS to find all elements reachable from/to call activities
  const relevantElementIds = new Set<string>(callActivityElementIds);
  const forwardQueue = Array.from(callActivityElementIds);
  const forwardVisited = new Set<string>(callActivityElementIds);
  
  // Forward BFS: find all elements reachable from call activities
  while (forwardQueue.length > 0) {
    const current = forwardQueue.shift()!;
    
    sequenceFlows.forEach((flow) => {
      if (flow.sourceRef === current && !forwardVisited.has(flow.targetRef)) {
        forwardVisited.add(flow.targetRef);
        relevantElementIds.add(flow.targetRef);
        forwardQueue.push(flow.targetRef);
      }
    });
  }
  
  // Backward BFS: find all elements that can reach call activities
  const backwardQueue = Array.from(callActivityElementIds);
  const backwardVisited = new Set<string>(callActivityElementIds);
  
  while (backwardQueue.length > 0) {
    const current = backwardQueue.shift()!;
    
    sequenceFlows.forEach((flow) => {
      if (flow.targetRef === current && !backwardVisited.has(flow.sourceRef)) {
        backwardVisited.add(flow.sourceRef);
        relevantElementIds.add(flow.sourceRef);
        backwardQueue.push(flow.sourceRef);
      }
    });
  }

  // Include relevant element IDs in graph
  relevantElementIds.forEach((elementId) => {
    if (!adjacency.has(elementId)) {
      adjacency.set(elementId, []);
      incoming.set(elementId, 0);
    }
  });

  // Step 4: Also include ProcessGraphNode IDs (for direct connection)
  // If elementIdToNodeIdMap is provided, we've already included element IDs
  // Otherwise, include nodeIds that are in sequence flows
  nodeIds.forEach((nodeId) => {
    // If elementIdToNodeIdMap is provided, element IDs are already included
    if (elementIdToNodeIdMap) {
      const elementId = Array.from(elementIdToNodeIdMap.entries())
        .find(([_, nId]) => nId === nodeId)?.[0];
      
      if (elementId && relevantElementIds.has(elementId)) {
        // Element ID already included, skip
        return;
      }
    } else {
      // If no mapping, check if nodeId is already included
      if (relevantElementIds.has(nodeId)) {
        return;
      }
    }
    
    // If nodeId is not in sequence flows, skip
    if (!allSequenceElementIds.has(nodeId)) {
      return;
    }
    
    // Include nodeId in graph
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
  // Start nodes can be either element IDs or ProcessGraphNode IDs
  // Prioritize call activities as start nodes
  const allNodeIds = new Set<string>([...relevantElementIds, ...nodeIds]);
  const startNodes = Array.from(allNodeIds).filter(
    (id) => (incoming.get(id) ?? 0) === 0,
  );
  
  // Sort start nodes to prioritize call activities
  // (call activities should come before intermediate events/gateways)
  startNodes.sort((a, b) => {
    const aIsCallActivity = elementIdToNodeIdMap
      ? callActivityElementIds.has(
          Array.from(elementIdToNodeIdMap.entries()).find(([_, nId]) => nId === a)?.[0] ?? a,
        )
      : callActivityElementIds.has(a);
    const bIsCallActivity = elementIdToNodeIdMap
      ? callActivityElementIds.has(
          Array.from(elementIdToNodeIdMap.entries()).find(([_, nId]) => nId === b)?.[0] ?? b,
        )
      : callActivityElementIds.has(b);
    
    if (aIsCallActivity && !bIsCallActivity) return -1;
    if (!aIsCallActivity && bIsCallActivity) return 1;
    return 0;
  });

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

  // Step 4: Propagate orderIndex from intermediate events to call activities
  // This is needed because intermediate events get orderIndex, but call activities
  // that come after them need to inherit that orderIndex
  if (elementIdToNodeIdMap) {
    // For each ProcessGraphNode ID that doesn't have orderIndex yet
    nodeIds.forEach((nodeId) => {
      if (orderMap.has(nodeId)) {
        // Already has orderIndex, skip
        return;
      }
      
      // Find corresponding element ID
      const elementId = Array.from(elementIdToNodeIdMap.entries())
        .find(([_, nId]) => nId === nodeId)?.[0];
      
      if (!elementId) return;
      
      // If element ID has orderIndex (from intermediate event), use it
      if (orderMap.has(elementId)) {
        const elementOrderInfo = orderMap.get(elementId)!;
        orderMap.set(nodeId, elementOrderInfo);
        return;
      }
      
      // Otherwise, find incoming sequence flows to this element
      const incomingFlows = sequenceFlows.filter((f) => f.targetRef === elementId);
      for (const flow of incomingFlows) {
        const sourceOrderInfo = orderMap.get(flow.sourceRef);
        if (sourceOrderInfo) {
          // Propagate orderIndex with small offset to maintain order
          orderMap.set(nodeId, {
            orderIndex: sourceOrderInfo.orderIndex + 0.1,
            branchId: sourceOrderInfo.branchId,
            scenarioPath: sourceOrderInfo.scenarioPath,
          });
          break;
        }
      }
    });
  }

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

