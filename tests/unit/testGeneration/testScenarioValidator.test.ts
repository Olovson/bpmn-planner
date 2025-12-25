import { describe, it, expect } from 'vitest';
import { validateTestScenarioOutput, convertLlmScenariosToTestScenarios } from '@/lib/testGeneration/testScenarioValidator';
import type { TestScenarioLlmOutput } from '@/lib/testGeneration/testScenarioLlmTypes';

describe('testScenarioValidator', () => {
  it('should validate correct LLM output', () => {
    const validOutput = JSON.stringify({
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Happy Path: Skapa ansökan',
          description: 'Kunden skapar ansökan',
          category: 'happy-path',
          priority: 'P1',
          steps: [
            {
              order: 1,
              action: 'Kunden öppnar formuläret',
              expectedResult: 'Formuläret visas',
            },
          ],
          acceptanceCriteria: ['Systemet validerar fält'],
        },
      ],
    });

    const result = validateTestScenarioOutput(validOutput);

    expect(result).toBeDefined();
    expect(result?.scenarios).toHaveLength(1);
    expect(result?.scenarios[0].id).toBe('scenario-1');
    expect(result?.scenarios[0].category).toBe('happy-path');
    expect(result?.scenarios[0].priority).toBe('P1');
  });

  it('should reject invalid category', () => {
    const invalidOutput = JSON.stringify({
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Test',
          description: 'Test',
          category: 'invalid-category', // Invalid
          priority: 'P1',
          steps: [],
          acceptanceCriteria: [],
        },
      ],
    });

    const result = validateTestScenarioOutput(invalidOutput);

    expect(result).toBeNull();
  });

  it('should reject invalid priority', () => {
    const invalidOutput = JSON.stringify({
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Test',
          description: 'Test',
          category: 'happy-path',
          priority: 'P99', // Invalid
          steps: [],
          acceptanceCriteria: [],
        },
      ],
    });

    const result = validateTestScenarioOutput(invalidOutput);

    expect(result).toBeNull();
  });

  it('should reject missing required fields', () => {
    const invalidOutput = JSON.stringify({
      scenarios: [
        {
          id: 'scenario-1',
          // Missing name, description, etc.
        },
      ],
    });

    const result = validateTestScenarioOutput(invalidOutput);

    expect(result).toBeNull();
  });

  it('should handle invalid JSON gracefully', () => {
    const invalidJson = 'Not valid JSON';

    const result = validateTestScenarioOutput(invalidJson);

    expect(result).toBeNull();
  });

  it('should convert LLM scenarios to TestScenario format', () => {
    const llmOutput: TestScenarioLlmOutput = {
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Happy Path: Skapa ansökan',
          description: 'Kunden skapar ansökan',
          category: 'happy-path',
          priority: 'P1',
          steps: [
            {
              order: 1,
              action: 'Kunden öppnar formuläret',
              expectedResult: 'Formuläret visas',
            },
          ],
          acceptanceCriteria: ['Systemet validerar fält'],
        },
      ],
    };

    const result = convertLlmScenariosToTestScenarios(
      llmOutput,
      'mortgage-se-application.bpmn',
      'application'
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('scenario-1');
    expect(result[0].name).toBe('Happy Path: Skapa ansökan');
    expect(result[0].description).toBe('Kunden skapar ansökan');
    expect(result[0].status).toBe('pending');
    expect(result[0].category).toBe('happy-path');
    expect(result[0].riskLevel).toBe('P1');
    expect(result[0].assertionType).toBe('functional');
  });
});



