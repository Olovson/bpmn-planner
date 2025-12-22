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

async function verifyRemainingFeatureGoals() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  
  // Load bpmn-map.json
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  const bpmnMap: BpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
  const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
  
  // Build map of process_id -> bpmn_file
  const processIdToFile = new Map<string, string>();
  const subprocessFiles = new Set<string>();
  
  bpmnMap.processes?.forEach(process => {
    processIdToFile.set(process.process_id, process.bpmn_file);
    // A subprocess is any file that is NOT the root process
    if (process.bpmn_file !== `${rootProcess}.bpmn`) {
      subprocessFiles.add(process.bpmn_file);
    }
  });
  
  // Build map of call activities
  const callActivities = new Map<string, { parentFile: string; elementId: string; name: string; subprocessFile: string }>();
  bpmnMap.processes?.forEach(process => {
    process.call_activities?.forEach(ca => {
      const key = `${process.bpmn_file}::${ca.bpmn_id}`;
      callActivities.set(key, {
        parentFile: process.bpmn_file,
        elementId: ca.bpmn_id,
        name: ca.name,
        subprocessFile: ca.subprocess_bpmn_file
      });
    });
  });
  
  console.log('🔍 Verifierar kvarvarande feature goals...\n');
  
  // List all feature goals in old location
  const { data: files, error } = await supabase.storage
    .from('bpmn-files')
    .list(`docs/claude/mortgage.bpmn/${rootHash}/feature-goals`, { limit: 1000 });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Totalt antal feature goals: ${files?.length || 0}\n`);
  
  // Categorize files
  const verified = {
    'subprocess-process-correct': [] as string[],
    'subprocess-process-short-name': [] as string[],
    'call-activity': [] as string[],
    'unknown': [] as string[]
  };
  
  files?.forEach(file => {
    const name = file.name.replace('.html', '');
    let matched = false;
    
    // Check if it's a subprocess process node (full name: mortgage-se-{processId})
    if (/^mortgage-se-[a-z-]+$/.test(name)) {
      const processId = name;
      if (processIdToFile.has(processId) && subprocessFiles.has(processIdToFile.get(processId)!)) {
        verified['subprocess-process-correct'].push(file.name);
        matched = true;
      }
    }
    
    // Check if it's a subprocess process node (short name, e.g., "appeal" -> "mortgage-se-appeal")
    if (!matched) {
      const possibleProcessId = `mortgage-se-${name}`;
      if (processIdToFile.has(possibleProcessId) && subprocessFiles.has(processIdToFile.get(possibleProcessId)!)) {
        verified['subprocess-process-short-name'].push(file.name);
        matched = true;
      }
    }
    
    // Check if it's a subprocess process node (with mortgage- prefix, e.g., "mortgage-appeal" -> "mortgage-se-appeal")
    if (!matched) {
      const possibleProcessId = name.replace(/^mortgage-/, 'mortgage-se-');
      if (processIdToFile.has(possibleProcessId) && subprocessFiles.has(processIdToFile.get(possibleProcessId)!)) {
        verified['subprocess-process-short-name'].push(file.name);
        matched = true;
      }
    }
    
    // Check if it's a call activity (hierarchical naming: mortgage-se-{parent}-{elementId})
    // Try different patterns
    if (!matched) {
      // Pattern 1: mortgage-se-{parent}-{elementId}
      const callActivityMatch1 = name.match(/^mortgage-se-([a-z-]+)-([a-z-]+)$/);
      if (callActivityMatch1) {
        const [, parentPart, elementId] = callActivityMatch1;
        const parentFile = `mortgage-se-${parentPart}.bpmn`;
        const key = `${parentFile}::${elementId}`;
        if (callActivities.has(key)) {
          verified['call-activity'].push(file.name);
          matched = true;
        }
      }
    }
    
    // Pattern 2: mortgage-se-{parent}-{elementId}-{suffix} (for nested call activities)
    if (!matched) {
      // Try matching with multiple dashes (e.g., mortgage-se-credit-evaluation-loop-household)
      for (const [key, ca] of callActivities.entries()) {
        const parentBase = ca.parentFile.replace('.bpmn', '').replace('mortgage-se-', '');
        const expectedPattern = new RegExp(`^mortgage-se-${parentBase.replace(/-/g, '-')}-${ca.elementId.replace(/-/g, '-')}(-[a-z-]+)*$`);
        if (expectedPattern.test(name)) {
          verified['call-activity'].push(file.name);
          matched = true;
          break;
        }
      }
    }
    
    // Pattern 3: Check all call activities by trying to match elementId at the end
    if (!matched) {
      for (const [key, ca] of callActivities.entries()) {
        // Check if name ends with elementId (with or without plural)
        const elementIdVariations = [
          ca.elementId,
          `${ca.elementId}s`, // plural
          ca.elementId.replace(/-/g, '-')
        ];
        
        for (const elementIdVar of elementIdVariations) {
          if (name.endsWith(`-${elementIdVar}`) || name === elementIdVar) {
            // Verify it's from the right parent
            const parentBase = ca.parentFile.replace('.bpmn', '').replace('mortgage-se-', '');
            if (name.includes(parentBase) || name.startsWith('mortgage-se-')) {
              verified['call-activity'].push(file.name);
              matched = true;
              break;
            }
          }
        }
        if (matched) break;
      }
    }
    
    // Pattern 4: Check for "per-" patterns (e.g., mortgage-se-signing-per-signee)
    if (!matched) {
      const perMatch = name.match(/^mortgage-se-([a-z-]+)-per-([a-z-]+)$/);
      if (perMatch) {
        const [, parentPart, suffix] = perMatch;
        // This is likely a call activity for signing subprocess
        if (parentPart === 'signing') {
          // Check if it matches any call activity in signing
          for (const [key, ca] of callActivities.entries()) {
            if (ca.parentFile === 'mortgage-se-signing.bpmn' && 
                (ca.elementId.includes(suffix) || suffix.includes(ca.elementId))) {
              verified['call-activity'].push(file.name);
              matched = true;
              break;
            }
          }
        }
      }
    }
    
    // Unknown
    if (!matched) {
      verified['unknown'].push(file.name);
    }
  });
  
  console.log('✅ Verifierade kategorier:');
  console.log(`  Subprocess process nodes (full name): ${verified['subprocess-process-correct'].length}`);
  console.log(`  Subprocess process nodes (short name): ${verified['subprocess-process-short-name'].length}`);
  console.log(`  Call activities: ${verified['call-activity'].length}`);
  console.log(`  Okända: ${verified['unknown'].length}\n`);
  
  if (verified['subprocess-process-short-name'].length > 0) {
    console.log('📋 Subprocess process nodes med kort namn (korrekta):');
    verified['subprocess-process-short-name'].slice(0, 10).forEach(f => console.log(`  - ${f}`));
    if (verified['subprocess-process-short-name'].length > 10) {
      console.log(`  ... och ${verified['subprocess-process-short-name'].length - 10} fler`);
    }
    console.log('');
  }
  
  if (verified['unknown'].length > 0) {
    console.log('❓ Okända filer (kräver manuell granskning):');
    verified['unknown'].forEach(f => console.log(`  - ${f}`));
    console.log('');
  }
  
  // Check missing call activities
  console.log('🔍 Kontrollerar saknade CallActivities...\n');
  
  const missingCallActivities: Array<{ parentFile: string; elementId: string; name: string; subprocessFile: string }> = [];
  const foundCallActivities = new Set<string>();
  
  // Mark which call activities we found
  verified['call-activity'].forEach(fileName => {
    const name = fileName.replace('.html', '');
    // Try to match against all call activities
    for (const [key, ca] of callActivities.entries()) {
      const parentBase = ca.parentFile.replace('.bpmn', '').replace('mortgage-se-', '');
      // Check various patterns
      if (name === `mortgage-se-${parentBase}-${ca.elementId}` ||
          name.endsWith(`-${ca.elementId}`) ||
          name.includes(`${parentBase}-${ca.elementId}`)) {
        foundCallActivities.add(key);
        break;
      }
    }
  });
  
  // Find missing ones
  for (const [key, ca] of callActivities.entries()) {
    if (!foundCallActivities.has(key)) {
      missingCallActivities.push(ca);
    }
  }
  
  console.log(`📊 CallActivities i bpmn-map.json: ${callActivities.size}`);
  console.log(`✅ Feature goals hittade: ${verified['call-activity'].length}`);
  console.log(`❌ Saknade feature goals: ${missingCallActivities.length}\n`);
  
  if (missingCallActivities.length > 0) {
    console.log('❌ Saknade CallActivity feature goals:');
    missingCallActivities.slice(0, 20).forEach(ca => {
      console.log(`  - ${ca.parentFile}::${ca.elementId} (${ca.name}) -> ${ca.subprocessFile}`);
    });
    if (missingCallActivities.length > 20) {
      console.log(`  ... och ${missingCallActivities.length - 20} fler`);
    }
    console.log('');
  }
  
  // Check the 8 unknown files more carefully
  if (verified['unknown'].length > 0) {
    console.log('\n🔍 Detaljerad analys av okända filer:');
    for (const fileName of verified['unknown']) {
      const name = fileName.replace('.html', '');
      console.log(`\n  ${fileName}:`);
      
      // Check if it's a subprocess with -advance suffix
      if (name.endsWith('-advance')) {
        const baseName = name.replace('-advance', '');
        const possibleProcessId1 = `mortgage-se-${baseName}`;
        const possibleProcessId2 = `mortgage-${baseName}`;
        if (processIdToFile.has(possibleProcessId1) || processIdToFile.has(possibleProcessId2)) {
          console.log(`    ✅ Troligen subprocess process node: ${possibleProcessId1}`);
        } else {
          console.log(`    ❓ Okänd: ${name}`);
        }
      }
      // Check if it's root process (should not have feature goal)
      else if (name === 'mortgage' || name === rootProcess) {
        console.log(`    ⚠️  Root process - ska INTE ha feature goal`);
      }
      // Check if it's a call activity with plural/stakeholders
      else if (name.includes('stakeholders') || name.includes('stakeholder')) {
        console.log(`    ✅ Troligen call activity (stakeholder/stakeholders)`);
      }
      // Check per- patterns
      else if (name.includes('per-')) {
        console.log(`    ✅ Troligen call activity (per- pattern)`);
      }
      else {
        console.log(`    ❓ Okänd: ${name}`);
      }
    }
  }
  
  // Summary
  const totalSubprocessProcessNodes = verified['subprocess-process-correct'].length + verified['subprocess-process-short-name'].length;
  const expectedSubprocessProcessNodes = subprocessFiles.size;
  
  console.log('\n📊 Sammanfattning:');
  console.log(`  Subprocess process nodes: ${totalSubprocessProcessNodes}/${expectedSubprocessProcessNodes} ${totalSubprocessProcessNodes >= expectedSubprocessProcessNodes ? '✅' : '⚠️'}`);
  console.log(`  Call activities: ${verified['call-activity'].length}/${callActivities.size} ${verified['call-activity'].length >= callActivities.size ? '✅' : '⚠️'}`);
  console.log(`  Totalt korrekt: ${totalSubprocessProcessNodes + verified['call-activity'].length}`);
  console.log(`  Totalt förväntat: ${expectedSubprocessProcessNodes + callActivities.size}`);
  console.log(`  Okända: ${verified['unknown'].length} (kräver manuell granskning)`);
  
  if (missingCallActivities.length > 0) {
    console.log(`\n⚠️  ${missingCallActivities.length} CallActivities saknar feature goal-dokumentation`);
  }
}

verifyRemainingFeatureGoals().catch(console.error);
