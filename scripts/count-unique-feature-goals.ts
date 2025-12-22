#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BpmnMap {
  orchestration?: { root_process?: string };
  processes?: Array<{
    id: string;
    bpmn_file: string;
    process_id: string;
    call_activities?: Array<{
      bpmn_id: string;
      name: string;
      subprocess_bpmn_file: string;
    }>;
  }>;
}

function countUniqueFeatureGoals() {
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  const bpmnMap: BpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
  const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
  const rootFile = `${rootProcess}.bpmn`;
  
  console.log('🔍 Räknar unika feature goals från bpmn-map.json...\n');
  
  // 1. Räkna unika subprocess-filer (alla filer utom root)
  const subprocessFiles = new Set<string>();
  bpmnMap.processes?.forEach(process => {
    if (process.bpmn_file !== rootFile) {
      subprocessFiles.add(process.bpmn_file);
    }
  });
  
  console.log(`📊 Unika subprocess-filer (ska ha feature goal för process-noden): ${subprocessFiles.size}`);
  subprocessFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');
  
  // 2. Räkna unika CallActivities
  // En CallActivity är unik baserat på (parentFile, elementId) eller (subprocessFile)
  // Men om samma subprocess anropas från flera ställen, ska vi ha:
  // - EN feature goal för subprocess-processen (när subprocess-filen genereras)
  // - Eventuellt instans-specifika feature goals för varje call activity-anrop
  
  const callActivitiesBySubprocess = new Map<string, Array<{
    parentFile: string;
    elementId: string;
    name: string;
  }>>();
  
  const uniqueCallActivityInstances = new Map<string, {
    parentFile: string;
    elementId: string;
    name: string;
    subprocessFile: string;
  }>();
  
  bpmnMap.processes?.forEach(process => {
    process.call_activities?.forEach(ca => {
      // Unik instans: parentFile + elementId
      const instanceKey = `${process.bpmn_file}::${ca.bpmn_id}`;
      uniqueCallActivityInstances.set(instanceKey, {
        parentFile: process.bpmn_file,
        elementId: ca.bpmn_id,
        name: ca.name,
        subprocessFile: ca.subprocess_bpmn_file
      });
      
      // Gruppera per subprocess-fil
      if (!callActivitiesBySubprocess.has(ca.subprocess_bpmn_file)) {
        callActivitiesBySubprocess.set(ca.subprocess_bpmn_file, []);
      }
      callActivitiesBySubprocess.get(ca.subprocess_bpmn_file)!.push({
        parentFile: process.bpmn_file,
        elementId: ca.bpmn_id,
        name: ca.name
      });
    });
  });
  
  console.log(`📊 Unika CallActivity-instanser (parentFile + elementId): ${uniqueCallActivityInstances.size}`);
  
  // Visa vilka subprocesser som anropas flera gånger
  const reusedSubprocesses = Array.from(callActivitiesBySubprocess.entries())
    .filter(([_, calls]) => calls.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  
  if (reusedSubprocesses.length > 0) {
    console.log(`\n🔄 Subprocesser som anropas flera gånger:`);
    reusedSubprocesses.forEach(([subprocessFile, calls]) => {
      console.log(`  ${subprocessFile}: ${calls.length} anrop`);
      calls.forEach(ca => {
        console.log(`    - ${ca.parentFile}::${ca.elementId} (${ca.name})`);
      });
    });
    console.log('');
  }
  
  // 3. Beräkna totalt antal feature goals
  // Strategi 1: EN feature goal per subprocess-fil + EN per call activity-instans
  const strategy1 = subprocessFiles.size + uniqueCallActivityInstances.size;
  
  // Strategi 2: EN feature goal per subprocess-fil + EN per unik subprocess (inte per instans)
  const uniqueSubprocessesCalled = callActivitiesBySubprocess.size;
  const strategy2 = subprocessFiles.size + uniqueSubprocessesCalled;
  
  console.log('📊 Beräkning av totalt antal feature goals:');
  console.log(`  Strategi 1 (subprocess-fil + varje call activity-instans):`);
  console.log(`    ${subprocessFiles.size} subprocess process nodes + ${uniqueCallActivityInstances.size} call activity-instanser = ${strategy1} totalt`);
  console.log(`  Strategi 2 (subprocess-fil + unik subprocess som anropas):`);
  console.log(`    ${subprocessFiles.size} subprocess process nodes + ${uniqueSubprocessesCalled} unika subprocesser som anropas = ${strategy2} totalt`);
  console.log('');
  
  // Visa fördelning
  console.log('📋 Fördelning:');
  console.log(`  Subprocess process nodes: ${subprocessFiles.size}`);
  console.log(`  Unika subprocesser som anropas: ${uniqueSubprocessesCalled}`);
  console.log(`  Call activity-instanser: ${uniqueCallActivityInstances.size}`);
  console.log(`  Subprocesser som anropas flera gånger: ${reusedSubprocesses.length}`);
  console.log('');
  
  // Fråga: Vilken strategi använder vi?
  console.log('❓ Vilken strategi använder vi?');
  console.log('  - Om vi har hierarchical naming för call activities, kan vi ha EN per instans');
  console.log('  - Om vi bara har EN per subprocess-fil, blir det färre');
  console.log('');
  
  // Visa exempel
  if (reusedSubprocesses.length > 0) {
    const example = reusedSubprocesses[0];
    console.log(`💡 Exempel: ${example[0]}`);
    console.log(`  Anropas ${example[1].length} gånger:`);
    example[1].forEach(ca => {
      console.log(`    - Från ${ca.parentFile}::${ca.elementId}`);
      console.log(`      Feature goal skulle heta: mortgage-se-${ca.parentFile.replace('.bpmn', '').replace('mortgage-se-', '')}-${ca.elementId}.html`);
    });
  }
}

countUniqueFeatureGoals();
