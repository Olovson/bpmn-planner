#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Automatiskt uppdatera Feature Goal HTML-dokumentation baserat på sync-rapporten
 * 
 * Detta script:
 * 1. Läser sync-rapporten från analyze-feature-goal-sync.ts
 * 2. För ändrade feature goals: Lägger till saknade aktiviteter i "Omfattning"-sektionen
 * 3. För nya feature goals: Skapar nya HTML-filer från BPMN-filer
 * 
 * Usage:
 *   npx tsx scripts/auto-update-feature-goal-docs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importera funktioner från analyze-feature-goal-sync.ts
// (Vi behöver återanvända logiken för att hitta archive-mappen och analysera)
import { 
  analyzeSync, 
  extractFeatureGoalsFromMap, 
  readFeatureGoalDocs, 
  extractActivitiesFromBpmnFile 
} from './analyze-feature-goal-sync';
import { getFeatureGoalDocFileKey } from '../src/lib/nodeArtifactPaths';

// Appen läser från public/local-content/feature-goals/ med formatet {bpmnFile}-{elementId}-v2.html
const DOCS_DIR = path.join(__dirname, '../public/local-content/feature-goals');
const BPMN_MAP_PATH = path.join(__dirname, '../bpmn-map.json');

// Hitta senaste archive-mappen (kopierat från analyze-feature-goal-sync.ts)
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
 * Lägg till saknade aktiviteter i HTML-filens "Omfattning"-sektion
 */
function addMissingActivitiesToHtml(
  htmlContent: string,
  missingActivities: Array<{ id: string; name: string; type: string }>
): string {
  // Hitta "Omfattning"-sektionen
  const omfattningRegex = /<h2[^>]*>Omfattning<\/h2>([\s\S]*?)(?=<h2|$)/i;
  const match = htmlContent.match(omfattningRegex);
  
  if (!match) {
    console.warn('   ⚠️  Kunde inte hitta "Omfattning"-sektion, lägger till ny');
    // Lägg till ny sektion efter första h2
    const firstH2Match = htmlContent.match(/<h2[^>]*>.*?<\/h2>/i);
    if (firstH2Match) {
      const insertPos = firstH2Match.index! + firstH2Match[0].length;
      const newSection = `
<h2>Omfattning</h2>
<ul>
${missingActivities.map(a => `  <li><strong>${a.name}</strong> (${a.type})</li>`).join('\n')}
</ul>
`;
      return htmlContent.slice(0, insertPos) + newSection + htmlContent.slice(insertPos);
    }
    return htmlContent;
  }
  
  // Hitta befintlig lista i Omfattning-sektionen
  const sectionContent = match[1];
  const listRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/i;
  const listMatch = sectionContent.match(listRegex);
  
  if (listMatch) {
    // Lägg till i befintlig lista
    const listContent = listMatch[1];
    const newItems = missingActivities
      .map(a => `    <li><strong>${a.name}</strong> (${a.type})</li>`)
      .join('\n');
    
    const updatedList = `<ul>${listContent}\n${newItems}\n  </ul>`;
    return htmlContent.replace(listRegex, updatedList);
  } else {
    // Lägg till ny lista
    const newList = `
<ul>
${missingActivities.map(a => `  <li><strong>${a.name}</strong> (${a.type})</li>`).join('\n')}
</ul>
`;
    const insertPos = match.index! + match[0].length - (match[0].length - match[1].length);
    return htmlContent.slice(0, insertPos) + newList + htmlContent.slice(insertPos);
  }
}

/**
 * Skapa ny HTML-fil från BPMN-fil
 */
