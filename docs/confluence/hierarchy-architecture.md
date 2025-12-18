# BPMN Hierarchical Architecture

## Overview

This document explains the hierarchical BPMN structure used throughout the application for tests, documentation, and dashboards.

## Central Hierarchy Model

All BPMN-related features now use a **shared hierarchical model** defined in `src/lib/bpmnHierarchy.ts`. This ensures consistency across:

1. **Test Generation** - Hierarchical test files with nested describe blocks
2. **Documentation** - Structured docs matching process hierarchy
3. **Test Dashboard** - Hierarchical test report display
4. **Jira Integration** - Hierarchical ticket naming (Initiative → Feature Goal → Epic)

## BPMN Hierarchy Levels

```
Initiative (Root Process)
├── Feature Goal (CallActivity)
│   ├── Epic (UserTask)
│   ├── Epic (ServiceTask)
│   └── Epic (BusinessRuleTask)
├── Feature Goal (CallActivity)
│   └── ... (more epics)
└── ... (more feature goals)
```

### Example: Application Process

```
Application (Initiative)
├── Internal data gathering (Feature Goal)
│   ├── Fetch party information (Epic - ServiceTask)
│   ├── Pre-screen party (Epic - BusinessRuleTask)
│   └── Fetch engagements (Epic - ServiceTask)
├── Stakeholder (Feature Goal)
│   ├── Consent to credit check (Epic - UserTask)
│   ├── Fetch personal information (Epic - ServiceTask)
│   └── ... (more epics)
├── Object (Feature Goal)
│   └── ... (more epics)
└── Household (Feature Goal)
    └── ... (more epics)
```

## Test File Structure

Tests are now generated with **hierarchical describe blocks** that match the BPMN structure:

```typescript
test.describe('Application', () => {
  
  test.describe('Internal data gathering', () => {
    test('Fetch party information', async ({ page }) => { ... });
    test('Pre-screen party', async ({ page }) => { ... });
    test('Fetch engagements', async ({ page }) => { ... });
  });
  
  test.describe('Stakeholder', () => {
    test('Consent to credit check', async ({ page }) => { ... });
    // ... more tests
  });
  
  // ... more feature goals
});
```

### Benefits

- **Clear Context**: Each test knows its position in the process hierarchy
- **Organized**: Tests are grouped by feature goal, making them easier to find
- **Consistent Naming**: Test names match BPMN element names exactly
- **Hierarchical Reporting**: Test results can be displayed in a tree structure

## Documentation Structure

Documentation generation now follows the same hierarchy:

1. **Process Overview** (Initiative level)
2. **Feature Goal Sections** (CallActivity level)
3. **Node Details** (Task level - Epics)

This ensures documentation readers understand the context and relationship between different parts of the process.

## Test Dashboard

The test dashboard (`/test-report`) now displays tests hierarchically:

- Group by **BPMN file** (Initiative)
- Show **feature goals** as expandable sections
- List **individual tests** (epics) under each feature goal
- Display hierarchical path: `Application → Internal data gathering → Fetch party information`

## Jira Integration

The Jira name generation uses the same hierarchy to create meaningful ticket names:

- **CallActivity**: `Application - Internal data gathering` (Feature Goal)
- **UserTask**: `Application - Internal data gathering - Fetch party information` (Epic)

This matches the organizational hierarchy in Jira:
```
Project
└── Initiative (Application)
    └── Feature Goal (Internal data gathering)
        └── Epic (Fetch party information)
            └── Tasks/Stories
```

## Implementation Details

### Core Functions

- `buildBpmnHierarchy()` - Builds hierarchical model from BPMN file
- `generateHierarchicalTestFileFromTree()` - Generates nested test structure (uses ProcessTree)
- `generateTestDescribeStructure()` - Creates describe block hierarchy
- `getTestableNodes()` - Gets all nodes that should have tests
- `getFeatureGoals()` - Gets all CallActivities
- `getEpics()` - Gets all tasks

### Data Flow

```
BPMN File (XML)
    ↓
Parse BPMN (bpmnParser.ts)
    ↓
Build Hierarchy (bpmnHierarchy.ts)
    ↓
┌──────────┬────────────┬──────────────┐
│          │            │              │
Tests      Docs         Dashboard      Jira
```

All artifacts are generated from the **same hierarchical model**, ensuring consistency.

## Migration from Flat Structure

### Before (Flat)
- Tests were independent files per node
- No clear grouping or context
- Dashboard showed flat list of tests
- Jira names were simple element names

### After (Hierarchical)
- Tests are organized in nested describe blocks
- Clear parent-child relationships
- Dashboard shows tree structure
- Jira names include full hierarchical path

### Backward Compatibility

- Existing flat test files still work
- Legacy `generateTestSkeleton()` function preserved
- Gradual migration to hierarchical structure
- Old test links continue to function

## Best Practices

1. **Use hierarchy model** - Always use `buildBpmnHierarchy()` when generating artifacts
2. **Consistent naming** - Use node names from hierarchy, don't create new names
3. **Preserve context** - Include parent path in generated artifacts
4. **Test grouping** - Group related tests under their feature goal describe block
5. **Documentation structure** - Mirror the hierarchy in documentation sections

## Future Enhancements

- **Nested subprocess support** - Handle multiple levels of CallActivity nesting
- **Cross-file dependencies** - Link tests across different BPMN files
- **Visual hierarchy view** - D3.js tree visualization of test structure
- **Automatic test organization** - Reorganize existing flat tests into hierarchy
- **Hierarchical test execution** - Run all tests for a feature goal or initiative

## References

- `src/lib/bpmnHierarchy.ts` - Core hierarchy model
- `src/lib/bpmnGenerators.ts` - Hierarchical test generation
- `src/pages/TestReport.tsx` - Hierarchical dashboard
- `supabase/functions/generate-artifacts/index.ts` - Artifact generation with hierarchy