#!/usr/bin/env tsx
/**
 * Debug script to check why Feature Goal documentation wasn't generated
 * 
 * Usage:
 *   tsx scripts/debug-feature-goal-generation.ts <bpmn-file-name>
 * 
 * Example:
 *   tsx scripts/debug-feature-goal-generation.ts mortgage-se-internal-data-gathering.bpmn
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import bpmnMapData from '../bpmn-map.json';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugFeatureGoalGeneration(fileName: string) {
  console.log(`\n🔍 Debugging Feature Goal generation for: ${fileName}\n`);
  console.log('═'.repeat(80));

  // 1. Check if file exists in database
  const { data: fileData, error: fileError } = await supabase
    .from('bpmn_files')
    .select('file_name, current_version_hash, file_type')
    .eq('file_name', fileName)
    .maybeSingle();

  if (fileError) {
    console.error(`❌ Error fetching file: ${fileError.message}`);
    return;
  }

  if (!fileData) {
    console.error(`❌ File ${fileName} not found in database`);
    return;
  }

  console.log(`✅ File exists in database:`);
  console.log(`   Version hash: ${fileData.current_version_hash || 'NULL'}`);
  console.log(`   File type: ${fileData.file_type}`);
  console.log('');

  // 2. Get all BPMN files
  const { data: allFiles, error: allFilesError } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');

  if (allFilesError) {
    console.error(`❌ Error fetching all files: ${allFilesError.message}`);
    return;
  }

  const existingBpmnFiles = (allFiles || []).map(f => f.file_name as string);
  console.log(`📋 Total BPMN files in database: ${existingBpmnFiles.length}`);
  console.log('');

  // 3. Build process graph
  console.log('🔨 Building process graph...');
  try {
    const graph = await buildBpmnProcessGraph(fileName, existingBpmnFiles);
    
    console.log(`✅ Graph built successfully`);
    console.log(`   Total nodes: ${graph.allNodes.size}`);
    console.log('');

    // 4. Check for process node in this file
    const processNodes = Array.from(graph.allNodes.values()).filter(
      node => node.type === 'process' && node.bpmnFile === fileName
    );

    console.log(`🔍 Process nodes in ${fileName}: ${processNodes.length}`);
    processNodes.forEach(node => {
      console.log(`   - ${node.id} (elementId: ${node.bpmnElementId}, name: ${node.name})`);
    });
    console.log('');

    // 5. Check if file is identified as subprocess
    const bpmnMap = loadBpmnMap(bpmnMapData);
    const rootProcessId = bpmnMap?.orchestration?.root_process;
    const fileBaseName = fileName.replace('.bpmn', '');
    const isRootProcessFromMap = rootProcessId && (fileBaseName === rootProcessId || fileName === `${rootProcessId}.bpmn`);

    console.log(`📊 Subprocess identification:`);
    console.log(`   Root process from map: ${rootProcessId || 'NOT FOUND'}`);
    console.log(`   Is root process: ${isRootProcessFromMap}`);
    console.log(`   Has process node: ${processNodes.length > 0}`);
    
    const hasCallActivityPointingToFile = Array.from(graph.allNodes.values()).some(
      node => node.type === 'callActivity' && node.subprocessFile === fileName
    );
    console.log(`   Has callActivity pointing to file: ${hasCallActivityPointingToFile}`);
    
    const processNodeForFile = processNodes[0];
    const isSubprocessFile = (hasCallActivityPointingToFile || !!processNodeForFile) && !isRootProcessFromMap;
    console.log(`   Is subprocess file: ${isSubprocessFile}`);
    console.log('');

    // 6. Check nodes in file
    const nodesInFile = Array.from(graph.allNodes.values()).filter(
      node => node.bpmnFile === fileName && node.type !== 'process'
    );
    console.log(`📝 Nodes in file (excluding process): ${nodesInFile.length}`);
    nodesInFile.slice(0, 10).forEach(node => {
      console.log(`   - ${node.type}: ${node.bpmnElementId} (${node.name || 'no name'})`);
    });
    if (nodesInFile.length > 10) {
      console.log(`   ... and ${nodesInFile.length - 10} more`);
    }
    console.log('');

    // 7. Check conditions for Feature Goal generation
    console.log('🔍 Conditions for Feature Goal generation:');
    console.log(`   1. isSubprocessFile: ${isSubprocessFile} ${isSubprocessFile ? '✅' : '❌'}`);
    console.log(`   2. nodesInFile.length > 0: ${nodesInFile.length > 0} ${nodesInFile.length > 0 ? '✅' : '❌'}`);
    console.log(`   3. processNodeForFile exists: ${!!processNodeForFile} ${processNodeForFile ? '✅' : '❌'}`);
    console.log('');

    const allConditionsMet = isSubprocessFile && nodesInFile.length > 0 && !!processNodeForFile;
    console.log(`📊 All conditions met: ${allConditionsMet ? '✅ YES' : '❌ NO'}`);
    
    if (!allConditionsMet) {
      console.log('\n⚠️  Feature Goal will NOT be generated because:');
      if (!isSubprocessFile) {
        console.log('   - File is not identified as a subprocess file');
        if (isRootProcessFromMap) {
          console.log('     Reason: File is identified as root process in bpmn-map.json');
        } else if (!processNodeForFile) {
          console.log('     Reason: No process node found in file');
        }
      }
      if (nodesInFile.length === 0) {
        console.log('   - No nodes found in file (only process node exists)');
      }
      if (!processNodeForFile) {
        console.log('   - No process node found in file');
      }
    } else {
      console.log('\n✅ All conditions are met - Feature Goal SHOULD be generated!');
      console.log('   If it wasn\'t generated, check:');
      console.log('   - Was generation actually run for this file?');
      console.log('   - Were there any errors during generation?');
      console.log('   - Was the file included in the generation scope?');
    }

  } catch (error) {
    console.error(`❌ Error building graph:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: tsx scripts/debug-feature-goal-generation.ts <bpmn-file-name>');
    console.error('Example: tsx scripts/debug-feature-goal-generation.ts mortgage-se-internal-data-gathering.bpmn');
    process.exit(1);
  }

  const fileName = args[0];
  await debugFeatureGoalGeneration(fileName);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});










