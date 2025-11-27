# Starter vs. Complete Environment: Implementation Plan

## Översikt

**BPMN Planner** = Starter environment - Genererar grundläggande testscripts som kan tas vidare  
**Complete Environment** = Nästa miljö - Kompletterar scripts med riktiga routes, UI-element, testdata

---

## Vad BPMN Planner Ska Generera (Starter Scripts)

### Mål: "Good Enough" Test Scripts Som Kan Exporteras

BPMN Planner ska generera testscripts som:
- ✅ Kompilerar och har korrekt struktur
- ✅ Följer best practices (Playwright patterns)
- ✅ Har tydliga markörer för vad som behöver kompletteras
- ✅ Innehåller all BPMN-baserad information (scenarios, metadata)
- ✅ Är redo att importeras i nästa miljö

### Vad INKLUDERAS i Starter Scripts

#### 1. Teststruktur & Organisation
```typescript
// ✅ INKLUDERAS: Korrekt teststruktur
test.describe('Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Test body
  });
});

// ✅ INKLUDERAS: Risk level organisation
test.describe('P0 - Critical Paths', () => {
  // P0 tests
});

test.describe('P1 - Important Flows', () => {
  // P1 tests
});
```

#### 2. Scenario-baserad Testlogik
```typescript
// ✅ INKLUDERAS: Scenario metadata
test('Normalflöde...', async ({ page }) => {
  // Persona-based setup (from scenario.persona)
  if (scenario.persona === 'customer') {
    // Login as customer
  }
  
  // Test steps based on scenario description
  // Assertions based on scenario.outcome
});
```

#### 3. Kommentarer & Dokumentation
```typescript
// ✅ INKLUDERAS: BPMN metadata som kommentarer
// ============================================
// GENERATED FROM BPMN
// BPMN File: mortgage-se-application.bpmn
// Node ID: confirm-application
// Node Type: UserTask
// Scenario: EPIC-S1 - Normalflöde med komplett underlag
// Persona: customer
// Risk Level: P0
// ============================================
```

#### 4. Placeholder-struktur för uiFlow
```typescript
// ✅ INKLUDERAS: Struktur för uiFlow (även om data saknas)
test('...', async ({ page }) => {
  // Navigation steps will be added in complete environment
  // Based on uiFlow when available:
  // [
  //   { pageId: 'application-form', action: 'fill form', locatorId: 'form' },
  //   { pageId: 'application-form', action: 'click submit', locatorId: 'submit-btn' }
  // ]
  
  // ⚠️ TODO: Add navigation steps in complete environment
  // ⚠️ TODO: Add actual routes and locators
});
```

#### 5. Test Data Placeholders
```typescript
// ✅ INKLUDERAS: Struktur för testdata
test('...', async ({ page }) => {
  // Test data will be added in complete environment
  // Based on dataProfileId: 'standard-customer'
  
  // ⚠️ TODO: Import test data fixtures in complete environment
  // ⚠️ TODO: Use testData.customer.personalInfo
  // ⚠️ TODO: Use testData.customer.income
});
```

### Vad EXKLUDERAS från Starter Scripts

#### 1. Riktiga Routes/Endpoints
```typescript
// ❌ EXKLUDERAS: Riktiga routes (ska läggas till i complete environment)
await page.goto('/confirm-application'); // ⚠️ TODO: Update with actual route
// Eller:
await page.goto('/'); // ⚠️ TODO: Add actual route in complete environment
```

#### 2. Riktiga UI Locators
```typescript
// ❌ EXKLUDERAS: Riktiga locators (ska läggas till i complete environment)
await page.fill('#form', 'TODO: Add test data'); // ⚠️ TODO: Update with actual locator
await page.click('#submit-btn'); // ⚠️ TODO: Verify locator in complete environment
```

#### 3. Riktiga Test Data
```typescript
// ❌ EXKLUDERAS: Riktiga testdata (ska läggas till i complete environment)
// ⚠️ TODO: Import test data fixtures
// ⚠️ TODO: Use actual test data
```

#### 4. Page Objects (kan genereras men behöver kompletteras)
```typescript
// ⚠️ OPTIONELLT: Kan generera Page Object-struktur, men behöver kompletteras
export class ApplicationFormPage {
  // ⚠️ TODO: Add actual locators in complete environment
  private form = '#form'; // ⚠️ TODO: Update
  private submitBtn = '#submit-btn'; // ⚠️ TODO: Update
}
```

