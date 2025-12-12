#!/usr/bin/env npx tsx
/**
 * VALIDERA Feature Goal Dokumentation - Direkt validering från bpmn-map.json
 * 
 * Detta script använder bpmn-map.json direkt för att validera dokumentation.
 * Ingen komplex matchningslogik - vi vet redan exakt vilka filer som ska finnas!
 * 
 * För varje call_activity i bpmn-map.json:
 * 1. Ta subprocess_bpmn_file (t.ex. "mortgage-se-object.bpmn")
 * 2. Generera förväntat filnamn med getFeatureGoalDocFileKey-logik
 * 3. Kontrollera om filen finns
 * 4. Verifiera att filen refererar till rätt BPMN-fil
 * 
 * Detta är en KRITISK validering som måste köras innan dokumentation anses komplett.
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

/**
 * Generera förväntat filnamn för feature goal dokumentation
 * Använder EXAKT SAMMA logik som getFeatureGoalDocFileKey i nodeArtifactPaths.ts
 * 
 * VIKTIGT: Använder hierarkiska filnamn (parent-elementId) för att matcha Jira-namnen.
 * För återkommande feature goals kan samma subprocess anropas med olika elementId.
 * 
 * Valideringen accepterar antingen:
 * 1. Hierarkiskt filnamn (parent-elementId-v2.html) - PREFERERAT
 * 2. Legacy filnamn (subprocess-elementId-v2.html) - för bakåtkompatibilitet
 * 3. Basfilnamn (subprocess-v2.html) - för återkommande feature goals
 */
