#!/usr/bin/env tsx

/**
 * Script to rename feature goal HTML files to remove duplicate parts in filenames.
 * 
 * Old format: {bpmnFile}-{elementId}-v2.html (where elementId might duplicate part of bpmnFile)
 * New format: {bpmnFile}-v2.html (if elementId is already in bpmnFile) or {bpmnFile}-{elementId}-v2.html (if not)
 * 
 * This script:
 * 1. Reads all HTML files in public/local-content/feature-goals/
 * 2. Extracts bpmnFile and elementId from filename or file metadata
 * 3. Uses getFeatureGoalDocFileKey to generate correct filename
 * 4. Renames files if needed
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getFeatureGoalDocFileKey } from '../src/lib/nodeArtifactPaths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FEATURE_GOALS_DIR = path.join(__dirname, '../public/local-content/feature-goals');
const BPMN_MAP_PATH = path.join(__dirname, '../bpmn-map.json');

interface BpmnMap {
  processes: Array<{
    bpmn_file: string;
    call_activities: Array<{
      bpmn_id: string;
      subprocess_bpmn_file: string;
    }>;
  }>;
}

function loadBpmnMap(): BpmnMap {
  const content = fs.readFileSync(BPMN_MAP_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Extract bpmnFile and elementId from filename
 * Tries multiple patterns:
 * - {bpmnFile}-{elementId}-v2.html
 * - {bpmnFile}-v2.html (if elementId is in bpmnFile)
 */
function parseFilename(filename: string): { bpmnFile: string; elementId: string } | null {
  // Remove .html and -v2 suffix
  const base = filename.replace(/-v2\.html$/, '').replace(/\.html$/, '');
  
  // Try to find matching call activity in bpmn-map.json
  const bpmnMap = loadBpmnMap();
  
  for (const process of bpmnMap.processes) {
    for (const callActivity of process.call_activities) {
      const expectedFilename = getFeatureGoalDocFileKey(
        callActivity.subprocess_bpmn_file,
        callActivity.bpmn_id,
        'v2'
      ).replace('feature-goals/', '');
      
      if (expectedFilename === filename) {
        // This is the correct filename, no rename needed
        return null;
      }
      
      // Check if current filename matches old pattern
      const subprocessBase = callActivity.subprocess_bpmn_file.replace('.bpmn', '');
      const oldPattern = `${subprocessBase}-${callActivity.bpmn_id}-v2.html`;
      
      if (filename === oldPattern) {
        // This is an old filename that needs renaming
        return {
          bpmnFile: callActivity.subprocess_bpmn_file,
          elementId: callActivity.bpmn_id
        };
      }
    }
  }
  
  // Try to extract from filename pattern
  // Pattern: {bpmnFile}-{elementId}-v2.html
  // If elementId is duplicate, we need to detect it
  
  // Common patterns:
  // - mortgage-se-{name}-{name}-v2.html → should be mortgage-se-{name}-v2.html
  // - mortgage-se-{name}-{other}-v2.html → should be mortgage-se-{name}-{other}-v2.html
  
  // Try to find the split point by checking if a part repeats
  const parts = base.split('-');
  for (let i = 1; i < parts.length; i++) {
    const firstPart = parts.slice(0, i).join('-');
    const secondPart = parts.slice(i).join('-');
    
    // Check if secondPart is a suffix of firstPart
    if (firstPart.endsWith(secondPart)) {
      // Found duplicate - firstPart is the bpmnFile base
      // We need to find the actual bpmnFile from bpmn-map.json
      for (const process of bpmnMap.processes) {
        const processBase = process.bpmn_file.replace('.bpmn', '');
        if (processBase === firstPart) {
          return {
            bpmnFile: process.bpmn_file,
            elementId: secondPart
          };
        }
      }
    }
  }
  
  return null;
}

async function main() {
  console.log('================================================================================');
  console.log('DÖPER OM FEATURE GOAL-FILER FÖR ATT TA BORT UPPREPADE DELAR');
  console.log('================================================================================\n');
  
  console.log(`📁 Mapp: ${FEATURE_GOALS_DIR}\n`);
  
  if (!fs.existsSync(FEATURE_GOALS_DIR)) {
    console.error(`❌ Mappen finns inte: ${FEATURE_GOALS_DIR}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(FEATURE_GOALS_DIR)
    .filter(file => file.endsWith('.html'))
    .map(file => ({
      oldPath: path.join(FEATURE_GOALS_DIR, file),
      oldName: file
    }));
  
  console.log(`🔍 Hittade ${files.length} HTML-filer\n`);
  
  const renames: Array<{ oldPath: string; oldName: string; newName: string; newPath: string }> = [];
  
  for (const file of files) {
    const parsed = parseFilename(file.oldName);
    
    if (!parsed) {
      // Filename is already correct or couldn't be parsed
      console.log(`  ⏭️  Skipping ${file.oldName} - already correct or couldn't parse`);
      continue;
    }
    
    const correctFilename = getFeatureGoalDocFileKey(
      parsed.bpmnFile,
      parsed.elementId,
      'v2'
    ).replace('feature-goals/', '');
    
    if (correctFilename === file.oldName) {
      console.log(`  ✅ ${file.oldName} - already correct`);
      continue;
    }
    
    const newPath = path.join(FEATURE_GOALS_DIR, correctFilename);
    
    // Check if target file already exists
    if (fs.existsSync(newPath)) {
      console.log(`  ⚠️  ${file.oldName} → ${correctFilename} - target exists, skipping`);
      continue;
    }
    
    renames.push({
      oldPath: file.oldPath,
      oldName: file.oldName,
      newName: correctFilename,
      newPath: newPath
    });
  }
  
  if (renames.length === 0) {
    console.log('\n✅ Inga filer behöver döpas om!\n');
    return;
  }
  
  console.log(`\n📋 Filer som ska döpas om (${renames.length}):\n`);
  for (const rename of renames) {
    console.log(`  ${rename.oldName}`);
    console.log(`  → ${rename.newName}\n`);
  }
  
  // Ask for confirmation (in a real scenario, you might want to add a --yes flag)
  console.log('⚠️  Detta kommer att döpa om filerna ovan.');
  console.log('   Tryck Ctrl+C för att avbryta, eller vänta 3 sekunder för att fortsätta...\n');
  
  // Wait 3 seconds
  await new Promise<void>(resolve => setTimeout(resolve, 3000));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const rename of renames) {
    try {
      fs.renameSync(rename.oldPath, rename.newPath);
      console.log(`  ✅ ${rename.oldName} → ${rename.newName}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error renaming ${rename.oldName}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n================================================================================');
  console.log('✅ KLAR');
  console.log('================================================================================\n');
  console.log(`📊 Sammanfattning:`);
  console.log(`   ✅ Döpta om: ${successCount}`);
  console.log(`   ❌ Fel: ${errorCount}`);
  console.log(`   📝 Totalt: ${renames.length} filer\n`);
}

main().catch(console.error);

