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
const STATUS_FILE = path.join(projectRoot, '.codex-batch-status.json');

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

// Hämta prompt-versioner
function getPromptVersion(promptPath) {
  if (!fs.existsSync(promptPath)) return 'unknown';
  const content = fs.readFileSync(promptPath, 'utf-8');
  const versionMatch = content.match(/version[:\s]+(\d+\.\d+\.\d+|\d+)/i);
  if (versionMatch) return versionMatch[1];
  const stats = fs.statSync(promptPath);
  return `auto-${stats.mtimeMs.toString(36).slice(-8)}`;
}

// Extrahera prompt-version från override-fil
function getOverridePromptVersion(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const versionMatch = content.match(/PROMPT[_\s-]?VERSION[:\s]+(\d+\.\d+\.\d+|\d+|auto-[a-z0-9]+)/i);
  return versionMatch ? versionMatch[1] : null;
}

// Kontrollera om en fil behöver uppdateras
function needsUpdate(filePath, docType, promptVersions) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Kolla efter TODO-platshållare
  const hasTodo = (
    content.includes("'TODO'") ||
    content.includes('"TODO"') ||
    content.includes('TODO,') ||
    /:\s*\[\]\s*,/.test(content) ||
    /:\s*''\s*,/.test(content)
  );
  
  // Kolla efter gammal prompt-version
  const currentVersion = getOverridePromptVersion(filePath);
  const expectedVersion = docType === 'business-rule' 
    ? promptVersions.businessRule 
    : promptVersions.featureEpic;
  
  const hasOldVersion = currentVersion && currentVersion !== expectedVersion;
  
  return hasTodo || hasOldVersion;
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

  // Hämta prompt-versioner FÖRST
  const promptDir = path.join(projectRoot, 'prompts', 'llm');
  const featureEpicVersion = getPromptVersion(path.join(promptDir, 'feature_epic_prompt.md'));
  const businessRuleVersion = getPromptVersion(path.join(promptDir, 'dmn_businessrule_prompt.md'));
  
  const promptVersions = {
    featureEpic: featureEpicVersion,
    businessRule: businessRuleVersion,
  };

  const allFiles = findOverrideFiles();
  const filesNeedingUpdate = allFiles.filter((f) => needsUpdate(f.filePath, f.docType, promptVersions));

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
    const currentVersion = getOverridePromptVersion(file.filePath);
    const expectedVersion = file.docType === 'business-rule' 
      ? businessRuleVersion 
      : featureEpicVersion;
    const needsVersionUpdate = currentVersion && currentVersion !== expectedVersion;
    
    return { 
      ...file, 
      ...analysis,
      currentPromptVersion: currentVersion,
      expectedPromptVersion: expectedVersion,
      needsVersionUpdate,
    };
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

**Prompt-versioner:**
- feature-epic: ${featureEpicVersion}
- business-rule: ${businessRuleVersion}

