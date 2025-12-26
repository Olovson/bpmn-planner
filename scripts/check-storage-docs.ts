#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Simple script to check what documentation files actually exist in Storage
 * for a specific BPMN file.
 * 
 * Usage:
 *   tsx scripts/check-storage-docs.ts mortgage-se-object-control.bpmn
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

async function checkStorageDocs(fileName: string): Promise<void> {
  console.log(`\n🔍 Checking documentation in Storage for: ${fileName}\n`);
  console.log('═'.repeat(80));
  
  // Get version hash
  const { data: fileData, error: fileError } = await supabase
    .from('bpmn_files')
    .select('current_version_hash')
    .eq('file_name', fileName)
    .maybeSingle();
  
  if (fileError) {
    console.error('Error fetching file:', fileError);
    return;
  }
  
  const versionHash = fileData?.current_version_hash || null;
  console.log(`Version Hash: ${versionHash || 'None'}\n`);
  
  // Check node docs
  const nodeDocPaths = versionHash
    ? [
        `docs/claude/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/ollama/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/local/${fileName}/${versionHash}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/nodes/${fileName.replace('.bpmn', '')}`,
      ]
    : [
        `docs/claude/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/ollama/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/local/${fileName}/nodes/${fileName.replace('.bpmn', '')}`,
        `docs/nodes/${fileName.replace('.bpmn', '')}`,
      ];
  
  console.log('📄 Node Documentation:\n');
  let foundNodeDocs = false;
  for (const path of nodeDocPaths) {
    const { data: entries, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, { limit: 1000 });
    
    if (!error && entries && entries.length > 0) {
      console.log(`   ✅ Found ${entries.length} files in: ${path}`);
      entries.slice(0, 10).forEach(entry => {
        console.log(`      - ${entry.name}`);
      });
      if (entries.length > 10) {
        console.log(`      ... and ${entries.length - 10} more`);
      }
      foundNodeDocs = true;
      break;
    }
  }
  
  if (!foundNodeDocs) {
    console.log('   ❌ No node documentation found in any path');
  }
  
  // Check feature-goal docs
  const fileForVersionedPath = fileName.endsWith('.bpmn') ? fileName : `${fileName}.bpmn`;
  const featureGoalPaths = versionHash
    ? [
        `docs/claude/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/ollama/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/local/${fileForVersionedPath}/${versionHash}/feature-goals`,
        `docs/claude/feature-goals`,
        `docs/ollama/feature-goals`,
        `docs/local/feature-goals`,
        `docs/feature-goals`,
      ]
    : [
        `docs/claude/feature-goals`,
        `docs/ollama/feature-goals`,
        `docs/local/feature-goals`,
        `docs/feature-goals`,
      ];
  
  console.log('\n🎯 Feature Goal Documentation:\n');
  let foundFeatureGoals = false;
  for (const path of featureGoalPaths) {
    const { data: entries, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, { limit: 1000 });
    
    if (!error && entries && entries.length > 0) {
      // Filter to files that might belong to this file
      const relevantFiles = entries.filter(e => 
        e.name.includes(fileName.replace('.bpmn', '')) || 
        e.name.startsWith(fileName.replace('.bpmn', ''))
      );
      
      if (relevantFiles.length > 0) {
        console.log(`   ✅ Found ${relevantFiles.length} relevant files in: ${path}`);
        relevantFiles.slice(0, 20).forEach(entry => {
          console.log(`      - ${entry.name}`);
        });
        if (relevantFiles.length > 20) {
          console.log(`      ... and ${relevantFiles.length - 20} more`);
        }
        foundFeatureGoals = true;
      }
    }
  }
  
  if (!foundFeatureGoals) {
    console.log('   ❌ No feature goal documentation found');
  }
  
  console.log('\n' + '═'.repeat(80));
}

async function main() {
  const args = process.argv.slice(2);
  const fileName = args[0];
  
  if (!fileName) {
    console.error('Usage: tsx scripts/check-storage-docs.ts <fileName>');
    process.exit(1);
  }
  
  await checkStorageDocs(fileName);
}

main();

