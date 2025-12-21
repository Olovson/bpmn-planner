/**
 * @vitest-environment jsdom
 * 
 * Analys av i vilken ordning noder genereras i t.ex. application.bpmn
 * Jämför med faktisk exekveringsordning i BPMN-filen (sequence flows)
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';

describe('Node Generation Order Analysis - mortgage-se-application.bpmn', () => {
  it('should analyze generation order vs execution order', async () => {
    const fileName = 'mortgage-se-application.bpmn';
    
    // 1. Parse BPMN file to get sequence flows and actual execution order
    const parseResult = await parseBpmnFile(`/bpmn/${fileName}`);
    const sequenceFlows = parseResult.sequenceFlows || [];
    
    console.log('\n=== BPMN File Analysis ===');
    console.log(`File: ${fileName}`);
    console.log(`Sequence flows: ${sequenceFlows.length}`);
    
    // 2. Build graph to see orderIndex assignment
    const graph = await buildBpmnProcessGraph(
      fileName,
      [fileName],
    );
    
    // Get nodes from application file
    const applicationNodes = graph.fileNodes.get(fileName) || [];
    
    console.log(`\n=== Nodes in ${fileName} ===`);
    console.log(`Total nodes: ${applicationNodes.length}`);
    
    // Group nodes by type
    const callActivities = applicationNodes.filter(n => n.type === 'callActivity');
    const userTasks = applicationNodes.filter(n => n.type === 'userTask');
    const serviceTasks = applicationNodes.filter(n => n.type === 'serviceTask');
    const businessRuleTasks = applicationNodes.filter(n => n.type === 'businessRuleTask');
    const subProcesses = applicationNodes.filter(n => n.type === 'subProcess');
    
    console.log(`CallActivities: ${callActivities.length}`);
    console.log(`UserTasks: ${userTasks.length}`);
    console.log(`ServiceTasks: ${serviceTasks.length}`);
    console.log(`BusinessRuleTasks: ${businessRuleTasks.length}`);
    console.log(`SubProcesses: ${subProcesses.length}`);
    
    // 3. Analyze orderIndex assignment
    console.log('\n=== OrderIndex Analysis ===');
    const nodesWithOrder = applicationNodes
      .filter(n => n.orderIndex !== undefined)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    
    console.log(`Nodes with orderIndex: ${nodesWithOrder.length}`);
    console.log('\nNodes sorted by orderIndex (execution order):');
    nodesWithOrder.forEach(node => {
      console.log(`  [${node.orderIndex}] ${node.bpmnElementId} (${node.type}) - ${node.name || 'unnamed'}`);
    });
    
    // 4. Calculate depth for each node (how the generation actually sorts)
    const calculateDepth = (node: typeof applicationNodes[0], visited = new Set<string>()): number => {
      if (visited.has(node.id)) return 0;
      visited.add(node.id);
      
      if (!node.children || node.children.length === 0) {
        return 0; // Leaf node
      }
      
      const maxChildDepth = Math.max(
        ...node.children.map(child => calculateDepth(child, visited))
      );
      return maxChildDepth + 1;
    };
    
    const nodesWithDepth = applicationNodes.map(node => ({
      node,
      depth: calculateDepth(node),
      orderIndex: node.orderIndex ?? node.visualOrderIndex ?? 999,
    }));
    
    // Sort as generation does: depth DESC, then orderIndex ASC, then alphabetically
    const sortedAsGeneration = [...nodesWithDepth].sort((a, b) => {
      // Primär: högre depth först (leaf nodes före parent nodes)
      if (a.depth !== b.depth) {
        return b.depth - a.depth;
      }
      
      // Sekundär: orderIndex (exekveringsordning) inom samma depth
      if (a.orderIndex !== b.orderIndex) {
        return a.orderIndex - b.orderIndex;
      }
      
      // Tertiär: alfabetiskt
      const nameA = a.node.name || a.node.bpmnElementId || '';
      const nameB = b.node.name || b.node.bpmnElementId || '';
      return nameA.localeCompare(nameB);
    });
    
    console.log('\n=== Generation Order (as sorted in code) ===');
    console.log('Sorting: 1) depth DESC (leaf nodes first), 2) orderIndex ASC (execution order), 3) alphabetical');
    console.log('\nNodes sorted as generation does:');
    sortedAsGeneration.forEach(({ node, depth, orderIndex }) => {
      const orderStr = orderIndex !== 999 ? `[orderIndex: ${orderIndex}]` : '[no orderIndex]';
      console.log(`  [depth: ${depth}] ${orderStr} ${node.bpmnElementId} (${node.type}) - ${node.name || 'unnamed'}`);
    });
    
    // 5. Compare: execution order vs generation order
    console.log('\n=== Comparison: Execution Order vs Generation Order ===');
    console.log('\nExecution order (by orderIndex):');
    nodesWithOrder.forEach((node, idx) => {
      const genIdx = sortedAsGeneration.findIndex(({ node: n }) => n.id === node.id);
      const genDepth = sortedAsGeneration[genIdx]?.depth ?? -1;
      console.log(`  ${idx + 1}. ${node.bpmnElementId} (orderIndex: ${node.orderIndex}) → Generated at position ${genIdx + 1} (depth: ${genDepth})`);
    });
    
    // 6. Check if generation order matches execution order
    const executionOrderIds = nodesWithOrder.map(n => n.id);
    const generationOrderIds = sortedAsGeneration.map(({ node }) => node.id);
    
    const matchesExecutionOrder = executionOrderIds.every((id, idx) => id === generationOrderIds[idx]);
    
    console.log('\n=== Conclusion ===');
    if (matchesExecutionOrder) {
      console.log('✅ Generation order MATCHES execution order');
    } else {
      console.log('❌ Generation order does NOT match execution order');
      console.log('   Reason: Nodes are sorted PRIMARILY by depth (hierarchical),');
      console.log('   and only SECONDARILY by orderIndex (execution order) within the same depth.');
      console.log('   This means all leaf nodes (depth 0) are generated BEFORE parent nodes (depth > 0),');
      console.log('   regardless of their execution order.');
    }
    
    // 7. Show actual generation order by simulating what happens
    console.log('\n=== Simulated Generation Order ===');
    console.log('(This is the order nodes would be generated in Pass 1)');
    
    // Group by depth
    const byDepth = new Map<number, typeof sortedAsGeneration>();
    sortedAsGeneration.forEach(item => {
      const depth = item.depth;
      if (!byDepth.has(depth)) {
        byDepth.set(depth, []);
      }
      byDepth.get(depth)!.push(item);
    });
    
    // Sort depths descending
    const depths = Array.from(byDepth.keys()).sort((a, b) => b - a);
    
    depths.forEach(depth => {
      const nodesAtDepth = byDepth.get(depth)!;
      console.log(`\nDepth ${depth} (${nodesAtDepth.length} nodes):`);
      nodesAtDepth.forEach(({ node, orderIndex }) => {
        const orderStr = orderIndex !== 999 ? `orderIndex: ${orderIndex}` : 'no orderIndex';
        console.log(`  - ${node.bpmnElementId} (${node.type}) [${orderStr}]`);
      });
    });
    
    // Assertions for documentation
    expect(applicationNodes.length).toBeGreaterThan(0);
    expect(nodesWithOrder.length).toBeGreaterThan(0);
    expect(sortedAsGeneration.length).toBe(applicationNodes.length);
    
    // Analysis: Generation order matches execution order in this case
    // because all nodes (except the process) have the same depth (0).
    // When nodes have different depths, generation order will NOT match execution order
    // because depth is the PRIMARY sort key, and orderIndex is only SECONDARY.
    
    console.log('\n=== Key Finding ===');
    if (matchesExecutionOrder) {
      console.log('✅ In this case, generation order MATCHES execution order');
      console.log('   Reason: All nodes (except process) have the same depth (0)');
      console.log('   When all nodes have the same depth, orderIndex determines the order');
    } else {
      console.log('❌ Generation order does NOT match execution order');
      console.log('   Reason: Nodes have different depths, and depth is the PRIMARY sort key');
      console.log('   All leaf nodes (depth 0) are generated BEFORE parent nodes (depth > 0)');
      console.log('   regardless of their execution order (orderIndex)');
    }
    
    console.log('\n=== General Rule ===');
    console.log('Generation sorting:');
    console.log('  1. PRIMARY: depth DESC (leaf nodes first)');
    console.log('  2. SECONDARY: orderIndex ASC (execution order) within same depth');
    console.log('  3. TERTIARY: alphabetical for determinism');
    console.log('\nThis means:');
    console.log('  - If all nodes have the same depth → orderIndex determines order ✅');
    console.log('  - If nodes have different depths → depth determines order first ❌');
    console.log('  - Execution order (orderIndex) is only respected WITHIN the same depth level');
    
    console.log('\n✅ Analysis complete');
  }, 30000);
});
