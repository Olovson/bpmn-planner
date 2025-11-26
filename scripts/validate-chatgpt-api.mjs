#!/usr/bin/env node

/**
 * Validate ChatGPT API Integration
 * 
 * Detta script validerar att ChatGPT API-integrationen fungerar korrekt.
 * 
 * Användning:
 *   node scripts/validate-chatgpt-api.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let errors = [];
let warnings = [];
let success = [];

function check(condition, message) {
  if (!condition) {
    errors.push(message);
    return false;
  }
  success.push(message);
  return true;
}

function warn(condition, message) {
  if (!condition) {
    warnings.push(message);
  } else {
    success.push(message);
  }
}

console.log('🔍 Validerar ChatGPT API-integration...\n');

// 1. Kontrollera att huvudfilerna finns
console.log('1. Kontrollerar huvudfiler...');
const llmDocFile = path.join(projectRoot, 'src', 'lib', 'llmDocumentation.ts');
check(fs.existsSync(llmDocFile), '✅ llmDocumentation.ts finns');

const cloudClientFile = path.join(projectRoot, 'src', 'lib', 'llmClients', 'cloudLlmClient.ts');
check(fs.existsSync(cloudClientFile), '✅ cloudLlmClient.ts finns');

const llmClientFile = path.join(projectRoot, 'src', 'lib', 'llmClient.ts');
check(fs.existsSync(llmClientFile), '✅ llmClient.ts finns');

const bpmnGeneratorsFile = path.join(projectRoot, 'src', 'lib', 'bpmnGenerators.ts');
check(fs.existsSync(bpmnGeneratorsFile), '✅ bpmnGenerators.ts finns');

// 2. Kontrollera att generateDocumentationWithLlm exporteras
console.log('\n2. Kontrollerar exports...');
const llmDocContent = fs.readFileSync(llmDocFile, 'utf-8');
check(llmDocContent.includes('export async function generateDocumentationWithLlm'), 
  '✅ generateDocumentationWithLlm exporteras');
check(llmDocContent.includes('export function buildContextPayload'), 
  '✅ buildContextPayload exporteras');

// 3. Kontrollera att cloudLlmClient är korrekt implementerad
console.log('\n3. Kontrollerar cloudLlmClient...');
const cloudClientContent = fs.readFileSync(cloudClientFile, 'utf-8');
check(cloudClientContent.includes('export class CloudLlmClient'), 
  '✅ CloudLlmClient-klassen finns');
check(cloudClientContent.includes('VITE_OPENAI_API_KEY'), 
  '✅ Använder VITE_OPENAI_API_KEY');
check(cloudClientContent.includes('gpt-4o'), 
  '✅ Använder gpt-4o-modellen');
check(cloudClientContent.includes('generateText'), 
  '✅ generateText-metoden finns');

// 4. Kontrollera att bpmnGenerators använder generateDocumentationWithLlm
console.log('\n4. Kontrollerar integration...');
const bpmnGeneratorsContent = fs.readFileSync(bpmnGeneratorsFile, 'utf-8');
check(bpmnGeneratorsContent.includes('generateDocumentationWithLlm'), 
  '✅ bpmnGenerators använder generateDocumentationWithLlm');
check(bpmnGeneratorsContent.includes('from \'@/lib/llmDocumentation\''), 
  '✅ bpmnGenerators importerar från llmDocumentation');

// 5. Kontrollera att llmDocumentationShared används korrekt
console.log('\n5. Kontrollerar shared logic...');
const sharedFile = path.join(projectRoot, 'src', 'lib', 'llmDocumentationShared.ts');
check(fs.existsSync(sharedFile), '✅ llmDocumentationShared.ts finns');

const sharedContent = fs.readFileSync(sharedFile, 'utf-8');
check(sharedContent.includes('export function getPromptForDocType'), 
  '✅ getPromptForDocType exporteras');

check(llmDocContent.includes('getPromptForDocType'), 
  '✅ llmDocumentation.ts använder getPromptForDocType');

// 6. Kontrollera att prompt-filer finns
console.log('\n6. Kontrollerar prompt-filer...');
const promptsDir = path.join(projectRoot, 'prompts', 'llm');
check(fs.existsSync(promptsDir), '✅ prompts/llm-katalog finns');

const featureEpicPrompt = path.join(promptsDir, 'feature_epic_prompt.md');
check(fs.existsSync(featureEpicPrompt), '✅ feature_epic_prompt.md finns');

const businessRulePrompt = path.join(promptsDir, 'dmn_businessrule_prompt.md');
check(fs.existsSync(businessRulePrompt), '✅ dmn_businessrule_prompt.md finns');

// 7. Kontrollera att isLlmEnabled fungerar
console.log('\n7. Kontrollerar LLM-aktivering...');
check(llmDocContent.includes('isLlmEnabled'), 
  '✅ generateDocumentationWithLlm kontrollerar isLlmEnabled');

// 8. Kontrollera att fallback-logik finns
console.log('\n8. Kontrollerar fallback-logik...');
check(bpmnGeneratorsContent.includes('renderDocWithLlmFallback'), 
  '✅ renderDocWithLlmFallback finns');
check(bpmnGeneratorsContent.includes('fallback'), 
  '✅ Fallback-logik finns');

// 9. Kontrollera att validering finns
console.log('\n9. Kontrollerar validering...');
check(llmDocContent.includes('validateResponse'), 
  '✅ Response-validering finns');
check(llmDocContent.includes('validateBusinessRuleJson') || 
      llmDocContent.includes('validateFeatureGoalJson') || 
      llmDocContent.includes('validateEpicJson'), 
  '✅ JSON-validering finns');

// 10. Kontrollera att error handling finns
console.log('\n10. Kontrollerar error handling...');
check(llmDocContent.includes('catch'), 
  '✅ Error handling finns');
check(llmDocContent.includes('logLlmEvent'), 
  '✅ LLM-event-logging finns');

// Resultat
console.log('\n' + '='.repeat(70));
console.log('📊 Valideringsresultat:');
console.log('='.repeat(70) + '\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log(`✅ Alla ${success.length} kontroller lyckades!\n`);
  console.log('ChatGPT API-integrationen är korrekt konfigurerad och redo att användas.\n');
  console.log('För att använda ChatGPT API:et:');
  console.log('1. Sätt VITE_OPENAI_API_KEY i din .env-fil');
  console.log('2. Sätt VITE_USE_LLM=true i din .env-fil');
  console.log('3. Öppna appen i webbläsaren');
  console.log('4. Navigera till en BPMN-fil och klicka på "Generera dokumentation"\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length} fel hittades:\n`);
  errors.forEach((error, i) => {
    console.log(`   ${i + 1}. ${error}`);
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} varningar:\n`);
  warnings.forEach((warning, i) => {
    console.log(`   ${i + 1}. ${warning}`);
  });
  console.log('');
}

if (success.length > 0) {
  console.log(`✅ ${success.length} kontroller lyckades:\n`);
  success.forEach((msg, i) => {
    console.log(`   ${i + 1}. ${msg}`);
  });
  console.log('');
}

console.log('='.repeat(70));
process.exit(errors.length > 0 ? 1 : 0);

