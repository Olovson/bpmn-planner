import type { ProcessTreeNode, ProcessNodeType } from '@/lib/processTree';

/**
 * Builds Jira name for a node using the full path from root to the node.
 * 
 * Uses the same logic as buildParentPath - builds the complete path from root
 * to the node (excluding root), then joins with " - " separator.
 * 
 * For all node types (callActivity, userTask, serviceTask, businessRuleTask):
 * - Full path from root to node (excluding root process name)
 * - Format: <parent1> - <parent2> - ... - <node.label>
 * 
 * @param node - The node to generate a Jira name for
 * @param rootNode - The root process node (type === 'process')
 * @param parentPath - Optional parent path array (for backward compatibility, not used)
 * @returns The Jira name string
 */
export function buildJiraName(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
  parentPath: string[] = [],
): string {
  // Build full path from root to node (excluding root)
  const fullPath = buildParentPath(node, rootNode);
  
  // Add the node's own label
  const jiraName = [...fullPath, node.label].join(' - ');
  
  return jiraName || node.label;
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

