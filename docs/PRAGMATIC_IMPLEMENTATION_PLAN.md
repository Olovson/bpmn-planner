# Pragmatic Implementation Plan: Smart Defaults & Progressive Enhancement

## Översikt

Detta dokument beskriver den konkreta implementeringsplanen för att skapa en praktisk test-pipeline med smart defaults och progressiv förbättring.

---

## Implementation Plan

### Steg 1: Smart Defaults Generator (Week 1)

#### 1.1 Skapa Implementation Mapping Inferens

**Fil**: `src/lib/implementationMappingInference.ts`

```typescript
import type { BpmnElement } from '@/lib/bpmnParser';
import type { TestAppContext } from './testContextTypes';

export interface InferredImplementationMapping {
  implementationType: 'ui' | 'api' | 'both' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  ui?: {
    pageId: string;
    route: string;
    baseUrl?: string;
  };
  api?: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    baseUrl?: string;
  };
  warnings: string[];
}

/**
 * Infer implementation mapping from BPMN node name and type
 * Uses pattern matching and heuristics to guess implementation
 */
export function inferImplementationMapping(
  element: BpmnElement,
  appContext: TestAppContext = 'FICTIONAL_APP'
): InferredImplementationMapping {
  const nodeName = (element.name || element.id).toLowerCase();
  const nodeType = element.type.replace('bpmn:', '');
  const warnings: string[] = [];
  
  // Convert to kebab-case for routes/endpoints
  const kebabName = nodeName
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  // Pattern matching for API indicators
  const apiPatterns = [
    /fetch|get|retrieve|load|read/i,
    /create|post|add|insert/i,
    /update|put|modify|change/i,
    /delete|remove|destroy/i,
  ];
  
  const isApiCall = apiPatterns.some(pattern => pattern.test(nodeName));
  
  // Pattern matching for UI indicators
  const uiPatterns = [
    /submit|confirm|approve|reject|decline/i,
    /register|enter|fill|input/i,
    /view|show|display|open/i,
  ];
  
  const isUiAction = uiPatterns.some(pattern => pattern.test(nodeName));
  
  // Determine implementation type based on node type and patterns
  let implementationType: 'ui' | 'api' | 'both' | 'unknown' = 'unknown';
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (nodeType === 'ServiceTask') {
    implementationType = 'api';
    confidence = isApiCall ? 'high' : 'medium';
  } else if (nodeType === 'UserTask') {
    implementationType = 'ui';
    confidence = isUiAction ? 'high' : 'medium';
  } else if (nodeType === 'BusinessRuleTask') {
    implementationType = 'api';
    confidence = 'medium';
  } else if (nodeType === 'CallActivity') {
    implementationType = 'both';
    confidence = 'low';
  }
  
  // Generate inferred mapping
  const mapping: InferredImplementationMapping = {
    implementationType,
    confidence,
    warnings: [],
  };
  
  // Generate UI mapping if applicable
  if (implementationType === 'ui' || implementationType === 'both') {
    mapping.ui = {
      pageId: kebabName,
      route: `/${kebabName}`,
    };
    
    if (confidence === 'low') {
      warnings.push(`⚠️ UI route inferred from node name. Verify: /${kebabName}`);
    }
  }
  
  // Generate API mapping if applicable
  if (implementationType === 'api' || implementationType === 'both') {
    // Infer HTTP method from node name
    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
    if (/create|post|add|insert|submit/i.test(nodeName)) {
      method = 'POST';
    } else if (/update|put|modify|change/i.test(nodeName)) {
      method = 'PUT';
    } else if (/delete|remove|destroy/i.test(nodeName)) {
      method = 'DELETE';
    }
    
    mapping.api = {
      endpoint: `/api/v1/${kebabName}`,
      method,
    };
    
    if (confidence === 'low') {
      warnings.push(`⚠️ API endpoint inferred from node name. Verify: /api/v1/${kebabName}`);
    }
  }
  
  if (implementationType === 'unknown') {
    warnings.push('⚠️ Could not infer implementation type. Manual mapping required.');
  }
  
  mapping.warnings = warnings;
  return mapping;
}
```

