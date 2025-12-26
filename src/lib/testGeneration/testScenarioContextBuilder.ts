import type { ExtractedUserStory } from './userStoryExtractor';
import type { BpmnProcessGraph, BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import type { TestScenarioContext } from './testScenarioLlmTypes';

/**
 * Bygger kontext för Claude-baserad testgenerering.
 * 
 * Kombinerar user stories från dokumentation med BPMN-processflöde
 * för att skapa en komplett kontext som Claude kan använda.
 */

export interface DocumentationContext {
  summary?: string;
  flowSteps?: string[];
  dependencies?: string[];
}

/**
 * Bygger kontext för testgenerering från user stories och BPMN-processflöde.
 */
export function buildTestScenarioContext(
  userStories: ExtractedUserStory[],
  documentation: DocumentationContext,
  processGraph: BpmnProcessGraph,
  bpmnFile: string,
  elementId: string,
  nodeType: 'userTask' | 'serviceTask' | 'businessRuleTask' | 'callActivity',
  nodeName: string
): TestScenarioContext {
  // Extrahera paths från processgraf
  const paths = extractPathsFromGraph(processGraph.root, processGraph);
  
  // Extrahera error events
  const errorEvents = extractErrorEvents(processGraph);
  
  // Extrahera gateways
  const gateways = extractGateways(processGraph);
  
  return {
    nodeContext: {
      bpmnFile,
      elementId,
      nodeType,
      nodeName,
    },
    documentation: {
      userStories: userStories.map(us => ({
        id: us.id,
        role: us.role,
        goal: us.goal,
        value: us.value,
        acceptanceCriteria: us.acceptanceCriteria,
      })),
      summary: documentation.summary,
      flowSteps: documentation.flowSteps,
      dependencies: documentation.dependencies,
    },
    bpmnProcessFlow: {
      paths: paths.map(path => ({
        type: path.type,
        nodes: path.nodes.map(node => ({
          id: node.bpmnElementId,
          type: node.type,
          name: node.name || node.bpmnElementId,
        })),
        description: generatePathDescription(path),
      })),
      errorEvents: errorEvents.map(event => ({
        nodeId: event.bpmnElementId,
        errorName: event.name || event.bpmnElementId,
      })),
      gateways: gateways.map(gateway => ({
        nodeId: gateway.bpmnElementId,
        name: gateway.name || gateway.bpmnElementId,
      })),
    },
  };
}

/**
 * Extraherar paths från processgraf.
 */
function extractPathsFromGraph(
  rootNode: BpmnProcessNode,
  graph: BpmnProcessGraph
): Array<{
  type: 'happy-path' | 'error-path';
  nodes: BpmnProcessNode[];
}> {
  const paths: Array<{
    type: 'happy-path' | 'error-path';
    nodes: BpmnProcessNode[];
  }> = [];
  
  // Hitta happy paths (till end events)
  const happyPaths = findPathsToEnd(rootNode, graph);
  for (const path of happyPaths) {
    paths.push({
      type: 'happy-path',
      nodes: path,
    });
  }
  
  // Hitta error paths (till error events)
  const errorPaths = findPathsToErrorEvents(rootNode, graph);
  for (const path of errorPaths) {
    paths.push({
      type: 'error-path',
      nodes: path,
    });
  }
  
  return paths;
}

/**
 * Hittar paths till end events.
 */
function findPathsToEnd(
  node: BpmnProcessNode,
  graph: BpmnProcessGraph,
  visited: Set<string> = new Set(),
  currentPath: BpmnProcessNode[] = []
): BpmnProcessNode[][] {
  const paths: BpmnProcessNode[][] = [];
  
  if (visited.has(node.bpmnElementId)) {
    return paths;
  }
  
  visited.add(node.bpmnElementId);
  const newPath = [...currentPath, node];
  
  if (node.type === 'event' && node.name?.toLowerCase().includes('end')) {
    return [newPath];
  }
  
  for (const child of node.children) {
    const childPaths = findPathsToEnd(child, graph, new Set(visited), newPath);
    paths.push(...childPaths);
  }
  
  if (node.children.length === 0 && paths.length === 0) {
    return [newPath];
  }
  
  return paths;
}

/**
 * Hittar paths till error events.
 */
function findPathsToErrorEvents(
  node: BpmnProcessNode,
  graph: BpmnProcessGraph,
  visited: Set<string> = new Set(),
  currentPath: BpmnProcessNode[] = []
): BpmnProcessNode[][] {
  const paths: BpmnProcessNode[][] = [];
  
  if (visited.has(node.bpmnElementId)) {
    return paths;
  }
  
  visited.add(node.bpmnElementId);
  const newPath = [...currentPath, node];
  
  if (node.type === 'event' && (node.name?.toLowerCase().includes('error') || node.name?.toLowerCase().includes('fel'))) {
    return [newPath];
  }
  
  for (const child of node.children) {
    const childPaths = findPathsToErrorEvents(child, graph, new Set(visited), newPath);
    paths.push(...childPaths);
  }
  
  return paths;
}

/**
 * Extraherar error events från processgraf.
 */
function extractErrorEvents(graph: BpmnProcessGraph): BpmnProcessNode[] {
  const errorEvents: BpmnProcessNode[] = [];
  
  const traverse = (node: BpmnProcessNode) => {
    if (node.type === 'event' && (node.name?.toLowerCase().includes('error') || node.name?.toLowerCase().includes('fel'))) {
      errorEvents.push(node);
    }
    
    for (const child of node.children) {
      traverse(child);
    }
  };
  
  traverse(graph.root);
  return errorEvents;
}

/**
 * Extraherar gateways från processgraf.
 */
function extractGateways(graph: BpmnProcessGraph): BpmnProcessNode[] {
  const gateways: BpmnProcessNode[] = [];
  
  const traverse = (node: BpmnProcessNode) => {
    if (node.type === 'gateway') {
      gateways.push(node);
    }
    
    for (const child of node.children) {
      traverse(child);
    }
  };
  
  traverse(graph.root);
  return gateways;
}

/**
 * Genererar beskrivning för en path.
 */
function generatePathDescription(path: {
  type: 'happy-path' | 'error-path';
  nodes: BpmnProcessNode[];
}): string {
  if (path.nodes.length === 0) {
    return 'Tom path';
  }
  
  const startNode = path.nodes[0];
  const endNode = path.nodes[path.nodes.length - 1];
  
  if (path.type === 'happy-path') {
    return `Happy path från ${startNode.name || startNode.bpmnElementId} till ${endNode.name || endNode.bpmnElementId}. Processen följer huvudflödet utan fel.`;
  } else {
    return `Error path från ${startNode.name || startNode.bpmnElementId} till ${endNode.name || endNode.bpmnElementId}. Processen hanterar ett fel och avslutas med error event.`;
  }
}





