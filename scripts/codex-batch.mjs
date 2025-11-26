#!/usr/bin/env node

/**
 * Codex Batch Override Generation - One Command
 * 
 * Detta script gör allt på en gång:
 * 1. Hittar alla filer som behöver uppdateras
 * 2. Analyserar vad som behöver fyllas i
 * 3. Visar färdiga instruktioner för Codex
 * 
 * Användning:
 *   npm run codex:batch
 *   npm run codex:batch epic
 *   npm run codex:batch feature-goal
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Hitta alla override-filer
function findOverrideFiles(scope = null) {
  const nodeDocsRoot = path.join(projectRoot, 'src', 'data', 'node-docs');
  const results = [];

  if (scope && scope.endsWith('.bpmn')) {
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
    const targetDir = scope
      ? path.isAbsolute(scope)
        ? scope
        : path.join(projectRoot, 'src', 'data', 'node-docs', scope)
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

// Kontrollera om en fil behöver uppdateras
function needsUpdate(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return (
    content.includes("'TODO'") ||
    content.includes('"TODO"') ||
    content.includes('TODO,') ||
    /:\s*\[\]\s*,/.test(content) ||
    /:\s*''\s*,/.test(content)
  );
}

// Analysera vad som behöver uppdateras
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const needsUpdate = [];
  
  // Extrahera NODE CONTEXT
  let contextMatch = content.match(
    /\*\s*bpmnFile:\s*([^\n\*]+)\s*\n\s*\*\s*elementId:\s*([^\n\*]+)\s*\n\s*\*\s*type:\s*([^\n\*]+)/
  );
  
  if (!contextMatch) {
    contextMatch = content.match(
      /bpmnFile:\s*([^\n]+)\s*\n\s*elementId:\s*([^\n]+)\s*\n\s*type:\s*([^\n]+)/
    );
  }
  
  const context = contextMatch ? {
    bpmnFile: contextMatch[1].trim(),
    elementId: contextMatch[2].trim(),
    type: contextMatch[3].trim(),
  } : null;
  
  // Hitta TODO-platshållare
  const todoMatches = [...content.matchAll(/(\w+):\s*['"]TODO['"]/g)];
  for (const match of todoMatches) {
    needsUpdate.push({ field: match[1], type: 'TODO' });
  }
  
  // Hitta tomma arrayer
  const emptyArrayMatches = [...content.matchAll(/(\w+):\s*\[\]\s*,/g)];
  for (const match of emptyArrayMatches) {
    needsUpdate.push({ field: match[1], type: 'empty array' });
  }
  
  // Hitta tomma strängar
  const emptyStringMatches = [...content.matchAll(/(\w+):\s*''\s*,/g)];
  for (const match of emptyStringMatches) {
    needsUpdate.push({ field: match[1], type: 'empty string' });
  }
  
  return { context, needsUpdate };
}

// Huvudfunktion
function main() {
  const scope = process.argv[2] || null;

  console.log('\n🚀 Codex Batch Override Generation\n');
  console.log('='.repeat(70) + '\n');

  const allFiles = findOverrideFiles(scope);
  const filesNeedingUpdate = allFiles.filter((f) => needsUpdate(f.filePath));

  console.log(`📊 Hittade ${allFiles.length} override-filer`);
  console.log(`   ✅ ${allFiles.length - filesNeedingUpdate.length} filer är redan ifyllda`);
  console.log(`   ⚠️  ${filesNeedingUpdate.length} filer behöver uppdateras\n`);

  if (filesNeedingUpdate.length === 0) {
    console.log('✅ Alla filer är redan ifyllda! Inget att göra.\n');
    return;
  }

  // Analysera filer
  const fileAnalyses = filesNeedingUpdate.map((file) => {
    const analysis = analyzeFile(file.filePath);
    return { ...file, ...analysis };
  });

  // Gruppera per typ
  const byDocType = {};
  for (const file of fileAnalyses) {
    const docType = file.docType;
    if (!byDocType[docType]) byDocType[docType] = [];
    byDocType[docType].push(file);
  }

  console.log('📁 Filer att bearbeta:\n');
  for (const [docType, files] of Object.entries(byDocType)) {
    console.log(`   ${docType}: ${files.length} filer`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 INSTRUKTION FÖR CODEX - Kopiera och klistra in i Codex-chatten:');
  console.log('='.repeat(70) + '\n');

  console.log('```\n');
  console.log('Jag vill att du batch-genererar innehåll för override-filer.\n');
  console.log('VIKTIGT: Skriv INTE över befintligt innehåll!');
  console.log('- Ersätt BARA fält som är \'TODO\', tomma arrayer [], eller tomma strängar \'\'');
  console.log('- Behåll allt annat innehåll oförändrat\n');

  console.log('För varje fil nedan:\n');

  for (let i = 0; i < fileAnalyses.length; i++) {
    const file = fileAnalyses[i];
    const promptFile = file.context?.type === 'business-rule' 
      ? 'prompts/llm/dmn_businessrule_prompt.md'
      : 'prompts/llm/feature_epic_prompt.md';

    console.log(`${i + 1}. ${file.relativePath}`);
    if (file.context) {
      console.log(`   NODE CONTEXT: ${file.context.bpmnFile}::${file.context.elementId} (${file.context.type})`);
    }
    console.log(`   Prompt: ${promptFile}`);
    console.log(`   Uppdatera fält: ${file.needsUpdate.map(f => f.field).join(', ')}`);
    console.log(`   Steg:`);
    console.log(`   a) Öppna filen och läs NODE CONTEXT-kommentaren`);
    console.log(`   b) Läs prompt-filen: ${promptFile}`);
    console.log(`   c) Generera JSON enligt promptens instruktioner`);
    console.log(`   d) Uppdatera BARA fälten: ${file.needsUpdate.map(f => f.field).join(', ')}`);
    console.log(`   e) Behåll allt annat innehåll oförändrat`);
    console.log(`   f) Spara filen\n`);
  }

  console.log('Bearbeta filerna en i taget. När en fil är klar, gå vidare till nästa.\n');
  console.log('```\n');

  console.log('='.repeat(70));
  console.log('💡 Tips:');
  console.log('   - Kopiera instruktionen ovan och klistra in i Codex-chatten');
  console.log('   - Codex kommer att bearbeta filerna enligt instruktionerna');
  console.log('   - Kontrollera resultatet med: git diff src/data/node-docs/');
  console.log('='.repeat(70) + '\n');
}

main();