#### 1.2 Förbättrad Test Generator med Smart Defaults

**Fil**: `src/lib/enhancedTestGenerator.ts`

```typescript
import type { BpmnElement } from '@/lib/bpmnParser';
import type { EpicScenario } from './epicDocTypes';
import { inferImplementationMapping } from './implementationMappingInference';
import { ensureTestContext, getDefaultContextForBpmnScenario } from './testContextGuard';

export interface EnhancedTestOptions {
  useInferredMapping?: boolean;
  includeTodos?: boolean;
  testDataPlaceholder?: boolean;
}

/**
 * Generate test with smart defaults and progressive enhancement
 */
export function generateEnhancedTest(
  element: BpmnElement,
  scenario: EpicScenario,
  options: EnhancedTestOptions = {}
): string {
  const {
    useInferredMapping = true,
    includeTodos = true,
    testDataPlaceholder = true,
  } = options;
  
  // Get context (BPMN scenarios are always for fictional app)
  const context = getDefaultContextForBpmnScenario();
  
  // Infer implementation mapping if enabled
  const inferredMapping = useInferredMapping
    ? inferImplementationMapping(element, context)
    : null;
  
  // Validate context
  ensureTestContext(
    context,
    {
      appContext: context,
      description: `Test for ${scenario.name}`,
      contextConfirmed: true,
    },
    {
      testName: scenario.name,
      persona: scenario.persona,
      bpmnFile: element.bpmnFile || 'unknown',
    }
  );
  
  // Generate test code
  const testName = scenario.name.replace(/'/g, "\\'");
  const nodeType = element.type.replace('bpmn:', '');
  
  let testCode = `import { test, expect } from '@playwright/test';
${includeTodos ? `// ============================================
// GENERATED TEST - Based on BPMN: ${element.bpmnFile || 'unknown'}::${element.id}
// Scenario: ${scenario.id} - ${scenario.name}
// ============================================
// This test was generated from BPMN process definition.
// TODO markers indicate areas that need manual verification/update.
// ============================================\n` : ''}

