#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Check what artifacts were generated for a specific BPMN file
 * Usage: npx ts-node scripts/check-generated-artifacts.ts mortgage-se-household.bpmn
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArtifacts(bpmnFileName: string) {
  console.log(`\n🔍 Checking artifacts for: ${bpmnFileName}\n`);
  console.log('═'.repeat(60));

  // 1. Check documentation in storage
  console.log('\n📄 Documentation Files in Storage:');
  console.log('-'.repeat(60));
  
  const docPatterns = [
    `docs/slow/chatgpt/${bpmnFileName.replace('.bpmn', '')}*.html`,
    `docs/slow/${bpmnFileName.replace('.bpmn', '')}*.html`,
    `docs/local/${bpmnFileName.replace('.bpmn', '')}*.html`,
    `docs/${bpmnFileName.replace('.bpmn', '')}*.html`,
  ];

  // List all files in docs folder recursively
  async function listDocsRecursive(folder: string = 'docs'): Promise<string[]> {
    const allFiles: string[] = [];
    
    async function listRecursive(currentFolder: string) {
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .list(currentFolder, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        console.warn(`  ⚠️  Error listing ${currentFolder}:`, error.message);
        return;
      }

      if (!data) return;

      for (const item of data) {
        const fullPath = currentFolder ? `${currentFolder}/${item.name}` : item.name;

        if (item.id === null) {
          // It's a folder, recurse
          await listRecursive(fullPath);
        } else {
          // It's a file - check if it matches our BPMN file
          if (fullPath.includes(bpmnFileName.replace('.bpmn', '')) && fullPath.endsWith('.html')) {
            allFiles.push(fullPath);
          }
        }
      }
    }

    await listRecursive(folder);
    return allFiles;
  }

  const docFiles = await listDocsRecursive();
  if (docFiles.length > 0) {
    docFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
  } else {
    console.log('  ❌ No documentation files found');
  }

  // 2. Check element mappings
  console.log('\n🔗 Element Mappings in Database:');
  console.log('-'.repeat(60));
  
  const { data: mappings, error: mappingsError } = await supabase
    .from('bpmn_element_mappings')
    .select('*')
    .eq('bpmn_file', bpmnFileName);

  if (mappingsError) {
    console.error('  ❌ Error fetching mappings:', mappingsError.message);
  } else if (mappings && mappings.length > 0) {
    console.log(`  ✅ Found ${mappings.length} element mapping(s):`);
    mappings.forEach((mapping, index) => {
      console.log(`\n  ${index + 1}. Element: ${mapping.element_id}`);
      console.log(`     Jira Type: ${mapping.jira_type || 'N/A'}`);
      console.log(`     Jira Name: ${mapping.jira_name || 'N/A'}`);
      if (mapping.jira_issues && Array.isArray(mapping.jira_issues) && mapping.jira_issues.length > 0) {
        console.log(`     Jira Issues: ${mapping.jira_issues.length} issue(s)`);
      }
      if (mapping.subprocess_bpmn_file) {
        console.log(`     Subprocess: ${mapping.subprocess_bpmn_file}`);
      }
    });
  } else {
    console.log('  ❌ No element mappings found');
  }

  // 3. Check test links
  console.log('\n🧪 Test Links in Database:');
  console.log('-'.repeat(60));
  
  const { data: testLinks, error: testLinksError } = await supabase
    .from('node_test_links')
    .select('*')
    .eq('bpmn_file', bpmnFileName);

  if (testLinksError) {
    console.error('  ❌ Error fetching test links:', testLinksError.message);
  } else if (testLinks && testLinks.length > 0) {
    console.log(`  ✅ Found ${testLinks.length} test link(s):`);
    testLinks.forEach((link, index) => {
      console.log(`\n  ${index + 1}. Element: ${link.bpmn_element_id}`);
      console.log(`     Test File: ${link.test_file_path}`);
      console.log(`     Mode: ${link.mode || 'N/A'}`);
    });
  } else {
    console.log('  ❌ No test links found');
  }

  // 4. Check test files in storage
  console.log('\n📝 Test Files in Storage:');
  console.log('-'.repeat(60));
  
  async function listTestFilesRecursive(folder: string = 'tests'): Promise<string[]> {
    const allFiles: string[] = [];
    
    async function listRecursive(currentFolder: string) {
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .list(currentFolder, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        // Folder might not exist, that's ok
        return;
      }

      if (!data) return;

      for (const item of data) {
        const fullPath = currentFolder ? `${currentFolder}/${item.name}` : item.name;

        if (item.id === null) {
          // It's a folder, recurse
          await listRecursive(fullPath);
        } else {
          // It's a file - check if it matches our BPMN file
          if (fullPath.includes(bpmnFileName.replace('.bpmn', '')) && 
              (fullPath.endsWith('.spec.ts') || fullPath.endsWith('.test.ts'))) {
            allFiles.push(fullPath);
          }
        }
      }
    }

    await listRecursive(folder);
    return allFiles;
  }

  const testFiles = await listTestFilesRecursive();
  if (testFiles.length > 0) {
    console.log(`  ✅ Found ${testFiles.length} test file(s):`);
    testFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
  } else {
    console.log('  ❌ No test files found in storage');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Check complete!\n');
}

// Get BPMN file name from command line argument
const bpmnFileName = process.argv[2] || 'mortgage-se-household.bpmn';

checkArtifacts(bpmnFileName)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });




















