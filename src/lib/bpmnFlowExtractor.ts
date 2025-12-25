/**
 * Extraherar flödesinformation från BPMN-filer för E2E-scenario-generering.
 * 
 * Detta modul extraherar:
 * - Gateways (exclusive, parallel, inclusive)
 * - Sequence flows med conditions
 * - Paths genom processen
 * - Feature Goals (Call Activities) i varje path
 */

import type { BpmnParseResult, BpmnElement, BpmnSequenceFlow } from './bpmnParser';
import { parseBpmnFile } from './bpmnParser';

export interface GatewayInfo {
  id: string;
  name: string;
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway' | 'eventBasedGateway';
  outgoingFlows: GatewayOutgoingFlow[];
}

export interface GatewayOutgoingFlow {
  id: string;
  targetRef: string;
  condition?: string;
  conditionType?: string;
  name?: string;
}

export interface FlowNode {
  id: string;
  type: 'startEvent' | 'task' | 'callActivity' | 'gateway' | 'endEvent' | 'subProcess';
  name: string;
  outgoingEdges: string[];
  incomingEdges: string[];
}

export interface FlowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  condition?: string;
  conditionType?: string;
  name?: string;
}

export interface FlowGraph {
  nodes: Map<string, FlowNode>;
  edges: Map<string, FlowEdge>;
}

export interface GatewayCondition {
  gatewayId: string;
  gatewayName: string;
  condition: string;
  conditionText: string;
  flowId: string;
  targetNodeId: string;
}

export interface ProcessPath {
  type: 'possible-path';
  startEvent: string;
  endEvent: string;
  featureGoals: string[]; // Call Activity IDs
  gatewayConditions: GatewayCondition[];
  nodeIds: string[]; // Alla noder i pathen (för spårbarhet)
}

/**
 * Extraherar gateway-information från BPMN parse result.
 */
export function extractGateways(parseResult: BpmnParseResult): GatewayInfo[] {
  const gateways: GatewayInfo[] = [];
  
  parseResult.elements.forEach(element => {
    const bo = element.businessObject;
    if (!bo) return;
    
    const gatewayType = bo.$type;
    if (!gatewayType || !gatewayType.includes('Gateway')) return;
    
    const outgoingFlows = bo.outgoing || [];
    const flows: GatewayOutgoingFlow[] = [];
    
    outgoingFlows.forEach((flow: any) => {
      const condition = flow.conditionExpression;
      flows.push({
        id: flow.id,
        targetRef: flow.targetRef?.id || flow.targetRef,
        condition: condition?.body || undefined,
        conditionType: condition?.$type || undefined,
        name: flow.name || undefined
      });
    });
    
    gateways.push({
      id: element.id,
      name: element.name || element.id,
      type: normalizeGatewayType(gatewayType),
      outgoingFlows: flows
    });
  });
  
  return gateways;
}

/**
 * Normaliserar gateway-typ från BPMN-typ till vår typ.
 */
function normalizeGatewayType(bpmnType: string): GatewayInfo['type'] {
  if (bpmnType.includes('ExclusiveGateway')) return 'exclusiveGateway';
  if (bpmnType.includes('ParallelGateway')) return 'parallelGateway';
  if (bpmnType.includes('InclusiveGateway')) return 'inclusiveGateway';
  if (bpmnType.includes('EventBasedGateway')) return 'eventBasedGateway';
  return 'exclusiveGateway'; // Default
}

/**
 * Extraherar conditions från sequence flows.
 */
export function extractConditionsFromSequenceFlows(
  parseResult: BpmnParseResult
): Map<string, { condition?: string; conditionType?: string }> {
  const conditions = new Map<string, { condition?: string; conditionType?: string }>();
  
  // Sequence flows finns i parseResult.sequenceFlows, men conditions finns i businessObject
  // Vi behöver hitta sequence flow elements i elements-arrayen
  parseResult.elements.forEach(element => {
    const bo = element.businessObject;
    if (!bo || bo.$type !== 'bpmn:SequenceFlow') return;
    
    const condition = bo.conditionExpression;
    if (condition) {
      conditions.set(element.id, {
        condition: condition.body || condition.text || condition,
        conditionType: condition.$type
      });
    }
  });
  
  return conditions;
}

