/**
 * Prompt Versioning Utilities
 * 
 * Shared functions for extracting and comparing prompt versions.
 * Used by both scripts and tests to ensure consistency.
 * 
 * CRITICAL: This is production code. Tests MUST import and use these functions,
 * never duplicate the logic.
 */

import * as fs from 'fs';

/**
 * Extracts version from a prompt file.
 * 
 * @param promptPath - Path to the prompt markdown file
 * @returns Version string (e.g., "1.0.0") or auto-generated hash if no version found
 */
export function getPromptVersion(promptPath: string): string | null {
  if (!fs.existsSync(promptPath)) {
    return null;
  }

  const content = fs.readFileSync(promptPath, 'utf-8');
  
  // Search for version in comments or metadata
  const versionMatch = content.match(/version[:\s]+(\d+\.\d+\.\d+|\d+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  // If no version found, use file's modification time as hash
  const stats = fs.statSync(promptPath);
  const hash = stats.mtimeMs.toString(36).slice(-8);
  return `auto-${hash}`;
}

/**
 * Extracts prompt version from an override file.
 * 
 * @param filePath - Path to the override .doc.ts file
 * @returns Version string or null if not found
 */
export function getOverridePromptVersion(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Search for prompt version comment (can be on multiple lines)
  // Match both "PROMPT VERSION:" and "PROMPT_VERSION:"
  const versionMatch = content.match(/PROMPT[_\s-]?VERSION[:\s]+(\d+\.\d+\.\d+|\d+|auto-[a-z0-9]+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  return null;
}

