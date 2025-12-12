#!/usr/bin/env npx tsx
/**
 * DÖP OM Feature Goal Filer till Hierarkiska Namn
 * 
 * Detta script döper om befintliga feature goal filer till hierarkiska namn
 * som matchar Jira-namnen (t.ex. "Application - Internal data gathering").
 * 
 * Exempel:
 * - mortgage-se-internal-data-gathering-v2.html
 *   → mortgage-se-application-internal-data-gathering-v2.html
 * 
 * Scriptet:
 * 1. Läser bpmn-map.json för att hitta alla call activities och deras parent-processer
 * 2. Identifierar befintliga filer som behöver döpas om
 * 3. Döper om filerna till hierarkiska namn
 * 4. Skapar en backup av originalfilerna
 */

import * as fs from 'fs';
import * as path from 'path';

interface BpmnMap {
  processes: Array<{
    id: string;
    alias: string;
    bpmn_file: string;
    call_activities: Array<{
      bpmn_id: string;
      name: string;
      called_element: string | null;
      subprocess_bpmn_file: string;
    }>;
  }>;
}

interface CallActivity {
  bpmn_id: string;
  name: string;
  called_element: string | null;
  subprocess_bpmn_file: string;
  parent_bpmn_file: string;
  parent_alias: string;
}

function loadBpmnMap(): BpmnMap {
  const bpmnMapPath = path.join(process.cwd(), 'bpmn-map.json');
  const content = fs.readFileSync(bpmnMapPath, 'utf-8');
  return JSON.parse(content);
}

function getAllCallActivities(bpmnMap: BpmnMap): CallActivity[] {
  const callActivities: CallActivity[] = [];

  for (const process of bpmnMap.processes) {
    for (const callActivity of process.call_activities) {
      callActivities.push({
        bpmn_id: callActivity.bpmn_id,
        name: callActivity.name,
        called_element: callActivity.called_element,
        subprocess_bpmn_file: callActivity.subprocess_bpmn_file,
        parent_bpmn_file: process.bpmn_file,
        parent_alias: process.alias,
      });
    }
  }

  return callActivities;
}