/**
 * Bygger en flödesgraf från BPMN parse result.
 */
export function buildFlowGraph(parseResult: BpmnParseResult): FlowGraph {
  const nodes = new Map<string, FlowNode>();
  const edges = new Map<string, FlowEdge>();
  
  // Extrahera conditions från sequence flows
  const conditions = extractConditionsFromSequenceFlows(parseResult);
  
  // 1. Lägg till alla noder
  parseResult.elements.forEach(element => {
    const bo = element.businessObject;
    if (!bo) return;
    
    const nodeType = getNodeType(bo.$type);
    if (nodeType) {
      nodes.set(element.id, {
        id: element.id,
        type: nodeType,
        name: element.name || element.id,
        outgoingEdges: [],
        incomingEdges: []
      });
    }
  });
  
  // 2. Lägg till alla edges (sequence flows)
  // Först från parseResult.sequenceFlows om de finns
  parseResult.sequenceFlows.forEach(flow => {
    const condition = conditions.get(flow.id);
    
    const edge: FlowEdge = {
      id: flow.id,
      sourceId: flow.sourceRef,
      targetId: flow.targetRef,
      condition: condition?.condition,
      conditionType: condition?.conditionType,
      name: flow.name || undefined
    };
    edges.set(flow.id, edge);
    
    // 3. Koppla edges till noder
    const sourceNode = nodes.get(flow.sourceRef);
    const targetNode = nodes.get(flow.targetRef);
    if (sourceNode) sourceNode.outgoingEdges.push(flow.id);
    if (targetNode) targetNode.incomingEdges.push(flow.id);
  });
  
  // Om parseResult.sequenceFlows är tom, extrahera från elements
  if (parseResult.sequenceFlows.length === 0) {
    parseResult.elements.forEach(element => {
      const bo = element.businessObject;
      if (!bo || bo.$type !== 'bpmn:SequenceFlow') return;
      
      const condition = conditions.get(element.id);
      
      const edge: FlowEdge = {
        id: element.id,
        sourceId: bo.sourceRef?.id || bo.sourceRef,
        targetId: bo.targetRef?.id || bo.targetRef,
        condition: condition?.condition,
        conditionType: condition?.conditionType,
        name: element.name || undefined
      };
      edges.set(element.id, edge);
      
      // Koppla edges till noder
      const sourceId = bo.sourceRef?.id || bo.sourceRef;
      const targetId = bo.targetRef?.id || bo.targetRef;
      const sourceNode = nodes.get(sourceId);
      const targetNode = nodes.get(targetId);
      if (sourceNode) sourceNode.outgoingEdges.push(element.id);
      if (targetNode) targetNode.incomingEdges.push(element.id);
    });
  }
  
  return { nodes, edges };
}

/**
 * Bestämmer nodtyp från BPMN-typ.
 */
function getNodeType(bpmnType: string): FlowNode['type'] | null {
  if (bpmnType === 'bpmn:StartEvent') return 'startEvent';
  if (bpmnType === 'bpmn:EndEvent') return 'endEvent';
  if (bpmnType === 'bpmn:UserTask') return 'task';
  if (bpmnType === 'bpmn:ServiceTask') return 'task';
  if (bpmnType === 'bpmn:BusinessRuleTask') return 'task';
  if (bpmnType === 'bpmn:CallActivity') return 'callActivity';
  if (bpmnType === 'bpmn:SubProcess') return 'subProcess';
  if (bpmnType && bpmnType.includes('Gateway')) return 'gateway';
  return null;
}

/**
 * Hittar start-events i en process.
 */
export function findStartEvents(graph: FlowGraph): FlowNode[] {
  const startEvents: FlowNode[] = [];
  graph.nodes.forEach(node => {
    if (node.type === 'startEvent') {
      startEvents.push(node);
    }
  });
  return startEvents;
}

/**
 * Hittar end-events i en process.
 */
