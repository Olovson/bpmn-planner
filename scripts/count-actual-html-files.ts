#!/usr/bin/env tsx
/* eslint-disable no-console */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function countFiles() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  const basePath = `docs/claude/mortgage.bpmn/${rootHash}`;
  
  console.log(`=== Räknar HTML-filer i: ${basePath} ===\n`);

  // Räkna nodes
  console.log('1. Räknar nodes...');
  const { data: nodeDirs } = await supabase.storage
    .from('bpmn-files')
    .list(`${basePath}/nodes`, { limit: 1000 });
  
  let totalNodes = 0;
  if (nodeDirs) {
    for (const dir of nodeDirs) {
      const { data: files } = await supabase.storage
        .from('bpmn-files')
        .list(`${basePath}/nodes/${dir.name}`, { limit: 1000 });
      const htmlFiles = files?.filter(f => f.name.endsWith('.html')) || [];
      totalNodes += htmlFiles.length;
      if (htmlFiles.length > 0) {
        console.log(`   ${dir.name}: ${htmlFiles.length} filer`);
      }
    }
  }
  console.log(`   Total nodes: ${totalNodes}\n`);

  // Räkna feature-goals
  console.log('2. Räknar feature-goals...');
  const { data: featureFiles } = await supabase.storage
    .from('bpmn-files')
    .list(`${basePath}/feature-goals`, { limit: 1000 });
  
  const featureGoals = featureFiles?.filter(f => f.name.endsWith('.html')).length || 0;
  console.log(`   Total feature-goals: ${featureGoals}\n`);

  // Total
  const total = totalNodes + featureGoals;
  console.log(`=== SAMMANFATTNING ===`);
  console.log(`   Nodes (epics): ${totalNodes}`);
  console.log(`   Feature Goals: ${featureGoals}`);
  console.log(`   TOTAL HTML-FILER: ${total}\n`);
}

countFiles().catch(console.error);
