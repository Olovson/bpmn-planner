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

interface BpmnActivity {
  id: string;
  name: string;
  type: 'serviceTask' | 'userTask' | 'businessRuleTask' | 'callActivity' | 'subProcess' | 'exclusiveGateway' | 'inclusiveGateway' | 'parallelGateway';
}

interface SyncAnalysis {
  newFeatureGoals: FeatureGoal[];
  removedFeatureGoals: FeatureGoal[];
  changedFeatureGoals: Array<{
    featureGoal: FeatureGoal;
    oldDoc?: FeatureGoalDoc;
    changes: string[];
    missingActivities?: BpmnActivity[];
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
export function extractFeatureGoalsFromMap(bpmnMapPath: string): FeatureGoal[] {
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
 * Letar i exports/feature-goals (där manuellt förbättrade filer ligger)
 */
export function readFeatureGoalDocs(docsDir: string): FeatureGoalDoc[] {
  if (!fs.existsSync(docsDir)) {
    return [];
  }
  
  const files = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.html'))
    .map(filename => {
      const filepath = path.join(docsDir, filename);
      const stats = fs.statSync(filepath);
      
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
    
    // Strategy 0: Exact name match FIRST (viktigast - undviker fel matchningar)
    // Detta måste köras först för att undvika att "Application" matchar "Application-Household"
    if (normalizedName.length > 3 && normalizedDocName === normalizedName) {
      return doc;
    }
    
    // Strategy 1: Match parent + element ID (e.g., "mortgage-se-application-stakeholder")
    // Också hantera fall där parent och element är samma (e.g., "mortgage-se-application-application")
    if (normalizedDocName === `${normalizedParent}-${normalizedElementId}` ||
        normalizedDocName === `${normalizedParent}-${normalizedParent}` || // För fall där element ID = parent name
        normalizedDocName.includes(`${normalizedParent}-${normalizedElementId}-`) ||
        normalizedDocName.endsWith(`-${normalizedParent}-${normalizedElementId}`) ||
        normalizedDocName.endsWith(`-${normalizedParent}-${normalizedParent}`)) {
      return doc;
    }
    
    // Strategy 2: Match parent + name (e.g., "Application-Stakeholder")
    // Men inte om doc name är exakt samma som name (för att undvika fel matchning)
    // OCH vi måste kolla att det faktiskt är en kombination, inte bara att name ingår
    const parentNamePattern = `${normalizedParent}-${normalizedName}`;
    const nameParentPattern = `${normalizedName}-${normalizedParent}`;
    if (normalizedDocName !== normalizedName &&
        (normalizedDocName.startsWith(parentNamePattern + '-') ||
         normalizedDocName === parentNamePattern ||
         normalizedDocName.startsWith(nameParentPattern + '-') ||
         normalizedDocName === nameParentPattern ||
         normalizedDocName.endsWith('-' + parentNamePattern) ||
         normalizedDocName.endsWith('-' + nameParentPattern))) {
      return doc;
    }
    
    // Strategy 2b: Match kortform av parent + name (e.g., "Application-Internal-data-gathering")
    // Dokumentationen kan använda kortform av parent (t.ex. "application" istället för "mortgage-se-application")
    const parentShortForm = normalizedParent.split('-').pop() || normalizedParent; // Sista delen av parent (t.ex. "application" från "mortgage-se-application")
    if (parentShortForm !== normalizedParent && parentShortForm.length > 3) { // Bara om det faktiskt är en kortform
      const shortParentNamePattern = `${parentShortForm}-${normalizedName}`;
      const shortNameParentPattern = `${normalizedName}-${parentShortForm}`;
      if (normalizedDocName !== normalizedName &&
          (normalizedDocName.startsWith(shortParentNamePattern + '-') ||
           normalizedDocName === shortParentNamePattern ||
           normalizedDocName.startsWith(shortNameParentPattern + '-') ||
           normalizedDocName === shortNameParentPattern ||
           normalizedDocName.endsWith('-' + shortParentNamePattern) ||
           normalizedDocName.endsWith('-' + shortNameParentPattern))) {
        return doc;
      }
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
      const subprocessLastPart = normalizedSubprocess.split('-').pop() || '';
      
      // Check if doc name matches subprocess name (with or without parent prefix)
      // Men inte om doc name bara innehåller en del av subprocess (för att undvika fel matchningar)
      if (normalizedDocName === normalizedSubprocess ||
          normalizedDocName.endsWith(`-${normalizedSubprocess}`) ||
          normalizedDocName.startsWith(`${normalizedSubprocess}-`) ||
          normalizedSubprocess === normalizedDocName ||
          (subprocessLastPart.length > 5 && normalizedDocName === subprocessLastPart)) { // Bara om lastPart är tillräckligt långt och exakt match
        return doc;
      }
    }
    
    // Strategy 6: (Nu flyttad till Strategy 0 ovan för att köras först)
  }
  
  return null;
}

/**
 * Extrahera aktiviteter från en BPMN-fil (för en specifik subprocess)
 */
export function extractActivitiesFromBpmnFile(
  archiveDir: string,
  featureGoal: FeatureGoal
): BpmnActivity[] {
  const activities: BpmnActivity[] = [];
  
  // Hitta BPMN-filen för subprocessen
  let bpmnFilePath: string;
  if (featureGoal.subprocess_bpmn_file) {
    bpmnFilePath = path.join(archiveDir, featureGoal.subprocess_bpmn_file);
  } else if (featureGoal.called_element) {
    // Försök hitta fil baserat på called_element
    const possibleFiles = [
      path.join(archiveDir, `${featureGoal.called_element}.bpmn`),
      path.join(archiveDir, `mortgage-se-${featureGoal.called_element}.bpmn`),
    ];
    bpmnFilePath = possibleFiles.find(f => fs.existsSync(f)) || '';
  } else {
    // Om ingen subprocess-fil, använd parent-filen
    bpmnFilePath = path.join(archiveDir, featureGoal.parent_bpmn_file);
  }
  
  if (!fs.existsSync(bpmnFilePath)) {
    return activities;
  }
  
  const content = fs.readFileSync(bpmnFilePath, 'utf-8');
  
  // Extrahera serviceTask
  const serviceTaskRegex = /<(?:bpmn:)?serviceTask[^>]*>/gi;
  let match;
  while ((match = serviceTaskRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      activities.push({ id, name, type: 'serviceTask' });
    }
  }
  
  // Extrahera userTask
  const userTaskRegex = /<(?:bpmn:)?userTask[^>]*>/gi;
  while ((match = userTaskRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      activities.push({ id, name, type: 'userTask' });
    }
  }
  
  // Extrahera businessRuleTask
  const businessRuleTaskRegex = /<(?:bpmn:)?businessRuleTask[^>]*>/gi;
  while ((match = businessRuleTaskRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      activities.push({ id, name, type: 'businessRuleTask' });
    }
  }
  
  // Extrahera callActivity (barn-call activities)
  const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*>/gi;
  while ((match = callActivityRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id && id !== featureGoal.bpmn_id) { // Exkludera själva feature goal call activity
      activities.push({ id, name, type: 'callActivity' });
    }
  }
  
  // Extrahera subProcess (barn-subprocesses)
  const subProcessRegex = /<(?:bpmn:)?subProcess[^>]*>/gi;
  while ((match = subProcessRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id && id !== featureGoal.bpmn_id) { // Exkludera själva feature goal subprocess
      activities.push({ id, name, type: 'subProcess' });
    }
  }
  
  // Extrahera gateways (viktiga för flödesbeskrivning)
  const gatewayRegex = /<(?:bpmn:)?(?:exclusive|inclusive|parallel)Gateway[^>]*>/gi;
  while ((match = gatewayRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    const tagName = match[0].match(/<(?:bpmn:)?(\w+)/)?.[1] || '';
    let type: BpmnActivity['type'] = 'exclusiveGateway';
    if (tagName.includes('inclusive')) type = 'inclusiveGateway';
    if (tagName.includes('parallel')) type = 'parallelGateway';
    
    if (id && name && name !== id) { // Bara gateways med namn (viktiga beslutspunkter)
      activities.push({ id, name, type });
    }
  }
  
  return activities;
}

/**
 * Extrahera nämnda aktiviteter från HTML-dokumentationen
 */
function extractActivitiesFromHtml(htmlContent: string): Set<string> {
  const mentionedActivities = new Set<string>();
  
  // Normalisera HTML-innehåll för sökning
  const normalized = htmlContent.toLowerCase();
  
  // Funktion för att extrahera ord från text
  const extractWords = (text: string): void => {
    // Ta bort HTML-taggar först
    const textOnly = text.replace(/<[^>]+>/g, ' ');
    // Dela upp i ord (hantera camelCase, kebab-case, etc.)
    const words = textOnly
      .split(/[\s,\-:;.()\[\]{}]+/)
      .filter(w => w.length > 2)
      .map(w => w.trim());
    
    words.forEach(word => {
      // Normalisera för matchning (ta bort specialtecken)
      const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized.length > 2) {
        mentionedActivities.add(normalized);
      }
      
      // Lägg också till delar av camelCase (t.ex. "fetchCredit" -> "fetch", "credit")
      const camelCaseParts = word.split(/(?=[A-Z])/).map(p => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
      camelCaseParts.forEach(part => {
        if (part.length > 2) {
          mentionedActivities.add(part);
        }
      });
    });
  };
  
  // 1. I listor (ul/li)
  const listItemRegex = /<li[^>]*>([^<]+)/gi;
  let match;
  while ((match = listItemRegex.exec(htmlContent)) !== null) {
    extractWords(match[1]);
  }
  
  // 2. I tabeller
  const tableCellRegex = /<t[dh][^>]*>([^<]+)/gi;
  while ((match = tableCellRegex.exec(htmlContent)) !== null) {
    extractWords(match[1]);
  }
  
  // 3. I h2/h3 rubriker
  const headingRegex = /<h[23][^>]*>([^<]+)/gi;
  while ((match = headingRegex.exec(htmlContent)) !== null) {
    extractWords(match[1]);
  }
  
  // 4. I paragraftext (p-taggar)
  const paragraphRegex = /<p[^>]*>([^<]+)/gi;
  while ((match = paragraphRegex.exec(htmlContent)) !== null) {
    extractWords(match[1]);
  }
  
  // 5. I div-taggar med text (för att fånga upp mer innehåll)
  const divRegex = /<div[^>]*>([^<]{10,})/gi;
  while ((match = divRegex.exec(htmlContent)) !== null) {
    extractWords(match[1]);
  }
  
  return mentionedActivities;
}

/**
 * Jämför BPMN-aktiviteter med HTML-dokumentationen
 */
function findMissingActivities(
  bpmnActivities: BpmnActivity[],
  htmlContent: string
): BpmnActivity[] {
  const mentioned = extractActivitiesFromHtml(htmlContent);
  const missing: BpmnActivity[] = [];
  
  for (const activity of bpmnActivities) {
    // Normalisera aktivitetsnamn för matchning
    const normalizedName = normalizeForMatching(activity.name);
    const normalizedId = normalizeForMatching(activity.id);
    
    // Kolla om aktiviteten nämns i HTML
    let found = false;
    for (const mentionedName of mentioned) {
      if (mentionedName.includes(normalizedName) || 
          mentionedName.includes(normalizedId) ||
          normalizedName.includes(mentionedName) ||
          normalizedId.includes(mentionedName)) {
        found = true;
        break;
      }
    }
    
    // Om aktiviteten inte hittades, lägg till som saknad
    if (!found) {
      missing.push(activity);
    }
  }
  
  return missing;
}

/**
 * Analysera skillnader
 */
export function analyzeSync(
  featureGoals: FeatureGoal[],
  docs: FeatureGoalDoc[],
  archiveDir: string
): SyncAnalysis {
  const newFeatureGoals: FeatureGoal[] = [];
  const removedFeatureGoals: FeatureGoal[] = [];
  const changedFeatureGoals: Array<{
    featureGoal: FeatureGoal;
    oldDoc?: FeatureGoalDoc;
    changes: string[];
    missingActivities?: BpmnActivity[];
  }> = [];
  const matchedDocs = new Set<string>();
  
  // Find new and changed feature goals
  for (const fg of featureGoals) {
    const matchedDoc = matchFeatureGoalToDoc(fg, docs);
    
    if (!matchedDoc) {
      newFeatureGoals.push(fg);
    } else {
      matchedDocs.add(matchedDoc.filename);
      
      // Analysera saknade aktiviteter (innehållsanalys)
      const changes: string[] = [];
      let missingActivities: BpmnActivity[] = [];
      
      try {
        const htmlContent = fs.readFileSync(matchedDoc.filepath, 'utf-8');
        const bpmnActivities = extractActivitiesFromBpmnFile(archiveDir, fg);
        missingActivities = findMissingActivities(bpmnActivities, htmlContent);
        
        if (missingActivities.length > 0) {
          const activityTypes = missingActivities.map(a => a.type).filter((v, i, a) => a.indexOf(v) === i);
          changes.push(
            `Saknar ${missingActivities.length} aktivitet(er) i dokumentationen: ` +
            `${missingActivities.slice(0, 3).map(a => a.name || a.id).join(', ')}` +
            (missingActivities.length > 3 ? ` (+${missingActivities.length - 3} fler)` : '') +
            ` (typer: ${activityTypes.join(', ')})`
          );
        }
      } catch (error) {
        // Om vi inte kan läsa filen eller extrahera aktiviteter, ignorera
        console.warn(`   ⚠️  Kunde inte analysera aktiviteter för ${matchedDoc.filename}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Lägg till som ändrad endast om det finns faktiska skillnader (saknade aktiviteter)
      if (changes.length > 0) {
        changedFeatureGoals.push({
          featureGoal: fg,
          oldDoc: matchedDoc,
          changes,
          missingActivities: missingActivities.length > 0 ? missingActivities : undefined,
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
      
      // Visa saknade aktiviteter i detalj
      if (item.missingActivities && item.missingActivities.length > 0) {
        report.push('**Saknade aktiviteter i dokumentationen:**');
        report.push('');
        report.push('| Typ | ID | Namn |');
        report.push('|-----|----|------|');
        for (const activity of item.missingActivities) {
          const typeLabel = {
            serviceTask: 'Service Task',
            userTask: 'User Task',
            businessRuleTask: 'Business Rule Task',
            callActivity: 'Call Activity',
            subProcess: 'SubProcess',
            exclusiveGateway: 'Gateway (Exclusive)',
            inclusiveGateway: 'Gateway (Inclusive)',
            parallelGateway: 'Gateway (Parallel)',
          }[activity.type] || activity.type;
          report.push(`| ${typeLabel} | \`${activity.id}\` | ${activity.name || '(saknar namn)'} |`);
        }
        report.push('');
      }
      
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
    console.log('   Analyserar BPMN-aktiviteter vs dokumentation...');
    const analysis = analyzeSync(featureGoals, docs, archiveDir);
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

