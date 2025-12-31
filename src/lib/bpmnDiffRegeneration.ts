/**
 * BPMN Diff-based Automatic Regeneration
 * 
 * Automatisk regenerering baserat på diff-resultat.
 * Regenererar automatiskt noder som har ändrats eller lagts till.
 */

import { supabase } from '@/integrations/supabase/client';
import type { BpmnProcessNode } from './bpmn/processGraph';
import { parseBpmnFile, parseBpmnFileContent, type BpmnParseResult } from './bpmnParser';
import { calculateBpmnDiff, diffResultToDbFormat, type BpmnNodeSnapshot, type BpmnDiffResult } from './bpmnDiff';
import type { BpmnMeta } from '@/types/bpmnMeta';
import { 
  calculateContentHash, 
  getCurrentVersion, 
  getPreviousVersion,
  createOrGetVersion 
} from './bpmnVersioning';
import { getNodeDocStoragePath, getFeatureGoalDocStoragePaths } from './artifactUrls';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import { buildDocStoragePaths } from './artifactPaths';
import { getCurrentVersionHash } from './bpmnVersioning';

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
      .select('id')
      .eq('file_name', fileName)
      .single();

    if (fileError) {
      console.error('Error fetching file data:', fileError);
      // If file doesn't exist, this is a new file - no diff to calculate
      return { diffCount: 0, added: 0, removed: 0, modified: 0 };
    }

    const bpmnFileId = fileData.id;

    // Calculate hash for new content
    const newContentHash = await calculateContentHash(newContent);

    // Get current version (if any)
    const currentVersion = await getCurrentVersion(fileName);
    const previousVersion = currentVersion ? await getPreviousVersion(fileName) : null;

    // Create or get version for new content
    const { version: newVersion, isNew } = await createOrGetVersion(
      bpmnFileId,
      fileName,
      newContent,
      newMeta
    );

    // If this is not a new version (same content), no diff to calculate
    if (!isNew) {
      return { diffCount: 0, added: 0, removed: 0, modified: 0 };
    }

    // If no previous version, this is a new file - mark all nodes as "added"
    if (!currentVersion || !previousVersion) {
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

      const dbRows = diffResultToDbFormat(
        diffResult, 
        bpmnFileId, 
        fileName,
        null, // from_version_hash (no previous version)
        newVersion.content_hash, // to_version_hash
        null, // from_version_number
        newVersion.version_number // to_version_number
      );
      
      if (dbRows.length > 0) {
        const { error: insertError } = await supabase
          .from('bpmn_file_diffs')
          .insert(dbRows);

        if (insertError) {
          console.error('Error inserting diffs:', insertError);
        }
      }

      return {
        diffCount: dbRows.length,
        added: dbRows.length,
        removed: 0,
        modified: 0,
      };
    }

    // We have a previous version - calculate diff between versions
    const oldMeta = previousVersion.meta;
    const oldContent = previousVersion.content;

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

    // Save diff to database with version information
    const dbRows = diffResultToDbFormat(
      diffResult, 
      bpmnFileId, 
      fileName,
      previousVersion.content_hash, // from_version_hash
      newVersion.content_hash, // to_version_hash
      previousVersion.version_number, // from_version_number
      newVersion.version_number // to_version_number
    );
    
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

    // After saving diffs, detect cascade effects and cleanup removed nodes
    if (dbRows.length > 0) {
      try {
        // Detect cascade effects: if subprocess file changed, mark call activities as modified
        await detectCascadeDiffs(fileName, diffResult);
        
        // Cleanup removed nodes: delete documentation for removed nodes
        if (diffResult.removed.length > 0) {
          await cleanupRemovedNodes(diffResult.removed);
        }
      } catch (cascadeError) {
        // Don't fail the entire diff calculation if cascade detection or cleanup fails
        console.error('[bpmnDiffRegeneration] Error in post-diff processing:', cascadeError);
      }
    }

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

  // Note: Process nodes are not added to elements array
  // They are extracted from meta.processes in extractNodeSnapshots()
  // The meta object is preserved below so extractNodeSnapshots() can find them

  return {
    elements: [...callActivities, ...userTasks, ...serviceTasks, ...businessRuleTasks],
    subprocesses: [],
    sequenceFlows: [],
    callActivities,
    serviceTasks,
    userTasks,
    businessRuleTasks,
    fileName,
    meta, // meta.processes contains process nodes for extractNodeSnapshots()
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
  const { loadBpmnMapFromStorageSimple } = await import('./bpmn/bpmnMapStorage');
  const bpmnMap = await loadBpmnMapFromStorageSimple();
  
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

/**
 * Detect cascade effects: when a subprocess file changes, mark all call activities
 * that point to it as modified
 * 
 * This ensures that when a subprocess is updated, all Feature Goals that reference it
 * are also regenerated.
 */
async function detectCascadeDiffs(
  changedFileName: string,
  diffResult: import('./bpmnDiff').BpmnDiffResult
): Promise<void> {
  // Check if the changed file is a subprocess file (has a process node that changed)
  const hasProcessNodeChange = diffResult.added.some(n => n.nodeType === 'process') ||
                               diffResult.modified.some(m => m.node.nodeType === 'process') ||
                               diffResult.removed.some(n => n.nodeType === 'process');
  
  // Also check if any nodes changed (process nodes or other nodes in subprocess files)
  const hasAnyChange = diffResult.added.length > 0 || 
                       diffResult.modified.length > 0 || 
                       diffResult.removed.length > 0;

  // If no changes, no cascade effects
  if (!hasAnyChange) {
    return;
  }

  // Get all BPMN files to find call activities that point to the changed file
  const { data: allFiles, error: filesError } = await supabase
    .from('bpmn_files')
    .select('file_name, meta')
    .eq('file_type', 'bpmn')
    .neq('file_name', changedFileName); // Exclude the changed file itself

  if (filesError || !allFiles) {
    console.error('[detectCascadeDiffs] Error fetching BPMN files:', filesError);
    return;
  }

  // Find all call activities that point to the changed file
  const affectedCallActivities: Array<{ file: string; elementId: string }> = [];

  for (const file of allFiles) {
    const meta = file.meta as BpmnMeta | null;
    if (!meta) continue;

    // Use processes array if available, otherwise fall back to legacy structure
    const processes = meta.processes || [{
      id: meta.processId,
      name: meta.name,
      callActivities: meta.callActivities,
      tasks: meta.tasks,
    }];

    // Check all call activities in all processes
    for (const proc of processes) {
      for (const ca of proc.callActivities || []) {
        // Check if this call activity points to the changed file
        // We need to check both bpmn-map.json mappings and automatic matches
        // For now, we'll check the metadata that was enriched during diff calculation
        
        // Try to match using bpmn-map.json or automatic matching
        // This is a simplified check - in a full implementation, we'd use the same
        // matching logic as enrichCallActivitiesWithMapping()
        const { loadBpmnMapFromStorageSimple } = await import('./bpmn/bpmnMapStorage');
        const bpmnMap = await loadBpmnMapFromStorageSimple();
        
        if (bpmnMap) {
          const { matchCallActivityUsingMap } = await import('./bpmn/bpmnMapLoader');
          const mapMatch = matchCallActivityUsingMap(
            { id: ca.id, name: ca.name, calledElement: ca.calledElement },
            file.file_name,
            bpmnMap
          );
          
          if (mapMatch.matchedFileName === changedFileName) {
            affectedCallActivities.push({
              file: file.file_name,
              elementId: ca.id,
            });
            continue;
          }
        }

        // Also check automatic matching (by process ID or file name)
        // This is a simplified check - full implementation would use SubprocessMatcher
        const fileBaseName = changedFileName.replace('.bpmn', '');
        if (ca.calledElement && (
          ca.calledElement === fileBaseName ||
          ca.calledElement.includes(fileBaseName) ||
          fileBaseName.includes(ca.calledElement)
        )) {
          affectedCallActivities.push({
            file: file.file_name,
            elementId: ca.id,
          });
        }
      }
    }
  }

  // If we found affected call activities, mark them as modified in the diff table
  if (affectedCallActivities.length > 0) {
    // Get file IDs for affected files
    const affectedFileNames = [...new Set(affectedCallActivities.map(ca => ca.file))];
    const { data: affectedFileData, error: fileDataError } = await supabase
      .from('bpmn_files')
      .select('id, file_name')
      .in('file_name', affectedFileNames);

    if (fileDataError || !affectedFileData) {
      console.error('[detectCascadeDiffs] Error fetching affected file data:', fileDataError);
      return;
    }

    const fileIdMap = new Map(affectedFileData.map(f => [f.file_name, f.id]));

    // Create modified diff entries for affected call activities
    const cascadeDiffRows: Array<{
      bpmn_file_id: string;
      file_name: string;
      diff_type: 'modified';
      node_key: string;
      node_type: string;
      node_name: string | null;
      old_content: any;
      new_content: any;
      diff_details: any;
    }> = [];

    for (const ca of affectedCallActivities) {
      const fileId = fileIdMap.get(ca.file);
      if (!fileId) continue;

      const nodeKey = `${ca.file}::${ca.elementId}`;
      
      // Check if this call activity already has an unresolved diff
      const { data: existingDiff } = await supabase
        .from('bpmn_file_diffs')
        .select('id')
        .eq('file_name', ca.file)
        .eq('node_key', nodeKey)
        .is('resolved_at', null)
        .single();

      // If it already has a diff, skip (don't create duplicate)
      if (existingDiff) continue;

      // Create a modified diff entry
      cascadeDiffRows.push({
        bpmn_file_id: fileId,
        file_name: ca.file,
        diff_type: 'modified',
        node_key: nodeKey,
        node_type: 'callActivity',
        node_name: ca.elementId,
        old_content: { cascade: true, reason: `Subprocess ${changedFileName} changed` },
        new_content: { cascade: true, reason: `Subprocess ${changedFileName} changed` },
        diff_details: {
          cascade: true,
          changedSubprocessFile: changedFileName,
          reason: 'Cascade effect: subprocess file changed',
        },
      });
    }

    // Insert cascade diff entries
    if (cascadeDiffRows.length > 0) {
      const { error: insertError } = await supabase
        .from('bpmn_file_diffs')
        .insert(cascadeDiffRows);

      if (insertError) {
        console.error('[detectCascadeDiffs] Error inserting cascade diffs:', insertError);
      } else {
        console.log(`[detectCascadeDiffs] Marked ${cascadeDiffRows.length} call activities as modified due to cascade effect from ${changedFileName}`);
      }
    }
  }
}

/**
 * Cleanup removed nodes: delete documentation files from Storage when nodes are removed
 * 
 * This ensures that when a node is removed from a BPMN file, its documentation
 * is also removed from Storage to avoid dead links and confusion.
 */
async function cleanupRemovedNodes(removedNodes: BpmnNodeSnapshot[]): Promise<void> {
  if (removedNodes.length === 0) {
    return;
  }

  const filesToDelete: string[] = [];

  for (const node of removedNodes) {
    try {
      // Build storage paths based on node type
      if (node.nodeType === 'callActivity') {
        // For call activities, use Feature Goal paths
        // We need to determine the subprocess file and parent file from metadata
        const subprocessFile = node.metadata.mapping?.subprocess_bpmn_file || 
                               node.metadata.calledElement?.replace('.bpmn', '') + '.bpmn' ||
                               node.bpmnFile; // Fallback to same file
        
        // Try to find parent file (where call activity is defined)
        // For now, assume parent is the file where the call activity is defined
        const parentFile = node.bpmnFile;
        
        // Get version hash for subprocess file
        const versionHash = await getCurrentVersionHash(subprocessFile);
        
        // Get all possible Feature Goal paths
        const featureGoalPaths = getFeatureGoalDocStoragePaths(
          subprocessFile,
          node.bpmnElementId,
          parentFile,
          versionHash,
          subprocessFile
        );
        
        filesToDelete.push(...featureGoalPaths);
      } else if (node.nodeType === 'process') {
        // For process nodes, use file-level documentation paths
        // File-level docs use {bpmnFile}.html format
        // Process Feature Goals genereras INTE längre (ersatta av file-level docs)
        const bpmnFile = node.bpmnFile;
        if (bpmnFile) {
          const docFileName = `${bpmnFile}.html`;
          const versionHash = await getCurrentVersionHash(bpmnFile);
          
          if (versionHash) {
            filesToDelete.push(`docs/claude/${bpmnFile}/${versionHash}/${docFileName}`);
          }
          filesToDelete.push(`docs/claude/${docFileName}`);
        }
      } else {
        // Get version hash (required)
        const versionHash = await getCurrentVersionHash(node.bpmnFile);
        
        if (!versionHash) {
          console.warn(`[bpmnDiffRegeneration] No version hash found for ${node.bpmnFile}, skipping`);
          continue;
        }
        
        // Get storage path using unified approach
        const docPath = await getNodeDocStoragePath(node.bpmnFile, node.bpmnElementId, versionHash);
        filesToDelete.push(docPath);
      }
    } catch (error) {
      console.error(`[cleanupRemovedNodes] Error building paths for node ${node.nodeKey}:`, error);
      // Continue with other nodes even if one fails
    }
  }

  // Remove duplicates
  const uniqueFilesToDelete = [...new Set(filesToDelete)];

  // Delete files from Storage
  if (uniqueFilesToDelete.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from('bpmn-files')
      .remove(uniqueFilesToDelete);

    if (deleteError) {
      console.error('[cleanupRemovedNodes] Error deleting files from Storage:', deleteError);
    } else {
      console.log(`[cleanupRemovedNodes] Deleted ${uniqueFilesToDelete.length} documentation files for removed nodes`);
    }
  }
}

/**
 * Calculate diff for a local file (READ-ONLY - does NOT save to database)
 * Used for folder analysis to preview changes before uploading
 * 
 * ⚠️ SECURITY: This function is READ-ONLY. It does NOT:
 * - Write to database
 * - Upload files
 * - Modify existing files
 * - Save diffs
 * 
 * It only reads existing data for comparison.
 */
export async function calculateDiffForLocalFile(
  fileName: string,
  localContent: string,
  localMeta?: BpmnMeta
): Promise<BpmnDiffResult | null> {
  try {
    // Parse local file
    const localParseResult = await parseBpmnFileContent(localContent, fileName);
    
    // Enrich call activities with mapping information
    const enrichedLocalParseResult = await enrichCallActivitiesWithMapping(
      localParseResult,
      fileName
    );

    // Try to get existing version from bpmn_file_versions first
    let currentVersion = await getCurrentVersion(fileName);
    
    // If no version in bpmn_file_versions, check if file exists in bpmn_files
    // and use its metadata directly
    if (!currentVersion) {
      const { data: fileData, error: fileError } = await supabase
        .from('bpmn_files')
        .select('meta, current_version_hash')
        .eq('file_name', fileName)
        .maybeSingle();
      
      if (!fileError && fileData && fileData.meta) {
        // File exists but no version record - create a temporary version object
        // This allows us to compare against existing metadata
        currentVersion = {
          file_name: fileName,
          content_hash: fileData.current_version_hash || '',
          version_number: 1,
          is_current: true,
          meta: fileData.meta,
          content: '', // We don't need content for comparison, only meta
        } as any;
      }
    }
    
    if (!currentVersion || !currentVersion.meta) {
      // New file or no metadata - all nodes are "added"
      const { extractNodeSnapshots } = await import('./bpmnDiff');
      return {
        added: extractNodeSnapshots(enrichedLocalParseResult, fileName),
        removed: [],
        modified: [],
        unchanged: [],
      };
    }

    // Compare against existing version
    const oldMeta = currentVersion.meta as BpmnMeta;
    const oldParseResult = convertBpmnMetaToParseResult(oldMeta, fileName);
    
    // Calculate diff
    return calculateBpmnDiff(oldParseResult, enrichedLocalParseResult, fileName);
  } catch (error) {
    console.error(`[calculateDiffForLocalFile] Error calculating diff for ${fileName}:`, error);
    return null;
  }
}

/**
 * Analyze folder diff: find all BPMN files in a directory and calculate diffs
 * 
 * @param directoryHandle - FileSystemDirectoryHandle from showDirectoryPicker()
 * @param options - Options for analysis
 * @returns Analysis result with diffs for all files
 */
export interface FolderDiffResult {
  files: Array<{
    fileName: string;
    filePath: string;
    content: string;
    parseResult: BpmnParseResult;
    diffResult: BpmnDiffResult | null; // null if file doesn't exist in system or error
    hasChanges: boolean;
    summary: {
      added: number;
      removed: number;
      modified: number;
      unchanged: number;
    };
    error?: string;
    fileHandle?: FileSystemFileHandle; // Store file handle for upload
  }>;
  totalFiles: number;
  totalChanges: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

export async function analyzeFolderDiff(
  directoryHandle: FileSystemDirectoryHandle,
  options?: {
    recursive?: boolean; // Default: true
    onProgress?: (current: number, total: number, fileName: string) => void;
  }
): Promise<FolderDiffResult> {
  const { findBpmnFilesInDirectory, readFileContent } = await import('./fileSystemUtils');
  
  // Find all BPMN files
  const bpmnFiles = await findBpmnFilesInDirectory(
    directoryHandle,
    options?.recursive !== false
  );

  const files: FolderDiffResult['files'] = [];
  let totalAdded = 0;
  let totalRemoved = 0;
  let totalModified = 0;
  let totalUnchanged = 0;

  // Process each file
  for (let i = 0; i < bpmnFiles.length; i++) {
    const file = bpmnFiles[i];
    options?.onProgress?.(i + 1, bpmnFiles.length, file.fileName);

    try {
      // Read file content
      const content = await readFileContent(file.handle);

      // Parse BPMN
      const parseResult = await parseBpmnFileContent(content, file.fileName);

      // Calculate diff
      const diffResult = await calculateDiffForLocalFile(
        file.fileName,
        content,
        parseResult.meta
      );

      if (diffResult) {
        const summary = {
          added: diffResult.added.length,
          removed: diffResult.removed.length,
          modified: diffResult.modified.length,
          unchanged: diffResult.unchanged.length,
        };

        const hasChanges = summary.added > 0 || summary.removed > 0 || summary.modified > 0;

        totalAdded += summary.added;
        totalRemoved += summary.removed;
        totalModified += summary.modified;
        totalUnchanged += summary.unchanged;

        files.push({
          fileName: file.fileName,
          filePath: file.filePath,
          content,
          parseResult,
          diffResult,
          hasChanges,
          summary,
          fileHandle: file.handle, // Store file handle for upload
        });
      } else {
        // Error calculating diff
        files.push({
          fileName: file.fileName,
          filePath: file.filePath,
          content,
          parseResult,
          diffResult: null,
          hasChanges: false,
          summary: { added: 0, removed: 0, modified: 0, unchanged: 0 },
          error: 'Failed to calculate diff',
          fileHandle: file.handle, // Store file handle even on error
        });
      }
    } catch (error) {
      console.error(`[analyzeFolderDiff] Error processing ${file.fileName}:`, error);
      files.push({
        fileName: file.fileName,
        filePath: file.filePath,
        content: '',
        parseResult: {} as BpmnParseResult,
        diffResult: null,
        hasChanges: false,
        summary: { added: 0, removed: 0, modified: 0, unchanged: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    files,
    totalFiles: bpmnFiles.length,
    totalChanges: {
      added: totalAdded,
      removed: totalRemoved,
      modified: totalModified,
      unchanged: totalUnchanged,
    },
  };
}

