#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Count all documentation files in Storage
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

async function countAllDocs(): Promise<void> {
  console.log('\n📊 Räkna Alla Dokumentationer i Storage\n');
  console.log('═'.repeat(80));
  
  // Count node docs
  const nodeDocPaths = [
    'docs/claude',
    'docs/ollama',
    'docs/local',
    'docs/nodes',
  ];
  
  let totalNodeDocs = 0;
  const nodeDocFiles = new Set<string>();
  
  for (const basePath of nodeDocPaths) {
    async function listRecursive(path: string) {
      const { data: entries, error } = await supabase.storage
        .from('bpmn-files')
        .list(path, { limit: 1000 });
      
      if (error || !entries) return;
      
      for (const entry of entries) {
        const fullPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.name.endsWith('.html') && fullPath.includes('/nodes/')) {
          nodeDocFiles.add(fullPath);
          totalNodeDocs++;
        } else if (!entry.name.includes('.')) {
          // It's a directory, recurse
          await listRecursive(fullPath);
        }
      }
    }
    
    await listRecursive(basePath);
  }
  
  // Count feature-goal docs
  const featureGoalPaths = [
    'docs/claude/feature-goals',
    'docs/ollama/feature-goals',
    'docs/local/feature-goals',
    'docs/feature-goals',
  ];
  
  let totalFeatureGoalDocs = 0;
  const featureGoalFiles = new Set<string>();
  
  for (const path of featureGoalPaths) {
    const { data: entries, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, { limit: 1000 });
    
    if (!error && entries) {
      for (const entry of entries) {
        if (entry.name.endsWith('.html')) {
          featureGoalFiles.add(entry.name);
          totalFeatureGoalDocs++;
        }
      }
    }
  }
  
  // Also check versioned paths
  const { data: versionedDirs } = await supabase.storage
    .from('bpmn-files')
    .list('docs/claude', { limit: 1000 });
  
  if (versionedDirs) {
    for (const dir of versionedDirs) {
      if (dir.name.endsWith('.bpmn')) {
        // This is a versioned path: docs/claude/{fileName}/{hash}/
        const { data: hashDirs } = await supabase.storage
          .from('bpmn-files')
          .list(`docs/claude/${dir.name}`, { limit: 1000 });
        
        if (hashDirs) {
          for (const hashDir of hashDirs) {
            // Check nodes/
            const { data: nodeEntries } = await supabase.storage
              .from('bpmn-files')
              .list(`docs/claude/${dir.name}/${hashDir.name}/nodes`, { limit: 1000 });
            
            if (nodeEntries) {
              for (const entry of nodeEntries) {
                if (entry.name.endsWith('.html')) {
                  const fullPath = `docs/claude/${dir.name}/${hashDir.name}/nodes/${entry.name}`;
                  if (!nodeDocFiles.has(fullPath)) {
                    nodeDocFiles.add(fullPath);
                    totalNodeDocs++;
                  }
                }
              }
            }
            
            // Check feature-goals/
            const { data: fgEntries } = await supabase.storage
              .from('bpmn-files')
              .list(`docs/claude/${dir.name}/${hashDir.name}/feature-goals`, { limit: 1000 });
            
            if (fgEntries) {
              for (const entry of fgEntries) {
                if (entry.name.endsWith('.html')) {
                  if (!featureGoalFiles.has(entry.name)) {
                    featureGoalFiles.add(entry.name);
                    totalFeatureGoalDocs++;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  console.log(`\n📄 Node Documentation: ${totalNodeDocs} filer`);
  console.log(`🎯 Feature Goal Documentation: ${totalFeatureGoalDocs} filer`);
  console.log(`📊 Totalt: ${totalNodeDocs + totalFeatureGoalDocs} dokumentationsfiler\n`);
  
  console.log('═'.repeat(80));
  console.log('\n🎯 Feature Goal Filer:\n');
  Array.from(featureGoalFiles).sort().forEach(f => {
    console.log(`  - ${f}`);
  });
  
  console.log('\n' + '═'.repeat(80));
}

async function main() {
  await countAllDocs();
}

main();