test.describe('${element.name || element.id} - ${scenario.type} Path', () => {
  test('${testName}', async ({ page${nodeType === 'ServiceTask' ? ', request' : ''} }) => {
`;
  
  // Add persona-based setup if available
  if (scenario.persona && scenario.persona !== 'system' && scenario.persona !== 'unknown') {
    testCode += generatePersonaSetup(scenario.persona, includeTodos);
  }
  
  // Generate test steps based on available data
  if (scenario.uiFlow && scenario.uiFlow.length > 0) {
    // Level 3: Has uiFlow - generate real navigation
    testCode += generateNavigationFromUiFlow(scenario.uiFlow, inferredMapping);
  } else if (inferredMapping?.ui) {
    // Level 2: Has inferred mapping - generate basic navigation
    testCode += generateBasicNavigation(inferredMapping.ui, includeTodos);
  } else {
    // Level 1: Basic structure - generate placeholder
    testCode += generatePlaceholderNavigation(element, scenario, includeTodos);
  }
  
  // Generate assertions
  testCode += generateAssertions(scenario, inferredMapping, includeTodos);
  
  // Add warnings if any
  if (inferredMapping?.warnings.length) {
    testCode += `\n    // Warnings from inference:\n`;
    inferredMapping.warnings.forEach(warning => {
      testCode += `    // ${warning}\n`;
    });
  }
  
  testCode += `  });
});
`;
  
  return testCode;
}

function generatePersonaSetup(persona: string, includeTodos: boolean): string {
  const setupCode = `
    // Setup: Login as ${persona}
    ${includeTodos ? '// TODO: Update login credentials and selectors\n' : ''}
    await page.goto('/login');
    await page.fill('#email', '${persona}@example.com'); // ⚠️ TODO: Use real test credentials
    await page.fill('#password', 'password123'); // ⚠️ TODO: Use real test password
    await page.click('#login-btn'); // ⚠️ TODO: Verify login button selector
`;
  return setupCode;
}

function generateNavigationFromUiFlow(
  uiFlow: Array<{ pageId: string; action: string; locatorId?: string }>,
  mapping: any
): string {
  let code = '';
  
  uiFlow.forEach((step, index) => {
    const baseUrl = mapping?.ui?.baseUrl || '';
    const route = mapping?.ui?.route || `/${step.pageId}`;
    
    if (index === 0 || uiFlow[index - 1].pageId !== step.pageId) {
      code += `\n    // Step ${index + 1}: Navigate to ${step.pageId}\n`;
      code += `    await page.goto('${baseUrl}${route}');\n`;
    }
    
    code += `    // ${step.action}\n`;
    if (step.locatorId) {
      // Generate action based on action text
      if (step.action.toLowerCase().includes('fill') || step.action.toLowerCase().includes('enter')) {
        code += `    await page.fill('#${step.locatorId}', 'TODO: Add test data'); // ⚠️ TODO: Add actual test data\n`;
      } else if (step.action.toLowerCase().includes('click')) {
        code += `    await page.click('#${step.locatorId}');\n`;
      } else {
        code += `    await page.locator('#${step.locatorId}').${inferAction(step.action)}(); // ⚠️ TODO: Verify action\n`;
      }
    } else {
      code += `    // ⚠️ TODO: Implement action "${step.action}" (locatorId missing)\n`;
    }
  });
  
  return code;
}

function generateBasicNavigation(ui: { route: string; baseUrl?: string }, includeTodos: boolean): string {
  const baseUrl = ui.baseUrl || '';
  const route = ui.route;
  
  let code = `\n    // Navigate to page\n`;
  if (includeTodos) {
    code += `    // ⚠️ TODO: Verify route is correct: ${route}\n`;
  }
  code += `    await page.goto('${baseUrl}${route}');\n`;
  code += `\n    // ⚠️ TODO: Add navigation steps based on scenario\n`;
  code += `    // Scenario description: [will be filled from scenario]\n`;
  
  return code;
}

function generatePlaceholderNavigation(
  element: BpmnElement,
  scenario: EpicScenario,
  includeTodos: boolean
): string {
  let code = `\n    // Basic test structure - implementation mapping needed\n`;
  if (includeTodos) {
    code += `    // ⚠️ TODO: Add implementation mapping for ${element.id}\n`;
    code += `    // ⚠️ TODO: Add navigation steps\n`;
    code += `    // Scenario: ${scenario.description}\n`;
  }
  code += `    await page.goto('/'); // ⚠️ TODO: Update with actual route\n`;
  
  return code;
}

function generateAssertions(
  scenario: EpicScenario,
  mapping: any,
  includeTodos: boolean
): string {
  let code = `\n    // Assertions based on scenario outcome\n`;
  
  // Use scenario outcome to generate assertions
  const outcome = scenario.outcome.toLowerCase();
  
  if (outcome.includes('success') || outcome.includes('slutför')) {
    code += `    await expect(page.locator('.success-message, .confirmation')).toBeVisible();\n`;
  } else if (outcome.includes('error') || outcome.includes('fel')) {
    code += `    await expect(page.locator('.error-message, .error')).toBeVisible();\n`;
  } else {
    code += `    // ⚠️ TODO: Add assertions based on scenario outcome\n`;
    code += `    // Expected: ${scenario.outcome}\n`;
  }
  
  if (includeTodos && !mapping) {
    code += `    // ⚠️ TODO: Verify assertions match actual UI elements\n`;
  }
  
  return code;
}

function inferAction(actionText: string): string {
  const lower = actionText.toLowerCase();
  if (lower.includes('click')) return 'click()';
  if (lower.includes('fill') || lower.includes('enter')) return 'fill()';
  if (lower.includes('select')) return 'selectOption()';
  if (lower.includes('check')) return 'check()';
  return 'click()'; // Default
}
```

---

### Steg 2: Progressive Enhancement System (Week 2)

#### 2.1 Test Enhancement Levels

**Fil**: `src/lib/testEnhancementLevels.ts`

```typescript
export type TestEnhancementLevel = 1 | 2 | 3 | 4;

export interface TestEnhancementStatus {
  level: TestEnhancementLevel;
  hasImplementationMapping: boolean;
  hasUiFlow: boolean;
  hasTestData: boolean;
  completeness: number; // 0-100%
  missingItems: string[];
}

/**
 * Determine enhancement level of a test
 */
export function assessTestEnhancementLevel(
  scenario: EpicScenario,
  hasImplementationMapping: boolean,
  hasTestData: boolean
): TestEnhancementStatus {
  const hasUiFlow = !!(scenario.uiFlow && scenario.uiFlow.length > 0);
  
  let level: TestEnhancementLevel = 1;
  const missingItems: string[] = [];
  
  if (hasImplementationMapping) {
    level = 2;
  } else {
    missingItems.push('Implementation mapping (route/endpoint)');
  }
  
  if (hasUiFlow) {
    level = 3;
  } else {
    missingItems.push('UI flow (navigation steps)');
  }
  
  if (hasTestData) {
    level = 4;
  } else {
    missingItems.push('Test data fixtures');
  }
  
  const completeness = calculateCompleteness(level, missingItems);
  
  return {
    level,
    hasImplementationMapping,
    hasUiFlow,
    hasTestData,
    completeness,
    missingItems,
  };
}

function calculateCompleteness(level: TestEnhancementLevel, missingItems: string[]): number {
  const baseCompleteness = (level - 1) * 25; // 0%, 25%, 50%, 75%
  const penalty = missingItems.length * 5; // Small penalty for missing items
  return Math.max(0, Math.min(100, baseCompleteness + (100 - baseCompleteness) * 0.8 - penalty));
}
```

#### 2.2 Regeneration Strategy

**Fil**: `src/lib/testRegenerationStrategy.ts`

```typescript
/**
 * Strategy for regenerating tests without overwriting manual improvements
 */
export interface RegenerationOptions {
  preserveManualCode: boolean;
  regenerateSections: ('navigation' | 'assertions' | 'setup')[];
  updateOnly: boolean; // Only update if mapping/uiFlow changed
}

/**
 * Parse test file to separate generated vs manual code
 */
export function parseTestFile(content: string): {
  generated: string;
  manual: string;
  markers: { start: number; end: number; type: 'generated' | 'manual' }[];
} {
  const generatedMarker = /\/\/ =+[\s\S]*?GENERATED[\s\S]*?=+/g;
  const manualMarker = /\/\/ =+[\s\S]*?MANUAL[\s\S]*?=+/g;
  
  // Find all markers
  const markers: { start: number; end: number; type: 'generated' | 'manual' }[] = [];
  
  let match;
  while ((match = generatedMarker.exec(content)) !== null) {
    markers.push({ start: match.index, end: match.index + match[0].length, type: 'generated' });
  }
  
  while ((match = manualMarker.exec(content)) !== null) {
    markers.push({ start: match.index, end: match.index + match[0].length, type: 'manual' });
  }
  
  // Split content
  let generated = '';
  let manual = '';
  let lastIndex = 0;
  
  markers.sort((a, b) => a.start - b.start);
  
  for (const marker of markers) {
    if (marker.type === 'generated') {
      generated += content.substring(lastIndex, marker.end);
      lastIndex = marker.end;
    } else {
      manual += content.substring(lastIndex, marker.end);
      lastIndex = marker.end;
    }
  }
  
  // Add remaining
  if (lastIndex < content.length) {
    // Check if we're in a generated or manual section
    const lastMarker = markers[markers.length - 1];
    if (lastMarker?.type === 'generated') {
      generated += content.substring(lastIndex);
    } else {
      manual += content.substring(lastIndex);
    }
  }
  
  return { generated, manual, markers };
}
```

---

## Resultat: Exempel på Genererade Tester

### Exempel 1: Level 1 - Basic Structure (Minimal Data)

**Input**: BPMN node + scenario (ingen mapping, ingen uiFlow)

**Genererad Test**:
```typescript
import { test, expect } from '@playwright/test';
// ============================================
// GENERATED TEST - Based on BPMN: mortgage-se-application.bpmn::confirm-application
// Scenario: EPIC-S1 - Normalflöde med komplett underlag
// ============================================
// This test was generated from BPMN process definition.
// TODO markers indicate areas that need manual verification/update.
// ============================================

test.describe('Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    // TODO: Update login credentials and selectors
    await page.goto('/login');
    await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
    await page.fill('#password', 'password123'); // ⚠️ TODO: Use real test password
    await page.click('#login-btn'); // ⚠️ TODO: Verify login button selector

    // Basic test structure - implementation mapping needed
    // ⚠️ TODO: Add implementation mapping for confirm-application
    // ⚠️ TODO: Add navigation steps
    // Scenario: Kunden eller handläggaren har lämnat kompletta uppgifter
    await page.goto('/'); // ⚠️ TODO: Update with actual route

    // Assertions based on scenario outcome
    await expect(page.locator('.success-message, .confirmation')).toBeVisible();
    // ⚠️ TODO: Verify assertions match actual UI elements
  });
});
```

**Status**: Kompilerar, körs, men behöver manuella uppdateringar

---

### Exempel 2: Level 2 - With Inferred Mapping

**Input**: BPMN node + scenario + inferred mapping (ingen uiFlow)

**Genererad Test**:
```typescript
import { test, expect } from '@playwright/test';
// ============================================
// GENERATED TEST - Based on BPMN: mortgage-se-application.bpmn::confirm-application
// Scenario: EPIC-S1 - Normalflöde med komplett underlag
// Implementation: Inferred from node name (confidence: medium)
// ============================================

