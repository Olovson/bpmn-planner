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
 * Builds Jira name for a node using the full path from root to the node.
 * 
 * Uses the same logic as buildParentPath - builds the complete path from root
 * to the node (excluding root), then joins with " - " separator.
 * 
 * For all node types (CallActivity, UserTask, ServiceTask, BusinessRuleTask):
 * - Full path from root to node (excluding root process name)
 * - Format: <parent1> - <parent2> - ... - <node.name>
 * 
 * @param node - The node to generate a Jira name for
 * @param rootNode - The root process node (type === 'Process')
 * @param parentPath - Optional parent path array (for backward compatibility, not used)
 * @returns The Jira name string
 */
export function buildJiraName(
  node: HierarchyNode,
  rootNode: HierarchyNode,
  parentPath: string[] = [],
): string {
  // Build full path from root to node (excluding root)
  const fullPath = buildParentPath(node, rootNode);
  
  // Add the node's own name
  const jiraName = [...fullPath, node.name].join(' - ');
  
  return jiraName || node.name;
}

/**
 * Builds a parent path array from a node up to (but not including) the root.
 * This is used to build the full path for Jira naming.
 * 
 * @param node - The node to build the path for
 * @param rootNode - The root process node
 * @returns Array of parent labels (excluding root)
 */
function buildParentPath(
  node: HierarchyNode,
  rootNode: HierarchyNode,
): string[] {
  const ancestors = findAncestors(node, rootNode);
  // Filter out the root and return names
  return ancestors
    .filter((ancestor) => ancestor.id !== rootNode.id)
    .map((ancestor) => ancestor.name)
    .filter(Boolean);
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

