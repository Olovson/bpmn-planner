import type { TestScenarioLlmOutput } from './testScenarioLlmTypes';
import type { TestScenario } from '@/data/testMapping';

/**
 * Validerar Claude-output för test scenarios.
 */
export function validateTestScenarioOutput(
  output: string
): TestScenarioLlmOutput | null {
  try {
    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch (error) {
      console.warn('[testScenarioValidator] Failed to parse JSON:', error);
      return null;
    }

    // Validera struktur
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Validera scenarios array
    if (!Array.isArray(obj.scenarios)) {
      return null;
    }

    // Validera varje scenario
    const scenarios = obj.scenarios.map((s: unknown) => {
      if (!s || typeof s !== 'object') {
        return null;
      }

      const scenario = s as Record<string, unknown>;

      // Validera required fields
      if (
        !scenario.id ||
        !scenario.name ||
        !scenario.description ||
        !scenario.category ||
        !scenario.priority ||
        !Array.isArray(scenario.steps) ||
        !Array.isArray(scenario.acceptanceCriteria)
      ) {
        return null;
      }

      // Validera category
      if (!['happy-path', 'error-case', 'edge-case'].includes(scenario.category as string)) {
        return null;
      }

      // Validera priority
      if (!['P0', 'P1', 'P2'].includes(scenario.priority as string)) {
        return null;
      }

      // Validera steps
      const steps = scenario.steps.map((step: unknown) => {
        if (!step || typeof step !== 'object') {
          return null;
        }

        const stepObj = step as Record<string, unknown>;
        if (
          typeof stepObj.order !== 'number' ||
          typeof stepObj.action !== 'string' ||
          typeof stepObj.expectedResult !== 'string'
        ) {
          return null;
        }

        return {
          order: stepObj.order,
          action: stepObj.action,
          expectedResult: stepObj.expectedResult,
        };
      }).filter(Boolean);

      if (steps.length === 0) {
        return null;
      }

      return {
        id: String(scenario.id),
        name: String(scenario.name),
        description: String(scenario.description),
        category: scenario.category as 'happy-path' | 'error-case' | 'edge-case',
        priority: scenario.priority as 'P0' | 'P1' | 'P2',
        steps,
        acceptanceCriteria: (scenario.acceptanceCriteria as string[]).map(String),
        prerequisites: scenario.prerequisites ? (scenario.prerequisites as string[]).map(String) : undefined,
        edgeCases: scenario.edgeCases ? (scenario.edgeCases as string[]).map(String) : undefined,
      };
    }).filter(Boolean);

    if (scenarios.length === 0) {
      return null;
    }

    return {
      scenarios: scenarios as TestScenarioLlmOutput['scenarios'],
    };
  } catch (error) {
    console.warn('[testScenarioValidator] Validation error:', error);
    return null;
  }
}

/**
 * Konverterar Claude-output till TestScenario-format.
 */
export function convertLlmScenariosToTestScenarios(
  llmOutput: TestScenarioLlmOutput,
  bpmnFile: string,
  bpmnElementId: string
): TestScenario[] {
  return llmOutput.scenarios.map(scenario => {
    // Konvertera steps till given/when/then-format
    const whenActions = scenario.steps.map(step => step.action);
    const thenResults = scenario.steps.map(step => step.expectedResult);
    
    // Bygg given från prerequisites om de finns
    const givenParts: string[] = [];
    if (scenario.prerequisites && scenario.prerequisites.length > 0) {
      givenParts.push(...scenario.prerequisites);
    }
    const given = givenParts.length > 0 ? givenParts.join('\n') : undefined;
    
    // Bygg when från alla actions
    const when = whenActions.join('\n');
    
    // Bygg then från alla expected results
    const then = thenResults.join('\n');
    
    // Bygg description för bakåtkompatibilitet
    const descriptionParts: string[] = [];
    if (given) descriptionParts.push(`Given: ${given}`);
    descriptionParts.push(`When: ${when}`);
    descriptionParts.push(`Then: ${then}`);
    const description = descriptionParts.join('\n\n');
    
    return {
      id: scenario.id,
      name: scenario.name,
      description,
      status: 'pending',
      category: scenario.category,
      riskLevel: scenario.priority,
      assertionType: 'functional',
      given,
      when,
      then,
    };
  });
}

