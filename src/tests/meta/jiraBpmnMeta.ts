/**
 * BPMN → Jira → Test Metadata Utilities
 * 
 * This module provides standardized functions for generating test names,
 * tags, and annotations that align with our BPMN hierarchy and Jira structure.
 * 
 * USAGE IN GENERATED TESTS:
 * 
 * ```ts
 * import { buildTestName, buildAnnotations, type NodeMeta } from '@/tests/meta/jiraBpmnMeta';
 * 
 * const meta: NodeMeta = {
 *   initiative: 'Application',
 *   featureGoalPath: ['Internal data gathering'],
 *   nodeName: 'Fetch party information',
 *   bpmnFile: 'mortgage-se-application.bpmn',
 *   bpmnElementId: 'fetch-party-information',
 *   jiraType: 'epic',
 *   jiraName: 'Application - Internal data gathering - Fetch party information',
 * };
 * 
 * test(buildTestName(meta, 'happy path'), async ({ page }, testInfo) => {
 *   buildAnnotations(meta).forEach(annotation => 
 *     testInfo.annotations.push(annotation)
 *   );
 *   // ... test implementation
 * });
 * ```
 * 
 * FILTERING TESTS VIA CLI:
 * 
 * Run all tests for an initiative:
 *   npx playwright test --grep "@initiative:application"
 * 
 * Run all tests for a feature goal:
 *   npx playwright test --grep "@feature:application-internal-data-gathering"
 * 
 * Run all tests for a specific epic/node:
 *   npx playwright test --grep "@epic:application-internal-data-gathering-fetch-party-information"
 * 
 * Run all tests for a BPMN element:
 *   npx playwright test --grep "@bpmn:fetch-party-information"
 */

export type NodeMeta = {
  initiative: string;        // e.g. "Application"
  featureGoalPath: string[]; // e.g. ["Internal data gathering"]
  nodeName: string;          // e.g. "Fetch party information"
  bpmnFile: string;          // e.g. "mortgage-se-application.bpmn"
  bpmnElementId: string;     // e.g. "fetch-party-information"
  jiraType: 'feature goal' | 'epic';
  jiraName: string;          // e.g. "Application - Internal data gathering - Fetch party information"
};

/**
 * Slugify a string for use in tags
 * Converts to lowercase and replaces spaces/special chars with hyphens
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a standardized test name following the pattern:
 * <Initiative> / <FeatureGoalPath> / <NodeName> – <ScenarioType>
 * 
 * Examples:
 * - "Application / Confirm application – happy path"
 * - "Application / Internal data gathering / Fetch party information – validation error"
 */
export function buildTestName(meta: NodeMeta, scenario: string): string {
  const parts = [meta.initiative];
  
  if (meta.featureGoalPath.length > 0) {
    parts.push(...meta.featureGoalPath);
  }
  
  parts.push(meta.nodeName);
  
  return `${parts.join(' / ')} – ${scenario}`;
}

/**
 * Build standardized tags for filtering tests.
 * Tags are prefixed with @ and use slugified text for easy CLI filtering.
 * 
 * Returns tags like:
 * - @initiative:application
 * - @feature:application-internal-data-gathering
 * - @epic:application-internal-data-gathering-fetch-party-information
 * - @bpmn:fetch-party-information
 * - @jira-type:epic
 */
export function buildTags(meta: NodeMeta): string[] {
  const tags: string[] = [];
  
  // Initiative tag
  tags.push(`@initiative:${slugify(meta.initiative)}`);
  
  // Feature goal tags (one for each level in the path)
  if (meta.featureGoalPath.length > 0) {
    const featurePath = [meta.initiative, ...meta.featureGoalPath];
    tags.push(`@feature:${slugify(featurePath.join(' '))}`);
  }
  
  // Epic/node tag (full hierarchical path)
  const epicPath = [meta.initiative, ...meta.featureGoalPath, meta.nodeName];
  tags.push(`@epic:${slugify(epicPath.join(' '))}`);
  
  // Jira type tag
  tags.push(`@jira-type:${slugify(meta.jiraType)}`);
  
  // BPMN tags
  tags.push(`@bpmn:${slugify(meta.bpmnElementId)}`);
  tags.push(`@bpmn-file:${slugify(meta.bpmnFile.replace('.bpmn', ''))}`);
  
  return tags;
}

