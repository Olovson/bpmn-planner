# From BPMN to Real Tests: Analysis & Roadmap

## Executive Summary

**Question**: Can we create viable, real tests from our BPMN files and scenario metadata?

**Answer**: **Yes, but with gaps to bridge**. We have the foundation (BPMN structure, scenarios, metadata), but need to connect them to executable test code.

---

## What We Have (Current State)

### 1. **Real BPMN Files** ✅
- Actual BPMN processes (e.g., `mortgage-se-application.bpmn`)
- Parsed structure: tasks, callActivities, sequence flows, subprocesses
- Node types: UserTask, ServiceTask, BusinessRuleTask, CallActivity
- Hierarchical relationships (parent/child processes)

### 2. **Scenario Metadata** ✅ (Just Added)
- `persona`: Who interacts (customer, advisor, system)
- `riskLevel`: Test priority (P0, P1, P2)
- `assertionType`: Test type (functional, regression, compliance)
- `uiFlow`: User navigation steps (pageId, action, locatorId)
- `dataProfileId`: Test data references

### 3. **Test Skeletons** ⚠️ (Basic)
- Currently generates placeholder Playwright tests
- Uses scenario names/descriptions but doesn't use rich metadata
- Generic structure, not connected to actual UI/API

---

## What's Missing (Gaps)

### 1. **UI/API Mapping**
- **Problem**: We know BPMN nodes but not their actual implementation
- **Missing**: 
  - Which pages/endpoints correspond to each UserTask/ServiceTask?
  - What are the actual URLs, API endpoints, or page routes?
  - What are the real locators/selectors for UI elements?

### 2. **Test Data Strategy**
- **Problem**: `dataProfileId` is just a string reference
- **Missing**:
  - Actual test data sets (fixtures, seed data)
  - Data generation strategy
  - How to map `dataProfileId` to real test data

### 3. **Test Code Generation**
- **Problem**: Current skeletons are placeholders (`expect(true).toBe(true)`)
- **Missing**:
  - Code that uses `uiFlow` to generate actual navigation
  - Code that uses `persona` to set up user context
  - Code that uses `riskLevel` to determine test execution
  - Page Object generation from `uiFlow`

### 4. **API Test Generation**
- **Problem**: ServiceTasks need API tests, not UI tests
- **Missing**:
  - API endpoint mapping
  - Request/response schemas
  - Authentication/authorization setup

---

## How to Make Tests Real and Usable

### Phase 1: Map BPMN to Implementation (Foundation)

#### 1.1 Create Implementation Mapping

Create a mapping file that connects BPMN nodes to actual implementation:

```typescript
// src/data/bpmnImplementationMapping.ts
export interface BpmnImplementationMapping {
  bpmnFile: string;
  bpmnElementId: string;
  implementationType: 'ui' | 'api' | 'both';
  ui?: {
    pageId: string;           // e.g., 'mortgage-application-form'
    route: string;            // e.g., '/application/new'
    baseUrl?: string;         // e.g., 'https://mortgage-app.example.com'
  };
  api?: {
    endpoint: string;         // e.g., '/api/v1/party-information'
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    baseUrl?: string;
  };
}

// Example mapping
export const implementationMappings: BpmnImplementationMapping[] = [
  {
    bpmnFile: 'mortgage-se-internal-data-gathering.bpmn',
    bpmnElementId: 'fetch-party-information',
    implementationType: 'api',
    api: {
      endpoint: '/api/v1/party-information',
      method: 'GET',
      baseUrl: 'https://api.mortgage.example.com'
    }
  },
  {
    bpmnFile: 'mortgage-se-application.bpmn',
    bpmnElementId: 'confirm-application',
    implementationType: 'ui',
    ui: {
      pageId: 'application-confirmation',
      route: '/application/confirm',
      baseUrl: 'https://mortgage-app.example.com'
    }
  }
];
```

#### 1.2 Enrich Scenarios with Implementation Info

When generating tests, merge scenario metadata with implementation mapping:

