#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Analysera återkommande Feature Goals
 * 
 * Detta script identifierar feature goals som anropas från flera ställen
 * och genererar en rapport över alla anropningskontexter.
 * 
 * Usage:
 *   npx tsx scripts/analyze-reused-feature-goals.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BPMN_MAP_PATH = path.join(__dirname, '../bpmn-map.json');
const OUTPUT_FILE = path.join(__dirname, '../docs/feature-goals/REUSED_FEATURE_GOALS_ANALYSIS.md');

interface CallActivity {
  bpmn_id: string;
  name: string;
  called_element?: string | null;
  subprocess_bpmn_file?: string | null;
}

interface Process {
  id: string;
  alias: string;
  bpmn_file: string;
  process_id: string;
  description: string;
  call_activities: CallActivity[];
}

interface BpmnMap {
  processes: Process[];
}

interface ReusedFeatureGoal {
  subprocessFile: string;
  processId: string;
  callActivities: Array<{
    bpmnId: string;
    name: string;
    parentProcess: string;
    parentFile: string;
    calledElement?: string | null;
  }>;
}

function analyzeReusedFeatureGoals(): ReusedFeatureGoal[] {
  const bpmnMapContent = fs.readFileSync(BPMN_MAP_PATH, 'utf-8');
  const bpmnMap: BpmnMap = JSON.parse(bpmnMapContent);

  // Indexera alla call activities per subprocess file
  const subprocessIndex = new Map<string, ReusedFeatureGoal>();

  for (const process of bpmnMap.processes) {
    for (const callActivity of process.call_activities) {
      const subprocessFile = callActivity.subprocess_bpmn_file;
      if (!subprocessFile) continue;

      // Hitta processen som motsvarar subprocess file
      const subprocessProcess = bpmnMap.processes.find(
        p => p.bpmn_file === subprocessFile
      );

      if (!subprocessProcess) continue;

      const key = subprocessFile;
      if (!subprocessIndex.has(key)) {
        subprocessIndex.set(key, {
          subprocessFile,
          processId: subprocessProcess.process_id,
          callActivities: [],
        });
      }

      const reused = subprocessIndex.get(key)!;
      reused.callActivities.push({
        bpmnId: callActivity.bpmn_id,
        name: callActivity.name,
        parentProcess: process.process_id,
        parentFile: process.bpmn_file,
        calledElement: callActivity.called_element,
      });
    }
  }

  // Filtrera bort feature goals som bara anropas en gång
  const reused = Array.from(subprocessIndex.values()).filter(
    r => r.callActivities.length > 1
  );

  // Sortera efter antal anrop (flest först)
  reused.sort((a, b) => b.callActivities.length - a.callActivities.length);

  return reused;
}

function generateMarkdownReport(reused: ReusedFeatureGoal[]): string {
  const timestamp = new Date().toISOString();
  
  let markdown = `# Analys av återkommande Feature Goals\n\n`;
  markdown += `**Genererad:** ${timestamp}\n\n`;
  markdown += `**Antal återkommande feature goals:** ${reused.length}\n\n`;
  markdown += `---\n\n`;

  if (reused.length === 0) {
    markdown += `Inga återkommande feature goals hittades.\n`;
    return markdown;
  }

  markdown += `## Sammanfattning\n\n`;
  markdown += `Följande feature goals anropas från flera ställen:\n\n`;
  
  for (const featureGoal of reused) {
    markdown += `- **${featureGoal.processId}** (${featureGoal.subprocessFile}): ${featureGoal.callActivities.length} anrop\n`;
  }

  markdown += `\n---\n\n`;

  markdown += `## Detaljerad analys\n\n`;

  for (const featureGoal of reused) {
    markdown += `### ${featureGoal.processId}\n\n`;
    markdown += `**BPMN-fil:** \`${featureGoal.subprocessFile}\`\n\n`;
    markdown += `**Antal anrop:** ${featureGoal.callActivities.length}\n\n`;
    markdown += `**Anropningskontexter:**\n\n`;

    for (const callActivity of featureGoal.callActivities) {
      markdown += `1. **${callActivity.name}** (\`${callActivity.bpmnId}\`)\n`;
      markdown += `   - **Anropas från:** ${callActivity.parentProcess} (\`${callActivity.parentFile}\`)\n`;
      if (callActivity.calledElement) {
        markdown += `   - **Called element:** \`${callActivity.calledElement}\`\n`;
      }
      markdown += `\n`;
    }

    markdown += `**Rekommendation:**\n`;
    markdown += `- Dokumentera generell funktionalitet i huvuddokumentationen\n`;
    markdown += `- Lägg till "Anropningskontexter" sektion som listar alla ${featureGoal.callActivities.length} anropningsställen\n`;
    markdown += `- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)\n`;
    markdown += `- Uppdatera Input/Output sektioner med kontextspecifika krav\n\n`;
    markdown += `---\n\n`;
  }

  return markdown;
}

function main() {
  console.log('Analyserar återkommande feature goals...\n');

  const reused = analyzeReusedFeatureGoals();

  console.log(`Hittade ${reused.length} återkommande feature goals:\n`);
  for (const featureGoal of reused) {
    console.log(`  - ${featureGoal.processId}: ${featureGoal.callActivities.length} anrop`);
    for (const ca of featureGoal.callActivities) {
      console.log(`    • ${ca.name} (${ca.bpmnId}) från ${ca.parentProcess}`);
    }
    console.log('');
  }

  const markdown = generateMarkdownReport(reused);
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');

  console.log(`\nRapport genererad: ${OUTPUT_FILE}`);
}

main();

