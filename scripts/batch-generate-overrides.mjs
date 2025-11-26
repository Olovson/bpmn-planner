#!/usr/bin/env node

/**
 * Batch Generate Overrides - Helper Script
 * 
 * Detta script hjälper dig att batch-generera innehåll för alla override-filer.
 * Stöder checkpoint/resume för att hantera kraschar gracefully.
 * 
 * Användning:
 *   node scripts/batch-generate-overrides.mjs [scope] [--resume]
 * 
 * Exempel:
 *   node scripts/batch-generate-overrides.mjs
 *   node scripts/batch-generate-overrides.mjs src/data/node-docs/epic
 *   node scripts/batch-generate-overrides.mjs mortgage-se-application.bpmn
 *   node scripts/batch-generate-overrides.mjs --resume  # Återuppta efter krasch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHECKPOINT_FILE = path.join(projectRoot, '.codex-batch-checkpoint.json');
const PROGRESS_FILE = path.join(projectRoot, '.codex-batch-progress.json');

// Hitta alla override-filer
function findOverrideFiles(scope = null) {
  const nodeDocsRoot = path.join(projectRoot, 'src', 'data', 'node-docs');
  const results = [];

  if (scope && scope.endsWith('.bpmn')) {
    // Scope är en BPMN-fil
    const bpmnBaseName = scope.replace('.bpmn', '');
    const docTypes = ['feature-goal', 'epic', 'business-rule'];

    for (const docType of docTypes) {
      const docTypeDir = path.join(nodeDocsRoot, docType);
      if (!fs.existsSync(docTypeDir)) continue;

      const files = fs.readdirSync(docTypeDir);
      for (const file of files) {
        if (file.endsWith('.doc.ts') && file.startsWith(`${bpmnBaseName}.`)) {
          results.push({
            filePath: path.join(docTypeDir, file),
            docType,
            relativePath: path.relative(projectRoot, path.join(docTypeDir, file)),
          });
        }
      }
    }
  } else {
    // Scope är en mapp eller null (alla filer)
    const targetDir = scope
      ? path.isAbsolute(scope)
        ? scope
        : path.join(projectRoot, scope)
      : nodeDocsRoot;

    if (!fs.existsSync(targetDir)) {
      console.error(`❌ Mappen finns inte: ${targetDir}`);
      process.exit(1);
    }

    function scanDirectory(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (file.endsWith('.doc.ts')) {
          const relativePath = path.relative(projectRoot, fullPath);
          const docType = path.relative(nodeDocsRoot, dir);
          results.push({
            filePath: fullPath,
            docType,
            relativePath,
          });
        }
      }
    }

    scanDirectory(targetDir);
  }

  return results;
}

// Kontrollera om en fil har TODO-platshållare
function hasTodoPlaceholders(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return (
    content.includes("'TODO'") ||
    content.includes('"TODO"') ||
    content.includes('TODO,') ||
    /:\s*\[\]\s*,/.test(content) || // tomma arrayer
    /:\s*''\s*,/.test(content) // tomma strängar
  );
}

// Ladda checkpoint (vilka filer som redan är klara)
function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) {
    return { completed: [], started: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    return {
      completed: data.completed || [],
      started: data.started || [],
    };
  } catch {
    return { completed: [], started: [] };
  }
}

// Spara checkpoint
function saveCheckpoint(completed, started) {
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify({ completed, started, timestamp: new Date().toISOString() }, null, 2),
    'utf-8'
  );
}

// Ladda progress
function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

// Spara progress
function saveProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Rensa checkpoint (starta om)
function clearCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
  }
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

// Huvudfunktion
function main() {
  const args = process.argv.slice(2);
  const resume = args.includes('--resume');
  const clear = args.includes('--clear');
  const scope = args.find((arg) => !arg.startsWith('--')) || null;

  if (clear) {
    clearCheckpoint();
    console.log('✅ Checkpoint rensad. Startar om från början.\n');
  }

  console.log('🔍 Söker efter override-filer...\n');

  const allFiles = findOverrideFiles(scope);
  const filesWithTodos = allFiles.filter((f) => hasTodoPlaceholders(f.filePath));

  console.log(`📊 Statistik:`);
  console.log(`   Totalt antal override-filer: ${allFiles.length}`);
  console.log(`   Filer med TODO-platshållare: ${filesWithTodos.length}`);
  console.log(`   Filer utan TODO: ${allFiles.length - filesWithTodos.length}\n`);

  if (filesWithTodos.length === 0) {
    console.log('✅ Alla filer är redan ifyllda! Inget att göra.');
    if (fs.existsSync(CHECKPOINT_FILE)) {
      clearCheckpoint();
    }
    return;
  }

  // Ladda checkpoint om resume
  let checkpoint = { completed: [], started: [] };
  if (resume) {
    checkpoint = loadCheckpoint();
    console.log(`📌 Återupptar från checkpoint:`);
    console.log(`   Klara filer: ${checkpoint.completed.length}`);
    console.log(`   Påbörjade filer: ${checkpoint.started.length}\n`);
  } else {
    // Spara initial progress
    saveProgress({
      total: filesWithTodos.length,
      completed: 0,
      started: 0,
      remaining: filesWithTodos.length,
      files: filesWithTodos.map((f) => ({
        path: f.relativePath,
        docType: f.docType,
        status: 'pending',
      })),
    });
  }

  // Filtrera bort redan klara filer
  const remainingFiles = filesWithTodos.filter(
    (f) => !checkpoint.completed.includes(f.relativePath)
  );

  if (remainingFiles.length === 0) {
    console.log('✅ Alla filer är redan klara enligt checkpoint!');
    console.log('   Kör med --clear för att starta om.\n');
    return;
  }

  // Gruppera per docType
  const byDocType = {};
  for (const file of remainingFiles) {
    if (!byDocType[file.docType]) {
      byDocType[file.docType] = [];
    }
    byDocType[file.docType].push(file);
  }

  console.log('📁 Filer att bearbeta, grupperade per typ:\n');
  for (const [docType, files] of Object.entries(byDocType)) {
    console.log(`   ${docType}: ${files.length} filer`);
  }

  // Skapa batchar (20-30 filer per batch)
  const BATCH_SIZE = 25;
  const batches = [];
  for (let i = 0; i < remainingFiles.length; i += BATCH_SIZE) {
    batches.push(remainingFiles.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n📦 Totalt ${batches.length} batchar (${BATCH_SIZE} filer per batch)\n`);

  console.log('='.repeat(70));
  console.log('📋 INSTRUKTION FÖR CODEX:');
  console.log('='.repeat(70) + '\n');

  console.log('Kopiera och klistra in detta i Codex-chatten:\n');

  console.log('```');
  console.log('Använd codexBatchOverrideHelper för att batch-generera innehåll');
  console.log(`för ${remainingFiles.length} override-filer med TODO-platshållare.`);

  if (resume) {
    console.log(`\n⚠️  ÅTERUPPTAGANDE: ${checkpoint.completed.length} filer är redan klara.`);
    console.log('   Bearbeta bara de filer som INTE är i checkpoint.\n');
  }

  if (scope) {
    console.log(`Scope: ${scope}\n`);
  }

  console.log('VIKTIGT - Checkpoint/Resume-stöd:');
  console.log('1. Efter varje batch (eller var 10:e fil), uppdatera checkpoint:');
  console.log('   - Lägg till klara filer i .codex-batch-checkpoint.json under "completed"');
  console.log('   - Format: ["src/data/node-docs/epic/file1.doc.ts", ...]');
  console.log('2. Om Codex kraschar, kör: npm run batch-overrides --resume');
  console.log('3. Codex kommer då bara bearbeta filer som INTE är i checkpoint\n');

  console.log('För varje fil:');
  console.log('1. Använd parseOverrideFileContext() för att läsa filen');
  console.log('2. Använd getCodexGenerationInstructions() för att få rätt prompt');
  console.log('3. Generera JSON enligt promptens instruktioner (svenska, formell bankton)');
  console.log('4. Använd mapLlmResponseToOverrides() för att konvertera till override-format');
  console.log('5. Uppdatera filen - ersätt ENDAST TODO-platshållare, behåll allt annat');
  console.log('6. När filen är klar, lägg till den i checkpoint\n');

  console.log('Bearbeta i batchar:');
  for (let i = 0; i < Math.min(batches.length, 5); i++) {
    const batch = batches[i];
    console.log(`\nBatch ${i + 1}/${batches.length} (${batch.length} filer):`);
    for (const file of batch.slice(0, 3)) {
      console.log(`  - ${file.relativePath}`);
    }
    if (batch.length > 3) {
      console.log(`  ... och ${batch.length - 3} fler`);
    }
  }
  if (batches.length > 5) {
    console.log(`\n... och ${batches.length - 5} fler batchar`);
  }

  console.log('\nEfter varje batch:');
  console.log('  - Uppdatera checkpoint med klara filer');
  console.log('  - Kontrollera att filerna är korrekt uppdaterade');
  console.log('  - Fortsätt med nästa batch\n');

  console.log('```\n');

  // Spara fil-lista
  const listFile = path.join(projectRoot, '.codex-batch-files.txt');
  const fileList = remainingFiles.map((f) => f.relativePath).join('\n');
  fs.writeFileSync(listFile, fileList, 'utf-8');

  // Spara batch-info
  const batchFile = path.join(projectRoot, '.codex-batch-batches.json');
  fs.writeFileSync(
    batchFile,
    JSON.stringify(
      batches.map((batch, i) => ({
        batchNumber: i + 1,
        files: batch.map((f) => f.relativePath),
      })),
      null,
      2
    ),
    'utf-8'
  );

  console.log(`💾 Fil-lista sparad i: ${path.relative(projectRoot, listFile)}`);
  console.log(`💾 Batch-info sparad i: ${path.relative(projectRoot, batchFile)}`);
  console.log(`💾 Checkpoint-fil: ${path.relative(projectRoot, CHECKPOINT_FILE)}\n`);

  console.log('💡 Tips:');
  console.log('   - Bearbeta batchar en i taget');
  console.log('   - Uppdatera checkpoint efter varje batch');
  console.log('   - Om Codex kraschar: npm run batch-overrides --resume');
  console.log('   - För att starta om: npm run batch-overrides --clear\n');

  // Visa checkpoint-status om det finns
  if (checkpoint.completed.length > 0) {
    console.log('📊 Nuvarande checkpoint-status:');
    console.log(`   ✅ Klara: ${checkpoint.completed.length} filer`);
    console.log(`   ⏳ Kvar: ${remainingFiles.length} filer\n`);
  }
}

main();
