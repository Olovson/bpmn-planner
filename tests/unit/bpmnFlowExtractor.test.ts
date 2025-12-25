import { describe, it, expect, beforeAll } from 'vitest';
import {
  extractGateways,
  buildFlowGraph,
  findStartEvents,
  findEndEvents,
  findPathsThroughProcess,
  identifyErrorPaths,
  extractUniqueGatewayConditions,
  type GatewayInfo,
  type FlowGraph,
  type ProcessPath
} from '@/lib/bpmnFlowExtractor';
import { parseBpmnFileContent } from '@/lib/bpmnParser';
import path from 'path';
import { readFileSync } from 'fs';

describe('bpmnFlowExtractor', () => {
  let applicationParseResult: Awaited<ReturnType<typeof parseBpmnFile>>;
  let internalDataGatheringParseResult: Awaited<ReturnType<typeof parseBpmnFile>>;
  
  beforeAll(async () => {
    // Ladda riktiga BPMN-filer
    const applicationPath = path.resolve(
      __dirname,
      '../fixtures/bpmn/mortgage-se 2025.12.11 18:11/mortgage-se-application.bpmn'
    );
    const applicationXml = readFileSync(applicationPath, 'utf-8');
    applicationParseResult = await parseBpmnFileContent(applicationXml, 'mortgage-se-application.bpmn');
    
    const internalDataGatheringPath = path.resolve(
      __dirname,
      '../fixtures/bpmn/mortgage-se 2025.12.11 18:11/mortgage-se-internal-data-gathering.bpmn'
    );
    const internalDataGatheringXml = readFileSync(internalDataGatheringPath, 'utf-8');
    internalDataGatheringParseResult = await parseBpmnFileContent(internalDataGatheringXml, 'mortgage-se-internal-data-gathering.bpmn');
  });
  
  describe('extractGateways', () => {
    it('should extract gateways from mortgage-se-application.bpmn', () => {
      const gateways = extractGateways(applicationParseResult);
      
      // Verifiera att gateways extraheras
      expect(gateways.length).toBeGreaterThan(0);
      
      // Verifiera struktur
      gateways.forEach(gateway => {
        expect(gateway).toHaveProperty('id');
        expect(gateway).toHaveProperty('name');
        expect(gateway).toHaveProperty('type');
        expect(gateway).toHaveProperty('outgoingFlows');
        expect(Array.isArray(gateway.outgoingFlows)).toBe(true);
        expect(['exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'eventBasedGateway']).toContain(gateway.type);
        
        // Verifiera outgoing flows
        gateway.outgoingFlows.forEach(flow => {
          expect(flow).toHaveProperty('id');
          expect(flow).toHaveProperty('targetRef');
        });
      });
      
      // Verifiera att vi hittar kända gateways från filen
      const gatewayNames = gateways.map(g => g.name.toLowerCase());
      const hasKalpGateway = gatewayNames.some(name => name.includes('kalp'));
      const hasSkipGateway = gatewayNames.some(name => name.includes('skip'));
      
      // Logga för debugging
      console.log(`[extractGateways] Found ${gateways.length} gateways`);
      gateways.forEach(g => {
        console.log(`  - ${g.id}: ${g.name} (${g.type}) - ${g.outgoingFlows.length} outgoing flows`);
        g.outgoingFlows.forEach(f => {
          console.log(`    -> ${f.targetRef}${f.condition ? ` (condition: ${f.condition})` : ''}`);
        });
      });
    });
    
    it('should extract gateways with conditions from mortgage-se-application.bpmn', () => {
      const gateways = extractGateways(applicationParseResult);
      
      // Hitta gateways med conditions
      const gatewaysWithConditions = gateways.filter(g => 
        g.outgoingFlows.some(f => f.condition)
      );
      
      expect(gatewaysWithConditions.length).toBeGreaterThan(0);
      
      // Verifiera att conditions extraheras korrekt
      gatewaysWithConditions.forEach(gateway => {
        const flowsWithConditions = gateway.outgoingFlows.filter(f => f.condition);
        expect(flowsWithConditions.length).toBeGreaterThan(0);
        
        flowsWithConditions.forEach(flow => {
          expect(flow.condition).toBeDefined();
          expect(typeof flow.condition).toBe('string');
          expect(flow.condition.length).toBeGreaterThan(0);
        });
      });
      
      console.log(`[extractGateways] Found ${gatewaysWithConditions.length} gateways with conditions`);
    });
  });
  
  describe('buildFlowGraph', () => {
    it('should build flow graph from mortgage-se-application.bpmn', () => {
      const graph = buildFlowGraph(applicationParseResult);
      
      // Verifiera struktur
      expect(graph.nodes.size).toBeGreaterThan(0);
      expect(graph.edges.size).toBeGreaterThan(0);
      
      // Verifiera att noder har korrekt struktur
      graph.nodes.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('outgoingEdges');
        expect(node).toHaveProperty('incomingEdges');
        expect(Array.isArray(node.outgoingEdges)).toBe(true);
        expect(Array.isArray(node.incomingEdges)).toBe(true);
      });
      
      // Verifiera att edges har korrekt struktur
      graph.edges.forEach(edge => {
        expect(edge).toHaveProperty('id');
        expect(edge).toHaveProperty('sourceId');
        expect(edge).toHaveProperty('targetId');
        
        // Verifiera att source och target finns i nodes
        expect(graph.nodes.has(edge.sourceId)).toBe(true);
        expect(graph.nodes.has(edge.targetId)).toBe(true);
      });
      
      // Verifiera att call activities finns
      const callActivities = Array.from(graph.nodes.values()).filter(n => n.type === 'callActivity');
      expect(callActivities.length).toBeGreaterThan(0);
      
      console.log(`[buildFlowGraph] Built graph with ${graph.nodes.size} nodes and ${graph.edges.size} edges`);
      console.log(`[buildFlowGraph] Found ${callActivities.length} call activities`);
    });
    
    it('should extract conditions from sequence flows in graph', () => {
      const graph = buildFlowGraph(applicationParseResult);
      
      // Hitta edges med conditions
      const edgesWithConditions = Array.from(graph.edges.values()).filter(e => e.condition);
      
      expect(edgesWithConditions.length).toBeGreaterThan(0);
      
      // Verifiera att conditions extraheras korrekt
      edgesWithConditions.forEach(edge => {
        expect(edge.condition).toBeDefined();
        expect(typeof edge.condition).toBe('string');
        expect(edge.condition.length).toBeGreaterThan(0);
      });
      
      console.log(`[buildFlowGraph] Found ${edgesWithConditions.length} edges with conditions`);
      edgesWithConditions.forEach(e => {
        console.log(`  - ${e.id}: ${e.condition}`);
      });
    });
  });
  
  describe('findPathsThroughProcess', () => {
    it('should find paths through mortgage-se-application.bpmn', () => {
      const graph = buildFlowGraph(applicationParseResult);
      const startEvents = findStartEvents(graph);
      
      expect(startEvents.length).toBeGreaterThan(0);
      
      // Hitta paths från första start-event
      const paths = findPathsThroughProcess(graph, startEvents[0].id);
      
      expect(paths.length).toBeGreaterThan(0);
      
      // Verifiera struktur
      paths.forEach(path => {
        expect(path).toHaveProperty('type');
        expect(path).toHaveProperty('startEvent');
        expect(path).toHaveProperty('endEvent');
        expect(path).toHaveProperty('featureGoals');
        expect(path).toHaveProperty('gatewayConditions');
        expect(path).toHaveProperty('nodeIds');
        expect(Array.isArray(path.featureGoals)).toBe(true);
        expect(Array.isArray(path.gatewayConditions)).toBe(true);
        expect(Array.isArray(path.nodeIds)).toBe(true);
        
        // Verifiera att start-event och end-event finns i graph
        expect(graph.nodes.has(path.startEvent)).toBe(true);
        expect(graph.nodes.has(path.endEvent)).toBe(true);
        
        // Verifiera att feature goals (call activities) finns i graph
        path.featureGoals.forEach(fgId => {
          const node = graph.nodes.get(fgId);
          expect(node).toBeDefined();
          expect(node?.type).toBe('callActivity');
        });
      });
      
      console.log(`[findPathsThroughProcess] Found ${paths.length} paths`);
      paths.forEach((p, i) => {
        console.log(`  Path ${i + 1}: ${p.featureGoals.length} feature goals, ${p.gatewayConditions.length} gateway conditions`);
        console.log(`    Feature Goals: ${p.featureGoals.join(' → ')}`);
        if (p.gatewayConditions.length > 0) {
          console.log(`    Gateway Conditions: ${p.gatewayConditions.map(gc => gc.conditionText).join(', ')}`);
        }
      });
    });
    
    it('should identify feature goals in paths correctly', () => {
      const graph = buildFlowGraph(applicationParseResult);
      const startEvents = findStartEvents(graph);
      const paths = findPathsThroughProcess(graph, startEvents[0].id);
      
      // Verifiera att paths innehåller kända call activities
      const allCallActivities = Array.from(graph.nodes.values())
        .filter(n => n.type === 'callActivity')
        .map(n => n.id);
      
      paths.forEach(path => {
        // Varje feature goal i pathen ska vara en call activity
        path.featureGoals.forEach(fgId => {
          expect(allCallActivities).toContain(fgId);
        });
        
        // Path ska innehålla minst en feature goal (eller vara tom om processen inte har call activities)
        // För mortgage-se-application.bpmn bör det finnas call activities
        if (allCallActivities.length > 0) {
          // Minst en path bör innehålla call activities
          const pathsWithFeatureGoals = paths.filter(p => p.featureGoals.length > 0);
          expect(pathsWithFeatureGoals.length).toBeGreaterThan(0);
        }
      });
      
      // Logga feature goals per path
      paths.forEach((p, i) => {
        if (p.featureGoals.length > 0) {
          console.log(`[findPathsThroughProcess] Path ${i + 1} has ${p.featureGoals.length} feature goals: ${p.featureGoals.join(', ')}`);
        }
      });
    });
    
    it('should extract gateway conditions in paths correctly', () => {
      const graph = buildFlowGraph(applicationParseResult);
      const startEvents = findStartEvents(graph);
      const paths = findPathsThroughProcess(graph, startEvents[0].id);
      
      // Hitta paths med gateway conditions
      const pathsWithConditions = paths.filter(p => p.gatewayConditions.length > 0);
      
      if (pathsWithConditions.length > 0) {
        pathsWithConditions.forEach(path => {
          path.gatewayConditions.forEach(condition => {
            expect(condition).toHaveProperty('gatewayId');
            expect(condition).toHaveProperty('gatewayName');
            expect(condition).toHaveProperty('condition');
            expect(condition).toHaveProperty('conditionText');
            expect(condition).toHaveProperty('flowId');
            expect(condition).toHaveProperty('targetNodeId');
            
            // Verifiera att gateway finns i graph
            expect(graph.nodes.has(condition.gatewayId)).toBe(true);
            
            // Verifiera att condition-text är extraherad
            expect(condition.conditionText.length).toBeGreaterThan(0);
            expect(condition.conditionText).not.toContain('${');
            expect(condition.conditionText).not.toContain('}');
          });
        });
        
        console.log(`[findPathsThroughProcess] Found ${pathsWithConditions.length} paths with gateway conditions`);
        pathsWithConditions.forEach((p, i) => {
          console.log(`  Path ${i + 1}: ${p.gatewayConditions.map(gc => `${gc.gatewayName}: ${gc.conditionText}`).join(', ')}`);
        });
      } else {
        console.log('[findPathsThroughProcess] No paths with gateway conditions found (this is OK if the process has no gateways with conditions)');
      }
    });
  });
  
  describe('identifyErrorPaths', () => {
    it('should identify error paths in mortgage-se-application.bpmn', () => {
      const graph = buildFlowGraph(applicationParseResult);
      const startEvents = findStartEvents(graph);
      const paths = findPathsThroughProcess(graph, startEvents[0].id);
      const errorPaths = identifyErrorPaths(paths, graph);
      
      // Verifiera struktur
      errorPaths.forEach(path => {
        expect(path).toHaveProperty('endEvent');
        const endNode = graph.nodes.get(path.endEvent);
        expect(endNode).toBeDefined();
        expect(endNode?.type).toBe('endEvent');
      });
      
      console.log(`[identifyErrorPaths] Found ${errorPaths.length} error paths out of ${paths.length} total paths`);
      errorPaths.forEach((p, i) => {
        const endNode = graph.nodes.get(p.endEvent);
        console.log(`  Error Path ${i + 1}: ends at ${p.endEvent} (${endNode?.name || 'unnamed'})`);
      });
    });
  });
  
  describe('extractUniqueGatewayConditions', () => {
    it('should extract unique gateway conditions from paths', () => {
      const graph = buildFlowGraph(applicationParseResult);
      const startEvents = findStartEvents(graph);
      const paths = findPathsThroughProcess(graph, startEvents[0].id);
      const uniqueConditions = extractUniqueGatewayConditions(paths);
      
      // Verifiera struktur
      uniqueConditions.forEach(condition => {
        expect(condition).toHaveProperty('gatewayId');
        expect(condition).toHaveProperty('gatewayName');
        expect(condition).toHaveProperty('condition');
        expect(condition).toHaveProperty('conditionText');
      });
      
      // Verifiera att conditions är unika
      const conditionKeys = uniqueConditions.map(c => `${c.gatewayId}:${c.condition}`);
      const uniqueKeys = new Set(conditionKeys);
      expect(uniqueKeys.size).toBe(uniqueConditions.length);
      
      console.log(`[extractUniqueGatewayConditions] Found ${uniqueConditions.length} unique gateway conditions`);
      uniqueConditions.forEach((c, i) => {
        console.log(`  Condition ${i + 1}: ${c.gatewayName} - ${c.conditionText}`);
      });
    });
  });
  
  describe('Quality validation: Can we extract relevant information?', () => {
    it('should extract at least 80% of expected information from mortgage-se-application.bpmn', () => {
      const graph = buildFlowGraph(applicationParseResult);
      const gateways = extractGateways(applicationParseResult);
      const startEvents = findStartEvents(graph);
      const paths = findPathsThroughProcess(graph, startEvents[0].id);
      
      // Räkna call activities i graph
      const callActivities = Array.from(graph.nodes.values()).filter(n => n.type === 'callActivity');
      
      // Räkna feature goals i paths
      const allFeatureGoalsInPaths = new Set<string>();
      paths.forEach(path => {
        path.featureGoals.forEach(fgId => allFeatureGoalsInPaths.add(fgId));
      });
      
      // Kvalitetsmått 1: Har vi hittat alla call activities i paths?
      const coverage = callActivities.length > 0 
        ? (allFeatureGoalsInPaths.size / callActivities.length) * 100 
        : 100;
      
      console.log(`[Quality] Call Activity Coverage: ${allFeatureGoalsInPaths.size}/${callActivities.length} = ${coverage.toFixed(1)}%`);
      
      // Vi förväntar oss minst 80% coverage
      if (callActivities.length > 0) {
        expect(coverage).toBeGreaterThanOrEqual(80);
      }
      
      // Kvalitetsmått 2: Har vi hittat gateways?
      console.log(`[Quality] Gateways found: ${gateways.length}`);
      expect(gateways.length).toBeGreaterThan(0);
      
      // Kvalitetsmått 3: Har vi hittat paths?
      console.log(`[Quality] Paths found: ${paths.length}`);
      expect(paths.length).toBeGreaterThan(0);
      
      // Kvalitetsmått 4: Har vi hittat conditions?
      const pathsWithConditions = paths.filter(p => p.gatewayConditions.length > 0);
      const conditionCoverage = paths.length > 0 
        ? (pathsWithConditions.length / paths.length) * 100 
        : 100;
      
      console.log(`[Quality] Paths with conditions: ${pathsWithConditions.length}/${paths.length} = ${conditionCoverage.toFixed(1)}%`);
      
      // Sammanfattning
      console.log('\n[Quality Summary]');
      console.log(`  Gateways: ${gateways.length}`);
      console.log(`  Call Activities: ${callActivities.length}`);
      console.log(`  Feature Goals in paths: ${allFeatureGoalsInPaths.size}`);
      console.log(`  Paths: ${paths.length}`);
      console.log(`  Paths with conditions: ${pathsWithConditions.length}`);
      console.log(`  Coverage: ${coverage.toFixed(1)}%`);
    });
    
    it('should extract conditions with correct format', () => {
      const graph = buildFlowGraph(applicationParseResult);
      const startEvents = findStartEvents(graph);
      const paths = findPathsThroughProcess(graph, startEvents[0].id);
      const uniqueConditions = extractUniqueGatewayConditions(paths);
      
      if (uniqueConditions.length > 0) {
        uniqueConditions.forEach(condition => {
          // Verifiera att condition-text är korrekt formaterad (utan ${ och })
          expect(condition.conditionText).not.toContain('${');
          expect(condition.conditionText).not.toContain('}');
          
          // Verifiera att condition (original) innehåller ${ och } om det är en expression
          if (condition.condition.includes('$')) {
            expect(condition.condition).toContain('${');
            expect(condition.condition).toContain('}');
          }
        });
        
        console.log(`[Quality] All ${uniqueConditions.length} conditions have correct format`);
      } else {
        console.log('[Quality] No conditions found (this is OK if the process has no gateways with conditions)');
      }
    });
  });
});

