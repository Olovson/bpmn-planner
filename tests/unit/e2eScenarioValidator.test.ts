/**
 * Unit tests for E2E scenario validator
 * 
 * Tests the validation functionality including:
 * - Structural validation (required fields, types)
 * - Content validation (minimum length, quality checks)
 */

import { describe, it, expect } from 'vitest';
import { validateE2eScenarioOutput, validateE2eScenarioContent } from '@/lib/e2eScenarioValidator';
import type { E2eScenarioLlmOutput } from '@/lib/e2eScenarioValidator';

describe('E2E Scenario Validator', () => {
  describe('validateE2eScenarioOutput', () => {
    it('should validate correct E2E scenario output', () => {
      const validOutput = JSON.stringify({
        id: 'e2e-1',
        name: 'Test Scenario',
        priority: 'P1',
        type: 'happy-path',
        iteration: 'Test',
        summary: 'This is a valid summary that is long enough to pass validation',
        given: 'This is a valid given condition that is long enough',
        when: 'This is a valid when action that is long enough',
        then: 'This is a valid then assertion that is long enough',
        bankProjectTestSteps: [],
        subprocessSteps: [
          {
            order: 1,
            bpmnFile: 'test.bpmn',
            callActivityId: 'test-id',
            description: 'Test Feature Goal',
            given: 'Test given',
            when: 'Test when',
            then: 'Test then',
          },
        ],
      });

      const result = validateE2eScenarioOutput(validOutput);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('e2e-1');
      expect(result?.name).toBe('Test Scenario');
    });

    it('should reject output with missing required fields', () => {
      const invalidOutput = JSON.stringify({
        id: 'e2e-1',
        name: 'Test Scenario',
        // Missing priority, type, iteration, etc.
      });

      const result = validateE2eScenarioOutput(invalidOutput);
      
      expect(result).toBeNull();
    });

    it('should reject output with invalid priority', () => {
      const invalidOutput = JSON.stringify({
        id: 'e2e-1',
        name: 'Test Scenario',
        priority: 'P3', // Invalid
        type: 'happy-path',
        iteration: 'Test',
        summary: 'Test summary',
        given: 'Test given',
        when: 'Test when',
        then: 'Test then',
        bankProjectTestSteps: [],
        subprocessSteps: [],
      });

      const result = validateE2eScenarioOutput(invalidOutput);
      
      expect(result).toBeNull();
    });

    it('should extract JSON from markdown code blocks', () => {
      const outputWithMarkdown = `
        Here is the E2E scenario:
        \`\`\`json
        {
          "id": "e2e-1",
          "name": "Test Scenario",
          "priority": "P1",
          "type": "happy-path",
          "iteration": "Test",
          "summary": "This is a valid summary that is long enough to pass validation",
          "given": "This is a valid given condition that is long enough",
          "when": "This is a valid when action that is long enough",
          "then": "This is a valid then assertion that is long enough",
          "bankProjectTestSteps": [],
          "subprocessSteps": [
            {
              "order": 1,
              "bpmnFile": "test.bpmn",
              "callActivityId": "test-id",
              "description": "Test Feature Goal",
              "given": "Test given",
              "when": "Test when",
              "then": "Test then"
            }
          ]
        }
        \`\`\`
      `;

      const result = validateE2eScenarioOutput(outputWithMarkdown);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('e2e-1');
    });
  });

  describe('validateE2eScenarioContent', () => {
    it('should validate content with sufficient length', () => {
      const validContent: E2eScenarioLlmOutput = {
        id: 'e2e-1',
        name: 'Test Scenario',
        priority: 'P1',
        type: 'happy-path',
        iteration: 'Test',
        summary: 'This is a valid summary that is long enough to pass validation (at least 50 characters)',
        given: 'This is a valid given condition that is long enough (at least 20 characters)',
        when: 'This is a valid when action that is long enough (at least 20 characters)',
        then: 'This is a valid then assertion that is long enough (at least 20 characters)',
        bankProjectTestSteps: [],
        subprocessSteps: [
          {
            order: 1,
            bpmnFile: 'test.bpmn',
            callActivityId: 'test-id',
            description: 'Test Feature Goal',
            given: 'Test given that is long enough',
            when: 'Test when that is long enough',
            then: 'Test then that is long enough',
          },
        ],
      };

      const result = validateE2eScenarioContent(validContent);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject content with too short summary', () => {
      const invalidContent: E2eScenarioLlmOutput = {
        id: 'e2e-1',
        name: 'Test Scenario',
        priority: 'P1',
        type: 'happy-path',
        iteration: 'Test',
        summary: 'Too short', // Less than 50 characters
        given: 'This is a valid given condition that is long enough',
        when: 'This is a valid when action that is long enough',
        then: 'This is a valid then assertion that is long enough',
        bankProjectTestSteps: [],
        subprocessSteps: [],
      };

      const result = validateE2eScenarioContent(invalidContent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('summary') && e.includes('CRITICAL'))).toBe(true);
    });

    it('should reject content with too short given', () => {
      const invalidContent: E2eScenarioLlmOutput = {
        id: 'e2e-1',
        name: 'Test Scenario',
        priority: 'P1',
        type: 'happy-path',
        iteration: 'Test',
        summary: 'This is a valid summary that is long enough to pass validation',
        given: 'Too short', // Less than 20 characters
        when: 'This is a valid when action that is long enough',
        then: 'This is a valid then assertion that is long enough',
        bankProjectTestSteps: [],
        subprocessSteps: [],
      };

      const result = validateE2eScenarioContent(invalidContent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('given') && e.includes('CRITICAL'))).toBe(true);
    });

    it('should reject content with empty subprocessSteps', () => {
      const invalidContent: E2eScenarioLlmOutput = {
        id: 'e2e-1',
        name: 'Test Scenario',
        priority: 'P1',
        type: 'happy-path',
        iteration: 'Test',
        summary: 'This is a valid summary that is long enough to pass validation',
        given: 'This is a valid given condition that is long enough',
        when: 'This is a valid when action that is long enough',
        then: 'This is a valid then assertion that is long enough',
        bankProjectTestSteps: [],
        subprocessSteps: [], // Empty - should fail
      };

      const result = validateE2eScenarioContent(invalidContent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('subprocessSteps') && e.includes('CRITICAL'))).toBe(true);
    });

    it('should warn about incomplete subprocessSteps', () => {
      const contentWithWarnings: E2eScenarioLlmOutput = {
        id: 'e2e-1',
        name: 'Test Scenario',
        priority: 'P1',
        type: 'happy-path',
        iteration: 'Test',
        summary: 'This is a valid summary that is long enough to pass validation',
        given: 'This is a valid given condition that is long enough',
        when: 'This is a valid when action that is long enough',
        then: 'This is a valid then assertion that is long enough',
        bankProjectTestSteps: [],
        subprocessSteps: [
          {
            order: 1,
            bpmnFile: 'test.bpmn',
            callActivityId: 'test-id',
            description: 'Test Feature Goal',
            // Missing given/when/then - should generate warnings
          },
        ],
      };

      const result = validateE2eScenarioContent(contentWithWarnings);
      
      expect(result.valid).toBe(true); // Should still be valid (warnings, not errors)
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('subprocessStep[0]'))).toBe(true);
    });
  });
});

