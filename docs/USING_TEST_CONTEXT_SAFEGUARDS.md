# Using Test Context Safeguards

## Overview

This guide explains how to use the safeguards we've put in place to prevent mixing BPMN Planner and Fictional App contexts.

**See `docs/TWO_APP_CONTEXTS.md` first** to understand the distinction between the two apps.

---

## Quick Reference

### When Generating Tests from BPMN Scenarios

**Always use FICTIONAL_APP context** - BPMN scenarios describe business processes, not the tool:

```typescript
import { ensureTestContext, getDefaultContextForBpmnScenario } from '@/lib/testContextGuard';

// BPMN scenarios are ALWAYS for the fictional app
const context = getDefaultContextForBpmnScenario(); // Returns 'FICTIONAL_APP'

ensureTestContext(
  context,
  {
    appContext: 'FICTIONAL_APP',
    description: 'Mortgage application flow from BPMN',
    contextConfirmed: true // Set to true when you're certain
  },
  {
    testName: 'Customer submits application',
    route: '/application/new',
    persona: 'customer',
    bpmnFile: 'mortgage-se-application.bpmn'
  }
);
```

### When Testing BPMN Planner Features

**Use BPMN_PLANNER context** - These are tests for the tool itself:

```typescript
import { ensureTestContext, getDefaultContextForBpmnPlannerFeature } from '@/lib/testContextGuard';

const context = getDefaultContextForBpmnPlannerFeature(); // Returns 'BPMN_PLANNER'

ensureTestContext(
  context,
  {
    appContext: 'BPMN_PLANNER',
    description: 'BPMN file upload feature',
    contextConfirmed: true
  },
  {
    testName: 'Upload BPMN file',
    route: '/bpmn-viewer',
    endpoint: '/api/upload-bpmn'
  }
);
```

---

## Safeguard Functions

### 1. `ensureTestContext()` - Main Guard Function

**Purpose**: Validates that test context matches indicators (routes, endpoints, personas, etc.)

**Usage**:
```typescript
ensureTestContext(
  context: 'BPMN_PLANNER' | 'FICTIONAL_APP',
  metadata: TestContextMetadata,
  testMetadata: {
    testName?: string;
    route?: string;
    endpoint?: string;
    persona?: string;
    bpmnFile?: string;
  },
  options?: {
    strict?: boolean; // Throw error if uncertain (default: true)
    autoConfirmIfSuggested?: boolean; // Auto-confirm if suggestion matches (default: false)
  }
);
```

**Example**:
```typescript
// This will throw if context doesn't match indicators
ensureTestContext(
  'FICTIONAL_APP',
  {
    appContext: 'FICTIONAL_APP',
    description: 'Mortgage application test',
    contextConfirmed: false // ⚠️ Will trigger validation
  },
  {
    testName: 'Customer submits application',
    route: '/application/new', // ✅ Matches FICTIONAL_APP
    persona: 'customer'
  },
  { strict: true } // Will throw if uncertain
);
```

### 2. `validateTestContext()` - Validation Only

**Purpose**: Validates context without throwing (returns warnings)

**Usage**:
```typescript
const validation = validateTestContext('FICTIONAL_APP', {
  route: '/bpmn-viewer', // ⚠️ This is a BPMN Planner route!
  persona: 'customer'
});

if (validation.requiresConfirmation) {
  console.warn(validation.warnings);
  // Handle uncertainty
}
```

### 3. `promptForContextConfirmation()` - Interactive Prompt

**Purpose**: Suggests context when uncertain (for interactive use)

**Usage**:
```typescript
const { context, confirmed } = promptForContextConfirmation({
  testName: 'Some test',
  route: '/some-route',
  bpmnFile: 'mortgage-se-application.bpmn'
});

// context will be 'FICTIONAL_APP' (because bpmnFile is present)
// confirmed will be false (requires explicit confirmation)
```

### 4. Helper Functions

```typescript
// Get default context for BPMN scenarios (always FICTIONAL_APP)
getDefaultContextForBpmnScenario(); // Returns 'FICTIONAL_APP'

// Get default context for BPMN Planner features
getDefaultContextForBpmnPlannerFeature(); // Returns 'BPMN_PLANNER'

// Generate test file path based on context
getTestFilePath('FICTIONAL_APP', 'mortgage-application'); 
// Returns: 'tests/fictional-app/mortgage-application.spec.ts'

// Generate Page Object path
getPageObjectPath('FICTIONAL_APP', 'application-form');
// Returns: 'tests/fictional-app/page-objects/application-form.ts'
```

---

## Common Patterns

### Pattern 1: Generating Tests from BPMN Scenarios

