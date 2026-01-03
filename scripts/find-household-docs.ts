#!/usr/bin/env npx tsx

/**
 * Script to find documentation files for household BPMN file in Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
// Helper to get version hash directly from database
async function getCurrentVersionHash(fileName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('bpmn_files')
    .select('current_version_hash')
    .eq('file_name', fileName)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data.current_version_hash || null;
}

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
  console.error('❌ Missing Supabase credentials. Please set:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findHouseholdDocs() {
  const bpmnFileName = 'mortgage-se-household.bpmn';
  const fileBaseName = bpmnFileName.replace('.bpmn', '');
  
  console.log(`\n🔍 Söker efter dokumentation för: ${bpmnFileName}\n`);
  console.log('═'.repeat(70));
  
  // 1. Hämta version hash
  console.log('\n📋 Steg 1: Hämtar version hash...');
  const versionHash = await getCurrentVersionHash(bpmnFileName);
  console.log(`   Version hash: ${versionHash || 'null (ingen version hash)'}`);
  
  // 2. Lista alla möjliga sökvägar
  console.log('\n📋 Steg 2: Söker efter dokumentation i Storage...\n');
  
  const pathsToCheck = versionHash
    ? [
        // Versioned paths
        `docs/local/${bpmnFileName}/${versionHash}/nodes/${fileBaseName}`,
        `docs/slow/chatgpt/${bpmnFileName}/${versionHash}/nodes/${fileBaseName}`,
        `docs/slow/ollama/${bpmnFileName}/${versionHash}/nodes/${fileBaseName}`,
        `docs/slow/${bpmnFileName}/${versionHash}/nodes/${fileBaseName}`,
        `docs/local/${bpmnFileName}/${versionHash}/feature-goals`,
        `docs/slow/chatgpt/${bpmnFileName}/${versionHash}/feature-goals`,
        `docs/slow/ollama/${bpmnFileName}/${versionHash}/feature-goals`,
        `docs/slow/${bpmnFileName}/${versionHash}/feature-goals`,
        // Legacy paths
        `docs/nodes/${fileBaseName}`,
        `docs/feature-goals`,
        `docs/local/nodes/${fileBaseName}`,
        `docs/local/feature-goals`,
        `docs/slow/chatgpt/nodes/${fileBaseName}`,
        `docs/slow/chatgpt/feature-goals`,
        `docs/slow/ollama/nodes/${fileBaseName}`,
        `docs/slow/ollama/feature-goals`,
        `docs/slow/nodes/${fileBaseName}`,
        `docs/slow/feature-goals`,
      ]
    : [
        // Legacy paths (no version hash)
        `docs/nodes/${fileBaseName}`,
        `docs/feature-goals`,
        `docs/local/nodes/${fileBaseName}`,
        `docs/local/feature-goals`,
        `docs/slow/chatgpt/nodes/${fileBaseName}`,
        `docs/slow/chatgpt/feature-goals`,
        `docs/slow/ollama/nodes/${fileBaseName}`,
        `docs/slow/ollama/feature-goals`,
        `docs/slow/nodes/${fileBaseName}`,
        `docs/slow/feature-goals`,
      ];
  
  const foundFiles: Array<{ path: string; size: number; updated: string }> = [];
  
  for (const path of pathsToCheck) {
    try {
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .list(path, {
          limit: 1000,
        });
      
      if (!error && data && data.length > 0) {
        for (const file of data) {
          if (file.name.endsWith('.html')) {
            foundFiles.push({
              path: `${path}/${file.name}`,
              size: file.metadata?.size || 0,
              updated: file.updated_at || file.created_at || 'unknown',
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors, continue searching
    }
  }
  
  // 3. Visa resultat
  if (foundFiles.length === 0) {
    console.log('❌ Inga dokumentationsfiler hittades!\n');
    console.log('💡 Tips:');
    console.log('   - Kontrollera att genereringen har körts klart');
    console.log('   - Kontrollera att filen finns i bpmn_files tabellen');
    console.log('   - Kontrollera att version hash är korrekt');
  } else {
    console.log(`✅ Hittade ${foundFiles.length} dokumentationsfil(er):\n`);
    
    // Gruppera efter typ
    const nodeDocs = foundFiles.filter(f => f.path.includes('/nodes/'));
    const featureGoalDocs = foundFiles.filter(f => f.path.includes('/feature-goals/'));
    
    if (nodeDocs.length > 0) {
      console.log('📄 User Task / Epic dokumentation:');
      console.log('─'.repeat(70));
      for (const file of nodeDocs) {
        const sizeKB = (file.size / 1024).toFixed(2);
        console.log(`   ${file.path}`);
        console.log(`   Storlek: ${sizeKB} KB, Uppdaterad: ${file.updated}`);
        console.log('');
      }
    }
    
    if (featureGoalDocs.length > 0) {
      console.log('🎯 Feature Goal dokumentation:');
      console.log('─'.repeat(70));
      for (const file of featureGoalDocs) {
        const sizeKB = (file.size / 1024).toFixed(2);
        console.log(`   ${file.path}`);
        console.log(`   Storlek: ${sizeKB} KB, Uppdaterad: ${file.updated}`);
        console.log('');
      }
    }
    
    // Visa direktlänkar
    console.log('\n🔗 Direktlänkar i Supabase Dashboard:');
    console.log('─'.repeat(70));
    console.log('   1. Gå till Supabase Dashboard → Storage → bpmn-files');
    console.log('   2. Navigera till mappen: docs/');
    if (versionHash) {
      console.log(`   3. Leta efter: ${bpmnFileName}/${versionHash}/`);
    } else {
      console.log(`   3. Leta efter: nodes/${fileBaseName}/ eller feature-goals/`);
    }
  }
  
  // 4. Visa SQL query för att hitta i databasen
  console.log('\n📊 SQL Query för att hitta i databasen:');
  console.log('─'.repeat(70));
  console.log(`
SELECT 
  file_name,
  current_version_hash,
  current_version_number,
  created_at,
  updated_at
FROM bpmn_files
WHERE file_name = '${bpmnFileName}';
  `);
}

findHouseholdDocs().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});



















