#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Migration script to migrate legacy documentation files to hierarchical naming.
 * 
 * This script:
 * 1. Lists all legacy Feature Goal documentation files in Storage
 * 2. Maps them to correct hierarchical names using bpmn-map.json
 * 3. Copies/moves them to hierarchical naming
 * 4. Optionally deletes legacy files after successful migration
 * 
 * Usage:
 *   tsx scripts/migrate-legacy-documentation.ts [--dry-run] [--delete-legacy]
 * 
 * Options:
 *   --dry-run: Show what would be migrated without actually doing it
 *   --delete-legacy: Delete legacy files after successful migration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { getFeatureGoalDocFileKey } from '../src/lib/nodeArtifactPaths';
import { getCurrentVersionHash } from '../src/lib/bpmnVersioning';

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

interface LegacyFile {
  path: string;
  subprocessFile: string;
  elementId?: string;
  parentBpmnFile?: string;
  fileName?: string; // For matching
}

interface MigrationPlan {
  legacyFile: LegacyFile;
  newPath: string;
  canMigrate: boolean;
  reason?: string;
}

/**
 * Parse legacy Feature Goal filename to extract subprocess file
 * Returns null if filename doesn't match expected legacy patterns
 */
function parseLegacyFileName(filePath: string): { subprocessFile: string } | null {
  // Legacy format: feature-goals/{subprocessBaseName}.html
  // or: feature-goals/{subprocessBaseName}-{elementId}.html
  // We need to match against bpmn-map.json to determine the correct subprocess file
  
  const match = filePath.match(/feature-goals\/([^/]+)\.html$/);
  if (!match) return null;
  
  const fileName = match[1];
  
  // Try to match fileName against subprocess files in bpmn-map.json
  // This will be done in buildMigrationPlan by checking all subprocess files
  
  return {
    subprocessFile: '', // Will be determined by matching against bpmn-map.json
    fileName, // Store the filename for matching
  };
}

/**
 * Find parent BPMN file for a call activity from bpmn-map.json
 */
function findParentForSubprocess(
  subprocessFile: string,
  bpmnMap: any
): Array<{ parentBpmnFile: string; elementId: string; elementName: string }> {
  const results: Array<{ parentBpmnFile: string; elementId: string; elementName: string }> = [];
  
  if (!bpmnMap.processes || !Array.isArray(bpmnMap.processes)) {
    return results;
  }
  
  for (const process of bpmnMap.processes) {
    const callActivities = process.call_activities || [];
    for (const ca of callActivities) {
      if (ca.subprocess_bpmn_file === subprocessFile) {
        results.push({
          parentBpmnFile: process.bpmn_file,
          elementId: ca.bpmn_id || ca.id,
          elementName: ca.name || ca.bpmn_id || ca.id,
        });
      }
    }
  }
  
  return results;
}

/**
 * List all Feature Goal files in Storage
 */
async function listFeatureGoalFiles(): Promise<string[]> {
  const files: string[] = [];
  
  async function listRecursive(path: string) {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      
      if (item.name.endsWith('.html') && fullPath.includes('feature-goals/')) {
        files.push(fullPath);
      } else if (!item.name.endsWith('.html')) {
        // It's a directory, recurse
        await listRecursive(fullPath);
      }
    }
  }
  
  await listRecursive('docs/claude');
  return files;
}

/**
 * Check if a file is legacy (not hierarchical)
 */
