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
  
  // This would require importing buildBpmnProcessGraph which has path-intersection issues
  // Instead, let's just check what files exist in storage and what the naming patterns are
  
  const { data: files } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');
  
  const allBpmnFiles = (files || []).map(f => f.file_name);
  
  console.log(`Total BPMN files: ${allBpmnFiles.length}\n`);
  
  // Check feature-goal files
  const { data: featureGoalEntries } = await supabase.storage
    .from('bpmn-files')
    .list('docs/claude/feature-goals', { limit: 1000 });
  
  if (featureGoalEntries) {
    const fileBaseName = fileName.replace('.bpmn', '');
    const relevantFiles = featureGoalEntries.filter(f => 
      f.name.includes(fileBaseName) || 
      f.name.startsWith(fileBaseName)
    );
    
    console.log(`Feature Goal files containing "${fileBaseName}": ${relevantFiles.length}`);
    relevantFiles.forEach(f => {
      console.log(`  - ${f.name}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
}

async function main() {
  const args = process.argv.slice(2);
  const fileName = args[0] || 'mortgage-se-object-control.bpmn';
  
  await debugCoverage(fileName);
}

main();