test.describe('Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    await page.goto('/login');
    await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
    await page.fill('#password', 'password123');
    await page.click('#login-btn');

    // Navigate to page
    // ⚠️ TODO: Verify route is correct: /confirm-application
    await page.goto('/confirm-application');

    // ⚠️ TODO: Add navigation steps based on scenario
    // Scenario description: Kunden eller handläggaren har lämnat kompletta uppgifter

    // Assertions based on scenario outcome
    await expect(page.locator('.success-message, .confirmation')).toBeVisible();
    // ⚠️ TODO: Verify assertions match actual UI elements
    
    // Warnings from inference:
    // ⚠️ UI route inferred from node name. Verify: /confirm-application
  });
});
```

**Status**: Bättre - har route, men saknar navigationssteg

---

### Exempel 3: Level 3 - With uiFlow

**Input**: BPMN node + scenario + mapping + uiFlow

**Genererad Test**:
```typescript
import { test, expect } from '@playwright/test';
// ============================================
// GENERATED TEST - Based on BPMN: mortgage-se-application.bpmn::confirm-application
// Scenario: EPIC-S1 - Normalflöde med komplett underlag
// Implementation: /confirm-application
// UI Flow: Available (3 steps)
// ============================================

test.describe('Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    await page.goto('/login');
    await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
    await page.fill('#password', 'password123');
    await page.click('#login-btn');

    // Step 1: Navigate to application-form
    await page.goto('/application-form');

    // fill all fields
    await page.fill('#form', 'TODO: Add test data'); // ⚠️ TODO: Add actual test data

    // Step 2: Navigate to application-form
    // click submit
    await page.click('#submit-btn');

    // Step 3: Navigate to confirmation-page
    await page.goto('/confirmation-page');

    // verify message
    await page.locator('#confirmation').click(); // ⚠️ TODO: Verify action

    // Assertions based on scenario outcome
    await expect(page.locator('.success-message, .confirmation')).toBeVisible();
  });
});
```

**Status**: Mycket bättre - har navigationssteg, men saknar testdata

---

### Exempel 4: Level 4 - Complete (With Test Data)

**Input**: Allt + testdata

**Genererad Test**:
```typescript
import { test, expect } from '@playwright/test';
import { testData } from '../fixtures/mortgage-test-data';

