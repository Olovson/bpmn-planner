#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Generera status-lista över Feature Goal HTML-filer
 * 
 * Detta script:
 * 1. Analyserar alla HTML-filer i exports/feature-goals/
 * 2. Kategoriserar dem (matchade, orphaned)
 * 3. Genererar en status-lista med checkboxar för att markera förbättrade filer
 * 4. Sparar som Markdown-fil
 * 
 * Usage:
 *   npx tsx scripts/generate-feature-goal-status.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  extractFeatureGoalsFromMap,
  readFeatureGoalDocs,
  analyzeSync,
} from './analyze-feature-goal-sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Läs från public/local-content/feature-goals/ (där appen läser filerna)
const DOCS_DIR = path.join(__dirname, '../public/local-content/feature-goals');
const BPMN_MAP_PATH = path.join(__dirname, '../bpmn-map.json');
const STATUS_FILE = path.join(__dirname, '../docs/feature-goals/FEATURE_GOAL_STATUS.md');

/**
 * Hitta senaste archive-mappen
 */
function findLatestArchiveFolder(): string | null {
  const fixturesDir = path.join(__dirname, '../tests/fixtures/bpmn');
  if (!fs.existsSync(fixturesDir)) {
    return null;
  }
  
  const folders = fs.readdirSync(fixturesDir)
    .filter(f => {
      const fullPath = path.join(fixturesDir, f);
      return fs.statSync(fullPath).isDirectory() && f.startsWith('mortgage-se ');
    })
    .map(folder => {
      const match = folder.match(/mortgage-se (\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})/);
      if (!match) return null;
      
      const [, year, month, day, hour, minute] = match;
      return {
        folder,
        path: path.join(fixturesDir, folder),
        timestamp: new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        ).getTime(),
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  return folders.length > 0 ? folders[0].path : null;
}

/**
 * Läs befintlig status-fil för att se vilka filer som är markerade som förbättrade
 */
function readExistingStatus(): Set<string> {
  if (!fs.existsSync(STATUS_FILE)) {
    return new Set();
  }
  
  const content = fs.readFileSync(STATUS_FILE, 'utf-8');
  const improved = new Set<string>();
  
  // Hitta alla checkboxar som är ikryssade: [x]
  const checkboxRegex = /- \[x\] `([^`]+)`/gi;
  let match;
  while ((match = checkboxRegex.exec(content)) !== null) {
    improved.add(match[1]);
  }
  
  return improved;
}

/**
 * Generera status-lista
 */
function generateStatusList(): string {
  const archiveDir = findLatestArchiveFolder();
  if (!archiveDir) {
    throw new Error('Kunde inte hitta archive-mapp');
  }
  
  console.log('🔍 Analyserar feature goals och dokumentation...');
  const featureGoals = extractFeatureGoalsFromMap(BPMN_MAP_PATH);
  const docs = readFeatureGoalDocs(DOCS_DIR);
  const analysis = analyzeSync(featureGoals, docs, archiveDir);
  
  const improved = readExistingStatus();
  
  // Kategorisera filer - alla matchade (både existing och changed)
  const allMatchedFiles = new Set<string>();
  analysis.existingDocs.forEach(d => allMatchedFiles.add(d.filename));
  analysis.changedFeatureGoals.forEach(c => {
    if (c.oldDoc) {
      allMatchedFiles.add(c.oldDoc.filename);
    }
  });
  
  // Skapa lista med feature goal-info
  const matched = Array.from(allMatchedFiles).map(filename => {
    const changed = analysis.changedFeatureGoals.find(c => c.oldDoc?.filename === filename);
    const existing = analysis.existingDocs.find(e => e.filename === filename);
    
    return {
      filename,
      featureGoal: changed?.featureGoal,
      missingActivities: changed?.missingActivities?.length || 0,
      isChanged: !!changed,
    };
  });
  
  const orphaned = analysis.orphanedDocs.map(d => ({
    filename: d.filename,
    lastModified: d.lastModified,
  }));
  
  // Alla matchade filer (sorterade alfabetiskt)
  const allMatched = matched
    .filter(f => f.filename)
    .sort((a, b) => a.filename!.localeCompare(b.filename!));
  
  const report: string[] = [];
  
  report.push('# Feature Goal Dokumentation - Status');
  report.push('');
  report.push(`**Genererad:** ${new Date().toISOString()}`);
  report.push(`**BPMN-källa:** ${path.basename(archiveDir)}`);
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 📊 Sammanfattning');
  report.push('');
  report.push(`- 📝 **Total HTML-filer:** ${docs.length}`);
  report.push(`- ✅ **Matchade feature goals:** ${allMatched.length} (av ${featureGoals.length} totalt)`);
  report.push(`- ⚠️  **Orphaned (saknar feature goal):** ${orphaned.length}`);
  report.push(`- ✨ **Förbättrade:** ${improved.size}`);
  report.push(`- 📋 **Återstående:** ${allMatched.length + orphaned.length - improved.size}`);
  report.push('');
  report.push('---');
  report.push('');
  report.push('## ✅ Matchade Feature Goals');
  report.push('');
  report.push('Dessa filer matchar feature goals i BPMN-filerna. Markera med `[x]` när du har förbättrat dem.');
  report.push('');
  
  for (const file of allMatched) {
    const isImproved = improved.has(file.filename!);
    const checkbox = isImproved ? '[x]' : '[ ]';
    const status = isImproved ? ' ✨ Förbättrad' : '';
    
    const fg = file.featureGoal || (file as any).featureGoal;
    const fgName = fg ? `${fg.name} (\`${fg.bpmn_id}\`)` : '';
    const missingCount = (file as any).missingActivities;
    const missingInfo = missingCount > 0 ? ` ⚠️ ${missingCount} saknade aktiviteter` : '';
    
    report.push(`- ${checkbox} \`${file.filename}\`${status}`);
    if (fgName) {
      report.push(`  - Feature Goal: ${fgName}${missingInfo}`);
    }
  }
  
  report.push('');
  report.push('---');
  report.push('');
  report.push('## ⚠️  Orphaned Dokumentation');
  report.push('');
  report.push('Dessa filer matchar inte längre någon feature goal i BPMN-filerna.');
  report.push('');
  report.push('**Första steget:** Identifiera om filen ska tas bort eller uppdateras.');
  report.push('');
  report.push('### Steg 1: Identifiera åtgärd');
  report.push('');
  report.push('För varje fil, avgör:');
  report.push('- 🗑️  **Ta bort** - Om filen är inaktuell och inte längre relevant');
  report.push('- 🔄 **Uppdatera** - Om filen fortfarande är relevant men behöver mappas om');
  report.push('- ⏸️  **Behåll** - Om filen ska behållas men inte matchar någon feature goal');
  report.push('');
  report.push('### Steg 2: Markera när klar');
  report.push('');
  report.push('Markera med `[x]` när du har tagit beslut och utfört åtgärden.');
  report.push('');
  
  for (const file of orphaned) {
    const isImproved = improved.has(file.filename);
    const checkbox = isImproved ? '[x]' : '[ ]';
    const lastModified = file.lastModified 
      ? ` (Senast ändrad: ${file.lastModified.toISOString().split('T')[0]})`
      : '';
    
    report.push(`- ${checkbox} \`${file.filename}\`${lastModified}`);
    report.push(`  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll`);
  }
  
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 📝 Användning');
  report.push('');
  report.push('1. **Kör scriptet** för att uppdatera listan:');
  report.push('   ```bash');
  report.push('   npx tsx scripts/generate-feature-goal-status.ts');
  report.push('   ```');
  report.push('');
  report.push('2. **Öppna status-filen**: `docs/feature-goals/FEATURE_GOAL_STATUS.md`');
  report.push('');
  report.push('3. **Markera förbättrade filer** med `[x]` i checkboxen');
  report.push('');
  report.push('4. **För orphaned filer**: Först identifiera åtgärd, sedan markera när klar');
  report.push('');
  report.push('5. **Kör scriptet igen** när du vill uppdatera listan');
  report.push('');
  
  return report.join('\n');
}

/**
 * Huvudfunktion
 */
async function main() {
  console.log('='.repeat(80));
  console.log('GENERERAR FEATURE GOAL STATUS-LISTA');
  console.log('='.repeat(80));
  console.log('');
  
  try {
    const statusList = generateStatusList();
    
    // Skapa mapp om den inte finns
    const statusDir = path.dirname(STATUS_FILE);
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }
    
    // Spara status-fil
    fs.writeFileSync(STATUS_FILE, statusList, 'utf-8');
    
    console.log('✅ Status-lista genererad!');
    console.log('');
    console.log(`📄 Fil: ${STATUS_FILE}`);
    console.log('');
    console.log('Öppna filen och markera förbättrade filer med [x]');
    console.log('');
  } catch (error) {
    console.error('❌ Fel:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);