/**
 * Build Playwright annotations for test metadata.
 * These annotations are stored with test results and can be used in custom reporters.
 */
export function buildAnnotations(meta: NodeMeta): Array<{ type: string; description: string }> {
  const annotations: Array<{ type: string; description: string }> = [];
  
  // Add all tags as annotations
  buildTags(meta).forEach(tag => {
    annotations.push({ type: 'tag', description: tag });
  });
  
  // Add structured metadata annotations
  annotations.push(
    { type: 'initiative', description: meta.initiative },
    { type: 'jiraType', description: meta.jiraType },
    { type: 'jiraName', description: meta.jiraName },
    { type: 'bpmnFile', description: meta.bpmnFile },
    { type: 'bpmnElementId', description: meta.bpmnElementId },
    { type: 'bpmnElementName', description: meta.nodeName }
  );
  
  // Add feature goal path
  if (meta.featureGoalPath.length > 0) {
    annotations.push({
      type: 'featureGoal',
      description: [meta.initiative, ...meta.featureGoalPath].join(' - ')
    });
  }
  
  return annotations;
}

/**
 * Extract metadata from a BpmnHierarchyNode for use in test generation
 */
export function nodeToMeta(
  node: {
    name: string;
    type: string;
    bpmnFile: string;
    id: string;
    parentPath: string[];
    jiraType?: 'feature goal' | 'epic' | null;
    jiraName?: string | null;
  },
  initiative: string
): NodeMeta {
  // Determine feature goal path (all CallActivities in parent chain)
  const featureGoalPath: string[] = [];
  for (const parentName of node.parentPath) {
    // Skip the root/initiative name from the path
    if (parentName !== initiative) {
      featureGoalPath.push(parentName);
    }
  }
  
  return {
    initiative,
    featureGoalPath,
    nodeName: node.name,
    bpmnFile: node.bpmnFile,
    bpmnElementId: node.id,
    jiraType: node.jiraType || null, // No fallback - use data from database only
    jiraName: node.jiraName || null, // No fallback - use data from database only
  };
}

/**
 * Generate test code that includes name, tags, and annotations
 */
export function generateTestCode(
  meta: NodeMeta,
  scenario: string,
  indent: string = '  '
): string {
  const testName = buildTestName(meta, scenario);
  const tags = buildTags(meta);
  
  return `${indent}test('${testName}', async ({ page }, testInfo) => {
${indent}  // Attach metadata for filtering and reporting
${indent}  const annotations = [
${tags.map(tag => `${indent}    { type: 'tag', description: '${tag}' },`).join('\n')}
${indent}    { type: 'initiative', description: '${meta.initiative}' },
${indent}    { type: 'jiraType', description: '${meta.jiraType}' },
${indent}    { type: 'jiraName', description: '${meta.jiraName}' },
${indent}    { type: 'bpmnFile', description: '${meta.bpmnFile}' },
${indent}    { type: 'bpmnElementId', description: '${meta.bpmnElementId}' },
${indent}    { type: 'bpmnElementName', description: '${meta.nodeName}' },
${meta.featureGoalPath.length > 0 ? `${indent}    { type: 'featureGoal', description: '${[meta.initiative, ...meta.featureGoalPath].join(' - ')}' },` : ''}
${indent}  ];
${indent}  
${indent}  annotations.forEach(annotation => testInfo.annotations.push(annotation));
${indent}  
${indent}  // TODO: Implement test for ${meta.nodeName}
${indent}  // Type: ${meta.jiraType}
${indent}  // Jira: ${meta.jiraName}
${indent}  expect(true).toBe(true);
${indent}});`;
}
