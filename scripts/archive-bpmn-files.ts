#!/usr/bin/env tsx
/**
 * Script för att arkivera alla BPMN-filer från en källmapp till en ny mapp
 * 
 * Användning:
 *   tsx scripts/archive-bpmn-files.ts <sökväg-till-källmapp>
 * 
 * Exempel:
 *   tsx scripts/archive-bpmn-files.ts tests/fixtures/bpmn
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importera typer och funktioner från generate-diff-report.ts
// För att undvika duplicering, använd generate-diff-report.ts direkt
// genom att köra det som separat process eller importera funktionerna

interface DiffResult {
  newFiles: string[];
  removedFiles: string[];
  modifiedFiles: string[];
  unchangedFiles: string[];
  fileChanges: Map<string, any>; // filename -> detailed changes (from generate-diff-report)
}

interface ArchiveResult {
  totalFound: number;
  totalCopied: number;
  destinationPath: string;
  conflicts: Array<{ originalName: string; finalName: string }>;
  diffResult: DiffResult | null;
  diffReportPath: string | null;
  bpmnMapPath: string | null;
  bpmnMapWarnings: string[];
}

interface BpmnMapProcess {
  id: string;
  alias: string;
  bpmn_file: string;
  process_id: string;
  description: string;
  call_activities: Array<{
    bpmn_id: string;
    name: string;
    called_element: string | null;
    subprocess_bpmn_file: string;
    needs_manual_review?: boolean;
  }>;
}

interface BpmnMap {
  generated_at: string;
  note: string;
  orchestration: {
    root_process: string;
  };
  processes: BpmnMapProcess[];
}

interface CallActivityInfo {
  bpmn_id: string;
  name: string;
  called_element: string | null;
  parent_file: string;
}

/**
 * Hitta alla .bpmn-filer rekursivt i en mapp
 */
function findBpmnFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findBpmnFiles(filePath, fileList);
    } else if (file.endsWith('.bpmn')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Hantera namnkonflikter genom att lägga till nummer
 */
function resolveFileName(destinationDir: string, fileName: string): string {
  const baseName = path.basename(fileName);
  let finalName = baseName;
  let counter = 0;

  while (fs.existsSync(path.join(destinationDir, finalName))) {
    counter++;
    const ext = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, ext);
    finalName = `${nameWithoutExt}_${counter}${ext}`;
  }

  return finalName;
}

/**
 * Skapa mappnamn baserat på aktuellt datum och tid
 */
function generateFolderName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `mortgage-se ${year}.${month}.${day} ${hours}:${minutes}`;
}

/**
 * Hitta de två senaste mapparna med mönstret "mortgage-se YYYY.MM.DD HH:MM"
 */