// ============================================
// GENERATED TEST - Based on BPMN: mortgage-se-application.bpmn::confirm-application
// Scenario: EPIC-S1 - Normalflöde med komplett underlag
// Implementation: /confirm-application
// UI Flow: Available (3 steps)
// Test Data: Available (standard-customer profile)
// ============================================

test.describe('Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    await page.goto('/login');
    await page.fill('#email', testData.customer.email);
    await page.fill('#password', testData.customer.password);
    await page.click('#login-btn');

    // Step 1: Navigate to application-form
    await page.goto('/application-form');

    // fill all fields
    await page.fill('#personal-info', testData.customer.personalInfo);
    await page.fill('#income', testData.customer.income.toString());

    // Step 2: click submit
    await page.click('#submit-btn');

    // Step 3: Navigate to confirmation-page
    await page.goto('/confirmation-page');

    // verify message
    await expect(page.locator('#confirmation-message')).toBeVisible();

    // Assertions based on scenario outcome
    await expect(page.locator('.success-message, .confirmation')).toBeVisible();
    await expect(page.locator('#confirmation-message')).toContainText('Application confirmed');
  });
});
```

**Status**: Komplett - körbar test med all data

---

## Integration med Befintlig Kod

### Uppdatera `bpmnGenerators.ts`

```typescript
import { generateEnhancedTest } from './enhancedTestGenerator';
import { assessTestEnhancementLevel } from './testEnhancementLevels';

