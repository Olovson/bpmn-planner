#!/usr/bin/env tsx
/**
 * Script för att analysera E2E-scenarion och extrahera alla subprocesser och detaljer
 * 
 * Användning:
 *   tsx scripts/analyze-e2e-scenario.ts E2E_BR001
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BpmnNode {
  id: string;
  name: string;
  type: 'CallActivity' | 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'Gateway' | 'Event' | 'StartEvent' | 'EndEvent';
  bpmnFile: string;
  calledElement?: string; // För CallActivity: vilken process den anropar
  incoming?: string[]; // Sequence flow IDs som går in
  outgoing?: string[]; // Sequence flow IDs som går ut
}

interface SequenceFlow {
  id: string;
  name?: string;
  sourceRef: string;
  targetRef: string;
}

interface BpmnProcess {
  id: string;
  name: string;
  bpmnFile: string;
  nodes: BpmnNode[];
  sequenceFlows: SequenceFlow[];
  startEvent?: string;
  endEvents: string[];
}

/**
 * Läser en BPMN-fil och extraherar alla noder och sequence flows
 */
function parseBpmnFile(filePath: string): BpmnProcess {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  // Extrahera process ID och namn
  const processMatch = content.match(/<bpmn:process id="([^"]+)"[^>]*name="([^"]*)"/);
  const processId = processMatch ? processMatch[1] : '';
  const processName = processMatch ? processMatch[2] || processId : '';
  
  const nodes: BpmnNode[] = [];
  const sequenceFlows: SequenceFlow[] = [];
  let startEvent: string | undefined;
  const endEvents: string[] = [];
  
  // Extrahera CallActivities
  const callActivityRegex = /<bpmn:callActivity id="([^"]+)"[^>]*name="([^"]*)"[^>]*(?:calledElement="([^"]*)")?/g;
  let match;
  while ((match = callActivityRegex.exec(content)) !== null) {
    nodes.push({
      id: match[1],
      name: match[2] || match[1],
      type: 'CallActivity',
      bpmnFile: fileName,
      calledElement: match[3],
    });
  }
  
  // Extrahera UserTasks
  const userTaskRegex = /<bpmn:userTask id="([^"]+)"[^>]*name="([^"]*)"/g;
  while ((match = userTaskRegex.exec(content)) !== null) {
    nodes.push({
      id: match[1],
      name: match[2] || match[1],
      type: 'UserTask',
      bpmnFile: fileName,
    });
  }
  
  // Extrahera ServiceTasks
  const serviceTaskRegex = /<bpmn:serviceTask id="([^"]+)"[^>]*name="([^"]*)"/g;
  while ((match = serviceTaskRegex.exec(content)) !== null) {
    nodes.push({
      id: match[1],
      name: match[2] || match[1],
      type: 'ServiceTask',
      bpmnFile: fileName,
    });
  }
  
  // Extrahera BusinessRuleTasks
  const businessRuleTaskRegex = /<bpmn:businessRuleTask id="([^"]+)"[^>]*name="([^"]*)"/g;
  while ((match = businessRuleTaskRegex.exec(content)) !== null) {
    nodes.push({
      id: match[1],
      name: match[2] || match[1],
      type: 'BusinessRuleTask',
      bpmnFile: fileName,
    });
  }
  
  // Extrahera Gateways
  const gatewayRegex = /<bpmn:(exclusiveGateway|inclusiveGateway|parallelGateway) id="([^"]+)"[^>]*name="([^"]*)"/g;
  while ((match = gatewayRegex.exec(content)) !== null) {
    nodes.push({
      id: match[2],
      name: match[3] || match[2],
      type: 'Gateway',
      bpmnFile: fileName,
    });
  }
  
  // Extrahera Start Events (både med och utan name)
  const startEventRegex = /<bpmn:startEvent id="([^"]+)"[^>]*(?:name="([^"]*)")?[^>]*>/g;
  while ((match = startEventRegex.exec(content)) !== null) {
    nodes.push({
      id: match[1],
      name: match[2] || 'Start',
      type: 'StartEvent',
      bpmnFile: fileName,
    });
    if (!startEvent) {
      startEvent = match[1];
    }
  }
  
  // Extrahera End Events
  const endEventRegex = /<bpmn:endEvent id="([^"]+)"[^>]*name="([^"]*)"/g;
  while ((match = endEventRegex.exec(content)) !== null) {
    nodes.push({
      id: match[1],
      name: match[2] || 'End',
      type: 'EndEvent',
      bpmnFile: fileName,
    });
    endEvents.push(match[1]);
  }
  
  // Extrahera Sequence Flows
  const sequenceFlowRegex = /<bpmn:sequenceFlow id="([^"]+)"[^>]*(?:name="([^"]*)")?[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"/g;
  while ((match = sequenceFlowRegex.exec(content)) !== null) {
    sequenceFlows.push({
      id: match[1],
      name: match[2],
      sourceRef: match[3],
      targetRef: match[4],
    });
  }
  
  // Lägg till incoming/outgoing för varje nod
  nodes.forEach(node => {
    node.incoming = sequenceFlows.filter(sf => sf.targetRef === node.id).map(sf => sf.id);
    node.outgoing = sequenceFlows.filter(sf => sf.sourceRef === node.id).map(sf => sf.id);
  });
  
  return {
    id: processId,
    name: processName,
    bpmnFile: fileName,
    nodes,
    sequenceFlows,
    startEvent,
    endEvents,
  };
}

/**
 * Bygger en körordning baserat på sequence flows från start-event
 */
function buildExecutionOrder(process: BpmnProcess, startNodeId: string): BpmnNode[] {
  const visited = new Set<string>();
  const order: BpmnNode[] = [];
  const nodeMap = new Map<string, BpmnNode>();
  
  process.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });
  
  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    // Lägg till noden i ordningen
    if (node.type !== 'StartEvent' && node.type !== 'EndEvent') {
      order.push(node);
    }
    
    // Följ outgoing sequence flows
    if (node.outgoing) {
      node.outgoing.forEach(flowId => {
        const flow = process.sequenceFlows.find(sf => sf.id === flowId);
        if (flow) {
          traverse(flow.targetRef);
        }
      });
    }
  }
  
  traverse(startNodeId);
  
  return order;
}

