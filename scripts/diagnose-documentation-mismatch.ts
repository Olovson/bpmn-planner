#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Diagnostic script to compare expected documentation paths with what actually exists in Storage.
 * This helps identify naming mismatches between generated documentation and what test generation expects.
 * 
 * Usage:
 *   tsx scripts/diagnose-documentation-mismatch.ts [bpmnFileName]
 * 
 * Example:
 *   tsx scripts/diagnose-documentation-mismatch.ts mortgage.bpmn
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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

interface ExpectedDoc {
  nodeType: string;
  elementId: string;
  elementName: string;
  subprocessFile?: string;
  parentBpmnFile: string;
  expectedPaths: string[];
  found: boolean;
  foundPath?: string;
}

/**
 * Simple storage file existence check
 */
async function checkFileExists(path: string): Promise<boolean> {
  try {
    const parts = path.split('/');
    const fileName = parts.pop();
    const dir = parts.join('/');
    
    if (!fileName) return false;

    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(dir || undefined, { 
        search: fileName, 
        limit: 1 
      });

    if (error) {
      return false;
    }

    return Boolean(data?.find((entry) => entry.name === fileName));
  } catch (error) {
    return false;
  }
}

/**
 * Get version hash for a BPMN file
 */
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

/**
 * Generate expected Feature Goal paths (simplified version of getFeatureGoalDocStoragePaths)
 */
function generateFeatureGoalPaths(
  subprocessBpmnFile: string,
  elementId: string,
  parentBpmnFile: string,
  versionHash: string | null,
): string[] {
  const paths: string[] = [];
  
  // Sanitize element ID
  const sanitizedId = elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
  
  // Get base names
  const getBaseName = (file: string) => file.replace('.bpmn', '');
  const parentBaseName = getBaseName(parentBpmnFile);
  const subprocessBaseName = getBaseName(subprocessBpmnFile);
  
  // Hierarchical naming: parent-elementId
  const normalizedParent = parentBaseName.toLowerCase();
  const normalizedElementId = sanitizedId.toLowerCase();
  
  let hierarchicalKey: string;
  
  // Avoid repetition: if elementId already included in parentBaseName
  if (normalizedParent.endsWith(`-${normalizedElementId}`) || 
      normalizedParent.endsWith(normalizedElementId) ||
      normalizedParent.includes(`-${normalizedElementId}-`) ||
      normalizedParent.includes(`-${normalizedElementId}`)) {
    hierarchicalKey = `feature-goals/${parentBaseName}.html`;
  } else {
    hierarchicalKey = `feature-goals/${parentBaseName}-${sanitizedId}.html`;
  }
  
  // Versioned paths (if version hash is provided)
  if (versionHash) {
    const subprocessBpmnFileName = subprocessBpmnFile.endsWith('.bpmn') 
      ? subprocessBpmnFile 
      : `${subprocessBpmnFile}.bpmn`;
    paths.push(`docs/claude/${subprocessBpmnFileName}/${versionHash}/${hierarchicalKey}`);
  }
  
  // Non-versioned paths (fallback)
  paths.push(`docs/claude/${hierarchicalKey}`);
  
  return paths;
}

/**
 * List all documentation files in Storage recursively
 */
async function listAllDocFiles(prefix: string = 'docs/claude'): Promise<string[]> {
  const files: string[] = [];
  
  async function listRecursive(path: string) {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      // Silently ignore errors for non-existent paths
      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      
      // Check if it's a file (ends with .html) or a directory
      if (item.name.endsWith('.html')) {
        files.push(fullPath);
      } else {
        // It's a directory, recurse
        await listRecursive(fullPath);
      }
    }
  }
  
  await listRecursive(prefix);
  return files;
}

/**
 * Get call activities from bpmn-map.json
 * For mortgage.bpmn, we need to find all call activities in all processes that are part of the mortgage hierarchy
 */
function getCallActivitiesFromBpmnMap(bpmnFileName: string): Array<{
  elementId: string;
  elementName: string;
  subprocessFile: string;
  parentBpmnFile: string;
}> {
  try {
    const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
    const bpmnMapContent = readFileSync(bpmnMapPath, 'utf-8');
    const bpmnMap = JSON.parse(bpmnMapContent);
    
    const callActivities: Array<{
      elementId: string;
      elementName: string;
      subprocessFile: string;
      parentBpmnFile: string;
    }> = [];
    
    // bpmn-map.json has a "processes" array
    if (!bpmnMap.processes || !Array.isArray(bpmnMap.processes)) {
      console.warn('bpmn-map.json does not have a processes array');
      return [];
    }
    
    // For mortgage.bpmn, we want to check all processes
    // If a specific file is provided, we can filter, but for now we'll get all
    for (const process of bpmnMap.processes) {
      const parentBpmnFile = process.bpmn_file;
      
      // If bpmnFileName is specified and doesn't match, skip (unless it's mortgage.bpmn which is the root)
      if (bpmnFileName !== 'mortgage.bpmn' && parentBpmnFile !== bpmnFileName) {
        continue;
      }
      
      const callActivitiesData = process.call_activities || [];
      if (Array.isArray(callActivitiesData)) {
        for (const ca of callActivitiesData) {
          if (ca.subprocess_bpmn_file) {
            callActivities.push({
              elementId: ca.bpmn_id || ca.id,
              elementName: ca.name || ca.bpmn_id || ca.id,
              subprocessFile: ca.subprocess_bpmn_file,
              parentBpmnFile: parentBpmnFile,
            });
          }
        }
      }
    }
    
    return callActivities;
  } catch (error) {
    console.warn('Could not read bpmn-map.json:', error);
    if (error instanceof Error) {
      console.warn('Error details:', error.message);
    }
    return [];
  }
}

