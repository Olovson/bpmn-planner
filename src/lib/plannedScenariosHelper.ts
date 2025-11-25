import { supabase } from '@/integrations/supabase/client';
import { testMapping, type TestScenario } from '@/data/testMapping';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';

/**
 * Creates base planned scenarios for testable nodes.
 * This is a shared function used by both bpmnGenerators and handleBuildHierarchy
 * to avoid code duplication.
 */
export interface PlannedScenarioRow {
  bpmn_file: string;
  bpmn_element_id: string;
  provider: 'local-fallback';
  origin: 'design';
  scenarios: TestScenario[];
}

/**
 * Creates planned scenario rows from ProcessTree nodes
 */
export function createPlannedScenariosFromTree(
  tree: ProcessTreeNode,
): PlannedScenarioRow[] {
  const rows: PlannedScenarioRow[] = [];
  const seen = new Set<string>();

  const collectScenarios = (node: ProcessTreeNode): void => {
    // Only create scenarios for testable node types
    if (
      node.type === 'callActivity' ||
      node.type === 'userTask' ||
      node.type === 'serviceTask' ||
      node.type === 'businessRuleTask'
    ) {
      if (!node.bpmnFile || !node.bpmnElementId) {
        console.warn(
          '[createPlannedScenariosFromTree] Skipping node without bpmnFile or bpmnElementId:',
          { label: node.label, type: node.type, bpmnFile: node.bpmnFile, bpmnElementId: node.bpmnElementId },
        );
        return;
      }

      const key = `${node.bpmnFile}::${node.bpmnElementId}`;
      if (seen.has(key)) {
        console.warn(
          '[createPlannedScenariosFromTree] Duplicate node key skipped:',
          key,
          { label: node.label, type: node.type },
        );
        return;
      }
      seen.add(key);

      const nodeId = node.bpmnElementId;
      const name = node.label || nodeId;

      // Try to find template in testMapping first
      const template = testMapping[nodeId];
      let scenarios: TestScenario[] = [];

      if (template && template.scenarios && template.scenarios.length > 0) {
        scenarios = template.scenarios;
      } else {
        // Fallback: create a simple "happy path" scenario
        scenarios = [
          {
            id: `${nodeId}-auto`,
            name: `Happy path – ${name}`,
            description: 'Automatiskt genererat scenario baserat på nodens testskelett.',
            status: 'pending',
            category: 'happy-path',
          },
        ];
      }

      rows.push({
        bpmn_file: node.bpmnFile,
        bpmn_element_id: node.bpmnElementId,
        provider: 'local-fallback',
        origin: 'design',
        scenarios,
      });
    }

    // Recursively process children
    for (const child of node.children) {
      collectScenarios(child);
    }
  };

  collectScenarios(tree);
  return rows;
}

/**
 * Creates planned scenario rows from BpmnProcessGraph nodes
 */
export function createPlannedScenariosFromGraph(
  nodes: BpmnProcessNode[],
): PlannedScenarioRow[] {
  const rows: PlannedScenarioRow[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    if (!node.bpmnFile || !node.bpmnElementId) {
      console.warn(
        '[createPlannedScenariosFromGraph] Skipping node without bpmnFile or bpmnElementId:',
        { name: node.name, type: node.type, bpmnFile: node.bpmnFile, bpmnElementId: node.bpmnElementId },
      );
      continue;
    }

    const key = `${node.bpmnFile}::${node.bpmnElementId}`;
    if (seen.has(key)) {
      console.warn(
        '[createPlannedScenariosFromGraph] Duplicate node key skipped:',
        key,
        { name: node.name, type: node.type },
      );
      continue;
    }
    seen.add(key);

    const nodeId = node.bpmnElementId;
    const name = node.name || nodeId;

    // Try to find template in testMapping first
    const template = testMapping[nodeId];
    let scenarios: TestScenario[] = [];

    if (template && template.scenarios && template.scenarios.length > 0) {
      scenarios = template.scenarios;
    } else {
      // Fallback: create a simple "happy path" scenario
      scenarios = [
        {
          id: `${nodeId}-auto`,
          name: `Happy path – ${name}`,
          description: 'Automatiskt genererat scenario baserat på nodens testskelett.',
          status: 'pending',
          category: 'happy-path',
        },
      ];
    }

    rows.push({
      bpmn_file: node.bpmnFile,
      bpmn_element_id: node.bpmnElementId,
      provider: 'local-fallback',
      origin: 'design',
      scenarios,
    });
  }

  return rows;
}

/**
 * Saves planned scenarios to database
 */
export async function savePlannedScenarios(
  rows: PlannedScenarioRow[],
  context: string = 'unknown',
): Promise<{ success: boolean; count: number; error?: any }> {
  if (rows.length === 0) {
    console.warn(`[savePlannedScenarios] No rows to save (context: ${context})`);
    return { success: true, count: 0 };
  }

  const { data, error } = await supabase.from('node_planned_scenarios').upsert(rows, {
    onConflict: 'bpmn_file,bpmn_element_id,provider',
  });

  if (error) {
    console.error(
      `[savePlannedScenarios] Failed to upsert planned scenarios (context: ${context}):`,
      error,
      'Rows attempted:',
      rows.length,
    );
    return { success: false, count: 0, error };
  }

  console.log(
    `[savePlannedScenarios] Successfully saved ${rows.length} planned scenarios (context: ${context})`,
  );
  return { success: true, count: rows.length };
}

