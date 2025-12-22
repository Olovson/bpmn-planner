#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Script för att selektivt generera saknade feature goals.
 * 
 * Användning:
 *   npx tsx scripts/generate-missing-feature-goals.ts
 * 
 * Detta script identifierar saknade feature goals och genererar dem selektivt
 * utan att generera om redan befintliga filer.
 */

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

async function generateMissingFeatureGoals() {
  console.log('🔍 Identifierar saknade feature goals...\n');
  
  // Load bpmn-map.json
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  const bpmnMap: BpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
  const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
  const rootFile = `${rootProcess}.bpmn`;
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  
  // List all feature goals in old location
  const { data: files, error } = await supabase.storage
    .from('bpmn-files')
    .list(`docs/claude/mortgage.bpmn/${rootHash}/feature-goals`, { limit: 1000 });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const fileNames = new Set(files?.map(f => f.name) || []);
  
  // Find missing subprocess process nodes
  const subprocessFiles = new Set<string>();
  bpmnMap.processes?.forEach(process => {
    if (process.bpmn_file !== rootFile) {
      subprocessFiles.add(process.bpmn_file);
    }
  });
  
  const missingSubprocessProcessNodes: string[] = [];
  subprocessFiles.forEach(file => {
    const processId = file.replace('.bpmn', '');
    const patterns = [
      `${processId}.html`,
      `mortgage-${processId.replace('mortgage-se-', '')}.html`,
      `${processId.replace('mortgage-se-', '')}.html`
    ];
    
    const found = patterns.some(p => fileNames.has(p));
    if (!found) {
      missingSubprocessProcessNodes.push(file);
    }
  });
  
  // Find missing call activities
  const missingCallActivities: Array<{
    parentFile: string;
    elementId: string;
    name: string;
    subprocessFile: string;
    expectedFileName: string;
  }> = [];
  
  bpmnMap.processes?.forEach(process => {
    process.call_activities?.forEach(ca => {
      const parentBase = process.bpmn_file.replace('.bpmn', '').replace('mortgage-se-', '');
      const expectedFileName = `mortgage-se-${parentBase}-${ca.bpmn_id}.html`;
      
      const patterns = [
        expectedFileName,
        expectedFileName.replace('mortgage-se-', ''),
        `mortgage-${expectedFileName.replace('mortgage-se-', '')}`
      ];
      
      const found = patterns.some(p => fileNames.has(p));
      if (!found) {
        missingCallActivities.push({
          parentFile: process.bpmn_file,
          elementId: ca.bpmn_id,
          name: ca.name,
          subprocessFile: ca.subprocess_bpmn_file,
          expectedFileName
        });
      }
    });
  });
  
  console.log('📊 Saknade feature goals:');
  console.log(`  Subprocess process nodes: ${missingSubprocessProcessNodes.length}`);
  if (missingSubprocessProcessNodes.length > 0) {
    missingSubprocessProcessNodes.forEach(file => console.log(`    - ${file}`));
  }
  
  console.log(`\n  Call activity-instanser: ${missingCallActivities.length}`);
  if (missingCallActivities.length > 0) {
    missingCallActivities.forEach(ca => {
      console.log(`    - ${ca.parentFile}::${ca.elementId} (${ca.name})`);
      console.log(`      Förväntat: ${ca.expectedFileName}`);
    });
  }
  
  const totalMissing = missingSubprocessProcessNodes.length + missingCallActivities.length;
  
  if (totalMissing === 0) {
    console.log('\n✅ Alla feature goals finns redan!');
    return;
  }
  
  console.log(`\n⚠️  ${totalMissing} feature goals saknas och behöver genereras.`);
  console.log('\n💡 För att generera de saknade feature goals:');
  console.log('   1. Öppna appen och gå till BpmnFileManager');
  console.log('   2. Klicka på "Generera information (alla filer)"');
  console.log('   3. Systemet kommer att generera de saknade feature goals');
  console.log('      (redan befintliga filer hoppas över om forceRegenerate är false)');
  console.log('\n   OBS: Om forceRegenerate är true kommer ALLA filer att genereras om.');
  console.log('        Överväg att ändra forceRegenerate till false för att bara generera saknade.');
}

generateMissingFeatureGoals().catch(console.error);
