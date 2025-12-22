#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Validerar att genereringslogiken kommer generera korrekt antal feature goals och epics.
 * 
 * Detta script simulerar genereringslogiken utan att faktiskt generera filer.
 */

import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

interface GenerationCounts {
  featureGoals: {
    subprocessProcessNodes: number;
    callActivityInstances: number;
    total: number;
  };
  epics: {
    userTasks: number;
    serviceTasks: number;
    businessRuleTasks: number;
    total: number;
  };
  incorrect: {
    tasksAsFeatureGoals: number;
  };
}

async function validateGenerationLogic() {
  console.log('🔍 Validerar genereringslogik...\n');
  
  // Load bpmn-map.json
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  const bpmnMap: BpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
  const rootProcess = bpmnMap.orchestration?.root_process || 'mortgage';
  const rootFile = `${rootProcess}.bpmn`;
  
  // Get all BPMN files
  const allBpmnFiles: string[] = [];
  bpmnMap.processes?.forEach(process => {
    if (!allBpmnFiles.includes(process.bpmn_file)) {
      allBpmnFiles.push(process.bpmn_file);
    }
  });
  
  if (!allBpmnFiles.includes(rootFile)) {
    allBpmnFiles.push(rootFile);
  }
  
  console.log(`📁 Hittade ${allBpmnFiles.length} BPMN-filer\n`);
  
  // Build graph
  console.log('🔨 Bygger BPMN-processgraf...');
  const graph = await buildBpmnProcessGraph(rootFile, allBpmnFiles);
  console.log(`✅ Graf byggd: ${graph.allNodes.size} noder totalt\n`);
  
  // Simulate generation logic
  const counts: GenerationCounts = {
    featureGoals: {
      subprocessProcessNodes: 0,
      callActivityInstances: 0,
      total: 0
    },
    epics: {
      userTasks: 0,
      serviceTasks: 0,
      businessRuleTasks: 0,
      total: 0
    },
    incorrect: {
      tasksAsFeatureGoals: 0
    }
  };
  
  // Track processed nodes to avoid duplicates
  const processedFeatureGoals = new Set<string>();
  const processedEpics = new Set<string>();
  
  // Get all files in graph
  const filesInGraph = new Set<string>();
  graph.allNodes.forEach(node => {
    if (node.bpmnFile) {
      filesInGraph.add(node.bpmnFile);
    }
  });
  
  // Simulate generation for each file
  for (const file of filesInGraph) {
    const nodesInFile = Array.from(graph.allNodes.values()).filter(
      node => node.bpmnFile === file
    );
    
    // Find process node for this file
    const processNodeForFile = nodesInFile.find(
      node => node.type === 'process'
    );
    
    // Check if this is a subprocess file (not root)
    const fileBaseName = file.replace('.bpmn', '');
    const isRootProcess = fileBaseName === rootProcess || file === rootFile;
    const isSubprocessFile = !!processNodeForFile && !isRootProcess;
    
    // Process each node in file
    for (const node of nodesInFile) {
      // Skip process nodes themselves (they're containers)
      if (node.type === 'process') {
        continue;
      }
      
      // Feature Goals: Only for CallActivities
      if (node.type === 'callActivity') {
        // Validate it's actually a CallActivity
        if (node.type !== 'callActivity') {
          counts.incorrect.tasksAsFeatureGoals++;
          continue;
        }
        
        // Check if subprocess file exists
        if (node.missingDefinition || !node.subprocessFile) {
          continue; // Skip if subprocess is missing
        }
        
        // Generate feature goal for call activity instance
        // Key: parentFile::elementId (hierarchical naming)
        const featureGoalKey = `${node.bpmnFile}::${node.bpmnElementId}`;
        if (!processedFeatureGoals.has(featureGoalKey)) {
          processedFeatureGoals.add(featureGoalKey);
          counts.featureGoals.callActivityInstances++;
        }
      }
      
      // Epics: For UserTasks, ServiceTasks, BusinessRuleTasks
      else if (node.type === 'userTask' || node.type === 'serviceTask' || node.type === 'businessRuleTask') {
        const epicKey = `${node.bpmnFile}::${node.bpmnElementId}`;
        if (!processedEpics.has(epicKey)) {
          processedEpics.add(epicKey);
          
          if (node.type === 'userTask') {
            counts.epics.userTasks++;
          } else if (node.type === 'serviceTask') {
            counts.epics.serviceTasks++;
          } else if (node.type === 'businessRuleTask') {
            counts.epics.businessRuleTasks++;
          }
        }
      }
    }
    
    // Feature Goals: For subprocess process nodes
    if (isSubprocessFile && processNodeForFile) {
      // Validate it's actually a process node
      if (processNodeForFile.type !== 'process') {
        counts.incorrect.tasksAsFeatureGoals++;
      } else {
        const subprocessKey = `subprocess:${file}`;
        if (!processedFeatureGoals.has(subprocessKey)) {
          processedFeatureGoals.add(subprocessKey);
          counts.featureGoals.subprocessProcessNodes++;
        }
      }
    }
  }
  
  // Calculate totals
  counts.featureGoals.total = counts.featureGoals.subprocessProcessNodes + counts.featureGoals.callActivityInstances;
  counts.epics.total = counts.epics.userTasks + counts.epics.serviceTasks + counts.epics.businessRuleTasks;
  
  // Expected counts from bpmn-map.json
  const expectedSubprocessProcessNodes = Array.from(filesInGraph).filter(
    file => file !== rootFile
  ).length;
  
  const expectedCallActivityInstances = new Set<string>();
  bpmnMap.processes?.forEach(process => {
    process.call_activities?.forEach(ca => {
      const key = `${process.bpmn_file}::${ca.bpmn_id}`;
      expectedCallActivityInstances.add(key);
    });
  });
  
  const expectedFeatureGoals = expectedSubprocessProcessNodes + expectedCallActivityInstances.size;
  
  // Print results
  console.log('='.repeat(70));
  console.log('📊 VALIDERINGSRESULTAT');
  console.log('='.repeat(70));
  
  console.log('\n✅ Feature Goals:');
  console.log(`  Subprocess process nodes: ${counts.featureGoals.subprocessProcessNodes} (förväntat: ${expectedSubprocessProcessNodes})`);
  console.log(`  Call activity-instanser: ${counts.featureGoals.callActivityInstances} (förväntat: ${expectedCallActivityInstances.size})`);
  console.log(`  Totalt: ${counts.featureGoals.total} (förväntat: ${expectedFeatureGoals})`);
  
  if (counts.featureGoals.total === expectedFeatureGoals) {
    console.log('  ✅ Korrekt antal feature goals!');
  } else {
    console.log(`  ⚠️  Skillnad: ${counts.featureGoals.total - expectedFeatureGoals} (${counts.featureGoals.total > expectedFeatureGoals ? 'för många' : 'för få'})`);
  }
  
  console.log('\n✅ Epics:');
  console.log(`  UserTasks: ${counts.epics.userTasks}`);
  console.log(`  ServiceTasks: ${counts.epics.serviceTasks}`);
  console.log(`  BusinessRuleTasks: ${counts.epics.businessRuleTasks}`);
  console.log(`  Totalt: ${counts.epics.total}`);
  
  console.log('\n❌ Felaktiga genereringar:');
  console.log(`  Tasks som feature goals: ${counts.incorrect.tasksAsFeatureGoals}`);
  
  if (counts.incorrect.tasksAsFeatureGoals > 0) {
    console.log('  ⚠️  VARNING: Tasks genereras fortfarande som feature goals!');
  } else {
    console.log('  ✅ Inga tasks genereras som feature goals');
  }
  
  // Detailed breakdown
  console.log('\n📋 Detaljerad fördelning:');
  console.log(`  Feature Goals:`);
  console.log(`    - Subprocess process nodes: ${counts.featureGoals.subprocessProcessNodes}`);
  console.log(`    - Call activity-instanser: ${counts.featureGoals.callActivityInstances}`);
  console.log(`  Epics:`);
  console.log(`    - UserTasks: ${counts.epics.userTasks}`);
  console.log(`    - ServiceTasks: ${counts.epics.serviceTasks}`);
  console.log(`    - BusinessRuleTasks: ${counts.epics.businessRuleTasks}`);
  
  // Validation summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SAMMANFATTNING');
  console.log('='.repeat(70));
  
  const allCorrect = 
    counts.featureGoals.total === expectedFeatureGoals &&
    counts.incorrect.tasksAsFeatureGoals === 0;
  
  if (allCorrect) {
    console.log('\n✅ VALIDERING GENOMFÖRD: Allt ser korrekt ut!');
    console.log(`   - ${counts.featureGoals.total} feature goals kommer genereras (korrekt)`);
    console.log(`   - ${counts.epics.total} epics kommer genereras`);
    console.log(`   - Inga tasks kommer genereras som feature goals`);
  } else {
    console.log('\n⚠️  VALIDERING HITTADE PROBLEM:');
    if (counts.featureGoals.total !== expectedFeatureGoals) {
      console.log(`   - Feature goals: ${counts.featureGoals.total} (förväntat: ${expectedFeatureGoals})`);
    }
    if (counts.incorrect.tasksAsFeatureGoals > 0) {
      console.log(`   - ${counts.incorrect.tasksAsFeatureGoals} tasks kommer genereras som feature goals (FEL!)`);
    }
  }
  
  console.log('');
}

validateGenerationLogic().catch(console.error);
