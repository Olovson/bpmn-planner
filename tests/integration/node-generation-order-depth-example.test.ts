/**
 * @vitest-environment jsdom
 * 
 * Exempel som visar när genereringsordningen INTE matchar exekveringsordningen
 * p.g.a. olika depths (hierarkisk sortering går före exekveringsordning)
 * 
 * mortgage-se-signing.bpmn har embedded subProcesses med tasks inuti,
 * vilket skapar olika depths.
 */

import { describe, it, expect } from 'vitest';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { parseBpmnFile } from '@/lib/bpmnParser';

describe('Node Generation Order - Depth Example (mortgage-se-signing.bpmn)', () => {
  it('should show that generation order does NOT match execution order when nodes have different depths', async () => {
    const fileName = 'mortgage-se-signing.bpmn';
    
    // 1. Parse BPMN file
    const parseResult = await parseBpmnFile(`/bpmn/${fileName}`);
    const sequenceFlows = parseResult.sequenceFlows || [];
    
    console.log('\n=== BPMN File Analysis ===');
    console.log(`File: ${fileName}`);
    console.log(`Sequence flows: ${sequenceFlows.length}`);
    console.log('\nNOTE: This file has embedded subProcesses with tasks inside them.');
    console.log('This creates nodes with different depths, which affects generation order.');
    
    // 2. Build graph
    const graph = await buildBpmnProcessGraph(
      fileName,
      [fileName],
    );
    
    // Get nodes from signing file
    const signingNodes = graph.fileNodes.get(fileName) || [];
    
    console.log(`\n=== Nodes in ${fileName} ===`);
    console.log(`Total nodes: ${signingNodes.length}`);
    
    // 3. Calculate depth for each node
    const calculateDepth = (node: typeof signingNodes[0], visited = new Set<string>()): number => {
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
    
    const nodesWithDepth = signingNodes.map(node => ({
      node,
      depth: calculateDepth(node),
      orderIndex: node.orderIndex ?? node.visualOrderIndex ?? 999,
      type: node.type,
      name: node.name || node.bpmnElementId || 'unnamed',
    }));
    
    // Group by depth
    const byDepth = new Map<number, typeof nodesWithDepth>();
    nodesWithDepth.forEach(item => {
      const depth = item.depth;
      if (!byDepth.has(depth)) {
        byDepth.set(depth, []);
      }
      byDepth.get(depth)!.push(item);
    });
    
    console.log('\n=== Nodes Grouped by Depth ===');
    const depths = Array.from(byDepth.keys()).sort((a, b) => b - a);
    depths.forEach(depth => {
      const nodesAtDepth = byDepth.get(depth)!;
      console.log(`\nDepth ${depth} (${nodesAtDepth.length} nodes):`);
      nodesAtDepth
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach(({ node, orderIndex, type, name }) => {
          const orderStr = orderIndex !== 999 ? `orderIndex: ${orderIndex}` : 'no orderIndex';
          console.log(`  - ${node.bpmnElementId} (${type}) [${orderStr}] - ${name}`);
        });
    });
    
    // 4. Show execution order (by orderIndex)
    const nodesWithOrder = nodesWithDepth
      .filter(n => n.orderIndex !== 999)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    
    console.log('\n=== Execution Order (by orderIndex) ===');
    console.log('This is the order nodes execute in the BPMN process:');
    nodesWithOrder.forEach(({ node, orderIndex, depth, type, name }) => {
      console.log(`  [${orderIndex}] depth:${depth} ${node.bpmnElementId} (${type}) - ${name}`);
    });
    
    // 5. Show generation order (as sorted in code: depth DESC, then orderIndex ASC)
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
      return a.name.localeCompare(b.name);
    });
    
    console.log('\n=== Generation Order (as sorted in code) ===');
    console.log('Sorting: 1) depth DESC (leaf nodes first), 2) orderIndex ASC, 3) alphabetical');
    console.log('\nThis is the order nodes are GENERATED:');
    sortedAsGeneration.forEach(({ node, depth, orderIndex, type, name }, idx) => {
      const orderStr = orderIndex !== 999 ? `orderIndex: ${orderIndex}` : 'no orderIndex';
      console.log(`  ${idx + 1}. [depth: ${depth}] [${orderStr}] ${node.bpmnElementId} (${type}) - ${name}`);
    });
    
    // 6. Compare: execution order vs generation order
    console.log('\n=== Comparison: Execution Order vs Generation Order ===');
    console.log('\nExecution order → Generation position:');
    nodesWithOrder.forEach((execNode, execIdx) => {
      const genIdx = sortedAsGeneration.findIndex(({ node }) => node.id === execNode.node.id);
      const genDepth = sortedAsGeneration[genIdx]?.depth ?? -1;
      const execDepth = execNode.depth;
      const match = execIdx === genIdx ? '✓' : '✗';
      console.log(`  ${match} ${execIdx + 1}. ${execNode.node.bpmnElementId} (exec depth:${execDepth}, orderIndex:${execNode.orderIndex}) → Generated at position ${genIdx + 1} (gen depth:${genDepth})`);
    });
    
    // 7. Check if generation order matches execution order
    const executionOrderIds = nodesWithOrder.map(n => n.node.id);
    const generationOrderIds = sortedAsGeneration.map(({ node }) => node.id);
    
    const matchesExecutionOrder = executionOrderIds.every((id, idx) => id === generationOrderIds[idx]);
    
    console.log('\n=== Conclusion ===');
    if (matchesExecutionOrder) {
      console.log('✅ Generation order MATCHES execution order');
      console.log('   (This is unusual - all nodes must have the same depth)');
    } else {
      console.log('❌ Generation order does NOT match execution order');
      console.log('\n   REASON: Nodes have different depths!');
      console.log('   - Depth is the PRIMARY sort key');
      console.log('   - All nodes with depth 0 are generated BEFORE nodes with depth > 0');
      console.log('   - Execution order (orderIndex) is only respected WITHIN the same depth level');
      console.log('\n   EXAMPLE:');
      const depth0Nodes = nodesWithOrder.filter(n => n.depth === 0);
      const depth1PlusNodes = nodesWithOrder.filter(n => n.depth > 0);
      if (depth0Nodes.length > 0 && depth1PlusNodes.length > 0) {
        const lastDepth0 = depth0Nodes[depth0Nodes.length - 1];
        const firstDepth1Plus = depth1PlusNodes[0];
        if (lastDepth0.orderIndex > firstDepth1Plus.orderIndex) {
          console.log(`   - Node "${lastDepth0.node.bpmnElementId}" (orderIndex: ${lastDepth0.orderIndex}, depth: 0)`);
          console.log(`     is generated AFTER node "${firstDepth1Plus.node.bpmnElementId}" (orderIndex: ${firstDepth1Plus.orderIndex}, depth: ${firstDepth1Plus.depth})`);
          console.log(`     even though it executes LATER in the BPMN process!`);
        }
      }
    }
    
    // 8. Show the key insight
    console.log('\n=== Key Insight ===');
    console.log('Generation sorting prioritizes HIERARCHY (depth) over EXECUTION ORDER (orderIndex).');
    console.log('This ensures:');
    console.log('  ✓ Child nodes are generated before parent nodes (for documentation context)');
    console.log('  ✗ But execution order is NOT preserved across different depth levels');
    console.log('\nThis is by design - the hierarchical structure is more important for documentation');
    console.log('than the exact execution sequence.');
    
    // Assertions
    expect(signingNodes.length).toBeGreaterThan(0);
    expect(nodesWithOrder.length).toBeGreaterThan(0);
    expect(sortedAsGeneration.length).toBe(signingNodes.length);
    
    // Check if we have nodes with different depths
    const uniqueDepths = new Set(nodesWithDepth.map(n => n.depth));
    const hasDifferentDepths = uniqueDepths.size > 1;
    
    if (hasDifferentDepths) {
      console.log('\n✅ Confirmed: File has nodes with different depths');
      console.log(`   Depths found: ${Array.from(uniqueDepths).sort((a, b) => b - a).join(', ')}`);
      
      // Check if there's a case where a node with higher depth has higher orderIndex than a node with lower depth
      // This would cause generation order to NOT match execution order
      const depth1Nodes = nodesWithOrder.filter(n => n.depth > 0);
      const depth0Nodes = nodesWithOrder.filter(n => n.depth === 0);
      
      let orderViolation = false;
      if (depth1Nodes.length > 0 && depth0Nodes.length > 0) {
        const maxDepth1OrderIndex = Math.max(...depth1Nodes.map(n => n.orderIndex));
        const minDepth0OrderIndex = Math.min(...depth0Nodes.map(n => n.orderIndex));
        
        if (maxDepth1OrderIndex > minDepth0OrderIndex) {
          orderViolation = true;
          console.log(`\n⚠️  Found order violation:`);
          console.log(`   A node with depth > 0 has orderIndex ${maxDepth1OrderIndex}`);
          console.log(`   which is HIGHER than a node with depth 0 (orderIndex ${minDepth0OrderIndex})`);
          console.log(`   This means generation order will NOT match execution order!`);
        } else {
          console.log(`\n   Note: All depth > 0 nodes have orderIndex <= all depth 0 nodes`);
          console.log(`   So generation order still matches execution order in this case.`);
        }
      }
      
      // Only expect mismatch if there's an actual order violation
      if (orderViolation) {
        expect(matchesExecutionOrder).toBe(false);
      } else {
        console.log(`\n   In this specific case, generation order matches execution order`);
        console.log(`   because all higher-depth nodes execute before lower-depth nodes.`);
      }
    } else {
      console.log('\n⚠️  All nodes have the same depth - generation order will match execution order');
    }
    
    console.log('\n✅ Analysis complete');
  }, 30000);
});
