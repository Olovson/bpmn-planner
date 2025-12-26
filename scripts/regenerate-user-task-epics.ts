#!/usr/bin/env tsx
/**
 * Script to regenerate documentation for User Task epics only
 * 
 * Usage:
 *   npx tsx scripts/regenerate-user-task-epics.ts
 * 
 * This script:
 * 1. Reads user-task-epics-list.json
 * 2. Uses generateAllFromBpmnWithGraph with a nodeFilter to only generate User Task epics
 * 3. Saves regenerated documentation to storage
 * 
 * This is a temporary fix to regenerate only User Task epics after fixing the lane inference logic.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateAllFromBpmnWithGraph } from '../src/lib/bpmnGenerators';
import { supabase } from '../src/integrations/supabase/client';
import type { BpmnProcessNode } from '../src/lib/bpmnProcessGraph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the list of User Task epics
const listPath = join(__dirname, '../user-task-epics-list.json');
let userTaskEpics: Array<{ bpmnFile: string; elementId: string; nodeName: string; storagePath: string }>;
try {
  const listContent = readFileSync(listPath, 'utf-8');
  userTaskEpics = JSON.parse(listContent);
} catch (error) {
  console.error(`❌ Could not read ${listPath}:`, error.message);
  console.error('   Run "node scripts/list-all-user-task-epics.mjs" first to generate the list.');
  process.exit(1);
}

console.log(`📋 Found ${userTaskEpics.length} User Task epics to regenerate\n`);

// Create a Set for fast lookup: "bpmnFile:elementId"
const epicKeys = new Set(
  userTaskEpics.map(epic => `${epic.bpmnFile}:${epic.elementId}`)
);

// Create nodeFilter function
const nodeFilter = (node: BpmnProcessNode): boolean => {
  // Only process User Tasks
  if (node.type !== 'userTask') {
    return false;
  }
  
  // Check if this epic is in our list
  const key = `${node.bpmnFile}:${node.bpmnElementId}`;
  return epicKeys.has(key);
};

async function main() {
  // Get all BPMN files
  const { data: bpmnFiles } = await supabase.storage
    .from('bpmn-files')
    .list('', { search: '.bpmn' });
  
  const bpmnFileNames = (bpmnFiles || [])
    .filter(f => f.name.endsWith('.bpmn'))
    .map(f => f.name);

  if (bpmnFileNames.length === 0) {
    console.error('❌ No BPMN files found in storage');
    process.exit(1);
  }

  console.log(`📊 Found ${bpmnFileNames.length} BPMN files in storage\n`);

  // Group epics by BPMN file
  const epicsByFile = new Map<string, typeof userTaskEpics>();
  for (const epic of userTaskEpics) {
    if (!epicsByFile.has(epic.bpmnFile)) {
      epicsByFile.set(epic.bpmnFile, []);
    }
    epicsByFile.get(epic.bpmnFile)!.push(epic);
  }

  // Process each BPMN file that has User Task epics
  const filesToProcess = Array.from(epicsByFile.keys()).filter(file => 
    bpmnFileNames.includes(file)
  );

  console.log(`📝 Processing ${filesToProcess.length} BPMN files with User Task epics:\n`);

  for (const bpmnFile of filesToProcess) {
    const epics = epicsByFile.get(bpmnFile)!;
    console.log(`\n📄 Processing ${bpmnFile} (${epics.length} User Tasks):`);
    epics.forEach(epic => {
      console.log(`   - ${epic.nodeName} (${epic.elementId})`);
    });

    try {
      console.log(`   🔄 Generating documentation...`);
      
      const result = await generateAllFromBpmnWithGraph(
        bpmnFile,
        bpmnFileNames,
        [], // existingDmnFiles
        true, // useHierarchy
        true, // useLlm
        (type, message, detail) => {
          if (type === 'docgen:file') {
            console.log(`      ${message}: ${detail}`);
          }
        },
        'regenerate-user-task-epics-script',
        'cloud', // llmProvider
        false, // localAvailable
        'v2', // featureGoalTemplateVersion
        nodeFilter, // ✅ Only generate User Task epics from our list
      );

      console.log(`   ✅ Generated ${result.generatedDocs.size} documentation files`);
      console.log(`   ✅ Generated ${result.generatedFeatureGoals.size} feature goals`);
      
    } catch (error) {
      console.error(`   ❌ Error processing ${bpmnFile}:`, error);
      if (error instanceof Error) {
        console.error(`      ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Completed regeneration of User Task epics`);
}

main().catch(console.error);















