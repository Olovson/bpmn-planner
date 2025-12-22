#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Simplified migration script that avoids complex imports
 * This version reads JSON from llm-debug/docs-raw and re-uploads HTML
 * to new per-file paths, but uses a simpler approach that doesn't require
 * importing all the complex rendering modules.
 * 
 * NOTE: This is a temporary workaround. The full migration script should
 * be used once import issues are resolved.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('[Migration] Starting simplified migration...');
console.log('[Migration] This script will:');
console.log('  1. List all JSON files in llm-debug/docs-raw');
console.log('  2. Parse identifiers to extract bpmnFile and elementId');
console.log('  3. Find existing HTML files and re-upload to new paths');
console.log('  4. Use per-file version hashes for storage paths');
console.log('');

// Get version hash for a BPMN file
async function getVersionHash(fileName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('bpmn_files')
    .select('current_version_hash')
    .eq('file_name', fileName)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.current_version_hash || null;
}

// Parse identifier to extract bpmnFile and elementId
function parseIdentifier(identifier: string, allBpmnFiles: string[]): { bpmnFile: string; elementId: string } | null {
  const sanitizeForMatch = (s: string) => 
    s.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  // First, try to match exact bpmnFile names (including .bpmn in identifier)
  // Format: {bpmnFile}-{elementId} where bpmnFile can include .bpmn
  for (const bpmnFile of allBpmnFiles) {
    // Try with .bpmn extension
    if (identifier.startsWith(bpmnFile + '-')) {
      const elementId = identifier.slice(bpmnFile.length + 1);
      return { bpmnFile, elementId };
    }
    
    // Try without .bpmn extension
    const fileBase = bpmnFile.replace('.bpmn', '');
    if (identifier.startsWith(fileBase + '-')) {
      const elementId = identifier.slice(fileBase.length + 1);
      return { bpmnFile, elementId };
    }
    
    // Try sanitized match
    const sanitizedFile = sanitizeForMatch(fileBase);
    if (identifier.startsWith(sanitizedFile + '-')) {
      const elementId = identifier.slice(sanitizedFile.length + 1);
      return { bpmnFile, elementId };
    }
    
    if (identifier === sanitizedFile || identifier === fileBase) {
      return { bpmnFile, elementId: fileBase };
    }
  }
  
  // Fallback patterns
  const mortgageSeMatch = identifier.match(/^mortgage-se-([^-]+(?:-[^-]+)*?)-(.+)$/);
  if (mortgageSeMatch) {
    const [, subprocessPart, elementId] = mortgageSeMatch;
    const possibleFile = `mortgage-se-${subprocessPart}.bpmn`;
    if (allBpmnFiles.includes(possibleFile)) {
      return { bpmnFile: possibleFile, elementId };
    }
  }
  
  if (identifier.startsWith('mortgage-') && allBpmnFiles.includes('mortgage.bpmn')) {
    return { bpmnFile: 'mortgage.bpmn', elementId: identifier.replace('mortgage-', '') };
  }
  
  // Handle mortgage.bpmn-{elementId} format
  if (identifier.startsWith('mortgage.bpmn-')) {
    const elementId = identifier.replace('mortgage.bpmn-', '');
    return { bpmnFile: 'mortgage.bpmn', elementId };
  }
  
  return null;
}

