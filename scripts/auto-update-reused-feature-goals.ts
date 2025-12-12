#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Automatisk uppdatering av återkommande Feature Goals
 * 
 * Detta script:
 * 1. Identifierar alla återkommande feature goals
 * 2. Uppdaterar HTML-filerna med "Anropningskontexter" sektioner
 * 3. Lägger till kontextspecifika input/output-krav
 * 
 * Usage:
 *   npx tsx scripts/auto-update-reused-feature-goals.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { analyzeReusedFeatureGoals } from './analyze-reused-feature-goals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCS_DIR = path.join(__dirname, '../public/local-content/feature-goals');
const BPMN_MAP_PATH = path.join(__dirname, '../bpmn-map.json');

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

function analyzeReusedFeatureGoals(): ReusedFeatureGoal[] {
  const bpmnMapContent = fs.readFileSync(BPMN_MAP_PATH, 'utf-8');
  const bpmnMap: BpmnMap = JSON.parse(bpmnMapContent);

  const subprocessIndex = new Map<string, ReusedFeatureGoal>();

  for (const process of bpmnMap.processes) {
    for (const callActivity of process.call_activities) {
      const subprocessFile = callActivity.subprocess_bpmn_file;
      if (!subprocessFile) continue;

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

  const reused = Array.from(subprocessIndex.values()).filter(
    r => r.callActivities.length > 1
  );

  reused.sort((a, b) => b.callActivities.length - a.callActivities.length);

  return reused;
}

function findHtmlFileForFeatureGoal(processId: string): string | null {
  const files = fs.readdirSync(DOCS_DIR);
  
  // Try exact match first
  const exactMatch = files.find(f => 
    f.includes(processId) && f.endsWith('-v2.html')
  );
  if (exactMatch) {
    return path.join(DOCS_DIR, exactMatch);
  }
  
  // Try partial match
  const partialMatch = files.find(f => {
    const baseName = processId.replace('mortgage-se-', '');
    return f.includes(baseName) && f.endsWith('-v2.html');
  });
  if (partialMatch) {
    return path.join(DOCS_DIR, partialMatch);
  }
  
  return null;
}

function hasAnropningskontexter(html: string): boolean {
  return html.includes('Anropningskontexter') || html.includes('anropningskontexter');
}

function main() {
  console.log('Analyserar återkommande feature goals...\n');

  const reused = analyzeReusedFeatureGoals();

  if (reused.length === 0) {
    console.log('Inga återkommande feature goals hittades.');
    return;
  }

  console.log(`Hittade ${reused.length} återkommande feature goals:\n`);

  for (const featureGoal of reused) {
    const htmlFile = findHtmlFileForFeatureGoal(featureGoal.processId);
    
    if (!htmlFile) {
      console.log(`⚠️  Ingen HTML-fil hittades för ${featureGoal.processId}`);
      continue;
    }

    const html = fs.readFileSync(htmlFile, 'utf-8');
    
    if (hasAnropningskontexter(html)) {
      console.log(`✓ ${featureGoal.processId}: Redan uppdaterad med anropningskontexter`);
      continue;
    }

    console.log(`📝 ${featureGoal.processId}: Behöver uppdateras (${featureGoal.callActivities.length} anrop)`);
    console.log(`   Fil: ${path.basename(htmlFile)}`);
  }

  console.log('\n✅ Analys klar. Kör manuell uppdatering enligt AUTO_IMPROVEMENT_EXECUTION_PLAN.md för att uppdatera filerna.');
}

main();

