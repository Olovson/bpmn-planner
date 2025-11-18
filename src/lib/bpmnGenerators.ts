import { BpmnElement, BpmnSubprocess, parseBpmnFile } from './bpmnParser';
import { CriterionCategory, CriterionType } from '@/hooks/useDorDodStatus';
import { BpmnHierarchyNode, buildBpmnHierarchy } from './bpmnHierarchy';
import { nodeToMeta, generateTestCode } from '@/tests/meta/jiraBpmnMeta';

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
 * Generate hierarchical test file with nested describe blocks
 * This matches the BPMN process hierarchy
 * 
 * All tests include standardized naming and metadata annotations for:
 * - Initiative-level filtering (@initiative:application)
 * - Feature goal filtering (@feature:application-internal-data-gathering)
 * - Epic/node filtering (@epic:application-internal-data-gathering-fetch-party-information)
 * - BPMN element filtering (@bpmn:fetch-party-information)
 */
export function generateHierarchicalTestFile(
  contextRoot: string,
  nodes: BpmnHierarchyNode[],
  bpmnFile: string
): string {
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
 * Run tests by initiative:
 *   npx playwright test --grep "@initiative:${contextRoot.toLowerCase().replace(/\s+/g, '-')}"
 * 
 * Architecture: Tests, documentation, and dashboard all use the
 * same hierarchical model from src/lib/bpmnHierarchy.ts to ensure
 * consistency across the application.
 */

test.describe('${contextRoot}', () => {
`;

  // Generate nested structure
  nodes.forEach(node => {
    testTemplate += generateNodeTestsFromHierarchy(node, contextRoot, 1);
  });

  testTemplate += '});\n';
  return testTemplate;
}

/**
 * Recursively generate test structure for a node and its children
 * Uses the new BpmnHierarchyNode type with full metadata
 */
function generateNodeTestsFromHierarchy(
  node: BpmnHierarchyNode, 
  initiative: string,
  indentLevel: number
): string {
  const indent = '  '.repeat(indentLevel);
  let result = '';

  if (node.type === 'Process') {
    // Root node - generate children only
    node.children.forEach(child => {
      result += generateNodeTestsFromHierarchy(child, initiative, indentLevel);
    });
  } else if (node.type === 'CallActivity') {
    // Feature goal - create describe block
    result += `\n${indent}test.describe('${node.name}', () => {\n`;
    
    // Generate test for the CallActivity itself
    const meta = nodeToMeta(node, initiative);
    result += generateTestCode(meta, 'happy path', indent + '  ');
    result += '\n';
    
    // Generate tests for children
    node.children.forEach(child => {
      result += generateNodeTestsFromHierarchy(child, initiative, indentLevel + 1);
    });
    
    result += `${indent}});\n`;
  } else {
    // Leaf node (UserTask, ServiceTask, BusinessRuleTask) - generate test with metadata
    const meta = nodeToMeta(node, initiative);
    result += generateTestCode(meta, 'happy path', indent);
    result += '\n';
  }

  return result;
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

// ============= LEGACY TEST SKELETON GENERATOR (for backward compatibility) =============

export function generateTestSkeleton(element: BpmnElement): string {
  const testName = element.name || element.id;
  const nodeType = element.type.replace('bpmn:', '');

  let testTemplate = `import { test, expect } from '@playwright/test';

test.describe('${testName} Tests', () => {
  test('should load the page successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BPMN Viewer/);
  });
`;

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
  nodeType: 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity',
  normalizedName: string
): GeneratedCriterion[] {
  switch (nodeType) {
    case 'ServiceTask':
      return generateServiceTaskDorDod(normalizedName);
    case 'UserTask':
      return generateUserTaskDorDod(normalizedName);
    case 'BusinessRuleTask':
      return generateBusinessRuleTaskDorDod(normalizedName);
    case 'CallActivity':
      return generateCallActivityDorDod(normalizedName);
    default:
      return [];
  }
}

/**
 * DoR/DoD för ServiceTask (API-anrop / backend-automatik)
 */
function generateServiceTaskDorDod(normalizedName: string): GeneratedCriterion[] {
  const dor: GeneratedCriterion[] = [
    {
      criterion_type: 'dor',
      criterion_category: 'process_krav',
      criterion_key: `${normalizedName}_purpose_defined`,
      criterion_text:
        'Syftet med ServiceTasken är beskrivet och godkänt (vilken data som hämtas eller skrivs och varför).',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_api',
      criterion_key: `${normalizedName}_api_spec_complete`,
      criterion_text:
        'API-specifikationen är komplett (endpoint, payload, schema, felkoder, idempotency).',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'teknik_arkitektur',
      criterion_key: `${normalizedName}_integration_dependencies_known`,
      criterion_text:
        'Alla integrationsberoenden (interna/externa system) är identifierade och godkända av arkitekt.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_io_defined`,
      criterion_text:
        'Input- och outputfält är definierade, inklusive obligatoriska fält och valideringsregler.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'teknik_arkitektur',
      criterion_key: `${normalizedName}_error_strategy_defined`,
      criterion_text:
        'Felhanteringsstrategi är definierad (felkoder, retries, timeouts, fallback-beteende).',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_test_scenarios_defined`,
      criterion_text:
        'Testscenarier för happy path, felhantering, timeouts och edge cases är definierade.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'planering_beroenden',
      criterion_key: `${normalizedName}_no_blocking_dependencies`,
      criterion_text:
        'Eventuella blockerande beroenden (andra tjänster, beslut, konfiguration) är identifierade och hanterade.',
    },
  ];

  const dod: GeneratedCriterion[] = [
    {
      criterion_type: 'dod',
      criterion_category: 'funktion_krav',
      criterion_key: `${normalizedName}_behavior_implemented`,
      criterion_text:
        'ServiceTasken uppfyller definierat beteende i processen (rätt data hämtas eller skrivs vid rätt tidpunkt).',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'data_api',
      criterion_key: `${normalizedName}_api_implemented`,
      criterion_text:
        'API-anrop är implementerat enligt specifikation och validerat mot avtalat schema.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_timeouts_retries`,
      criterion_text:
        'Timeout- och retrylogik är implementerad enligt överenskommen strategi, inklusive idempotency där det krävs.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_logging_monitoring`,
      criterion_text:
        'Relevant logging och monitoring är implementerad (framgång, fel, edge cases).',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_tests_passing`,
      criterion_text:
        'Automatiska tester (unit/integration/E2E) för definierade scenarier är implementerade och passerar i CI.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'dokumentation',
      criterion_key: `${normalizedName}_docs_updated`,
      criterion_text:
        'Dokumentation (payload-exempel, felkoder, beroenden) är uppdaterad i systemets dokumentation.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_review_approved`,
      criterion_text:
        'Code review är genomförd och godkänd av ansvarig utvecklare/arkitekt.',
    },
  ];

  return [...dor, ...dod];
}

/**
 * DoR/DoD för UserTask (mänsklig interaktion / UI)
 */
function generateUserTaskDorDod(normalizedName: string): GeneratedCriterion[] {
  const dor: GeneratedCriterion[] = [
    {
      criterion_type: 'dor',
      criterion_category: 'process_krav',
      criterion_key: `${normalizedName}_user_flow_defined`,
      criterion_text:
        'Syfte och användarflöde för UserTasken är beskrivet (happy path och grundläggande fel-flöden).',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'design',
      criterion_key: `${normalizedName}_figma_ready`,
      criterion_text:
        'Relevant Figma-design är framtagen, inklusive layout, states och felmeddelanden.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_form_fields_defined`,
      criterion_text:
        'Formulärfält, obligatoriska fält och grundläggande valideringsregler är definierade.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_ux_test_cases_defined`,
      criterion_text:
        'Testscenarier för valideringsfel, edge cases (tomma fält, fel format) och avbrutna flöden är definierade.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'team_alignment',
      criterion_key: `${normalizedName}_po_ux_dev_aligned`,
      criterion_text:
        'Produktägare, UX och utveckling är överens om scope och beteende för UserTasken.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'planering_beroenden',
      criterion_key: `${normalizedName}_no_blocking_backend`,
      criterion_text:
        'Eventuella beroenden mot backend och andra UI-flöden är identifierade och blockerande beroenden hanterade.',
    },
  ];

  const dod: GeneratedCriterion[] = [
    {
      criterion_type: 'dod',
      criterion_category: 'funktion_krav',
      criterion_key: `${normalizedName}_ui_behavior_implemented`,
      criterion_text:
        'UserTasken beter sig enligt överenskommet flöde (inklusive navigation, states och felhantering).',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'design',
      criterion_key: `${normalizedName}_matches_figma`,
      criterion_text:
        'UI är implementerat i linje med Figma-design eller avvikelser är dokumenterade och godkända.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_data_persisted_correctly`,
      criterion_text:
        'Användarinmatad data lagras, valideras och konsumeras korrekt enligt specifikation.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_ui_tests_passing`,
      criterion_text:
        'Automatiska UI-tester (t.ex. Playwright) täcker definierade scenarier och passerar i CI.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'dokumentation',
      criterion_key: `${normalizedName}_ux_docs_updated`,
      criterion_text:
        'Dokumentation av användarflöde, fält och felmeddelanden är uppdaterad.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_accepted_by_po`,
      criterion_text:
        'UserTasken är demo:ad och accepterad av produktägare.',
    },
  ];

  return [...dor, ...dod];
}

/**
 * DoR/DoD för BusinessRuleTask (DMN-beslut)
 */
function generateBusinessRuleTaskDorDod(normalizedName: string): GeneratedCriterion[] {
  const dor: GeneratedCriterion[] = [
    {
      criterion_type: 'dor',
      criterion_category: 'process_krav',
      criterion_key: `${normalizedName}_decision_purpose_defined`,
      criterion_text:
        'Beslutsfrågan (decision question) är tydligt formulerad och kopplad till processen.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_dmn_io_defined`,
      criterion_text:
        'Inputs och outputs för DMN-beslutet är definierade och mappade mot data-/API-modell.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_dmn_test_cases_defined`,
      criterion_text:
        'Testfall per regel (minst ett happy path, negativa fall och kantfall) är identifierade.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'teknik_arkitektur',
      criterion_key: `${normalizedName}_dmn_integration_defined`,
      criterion_text:
        'Hur DMN-beslutet anropas från tjänst eller motor är beskrivet (API, engine, parameters).',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'planering_beroenden',
      criterion_key: `${normalizedName}_business_risk_signoff_planned`,
      criterion_text:
        'Behov av godkännande från business/risk är identifierat och inplanerat.',
    },
  ];

  const dod: GeneratedCriterion[] = [
    {
      criterion_type: 'dod',
      criterion_category: 'funktion_krav',
      criterion_key: `${normalizedName}_rules_implemented`,
      criterion_text:
        'Samtliga överenskomna regler är implementerade i DMN-tabellen.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'data_api',
      criterion_key: `${normalizedName}_dmn_io_validated`,
      criterion_text:
        'Input/Output är verifierade mot verkliga payloads och konsumerande system.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_dmn_tests_passing`,
      criterion_text:
        'Automatiska tester av DMN-regler (inklusive edge/negativa fall) finns och passerar i CI.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'dokumentation',
      criterion_key: `${normalizedName}_dmn_docs_updated`,
      criterion_text:
        'DMN-dokumentation (regeltabell och beskrivning) är uppdaterad i verktyget.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_dmn_monitoring_in_place`,
      criterion_text:
        'Eventuell logging/monitorering av DMN-beslut är på plats enligt överenskommen nivå.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_business_risk_approved`,
      criterion_text:
        'Regeluppsättningen är godkänd av business och, vid behov, riskfunktion.',
    },
  ];

  return [...dor, ...dod];
}

/**
 * DoR/DoD för CallActivity (Subprocess)
 */
function generateCallActivityDorDod(normalizedName: string): GeneratedCriterion[] {
  const dor: GeneratedCriterion[] = [
    {
      criterion_type: 'dor',
      criterion_category: 'process_krav',
      criterion_key: `${normalizedName}_subprocess_scope_defined`,
      criterion_text:
        'Scope och syfte för subprocessen är definierat, inklusive start-/slutvillkor.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_subprocess_io_defined`,
      criterion_text:
        'Input- och output-data mellan parent-process och subprocess är definierade.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'teknik_arkitektur',
      criterion_key: `${normalizedName}_called_element_mapped`,
      criterion_text:
        'calledElement är mappad till korrekt BPMN-fil och teknisk integration är förankrad hos arkitekt.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'planering_beroenden',
      criterion_key: `${normalizedName}_dependencies_identified`,
      criterion_text:
        'Beroenden mot andra subprocesser/system är identifierade och planerade.',
    },
    {
      criterion_type: 'dor',
      criterion_category: 'team_alignment',
      criterion_key: `${normalizedName}_teams_aligned`,
      criterion_text:
        'Berörda team (t.ex. de som bygger parent- och child-processen) är överens om ansvar och gränssnitt.',
    },
  ];

  const dod: GeneratedCriterion[] = [
    {
      criterion_type: 'dod',
      criterion_category: 'funktion_krav',
      criterion_key: `${normalizedName}_subprocess_behavior_implemented`,
      criterion_text:
        'Subprocessen exekverar enligt design (korrekt flöde och integration med parent-process).',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_integration_tests_passing`,
      criterion_text:
        'End-to-end-test och integrationstest mellan parent-process och subprocess finns och passerar i CI.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'dokumentation',
      criterion_key: `${normalizedName}_subprocess_docs_updated`,
      criterion_text:
        'Dokumentation för subprocessen och dess koppling till parent-process är uppdaterad.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_runtime_behavior_validated`,
      criterion_text:
        'Eventuella körningsegenskaper (prestanda, felbeteende) är verifierade i relevant miljö.',
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_subprocess_approved`,
      criterion_text:
        'Subprocessen är demo:ad och godkänd av ansvarig produktägare och arkitekt.',
    },
  ];

  return [...dor, ...dod];
}

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
  subprocessSummary?: SubprocessSummary
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

        <section>
            <h2>✅ Definition of Ready / Done</h2>
            <div class="card">
                <p><em>Se DoR/DoD-dashboard för detaljerade kriterier</em></p>
            </div>
        </section>
    </div>
</body>
</html>`;

  return html;
}

// ============= SUBPROCESS FILE MATCHER =============

export function matchSubprocessFile(callActivityName: string, existingFiles: string[]): string | null {
  // Normalize the name (remove spaces, lowercase, handle special cases)
  const normalized = callActivityName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');

  // Try exact match
  const exactMatch = existingFiles.find(f => 
    f.toLowerCase().includes(normalized)
  );
  
  if (exactMatch) return exactMatch;

  // Try partial match (match significant parts of the name)
  const nameParts = normalized.split('-').filter(p => p.length > 3);
  
  for (const file of existingFiles) {
    const fileLower = file.toLowerCase();
    const matchedParts = nameParts.filter(part => fileLower.includes(part));
    
    // If more than half of the significant parts match, consider it a match
    if (matchedParts.length >= Math.ceil(nameParts.length / 2)) {
      return file;
    }
  }

  // Suggest a filename based on the convention
  return `mortgage-se-${normalized}.bpmn`;
}

// ============= BATCH GENERATOR =============

export interface GenerationResult {
  tests: Map<string, string>; // filename -> content
  docs: Map<string, string>; // filename -> content
  dorDod: Map<string, DorDodCriterion[]>; // subprocess -> criteria
  subprocessMappings: Map<string, string | null>; // elementId -> subprocess file
  metadata?: {
    hierarchyUsed: boolean;
    totalFilesAnalyzed?: number;
    filesIncluded?: string[];
    hierarchyDepth?: number;
  };
}

async function parseSubprocessFile(fileName: string): Promise<SubprocessSummary | null> {
  try {
    const response = await fetch(`/bpmn/${fileName}`);
    if (!response.ok) return null;
    
    const xml = await response.text();
    const { BpmnParser } = await import('./bpmnParser');
    const parser = new BpmnParser();
    const result = await parser.parse(xml);
    parser.destroy();
    
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
export async function generateAllFromBpmnWithGraph(
  bpmnFileName: string,
  existingBpmnFiles: string[],
  existingDmnFiles: string[] = [],
  useHierarchy: boolean = false
): Promise<GenerationResult> {
  // Om hierarki ska användas, bygg processgraf först
  if (useHierarchy) {
    const { buildBpmnProcessGraph, createGraphSummary, getTestableNodes } = await import('./bpmnProcessGraph');
    
    console.log(`Building process graph for ${bpmnFileName}...`);
    const graph = await buildBpmnProcessGraph(bpmnFileName, existingBpmnFiles);
    const summary = createGraphSummary(graph);
    
    console.log('Process graph built:', {
      totalFiles: summary.totalFiles,
      totalNodes: summary.totalNodes,
      filesIncluded: summary.filesIncluded,
      hierarchyDepth: summary.hierarchyDepth,
    });

    // Generera artefakter från grafen
    const result: GenerationResult = {
      tests: new Map(),
      docs: new Map(),
      dorDod: new Map(),
      subprocessMappings: new Map(),
      metadata: {
        hierarchyUsed: true,
        totalFilesAnalyzed: summary.totalFiles,
        filesIncluded: summary.filesIncluded,
        hierarchyDepth: summary.hierarchyDepth,
      },
    };

    // === HIERARKISKA TESTER MED JIRA-META ===
    // Bygg BPMN-hierarkin för varje fil och generera hierarkiska tester
    console.log('Generating hierarchical tests with Jira metadata...');
    const filesToGenerate = summary.filesIncluded.length > 0 
      ? summary.filesIncluded 
      : [bpmnFileName];

    for (const file of filesToGenerate) {
      const bpmnUrl = `/bpmn/${file}`;
      try {
        const hierarchy = await buildBpmnHierarchy(file, bpmnUrl);
        
        const hierarchicalTestContent = generateHierarchicalTestFile(
          hierarchy.rootName,
          hierarchy.rootNode.children,
          hierarchy.bpmnFile
        );

        // Döp filen så att det syns att detta är hierarkiska tester
        const testFileName = file.replace('.bpmn', '.hierarchical.spec.ts');
        result.tests.set(testFileName, hierarchicalTestContent);
        
        console.log(`Generated hierarchical test: ${testFileName}`);
      } catch (error) {
        console.error(`Error generating hierarchical test for ${file}:`, error);
      }
    }

    // === DOR/DOD OCH SUBPROCESS MAPPINGS ===
    // Testbara noder från hela grafen (för DoR/DoD och subprocess mappings)
    const testableNodes = getTestableNodes(graph);
    
    for (const node of testableNodes) {
      if (!node.element) continue;
      
      const nodeType = node.type as 'userTask' | 'serviceTask' | 'businessRuleTask' | 'callActivity';
      
      // Generera DoR/DoD
      const normalizedName = (node.name || node.bpmnElementId)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
      
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
        result.dorDod.set(normalizedName, enrichedCriteria);
      }

      // Subprocess mappings
      if (node.type === 'callActivity' && node.children.length > 0) {
        const childFile = node.children[0]?.bpmnFile;
        if (childFile) {
          result.subprocessMappings.set(node.bpmnElementId, childFile);
        }
      }
    }

    // Generera dokumentation per fil (inte per element)
    for (const file of filesToGenerate) {
      const docFileName = file.replace('.bpmn', '.html');
      
      // Samla alla noder från denna fil för dokumentation
      const nodesInFile = testableNodes.filter(node => node.bpmnFile === file);
      
      if (nodesInFile.length > 0) {
        // Skapa en sammanslagen dokumentation för hela filen
        let combinedDoc = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dokumentation - ${file}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .node-section { border-left: 3px solid #dbeafe; padding-left: 20px; margin: 20px 0; }
    .node-type { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Dokumentation för ${file}</h1>
`;
        
        for (const node of nodesInFile) {
          if (!node.element) continue;
          
          let subprocessFile: string | undefined;
          let subprocessSummary: SubprocessSummary | undefined;
          
          if (node.type === 'callActivity' && node.children.length > 0) {
            const childFile = node.children[0]?.bpmnFile;
            if (childFile) {
              subprocessFile = childFile;
              subprocessSummary = await parseSubprocessFile(childFile) || undefined;
            }
          }
          
          const nodeDocContent = generateDocumentationHTML(
            node.element,
            subprocessFile,
            subprocessSummary
          );
          
          // Extrahera body-innehållet från node-dokumentationen
          const bodyMatch = nodeDocContent.match(/<body>([\s\S]*)<\/body>/);
          if (bodyMatch) {
            combinedDoc += `<div class="node-section">
  <span class="node-type">${node.type}</span>
  <h2>${node.name || node.bpmnElementId}</h2>
  ${bodyMatch[1]}
</div>
`;
          }
        }
        
        combinedDoc += `
</body>
</html>`;
        
        result.docs.set(docFileName, combinedDoc);
        console.log(`Generated documentation: ${docFileName}`);
      }
    }

    return result;
  }

  // Fallback: gamla metoden utan hierarki
  const fileUrl = `/bpmn/${bpmnFileName}`;
  const parseResult = await parseBpmnFile(fileUrl);
  
  return generateAllFromBpmn(
    parseResult.elements,
    parseResult.subprocesses,
    existingBpmnFiles,
    existingDmnFiles,
    bpmnFileName
  );
}

export async function generateAllFromBpmn(
  elements: BpmnElement[],
  subprocesses: BpmnSubprocess[],
  existingBpmnFiles: string[],
  existingDmnFiles: string[] = [],
  bpmnFileName?: string // Add fileName parameter
): Promise<GenerationResult> {
  const result: GenerationResult = {
    tests: new Map(),
    docs: new Map(),
    dorDod: new Map(),
    subprocessMappings: new Map(),
  };

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
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .node-section { border-left: 3px solid #dbeafe; padding-left: 20px; margin: 20px 0; }
    .node-type { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Dokumentation för ${bpmnFileName}</h1>
`;
  }

  // Generate for each element
  for (const element of elements) {
    const nodeType = element.type.replace('bpmn:', '') as 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity' | string;
    
    // Skip process definitions and labels
    if (nodeType === 'Process' || nodeType === 'Collaboration' || element.type === 'label') {
      continue;
    }

    // Generate test skeleton
    if (['UserTask', 'ServiceTask', 'BusinessRuleTask', 'CallActivity'].includes(nodeType)) {
      const testContent = generateTestSkeleton(element);
      result.tests.set(`${element.id}.spec.ts`, testContent);
      
      // Generate DoR/DoD criteria for individual elements
      // Use hyphen for normalization (consistent with subprocess IDs)
      const normalizedName = (element.name || element.id)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
        
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
    }

    // Generate documentation with subprocess/DMN info
    let subprocessFile: string | undefined;
    let subprocessSummary: SubprocessSummary | undefined;
    
    if (nodeType === 'CallActivity') {
      subprocessFile = matchSubprocessFile(element.name || element.id, existingBpmnFiles);
      
      // Parse subprocess if file exists
      if (subprocessFile) {
        subprocessSummary = await parseSubprocessFile(subprocessFile) || undefined;
        result.subprocessMappings.set(element.id, subprocessFile);
      }
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
    
    // Lägg till element-dokumentation till kombinerad fil
    if (bpmnFileName) {
      const docContent = generateDocumentationHTML(element, subprocessFile, subprocessSummary);
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
    result.docs.set(docFileName, combinedDoc);
  }

  // Generate DoR/DoD for subprocesses (legacy support)
  subprocesses.forEach(subprocess => {
    const criteria = generateDorDodCriteria(subprocess.name, 'CallActivity');
    // Use hyphen for normalization
    const normalizedName = subprocess.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
    
    // Only add if not already added from elements loop
    if (!result.dorDod.has(normalizedName)) {
      result.dorDod.set(normalizedName, criteria);
    }
  });

  return result;
}
