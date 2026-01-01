import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario, BankProjectTestStep } from '@/pages/E2eTestsOverviewPage';
import { sortCallActivities } from '@/lib/ganttDataConverter';
import { fetchPlannedScenarios } from './testDataHelpers';
import type { TestScenario } from '@/data/testMapping';

export interface TestInfo {
  scenarioId: string;
  scenarioName: string;
  subprocessStep: E2eScenario['subprocessSteps'][0];
  bankProjectStep?: BankProjectTestStep;
  // Feature Goal-tester från databasen (om E2E-scenarios saknas)
  featureGoalScenario?: TestScenario;
}

export interface PathRow {
  path: ProcessTreeNode[];
  testInfoByCallActivity: Map<string, TestInfo[]>;
}

/**
 * Hitta test-information för en callActivity
 * Hämtar både E2E-scenarios och Feature Goal-tester från databasen
 */
export async function findTestInfoForCallActivity(
  callActivityId: string,
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
  bpmnFile?: string,
): Promise<TestInfo[]> {
  const testInfo: TestInfo[] = [];

  // 1. Hämta test-info från E2E-scenarios
  for (const scenario of scenarios) {
    // Om selectedScenarioId är angivet, hoppa över andra scenarion
    if (selectedScenarioId && scenario.id !== selectedScenarioId) {
      continue;
    }

    const subprocessStep = scenario.subprocessSteps.find(
      (step) => step.callActivityId === callActivityId,
    );
    if (subprocessStep) {
      const bankProjectStep = scenario.bankProjectTestSteps.find(
        (step) => step.bpmnNodeId === callActivityId,
      );

      testInfo.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subprocessStep,
        bankProjectStep,
      });
    }
  }

  // 2. Om inga E2E-scenarios hittades, hämta Feature Goal-tester från databasen
  if (testInfo.length === 0 && bpmnFile && callActivityId) {
    try {
      const plannedScenarios = await fetchPlannedScenarios(bpmnFile, callActivityId);
      if (plannedScenarios && plannedScenarios.scenarios.length > 0) {
        // Använd första scenariot (eller aggregera alla)
        const firstScenario = plannedScenarios.scenarios[0];
        
        // Skapa subprocessStep från Feature Goal-test
        const subprocessStep: E2eScenario['subprocessSteps'][0] = {
          order: 1,
          bpmnFile: bpmnFile,
          callActivityId: callActivityId,
          description: firstScenario.description || firstScenario.name || '',
          given: firstScenario.given || '',
          when: firstScenario.when || '',
          then: firstScenario.then || '',
        };

        testInfo.push({
          scenarioId: firstScenario.id || callActivityId,
          scenarioName: firstScenario.name || callActivityId,
          subprocessStep,
          featureGoalScenario: firstScenario,
        });
      }
    } catch (error) {
      console.warn(`[testCoverageHelpers] Failed to fetch Feature Goal tests for ${bpmnFile}::${callActivityId}:`, error);
    }
  }

  return testInfo;
}

/**
 * Bygg map över test-information för alla callActivities i sökvägen
 */
export async function buildTestInfoMap(
  path: ProcessTreeNode[],
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): Promise<Map<string, TestInfo[]>> {
  const testInfoMap = new Map<string, TestInfo[]>();

  for (const node of path) {
    if (node.type === 'callActivity' && node.bpmnElementId && node.bpmnFile) {
      const testInfo = await findTestInfoForCallActivity(node.bpmnElementId, scenarios, selectedScenarioId, node.bpmnFile);
      if (testInfo.length > 0) {
        testInfoMap.set(node.bpmnElementId, testInfo);
      }
    }
  }

  return testInfoMap;
}

/**
 * Flattena trädet till paths (varje path = en rad i tabellen)
 */
export async function flattenToPaths(
  node: ProcessTreeNode,
  scenarios: E2eScenario[],
  selectedScenarioId: string | undefined,
  currentPath: ProcessTreeNode[] = [],
): Promise<PathRow[]> {
  const newPath = [...currentPath, node];
  const rows: PathRow[] = [];

  // Om noden är en leaf (inga barn), skapa en rad
  if (node.children.length === 0) {
    const testInfoByCallActivity = await buildTestInfoMap(newPath, scenarios, selectedScenarioId);
    rows.push({ path: newPath, testInfoByCallActivity });
  } else {
    // Sortera barnen baserat på ProcessTree-ordningen (samma som Process Explorer)
    const sortedChildren = sortCallActivities(node.children);
    // Annars, fortsätt rekursivt med alla barn (i sorterad ordning)
    for (const child of sortedChildren) {
      const childRows = await flattenToPaths(child, scenarios, selectedScenarioId, newPath);
      rows.push(...childRows);
    }
  }

  return rows;
}

/**
 * Sortera paths baserat på ProcessTree-ordningen (samma logik som Process Explorer)
 */
export function sortPathsByProcessTreeOrder(
  pathRows: PathRow[],
): PathRow[] {
  return [...pathRows].sort((a, b) => {
    // Jämför paths nivå för nivå
    const minLength = Math.min(a.path.length, b.path.length);

    for (let i = 0; i < minLength; i++) {
      const nodeA = a.path[i];
      const nodeB = b.path[i];

      // Om samma nod, fortsätt till nästa nivå
      if (nodeA.id === nodeB.id) {
        continue;
      }

      // Sortera baserat på visualOrderIndex, orderIndex, branchId, label (samma som sortCallActivities)
      const aVisual = nodeA.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
      const bVisual = nodeB.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
      if (aVisual !== bVisual) {
        return aVisual - bVisual;
      }

      const aOrder = nodeA.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const bOrder = nodeB.orderIndex ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      if (nodeA.branchId !== nodeB.branchId) {
        if (nodeA.branchId === 'main') return -1;
        if (nodeB.branchId === 'main') return 1;
        return (nodeA.branchId || '').localeCompare(nodeB.branchId || '');
      }

      return nodeA.label.localeCompare(nodeB.label);
    }

    // Om en path är kortare än den andra, den kortare kommer först
    return a.path.length - b.path.length;
  });
}


