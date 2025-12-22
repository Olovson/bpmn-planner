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

function analyzeFeatureGoals() {
  console.log('🔍 Analyserar Feature Goals från bpmn-map.json...\n');
  
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  const bpmnMap: BpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
  const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
  const rootFile = `${rootProcess}.bpmn`;
  
  // 1. Räkna subprocess process nodes (alla filer utom root)
  const subprocessFiles = new Set<string>();
  bpmnMap.processes?.forEach(process => {
    if (process.bpmn_file !== rootFile) {
      subprocessFiles.add(process.bpmn_file);
    }
  });
  
  const subprocessProcessNodes = subprocessFiles.size;
  
  // 2. Räkna call activities från subprocess-filer (UTAN root)
  const callActivitiesFromSubprocesses = new Map<string, string>(); // key: "file::bpmn_id"
  bpmnMap.processes?.forEach(process => {
    if (process.bpmn_file === rootFile) {
      return; // Hoppa över root
    }
    process.call_activities?.forEach(ca => {
      const key = `${process.bpmn_file}::${ca.bpmn_id}`;
      callActivitiesFromSubprocesses.set(key, ca.name);
    });
  });
  
  // 3. Räkna call activities från root-filen
  const callActivitiesFromRoot = new Map<string, string>(); // key: "file::bpmn_id"
  bpmnMap.processes?.forEach(process => {
    if (process.bpmn_file === rootFile) {
      process.call_activities?.forEach(ca => {
        const key = `${process.bpmn_file}::${ca.bpmn_id}`;
        callActivitiesFromRoot.set(key, ca.name);
      });
    }
  });
  
  // 4. Totalt antal Feature Goals
  const totalFeatureGoals = subprocessProcessNodes + callActivitiesFromSubprocesses.size + callActivitiesFromRoot.size;
  
  console.log('📊 RESULTAT:\n');
  console.log(`1. Subprocess process nodes: ${subprocessProcessNodes}`);
  console.log(`   (En Feature Goal per subprocess-fil, utom root)`);
  console.log(`\n2. Call activities från subprocess-filer: ${callActivitiesFromSubprocesses.size}`);
  console.log(`   (Call activities i subprocess-filer, INTE root)`);
  callActivitiesFromSubprocesses.forEach((name, key) => {
    console.log(`   - ${key}: ${name}`);
  });
  
  console.log(`\n3. Call activities från root-filen (mortgage.bpmn): ${callActivitiesFromRoot.size}`);
  console.log(`   (Dessa genereras också som Feature Goals)`);
  callActivitiesFromRoot.forEach((name, key) => {
    console.log(`   - ${key}: ${name}`);
  });
  
  console.log(`\n📈 TOTALT: ${totalFeatureGoals} Feature Goals`);
  console.log(`   = ${subprocessProcessNodes} (subprocess process nodes)`);
  console.log(`   + ${callActivitiesFromSubprocesses.size} (call activities från subprocess-filer)`);
  console.log(`   + ${callActivitiesFromRoot.size} (call activities från root-filen)`);
  
  // 5. Kontrollera filordning
  console.log(`\n📋 FILORDNING (för generering):`);
  const subprocessFilesList = Array.from(subprocessFiles).sort();
  console.log(`   Subprocess-filer (${subprocessFilesList.length}):`);
  subprocessFilesList.forEach(file => console.log(`     - ${file}`));
  console.log(`   Root-filer (1):`);
  console.log(`     - ${rootFile}`);
  console.log(`\n   ✅ Förväntad ordning: Subprocess-filer FÖRE root-filer`);
  
  // 6. Kontrollera för dubletter
  console.log(`\n🔍 KONTROLL FÖR DUBLETTER:`);
  const allCallActivityKeys = new Set<string>();
  let duplicates = 0;
  
  bpmnMap.processes?.forEach(process => {
    process.call_activities?.forEach(ca => {
      const key = `${process.bpmn_file}::${ca.bpmn_id}`;
      if (allCallActivityKeys.has(key)) {
        console.log(`   ⚠️  DUBLETT: ${key}`);
        duplicates++;
      }
      allCallActivityKeys.add(key);
    });
  });
  
  if (duplicates === 0) {
    console.log(`   ✅ Inga dubletter hittades`);
  } else {
    console.log(`   ⚠️  ${duplicates} dubletter hittades`);
  }
  
  // 7. Kontrollera saknade subprocess-filer
  console.log(`\n🔍 KONTROLL FÖR SAKNADE SUBPROCESS-FILER:`);
  const referencedSubprocessFiles = new Set<string>();
  bpmnMap.processes?.forEach(process => {
    process.call_activities?.forEach(ca => {
      if (ca.subprocess_bpmn_file) {
        referencedSubprocessFiles.add(ca.subprocess_bpmn_file);
      }
    });
  });
  
  const missingFiles: string[] = [];
  referencedSubprocessFiles.forEach(file => {
    if (!subprocessFiles.has(file) && file !== rootFile) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length === 0) {
    console.log(`   ✅ Alla refererade subprocess-filer finns i bpmn-map.json`);
  } else {
    console.log(`   ⚠️  ${missingFiles.length} saknade filer:`);
    missingFiles.forEach(file => console.log(`     - ${file}`));
  }
  
  return {
    subprocessProcessNodes,
    callActivitiesFromSubprocesses: callActivitiesFromSubprocesses.size,
    callActivitiesFromRoot: callActivitiesFromRoot.size,
    total: totalFeatureGoals,
    duplicates,
    missingFiles: missingFiles.length
  };
}

const result = analyzeFeatureGoals();
console.log(`\n✅ Analys klar!`);