---

## Vad Complete Environment Ska Göra (Komplettering)

### Mål: Göra Starter Scripts Körbara

Complete environment tar starter scripts och:
- ✅ Lägger till riktiga routes/endpoints
- ✅ Lägger till riktiga UI locators
- ✅ Lägger till riktiga testdata
- ✅ Kompletterar Page Objects
- ✅ Validerar att tester fungerar

### Process i Complete Environment

#### Steg 1: Importera Starter Scripts
```bash
# Importera från BPMN Planner
cp bpmn-planner/generated-tests/* tests/fictional-app/
```

#### Steg 2: Komplettera Implementation Mapping
```typescript
// I complete environment: Lägg till riktiga routes
// Från starter script:
await page.goto('/'); // ⚠️ TODO: Add actual route

// Efter komplettering:
await page.goto('https://mortgage-app.example.com/application/confirm');
```

#### Steg 3: Komplettera UI Locators
```typescript
// Från starter script:
await page.fill('#form', 'TODO: Add test data');

// Efter komplettering:
await page.fill('[data-testid="personal-info-form"]', testData.personalInfo);
```

#### Steg 4: Lägg till Test Data
```typescript
// Från starter script:
// ⚠️ TODO: Import test data fixtures

// Efter komplettering:
import { testData } from '../fixtures/mortgage-test-data';
await page.fill('#income', testData.customer.income.toString());
```

#### Steg 5: Validera & Kör
```bash
# Kör tester
npm test

# Fixa eventuella problem
# Iterera
```

---

## Implementation Plan för BPMN Planner

### Phase 1: Export-Ready Test Generation (Week 1-2)

#### 1.1 Enhanced Test Generator med Export-Markörer

**Fil**: `src/lib/exportReadyTestGenerator.ts`

