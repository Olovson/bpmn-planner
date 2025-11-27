/**
 * Test Context Guard - Safeguards to prevent mixing BPMN Planner and Fictional App contexts
 * 
 * ⚠️ CRITICAL: Always use these guards when generating tests or working with scenarios
 * 
 * See docs/TWO_APP_CONTEXTS.md for explanation of the two app contexts
 */

import type { TestAppContext, TestContextMetadata, ContextValidationResult } from './testContextTypes';
import { validateTestContext, requireContextConfirmation } from './testContextTypes';

/**
 * Guard function: Ensures we're generating tests for the correct app context
 * 
 * @param context - Which app we're testing (BPMN_PLANNER or FICTIONAL_APP)
 * @param metadata - Context metadata to validate
 * @param options - Options for validation
 * @returns true if context is valid, throws if uncertain
 * 
 * @example
 * ```typescript
 * // When generating tests from BPMN scenarios (these are for FICTIONAL_APP)
 * ensureTestContext('FICTIONAL_APP', {
 *   appContext: 'FICTIONAL_APP',
 *   description: 'Mortgage application flow test',
 *   contextConfirmed: true
 * }, {
 *   testName: 'Customer submits application',
 *   route: '/application/new',
 *   persona: 'customer'
 * });
 * ```
 */
export function ensureTestContext(
  context: TestAppContext,
  metadata: TestContextMetadata,
  testMetadata: {
    testName?: string;
    route?: string;
    endpoint?: string;
    persona?: string;
    bpmnFile?: string;
  },
  options: {
    /**
     * If true, will throw error if context is uncertain
     * If false, will only warn
     */
    strict?: boolean;
    /**
     * If true, will auto-confirm if suggested context matches
     */
    autoConfirmIfSuggested?: boolean;
  } = {}
): boolean {
  const { strict = true, autoConfirmIfSuggested = false } = options;

  // Validate context
  const validation = validateTestContext(context, testMetadata);

  // Auto-confirm if suggested context matches and option is enabled
  if (autoConfirmIfSuggested && validation.suggestedContext === context) {
    metadata.contextConfirmed = true;
  }

  // If context is uncertain and not confirmed, handle it
  if (validation.requiresConfirmation && !metadata.contextConfirmed) {
    if (strict) {
      requireContextConfirmation(context, metadata, validation);
    } else {
      // In non-strict mode, just warn
      console.warn(
        `⚠️ Context uncertainty for test: ${testMetadata.testName || 'unknown'}\n` +
        validation.warnings.join('\n') +
        (validation.suggestedContext
          ? `\n💡 Suggested context: ${validation.suggestedContext}`
          : '')
      );
    }
  }

  return validation.isValid || !strict;
}

/**
 * Helper: Get default context for BPMN-generated scenarios
 * 
 * ⚠️ IMPORTANT: Scenarios generated from BPMN files are ALWAYS for FICTIONAL_APP,
 * not BPMN Planner. BPMN files describe business processes, not the tool itself.
 */
export function getDefaultContextForBpmnScenario(): TestAppContext {
  return 'FICTIONAL_APP';
}

/**
 * Helper: Get default context for BPMN Planner feature tests
 * 
 * Tests for BPMN Planner's own features (upload, parse, display) are for BPMN_PLANNER.
 */
export function getDefaultContextForBpmnPlannerFeature(): TestAppContext {
  return 'BPMN_PLANNER';
}

/**
 * Helper: Create context metadata with safeguards
 */
export function createContextMetadata(
  appContext: TestAppContext,
  description: string,
  confirmed: boolean = false
): TestContextMetadata {
  return {
    appContext,
    description,
    contextConfirmed: confirmed,
  };
}

/**
 * Helper: Prompt for context confirmation (for interactive use)
 * 
 * Use this when you're uncertain about which app context to use.
 */
export function promptForContextConfirmation(
  testMetadata: {
    testName?: string;
    route?: string;
    endpoint?: string;
    persona?: string;
    bpmnFile?: string;
  }
): {
  context: TestAppContext;
  confirmed: boolean;
} {
  const validationBpmnPlanner = validateTestContext('BPMN_PLANNER', testMetadata);
  const validationFictionalApp = validateTestContext('FICTIONAL_APP', testMetadata);

  // Determine which context seems more likely
  const bpmnPlannerScore = validationBpmnPlanner.warnings.length === 0 ? 1 : 0;
  const fictionalAppScore = validationFictionalApp.warnings.length === 0 ? 1 : 0;

  let suggestedContext: TestAppContext;
  if (fictionalAppScore > bpmnPlannerScore) {
    suggestedContext = 'FICTIONAL_APP';
  } else if (bpmnPlannerScore > fictionalAppScore) {
    suggestedContext = 'BPMN_PLANNER';
  } else {
    // Default: BPMN scenarios are for fictional app
    suggestedContext = testMetadata.bpmnFile ? 'FICTIONAL_APP' : 'BPMN_PLANNER';
  }

  return {
    context: suggestedContext,
    confirmed: false, // Always requires explicit confirmation
  };
}

/**
 * Helper: Generate test file path based on context
 */
export function getTestFilePath(
  context: TestAppContext,
  testName: string,
  options: {
    extension?: string;
    subdirectory?: string;
  } = {}
): string {
  const { extension = '.spec.ts', subdirectory } = options;
  const baseDir = context === 'BPMN_PLANNER' ? 'bpmn-planner' : 'fictional-app';
  const subdir = subdirectory ? `${subdirectory}/` : '';
  return `tests/${baseDir}/${subdir}${testName}${extension}`;
}

/**
 * Helper: Generate Page Object path based on context
 */
export function getPageObjectPath(
  context: TestAppContext,
  pageName: string
): string {
  const baseDir = context === 'BPMN_PLANNER' ? 'bpmn-planner' : 'fictional-app';
  const prefix = context === 'BPMN_PLANNER' ? 'bpmn-planner-' : '';
  return `tests/${baseDir}/page-objects/${prefix}${pageName}.ts`;
}

