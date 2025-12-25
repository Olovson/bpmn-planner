#!/usr/bin/env node
/**
 * Script to regenerate documentation for User Task epics only
 * 
 * Usage:
 *   node scripts/regenerate-user-task-epics.mjs
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '../.env.local');
try {
  const envContents = readFileSync(envPath, 'utf-8');
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    const value = rest.join('=');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // Optional file
}

// Read the list of User Task epics
const listPath = join(__dirname, '../user-task-epics-list.json');
let userTaskEpics;
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

console.log('📝 Instructions for regeneration:\n');
console.log('This script cannot directly call the TypeScript generation functions.');
console.log('Instead, you need to use the UI or create a TypeScript script.\n');
console.log('Option 1: Use the UI (BpmnFileManager page)');
console.log('  - Go to the BpmnFileManager page');
console.log('  - Select a BPMN file that contains User Tasks');
console.log('  - Click "Generate Documentation"');
console.log('  - The nodeFilter will be applied automatically\n');
console.log('Option 2: Create a TypeScript script (recommended for batch)');
console.log('  - See scripts/regenerate-user-task-epics.ts (to be created)\n');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📋 User Task Epics to regenerate:\n');

// Group by BPMN file
const epicsByFile = new Map();
for (const epic of userTaskEpics) {
  if (!epicsByFile.has(epic.bpmnFile)) {
    epicsByFile.set(epic.bpmnFile, []);
  }
  epicsByFile.get(epic.bpmnFile).push(epic);
}

// Sort files
const sortedFiles = Array.from(epicsByFile.keys()).sort();

for (const bpmnFile of sortedFiles) {
  const epics = epicsByFile.get(bpmnFile);
  console.log(`📄 ${bpmnFile} (${epics.length} User Tasks):`);
  epics.forEach(epic => {
    console.log(`   - ${epic.nodeName} (${epic.elementId})`);
  });
  console.log('');
}

console.log(`\n✅ Total: ${userTaskEpics.length} User Task epics across ${sortedFiles.length} BPMN files`);
console.log('\n💡 Next step: Create a TypeScript script to call generateAllFromBpmnWithGraph');
console.log('   with a nodeFilter that matches these epics.');