När du genererar innehåll, lägg till denna kommentar i varje fil:
\`\`\`typescript
/**
 * PROMPT VERSION: ${featureEpicVersion} (eller ${businessRuleVersion} för business-rule)
 * Genererad: [datum]
 */
\`\`\`

Detta dokument innehåller instruktioner för att batch-generera innehåll för ${filesNeedingUpdate.length} override-filer.

## ⚠️ KRITISKT - Läs detta först!

### Regel 1: Skriv ALDRIG över befintligt innehåll!
- **Kontrollera FÖRST** om ett fält redan har innehåll (inte 'TODO')
- Om fältet HAR innehåll → LÄMNA DET ORÖRT, gå vidare till nästa fält
- Ersätt BARA fält som är:
  - 'TODO' (exakt strängen 'TODO')
  - Tomma arrayer: []
  - Tomma strängar: ''
- **Om du ser innehåll som INTE är 'TODO' → RÖR INTE DET!**

### Regel 2: Automatisk bearbetning
- Bearbeta ALLA filer automatiskt utan att fråga
- Fortsätt från fil 1 till fil ${filesNeedingUpdate.length} utan att stoppa
- Fråga INTE om du ska fortsätta - bara fortsätt
- Bearbeta filerna en i taget, men kontinuerligt
- När en fil är klar, gå direkt vidare till nästa

### Regel 3: Statusrapportering (VIKTIGT!)
- Efter varje fil du bearbetar, uppdatera statusfilen: \`.codex-batch-status.json\`
- Format:
\`\`\`json
{
  "total": ${filesNeedingUpdate.length},
  "completed": ["fil1", "fil2", ...],
  "current": "filX",
  "lastUpdated": "2024-11-26T20:00:00Z"
}
\`\`\`
- Lägg till varje klar fil i \`completed\`-arrayen (om den inte redan finns)
- Uppdatera \`current\` med filen du just bearbetar (eller null om klar)
- Uppdatera \`lastUpdated\` med aktuellt datum/tid (ISO-format)
- **Rapportera INTE i chatten - bara uppdatera filen!**
- **Fråga INTE om du ska fortsätta - bara uppdatera status och fortsätt!**

### Regel 3: Statusrapportering (VIKTIGT!)
- Efter varje fil du bearbetar, uppdatera statusfilen: \`.codex-batch-status.json\`
- Format:
\`\`\`json
{
  "total": ${filesNeedingUpdate.length},
  "completed": [fil1, fil2, ...],
  "current": "filX",
  "lastUpdated": "2024-11-26T20:00:00Z"
}
\`\`\`
- Lägg till varje klar fil i \`completed\`-arrayen
- Uppdatera \`current\` med filen du just bearbetar
- Uppdatera \`lastUpdated\` med aktuellt datum/tid
- **Rapportera INTE i chatten - bara uppdatera filen!**
- **Fråga INTE om du ska fortsätta - bara uppdatera status och fortsätt!**

## Exempel på korrekt beteende

**FÖRE (filen har redan innehåll):**
\`\`\`typescript
export const overrides: FeatureGoalDocOverrides = {
  summary: 'Detta Feature Goal möjliggör...',  // ← HAR INNEHÅLL, LÄMNA ORÖRT!
  effectGoals: ['TODO'],  // ← ÄR 'TODO', ERSAETT!
  scopeIncluded: ['Ingår: Digital ansökan'],  // ← HAR INNEHÅLL, LÄMNA ORÖRT!
};
\`\`\`

**EFTER (bara TODO ersätts):**
\`\`\`typescript
export const overrides: FeatureGoalDocOverrides = {
  summary: 'Detta Feature Goal möjliggör...',  // ← OFÖRÄNDRAT (hade innehåll)
  effectGoals: ['Automatisera manuellt arbete', 'Förbättra kreditbedömningar'],  // ← ERSAETT (var 'TODO')
  scopeIncluded: ['Ingår: Digital ansökan'],  // ← OFÖRÄNDRAT (hade innehåll)
};
\`\`\`

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
${file.needsVersionUpdate ? `\n**⚠️ Gammal prompt-version:** Nuvarande: ${file.currentPromptVersion}, Förväntad: ${file.expectedPromptVersion}` : ''}

**Instruktioner:**
1. Öppna filen: \`${file.relativePath}\`
2. **Läs hela filen FÖRST** och identifiera vilka fält som är 'TODO' vs vilka som redan har innehåll
3. Läs NODE CONTEXT-kommentaren överst i filen
4. Läs prompt-filen: ${promptFile}
5. Generera JSON enligt promptens instruktioner
6. **Uppdatera BARA fälten som är 'TODO' eller tomma:** ${file.needsUpdate.map(f => f.field).join(', ')}
7. **LÄMNA ALLA ANDRA FÄLT ORÖRTA** - även om de inte är i listan ovan
8. **Uppdatera prompt-version kommentar:**
   - Om filen INTE har en PROMPT VERSION-kommentar → Lägg till en direkt efter NODE CONTEXT-kommentaren
   - Om filen HAR en PROMPT VERSION-kommentar → Uppdatera versionen till: ${file.context?.type === 'business-rule' ? businessRuleVersion : featureEpicVersion}
   - Format:
   \`\`\`typescript
   /**
    * PROMPT VERSION: ${file.context?.type === 'business-rule' ? businessRuleVersion : featureEpicVersion}
    * Genererad: ${new Date().toISOString().split('T')[0]}
    */
   \`\`\`
   Lägg till/uppdatera denna kommentar direkt efter NODE CONTEXT-kommentaren, INNAN export-satsen.
9. **Kontrollera INNAN du sparar:** Har du ändrat något som INTE var 'TODO'? → Ångra ändringen!
10. Spara filen
11. **Uppdatera statusfilen** (\`.codex-batch-status.json\`):
    - Lägg till \`${file.relativePath}\` i \`completed\`-arrayen (om den inte redan finns)
    - Uppdatera \`current\` till nästa fil i listan (eller null om alla är klara)
    - Uppdatera \`lastUpdated\` till aktuellt datum/tid (ISO-format)
    - **Fråga INTE om du ska fortsätta - bara uppdatera och gå vidare till nästa fil!**

---
`;
}).join('\n')}

