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

async function check() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  
  // Check feature-goals
  const featureGoalPath = `docs/claude/mortgage.bpmn/${rootHash}/feature-goals/se-application.bpmn-activity_0p3rqyp.html`;
  const { data: fgData, error: fgError } = await supabase.storage
    .from('bpmn-files')
    .download(featureGoalPath);
  
  console.log('Feature Goal path:', featureGoalPath);
  if (fgError) {
    console.log('  ❌ Does NOT exist');
  } else {
    console.log('  ✅ EXISTS');
    const text = await fgData.text();
    console.log('  Size:', text.length, 'bytes');
    console.log('  Contains "Feature Goal":', text.includes('Feature Goal'));
    console.log('  Contains "Epic":', text.includes('Epic'));
  }
  
  // Check nodes
  const nodePath = `docs/claude/mortgage.bpmn/${rootHash}/nodes/mortgage-se-application/activity_0p3rqyp.html`;
  const { data: nodeData, error: nodeError } = await supabase.storage
    .from('bpmn-files')
    .download(nodePath);
  
  console.log('\nNode path:', nodePath);
  if (nodeError) {
    console.log('  ❌ Does NOT exist');
  } else {
    console.log('  ✅ EXISTS');
    const text = await nodeData.text();
    console.log('  Size:', text.length, 'bytes');
    console.log('  Contains "Feature Goal":', text.includes('Feature Goal'));
    console.log('  Contains "Epic":', text.includes('Epic'));
  }
  
  // List all files with activity_0p3rqyp
  console.log('\nSearching for all files with "activity_0p3rqyp"...');
  const { data: allFiles } = await supabase.storage
    .from('bpmn-files')
    .list(`docs/claude/mortgage.bpmn/${rootHash}`, { limit: 1000, search: 'activity_0p3rqyp' });
  
  if (allFiles && allFiles.length > 0) {
    console.log(`Found ${allFiles.length} files:`);
    allFiles.forEach(f => console.log('  -', f.name));
  } else {
    console.log('  No files found');
  }
}

check().catch(console.error);