// Build old path (using root file's version hash)
// Epic example: docs/claude/mortgage.bpmn/{hash}/nodes/mortgage-se-appeal/screen-appeal.html
// Feature goal example: docs/claude/mortgage.bpmn/{hash}/feature-goals/mortgage-appeal.html
function buildOldPath(
  bpmnFile: string,
  elementId: string,
  rootVersionHash: string | null,
  docType: 'epic' | 'feature' | 'businessRule'
): string[] {
  const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
  const safeElementId = sanitize(elementId);
  const rootFile = 'mortgage.bpmn'; // Root file used for old paths
  const bpmnFileBase = bpmnFile.replace('.bpmn', '');
  
  const paths: string[] = [];
  
  if (docType === 'feature') {
    // Old feature goals: docs/claude/mortgage.bpmn/{rootHash}/feature-goals/{name}.html
    // Based on actual storage: appeal.html, application.html, collateral-registration.html
    // Patterns:
    // 1. Just elementId (most common)
    // 2. bpmnFileBase without mortgage-se- prefix
    // 3. mortgage-{name} (for some cases)
    const featureGoalNames: string[] = [];
    
    // Pattern 1: Just elementId (most common based on storage)
    featureGoalNames.push(safeElementId);
    
    // Pattern 2: bpmnFileBase without mortgage-se- prefix
    if (bpmnFileBase.startsWith('mortgage-se-')) {
      const withoutPrefix = bpmnFileBase.replace('mortgage-se-', '');
      featureGoalNames.push(withoutPrefix);
      // Also try with mortgage- prefix
      featureGoalNames.push(`mortgage-${withoutPrefix}`);
    }
    
    // Pattern 3: Full bpmnFileBase
    featureGoalNames.push(bpmnFileBase);
    
    // Pattern 4: bpmnFileBase-elementId (hierarchical)
    featureGoalNames.push(`${bpmnFileBase}-${safeElementId}`);
    
    // Remove duplicates
    const uniqueNames = [...new Set(featureGoalNames)];
    
    for (const name of uniqueNames) {
      if (rootVersionHash) {
        paths.push(`docs/claude/${rootFile}/${rootVersionHash}/feature-goals/${name}.html`);
      }
      paths.push(`docs/claude/feature-goals/${name}.html`);
    }
  } else {
    // Old epics: docs/claude/mortgage.bpmn/{rootHash}/nodes/{bpmnFileBase}/{elementId}.html
    // Example: nodes/mortgage-se-appeal/screen-appeal.html
    // IMPORTANT: bpmnFileBase is already correct (e.g., "mortgage-se-appeal"), use it directly
    if (rootVersionHash) {
      paths.push(`docs/claude/${rootFile}/${rootVersionHash}/nodes/${bpmnFileBase}/${safeElementId}.html`);
    }
    paths.push(`docs/claude/nodes/${bpmnFileBase}/${safeElementId}.html`);
  }
  
  return paths;
}

// Build new storage path (using each file's own version hash)
function buildNewPath(
  bpmnFile: string,
  elementId: string,
  versionHash: string | null,
  docType: 'epic' | 'feature' | 'businessRule'
): string {
  const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
  const safeElementId = sanitize(elementId);
  
  if (docType === 'feature') {
    // Feature goals: docs/claude/{bpmnFile}/{hash}/feature-goals/{elementId}.html
    if (versionHash) {
      return `docs/claude/${bpmnFile}/${versionHash}/feature-goals/${safeElementId}.html`;
    }
    return `docs/claude/feature-goals/${safeElementId}.html`;
  } else {
    // Epics/Business Rules: docs/claude/{bpmnFile}/{hash}/nodes/{bpmnFile}/{elementId}.html
    if (versionHash) {
      return `docs/claude/${bpmnFile}/${versionHash}/nodes/${bpmnFile.replace('.bpmn', '')}/${safeElementId}.html`;
    }
    return `docs/claude/nodes/${bpmnFile.replace('.bpmn', '')}/${safeElementId}.html`;
  }
}

