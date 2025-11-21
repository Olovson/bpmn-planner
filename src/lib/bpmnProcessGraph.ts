import type { BpmnElement, BpmnParseResult } from './bpmnParser';
import { parseBpmnFile } from './bpmnParser';
import { collectProcessDefinitionsFromMeta } from '@/lib/bpmn/processDefinition';
import {
  buildProcessHierarchy,
  type NormalizedProcessDefinition,
} from '@/lib/bpmn/buildProcessHierarchy';
import type { HierarchyNode, ProcessDefinition } from '@/lib/bpmn/types';
import {
  resolveProcessFileName,
  resolveProcessFileNameByInternalId,
} from '@/lib/bpmn/hierarchyTraversal';

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
  const processDefinitions = buildProcessDefinitions(parseResults);

  const preferredProcessIds = new Set(
    processDefinitions.filter((proc) => proc.fileName === rootFile).map((proc) => proc.id),
  );

  const hierarchy = buildProcessHierarchy(processDefinitions, {
    preferredRootProcessIds: preferredProcessIds,
  });

  if (!hierarchy.roots.length) {
    throw new Error('Kunde inte bygga hierarki: inga processrötter hittades.');
  }

  const rootHierarchyNode =
    hierarchy.roots.find((node) => resolveProcessFileName(node, hierarchy.processes) === rootFile) ??
    hierarchy.roots[0];

  const rootFileName =
    resolveProcessFileName(rootHierarchyNode, hierarchy.processes) ?? rootFile;

  const elementsByFile = buildElementIndex(parseResults);
  const allNodes = new Map<string, BpmnProcessNode>();
  const fileNodes = new Map<string, BpmnProcessNode[]>();
  const missingDependencies: { parent: string; childProcess: string }[] = [];

  const rootChildren = convertHierarchyChildren(rootHierarchyNode.children, {
    currentFile: rootFileName,
    processes: hierarchy.processes,
    elementsByFile,
    allNodes,
    fileNodes,
    missingDependencies,
  });

  const root: BpmnProcessNode = {
    id: `root:${rootFileName}`,
    name: rootHierarchyNode.displayName || rootFileName.replace('.bpmn', ''),
    type: 'process',
    bpmnFile: rootFileName,
    bpmnElementId: rootHierarchyNode.processId || 'root',
    children: rootChildren,
  };

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

function buildProcessDefinitions(parseResults: Map<string, BpmnParseResult>) {
  const definitions: ProcessDefinition[] = [];
  for (const [fileName, result] of parseResults.entries()) {
    definitions.push(
      ...collectProcessDefinitionsFromMeta(fileName, result.meta),
    );
  }
  return definitions;
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
  processes: Map<string, NormalizedProcessDefinition>;
  elementsByFile: Map<string, Map<string, BpmnElement>>;
  allNodes: Map<string, BpmnProcessNode>;
  fileNodes: Map<string, BpmnProcessNode[]>;
  missingDependencies: { parent: string; childProcess: string }[];
}

function convertHierarchyChildren(
  nodes: HierarchyNode[],
  context: ConversionContext,
): BpmnProcessNode[] {
  const result: BpmnProcessNode[] = [];

  for (const node of nodes) {
    if (node.bpmnType === 'process') {
      const nextFile = resolveProcessFileName(node, context.processes) ?? context.currentFile;
      result.push(
        ...convertHierarchyChildren(node.children, {
          ...context,
          currentFile: nextFile,
        }),
      );
      continue;
    }

    if (node.bpmnType === 'callActivity') {
      const elementId = node.link?.callActivityId ?? extractElementId(node.nodeId);
      const element = context.elementsByFile.get(context.currentFile)?.get(elementId);
      const subprocessFile = node.link?.matchedProcessId
        ? resolveProcessFileNameByInternalId(node.link.matchedProcessId, context.processes)
        : undefined;

      if (!subprocessFile || node.link?.matchStatus !== 'matched') {
        context.missingDependencies.push({
          parent: context.currentFile,
          childProcess: node.displayName,
        });
      }

      const children = node.children.flatMap((child) => {
        if (child.bpmnType === 'process') {
          const processFile =
            resolveProcessFileName(child, context.processes) ?? subprocessFile ?? context.currentFile;
          return convertHierarchyChildren(child.children, {
            ...context,
            currentFile: processFile,
          });
        }
        return convertHierarchyChildren([child], {
          ...context,
          currentFile: subprocessFile ?? context.currentFile,
        });
      });

      const graphNode: BpmnProcessNode = {
        id: `${context.currentFile}:${elementId}`,
        name: node.displayName,
        type: 'callActivity',
        bpmnFile: context.currentFile,
        bpmnElementId: elementId,
        children,
        element,
        subprocessFile,
        missingDefinition: !subprocessFile,
        subprocessMatchStatus: node.link?.matchStatus,
        subprocessDiagnostics: node.link?.diagnostics?.map((d) => d.message).filter(Boolean),
      };

      registerGraphNode(graphNode, context);
      result.push(graphNode);
      continue;
    }

    if (isTaskLike(node.bpmnType)) {
      const elementId = extractElementId(node.nodeId);
      const element = context.elementsByFile.get(context.currentFile)?.get(elementId);

      const typeMap: Record<string, BpmnNodeType> = {
        userTask: 'userTask',
        serviceTask: 'serviceTask',
        businessRuleTask: 'businessRuleTask',
        task: 'userTask',
      };

      const graphNode: BpmnProcessNode = {
        id: `${context.currentFile}:${elementId}`,
        name: node.displayName,
        type: typeMap[node.bpmnType] ?? 'userTask',
        bpmnFile: context.currentFile,
        bpmnElementId: elementId,
        children: [],
        element,
      };

      registerGraphNode(graphNode, context);
      result.push(graphNode);
      continue;
    }
  }

  return result;
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

function isTaskLike(type: HierarchyNode['bpmnType']) {
  return type === 'userTask' || type === 'serviceTask' || type === 'businessRuleTask' || type === 'task';
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
