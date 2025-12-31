import type { BpmnElement } from '@/lib/bpmnParser';
import type { EpicUserStory } from '../epicDocTypes';
import { generateExportReadyTest } from '../exportReadyTestGenerator';
import type { HierarchicalTestNode } from './types';

/**
 * Legacy function for backward compatibility
 * Recursively generate test structure for a node and its children
 */
export function generateNodeTests(node: HierarchicalTestNode, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  let result = '';

  if (node.children && Array.isArray(node.children) && node.children.length > 0) {
    // This is a container (CallActivity/Feature Goal)
    result += `\n${indent}test.describe('${node.name}', () => {\n`;
    node.children.forEach(child => {
      result += generateNodeTests(child, indentLevel + 1);
    });
    result += `${indent}});\n`;
  } else {
    // This is a leaf node (task/epic) - actual test
    const contextPath = node.parentPath && node.parentPath.length > 0
      ? node.parentPath.join(' → ') + ' → ' + node.name
      : node.name;
      
    result += `\n${indent}test('${node.name}', async ({ page }) => {\n`;
    result += `${indent}  // TODO: Implement test for ${node.name}\n`;
    result += `${indent}  // Type: ${node.type}\n`;
    result += `${indent}  // ID: ${node.id}\n`;
    result += `${indent}  // Context: ${contextPath}\n`;
    
    // Add type-specific scaffolding
    if (node.type === 'UserTask') {
      result += `${indent}  // Example: Test form display and submission\n`;
      result += `${indent}  // await page.goto('/path-to-task');\n`;
      result += `${indent}  // await expect(page.locator('[data-testid="${node.id}-form"]')).toBeVisible();\n`;
    } else if (node.type === 'ServiceTask') {
      result += `${indent}  // Example: Mock service call and verify\n`;
      result += `${indent}  // await page.route('**/api/service', route => route.fulfill({ ... }));\n`;
    } else if (node.type === 'BusinessRuleTask') {
      result += `${indent}  // Example: Test business rule evaluation\n`;
      result += `${indent}  // Provide input data and verify decision output\n`;
    } else if (node.type === 'CallActivity') {
      result += `${indent}  // Example: Test subprocess invocation\n`;
      result += `${indent}  // Verify subprocess is called and completes successfully\n`;
    }
    
    result += `${indent}  expect(true).toBe(true); // Replace with actual assertions\n`;
    result += `${indent}});\n`;
  }

  return result;
}

/**
 * Generate export-ready test from EpicUserStory
 * This creates tests ready for export to complete environment
 */
export function generateExportReadyTestFromUserStory(
  element: BpmnElement,
  userStory: EpicUserStory
): string {
  // Convert user story to a scenario-like format for the export generator
  const scenarioLike = {
    id: userStory.id,
    name: `User Story: ${userStory.goal}`,
    type: 'Happy', // Default, can be determined from acceptance criteria
    description: `Som ${userStory.role} vill jag ${userStory.goal} så att ${userStory.value}`,
    outcome: userStory.acceptanceCriteria.join('; '),
  };
  return generateExportReadyTest(element, scenarioLike, {
    includeBpmnMetadata: true,
    includePlaceholders: true,
    exportFormat: 'playwright',
  });
}

/**
 * Legacy test skeleton generator (for backward compatibility)
 */
export function generateTestSkeleton(element: BpmnElement, llmScenarios?: { name: string; description: string; expectedResult?: string; steps?: string[] }[]): string {
  const testName = element.name || element.id;
  const nodeType = element.type.replace('bpmn:', '');

  let testTemplate = `import { test, expect } from '@playwright/test';

test.describe('${testName} Tests', () => {
  test('should load the page successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BPMN Viewer/);
  });
`;

  if (llmScenarios && llmScenarios.length) {
    llmScenarios.forEach((scenario, index) => {
      const stepsComment = scenario.steps?.length
        ? scenario.steps.map((step, idx) => `    // ${idx + 1}. ${step}`).join('\n')
        : '    // Beskriv stegen här';

      testTemplate += `
  test('${scenario.name.replace(/'/g, "\\'")}', async ({ page }) => {
    await page.goto('/');
${stepsComment}
    // Förväntat resultat: ${scenario.expectedResult || 'Beskriv resultat'}
    expect(true).toBe(true);
  });
`;
    });

    testTemplate += `});
`;
    return testTemplate;
  }

  // Add specific tests based on node type
  if (nodeType === 'UserTask') {
    testTemplate += `
  test('should display ${testName} form', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Add selectors for form elements
    // Example: await expect(page.locator('[data-testid="${element.id}-form"]')).toBeVisible();
  });

  test('should validate ${testName} input', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Test input validation
    const testData = {
      // Add test data fields
    };
    
    expect(testData).toBeTruthy();
  });

  test('should submit ${testName} successfully', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Test successful submission
  });
`;
  } else if (nodeType === 'ServiceTask') {
    testTemplate += `
  test('should call ${testName} service', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Mock service call
    const serviceResponse = {
      status: 'success',
      data: {}
    };
    
    expect(serviceResponse.status).toBe('success');
  });

  test('should handle ${testName} service errors', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Test error handling
  });
`;
  } else if (nodeType === 'BusinessRuleTask') {
    testTemplate += `
  test('should evaluate ${testName} rules', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Test business rule evaluation
    const ruleInput = {
      // Add rule input data
    };
    
    expect(ruleInput).toBeTruthy();
  });

  test('should handle ${testName} rule outcomes', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Test different rule outcomes
  });
`;
  } else if (nodeType === 'CallActivity') {
    testTemplate += `
  test('should execute ${testName} subprocess', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Test subprocess execution
  });

  test('should handle ${testName} subprocess completion', async ({ page }) => {
    await page.goto('/');
    
    // TODO: Test subprocess completion handling
  });
`;
  }

  testTemplate += `});
`;

  return testTemplate;
}



