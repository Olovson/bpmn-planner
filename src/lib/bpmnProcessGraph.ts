import { BpmnElement, BpmnSubprocess, parseBpmnFile } from './bpmnParser';
import { matchSubprocessFile } from './bpmnGenerators';

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
}

export interface BpmnProcessGraph {
  rootFile: string;
  root: BpmnProcessNode;
  allNodes: Map<string, BpmnProcessNode>; // nodeId -> node
  fileNodes: Map<string, BpmnProcessNode[]>; // bpmnFile -> nodes in that file
}

/**
 * Bygger en komplett BPMN-processgraf för en toppnivåfil.
 * Denna graf innehåller alla noder från toppnivån och alla underliggande subprocess-filer.
 * 
 * @param rootFile - BPMN-fil att starta från (t.ex. 'mortgage.bpmn')
 * @param existingBpmnFiles - Lista över alla tillgängliga BPMN-filer
 * @returns En komplett processgraf med alla relationer
 */
export async function buildBpmnProcessGraph(
  rootFile: string,
  existingBpmnFiles: string[]
): Promise<BpmnProcessGraph> {
  const allNodes = new Map<string, BpmnProcessNode>();
  const fileNodes = new Map<string, BpmnProcessNode[]>();
  const processedFiles = new Set<string>();
  const fileUrlBase = '/bpmn/';
  const missingDependencies: { parent: string; childProcess: string }[] = [];

  /**
   * Rekursiv funktion som bygger trädet av noder.
   * Skyddar mot cykler genom att hålla koll på processedFiles.
   */
  async function buildNodeTree(
    bpmnFile: string,
    parentNodeId?: string
  ): Promise<BpmnProcessNode[]> {
    // Undvik cykler
    if (processedFiles.has(bpmnFile)) {
      console.warn(`Cycle detected: ${bpmnFile} already processed`);
      return [];
    }

    processedFiles.add(bpmnFile);
    
    try {
      // Parse BPMN-filen
      const fileUrl = fileUrlBase + bpmnFile;
      const parseResult = await parseBpmnFile(fileUrl);
      
      const nodes: BpmnProcessNode[] = [];

      // Skapa noder för alla relevanta BPMN-element
      for (const element of parseResult.elements) {
        const nodeType = mapBpmnTypeToNodeType(element.type);
        
        // Skippa process definitions och labels
        if (!nodeType || nodeType === 'process') continue;

        const node: BpmnProcessNode = {
          id: `${bpmnFile}:${element.id}`,
          name: element.name || element.id,
          type: nodeType,
          bpmnFile,
          bpmnElementId: element.id,
          children: [],
          element,
        };

        // Om detta är en CallActivity eller SubProcess, försök hitta och läsa in underliggande fil
        if (nodeType === 'callActivity' || nodeType === 'subProcess') {
          const subprocessName = element.name || element.id;
          const subprocessFile = matchSubprocessFile(
            subprocessName,
            existingBpmnFiles
          );

          if (subprocessFile && existingBpmnFiles.includes(subprocessFile)) {
            // Rekursivt bygg undernoder
            const childNodes = await buildNodeTree(subprocessFile, node.id);
            node.children = childNodes;
          } else {
            // Subprocess-filen finns inte - skapa placeholder
            console.warn(`Missing subprocess file for: ${subprocessName} (parent: ${bpmnFile})`);
            node.missingDefinition = true;
            
            // Track missing dependency
            missingDependencies.push({
              parent: bpmnFile,
              childProcess: subprocessName,
            });
          }
        }

        nodes.push(node);
        allNodes.set(node.id, node);
      }

      // Lagra noder per fil
      if (!fileNodes.has(bpmnFile)) {
        fileNodes.set(bpmnFile, []);
      }
      fileNodes.get(bpmnFile)!.push(...nodes);

      return nodes;
    } catch (error) {
      console.error(`Error building node tree for ${bpmnFile}:`, error);
      return [];
    }
  }

  // Bygg från rot
  const rootNodes = await buildNodeTree(rootFile);

  // Skapa rot-nod för grafen (representerar hela processen)
  const root: BpmnProcessNode = {
    id: `root:${rootFile}`,
    name: rootFile.replace('.bpmn', '').replace('mortgage-se-', ''),
    type: 'process',
    bpmnFile: rootFile,
    bpmnElementId: 'root',
    children: rootNodes,
  };

  // Save missing dependencies to database (fire and forget)
  if (missingDependencies.length > 0) {
    saveMissingDependencies(missingDependencies).catch(err => 
      console.error('Failed to save dependencies:', err)
    );
  }

  return {
    rootFile,
    root,
    allNodes,
    fileNodes,
  };
}

/**
 * Sparar saknade dependencies till databasen
 */
async function saveMissingDependencies(
  dependencies: { parent: string; childProcess: string }[]
): Promise<void> {
  // Import supabase client dynamically to avoid circular dependencies
  const { supabase } = await import('@/integrations/supabase/client');
  
  const records = dependencies.map(dep => ({
    parent_file: dep.parent,
    child_process: dep.childProcess,
    child_file: null,
  }));

  const { error } = await supabase
    .from('bpmn_dependencies')
    .upsert(records, {
      onConflict: 'parent_file,child_process',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error saving dependencies:', error);
  }
}

/**
 * Mappar BPMN-typer till vår interna nodtyp
 */
function mapBpmnTypeToNodeType(bpmnType: string): BpmnNodeType | null {
  const typeMap: Record<string, BpmnNodeType> = {
    'bpmn:Process': 'process',
    'bpmn:SubProcess': 'subProcess',
    'bpmn:CallActivity': 'callActivity',
    'bpmn:UserTask': 'userTask',
    'bpmn:ServiceTask': 'serviceTask',
    'bpmn:BusinessRuleTask': 'businessRuleTask',
    'bpmn:ExclusiveGateway': 'gateway',
    'bpmn:ParallelGateway': 'gateway',
    'bpmn:InclusiveGateway': 'gateway',
    'bpmn:StartEvent': 'event',
    'bpmn:EndEvent': 'event',
    'bpmn:IntermediateThrowEvent': 'event',
    'bpmn:IntermediateCatchEvent': 'event',
  };

  return typeMap[bpmnType] || null;
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

  // Beräkna hierarchi-djup
  function calculateDepth(node: BpmnProcessNode, currentDepth: number = 0): number {
    if (node.children.length === 0) return currentDepth;
    
    const childDepths = node.children.map(child =>
      calculateDepth(child, currentDepth + 1)
    );
    
    return Math.max(...childDepths);
  }

  return {
    totalFiles: graph.fileNodes.size,
    totalNodes: graph.allNodes.size,
    nodesByType,
    filesIncluded: Array.from(graph.fileNodes.keys()),
    hierarchyDepth: calculateDepth(graph.root),
  };
}
