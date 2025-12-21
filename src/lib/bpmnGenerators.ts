import { BpmnElement, BpmnSubprocess, parseBpmnFile } from '@/lib/bpmnParser';
import { CriterionCategory, CriterionType } from '@/hooks/useDorDodStatus';
import { generateTestCode } from '@/tests/meta/jiraBpmnMeta';
import { buildNodeDocumentationContext } from '@/lib/documentationContext';
import {
  renderFeatureGoalDoc,
  renderEpicDoc,
  renderBusinessRuleDoc,
  type TemplateLinks,
} from '@/lib/documentationTemplates';
import { wrapLlmContentAsDocument } from '@/lib/wrapLlmContent';
import { getNodeDocFileKey, getNodeTestFileKey, getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';
import { generateDocumentationWithLlm, type DocumentationDocType } from '@/lib/llmDocumentation';
import { generateTestSpecWithLlm } from '@/lib/llmTests';
import type { LlmProvider } from './llmClientAbstraction';
import { getLlmClient, getDefaultLlmProvider } from './llmClients';
import { supabase } from '@/integrations/supabase/client';
import { isLlmEnabled } from '@/lib/llmClient';
import { logLlmFallback } from '@/lib/llmMonitoring';
import { saveLlmDebugArtifact } from '@/lib/llmDebugStorage';
import { CloudLlmAccountInactiveError } from '@/lib/llmClients/cloudLlmClient';
import {
  buildProcessHierarchy,
  type NormalizedProcessDefinition,
} from '@/lib/bpmn/buildProcessHierarchy';
import {
  buildProcessDefinitionsFromRegistry,
  type ProcessRegistryEntry,
} from '@/lib/bpmn/processDefinition';
import {
  resolveProcessFileName,
  resolveProcessFileNameByInternalId,
  traverseHierarchy,
} from '@/lib/bpmn/hierarchyTraversal';
import type { HierarchyNode, SubprocessLink } from '@/lib/bpmn/types';
import {
  buildBpmnProcessGraph,
  createGraphSummary,
  getTestableNodes,
} from '@/lib/bpmnProcessGraph';
import { testMapping, type TestScenario } from '@/data/testMapping';
import {
  createPlannedScenariosFromGraph,
  savePlannedScenarios,
  type PlannedScenarioRow,
} from '@/lib/plannedScenariosHelper';
import type { ProcessTreeNode } from '@/lib/processTree';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/buildProcessTreeFromGraph';
import { generateExportReadyTest } from './exportReadyTestGenerator';
import type { EpicUserStory } from './epicDocTypes';

export type GenerationPhaseKey =
  | 'graph:start'
  | 'graph:complete'
  | 'hier-tests:start'
  | 'hier-tests:file'
  | 'hier-tests:complete'
  | 'node-analysis:start'
  | 'node-analysis:node'
  | 'node-analysis:complete'
  | 'docgen:start'
  | 'docgen:file'
  | 'docgen:complete'
  | 'total:init';
import { getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';
import { buildDorDodCriteria, type DorDodNodeType } from '@/lib/templates/dorDodTemplates';

// ============= HIERARCHICAL TEST GENERATION =============

/**
 * Node for hierarchical test structure
 */
export interface HierarchicalTestNode {
  name: string;
  type: string;
  id: string;
  parentPath?: string[];
  children?: HierarchicalTestNode[];
}


/**
 * Legacy function for backward compatibility
 * Recursively generate test structure for a node and its children
 */
function generateNodeTests(node: HierarchicalTestNode, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  let result = '';

  if (node.children && node.children.length > 0) {
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

// ============= EXPORT-READY TEST GENERATOR =============

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

// ============= LEGACY TEST SKELETON GENERATOR (for backward compatibility) =============

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

// ============= DOR/DOD GENERATOR =============

interface DorDodCriterion {
  criterion_type: CriterionType;
  criterion_category: CriterionCategory;
  criterion_key: string;
  criterion_text: string;
}

export interface GeneratedCriterion {
  criterion_type: CriterionType;
  criterion_category: CriterionCategory;
  criterion_key: string;
  criterion_text: string;
  node_type?: string; // BPMN node type (UserTask, ServiceTask, etc.)
  bpmn_element_id?: string; // BPMN element ID
  bpmn_file?: string; // BPMN file name
}

export function generateDorDodCriteria(subprocessName: string, nodeType: string): DorDodCriterion[] {
  const criteria: DorDodCriterion[] = [];
  const normalizedName = subprocessName.toLowerCase().replace(/\s+/g, '_');

  // Definition of Ready (DoR) criteria
  criteria.push(
    {
      criterion_type: 'dor',
      criterion_category: 'process_krav',
      criterion_key: `${normalizedName}_process_defined`,
      criterion_text: 'Processflöde är definierat och dokumenterat'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_data_inputs`,
      criterion_text: 'Input-data och källor är identifierade'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_data_outputs`,
      criterion_text: 'Output-data och destinationer är definierade'
    }
  );

  // Add type-specific DoR criteria
  if (nodeType === 'UserTask') {
    criteria.push(
      {
        criterion_type: 'dor',
        criterion_category: 'design',
        criterion_key: `${normalizedName}_ui_design`,
        criterion_text: 'UI-design är godkänd i Figma'
      },
      {
        criterion_type: 'dor',
        criterion_category: 'funktion_krav',
        criterion_key: `${normalizedName}_user_stories`,
        criterion_text: 'User stories är definierade och accepterade'
      }
    );
  }

  if (nodeType === 'ServiceTask' || nodeType === 'BusinessRuleTask') {
    criteria.push(
      {
        criterion_type: 'dor',
        criterion_category: 'data_api',
        criterion_key: `${normalizedName}_api_spec`,
        criterion_text: 'API-specifikation är dokumenterad'
      },
      {
        criterion_type: 'dor',
        criterion_category: 'teknik_arkitektur',
        criterion_key: `${normalizedName}_tech_design`,
        criterion_text: 'Teknisk design är granskad'
      }
    );
  }

  criteria.push(
    {
      criterion_type: 'dor',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_test_cases`,
      criterion_text: 'Testfall är definierade'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'planering_beroenden',
      criterion_key: `${normalizedName}_dependencies`,
      criterion_text: 'Beroenden och integrationer är identifierade'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'team_alignment',
      criterion_key: `${normalizedName}_team_aligned`,
      criterion_text: 'Team har diskuterat och förstår uppgiften'
    }
  );

  // Definition of Done (DoD) criteria
  criteria.push(
    {
      criterion_type: 'dod',
      criterion_category: 'funktion_krav',
      criterion_key: `${normalizedName}_requirements_met`,
      criterion_text: 'Alla funktionella krav är implementerade'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_tests_passed`,
      criterion_text: 'Alla tester är gröna (unit, integration, E2E)'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_test_coverage`,
      criterion_text: 'Testtäckning uppfyller krav (minst 80%)'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'dokumentation',
      criterion_key: `${normalizedName}_documented`,
      criterion_text: 'Dokumentation är uppdaterad'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_deployed`,
      criterion_text: 'Kod är deployad till testmiljö'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_monitoring`,
      criterion_text: 'Monitoring och logging är implementerat'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_code_review`,
      criterion_text: 'Code review är genomförd och godkänd'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_demo`,
      criterion_text: 'Demo genomförd för stakeholders'
    }
  );

  return criteria;
}

/**
 * Genererar DoR/DoD-kriterier baserat på nodtyp.
 * Stödjer: ServiceTask, UserTask, BusinessRuleTask, CallActivity
 */
export function generateDorDodForNodeType(
  nodeType: DorDodNodeType,
  normalizedName: string
): GeneratedCriterion[] {
  return buildDorDodCriteria(nodeType, normalizedName);
}

// DoR/DoD criteria are sourced from static templates in src/lib/templates/dorDodTemplates.ts
// to ensure the LLM never rewrites or invents definitions.


// ============= DOCUMENTATION GENERATOR =============

export interface SubprocessSummary {
  fileName: string;
  totalNodes: number;
  userTasks: number;
  serviceTasks: number;
  businessRuleTasks: number;
  gateways: number;
  keyNodes: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export function generateDocumentationHTML(
  element: BpmnElement, 
  subprocessFile?: string,
  subprocessSummary?: SubprocessSummary,
  dorDodCriteria: DorDodCriterion[] = [],
): string {
  const nodeType = element.type.replace('bpmn:', '');
  const documentation = element.businessObject.documentation?.[0]?.text || 'Ingen dokumentation tillgänglig.';

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${element.name || element.id} - ${nodeType}</title>
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
        
        header {
            border-bottom: 3px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        h1 {
            color: #0066cc;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 1.2rem;
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
        
        .meta-label {
            font-weight: 600;
            color: #0066cc;
        }
        
        section {
            margin-bottom: 40px;
        }
        
        h2 {
            color: #0066cc;
            font-size: 1.8rem;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #0066cc;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .badge-primary {
            background: #0066cc;
            color: white;
        }
        
        .badge-warning {
            background: #ff9800;
            color: white;
        }
        
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        
        code {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${element.name || element.id}</h1>
            <p class="subtitle">${nodeType}</p>
            <div class="meta">
                <div class="meta-item">
                    <span class="meta-label">Node ID:</span>
                    <code>${element.id}</code>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Type:</span>
                    <span class="badge badge-primary">${nodeType}</span>
                </div>
                ${subprocessFile ? `
                <div class="meta-item">
                    <span class="meta-label">Subprocess:</span>
                    <a href="${subprocessFile}.html">${subprocessFile}</a>
                </div>
                ` : ''}
            </div>
        </header>

        <section>
            <h2>📋 Beskrivning</h2>
            <div class="card">
                <p>${documentation}</p>
            </div>
        </section>

        ${nodeType === 'UserTask' ? `
        <section>
            <h2>👤 User Task Information</h2>
            <div class="card">
                <p><strong>Användare:</strong> Interaktiv uppgift som kräver manuell input</p>
                <p><strong>Typ av interaktion:</strong> Formulär, godkännande eller datainmatning</p>
            </div>
        </section>
        ` : ''}

        ${nodeType === 'ServiceTask' ? `
        <section>
            <h2>⚙️ Service Task Information</h2>
            <div class="card">
                <p><strong>Typ:</strong> Automatisk systemuppgift</p>
                <p><strong>Utförs av:</strong> Backend-service eller API-anrop</p>
            </div>
        </section>
        ` : ''}

        ${nodeType === 'BusinessRuleTask' ? `
        <section>
            <h2>📊 Business Rule Task Information</h2>
            <div class="card">
                <p><strong>Typ:</strong> Regelbaserad beslutspunkt</p>
                <p><strong>Utförs av:</strong> Affärsregelmotor eller beslutslogik</p>
                ${subprocessFile ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <h3>📋 DMN Decision Table: ${subprocessFile}</h3>
                    ${subprocessSummary ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #0066cc;">${subprocessSummary.totalNodes}</div>
                            <div style="font-size: 0.9rem; color: #666;">Antal regler</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${subprocessSummary.userTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Input-kolumner</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${subprocessSummary.serviceTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Output-kolumner</div>
                        </div>
                    </div>
                    
                    ${subprocessSummary.keyNodes.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h4>📥 Input-kolumner:</h4>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                            ${subprocessSummary.keyNodes.slice(0, subprocessSummary.userTasks).map(node => `
                                <div class="card" style="display: flex; justify-content: between; align-items: center;">
                                    <strong>${node.name}</strong>
                                    <span style="font-size: 0.85rem; color: #666;">${node.type}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <p style="color: #666; font-size: 0.9rem;">
                            💡 DMN-tabellen visas automatiskt i BPMN-viewern när du väljer denna nod
                        </p>
                    </div>
                    ` : `
                    <p><span class="badge badge-warning">⚠️ DMN-fil ej hittad</span></p>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 10px;">
                        Förväntad fil: <code>${subprocessFile}</code>
                    </p>
                    `}
                </div>
                ` : ''}
            </div>
        </section>
        ` : ''}

        ${nodeType === 'CallActivity' ? `
        <section>
            <h2>🔄 Call Activity Information</h2>
            <div class="card">
                <p><strong>Typ:</strong> Anropar subprocess</p>
                ${subprocessFile ? `<p><strong>Subprocess fil:</strong> <a href="${subprocessFile}.html">${subprocessFile}</a></p>` : '<p><span class="badge badge-warning">⚠️ Subprocess ej specificerad</span></p>'}
                
                ${subprocessSummary ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <h3>📊 Subprocess-översikt: ${subprocessSummary.fileName}</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #0066cc;">${subprocessSummary.totalNodes}</div>
                            <div style="font-size: 0.9rem; color: #666;">Totalt antal noder</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${subprocessSummary.userTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">User Tasks</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${subprocessSummary.serviceTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Service Tasks</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${subprocessSummary.businessRuleTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Business Rules</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${subprocessSummary.gateways}</div>
                            <div style="font-size: 0.9rem; color: #666;">Gateways</div>
                        </div>
                    </div>
                    
                    ${subprocessSummary.keyNodes.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h4>🔑 Viktiga noder i subprocess:</h4>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            ${subprocessSummary.keyNodes.map(node => `
                                <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${node.name || node.id}</strong>
                                        <div style="font-size: 0.85rem; color: #666; font-family: monospace;">${node.id}</div>
                                    </div>
                                    <span class="badge badge-primary">${node.type.replace('bpmn:', '')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <a href="${subprocessFile}.html" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                            📄 Visa fullständig subprocess-dokumentation →
                        </a>
                    </div>
                </div>
                ` : ''}
            </div>
        </section>
        ` : ''}

        <section>
            <h2>🔗 Länkar och Resurser</h2>
            <div class="card">
                <p><em>Länkar till Figma, Jira, Confluence och tester läggs till via BPMN-viewern</em></p>
            </div>
        </section>

        ${dorDodCriteria.length ? `
        <section>
            <h2>✅ Definition of Ready / Definition of Done – krav</h2>
            <div class="card">
                <p style="margin-bottom: 10px;">
                    Nedan listas statiska DoR/DoD-krav kopplade till denna nods typ och sammanhang. 
                    Dessa är avsedda som stöd vid planering, utveckling och kvalitetssäkring.
                </p>
                <ul style="margin-left: 1.5rem; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                    ${dorDodCriteria.map((criterion) => `
                        <li>
                            <strong>[${criterion.criterion_type.toUpperCase()} – ${criterion.criterion_category}]</strong>
                            &nbsp;${criterion.criterion_text}
                        </li>
                    `).join('')}
                </ul>
            </div>
        </section>
        ` : ''}
    </div>
</body>
</html>`;

  return html;
}

// ============= BATCH GENERATOR =============

interface NodeArtifactEntry {
  bpmnFile: string;
  elementId: string;
  elementName: string;
  docFileName?: string;
  testFileName?: string;
}

export interface GenerationResult {
  tests: Map<string, string>;
  docs: Map<string, string>;
  dorDod: Map<string, DorDodCriterion[]>;
  subprocessMappings: Map<string, string | null>;
  nodeArtifacts?: NodeArtifactEntry[];
  metadata?: {
    hierarchyUsed: boolean;
    totalFilesAnalyzed?: number;
    filesIncluded?: string[];
    hierarchyDepth?: number;
    missingDependencies?: { parent: string; childProcess: string }[];
    skippedSubprocesses?: string[];
    llmFallbackUsed?: boolean;
    llmFinalProvider?: LlmProvider;
  };
}

type PlannedScenarioProvider = 'local-fallback' | 'chatgpt' | 'ollama';
type PlannedScenarioMap = Map<string, Map<PlannedScenarioProvider, TestScenario[]>>;
const FALLBACK_PROVIDER_ORDER: PlannedScenarioProvider[] = [
  'local-fallback',
  'chatgpt',
  'ollama',
];
const mapTestScenarioToSkeleton = (scenario: TestScenario) => ({
  name:
    scenario.id && scenario.name && scenario.id !== scenario.name
      ? `${scenario.id} – ${scenario.name}`
      : scenario.name || scenario.id || 'Scenario',
  description: scenario.description || '',
});

function mapProviderToScenarioProvider(
  provider: LlmProvider,
  fallbackUsed: boolean,
): PlannedScenarioProvider | null {
  if (provider === 'cloud') return 'chatgpt';
  if (provider === 'local' && !fallbackUsed) return 'ollama';
  if (provider === 'local' && fallbackUsed) return 'local-fallback';
  return null;
}

/**
 * Builds test scenarios from Epic user stories.
 * Converts user stories with acceptance criteria to test scenarios for the database.
 */
function buildScenariosFromEpicUserStories(
  docJson: any,
): import('@/data/testMapping').TestScenario[] {
  if (!docJson || typeof docJson !== 'object') return [];
  const rawUserStories = Array.isArray(docJson.userStories) ? docJson.userStories : [];
  const scenarios: import('@/data/testMapping').TestScenario[] = [];

  for (const userStory of rawUserStories) {
    if (!userStory || typeof userStory !== 'object') continue;
    
    const storyId = typeof userStory.id === 'string' && userStory.id.trim().length
      ? userStory.id.trim()
      : `US-${scenarios.length + 1}`;
    
    const role = typeof userStory.role === 'string' ? userStory.role.trim() : '';
    const goal = typeof userStory.goal === 'string' ? userStory.goal.trim() : '';
    const value = typeof userStory.value === 'string' ? userStory.value.trim() : '';
    const acceptanceCriteria = Array.isArray(userStory.acceptanceCriteria) 
      ? userStory.acceptanceCriteria 
      : [];

    // Create one scenario per user story
    // Description includes the user story format and acceptance criteria
    const storyDescription = `Som ${role} vill jag ${goal} så att ${value}`;
    const criteriaText = acceptanceCriteria.length > 0
      ? `\n\nAcceptanskriterier:\n${acceptanceCriteria.map((ac: string, idx: number) => `${idx + 1}. ${ac}`).join('\n')}`
      : '';
    
    const description = `${storyDescription}${criteriaText}`;

    // Determine category based on acceptance criteria content
    // Happy path: positive criteria, Edge: validation/edge cases, Error: error handling
    let category: 'happy-path' | 'edge-case' | 'error-case' = 'happy-path';
    const criteriaTextLower = criteriaText.toLowerCase();
    if (criteriaTextLower.includes('fel') || criteriaTextLower.includes('error') || criteriaTextLower.includes('timeout')) {
      category = 'error-case';
    } else if (criteriaTextLower.includes('validera') || criteriaTextLower.includes('edge') || criteriaTextLower.includes('gräns')) {
      category = 'edge-case';
    }

    scenarios.push({
      id: storyId,
      name: `User Story: ${goal}`,
      description,
      status: 'pending',
      category,
    });
  }

  return scenarios;
}

/**
 * Builds test scenarios from docJson.
 * For Epics: uses user stories
 * For Feature Goals and Business Rules: returns empty array (scenarios removed)
 */
function buildScenariosFromDocJson(
  docType: DocumentationDocType,
  docJson: any,
): import('@/data/testMapping').TestScenario[] {
  if (!docJson || typeof docJson !== 'object') return [];
  
  // For epics, use user stories
  if (docType === 'epic') {
    return buildScenariosFromEpicUserStories(docJson);
  }
  
  // Feature Goals and Business Rules no longer have scenarios
  return [];
}

/**
 * Bygger enklare LLM-scenarion för test-skeletons direkt från docJson.
 * För Epics: använder userStories
 * För Feature Goals/Business Rules: returnerar tom array (scenarios borttagna)
 * Används som första steg i pipen:
 *   docJson.userStories → Playwright-skelett
 * utan att göra ett separat LLM-anrop för testscript.
 */
function buildTestSkeletonScenariosFromDocJson(
  docType: DocumentationDocType,
  docJson: any,
): { name: string; description: string; expectedResult?: string; steps?: string[] }[] {
  if (!docJson || typeof docJson !== 'object') return [];
  
  // For epics, use user stories
  if (docType === 'epic') {
    const rawUserStories = Array.isArray(docJson.userStories) ? docJson.userStories : [];
    const scenarios: { name: string; description: string; expectedResult?: string; steps?: string[] }[] = [];

    for (const userStory of rawUserStories) {
      if (!userStory || typeof userStory !== 'object') continue;
      
      const storyId = typeof userStory.id === 'string' && userStory.id.trim().length
        ? userStory.id.trim()
        : `US-${scenarios.length + 1}`;
      
      const role = typeof userStory.role === 'string' ? userStory.role.trim() : '';
      const goal = typeof userStory.goal === 'string' ? userStory.goal.trim() : '';
      const value = typeof userStory.value === 'string' ? userStory.value.trim() : '';
      const acceptanceCriteria = Array.isArray(userStory.acceptanceCriteria) 
        ? userStory.acceptanceCriteria 
        : [];

      const name = `User Story ${storyId}: ${goal}`;
      const storyDescription = `Som ${role} vill jag ${goal} så att ${value}`;
      const criteriaText = acceptanceCriteria.length > 0
        ? `\n\nAcceptanskriterier:\n${acceptanceCriteria.map((ac: string) => `- ${ac}`).join('\n')}`
        : '';
      
      const description = `${storyDescription}${criteriaText}`;

      scenarios.push({
        name,
        description,
        expectedResult: description,
        // steps lämnas tomma så generateTestSkeleton genererar generiska TODO-kommentarer
      });
    }

    return scenarios;
  }
  
  // Feature Goals and Business Rules no longer have scenarios
  return [];
}

async function renderDocWithLlmFallback(
  docType: DocumentationDocType,
  context: NodeDocumentationContext,
  links: TemplateLinks,
  fallback: () => string | Promise<string>,
  llmAllowed: boolean,
  llmProvider?: LlmProvider,
  localAvailable: boolean = false,
  onLlmResult?: (provider: LlmProvider, fallbackUsed: boolean, docJson?: unknown) => void,
  featureGoalTemplateVersion?: 'v1' | 'v2',
  childrenDocumentation?: Map<string, {
    summary: string;
    flowSteps: string[];
    inputs?: string[];
    outputs?: string[];
  }>,
  checkCancellation?: () => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  const llmActive = llmAllowed && isLlmEnabled();
  const basePayload = {
    docType,
    nodeId: context.node.bpmnElementId,
    nodeName: context.node.name,
    bpmnFile: context.node.bpmnFile,
  };

  // I lokalt läge eller när LLM är avstängt ska vi aldrig göra något LLM-anrop.
  if (!llmActive) {
    const fallbackResult = fallback();
    return fallbackResult instanceof Promise ? await fallbackResult : fallbackResult;
  }

  // Kontrollera avbrytning INNAN LLM-anrop
  if (checkCancellation) {
    checkCancellation();
  }

  try {
    const llmResult = await generateDocumentationWithLlm(
      docType,
      context,
      links,
      llmProvider,
      localAvailable,
      true, // allowFallback
      childrenDocumentation,
      abortSignal, // Pass abort signal for LLM calls
    );
    if (llmResult && llmResult.text && llmResult.text.trim()) {
      onLlmResult?.(llmResult.provider, llmResult.fallbackUsed, llmResult.docJson);
      // Hämta provider-info för metadata från faktisk provider
      const llmClient = getLlmClient(llmResult.provider);
      
      const llmMetadata = {
        llmMetadata: {
          provider: llmClient.provider,
          model: llmClient.modelName,
        },
        fallbackUsed: llmResult.fallbackUsed,
        finalProvider: llmResult.provider,
      };

      // Use unified render functions - they handle base + overrides + LLM patch
      if (docType === 'feature') {
        return await renderFeatureGoalDoc(context, links, llmResult.text, llmMetadata, featureGoalTemplateVersion || 'v2');
      }

      if (docType === 'epic') {
        return await renderEpicDoc(context, links, llmResult.text, llmMetadata);
      }

      if (docType === 'businessRule') {
        return await renderBusinessRuleDoc(context, links, llmResult.text, llmMetadata);
      }

      const identifier = `${context.node.bpmnFile || 'unknown'}-${context.node.bpmnElementId || context.node.id}`;
      await saveLlmDebugArtifact('doc', identifier, llmResult.text);
      const title =
        context.node.name ||
        context.node.bpmnElementId ||
        (docType === 'feature'
          ? 'Feature'
          : docType === 'epic'
          ? 'Epic'
          : 'Business Rule');
      const wrapped = wrapLlmContentAsDocument(llmResult.text, title, { docType });
      if (!/<html[\s>]/i.test(wrapped) || !/<body[\s>]/i.test(wrapped)) {
        await logLlmFallback({
          eventType: 'documentation',
          status: 'fallback',
          reason: 'invalid-html-contract',
          ...basePayload,
        });
        return fallback();
      }
      return wrapped;
    }
    await logLlmFallback({
      eventType: 'documentation',
      status: 'fallback',
      reason: 'empty-response',
      ...basePayload,
      metadata: {
        childCount: context.childNodes.length,
        parentDepth: context.parentChain.length,
      },
    });
  } catch (error) {
    // Om kontot är inaktivt, logga tydligt och använd fallback direkt
    if (error instanceof Error && error.message.includes('account is inactive')) {
      console.error('[LLM Documentation] Cloud account is inactive - using fallback:', error.message);
      await logLlmFallback({
        eventType: 'documentation',
        status: 'fallback',
        reason: 'account-inactive',
        error: error.message,
        ...basePayload,
      });
      return fallback();
    }
    
    console.error('LLM documentation generation failed:', error);
    await logLlmFallback({
      eventType: 'documentation',
      status: 'error',
      reason: 'request-error',
      error,
      ...basePayload,
    });
  }
  return fallback();
}

async function parseSubprocessFile(fileName: string): Promise<SubprocessSummary | null> {
  try {
    const url = await getBpmnFileUrl(fileName);
    const result = await parseBpmnFile(url);
    
    // Count different node types
    const userTasks = result.elements.filter(e => e.type === 'bpmn:UserTask').length;
    const serviceTasks = result.elements.filter(e => e.type === 'bpmn:ServiceTask').length;
    const businessRuleTasks = result.elements.filter(e => e.type === 'bpmn:BusinessRuleTask').length;
    const gateways = result.elements.filter(e => 
      e.type.includes('Gateway') && 
      !e.type.includes('EventBased')
    ).length;
    
    // Get key nodes (UserTasks, ServiceTasks, BusinessRuleTasks)
    const keyNodeTypes = ['bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:BusinessRuleTask'];
    const keyNodes = result.elements
      .filter(e => keyNodeTypes.includes(e.type))
      .slice(0, 10) // Limit to first 10 key nodes
      .map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
      }));
    
    return {
      fileName,
      totalNodes: result.elements.filter(e => 
        !e.type.includes('Process') && 
        !e.type.includes('Collaboration') &&
        e.type !== 'label'
      ).length,
      userTasks,
      serviceTasks,
      businessRuleTasks,
      gateways,
      keyNodes,
    };
  } catch (error) {
    console.error(`Error parsing subprocess ${fileName}:`, error);
    return null;
  }
}

async function parseDmnSummary(fileName: string): Promise<SubprocessSummary | null> {
  try {
    const response = await fetch(`/dmn/${fileName}`);
    if (!response.ok) return null;
    
    const xml = await response.text();
    const { parseDmnFile } = await import('./dmnParser');
    const result = await parseDmnFile(`/dmn/${fileName}`);
    
    if (result.decisionTables.length === 0) return null;
    
    const table = result.decisionTables[0]; // Use first decision table
    
    // Map DMN data to SubprocessSummary format
    // totalNodes = number of rules
    // userTasks = input columns
    // serviceTasks = output columns
    // keyNodes = input column details
    
    const keyNodes = table.inputs.map(input => ({
      id: input.id,
      name: input.label || input.inputExpression || 'Input',
      type: input.typeRef || 'string',
    }));
    
    return {
      fileName,
      totalNodes: table.rules.length,
      userTasks: table.inputs.length,
      serviceTasks: table.outputs.length,
      businessRuleTasks: 0,
      gateways: 0,
      keyNodes,
    };
  } catch (error) {
    console.error(`Error parsing DMN ${fileName}:`, error);
    return null;
  }
}

/**
 * Genererar alla artefakter från en BPMN-processgraf.
 * Denna funktion använder en hierarkisk analys för att ge bättre kontext.
 * 
 * @param bpmnFileName - Fil att generera för
 * @param existingBpmnFiles - Alla tillgängliga BPMN-filer
 * @param existingDmnFiles - Alla tillgängliga DMN-filer
 * @param useHierarchy - Om true, bygg processgraf först (rekommenderat för toppnivåfiler)
 */
type ProgressReporter = (phase: GenerationPhaseKey, label: string, detail?: string) => void | Promise<void>;

const insertGenerationMeta = (html: string, source: string, templateVersion?: 'v1' | 'v2'): string => {
  if (!source) return html;
  if (html.includes('x-generation-source')) return html;
  const metaTag = `<meta name="x-generation-source" content="${source}" />`;
  const templateVersionTag = templateVersion ? `\n  <meta name="x-feature-goal-template-version" content="${templateVersion}" />` : '';
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n  ${metaTag}${templateVersionTag}`);
  }
  return `<!-- generation-source:${source} -->${templateVersion ? `\n<!-- feature-goal-template-version:${templateVersion} -->` : ''}\n${html}`;
};

/**
 * Extraherar dokumentationsinformation från docJson för att spara i generatedChildDocs
 */
function extractDocInfoFromJson(docJson: unknown): {
  summary: string;
  flowSteps: string[];
  inputs?: string[];
  outputs?: string[];
  scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
} | null {
  if (!docJson || typeof docJson !== 'object') return null;
  
  const obj = docJson as any;
  return {
    summary: obj.summary || '',
    flowSteps: Array.isArray(obj.flowSteps) ? obj.flowSteps : [],
    inputs: Array.isArray(obj.inputs) ? obj.inputs : undefined,
    outputs: Array.isArray(obj.outputs) ? obj.outputs : undefined,
    scenarios: Array.isArray(obj.scenarios) ? obj.scenarios : undefined,
  };
}

export async function generateAllFromBpmnWithGraph(
  bpmnFileName: string,
  existingBpmnFiles: string[],
  existingDmnFiles: string[] = [],
  useHierarchy: boolean = false,
  useLlm: boolean = true,
  progressCallback?: ProgressReporter,
  generationSource?: string,
  llmProvider?: LlmProvider,
  localAvailable: boolean = false,
  featureGoalTemplateVersion: 'v1' | 'v2' = 'v2',
  /**
   * Optional filter function to determine which nodes should be generated.
   * Returns true if node should be generated, false to skip.
   * If not provided, all nodes are generated (default behavior).
   */
  nodeFilter?: (node: BpmnProcessNode) => boolean,
  /**
   * Optional function to get version hash for a BPMN file.
   * If provided, uses selected version instead of current version.
   */
  getVersionHashForFile?: (fileName: string) => Promise<string | null>,
  /**
   * Optional function to check if generation should be cancelled.
   * Should throw an error if cancellation is requested.
   */
  checkCancellation?: () => void,
  /**
   * Optional AbortSignal for cancelling LLM API calls.
   * Used to abort ongoing fetch requests (local LLM) and check before cloud LLM calls.
   */
  abortSignal?: AbortSignal,
): Promise<GenerationResult> {
  const reportProgress = async (phase: GenerationPhaseKey, label: string, detail?: string) => {
    if (progressCallback) {
      await progressCallback(phase, label, detail);
    }
  };
  const generationSourceLabel = generationSource ?? (useLlm ? 'llm' : 'local');
  const graphFileScope =
    useHierarchy && existingBpmnFiles.length > 0 ? existingBpmnFiles : [bpmnFileName];

  try {
    await reportProgress('graph:start', 'Analyserar BPMN-struktur', bpmnFileName);
    
    console.log(`Building process graph for ${bpmnFileName}...`);
    // Get version hashes for all files in scope
    const versionHashes = new Map<string, string | null>();
    if (getVersionHashForFile) {
      for (const fileName of graphFileScope) {
        try {
          const versionHash = await getVersionHashForFile(fileName);
          versionHashes.set(fileName, versionHash);
        } catch (error) {
          console.warn(`[generateAllFromBpmnWithGraph] Failed to get version hash for ${fileName}:`, error);
          versionHashes.set(fileName, null);
        }
      }
    }
    const graph = await buildBpmnProcessGraph(bpmnFileName, graphFileScope, versionHashes);
    const summary = createGraphSummary(graph);
    const analyzedFiles =
      useHierarchy && summary.filesIncluded.length > 0
        ? summary.filesIncluded
        : [bpmnFileName];
    
    // Logga varning om hierarki används men inga filer hittades
    if (useHierarchy && summary.filesIncluded.length === 0) {
      console.warn(
        `[generateAllFromBpmnWithGraph] useHierarchy=true but no files found in summary.filesIncluded. Falling back to [${bpmnFileName}]`
      );
    }
    const totalAnalyzed = useHierarchy ? summary.totalFiles : analyzedFiles.length;
    await reportProgress(
      'graph:complete',
      'Processträd klart',
      `${totalAnalyzed} filer · djup ${summary.hierarchyDepth}`,
    );
    
    console.log('Process graph built:', {
      totalFiles: totalAnalyzed,
      totalNodes: summary.totalNodes,
      filesIncluded: analyzedFiles,
      hierarchyDepth: summary.hierarchyDepth,
    });
    const testableNodes = getTestableNodes(graph);

    // Beräkna depth för varje nod (för hierarkisk generering: leaf nodes först)
    const nodeDepthMap = new Map<string, number>();
    const calculateNodeDepth = (node: BpmnProcessNode, visited = new Set<string>()): number => {
      if (visited.has(node.id)) return 0; // Avoid cycles
      visited.add(node.id);
      
      if (node.children.length === 0) {
        nodeDepthMap.set(node.id, 0);
        return 0;
      }
      
      const maxChildDepth = Math.max(
        ...node.children.map(child => calculateNodeDepth(child, visited))
      );
      const depth = maxChildDepth + 1;
      nodeDepthMap.set(node.id, depth);
      return depth;
    };
    
    // Beräkna depth för alla noder
    for (const node of testableNodes) {
      if (!nodeDepthMap.has(node.id)) {
        calculateNodeDepth(node);
      }
    }

    // Generera artefakter från grafen
    const result: GenerationResult = {
      tests: new Map(),
      docs: new Map(),
      dorDod: new Map(),
      subprocessMappings: new Map(),
      metadata: {
        hierarchyUsed: true,
        totalFilesAnalyzed: totalAnalyzed,
        filesIncluded: analyzedFiles,
        hierarchyDepth: summary.hierarchyDepth,
        missingDependencies: graph.missingDependencies,
        skippedSubprocesses: Array.from(
          new Set(graph.missingDependencies.map((dep) => dep.childProcess)),
        ),
      },
    };
    const hierarchicalNodeArtifacts: NodeArtifactEntry[] = [];
    result.nodeArtifacts = hierarchicalNodeArtifacts;
    const plannedScenarioMap: PlannedScenarioMap = new Map();
    const setScenarioEntry = (
      key: string,
      provider: PlannedScenarioProvider,
      scenarios: TestScenario[],
    ) => {
      if (!plannedScenarioMap.has(key)) {
        plannedScenarioMap.set(key, new Map());
      }
      plannedScenarioMap.get(key)!.set(provider, scenarios);
    };
    const hydrateScenarioMapFromRows = (rows: PlannedScenarioRow[]) => {
      rows.forEach((row) => {
        const provider = row.provider as PlannedScenarioProvider;
        setScenarioEntry(`${row.bpmn_file}::${row.bpmn_element_id}`, provider, row.scenarios);
      });
    };

    // === TESTGENERERING HAR FLYTTATS TILL SEPARAT STEG ===
    // Testfiler och testscenarion genereras inte längre i dokumentationssteget.
    // Använd separat testgenereringsfunktion istället.

    // === DOR/DOD OCH SUBPROCESS MAPPINGS ===
    // Testbara noder från hela grafen (för DoR/DoD och subprocess mappings)
    await reportProgress('node-analysis:start', 'Analyserar noder för artefakter', `${testableNodes.length} noder`);
    
    for (const node of testableNodes) {
      if (!node.element) continue;
      await reportProgress('node-analysis:node', 'Analyserar nod', node.name || node.bpmnElementId);
      
      const nodeType = node.type as 'userTask' | 'serviceTask' | 'businessRuleTask' | 'callActivity';
      
      // Generera DoR/DoD
      const normalizedName = (node.name || node.bpmnElementId)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      const typeMap: Record<string, 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity'> = {
        'userTask': 'UserTask',
        'serviceTask': 'ServiceTask',
        'businessRuleTask': 'BusinessRuleTask',
        'callActivity': 'CallActivity',
      };
      
      const mappedType = typeMap[nodeType];
      if (mappedType) {
        const criteria = generateDorDodForNodeType(mappedType, normalizedName);
        const enrichedCriteria = criteria.map(c => ({
          ...c,
          node_type: mappedType,
          bpmn_element_id: node.bpmnElementId,
          bpmn_file: node.bpmnFile,
        }));
        result.dorDod.set(`${node.bpmnFile}:${node.bpmnElementId}`, enrichedCriteria);
      }

      // Subprocess mappings
      if (node.type === 'callActivity' && node.subprocessFile) {
        const childFile = node.subprocessFile;
        if (childFile) {
          result.subprocessMappings.set(node.bpmnElementId, childFile);
        }
      }
    }
    await reportProgress('node-analysis:complete', 'Nodanalyser klara', `${testableNodes.length} noder`);

    // Seed node_planned_scenarios med bas-scenarion för Lokal fallback
    // OBS: Dessa är endast fallback-scenarion. Nya scenarion genereras från BPMN-filerna
    // via LLM eller från dokumentationen, och prioriteras över dessa.
    try {
      const rows = createPlannedScenariosFromGraph(testableNodes);
      // Lägg till i map för fallback, men prioritera inte dessa över LLM-genererade
      hydrateScenarioMapFromRows(rows);
      // Spara endast om det inte redan finns scenarion i databasen (för att inte skriva över manuellt skapade)
      // Men när vi genererar dokumentation, kommer LLM-scenarion alltid prioriteras
      await savePlannedScenarios(rows, 'bpmnGenerators');
    } catch (e) {
      console.error(
        '[bpmnGenerators] Failed to seed local-fallback scenarios from hierarchy',
        e,
        'Testable nodes:',
        testableNodes.length,
      );
    }

    // Generera dokumentation per fil (inte per element)
    // STRATEGI: Två-pass generering för bättre kontext
    // Pass 1: Leaf nodes först (högst depth) - genererar dokumentation för epics/tasks
    // Pass 2: Parent nodes (lägst depth) - genererar Feature Goals med kunskap om child epics
    // NOTE: Dokumentation använder fortfarande testableNodes från grafen för LLM-generering,
    // men ProcessTree kan användas för strukturell dokumentation om önskat
    await reportProgress('docgen:start', 'Genererar dokumentation', `${analyzedFiles.length} filer`);
    const buildMatchWarning = (node: typeof testableNodes[number]) => {
      const reasons: string[] = [];
      if (node.subprocessMatchStatus && node.subprocessMatchStatus !== 'matched') {
        reasons.push(`Subprocess match: ${node.subprocessMatchStatus}`);
      }
      if (node.subprocessDiagnostics?.length) {
        reasons.push(...node.subprocessDiagnostics);
      }
      const reasonText = reasons.length ? reasons.join(' • ') : 'Okänd orsak';
      return `<p>Subprocess-kopplingen är inte bekräftad. Följande diagnostik finns:</p><p>${reasonText}</p>`;
    };

    // Map för att spara genererad dokumentation från child nodes (används i Pass 2)
    const generatedChildDocs = new Map<string, {
      summary: string;
      flowSteps: string[];
      inputs?: string[];
      outputs?: string[];
      scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
    }>();
    
    // Global Set för att spåra vilka subprocesser som redan har genererat Feature Goal-dokumentation
    // Detta förhindrar dubbelgenerering när samma subprocess anropas från olika callActivities
    const generatedSubprocessFeatureGoals = new Set<string>(); // subprocessFile -> true
    
    // Global Set för att spåra vilka noder som redan har genererat dokumentation
    // Detta är konsekvent med generatedSubprocessFeatureGoals och förhindrar dubbelgenerering
    // Key format: för callActivities: `subprocess:${subprocessFile}`, för tasks/epics: `${bpmnFile}::${bpmnElementId}`
    const globalProcessedDocNodes = new Set<string>();

    for (const file of analyzedFiles) {
      await reportProgress('docgen:file', 'Genererar dokumentation/testinstruktioner', file);
      const docFileName = file.replace('.bpmn', '.html');
      
      // Samla alla noder från denna fil för dokumentation
      const nodesInFile = testableNodes.filter(node => node.bpmnFile === file);
      
      if (nodesInFile.length > 0) {
        // Sortera noder primärt efter depth (hierarkisk ordning: leaf nodes först)
        // Sekundärt efter orderIndex (exekveringsordning från sequence flows) inom samma depth
        // Detta säkerställer både hierarkisk ordning OCH exekveringsordning
        const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
          const depthA = nodeDepthMap.get(a.id) ?? 0;
          const depthB = nodeDepthMap.get(b.id) ?? 0;
          
          // Primär sortering: högre depth först (leaf nodes före parent nodes)
          if (depthA !== depthB) {
            return depthB - depthA;
          }
          
          // Sekundär sortering: orderIndex (exekveringsordning) inom samma depth
          // Använd orderIndex om det finns, annars visualOrderIndex, annars 0
          const orderA = a.orderIndex ?? a.visualOrderIndex ?? 0;
          const orderB = b.orderIndex ?? b.visualOrderIndex ?? 0;
          
          if (orderA !== orderB) {
            return orderA - orderB; // Lägre orderIndex först (tidigare i exekveringsordningen)
          }
          
          // Tertiär sortering: alfabetiskt för determinism
          return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
        });
        
        // Skapa en sammanslagen dokumentation för hela filen – med fokus på innehåll.
        // Själva app-layouten hanteras i DocViewer och den gemensamma wrappern.
        let combinedBody = `<h1>Dokumentation för ${file}</h1>
`;
        
        // Lokal Set för att spåra processade noder i denna fil (används för combinedBody)
        // Men vi använder globalProcessedDocNodes för att avgöra om dokumentation ska genereras
        const processedDocNodesInFile = new Set<string>();
        
        // PASS 1: Generera leaf nodes först (högst depth)
        // Spara dokumentation från child nodes för att använda i Pass 2
        // För callActivities: använd subprocessFile som key för att undvika duplicering av återkommande subprocesser
        for (const node of sortedNodesInFile) {
          if (!node.element || !node.bpmnElementId) continue;
          
          // Apply node filter if provided (for selective regeneration based on diff)
          if (nodeFilter && !nodeFilter(node)) {
            console.log(`[bpmnGenerators] Skipping node ${node.bpmnElementId} (filtered out by diff)`);
            continue;
          }
          
          // För callActivities, använd subprocessFile som key (unik per subprocess-fil)
          // För tasks/epics, använd nodeKey (unik per instans)
          const docKey = node.type === 'callActivity' && node.subprocessFile
            ? `subprocess:${node.subprocessFile}` // Unik per subprocess-fil
            : `${node.bpmnFile}::${node.bpmnElementId}`; // Unik per instans för tasks
          
          // VIKTIGT: För återkommande noder (subprocesser, tasks, epics):
          // - Dokumentation (summary, flowSteps, scenarios, etc.) genereras PER INSTANS
          //   eftersom kontexten kan vara annorlunda för varje användning
          const nodeKey = `${node.bpmnFile}::${node.bpmnElementId}`;
          
          // Kolla om dokumentation redan genererats globalt
          // För callActivities: kolla både globalProcessedDocNodes och generatedSubprocessFeatureGoals
          // För tasks/epics: kolla bara globalProcessedDocNodes
          const alreadyProcessedGlobally = globalProcessedDocNodes.has(docKey);
          const subprocessAlreadyGenerated = node.type === 'callActivity' && node.subprocessFile
            ? generatedSubprocessFeatureGoals.has(node.subprocessFile)
            : false;
          
          // skipDocGeneration = true om noden redan processats globalt ELLER om subprocess Feature Goal redan genererats
          // Men vi genererar fortfarande instans-specifik dokumentation för återkommande noder
          const skipDocGeneration = alreadyProcessedGlobally || subprocessAlreadyGenerated;
          
          if (skipDocGeneration) {
            // För återkommande noder: generera instans-specifik dokumentation
            // eftersom kontexten kan vara annorlunda för varje användning
            console.log(`[bpmnGenerators] Generating instance-specific documentation for reused node ${docKey} (instance: ${nodeKey})`);
            // Fortsätt med dokumentationsgenerering (inte continue)
          }
          
          // Bygg ett tydligt meddelande med nodtyp och namn
          const nodeTypeLabel = 
            node.type === 'serviceTask' ? 'service tasken' :
            node.type === 'userTask' ? 'user tasken' :
            node.type === 'businessRuleTask' ? 'business rule tasken' :
            node.type === 'callActivity' ? 'call activityn' :
            'noden';
          const nodeName = node.name || node.bpmnElementId || 'Okänd nod';
          const detailMessage = `${nodeTypeLabel}: ${nodeName}${node.type === 'callActivity' && node.subprocessFile ? ` (subprocess: ${node.subprocessFile})` : ''}`;
          
          await reportProgress(
            'docgen:file',
            'Genererar dokumentation',
            detailMessage,
          );

          const docFileKey = getNodeDocFileKey(node.bpmnFile, node.bpmnElementId);
          const nodeContext = buildNodeDocumentationContext(graph, node.id);
          const docLinks = {
            bpmnViewerLink: `#/bpmn/${node.bpmnFile}`,
            dorLink: undefined,
            testLink: undefined, // Testfiler genereras inte längre i dokumentationssteget
          };

          const dorDodKey = `${node.bpmnFile}:${node.bpmnElementId}`;
          const dorDodForNode = result.dorDod.get(dorDodKey) || [];

          let nodeDocContent: string;
          let lastDocJson: unknown | undefined;

          if (nodeContext) {
            // Samla dokumentation från child nodes rekursivt (för Feature Goals behöver vi alla descendant nodes)
            // För callActivities: samla från alla descendant nodes (inklusive nested subprocesser och leaf nodes)
            // För tasks/epics: samla bara från direkta children (de har normalt inga children)
            const childDocsForNode = new Map<string, {
              summary: string;
              flowSteps: string[];
              inputs?: string[];
              outputs?: string[];
              scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
            }>();
            
            // Rekursiv funktion för att samla dokumentation från alla descendant nodes
            const collectChildDocsRecursively = (currentNode: BpmnProcessNode) => {
              for (const child of currentNode.children) {
                // För callActivities, använd subprocessFile som key för att hitta dokumentation
                // även om child är en annan instans av samma subprocess
                const childDocKey = child.type === 'callActivity' && child.subprocessFile
                  ? `subprocess:${child.subprocessFile}`
                  : `${child.bpmnFile}::${child.bpmnElementId}`;
                
                const childDoc = generatedChildDocs.get(childDocKey);
                if (childDoc) {
                  childDocsForNode.set(child.id, childDoc);
                }
                
                // Rekursivt samla från nested children (för nested subprocesser)
                if (child.children && child.children.length > 0) {
                  collectChildDocsRecursively(child);
                }
              }
            };
            
            // För callActivities: samla rekursivt från alla descendant nodes
            // Detta säkerställer att vi får dokumentation från alla leaf nodes (tasks/epics) i subprocessen
            if (node.type === 'callActivity') {
              collectChildDocsRecursively(node);
            } else {
              // För tasks/epics: samla bara från direkta children (de har normalt inga children)
              for (const child of node.children) {
                const childDocKey = child.type === 'callActivity' && child.subprocessFile
                  ? `subprocess:${child.subprocessFile}`
                  : `${child.bpmnFile}::${child.bpmnElementId}`;
                
                const childDoc = generatedChildDocs.get(childDocKey);
                if (childDoc) {
                  childDocsForNode.set(child.id, childDoc);
                }
              }
            }
            
            if (node.type === 'callActivity') {
              // STRATEGI: För callActivities som pekar på subprocesser:
              // - Om subprocess-filen redan genererat Feature Goal → skapa instans-specifik dokumentation
              //   med parent-fil i namnet (hierarkisk naming)
              // - Om subprocess-filen inte genererat än → generera base Feature Goal och spara
              //   (subprocess-filen kommer senare använda denna base doc)
              
              if (skipDocGeneration && node.subprocessFile) {
                // Återkommande callActivity: subprocess-filen har redan genererat base Feature Goal
                // Generera instans-specifik dokumentation med parent-kontext
                const existingDoc = generatedChildDocs.get(docKey);
                if (existingDoc) {
                  console.log(`[bpmnGenerators] Generating instance-specific documentation for reused subprocess ${node.subprocessFile} (instance: ${nodeKey})`);
                  
                  // Generera instans-specifik dokumentation med LLM
                  // Detta skapar en separat Feature Goal-sida med parent-fil i namnet
                  nodeDocContent = await renderDocWithLlmFallback(
                    'feature',
                    nodeContext,
                    docLinks,
                    async () => await renderFeatureGoalDoc(nodeContext, docLinks, undefined, undefined, featureGoalTemplateVersion),
                    useLlm,
                    llmProvider,
                    localAvailable,
                    undefined,
                    featureGoalTemplateVersion,
                    childDocsForNode.size > 0 ? childDocsForNode : undefined,
                    async (provider, fallbackUsed, docJson) => {
                      if (fallbackUsed) {
                        llmFallbackUsed = true;
                        llmFinalProvider = provider;
                      }
                      if (docJson) {
                        lastDocJson = docJson;
                        // Spara instans-specifik dokumentation med instans-specifik key för framtida referens
                        // Key: `${node.bpmnFile}::${node.bpmnElementId}` (unik per callActivity-instans)
                        const instanceDocKey = nodeKey;
                        const docInfo = extractDocInfoFromJson(docJson);
                        if (docInfo && !generatedChildDocs.has(instanceDocKey)) {
                          generatedChildDocs.set(instanceDocKey, docInfo);
                        }
                      }
                    },
                    checkCancellation,
                    abortSignal,
                  );
                } else {
                  // Ingen dokumentation att hämta - detta borde inte hända, men fallback
                  nodeDocContent = await renderFeatureGoalDoc(
                    nodeContext,
                    docLinks,
                    undefined,
                    undefined,
                    featureGoalTemplateVersion,
                  );
                }
              } else {
                // Första gången subprocessen genereras - generera både dokumentation och testscenarion
                nodeDocContent = await renderDocWithLlmFallback(
                  'feature',
                  nodeContext,
                  docLinks,
                  async () => await renderFeatureGoalDoc(nodeContext, docLinks, undefined, undefined, featureGoalTemplateVersion),
                  useLlm,
                  llmProvider,
                  localAvailable,
                  undefined,
                  featureGoalTemplateVersion,
                  childDocsForNode.size > 0 ? childDocsForNode : undefined,
                  async (provider, fallbackUsed, docJson) => {
                    if (fallbackUsed) {
                      llmFallbackUsed = true;
                      llmFinalProvider = provider;
                    }
                    const scenarioProvider = mapProviderToScenarioProvider(
                      provider,
                      fallbackUsed,
                    );
                    if (docJson) {
                      lastDocJson = docJson;
                      
                      // För callActivities: spara dokumentation och markera subprocessen som genererad
                      if (node.type === 'callActivity' && node.subprocessFile) {
                        const docInfo = extractDocInfoFromJson(docJson);
                        if (docInfo) {
                          const subprocessDocKey = `subprocess:${node.subprocessFile}`;
                          // Spara bara om det inte redan finns (första gången subprocessen genereras)
                          if (!generatedChildDocs.has(subprocessDocKey)) {
                            generatedChildDocs.set(subprocessDocKey, docInfo);
                            // Markera att Feature Goal-dokumentation har genererats för denna subprocess
                            generatedSubprocessFeatureGoals.add(node.subprocessFile);
                          }
                        }
                      }
                    }
                    // OBS: Testscenarion (scenarios) genereras inte längre i dokumentationssteget.
                    // Testinformation genereras i ett separat steg och ska inte sparas här.
                  },
                  checkCancellation,
                );
              }
              // Skapa Feature Goal-sida för callActivity
              // STRATEGI: 
              // - Om subprocess-filen redan genererat Feature Goal → skapa instans-specifik sida med parent i namnet
              // - Om subprocess-filen inte genererat än → skapa base Feature Goal-sida
              //   (subprocess-filen kommer senare skapa sin egen sida utan parent)
              const bpmnFileForFeatureGoal = node.type === 'callActivity' && node.subprocessFile
                ? node.subprocessFile
                : node.bpmnFile;
              
              // Kolla om subprocess-filen redan genererat Feature Goal-sida
              const subprocessFeatureDocPath = node.subprocessFile
                ? getFeatureGoalDocFileKey(
                    node.subprocessFile,
                    node.bpmnElementId,
                    featureGoalTemplateVersion,
                    undefined, // Subprocess-filens egen sida har ingen parent
                  )
                : null;
              const subprocessPageExists = subprocessFeatureDocPath ? result.docs.has(subprocessFeatureDocPath) : false;
              
              // Use hierarchical naming: parent BPMN file (where call activity is defined) + elementId
              // This matches Jira naming (e.g., "Application - Internal data gathering")
              const parentBpmnFile = node.type === 'callActivity' ? node.bpmnFile : undefined;
              const featureDocPath = getFeatureGoalDocFileKey(
                bpmnFileForFeatureGoal,
                node.bpmnElementId,
                featureGoalTemplateVersion,
                subprocessPageExists ? parentBpmnFile : undefined, // Inkludera parent endast om subprocess-sida redan finns
              );
              
              // Skapa Feature Goal-sida endast om den inte redan finns (förhindra dubbelgenerering)
              if (!result.docs.has(featureDocPath)) {
                result.docs.set(
                  featureDocPath,
                  insertGenerationMeta(nodeDocContent, generationSourceLabel, featureGoalTemplateVersion),
                );
              } else {
                console.log(`[bpmnGenerators] Feature Goal page already exists: ${featureDocPath}, skipping duplicate`);
              }
              // Lägg till diagnostiksektion om subprocess-matchen inte är bekräftad
              if (
                node.subprocessMatchStatus &&
                node.subprocessMatchStatus !== 'matched'
              ) {
                const diag = buildMatchWarning(node);
                const section = `<section><h2>Subprocess-diagnostik</h2>${diag}</section>`;
                if (nodeDocContent.includes('</body>')) {
                  nodeDocContent = nodeDocContent.replace(
                    '</body>',
                    `${section}</body>`,
                  );
                } else {
                  nodeDocContent += section;
                }
              }
            } else if (node.type === 'businessRuleTask') {
              nodeDocContent = await renderDocWithLlmFallback(
                'businessRule',
                nodeContext,
                docLinks,
                async () => await renderBusinessRuleDoc(nodeContext, docLinks),
                useLlm,
                llmProvider,
                localAvailable,
                async (provider, fallbackUsed, docJson) => {
                  if (fallbackUsed) {
                    llmFallbackUsed = true;
                    llmFinalProvider = provider;
                  }
                  const scenarioProvider = mapProviderToScenarioProvider(
                    provider,
                    fallbackUsed,
                  );
                  if (docJson) {
                    lastDocJson = docJson;
                    
                    // Spara child node dokumentation för att använda i parent node prompts
                    // För callActivities: använd subprocessFile som key (för återkommande subprocesser)
                    // För tasks/epics: använd node.id som key
                    // VIKTIGT: För återkommande noder sparar vi bara första gången
                    // (för att använda i parent node prompts), men genererar dokumentation per instans
                    if (docJson && typeof docJson === 'object') {
                      const childDocKey = node.type === 'callActivity' && node.subprocessFile
                        ? `subprocess:${node.subprocessFile}`
                        : node.id;
                      
                      // Spara bara om det inte redan finns (första gången noden genereras)
                      if (!generatedChildDocs.has(childDocKey)) {
                        const childDocInfo = {
                          summary: (docJson as any).summary || '',
                          flowSteps: Array.isArray((docJson as any).decisionLogic) ? (docJson as any).decisionLogic : [],
                          inputs: Array.isArray((docJson as any).inputs) ? (docJson as any).inputs : [],
                          outputs: Array.isArray((docJson as any).outputs) ? (docJson as any).outputs : [],
                          scenarios: Array.isArray((docJson as any).scenarios) ? (docJson as any).scenarios : [],
                        };
                        generatedChildDocs.set(childDocKey, childDocInfo);
                      }
                    }
                  }
                  // OBS: Testscenarion (scenarios) genereras inte längre i dokumentationssteget.
                  // Testinformation genereras i ett separat steg och ska inte sparas här.
                },
                undefined, // featureGoalTemplateVersion (not applicable)
                undefined, // childrenDocumentation (not applicable for businessRule/epic)
                checkCancellation,
                abortSignal,
              );
              if (!(docLinks as any).dmnLink) {
                nodeDocContent +=
                  '\n<p>Ingen DMN-länk konfigurerad ännu – lägg till beslutstabell när den finns.</p>';
              }
            } else {
              nodeDocContent = await renderDocWithLlmFallback(
                'epic',
                nodeContext,
                docLinks,
                async () => await renderEpicDoc(nodeContext, docLinks),
                useLlm,
                llmProvider,
                localAvailable,
                async (provider, fallbackUsed, docJson) => {
                  if (fallbackUsed) {
                    llmFallbackUsed = true;
                    llmFinalProvider = provider;
                  }
                  const scenarioProvider = mapProviderToScenarioProvider(
                    provider,
                    fallbackUsed,
                  );
                  if (docJson) {
                    lastDocJson = docJson;
                    
                    // Spara child node dokumentation för att använda i parent node prompts
                    // För callActivities: använd subprocessFile som key (för återkommande subprocesser)
                    // För tasks/epics: använd node.id som key
                    // VIKTIGT: För återkommande subprocesser sparar vi bara första gången
                    // (för att använda i parent node prompts), men genererar dokumentation per instans
                    if (docJson && typeof docJson === 'object') {
                      const childDocKey = node.type === 'callActivity' && node.subprocessFile
                        ? `subprocess:${node.subprocessFile}`
                        : node.id;
                      
                      // Spara bara om det inte redan finns (första gången subprocessen genereras)
                      if (!generatedChildDocs.has(childDocKey)) {
                        const childDocInfo = {
                          summary: (docJson as any).summary || '',
                          flowSteps: Array.isArray((docJson as any).flowSteps) ? (docJson as any).flowSteps : [],
                          inputs: Array.isArray((docJson as any).inputs) ? (docJson as any).inputs : [],
                          outputs: Array.isArray((docJson as any).outputs) ? (docJson as any).outputs : [],
                          scenarios: Array.isArray((docJson as any).scenarios) ? (docJson as any).scenarios : [],
                        };
                        generatedChildDocs.set(childDocKey, childDocInfo);
                      }
                    }
                  }
                  // OBS: Testscenarion (scenarios) genereras inte längre i dokumentationssteget.
                  // Testinformation genereras i ett separat steg och ska inte sparas här.
                },
              );
            }
          } else {
            nodeDocContent = generateDocumentationHTML(node.element, undefined, undefined, dorDodForNode);
          }

          result.docs.set(
            docFileKey,
            insertGenerationMeta(nodeDocContent, generationSourceLabel),
          );

          // === TESTGENERERING HAR FLYTTATS TILL SEPARAT STEG ===
          // Testfiler och testscenarion genereras inte längre i dokumentationssteget.
          // Scenarion från dokumentationen sparas fortfarande i node_planned_scenarios
          // (se renderDocWithLlmFallback callback ovan) eftersom de är del av dokumentationen.

          hierarchicalNodeArtifacts.push({
            bpmnFile: node.bpmnFile,
            elementId: node.bpmnElementId,
            elementName: node.name || node.bpmnElementId,
            docFileName: docFileKey,
            testFileName: undefined, // Testfiler genereras inte längre här
          });
          // Markera som processad både lokalt (för combinedBody) och globalt (för dubbelgenerering)
          processedDocNodesInFile.add(docKey);
          // För callActivities: markera med docKey (subprocess:file) för att undvika dubbelgenerering av base doc
          // För tasks/epics: markera med docKey (file::elementId) för att undvika dubbelgenerering
          // Men vi tillåter fortfarande instans-specifik dokumentation för återkommande noder
          if (!subprocessAlreadyGenerated || node.type !== 'callActivity') {
            globalProcessedDocNodes.add(docKey);
          }

          const bodyMatch = nodeDocContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            combinedBody += `<div class="node-section">
  <span class="node-type">${node.type}</span>
  <h2>${node.name || node.bpmnElementId}</h2>
  ${bodyMatch[1]}
</div>
`;
          }
        }
        
        // Efter att alla noder i filen har genererats, kolla om filen är en subprocess-fil
        // och generera Feature Goal-dokumentation för subprocessen själv
        // STRATEGI: Alltid generera Feature Goal för subprocess-filen, även om callActivity redan genererat
        // Detta säkerställer konsekvent resultat oavsett filordning
        const isSubprocessFile = Array.from(testableNodes.values()).some(
          node => node.type === 'callActivity' && node.subprocessFile === file
        );
        
        if (isSubprocessFile && nodesInFile.length > 0) {
          // Hitta root-processen för denna fil
          const processNodeForFile = Array.from(graph.allNodes.values()).find(
            node => node.type === 'process' && node.bpmnFile === file
          );
          
          if (processNodeForFile) {
            const subprocessDocKey = `subprocess:${file}`;
            // Kolla om base Feature Goal-dokumentation redan genererats (från callActivity)
            const baseDocExists = generatedChildDocs.has(subprocessDocKey);
            // Kolla om Feature Goal-sida redan skapats för subprocess-filen
            const subprocessFeatureDocPath = getFeatureGoalDocFileKey(
              file,
              processNodeForFile.bpmnElementId,
              featureGoalTemplateVersion,
              undefined, // Ingen parent-fil eftersom detta är subprocessens egen dokumentation
            );
            const featureGoalPageExists = result.docs.has(subprocessFeatureDocPath);
            
            // Alltid generera Feature Goal för subprocess-filen om sidan inte redan finns
            // Om base doc redan finns, använd den; annars generera ny
            if (!featureGoalPageExists) {
              // Samla alla child node-dokumentationer rekursivt från alla descendant nodes
              const childDocsForSubprocess = new Map<string, {
                summary: string;
                flowSteps: string[];
                inputs?: string[];
                outputs?: string[];
                scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
              }>();
              
              // Hämta dokumentation för alla descendant nodes rekursivt
              // Använd processNodeForFile.children för att få alla direkta children
              // och sedan rekursivt samla från nested subprocesser
              const collectChildDocsRecursively = (node: BpmnProcessNode) => {
                for (const child of node.children) {
                  const childDocKey = child.type === 'callActivity' && child.subprocessFile
                    ? `subprocess:${child.subprocessFile}`
                    : `${child.bpmnFile}::${child.bpmnElementId}`;
                  
                  const childDoc = generatedChildDocs.get(childDocKey);
                  if (childDoc) {
                    childDocsForSubprocess.set(child.id, childDoc);
                  }
                  
                  // Rekursivt samla från nested children
                  if (child.children && child.children.length > 0) {
                    collectChildDocsRecursively(child);
                  }
                }
              };
              
              // Samla från alla noder i filen (direkta children till processen)
              for (const node of nodesInFile) {
                const childDocKey = node.type === 'callActivity' && node.subprocessFile
                  ? `subprocess:${node.subprocessFile}`
                  : `${node.bpmnFile}::${node.bpmnElementId}`;
                
                const childDoc = generatedChildDocs.get(childDocKey);
                if (childDoc) {
                  childDocsForSubprocess.set(node.id, childDoc);
                }
                
                // Rekursivt samla från nested children
                if (node.children && node.children.length > 0) {
                  collectChildDocsRecursively(node);
                }
              }
              
              // Skapa kontext för subprocess-processen
              const subprocessContext = buildNodeDocumentationContext(graph, processNodeForFile.id);
              
              if (subprocessContext) {
                await reportProgress(
                  'docgen:file',
                  'Genererar Feature Goal för subprocess',
                  `${file} (subprocess root)`,
                );
                
                const subprocessDocLinks = {
                  bpmnViewerLink: `#/bpmn/${file}`,
                  dorLink: undefined,
                  testLink: undefined, // Subprocess-processen har inget eget test
                };
                
                // Om base doc redan finns (från callActivity), använd den som fallback
                // Annars generera ny Feature Goal-dokumentation
                let subprocessDocContent: string;
                
                if (baseDocExists) {
                  // Använd befintlig base dokumentation men generera HTML för subprocess-filen
                  // Detta säkerställer att subprocess-filen alltid har sin egen Feature Goal-sida
                  const existingDoc = generatedChildDocs.get(subprocessDocKey);
                  if (existingDoc) {
                    // Generera HTML från befintlig dokumentation
                    subprocessDocContent = await renderFeatureGoalDoc(
                      subprocessContext,
                      subprocessDocLinks,
                      undefined,
                      undefined,
                      featureGoalTemplateVersion,
                    );
                    console.log(`[bpmnGenerators] Using existing base documentation for subprocess ${file}, generating HTML page`);
                  } else {
                    // Fallback: generera ny dokumentation
                    subprocessDocContent = await renderDocWithLlmFallback(
                      'feature',
                      subprocessContext,
                      subprocessDocLinks,
                      async () => await renderFeatureGoalDoc(
                        subprocessContext,
                        subprocessDocLinks,
                        undefined,
                        undefined,
                        featureGoalTemplateVersion,
                      ),
                      useLlm,
                      llmProvider,
                      localAvailable,
                      undefined,
                      featureGoalTemplateVersion,
                      childDocsForSubprocess.size > 0 ? childDocsForSubprocess : undefined,
                      async (provider, fallbackUsed, docJson) => {
                        if (fallbackUsed) {
                          llmFallbackUsed = true;
                          llmFinalProvider = provider;
                        }
                        // Spara dokumentationen om den inte redan finns
                        if (docJson && !baseDocExists) {
                          const docInfo = extractDocInfoFromJson(docJson);
                          if (docInfo) {
                            generatedChildDocs.set(subprocessDocKey, docInfo);
                            generatedSubprocessFeatureGoals.add(file);
                          }
                        }
                      },
                      checkCancellation,
                      abortSignal,
                    );
                  }
                } else {
                  // Generera ny Feature Goal-dokumentation för subprocessen själv
                  subprocessDocContent = await renderDocWithLlmFallback(
                    'feature',
                    subprocessContext,
                    subprocessDocLinks,
                    async () => await renderFeatureGoalDoc(
                      subprocessContext,
                      subprocessDocLinks,
                      undefined,
                      undefined,
                      featureGoalTemplateVersion,
                    ),
                    useLlm,
                    llmProvider,
                    localAvailable,
                    undefined,
                    featureGoalTemplateVersion,
                    childDocsForSubprocess.size > 0 ? childDocsForSubprocess : undefined,
                    async (provider, fallbackUsed, docJson) => {
                      if (fallbackUsed) {
                        llmFallbackUsed = true;
                        llmFinalProvider = provider;
                      }
                      // Spara dokumentationen så den kan användas av parent callActivities
                      if (docJson) {
                        const docInfo = extractDocInfoFromJson(docJson);
                        if (docInfo) {
                          generatedChildDocs.set(subprocessDocKey, docInfo);
                          // Markera att Feature Goal-dokumentation har genererats för denna subprocess
                          generatedSubprocessFeatureGoals.add(file);
                        }
                      }
                    },
                    checkCancellation,
                    abortSignal,
                  );
                }
                
                // Skapa Feature Goal-sida för subprocessen (alltid, även om base doc redan finns)
                result.docs.set(
                  subprocessFeatureDocPath,
                  insertGenerationMeta(subprocessDocContent, generationSourceLabel, featureGoalTemplateVersion),
                );
                
                console.log(`Generated Feature Goal documentation for subprocess: ${subprocessFeatureDocPath}`);
              }
            }
          }
        }
        
        const wrappedCombined = insertGenerationMeta(
          wrapLlmContentAsDocument(combinedBody, `Dokumentation - ${file}`),
          generationSourceLabel,
        );
        result.docs.set(docFileName, wrappedCombined);
        console.log(`Generated documentation: ${docFileName}`);
      }
    }
    await reportProgress('docgen:complete', 'Dokumentation klara');

    if (result.metadata) {
      result.metadata.llmFallbackUsed = llmFallbackUsed;
      result.metadata.llmFinalProvider = llmFinalProvider;
    }

    return result;
  } catch (error) {
    if (!useHierarchy) {
      console.warn(
        '[generateAllFromBpmnWithGraph] Hierarchical pipeline failed, falling back to legacy generator',
        error,
      );
      const fileUrl = `/bpmn/${bpmnFileName}`;
      const parseResult = await parseBpmnFile(fileUrl);
      
      return generateAllFromBpmn(
        parseResult.elements,
        parseResult.subprocesses,
        existingBpmnFiles,
        existingDmnFiles,
        bpmnFileName,
        useLlm,
        generationSourceLabel,
        llmProvider,
      );
    }
    throw error;
  }
}

export async function generateAllFromBpmn(
  elements: BpmnElement[],
  subprocesses: BpmnSubprocess[],
  existingBpmnFiles: string[],
  existingDmnFiles: string[] = [],
  bpmnFileName?: string,
  useLlm: boolean = true,
  generationSourceLabel?: string,
  llmProvider?: LlmProvider
): Promise<GenerationResult> {
  const result: GenerationResult = {
    tests: new Map(),
    docs: new Map(),
    dorDod: new Map(),
    subprocessMappings: new Map(),
  };
  const docSource = generationSourceLabel || (useLlm ? 'llm' : 'local');
  const nodeArtifacts: NodeArtifactEntry[] = [];
  result.nodeArtifacts = nodeArtifacts;

  // Samla dokumentation för alla element i filen
  let combinedDoc = '';
  if (bpmnFileName) {
    combinedDoc = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dokumentation - ${bpmnFileName}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; background: #ffffff; }
    h1 { font-size: 1.5rem; margin: 0 0 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    h2 { color: #1e40af; margin-top: 24px; font-size: 1.1rem; }
    .node-section { border-left: 3px solid #dbeafe; padding-left: 16px; margin: 16px 0; }
    .node-type { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Dokumentation för ${bpmnFileName}</h1>
`;
  }

  // Generate for each element
  for (const element of elements) {
    let docContent: string | null = null;
    let nodeTestFileKey: string | null = null;
    const nodeType = element.type.replace('bpmn:', '') as 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity' | string;
    
    // Skip process definitions and labels
    if (nodeType === 'Process' || nodeType === 'Collaboration' || element.type === 'label') {
      continue;
    }

    // === TESTGENERERING HAR FLYTTATS TILL SEPARAT STEG ===
    // Testfiler och testscenarion genereras inte längre i dokumentationssteget.
    // Använd separat testgenereringsfunktion istället.
    nodeTestFileKey = undefined;
      
    // Generate DoR/DoD criteria for individual elements
    // Use hyphen for normalization (consistent with subprocess IDs)
    const normalizedName = (element.name || element.id)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
      
    if (nodeType === 'ServiceTask' || nodeType === 'UserTask' || nodeType === 'BusinessRuleTask' || nodeType === 'CallActivity') {
      const criteria = generateDorDodForNodeType(
        nodeType as 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity',
        normalizedName
      );
      
      // Add node metadata to each criterion
      const enrichedCriteria = criteria.map(c => ({
        ...c,
        node_type: nodeType,
        bpmn_element_id: element.id,
        bpmn_file: bpmnFileName
      }));
      
      result.dorDod.set(normalizedName, enrichedCriteria);
    }

    // Generate documentation with subprocess/DMN info
    let subprocessFile: string | undefined;
    let subprocessSummary: SubprocessSummary | undefined;
    
    if (nodeType === 'CallActivity') {
      subprocessFile = undefined; // Legacy läge utan hierarki gör ingen deterministisk matchning
    } else if (nodeType === 'BusinessRuleTask') {
      // Match DMN file for BusinessRuleTask
      const { matchDmnFile } = await import('./dmnParser');
      subprocessFile = matchDmnFile(element.name || element.id, existingDmnFiles);
      
      // Parse DMN if file exists
      if (subprocessFile && existingDmnFiles.includes(subprocessFile)) {
        subprocessSummary = await parseDmnSummary(subprocessFile) || undefined;
        result.subprocessMappings.set(element.id, subprocessFile);
      }
    }
    
    if (['UserTask', 'ServiceTask', 'BusinessRuleTask', 'CallActivity'].includes(nodeType)) {
      docContent = generateDocumentationHTML(element, subprocessFile, subprocessSummary);
      const docFileKey = bpmnFileName
        ? getNodeDocFileKey(bpmnFileName, element.id)
        : `${element.id}.html`;
      result.docs.set(docFileKey, insertGenerationMeta(docContent, docSource));
      
      nodeArtifacts.push({
        bpmnFile: bpmnFileName || '',
        elementId: element.id,
        elementName: element.name || element.id,
        docFileName: docFileKey,
        testFileName: nodeTestFileKey || undefined,
      });
    }

    if (bpmnFileName) {
      if (!docContent) {
        docContent = generateDocumentationHTML(element, subprocessFile, subprocessSummary);
      }
      const bodyMatch = docContent.match(/<body>([\s\S]*)<\/body>/);
      if (bodyMatch) {
        combinedDoc += `<div class="node-section">
  <span class="node-type">${nodeType}</span>
  <h2>${element.name || element.id}</h2>
  ${bodyMatch[1]}
</div>
`;
      }
    }
  }

  // Avsluta och spara kombinerad dokumentation
  if (bpmnFileName && combinedDoc) {
    combinedDoc += `
</body>
</html>`;
    const docFileName = bpmnFileName.replace('.bpmn', '.html');
    result.docs.set(docFileName, insertGenerationMeta(combinedDoc, docSource));
  }

  // Generate DoR/DoD for subprocesses (legacy support)
  subprocesses.forEach(subprocess => {
    const criteria = generateDorDodCriteria(subprocess.name, 'CallActivity');
    // Use hyphen for normalization
    const normalizedName = subprocess.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    // Only add if not already added from elements loop
    if (!result.dorDod.has(normalizedName)) {
      result.dorDod.set(normalizedName, criteria);
    }
  });

  return result;
}

/**
 * Hämta design-scenarion från testMapping och mappa dem till formatet
 * som används av generateTestSkeleton. Används enbart för lokal generering
 * (useLlm = false) så vi inte ändrar LLM-beteendet.
 */
function getDesignScenariosForElement(
  element: BpmnElement,
): { name: string; description: string; expectedResult?: string; steps?: string[] }[] | undefined {
  const mapping = testMapping[element.id];
  if (!mapping || !mapping.scenarios || mapping.scenarios.length === 0) {
    return undefined;
  }

  const scenarios = mapping.scenarios.map((s: TestScenario) => ({
    name: s.name,
    description: s.description,
    expectedResult: s.description,
    // steps lämnas tomma så generateTestSkeleton genererar generiska TODO-kommentarer
  }));

  return scenarios.length ? scenarios : undefined;
}

// ============= PROCESS TREE BASED GENERATORS =============
// These functions use ProcessTreeNode directly (from Graph → Tree pipeline)
// instead of the old meta/hierarchy-based approach

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
    node.children.forEach(child => {
      result += generateNodeTestsFromProcessTree(child, initiative, indentLevel);
    });
  } else if (node.type === 'callActivity') {
    // Feature goal - create describe block
    const orderPrefix = typeof node.orderIndex === 'number' ? `[#${node.orderIndex}] ` : '';
    result += `\n${indent}test.describe('${orderPrefix}${node.label}', () => {\n`;
    
    // Generate tests for children
    node.children.forEach(child => {
      result += generateNodeTestsFromProcessTree(child, initiative, indentLevel + 1);
    });
    
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
      html += `  <span>Scenario: <code>${node.scenarioPath.join(' → ')}</code></span>\n`;
    }
    html += `</div>\n`;

    // Show diagnostics if present
    if (node.diagnostics && node.diagnostics.length > 0) {
      html += `<div class="diagnostics ${node.diagnostics.some(d => d.severity === 'error') ? 'error' : ''}">\n`;
      html += `  <strong>Diagnostics:</strong>\n`;
      html += `  <ul>\n`;
      node.diagnostics.forEach(diag => {
        html += `    <li>[${diag.severity}] ${diag.code}: ${diag.message}</li>\n`;
      });
      html += `  </ul>\n`;
      html += `</div>\n`;
    }

    // Show subprocess link info for callActivities
    if (node.type === 'callActivity' && node.subprocessLink) {
      html += `<div class="meta">\n`;
      html += `  <span>Subprocess: <code>${node.subprocessFile || 'Not matched'}</code></span>\n`;
      html += `  <span>Match Status: <code>${node.subprocessLink.matchStatus}</code></span>\n`;
      html += `</div>\n`;
    }
  }

  // Recursively process children
  node.children.forEach(child => {
    html += generateNodeDocumentation(child, includeOrderIndex, includeScenarioPath, depth + 1);
  });

  return html;
}
