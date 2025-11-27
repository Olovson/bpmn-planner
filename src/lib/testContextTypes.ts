/**
 * Test Context Types - Critical Distinction
 * 
 * ⚠️ IMPORTANT: Always clarify which app context you're working with:
 * 
 * 1. BPMN_PLANNER: The tool we're building (BPMN Planner app itself)
 * 2. FICTIONAL_APP: The app that BPMN files represent (e.g., mortgage system)
 * 
 * See docs/TWO_APP_CONTEXTS.md for full explanation
 */

export type TestAppContext = 'BPMN_PLANNER' | 'FICTIONAL_APP';

/**
 * Metadata to identify which app a test/scenario belongs to
 */
export interface TestContextMetadata {
  appContext: TestAppContext;
  /**
   * For BPMN_PLANNER: describes what feature of the tool is being tested
   * For FICTIONAL_APP: describes what business process is being tested
   */
  description: string;
  /**
   * Optional: explicit confirmation that context is correct
   * Set to true when you're certain about the context
   */
  contextConfirmed?: boolean;
}

/**
 * Scenario metadata with app context
 */
export interface ContextualScenario {
  /**
   * Which app this scenario tests
   */
  appContext: TestAppContext;
  
  /**
   * Original scenario data
   */
  scenario: {
    id: string;
    name: string;
    description: string;
    // ... other scenario fields
  };
  
  /**
   * Context-specific metadata
   */
  context: TestContextMetadata;
}

/**
 * Type guard to check if we're in BPMN Planner context
 */
export function isBpmnPlannerContext(context: TestAppContext): context is 'BPMN_PLANNER' {
  return context === 'BPMN_PLANNER';
}

/**
 * Type guard to check if we're in Fictional App context
 */
export function isFictionalAppContext(context: TestAppContext): context is 'FICTIONAL_APP' {
  return context === 'FICTIONAL_APP';
}

/**
 * Validation result for context checking
 */
export interface ContextValidationResult {
  isValid: boolean;
  warnings: string[];
  requiresConfirmation: boolean;
  suggestedContext?: TestAppContext;
}

/**
 * Validate that context makes sense for the given scenario/test
 */
export function validateTestContext(
  context: TestAppContext,
  metadata: {
    testName?: string;
    route?: string;
    endpoint?: string;
    persona?: string;
    bpmnFile?: string;
  }
): ContextValidationResult {
  const warnings: string[] = [];
  let requiresConfirmation = false;

  // Check for BPMN Planner indicators
  const bpmnPlannerIndicators = [
    '/bpmn-viewer',
    '/documentation',
    '/hierarchy',
    'bpmn-planner',
    'upload-bpmn',
    'parse-bpmn',
  ];

  // Check for Fictional App indicators
  const fictionalAppIndicators = [
    '/application',
    '/mortgage',
    '/loan',
    'customer',
    'advisor',
    'submit-application',
  ];

  const hasBpmnPlannerIndicator = 
    bpmnPlannerIndicators.some(indicator => 
      metadata.route?.includes(indicator) ||
      metadata.endpoint?.includes(indicator) ||
      metadata.testName?.toLowerCase().includes(indicator)
    );

  const hasFictionalAppIndicator =
    fictionalAppIndicators.some(indicator =>
      metadata.route?.includes(indicator) ||
      metadata.endpoint?.includes(indicator) ||
      metadata.testName?.toLowerCase().includes(indicator) ||
      metadata.persona?.toLowerCase().includes(indicator)
    );

  // Detect conflicts
  if (context === 'BPMN_PLANNER' && hasFictionalAppIndicator) {
    warnings.push(
      '⚠️ BPMN_PLANNER context but detected FICTIONAL_APP indicators (route/endpoint/persona). ' +
      'Are you sure this test is for BPMN Planner, not the fictional app?'
    );
    requiresConfirmation = true;
  }

  if (context === 'FICTIONAL_APP' && hasBpmnPlannerIndicator) {
    warnings.push(
      '⚠️ FICTIONAL_APP context but detected BPMN_PLANNER indicators (route/endpoint). ' +
      'Are you sure this test is for the fictional app, not BPMN Planner?'
    );
    requiresConfirmation = true;
  }

  // Suggest context if uncertain
  let suggestedContext: TestAppContext | undefined;
  if (!hasBpmnPlannerIndicator && !hasFictionalAppIndicator) {
    warnings.push(
      '⚠️ Could not determine app context from indicators. ' +
      'Please explicitly confirm which app this test is for.'
    );
    requiresConfirmation = true;
  } else if (hasFictionalAppIndicator && !hasBpmnPlannerIndicator) {
    suggestedContext = 'FICTIONAL_APP';
  } else if (hasBpmnPlannerIndicator && !hasFictionalAppIndicator) {
    suggestedContext = 'BPMN_PLANNER';
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    requiresConfirmation,
    suggestedContext,
  };
}

/**
 * Require explicit confirmation when context is uncertain
 */
export function requireContextConfirmation(
  context: TestAppContext,
  metadata: TestContextMetadata,
  validation: ContextValidationResult
): void {
  if (validation.requiresConfirmation && !metadata.contextConfirmed) {
    const message = [
      '⚠️ CONTEXT UNCERTAINTY DETECTED',
      '',
      `Current context: ${context}`,
      `Description: ${metadata.description}`,
      '',
      'Warnings:',
      ...validation.warnings,
      '',
      validation.suggestedContext
        ? `Suggested context: ${validation.suggestedContext}`
        : 'Could not suggest context',
      '',
      'Please explicitly confirm the correct context before proceeding.',
      'Set contextConfirmed: true when you are certain.',
    ].join('\n');

    console.warn(message);
    throw new Error(
      `Context uncertainty: ${validation.warnings.join('; ')}. ` +
      'Please confirm context before proceeding.'
    );
  }
}