```typescript
import type { BpmnElement } from '@/lib/bpmnParser';
import type { EpicScenario } from './epicDocTypes';
import { inferImplementationMapping } from './implementationMappingInference';
import { ensureTestContext, getDefaultContextForBpmnScenario } from './testContextGuard';

export interface ExportReadyTestOptions {
  includeBpmnMetadata?: boolean; // Include BPMN info as comments
  includePlaceholders?: boolean; // Include TODO placeholders
  exportFormat?: 'playwright' | 'jest' | 'mocha';
}

/**
 * Generate export-ready test scripts
 * These can be taken to complete environment for finalization
 */
export function generateExportReadyTest(
  element: BpmnElement,
  scenario: EpicScenario,
  options: ExportReadyTestOptions = {}
): string {
  const {
    includeBpmnMetadata = true,
    includePlaceholders = true,
    exportFormat = 'playwright',
  } = options;
  
  const context = getDefaultContextForBpmnScenario();
  
  // Validate context
  ensureTestContext(
    context,
    {
      appContext: context,
      description: `Export-ready test for ${scenario.name}`,
      contextConfirmed: true,
    },
    {
      testName: scenario.name,
      persona: scenario.persona,
      bpmnFile: element.bpmnFile || 'unknown',
    }
  );
  
  // Infer basic mapping (for structure, not final routes)
  const inferredMapping = inferImplementationMapping(element, context);
  
  // Generate test with clear export markers
  return generateTestWithExportMarkers(
    element,
    scenario,
    inferredMapping,
    { includeBpmnMetadata, includePlaceholders, exportFormat }
  );
}

function generateTestWithExportMarkers(
  element: BpmnElement,
  scenario: EpicScenario,
  mapping: any,
  options: any
): string {
  const testName = scenario.name.replace(/'/g, "\\'");
  const nodeType = element.type.replace('bpmn:', '');
  
  let code = '';
  
  // BPMN metadata as comments
  if (options.includeBpmnMetadata) {
    code += `// ============================================\n`;
    code += `// EXPORT-READY TEST - Generated by BPMN Planner\n`;
    code += `// BPMN File: ${element.bpmnFile || 'unknown'}\n`;
    code += `// Node ID: ${element.id}\n`;
    code += `// Node Type: ${nodeType}\n`;
    code += `// Node Name: ${element.name || element.id}\n`;
    code += `// Scenario ID: ${scenario.id}\n`;
    code += `// Scenario Name: ${scenario.name}\n`;
    code += `// Scenario Type: ${scenario.type}\n`;
    if (scenario.persona) code += `// Persona: ${scenario.persona}\n`;
    if (scenario.riskLevel) code += `// Risk Level: ${scenario.riskLevel}\n`;
    if (scenario.assertionType) code += `// Assertion Type: ${scenario.assertionType}\n`;
    code += `// ============================================\n`;
    code += `// This test is ready for export to complete environment.\n`;
    code += `// Complete environment should:\n`;
    code += `// 1. Add actual routes/endpoints\n`;
    code += `// 2. Add actual UI locators\n`;
    code += `// 3. Add test data fixtures\n`;
    code += `// 4. Validate and run tests\n`;
    code += `// ============================================\n\n`;
  }
  
  // Import statements
  code += `import { test, expect } from '@playwright/test';\n`;
  if (options.includePlaceholders) {
    code += `// ⚠️ TODO (Complete Environment): Import test data fixtures\n`;
    code += `// import { testData } from '../fixtures/mortgage-test-data';\n\n`;
  }
  
  // Test structure
  const riskLevelLabel = scenario.riskLevel 
    ? `${scenario.riskLevel} - ` 
    : '';
  const describeName = `${element.name || element.id} - ${scenario.type} Path`;
  
  code += `test.describe('${riskLevelLabel}${describeName}', () => {\n`;
  code += `  test('${testName}', async ({ page${nodeType === 'ServiceTask' ? ', request' : ''} }) => {\n`;
  
  // Persona setup
  if (scenario.persona && scenario.persona !== 'system' && scenario.persona !== 'unknown') {
    code += generatePersonaSetupForExport(scenario.persona, options.includePlaceholders);
  }
  
  // Test body
  if (scenario.uiFlow && scenario.uiFlow.length > 0) {
    code += generateUiFlowStructure(scenario.uiFlow, mapping, options.includePlaceholders);
  } else {
    code += generatePlaceholderTestBody(element, scenario, mapping, options.includePlaceholders);
  }
  
  // Assertions
  code += generateAssertionsForExport(scenario, options.includePlaceholders);
  
  code += `  });\n`;
  code += `});\n`;
  
  return code;
}

function generatePersonaSetupForExport(persona: string, includePlaceholders: boolean): string {
  let code = `\n    // Setup: Login as ${persona}\n`;
  if (includePlaceholders) {
    code += `    // ⚠️ TODO (Complete Environment): Update login route and selectors\n`;
  }
  code += `    await page.goto('/login'); // ⚠️ TODO: Update with actual login route\n`;
  code += `    await page.fill('#email', '${persona}@example.com'); // ⚠️ TODO: Use real test credentials\n`;
  code += `    await page.fill('#password', 'password123'); // ⚠️ TODO: Use real test password\n`;
  code += `    await page.click('#login-btn'); // ⚠️ TODO: Verify login button selector\n`;
  return code;
}

function generateUiFlowStructure(
  uiFlow: Array<{ pageId: string; action: string; locatorId?: string }>,
  mapping: any,
  includePlaceholders: boolean
): string {
  let code = `\n    // Navigation steps (from uiFlow)\n`;
  if (includePlaceholders) {
    code += `    // ⚠️ TODO (Complete Environment): Update routes and locators\n`;
  }
  
  uiFlow.forEach((step, index) => {
    const route = mapping?.ui?.route || `/${step.pageId}`;
    
    if (index === 0 || uiFlow[index - 1].pageId !== step.pageId) {
      code += `\n    // Step ${index + 1}: Navigate to ${step.pageId}\n`;
      code += `    await page.goto('${route}'); // ⚠️ TODO: Update with actual route\n`;
    }
    
    code += `    // ${step.action}\n`;
    if (step.locatorId) {
      if (step.action.toLowerCase().includes('fill') || step.action.toLowerCase().includes('enter')) {
        code += `    await page.fill('#${step.locatorId}', 'TODO: Add test data'); // ⚠️ TODO: Update locator and add test data\n`;
      } else if (step.action.toLowerCase().includes('click')) {
        code += `    await page.click('#${step.locatorId}'); // ⚠️ TODO: Verify locator\n`;
      } else {
        code += `    await page.locator('#${step.locatorId}').click(); // ⚠️ TODO: Verify action and locator\n`;
      }
    } else {
      code += `    // ⚠️ TODO: Implement action "${step.action}" (locatorId missing)\n`;
    }
  });
  
  return code;
}

