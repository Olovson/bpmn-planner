#!/usr/bin/env node

/**
 * Validate ChatGPT Pipeline - Critical Scenarios
 * 
 * Detta script validerar ChatGPT-pipelinen för kritiska scenarion innan
 * man använder den i produktion (eftersom det kostar pengar).
 * 
 * Användning:
 *   node scripts/validate-chatgpt-scenarios.mjs
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

console.log('🔍 Validerar ChatGPT Pipeline - Kritiska Scenarion\n');
console.log('='.repeat(70));
console.log('⚠️  VIKTIGT: Detta validerar strukturen, inte faktiska API-anrop');
console.log('   För att testa faktiska API-anrop, använd test:llm:smoke');
console.log('='.repeat(70) + '\n');

// ============================================================================
// Scenario 1: Lokal dokumentation finns redan
// ============================================================================
console.log('📋 Scenario 1: Lokal dokumentation finns redan\n');

const nodeDocsDir = path.join(projectRoot, 'src', 'data', 'node-docs');
const epicDir = path.join(nodeDocsDir, 'epic');
const featureGoalDir = path.join(nodeDocsDir, 'feature-goal');
const businessRuleDir = path.join(nodeDocsDir, 'business-rule');

// Kolla om override-filer finns
const overrideFiles = {
  epic: fs.existsSync(epicDir) ? fs.readdirSync(epicDir).filter(f => f.endsWith('.doc.ts')).length : 0,
  featureGoal: fs.existsSync(featureGoalDir) ? fs.readdirSync(featureGoalDir).filter(f => f.endsWith('.doc.ts')).length : 0,
  businessRule: fs.existsSync(businessRuleDir) ? fs.readdirSync(businessRuleDir).filter(f => f.endsWith('.doc.ts')).length : 0,
};

console.log(`   Override-filer hittade:`);
console.log(`   - Epic: ${overrideFiles.epic}`);
console.log(`   - Feature Goal: ${overrideFiles.featureGoal}`);
console.log(`   - Business Rule: ${overrideFiles.businessRule}\n`);

// Validera att override-systemet fungerar
const overrideModule = path.join(projectRoot, 'src', 'lib', 'nodeDocOverrides.ts');
check(fs.existsSync(overrideModule), '✅ nodeDocOverrides.ts finns');

if (fs.existsSync(overrideModule)) {
  const overrideContent = fs.readFileSync(overrideModule, 'utf-8');
  check(overrideContent.includes('loadFeatureGoalOverrides'), 
    '✅ loadFeatureGoalOverrides finns');
  check(overrideContent.includes('loadEpicOverrides'), 
    '✅ loadEpicOverrides finns');
  check(overrideContent.includes('loadBusinessRuleOverrides'), 
    '✅ loadBusinessRuleOverrides finns');
  check(overrideContent.includes('mergeFeatureGoalOverrides'), 
    '✅ mergeFeatureGoalOverrides finns');
  check(overrideContent.includes('mergeEpicOverrides'), 
    '✅ mergeEpicOverrides finns');
  check(overrideContent.includes('mergeBusinessRuleOverrides'), 
    '✅ mergeBusinessRuleOverrides finns');
}

// Validera att render-funktioner använder overrides
const templatesModule = path.join(projectRoot, 'src', 'lib', 'documentationTemplates.ts');
check(fs.existsSync(templatesModule), '✅ documentationTemplates.ts finns');

if (fs.existsSync(templatesModule)) {
  const templatesContent = fs.readFileSync(templatesModule, 'utf-8');
  check(templatesContent.includes('loadFeatureGoalOverrides'), 
    '✅ renderFeatureGoalDoc använder loadFeatureGoalOverrides');
  check(templatesContent.includes('loadEpicOverrides'), 
    '✅ renderEpicDoc använder loadEpicOverrides');
  check(templatesContent.includes('loadBusinessRuleOverrides'), 
    '✅ renderBusinessRuleDoc använder loadBusinessRuleOverrides');
}

// ============================================================================
// Scenario 2: Ingen lokal dokumentation finns
// ============================================================================
console.log('\n📋 Scenario 2: Ingen lokal dokumentation finns\n');

const llmDocModule = path.join(projectRoot, 'src', 'lib', 'llmDocumentation.ts');
const llmDocContent = fs.readFileSync(llmDocModule, 'utf-8');

check(llmDocContent.includes('generateDocumentationWithLlm'), 
  '✅ generateDocumentationWithLlm finns');
check(llmDocContent.includes('buildContextPayload'), 
  '✅ buildContextPayload finns');
check(llmDocContent.includes('isLlmEnabled'), 
  '✅ isLlmEnabled kontrolleras');

// Validera fallback-logik
const bpmnGeneratorsModule = path.join(projectRoot, 'src', 'lib', 'bpmnGenerators.ts');
const bpmnGeneratorsContent = fs.readFileSync(bpmnGeneratorsModule, 'utf-8');

check(bpmnGeneratorsContent.includes('renderDocWithLlmFallback'), 
  '✅ renderDocWithLlmFallback finns');
check(bpmnGeneratorsContent.includes('fallback'), 
  '✅ Fallback-logik finns');

// ============================================================================
// Scenario 3: Override-filer har fel format
// ============================================================================
console.log('\n📋 Scenario 3: Override-filer har fel format\n');

// Kolla om det finns override-filer med potentiella problem
let invalidOverrides = 0;
if (fs.existsSync(epicDir)) {
  const epicFiles = fs.readdirSync(epicDir).filter(f => f.endsWith('.doc.ts'));
  for (const file of epicFiles.slice(0, 5)) { // Kolla första 5
    const filePath = path.join(epicDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Kolla efter vanliga problem
    if (content.includes('TODO') && !content.includes('NODE CONTEXT')) {
      invalidOverrides++;
      warnings.push(`⚠️  ${file} har TODO men saknar NODE CONTEXT`);
    }
  }
}

if (invalidOverrides === 0) {
  success.push('✅ Inga uppenbara problem i override-filer (sample)');
}

// ============================================================================
// Scenario 4: BPMN-filer saknas eller är ogiltiga
// ============================================================================
console.log('\n📋 Scenario 4: BPMN-filer saknas eller är ogiltiga\n');

const bpmnParserModule = path.join(projectRoot, 'src', 'lib', 'bpmnParser.ts');
check(fs.existsSync(bpmnParserModule), '✅ bpmnParser.ts finns');

if (fs.existsSync(bpmnParserModule)) {
  const parserContent = fs.readFileSync(bpmnParserModule, 'utf-8');
  check(parserContent.includes('parseBpmnFile'), 
    '✅ parseBpmnFile finns');
  check(parserContent.includes('catch') || parserContent.includes('try'), 
    '✅ Error handling finns i parser');
}

// ============================================================================
// Scenario 5: Hierarki byggs om varje gång
// ============================================================================
console.log('\n📋 Scenario 5: Hierarki byggs om varje gång\n');

const processGraphModule = path.join(projectRoot, 'src', 'lib', 'bpmnProcessGraph.ts');
check(fs.existsSync(processGraphModule), '✅ bpmnProcessGraph.ts finns');

if (fs.existsSync(processGraphModule)) {
  const graphContent = fs.readFileSync(processGraphModule, 'utf-8');
  check(graphContent.includes('buildBpmnProcessGraph'), 
    '✅ buildBpmnProcessGraph finns');
  
  // Varning: Ingen caching hittades
  warn(graphContent.includes('cache') || graphContent.includes('Cache'), 
    '⚠️  Ingen explicit caching hittades - hierarki byggs om varje gång');
}

// ============================================================================
// Scenario 6: LLM API-nyckel saknas eller är ogiltig
// ============================================================================
console.log('\n📋 Scenario 6: LLM API-nyckel saknas eller är ogiltig\n');

const cloudClientModule = path.join(projectRoot, 'src', 'lib', 'llmClients', 'cloudLlmClient.ts');
check(fs.existsSync(cloudClientModule), '✅ cloudLlmClient.ts finns');

if (fs.existsSync(cloudClientModule)) {
  const clientContent = fs.readFileSync(cloudClientModule, 'utf-8');
  check(clientContent.includes('VITE_OPENAI_API_KEY'), 
    '✅ VITE_OPENAI_API_KEY används');
  check(clientContent.includes('shouldEnableLlm'), 
    '✅ shouldEnableLlm kontrolleras');
  check(clientContent.includes('isLlmEnabled') || clientContent.includes('USE_LLM'), 
    '✅ LLM-aktivering kontrolleras');
}

// ============================================================================
// Scenario 7: Response-validering fungerar
// ============================================================================
console.log('\n📋 Scenario 7: Response-validering fungerar\n');

check(llmDocContent.includes('validateResponse'), 
  '✅ validateResponse finns');
check(llmDocContent.includes('validateBusinessRuleJson') || 
      llmDocContent.includes('validateFeatureGoalJson') || 
      llmDocContent.includes('validateEpicJson'), 
  '✅ JSON-validering finns');
check(llmDocContent.includes('validateHtmlContent'), 
  '✅ HTML-validering finns');

// ============================================================================
// Scenario 8: Error handling och fallback
// ============================================================================
console.log('\n📋 Scenario 8: Error handling och fallback\n');

check(llmDocContent.includes('catch'), 
  '✅ Error handling finns');
check(llmDocContent.includes('logLlmEvent'), 
  '✅ LLM-event-logging finns');
check(llmDocContent.includes('fallbackUsed'), 
  '✅ Fallback-spårning finns');
warn(bpmnGeneratorsContent.includes('LocalLlmUnavailableError') || 
     llmDocContent.includes('LocalLlmUnavailableError'), 
  '✅ LocalLlmUnavailableError hanteras');

// ============================================================================
// Scenario 9: Kontext-byggning fungerar korrekt
// ============================================================================
console.log('\n📋 Scenario 9: Kontext-byggning fungerar korrekt\n');

const contextModule = path.join(projectRoot, 'src', 'lib', 'documentationContext.ts');
check(fs.existsSync(contextModule), '✅ documentationContext.ts finns');

if (fs.existsSync(contextModule)) {
  const contextContent = fs.readFileSync(contextModule, 'utf-8');
  check(contextContent.includes('buildNodeDocumentationContext'), 
    '✅ buildNodeDocumentationContext finns');
  check(contextContent.includes('NodeDocumentationContext'), 
    '✅ NodeDocumentationContext-typ finns');
}

check(llmDocContent.includes('buildContextPayload'), 
  '✅ buildContextPayload används');
check(llmDocContent.includes('processContext'), 
  '✅ processContext byggs');
check(llmDocContent.includes('currentNodeContext'), 
  '✅ currentNodeContext byggs');

// ============================================================================
// Scenario 10: Override-filer mergas korrekt med LLM-innehåll
// ============================================================================
console.log('\n📋 Scenario 10: Override-filer mergas korrekt med LLM-innehåll\n');

if (fs.existsSync(templatesModule)) {
  const templatesContent = fs.readFileSync(templatesModule, 'utf-8');
  
  // Kolla att merge-logiken finns
  check(templatesContent.includes('merge') || templatesContent.includes('override'), 
    '✅ Merge/override-logik finns');
  
  // Kolla att LLM-innehåll kan läggas till över befintliga overrides
  check(templatesContent.includes('llmContent') || templatesContent.includes('llmMetadata'), 
    '✅ LLM-innehåll kan läggas till');
}

// ============================================================================
// Resultat
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 Valideringsresultat:');
console.log('='.repeat(70) + '\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log(`✅ Alla ${success.length} kontroller lyckades!\n`);
  console.log('ChatGPT-pipelinen är korrekt konfigurerad för alla scenarion.\n');
  console.log('💡 Nästa steg:');
  console.log('   1. Testa faktiska API-anrop: npm run test:llm:smoke');
  console.log('   2. Testa med lokal dokumentation: Generera dokumentation i appen');
  console.log('   3. Testa med override-filer: Skapa override-filer och generera\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length} kritiska fel hittades:\n`);
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
  success.slice(0, 10).forEach((msg, i) => {
    console.log(`   ${i + 1}. ${msg}`);
  });
  if (success.length > 10) {
    console.log(`   ... och ${success.length - 10} fler`);
  }
  console.log('');
}

console.log('='.repeat(70));
process.exit(errors.length > 0 ? 1 : 0);

