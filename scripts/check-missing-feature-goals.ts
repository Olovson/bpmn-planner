#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Check which Feature Goals are missing from exports
 * 
 * This script:
 * 1. Finds all CallActivities in the BPMN hierarchy
 * 2. Checks which ones have Feature Goal documentation in Supabase Storage
 * 3. Lists missing ones
 * 
 * Usage:
 *   tsx scripts/check-missing-feature-goals.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getFeatureGoalDocFileKey } from '../src/lib/nodeArtifactPaths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get all CallActivities from bpmn_map.json or Supabase
 * Returns both the subprocess file AND the parent context (for naming)
 */
async function getAllCallActivities(): Promise<Array<{ bpmnFile: string; elementId: string; name: string; parentBpmnFile?: string }>> {
  // Try to read from bpmn-map.json first
  try {
    const fs = await import('fs');
    const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
    if (fs.existsSync(bpmnMapPath)) {
      const bpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
      const callActivities: Array<{ bpmnFile: string; elementId: string; name: string; parentBpmnFile?: string }> = [];
      
      for (const process of bpmnMap.processes || []) {
        // The process itself might be a CallActivity (if called from another process)
        if (process.bpmn_file) {
          callActivities.push({
            bpmnFile: process.bpmn_file,
            elementId: process.id,
            name: process.alias || process.id,
          });
        }
        
        // Add all call_activities within this process
        // Include parent BPMN file for naming context
        for (const callActivity of process.call_activities || []) {
          if (callActivity.subprocess_bpmn_file) {
            callActivities.push({
              bpmnFile: callActivity.subprocess_bpmn_file,
              elementId: callActivity.bpmn_id,
              name: callActivity.name || callActivity.bpmn_id,
              parentBpmnFile: process.bpmn_file, // Parent context
            });
          }
        }
      }
      
      return callActivities;
    }
  } catch (error) {
    console.warn('Could not read bpmn-map.json, falling back to Supabase');
  }
  
  // Fallback: return empty array (user can manually add CallActivities)
  return [];
}

/**
 * List all Feature Goal files in Supabase Storage recursively
 */
async function listAllFeatureGoalFiles(): Promise<string[]> {
  const allFiles: string[] = [];
  
  async function listRecursive(folder: string = '') {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(folder, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error(`Error listing folder ${folder}:`, error);
      return;
    }

    if (!data) return;

    for (const item of data) {
      const fullPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.id === null) {
        // It's a folder, recurse
        await listRecursive(fullPath);
      } else {
        // It's a file - check if it's a Feature Goal HTML file
        if (fullPath.includes('feature-goals/') && fullPath.endsWith('.html')) {
          allFiles.push(fullPath);
        }
      }
    }
  }

  await listRecursive('docs');
  return allFiles;
}

/**
 * Check if a Feature Goal file exists in Supabase Storage
 * Also checks for parent-prefixed naming (e.g., "mortgage-se-application-internal-data-gathering")
 */
async function checkFeatureGoalExists(
  bpmnFile: string, 
  elementId: string, 
  version: 'v1' | 'v2' = 'v2', 
  allFiles: string[],
  parentBpmnFile?: string
): Promise<{ found: boolean; path?: string }> {
  const fileKey = getFeatureGoalDocFileKey(bpmnFile, elementId, version);
  const expectedFilename = fileKey.split('/').pop() || '';
  const baseName = bpmnFile.replace('.bpmn', '');
  const sanitizedElementId = elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
  
  // Try multiple matching strategies
  for (const file of allFiles) {
    const fileBasename = file.split('/').pop() || '';
    // Remove "local--" or other mode prefixes for matching
    const cleanBasename = fileBasename.replace(/^(local|slow-chatgpt|slow-ollama|slow)--/, '');
    
    // Strategy 1: Exact match (with or without mode prefix)
    if (cleanBasename === expectedFilename || fileBasename === expectedFilename) {
      return { found: true, path: file };
    }
    
    // Strategy 2: Match base name and element ID (with or without version)
    const basePattern = `${baseName}-${sanitizedElementId}`;
    if (cleanBasename.includes(basePattern)) {
      // Check if it's the right version or no version specified
      if (cleanBasename.includes(`-${version}.html`) || cleanBasename.endsWith('.html')) {
        return { found: true, path: file };
      }
    }
    
    // Strategy 3: Match with parent prefix (e.g., "mortgage-se-application-internal-data-gathering")
    if (parentBpmnFile) {
      const parentBaseName = parentBpmnFile.replace('.bpmn', '');
      const parentPattern = `${parentBaseName}-${sanitizedElementId}`;
      if (cleanBasename.includes(parentPattern)) {
        if (cleanBasename.includes(`-${version}.html`) || cleanBasename.endsWith('.html')) {
          return { found: true, path: file };
        }
      }
    }
    
    // Strategy 4: Fuzzy match - filename contains both base name and element ID
    const baseNameShort = baseName.replace('mortgage-se-', '');
    const elementIdShort = sanitizedElementId.replace(/-/g, '');
    if (cleanBasename.includes(baseNameShort) && cleanBasename.includes(elementIdShort)) {
      return { found: true, path: file };
    }
  }
  
  return { found: false };
}

