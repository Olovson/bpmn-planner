#!/usr/bin/env tsx
/**
 * Script to check if call activity documentation exists in storage
 * Helps diagnose why call activities don't show documentation in node-matrix
 */

import { supabase } from '../src/integrations/supabase/client';
import { getFeatureGoalDocFileKey, getNodeDocFileKey } from '../src/lib/nodeArtifactPaths';
import { buildBpmnProcessGraph } from '../src/lib/bpmnProcessGraph';
import { getVersionHashForFile } from '../src/lib/bpmnVersioning';

async function storageFileExists(filePath: string): Promise<boolean> {
  const parts = filePath.split('/');
  const fileName = parts.pop();
  const dir = parts.join('/');
  if (!fileName) return false;

  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .list(dir || undefined, { search: fileName, limit: 1 });

  if (error) {
    console.warn(`[storageFileExists] Error checking ${filePath}:`, error);
    return false;
  }

  return Boolean((data ?? []).find((entry) => entry.name === fileName));
}

async function checkAllPaths(paths: string[]): Promise<{ found: boolean; path?: string }> {
  for (const path of paths) {
    if (await storageFileExists(path)) {
      return { found: true, path };
    }
  }
  return { found: false };
}

async function main() {
  console.log('🔍 Checking call activity documentation...\n');

  // Get root file
  const rootFile = 'mortgage.bpmn';
  
  // Build process graph
  console.log('📊 Building process graph...');
  const { data: bpmnFiles } = await supabase.storage
    .from('bpmn-files')
    .list('', { search: '.bpmn' });
  
  const bpmnFileNames = (bpmnFiles || [])
    .filter(f => f.name.endsWith('.bpmn'))
    .map(f => f.name);

  const versionHashes = new Map<string, string | null>();
  for (const file of bpmnFileNames) {
    const hash = await getVersionHashForFile(file);
    versionHashes.set(file, hash);
  }

  const graph = await buildBpmnProcessGraph(rootFile, bpmnFileNames, versionHashes);

  // Find all call activities
  const callActivities = Array.from(graph.allNodes.values())
    .filter(node => node.type === 'callActivity');

  console.log(`\n📋 Found ${callActivities.length} call activities\n`);

  let foundCount = 0;
  let missingCount = 0;

  for (const node of callActivities) {
    const elementId = node.bpmnElementId || node.id;
    const bpmnFile = node.bpmnFile;
    const subprocessFile = node.subprocessFile;

    console.log(`\n🔍 Checking: ${node.name || elementId}`);
    console.log(`   BPMN File: ${bpmnFile}`);
    console.log(`   Element ID: ${elementId}`);
    console.log(`   Subprocess File: ${subprocessFile || 'N/A'}`);

    // Build possible paths
    const paths: string[] = [];

    // 1. Hierarkisk naming (med parent)
    if (subprocessFile && bpmnFile) {
      const hierarchicalKey = getFeatureGoalDocFileKey(
        subprocessFile,
        elementId,
        'v2',
        bpmnFile, // parent BPMN file
      );
      paths.push(`docs/local/${hierarchicalKey}`);
      paths.push(`docs/slow/chatgpt/${hierarchicalKey}`);
      paths.push(`docs/slow/ollama/${hierarchicalKey}`);
      paths.push(`docs/slow/${hierarchicalKey}`);
      paths.push(`docs/${hierarchicalKey}`);
    }

    // 2. Legacy naming (utan parent)
    if (subprocessFile) {
      const legacyKey = getFeatureGoalDocFileKey(
        subprocessFile,
        elementId,
        'v2',
        undefined, // Ingen parent
      );
      paths.push(`docs/local/${legacyKey}`);
      paths.push(`docs/slow/chatgpt/${legacyKey}`);
      paths.push(`docs/slow/ollama/${legacyKey}`);
      paths.push(`docs/slow/${legacyKey}`);
      paths.push(`docs/${legacyKey}`);
    }

    // 3. Wrong path (det som används nu)
    const wrongPath = `docs/${getNodeDocFileKey(bpmnFile, elementId)}`;
    paths.push(wrongPath);

    // Check all paths
    const result = await checkAllPaths(paths);
    
    if (result.found) {
      console.log(`   ✅ FOUND: ${result.path}`);
      foundCount++;
    } else {
      console.log(`   ❌ NOT FOUND`);
      console.log(`   ⚠️  Checked paths:`);
      paths.slice(0, 5).forEach(p => console.log(`      - ${p}`));
      missingCount++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Found: ${foundCount}`);
  console.log(`   ❌ Missing: ${missingCount}`);
  console.log(`   Total: ${callActivities.length}`);
}

main().catch(console.error);











