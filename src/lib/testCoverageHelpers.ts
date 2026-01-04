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
  subprocessFile?: string,
): Promise<TestInfo[]> {
  const testInfo: TestInfo[] = [];

  // 1. Hämta test-info från E2E-scenarios
  for (const scenario of scenarios) {
    // Om selectedScenarioId är angivet, hoppa över andra scenarion
    if (selectedScenarioId && scenario.id !== selectedScenarioId) {
      continue;
    }

    // VIKTIGT: Matcha både callActivityId OCH bpmnFile för att få rätt subprocessStep
    const subprocessStep = scenario.subprocessSteps.find(
      (step) => step.callActivityId === callActivityId && 
                (bpmnFile ? step.bpmnFile === bpmnFile : true), // Om bpmnFile är angivet, matcha på det också
    );
    if (subprocessStep) {
      const bankProjectStep = scenario.bankProjectTestSteps.find(
        (step) => step.bpmnNodeId === callActivityId,
      );

      if (import.meta.env.DEV) {
        console.log(`[testCoverageHelpers] Found E2E subprocessStep for ${bpmnFile || 'unknown'}::${callActivityId}:`, {
          hasDescription: !!subprocessStep.description,
          descriptionPreview: subprocessStep.description?.substring(0, 100),
        });
      }

      testInfo.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subprocessStep,
        bankProjectStep,
      });
    }
  }

  // 2. Om inga E2E-scenarios hittades ELLER om E2E-scenarios saknar given/when/then,
  // hämta Feature Goal-tester från databasen som fallback
  const hasE2eTestInfo = testInfo.length > 0 && testInfo.some(
    info =>
      info.subprocessStep?.given ||
      info.subprocessStep?.when ||
      info.subprocessStep?.then
  );
  
  if (!hasE2eTestInfo && bpmnFile && callActivityId) {
    try {
      if (import.meta.env.DEV) {
        console.log(`[testCoverageHelpers] Fetching Feature Goal tests for ${bpmnFile}::${callActivityId}`);
      }
      
      const plannedScenarios = await fetchPlannedScenarios(bpmnFile, callActivityId);
      
      if (import.meta.env.DEV) {
        if (plannedScenarios && plannedScenarios.scenarios.length > 0) {
          console.log(`[testCoverageHelpers] Found ${plannedScenarios.scenarios.length} scenarios for ${bpmnFile}::${callActivityId}`);
        } else {
          console.log(`[testCoverageHelpers] No scenarios found in database for ${bpmnFile}::${callActivityId}`);
        }
      }
      
      if (plannedScenarios && plannedScenarios.scenarios.length > 0) {
        // Använd första scenariot (eller aggregera alla)
        const firstScenario = plannedScenarios.scenarios[0];
        
        if (import.meta.env.DEV) {
          console.log(`[testCoverageHelpers] Found Feature Goal test for ${bpmnFile}::${callActivityId}:`, {
            id: firstScenario.id,
            name: firstScenario.name,
            hasDescription: !!firstScenario.description,
            descriptionPreview: firstScenario.description?.substring(0, 100) + '...',
          });
        }
        
        // Skapa subprocessStep från Feature Goal-test
        const subprocessStep: E2eScenario['subprocessSteps'][0] = {
          order: 1,
          bpmnFile: bpmnFile,
          callActivityId: callActivityId,
          description: firstScenario.description || firstScenario.name || '',
          given: firstScenario.given,
          when: firstScenario.when,
          then: firstScenario.then,
        };

        testInfo.unshift({
          scenarioId: firstScenario.id || callActivityId,
          scenarioName: firstScenario.name || callActivityId,
          subprocessStep,
          featureGoalScenario: firstScenario,
        });
      } else {
        if (import.meta.env.DEV) {
          console.log(`[testCoverageHelpers] No Feature Goal tests found for ${bpmnFile}::${callActivityId}`);
        }
        if (subprocessFile) {
          try {
            const subprocessBaseName = subprocessFile.replace('.bpmn', '');
            const fallbackScenarios = await fetchPlannedScenarios(subprocessFile, subprocessBaseName);
            if (fallbackScenarios && fallbackScenarios.scenarios.length > 0) {
              const firstScenario = fallbackScenarios.scenarios[0];
              const subprocessStep: E2eScenario['subprocessSteps'][0] = {
                order: 1,
                bpmnFile: subprocessFile,
                callActivityId: callActivityId,
                description: firstScenario.description || firstScenario.name || '',
                given: firstScenario.given,
                when: firstScenario.when,
                then: firstScenario.then,
              };

              testInfo.unshift({
                scenarioId: firstScenario.id || callActivityId,
                scenarioName: firstScenario.name || callActivityId,
                subprocessStep,
                featureGoalScenario: firstScenario,
              });
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn(`[testCoverageHelpers] Fallback lookup failed for ${bpmnFile}::${callActivityId}:`, error);
            }
          }
        }
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
    if (node.type === 'callActivity' && node.bpmnElementId) {
      // För callActivities: bpmnFile är parent-filen där callActivity är definierad
      // Men testscenarios sparas med parent-filen, så vi använder node.bpmnFile direkt
      const bpmnFile = node.bpmnFile;
      if (bpmnFile && node.subprocessFile) {
        const testInfo = await findTestInfoForCallActivity(
          node.bpmnElementId,
          scenarios,
          selectedScenarioId,
          bpmnFile,
          node.subprocessFile,
        );
        if (testInfo.length > 0) {
          testInfoMap.set(node.bpmnElementId, testInfo);
        } else if (import.meta.env.DEV) {
          // Debug: logga om vi inte hittar testinfo
          console.log(`[testCoverageHelpers] No test info found for ${bpmnFile}::${node.bpmnElementId}`);
        }
      }
    }

    if (node.type === 'process') {
      const bpmnFile = node.bpmnFile;
      if (bpmnFile) {
        const processKey = bpmnFile.replace('.bpmn', '');
        const testInfo = await findTestInfoForCallActivity(processKey, scenarios, selectedScenarioId, bpmnFile);
        if (testInfo.length > 0) {
          testInfoMap.set(processKey, testInfo);
        }
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