async function main() {
  console.log('🔍 Checking for missing Feature Goals...\n');

  // Get all CallActivities from bpmn-map.json
  const allCallActivities = await getAllCallActivities();
  
  if (allCallActivities.length === 0) {
    console.warn('⚠️  No CallActivities found in bpmn-map.json');
    console.log('   Make sure bpmn-map.json exists and contains call_activities');
    process.exit(0);
  }
  
  console.log(`✅ Found ${allCallActivities.length} CallActivities from bpmn-map.json\n`);

  // List all Feature Goal files in Storage first
  console.log('🔍 Listing all Feature Goal files in Supabase Storage...\n');
  const allStorageFiles = await listAllFeatureGoalFiles();
  console.log(`   Found ${allStorageFiles.length} Feature Goal files in Storage\n`);

  // Check which ones have Feature Goal documentation
  console.log('🔍 Checking Feature Goal documentation...\n');

  const missing: Array<{ bpmnFile: string; elementId: string; name: string }> = [];
  const found: Array<{ bpmnFile: string; elementId: string; name: string; version: string; path: string }> = [];

  for (const callActivity of allCallActivities) {
    const v2Result = await checkFeatureGoalExists(
      callActivity.bpmnFile, 
      callActivity.elementId, 
      'v2', 
      allStorageFiles,
      callActivity.parentBpmnFile
    );
    const v1Result = await checkFeatureGoalExists(
      callActivity.bpmnFile, 
      callActivity.elementId, 
      'v1', 
      allStorageFiles,
      callActivity.parentBpmnFile
    );

    if (v2Result.found || v1Result.found) {
      found.push({
        bpmnFile: callActivity.bpmnFile,
        elementId: callActivity.elementId,
        name: callActivity.name,
        version: v2Result.found ? 'v2' : 'v1',
        path: v2Result.path || v1Result.path || 'unknown',
      });
    } else {
      missing.push(callActivity);
    }
  }

  // Print results
  console.log('='.repeat(60));
  console.log('📊 Results:');
  console.log(`   ✅ Found: ${found.length} Feature Goals`);
  console.log(`   ❌ Missing: ${missing.length} Feature Goals`);
  console.log('='.repeat(60));

  if (found.length > 0) {
    console.log('\n✅ Feature Goals with documentation:');
    found.forEach((fg, index) => {
      console.log(`   ${index + 1}. ${fg.name} (${fg.bpmnFile}::${fg.elementId}) [${fg.version}]`);
      console.log(`      Path: ${fg.path}`);
    });
  }

  if (missing.length > 0) {
    console.log('\n❌ Missing Feature Goals:');
    missing.forEach((fg, index) => {
      console.log(`   ${index + 1}. ${fg.name}`);
      console.log(`      BPMN File: ${fg.bpmnFile}`);
      console.log(`      Element ID: ${fg.elementId}`);
      console.log(`      File Key: ${getFeatureGoalDocFileKey(fg.bpmnFile, fg.elementId, 'v2')}`);
      console.log('');
    });

    console.log('\n💡 To generate missing Feature Goals, run:');
    console.log('   npm run generate:all (or use the UI to generate documentation)');
  } else {
    console.log('\n✅ All CallActivities have Feature Goal documentation!');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

