/**
 * BPMN File Diff Utilities
 * 
 * Compares two versions of BPMN files to identify:
 * - Added nodes (new nodes in new version)
 * - Removed nodes (nodes deleted in new version)
 * - Modified nodes (nodes that changed)
 * - Unchanged nodes (nodes that stayed the same)
 */

import type { BpmnParseResult } from './bpmnParser';
import type { BpmnMeta } from '@/types/bpmnMeta';

export interface BpmnNodeSnapshot {
  nodeKey: string; // Format: "bpmnFile::bpmnElementId"
  nodeType: string; // 'callActivity', 'userTask', 'serviceTask', 'businessRuleTask', etc.
  nodeName: string;
  bpmnFile: string;
  bpmnElementId: string;
  metadata: {
    name?: string;
    type?: string;
    calledElement?: string;
    // Add more fields as needed
  };
}

export interface BpmnDiffResult {
  added: BpmnNodeSnapshot[];
  removed: BpmnNodeSnapshot[];
  modified: Array<{
    node: BpmnNodeSnapshot;
    oldNode: BpmnNodeSnapshot;
    changes: Record<string, { old: any; new: any }>;
  }>;
  unchanged: BpmnNodeSnapshot[];
}

/**
 * Extract node snapshots from BPMN parse result
 */
export function extractNodeSnapshots(
  parseResult: BpmnParseResult,
  fileName: string
): BpmnNodeSnapshot[] {
  const snapshots: BpmnNodeSnapshot[] = [];

  // Extract call activities with mapping information
  for (const ca of parseResult.callActivities) {
    // Try to get mapping information from metadata if available
    const mappingInfo = (ca as any).mapping || (ca as any).subprocessLink || null;
    
    snapshots.push({
      nodeKey: `${fileName}::${ca.id}`,
      nodeType: 'callActivity',
      nodeName: ca.name || ca.id,
      bpmnFile: fileName,
      bpmnElementId: ca.id,
      metadata: {
        name: ca.name,
        type: 'callActivity',
        calledElement: (ca as any).calledElement,
        mapping: mappingInfo ? {
          subprocess_bpmn_file: mappingInfo.matchedFileName || mappingInfo.subprocess_bpmn_file || null,
          matchStatus: mappingInfo.matchStatus || (mappingInfo.matchedFileName ? 'matched' : 'unresolved'),
          matchSource: mappingInfo.matchSource || 'none',
          diagnostics: mappingInfo.diagnostics || [],
          calledElement: (ca as any).calledElement,
        } : null,
      },
    });
  }

  // Extract user tasks
  for (const ut of parseResult.userTasks) {
    snapshots.push({
      nodeKey: `${fileName}::${ut.id}`,
      nodeType: 'userTask',
      nodeName: ut.name || ut.id,
      bpmnFile: fileName,
      bpmnElementId: ut.id,
      metadata: {
        name: ut.name,
        type: 'userTask',
      },
    });
  }

  // Extract service tasks
  for (const st of parseResult.serviceTasks) {
    snapshots.push({
      nodeKey: `${fileName}::${st.id}`,
      nodeType: 'serviceTask',
      nodeName: st.name || st.id,
      bpmnFile: fileName,
      bpmnElementId: st.id,
      metadata: {
        name: st.name,
        type: 'serviceTask',
      },
    });
  }

  // Extract business rule tasks
  for (const brt of parseResult.businessRuleTasks) {
    snapshots.push({
      nodeKey: `${fileName}::${brt.id}`,
      nodeType: 'businessRuleTask',
      nodeName: brt.name || brt.id,
      bpmnFile: fileName,
      bpmnElementId: brt.id,
      metadata: {
        name: brt.name,
        type: 'businessRuleTask',
      },
    });
  }

  return snapshots;
}

/**
 * Compare two node snapshots to detect changes
 */
function compareNodes(
  oldNode: BpmnNodeSnapshot,
  newNode: BpmnNodeSnapshot
): Record<string, { old: any; new: any }> | null {
  const changes: Record<string, { old: any; new: any }> = {};
  let hasChanges = false;

  // Compare name
  if (oldNode.nodeName !== newNode.nodeName) {
    changes.name = { old: oldNode.nodeName, new: newNode.nodeName };
    hasChanges = true;
  }

  // Compare type
  if (oldNode.nodeType !== newNode.nodeType) {
    changes.type = { old: oldNode.nodeType, new: newNode.nodeType };
    hasChanges = true;
  }

  // Compare metadata fields
  const allKeys = new Set([
    ...Object.keys(oldNode.metadata),
    ...Object.keys(newNode.metadata),
  ]);

  for (const key of allKeys) {
    const oldValue = oldNode.metadata[key as keyof typeof oldNode.metadata];
    const newValue = newNode.metadata[key as keyof typeof newNode.metadata];
    
    if (oldValue !== newValue) {
      changes[key] = { old: oldValue, new: newValue };
      hasChanges = true;
    }
  }

  return hasChanges ? changes : null;
}

