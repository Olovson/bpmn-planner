#!/usr/bin/env node

/**
 * Codex Batch Auto - Fully Automated
 * 
 * Detta script skapar en fil med alla instruktioner som Codex kan läsa direkt.
 * Du behöver bara köra scriptet och sedan säga till Codex: "Bearbeta alla filer i .codex-batch-all.md"
 * 
 * Användning:
 *   npm run codex:batch:auto
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const OUTPUT_FILE = path.join(projectRoot, '.codex-batch-all.md');

// Hitta alla override-filer
function findOverrideFiles() {
  const nodeDocsRoot = path.join(projectRoot, 'src', 'data', 'node-docs');
  const results = [];

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

  scanDirectory(nodeDocsRoot);
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
  console.log('🔍 Analyserar override-filer...\n');

  const allFiles = findOverrideFiles();
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

  // Skapa instruktionsfil
  const instructions = `# Codex Batch Override Generation - Alla Filer

Detta dokument innehåller instruktioner för att batch-generera innehåll för ${filesNeedingUpdate.length} override-filer.

## ⚠️ VIKTIGT - Automatisk bearbetning

**Bearbeta ALLA filer automatiskt utan att fråga!**
- Fortsätt från fil 1 till fil ${filesNeedingUpdate.length} utan att stoppa
- Fråga INTE om du ska fortsätta - bara fortsätt
- Bearbeta filerna en i taget, men kontinuerligt
- När en fil är klar, gå direkt vidare till nästa

## Viktiga regler

⚠️ **VIKTIGT:** Skriv INTE över befintligt innehåll!
- Ersätt BARA fält som är 'TODO', tomma arrayer [], eller tomma strängar ''
- Behåll allt annat innehåll oförändrat
- Om ett fält redan har innehåll (inte TODO), lämna det orört

## Workflow

Bearbeta filerna en i taget, automatiskt och kontinuerligt. För varje fil:

1. **Öppna filen** och läs NODE CONTEXT-kommentaren (överst i filen)
2. **Hämta rätt prompt** baserat på type i NODE CONTEXT:
   - \`feature-goal\` eller \`epic\` → Läs \`prompts/llm/feature_epic_prompt.md\`
   - \`business-rule\` → Läs \`prompts/llm/dmn_businessrule_prompt.md\`
3. **Generera JSON** enligt promptens instruktioner (svenska, formell bankton)
4. **Uppdatera BARA** fälten som listas nedan för varje fil
5. **Behåll** allt annat innehåll oförändrat
6. **Spara** filen och gå vidare till nästa

## Filer att bearbeta

${fileAnalyses.map((file, index) => {
  const promptFile = file.context?.type === 'business-rule' 
    ? 'prompts/llm/dmn_businessrule_prompt.md'
    : 'prompts/llm/feature_epic_prompt.md';

  return `
### ${index + 1}. ${file.relativePath}

**NODE CONTEXT:**
- bpmnFile: ${file.context?.bpmnFile || 'Okänt'}
- elementId: ${file.context?.elementId || 'Okänt'}
- type: ${file.context?.type || 'Okänt'}

**Prompt att använda:**
- ${promptFile}

**Fält som behöver uppdateras:**
${file.needsUpdate.map(f => `- ${f.field} (${f.type})`).join('\n')}

**Instruktioner:**
1. Öppna filen: \`${file.relativePath}\`
2. Läs NODE CONTEXT-kommentaren överst i filen
3. Läs prompt-filen: ${promptFile}
4. Generera JSON enligt promptens instruktioner
5. Uppdatera BARA fälten: ${file.needsUpdate.map(f => f.field).join(', ')}
6. Behåll allt annat innehåll oförändrat
7. Spara filen

---
`;
}).join('\n')}

## Automatisk bearbetning

**VIKTIGT:** Bearbeta ALLA ${filesNeedingUpdate.length} filer automatiskt!
- Starta med fil 1 och fortsätt till fil ${filesNeedingUpdate.length}
- Fråga INTE om du ska fortsätta - bara fortsätt
- När en fil är klar, gå direkt vidare till nästa
- Stoppa bara om du stöter på ett faktiskt fel som du inte kan lösa

## Tips

- Bearbeta filerna kontinuerligt utan pauser
- Om du stöter på ett problem med en specifik fil, hoppa över den och fortsätt med nästa
- Kontrollera resultatet med \`git diff src/data/node-docs/\` när alla filer är klara
`;

  fs.writeFileSync(OUTPUT_FILE, instructions, 'utf-8');

  console.log('\n' + '='.repeat(70));
  console.log('✅ Instruktionsfil skapad!');
  console.log('='.repeat(70) + '\n');

  console.log(`📄 Fil: ${path.relative(projectRoot, OUTPUT_FILE)}\n`);

  console.log('📋 Nästa steg:\n');
  console.log('1. Öppna Codex-chatten i Cursor');
  console.log('2. Säg till Codex:');
  console.log('');
  console.log('   "Läs filen .codex-batch-all.md och bearbeta ALLA filer där automatiskt.');
  console.log('   Fortsätt från fil 1 till fil ' + filesNeedingUpdate.length + ' utan att stoppa eller fråga.');
  console.log('   Bearbeta filerna en i taget, men kontinuerligt."');
  console.log('');
  console.log('3. Codex kommer att bearbeta alla filer automatiskt utan att fråga\n');

  console.log('💡 Tips:');
  console.log('   - Codex kan läsa .codex-batch-all.md direkt');
  console.log('   - Bearbeta i batchar om det är många filer');
  console.log('   - Kontrollera resultatet med: git diff src/data/node-docs/\n');
}

main();