function generatePlaceholderTestBody(
  element: BpmnElement,
  scenario: EpicScenario,
  mapping: any,
  includePlaceholders: boolean
): string {
  let code = `\n    // Test body based on scenario: ${scenario.description}\n`;
  if (includePlaceholders) {
    code += `    // ⚠️ TODO (Complete Environment): Add navigation steps\n`;
    code += `    // Suggested route (inferred): ${mapping?.ui?.route || '/unknown'}\n`;
  }
  
  if (mapping?.ui?.route) {
    code += `    await page.goto('${mapping.ui.route}'); // ⚠️ TODO: Update with actual route\n`;
  } else {
    code += `    await page.goto('/'); // ⚠️ TODO: Add actual route in complete environment\n`;
  }
  
  code += `    // ⚠️ TODO (Complete Environment): Add test steps based on scenario\n`;
  code += `    // Scenario description: ${scenario.description}\n`;
  
  return code;
}

function generateAssertionsForExport(scenario: EpicScenario, includePlaceholders: boolean): string {
  let code = `\n    // Assertions based on scenario outcome\n`;
  code += `    // Expected outcome: ${scenario.outcome}\n`;
  
  const outcome = scenario.outcome.toLowerCase();
  if (outcome.includes('success') || outcome.includes('slutför')) {
    code += `    await expect(page.locator('.success-message, .confirmation')).toBeVisible();\n`;
    if (includePlaceholders) {
      code += `    // ⚠️ TODO (Complete Environment): Verify actual success message locator\n`;
    }
  } else if (outcome.includes('error') || outcome.includes('fel')) {
    code += `    await expect(page.locator('.error-message, .error')).toBeVisible();\n`;
    if (includePlaceholders) {
      code += `    // ⚠️ TODO (Complete Environment): Verify actual error message locator\n`;
    }
  } else {
    code += `    // ⚠️ TODO (Complete Environment): Add assertions based on scenario outcome\n`;
  }
  
  return code;
}
```

#### 1.2 Export Functionality

**Fil**: `src/lib/testExport.ts`

```typescript
import type { BpmnElement } from '@/lib/bpmnParser';
import type { EpicScenario } from './epicDocTypes';
import { generateExportReadyTest } from './exportReadyTestGenerator';
import { getTestFilePath } from './testContextGuard';

export interface ExportOptions {
  format: 'playwright' | 'jest' | 'mocha';
  includeBpmnMetadata: boolean;
  outputDirectory: string;
}

/**
 * Export tests for use in complete environment
 */
export async function exportTestsForCompleteEnvironment(
  elements: BpmnElement[],
  scenarios: Map<string, EpicScenario[]>,
  options: ExportOptions
): Promise<{ exportedFiles: string[]; summary: ExportSummary }> {
  const exportedFiles: string[] = [];
  const summary: ExportSummary = {
    totalTests: 0,
    withUiFlow: 0,
    withPersona: 0,
    withRiskLevel: 0,
    needsCompleteEnvironment: 0,
  };
  
  for (const element of elements) {
    const elementScenarios = scenarios.get(element.id) || [];
    
    for (const scenario of elementScenarios) {
      const testCode = generateExportReadyTest(element, scenario, {
        includeBpmnMetadata: options.includeBpmnMetadata,
        includePlaceholders: true,
        exportFormat: options.format,
      });
      
      const filePath = getTestFilePath(
        'FICTIONAL_APP',
        `${element.id}-${scenario.id}`,
        { extension: '.spec.ts' }
      );
      
      const fullPath = `${options.outputDirectory}/${filePath}`;
      await writeFile(fullPath, testCode);
      
      exportedFiles.push(fullPath);
      summary.totalTests++;
      
      if (scenario.uiFlow && scenario.uiFlow.length > 0) summary.withUiFlow++;
      if (scenario.persona) summary.withPersona++;
      if (scenario.riskLevel) summary.withRiskLevel++;
      summary.needsCompleteEnvironment++; // All need completion
    }
  }
  
  // Generate export manifest
  await generateExportManifest(exportedFiles, summary, options);
  
  return { exportedFiles, summary };
}

