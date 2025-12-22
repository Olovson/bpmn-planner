/**
 * @vitest-environment jsdom
 * 
 * Diagnostiskt test för att förstå varför process-noder inte hittas för vissa subprocess-filer.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildBpmnProcessGraphFromParseResults } from '@/lib/bpmnProcessGraph';
import { loadAndParseMultipleBpmnFiles } from '../helpers/bpmnTestHelpers';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import fs from 'fs';
import { resolve } from 'path';

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

// Mock Storage
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(async () => ({ data: [], error: null })),
        download: vi.fn(async () => ({ data: null, error: null })),
      })),
    },
  },
}));

describe('Diagnostisera saknade process-noder', () => {
  it('analyserar varför process-noder saknas för subprocess-filer', async () => {
    // Load bpmn-map.json
    const bpmnMapPath = resolve(__dirname, '../../bpmn-map.json');
    const bpmnMap: BpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
    const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
    const rootFile = `${rootProcess}.bpmn`;
    
    // Get all BPMN files
    const allBpmnFiles = Array.from(new Set(
      bpmnMap.processes?.map(p => p.bpmn_file) || [rootFile]
    ));
    
    console.log(`\n📁 Totalt ${allBpmnFiles.length} BPMN-filer att analysera\n`);
    
    // Load and parse all BPMN files
    console.log('📖 Laddar och parsar BPMN-filer...');
    const parseResults = await loadAndParseMultipleBpmnFiles(allBpmnFiles);
    console.log(`✅ ${parseResults.size} filer parsade\n`);
    
    // Check if object-control callActivity exists in parseResult
    const manualCreditEvalParse = parseResults.get('mortgage-se-manual-credit-evaluation.bpmn');
    if (manualCreditEvalParse) {
      const objectControlCallActivity = manualCreditEvalParse.callActivities?.find(
        ca => ca.id === 'object-control'
      );
      console.log(`\n🔍 DEBUG: object-control callActivity i parseResult:`);
      console.log(`  - Finns: ${objectControlCallActivity ? '✅' : '❌'}`);
      if (objectControlCallActivity) {
        console.log(`  - ID: ${objectControlCallActivity.id}`);
        console.log(`  - Name: ${objectControlCallActivity.name}`);
        console.log(`  - CalledElement: ${(objectControlCallActivity as any).calledElement || 'N/A'}`);
      }
      
      // Check all callActivities in the process
      const allCallActivities = manualCreditEvalParse.meta?.processes?.[0]?.callActivities || [];
      console.log(`  - Totalt callActivities i process: ${allCallActivities.length}`);
      allCallActivities.forEach(ca => {
        console.log(`    - ${ca.id} (${ca.name})`);
      });
      
      // Check all processes in meta
      const allProcesses = manualCreditEvalParse.meta?.processes || [];
      console.log(`  - Totalt processes i meta: ${allProcesses.length}`);
      allProcesses.forEach((proc, idx) => {
        console.log(`    - Process ${idx}: id=${proc.id}, name=${proc.name}, callActivities=${proc.callActivities?.length || 0}`);
      });
      
      // Check raw callActivities array
      const rawCallActivities = manualCreditEvalParse.callActivities || [];
      console.log(`  - Totalt callActivities i raw array: ${rawCallActivities.length}`);
      rawCallActivities.forEach(ca => {
        console.log(`    - ${ca.id} (${ca.name})`);
      });
      
      // Check all elements to see if object-control exists
      const allElements = manualCreditEvalParse.elements || [];
      const objectControlElement = allElements.find(e => e.id === 'object-control');
      console.log(`  - object-control element i elements array: ${objectControlElement ? '✅' : '❌'}`);
      if (objectControlElement) {
        console.log(`    - Type: ${objectControlElement.type}`);
        console.log(`    - Name: ${objectControlElement.name}`);
        console.log(`    - BusinessObject type: ${objectControlElement.businessObject?.$type}`);
      }
      
      // Check all callActivity elements
      const allCallActivityElements = allElements.filter(e => 
        e.type === 'bpmn:CallActivity' || 
        e.businessObject?.$type === 'bpmn:CallActivity'
      );
      console.log(`  - Totalt CallActivity elements i elements array: ${allCallActivityElements.length}`);
      allCallActivityElements.forEach(ca => {
        console.log(`    - ${ca.id} (${ca.name}) - type: ${ca.type}, boType: ${ca.businessObject?.$type}`);
      });
      
      // Check if Activity_1gzlxx4 exists (the other callActivity)
      const activity1gzlxx4 = allElements.find(e => e.id === 'Activity_1gzlxx4');
      console.log(`  - Activity_1gzlxx4 element i elements array: ${activity1gzlxx4 ? '✅' : '❌'}`);
      if (activity1gzlxx4) {
        console.log(`    - Type: ${activity1gzlxx4.type}`);
        console.log(`    - Name: ${activity1gzlxx4.name}`);
        console.log(`    - BusinessObject type: ${activity1gzlxx4.businessObject?.$type}`);
        console.log(`    - CalledElement: ${activity1gzlxx4.businessObject?.calledElement}`);
      }
      
      // Check all elements with "object" or "control" in name/id
      const objectControlRelated = allElements.filter(e => 
        e.id.toLowerCase().includes('object') || 
        e.id.toLowerCase().includes('control') ||
        e.name?.toLowerCase().includes('object') ||
        e.name?.toLowerCase().includes('control')
      );
      console.log(`  - Element relaterade till "object" eller "control": ${objectControlRelated.length}`);
      objectControlRelated.forEach(e => {
        console.log(`    - ${e.id} (${e.name}) - type: ${e.type}`);
      });
    }
    
    // Load bpmn-map.json for matching
    let bpmnMapForGraph: BpmnMap | undefined;
    try {
      const bpmnMapPath = resolve(__dirname, '../../bpmn-map.json');
      const bpmnMapRaw = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
      bpmnMapForGraph = loadBpmnMap(bpmnMapRaw);
    } catch (fileError) {
      console.warn('⚠️  Kunde inte ladda bpmn-map.json:', fileError);
    }
    
    // Build graph
    console.log('🔨 Bygger process-graf...');
    const graph = await buildBpmnProcessGraphFromParseResults(rootFile, parseResults, bpmnMapForGraph);
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
      processesInXml?: string[];
      callActivitiesPointingToFile?: Array<{ id: string; bpmnFile: string; elementId: string; name: string }>;
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
      
      // Check if file exists in parse results
      const parseResult = parseResults.get(file);
      const processesInXml = parseResult?.processes?.map(p => p.id);
      
      // Find which callActivity points to this file
      const callActivitiesPointingToFile = Array.from(graph.allNodes.values())
        .filter(node => node.type === 'callActivity' && node.subprocessFile === file)
        .map(node => ({
          id: node.id,
          bpmnFile: node.bpmnFile,
          elementId: node.bpmnElementId,
          name: node.name,
        }));
      
      // Also check all callActivities in manual-credit-evaluation to see if object-control is there
      if (file === 'mortgage-se-object-control.bpmn') {
        const manualCreditEvalNodes = Array.from(graph.allNodes.values())
          .filter(node => node.bpmnFile === 'mortgage-se-manual-credit-evaluation.bpmn');
        const callActivitiesInManual = manualCreditEvalNodes
          .filter(node => node.type === 'callActivity')
          .map(node => ({
            id: node.id,
            elementId: node.bpmnElementId,
            name: node.name,
            subprocessFile: node.subprocessFile,
            missingDefinition: node.missingDefinition,
          }));
        console.log(`\n🔍 DEBUG: CallActivities i mortgage-se-manual-credit-evaluation.bpmn:`);
        callActivitiesInManual.forEach(ca => {
          console.log(`  - ${ca.elementId} (${ca.name}): subprocessFile=${ca.subprocessFile}, missingDefinition=${ca.missingDefinition}`);
        });
        
        // Check if object-control callActivity exists at all
        const objectControlCallActivity = Array.from(graph.allNodes.values())
          .find(node => node.bpmnElementId === 'object-control' && node.type === 'callActivity');
        if (objectControlCallActivity) {
          console.log(`\n🔍 DEBUG: object-control callActivity finns i grafen:`);
          console.log(`  - ID: ${objectControlCallActivity.id}`);
          console.log(`  - bpmnFile: ${objectControlCallActivity.bpmnFile}`);
          console.log(`  - subprocessFile: ${objectControlCallActivity.subprocessFile}`);
          console.log(`  - missingDefinition: ${objectControlCallActivity.missingDefinition}`);
        } else {
          console.log(`\n🔍 DEBUG: object-control callActivity finns INTE i grafen!`);
        }
      }
      
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
        processesInXml,
        callActivitiesPointingToFile,
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
      if (r.callActivitiesPointingToFile && r.callActivitiesPointingToFile.length > 0) {
        console.log(`    - CallActivities som pekar på filen:`);
        r.callActivitiesPointingToFile.forEach(ca => {
          console.log(`      - ${ca.bpmnFile}::${ca.elementId} (${ca.name})`);
        });
      } else {
        console.log(`    - ⚠️  INGEN callActivity pekar på denna fil i grafen!`);
      }
      console.log(`    - Är root-process enligt map: ${r.isRootProcessFromMap}`);
      console.log(`    - Identifierad som subprocess-fil: ${r.isSubprocessFile}`);
      console.log(`    - Process i parsed XML: ${r.processesInXml ? `✅ (${r.processesInXml.join(', ')})` : '❌'}`);
      
      // Check if process node exists in graph but with different file
      if (r.processesInXml && r.processesInXml.length > 0) {
        const processNodesInGraph = Array.from(graph.allNodes.values()).filter(
          node => node.type === 'process' && node.bpmnElementId === r.processesInXml[0]
        );
        if (processNodesInGraph.length > 0) {
          console.log(`    - ⚠️  Process-nod finns i grafen men med annan fil:`);
          processNodesInGraph.forEach(n => {
            console.log(`      - Fil: ${n.bpmnFile}, Element ID: ${n.bpmnElementId}`);
          });
        }
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
    const missingWithProcessInXml = withoutProcessNode.filter(r => r.processesInXml && r.processesInXml.length > 0);
    console.log(`\n🔍 ${missingWithProcessInXml.length} saknade filer HAR process i XML men INTE i grafen:`);
    missingWithProcessInXml.forEach(r => {
      console.log(`  - ${r.file}: Process ID i XML: ${r.processesInXml?.join(', ')}`);
    });
    
    // This test always passes - it's just for diagnostics
    expect(true).toBe(true);
  });
});
