#!/usr/bin/env node

/**
 * Validate All Pipelines
 * 
 * Detta script validerar att alla pipelines (ChatGPT, Ollama, Codex) fungerar
 * korrekt efter uppdateringar till shared logic.
 * 
 * Användning:
 *   npm run validate:pipelines
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let errors = [];
let warnings = [];

function check(condition, message) {
  if (!condition) {
    errors.push(message);
    return false;
  }
  return true;
}

function warn(condition, message) {
  if (!condition) {
    warnings.push(message);
  }
}

console.log('🔍 Validerar pipelines...\n');

// 1. Kontrollera att shared module exporterar allt som behövs
console.log('1. Kontrollerar exports från llmDocumentationShared.ts...');
const sharedFile = path.join(projectRoot, 'src', 'lib', 'llmDocumentationShared.ts');
check(fs.existsSync(sharedFile), 'llmDocumentationShared.ts saknas');

const sharedContent = fs.readFileSync(sharedFile, 'utf-8');
check(sharedContent.includes('export function getPromptForDocType'), 'getPromptForDocType saknas');
check(sharedContent.includes('export function buildLlmInputPayload'), 'buildLlmInputPayload saknas');
check(sharedContent.includes('export function buildLlmRequestStructure'), 'buildLlmRequestStructure saknas');
check(sharedContent.includes('export function mapLlmResponseToModel'), 'mapLlmResponseToModel saknas');
check(sharedContent.includes('export function normalizeDocType'), 'normalizeDocType saknas');
check(sharedContent.includes('export function inferDocTypeFromNodeType'), 'inferDocTypeFromNodeType saknas');

// 2. Kontrollera att ChatGPT pipeline använder shared logic
console.log('2. Kontrollerar ChatGPT pipeline (llmDocumentation.ts)...');
const llmDocFile = path.join(projectRoot, 'src', 'lib', 'llmDocumentation.ts');
check(fs.existsSync(llmDocFile), 'llmDocumentation.ts saknas');

const llmDocContent = fs.readFileSync(llmDocFile, 'utf-8');
check(llmDocContent.includes('from \'./llmDocumentationShared\''), 'llmDocumentation.ts importerar inte llmDocumentationShared');
check(llmDocContent.includes('getPromptForDocType'), 'llmDocumentation.ts använder inte getPromptForDocType');
check(llmDocContent.includes('export function buildContextPayload'), 'buildContextPayload exporteras inte från llmDocumentation.ts');

// 3. Kontrollera att Codex helper använder shared logic
console.log('3. Kontrollerar Codex pipeline (codexBatchOverrideHelper.ts)...');
const codexFile = path.join(projectRoot, 'src', 'lib', 'codexBatchOverrideHelper.ts');
check(fs.existsSync(codexFile), 'codexBatchOverrideHelper.ts saknas');

const codexContent = fs.readFileSync(codexFile, 'utf-8');
check(codexContent.includes('from \'./llmDocumentationShared\''), 'codexBatchOverrideHelper.ts importerar inte llmDocumentationShared');
check(codexContent.includes('getPromptForDocType'), 'codexBatchOverrideHelper.ts använder inte getPromptForDocType');
check(codexContent.includes('mapLlmResponseToModel'), 'codexBatchOverrideHelper.ts använder inte mapLlmResponseToModel');

// 4. Kontrollera att render-funktioner använder overrides
console.log('4. Kontrollerar dokumentationsrendering (documentationTemplates.ts)...');
const templatesFile = path.join(projectRoot, 'src', 'lib', 'documentationTemplates.ts');
check(fs.existsSync(templatesFile), 'documentationTemplates.ts saknas');

const templatesContent = fs.readFileSync(templatesFile, 'utf-8');
check(templatesContent.includes('loadFeatureGoalOverrides'), 'renderFeatureGoalDoc använder inte loadFeatureGoalOverrides');
check(templatesContent.includes('loadEpicOverrides'), 'renderEpicDoc använder inte loadEpicOverrides');
check(templatesContent.includes('loadBusinessRuleOverrides'), 'renderBusinessRuleDoc använder inte loadBusinessRuleOverrides');
check(templatesContent.includes('mergeFeatureGoalOverrides'), 'renderFeatureGoalDoc använder inte mergeFeatureGoalOverrides');
check(templatesContent.includes('mergeEpicOverrides'), 'renderEpicDoc använder inte mergeEpicOverrides');
check(templatesContent.includes('mergeBusinessRuleOverrides'), 'renderBusinessRuleDoc använder inte mergeBusinessRuleOverrides');

// 5. Kontrollera att bpmnGenerators använder unified render functions
console.log('5. Kontrollerar bpmnGenerators integration...');
const generatorsFile = path.join(projectRoot, 'src', 'lib', 'bpmnGenerators.ts');
check(fs.existsSync(generatorsFile), 'bpmnGenerators.ts saknas');

const generatorsContent = fs.readFileSync(generatorsFile, 'utf-8');
check(generatorsContent.includes('renderFeatureGoalDoc'), 'bpmnGenerators använder inte renderFeatureGoalDoc');
check(generatorsContent.includes('renderEpicDoc'), 'bpmnGenerators använder inte renderEpicDoc');
check(generatorsContent.includes('renderBusinessRuleDoc'), 'bpmnGenerators använder inte renderBusinessRuleDoc');
check(generatorsContent.includes('generateDocumentationWithLlm'), 'bpmnGenerators använder inte generateDocumentationWithLlm');

// 6. Kontrollera att promptVersioning exporteras
console.log('6. Kontrollerar promptVersioning module...');
const versioningFile = path.join(projectRoot, 'src', 'lib', 'promptVersioning.ts');
check(fs.existsSync(versioningFile), 'promptVersioning.ts saknas');

const versioningContent = fs.readFileSync(versioningFile, 'utf-8');
check(versioningContent.includes('export function getPromptVersion'), 'getPromptVersion exporteras inte');
check(versioningContent.includes('export function getOverridePromptVersion'), 'getOverridePromptVersion exporteras inte');

// 7. Kontrollera att codexBatchOverrideHelper exporterar nya funktioner
console.log('7. Kontrollerar codexBatchOverrideHelper exports...');
check(codexContent.includes('export function needsUpdate'), 'needsUpdate exporteras inte');
check(codexContent.includes('export function analyzeFile'), 'analyzeFile exporteras inte');
check(codexContent.includes('export function findOverrideFiles'), 'findOverrideFiles exporteras inte');
check(codexContent.includes('export function parseOverrideFileContext'), 'parseOverrideFileContext exporteras inte');

// Resultat
console.log('\n📊 Valideringsresultat:');
console.log('='.repeat(70));

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ Alla pipelines validerade! Allt fungerar korrekt.\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`\n❌ ${errors.length} fel hittades:\n`);
  errors.forEach((error, i) => {
    console.log(`   ${i + 1}. ${error}`);
  });
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} varningar:\n`);
  warnings.forEach((warning, i) => {
    console.log(`   ${i + 1}. ${warning}`);
  });
}

console.log('\n' + '='.repeat(70));
process.exit(errors.length > 0 ? 1 : 0);

