import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getFeatureGoalDocFileKey } from '../src/lib/nodeArtifactPaths';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debugCoverage() {
  const fileName = 'mortgage-se-application.bpmn';
  
  // Get all feature goal docs
  const { data: fgEntries } = await supabase.storage
    .from('bpmn-files')
    .list('docs/claude/feature-goals', { limit: 1000});

  console.log('All Feature Goal docs:');
  fgEntries?.forEach(f => console.log('  -', f.name));
  
  // Check what we're looking for
  const callActivities = [
    { elementId: 'internal-data-gathering', subprocessFile: 'mortgage-se-internal-data-gathering.bpmn' },
    { elementId: 'object', subprocessFile: 'mortgage-se-object.bpmn' },
    { elementId: 'household', subprocessFile: 'mortgage-se-household.bpmn' },
    { elementId: 'stakeholder', subprocessFile: 'mortgage-se-stakeholder.bpmn' },
  ];
  
  console.log('\nExpected Feature Goal keys for call activities:');
  const fgNames = new Set(fgEntries?.map(e => e.name) || []);
  callActivities.forEach(ca => {
    const key = getFeatureGoalDocFileKey(ca.subprocessFile, ca.elementId, undefined, fileName);
    const expectedFileName = key.replace('feature-goals/', '');
    const found = fgNames.has(expectedFileName);
    console.log(`  ${ca.elementId}: ${expectedFileName} ${found ? '✅' : '❌'}`);
  });
  
  // Check node docs
  const { data: nodeEntries } = await supabase.storage
    .from('bpmn-files')
    .list('docs/claude/nodes/mortgage-se-application', { limit: 1000});
  
  console.log('\nNode docs in mortgage-se-application folder:');
  if (nodeEntries && nodeEntries.length > 0) {
    nodeEntries.forEach(f => console.log('  -', f.name));
  } else {
    console.log('  (none found)');
  }
}

debugCoverage().catch(console.error);

