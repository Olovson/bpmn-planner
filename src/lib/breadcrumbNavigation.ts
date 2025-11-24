import type { ProcessTreeNode } from '@/lib/processTree';

export interface BreadcrumbItem {
  fileName: string;
  label: string;
  callActivityId?: string;
  callActivityName?: string;
}

interface BpmnHistoryItem {
  fileName: string;
  xml: string;
}

/**
 * Build breadcrumb path from root to target file.
 * Uses navigation history if available, otherwise falls back to process tree.
 */
export function buildBreadcrumbPath(
  processTree: ProcessTreeNode | null,
  targetFileName: string,
  navigationHistory: BpmnHistoryItem[] = [],
): BreadcrumbItem[] {
  if (!processTree) return [];

  // If we have navigation history, use it to build the path
  if (navigationHistory.length > 0) {
    const path: BreadcrumbItem[] = [];
    
    // Add root from process tree
    path.push({
      fileName: processTree.bpmnFile,
      label: processTree.label || processTree.bpmnFile.replace('.bpmn', ''),
    });

    // Add each item from history
    for (const historyItem of navigationHistory) {
      const label = getFileLabel(processTree, historyItem.fileName);
      path.push({
        fileName: historyItem.fileName,
        label,
      });
    }

    // Add current file
    const currentLabel = getFileLabel(processTree, targetFileName);
    path.push({
      fileName: targetFileName,
      label: currentLabel,
    });

    return path;
  }

  // Otherwise, find path in process tree
  return findPathInTree(processTree, targetFileName);
}

/**
 * Find path from root to target file in the process tree
 */
function findPathInTree(
  tree: ProcessTreeNode,
  targetFileName: string,
): BreadcrumbItem[] {
  const path: BreadcrumbItem[] = [];

  // Helper to find the path recursively
  const findPath = (node: ProcessTreeNode, currentPath: BreadcrumbItem[]): boolean => {
    // Check if this node matches the target file
    if (node.bpmnFile === targetFileName) {
      currentPath.push({
        fileName: node.bpmnFile,
        label: node.label || node.bpmnFile.replace('.bpmn', ''),
      });
      return true;
    }

    // Check children (call activities that lead to subprocesses)
    for (const child of node.children) {
      if (child.type === 'callActivity') {
        const link = child.subprocessLink as any;
        const matchedFile: string | undefined =
          child.subprocessFile ||
          (link && typeof link.matchedFileName === 'string' && link.matchedFileName) ||
          undefined;

        if (matchedFile === targetFileName) {
          // Found it directly via this call activity
          currentPath.push({
            fileName: node.bpmnFile,
            label: node.label || node.bpmnFile.replace('.bpmn', ''),
            callActivityId: child.bpmnElementId,
            callActivityName: child.label,
          });
          currentPath.push({
            fileName: matchedFile,
            label: getFileLabelFromTree(tree, matchedFile) || matchedFile.replace('.bpmn', ''),
          });
          return true;
        }

        // Try to find target deeper in this subprocess
        const subprocessNode = findSubprocessNode(tree, matchedFile);
        if (subprocessNode) {
          const subPath = [...currentPath];
          subPath.push({
            fileName: node.bpmnFile,
            label: node.label || node.bpmnFile.replace('.bpmn', ''),
            callActivityId: child.bpmnElementId,
            callActivityName: child.label,
          });

          if (findPath(subprocessNode, subPath)) {
            path.push(...subPath);
            return true;
          }
        }
      }
    }

    return false;
  };

  // Start search from root
  if (findPath(tree, [])) {
    return path;
  }

  // If not found, return at least the root
  return [
    {
      fileName: tree.bpmnFile,
      label: tree.label || tree.bpmnFile.replace('.bpmn', ''),
    },
  ];
}

/**
 * Find a process node by file name in the tree
 */
function findSubprocessNode(
  tree: ProcessTreeNode,
  fileName: string,
): ProcessTreeNode | null {
  if (tree.bpmnFile === fileName && tree.type === 'process') {
    return tree;
  }

  for (const child of tree.children) {
    if (child.type === 'process' && child.bpmnFile === fileName) {
      return child;
    }
    const found = findSubprocessNode(child, fileName);
    if (found) return found;
  }

  return null;
}

/**
 * Get label for a file from the process tree
 */
function getFileLabel(tree: ProcessTreeNode | null, fileName: string): string {
  if (!tree) return fileName.replace('.bpmn', '');
  return getFileLabelFromTree(tree, fileName) || fileName.replace('.bpmn', '');
}

function getFileLabelFromTree(tree: ProcessTreeNode, fileName: string): string | null {
  if (tree.bpmnFile === fileName) {
    return tree.label || fileName.replace('.bpmn', '');
  }

  for (const child of tree.children) {
    if (child.bpmnFile === fileName) {
      return child.label || fileName.replace('.bpmn', '');
    }
    const found = getFileLabelFromTree(child, fileName);
    if (found) return found;
  }

  return null;
}

