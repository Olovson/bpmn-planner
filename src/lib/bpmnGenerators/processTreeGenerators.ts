import type { ProcessTreeNode } from '@/lib/processTree';

/**
 * Generate hierarchical test file from ProcessTree
 * Uses ProcessTreeNode directly instead of BpmnHierarchyNode
 */
export function generateHierarchicalTestFileFromTree(
  root: ProcessTreeNode,
  bpmnFile: string
): string {
  const contextRoot = root.label;
  let testTemplate = `import { test, expect } from '@playwright/test';

/**
 * Hierarchical Tests for: ${contextRoot}
 * BPMN File: ${bpmnFile}
 * 
 * This test file mirrors the BPMN process hierarchy:
 * - Root: ${contextRoot} (Initiative/Process)
 * - Feature Goals: CallActivities (nested describe blocks)
 * - Epics: UserTask/ServiceTask/BusinessRuleTask (test cases)
 * 
 * Each test includes metadata annotations for filtering:
 * - @initiative:${contextRoot.toLowerCase().replace(/\s+/g, '-')}
 * - @feature:<feature-goal-path>
 * - @epic:<full-hierarchical-path>
 * - @bpmn:<element-id>
 * 
 * Architecture: Tests, documentation, and dashboard all use the
 * same ProcessTree model to ensure consistency across the application.
 */

test.describe('${contextRoot}', () => {
`;

  // Generate nested structure from ProcessTree
  root.children.forEach(child => {
    testTemplate += generateNodeTestsFromProcessTree(child, contextRoot, 1);
  });

  testTemplate += '});\n';
  return testTemplate;
}

/**
 * Recursively generate test structure from ProcessTreeNode
 */
function generateNodeTestsFromProcessTree(
  node: ProcessTreeNode,
  initiative: string,
  indentLevel: number
): string {
  const indent = '  '.repeat(indentLevel);
  let result = '';

  if (node.type === 'process') {
    // Process node - generate children only
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        result += generateNodeTestsFromProcessTree(child, initiative, indentLevel);
      });
    }
  } else if (node.type === 'callActivity') {
    // Feature goal - create describe block
    const orderPrefix = typeof node.orderIndex === 'number' ? `[#${node.orderIndex}] ` : '';
    result += `\n${indent}test.describe('${orderPrefix}${node.label}', () => {\n`;

    // Generate tests for children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        result += generateNodeTestsFromProcessTree(child, initiative, indentLevel + 1);
      });
    }
    
    result += `${indent}});\n`;
  } else if (node.type === 'userTask' || node.type === 'serviceTask' || node.type === 'businessRuleTask') {
    // Leaf node - generate test
    const orderPrefix = typeof node.orderIndex === 'number' ? `[#${node.orderIndex}] ` : '';
    const scenarioPath = node.scenarioPath?.join('/') ?? 'main';
    const bpmnId = node.bpmnElementId || node.id;
    
    result += `\n${indent}test('${orderPrefix}${node.label}', async ({ page }) => {\n`;
    result += `${indent}  // TODO: Implement test for ${node.label}\n`;
    result += `${indent}  // Type: ${node.type}\n`;
    result += `${indent}  // ID: ${bpmnId}\n`;
    result += `${indent}  // BPMN File: ${node.bpmnFile}\n`;
    result += `${indent}  // Scenario Path: ${scenarioPath}\n`;
    result += `${indent}  // @initiative:${initiative.toLowerCase().replace(/\s+/g, '-')}\n`;
    result += `${indent}  // @bpmn:${bpmnId}\n`;
    
    // Add type-specific scaffolding
    if (node.type === 'userTask') {
      result += `${indent}  // Example: Test form display and submission\n`;
      result += `${indent}  // await page.goto('/path-to-task');\n`;
      result += `${indent}  // await expect(page.locator('[data-testid="${bpmnId}-form"]')).toBeVisible();\n`;
    } else if (node.type === 'serviceTask') {
      result += `${indent}  // Example: Mock service call and verify\n`;
      result += `${indent}  // await page.route('**/api/service', route => route.fulfill({ ... }));\n`;
    } else if (node.type === 'businessRuleTask') {
      result += `${indent}  // Example: Test business rule evaluation\n`;
      result += `${indent}  // Provide input data and verify decision output\n`;
    }
    
    result += `${indent}  expect(true).toBe(true); // Replace with actual assertions\n`;
    result += `${indent}});\n`;
  }

  return result;
}