/**
 * Check what documentation exists for a BPMN file
 */
async function diagnoseDocumentation(bpmnFileName: string) {
  console.log(`\n🔍 Diagnosing documentation for: ${bpmnFileName}\n`);
  console.log('═'.repeat(80));

  // 1. Get call activities from bpmn-map.json
  console.log('\n📋 Step 1: Reading call activities from bpmn-map.json...');
  const callActivities = getCallActivitiesFromBpmnMap(bpmnFileName);
  console.log(`   Found ${callActivities.length} call activities\n`);

  if (callActivities.length === 0) {
    console.log('⚠️  No call activities found. Make sure bpmn-map.json is up to date.');
    return;
  }

  // 2. List all documentation files in Storage
  console.log('📦 Step 2: Listing all documentation files in Storage...');
  const allStorageFiles = await listAllDocFiles();
  console.log(`   Found ${allStorageFiles.length} documentation files in Storage\n`);

  // 3. Check expected paths vs what exists
  console.log('🔎 Step 3: Comparing expected vs actual documentation paths...\n');
  
  const expectedDocs: ExpectedDoc[] = [];
  const issues: string[] = [];

  for (const ca of callActivities) {
    const elementId = ca.elementId;
    const elementName = ca.elementName;
    
    // Get version hash for subprocess file
    const subprocessVersionHash = await getVersionHash(ca.subprocessFile);
    
    // Get expected paths
    const expectedPaths = generateFeatureGoalPaths(
      ca.subprocessFile,
      elementId,
      ca.parentBpmnFile,
      subprocessVersionHash,
    );

    // Check if any of the expected paths exist
    let found = false;
    let foundPath: string | undefined;
    
    for (const path of expectedPaths) {
      const exists = await checkFileExists(path);
      if (exists) {
        found = true;
        foundPath = path;
        break;
      }
    }

    // Also check if there's a similar file in storage (fuzzy match)
    let similarFiles: string[] = [];
    if (!found) {
      const searchPatterns = [
        elementId.toLowerCase(),
        elementName.toLowerCase(),
        ca.subprocessFile.replace('.bpmn', '').toLowerCase(),
      ];
      
      similarFiles = allStorageFiles.filter(file => {
        const fileLower = file.toLowerCase();
        return searchPatterns.some(pattern => fileLower.includes(pattern));
      });
    }

    expectedDocs.push({
      nodeType: 'callActivity',
      elementId,
      elementName,
      subprocessFile: ca.subprocessFile,
      parentBpmnFile: ca.parentBpmnFile,
      expectedPaths,
      found,
      foundPath,
    });

    if (!found) {
      console.log(`❌ Missing: ${elementName} (${elementId})`);
      console.log(`   Subprocess: ${ca.subprocessFile}`);
      console.log(`   Expected paths:`);
      for (const path of expectedPaths) {
        const exists = allStorageFiles.some(f => f === path);
        console.log(`     ${exists ? '✅' : '❌'} ${path}`);
      }
      
      if (similarFiles.length > 0) {
        console.log(`   ⚠️  Similar files found (possible naming mismatch):`);
        similarFiles.slice(0, 5).forEach(file => {
          console.log(`     📄 ${file}`);
        });
        if (similarFiles.length > 5) {
          console.log(`     ... and ${similarFiles.length - 5} more`);
        }
      }
      console.log('');
    } else {
      console.log(`✅ Found: ${elementName} (${elementId})`);
      console.log(`   Path: ${foundPath}`);
      console.log('');
    }
  }

  // 4. Summary
  console.log('\n📊 Summary:');
  console.log('═'.repeat(80));
  const foundCount = expectedDocs.filter(d => d.found).length;
  const missingCount = expectedDocs.length - foundCount;
  
  console.log(`\nTotal call activities: ${expectedDocs.length}`);
  console.log(`✅ Found: ${foundCount}`);
  console.log(`❌ Missing: ${missingCount}`);

  if (issues.length > 0) {
    console.log(`\n⚠️  Issues:`);
    issues.forEach(issue => console.log(`   ${issue}`));
  }

  // 5. Show all Feature Goal files in storage for reference
  console.log('\n📁 All Feature Goal files in Storage (for reference):');
  console.log('═'.repeat(80));
  const featureGoalFiles = allStorageFiles.filter(f => f.includes('feature-goals'));
  if (featureGoalFiles.length > 0) {
    featureGoalFiles.slice(0, 20).forEach(file => {
      console.log(`   ${file}`);
    });
    if (featureGoalFiles.length > 20) {
      console.log(`   ... and ${featureGoalFiles.length - 20} more`);
    }
  } else {
    console.log('   No feature-goals files found');
  }

  return {
    total: expectedDocs.length,
    found: foundCount,
    missing: missingCount,
    expectedDocs,
    allStorageFiles,
  };
}

// Main execution
async function main() {
  const bpmnFileName = process.argv[2] || 'mortgage.bpmn';
  
  try {
    await diagnoseDocumentation(bpmnFileName);
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();