```typescript
import { 
  ensureTestContext, 
  getDefaultContextForBpmnScenario,
  getTestFilePath 
} from '@/lib/testContextGuard';
import type { EpicScenario } from '@/lib/epicDocTypes';

function generateTestFromBpmnScenario(
  scenario: EpicScenario,
  bpmnFile: string,
  route: string
): string {
  // BPMN scenarios are ALWAYS for fictional app
  const context = getDefaultContextForBpmnScenario();
  
  // Validate context
  ensureTestContext(
    context,
    {
      appContext: context,
      description: `Test for ${scenario.name} from ${bpmnFile}`,
      contextConfirmed: true // We're certain - BPMN = FICTIONAL_APP
    },
    {
      testName: scenario.name,
      route: route,
      persona: scenario.persona,
      bpmnFile: bpmnFile
    }
  );
  
  // Generate test code...
  const testPath = getTestFilePath(context, scenario.id);
  // ...
}
```

### Pattern 2: Testing BPMN Planner Features

```typescript
import { 
  ensureTestContext, 
  getDefaultContextForBpmnPlannerFeature,
  getTestFilePath 
} from '@/lib/testContextGuard';

function generateBpmnPlannerTest(
  featureName: string,
  route: string
): string {
  const context = getDefaultContextForBpmnPlannerFeature();
  
  ensureTestContext(
    context,
    {
      appContext: context,
      description: `Test for BPMN Planner feature: ${featureName}`,
      contextConfirmed: true
    },
    {
      testName: featureName,
      route: route
    }
  );
  
  // Generate test code...
  const testPath = getTestFilePath(context, featureName);
  // ...
}
```

### Pattern 3: When Uncertain - Ask for Confirmation

```typescript
import { promptForContextConfirmation, ensureTestContext } from '@/lib/testContextGuard';

function generateTestWithConfirmation(testMetadata: any): string {
  // If uncertain, prompt for confirmation
  const { context, confirmed } = promptForContextConfirmation(testMetadata);
  
  if (!confirmed) {
    // In interactive mode, you could prompt the user here
    throw new Error(
      `Context uncertain. Suggested: ${context}. ` +
      'Please explicitly confirm context before proceeding.'
    );
  }
  
  // Now use the confirmed context
  ensureTestContext(
    context,
    {
      appContext: context,
      description: 'Test with confirmed context',
      contextConfirmed: confirmed
    },
    testMetadata
  );
  
  // Generate test...
}
```

---

## What Triggers Warnings/Errors

### ✅ No Warning (Context Matches Indicators)

```typescript
// FICTIONAL_APP context with fictional app indicators
ensureTestContext('FICTIONAL_APP', metadata, {
  route: '/application/new', // ✅ Fictional app route
  persona: 'customer' // ✅ Fictional app persona
});

// BPMN_PLANNER context with BPMN Planner indicators
ensureTestContext('BPMN_PLANNER', metadata, {
  route: '/bpmn-viewer', // ✅ BPMN Planner route
  endpoint: '/api/upload-bpmn' // ✅ BPMN Planner endpoint
});
```

### ⚠️ Warning (Context Mismatch)

```typescript
// FICTIONAL_APP context but BPMN Planner route
ensureTestContext('FICTIONAL_APP', metadata, {
  route: '/bpmn-viewer', // ⚠️ This is BPMN Planner route!
  persona: 'customer'
});
// Will warn: "FICTIONAL_APP context but detected BPMN_PLANNER indicators"

// BPMN_PLANNER context but fictional app route
ensureTestContext('BPMN_PLANNER', metadata, {
  route: '/application/new', // ⚠️ This is fictional app route!
});
// Will warn: "BPMN_PLANNER context but detected FICTIONAL_APP indicators"
```

### ❌ Error (Uncertain Context, strict mode)

```typescript
// No clear indicators
ensureTestContext('FICTIONAL_APP', {
  contextConfirmed: false // ⚠️ Not confirmed
}, {
  testName: 'Some test',
  route: '/unknown-route' // ⚠️ No clear indicator
}, {
  strict: true // ⚠️ Will throw error
});
// Will throw: "Context uncertainty: Could not determine app context..."
```

---

## Best Practices

1. **Always set `contextConfirmed: true` when you're certain**
   - For BPMN scenarios: Always `FICTIONAL_APP`, always confirmed
   - For BPMN Planner features: Always `BPMN_PLANNER`, always confirmed

2. **Use helper functions for defaults**
   - `getDefaultContextForBpmnScenario()` for BPMN scenarios
   - `getDefaultContextForBpmnPlannerFeature()` for tool features

3. **Use `getTestFilePath()` and `getPageObjectPath()` for consistent paths**
   - Ensures tests go to the right directory
   - Prevents mixing contexts in file structure

4. **When uncertain, use `promptForContextConfirmation()`**
   - Don't guess - ask for confirmation
   - Better to be explicit than wrong

5. **Review warnings carefully**
   - Warnings indicate potential context mixing
   - Fix the context or the indicators, don't ignore warnings

---

## Integration with Test Generators

When updating test generators, always:

1. Determine context first (BPMN scenario = FICTIONAL_APP, tool feature = BPMN_PLANNER)
2. Use `ensureTestContext()` to validate
3. Use context-aware path helpers
4. Generate appropriate test code based on context

See `src/lib/bpmnGenerators.ts` for examples of integration.

