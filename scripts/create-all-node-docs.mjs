#!/usr/bin/env node

/**
 * Create override files for ALL BPMN files
 * 
 * Detta script skapar override-filer för alla noder i alla BPMN-filer.
 * 
 * Användning:
 *   npm run create:all-node-docs
 * 
 * Detta kommer att:
 * 1. Hitta alla BPMN-filer i appen
 * 2. För varje BPMN-fil, skapa override-filer för alla relevanta noder
 * 3. Skippa filer som redan finns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Hitta alla BPMN-filer
function findBpmnFiles() {
  const candidateDirs = [
    path.join(projectRoot, 'public', 'bpmn'),
    path.join(projectRoot, 'tests', 'fixtures', 'bpmn'),
    path.join(projectRoot, 'tests', 'fixtures', 'bpmn', 'analytics'),
  ];

  const bpmnFiles = [];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.bpmn')) {
        bpmnFiles.push({
          fileName: file,
          fullPath: path.join(dir, file),
        });
      }
    }
  }

  return bpmnFiles;
}

// Huvudfunktion
function main() {
  console.log('🔍 Söker efter BPMN-filer...\n');

  const bpmnFiles = findBpmnFiles();

  if (bpmnFiles.length === 0) {
    console.log('❌ Inga BPMN-filer hittades.');
    console.log('Kontrollera att BPMN-filer finns i:');
    console.log('  - public/bpmn/');
    console.log('  - tests/fixtures/bpmn/');
    console.log('  - tests/fixtures/bpmn/analytics/');
    process.exit(1);
  }

  console.log(`📊 Hittade ${bpmnFiles.length} BPMN-filer:\n`);
  bpmnFiles.forEach((f, i) => {
    console.log(`   ${i + 1}. ${f.fileName}`);
  });

  console.log('\n🚀 Skapar override-filer för alla noder...\n');
  console.log('='.repeat(70) + '\n');

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < bpmnFiles.length; i++) {
    const bpmnFile = bpmnFiles[i];
    console.log(`[${i + 1}/${bpmnFiles.length}] Bearbetar: ${bpmnFile.fileName}`);

    const result = spawnSync(
      'node',
      [path.join(projectRoot, 'scripts', 'create-node-docs-from-bpmn.mjs'), bpmnFile.fileName],
      {
        stdio: 'pipe',
        encoding: 'utf-8',
      }
    );

    if (result.status === 0) {
      // Parse output för att få created/skipped count
      const output = result.stdout.toString();
      const createdMatch = output.match(/Created (\d+) override stub/);
      const skippedMatch = output.match(/skipped (\d+) existing/);
      
      const created = createdMatch ? parseInt(createdMatch[1], 10) : 0;
      const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;

      totalCreated += created;
      totalSkipped += skipped;

      if (created > 0) {
        console.log(`   ✅ Skapade ${created} override-filer`);
      }
      if (skipped > 0) {
        console.log(`   ⏭️  Hoppade över ${skipped} befintliga filer`);
      }
    } else {
      totalFailed += 1;
      console.log(`   ❌ Misslyckades (exit code ${result.status})`);
      if (result.stderr) {
        console.log(`   Fel: ${result.stderr.toString().trim()}`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('✅ Klart!\n');
  console.log(`📊 Sammanfattning:`);
  console.log(`   Totalt skapade: ${totalCreated} override-filer`);
  console.log(`   Hoppade över: ${totalSkipped} befintliga filer`);
  if (totalFailed > 0) {
    console.log(`   Misslyckades: ${totalFailed} BPMN-filer`);
  }
  console.log('');

  if (totalCreated > 0) {
    console.log('💡 Nästa steg:');
    console.log('   Kör: npm run codex:batch');
    console.log('   Detta kommer att generera innehåll för alla nya override-filer.\n');
  }
}

main();