/**
 * Generate documentation from ProcessTree
 * Traverses the tree and generates documentation sections
 */
export function generateDocumentationFromTree(
  root: ProcessTreeNode,
  options: {
    includeOrderIndex?: boolean;
    includeScenarioPath?: boolean;
  } = {}
): string {
  const { includeOrderIndex = true, includeScenarioPath = false } = options;
  
  let html = `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${root.label} - Process Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            min-height: 100vh;
        }
        
        h1 {
            color: #0066cc;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        h2 {
            color: #0066cc;
            font-size: 1.8rem;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        h3 {
            color: #333;
            font-size: 1.3rem;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        .meta {
            display: flex;
            gap: 20px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            background: #f0f0f0;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .badge-process {
            background: #3B82F6;
            color: white;
        }
        
        .badge-callActivity {
            background: #8B5CF6;
            color: white;
        }
        
        .badge-userTask {
            background: #10B981;
            color: white;
        }
        
        .badge-serviceTask {
            background: #F97316;
            color: white;
        }
        
        .badge-businessRuleTask {
            background: #F59E0B;
            color: white;
        }
        
        .diagnostics {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        
        .diagnostics.error {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${root.label}</h1>
            <p class="subtitle">Process Documentation</p>
            <div class="meta">
                <div class="meta-item">
                    <span>Type:</span>
                    <span class="badge badge-${root.type}">${root.type}</span>
                </div>
                <div class="meta-item">
                    <span>BPMN File:</span>
                    <code>${root.bpmnFile}</code>
                </div>
                ${root.bpmnElementId ? `<div class="meta-item">
                    <span>Element ID:</span>
                    <code>${root.bpmnElementId}</code>
                </div>` : ''}
                ${includeOrderIndex && typeof root.orderIndex === 'number' ? `<div class="meta-item">
                    <span>Order Index:</span>
                    <code>#${root.orderIndex}</code>
                </div>` : ''}
            </div>
        </header>
        
        <section>
            ${generateNodeDocumentation(root, includeOrderIndex, includeScenarioPath)}
        </section>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Recursively generate documentation sections from ProcessTreeNode
 */
function generateNodeDocumentation(
  node: ProcessTreeNode,
  includeOrderIndex: boolean,
  includeScenarioPath: boolean,
  depth: number = 0
): string {
  let html = '';

  // Skip root process node itself, only document its children
  if (depth > 0) {
    const headingLevel = depth === 1 ? 'h2' : depth === 2 ? 'h3' : 'h4';
    const orderPrefix = includeOrderIndex && typeof node.orderIndex === 'number' 
      ? `${node.orderIndex}. ` 
      : '';
    
    html += `<${headingLevel}>${orderPrefix}${node.label}</${headingLevel}>\n`;
    html += `<div class="meta">\n`;
    html += `  <span class="badge badge-${node.type}">${node.type}</span>\n`;
    html += `  <span>File: <code>${node.bpmnFile}</code></span>\n`;
    if (node.bpmnElementId) {
      html += `  <span>Element: <code>${node.bpmnElementId}</code></span>\n`;
    }
    if (includeOrderIndex && typeof node.orderIndex === 'number') {
      html += `  <span>Order: <code>#${node.orderIndex}</code></span>\n`;
    }
    if (includeScenarioPath && node.scenarioPath && node.scenarioPath.length > 0) {
      html += `  <span>Scenario Path: <code>${node.scenarioPath.join(' → ')}</code></span>\n`;
    }
    html += `</div>\n`;
    
    html += `<p>Documentation for ${node.type} node: ${node.label}</p>\n`;
  }

  // Recursively generate documentation for children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      html += generateNodeDocumentation(child, includeOrderIndex, includeScenarioPath, depth + 1);
    });
  }

  return html;
}




