#!/usr/bin/env tsx
/* eslint-disable no-console */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

async function finalStatus() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  
  // Load bpmn-map.json
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  const bpmnMap: BpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
  const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
  const rootFile = `${rootProcess}.bpmn`;
  
  // Build expected feature goals
  const subprocessFiles = new Set<string>();
  bpmnMap.processes?.forEach(process => {
    if (process.bpmn_file !== rootFile) {
      subprocessFiles.add(process.bpmn_file);
    }
  });
  
  const expectedCallActivities = new Map<string, {
    parentFile: string;
    elementId: string;
    name: string;
    subprocessFile: string;
    expectedFileName: string;
  }>();
  
  bpmnMap.processes?.forEach(process => {
    process.call_activities?.forEach(ca => {
      const key = `${process.bpmn_file}::${ca.bpmn_id}`;
      // Build expected hierarchical filename
      const parentBase = process.bpmn_file.replace('.bpmn', '').replace('mortgage-se-', '');
      const expectedFileName = `mortgage-se-${parentBase}-${ca.bpmn_id}.html`;
      
      expectedCallActivities.set(key, {
        parentFile: process.bpmn_file,
        elementId: ca.bpmn_id,
        name: ca.name,
        subprocessFile: ca.subprocess_bpmn_file,
        expectedFileName
      });
    });
  });
  
  console.log('📊 Final Status: Feature Goals (Strategi 1 - Hierarchical Naming)\n');
  console.log('='.repeat(70));
  
  // List all feature goals in old location
  const { data: files, error } = await supabase.storage
    .from('bpmn-files')
    .list(`docs/claude/mortgage.bpmn/${rootHash}/feature-goals`, { limit: 1000 });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const fileNames = new Set(files?.map(f => f.name) || []);
  
  // Check subprocess process nodes
  const foundSubprocessProcessNodes = new Set<string>();
  const missingSubprocessProcessNodes: string[] = [];
  
  subprocessFiles.forEach(file => {
    const processId = file.replace('.bpmn', '');
    // Check various naming patterns
    const patterns = [
      `${processId}.html`,
      `mortgage-${processId.replace('mortgage-se-', '')}.html`,
      `${processId.replace('mortgage-se-', '')}.html`
    ];
    
    const found = patterns.some(p => fileNames.has(p));
    if (found) {
      foundSubprocessProcessNodes.add(file);
    } else {
      missingSubprocessProcessNodes.push(file);
    }
  });
  
  // Check call activities
  const foundCallActivities = new Set<string>();
  const missingCallActivities: Array<{
    parentFile: string;
    elementId: string;
    name: string;
    subprocessFile: string;
    expectedFileName: string;
  }> = [];
  
  expectedCallActivities.forEach((ca, key) => {
    // Check if file exists (try various patterns)
    const patterns = [
      ca.expectedFileName,
      ca.expectedFileName.replace('mortgage-se-', ''),
      `mortgage-${ca.expectedFileName.replace('mortgage-se-', '')}`
    ];
    
    const found = patterns.some(p => fileNames.has(p));
    if (found) {
      foundCallActivities.add(key);
    } else {
      missingCallActivities.push(ca);
    }
  });
  
  console.log('\n📋 Förväntat (Strategi 1):');
  console.log(`  Subprocess process nodes: ${subprocessFiles.size}`);
  console.log(`  Call activity-instanser: ${expectedCallActivities.size}`);
  console.log(`  Totalt förväntat: ${subprocessFiles.size + expectedCallActivities.size}`);
  
  console.log('\n✅ Hittat:');
  console.log(`  Subprocess process nodes: ${foundSubprocessProcessNodes.size}/${subprocessFiles.size}`);
  console.log(`  Call activity-instanser: ${foundCallActivities.size}/${expectedCallActivities.size}`);
  console.log(`  Totalt hittat: ${foundSubprocessProcessNodes.size + foundCallActivities.size}`);
  
  console.log('\n❌ Saknas:');
  console.log(`  Subprocess process nodes: ${missingSubprocessProcessNodes.length}`);
  if (missingSubprocessProcessNodes.length > 0) {
    missingSubprocessProcessNodes.forEach(file => {
      console.log(`    - ${file}`);
    });
  }
  
  console.log(`\n  Call activity-instanser: ${missingCallActivities.length}`);
  if (missingCallActivities.length > 0) {
    console.log('\n  Saknade CallActivity feature goals:');
    missingCallActivities.forEach(ca => {
      console.log(`    - ${ca.parentFile}::${ca.elementId} (${ca.name})`);
      console.log(`      Förväntat filnamn: ${ca.expectedFileName}`);
      console.log(`      Subprocess: ${ca.subprocessFile}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Sammanfattning:');
  const totalExpected = subprocessFiles.size + expectedCallActivities.size;
  const totalFound = foundSubprocessProcessNodes.size + foundCallActivities.size;
  const totalMissing = missingSubprocessProcessNodes.length + missingCallActivities.length;
  
  console.log(`  Totalt förväntat: ${totalExpected}`);
  console.log(`  Totalt hittat: ${totalFound} (${Math.round((totalFound / totalExpected) * 100)}%)`);
  console.log(`  Totalt saknas: ${totalMissing}`);
  
  if (totalMissing > 0) {
    console.log(`\n⚠️  ${totalMissing} feature goals behöver genereras`);
  } else {
    console.log(`\n✅ Alla feature goals finns!`);
  }
}

finalStatus().catch(console.error);
