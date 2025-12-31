#!/usr/bin/env npx tsx

/**
 * Script to compare Feature Goal generation conditions between household and internal-data-gathering files
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildBpmnProcessGraph, createGraphSummary } from '../src/lib/bpmnProcessGraph';
import { loadBpmnMap } from '../src/lib/bpmn/bpmnMapLoader';

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

async function compareFeatureGoalGeneration() {
  const filesToCompare = [
    'mortgage-se-household.bpmn',
    'mortgage-se-internal-data-gathering.bpmn',
  ];
  
  console.log('\n🔍 Jämför Feature Goal-genereringsvillkor\n');
  console.log('═'.repeat(70));
  
  for (const fileName of filesToCompare) {
    console.log(`\n📄 Analyserar: ${fileName}\n`);
    console.log('─'.repeat(70));
    
    try {
      // 1. Hämta filen från Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('bpmn-files')
        .download(fileName);
      
      if (downloadError || !fileData) {
        console.log(`❌ Kunde inte ladda filen: ${downloadError?.message || 'No data'}`);
        continue;
      }
      
      const xmlContent = await fileData.text();
      console.log(`✅ Fil laddad: ${xmlContent.length} bytes`);
      
      // 2. Hämta alla BPMN-filer för kontext
      const { data: allFiles } = await supabase
        .from('bpmn_files')
        .select('file_name')
        .eq('file_type', 'bpmn');
      
      const existingBpmnFiles = (allFiles || []).map(f => f.file_name);
      console.log(`📋 Totalt ${existingBpmnFiles.length} BPMN-filer i systemet`);
      
      // 3. Bygg graf (isolated generation - bara denna fil)
      const graphFileScope = [fileName];
      const versionHashes = new Map<string, string | null>();
      
      // Hämta version hash
      const { data: fileInfo } = await supabase
        .from('bpmn_files')
        .select('current_version_hash')
        .eq('file_name', fileName)
        .maybeSingle();
      
      if (fileInfo?.current_version_hash) {
        versionHashes.set(fileName, fileInfo.current_version_hash);
        console.log(`🔑 Version hash: ${fileInfo.current_version_hash.substring(0, 16)}...`);
      }
      
      const graph = await buildBpmnProcessGraph(fileName, graphFileScope, versionHashes);
      const summary = createGraphSummary(graph);
      
      console.log(`\n📊 Graf sammanfattning:`);
      console.log(`   Totala noder: ${graph.allNodes.size}`);
      console.log(`   Filer inkluderade: ${summary.filesIncluded.length}`);
      console.log(`   Root process: ${summary.rootProcessId || 'ingen'}`);
      
      // 4. Hitta process-nod för filen
      const processNodeForFile = Array.from(graph.allNodes.values()).find(
        node => node.type === 'process' && node.bpmnFile === fileName
      );
      
      console.log(`\n🔍 Process-nod för filen:`);
      if (processNodeForFile) {
        console.log(`   ✅ Hittad: ${processNodeForFile.bpmnElementId} (${processNodeForFile.name || 'no name'})`);
        console.log(`   ID: ${processNodeForFile.id}`);
        console.log(`   bpmnFile: ${processNodeForFile.bpmnFile}`);
      } else {
        console.log(`   ❌ INGEN process-nod hittades!`);
      }
      
      // 5. Hitta noder i filen (exklusive process-nod)
      const nodesInFile = Array.from(graph.allNodes.values()).filter(
        node => node.bpmnFile === fileName && node.type !== 'process'
      );
      
      console.log(`\n📝 Noder i filen (exklusive process): ${nodesInFile.length}`);
      nodesInFile.forEach(node => {
        console.log(`   - ${node.type}: ${node.bpmnElementId} (${node.name || 'no name'})`);
      });
      
      // 6. Kolla om det finns callActivity som pekar på filen
      const testableNodes = Array.from(graph.allNodes.values()).filter(
        node => ['userTask', 'serviceTask', 'businessRuleTask', 'callActivity'].includes(node.type)
      );
      
      const hasCallActivityPointingToFile = testableNodes.some(
        node => node.type === 'callActivity' && node.subprocessFile === fileName
      );
      
      console.log(`\n🔗 CallActivity som pekar på filen:`);
      console.log(`   ${hasCallActivityPointingToFile ? '✅ JA' : '❌ NEJ'}`);
      
      if (hasCallActivityPointingToFile) {
        const pointingCallActivities = testableNodes.filter(
          node => node.type === 'callActivity' && node.subprocessFile === fileName
        );
        pointingCallActivities.forEach(node => {
          console.log(`   - ${node.bpmnElementId} i ${node.bpmnFile}`);
        });
      }
      
      // 7. Kolla om filen är root-process enligt bpmn-map.json
      const bpmnMap = await loadBpmnMap();
      const rootProcessId = bpmnMap?.rootProcessId;
      const fileBaseName = fileName.replace('.bpmn', '');
      const isRootProcessFromMap = rootProcessId && (fileBaseName === rootProcessId || fileName === `${rootProcessId}.bpmn`);
      
      console.log(`\n🗺️  Root-process check:`);
      console.log(`   Root process från map: ${rootProcessId || 'ingen'}`);
      console.log(`   Fil base name: ${fileBaseName}`);
      console.log(`   Är root-process: ${isRootProcessFromMap ? '✅ JA' : '❌ NEJ'}`);
      
      // 8. Beräkna isSubprocessFile
      const isSubprocessFile = (hasCallActivityPointingToFile || !!processNodeForFile) && !isRootProcessFromMap;
      
      console.log(`\n🎯 Feature Goal-genereringsvillkor:`);
      console.log(`   1. isSubprocessFile: ${isSubprocessFile} ${isSubprocessFile ? '✅' : '❌'}`);
      console.log(`   2. nodesInFile.length > 0: ${nodesInFile.length > 0} ${nodesInFile.length > 0 ? '✅' : '❌'}`);
      console.log(`   3. processNodeForFile exists: ${!!processNodeForFile} ${processNodeForFile ? '✅' : '❌'}`);
      
      const allConditionsMet = isSubprocessFile && nodesInFile.length > 0 && !!processNodeForFile;
      console.log(`\n📊 Alla villkor uppfyllda: ${allConditionsMet ? '✅ JA - Feature Goal SKA genereras' : '❌ NEJ - Feature Goal genereras INTE'}`);
      
      if (!allConditionsMet) {
        console.log(`\n⚠️  Varför Feature Goal INTE genereras:`);
        if (!isSubprocessFile) {
          console.log(`   - Filen identifieras INTE som subprocess`);
          if (!hasCallActivityPointingToFile && !processNodeForFile) {
            console.log(`     (ingen callActivity pekar på filen OCH ingen process-nod hittades)`);
          } else if (isRootProcessFromMap) {
            console.log(`     (filen är root-process enligt bpmn-map.json)`);
          }
        }
        if (nodesInFile.length === 0) {
          console.log(`   - Inga noder hittades i filen (bara process-nod finns)`);
        }
        if (!processNodeForFile) {
          console.log(`   - Ingen process-nod hittades för filen`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Fel vid analys av ${fileName}:`, error);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 Tips:');
  console.log('   - Om process-nod saknas, kontrollera att BPMN-filen har en <process> element');
  console.log('   - Om noder saknas, kontrollera att filen faktiskt innehåller tasks/epics');
  console.log('   - Om filen identifieras som root, kontrollera bpmn-map.json');
}

compareFeatureGoalGeneration().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


















