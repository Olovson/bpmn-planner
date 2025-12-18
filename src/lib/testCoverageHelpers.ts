import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario, BankProjectTestStep } from '@/pages/E2eTestsOverviewPage';
import { sortCallActivities } from '@/lib/ganttDataConverter';

export interface TestInfo {
  scenarioId: string;
  scenarioName: string;
  subprocessStep: E2eScenario['subprocessSteps'][0];
  bankProjectStep?: BankProjectTestStep;
}

export interface PathRow {
  path: ProcessTreeNode[];
  testInfoByCallActivity: Map<string, TestInfo[]>;
}

/**
 * Hitta test-information för en callActivity
 */
export function findTestInfoForCallActivity(
  callActivityId: string,
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): TestInfo[] {
  const testInfo: TestInfo[] = [];

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

  return testInfo;
}

/**
 * Bygg map över test-information för alla callActivities i sökvägen
 */
export function buildTestInfoMap(
  path: ProcessTreeNode[],
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): Map<string, TestInfo[]> {
  const testInfoMap = new Map<string, TestInfo[]>();

  for (const node of path) {
    if (node.type === 'callActivity' && node.bpmnElementId) {
      const testInfo = findTestInfoForCallActivity(node.bpmnElementId, scenarios, selectedScenarioId);
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
export function flattenToPaths(
  node: ProcessTreeNode,
  scenarios: E2eScenario[],
  selectedScenarioId: string | undefined,
  currentPath: ProcessTreeNode[] = [],
): PathRow[] {
  const newPath = [...currentPath, node];
  const rows: PathRow[] = [];

  // Om noden är en leaf (inga barn), skapa en rad
  if (node.children.length === 0) {
    const testInfoByCallActivity = buildTestInfoMap(newPath, scenarios, selectedScenarioId);
    rows.push({ path: newPath, testInfoByCallActivity });
  } else {
    // Sortera barnen baserat på ProcessTree-ordningen (samma som Process Explorer)
    const sortedChildren = sortCallActivities(node.children);
    // Annars, fortsätt rekursivt med alla barn (i sorterad ordning)
    for (const child of sortedChildren) {
      rows.push(...flattenToPaths(child, scenarios, selectedScenarioId, newPath));
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


