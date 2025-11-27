import type {
  ScenarioAssertionType,
  ScenarioPersona,
  ScenarioRiskLevel,
  ScenarioUiStep,
} from '@/lib/epicDocTypes';

/**
 * E2E (End-to-End) Test Scenario Types
 * 
 * Represents complete business flows across subprocesses and nodes
 * in the top-level BPMN process (e.g., mortgage.bpmn).
 */

export interface E2EScenarioPath {
  subprocessName: string;
  featureGoals: string[];
  keyNodes: string[];
}

export interface E2EScenario {
  id: string;
  initiative: string;
  name: string;
  description?: string;
  bpmnFile: string;
  path: E2EScenarioPath;
  tags: string[];
  testFilePath?: string;
  createdAt?: string;
  updatedAt?: string;
  persona?: ScenarioPersona;
  riskLevel?: ScenarioRiskLevel;
  assertionType?: ScenarioAssertionType;
  dataProfileId?: string;
  uiFlow?: ScenarioUiStep[];
}

/**
 * Helper to build E2E test name
 * Format: "<Initiative> – <ScenarioType>"
 */
export function buildE2ETestName(scenario: E2EScenario): string {
  return `${scenario.initiative} – ${scenario.name}`;
}

/**
 * Helper to build E2E tags for Playwright filtering
 */
export function buildE2ETags(scenario: E2EScenario): string[] {
  const slugify = (text: string) => 
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  
  return [
    '@e2e',
    `@initiative:${slugify(scenario.initiative)}`,
    `@bpmn-file:${slugify(scenario.bpmnFile)}`,
    ...scenario.tags.map(tag => tag.startsWith('@') ? tag : `@${slugify(tag)}`),
  ];
}

/**
 * Helper to build E2E annotations for Playwright test metadata
 */
export function buildE2EAnnotations(scenario: E2EScenario): Array<{ type: string; description: string }> {
  return [
    { type: 'e2e', description: 'true' },
    { type: 'initiative', description: scenario.initiative },
    { type: 'bpmn_file', description: scenario.bpmnFile },
    { type: 'scenario_name', description: scenario.name },
    ...scenario.path.subprocessName ? [{ type: 'subprocess', description: scenario.path.subprocessName }] : [],
    ...scenario.path.featureGoals.map(fg => ({ type: 'feature_goal', description: fg })),
  ];
}

/**
 * Generate Playwright E2E test code for a scenario
 */
export function generateE2ETestCode(scenario: E2EScenario, indent: string = '  '): string {
  const testName = buildE2ETestName(scenario);
  const tags = buildE2ETags(scenario);
  const annotations = buildE2EAnnotations(scenario);
  
  const annotationsCode = annotations
    .map(a => `${indent}${indent}testInfo.annotations.push({ type: '${a.type}', description: '${a.description}' });`)
    .join('\n');
  
  const tagsComment = tags.length > 0 
    ? `${indent}// Tags: ${tags.join(', ')}\n` 
    : '';
  
  return `${tagsComment}${indent}test('${testName}', async ({ page }, testInfo) => {
${annotationsCode}

${indent}${indent}// TODO: Implement E2E flow for this scenario
${indent}${indent}// Path: ${scenario.path.subprocessName}
${indent}${indent}// Feature Goals: ${scenario.path.featureGoals.join(', ')}
${indent}${indent}// Key Nodes: ${scenario.path.keyNodes.join(', ')}

${indent}${indent}// Example E2E flow structure:
${indent}${indent}// 1. Navigate to application
${indent}${indent}// 2. Complete ${scenario.path.subprocessName}
${indent}${indent}// 3. Verify expected outcomes
${indent}${indent}// 4. Assert final state

${indent}${indent}expect(true).toBe(true); // Placeholder
${indent}});`;
}
