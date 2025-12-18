/**
 * Central BPMN Hierarchy Model
 * 
 * This module provides a unified hierarchical representation of BPMN files
 * that serves as the SINGLE SOURCE OF TRUTH for:
 * - Test generation (hierarchical test files with nested describe blocks)
 * - Documentation generation (structured docs matching process hierarchy)
 * - Test dashboard (hierarchical test display)
 * - Jira integration (hierarchical ticket naming)
 * 
 * ARCHITECTURE OVERVIEW:
 * 
 * The hierarchy model represents BPMN processes as a tree structure:
 * 
 *   Initiative (Root Process)
 *   ├── Feature Goal (CallActivity)
 *   │   ├── Epic (UserTask)
 *   │   ├── Epic (ServiceTask)
 *   │   └── Epic (BusinessRuleTask)
 *   └── Feature Goal (CallActivity)
 *       └── ... (more epics)
 * 
 * This matches both:
 * 1. The BPMN process structure
 * 2. The Jira organizational hierarchy (Project → Initiative → Feature Goal → Epic)
 * 
 * WHY THIS MATTERS:
 * - Tests are organized in nested describe blocks mirroring the process
 * - Documentation sections follow the same structure
 * - Test dashboard displays hierarchy for better navigation
 * - Jira names include full context path
 * - All artifacts stay in sync when BPMN changes
 * 
 * USAGE:
 * 
 * 1. Build hierarchy from BPMN file:
 *    const hierarchy = await buildBpmnHierarchy('mortgage.bpmn', bpmnUrl);
 * 
 * 2. Generate hierarchical tests:
 *    const testFile = generateHierarchicalTestFileFromTree(
 *      processTree,
 *      hierarchy.bpmnFile
 *    );
 * 
 * 3. Use in dashboard:
 *    const featureGoals = getFeatureGoals(hierarchy);
 *    const epics = getEpics(hierarchy);
 * 
 * 4. Generate documentation:
 *    hierarchy.allNodes.forEach(node => {
 *      // Generate docs with node.parentPath for context
 *    });
 */

import { parseBpmnFile, BpmnParseResult } from './bpmnParser';
import { buildJiraName } from './jiraNaming';
import type { ProcessTreeNode } from './processTree';

export type BpmnNodeType = 
  | 'CallActivity' 
  | 'UserTask' 
  | 'ServiceTask' 
  | 'BusinessRuleTask' 
  | 'SubProcess'
  | 'Process';

export interface BpmnHierarchyNode {
  id: string;
  name: string;
  type: BpmnNodeType;
  bpmnFile: string;
  children: BpmnHierarchyNode[];
  parentPath: string[]; // Array of parent node names from root
  jiraType?: 'feature goal' | 'epic' | null;
  jiraName?: string | null;
  depth: number; // 0 = root, 1 = first level, etc.
}

export interface BpmnHierarchy {
  rootName: string; // Context root (e.g., "Application")
  bpmnFile: string;
  rootNode: BpmnHierarchyNode;
  allNodes: BpmnHierarchyNode[]; // Flattened list for easy access
}

/**
 * Build a hierarchical representation of a BPMN file
 * @param bpmnFile - The BPMN file name
 * @param bpmnFileUrl - URL to fetch the BPMN content
 * @param parentPath - Optional parent path for nested subprocesses (e.g., ['Mortgage', 'Application'])
 */
export async function buildBpmnHierarchy(
  bpmnFile: string,
  bpmnFileUrl: string,
  parentPath: string[] = []
): Promise<BpmnHierarchy> {
  const parseResult = await parseBpmnFile(bpmnFileUrl);
  
  // Extract context root from process name or filename
  const contextRoot = extractContextRoot(parseResult, bpmnFile);
  
  // Build the hierarchy tree
  const rootNode: BpmnHierarchyNode = {
    id: `root_${bpmnFile}`,
    name: contextRoot,
    type: 'Process',
    bpmnFile,
    children: [],
    parentPath: parentPath,
    depth: parentPath.length,
  };
  
  // Build children recursively (start with full parent path + context root)
  buildNodeChildren(rootNode, parseResult, bpmnFile, [...parentPath, contextRoot]);
  
  // Compute Jira names using the new naming scheme
  computeJiraNames(rootNode);
  
  // Flatten for easy access
  const allNodes = flattenNodes(rootNode);
  
  return {
    rootName: contextRoot,
    bpmnFile,
    rootNode,
    allNodes,
  };
}