// I generateTestSkeleton-funktionen:
export function generateTestSkeleton(
  element: BpmnElement,
  scenario?: EpicScenario,
  options?: EnhancedTestOptions
): string {
  if (scenario) {
    // Use enhanced generator
    return generateEnhancedTest(element, scenario, {
      useInferredMapping: true,
      includeTodos: true,
      ...options,
    });
  }
  
  // Fallback to old generator
  return generateLegacyTestSkeleton(element);
}
```

---

## Förväntat Resultat

### Vecka 1: Smart Defaults
- ✅ Tester genereras med smarta gissningar
- ✅ Tester kompilerar och körs (även om vissa behöver fixes)
- ✅ Tydliga TODO-märkningar för vad som saknas
- ✅ ~30-50% av testerna fungerar direkt

### Vecka 2: Progressive Enhancement
- ✅ System för att förbättra tester stegvis
- ✅ UI för att lägga till implementation mapping
- ✅ Support för partiell uiFlow
- ✅ ~60-70% av testerna fungerar

### Vecka 3: Real Usage
- ✅ Tester körs mot staging
- ✅ Feedback loop: resultat → uppdatera mapping → regenerera
- ✅ ~80%+ av testerna fungerar

### Månad 2+: Iterativ Förbättring
- ✅ Hållbar process för att förbättra tester
- ✅ Regenerering bevarar manuellt arbete
- ✅ ~90%+ av testerna fungerar utan manuella fixes

---

## Nästa Steg

1. Implementera `implementationMappingInference.ts`
2. Uppdatera `generateTestSkeleton` att använda `generateEnhancedTest`
3. Testa med 1-2 BPMN-filer
4. Iterera baserat på resultat

Vill du att jag börjar implementera detta?

