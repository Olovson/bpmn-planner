import type { BpmnElement, BpmnParseResult } from './bpmnParser';
import { parseBpmnFile } from './bpmnParser';
import { collectProcessDefinitionsFromMeta } from '@/lib/bpmn/processDefinition';
import {
  buildProcessModelFromDefinitions,
  type ProcessModel,
  type ProcessNodeModel,
} from '@/lib/bpmn/buildProcessModel';

export type BpmnNodeType =
  | 'process'
  | 'subProcess'
  | 'callActivity'
  | 'userTask'
  | 'serviceTask'
  | 'businessRuleTask'
  | 'dmnDecision'
  | 'gateway'
  | 'event';

export interface BpmnProcessNode {
  id: string;
  name: string;
  type: BpmnNodeType;
  bpmnFile: string;
  bpmnElementId: string;
  children: BpmnProcessNode[];
  element?: BpmnElement; // Original BPMN element for reference
  missingDefinition?: boolean; // True if subprocess file is not found
  subprocessFile?: string; // Matched BPMN file for CallActivities/SubProcesses
  subprocessMatchStatus?: HierarchyNode['link'] extends { matchStatus: infer T } ? T : string;
  subprocessDiagnostics?: string[];
  // Optional execution ordering metadata (sequence-flow aware).
  orderIndex?: number;
  /** Visual ordering index based on BPMN DI coordinates (x, y). Used only when orderIndex is missing. */
  visualOrderIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];
}

export interface BpmnProcessGraph {
  rootFile: string;
  root: BpmnProcessNode;
  allNodes: Map<string, BpmnProcessNode>; // nodeId -> node
  fileNodes: Map<string, BpmnProcessNode[]>; // bpmnFile -> nodes in that file
  missingDependencies: { parent: string; childProcess: string }[];
}

/**
 * Bygger en komplett BPMN-processgraf baserad på den nya deterministiska
 * hierarkimotorn. Grafen innehåller alla noder från toppnivån och länkar till
 * deras subprocesser med diagnostik för saknade eller osäkra matchningar.
 */
export async function buildBpmnProcessGraph(
  rootFile: string,
  existingBpmnFiles: string[]
): Promise<BpmnProcessGraph> {
  const parseResults = await parseAllBpmnFiles(existingBpmnFiles);
  const inputFiles = buildProcessModelInputFiles(parseResults);
  const model = buildProcessModelFromDefinitions(inputFiles, {
    preferredRootFile: rootFile,
  });

  if (!model.hierarchyRoots.length) {
    throw new Error('Kunde inte bygga hierarki: inga processrötter hittades.');
  }

  const rootProcess =
    model.hierarchyRoots.find((proc) => proc.bpmnFile === rootFile) ??
    model.hierarchyRoots[0];

  const rootFileName = rootProcess.bpmnFile || rootFile;

  const elementsByFile = buildElementIndex(parseResults);
  const allNodes = new Map<string, BpmnProcessNode>();
  const fileNodes = new Map<string, BpmnProcessNode[]>();
  const missingDependencies: { parent: string; childProcess: string }[] = [];

  const rootChildren = convertProcessModelChildren(
    rootProcess,
    model,
    {
      currentFile: rootFileName,
      elementsByFile,
      allNodes,
      fileNodes,
      missingDependencies,
    },
  );

  const root: BpmnProcessNode = {
    id: `root:${rootFileName}`,
    name: rootProcess.name || rootFileName.replace('.bpmn', ''),
    type: 'process',
    bpmnFile: rootFileName,
    bpmnElementId: rootProcess.processId || 'root',
    children: rootChildren,
  };

  // Assign sequence-flow based ordering per file to all graph nodes.
  assignExecutionOrder(parseResults, fileNodes);

  return {
    rootFile: rootFileName,
    root,
    allNodes,
    fileNodes,
    missingDependencies,
  };
}

async function parseAllBpmnFiles(
  fileNames: string[],
): Promise<Map<string, BpmnParseResult>> {
  const results = new Map<string, BpmnParseResult>();
  for (const file of fileNames) {
    try {
      const result = await parseBpmnFile(`/bpmn/${file}`);
      results.set(file, result);
    } catch (error) {
      console.error(`Kunde inte parsa ${file}:`, error);
    }
  }
  return results;
}

function buildProcessModelInputFiles(
  parseResults: Map<string, BpmnParseResult>,
) {
  const files: {
    fileName: string;
    definitions: ReturnType<typeof collectProcessDefinitionsFromMeta>;
  }[] = [];
  for (const [fileName, result] of parseResults.entries()) {
    files.push({
      fileName,
      definitions: collectProcessDefinitionsFromMeta(fileName, result.meta),
    });
  }
  return files;
}

