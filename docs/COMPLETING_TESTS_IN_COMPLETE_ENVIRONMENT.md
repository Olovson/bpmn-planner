# Completing Tests in Complete Environment: Step-by-Step Guide

## Översikt

Denna guide beskriver hur du kompletterar export-ready test scripts från BPMN Planner med riktiga routes, UI locators och testdata i complete environment.

---

## Steg 1: Förstå Export-Ready Format

### 1.1 Struktur

Export-ready tests har:
- ✅ BPMN-metadata som kommentarer
- ✅ Tydliga TODO-markörer
- ✅ Smart defaults (inferred routes/endpoints)
- ✅ Scenario-baserad logik

### 1.2 TODO-markörer

Leta efter dessa markörer i exporterade scripts:

```typescript
// ⚠️ TODO: Update with actual route
// ⚠️ TODO: Use real test credentials
// ⚠️ TODO: Update locator and add test data
// ⚠️ TODO (Complete Environment): ...
```

---

## Steg 2: Komplettera Routes/Endpoints

### 2.1 Uppdatera Routes

**Före**:
```typescript
await page.goto('/login'); // ⚠️ TODO: Update with actual login route
```

**Efter**:
```typescript
await page.goto('https://mortgage-app.example.com/login');
```

### 2.2 Uppdatera API Endpoints

**Före** (för ServiceTasks):
```typescript
const response = await request.get('/api/v1/fetch-party-information'); // ⚠️ TODO
```

**Efter**:
```typescript
const response = await request.get(
  'https://api.mortgage.example.com/api/v1/party-information',
  {
    headers: { 'Authorization': 'Bearer test-token' },
    params: { partyId: 'test-party-123' }
  }
);
```

---

## Steg 3: Komplettera UI Locators

### 3.1 Uppdatera Locators

**Före**:
```typescript
await page.fill('#form', 'TODO: Add test data'); // ⚠️ TODO: Update locator
```

**Efter**:
```typescript
await page.fill('[data-testid="personal-info-form"]', testData.personalInfo);
```

### 3.2 Best Practices för Locators

- ✅ Använd `data-testid` när möjligt
- ✅ Använd semantiska selektorer
- ✅ Undvik brittliga selektorer (klasser som ändras ofta)

**Exempel**:
```typescript
// ✅ Bra
await page.click('[data-testid="submit-button"]');
await page.fill('[data-testid="email-input"]', email);

// ❌ Undvik
await page.click('.btn-primary'); // Klass kan ändras
await page.fill('#input-123', email); // ID kan ändras
```

---

## Steg 4: Lägg till Test Data

### 4.1 Skapa Test Data Fixtures

**Skapa fil**: `tests/fixtures/mortgage-test-data.ts`

```typescript
export const testData = {
  customer: {
    email: 'customer@example.com',
    password: 'test-password-123',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      personalNumber: '198001011234',
    },
    income: 50000,
  },
  advisor: {
    email: 'advisor@example.com',
    password: 'test-password-123',
  },
};
```

### 4.2 Importera och Använd Test Data

**Före**:
```typescript
await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
```

**Efter**:
```typescript
import { testData } from '../fixtures/mortgage-test-data';

await page.fill('[data-testid="email-input"]', testData.customer.email);
await page.fill('[data-testid="password-input"]', testData.customer.password);
```

### 4.3 Använd dataProfileId

Om scenario har `dataProfileId`:

```typescript
// Scenario har dataProfileId: 'standard-customer'
// Använd motsvarande test data
await page.fill('[data-testid="personal-info"]', testData.standardCustomer.personalInfo);
```

---

## Steg 5: Komplettera UI Flow

### 5.1 Uppdatera Navigation Steps

**Före** (från uiFlow):
```typescript
// Step 1: Navigate to application-form
await page.goto('/application-form'); // ⚠️ TODO: Update with actual route

// fill all fields
await page.fill('#form', 'TODO: Add test data'); // ⚠️ TODO: Update locator
```

**Efter**:
```typescript
// Step 1: Navigate to application-form
await page.goto('https://mortgage-app.example.com/application/form');

// fill all fields
await page.fill('[data-testid="personal-info-form"]', testData.customer.personalInfo);
await page.fill('[data-testid="income-input"]', testData.customer.income.toString());
```

### 5.2 Lägg till Saknade Steg

Om uiFlow saknar steg, lägg till dem:

```typescript
// uiFlow har bara 2 steg, men vi behöver 3
await page.goto('...');
await page.fill('...', testData.customer.personalInfo);
// Lägg till saknat steg:
await page.selectOption('[data-testid="loan-type"]', 'mortgage');
await page.click('[data-testid="submit-button"]');
```

---

## Steg 6: Uppdatera Assertions

### 6.1 Verifiera Assertion Locators

**Före**:
```typescript
await expect(page.locator('.success-message, .confirmation')).toBeVisible();
// ⚠️ TODO: Verify actual success message locator
```

**Efter**:
```typescript
await expect(page.locator('[data-testid="confirmation-message"]')).toBeVisible();
await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('Application confirmed');
```

### 6.2 Lägg till Ytterligare Assertions

Baserat på scenario outcome:

