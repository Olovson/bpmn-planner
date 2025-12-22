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

async function checkStorage() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  const basePath = `docs/claude/mortgage.bpmn/${rootHash}`;
  
  // Check nodes
  console.log('Checking nodes...');
  const { data: nodes } = await supabase.storage
    .from('bpmn-files')
    .list(`${basePath}/nodes`, { limit: 20 });
  
  console.log(`Found ${nodes?.length || 0} node directories`);
  if (nodes && nodes.length > 0) {
    console.log('Sample directories:', nodes.slice(0, 5).map(n => n.name));
    
    // Check files in first directory
    const firstDir = nodes[0].name;
    const { data: files } = await supabase.storage
      .from('bpmn-files')
      .list(`${basePath}/nodes/${firstDir}`, { limit: 5 });
    console.log(`Files in ${firstDir}:`, files?.map(f => f.name).join(', '));
  }
  
  // Check feature-goals
  console.log('\nChecking feature-goals...');
  const { data: features } = await supabase.storage
    .from('bpmn-files')
    .list(`${basePath}/feature-goals`, { limit: 20 });
  
  console.log(`Found ${features?.length || 0} feature goal files`);
  if (features && features.length > 0) {
    console.log('Sample files:', features.slice(0, 10).map(f => f.name).join(', '));
    console.log('\nFeature goals containing "internal" or "application":');
    features
      .filter(f => f.name.includes('internal') || f.name.includes('application'))
      .forEach(f => console.log('  -', f.name));
  }
}

checkStorage().catch(console.error);