function buildElementIndex(parseResults: Map<string, BpmnParseResult>) {
  const map = new Map<string, Map<string, BpmnElement>>();
  for (const [fileName, result] of parseResults.entries()) {
    const elementMap = new Map<string, BpmnElement>();
    result.elements.forEach((element) => {
      elementMap.set(element.id, element);
    });
    map.set(fileName, elementMap);
  }
  return map;
}

interface ConversionContext {
  currentFile: string;
  elementsByFile: Map<string, Map<string, BpmnElement>>;
  allNodes: Map<string, BpmnProcessNode>;
  fileNodes: Map<string, BpmnProcessNode[]>;
  missingDependencies: { parent: string; childProcess: string }[];
}

function convertProcessModelChildren(
  parent: ProcessNodeModel,
  model: ProcessModel,
  context: ConversionContext,
): BpmnProcessNode[] {
  const result: BpmnProcessNode[] = [];

  parent.childrenIds.forEach((childId) => {
    const node = model.nodesById.get(childId);
    if (!node) return;

    if (node.kind === 'process') {
      // Flatten process nodes beneath the current parent, mirroring the
      // behaviour used in the client-side ProcessTree.
      result.push(
        ...convertProcessModelChildren(node, model, {
          ...context,
          currentFile: node.bpmnFile || context.currentFile,
        }),
      );
      return;
    }

    if (node.kind === 'callActivity') {
      const elementId = node.bpmnElementId || node.id.split(':').pop()!;
      const element = context.elementsByFile.get(context.currentFile)?.get(elementId);
      const subprocessFile = node.subprocessLink?.matchedProcessId
        ? resolveSubprocessFileFromModel(node, model)
        : undefined;

      if (!subprocessFile || node.subprocessLink?.matchStatus !== 'matched') {
        context.missingDependencies.push({
          parent: context.currentFile,
          childProcess: node.name,
        });
      }

      const children = convertProcessModelChildren(node, model, {
        ...context,
        currentFile: subprocessFile ?? context.currentFile,
      });

      const graphNode: BpmnProcessNode = {
        id: `${context.currentFile}:${elementId}`,
        name: node.name,
        type: 'callActivity',
        bpmnFile: context.currentFile,
        bpmnElementId: elementId,
        children,
        element,
        subprocessFile,
        missingDefinition: !subprocessFile,
        subprocessMatchStatus: node.subprocessLink?.matchStatus,
        subprocessDiagnostics: node.subprocessLink?.diagnostics
          ?.map((d) => d.message)
          .filter(Boolean),
        orderIndex: node.orderIndex,
        branchId: node.branchId,
        scenarioPath: node.scenarioPath,
      };

      registerGraphNode(graphNode, context);
      result.push(graphNode);
      return;
    }

    if (
      node.kind === 'userTask' ||
      node.kind === 'serviceTask' ||
      node.kind === 'businessRuleTask'
    ) {
      const elementId = node.bpmnElementId || node.id.split(':').pop()!;
      const element = context.elementsByFile.get(context.currentFile)?.get(elementId);

      const typeMap: Record<string, BpmnNodeType> = {
        userTask: 'userTask',
        serviceTask: 'serviceTask',
        businessRuleTask: 'businessRuleTask',
      };

      const graphNode: BpmnProcessNode = {
        id: `${context.currentFile}:${elementId}`,
        name: node.name,
        type: typeMap[node.kind] ?? 'userTask',
        bpmnFile: context.currentFile,
        bpmnElementId: elementId,
        children: [],
        element,
        orderIndex: node.orderIndex,
        visualOrderIndex: node.visualOrderIndex,
        branchId: node.branchId,
        scenarioPath: node.scenarioPath,
      };

      registerGraphNode(graphNode, context);
      result.push(graphNode);
      return;
    }
  });

  return result;
}

import {
  calculateOrderFromSequenceFlows,
  calculateVisualOrderFromCoordinates,
} from './bpmn/sequenceOrderHelpers';