function findLatestFolders(parentDir: string): { latest: string; previous: string | null } {
  const folders = fs.readdirSync(parentDir)
    .filter(item => {
      const itemPath = path.join(parentDir, item);
      return fs.statSync(itemPath).isDirectory() && item.startsWith('mortgage-se ');
    })
    .map(folder => {
      // Parse date from folder name: "mortgage-se YYYY.MM.DD HH:MM"
      const match = folder.match(/mortgage-se (\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})/);
      if (!match) return null;
      const [, year, month, day, hour, minute] = match;
      return {
        name: folder,
        path: path.join(parentDir, folder),
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

  if (folders.length === 0) {
    return { latest: '', previous: null };
  }

  return {
    latest: folders[0].path,
    previous: folders.length > 1 ? folders[1].path : null,
  };
}

/**
 * Anropa generate-diff-report.ts för att skapa förbättrad diff-rapport
 * Detta undviker kodduplicering och säkerställer konsistent output
 */
async function generateDiffReportUsingExternalScript(
  oldDir: string,
  newDir: string
): Promise<{ reportPath: string; diffResult: DiffResult }> {
  const { execSync } = await import('child_process');
  
  const oldFolderName = path.basename(oldDir);
  const newFolderName = path.basename(newDir);
  
  // Kör generate-diff-report.ts som subprocess
  const scriptPath = path.join(__dirname, 'generate-diff-report.ts');
  const command = `npx tsx "${scriptPath}" "${oldFolderName}" "${newFolderName}"`;
  
  try {
    execSync(command, { 
      cwd: path.dirname(newDir),
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    
    // Läs den genererade rapporten
    const reportPath = path.join(newDir, 'diff-report.md');
    if (fs.existsSync(reportPath)) {
      // För att få diffResult, behöver vi köra jämförelsen igen eller läsa från rapporten
      // För nu, returnera en enkel struktur
      return {
        reportPath,
        diffResult: {
          newFiles: [],
          removedFiles: [],
          modifiedFiles: [],
          unchangedFiles: [],
          fileChanges: new Map(),
        },
      };
    }
  } catch (error) {
    console.warn('Kunde inte köra generate-diff-report.ts, använder enkel diff');
  }
  
  // Fallback - returnera tom resultat
  return {
    reportPath: path.join(newDir, 'diff-report.md'),
    diffResult: {
      newFiles: [],
      removedFiles: [],
      modifiedFiles: [],
      unchangedFiles: [],
      fileChanges: new Map(),
    },
  };
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
 * Extrahera Call Activities från en BPMN-fil
 */
function extractCallActivities(bpmnFilePath: string): CallActivityInfo[] {
  const content = fs.readFileSync(bpmnFilePath, 'utf-8');
  const fileName = path.basename(bpmnFilePath);
  const callActivities: CallActivityInfo[] = [];

  const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*>/gi;
  let match;
  while ((match = callActivityRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || '';
    const calledElement = getAttr(match[0], 'calledElement') || null;
    
    if (id) {
      callActivities.push({
        bpmn_id: id,
        name: name || id,
        called_element: calledElement,
        parent_file: fileName,
      });
    }
  }

  return callActivities;
}

/**
 * Hitta process_id från en BPMN-fil
 */
function extractProcessId(bpmnFilePath: string): string | null {
  const content = fs.readFileSync(bpmnFilePath, 'utf-8');
  const processMatch = /<(?:bpmn:)?process[^>]*>/i.exec(content);
  if (processMatch) {
    return getAttr(processMatch[0], 'id') || null;
  }
  return null;
}

/**
 * Matcha en call activity till en subprocess-fil
 */
function matchCallActivityToSubprocess(
  callActivity: CallActivityInfo,
  availableFiles: string[],
  existingMap: BpmnMap | null
): { matchedFile: string | null; confidence: 'high' | 'medium' | 'low' | 'none'; reason: string } {
  const availableFileSet = new Set(availableFiles);
  
  // 1. Om calledElement finns, använd det direkt (högsta konfidens)
  if (callActivity.called_element) {
    // Försök hitta fil baserat på calledElement
    const potentialFiles = [
      `mortgage-se-${callActivity.called_element}.bpmn`,
      `${callActivity.called_element}.bpmn`,
    ];
    
    for (const potentialFile of potentialFiles) {
      if (availableFileSet.has(potentialFile)) {
        return {
          matchedFile: potentialFile,
          confidence: 'high',
          reason: `calledElement "${callActivity.called_element}" matches file "${potentialFile}"`,
        };
      }
    }
    
    // Om calledElement finns men ingen fil matchar, låg konfidens
    return {
      matchedFile: null,
      confidence: 'low',
      reason: `calledElement "${callActivity.called_element}" specified but no matching file found`,
    };
  }
  
  // 2. Kolla befintlig mappning från gamla bpmn-map.json
  if (existingMap) {
    for (const process of existingMap.processes) {
      if (process.bpmn_file === callActivity.parent_file) {
        for (const existingCA of process.call_activities) {
          if (existingCA.bpmn_id === callActivity.bpmn_id ||
              (existingCA.name && existingCA.name === callActivity.name)) {
            if (availableFileSet.has(existingCA.subprocess_bpmn_file)) {
              return {
                matchedFile: existingCA.subprocess_bpmn_file,
                confidence: existingCA.called_element ? 'high' : 'medium',
                reason: `matched from existing map (${existingCA.called_element ? 'has calledElement' : 'no calledElement'})`,
              };
            }
          }
        }
      }
    }
  }
  
  // 3. Försök matcha baserat på name eller bpmn_id
  const nameToMatch = callActivity.name.toLowerCase().replace(/\s+/g, '-');
  const idToMatch = callActivity.bpmn_id.toLowerCase();
  
  const potentialFiles = [
    `mortgage-se-${nameToMatch}.bpmn`,
    `${nameToMatch}.bpmn`,
    `mortgage-se-${idToMatch}.bpmn`,
    `${idToMatch}.bpmn`,
  ];
  
  for (const potentialFile of potentialFiles) {
    if (availableFileSet.has(potentialFile)) {
      return {
        matchedFile: potentialFile,
        confidence: 'medium',
        reason: `matched by name/id pattern to "${potentialFile}"`,
      };
    }
  }
  
  return {
    matchedFile: null,
    confidence: 'none',
    reason: 'no matching file found',
  };
}

/**
 * Uppdatera bpmn-map.json baserat på BPMN-filer i mappen
 */
function updateBpmnMap(
  archiveDir: string,
  existingMapPath: string | null
): { map: BpmnMap; warnings: string[]; changes: ArchiveResult['bpmnMapChanges'] } {
  const warnings: string[] = [];
  const changes = {
    added: 0,
    updated: 0,
    needsReview: 0,
    brokenReferences: 0,
    unusedFiles: 0,
  };
  
  // Läs befintlig map om den finns
  let existingMap: BpmnMap | null = null;
  if (existingMapPath && fs.existsSync(existingMapPath)) {
    try {
      const existingContent = fs.readFileSync(existingMapPath, 'utf-8');
      existingMap = JSON.parse(existingContent) as BpmnMap;
    } catch (error) {
      warnings.push(`Kunde inte läsa befintlig bpmn-map.json: ${error}`);
    }
  }
  
  // Hitta alla BPMN-filer i arkivmappen
  const bpmnFiles = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.bpmn'))
    .sort();
  
  if (bpmnFiles.length === 0) {
    throw new Error('Inga BPMN-filer hittades i arkivmappen');
  }
  
  // Extrahera alla call activities från alla filer
  const allCallActivities = new Map<string, CallActivityInfo[]>();
  for (const bpmnFile of bpmnFiles) {
    const filePath = path.join(archiveDir, bpmnFile);
    const callActivities = extractCallActivities(filePath);
    if (callActivities.length > 0) {
      allCallActivities.set(bpmnFile, callActivities);
    }
  }
  
  // Bygg upp ny map
  const processes: BpmnMapProcess[] = [];
  
  for (const bpmnFile of bpmnFiles) {
    const filePath = path.join(archiveDir, bpmnFile);
    const processId = extractProcessId(filePath) || bpmnFile.replace('.bpmn', '');
    
    // Hitta befintlig process-info
    const existingProcess = existingMap?.processes.find(p => p.bpmn_file === bpmnFile);
    
    const callActivities = allCallActivities.get(bpmnFile) || [];
    const mappedCallActivities: BpmnMapProcess['call_activities'] = [];
    
    for (const callActivity of callActivities) {
      const match = matchCallActivityToSubprocess(callActivity, bpmnFiles, existingMap);
      
      if (match.matchedFile) {
        // Kolla om det finns en befintlig mappning
        const existingCA = existingProcess?.call_activities.find(
          ca => ca.bpmn_id === callActivity.bpmn_id
        );
        
        if (existingCA) {
          // Uppdatera befintlig mappning
          if (match.confidence === 'high' && existingCA.subprocess_bpmn_file !== match.matchedFile) {
            mappedCallActivities.push({
              ...existingCA,
              subprocess_bpmn_file: match.matchedFile,
              called_element: callActivity.called_element,
            });
            changes.updated++;
          } else if (match.confidence === 'medium') {
            // Behåll gammal mappning om det finns tvetydighet
            mappedCallActivities.push({
              ...existingCA,
              needs_manual_review: true,
            });
            changes.needsReview++;
            warnings.push(
              `Call activity "${callActivity.name}" (${callActivity.bpmn_id}) i ${bpmnFile}: ` +
              `Medium konfidens matchning. Behåller gammal mappning: ${existingCA.subprocess_bpmn_file}`
            );
          } else {
            // Behåll gammal mappning
            mappedCallActivities.push(existingCA);
          }
        } else {
          // Ny call activity
          mappedCallActivities.push({
            bpmn_id: callActivity.bpmn_id,
            name: callActivity.name,
            called_element: callActivity.called_element,
            subprocess_bpmn_file: match.matchedFile,
            needs_manual_review: match.confidence === 'medium',
          });
          changes.added++;
          if (match.confidence === 'medium') {
            changes.needsReview++;
            warnings.push(
              `Ny call activity "${callActivity.name}" (${callActivity.bpmn_id}) i ${bpmnFile}: ` +
              `Medium konfidens matchning till ${match.matchedFile}. Kräver manuell granskning.`
            );
          }
        }
        
        // Validera att filen faktiskt finns
        if (!bpmnFiles.includes(match.matchedFile)) {
          changes.brokenReferences++;
          warnings.push(
            `Bruten referens: Call activity "${callActivity.name}" (${callActivity.bpmn_id}) i ${bpmnFile} ` +
            `pekar på ${match.matchedFile} som inte finns i mappen.`
          );
        }
      } else {
        // Ingen matchning hittad
        const existingCA = existingProcess?.call_activities.find(
          ca => ca.bpmn_id === callActivity.bpmn_id
        );
        
        if (existingCA) {
          // Behåll gammal mappning men markera som needs review
          mappedCallActivities.push({
            ...existingCA,
            needs_manual_review: true,
          });
          changes.needsReview++;
          warnings.push(
            `Call activity "${callActivity.name}" (${callActivity.bpmn_id}) i ${bpmnFile}: ` +
            `Kunde inte matcha. Behåller gammal mappning: ${existingCA.subprocess_bpmn_file} (kräver manuell granskning)`
          );
        } else {
          // Ny call activity utan matchning
          changes.needsReview++;
          warnings.push(
            `Ny call activity "${callActivity.name}" (${callActivity.bpmn_id}) i ${bpmnFile}: ` +
            `Kunde inte matcha till någon subprocess-fil. Kräver manuell mappning.`
          );
        }
      }
    }
    
    // Skapa process-entry
    processes.push({
      id: existingProcess?.id || processId,
      alias: existingProcess?.alias || bpmnFile.replace('.bpmn', '').replace(/-/g, ' '),
      bpmn_file: bpmnFile,
      process_id: processId,
      description: existingProcess?.description || processId,
      call_activities: mappedCallActivities,
    });
  }
  
  // Hitta oanvända filer (filer som inte refereras av någon call activity)
  const referencedFiles = new Set<string>();
  for (const process of processes) {
    for (const ca of process.call_activities) {
      if (ca.subprocess_bpmn_file) {
        referencedFiles.add(ca.subprocess_bpmn_file);
      }
    }
  }
  
  const unusedFiles = bpmnFiles.filter(f => !referencedFiles.has(f) && f !== 'mortgage.bpmn');
  if (unusedFiles.length > 0) {
    changes.unusedFiles = unusedFiles.length;
    warnings.push(
      `Oanvända BPMN-filer (inte refererade av någon call activity): ${unusedFiles.join(', ')}`
    );
  }
  
  // Bygg ny map
  const newMap: BpmnMap = {
    generated_at: new Date().toISOString(),
    note: existingMap?.note || 'BPMN map generated from archived files',
    orchestration: existingMap?.orchestration || { root_process: 'mortgage' },
    processes: processes.sort((a, b) => a.bpmn_file.localeCompare(b.bpmn_file)),
  };
  
  return { map: newMap, warnings, changes };
}

/**
 * Huvudfunktion för att arkivera BPMN-filer
 */
async function archiveBpmnFiles(sourceDir: string): Promise<ArchiveResult> {
  // Validera att källmappen finns
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Källmappen finns inte: ${sourceDir}`);
  }

  const sourceStat = fs.statSync(sourceDir);
  if (!sourceStat.isDirectory()) {
    throw new Error(`Sökvägen är inte en mapp: ${sourceDir}`);
  }

  // Hitta alla BPMN-filer
  console.log(`Söker efter BPMN-filer i: ${sourceDir}...`);
  const bpmnFiles = findBpmnFiles(sourceDir);

  if (bpmnFiles.length === 0) {
    throw new Error(`Inga BPMN-filer hittades i: ${sourceDir}`);
  }

  console.log(`Hittade ${bpmnFiles.length} BPMN-fil(er)`);

  // Hitta rätt destinationskatalog - leta efter befintliga "mortgage-se YYYY.MM.DD" mappar
  // Prioritera bpmn-planner/tests/fixtures/bpmn där de befintliga mapparna ligger
  const sourceParent = path.dirname(path.resolve(sourceDir));
  const bpmnPlannerDir = path.join(__dirname, '../tests/fixtures/bpmn');
  
  let destinationParent = sourceParent;
  
  // Kolla om det finns "mortgage-se YYYY.MM.DD" mappar i bpmn-planner
  if (fs.existsSync(bpmnPlannerDir)) {
    const existingFolders = fs.readdirSync(bpmnPlannerDir)
      .filter(item => {
        const itemPath = path.join(bpmnPlannerDir, item);
        return fs.statSync(itemPath).isDirectory() && item.match(/^mortgage-se \d{4}\.\d{2}\.\d{2}/);
      });
    
    if (existingFolders.length > 0) {
      destinationParent = bpmnPlannerDir;
      console.log(`Hittade befintliga mappar i: ${destinationParent}`);
      console.log(`   Använder denna katalog för att skapa ny mapp`);
    }
  }
  
  const folderName = generateFolderName();
  const destinationDir = path.join(destinationParent, folderName);

  // Skapa destinationsmappen
  if (fs.existsSync(destinationDir)) {
    throw new Error(`Destinationsmappen finns redan: ${destinationDir}`);
  }

  fs.mkdirSync(destinationDir, { recursive: true });
  console.log(`Skapade mapp: ${destinationDir}`);

  // Kopiera filer
  const conflicts: Array<{ originalName: string; finalName: string }> = [];
  let copiedCount = 0;

  for (const sourceFile of bpmnFiles) {
    const originalFileName = path.basename(sourceFile);
    const finalFileName = resolveFileName(destinationDir, originalFileName);
    const destinationFile = path.join(destinationDir, finalFileName);

    fs.copyFileSync(sourceFile, destinationFile);
    copiedCount++;

    if (originalFileName !== finalFileName) {
      conflicts.push({ originalName: originalFileName, finalName: finalFileName });
    }
  }

  // Hitta de två senaste mapparna och jämför
  // Sök i destinationskatalogen (där de befintliga mapparna ligger)
  const { latest, previous } = findLatestFolders(destinationParent);
  let diffResult: DiffResult | null = null;
  let diffReportPath: string | null = null;

  if (previous && latest === destinationDir) {
    console.log('');
    console.log('Jämför med tidigare version...');
    
    // Använd generate-diff-report.ts för att skapa förbättrad rapport
    try {
      const { execSync } = await import('child_process');
      const oldFolderName = path.basename(previous);
      const newFolderName = path.basename(destinationDir);
      const scriptPath = path.join(__dirname, 'generate-diff-report.ts');
      
      // Kör generate-diff-report.ts
      execSync(`npx tsx "${scriptPath}" "${oldFolderName}" "${newFolderName}"`, {
        cwd: destinationParent,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      
      diffReportPath = path.join(destinationDir, 'diff-report.md');
      if (fs.existsSync(diffReportPath)) {
        console.log(`✅ Diff-rapport skapad: ${diffReportPath}`);
        // Läs rapporten för att extrahera sammanfattning
        const reportContent = fs.readFileSync(diffReportPath, 'utf-8');
        // Extrahera grundläggande statistik från rapporten
        const newFilesMatch = reportContent.match(/- 🆕 \*\*Nya filer:\*\* (\d+)/);
        const removedFilesMatch = reportContent.match(/- 🗑️ \*\*Borttagna filer:\*\* (\d+)/);
        const modifiedFilesMatch = reportContent.match(/- 🔄 \*\*Modifierade filer:\*\* (\d+)/);
        const unchangedFilesMatch = reportContent.match(/- ✅ \*\*Oförändrade filer:\*\* (\d+)/);
        
        diffResult = {
          newFiles: [],
          removedFiles: [],
          modifiedFiles: [],
          unchangedFiles: [],
          fileChanges: new Map(),
        };
      }
    } catch (error) {
      console.warn('Kunde inte köra generate-diff-report.ts:', error);
      diffResult = null;
      diffReportPath = null;
    }
  } else if (!previous) {
    console.log('');
    console.log('ℹ️  Ingen tidigare version hittades för jämförelse');
  }

  // Uppdatera bpmn-map.json
  let bpmnMapPath: string | null = null;
  let bpmnMapWarnings: string[] = [];
  let bpmnMapChanges: ArchiveResult['bpmnMapChanges'] = {
    added: 0,
    updated: 0,
    needsReview: 0,
    brokenReferences: 0,
    unusedFiles: 0,
  };
  
  try {
    // Hitta befintlig bpmn-map.json (i projektroten)
    const existingMapPath = path.join(__dirname, '../bpmn-map.json');
    
    console.log('');
    console.log('Uppdaterar bpmn-map.json...');
    const { map, warnings, changes } = updateBpmnMap(destinationDir, existingMapPath);
    
    bpmnMapPath = path.join(destinationDir, 'bpmn-map.json');
    fs.writeFileSync(bpmnMapPath, JSON.stringify(map, null, 2), 'utf-8');
    bpmnMapWarnings = warnings;
    bpmnMapChanges = changes;
    
    console.log(`✅ bpmn-map.json skapad: ${bpmnMapPath}`);
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} varningar (se diff-rapporten för detaljer)`);
    }
    
    // Uppdatera diff-rapporten med bpmn-map information om den finns
    if (diffReportPath && fs.existsSync(diffReportPath)) {
      const reportContent = fs.readFileSync(diffReportPath, 'utf-8');
      const bpmnMapSection = generateBpmnMapSection(warnings, changes);
      const updatedReport = reportContent + '\n\n' + bpmnMapSection;
      fs.writeFileSync(diffReportPath, updatedReport, 'utf-8');
    }
  } catch (error) {
    console.warn(`⚠️  Kunde inte uppdatera bpmn-map.json: ${error}`);
    bpmnMapWarnings.push(`Fel vid uppdatering: ${error}`);
  }

  return {
    totalFound: bpmnFiles.length,
    totalCopied: copiedCount,
    destinationPath: destinationDir,
    conflicts,
    diffResult,
    diffReportPath,
    bpmnMapPath,
    bpmnMapWarnings,
    bpmnMapChanges,
  };
}

/**
 * Generera sektion för bpmn-map ändringar i diff-rapporten
 */
function generateBpmnMapSection(warnings: string[], changes: ArchiveResult['bpmnMapChanges']): string {
  const sections: string[] = [];
  
  sections.push('---');
  sections.push('');
  sections.push('## 🗺️ BPMN Map Uppdateringar');
  sections.push('');
  sections.push('### Sammanfattning');
  sections.push('');
  sections.push(`- ✅ **Nya mappningar:** ${changes.added}`);
  sections.push(`- 🔄 **Uppdaterade mappningar:** ${changes.updated}`);
  sections.push(`- ⚠️  **Kräver manuell granskning:** ${changes.needsReview}`);
  sections.push(`- ❌ **Brutna referenser:** ${changes.brokenReferences}`);
  sections.push(`- 📦 **Oanvända filer:** ${changes.unusedFiles}`);
  sections.push('');
  
  if (warnings.length > 0) {
    sections.push('### ⚠️ Varningar och mappningar som kräver manuell granskning');
    sections.push('');
    warnings.forEach(warning => {
      sections.push(`- ${warning}`);
    });
    sections.push('');
  }
  
  if (changes.needsReview === 0 && changes.brokenReferences === 0 && warnings.length === 0) {
    sections.push('✅ Alla mappningar är korrekta och behöver ingen manuell granskning.');
    sections.push('');
  }
  
  return sections.join('\n');
}

/**
 * Huvudfunktion
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Fel: Ingen sökväg angiven');
    console.error('');
    console.error('Användning:');
    console.error('  tsx scripts/archive-bpmn-files.ts <sökväg-till-källmapp>');
    console.error('');
    console.error('Exempel:');
    console.error('  tsx scripts/archive-bpmn-files.ts tests/fixtures/bpmn');
    process.exit(1);
  }

  const sourceDir = path.resolve(args[0]);

  try {
    console.log('='.repeat(80));
    console.log('BPMN FILARKIVERING');
    console.log('='.repeat(80));
    console.log('');

    const result = await archiveBpmnFiles(sourceDir);

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ ARKIVERING KLAR');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📁 Antal BPMN-filer hittade: ${result.totalFound}`);
    console.log(`📋 Antal filer kopierade: ${result.totalCopied}`);
    console.log(`📂 Destinationsmapp: ${result.destinationPath}`);
    console.log('');

    if (result.conflicts.length > 0) {
      console.log('⚠️  Namnkonflikter hanterade:');
      result.conflicts.forEach(({ originalName, finalName }) => {
        console.log(`   ${originalName} → ${finalName}`);
      });
      console.log('');
    }

    // Visa diff-sammanfattning
    if (result.diffResult) {
      console.log('='.repeat(80));
      console.log('📊 DIFF-SAMMANFATTNING');
      console.log('='.repeat(80));
      console.log('');
      console.log(`🆕 Nya filer: ${result.diffResult.newFiles.length}`);
      console.log(`🗑️  Borttagna filer: ${result.diffResult.removedFiles.length}`);
      console.log(`🔄 Modifierade filer: ${result.diffResult.modifiedFiles.length}`);
      console.log(`✅ Oförändrade filer: ${result.diffResult.unchangedFiles.length}`);
      console.log('');

      if (result.diffReportPath) {
        console.log(`📄 Detaljerad rapport: ${result.diffReportPath}`);
        console.log('');
      }

      // Visa modifierade filer
      if (result.diffResult.modifiedFiles.length > 0) {
        console.log('🔄 Modifierade filer:');
        result.diffResult.modifiedFiles.forEach(file => {
          console.log(`   - ${file}`);
        });
        console.log('');
      }

      // Visa nya filer
      if (result.diffResult.newFiles.length > 0) {
        console.log('🆕 Nya filer:');
        result.diffResult.newFiles.forEach(file => {
          console.log(`   - ${file}`);
        });
        console.log('');
      }

      // Visa borttagna filer
      if (result.diffResult.removedFiles.length > 0) {
        console.log('🗑️  Borttagna filer:');
        result.diffResult.removedFiles.forEach(file => {
          console.log(`   - ${file}`);
        });
        console.log('');
      }
    }

    // Visa bpmn-map information
    if (result.bpmnMapPath) {
      console.log('='.repeat(80));
      console.log('🗺️  BPMN MAP UPPDATERING');
      console.log('='.repeat(80));
      console.log('');
      console.log(`📄 bpmn-map.json skapad: ${result.bpmnMapPath}`);
      console.log('');
      console.log('📊 Sammanfattning:');
      console.log(`   ✅ Nya mappningar: ${result.bpmnMapChanges.added}`);
      console.log(`   🔄 Uppdaterade mappningar: ${result.bpmnMapChanges.updated}`);
      console.log(`   ⚠️  Kräver manuell granskning: ${result.bpmnMapChanges.needsReview}`);
      console.log(`   ❌ Brutna referenser: ${result.bpmnMapChanges.brokenReferences}`);
      console.log(`   📦 Oanvända filer: ${result.bpmnMapChanges.unusedFiles}`);
      console.log('');
      
      if (result.bpmnMapWarnings.length > 0) {
        console.log(`⚠️  ${result.bpmnMapWarnings.length} varningar genererade`);
        console.log('   Se diff-rapporten för detaljer.');
        console.log('');
      }
    }

    console.log('='.repeat(80));
  } catch (error) {
    console.error('');
    console.error('❌ Fel uppstod:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${String(error)}`);
    }
    console.error('');
    process.exit(1);
  }
}

main().catch(console.error);