function sanitizeElementId(elementId: string): string {
  return elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getBaseName(bpmnFile: string): string {
  return bpmnFile.replace('.bpmn', '');
}

/**
 * Generera hierarkiskt filnamn (matchar Jira-namnen)
 */
function getHierarchicalFilename(
  parentBpmnFile: string,
  elementId: string,
  templateVersion: 'v1' | 'v2' = 'v2'
): string {
  const parentBaseName = getBaseName(parentBpmnFile);
  const sanitizedId = sanitizeElementId(elementId);
  const versionSuffix = templateVersion ? `-${templateVersion}` : '';
  
  const normalizedParent = parentBaseName.toLowerCase();
  const normalizedElementId = sanitizedId.toLowerCase();
  
  // Undvik upprepning: om elementId redan ingår i parentBaseName, använd bara parentBaseName
  if (normalizedParent.endsWith(`-${normalizedElementId}`) || 
      normalizedParent.endsWith(normalizedElementId) ||
      normalizedParent.includes(`-${normalizedElementId}-`) ||
      normalizedParent.includes(`-${normalizedElementId}`)) {
    return `${parentBaseName}${versionSuffix}.html`;
  }
  
  // Använd hierarkiskt format: parent-elementId
  return `${parentBaseName}-${sanitizedId}${versionSuffix}.html`;
}

/**
 * Generera legacy filnamn (för bakåtkompatibilitet)
 */
function getLegacyFilename(
  subprocessBpmnFile: string,
  elementId: string,
  templateVersion: 'v1' | 'v2' = 'v2'
): string {
  const baseName = getBaseName(subprocessBpmnFile);
  const sanitizedId = sanitizeElementId(elementId);
  const versionSuffix = templateVersion ? `-${templateVersion}` : '';
  
  const normalizedBaseName = baseName.toLowerCase();
  const normalizedElementId = sanitizedId.toLowerCase();
  
  const baseNameEndsWithElementId = normalizedBaseName.endsWith(`-${normalizedElementId}`) || 
                                     normalizedBaseName.endsWith(normalizedElementId);
  
  const baseNameContainsElementId = normalizedBaseName.includes(`-${normalizedElementId}-`) ||
                                    normalizedBaseName.includes(`-${normalizedElementId}`);
  
  if (baseNameEndsWithElementId || baseNameContainsElementId) {
    return `${baseName}${versionSuffix}.html`;
  }
  
  return `${baseName}-${sanitizedId}${versionSuffix}.html`;
}

function main() {
  console.log('================================================================================');
  console.log('DÖP OM Feature Goal Filer till Hierarkiska Namn');
  console.log('================================================================================\n');

  const bpmnMap = loadBpmnMap();
  const callActivities = getAllCallActivities(bpmnMap);
  const docsDir = path.join(process.cwd(), 'public/local-content/feature-goals');
  const backupDir = path.join(process.cwd(), 'public/local-content/feature-goals-backup');

  // Skapa backup-mapp om den inte finns
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Skapade backup-mapp: ${backupDir}\n`);
  }

  console.log(`📊 Totalt antal call activities: ${callActivities.length}`);
  console.log(`📁 Dokumentationsmapp: ${docsDir}\n`);

  // Identifiera återkommande feature goals
  const subprocessToCalls = new Map<string, CallActivity[]>();
  for (const ca of callActivities) {
    const key = ca.subprocess_bpmn_file;
    if (!subprocessToCalls.has(key)) {
      subprocessToCalls.set(key, []);
    }
    subprocessToCalls.get(key)!.push(ca);
  }
  const reusedSubprocesses = new Set(
    Array.from(subprocessToCalls.entries())
      .filter(([_, calls]) => calls.length > 1)
      .map(([subprocess, _]) => subprocess)
  );

  if (reusedSubprocesses.size > 0) {
    console.log(`ℹ️  ${reusedSubprocesses.size} återkommande feature goals hittades (behåller nuvarande namn):`);
    for (const subprocess of reusedSubprocesses) {
      const calls = subprocessToCalls.get(subprocess)!;
      console.log(`   - ${subprocess} (anropas från ${calls.length} ställen)`);
    }
    console.log();
  }

  const renameOperations: Array<{
    oldFilename: string;
    newFilename: string;
    callActivity: CallActivity;
  }> = [];

  // Identifiera filer som behöver döpas om
  // VIKTIGT: Döp INTE om återkommande feature goals - de ska behålla gemensamt namn
  for (const ca of callActivities) {
    // Hoppa över återkommande feature goals
    if (reusedSubprocesses.has(ca.subprocess_bpmn_file)) {
      continue;
    }
    
    const legacyFilename = getLegacyFilename(ca.subprocess_bpmn_file, ca.bpmn_id, 'v2');
    const hierarchicalFilename = getHierarchicalFilename(ca.parent_bpmn_file, ca.bpmn_id, 'v2');
    
    const legacyPath = path.join(docsDir, legacyFilename);
    const hierarchicalPath = path.join(docsDir, hierarchicalFilename);
    
    // Om legacy-filen finns men hierarkisk fil inte finns, planera omdöpning
    if (fs.existsSync(legacyPath) && !fs.existsSync(hierarchicalPath)) {
      // Kontrollera att det inte är samma fil (t.ex. om parent och subprocess är samma)
      if (legacyFilename !== hierarchicalFilename) {
        // Kontrollera att vi inte redan har planerat att döpa om denna fil
        const alreadyPlanned = renameOperations.some(op => op.oldFilename === legacyFilename);
        if (!alreadyPlanned) {
          renameOperations.push({
            oldFilename: legacyFilename,
            newFilename: hierarchicalFilename,
            callActivity: ca,
          });
        }
      }
    }
  }

  if (renameOperations.length === 0) {
    console.log('✅ Inga filer behöver döpas om!\n');
    return;
  }

  console.log(`📋 ${renameOperations.length} filer kommer att döpas om:\n`);
  for (const op of renameOperations) {
    console.log(`   ${op.oldFilename}`);
    console.log(`   → ${op.newFilename}`);
    console.log(`   (${op.callActivity.parent_alias} → ${op.callActivity.name})\n`);
  }

  // Bekräfta innan omdöpning
  console.log('⚠️  Detta kommer att:');
  console.log('   1. Skapa backup av originalfiler i:', backupDir);
  console.log('   2. Döpa om filerna till hierarkiska namn\n');
  
  // För dry-run: bara visa vad som skulle hända
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('🔍 DRY RUN: Inga filer kommer att ändras\n');
    return;
  }

  // Utför omdöpning
  let successCount = 0;
  let errorCount = 0;

  for (const op of renameOperations) {
    try {
      const oldPath = path.join(docsDir, op.oldFilename);
      const newPath = path.join(docsDir, op.newFilename);
      const backupPath = path.join(backupDir, op.oldFilename);

      // Skapa backup
      fs.copyFileSync(oldPath, backupPath);
      
      // Döp om filen
      fs.renameSync(oldPath, newPath);
      
      console.log(`✅ ${op.oldFilename} → ${op.newFilename}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Fel vid omdöpning av ${op.oldFilename}:`, error instanceof Error ? error.message : String(error));
      errorCount++;
    }
  }

  console.log('\n================================================================================');
  console.log('📊 SAMMANFATTNING');
  console.log('================================================================================\n');
  console.log(`✅ Lyckade omdöpningar: ${successCount}`);
  console.log(`❌ Fel: ${errorCount}`);
  console.log(`📁 Backup-mapp: ${backupDir}\n`);
}

main();

