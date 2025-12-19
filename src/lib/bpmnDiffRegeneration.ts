/**
 * BPMN Diff-based Automatic Regeneration
 * 
 * Automatisk regenerering baserat på diff-resultat.
 * Regenererar automatiskt noder som har ändrats eller lagts till.
 */

import { supabase } from '@/integrations/supabase/client';
import type { BpmnProcessNode } from './bpmn/processGraph';
import { parseBpmnFile, type BpmnParseResult } from './bpmnParser';
import { calculateBpmnDiff, diffResultToDbFormat } from './bpmnDiff';
import type { BpmnMeta } from '@/types/bpmnMeta';

export interface DiffRegenerationConfig {
  /**
   * Automatically regenerate nodes that have been added or modified.
   * Default: true
   */
  autoRegenerateChanges?: boolean;
  
  /**
   * Automatically regenerate nodes that are unchanged but might need updates
   * (e.g., if parent nodes changed). Default: false (conservative approach).
   */
  autoRegenerateUnchanged?: boolean;
  
  /**
   * Automatically regenerate removed nodes (cleanup). Default: false.
   */
  autoRegenerateRemoved?: boolean;
}

/**
 * Get unresolved diffs for a specific file
 */
export async function getUnresolvedDiffsForFile(
  fileName: string
): Promise<Array<{ node_key: string; diff_type: string }>> {
  const { data, error } = await supabase
    .from('bpmn_file_diffs')
    .select('node_key, diff_type')
    .eq('file_name', fileName)
    .is('resolved_at', null);

  if (error) {
    console.error('Error fetching unresolved diffs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all unresolved diffs across all files
 */
export async function getAllUnresolvedDiffs(): Promise<
  Map<string, Set<string>>
> {
  const { data, error } = await supabase
    .from('bpmn_file_diffs')
    .select('file_name, node_key, diff_type')
    .is('resolved_at', null);

  if (error) {
    console.error('Error fetching all unresolved diffs:', error);
    return new Map();
  }

  const fileDiffsMap = new Map<string, Set<string>>();
  for (const diff of data || []) {
    if (!fileDiffsMap.has(diff.file_name)) {
      fileDiffsMap.set(diff.file_name, new Set());
    }
    fileDiffsMap.get(diff.file_name)!.add(diff.node_key);
  }

  return fileDiffsMap;
}

/**
 * Create a node filter function based on unresolved diffs
 * 
 * Returns a function that filters nodes to only include those that:
 * - Have been added (new nodes)
 * - Have been modified (changed nodes)
 * - Are unchanged but should be regenerated (if autoRegenerateUnchanged is true)
 */
export function createDiffBasedNodeFilter(
  unresolvedDiffs: Map<string, Set<string>>,
  config: DiffRegenerationConfig = {}
): (node: BpmnProcessNode) => boolean {
  const {
    autoRegenerateChanges = true,
    autoRegenerateUnchanged = false,
    autoRegenerateRemoved = false,
  } = config;

  return (node: BpmnProcessNode): boolean => {
    if (!node.bpmnFile || !node.bpmnElementId) return false;

    const nodeKey = `${node.bpmnFile}::${node.bpmnElementId}`;
    const fileDiffs = unresolvedDiffs.get(node.bpmnFile);

    if (!fileDiffs) {
      // No diffs for this file - use fallback strategy
      // If autoRegenerateUnchanged is true, regenerate everything
      // Otherwise, only regenerate if we're unsure (conservative: regenerate)
      return autoRegenerateUnchanged;
    }

    // Check if this node has an unresolved diff
    if (fileDiffs.has(nodeKey)) {
      // Get diff details to check type
      // For now, we'll regenerate all nodes with diffs
      // (added, modified, and optionally removed)
      return true;
    }

    // Node doesn't have a diff - use fallback strategy
    // If autoRegenerateUnchanged is true, regenerate everything
    // Otherwise, skip (conservative: don't regenerate unchanged)
    return autoRegenerateUnchanged;
  };
}

/**
 * Mark diffs as resolved after successful regeneration
 */
export async function markDiffsAsResolved(
  fileName: string,
  nodeKeys: string[],
  userId?: string
): Promise<void> {
  if (nodeKeys.length === 0) return;

  const { error } = await supabase
    .from('bpmn_file_diffs')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId || null,
    })
    .eq('file_name', fileName)
    .in('node_key', nodeKeys)
    .is('resolved_at', null);

  if (error) {
    console.error('Error marking diffs as resolved:', error);
    throw error;
  }
}

/**
 * Calculate and save diff for a BPMN file
 * 
 * This should be called when a BPMN file is uploaded or updated.
 */
export async function calculateAndSaveDiff(
  fileName: string,
  newContent: string,
  newMeta: any
): Promise<{
  diffCount: number;
  added: number;
  removed: number;
  modified: number;
}> {
  try {
    // Get file record
    const { data: fileData, error: fileError } = await supabase
      .from('bpmn_files')
      .select('id, previous_version_content, previous_version_meta')
      .eq('file_name', fileName)
      .single();

    if (fileError) {
      console.error('Error fetching file data:', fileError);
      // If file doesn't exist, this is a new file - no diff to calculate
      return { diffCount: 0, added: 0, removed: 0, modified: 0 };
    }

    const bpmnFileId = fileData.id;
    const oldContent = fileData.previous_version_content;
    const oldMeta = fileData.previous_version_meta;

    // If no previous version, this is a new file - mark all nodes as "added"
    if (!oldContent || !oldMeta) {
      // Parse new file to get all nodes
      const newParseResult = await parseBpmnFile(fileName);
      
      // Enrich call activities with mapping information
      const enrichedParseResult = await enrichCallActivitiesWithMapping(newParseResult, fileName);
      
      // Create "added" diffs for all nodes
      const { calculateBpmnDiff, diffResultToDbFormat } = await import('./bpmnDiff');
      const diffResult = {
        added: (await import('./bpmnDiff')).extractNodeSnapshots(enrichedParseResult, fileName),
        removed: [],
        modified: [],
        unchanged: [],
      };

      const dbRows = diffResultToDbFormat(diffResult, bpmnFileId, fileName);
      
      if (dbRows.length > 0) {
        const { error: insertError } = await supabase
          .from('bpmn_file_diffs')
          .insert(dbRows);

        if (insertError) {
          console.error('Error inserting diffs:', insertError);
        }
      }

      // Update previous_version for next time
      await supabase
        .from('bpmn_files')
        .update({
          previous_version_content: newContent,
          previous_version_meta: newMeta,
          last_diff_calculated_at: new Date().toISOString(),
        })
        .eq('id', bpmnFileId);

      return {
        diffCount: dbRows.length,
        added: dbRows.length,
        removed: 0,
        modified: 0,
      };
    }

    // Parse both old and new versions
    // Note: We need to parse from content, not from file
    // For now, we'll use the meta data if available
    // TODO: Parse oldContent if needed

    // For now, if we have oldMeta, use it
    // Otherwise, skip diff calculation (fallback: regenerate all)
    if (!oldMeta) {
      console.warn(`No previous_version_meta for ${fileName}, skipping diff calculation`);
      // Fallback: update previous_version and return (will regenerate all)
      await supabase
        .from('bpmn_files')
        .update({
          previous_version_content: newContent,
          previous_version_meta: newMeta,
          last_diff_calculated_at: new Date().toISOString(),
        })
        .eq('id', bpmnFileId);

      return { diffCount: 0, added: 0, removed: 0, modified: 0 };
    }

    // Parse new version
    const newParseResult = await parseBpmnFile(fileName);
    
    // Enrich call activities with mapping information
    const enrichedNewParseResult = await enrichCallActivitiesWithMapping(newParseResult, fileName);
    
    // For old version, we need to reconstruct from oldMeta
    // Convert BpmnMeta to a minimal BpmnParseResult for diff calculation
    const oldParseResult = convertBpmnMetaToParseResult(oldMeta as BpmnMeta, fileName);

    // Calculate diff
    const { calculateBpmnDiff, diffResultToDbFormat } = await import('./bpmnDiff');
    const diffResult = calculateBpmnDiff(oldParseResult, enrichedNewParseResult, fileName);

    // Save diff to database
    const dbRows = diffResultToDbFormat(diffResult, bpmnFileId, fileName);
    
    if (dbRows.length > 0) {
      // Delete old unresolved diffs for this file (they're now outdated)
      await supabase
        .from('bpmn_file_diffs')
        .delete()
        .eq('file_name', fileName)
        .is('resolved_at', null);

      // Insert new diffs
      const { error: insertError } = await supabase
        .from('bpmn_file_diffs')
        .insert(dbRows);

      if (insertError) {
        console.error('Error inserting diffs:', insertError);
      }
    }

    // Update previous_version for next time
    await supabase
      .from('bpmn_files')
      .update({
        previous_version_content: newContent,
        previous_version_meta: newMeta,
        last_diff_calculated_at: new Date().toISOString(),
      })
      .eq('id', bpmnFileId);

    return {
      diffCount: dbRows.length,
      added: diffResult.added.length,
      removed: diffResult.removed.length,
      modified: diffResult.modified.length,
    };
  } catch (error) {
    console.error('Error calculating diff:', error);
    // Fallback: return empty diff (will regenerate all)
    return { diffCount: 0, added: 0, removed: 0, modified: 0 };
  }
}

/**
 * Convert BpmnMeta to a minimal BpmnParseResult for diff calculation
 * This allows us to compare old metadata (from database) with new parse results
 */
function convertBpmnMetaToParseResult(meta: BpmnMeta, fileName: string): BpmnParseResult {
  // Use processes array if available, otherwise fall back to legacy single-process structure
  const processes = meta.processes || [{
    id: meta.processId,
    name: meta.name,
    callActivities: meta.callActivities,
    tasks: meta.tasks,
  }];

  // Aggregate all call activities and tasks from all processes
  const allCallActivities = processes.flatMap(p => p.callActivities);
  const allTasks = processes.flatMap(p => p.tasks);

  // Convert to BpmnElement format (minimal structure for diff)
  const callActivities = allCallActivities.map(ca => ({
    id: ca.id,
    name: ca.name || ca.id,
    type: 'bpmn:CallActivity' as const,
    businessObject: { calledElement: ca.calledElement } as any,
  }));

  const userTasks = allTasks
    .filter(t => t.type === 'UserTask')
    .map(t => ({
      id: t.id,
      name: t.name || t.id,
      type: 'bpmn:UserTask' as const,
      businessObject: {} as any,
    }));

  const serviceTasks = allTasks
    .filter(t => t.type === 'ServiceTask')
    .map(t => ({
      id: t.id,
      name: t.name || t.id,
      type: 'bpmn:ServiceTask' as const,
      businessObject: {} as any,
    }));

  const businessRuleTasks = allTasks
    .filter(t => t.type === 'BusinessRuleTask')
    .map(t => ({
      id: t.id,
      name: t.name || t.id,
      type: 'bpmn:BusinessRuleTask' as const,
      businessObject: {} as any,
    }));

  return {
    elements: [...callActivities, ...userTasks, ...serviceTasks, ...businessRuleTasks],
    subprocesses: [],
    sequenceFlows: [],
    callActivities,
    serviceTasks,
    userTasks,
    businessRuleTasks,
    fileName,
    meta,
  };
}

/**
 * Enrich call activities with mapping information
 * This adds mapping details to call activities so we can show mapping problems in the diff view
 */
async function enrichCallActivitiesWithMapping(
  parseResult: BpmnParseResult,
  fileName: string
): Promise<BpmnParseResult> {
  // Import mapping utilities
  const { loadBpmnMapFromStorage } = await import('./bpmn/bpmnMapStorage');
  const { matchCallActivityUsingMap } = await import('./bpmn/bpmnMapLoader');
  const { matchCallActivityToProcesses } = await import('./bpmn/SubprocessMatcher');
  const { collectProcessDefinitionsFromMeta } = await import('./bpmn/processDefinition');
  
  // Load bpmn-map
  const bpmnMap = await loadBpmnMapFromStorage();
  
  // Get all process definitions for matching
  const { data: allFiles } = await supabase
    .from('bpmn_files')
    .select('file_name, meta')
    .eq('file_type', 'bpmn');
  
  const allProcessDefs = (allFiles || []).flatMap(file => 
    file.meta ? collectProcessDefinitionsFromMeta(file.file_name, file.meta) : []
  );
  
  // Enrich call activities with mapping info
  const enrichedCallActivities = parseResult.callActivities.map(ca => {
    // Try bpmn-map first
    const mapMatch = matchCallActivityUsingMap(
      { id: ca.id, name: ca.name, calledElement: (ca as any).calledElement },
      fileName,
      bpmnMap
    );
    
    if (mapMatch.matchedFileName) {
      return {
        ...ca,
        mapping: {
          subprocess_bpmn_file: mapMatch.matchedFileName,
          matchStatus: 'matched' as const,
          matchSource: 'bpmn-map' as const,
          calledElement: (ca as any).calledElement,
        },
      };
    }
    
    // Try automatic matching
    const autoMatch = matchCallActivityToProcesses(
      {
        id: ca.id,
        name: ca.name,
        calledElement: (ca as any).calledElement,
      },
      allProcessDefs
    );
    
    return {
      ...ca,
      mapping: {
        subprocess_bpmn_file: autoMatch.matchedFileName || null,
        matchStatus: autoMatch.matchStatus,
        matchSource: autoMatch.matchStatus === 'matched' ? 'automatic' : 'none',
        diagnostics: autoMatch.diagnostics || [],
        calledElement: (ca as any).calledElement,
      },
    };
  });
  
  return {
    ...parseResult,
    callActivities: enrichedCallActivities,
  };
}

