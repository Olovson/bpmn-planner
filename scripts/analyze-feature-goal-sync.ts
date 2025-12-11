#!/usr/bin/env tsx
/**
 * Script för att analysera skillnader mellan feature goals (call activities och subprocesses) 
 * i nya BPMN-filer och befintlig feature goal dokumentation
 * 
 * Användning:
 *   tsx scripts/analyze-feature-goal-sync.ts [sökväg-till-arkivmapp]
 * 
 * Om ingen sökväg anges, används den senaste "mortgage-se YYYY.MM.DD HH:MM" mappen
 * 
 * Scriptet använder samma logik som appen för att identifiera feature goals.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Kopiera av loadBpmnMap från appen för att undvika dependencies
 * (samma logik som src/lib/bpmn/bpmnMapLoader.ts)
 */
interface BpmnMapCallActivity {
  bpmn_id: string;
  name?: string;
  called_element?: string | null;
  subprocess_bpmn_file?: string;
}

interface BpmnMapProcess {
  id: string;
  bpmn_file: string;
  process_id: string;
  alias?: string;
  call_activities: BpmnMapCallActivity[];
}

interface BpmnMap {
  orchestration?: { root_process?: string };
  processes: BpmnMapProcess[];
}

function loadBpmnMap(raw: unknown): BpmnMap {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid bpmn-map.json');
  }

  const map = raw as BpmnMap;
  if (!Array.isArray(map.processes)) {
    throw new Error('Invalid map: processes missing');
  }

  // Normalisera tomma call_activities-array för säkerhets skull
  map.processes = map.processes.map((p) => ({
    ...p,
    call_activities: Array.isArray(p.call_activities) ? p.call_activities : [],
  }));

  return map;
}

interface FeatureGoal {
  bpmn_id: string;
  name: string;
  called_element: string | null;
  subprocess_bpmn_file: string;
  parent_bpmn_file: string;
  parent_process_name?: string;
  kind: 'callActivity' | 'subProcess';
}

interface FeatureGoalDoc {
  filename: string;
  filepath: string;
  bpmn_file?: string;
  element_id?: string;
  process_name?: string;
  lastModified?: Date;
}

interface SyncAnalysis {
  newFeatureGoals: FeatureGoal[];
  removedFeatureGoals: FeatureGoal[];
  changedFeatureGoals: Array<{
    featureGoal: FeatureGoal;
    oldDoc?: FeatureGoalDoc;
    changes: string[];
  }>;
  existingDocs: FeatureGoalDoc[];
  orphanedDocs: FeatureGoalDoc[];
}

/**
 * Hitta den senaste BPMN-arkivmappen
 */
