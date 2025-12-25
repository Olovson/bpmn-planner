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

/**
 * Validerar E2E-scenario output från LLM.
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

    return parsed as E2eScenarioLlmOutput;
  } catch (error) {
    console.error('[e2eScenarioValidator] Validation error:', error);
    return null;
  }
}

