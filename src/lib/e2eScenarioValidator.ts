/**
 * Validator för E2E-scenario output från LLM.
 */

export interface E2eScenarioLlmOutput {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  type: 'happy-path' | 'alt-path' | 'error';
  iteration: string;
  summary: string;
  given: string;
  when: string;
  then: string;
  notesForBankProject?: string;
  bankProjectTestSteps: Array<{
    bpmnNodeId: string;
    bpmnNodeType: 'CallActivity';
    bpmnNodeName: string;
    action: string;
    assertion: string;
    backendState?: string;
  }>;
  subprocessSteps: Array<{
    order: number;
    bpmnFile: string;
    callActivityId: string;
    description: string;
    given?: string;
    when?: string;
    then?: string;
    subprocessesSummary?: string;
    serviceTasksSummary?: string;
    userTasksSummary?: string;
    businessRulesSummary?: string;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validerar E2E-scenario output från LLM.
 * Returnerar både strukturell och innehållsvalidering.
 */
export function validateE2eScenarioOutput(text: string): E2eScenarioLlmOutput | null {
  try {
    // Försök parsa JSON
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      // Om parsing misslyckas, försök extrahera JSON från markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Försök hitta JSON direkt i texten
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        } else {
          console.error('[e2eScenarioValidator] No JSON found in output');
          return null;
        }
      }
    }

    // Validera grundläggande struktur
    if (!parsed || typeof parsed !== 'object') {
      console.error('[e2eScenarioValidator] Invalid output: not an object');
      return null;
    }

    // Validera required fields
    const required = ['id', 'name', 'priority', 'type', 'iteration', 'summary', 'given', 'when', 'then', 'bankProjectTestSteps', 'subprocessSteps'];
    for (const field of required) {
      if (!(field in parsed)) {
        console.error(`[e2eScenarioValidator] Missing required field: ${field}`);
        return null;
      }
    }

    // Validera priority
    if (!['P0', 'P1', 'P2'].includes(parsed.priority)) {
      console.error(`[e2eScenarioValidator] Invalid priority: ${parsed.priority}`);
      return null;
    }

    // Validera type
    if (!['happy-path', 'alt-path', 'error'].includes(parsed.type)) {
      console.error(`[e2eScenarioValidator] Invalid type: ${parsed.type}`);
      return null;
    }

    // Validera bankProjectTestSteps
    if (!Array.isArray(parsed.bankProjectTestSteps)) {
      console.error('[e2eScenarioValidator] bankProjectTestSteps must be an array');
      return null;
    }

    // Validera subprocessSteps
    if (!Array.isArray(parsed.subprocessSteps)) {
      console.error('[e2eScenarioValidator] subprocessSteps must be an array');
      return null;
    }

    // Validera varje bankProjectTestStep
    for (const step of parsed.bankProjectTestSteps) {
      if (!step.bpmnNodeId || !step.bpmnNodeType || !step.bpmnNodeName || !step.action || !step.assertion) {
        console.error('[e2eScenarioValidator] Invalid bankProjectTestStep:', step);
        return null;
      }
      if (step.bpmnNodeType !== 'CallActivity') {
        console.error('[e2eScenarioValidator] bankProjectTestStep.bpmnNodeType must be CallActivity');
        return null;
      }
    }

    // Validera varje subprocessStep
    for (const step of parsed.subprocessSteps) {
      if (typeof step.order !== 'number' || !step.bpmnFile || !step.callActivityId || !step.description) {
        console.error('[e2eScenarioValidator] Invalid subprocessStep:', step);
        return null;
      }
    }

    // INNEHÅLLSVALIDERING: Validera minsta längd och kvalitet
    const contentValidation = validateE2eScenarioContent(parsed);
    if (!contentValidation.valid) {
      console.error('[e2eScenarioValidator] Content validation failed:', contentValidation.errors);
      // Returnera null om kritiska fel finns, annars varningar
      if (contentValidation.errors.some(e => e.includes('CRITICAL'))) {
        return null;
      }
      // Logga varningar men acceptera ändå
      contentValidation.warnings.forEach(w => console.warn('[e2eScenarioValidator] Warning:', w));
    }

    return parsed as E2eScenarioLlmOutput;
  } catch (error) {
    console.error('[e2eScenarioValidator] Validation error:', error);
    return null;
  }
}

/**
 * Validerar innehållet i E2E-scenario (kvalitet, längd, Feature Goal-namn, etc.)
 */
export function validateE2eScenarioContent(parsed: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validera minsta längd på textfält
  const MIN_SUMMARY_LENGTH = 50;
  const MIN_GIVEN_LENGTH = 20;
  const MIN_WHEN_LENGTH = 20;
  const MIN_THEN_LENGTH = 20;

  if (!parsed.summary || parsed.summary.trim().length < MIN_SUMMARY_LENGTH) {
    errors.push(`CRITICAL: summary måste vara minst ${MIN_SUMMARY_LENGTH} tecken (nuvarande: ${parsed.summary?.length || 0})`);
  }

  if (!parsed.given || parsed.given.trim().length < MIN_GIVEN_LENGTH) {
    errors.push(`CRITICAL: given måste vara minst ${MIN_GIVEN_LENGTH} tecken (nuvarande: ${parsed.given?.length || 0})`);
  }

  if (!parsed.when || parsed.when.trim().length < MIN_WHEN_LENGTH) {
    errors.push(`CRITICAL: when måste vara minst ${MIN_WHEN_LENGTH} tecken (nuvarande: ${parsed.when?.length || 0})`);
  }

  if (!parsed.then || parsed.then.trim().length < MIN_THEN_LENGTH) {
    errors.push(`CRITICAL: then måste vara minst ${MIN_THEN_LENGTH} tecken (nuvarande: ${parsed.then?.length || 0})`);
  }

  // Validera att subprocessSteps inte är tomma
  if (!parsed.subprocessSteps || parsed.subprocessSteps.length === 0) {
    errors.push('CRITICAL: subprocessSteps måste innehålla minst ett steg');
  }

  // Validera att varje subprocessStep har given/when/then (varning, inte fel)
  for (let i = 0; i < parsed.subprocessSteps.length; i++) {
    const step = parsed.subprocessSteps[i];
    if (!step.given || step.given.trim().length < 10) {
      warnings.push(`subprocessStep[${i}] (${step.callActivityId}) saknar eller har för kort given`);
    }
    if (!step.when || step.when.trim().length < 10) {
      warnings.push(`subprocessStep[${i}] (${step.callActivityId}) saknar eller har för kort when`);
    }
    if (!step.then || step.then.trim().length < 10) {
      warnings.push(`subprocessStep[${i}] (${step.callActivityId}) saknar eller har för kort then`);
    }
  }

  // Validera att action och assertion inte är tomma i bankProjectTestSteps
  for (let i = 0; i < parsed.bankProjectTestSteps.length; i++) {
    const step = parsed.bankProjectTestSteps[i];
    if (!step.action || step.action.trim().length < 10) {
      warnings.push(`bankProjectTestStep[${i}] (${step.bpmnNodeName}) har för kort action`);
    }
    if (!step.assertion || step.assertion.trim().length < 10) {
      warnings.push(`bankProjectTestStep[${i}] (${step.bpmnNodeName}) har för kort assertion`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