function findLatestArchiveFolder(): string | null {
  const bpmnPlannerDir = path.join(__dirname, '../tests/fixtures/bpmn');
  
  if (!fs.existsSync(bpmnPlannerDir)) {
    return null;
  }
  
  const folders = fs.readdirSync(bpmnPlannerDir)
    .filter(item => {
      const itemPath = path.join(bpmnPlannerDir, item);
      return fs.statSync(itemPath).isDirectory() && item.match(/^mortgage-se \d{4}\.\d{2}\.\d{2} \d{2}:\d{2}/);
    })
    .map(folder => {
      const match = folder.match(/mortgage-se (\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})/);
      if (!match) return null;
      const [, year, month, day, hour, minute] = match;
      return {
        name: folder,
        path: path.join(bpmnPlannerDir, folder),
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
    .sort((a, b) => b.timestamp - a.timestamp); // Sort descending (newest first)
  
  return folders.length > 0 ? folders[0].path : null;
}

/**
 * Extrahera feature goals (call activities och subprocesses) från bpmn-map.json
 * Använder samma logik som appen
 */
function extractFeatureGoalsFromMap(bpmnMapPath: string): FeatureGoal[] {
  const content = fs.readFileSync(bpmnMapPath, 'utf-8');
  const rawBpmnMap = JSON.parse(content);
  const bpmnMap = loadBpmnMap(rawBpmnMap);
  
  const featureGoals: FeatureGoal[] = [];
  
  for (const process of bpmnMap.processes) {
    for (const ca of process.call_activities) {
      featureGoals.push({
        bpmn_id: ca.bpmn_id,
        name: ca.name,
        called_element: ca.called_element,
        subprocess_bpmn_file: ca.subprocess_bpmn_file,
        parent_bpmn_file: process.bpmn_file,
        parent_process_name: process.alias,
        kind: 'callActivity',
      });
    }
  }
  
  return featureGoals;
}

/**
 * Extrahera attribut från ett XML-element
 */
function getAttr(element: string, attrName: string): string {
  const regex = new RegExp(`${attrName}="([^"]+)"`, 'i');
  const match = regex.exec(element);
  return match ? match[1] : '';
}

/**
 * Extrahera feature goals (call activities och subprocesses) direkt från BPMN-filer
 * Använder samma logik som appens BpmnParser (regex-baserad parsing)
 */
function extractFeatureGoalsFromBpmnFiles(archiveDir: string): FeatureGoal[] {
  const bpmnFiles = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.bpmn'))
    .sort();
  
  const featureGoals: FeatureGoal[] = [];
  
  for (const bpmnFile of bpmnFiles) {
    const filePath = path.join(archiveDir, bpmnFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract process name
    const processMatch = /<(?:bpmn:)?process[^>]*>/i.exec(content);
    const processName = processMatch ? (getAttr(processMatch[0], 'name') || '') : '';
    
    // Extract call activities (these are always feature goals)
    const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*>/gi;
    let match;
    while ((match = callActivityRegex.exec(content)) !== null) {
      const id = getAttr(match[0], 'id');
      const name = getAttr(match[0], 'name') || id;
      const calledElement = getAttr(match[0], 'calledElement') || null;
      
      if (id) {
        featureGoals.push({
          bpmn_id: id,
          name: name || id,
          called_element: calledElement,
          subprocess_bpmn_file: '', // Will be resolved from calledElement or name
          parent_bpmn_file: bpmnFile,
          parent_process_name: processName,
          kind: 'callActivity',
        });
      }
    }
    
    // Extract subprocesses (that are candidates for feature goals)
    // Använder samma logik som appen: subprocesses med triggeredByEvent eller explicit names
    const subProcessRegex = /<(?:bpmn:)?subProcess[^>]*>/gi;
    while ((match = subProcessRegex.exec(content)) !== null) {
      const id = getAttr(match[0], 'id');
      const name = getAttr(match[0], 'name') || id;
      const triggerByEvent = getAttr(match[0], 'triggeredByEvent');
      
      // Only include subprocesses that are event-triggered or have explicit names
      // (these are more likely to be feature goals rather than embedded logic)
      // Detta matchar logiken i BpmnParser.ts där subprocessCandidates skapas
      if (id && (triggerByEvent === 'true' || name !== id)) {
        featureGoals.push({
          bpmn_id: id,
          name: name || id,
          called_element: null,
          subprocess_bpmn_file: '', // Subprocesses are typically embedded
          parent_bpmn_file: bpmnFile,
          parent_process_name: processName,
          kind: 'subProcess',
        });
      }
    }
  }
  
  return featureGoals;
}

/**
 * Läsa alla feature goal dokumentationsfiler
 */
function readFeatureGoalDocs(docsDir: string): FeatureGoalDoc[] {
  if (!fs.existsSync(docsDir)) {
    return [];
  }
  
  const files = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.html'))
    .map(filename => {
      const filepath = path.join(docsDir, filename);
      const stats = fs.statSync(filepath);
      
      // Parse filename to extract information
      // Format: local--{ProcessName}-{CallActivityName}-v2.html
      // or: {bpmnFile}-{elementId}-v2.html
      const cleanName = filename.replace(/^local--/, '').replace(/-v2\.html$/, '').replace(/\.html$/, '');
      
      return {
        filename,
        filepath,
        lastModified: stats.mtime,
      };
    });
  
  return files;
}

/**
 * Normalisera sträng för matchning
 */
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Matcha en feature goal till en dokumentationsfil
 */
function matchFeatureGoalToDoc(
  featureGoal: FeatureGoal,
  docs: FeatureGoalDoc[]
): FeatureGoalDoc | null {
  const parentBase = featureGoal.parent_bpmn_file.replace('.bpmn', '');
  const elementId = featureGoal.bpmn_id;
  const name = featureGoal.name;
  
  // Normalisera värden för matchning
  const normalizedParent = normalizeForMatching(parentBase);
  const normalizedElementId = normalizeForMatching(elementId);
  const normalizedName = normalizeForMatching(name);
  
  // Try multiple matching strategies
  for (const doc of docs) {
    // Remove prefix and suffix
    const cleanName = doc.filename
      .replace(/^local--/, '')
      .replace(/^slow-(chatgpt|ollama)--/, '')
      .replace(/^slow--/, '')
      .replace(/-v2\.html$/, '')
      .replace(/-v1\.html$/, '')
      .replace(/\.html$/, '');
    
    const normalizedDocName = normalizeForMatching(cleanName);
    
    // Strategy 1: Match parent + element ID (e.g., "mortgage-se-application-stakeholder")
    if (normalizedDocName === `${normalizedParent}-${normalizedElementId}` ||
        normalizedDocName.includes(`${normalizedParent}-${normalizedElementId}-`) ||
        normalizedDocName.endsWith(`-${normalizedParent}-${normalizedElementId}`)) {
      return doc;
    }
    
    // Strategy 2: Match parent + name (e.g., "Application-Stakeholder")
    if (normalizedDocName.includes(`${normalizedParent}-${normalizedName}`) ||
        normalizedDocName.includes(`${normalizedName}-${normalizedParent}`)) {
      return doc;
    }
    
    // Strategy 3: Match subprocess file name + element ID
    if (featureGoal.subprocess_bpmn_file) {
      const subprocessBase = featureGoal.subprocess_bpmn_file.replace('.bpmn', '');
      const normalizedSubprocess = normalizeForMatching(subprocessBase);
      
      if (normalizedDocName.includes(normalizedSubprocess) && 
          (normalizedDocName.includes(normalizedElementId) || normalizedDocName.includes(normalizedName))) {
        return doc;
      }
    }
    
    // Strategy 4: Match by called_element
    if (featureGoal.called_element) {
      const normalizedCalledElement = normalizeForMatching(featureGoal.called_element);
      if (normalizedDocName.includes(normalizedCalledElement)) {
        return doc;
      }
    }
    
    // Strategy 5: Match just by subprocess file name (if it's a direct match)
    if (featureGoal.subprocess_bpmn_file) {
      const subprocessBase = featureGoal.subprocess_bpmn_file.replace('.bpmn', '');
      const normalizedSubprocess = normalizeForMatching(subprocessBase);
      
      // Check if doc name matches subprocess name (with or without parent prefix)
      if (normalizedDocName === normalizedSubprocess ||
          normalizedDocName.endsWith(`-${normalizedSubprocess}`) ||
          normalizedDocName.startsWith(`${normalizedSubprocess}-`)) {
        return doc;
      }
    }
    
    // Strategy 6: Match by name only (if name is unique enough)
    if (normalizedName.length > 5 && normalizedDocName.includes(normalizedName)) {
      // Additional check: make sure it's not too generic
      const commonWords = ['application', 'credit', 'document', 'evaluation', 'decision'];
      if (!commonWords.some(word => normalizedName === word)) {
        return doc;
      }
    }
  }
  
  return null;
}

/**
 * Analysera skillnader
 */
function analyzeSync(
  featureGoals: FeatureGoal[],
  docs: FeatureGoalDoc[]
): SyncAnalysis {
  const newFeatureGoals: FeatureGoal[] = [];
  const removedFeatureGoals: FeatureGoal[] = [];
  const changedFeatureGoals: Array<{
    featureGoal: FeatureGoal;
    oldDoc?: FeatureGoalDoc;
    changes: string[];
  }> = [];
  const matchedDocs = new Set<string>();
  
  // Find new and changed feature goals
  for (const fg of featureGoals) {
    const matchedDoc = matchFeatureGoalToDoc(fg, docs);
    
    if (!matchedDoc) {
      newFeatureGoals.push(fg);
    } else {
      matchedDocs.add(matchedDoc.filename);
      
      // Check for changes (simplified - could be enhanced)
      const changes: string[] = [];
      
      // Check if name changed (would need to parse HTML to be sure)
      // For now, we'll just mark as potentially changed if doc is old
      const docAge = Date.now() - matchedDoc.lastModified!.getTime();
      const daysOld = docAge / (1000 * 60 * 60 * 24);
      
      if (daysOld > 7) {
        changes.push(`Dokumentation är ${Math.round(daysOld)} dagar gammal och kan vara inaktuell`);
      }
      
      if (changes.length > 0) {
        changedFeatureGoals.push({
          featureGoal: fg,
          oldDoc: matchedDoc,
          changes,
        });
      }
    }
  }
  
  // Find orphaned docs (docs without matching feature goals)
  const orphanedDocs = docs.filter(doc => !matchedDocs.has(doc.filename));
  
  // Find removed feature goals (would need old bpmn-map.json to compare)
  // For now, we'll skip this as we don't have the old version
  
  return {
    newFeatureGoals,
    removedFeatureGoals,
    changedFeatureGoals,
    existingDocs: docs.filter(doc => matchedDocs.has(doc.filename)),
    orphanedDocs,
  };
}

/**
 * Generera rapport
 */
function generateReport(analysis: SyncAnalysis, archiveDir: string, docsDir: string): string {
  const report: string[] = [];
  
  report.push('# Feature Goal Dokumentationssynkronisering - Analysrapport');
  report.push('');
  report.push(`**Genererad:** ${new Date().toISOString()}`);
  report.push(`**BPMN-källa:** ${path.basename(archiveDir)}`);
  report.push(`**Dokumentationskälla:** ${path.relative(process.cwd(), docsDir)}`);
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 📊 Sammanfattning');
  report.push('');
  report.push(`- 🆕 **Nya feature goals (saknar dokumentation):** ${analysis.newFeatureGoals.length}`);
  report.push(`- 🔄 **Potentiellt ändrade feature goals:** ${analysis.changedFeatureGoals.length}`);
  report.push(`- 🗑️  **Borttagna feature goals:** ${analysis.removedFeatureGoals.length}`);
  report.push(`- ✅ **Existerande dokumentation:** ${analysis.existingDocs.length}`);
  report.push(`- ⚠️  **Orphaned dokumentation (saknar feature goal):** ${analysis.orphanedDocs.length}`);
  report.push('');
  
  // Nya feature goals
  if (analysis.newFeatureGoals.length > 0) {
    report.push('---');
    report.push('');
    report.push('## 🆕 Nya Feature Goals (Saknar Dokumentation)');
    report.push('');
    report.push('Dessa feature goals (call activities eller subprocesses) finns i BPMN-filerna men saknar dokumentation:');
    report.push('');
    
    for (const fg of analysis.newFeatureGoals) {
      report.push(`### ${fg.name} (\`${fg.bpmn_id}\`)`);
      report.push('');
      report.push(`- **Typ:** ${fg.kind === 'callActivity' ? 'Call Activity' : 'SubProcess'}`);
      report.push(`- **Parent Process:** ${fg.parent_bpmn_file}${fg.parent_process_name ? ` (${fg.parent_process_name})` : ''}`);
      report.push(`- **Subprocess File:** ${fg.subprocess_bpmn_file || 'Ej specificerad'}`);
      report.push(`- **Called Element:** ${fg.called_element || 'Ej specificerad'}`);
      report.push('');
      report.push('**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.');
      report.push('');
    }
  }
  
  // Ändrade feature goals
  if (analysis.changedFeatureGoals.length > 0) {
    report.push('---');
    report.push('');
    report.push('## 🔄 Potentiellt Ändrade Feature Goals');
    report.push('');
    report.push('Dessa feature goals kan ha ändrats och dokumentationen bör granskas:');
    report.push('');
    
    for (const item of analysis.changedFeatureGoals) {
      report.push(`### ${item.featureGoal.name} (\`${item.featureGoal.bpmn_id}\`)`);
      report.push('');
      report.push(`- **Typ:** ${item.featureGoal.kind === 'callActivity' ? 'Call Activity' : 'SubProcess'}`);
      report.push(`- **Parent Process:** ${item.featureGoal.parent_bpmn_file}`);
      report.push(`- **Befintlig dokumentation:** \`${item.oldDoc?.filename}\``);
      report.push('');
      report.push('**Identifierade ändringar:**');
      item.changes.forEach(change => {
        report.push(`- ${change}`);
      });
      report.push('');
      report.push('**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.');
      report.push('');
    }
  }
  
  // Orphaned docs
  if (analysis.orphanedDocs.length > 0) {
    report.push('---');
    report.push('');
    report.push('## ⚠️  Orphaned Dokumentation');
    report.push('');
    report.push('Dessa dokumentationsfiler matchar inte längre någon feature goal i BPMN-filerna:');
    report.push('');
    
    for (const doc of analysis.orphanedDocs) {
      report.push(`- \`${doc.filename}\``);
      if (doc.lastModified) {
        report.push(`  - Senast ändrad: ${doc.lastModified.toISOString()}`);
      }
    }
    report.push('');
    report.push('**Åtgärd:** Granska om dokumentationen fortfarande är relevant eller bör tas bort.');
    report.push('');
  }
  
  // Borttagna feature goals
  if (analysis.removedFeatureGoals.length > 0) {
    report.push('---');
    report.push('');
    report.push('## 🗑️  Borttagna Feature Goals');
    report.push('');
    report.push('Dessa feature goals fanns tidigare men finns inte längre i BPMN-filerna:');
    report.push('');
    
    for (const fg of analysis.removedFeatureGoals) {
      report.push(`- **${fg.name}** (\`${fg.bpmn_id}\`, ${fg.kind === 'callActivity' ? 'Call Activity' : 'SubProcess'}) från ${fg.parent_bpmn_file}`);
    }
    report.push('');
    report.push('**Åtgärd:** Överväg att ta bort eller arkivera relaterad dokumentation.');
    report.push('');
  }
  
  // Existerande dokumentation
  if (analysis.existingDocs.length > 0) {
    report.push('---');
    report.push('');
    report.push(`## ✅ Existerande Dokumentation (${analysis.existingDocs.length} filer)`);
    report.push('');
    report.push('Dessa call activities har matchande dokumentation:');
    report.push('');
    
    // Group by parent process
    const byParent = new Map<string, FeatureGoalDoc[]>();
    for (const doc of analysis.existingDocs) {
      // Try to extract parent from filename
      const parts = doc.filename.replace(/^local--/, '').split('-');
      const parent = parts.slice(0, -1).join('-'); // Everything except last part
      
      if (!byParent.has(parent)) {
        byParent.set(parent, []);
      }
      byParent.get(parent)!.push(doc);
    }
    
    for (const [parent, docs] of Array.from(byParent.entries()).sort()) {
      report.push(`### ${parent}`);
      report.push('');
      for (const doc of docs.sort()) {
        report.push(`- \`${doc.filename}\``);
      }
      report.push('');
    }
  }
  
  report.push('---');
  report.push('');
  report.push('*Rapporten genereras automatiskt av analyze-feature-goal-sync.ts*');
  report.push('');
  report.push('**Nästa steg:**');
  report.push('1. Granska nya call activities och skapa dokumentation');
  report.push('2. Granska potentiellt ändrade call activities och uppdatera dokumentation');
  report.push('3. Granska orphaned dokumentation och ta beslut om borttagning');
  
  return report.join('\n');
}

/**
 * Huvudfunktion
 */
async function main() {
  const args = process.argv.slice(2);
  
  let archiveDir: string;
  
  if (args.length > 0) {
    archiveDir = path.resolve(args[0]);
  } else {
    const latest = findLatestArchiveFolder();
    if (!latest) {
      console.error('❌ Fel: Kunde inte hitta någon BPMN-arkivmapp');
      console.error('');
      console.error('Användning:');
      console.error('  tsx scripts/analyze-feature-goal-sync.ts [sökväg-till-arkivmapp]');
      console.error('');
      console.error('Om ingen sökväg anges, används den senaste "mortgage-se YYYY.MM.DD HH:MM" mappen');
      process.exit(1);
    }
    archiveDir = latest;
  }
  
  if (!fs.existsSync(archiveDir)) {
    console.error(`❌ Fel: Arkivmappen finns inte: ${archiveDir}`);
    process.exit(1);
  }
  
  const docsDir = path.join(__dirname, '../exports/feature-goals');
  
  try {
    console.log('='.repeat(80));
    console.log('FEATURE GOAL DOKUMENTATIONSSYNKRONISERING - ANALYS');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📁 BPMN-källa: ${archiveDir}`);
    console.log(`📄 Dokumentationskälla: ${docsDir}`);
    console.log('');
    
    // Extrahera call activities
    console.log('🔍 Extraherar feature goals (call activities och subprocesses)...');
    let featureGoals: FeatureGoal[];
    
    const bpmnMapPath = path.join(archiveDir, 'bpmn-map.json');
    if (fs.existsSync(bpmnMapPath)) {
      console.log('   Använder bpmn-map.json (samma logik som appen)');
      featureGoals = extractFeatureGoalsFromMap(bpmnMapPath);
    } else {
      console.log('   bpmn-map.json saknas, extraherar direkt från BPMN-filer (använder samma logik som appen)');
      featureGoals = extractFeatureGoalsFromBpmnFiles(archiveDir);
    }
    
    const callActivityCount = featureGoals.filter(fg => fg.kind === 'callActivity').length;
    const subProcessCount = featureGoals.filter(fg => fg.kind === 'subProcess').length;
    console.log(`   ✅ Hittade ${featureGoals.length} feature goals (${callActivityCount} call activities, ${subProcessCount} subprocesses)`);
    console.log('');
    
    // Läsa dokumentation
    console.log('🔍 Läser feature goal dokumentation...');
    const docs = readFeatureGoalDocs(docsDir);
    console.log(`   ✅ Hittade ${docs.length} dokumentationsfiler`);
    console.log('');
    
    // Analysera
    console.log('🔍 Analyserar skillnader...');
    const analysis = analyzeSync(featureGoals, docs);
    console.log('   ✅ Analys klar');
    console.log('');
    
    // Generera rapport
    const report = generateReport(analysis, archiveDir, docsDir);
    const reportPath = path.join(archiveDir, 'feature-goal-sync-report.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    
    console.log('='.repeat(80));
    console.log('✅ ANALYS KLAR');
    console.log('='.repeat(80));
    console.log('');
    console.log('📊 Sammanfattning:');
    console.log(`   🆕 Nya feature goals: ${analysis.newFeatureGoals.length}`);
    console.log(`   🔄 Potentiellt ändrade: ${analysis.changedFeatureGoals.length}`);
    console.log(`   🗑️  Borttagna: ${analysis.removedFeatureGoals.length}`);
    console.log(`   ✅ Existerande dokumentation: ${analysis.existingDocs.length}`);
    console.log(`   ⚠️  Orphaned dokumentation: ${analysis.orphanedDocs.length}`);
    console.log('');
    console.log(`📄 Detaljerad rapport: ${reportPath}`);
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Fel uppstod:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      console.error('');
      console.error(error.stack);
    } else {
      console.error(`   ${String(error)}`);
    }
    console.error('');
    process.exit(1);
  }
}

main().catch(console.error);