interface ExportSummary {
  totalTests: number;
  withUiFlow: number;
  withPersona: number;
  withRiskLevel: number;
  needsCompleteEnvironment: number;
}

async function generateExportManifest(
  files: string[],
  summary: ExportSummary,
  options: ExportOptions
): Promise<void> {
  const manifest = {
    exportDate: new Date().toISOString(),
    format: options.format,
    summary,
    files: files.map(f => ({
      path: f,
      status: 'ready-for-completion',
    })),
    instructions: {
      step1: 'Import tests to complete environment',
      step2: 'Add actual routes/endpoints',
      step3: 'Add actual UI locators',
      step4: 'Add test data fixtures',
      step5: 'Validate and run tests',
    },
  };
  
  const manifestPath = `${options.outputDirectory}/export-manifest.json`;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
```

---

## Vad Behöver Anpassas

### 1. Test Generator (BPMN Planner)

**Nuvarande**: `generateTestSkeleton()` genererar placeholders

**Behöver anpassas till**:
- ✅ Generera export-ready scripts med tydliga markörer
- ✅ Inkludera BPMN-metadata som kommentarer
- ✅ Strukturera för easy completion i nästa miljö
- ✅ Export-funktionalitet för att spara scripts

**Filer att uppdatera**:
- `src/lib/bpmnGenerators.ts` - Uppdatera `generateTestSkeleton()`
- Skapa `src/lib/exportReadyTestGenerator.ts` - Ny generator
- Skapa `src/lib/testExport.ts` - Export-funktionalitet

### 2. UI för Export (BPMN Planner)

**Behöver läggas till**:
- ✅ Knapp/UI för att exportera tester
- ✅ Val av export-format (Playwright/Jest/Mocha)
- ✅ Val av output directory
- ✅ Export summary/manifest

**Filer att skapa**:
- `src/components/TestExportDialog.tsx` - UI för export
- Uppdatera `BpmnFileManager.tsx` - Lägg till export-knapp

### 3. Dokumentation för Complete Environment

**Behöver skapas**:
- ✅ Guide för hur man importerar starter scripts
- ✅ Guide för hur man kompletterar scripts
- ✅ Checklist för vad som behöver göras
- ✅ Exempel på kompletterade scripts

**Filer att skapa**:
- `docs/EXPORT_TO_COMPLETE_ENVIRONMENT.md` - Export guide
- `docs/COMPLETING_TESTS_IN_COMPLETE_ENVIRONMENT.md` - Completion guide

---

## Konkret Implementation Plan

### Week 1: Export-Ready Generator

**Day 1-2**: Skapa `exportReadyTestGenerator.ts`
- [ ] Implementera `generateExportReadyTest()`
- [ ] Generera teststruktur med export-markörer
- [ ] Inkludera BPMN-metadata som kommentarer
- [ ] Testa med 1-2 BPMN-filer

**Day 3-4**: Skapa `testExport.ts`
- [ ] Implementera `exportTestsForCompleteEnvironment()`
- [ ] Generera export manifest
- [ ] Testa export-funktionalitet

**Day 5**: Integration
- [ ] Uppdatera `bpmnGenerators.ts` att använda ny generator
- [ ] Testa end-to-end

### Week 2: UI & Documentation

**Day 1-2**: Export UI
- [ ] Skapa `TestExportDialog.tsx`
- [ ] Lägg till export-knapp i `BpmnFileManager`
- [ ] Testa UI

**Day 3-4**: Documentation
- [ ] Skapa export guide
- [ ] Skapa completion guide
- [ ] Lägg till exempel

**Day 5**: Testing & Refinement
- [ ] Testa hela flödet
- [ ] Refinera baserat på feedback

---

## Exempel: Export-Ready Test

### Genererad i BPMN Planner:

```typescript
// ============================================
// EXPORT-READY TEST - Generated by BPMN Planner
// BPMN File: mortgage-se-application.bpmn
// Node ID: confirm-application
// Node Type: UserTask
// Scenario ID: EPIC-S1
// Scenario Name: Normalflöde med komplett underlag
// Persona: customer
// Risk Level: P0
// ============================================
// This test is ready for export to complete environment.
// Complete environment should:
// 1. Add actual routes/endpoints
// 2. Add actual UI locators
// 3. Add test data fixtures
// 4. Validate and run tests
// ============================================

import { test, expect } from '@playwright/test';
// ⚠️ TODO (Complete Environment): Import test data fixtures
// import { testData } from '../fixtures/mortgage-test-data';

test.describe('P0 - Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    // ⚠️ TODO (Complete Environment): Update login route and selectors
    await page.goto('/login'); // ⚠️ TODO: Update with actual login route
    await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
    await page.fill('#password', 'password123'); // ⚠️ TODO: Use real test password
    await page.click('#login-btn'); // ⚠️ TODO: Verify login button selector

    // Navigation steps (from uiFlow)
    // ⚠️ TODO (Complete Environment): Update routes and locators
    
    // Step 1: Navigate to application-form
    await page.goto('/application-form'); // ⚠️ TODO: Update with actual route
    
    // fill all fields
    await page.fill('#form', 'TODO: Add test data'); // ⚠️ TODO: Update locator and add test data
    
    // Step 2: click submit
    await page.click('#submit-btn'); // ⚠️ TODO: Verify locator
    
    // Step 3: Navigate to confirmation-page
    await page.goto('/confirmation-page'); // ⚠️ TODO: Update with actual route
    
    // verify message
    await page.locator('#confirmation').click(); // ⚠️ TODO: Verify action and locator

    // Assertions based on scenario outcome
    // Expected outcome: Epiken kan slutföras utan manuella avvikelser
    await expect(page.locator('.success-message, .confirmation')).toBeVisible();
    // ⚠️ TODO (Complete Environment): Verify actual success message locator
  });
});
```

### Efter komplettering i Complete Environment:

```typescript
import { test, expect } from '@playwright/test';
import { testData } from '../fixtures/mortgage-test-data';

