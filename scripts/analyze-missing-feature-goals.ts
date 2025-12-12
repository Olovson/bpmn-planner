#!/usr/bin/env npx tsx
/**
 * Analysera alla feature goals och identifiera saknade dokumentationer
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
      subprocess_bpmn_file: string;
    }>;
  }>;
}

interface FeatureGoal {
  parent_process_id: string;
  parent_alias: string;
  parent_bpmn_file: string;
  bpmn_id: string;
  name: string;
  subprocess_bpmn_file: string;
  subprocess_id: string;
  subprocess_alias: string;
}

function loadBpmnMap(): BpmnMap {
  const bpmnMapPath = path.join(process.cwd(), 'bpmn-map.json');
  const content = fs.readFileSync(bpmnMapPath, 'utf-8');
  return JSON.parse(content);
}

function getAllFeatureGoals(bpmnMap: BpmnMap): FeatureGoal[] {
  const featureGoals: FeatureGoal[] = [];

  for (const process of bpmnMap.processes) {
    for (const callActivity of process.call_activities) {
      // Hitta subprocess-processen
      const subprocessProcess = bpmnMap.processes.find(
        p => p.bpmn_file === callActivity.subprocess_bpmn_file
      );

      featureGoals.push({
        parent_process_id: process.id,
        parent_alias: process.alias,
        parent_bpmn_file: process.bpmn_file,
        bpmn_id: callActivity.bpmn_id,
        name: callActivity.name,
        subprocess_bpmn_file: callActivity.subprocess_bpmn_file,
        subprocess_id: subprocessProcess?.id || callActivity.subprocess_bpmn_file.replace('.bpmn', ''),
        subprocess_alias: subprocessProcess?.alias || callActivity.name,
      });
    }
  }

  return featureGoals;
}

function getExistingDocs(): Set<string> {
  const docsDir = path.join(process.cwd(), 'public/local-content/feature-goals');
  if (!fs.existsSync(docsDir)) {
    return new Set();
  }

  const files = fs.readdirSync(docsDir);
  const docNames = new Set<string>();

  for (const file of files) {
    if (file.endsWith('-v2.html')) {
      // Ta bort -v2.html suffix
      const baseName = file.replace(/-v2\.html$/, '');
      docNames.add(baseName);
      
      // Lägg också till utan mortgage-se- prefix för matchning
      const shortName = baseName.replace(/^mortgage-se-/, '');
      if (shortName !== baseName) {
        docNames.add(shortName);
      }
    }
  }

  return docNames;
}

function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function checkIfDocExists(
  featureGoal: FeatureGoal,
  existingDocs: Set<string>
): { exists: boolean; matchedFile?: string; expectedFiles: string[] } {
  const parentBase = featureGoal.parent_bpmn_file.replace('.bpmn', '');
  const subprocessBase = featureGoal.subprocess_bpmn_file.replace('.bpmn', '');
  const elementId = featureGoal.bpmn_id;

  // Möjliga filnamn som appen kan leta efter
  const expectedFiles = [
    // Strategy 1: parent-elementId
    `${parentBase}-${elementId}`,
    // Strategy 2: subprocess file name
    subprocessBase,
    // Strategy 3: parent name-elementId (kortform)
    `${parentBase.split('-').pop()}-${normalizeForMatching(featureGoal.name)}`,
  ];

  // Normalisera för matchning
  const normalizedExpected = expectedFiles.map(f => normalizeForMatching(f));
  const normalizedExisting = Array.from(existingDocs).map(d => normalizeForMatching(d));

  // Kolla om någon matchar
  for (const expected of normalizedExpected) {
    for (const existing of normalizedExisting) {
      if (expected === existing || existing.includes(expected) || expected.includes(existing)) {
        // Hitta originalfilnamnet
        const originalFile = Array.from(existingDocs).find(d => 
          normalizeForMatching(d) === existing
        );
        return { exists: true, matchedFile: originalFile, expectedFiles };
      }
    }
  }

  return { exists: false, expectedFiles };
}

function main() {
  console.log('================================================================================');
  console.log('ANALYS: Saknade Feature Goal Dokumentationer');
  console.log('================================================================================\n');

  const bpmnMap = loadBpmnMap();
  const featureGoals = getAllFeatureGoals(bpmnMap);
  const existingDocs = getExistingDocs();

  console.log(`📊 Totalt antal feature goals: ${featureGoals.length}`);
  console.log(`📄 Befintliga dokumentationer: ${existingDocs.size}\n`);

  const missing: FeatureGoal[] = [];
  const found: Array<{ featureGoal: FeatureGoal; matchedFile: string }> = [];

  for (const fg of featureGoals) {
    const check = checkIfDocExists(fg, existingDocs);
    if (check.exists && check.matchedFile) {
      found.push({ featureGoal: fg, matchedFile: check.matchedFile });
    } else {
      missing.push(fg);
    }
  }

  console.log('================================================================================');
  console.log('✅ HITTADE DOKUMENTATIONER');
  console.log('================================================================================\n');
  
  for (const { featureGoal, matchedFile } of found) {
    console.log(`✅ ${featureGoal.parent_alias} → ${featureGoal.name}`);
    console.log(`   Matchad fil: ${matchedFile}-v2.html`);
    console.log(`   Subprocess: ${featureGoal.subprocess_bpmn_file}\n`);
  }

  console.log('================================================================================');
  console.log('❌ SAKNADE DOKUMENTATIONER');
  console.log('================================================================================\n');

  if (missing.length === 0) {
    console.log('✅ Alla feature goals har dokumentation!\n');
  } else {
    for (const fg of missing) {
      console.log(`❌ ${fg.parent_alias} → ${fg.name}`);
      console.log(`   Parent: ${fg.parent_bpmn_file}`);
      console.log(`   Element ID: ${fg.bpmn_id}`);
      console.log(`   Subprocess: ${fg.subprocess_bpmn_file}`);
      console.log(`   Förväntade filnamn:`);
      const check = checkIfDocExists(fg, existingDocs);
      for (const expected of check.expectedFiles) {
        console.log(`     - ${expected}-v2.html`);
      }
      console.log(`   App-namn: ${fg.parent_alias} - ${fg.name}`);
      console.log('');
    }
  }

  // Gruppera efter subprocess för att se om samma subprocess saknas från flera ställen
  const missingBySubprocess = new Map<string, FeatureGoal[]>();
  for (const fg of missing) {
    const key = fg.subprocess_bpmn_file;
    if (!missingBySubprocess.has(key)) {
      missingBySubprocess.set(key, []);
    }
    missingBySubprocess.get(key)!.push(fg);
  }

  if (missingBySubprocess.size > 0) {
    console.log('================================================================================');
    console.log('📋 SAKNADE DOKUMENTATIONER GRUPPERADE EFTER SUBPROCESS');
    console.log('================================================================================\n');

    for (const [subprocessFile, fgs] of missingBySubprocess.entries()) {
      console.log(`📄 ${subprocessFile}`);
      console.log(`   Anropas från ${fgs.length} ställe(n):`);
      for (const fg of fgs) {
        console.log(`     - ${fg.parent_alias} (${fg.bpmn_id})`);
      }
      console.log(`   Rekommenderat filnamn: ${subprocessFile.replace('.bpmn', '')}-v2.html`);
      console.log('');
    }
  }

  console.log('================================================================================');
  console.log('📊 SAMMANFATTNING');
  console.log('================================================================================\n');
  console.log(`✅ Hittade dokumentationer: ${found.length}`);
  console.log(`❌ Saknade dokumentationer: ${missing.length}`);
  console.log(`📄 Unika saknade subprocesser: ${missingBySubprocess.size}\n`);

  // Skriv rapport
  const reportPath = path.join(process.cwd(), 'docs/feature-goals/MISSING_FEATURE_GOALS_REPORT.md');
  let report = `# Saknade Feature Goal Dokumentationer\n\n`;
  report += `**Genererad:** ${new Date().toISOString()}\n\n`;
  report += `## Sammanfattning\n\n`;
  report += `- ✅ Hittade dokumentationer: ${found.length}\n`;
  report += `- ❌ Saknade dokumentationer: ${missing.length}\n`;
  report += `- 📄 Unika saknade subprocesser: ${missingBySubprocess.size}\n\n`;

  if (missing.length > 0) {
    report += `## Saknade Dokumentationer\n\n`;
    for (const [subprocessFile, fgs] of missingBySubprocess.entries()) {
      report += `### ${subprocessFile}\n\n`;
      report += `**Anropas från:**\n`;
      for (const fg of fgs) {
        report += `- ${fg.parent_alias} (${fg.bpmn_id}) → ${fg.name}\n`;
      }
      report += `\n**Rekommenderat filnamn:** \`${subprocessFile.replace('.bpmn', '')}-v2.html\`\n\n`;
      report += `**App-namn:** ${fgs[0].parent_alias} - ${fgs[0].name}\n\n`;
    }
  }

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Rapport skriven till: ${reportPath}\n`);
}

main();