function createHtmlFromBpmn(
  archiveDir: string,
  featureGoal: { bpmn_id: string; name: string; parent_bpmn_file: string; subprocess_bpmn_file: string }
): string {
  // Extrahera aktiviteter från BPMN
  const activities = extractActivitiesFromBpmnFile(archiveDir, featureGoal as any);
  
  // Skapa grundläggande HTML-struktur
  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="bpmn_file" content="${featureGoal.subprocess_bpmn_file || featureGoal.parent_bpmn_file}">
  <meta name="element_id" content="${featureGoal.bpmn_id}">
  <meta name="version" content="v2">
  <title>${featureGoal.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 30px; }
    ul { line-height: 1.8; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>${featureGoal.name}</h1>
  
  <h2>Beskrivning</h2>
  <p>TODO: Lägg till beskrivning av ${featureGoal.name}</p>
  
  <h2>Omfattning</h2>
  <ul>
${activities.map(a => `    <li><strong>${a.name}</strong> (${a.type})</li>`).join('\n')}
  </ul>
  
  <h2>Processteg - Input</h2>
  <p>TODO: Lägg till input-beskrivning</p>
  
  <h2>Processteg - Output</h2>
  <p>TODO: Lägg till output-beskrivning</p>
  
  <h2>Beroenden</h2>
  <p>TODO: Lägg till beroenden</p>
</body>
</html>`;
  
  return html;
}

/**
 * Huvudfunktion
 */
async function main() {
  console.log('='.repeat(80));
  console.log('AUTOMATISK UPPDATERING AV FEATURE GOAL DOKUMENTATION');
  console.log('='.repeat(80));
  console.log('');
  
  // Hitta senaste archive-mappen
  const archiveDir = findLatestArchiveFolder();
  if (!archiveDir) {
    console.error('❌ Kunde inte hitta någon archive-mapp');
    process.exit(1);
  }
  
  console.log(`📁 BPMN-källa: ${archiveDir}`);
  console.log(`📄 Dokumentationskälla: ${DOCS_DIR}`);
  console.log('');
  
  // Analysera skillnader
  console.log('🔍 Analyserar skillnader...');
  const featureGoals = extractFeatureGoalsFromMap(BPMN_MAP_PATH);
  const docs = readFeatureGoalDocs(DOCS_DIR);
  const analysis = analyzeSync(featureGoals, docs, archiveDir);
  
  console.log(`   ✅ Hittade ${analysis.changedFeatureGoals.length} ändrade feature goals`);
  console.log(`   ✅ Hittade ${analysis.newFeatureGoals.length} nya feature goals`);
  console.log('');
  
  // Uppdatera ändrade feature goals
  let updatedCount = 0;
  for (const changed of analysis.changedFeatureGoals) {
    if (!changed.missingActivities || changed.missingActivities.length === 0) {
      continue;
    }
    
    if (!changed.oldDoc) {
      continue;
    }
    
    console.log(`📝 Uppdaterar ${changed.oldDoc.filename}...`);
    console.log(`   Lägger till ${changed.missingActivities.length} saknade aktiviteter`);
    
    try {
      const htmlContent = fs.readFileSync(changed.oldDoc.filepath, 'utf-8');
      const updatedHtml = addMissingActivitiesToHtml(htmlContent, changed.missingActivities);
      fs.writeFileSync(changed.oldDoc.filepath, updatedHtml, 'utf-8');
      updatedCount++;
      console.log(`   ✅ Uppdaterad`);
    } catch (error) {
      console.error(`   ❌ Fel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Skapa nya HTML-filer för nya feature goals
  let createdCount = 0;
  for (const newFg of analysis.newFeatureGoals) {
    // Använd samma filnamnformat som appen förväntar sig
    // Format: {bpmnFile}-{elementId}-v2.html
    // För call activities: använd subprocess_bpmn_file, annars parent_bpmn_file
    const bpmnFile = newFg.subprocess_bpmn_file || newFg.parent_bpmn_file;
    const fileKey = getFeatureGoalDocFileKey(bpmnFile, newFg.bpmn_id, 'v2');
    const filename = fileKey.replace('feature-goals/', ''); // Ta bort prefix
    const filepath = path.join(DOCS_DIR, filename);
    
    // Hoppa över om filen redan finns
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  Hoppar över ${filename} (finns redan)`);
      continue;
    }
    
    console.log(`📄 Skapar ${filename}...`);
    
    try {
      const html = createHtmlFromBpmn(archiveDir, newFg);
      fs.writeFileSync(filepath, html, 'utf-8');
      createdCount++;
      console.log(`   ✅ Skapad`);
    } catch (error) {
      console.error(`   ❌ Fel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ UPPDATERING KLAR');
  console.log('='.repeat(80));
  console.log('');
  console.log(`📊 Sammanfattning:`);
  console.log(`   📝 Uppdaterade filer: ${updatedCount}`);
  console.log(`   📄 Skapade filer: ${createdCount}`);
  console.log('');
}

main().catch(console.error);

