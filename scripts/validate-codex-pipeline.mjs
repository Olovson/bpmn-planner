#!/usr/bin/env node

/**
 * Validate Codex Batch Pipeline
 * 
 * Detta script validerar att hela Codex batch-pipelinen är redo för produktion.
 * Kör detta innan du kör på 200+ noder.
 * 
 * Användning:
 *   npm run validate:codex-pipeline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let errors = [];
let warnings = [];

function check(condition, message, isWarning = false) {
  if (!condition) {
    if (isWarning) {
      warnings.push(message);
    } else {
      errors.push(message);
    }
  }
}

console.log('🔍 Validerar Codex Batch Pipeline...\n');

// 1. Kontrollera att alla nödvändiga filer finns
console.log('1. Kontrollerar filer...');
check(fs.existsSync(path.join(projectRoot, 'scripts', 'codex-batch-auto.mjs')), 'codex-batch-auto.mjs saknas');
check(fs.existsSync(path.join(projectRoot, 'scripts', 'check-prompt-versions.mjs')), 'check-prompt-versions.mjs saknas');
check(fs.existsSync(path.join(projectRoot, 'src', 'lib', 'llmDocumentationShared.ts')), 'llmDocumentationShared.ts saknas');
check(fs.existsSync(path.join(projectRoot, 'src', 'lib', 'codexBatchOverrideHelper.ts')), 'codexBatchOverrideHelper.ts saknas');
check(fs.existsSync(path.join(projectRoot, 'prompts', 'llm', 'feature_epic_prompt.md')), 'feature_epic_prompt.md saknas');
check(fs.existsSync(path.join(projectRoot, 'prompts', 'llm', 'dmn_businessrule_prompt.md')), 'dmn_businessrule_prompt.md saknas');

// 2. Kontrollera att prompt-filer har versioner
console.log('2. Kontrollerar prompt-versioner...');
const featureEpicPrompt = fs.readFileSync(path.join(projectRoot, 'prompts', 'llm', 'feature_epic_prompt.md'), 'utf-8');
const businessRulePrompt = fs.readFileSync(path.join(projectRoot, 'prompts', 'llm', 'dmn_businessrule_prompt.md'), 'utf-8');

check(featureEpicPrompt.includes('PROMPT VERSION'), 'feature_epic_prompt.md saknar version-kommentar');
check(businessRulePrompt.includes('PROMPT VERSION'), 'dmn_businessrule_prompt.md saknar version-kommentar');

// 3. Kontrollera att npm scripts finns
console.log('3. Kontrollerar npm scripts...');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
check(packageJson.scripts['codex:batch:auto'], 'npm script codex:batch:auto saknas');
check(packageJson.scripts['check:prompt-versions'], 'npm script check:prompt-versions saknas');
check(packageJson.scripts['create:all-node-docs'], 'npm script create:all-node-docs saknas');

// 4. Kontrollera att .gitignore inkluderar statusfiler
console.log('4. Kontrollerar .gitignore...');
const gitignore = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf-8');
check(gitignore.includes('.codex-batch-all.md') || gitignore.includes('codex-batch'), '.codex-batch-all.md saknas i .gitignore', true);
check(gitignore.includes('.codex-batch-status.json') || gitignore.includes('codex-batch'), '.codex-batch-status.json saknas i .gitignore', true);

// 5. Kontrollera att test-filer finns
console.log('5. Kontrollerar tester...');
check(fs.existsSync(path.join(projectRoot, 'tests', 'unit', 'llmDocumentationShared.test.ts')), 'llmDocumentationShared.test.ts saknas');
check(fs.existsSync(path.join(projectRoot, 'tests', 'unit', 'promptVersioning.test.ts')), 'promptVersioning.test.ts saknas');
check(fs.existsSync(path.join(projectRoot, 'tests', 'unit', 'codexBatchOverrideHelper.test.ts')), 'codexBatchOverrideHelper.test.ts saknas');

// 6. Kontrollera att dokumentation finns
console.log('6. Kontrollerar dokumentation...');
check(fs.existsSync(path.join(projectRoot, 'docs', 'CODEX_BATCH_AUTO.md')), 'CODEX_BATCH_AUTO.md saknas');
check(fs.existsSync(path.join(projectRoot, 'docs', 'PROMPT_VERSIONING.md')), 'PROMPT_VERSIONING.md saknas');
check(fs.existsSync(path.join(projectRoot, 'docs', 'FALLBACK_SAFETY.md')), 'FALLBACK_SAFETY.md saknas');

// 7. Testa att scriptet kan köras (dry-run)
console.log('7. Testar script-körning...');
try {
  // Simulera en körning genom att kontrollera att funktionerna finns
  const scriptContent = fs.readFileSync(path.join(projectRoot, 'scripts', 'codex-batch-auto.mjs'), 'utf-8');
  check(scriptContent.includes('findOverrideFiles'), 'findOverrideFiles funktion saknas');
  check(scriptContent.includes('needsUpdate'), 'needsUpdate funktion saknas');
  check(scriptContent.includes('analyzeFile'), 'analyzeFile funktion saknas');
  check(scriptContent.includes('.codex-batch-status.json'), 'Statusfil-hantering saknas');
} catch (err) {
  errors.push(`Kunde inte läsa codex-batch-auto.mjs: ${err.message}`);
}

// 8. Kontrollera att node-docs kataloger finns
console.log('8. Kontrollerar katalogstruktur...');
const nodeDocsRoot = path.join(projectRoot, 'src', 'data', 'node-docs');
if (fs.existsSync(nodeDocsRoot)) {
  const docTypes = ['feature-goal', 'epic', 'business-rule'];
  for (const docType of docTypes) {
    const docTypeDir = path.join(nodeDocsRoot, docType);
    if (fs.existsSync(docTypeDir)) {
      const files = fs.readdirSync(docTypeDir).filter(f => f.endsWith('.doc.ts'));
      check(files.length >= 0, `${docType} katalog finns`, true); // Bara info
    }
  }
} else {
  warnings.push('src/data/node-docs/ katalog saknas (kommer skapas vid första körning)');
}

// 9. Kontrollera att shared moduler exporterar rätt funktioner
console.log('9. Kontrollerar modul-exports...');
try {
  const sharedContent = fs.readFileSync(path.join(projectRoot, 'src', 'lib', 'llmDocumentationShared.ts'), 'utf-8');
  check(sharedContent.includes('export function getPromptForDocType'), 'getPromptForDocType saknas');
  check(sharedContent.includes('export function buildLlmInputPayload'), 'buildLlmInputPayload saknas');
  check(sharedContent.includes('export function mapLlmResponseToModel'), 'mapLlmResponseToModel saknas');
} catch (err) {
  errors.push(`Kunde inte läsa llmDocumentationShared.ts: ${err.message}`);
}

// 10. Kontrollera att helper-modulen har rätt funktioner
console.log('10. Kontrollerar helper-modul...');
try {
  const helperContent = fs.readFileSync(path.join(projectRoot, 'src', 'lib', 'codexBatchOverrideHelper.ts'), 'utf-8');
  check(helperContent.includes('export function findOverrideFiles'), 'findOverrideFiles saknas');
  check(helperContent.includes('export function parseOverrideFileContext'), 'parseOverrideFileContext saknas');
  check(helperContent.includes('export function getCodexGenerationInstructions'), 'getCodexGenerationInstructions saknas');
} catch (err) {
  errors.push(`Kunde inte läsa codexBatchOverrideHelper.ts: ${err.message}`);
}

// Sammanfattning
console.log('\n' + '='.repeat(70));
console.log('📊 Valideringsresultat:');
console.log('='.repeat(70) + '\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Alla kontroller passerade! Pipelinen är redo.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} fel hittades:\n`);
    errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} varningar:\n`);
    warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('❌ Pipelinen är INTE redo. Åtgärda felen ovan.\n');
    process.exit(1);
  } else {
    console.log('⚠️  Pipelinen är redo, men det finns varningar. Granska dem ovan.\n');
    process.exit(0);
  }
}

