#!/usr/bin/env tsx
/**
 * Diagnostiskt script för att förstå varför process-noder inte hittas för vissa subprocess-filer.
 * 
 * Detta script:
 * 1. Laddar alla BPMN-filer från fixtures
 * 2. Bygger grafen
 * 3. Identifierar vilka filer som är subprocess-filer
 * 4. Kontrollerar om process-noder finns för dessa filer
 * 5. Rapporterar vilka som saknas och varför
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseBpmnFile } from '../src/lib/bpmnParser';
import { buildBpmnProcessGraphFromParseResults } from '../src/lib/bpmnProcessGraph';
import { loadAndParseMultipleBpmnFiles } from '../tests/helpers/bpmnTestHelpers';

interface BpmnMap {
  orchestration?: { root_process?: string };
  processes?: Array<{
    id: string;
    bpmn_file: string;
    process_id: string;
    call_activities?: Array<{
      bpmn_id: string;
      name: string;
      subprocess_bpmn_file: string;
    }>;
  }>;
}

async function main() {
  console.log('🔍 Diagnostiserar saknade process-noder för subprocess-filer...\n');
  
  // Load bpmn-map.json
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  const bpmnMap: BpmnMap = JSON.parse(await readFile(bpmnMapPath, 'utf-8'));
  const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
  const rootFile = `${rootProcess}.bpmn`;
  
  // Get all BPMN files
  const allBpmnFiles = Array.from(new Set(
    bpmnMap.processes?.map(p => p.bpmn_file) || [rootFile]
  ));
  
  console.log(`📁 Totalt ${allBpmnFiles.length} BPMN-filer att analysera\n`);
  
  // Load and parse all BPMN files
  console.log('📖 Laddar och parsar BPMN-filer...');
  const parseResults = await loadAndParseMultipleBpmnFiles(allBpmnFiles);
  console.log(`✅ ${parseResults.size} filer parsade\n`);
  
  // Build graph
  console.log('🔨 Bygger process-graf...');
  const graph = buildBpmnProcessGraphFromParseResults(rootFile, parseResults);
  console.log(`✅ Graf byggd med ${graph.allNodes.size} noder\n`);
  
  // Identify subprocess files
  const subprocessFiles = new Set<string>();
  bpmnMap.processes?.forEach(process => {
    if (process.bpmn_file !== rootFile) {
      subprocessFiles.add(process.bpmn_file);
    }
  });
  
  console.log(`📋 Identifierar subprocess-filer (${subprocessFiles.size} st):`);
  Array.from(subprocessFiles).forEach(f => console.log(`  - ${f}`));
  console.log();
  
  // Check each subprocess file
  const results: Array<{
    file: string;
    isSubprocessFile: boolean;
    hasProcessNode: boolean;
    processNode?: { id: string; elementId: string; type: string };
    nodesInFile: number;
    nodeTypes: Record<string, number>;
    hasCallActivityPointingToFile: boolean;
    isRootProcessFromMap: boolean;
  }> = [];
  
  for (const file of Array.from(subprocessFiles)) {
    const nodesInFile = Array.from(graph.allNodes.values()).filter(
      node => node.bpmnFile === file
    );
    
    const processNodeForFile = Array.from(graph.allNodes.values()).find(
      node => node.type === 'process' && node.bpmnFile === file
    );
    
    const hasCallActivityPointingToFile = Array.from(graph.allNodes.values()).some(
      node => node.type === 'callActivity' && node.subprocessFile === file
    );
    
    const fileBaseName = file.replace('.bpmn', '');
    const isRootProcessFromMap = rootProcess && (fileBaseName === rootProcess || file === `${rootProcess}.bpmn`);
    
    const isSubprocessFile = (hasCallActivityPointingToFile || !!processNodeForFile) && !isRootProcessFromMap;
    
    // Count node types
    const nodeTypes: Record<string, number> = {};
    nodesInFile.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });
    
    results.push({
      file,
      isSubprocessFile,
      hasProcessNode: !!processNodeForFile,
      processNode: processNodeForFile ? {
        id: processNodeForFile.id,
        elementId: processNodeForFile.bpmnElementId,
        type: processNodeForFile.type,
      } : undefined,
      nodesInFile: nodesInFile.length,
      nodeTypes,
      hasCallActivityPointingToFile,
      isRootProcessFromMap,
    });
  }
  
  // Report results
  console.log('📊 Resultat:\n');
  
  const withProcessNode = results.filter(r => r.hasProcessNode);
  const withoutProcessNode = results.filter(r => !r.hasProcessNode);
  
  console.log(`✅ Filer MED process-nod (${withProcessNode.length}):`);
  withProcessNode.forEach(r => {
    console.log(`  ✓ ${r.file}`);
    console.log(`    - Process node: ${r.processNode?.elementId} (${r.processNode?.type})`);
    console.log(`    - Totalt noder i fil: ${r.nodesInFile}`);
    console.log(`    - Nodtyper: ${JSON.stringify(r.nodeTypes)}`);
    console.log(`    - Har callActivity som pekar på filen: ${r.hasCallActivityPointingToFile}`);
    console.log();
  });
  
  console.log(`\n❌ Filer UTAN process-nod (${withoutProcessNode.length}):`);
  withoutProcessNode.forEach(r => {
    console.log(`  ✗ ${r.file}`);
    console.log(`    - Totalt noder i fil: ${r.nodesInFile}`);
    console.log(`    - Nodtyper: ${JSON.stringify(r.nodeTypes)}`);
    console.log(`    - Har callActivity som pekar på filen: ${r.hasCallActivityPointingToFile}`);
    console.log(`    - Är root-process enligt map: ${r.isRootProcessFromMap}`);
    console.log(`    - Identifierad som subprocess-fil: ${r.isSubprocessFile}`);
    
    // Check if file exists in parse results
    const parseResult = parseResults.get(r.file);
    if (parseResult) {
      // Check if there's a process element in the parsed XML
      const hasProcessInXml = parseResult.processes && parseResult.processes.length > 0;
      console.log(`    - Process i parsed XML: ${hasProcessInXml ? '✅' : '❌'}`);
      if (hasProcessInXml) {
        console.log(`    - Process IDs i XML: ${parseResult.processes.map(p => p.id).join(', ')}`);
      }
    } else {
      console.log(`    - ⚠️  Filen kunde inte parsas eller hittades inte i fixtures`);
    }
    console.log();
  });
  
  // Summary
  console.log('\n📈 Sammanfattning:');
  console.log(`  - Totalt subprocess-filer: ${subprocessFiles.size}`);
  console.log(`  - Med process-nod: ${withProcessNode.length}`);
  console.log(`  - Utan process-nod: ${withoutProcessNode.length}`);
  console.log(`  - Skillnad: ${subprocessFiles.size - withProcessNode.length} saknas`);
  
  // Check if missing ones have processes in XML
  console.log('\n🔍 Detaljerad analys av saknade:');
  for (const r of withoutProcessNode) {
    const parseResult = parseResults.get(r.file);
    if (parseResult && parseResult.processes && parseResult.processes.length > 0) {
      console.log(`\n  ${r.file}:`);
      console.log(`    - Process i XML: ✅ (${parseResult.processes.length} st)`);
      parseResult.processes.forEach(p => {
        console.log(`      - Process ID: ${p.id}`);
        console.log(`      - Process name: ${p.name || 'N/A'}`);
      });
      
      // Check if process node exists in graph but with different file
      const processNodesInGraph = Array.from(graph.allNodes.values()).filter(
        node => node.type === 'process' && node.bpmnElementId === parseResult.processes[0].id
      );
      if (processNodesInGraph.length > 0) {
        console.log(`    - ⚠️  Process-nod finns i grafen men med annan fil:`);
        processNodesInGraph.forEach(n => {
          console.log(`      - Fil: ${n.bpmnFile}, Element ID: ${n.bpmnElementId}`);
        });
      }
    }
  }
}

main().catch(console.error);
