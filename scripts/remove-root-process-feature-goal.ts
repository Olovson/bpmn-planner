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

async function removeRootProcess() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  const path = `docs/claude/mortgage.bpmn/${rootHash}/feature-goals/mortgage.html`;
  
  console.log('🗑️  Tar bort root process feature goal...\n');
  
  const { error } = await supabase.storage
    .from('bpmn-files')
    .remove([path]);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Tog bort root process feature goal:', path);
  }
}

removeRootProcess().catch(console.error);
