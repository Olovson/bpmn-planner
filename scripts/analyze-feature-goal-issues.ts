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

async function analyze() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  
  console.log('🔍 Analyserar feature goals i storage...\n');
  
  // List all feature goals in old location
  const { data: files, error } = await supabase.storage
    .from('bpmn-files')
    .list(`docs/claude/mortgage.bpmn/${rootHash}/feature-goals`, { limit: 1000 });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Totalt antal feature goals: ${files?.length || 0}\n`);
  
  // Analyze naming patterns
  const patterns = {
    'subprocess-process': [] as string[], // e.g., mortgage-se-application.html (process ID)
    'call-activity': [] as string[], // e.g., mortgage-se-application-internal-data-gathering.html (with parent)
    'task-wrong': [] as string[], // e.g., se-application.bpmn-activity_0p3rqyp.html (ServiceTask/UserTask)
    'other': [] as string[]
  };
  
  files?.forEach(file => {
    const name = file.name.replace('.html', '');
    // Pattern 1: Just process ID (e.g., mortgage-se-application)
    if (/^mortgage-se-[a-z-]+$/.test(name)) {
      patterns['subprocess-process'].push(file.name);
    }
    // Pattern 2: Process ID with element ID (call activity with parent)
    else if (/^mortgage-se-[a-z-]+-[a-z-]+$/.test(name)) {
      patterns['call-activity'].push(file.name);
    }
    // Pattern 3: Contains .bpmn-activity_ or similar (likely a task)
    else if (/\.bpmn-[a-z_]+/i.test(name) || /activity_[a-z0-9]+/i.test(name)) {
      patterns['task-wrong'].push(file.name);
    }
    else {
      patterns['other'].push(file.name);
    }
  });
  
  console.log('📋 Pattern-analys:');
  console.log(`  ✅ Subprocess process nodes: ${patterns['subprocess-process'].length}`);
  console.log(`  ✅ Call activities: ${patterns['call-activity'].length}`);
  console.log(`  ❌ Tasks (FEL - borde vara Epic): ${patterns['task-wrong'].length}`);
  console.log(`  ❓ Övriga: ${patterns['other'].length}\n`);
  
  // Read bpmn-map.json to count expected CallActivities
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  let expectedCallActivities = 0;
  let expectedSubprocesses = 0;
  
  if (fs.existsSync(bpmnMapPath)) {
    const bpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
    for (const process of bpmnMap.processes || []) {
      expectedCallActivities += (process.call_activities || []).length;
      // Subprocesses are files that are NOT the root process
      if (process.bpmn_file !== `${bpmnMap.orchestration?.root_process || 'mortgage'}.bpmn`) {
        expectedSubprocesses++;
      }
    }
  }
  
  console.log('📊 Förväntat antal:');
  console.log(`  Call activities (feature goals): ${expectedCallActivities}`);
  console.log(`  Subprocess process nodes (feature goals): ${expectedSubprocesses}`);
  console.log(`  Totalt förväntat: ${expectedCallActivities + expectedSubprocesses}\n`);
  
  const correctlyGenerated = patterns['subprocess-process'].length + patterns['call-activity'].length;
  const incorrectlyGenerated = patterns['task-wrong'].length;
  
  console.log('📈 Sammanfattning:');
  console.log(`  ✅ Korrekt genererade: ${correctlyGenerated}`);
  console.log(`  ❌ Felaktigt genererade (tasks som feature goals): ${incorrectlyGenerated}`);
  console.log(`  📊 Överskott: ${files!.length - (expectedCallActivities + expectedSubprocesses)} filer\n`);
  
  if (patterns['task-wrong'].length > 0) {
    console.log('⚠️  Exempel på felaktigt genererade feature goals (borde vara Epic docs):');
    patterns['task-wrong'].slice(0, 10).forEach(f => console.log(`  - ${f}`));
    if (patterns['task-wrong'].length > 10) {
      console.log(`  ... och ${patterns['task-wrong'].length - 10} fler`);
    }
    console.log('');
  }
  
  if (patterns['other'].length > 0) {
    console.log('❓ Övriga filer (kräver manuell granskning):');
    patterns['other'].slice(0, 10).forEach(f => console.log(`  - ${f}`));
    if (patterns['other'].length > 10) {
      console.log(`  ... och ${patterns['other'].length - 10} fler`);
    }
    console.log('');
  }
  
  console.log('💡 Vad kvarstår:');
  console.log('  1. Identifiera och ta bort felaktigt genererade feature goals (tasks)');
  console.log('  2. Säkerställa att alla CallActivities har feature goal-dokumentation');
  console.log('  3. Säkerställa att alla subprocess-filer har feature goal-dokumentation');
  console.log('  4. Fixa buggen i genereringskoden som skapar feature goals för tasks');
}

analyze().catch(console.error);
