# Two App Contexts: Critical Distinction

## ⚠️ IMPORTANT: Always Clarify Which App You're Working With

There are **TWO completely different applications** in this project:

---

## 1. **BPMN Planner** (The Tool We're Building)

**What it is**: The application we're currently developing - a tool for planning, documenting, and managing BPMN processes.

**Purpose**: 
- Upload and parse BPMN files
- Generate documentation
- Plan test scenarios
- Visualize process hierarchies
- Manage BPMN artifacts

**Tests for BPMN Planner**:
- UI tests for BPMN Planner's interface
- Tests for BPMN file parsing
- Tests for documentation generation
- Tests for the tool's features

**Example**: "Test that BPMN Planner can upload a BPMN file and display it correctly"

**Code location**: `src/` (most of our codebase)

---

## 2. **The Fictional App** (What BPMN Files Represent)

**What it is**: The application/system that the BPMN files describe (e.g., a mortgage application system, loan processing system, etc.)

**Purpose**:
- The actual business application that needs to be tested
- The system that implements the BPMN processes
- The target of our generated test scenarios

**Tests for The Fictional App**:
- Tests for the mortgage application flow
- Tests for loan processing
- Tests for the actual business logic
- Tests generated FROM BPMN files

**Example**: "Test that a customer can submit a mortgage application" (this tests the fictional app, not BPMN Planner)

**Code location**: Generated test files, test scenarios, Page Objects for the fictional app

---

## Key Distinctions

| Aspect | BPMN Planner (Our Tool) | Fictional App (BPMN Target) |
|--------|------------------------|----------------------------|
| **What we test** | The tool's functionality | The business application |
| **Test location** | `tests/bpmn-planner/` | `tests/fictional-app/` or generated |
| **Test purpose** | Does BPMN Planner work? | Does the mortgage system work? |
| **UI elements** | BPMN Planner's UI | Fictional app's UI (forms, pages) |
| **API endpoints** | BPMN Planner's API | Fictional app's API |
| **User personas** | BPMN Planner users | Fictional app users (customers, advisors) |
| **Scenarios** | Tool usage scenarios | Business process scenarios |

---

## When to Ask for Clarification

**ALWAYS ask if you're uncertain about:**
- Which app's tests are being discussed
- Which app's UI/API is being referenced
- Which app's user personas are relevant
- Which app's scenarios are being generated

**Red flags that indicate confusion:**
- Mixing BPMN Planner UI with fictional app UI
- Using BPMN Planner routes for fictional app tests
- Testing BPMN file parsing when we should test business logic
- Generating tests for BPMN Planner when we should generate tests for the fictional app

---

## Naming Conventions

### For BPMN Planner (Our Tool)
- Test files: `tests/bpmn-planner/**/*.spec.ts`
- Page Objects: `tests/bpmn-planner/page-objects/bpmn-planner-*.ts`
- Test data: `tests/bpmn-planner/fixtures/bpmn-planner-*.ts`
- Routes: `/bpmn-viewer`, `/documentation`, `/hierarchy`

### For Fictional App (BPMN Target)
- Test files: `tests/fictional-app/**/*.spec.ts` or generated
- Page Objects: `tests/fictional-app/page-objects/mortgage-*.ts`
- Test data: `tests/fictional-app/fixtures/mortgage-*.ts`
- Routes: `/application/new`, `/confirmation` (fictional app routes)

---

## Code Safeguards

When generating code, always:
1. Check which context you're in
2. Use appropriate naming conventions
3. Reference the correct app's routes/endpoints
4. Use the correct user personas
5. Generate tests for the correct app

---

## Examples

### ❌ WRONG: Mixing Contexts

```typescript
// This is WRONG - mixing BPMN Planner with fictional app
test('Customer submits application', async ({ page }) => {
  await page.goto('/bpmn-viewer'); // ❌ BPMN Planner route
  await page.fill('#application-form'); // ❌ Fictional app form
});
```

### ✅ CORRECT: Clear Separation

```typescript
// Test for BPMN Planner (our tool)
test('BPMN Planner displays BPMN file', async ({ page }) => {
  await page.goto('/bpmn-viewer'); // ✅ BPMN Planner route
  await expect(page.locator('.bpmn-diagram')).toBeVisible();
});

// Test for Fictional App (generated from BPMN)
test('Customer submits mortgage application', async ({ page }) => {
  await page.goto('https://mortgage-app.example.com/application/new'); // ✅ Fictional app route
  await page.fill('#application-form'); // ✅ Fictional app form
});
```

---

## Decision Tree: Which App?

When working with tests/scenarios, ask:

1. **What are we testing?**
   - BPMN Planner's features → **BPMN Planner**
   - Business processes from BPMN files → **Fictional App**

2. **Where does the test run?**
   - Against BPMN Planner's UI/API → **BPMN Planner**
   - Against the business application → **Fictional App**

3. **What's the test purpose?**
   - Validate the tool works → **BPMN Planner**
   - Validate business logic works → **Fictional App**

4. **Who is the user?**
   - BPMN Planner user (developer, architect) → **BPMN Planner**
   - Business app user (customer, advisor) → **Fictional App**

---

## Safeguards in Code

See `src/lib/testContextGuard.ts` for runtime safeguards that will:
- Validate which app context we're in
- Warn if contexts are mixed
- Require explicit confirmation when uncertain