/**
 * Extract context root name from BPMN process or filename
 */
function extractContextRoot(parseResult: BpmnParseResult, bpmnFile: string): string {
  // Try to get from process name
  if (parseResult.elements.length > 0) {
    const processElement = parseResult.elements.find(e => e.type === 'bpmn:Process');
    if (processElement?.name) {
      // Capitalize first letter of process name
      return processElement.name.charAt(0).toUpperCase() + processElement.name.slice(1);
    }
  }
  
  // Fallback to filename
  return bpmnFile
    .replace('.bpmn', '')
    .replace(/^mortgage-se-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Build children nodes recursively
 * 
 * NOTE: This function uses the new Jira naming scheme via buildJiraName.
 * However, since buildJiraName expects ProcessTreeNode and we're working with
 * BpmnHierarchyNode, we need to build the full hierarchy first, then compute Jira names.
 * For now, we'll compute Jira names after the hierarchy is built.
 */
function buildNodeChildren(
  parentNode: BpmnHierarchyNode,
  parseResult: BpmnParseResult,
  bpmnFile: string,
  currentPath: string[]
): void {
  // Add CallActivities (Feature Goals)
  parseResult.callActivities.forEach(ca => {
    const node: BpmnHierarchyNode = {
      id: ca.id,
      name: ca.name,
      type: 'CallActivity',
      bpmnFile,
      children: [],
      parentPath: currentPath,
      jiraType: 'feature goal',
      depth: parentNode.depth + 1,
    };
    
    parentNode.children.push(node);
  });
  
  // Add UserTasks (Epics)
  parseResult.userTasks.forEach(ut => {
    const node: BpmnHierarchyNode = {
      id: ut.id,
      name: ut.name,
      type: 'UserTask',
      bpmnFile,
      children: [],
      parentPath: currentPath,
      jiraType: 'epic',
      depth: parentNode.depth + 1,
    };
    
    parentNode.children.push(node);
  });
  
  // Add ServiceTasks (Epics)
  parseResult.serviceTasks.forEach(st => {
    const node: BpmnHierarchyNode = {
      id: st.id,
      name: st.name,
      type: 'ServiceTask',
      bpmnFile,
      children: [],
      parentPath: currentPath,
      jiraType: 'epic',
      depth: parentNode.depth + 1,
    };
    
    parentNode.children.push(node);
  });
  
  // Add BusinessRuleTasks (Epics)
  parseResult.businessRuleTasks.forEach(brt => {
    const node: BpmnHierarchyNode = {
      id: brt.id,
      name: brt.name,
      type: 'BusinessRuleTask',
      bpmnFile,
      children: [],
      parentPath: currentPath,
      jiraType: 'epic',
      depth: parentNode.depth + 1,
    };
    
    parentNode.children.push(node);
  });
  
  // Recursively build children for CallActivities
  parentNode.children
    .filter(child => child.type === 'CallActivity')
    .forEach(callActivity => {
      // Here we would recursively parse the subprocess file if available
      // For now, we treat each node as a leaf
    });
}

/**
 * Compute Jira names for all nodes in the hierarchy using the new naming scheme.
 * This must be called after the hierarchy is fully built.
 */
function computeJiraNames(rootNode: BpmnHierarchyNode): void {
  // Convert BpmnHierarchyNode to ProcessTreeNode format for buildJiraName
  const convertToProcessTreeNode = (node: BpmnHierarchyNode): ProcessTreeNode => {
    return {
      id: node.id,
      label: node.name,
      type: node.type === 'CallActivity' ? 'callActivity'
        : node.type === 'UserTask' ? 'userTask'
        : node.type === 'ServiceTask' ? 'serviceTask'
        : node.type === 'BusinessRuleTask' ? 'businessRuleTask'
        : 'process',
      bpmnFile: node.bpmnFile,
      bpmnElementId: node.id,
      children: node.children.map(convertToProcessTreeNode),
    };
  };

  const processTreeRoot = convertToProcessTreeNode(rootNode);

  // Compute Jira names for all nodes
  const computeForNode = (node: BpmnHierarchyNode, processTreeNode: ProcessTreeNode): void => {
    if (node.type !== 'Process') {
      // Exclude root process name from parent path
      const parentPathWithoutRoot = node.parentPath.filter((p) => p !== rootNode.name);
      node.jiraName = buildJiraName(processTreeNode, processTreeRoot, parentPathWithoutRoot);
    }

    // Recursively compute for children
    node.children.forEach((child, index) => {
      const childProcessTreeNode = processTreeNode.children[index];
      if (childProcessTreeNode) {
        computeForNode(child, childProcessTreeNode);
      }
    });
  };

  computeForNode(rootNode, processTreeRoot);
}

/**
 * Flatten the hierarchy tree into a list
 */
function flattenNodes(node: BpmnHierarchyNode): BpmnHierarchyNode[] {
  const result: BpmnHierarchyNode[] = [node];
  
  node.children.forEach(child => {
    result.push(...flattenNodes(child));
  });
  
  return result;
}

/**
 * Get all testable nodes (leaf nodes that should have tests)
 */
export function getTestableNodes(hierarchy: BpmnHierarchy): BpmnHierarchyNode[] {
  return hierarchy.allNodes.filter(node => 
    node.type === 'UserTask' ||
    node.type === 'ServiceTask' ||
    node.type === 'BusinessRuleTask' ||
    node.type === 'CallActivity'
  );
}

/**
 * Get nodes by type
 */
export function getNodesByType(
  hierarchy: BpmnHierarchy,
  type: BpmnNodeType
): BpmnHierarchyNode[] {
  return hierarchy.allNodes.filter(node => node.type === type);
}

/**
 * Get feature goals (CallActivities)
 */
export function getFeatureGoals(hierarchy: BpmnHierarchy): BpmnHierarchyNode[] {
  return getNodesByType(hierarchy, 'CallActivity');
}

/**
 * Get epics (tasks)
 */
export function getEpics(hierarchy: BpmnHierarchy): BpmnHierarchyNode[] {
  return hierarchy.allNodes.filter(node => 
    node.type === 'UserTask' ||
    node.type === 'ServiceTask' ||
    node.type === 'BusinessRuleTask'
  );
}

/**
 * Find node by ID
 */
export function findNodeById(
  hierarchy: BpmnHierarchy,
  nodeId: string
): BpmnHierarchyNode | undefined {
  return hierarchy.allNodes.find(node => node.id === nodeId);
}

/**
 * Get node path as string (for display)
 */
export function getNodePath(node: BpmnHierarchyNode): string {
  if (node.parentPath.length === 0) {
    return node.name;
  }
  return [...node.parentPath, node.name].join(' → ');
}

/**
 * Generate hierarchical test describe structure
 */
export function generateTestDescribeStructure(
  hierarchy: BpmnHierarchy
): string[] {
  const lines: string[] = [];
  
  function generateForNode(node: BpmnHierarchyNode, indent: number): void {
    const indentation = '  '.repeat(indent);
    
    if (node.type === 'Process') {
      // Root describe
      lines.push(`${indentation}test.describe('${node.name}', () => {`);
      node.children.forEach(child => generateForNode(child, indent + 1));
      lines.push(`${indentation}});`);
    } else if (node.type === 'CallActivity') {
      // Feature goal describe
      lines.push(`${indentation}test.describe('${node.name}', () => {`);
      node.children.forEach(child => generateForNode(child, indent + 1));
      lines.push(`${indentation}});`);
    } else {
      // Leaf node - actual test
      lines.push(`${indentation}test('${node.name}', async ({ page }) => {`);
      lines.push(`${indentation}  // TODO: Implement test for ${node.name}`);
      lines.push(`${indentation}  // Type: ${node.type}`);
      lines.push(`${indentation}  // ID: ${node.id}`);
      lines.push(`${indentation}  expect(true).toBe(true);`);
      lines.push(`${indentation}});`);
    }
  }
  
  generateForNode(hierarchy.rootNode, 0);
  
  return lines;
}