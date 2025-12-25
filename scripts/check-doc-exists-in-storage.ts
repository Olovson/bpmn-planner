#!/usr/bin/env tsx
/**
 * Script to check if documentation files exist in Supabase Storage
 * 
 * Usage:
 *   tsx scripts/check-doc-exists-in-storage.ts <bpmn-file-name> [element-id]
 * 
 * Example:
 *   tsx scripts/check-doc-exists-in-storage.ts mortgage-se-internal-data-gathering.bpmn internal-data-gathering
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

// Try multiple env file locations
const envPaths = [
  resolve(__dirname, '../.env.local'),
  resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  config({ path: envPath, override: false });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please set:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('\n   Tried loading from:', envPaths);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CheckResult {
  path: string;
  exists: boolean;
  error?: string;
}

async function checkFileExists(path: string): Promise<CheckResult> {
  try {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1000,
        search: path.split('/').pop() || '',
      });

    if (error) {
      // Try direct file access
      const { data: fileData, error: fileError } = await supabase.storage
        .from('bpmn-files')
        .download(path);

      if (fileError) {
        return { path, exists: false, error: fileError.message };
      }

      return { path, exists: !!fileData };
    }

    const fileName = path.split('/').pop() || '';
    const exists = data?.some(file => file.name === fileName) || false;

    return { path, exists };
  } catch (error) {
    return { 
      path, 
      exists: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function getFileInfo(fileName: string) {
  const { data, error } = await supabase
    .from('bpmn_files')
    .select('file_name, current_version_hash, current_version_number')
    .eq('file_name', fileName)
    .maybeSingle();

  if (error) {
    console.error(`❌ Error fetching file info: ${error.message}`);
    return null;
  }

  if (!data) {
    console.error(`❌ File ${fileName} not found in database`);
    return null;
  }

  return data;
}

function buildDocPaths(
  fileName: string,
  versionHash: string,
  elementId?: string,
  isFeatureGoal: boolean = false
): string[] {
  const baseName = fileName.replace('.bpmn', '');
  const paths: string[] = [];

  if (isFeatureGoal) {
    // Feature Goal paths
    const featureGoalFileName = elementId && baseName.includes(elementId)
      ? `feature-goals/${baseName}-v1.html`
      : elementId
      ? `feature-goals/${baseName}-${elementId}-v1.html`
      : `feature-goals/${baseName}-v1.html`;

    const featureGoalFileNameV2 = elementId && baseName.includes(elementId)
      ? `feature-goals/${baseName}-v2.html`
      : elementId
      ? `feature-goals/${baseName}-${elementId}-v2.html`
      : `feature-goals/${baseName}-v2.html`;

    // Versioned paths
    paths.push(`docs/local/${fileName}/${versionHash}/${featureGoalFileName}`);
    paths.push(`docs/local/${fileName}/${versionHash}/${featureGoalFileNameV2}`);
    paths.push(`docs/slow/chatgpt/${fileName}/${versionHash}/${featureGoalFileName}`);
    paths.push(`docs/slow/ollama/${fileName}/${versionHash}/${featureGoalFileName}`);
    paths.push(`docs/slow/${fileName}/${versionHash}/${featureGoalFileName}`);

    // Legacy paths
    paths.push(`docs/local/${featureGoalFileName}`);
    paths.push(`docs/slow/chatgpt/${featureGoalFileName}`);
    paths.push(`docs/slow/ollama/${featureGoalFileName}`);
    paths.push(`docs/slow/${featureGoalFileName}`);
    paths.push(`docs/${featureGoalFileName}`);
  } else {
    // Standard node doc paths
    if (elementId) {
      const nodeDocFileName = `nodes/${baseName}/${elementId}.html`;
      
      // Versioned paths
      paths.push(`docs/local/${fileName}/${versionHash}/${nodeDocFileName}`);
      paths.push(`docs/slow/chatgpt/${fileName}/${versionHash}/${nodeDocFileName}`);
      paths.push(`docs/slow/ollama/${fileName}/${versionHash}/${nodeDocFileName}`);
      paths.push(`docs/slow/${fileName}/${versionHash}/${nodeDocFileName}`);

      // Legacy paths
      paths.push(`docs/local/${nodeDocFileName}`);
      paths.push(`docs/slow/chatgpt/${nodeDocFileName}`);
      paths.push(`docs/slow/ollama/${nodeDocFileName}`);
      paths.push(`docs/slow/${nodeDocFileName}`);
      paths.push(`docs/${nodeDocFileName}`);
    }
  }

  return paths;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: tsx scripts/check-doc-exists-in-storage.ts <bpmn-file-name> [element-id] [--feature-goal]');
    console.error('Example: tsx scripts/check-doc-exists-in-storage.ts mortgage-se-internal-data-gathering.bpmn internal-data-gathering --feature-goal');
    process.exit(1);
  }

  const fileName = args[0];
  const elementId = args[1];
  const isFeatureGoal = args.includes('--feature-goal');

  console.log(`\n🔍 Checking documentation for: ${fileName}`);
  if (elementId) {
    console.log(`   Element ID: ${elementId}`);
  }
  if (isFeatureGoal) {
    console.log(`   Type: Feature Goal`);
  }
  console.log('');

  // Get file info from database
  const fileInfo = await getFileInfo(fileName);
  if (!fileInfo) {
    process.exit(1);
  }

  console.log(`📋 File info from database:`);
  console.log(`   Version hash: ${fileInfo.current_version_hash}`);
  console.log(`   Version number: ${fileInfo.current_version_number}`);
  console.log('');

  // Build all possible paths
  const paths = buildDocPaths(
    fileName,
    fileInfo.current_version_hash || '',
    elementId,
    isFeatureGoal
  );

  console.log(`🔎 Checking ${paths.length} possible storage paths...\n`);

  // Check each path
  const results: CheckResult[] = [];
  for (const path of paths) {
    const result = await checkFileExists(path);
    results.push(result);
    
    if (result.exists) {
      console.log(`✅ FOUND: ${path}`);
    } else {
      console.log(`❌ NOT FOUND: ${path}${result.error ? ` (${result.error})` : ''}`);
    }
  }

  // Summary
  const found = results.filter(r => r.exists);
  const notFound = results.filter(r => !r.exists);

  console.log('\n📊 Summary:');
  console.log(`   ✅ Found: ${found.length}`);
  console.log(`   ❌ Not found: ${notFound.length}`);
  console.log(`   Total checked: ${results.length}`);

  if (found.length > 0) {
    console.log('\n✅ Found documentation at:');
    found.forEach(r => console.log(`   • ${r.path}`));
  }

  if (notFound.length === results.length) {
    console.log('\n⚠️  No documentation found in Storage!');
    console.log('   The documentation needs to be generated via BPMN File Manager.');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});