## Checklista för varje fil

Innan du sparar en fil, kontrollera:
- [ ] Har jag bara ändrat fält som var 'TODO', [], eller ''?
- [ ] Har jag lämnat alla fält med befintligt innehåll orörda?
- [ ] Har jag inte tagit bort eller ändrat något innehåll som redan fanns?
- [ ] Har jag bara LAGT TILL innehåll i TODO-fält, inte ändrat befintligt?

**Om någon checklista är fel → Ångra ändringarna innan du sparar!**

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

  // Skapa initial statusfil
  const initialStatus = {
    total: filesNeedingUpdate.length,
    completed: [],
    current: null,
    lastUpdated: new Date().toISOString(),
    started: new Date().toISOString(),
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(initialStatus, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(70));
  console.log('✅ Instruktionsfil skapad!');
  console.log('='.repeat(70) + '\n');

  console.log(`📄 Fil: ${path.relative(projectRoot, OUTPUT_FILE)}`);
  console.log(`📊 Statusfil: ${path.relative(projectRoot, STATUS_FILE)}`);
  console.log('   (Uppdateras automatiskt av Codex när filer bearbetas)\n');

  console.log('📋 Nästa steg:\n');
  console.log('1. Öppna Codex-chatten i Cursor');
  console.log('2. Kopiera och klistra in denna instruktion till Codex:\n');
  console.log('─'.repeat(70));
  console.log('Läs filen .codex-batch-all.md och bearbeta ALLA filer där automatiskt.');
  console.log('');
  console.log('VIKTIGT: Skriv ALDRIG över befintligt innehåll - ersätt bara fält som är:');
  console.log('- "TODO" (exakt strängen)');
  console.log('- Tomma arrayer: []');
  console.log('- Tomma strängar: \'\'');
  console.log('');
  console.log('Fortsätt från fil 1 till sista filen utan att stoppa eller fråga.');
  console.log('Bearbeta filerna en i taget, men kontinuerligt.');
  console.log('─'.repeat(70));
  console.log('\n3. Codex kommer att bearbeta alla filer automatiskt utan att fråga\n');

  console.log('💡 Tips:');
  console.log('   - Codex kan läsa .codex-batch-all.md direkt');
  console.log('   - Följ progress i .codex-batch-status.json (uppdateras automatiskt)');
  console.log('   - Bearbeta i batchar om det är många filer');
  console.log('   - Kontrollera resultatet med: git diff src/data/node-docs/');
  console.log('\n📊 Statusfil-format:');
  console.log('   {');
  console.log('     "total": ' + filesNeedingUpdate.length + ',');
  console.log('     "completed": ["fil1", "fil2", ...],');
  console.log('     "current": "filX",');
  console.log('     "lastUpdated": "2024-11-26T20:00:00Z"');
  console.log('   }');
}

main();