async function migrateDocs() {
  console.log('[Migration] Step 1: Listing files in llm-debug/docs-raw...');
  
  const { data: rawFiles, error: listError } = await supabase.storage
    .from('bpmn-files')
    .list('llm-debug/docs-raw', { limit: 10000 });

  if (listError) {
    console.error('[Migration] Error listing files:', listError);
    return;
  }

  if (!rawFiles || rawFiles.length === 0) {
    console.log('[Migration] No files found in llm-debug/docs-raw');
    return;
  }

  console.log(`[Migration] Found ${rawFiles.length} JSON files`);

  console.log('[Migration] Step 2: Getting BPMN files from database...');
  const { data: bpmnFiles } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');
  
  const allBpmnFiles = bpmnFiles?.map(f => f.file_name) || [];
  console.log(`[Migration] Found ${allBpmnFiles.length} BPMN files`);

  console.log('[Migration] Step 3: Getting root file version hash...');
  const rootFile = 'mortgage.bpmn';
  const rootVersionHash = await getVersionHash(rootFile);
  console.log(`[Migration] Root file (${rootFile}) version hash: ${rootVersionHash || 'none'}`);
  console.log('');

  console.log('[Migration] Step 4: Processing files and copying HTML...');
  console.log('');

  let success = 0;
  let skipped = 0;
  let failed = 0;
  let notFound = 0;

  for (const rawFile of rawFiles) {
    try {
      const fileName = rawFile.name;
      // Format: {bpmnFile}-{elementId}-{timestamp}.txt
      // Example: mortgage-se-application.bpmn-internal-data-gathering-2025-12-21T15-03-10-288Z.txt
      const identifierMatch = fileName.match(/^(.+?)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*?)\.txt$/);
      
      if (!identifierMatch) {
        // Try alternative format: {identifier}-{timestamp}.txt
        const altMatch = fileName.match(/^(.+?)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.txt$/);
        if (!altMatch) {
          console.warn(`[Migration] Skipping ${fileName} - unexpected format`);
          skipped++;
          continue;
        }
        var identifier = altMatch[1];
      } else {
        var identifier = identifierMatch[1];
      }
      const parsed = parseIdentifier(identifier, allBpmnFiles);
      
      if (!parsed) {
        console.warn(`[Migration] Could not parse identifier: ${identifier}`);
        skipped++;
        continue;
      }

      const { bpmnFile, elementId } = parsed;
      const versionHash = await getVersionHash(bpmnFile);
      
      // Try to determine docType - check JSON content first
      let docType: 'epic' | 'feature' | 'businessRule' = 'epic';
      try {
        const { data: jsonData } = await supabase.storage
          .from('bpmn-files')
          .download(`llm-debug/docs-raw/${fileName}`);
        
        if (jsonData) {
          const jsonText = await jsonData.text();
          // Simple check: if it has userStories but no interactions, it's a feature goal
          if (jsonText.includes('"userStories"') && !jsonText.includes('"interactions"')) {
            docType = 'feature';
          } else if (jsonText.includes('"interactions"')) {
            docType = 'epic';
          } else if (jsonText.includes('"decisionLogic"')) {
            docType = 'businessRule';
          }
        }
      } catch (e) {
        // Default to epic if we can't determine
      }
      
      // Build old and new paths
      const oldPaths = buildOldPath(bpmnFile, elementId, rootVersionHash, docType);
      const newPath = buildNewPath(bpmnFile, elementId, versionHash, docType);
      
      // Try to download from any old path
      let htmlData: Blob | null = null;
      let foundPath: string | null = null;
      
      for (const oldPath of oldPaths) {
        const { data, error } = await supabase.storage
          .from('bpmn-files')
          .download(oldPath);
        
        if (!error && data) {
          htmlData = data;
          foundPath = oldPath;
          break;
        }
      }
      
      if (!htmlData) {
        console.warn(`[Migration] ⚠️  ${identifier} - HTML not found (tried: ${oldPaths.join(', ')})`);
        notFound++;
        continue;
      }
      
      // Copy HTML to new path
      const htmlContent = await htmlData.text();
      const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      
      const { error: uploadError } = await supabase.storage
        .from('bpmn-files')
        .upload(newPath, htmlBlob, {
          upsert: true,
          contentType: 'text/html; charset=utf-8',
          cacheControl: '3600',
        });
      
      if (uploadError) {
        console.error(`[Migration] ❌ ${identifier} - Upload failed: ${uploadError.message}`);
        failed++;
        continue;
      }
      
      console.log(`[Migration] ✅ ${identifier} -> ${newPath}`);
      success++;
      
    } catch (error) {
      console.error(`[Migration] Error processing ${rawFile.name}:`, error);
      failed++;
    }
  }

  console.log('');
  console.log('[Migration] Summary:');
  console.log(`  ✅ Successfully copied: ${success}`);
  console.log(`  ⏭️  Skipped (unparseable): ${skipped}`);
  console.log(`  ⚠️  Not found (no HTML): ${notFound}`);
  console.log(`  ❌ Failed (upload error): ${failed}`);
  console.log('');
  console.log('[Migration] NOTE: Old HTML files are kept in place for safety.');
  console.log('[Migration] New files are uploaded to per-file versioned paths.');
}

migrateDocs()
  .then(() => {
    console.log('[Migration] Completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  });
