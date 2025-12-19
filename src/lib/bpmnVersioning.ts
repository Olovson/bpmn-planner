/**
 * BPMN File Versioning Utilities
 * 
 * Content-based versioning using SHA-256 hashing.
 * Each unique BPMN content gets a hash, enabling deduplication and full history.
 */

import { supabase } from '@/integrations/supabase/client';

export interface BpmnFileVersion {
  id: string;
  bpmn_file_id: string;
  file_name: string;
  content_hash: string;
  content: string;
  meta: any;
  uploaded_at: string;
  uploaded_by: string | null;
  is_current: boolean;
  version_number: number;
  change_summary: string | null;
  created_at: string;
}

/**
 * Calculate SHA-256 hash of content
 * Works in both browser and Node.js environments
 */
export async function calculateContentHash(content: string): Promise<string> {
  // Normalize content (remove whitespace differences that don't affect meaning)
  const normalized = content.trim().replace(/\s+/g, ' ');
  
  // Use Web Crypto API in browser, or Node.js crypto in Node
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}

/**
 * Get current version hash for a BPMN file
 */
export async function getCurrentVersionHash(fileName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('bpmn_files')
    .select('current_version_hash')
    .eq('file_name', fileName)
    .maybeSingle(); // Use maybeSingle() to avoid 406 when no row found

  if (error || !data) {
    return null;
  }

  return data.current_version_hash || null;
}

/**
 * Get current version for a BPMN file
 */
export async function getCurrentVersion(fileName: string): Promise<BpmnFileVersion | null> {
  const { data, error } = await supabase
    .from('bpmn_file_versions')
    .select('*')
    .eq('file_name', fileName)
    .eq('is_current', true)
    .maybeSingle(); // Use maybeSingle() to avoid 406 when no row found

  if (error || !data) {
    return null;
  }

  return data as BpmnFileVersion;
}

/**
 * Get all versions for a BPMN file
 */
export async function getAllVersions(fileName: string): Promise<BpmnFileVersion[]> {
  const { data, error } = await supabase
    .from('bpmn_file_versions')
    .select('*')
    .eq('file_name', fileName)
    .order('version_number', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as BpmnFileVersion[];
}

/**
 * Get version by hash
 */
export async function getVersionByHash(fileName: string, hash: string): Promise<BpmnFileVersion | null> {
  const { data, error } = await supabase
    .from('bpmn_file_versions')
    .select('*')
    .eq('file_name', fileName)
    .eq('content_hash', hash)
    .maybeSingle(); // Use maybeSingle() to avoid 406 when no row found

  if (error || !data) {
    return null;
  }

  return data as BpmnFileVersion;
}

/**
 * Create or get existing version for a BPMN file
 * Returns the version (existing or newly created) and whether it's a new version
 */
export async function createOrGetVersion(
  bpmnFileId: string,
  fileName: string,
  content: string,
  meta: any,
  uploadedBy?: string,
  changeSummary?: string
): Promise<{ version: BpmnFileVersion; isNew: boolean }> {
  // Calculate hash
  const contentHash = await calculateContentHash(content);

  // Check if this version already exists
  const existingVersion = await getVersionByHash(fileName, contentHash);
  if (existingVersion) {
    // Version already exists - return it
    return { version: existingVersion, isNew: false };
  }

  // Get current version to determine next version number
  const currentVersion = await getCurrentVersion(fileName);
  const nextVersionNumber = currentVersion ? currentVersion.version_number + 1 : 1;

  // Create new version
  const { data, error } = await supabase
    .from('bpmn_file_versions')
    .insert({
      bpmn_file_id: bpmnFileId,
      file_name: fileName,
      content_hash: contentHash,
      content: content,
      meta: meta,
      uploaded_by: uploadedBy || null,
      is_current: true, // Trigger will handle setting previous version to false
      version_number: nextVersionNumber,
      change_summary: changeSummary || null,
    })
    .select()
    .single(); // INSERT should always return exactly one row

  if (error) {
    throw new Error(`Failed to create version: ${error.message}`);
  }

  return { version: data as BpmnFileVersion, isNew: true };
}

/**
 * Set a specific version as current
 */
export async function setVersionAsCurrent(
  fileName: string,
  versionHash: string
): Promise<void> {
  // First, unset all current versions for this file
  const { error: unsetError } = await supabase
    .from('bpmn_file_versions')
    .update({ is_current: false })
    .eq('file_name', fileName)
    .eq('is_current', true);

  if (unsetError) {
    throw new Error(`Failed to unset current versions: ${unsetError.message}`);
  }

  // Set the specified version as current
  const { error: setError } = await supabase
    .from('bpmn_file_versions')
    .update({ is_current: true })
    .eq('file_name', fileName)
    .eq('content_hash', versionHash);

  if (setError) {
    throw new Error(`Failed to set version as current: ${setError.message}`);
  }
}

/**
 * Get previous version (the one before current)
 */
export async function getPreviousVersion(fileName: string): Promise<BpmnFileVersion | null> {
  const currentVersion = await getCurrentVersion(fileName);
  if (!currentVersion) {
    return null;
  }

  // If current version is 1, there's no previous version
  if (currentVersion.version_number <= 1) {
    return null;
  }

  // Get version with version_number one less than current
  const { data, error } = await supabase
    .from('bpmn_file_versions')
    .select('*')
    .eq('file_name', fileName)
    .eq('version_number', currentVersion.version_number - 1)
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 when no row found

  if (error || !data) {
    return null;
  }

  return data as BpmnFileVersion;
}

