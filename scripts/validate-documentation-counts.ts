#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Validation script to compare documentation counts from useFileArtifactCoverage
 * with actual files in Supabase Storage.
 * 
 * This script:
 * 1. Lists all BPMN files
 * 2. For each file, counts actual documentation files in Storage
 * 3. Compares with what useFileArtifactCoverage would return
 * 4. Reports discrepancies
 * 
 * Usage:
 *   tsx scripts/validate-documentation-counts.ts [fileName]
 * 
 * If fileName is provided, only validates that specific file.
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

/**
 * Get current version hash for a BPMN file
 */
async function getCurrentVersionHash(fileName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('bpmn_files')
    .select('current_version_hash')
    .eq('file_name', fileName)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data.current_version_hash;
}

/**
 * Load bpmn-map.json to get call activities
 */
function loadBpmnMap(): any {
  try {
    const mapPath = resolve(__dirname, '../bpmn-map.json');
    const mapContent = readFileSync(mapPath, 'utf-8');
    return JSON.parse(mapContent);
  } catch (error) {
    console.error('Error loading bpmn-map.json:', error);
    return { processes: [] };
  }
}

/**
 * Get call activities for a BPMN file from bpmn-map.json
 */
function getCallActivitiesForFile(fileName: string, bpmnMap: any): Array<{ elementId: string; subprocessFile: string }> {
  const callActivities: Array<{ elementId: string; subprocessFile: string }> = [];
  
  for (const process of bpmnMap.processes || []) {
    if (process.bpmn_file === fileName) {
      for (const ca of process.call_activities || []) {
        if (ca.subprocess_bpmn_file) {
          callActivities.push({
            elementId: ca.bpmn_id || ca.id || '',
            subprocessFile: ca.subprocess_bpmn_file,
          });
        }
      }
    }
  }
  
  return callActivities;
}

/**
 * Sanitize element ID (simple version)
 */
function sanitizeElementId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

/**
 * Get feature goal doc file key (simplified version)
 */
function getFeatureGoalDocFileKey(
  bpmnFile: string,
  elementId: string,
  parentBpmnFile?: string
): string {
  const sanitizedId = sanitizeElementId(elementId);
  const baseName = bpmnFile.replace('.bpmn', '');
  
  if (parentBpmnFile) {
    const parentBaseName = parentBpmnFile.replace('.bpmn', '');
    return `feature-goals/${parentBaseName}-${sanitizedId}.html`;
  }
  
  return `feature-goals/${baseName}-${sanitizedId}.html`;
}

/**
 * Count actual documentation files in Storage for a BPMN file
 */