test.describe('P0 - Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    await page.goto('https://mortgage-app.example.com/login');
    await page.fill('[data-testid="email-input"]', testData.customer.email);
    await page.fill('[data-testid="password-input"]', testData.customer.password);
    await page.click('[data-testid="login-button"]');

    // Navigation steps
    await page.goto('https://mortgage-app.example.com/application/form');
    await page.fill('[data-testid="personal-info-form"]', testData.customer.personalInfo);
    await page.fill('[data-testid="income-input"]', testData.customer.income.toString());
    await page.click('[data-testid="submit-button"]');
    await page.goto('https://mortgage-app.example.com/application/confirmation');
    await expect(page.locator('[data-testid="confirmation-message"]')).toBeVisible();

    // Assertions
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('Application confirmed');
  });
});
```

---

## Checklist: Vad Behöver Anpassas

### I BPMN Planner (Starter)

- [ ] **Skapa `exportReadyTestGenerator.ts`**
  - Generera export-ready scripts
  - Inkludera BPMN-metadata
  - Tydliga TODO-markörer

- [ ] **Skapa `testExport.ts`**
  - Export-funktionalitet
  - Export manifest
  - Summary

- [ ] **Uppdatera `bpmnGenerators.ts`**
  - Använd ny generator
  - Behåll bakåtkompatibilitet

- [ ] **Skapa Export UI**
  - Export dialog
  - Export knapp
  - Format selection

- [ ] **Dokumentation**
  - Export guide
  - Completion guide
  - Exempel

### I Complete Environment (Nästa Miljö)

- [ ] **Import Process**
  - Importera starter scripts
  - Validera struktur

- [ ] **Completion Process**
  - Lägg till routes
  - Lägg till locators
  - Lägg till testdata

- [ ] **Validation**
  - Kör tester
  - Fixa problem
  - Iterera

---

## Nästa Steg

1. **Implementera export-ready generator** i BPMN Planner
2. **Skapa export-funktionalitet** för att spara scripts
3. **Skapa dokumentation** för complete environment
4. **Testa end-to-end** med 1-2 BPMN-filer

Vill du att jag börjar implementera detta?