export function findEndEvents(graph: FlowGraph): FlowNode[] {
  const endEvents: FlowNode[] = [];
  graph.nodes.forEach(node => {
    if (node.type === 'endEvent') {
      endEvents.push(node);
    }
  });
  return endEvents;
}

/**
 * Identifierar paths genom processen från start-event till end-event.
 */
export function findPathsThroughProcess(
  graph: FlowGraph,
  startEventId: string
): ProcessPath[] {
  const paths: ProcessPath[] = [];
  const visited = new Set<string>();
  
  function traverse(
    currentNodeId: string,
    currentPath: string[],
    gatewayConditions: GatewayCondition[]
  ) {
    if (visited.has(currentNodeId)) {
      return; // Avoid cycles
    }
    
    visited.add(currentNodeId);
    const node = graph.nodes.get(currentNodeId);
    if (!node) {
      visited.delete(currentNodeId);
      return;
    }
    
    // Om vi når en end-event, spara pathen
    if (node.type === 'endEvent') {
      const featureGoals = currentPath.filter(id => {
        const n = graph.nodes.get(id);
        return n?.type === 'callActivity';
      });
      
      paths.push({
        type: 'possible-path',
        startEvent: startEventId,
        endEvent: currentNodeId,
        featureGoals,
        gatewayConditions,
        nodeIds: [...currentPath, currentNodeId]
      });
      visited.delete(currentNodeId);
      return;
    }
    
    // Om vi når en gateway, följ alla outgoing edges
    if (node.type === 'gateway') {
      node.outgoingEdges.forEach(edgeId => {
        const edge = graph.edges.get(edgeId);
        if (!edge) return;
        
        const newConditions = [...gatewayConditions];
        if (edge.condition) {
          newConditions.push({
            gatewayId: currentNodeId,
            gatewayName: node.name,
            condition: edge.condition,
            conditionText: extractConditionText(edge.condition),
            flowId: edgeId,
            targetNodeId: edge.targetId
          });
        }
        
        traverse(edge.targetId, [...currentPath, currentNodeId], newConditions);
      });
    } else {
      // För övriga noder, följ alla outgoing edges (eller första om det bara finns en)
      if (node.outgoingEdges.length > 0) {
        node.outgoingEdges.forEach(edgeId => {
          const edge = graph.edges.get(edgeId);
          if (edge) {
            traverse(edge.targetId, [...currentPath, currentNodeId], gatewayConditions);
          }
        });
      }
    }
    
    visited.delete(currentNodeId);
  }
  
  traverse(startEventId, [], []);
  return paths;
}

/**
 * Extraherar condition-text från BPMN condition expression.
 */
function extractConditionText(condition: string): string {
  // Ta bort ${ och } från condition
  return condition.replace(/\$\{|\}/g, '').trim();
}

/**
 * Identifierar error paths (paths som slutar i error events).
 */
export function identifyErrorPaths(paths: ProcessPath[], graph: FlowGraph): ProcessPath[] {
  return paths.filter(path => {
    const endNode = graph.nodes.get(path.endEvent);
    if (!endNode) return false;
    
    // Kolla om end-event är ett error event
    // Detta kan identifieras genom att kolla om namnet innehåller "error" eller "rejected"
    const name = endNode.name.toLowerCase();
    return name.includes('error') || 
           name.includes('rejected') || 
           name.includes('avvisad') ||
           path.endEvent.toLowerCase().includes('error') ||
           path.endEvent.toLowerCase().includes('rejected');
  });
}

/**
 * Extraherar alla unika gateway-conditions från paths.
 */
export function extractUniqueGatewayConditions(paths: ProcessPath[]): GatewayCondition[] {
  const uniqueConditions = new Map<string, GatewayCondition>();
  
  paths.forEach(path => {
    path.gatewayConditions.forEach(condition => {
      const key = `${condition.gatewayId}:${condition.condition}`;
      if (!uniqueConditions.has(key)) {
        uniqueConditions.set(key, condition);
      }
    });
  });
  
  return Array.from(uniqueConditions.values());
}

