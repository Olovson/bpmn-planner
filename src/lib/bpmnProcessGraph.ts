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
  existingBpmnFiles: string[],
  versionHashes?: Map<string, string | null>
): Promise<BpmnProcessGraph> {
  const parseResults = await parseAllBpmnFiles(existingBpmnFiles, versionHashes);
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

  // VIKTIGT: Använd alltid rootFile som rootFileName, inte rootProcess.bpmnFile.
  // rootProcess.bpmnFile kan vara från parent-processen om Household är en subprocess,
  // men vi vill alltid använda rootFile när vi bygger grafen för en specifik fil.
  const rootFileName = rootFile;

  const elementsByFile = buildElementIndex(parseResults);
  const allNodes = new Map<string, BpmnProcessNode>();
  const fileNodes = new Map<string, BpmnProcessNode[]>();
  const missingDependencies: { parent: string; childProcess: string }[] = [];

  // VIKTIGT: När vi bygger grafen för en specifik fil (t.ex. Household),
  // så ska alla noder som tillhör den processen ha bpmnFile = rootFileName,
  // även om ProcessNodeModel säger något annat (t.ex. från parent-processen).
  // Detta säkerställer att coverage-kontrollen kan hitta dokumentationen korrekt.
  const rootChildren = convertProcessModelChildren(
    rootProcess,
    model,
    {
      currentFile: rootFileName,
      rootFile: rootFileName, // Lägg till rootFile i context för att kunna override bpmnFile
      elementsByFile,
      allNodes,
      fileNodes,
      missingDependencies,
      visitedProcesses: new Set<string>(), // Initialize visited processes set
      existingBpmnFiles, // Lägg till existingBpmnFiles för att kunna verifiera om subprocess-filer finns
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

  // VIKTIGT: Lägg till root-noden i allNodes så att den kan hittas när vi letar efter process-noder
  // Detta säkerställer att Feature Goal kan genereras för subprocess-filer även när de genereras isolerat
  allNodes.set(root.id, root);
  if (!fileNodes.has(rootFileName)) {
    fileNodes.set(rootFileName, []);
  }
  fileNodes.get(rootFileName)!.push(root);

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
  versionHashes?: Map<string, string | null>
): Promise<Map<string, BpmnParseResult>> {
  const results = new Map<string, BpmnParseResult>();
  for (const file of fileNames) {
    try {
      const versionHash = versionHashes?.get(file) || null;
      const result = await parseBpmnFile(`/bpmn/${file}`, versionHash);
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
  rootFile?: string; // Root file for the graph being built - used to override bpmnFile for root process nodes
  elementsByFile: Map<string, Map<string, BpmnElement>>;
  allNodes: Map<string, BpmnProcessNode>;
  fileNodes: Map<string, BpmnProcessNode[]>;
  missingDependencies: { parent: string; childProcess: string }[];
  visitedProcesses?: Set<string>; // Track visited process nodes to avoid infinite recursion
  existingBpmnFiles?: string[]; // Available BPMN files - used to verify if subprocess files actually exist
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
      // VIKTIGT: Om vi bygger grafen för en specifik rootFile (t.ex. Household),
      // och vi är i root-processen eller dess children, så använd rootFile.
      // Men VIKTIGT: Om node.bpmnFile inte matchar rootFile, betyder det att
      // detta är en process från en annan fil (t.ex. parent-processen), och vi
      // ska INTE använda rootFile för den.
      const nextFile = context.rootFile && 
                       context.currentFile === context.rootFile &&
                       node.bpmnFile === context.rootFile
        ? context.rootFile  // Vi är fortfarande i root-processen OCH noden tillhör root-filen
        : (node.bpmnFile || context.currentFile);
      result.push(
        ...convertProcessModelChildren(node, model, {
          ...context,
          currentFile: nextFile,
        }),
      );
      return;
    }

    if (node.kind === 'callActivity') {
      const elementId = node.bpmnElementId || node.id.split(':').pop()!;
      const element = context.elementsByFile.get(context.currentFile)?.get(elementId);
      const resolvedSubprocessFile = node.subprocessLink?.matchedProcessId
        ? resolveSubprocessFileFromModel(node, model)
        : undefined;

      // VIKTIGT: Verifiera att subprocess-filen faktiskt finns i existingBpmnFiles
      // Om filen saknas, sätt subprocessFile till undefined så att missingDefinition blir true
      const subprocessFile = resolvedSubprocessFile && context.existingBpmnFiles?.includes(resolvedSubprocessFile)
        ? resolvedSubprocessFile
        : undefined;

      if (!subprocessFile || node.subprocessLink?.matchStatus !== 'matched') {
        context.missingDependencies.push({
          parent: context.currentFile,
          childProcess: node.name,
        });
      }

      // För callActivity: om vi är i root-processen (currentFile === rootFile),
      // OCH callActivity-elementet faktiskt finns i root-filen, så använd rootFile.
      // Annars använd currentFile (som kan vara från parent-processen).
      const elementExistsInRootFile = context.rootFile && 
        context.elementsByFile.get(context.rootFile)?.has(elementId);
      const callActivityBpmnFile = context.rootFile && 
                                    context.currentFile === context.rootFile &&
                                    elementExistsInRootFile
        ? context.rootFile
        : context.currentFile;
      
      // VIKTIGT: När en callActivity har en matchad subprocess, behöver vi bearbeta
      // children från target-processen, inte bara callActivity-nodens children.
      // Detta görs genom att hitta target-processen via subprocess edge och bearbeta dess children.
      // VIKTIGT: Vi måste också undvika oändlig rekursion genom att tracka besökta processer.
      let children: BpmnProcessNode[] = [];
      
      if (subprocessFile && node.subprocessLink?.matchedProcessId) {
        // Hitta target-processen via subprocess edge
        const subprocessEdge = model.edges.find(
          (e) => e.kind === 'subprocess' && e.fromId === node.id,
        );
        if (subprocessEdge) {
          const targetProcess = model.nodesById.get(subprocessEdge.toId);
          if (targetProcess) {
            // Undvik oändlig rekursion genom att kolla om vi redan besökt denna process
            const visitedProcesses = context.visitedProcesses ?? new Set<string>();
            if (!visitedProcesses.has(targetProcess.id)) {
              visitedProcesses.add(targetProcess.id);
              // Bearbeta children från target-processen med currentFile = subprocessFile
              children = convertProcessModelChildren(targetProcess, model, {
                ...context,
                currentFile: subprocessFile,
                visitedProcesses,
              });
              visitedProcesses.delete(targetProcess.id); // Remove after processing to allow reuse in different branches
            }
          }
        }
      } else {
        // Om ingen subprocess matchad, bearbeta callActivity-nodens children som vanligt
        children = convertProcessModelChildren(node, model, {
          ...context,
          currentFile: subprocessFile ?? context.currentFile,
        });
      }

      // VIKTIGT: missingDefinition ska vara true om:
      // 1. subprocessFile är undefined/null, ELLER
      // 2. subprocessFile finns men filen saknas i existingBpmnFiles
      // Detta säkerställer att vi korrekt identifierar saknade subprocess-filer
      const subprocessFileExists = subprocessFile && 
        context.existingBpmnFiles?.includes(subprocessFile);
      const missingDefinition = !subprocessFile || !subprocessFileExists;
      
      const graphNode: BpmnProcessNode = {
        id: `${callActivityBpmnFile}:${elementId}`,
        name: node.name,
        type: 'callActivity',
        bpmnFile: callActivityBpmnFile,
        bpmnElementId: elementId,
        children,
        element,
        subprocessFile,
        missingDefinition,
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

      // VIKTIGT: Om vi är i root-processen (currentFile === rootFile),
      // OCH elementet faktiskt finns i root-filen, så använd rootFile för bpmnFile.
      // Annars använd context.currentFile (som kan vara från parent-processen eller subprocess-filen).
      // Detta säkerställer att noder i root-processen alltid har rätt bpmnFile,
      // oavsett vad ProcessModel säger (som kan ha fel bpmnFile från parent-processen).
      // 
      // När vi är i en subprocess (currentFile !== rootFile), ska vi alltid använda currentFile
      // (som är subprocess-filen), inte rootFile. Detta säkerställer att noder från subprocesser
      // får rätt bpmnFile när vi genererar för root-filen med hierarki.
      const elementExistsInRootFile = context.rootFile && 
        context.elementsByFile.get(context.rootFile)?.has(elementId);
      const nodeBpmnFile = context.rootFile && 
                           context.currentFile === context.rootFile &&
                           elementExistsInRootFile
        ? context.rootFile
        : context.currentFile;
      
      
      const graphNode: BpmnProcessNode = {
        id: `${nodeBpmnFile}:${elementId}`,
        name: node.name,
        type: typeMap[node.kind] ?? 'userTask',
        bpmnFile: nodeBpmnFile,
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
    // Note: BpmnProcessNode uses bpmnElementId directly, so we can use element IDs as nodeIds
    // and create a mapping for propagation
    const nodeElementIds = nodes
      .map((n) => n.bpmnElementId)
      .filter((id): id is string => id !== undefined);
    
    // Create mapping: element ID → element ID (identity mapping for BpmnProcessNode)
    // This allows intermediate events to be included in graph
    const elementIdToNodeIdMap = new Map<string, string>();
    nodeElementIds.forEach((elementId) => {
      elementIdToNodeIdMap.set(elementId, elementId);
    });
    
    const orderMap = calculateOrderFromSequenceFlows(
      sequenceFlows || [],
      nodeElementIds,
      elementIdToNodeIdMap,
    );

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

    // Always compute visualOrderIndex for ALL nodes with coordinates
    // Visual order is the primary sorting method, so all nodes need visualOrderIndex
    const nodesWithCoords = nodes.filter((n) => n.bpmnElementId);
    if (nodesWithCoords.length > 0) {
      const nodeElementIds = nodesWithCoords.map((n) => n.bpmnElementId!);
      const visualOrderMap = calculateVisualOrderFromCoordinates(elements, nodeElementIds);
      nodesWithCoords.forEach((node) => {
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
  
  // VIKTIGT: matchedProcessId är en internalId från hierarchy.processes,
  // men model.nodesById använder id som nyckel (t.ex. "file:elementId").
  // Vi måste använda subprocess edge för att hitta target-processen,
  // precis som resolveSubprocessFile gör i processModelToProcessTree.ts.
  const edge = model.edges.find(
    (e) => e.kind === 'subprocess' && e.fromId === node.id,
  );
  if (edge) {
    const target = model.nodesById.get(edge.toId);
    return target?.bpmnFile;
  }
  
  // Fallback: försök hitta direkt med matchedProcessId (kan fungera om det är samma som id)
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
    if (!node.children || node.children.length === 0) return 1;
    const childDepths = node.children.map((child) => calculateDepth(child));
    return 1 + Math.max(...childDepths);
  }

  const allFiles = Array.from(graph.fileNodes.keys());
  
  // VIKTIGT: Sortera filer så att root-filen kommer först.
  // Map.keys() returnerar nycklar i insertion order, men när vi registrerar noder,
  // så registreras noder från subprocesserna först (eftersom de bearbetas först när vi går in i callActivities),
  // och sedan registreras noder från root-filen. Vi behöver sortera så att root-filen kommer först.
  const filesIncluded = allFiles.sort((a, b) => {
    if (a === graph.rootFile) return -1;
    if (b === graph.rootFile) return 1;
    return a.localeCompare(b);
  });
  

  return {
    totalFiles: graph.fileNodes.size,
    totalNodes: graph.allNodes.size,
    nodesByType,
    filesIncluded,
    hierarchyDepth: calculateDepth(graph.root),
  };
}