/**
 * Calculate diff between two BPMN parse results
 */
export function calculateBpmnDiff(
  oldParseResult: BpmnParseResult | null,
  newParseResult: BpmnParseResult,
  fileName: string
): BpmnDiffResult {
  const oldSnapshots = oldParseResult
    ? extractNodeSnapshots(oldParseResult, fileName)
    : [];
  const newSnapshots = extractNodeSnapshots(newParseResult, fileName);

  const oldMap = new Map(oldSnapshots.map((s) => [s.nodeKey, s]));
  const newMap = new Map(newSnapshots.map((s) => [s.nodeKey, s]));

  const result: BpmnDiffResult = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  // Find added nodes (in new but not in old)
  for (const newNode of newSnapshots) {
    if (!oldMap.has(newNode.nodeKey)) {
      result.added.push(newNode);
    }
  }

  // Find removed nodes (in old but not in new)
  for (const oldNode of oldSnapshots) {
    if (!newMap.has(oldNode.nodeKey)) {
      result.removed.push(oldNode);
    }
  }

  // Find modified and unchanged nodes
  for (const newNode of newSnapshots) {
    const oldNode = oldMap.get(newNode.nodeKey);
    if (oldNode) {
      const changes = compareNodes(oldNode, newNode);
      if (changes) {
        result.modified.push({
          node: newNode,
          oldNode,
          changes,
        });
      } else {
        result.unchanged.push(newNode);
      }
    }
  }

  return result;
}

/**
 * Convert diff result to database format
 */
export function diffResultToDbFormat(
  diffResult: BpmnDiffResult,
  bpmnFileId: string,
  fileName: string,
  fromVersionHash?: string | null,
  toVersionHash?: string | null,
  fromVersionNumber?: number | null,
  toVersionNumber?: number | null
): Array<{
  bpmn_file_id: string;
  file_name: string;
  diff_type: 'added' | 'removed' | 'modified' | 'unchanged';
  node_key: string;
  node_type: string;
  node_name: string | null;
  old_content: any;
  new_content: any;
  diff_details: any;
  from_version_hash?: string | null;
  to_version_hash?: string | null;
  from_version_number?: number | null;
  to_version_number?: number | null;
}> {
  const dbRows: Array<{
    bpmn_file_id: string;
    file_name: string;
    diff_type: 'added' | 'removed' | 'modified' | 'unchanged';
    node_key: string;
    node_type: string;
    node_name: string | null;
    old_content: any;
    new_content: any;
    diff_details: any;
    from_version_hash?: string | null;
    to_version_hash?: string | null;
    from_version_number?: number | null;
    to_version_number?: number | null;
  }> = [];

  // Added nodes
  for (const node of diffResult.added) {
    dbRows.push({
      bpmn_file_id: bpmnFileId,
      file_name: fileName,
      diff_type: 'added',
      node_key: node.nodeKey,
      node_type: node.nodeType,
      node_name: node.nodeName,
      old_content: null,
      new_content: node.metadata,
      diff_details: null,
      from_version_hash: fromVersionHash || null,
      to_version_hash: toVersionHash || null,
      from_version_number: fromVersionNumber || null,
      to_version_number: toVersionNumber || null,
    });
  }

  // Removed nodes
  for (const node of diffResult.removed) {
    dbRows.push({
      bpmn_file_id: bpmnFileId,
      file_name: fileName,
      diff_type: 'removed',
      node_key: node.nodeKey,
      node_type: node.nodeType,
      node_name: node.nodeName,
      old_content: node.metadata,
      new_content: null,
      diff_details: null,
      from_version_hash: fromVersionHash || null,
      to_version_hash: toVersionHash || null,
      from_version_number: fromVersionNumber || null,
      to_version_number: toVersionNumber || null,
    });
  }

  // Modified nodes
  for (const { node, oldNode, changes } of diffResult.modified) {
    dbRows.push({
      bpmn_file_id: bpmnFileId,
      file_name: fileName,
      diff_type: 'modified',
      node_key: node.nodeKey,
      node_type: node.nodeType,
      node_name: node.nodeName,
      old_content: oldNode.metadata,
      new_content: node.metadata,
      diff_details: changes,
      from_version_hash: fromVersionHash || null,
      to_version_hash: toVersionHash || null,
      from_version_number: fromVersionNumber || null,
      to_version_number: toVersionNumber || null,
    });
  }

  // Unchanged nodes (optional - we might not want to store these)
  // for (const node of diffResult.unchanged) {
  //   dbRows.push({
  //     bpmn_file_id: bpmnFileId,
  //     file_name: fileName,
  //     diff_type: 'unchanged',
  //     node_key: node.nodeKey,
  //     node_type: node.nodeType,
  //     node_name: node.nodeName,
  //     old_content: node.metadata,
  //     new_content: node.metadata,
  //     diff_details: null,
  //   });
  // }

  return dbRows;
}