```typescript
interface EnrichedScenario extends EpicScenario {
  // Existing metadata
  persona?: ScenarioPersona;
  riskLevel?: ScenarioRiskLevel;
  uiFlow?: ScenarioUiStep[];
  
  // Added from implementation mapping
  implementation?: {
    type: 'ui' | 'api';
    route?: string;
    endpoint?: string;
    method?: string;
  };
}
```

### Phase 2: Generate Real Test Code

#### 2.1 Use `uiFlow` to Generate Navigation

Transform `uiFlow` into actual Playwright code:

```typescript
// Current (placeholder):
test('Normalflöde med komplett underlag', async ({ page }) => {
  await page.goto('/');
  expect(true).toBe(true);
});

// Generated from uiFlow:
test('Normalflöde med komplett underlag', async ({ page }) => {
  // Step 1: Navigate to application form
  await page.goto('https://mortgage-app.example.com/application/new');
  
  // Step 2: Fill personal information
  await page.locator('#personal-info-section').fill('...');
  
  // Step 3: Fill income information
  await page.locator('#income-input').fill('50000');
  
  // Step 4: Submit
  await page.locator('#submit-btn').click();
  
  // Step 5: Verify confirmation
  await expect(page.locator('#confirmation-message')).toBeVisible();
});
```

#### 2.2 Use `persona` for User Context

Set up user context based on `persona`:

```typescript
// Generate test setup based on persona
if (scenario.persona === 'customer') {
  // Login as customer
  await page.goto('/login');
  await page.fill('#email', 'customer@example.com');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
} else if (scenario.persona === 'advisor') {
  // Login as advisor
  await page.goto('/login');
  await page.fill('#email', 'advisor@example.com');
  await page.fill('#password', 'advisor123');
  await page.click('#login-btn');
}
```

#### 2.3 Use `riskLevel` for Test Organization

Organize tests by priority:

```typescript
// P0 tests run in smoke suite
test.describe('P0 - Critical Paths', () => {
  // High-priority tests
});

// P1 tests run in regression suite
test.describe('P1 - Important Flows', () => {
  // Medium-priority tests
});

// P2 tests run on-demand
test.describe('P2 - Edge Cases', () => {
  // Low-priority tests
});
```

### Phase 3: Generate Page Objects

#### 3.1 Extract Page Objects from `uiFlow`

Generate Page Object classes from `uiFlow`:

```typescript
// Generated from uiFlow with pageId: 'mortgage-application-form'
export class MortgageApplicationFormPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('https://mortgage-app.example.com/application/new');
  }
  
  async fillPersonalInfo(data: PersonalInfo) {
    await this.page.locator('#personal-info-section').fill(data);
  }
  
  async fillIncome(amount: number) {
    await this.page.locator('#income-input').fill(amount.toString());
  }
  
  async submit() {
    await this.page.locator('#submit-btn').click();
  }
}
```

### Phase 4: API Test Generation

#### 4.1 Generate API Tests for ServiceTasks

For ServiceTasks, generate API tests instead of UI tests:

```typescript
// Generated for ServiceTask: fetch-party-information
test('Fetch party information - Happy path', async ({ request }) => {
  const response = await request.get(
    'https://api.mortgage.example.com/api/v1/party-information',
    {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      params: {
        partyId: 'test-party-123'
      }
    }
  );
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty('partyId');
  expect(data).toHaveProperty('name');
});
```

---

## Implementation Roadmap

### Step 1: Create Implementation Mapping (Week 1)
- [ ] Design mapping structure
- [ ] Create mapping file/table
- [ ] Populate with known mappings (start with a few nodes)
- [ ] Create UI to manage mappings

### Step 2: Enhance Test Generator (Week 2-3)
- [ ] Update `generateTestSkeleton` to use `uiFlow`
- [ ] Add persona-based user setup
- [ ] Add riskLevel-based test organization
- [ ] Generate Page Objects from `uiFlow`

### Step 3: API Test Generation (Week 4)
- [ ] Detect ServiceTasks vs UserTasks
- [ ] Generate API tests for ServiceTasks
- [ ] Add API endpoint mapping
- [ ] Generate request/response validation

