#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Debug script to see what nodes are being counted for a specific file
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugCoverage(fileName: string): Promise<void> {
  console.log(`\n🔍 Debug Coverage for: ${fileName}\n`);
  console.log('═'.repeat(80));
  
  const fileBaseName = fileName.replace('.bpmn', '');
  
  // List all node docs in the expected paths
  const nodeDocPaths = [
    `docs/claude/nodes/${fileBaseName}`,
    `docs/nodes/${fileBaseName}`,
  ];
  
  console.log('📄 Node Documentation Files:\n');
  let totalNodeDocs = 0;
  const foundFiles = new Set<string>();
  
  for (const path of nodeDocPaths) {
    const { data: entries, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, { limit: 1000 });
    
    if (!error && entries && entries.length > 0) {
      console.log(`   ✅ Found ${entries.length} files in: ${path}`);
      entries.forEach(entry => {
        if (entry.name.endsWith('.html')) {
          foundFiles.add(entry.name);
          totalNodeDocs++;
          console.log(`      - ${entry.name}`);
        }
      });
    }
  }
  
  if (totalNodeDocs === 0) {
    console.log('   ❌ No node documentation found');
  } else {
    console.log(`\n   📊 Total: ${totalNodeDocs} node documentation files`);
  }
  
  // List all feature goal docs
  console.log('\n🎯 Feature Goal Documentation Files:\n');
  const { data: featureGoalEntries } = await supabase.storage
    .from('bpmn-files')
    .list('docs/claude/feature-goals', { limit: 1000 });
  
  if (featureGoalEntries) {
    const relevantFiles = featureGoalEntries.filter(f => 
      f.name.includes(fileBaseName) || 
      f.name.startsWith(fileBaseName)
    );
    
    console.log(`   Found ${relevantFiles.length} files containing "${fileBaseName}":`);
    relevantFiles.forEach(f => {
      console.log(`      - ${f.name}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n💡 If UI shows "50/66" but we found ${totalNodeDocs} node docs,`);
  console.log('   the counting logic is likely matching docs from other files.\n');
}

async function main() {
  const args = process.argv.slice(2);
  const fileName = args[0] || 'mortgage-se-credit-evaluation.bpmn';
  
  await debugCoverage(fileName);
}

main();




