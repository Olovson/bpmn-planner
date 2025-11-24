import type { ProcessTreeNode, ProcessNodeType } from '@/lib/processTree';

/**
 * Builds Jira name for a node based on the new naming scheme.
 * 
 * For feature goals (callActivity):
 * - If top-level (direct child of root): <N.label>
 * - If deeper: <T.label> – <N.label> where T is the top-level subprocess ancestor
 * - Root process name is NEVER included
 * 
 * For epics (userTask, serviceTask, businessRuleTask):
 * - Uses existing path-based naming (full parent path + node name)
 * - Root process name is excluded from the path
 * 
 * @param node - The node to generate a Jira name for
 * @param rootNode - The root process node (type === 'process')
 * @param parentPath - Optional parent path array (for backward compatibility with path-based logic)
 * @returns The Jira name string
 */
export function buildJiraName(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
  parentPath: string[] = [],
): string {
  // For feature goals (callActivity), use the new naming scheme
  if (node.type === 'callActivity') {
    return buildFeatureGoalJiraName(node, rootNode);
  }

  // For epics and other node types, use existing path-based naming
  // Exclude root process name from the path
  const pathWithoutRoot = parentPath.filter((label) => label !== rootNode.label);
  const fullPath = [...pathWithoutRoot, node.label];
  return fullPath.filter(Boolean).join(' - ') || node.label;
}

/**
 * Builds Jira name for a feature goal (callActivity) using the new naming scheme.
 * 
 * Rules:
 * 1. Root process name is NEVER included
 * 2. If N is a top-level subprocess (direct child of root): <N.label>
 * 3. If N is deeper: <T.label> – <N.label> where T is the top-level subprocess ancestor
 * 
 * @param node - The callActivity node
 * @param rootNode - The root process node
 * @returns The Jira name string
 */
function buildFeatureGoalJiraName(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
): string {
  // Find the top-level subprocess (first callActivity ancestor that is a direct child of root)
  const topLevelSubprocess = findTopLevelSubprocess(node, rootNode);

  if (!topLevelSubprocess) {
    // If we can't find a top-level subprocess, just use the node's label
    // This can happen if the tree structure is incomplete
    return node.label;
  }

  // If this node IS the top-level subprocess, return just its label
  if (topLevelSubprocess.id === node.id) {
    return node.label;
  }

  // Otherwise, return: <top-level-label> – <node-label>
  return `${topLevelSubprocess.label} – ${node.label}`;
}

/**
 * Finds the top-level subprocess for a given callActivity node.
 * A top-level subprocess is the first callActivity ancestor that is a direct child of the root process.
 * 
 * @param node - The callActivity node to find the top-level subprocess for
 * @param rootNode - The root process node
 * @returns The top-level subprocess node, or null if not found
 */
function findTopLevelSubprocess(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
): ProcessTreeNode | null {
  // If the node is a direct child of root, it is itself the top-level subprocess
  if (isDirectChildOfRoot(node, rootNode)) {
    return node;
  }

  // Traverse upward to find the first callActivity ancestor that is a direct child of root
  const ancestors = findAncestors(node, rootNode);
  
  // Find the first callActivity in the ancestor chain that is a direct child of root
  for (const ancestor of ancestors) {
    if (ancestor.type === 'callActivity' && isDirectChildOfRoot(ancestor, rootNode)) {
      return ancestor;
    }
  }

  // If no top-level subprocess found, return null
  // This can happen if the tree structure is incomplete or malformed
  return null;
}

/**
 * Checks if a node is a direct child of the root process.
 * 
 * @param node - The node to check
 * @param rootNode - The root process node
 * @returns True if the node is a direct child of root
 */
function isDirectChildOfRoot(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
): boolean {
  return rootNode.children.some((child) => child.id === node.id);
}

/**
 * Finds all ancestors of a node up to (but not including) the root.
 * The ancestors are returned in order from parent to root (excluding root).
 * 
 * @param node - The node to find ancestors for
 * @param rootNode - The root process node
 * @returns Array of ancestor nodes
 */
function findAncestors(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
): ProcessTreeNode[] {
  const ancestors: ProcessTreeNode[] = [];
  
  // Recursive function to traverse up the tree
  function traverseUp(currentNode: ProcessTreeNode, visited: Set<string>): boolean {
    // Prevent infinite loops
    if (visited.has(currentNode.id)) {
      return false;
    }
    visited.add(currentNode.id);

    // If we've reached the root, stop
    if (currentNode.id === rootNode.id) {
      return true;
    }

    // Search for the parent in all nodes
    // We need to search the entire tree to find the parent
    const parent = findParent(currentNode, rootNode);
    
    if (parent) {
      ancestors.push(parent);
      return traverseUp(parent, visited);
    }

    return false;
  }

  traverseUp(node, new Set());
  
  // Reverse to get order from parent to root
  return ancestors.reverse();
}

/**
 * Finds the parent node of a given node in the tree.
 * 
 * @param node - The node to find the parent for
 * @param rootNode - The root of the tree
 * @returns The parent node, or null if not found
 */
function findParent(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
): ProcessTreeNode | null {
  function search(current: ProcessTreeNode): ProcessTreeNode | null {
    // Check if any child matches the target node
    for (const child of current.children) {
      if (child.id === node.id) {
        return current;
      }
      // Recursively search in children
      const found = search(child);
      if (found) {
        return found;
      }
    }
    return null;
  }

  return search(rootNode);
}

/**
 * Builds a parent path array from a node up to (but not including) the root.
 * This is used for backward compatibility with existing path-based logic.
 * 
 * @param node - The node to build the path for
 * @param rootNode - The root process node
 * @returns Array of parent labels (excluding root)
 */
export function buildParentPath(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
): string[] {
  const ancestors = findAncestors(node, rootNode);
  // Filter out the root and return labels
  return ancestors
    .filter((ancestor) => ancestor.id !== rootNode.id)
    .map((ancestor) => ancestor.label)
    .filter(Boolean);
}

