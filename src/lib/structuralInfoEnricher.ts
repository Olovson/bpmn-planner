/**
 * Berikar NodeDocumentationContext med strukturell BPMN-information
 * (gateway-conditions, ProcessPath-information, flödesinformation, end events)
 */

import type { NodeDocumentationContext } from './documentationContext';
import type { ProcessPath, GatewayCondition } from './bpmnFlowExtractor';
import type { FlowGraph } from './bpmnFlowExtractor';
import { findEndEvents } from './bpmnFlowExtractor';

export interface StructuralInfo {
  gatewayConditions: GatewayCondition[];
  processPaths: ProcessPath[];
  flowContext: {
    previousFeatureGoals: string[];
    nextFeatureGoals: string[];
  };
  endEvents: Array<{
    id: string;
    type: string;
    name: string;
    gatewayConditions: GatewayCondition[];
  }>;
}

/**
 * Berikar NodeDocumentationContext med strukturell information från BPMN-processer
 */
export function enrichNodeContextWithStructuralInfo(
  nodeContext: NodeDocumentationContext,
  paths: ProcessPath[],
  flowGraph?: FlowGraph
): NodeDocumentationContext & { structuralInfo?: StructuralInfo } {
  const featureGoalId = nodeContext.node.bpmnElementId;
  
  if (!featureGoalId) {
    // Ingen Feature Goal ID - returnera utan strukturell information
    return nodeContext;
  }

  // 1. Hitta paths som går genom Feature Goal
  const pathsThroughFeatureGoal = paths.filter(p => 
    p.featureGoals.includes(featureGoalId)
  );

  if (pathsThroughFeatureGoal.length === 0) {
    // Ingen path hittades - returnera utan strukturell information
    return nodeContext;
  }

  // 2. Hitta gateway-conditions FÖRE Feature Goal
  const gatewayConditions = extractGatewayConditionsForFeatureGoal(
    pathsThroughFeatureGoal,
    featureGoalId
  );

  // 3. Hitta Feature Goals FÖRE/EFTER
  const flowContext = extractFlowContext(
    pathsThroughFeatureGoal,
    featureGoalId
  );

  // 4. Hitta end events som Feature Goal kan leda till
  const endEvents = extractEndEventsForFeatureGoal(
    pathsThroughFeatureGoal,
    featureGoalId,
    flowGraph
  );

  return {
    ...nodeContext,
    structuralInfo: {
      gatewayConditions,
      processPaths: pathsThroughFeatureGoal,
      flowContext,
      endEvents,
    },
  };
}

/**
 * Extraherar gateway-conditions som gäller FÖRE en Feature Goal
 */
function extractGatewayConditionsForFeatureGoal(
  paths: ProcessPath[],
  featureGoalId: string
): GatewayCondition[] {
  const conditions: GatewayCondition[] = [];
  const seen = new Set<string>();

  for (const path of paths) {
    // Hitta positionen av Feature Goal i pathen
    const featureGoalIndex = path.featureGoals.indexOf(featureGoalId);
    if (featureGoalIndex === -1) continue;

    // Hitta gateway-conditions FÖRE denna Feature Goal
    for (const condition of path.gatewayConditions) {
      // Kontrollera om gateway är FÖRE Feature Goal i pathen
      const gatewayIndex = path.nodeIds.indexOf(condition.gatewayId);
      const currentFeatureGoalIndex = path.nodeIds.indexOf(featureGoalId);
      
      if (
        gatewayIndex !== -1 &&
        currentFeatureGoalIndex !== -1 &&
        gatewayIndex < currentFeatureGoalIndex
      ) {
        // Gateway är FÖRE Feature Goal - condition gäller
        const key = `${condition.gatewayId}::${condition.flowId}`;
        if (!seen.has(key)) {
          seen.add(key);
          conditions.push(condition);
        }
      }
    }
  }

  return conditions;
}

/**
 * Extraherar flödeskontext (Feature Goals FÖRE/EFTER)
 */
function extractFlowContext(
  paths: ProcessPath[],
  featureGoalId: string
): { previousFeatureGoals: string[]; nextFeatureGoals: string[] } {
  const previousFeatureGoals = new Set<string>();
  const nextFeatureGoals = new Set<string>();

  for (const path of paths) {
    const featureGoalIndex = path.featureGoals.indexOf(featureGoalId);
    if (featureGoalIndex === -1) continue;

    // Feature Goals FÖRE
    for (let i = 0; i < featureGoalIndex; i++) {
      previousFeatureGoals.add(path.featureGoals[i]);
    }

    // Feature Goals EFTER
    for (let i = featureGoalIndex + 1; i < path.featureGoals.length; i++) {
      nextFeatureGoals.add(path.featureGoals[i]);
    }
  }

  return {
    previousFeatureGoals: Array.from(previousFeatureGoals),
    nextFeatureGoals: Array.from(nextFeatureGoals),
  };
}

/**
 * Extraherar end events som Feature Goal kan leda till
 */
function extractEndEventsForFeatureGoal(
  paths: ProcessPath[],
  featureGoalId: string,
  flowGraph?: FlowGraph
): Array<{
  id: string;
  type: string;
  name: string;
  gatewayConditions: GatewayCondition[];
}> {
  const endEvents: Map<string, {
    id: string;
    type: string;
    name: string;
    gatewayConditions: GatewayCondition[];
  }> = new Map();

  for (const path of paths) {
    const featureGoalIndex = path.featureGoals.indexOf(featureGoalId);
    if (featureGoalIndex === -1) continue;

    // Hitta end event för denna path
    const endEventId = path.endEvent;
    if (!endEventId) continue;

    // Hitta gateway-conditions EFTER Feature Goal (som leder till end event)
    const gatewayConditionsAfter: GatewayCondition[] = [];
    for (const condition of path.gatewayConditions) {
      const gatewayIndex = path.nodeIds.indexOf(condition.gatewayId);
      const currentFeatureGoalIndex = path.nodeIds.indexOf(featureGoalId);
      const endEventIndex = path.nodeIds.indexOf(endEventId);
      
      if (
        gatewayIndex !== -1 &&
        currentFeatureGoalIndex !== -1 &&
        endEventIndex !== -1 &&
        gatewayIndex > currentFeatureGoalIndex &&
        gatewayIndex < endEventIndex
      ) {
        gatewayConditionsAfter.push(condition);
      }
    }

    // Hämta end event information från flowGraph om tillgänglig
    let endEventName = endEventId;
    let endEventType = 'endEvent';
    
    if (flowGraph) {
      const endEventNode = flowGraph.nodes.get(endEventId);
      if (endEventNode) {
        endEventName = endEventNode.name || endEventId;
        endEventType = endEventNode.type;
      }
    }

    if (!endEvents.has(endEventId)) {
      endEvents.set(endEventId, {
        id: endEventId,
        type: endEventType,
        name: endEventName,
        gatewayConditions: gatewayConditionsAfter,
      });
    } else {
      // Merga gateway-conditions
      const existing = endEvents.get(endEventId)!;
      const existingKeys = new Set(
        existing.gatewayConditions.map(gc => `${gc.gatewayId}::${gc.flowId}`)
      );
      
      for (const condition of gatewayConditionsAfter) {
        const key = `${condition.gatewayId}::${condition.flowId}`;
        if (!existingKeys.has(key)) {
          existing.gatewayConditions.push(condition);
          existingKeys.add(key);
        }
      }
    }
  }

  return Array.from(endEvents.values());
}