### Step 4: Test Data Integration (Week 5)
- [ ] Create test data fixtures
- [ ] Map `dataProfileId` to actual data
- [ ] Generate data setup/teardown code

### Step 5: Real Test Execution (Week 6+)
- [ ] Run generated tests against staging environment
- [ ] Validate test coverage
- [ ] Iterate based on results

---

## Making Tests More Real: Concrete Examples

### Example 1: UserTask with uiFlow

**BPMN Node**: `confirm-application` (UserTask)

**Scenario Metadata**:
```typescript
{
  id: 'EPIC-S1',
  name: 'Normalflöde med komplett underlag',
  persona: 'customer',
  riskLevel: 'P0',
  uiFlow: [
    { pageId: 'application-form', action: 'fill all fields', locatorId: 'form' },
    { pageId: 'application-form', action: 'click submit', locatorId: 'submit-btn' },
    { pageId: 'confirmation-page', action: 'verify message', locatorId: 'confirmation' }
  ]
}
```

**Generated Test**:
```typescript
import { test, expect } from '@playwright/test';
import { ApplicationFormPage } from './page-objects/application-form-page';
import { ConfirmationPage } from './page-objects/confirmation-page';

test.describe('P0 - Critical Paths: Confirm Application', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer (persona: 'customer')
    await page.goto('https://mortgage-app.example.com/login');
    await page.fill('#email', 'customer@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    
    // Step 1: Navigate to application form
    const appForm = new ApplicationFormPage(page);
    await appForm.goto();
    
    // Step 2: Fill all fields
    await appForm.fillAllFields({
      personalInfo: { /* test data */ },
      income: 50000,
      // ... other fields
    });
    
    // Step 3: Submit
    await appForm.submit();
    
    // Step 4: Verify confirmation
    const confirmation = new ConfirmationPage(page);
    await expect(confirmation.message).toBeVisible();
    await expect(confirmation.message).toContainText('Application confirmed');
  });
});
```

### Example 2: ServiceTask with API

**BPMN Node**: `fetch-party-information` (ServiceTask)

**Scenario Metadata**:
```typescript
{
  id: 'EPIC-S1',
  name: 'Fetch party information successfully',
  persona: 'system',
  riskLevel: 'P0',
  assertionType: 'functional'
}
```

**Generated Test**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('P0 - Critical Paths: Fetch Party Information', () => {
  test('Fetch party information successfully', async ({ request }) => {
    const response = await request.get(
      'https://api.mortgage.example.com/api/v1/party-information',
      {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        params: {
          partyId: 'test-party-123'
        }
      }
    );
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // Validate response structure
    expect(data).toHaveProperty('partyId');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('personalNumber');
    expect(data.partyId).toBe('test-party-123');
  });
});
```

---

## Key Success Factors

### 1. **Start Small**
- Begin with 1-2 BPMN files
- Map a few key nodes to real implementation
- Generate tests and validate they work

### 2. **Iterate Based on Real Usage**
- Run generated tests against staging
- Identify gaps (missing mappings, incorrect assumptions)
- Update mappings and regenerate

### 3. **Maintain Mapping as Living Document**
- Implementation mappings will change as app evolves
- Keep mappings up-to-date
- Version control mappings alongside BPMN files

### 4. **Use Metadata Strategically**
- `persona`: Drive user setup and context
- `riskLevel`: Organize test suites and CI/CD pipelines
- `uiFlow`: Generate actual navigation code
- `dataProfileId`: Link to test data fixtures

---

## Conclusion

**Yes, we can create viable tests from BPMN files**, but we need to:

1. ✅ **Have**: BPMN structure, scenarios, metadata
2. 🔨 **Build**: Implementation mapping (BPMN → UI/API)
3. 🔨 **Enhance**: Test generator to use metadata
4. 🔨 **Generate**: Real test code (not placeholders)
5. 🔨 **Execute**: Run tests and iterate

The foundation is solid. The next step is bridging BPMN to implementation and using our rich metadata to generate executable test code.

