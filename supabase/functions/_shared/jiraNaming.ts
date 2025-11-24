/**
 * Deno-compatible Jira naming utility for Edge Functions
 * 
 * This implements the same naming logic as src/lib/jiraNaming.ts
 * but works with HierarchyNode structure used in Edge Functions.
 */

export interface HierarchyNode {
  id: string;
  name: string;
  type: string;
  bpmnFile: string;
  children: HierarchyNode[];
  parentPath: string[];
}

/**
 * Builds Jira name for a node based on the new naming scheme.
 * 
 * For feature goals (CallActivity):
 * - If top-level (direct child of root): <N.name>
 * - If deeper: <T.name> – <N.name> where T is the top-level subprocess ancestor
 * - Root process name is NEVER included
 * 
 * For epics (UserTask, ServiceTask, BusinessRuleTask):
 * - Uses existing path-based naming (full parent path + node name)
 * - Root process name is excluded from the path
 * 
 * @param node - The node to generate a Jira name for
 * @param rootNode - The root process node (type === 'Process')
 * @param parentPath - Optional parent path array (for backward compatibility)
 * @returns The Jira name string
 */
export function buildJiraName(
  node: HierarchyNode,
  rootNode: HierarchyNode,
  parentPath: string[] = [],
): string {
  // For feature goals (CallActivity), use the new naming scheme
  if (node.type === 'CallActivity') {
    return buildFeatureGoalJiraName(node, rootNode);
  }

  // For epics and other node types, use existing path-based naming
  // Exclude root process name from the path
  const pathWithoutRoot = parentPath.filter((label) => label !== rootNode.name);
  const fullPath = [...pathWithoutRoot, node.name];
  return fullPath.filter(Boolean).join(' - ') || node.name;
}

/**
 * Builds Jira name for a feature goal (CallActivity) using the new naming scheme.
 */
function buildFeatureGoalJiraName(
  node: HierarchyNode,
  rootNode: HierarchyNode,
): string {
  // Find the top-level subprocess (first CallActivity ancestor that is a direct child of root)
  const topLevelSubprocess = findTopLevelSubprocess(node, rootNode);

  if (!topLevelSubprocess) {
    // If we can't find a top-level subprocess, just use the node's name
    // This can happen if the tree structure is incomplete
    return node.name;
  }

  // If this node IS the top-level subprocess, return just its name
  if (topLevelSubprocess.id === node.id) {
    return topLevelSubprocess.name;
  }

  // Otherwise, return: <top-level-name> – <node-name>
  return `${topLevelSubprocess.name} – ${node.name}`;
}

/**
 * Finds the top-level subprocess for a given CallActivity node.
 * A top-level subprocess is the first CallActivity ancestor that is a direct child of the root process.
 */
function findTopLevelSubprocess(
  node: HierarchyNode,
  rootNode: HierarchyNode,
): HierarchyNode | null {
  // If the node is a direct child of root, it is itself the top-level subprocess
  if (isDirectChildOfRoot(node, rootNode)) {
    return node;
  }

  // Traverse upward to find the first CallActivity in the ancestor chain that is a direct child of root
  const ancestors = findAncestors(node, rootNode);
  
  // Find the first CallActivity in the ancestor chain that is a direct child of root
  for (const ancestor of ancestors) {
    if (ancestor.type === 'CallActivity' && isDirectChildOfRoot(ancestor, rootNode)) {
      return ancestor;
    }
  }

  // If no top-level subprocess found, return null
  // This can happen if the tree structure is incomplete or malformed
  return null;
}

/**
 * Checks if a node is a direct child of the root process.
 */
function isDirectChildOfRoot(
  node: HierarchyNode,
  rootNode: HierarchyNode,
): boolean {
  return rootNode.children.some((child) => child.id === node.id);
}

/**
 * Finds all ancestors of a node up to (but not including) the root.
 * The ancestors are returned in order from parent to root (excluding root).
 */
function findAncestors(
  node: HierarchyNode,
  rootNode: HierarchyNode,
): HierarchyNode[] {
  const ancestors: HierarchyNode[] = [];
  
  // Recursive function to traverse up the tree
  function traverseUp(currentNode: HierarchyNode, visited: Set<string>): boolean {
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
 */
function findParent(
  node: HierarchyNode,
  rootNode: HierarchyNode,
): HierarchyNode | null {
  function search(current: HierarchyNode): HierarchyNode | null {
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

