#!/usr/bin/env ts-node
/* eslint-disable no-console */

/**
 * Debug script to check what BPMN files exist in the database
 * Run with: npx ts-node scripts/check-bpmn-files.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFiles() {
  console.log('Checking BPMN files in database...\n');

  const { data: files, error } = await supabase
    .from('bpmn_files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching files:', error);
    process.exit(1);
  }

  console.log(`Found ${files?.length || 0} files in database:\n`);

  if (!files || files.length === 0) {
    console.log('No files found in database.');
    return;
  }

  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.file_name}`);
    console.log(`   Type: ${file.file_type}`);
    console.log(`   Storage path: ${file.storage_path}`);
    console.log(`   Size: ${file.size_bytes ? `${(file.size_bytes / 1024).toFixed(2)} KB` : 'unknown'}`);
    console.log(`   Created: ${file.created_at}`);
    console.log(`   Updated: ${file.last_updated_at}`);
    console.log(`   Has structure changes: ${file.has_structure_changes || false}`);
    console.log('');
  });

  // Also check storage
  console.log('\nChecking Supabase Storage...\n');
  const { data: storageFiles, error: storageError } = await supabase.storage
    .from('bpmn-files')
    .list();

  if (storageError) {
    console.error('Error listing storage files:', storageError);
  } else {
    const bpmnStorageFiles = storageFiles?.filter(f => f.name.endsWith('.bpmn')) || [];
    console.log(`Found ${bpmnStorageFiles.length} .bpmn files in storage:\n`);
    bpmnStorageFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${(file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(2)} KB` : 'unknown size')})`);
    });

    // Check for discrepancies
    const dbFileNames = new Set(files?.map(f => f.file_name) || []);
    const storageFileNames = new Set(bpmnStorageFiles.map(f => f.name));
    
    const inStorageButNotInDb = Array.from(storageFileNames).filter(name => !dbFileNames.has(name));
    const inDbButNotInStorage = Array.from(dbFileNames).filter(name => !storageFileNames.has(name));

    if (inStorageButNotInDb.length > 0) {
      console.log('\n⚠️  Files in storage but NOT in database:');
      inStorageButNotInDb.forEach(name => console.log(`   - ${name}`));
    }

    if (inDbButNotInStorage.length > 0) {
      console.log('\n⚠️  Files in database but NOT in storage:');
      inDbButNotInStorage.forEach(name => console.log(`   - ${name}`));
    }

    if (inStorageButNotInDb.length === 0 && inDbButNotInStorage.length === 0) {
      console.log('\n✅ All files are synchronized between database and storage.');
    }
  }
}

checkFiles()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });





















