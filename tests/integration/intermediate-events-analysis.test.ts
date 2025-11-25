/**
 * Test to verify the analysis of intermediate events in sequence flows
 * 
 * This test:
 * 1. Parses mortgage.bpmn
 * 2. Shows which sequence flows involve intermediate events
 * 3. Shows which nodes are created in ProcessGraph
 * 4. Shows which sequence flows are filtered out
 * 5. Verifies the analysis without any hardcoding or fallback solutions
 * 
 * @vitest-environment jsdom
 */

import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import bpmnMap from '../../bpmn-map.json';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'analytics');

function loadBpmnFromFixtures(fileName: string): string {
  const fixturePath = resolve(FIXTURES_DIR, fileName);
  return readFileSync(fixturePath, 'utf8');
}

function createBpmnDataUrl(xml: string): string {
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}

describe('Intermediate Events Analysis', () => {
  it('verifies the analysis of intermediate events in sequence flows', async () => {
    console.log('\n=== Test: Intermediate Events Analysis ===\n');

    // Step 1: Parse mortgage.bpmn
    console.log('1. Parsing mortgage.bpmn...');
    const xml = loadBpmnFromFixtures('mortgage.bpmn');
    const dataUrl = createBpmnDataUrl(xml);
    const parseResult = await parseBpmnFile(dataUrl);
    
    console.log(`   ✓ Parsed ${parseResult.sequenceFlows.length} sequence flows`);
    console.log(`   ✓ Parsed ${parseResult.elements.length} elements\n`);

    // Step 2: Find sequence flows involving "offer" and intermediate events
    console.log('2. Analyzing sequence flows involving "offer"...');
    const offerFlows = parseResult.sequenceFlows.filter(
      (flow) => flow.sourceRef === 'offer' || flow.targetRef === 'offer'
    );
    
    console.log(`   Found ${offerFlows.length} sequence flows involving "offer":`);
    offerFlows.forEach((flow) => {
      console.log(`     - ${flow.id}: ${flow.sourceRef} → ${flow.targetRef}`);
    });
    console.log();

    // Step 3: Find sequence flows involving Event_111bwbu (intermediate event before offer)
    console.log('3. Analyzing sequence flows involving Event_111bwbu...');
    const event111bwbuFlows = parseResult.sequenceFlows.filter(
      (flow) => flow.sourceRef === 'Event_111bwbu' || flow.targetRef === 'Event_111bwbu'
    );
    
    console.log(`   Found ${event111bwbuFlows.length} sequence flows involving Event_111bwbu:`);
    event111bwbuFlows.forEach((flow) => {
      console.log(`     - ${flow.id}: ${flow.sourceRef} → ${flow.targetRef}`);
    });
    console.log();

    // Step 4: Check if Event_111bwbu exists in elements
    console.log('4. Checking if Event_111bwbu exists in parsed elements...');
    const event111bwbuElement = parseResult.elements.find((e) => e.id === 'Event_111bwbu');
    if (event111bwbuElement) {
      console.log(`   ✓ Event_111bwbu found in elements (type: ${event111bwbuElement.type})`);
    } else {
      console.log(`   ✗ Event_111bwbu NOT found in elements`);
    }
    console.log();

    // Step 5: Build ProcessGraph and check which nodes are created
    console.log('5. Building ProcessGraph...');
    const parseResults = new Map<string, typeof parseResult>();
    parseResults.set('mortgage.bpmn', parseResult);
    
    const graph = buildProcessGraph(parseResults, {
      bpmnMap: loadBpmnMap(bpmnMap),
      preferredRootProcessId: 'mortgage',
    });
    
    const mortgageNodes = Array.from(graph.nodes.values()).filter(
      (n) => n.bpmnFile === 'mortgage.bpmn'
    );
    
    console.log(`   ✓ Built ProcessGraph with ${mortgageNodes.length} nodes from mortgage.bpmn`);
    console.log(`   Nodes created:`);
    mortgageNodes.forEach((node) => {
      console.log(`     - ${node.id} (type: ${node.type}, bpmnElementId: ${node.bpmnElementId})`);
    });
    console.log();

    // Step 6: Check if Event_111bwbu is in ProcessGraph nodes
    console.log('6. Checking if Event_111bwbu is in ProcessGraph nodes...');
    const event111bwbuNode = mortgageNodes.find((n) => n.bpmnElementId === 'Event_111bwbu');
    if (event111bwbuNode) {
      console.log(`   ✓ Event_111bwbu found in ProcessGraph nodes`);
    } else {
      console.log(`   ✗ Event_111bwbu NOT found in ProcessGraph nodes (expected - intermediate events are not created as ProcessGraphNode)`);
    }
    console.log();

    // Step 7: Check which sequence edges are created
    console.log('7. Analyzing sequence edges in ProcessGraph...');
    const mortgageEdges = Array.from(graph.edges.values()).filter(
      (e) => e.type === 'sequence' && (e.from.startsWith('callActivity:mortgage.bpmn:') || e.to.startsWith('callActivity:mortgage.bpmn:'))
    );
    
    console.log(`   Found ${mortgageEdges.length} sequence edges involving callActivities from mortgage.bpmn:`);
    mortgageEdges.forEach((edge) => {
      const sourceNode = graph.nodes.get(edge.from);
      const targetNode = graph.nodes.get(edge.to);
      console.log(`     - ${edge.id}: ${sourceNode?.bpmnElementId || edge.from} → ${targetNode?.bpmnElementId || edge.to}`);
    });
    console.log();

    // Step 8: Check if the flow Event_111bwbu → offer is in edges
    console.log('8. Checking if flow Event_111bwbu → offer is in ProcessGraph edges...');
    const offerNode = mortgageNodes.find((n) => n.bpmnElementId === 'offer');
    const event111bwbuToOfferEdge = mortgageEdges.find(
      (e) => e.to === offerNode?.id
    );
    
    if (event111bwbuToOfferEdge) {
      console.log(`   ✓ Flow Event_111bwbu → offer found in edges: ${event111bwbuToOfferEdge.id}`);
    } else {
      console.log(`   ✗ Flow Event_111bwbu → offer NOT found in edges (expected - Event_111bwbu is not a ProcessGraphNode)`);
    }
    console.log();

    // Step 9: Check orderIndex for offer node
    console.log('9. Checking orderIndex for offer node...');
    if (offerNode) {
      const orderIndex = offerNode.metadata.orderIndex as number | undefined;
      const visualOrderIndex = offerNode.metadata.visualOrderIndex as number | undefined;
      console.log(`   offer node:`);
      console.log(`     - orderIndex: ${orderIndex ?? 'undefined'}`);
      console.log(`     - visualOrderIndex: ${visualOrderIndex ?? 'undefined'}`);
      if (orderIndex === undefined) {
        console.log(`   ✗ offer does NOT have orderIndex (this is the problem!)`);
      } else {
        console.log(`   ✓ offer has orderIndex: ${orderIndex}`);
      }
    }
    console.log();

    // Step 10: Summary
    console.log('=== Summary ===');
    console.log('Problem identified:');
    console.log('  1. Event_111bwbu exists in parseResult.elements and parseResult.sequenceFlows');
    console.log('  2. Event_111bwbu does NOT exist in ProcessGraph nodes (intermediate events are not created)');
    console.log('  3. Sequence flow Event_111bwbu → offer is filtered out in buildSequenceEdgesForFile()');
    console.log('  4. Therefore, offer does not get orderIndex from sequence flows');
    console.log();
    console.log('Solution:');
    console.log('  - Use parseResult.sequenceFlows directly (with element IDs)');
    console.log('  - Include all element IDs from sequence flows in calculateOrderFromSequenceFlows()');
    console.log('  - Propagate orderIndex from intermediate events to call activities');
    console.log();
  });
});