function isLegacyFile(filePath: string): boolean {
  // Legacy files are in feature-goals/ but not in versioned paths
  // and don't have parent prefix pattern (parent-elementId)
  // Hierarchical files have pattern like: mortgage-se-application-internal-data-gathering
  
  // Check if it's in a versioned path (not legacy)
  if (filePath.match(/\/[a-f0-9]{64}\/feature-goals\//)) {
    return false; // Versioned paths are hierarchical
  }
  
  // Check if it's hierarchical by looking for common parent prefixes
  // This is a heuristic - hierarchical files often have longer names
  const fileName = filePath.split('/').pop()?.replace('.html', '') || '';
  
  // Legacy files are typically just the subprocess base name
  // Hierarchical files have parent prefix
  // We'll use bpmn-map.json to determine this more accurately
  return true; // Assume legacy for now, will verify with bpmn-map.json
}

/**
 * Match legacy filename to subprocess file from bpmn-map.json
 */
function matchLegacyFileToSubprocess(
  fileName: string,
  bpmnMap: any
): Array<{ subprocessFile: string; parentBpmnFile: string; elementId: string; elementName: string }> {
  const matches: Array<{ subprocessFile: string; parentBpmnFile: string; elementId: string; elementName: string }> = [];
  
  if (!bpmnMap.processes || !Array.isArray(bpmnMap.processes)) {
    return matches;
  }
  
  // Try to match fileName against:
  // 1. Subprocess file base name (e.g., "mortgage-se-credit-evaluation" matches "mortgage-se-credit-evaluation.bpmn")
  // 2. Subprocess file base name + elementId (e.g., "mortgage-se-credit-evaluation-credit-evaluation")
  // 3. Just elementId (if it matches subprocess file base name)
  
  for (const process of bpmnMap.processes) {
    const callActivities = process.call_activities || [];
    for (const ca of callActivities) {
      if (!ca.subprocess_bpmn_file) continue;
      
      const subprocessBaseName = ca.subprocess_bpmn_file.replace('.bpmn', '');
      const elementId = ca.bpmn_id || ca.id || '';
      
      // Check if fileName matches subprocess base name
      if (fileName === subprocessBaseName) {
        matches.push({
          subprocessFile: ca.subprocess_bpmn_file,
          parentBpmnFile: process.bpmn_file,
          elementId,
          elementName: ca.name || elementId,
        });
      }
      // Check if fileName matches subprocess base name + elementId
      else if (fileName === `${subprocessBaseName}-${elementId}`) {
        matches.push({
          subprocessFile: ca.subprocess_bpmn_file,
          parentBpmnFile: process.bpmn_file,
          elementId,
          elementName: ca.name || elementId,
        });
      }
      // Check if fileName is just elementId and it matches subprocess base name
      else if (fileName === elementId && elementId === subprocessBaseName) {
        matches.push({
          subprocessFile: ca.subprocess_bpmn_file,
          parentBpmnFile: process.bpmn_file,
          elementId,
          elementName: ca.name || elementId,
        });
      }
    }
  }
  
  return matches;
}

/**
 * Build migration plan
 */
async function buildMigrationPlan(
  legacyFiles: string[],
  bpmnMap: any,
  dryRun: boolean
): Promise<MigrationPlan[]> {
  const plan: MigrationPlan[] = [];
  
  for (const filePath of legacyFiles) {
    // Extract filename from path
    const fileNameMatch = filePath.match(/feature-goals\/([^/]+)\.html$/);
    if (!fileNameMatch) {
      plan.push({
        legacyFile: { path: filePath, subprocessFile: '' },
        newPath: '',
        canMigrate: false,
        reason: 'Could not extract filename from path',
      });
      continue;
    }
    
    const fileName = fileNameMatch[1];
    
    // Try to match legacy filename to subprocess files in bpmn-map.json
    const matches = matchLegacyFileToSubprocess(fileName, bpmnMap);
    
    if (matches.length === 0) {
      plan.push({
        legacyFile: { path: filePath, subprocessFile: '' },
        newPath: '',
        canMigrate: false,
        reason: `No match found in bpmn-map.json for filename: ${fileName}`,
      });
      continue;
    }
    
    // If multiple matches, skip migration (we can't be sure which one is correct)
    // This prevents creating duplicate/misnamed files
    if (matches.length > 1) {
      const matchDetails = matches.map(m => 
        `${m.subprocessFile} (parent: ${m.parentBpmnFile}, elementId: ${m.elementId})`
      ).join('; ');
      plan.push({
        legacyFile: { path: filePath, subprocessFile: matches[0].subprocessFile },
        newPath: '',
        canMigrate: false,
        reason: `Multiple matches found (${matches.length}): ${matchDetails} - cannot determine correct match`,
      });
      continue;
    }
    
    // Only migrate if we have exactly one match (certain match)
    const match = matches[0];
    
    // Build hierarchical path
    const hierarchicalKey = getFeatureGoalDocFileKey(
      match.subprocessFile,
      match.elementId,
      undefined, // no version suffix
      match.parentBpmnFile, // parent for hierarchical naming
    );
    
    const newPath = `docs/claude/${hierarchicalKey}`;
    
    // Check if new path already exists
    const { data: existingFiles } = await supabase.storage
      .from('bpmn-files')
      .list('docs/claude', {
        search: hierarchicalKey.split('/').pop()?.replace('.html', ''),
        limit: 10
      });
    
    // Check if any existing file matches the hierarchical key
    const hierarchicalFileName = hierarchicalKey.split('/').pop();
    const alreadyExists = existingFiles?.some(f => 
      f.name === hierarchicalFileName || 
      f.name === hierarchicalFileName?.replace('.html', '')
    ) || false;
    
    if (alreadyExists) {
      plan.push({
        legacyFile: { 
          path: filePath, 
          subprocessFile: match.subprocessFile,
          elementId: match.elementId,
          parentBpmnFile: match.parentBpmnFile,
        },
        newPath,
        canMigrate: false,
        reason: `Hierarchical file already exists: ${newPath}`,
      });
    } else {
      plan.push({
        legacyFile: { 
          path: filePath, 
          subprocessFile: match.subprocessFile,
          elementId: match.elementId,
          parentBpmnFile: match.parentBpmnFile,
        },
        newPath,
        canMigrate: true,
      });
    }
  }
  
  return plan;
}

/**
 * Execute migration
 */
async function executeMigration(plan: MigrationPlan[], deleteLegacy: boolean): Promise<void> {
  let migrated = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const item of plan) {
    if (!item.canMigrate) {
      skipped++;
      console.log(`⏭️  Skipping: ${item.legacyFile.path}`);
      if (item.reason) {
        console.log(`   Reason: ${item.reason}`);
      }
      continue;
    }
    
    try {
      // Download legacy file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('bpmn-files')
        .download(item.legacyFile.path);
      
      if (downloadError || !fileData) {
        console.error(`❌ Failed to download ${item.legacyFile.path}:`, downloadError);
        failed++;
        continue;
      }
      
      const content = await fileData.text();
      
      // Upload to new path
      const newPathParts = item.newPath.split('/');
      const newFileName = newPathParts.pop()!;
      const newDir = newPathParts.join('/');
      
      const { error: uploadError } = await supabase.storage
        .from('bpmn-files')
        .upload(item.newPath, content, {
          contentType: 'text/html',
          upsert: true, // Overwrite if exists
        });
      
      if (uploadError) {
        console.error(`❌ Failed to upload ${item.newPath}:`, uploadError);
        failed++;
        continue;
      }
      
      console.log(`✅ Migrated: ${item.legacyFile.path} → ${item.newPath}`);
      migrated++;
      
      // Delete legacy file if requested
      if (deleteLegacy) {
        const { error: deleteError } = await supabase.storage
          .from('bpmn-files')
          .remove([item.legacyFile.path]);
        
        if (deleteError) {
          console.warn(`⚠️  Failed to delete legacy file ${item.legacyFile.path}:`, deleteError);
        } else {
          console.log(`🗑️  Deleted legacy file: ${item.legacyFile.path}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error migrating ${item.legacyFile.path}:`, error);
      failed++;
    }
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const deleteLegacy = args.includes('--delete-legacy');
  
  console.log('\n🔄 Legacy Documentation Migration\n');
  console.log('═'.repeat(80));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }
  
  if (deleteLegacy) {
    console.log('🗑️  Legacy files will be deleted after successful migration\n');
  }
  
  try {
    // 1. Load bpmn-map.json
    console.log('📋 Step 1: Loading bpmn-map.json...');
    const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
    const bpmnMapContent = readFileSync(bpmnMapPath, 'utf-8');
    const bpmnMap = JSON.parse(bpmnMapContent);
    console.log(`   ✅ Loaded bpmn-map.json with ${bpmnMap.processes?.length || 0} processes\n`);
    
    // 2. List all Feature Goal files
    console.log('📦 Step 2: Listing Feature Goal files in Storage...');
    const allFiles = await listFeatureGoalFiles();
    console.log(`   Found ${allFiles.length} Feature Goal files\n`);
    
    // 3. Filter legacy files (simple heuristic for now)
    console.log('🔍 Step 3: Identifying legacy files...');
    const legacyFiles = allFiles.filter(file => {
      // Skip versioned paths (they're hierarchical)
      if (file.match(/\/[a-f0-9]{64}\/feature-goals\//)) {
        return false;
      }
      // For now, consider all non-versioned files as potential legacy
      // We'll verify with bpmn-map.json
      return true;
    });
    console.log(`   Found ${legacyFiles.length} potential legacy files\n`);
    
    // 4. Build migration plan
    console.log('📝 Step 4: Building migration plan...');
    const plan = await buildMigrationPlan(legacyFiles, bpmnMap, dryRun);
    const migratable = plan.filter(p => p.canMigrate);
    console.log(`   ✅ ${migratable.length} files can be migrated`);
    console.log(`   ⏭️  ${plan.length - migratable.length} files will be skipped\n`);
    
    // 5. Show plan
    console.log('📋 Migration Plan:');
    console.log('═'.repeat(80));
    for (const item of plan.slice(0, 20)) {
      if (item.canMigrate) {
        console.log(`✅ ${item.legacyFile.path}`);
        console.log(`   → ${item.newPath}`);
        console.log(`   (${item.legacyFile.subprocessFile} in ${item.legacyFile.parentBpmnFile})`);
      } else {
        console.log(`⏭️  ${item.legacyFile.path}`);
        if (item.reason) {
          console.log(`   ${item.reason}`);
        }
      }
      console.log('');
    }
    
    if (plan.length > 20) {
      console.log(`   ... and ${plan.length - 20} more files\n`);
    }
    
    // 6. Execute migration (if not dry run)
    if (!dryRun && migratable.length > 0) {
      console.log('🚀 Step 5: Executing migration...\n');
      await executeMigration(plan, deleteLegacy);
    } else if (dryRun) {
      console.log('\n🔍 DRY RUN - No files were modified');
      console.log(`   Would migrate ${migratable.length} files`);
      if (deleteLegacy) {
        console.log(`   Would delete ${migratable.length} legacy files`);
      }
    } else {
      console.log('\n✅ No files to migrate');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