function getExpectedFeatureGoalFilename(
  subprocessBpmnFile: string,
  elementId: string,
  templateVersion: 'v1' | 'v2' = 'v2',
  parentBpmnFile?: string
): string[] {
  const sanitizedId = elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const versionSuffix = templateVersion ? `-${templateVersion}` : '';
  const expectedFilenames: string[] = [];
  
  // PRIORITET 1: Hierarkiskt filnamn (parent-elementId) - matchar Jira-namnen
  if (parentBpmnFile) {
    const parentBaseName = parentBpmnFile.replace('.bpmn', '');
    const normalizedParent = parentBaseName.toLowerCase();
    const normalizedElementId = sanitizedId.toLowerCase();
    
    // Undvik upprepning: om elementId redan ingår i parentBaseName, använd bara parentBaseName
    if (normalizedParent.endsWith(`-${normalizedElementId}`) || 
        normalizedParent.endsWith(normalizedElementId) ||
        normalizedParent.includes(`-${normalizedElementId}-`) ||
        normalizedParent.includes(`-${normalizedElementId}`)) {
      expectedFilenames.push(`${parentBaseName}${versionSuffix}.html`);
    } else {
      // Använd hierarkiskt format: parent-elementId
      expectedFilenames.push(`${parentBaseName}-${sanitizedId}${versionSuffix}.html`);
    }
  }
  
  // PRIORITET 2: Legacy filnamn (subprocess-elementId) - för bakåtkompatibilitet
  const baseName = subprocessBpmnFile.replace('.bpmn', '');
  const normalizedBaseName = baseName.toLowerCase();
  const normalizedElementId = sanitizedId.toLowerCase();
  
  const baseNameEndsWithElementId = normalizedBaseName.endsWith(`-${normalizedElementId}`) || 
                                     normalizedBaseName.endsWith(normalizedElementId);
  
  const baseNameContainsElementId = normalizedBaseName.includes(`-${normalizedElementId}-`) ||
                                    normalizedBaseName.includes(`-${normalizedElementId}`);
  
  if (baseNameEndsWithElementId || baseNameContainsElementId) {
    // ElementId ingår redan i baseName, använd bara baseName
    expectedFilenames.push(`${baseName}${versionSuffix}.html`);
  } else {
    // ElementId ingår inte, använd baseName-elementId
    expectedFilenames.push(`${baseName}-${sanitizedId}${versionSuffix}.html`);
  }
  
  // PRIORITET 3: Basfilnamn (subprocess-v2.html) - för återkommande feature goals
  // Detta är en fallback för när vi har en gemensam fil för alla kontexter
  expectedFilenames.push(`${baseName}${versionSuffix}.html`);
  
  return expectedFilenames;
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

function checkFileExists(filepath: string): boolean {
  return fs.existsSync(filepath);
}

function verifyFileContent(filepath: string, expectedBpmnFile: string): { valid: boolean; warning?: string } {
  try {
    const htmlContent = fs.readFileSync(filepath, 'utf-8');
    const subprocessBase = expectedBpmnFile.replace('.bpmn', '');
    
    // Kontrollera att HTML-filen refererar till rätt BPMN-fil
    const hasCorrectReference = htmlContent.includes(subprocessBase) || 
                                htmlContent.includes(expectedBpmnFile) ||
                                htmlContent.includes(`bpmn/${expectedBpmnFile}`) ||
                                htmlContent.includes(`#/bpmn/${expectedBpmnFile}`);
    
    if (!hasCorrectReference) {
      return {
        valid: false,
        warning: `Dokumentationen verkar inte referera till rätt BPMN-fil (${expectedBpmnFile})`,
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      warning: `Kunde inte läsa fil: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function main() {
  console.log('================================================================================');
  console.log('VALIDERING: Feature Goal Dokumentation');
  console.log('================================================================================');
  console.log('Använder bpmn-map.json direkt - ingen komplex matchningslogik!\n');

  const bpmnMap = loadBpmnMap();
  const callActivities = getAllCallActivities(bpmnMap);
  const docsDir = path.join(process.cwd(), 'public/local-content/feature-goals');

  console.log(`📊 Totalt antal call activities (feature goals): ${callActivities.length}`);
  console.log(`📁 Dokumentationsmapp: ${docsDir}\n`);

  const validated: Array<{ callActivity: CallActivity; filename: string }> = [];
  const missing: CallActivity[] = [];
  const warnings: Array<{ callActivity: CallActivity; filename: string; warning: string }> = [];

  // Validera varje call activity
  for (const ca of callActivities) {
    // Generera förväntade filnamn med SAMMA logik som appen
    // Använder hierarkiska filnamn (parent-elementId) för att matcha Jira-namnen
    // För återkommande feature goals kan vi ha flera möjliga filnamn
    const expectedFilenames = getExpectedFeatureGoalFilename(
      ca.subprocess_bpmn_file,
      ca.bpmn_id,
      'v2',
      ca.parent_bpmn_file // Använd parent för hierarkiska filnamn
    );
    
    // Hitta första filen som finns
    let foundFile: { filename: string; filepath: string } | null = null;
    for (const expectedFilename of expectedFilenames) {
      const filepath = path.join(docsDir, expectedFilename);
      if (checkFileExists(filepath)) {
        foundFile = { filename: expectedFilename, filepath };
        break;
      }
    }

    if (!foundFile) {
      missing.push(ca);
    } else {
      // Verifiera att filen refererar till rätt BPMN-fil
      const verification = verifyFileContent(foundFile.filepath, ca.subprocess_bpmn_file);
      
      if (verification.valid) {
        validated.push({ callActivity: ca, filename: foundFile.filename });
      } else {
        warnings.push({
          callActivity: ca,
          filename: foundFile.filename,
          warning: verification.warning || 'Okänt valideringsfel',
        });
      }
    }
  }

  // Gruppera saknade efter subprocess för att se unika saknade
  const missingBySubprocess = new Map<string, CallActivity[]>();
  for (const ca of missing) {
    const key = ca.subprocess_bpmn_file;
    if (!missingBySubprocess.has(key)) {
      missingBySubprocess.set(key, []);
    }
    missingBySubprocess.get(key)!.push(ca);
  }

  // Rapportera resultat
  console.log('================================================================================');
  console.log('✅ VALIDERADE DOKUMENTATIONER');
  console.log('================================================================================\n');
  
  if (validated.length === 0) {
    console.log('⚠️  Inga dokumentationer validerade!\n');
  } else {
    console.log(`✅ ${validated.length} feature goals har dokumentation:\n`);
    for (const { callActivity, filename } of validated) {
      console.log(`   ✅ ${callActivity.parent_alias} → ${callActivity.name}`);
      console.log(`      Fil: ${filename}`);
      console.log(`      Subprocess: ${callActivity.subprocess_bpmn_file}\n`);
    }
  }

  if (warnings.length > 0) {
    console.log('================================================================================');
    console.log('⚠️  VARNINGAR');
    console.log('================================================================================\n');
    for (const { callActivity, filename, warning } of warnings) {
      console.log(`   ⚠️  ${callActivity.parent_alias} → ${callActivity.name}`);
      console.log(`      Fil: ${filename}`);
      console.log(`      Varning: ${warning}\n`);
    }
  }

  if (missing.length > 0) {
    console.log('================================================================================');
    console.log('❌ SAKNADE DOKUMENTATIONER');
    console.log('================================================================================\n');
    
    console.log(`❌ ${missing.length} feature goals saknar dokumentation:\n`);
    
    for (const ca of missing) {
      const expectedFilenames = getExpectedFeatureGoalFilename(
        ca.subprocess_bpmn_file,
        ca.bpmn_id,
        'v2',
        ca.parent_bpmn_file // Använd parent för hierarkiska filnamn
      );
      
      console.log(`   ❌ ${ca.parent_alias} → ${ca.name}`);
      console.log(`      Parent: ${ca.parent_bpmn_file}`);
      console.log(`      Element ID: ${ca.bpmn_id}`);
      console.log(`      Subprocess: ${ca.subprocess_bpmn_file}`);
      console.log(`      Förväntade filnamn:`);
      for (const filename of expectedFilenames) {
        console.log(`        - ${filename}`);
      }
      console.log(`      App-namn: ${ca.parent_alias} - ${ca.name}\n`);
    }

    if (missingBySubprocess.size > 0) {
      console.log('================================================================================');
      console.log('📋 SAKNADE DOKUMENTATIONER GRUPPERADE EFTER SUBPROCESS');
      console.log('================================================================================\n');

      for (const [subprocessFile, cas] of missingBySubprocess.entries()) {
        // För återkommande feature goals: rekommendera basfilnamn (subprocess-v2.html)
        const subprocessBase = subprocessFile.replace('.bpmn', '');
        const recommendedFilename = `${subprocessBase}-v2.html`;
        
        console.log(`📄 ${subprocessFile}`);
        console.log(`   Anropas från ${cas.length} ställe(n):`);
        for (const ca of cas) {
          console.log(`     - ${ca.parent_alias} (${ca.bpmn_id})`);
        }
        console.log(`   Rekommenderat filnamn: ${recommendedFilename}`);
        console.log(`   (För återkommande feature goals: en gemensam fil för alla kontexter)\n`);
      }
    }
  }

  console.log('================================================================================');
  console.log('📊 SAMMANFATTNING');
  console.log('================================================================================\n');
  console.log(`✅ Validerade dokumentationer: ${validated.length}`);
  console.log(`⚠️  Varningar: ${warnings.length}`);
  console.log(`❌ Saknade dokumentationer: ${missing.length}`);
  console.log(`📄 Unika saknade subprocesser: ${missingBySubprocess.size}\n`);

  // Exit code baserat på resultat
  if (missing.length > 0) {
    console.log('❌ VALIDERING MISSLYCKAD: Saknade dokumentationer måste skapas!\n');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('⚠️  VALIDERING KLAR MED VARNINGAR: Kontrollera varningar ovan!\n');
    process.exit(0);
  } else {
    console.log('✅ VALIDERING LYCKAD: Alla feature goals har dokumentation!\n');
    process.exit(0);
  }
}

main();
