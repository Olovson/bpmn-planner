#!/usr/bin/env node

/**
 * Prepare Codex Batch Generation
 * 
 * Detta script förbereder allt för Codex-batch-generering:
 * 1. Hittar alla filer med TODO eller tomma fält
 * 2. Skapar en instruktionsfil som Codex kan läsa
 * 3. Kontrollerar att vi inte skriver över befintligt innehåll
 * 
 * Användning:
 *   node scripts/prepare-codex-batch.mjs [scope]
 * 
 * Exempel:
 *   node scripts/prepare-codex-batch.mjs
 *   node scripts/prepare-codex-batch.mjs src/data/node-docs/epic
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const INSTRUCTIONS_FILE = path.join(projectRoot, '.codex-batch-instructions.md');
const FILES_LIST = path.join(projectRoot, '.codex-batch-files.json');

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

// Kontrollera om en fil behöver uppdateras
function needsUpdate(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Kolla efter TODO-platshållare
  const hasTodo = 
    content.includes("'TODO'") ||
    content.includes('"TODO"') ||
    content.includes('TODO,');
  
  // Kolla efter tomma arrayer som ska fyllas i
  const hasEmptyArrays = /:\s*\[\]\s*,/.test(content);
  
  // Kolla efter tomma strängar som ska fyllas i
  const hasEmptyStrings = /:\s*''\s*,/.test(content);
  
  return hasTodo || hasEmptyArrays || hasEmptyStrings;
}

// Analysera vad som behöver uppdateras i en fil
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const needsUpdate = [];
  
  // Extrahera NODE CONTEXT - hantera både med och utan asterisker
  let contextMatch = content.match(
    /\*\s*bpmnFile:\s*([^\n\*]+)\s*\n\s*\*\s*elementId:\s*([^\n\*]+)\s*\n\s*\*\s*type:\s*([^\n\*]+)/
  );
  
  // Fallback utan asterisker
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
  
  // Hitta alla TODO-platshållare
  const todoMatches = content.matchAll(/(\w+):\s*['"]TODO['"]/g);
  for (const match of todoMatches) {
    needsUpdate.push({
      field: match[1],
      type: 'todo',
      current: 'TODO',
    });
  }
  
  // Hitta tomma arrayer
  const emptyArrayMatches = content.matchAll(/(\w+):\s*\[\]\s*,/g);
  for (const match of emptyArrayMatches) {
    needsUpdate.push({
      field: match[1],
      type: 'empty_array',
      current: '[]',
    });
  }
  
  // Hitta tomma strängar
  const emptyStringMatches = content.matchAll(/(\w+):\s*''\s*,/g);
  for (const match of emptyStringMatches) {
    needsUpdate.push({
      field: match[1],
      type: 'empty_string',
      current: "''",
    });
  }
  
  return {
    context,
    needsUpdate,
    hasContent: needsUpdate.length > 0,
  };
}

// Huvudfunktion
function main() {
  const scope = process.argv[2] || null;

  console.log('🔍 Förbereder Codex-batch-generering...\n');

  const allFiles = findOverrideFiles(scope);
  const filesNeedingUpdate = allFiles.filter((f) => needsUpdate(f.filePath));

  console.log(`📊 Statistik:`);
  console.log(`   Totalt antal override-filer: ${allFiles.length}`);
  console.log(`   Filer som behöver uppdateras: ${filesNeedingUpdate.length}`);
  console.log(`   Filer som redan är ifyllda: ${allFiles.length - filesNeedingUpdate.length}\n`);

  if (filesNeedingUpdate.length === 0) {
    console.log('✅ Alla filer är redan ifyllda! Inget att göra.');
    return;
  }

  // Analysera varje fil
  const fileAnalyses = filesNeedingUpdate.map((file) => {
    const analysis = analyzeFile(file.filePath);
    return {
      ...file,
      ...analysis,
    };
  });

  // Gruppera per docType
  const byDocType = {};
  for (const file of fileAnalyses) {
    const docType = file.docType;
    if (!byDocType[docType]) {
      byDocType[docType] = [];
    }
    byDocType[docType].push(file);
  }

  console.log('📁 Filer att bearbeta, grupperade per typ:\n');
  for (const [docType, files] of Object.entries(byDocType)) {
    console.log(`   ${docType}: ${files.length} filer`);
  }

  // Skapa instruktionsfil för Codex
  const instructions = `# Codex Batch Override Generation - Instruktioner

## Översikt

Detta dokument innehåller instruktioner för att batch-generera innehåll för ${filesNeedingUpdate.length} override-filer.

## Viktiga regler

⚠️ **VIKTIGT:** Skriv INTE över befintligt innehåll!
- Ersätt BARA fält som är 'TODO', tomma arrayer [], eller tomma strängar ''
- Behåll allt annat innehåll oförändrat
- Om ett fält redan har innehåll (inte TODO), lämna det orört

## Filer att bearbeta

${fileAnalyses.map((file, index) => `
### ${index + 1}. ${file.relativePath}

**NODE CONTEXT:**
- bpmnFile: ${file.context?.bpmnFile || 'Okänt'}
- elementId: ${file.context?.elementId || 'Okänt'}
- type: ${file.context?.type || 'Okänt'}

**Prompt att använda:**
${file.context?.type === 'business-rule' 
  ? '- Läs: prompts/llm/dmn_businessrule_prompt.md'
  : '- Läs: prompts/llm/feature_epic_prompt.md'}

**Fält som behöver uppdateras:**
${file.needsUpdate.map((f) => `- ${f.field} (${f.type}: ${f.current})`).join('\n')}

**Instruktioner:**
1. Öppna filen: ${file.relativePath}
2. Läs NODE CONTEXT-kommentaren överst i filen
3. Läs rätt prompt-fil baserat på type
4. Generera JSON enligt promptens instruktioner
5. Uppdatera BARA fälten som listas ovan (${file.needsUpdate.map(f => f.field).join(', ')})
6. Behåll allt annat innehåll oförändrat
7. Spara filen

`).join('\n')}

## Workflow

Bearbeta filerna en i taget. För varje fil:

1. **Läs filen** och identifiera NODE CONTEXT
2. **Hämta rätt prompt** från prompts/llm/
3. **Generera JSON** enligt promptens instruktioner
4. **Uppdatera BARA** fält som behöver uppdateras (listade ovan)
5. **Behåll** allt annat innehåll
6. **Spara** och gå vidare till nästa fil

## Tips

- Börja med en fil för att testa
- Kontrollera resultatet innan du fortsätter
- Använd git diff för att se ändringar: \`git diff src/data/node-docs/\`
- Bearbeta i batchar om det är många filer
`;

  fs.writeFileSync(INSTRUCTIONS_FILE, instructions, 'utf-8');

  // Spara fil-lista som JSON
  const filesList = fileAnalyses.map((file) => ({
    path: file.relativePath,
    docType: file.docType,
    context: file.context,
    needsUpdate: file.needsUpdate,
  }));

  fs.writeFileSync(FILES_LIST, JSON.stringify(filesList, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(70));
  console.log('✅ Förberedelse klar!');
  console.log('='.repeat(70) + '\n');

  console.log(`📄 Instruktionsfil skapad: ${path.relative(projectRoot, INSTRUCTIONS_FILE)}`);
  console.log(`📄 Fil-lista skapad: ${path.relative(projectRoot, FILES_LIST)}\n`);

  console.log('📋 Nästa steg:\n');
  console.log('1. Öppna instruktionsfilen: .codex-batch-instructions.md');
  console.log('2. Kopiera innehållet och ge till Codex i Cursor');
  console.log('3. Codex kommer att bearbeta filerna enligt instruktionerna\n');

  console.log('💡 Tips:');
  console.log('   - Codex kan läsa .codex-batch-instructions.md direkt');
  console.log('   - Eller kopiera innehållet till Codex-chatten');
  console.log('   - Bearbeta filerna en i taget för bästa resultat\n');
}

main();

