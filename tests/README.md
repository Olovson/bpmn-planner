# BPMN Test Suite

This directory contains Playwright tests generated from BPMN process models. Tests are organized hierarchically to match the BPMN and Jira structure:

- **Initiative** (top-level BPMN process, e.g., "Application")
- **Feature Goals** (CallActivity nodes)
- **Epics** (UserTask, ServiceTask, BusinessRuleTask nodes)

## Test Structure

Each test file follows a hierarchical structure with nested `describe` blocks:

```typescript
test.describe('Application', () => {
  test.describe('Internal data gathering', () => {
    test('Application / Internal data gathering / Fetch party information – happy path', 
      async ({ page }, testInfo) => {
        // Test implementation
      }
    );
  });
});
```

## Test Naming Convention

Test names follow the pattern:

```
<Initiative> / <FeatureGoalPath> / <NodeName> – <ScenarioType>
```

Examples:
- `Application / Confirm application – happy path`
- `Application / Internal data gathering / Fetch party information – validation error`
- `Application / Stakeholder / Register applicant – edge case`

## Test Metadata & Tags

Every test is annotated with metadata tags for filtering and reporting:

- `@initiative:<name>` - Top-level process (e.g., `@initiative:application`)
- `@feature:<path>` - Feature goal path (e.g., `@feature:application-internal-data-gathering`)
- `@epic:<path>` - Full hierarchical path to epic (e.g., `@epic:application-internal-data-gathering-fetch-party-information`)
- `@bpmn:<element-id>` - BPMN element ID (e.g., `@bpmn:fetch-party-information`)
- `@bpmn-file:<file>` - BPMN file name (e.g., `@bpmn-file:mortgage-se-application`)
- `@jira-type:<type>` - Jira type (`@jira-type:epic` or `@jira-type:feature-goal`)

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run tests by initiative
```bash
npx playwright test --grep "@initiative:application"
```

### Run tests by feature goal
```bash
npx playwright test --grep "@feature:application-internal-data-gathering"
```

### Run tests by epic/node
```bash
npx playwright test --grep "@epic:application-internal-data-gathering-fetch-party-information"
```

### Run tests by BPMN element
```bash
npx playwright test --grep "@bpmn:fetch-party-information"
```

### Run tests by Jira type
```bash
# Run all feature goal tests
npx playwright test --grep "@jira-type:feature-goal"

# Run all epic tests
npx playwright test --grep "@jira-type:epic"
```

### Run tests by BPMN file
```bash
npx playwright test --grep "@bpmn-file:mortgage-se-application"
```

### Combine filters
```bash
# Run all epics in the Application initiative
npx playwright test --grep "@initiative:application" --grep "@jira-type:epic"

# Run all tests in Internal data gathering feature
npx playwright test --grep "@feature:application-internal-data-gathering"
```

## Test Generation

Tests are automatically generated from BPMN files via the `generate-artifacts` edge function. The generation:

1. Parses BPMN hierarchy (Initiative → Feature Goals → Epics)
2. Generates test stubs with standardized naming
3. Adds metadata annotations for filtering
4. Preserves existing test implementations (does not overwrite)

To regenerate tests:
1. Go to the BPMN File Manager
2. Select a BPMN file
3. Click "Generate Artifacts"
4. Tests will be created/updated in Supabase Storage

## Test Metadata Utilities

Helper functions for working with test metadata are available in:

```typescript
import { 
  buildTestName, 
  buildTags, 
  buildAnnotations,
  nodeToMeta,
  type NodeMeta 
} from '@/tests/meta/jiraBpmnMeta';
```

See `src/tests/meta/jiraBpmnMeta.ts` for details.

## Best Practices

1. **Don't edit generated test stubs** - The generator preserves existing implementations, but you should implement tests in the generated stubs rather than creating new files
2. **Use consistent scenario types** - Stick to: `happy path`, `validation error`, `edge case`, `error handling`
3. **Add additional scenarios** - You can add more test scenarios for the same node by following the naming convention
4. **Keep metadata in sync** - When adding manual tests, use the `buildTestName()` and `buildAnnotations()` helpers to maintain consistency

## Viewing Test Results

Test results are integrated into the app's Test Report dashboard:
- Navigate to the "Tests" page in the app
- View hierarchical test results grouped by Initiative → Feature Goal → Epic
- Click on test names to see BPMN links and documentation

## CI/CD Integration

Tests run automatically on GitHub Actions. Results are submitted to the app's test dashboard for tracking. See `.github/workflows/tests.yml` for workflow configuration.