```typescript
// Scenario outcome: "Application confirmed successfully"
await expect(page.locator('[data-testid="confirmation-message"]')).toBeVisible();
await expect(page.locator('[data-testid="application-id"]')).toBeVisible();
await expect(page.locator('[data-testid="next-steps"]')).toContainText('Review');
```

---

## Steg 7: Persona Setup

### 7.1 Uppdatera Login

**Före**:
```typescript
// Setup: Login as customer
await page.goto('/login'); // ⚠️ TODO: Update with actual login route
await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
await page.fill('#password', 'password123'); // ⚠️ TODO: Use real test password
await page.click('#login-btn'); // ⚠️ TODO: Verify login button selector
```

**Efter**:
```typescript
// Setup: Login as customer
await page.goto('https://mortgage-app.example.com/login');
await page.fill('[data-testid="email-input"]', testData.customer.email);
await page.fill('[data-testid="password-input"]', testData.customer.password);
await page.click('[data-testid="login-button"]');
await page.waitForURL('**/dashboard'); // Verifiera att login lyckades
```

### 7.2 Olika Personas

```typescript
if (scenario.persona === 'customer') {
  await page.fill('[data-testid="email-input"]', testData.customer.email);
  await page.fill('[data-testid="password-input"]', testData.customer.password);
} else if (scenario.persona === 'advisor') {
  await page.fill('[data-testid="email-input"]', testData.advisor.email);
  await page.fill('[data-testid="password-input"]', testData.advisor.password);
}
```

---

## Steg 8: Validera och Kör Tester

### 8.1 Kompilera

```bash
npm run type-check
```

### 8.2 Kör Tester

```bash
# Kör alla tester
npm test

# Kör specifik test
npx playwright test tests/fictional-app/confirm-application-EPIC-S1.spec.ts

# Kör med UI
npx playwright test --ui
```

### 8.3 Fixa Problem

Om tester misslyckas:

1. **Kontrollera routes** - Är routes korrekta?
2. **Kontrollera locators** - Finns elementen på sidan?
3. **Kontrollera testdata** - Är data korrekt?
4. **Kontrollera timing** - Behöver du `waitFor`?

**Exempel på timing-fix**:
```typescript
// Före (kan misslyckas om sidan laddas långsamt)
await page.goto('...');
await page.click('[data-testid="submit-button"]');

// Efter (väntar på att element är synligt)
await page.goto('...');
await page.waitForSelector('[data-testid="submit-button"]', { state: 'visible' });
await page.click('[data-testid="submit-button"]');
```

---

## Steg 9: Iterativ Förbättring

### 9.1 Identifiera Mönster

När du kompletterat flera tester, identifiera mönster:

- Gemensamma routes → skapa konstanter
- Gemensamma locators → skapa Page Objects
- Gemensam testdata → utöka fixtures

### 9.2 Skapa Page Objects

**Skapa**: `tests/fictional-app/page-objects/application-form-page.ts`

```typescript
export class ApplicationFormPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('https://mortgage-app.example.com/application/form');
  }

  async fillPersonalInfo(data: PersonalInfo) {
    await this.page.fill('[data-testid="personal-info-form"]', data);
  }

  async submit() {
    await this.page.click('[data-testid="submit-button"]');
  }
}
```

**Använd i test**:
```typescript
const appForm = new ApplicationFormPage(page);
await appForm.goto();
await appForm.fillPersonalInfo(testData.customer.personalInfo);
await appForm.submit();
```

---

## Checklist: Komplettering

För varje export-ready test:

- [ ] Uppdaterat routes/endpoints
- [ ] Uppdaterat UI locators
- [ ] Lagt till testdata fixtures
- [ ] Uppdaterat persona setup
- [ ] Kompletterat UI flow
- [ ] Uppdaterat assertions
- [ ] Test kompilerar
- [ ] Test körs och passerar
- [ ] Eventuella Page Objects skapade

---

## Exempel: Komplett Transformation

### Före (Export-Ready)

```typescript
// EXPORT-READY TEST - Generated by BPMN Planner
test.describe('P0 - Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    await page.goto('/login'); // ⚠️ TODO: Update with actual login route
    await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
    
    // Navigation steps
    await page.goto('/application-form'); // ⚠️ TODO: Update with actual route
    await page.fill('#form', 'TODO: Add test data'); // ⚠️ TODO: Update locator
    
    // Assertions
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### Efter (Komplett)

```typescript
import { test, expect } from '@playwright/test';
import { testData } from '../fixtures/mortgage-test-data';
import { ApplicationFormPage } from './page-objects/application-form-page';

test.describe('P0 - Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    await page.goto('https://mortgage-app.example.com/login');
    await page.fill('[data-testid="email-input"]', testData.customer.email);
    await page.fill('[data-testid="password-input"]', testData.customer.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
    
    // Navigation steps
    const appForm = new ApplicationFormPage(page);
    await appForm.goto();
    await appForm.fillPersonalInfo(testData.customer.personalInfo);
    await appForm.fillIncome(testData.customer.income);
    await appForm.submit();
    
    // Assertions
    await expect(page.locator('[data-testid="confirmation-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('Application confirmed');
  });
});
```

---

## Nästa Steg

Efter komplettering:
1. Kör tester regelbundet
2. Uppdatera vid behov när appen ändras
3. Dela Page Objects och fixtures mellan tester
4. Iterera baserat på resultat