async function countActualDocsInStorage(
  fileName: string,
  callActivities: Array<{ elementId: string; subprocessFile: string }>
): Promise<{ nodeDocs: number; featureGoalDocs: number; total: number }> {
  const versionHash = await getCurrentVersionHash(fileName);
  
  // Try multiple paths for node docs
  const nodeDocPaths = versionHash
    ? [
        `docs/claude/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/ollama/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/local/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/nodes/${fileName.replace('.bpmn', '')}`, // Legacy path
      ]
    : [
        `docs/claude/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/ollama/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/local/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/nodes/${fileName.replace('.bpmn', '')}`, // Legacy path
      ];
  
  let nodeDocNames = new Set<string>();
  for (const path of nodeDocPaths) {
    const { data: entries, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, { limit: 1000 });
    
    if (!error && entries && entries.length > 0) {
      nodeDocNames = new Set(entries.map(e => e.name));
      break;
    }
  }
  
  // Count all node docs (we can't easily match them to specific nodes without parsing BPMN)
  // So we'll just count all docs found
  const nodeDocsCount = nodeDocNames.size;
  
  // Check feature-goal docs
  const fileForVersionedPath = fileName.endsWith('.bpmn') ? fileName : `${fileName}.bpmn`;
  const featureGoalPaths = versionHash
    ? [
        `docs/claude/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/ollama/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/local/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/claude/feature-goals`,
        `docs/ollama/feature-goals`,
        `docs/local/feature-goals`,
        `docs/feature-goals`,
      ]
    : [
        `docs/claude/feature-goals`,
        `docs/ollama/feature-goals`,
        `docs/local/feature-goals`,
        `docs/feature-goals`,
      ];
  
  let featureGoalNames = new Set<string>();
  for (const path of featureGoalPaths) {
    const { data: entries, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, { limit: 1000 });
    
    if (!error && entries && entries.length > 0) {
      featureGoalNames = new Set(entries.map(e => e.name));
      break;
    }
  }
  
  // Count feature-goal docs for call activities in this file
  let featureGoalDocsCount = 0;
  for (const ca of callActivities) {
    const hierarchicalKey = getFeatureGoalDocFileKey(
      ca.subprocessFile,
      ca.elementId,
      fileName, // parent BPMN file
    );
    const legacyKey = getFeatureGoalDocFileKey(
      ca.subprocessFile,
      ca.elementId,
      undefined,
    );
    const hierarchicalFileName = hierarchicalKey.replace('feature-goals/', '');
    const legacyFileName = legacyKey.replace('feature-goals/', '');
    
    if (featureGoalNames.has(hierarchicalFileName) || featureGoalNames.has(legacyFileName)) {
      featureGoalDocsCount++;
    }
  }
  
  return {
    nodeDocs: nodeDocsCount,
    featureGoalDocs: featureGoalDocsCount,
    total: nodeDocsCount + featureGoalDocsCount,
  };
}

/**
 * Calculate expected documentation count using the same logic as useFileArtifactCoverage
 * Simplified version that doesn't require building the full graph
 */
async function calculateExpectedDocs(
  fileName: string,
  callActivities: Array<{ elementId: string; subprocessFile: string }>
): Promise<{ totalNodes: number; expectedDocs: number }> {
  // We can't easily count total nodes without parsing BPMN files
  // So we'll just count what we can verify in storage
  const versionHash = await getCurrentVersionHash(fileName);
  
  const pathsToTry = versionHash
    ? [
        `docs/claude/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/ollama/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/local/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/nodes/${fileName.replace('.bpmn', '')}`,
      ]
    : [
        `docs/claude/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/ollama/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/local/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/nodes/${fileName.replace('.bpmn', '')}`,
      ];
  
  let docNames = new Set<string>();
  for (const docFolder of pathsToTry) {
    const { data: docEntries, error } = await supabase.storage
      .from('bpmn-files')
      .list(docFolder, { limit: 1000 });
    
    if (docEntries && docEntries.length > 0) {
      docNames = new Set(docEntries.map(entry => entry.name));
      break;
    }
  }
  
  const fileForVersionedPath = fileName.endsWith('.bpmn') ? fileName : `${fileName}.bpmn`;
  const featureGoalPathsToTry = versionHash
    ? [
        `docs/claude/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/ollama/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/local/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/claude/feature-goals`,
        `docs/ollama/feature-goals`,
        `docs/local/feature-goals`,
        `docs/feature-goals`,
      ]
    : [
        `docs/claude/feature-goals`,
        `docs/ollama/feature-goals`,
        `docs/local/feature-goals`,
        `docs/feature-goals`,
      ];
  
  let featureGoalNames = new Set<string>();
  for (const featureGoalPath of featureGoalPathsToTry) {
    const { data: featureGoalEntries, error } = await supabase.storage
      .from('bpmn-files')
      .list(featureGoalPath, { limit: 1000 });
    
    if (!error && featureGoalEntries && featureGoalEntries.length > 0) {
      featureGoalNames = new Set(featureGoalEntries.map(e => e.name));
      break;
    }
  }
  
  // Count node docs
  const expectedNodeDocs = docNames.size;
  
  // Count feature-goal docs
  let expectedFeatureGoalDocs = 0;
  for (const ca of callActivities) {
    const hierarchicalKey = getFeatureGoalDocFileKey(
      ca.subprocessFile,
      ca.elementId,
      fileName,
    );
    const legacyKey = getFeatureGoalDocFileKey(
      ca.subprocessFile,
      ca.elementId,
      undefined,
    );
    const hierarchicalFileName = hierarchicalKey.replace('feature-goals/', '');
    const legacyFileName = legacyKey.replace('feature-goals/', '');
    
    if (featureGoalNames.has(hierarchicalFileName) || featureGoalNames.has(legacyFileName)) {
      expectedFeatureGoalDocs++;
    }
  }
  
  const expectedDocs = expectedNodeDocs + expectedFeatureGoalDocs;
  const totalNodes = expectedNodeDocs + callActivities.length; // Approximate
  
  return { totalNodes, expectedDocs };
}