function assignExecutionOrder(
  parseResults: Map<string, BpmnParseResult>,
  fileNodes: Map<string, BpmnProcessNode[]>,
): void {
  
  fileNodes.forEach((nodes, fileName) => {
    const parseResult = parseResults.get(fileName);
    if (!parseResult) return;

    const { sequenceFlows, elements } = parseResult;
    
    // Always use the same function - calculateOrderFromSequenceFlows
    // This will return empty map if no sequence flows or no start nodes
    const nodeElementIds = nodes
      .map((n) => n.bpmnElementId)
      .filter((id): id is string => id !== undefined);
    const orderMap = calculateOrderFromSequenceFlows(sequenceFlows || [], nodeElementIds);

    // Apply orderIndex, branchId, scenarioPath to nodes
    const nodesByElementId = new Map<string, BpmnProcessNode[]>();
    for (const node of nodes) {
      if (!node.bpmnElementId) continue;
      const list = nodesByElementId.get(node.bpmnElementId) ?? [];
      list.push(node);
      nodesByElementId.set(node.bpmnElementId, list);
    }

    orderMap.forEach((info, elementId) => {
      const graphNodes = nodesByElementId.get(elementId) ?? [];
      graphNodes.forEach((node) => {
        if (node.orderIndex == null) {
          node.orderIndex = info.orderIndex;
          node.branchId = info.branchId;
          node.scenarioPath = info.scenarioPath;
        }
      });
    });

    // Always compute visualOrderIndex for nodes without orderIndex
    // This uses the same function regardless of whether sequence flows exist
    const nodesWithoutOrder = nodes.filter((n) => n.bpmnElementId && n.orderIndex === undefined);
    if (nodesWithoutOrder.length > 0) {
      const nodeElementIds = nodesWithoutOrder.map((n) => n.bpmnElementId!);
      const visualOrderMap = calculateVisualOrderFromCoordinates(elements, nodeElementIds);
      nodesWithoutOrder.forEach((node) => {
        if (node.bpmnElementId) {
          const visualIndex = visualOrderMap.get(node.bpmnElementId);
          if (visualIndex !== undefined) {
            node.visualOrderIndex = visualIndex;
          }
        }
      });
    }
  });
}

function registerGraphNode(node: BpmnProcessNode, context: ConversionContext) {
  context.allNodes.set(node.id, node);
  if (!context.fileNodes.has(node.bpmnFile)) {
    context.fileNodes.set(node.bpmnFile, []);
  }
  context.fileNodes.get(node.bpmnFile)!.push(node);
}

function extractElementId(nodeId: string): string {
  const segments = nodeId.split(':');
  return segments[segments.length - 1];
}

function resolveSubprocessFileFromModel(
  node: ProcessNodeModel,
  model: ProcessModel,
): string | undefined {
  const link = node.subprocessLink;
  if (!link?.matchedProcessId) return undefined;
  const target = model.nodesById.get(link.matchedProcessId);
  return target?.bpmnFile;
}

/**
 * Hämtar alla noder av en viss typ från grafen
 */
export function getNodesByType(
  graph: BpmnProcessGraph,
  type: BpmnNodeType
): BpmnProcessNode[] {
  return Array.from(graph.allNodes.values()).filter(node => node.type === type);
}

/**
 * Hämtar alla testbara noder (UserTask, ServiceTask, BusinessRuleTask, CallActivity)
 */
export function getTestableNodes(graph: BpmnProcessGraph): BpmnProcessNode[] {
  const testableTypes: BpmnNodeType[] = [
    'userTask',
    'serviceTask',
    'businessRuleTask',
    'callActivity',
  ];
  
  return Array.from(graph.allNodes.values()).filter(node =>
    testableTypes.includes(node.type)
  );
}

/**
 * Hämtar alla noder för en specifik fil
 */
export function getNodesForFile(
  graph: BpmnProcessGraph,
  bpmnFile: string
): BpmnProcessNode[] {
  return graph.fileNodes.get(bpmnFile) || [];
}

/**
 * Skapar en hierarkisk sammanfattning av grafen för användning i dokumentation
 */
export interface GraphSummary {
  totalFiles: number;
  totalNodes: number;
  nodesByType: Record<string, number>;
  filesIncluded: string[];
  hierarchyDepth: number;
}

export function createGraphSummary(graph: BpmnProcessGraph): GraphSummary {
  const nodesByType: Record<string, number> = {};
  
  for (const node of graph.allNodes.values()) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }

  // Beräkna hierarki-djup (antal nivåer, inkl. rot)
  function calculateDepth(node: BpmnProcessNode): number {
    if (node.children.length === 0) return 1;
    const childDepths = node.children.map((child) => calculateDepth(child));
    return 1 + Math.max(...childDepths);
  }

  return {
    totalFiles: graph.fileNodes.size,
    totalNodes: graph.allNodes.size,
    nodesByType,
    filesIncluded: Array.from(graph.fileNodes.keys()),
    hierarchyDepth: calculateDepth(graph.root),
  };
}