/**
 * Läser bpmn-map.json för att hitta rätt BPMN-fil för en call activity
 */
function findBpmnFileForCallActivity(callActivityId: string, bpmnMap: any): string | null {
  for (const process of bpmnMap.processes || []) {
    // Kolla om detta är processen som matchar callActivityId
    if (process.id === callActivityId || process.process_id === callActivityId) {
      return process.bpmn_file;
    }
    
    // Kolla om callActivityId finns i call_activities
    for (const ca of process.call_activities || []) {
      if (ca.bpmn_id === callActivityId) {
        return ca.subprocess_bpmn_file || null;
      }
    }
  }
  
  // Fallback: försök hitta baserat på ID (mortgage-se-application -> mortgage-se-application.bpmn)
  const possibleFile = `${callActivityId}.bpmn`;
  return possibleFile;
}

/**
 * Huvudfunktion för att analysera E2E_BR001
 */
function analyzeE2E_BR001() {
  const bpmnDir = path.join(__dirname, '../tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11');
  const bpmnMapPath = path.join(__dirname, '../bpmn-map.json');
  
  // Läs bpmn-map.json
  const bpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
  
  console.log('=== Analys av E2E_BR001: En sökande - Bostadsrätt godkänd automatiskt ===\n');
  
  // 1. Läsa root process
  const mortgageBpmn = path.join(bpmnDir, 'mortgage.bpmn');
  const mortgageProcess = parseBpmnFile(mortgageBpmn);
  
  console.log(`Root process: ${mortgageProcess.name} (${mortgageProcess.id})`);
  console.log(`BPMN-fil: ${mortgageProcess.bpmnFile}\n`);
  
  // 2. Bygg körordning för köp happy path
  if (!mortgageProcess.startEvent) {
    console.error('Ingen start-event hittades!');
    return;
  }
  
  const executionOrder = buildExecutionOrder(mortgageProcess, mortgageProcess.startEvent);
  
  console.log('=== Körordning för köp happy path ===\n');
  executionOrder.forEach((node, index) => {
    console.log(`${index + 1}. ${node.type}: ${node.name} (${node.id})`);
  });
  
  // 3. Analysera varje CallActivity rekursivt
  console.log('\n=== Rekursiv analys av CallActivities ===\n');
  
  const analyzedSubprocesses = new Set<string>();
  
  function analyzeSubprocess(callActivityId: string, parentBpmnFile: string, depth: number = 0) {
    const indent = '  '.repeat(depth);
    
    // Hitta BPMN-filen för subprocessen via bpmn-map.json
    const subprocessFileName = findBpmnFileForCallActivity(callActivityId, bpmnMap);
    
    if (!subprocessFileName) {
      console.log(`${indent}⚠️  ${callActivityId}: Ingen BPMN-fil hittades i bpmn-map.json`);
      return;
    }
    
    const subprocessFile = path.join(bpmnDir, subprocessFileName);
    
    if (!fs.existsSync(subprocessFile)) {
      console.log(`${indent}⚠️  ${callActivityId}: Fil ${subprocessFile} finns inte`);
      return;
    }
    
    if (analyzedSubprocesses.has(subprocessFile)) {
      console.log(`${indent}✓ ${callActivityId}: ${subprocessFileName} (redan analyserad)`);
      return;
    }
    
    analyzedSubprocesses.add(subprocessFile);
    
    const subprocess = parseBpmnFile(subprocessFile);
    console.log(`${indent}📁 ${callActivityId}: ${subprocess.name} (${subprocess.bpmnFile})`);
    
    if (subprocess.startEvent) {
      const subprocessOrder = buildExecutionOrder(subprocess, subprocess.startEvent);
      subprocessOrder.forEach((subNode, subIndex) => {
        console.log(`${indent}  ${subIndex + 1}. ${subNode.type}: ${subNode.name} (${subNode.id})`);
        
        // Rekursivt analysera subprocesser
        if (subNode.type === 'CallActivity') {
          analyzeSubprocess(subNode.id, subprocess.bpmnFile, depth + 2);
        }
      });
    }
  }
  
  // Analysera alla CallActivities i körordning
  executionOrder
    .filter(node => node.type === 'CallActivity')
    .forEach(node => {
      analyzeSubprocess(node.id, mortgageProcess.bpmnFile, 0);
    });
  
  console.log('\n=== Sammanfattning ===\n');
  console.log(`Totalt antal noder i root process: ${mortgageProcess.nodes.length}`);
  console.log(`Totalt antal CallActivities: ${executionOrder.filter(n => n.type === 'CallActivity').length}`);
  console.log(`Totalt antal analyserade subprocesser: ${analyzedSubprocesses.size}`);
}

// Kör analysen
const scenarioId = process.argv[2] || 'E2E_BR001';

if (scenarioId === 'E2E_BR001') {
  analyzeE2E_BR001();
} else {
  console.error(`Okänt scenario: ${scenarioId}`);
  process.exit(1);
}