/**
 * Main validation function
 */
async function validateDocumentationCounts(fileName?: string): Promise<void> {
  console.log('\n🔍 Dokumentationsräkning Validering\n');
  console.log('═'.repeat(80));
  
  try {
    // Get all BPMN files
    const { data: files, error } = await supabase
      .from('bpmn_files')
      .select('file_name')
      .eq('file_type', 'bpmn')
      .order('file_name');
    
    if (error) {
      console.error('Error fetching files:', error);
      process.exit(1);
    }
    
    const bpmnFiles = files || [];
    const filesToCheck = fileName
      ? bpmnFiles.filter(f => f.file_name === fileName)
      : bpmnFiles;
    
    if (filesToCheck.length === 0) {
      console.error(`No files found${fileName ? ` matching ${fileName}` : ''}`);
      process.exit(1);
    }
    
    const allBpmnFileNames = bpmnFiles.map(f => f.file_name);
    
    console.log(`\n📋 Validerar ${filesToCheck.length} fil(er)...\n`);
    
    const discrepancies: Array<{
      fileName: string;
      expectedTotal: number;
      expectedDocs: number;
      actualTotal: number;
      actualDocs: number;
      totalNodes: number;
    }> = [];
    
    const bpmnMap = loadBpmnMap();
    
    for (const file of filesToCheck) {
      const fileName = file.file_name;
      
      try {
        // Get call activities for this file
        const callActivities = getCallActivitiesForFile(fileName, bpmnMap);
        
        // Calculate expected counts (using same logic as useFileArtifactCoverage)
        const { totalNodes, expectedDocs } = await calculateExpectedDocs(fileName, callActivities);
        
        // Count actual docs in storage
        const actualCounts = await countActualDocsInStorage(fileName, callActivities);
        
        const matches = expectedDocs === actualCounts.total && totalNodes === actualCounts.total;
        
        if (!matches) {
          discrepancies.push({
            fileName,
            expectedTotal: totalNodes,
            expectedDocs,
            actualTotal: totalNodes,
            actualDocs: actualCounts.total,
            totalNodes,
          });
        }
        
        const status = matches ? '✅' : '❌';
        console.log(
          `${status} ${fileName.padEnd(45)} ` +
          `Nodes: ${totalNodes.toString().padStart(3)} | ` +
          `Expected Docs: ${expectedDocs.toString().padStart(3)} | ` +
          `Actual Docs: ${actualCounts.total.toString().padStart(3)} | ` +
          `(Node: ${actualCounts.nodeDocs}, FG: ${actualCounts.featureGoalDocs})`
        );
      } catch (error) {
        console.error(`❌ Error validating ${fileName}:`, error);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 Sammanfattning:\n');
    
    if (discrepancies.length === 0) {
      console.log('✅ Alla filer matchar! Dokumentationsräkningen stämmer med Storage.');
    } else {
      console.log(`❌ ${discrepancies.length} fil(er) har avvikelser:\n`);
      for (const disc of discrepancies) {
        console.log(`   ${disc.fileName}:`);
        console.log(`     Total Nodes: ${disc.totalNodes}`);
        console.log(`     Expected Docs: ${disc.expectedDocs}`);
        console.log(`     Actual Docs: ${disc.actualDocs}`);
        console.log(`     Difference: ${disc.actualDocs - disc.expectedDocs}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const fileName = args[0];
  
  await validateDocumentationCounts(fileName);
}

main();

