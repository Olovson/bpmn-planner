import { describe, it, expect } from 'vitest';
import { matchCallActivityToProcesses } from './SubprocessMatcher';
import type { ProcessDefinition } from './types';

const baseProcess = (overrides: Partial<ProcessDefinition>): ProcessDefinition => ({
  id: 'Process_Default',
  name: 'Default Process',
  fileName: 'default.bpmn',
  storagePath: 'bpmn/default.bpmn',
  callActivities: [],
  tasks: [],
  ...overrides,
});

describe('matchCallActivityToProcesses', () => {
  it('matches via calledElement → process ID', () => {
    const processes = [
      baseProcess({
        id: 'Process_A',
        name: 'Sub Flow',
        fileName: 'sub-flow.bpmn',
      }),
    ];

    const result = matchCallActivityToProcesses(
      {
        id: 'Call_1',
        name: 'Invoke Sub Flow',
        calledElement: 'Process_A',
      },
      processes,
    );

    expect(result.matchStatus).toBe('matched');
    expect(result.matchedProcessId).toBe('Process_A');
    expect(result.confidence).toBeCloseTo(1, 5);
  });

  it('matches via calledElement → process name when IDs differ', () => {
    const processes = [
      baseProcess({
        id: 'Process_B',
        name: 'Loan Flow',
        fileName: 'loan-flow.bpmn',
      }),
    ];

    const result = matchCallActivityToProcesses(
      {
        id: 'Call_2',
        name: 'Loan Handling',
        calledElement: 'Loan Flow',
      },
      processes,
    );

    expect(result.matchStatus).toBe('matched');
    expect(result.matchedProcessId).toBe('Process_B');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('matches via Call Activity name when IDs are missing', () => {
    const processes = [
      baseProcess({
        id: 'Process_C',
        name: 'Evaluate Risk',
        fileName: 'evaluate-risk.bpmn',
      }),
    ];

    const result = matchCallActivityToProcesses(
      {
        id: 'Call_3',
        name: 'Evaluate Risk',
      },
      processes,
    );

    expect(result.matchStatus).toBe('matched');
    expect(result.matchedProcessId).toBe('Process_C');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('uses fuzzy scoring when only similar names exist', () => {
    const processes = [
      baseProcess({
        id: 'Process_D',
        name: 'Fetch Personal Information',
        fileName: 'fetch-personal-information.bpmn',
      }),
    ];

    const result = matchCallActivityToProcesses(
      {
        id: 'Call_4',
        name: 'Fetch Personal Data',
      },
      processes,
      { fuzzyThreshold: 0.6 },
    );

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchStatus).toBe('lowConfidence');
    expect(result.matchedProcessId).toBe('Process_D');
  });

  it('matches call activities to file names with prefixes (mortgage-se-)', () => {
    const processes = [
      baseProcess({
        id: 'Process_Prefix',
        name: 'Internal data gathering',
        fileName: 'mortgage-se-internal-data-gathering.bpmn',
      }),
    ];

    const result = matchCallActivityToProcesses(
      {
        id: 'Call_Internal',
        name: 'Internal data gathering',
      },
      processes,
    );

    expect(result.matchStatus).toBe('matched');
    expect(result.matchedProcessId).toBe('Process_Prefix');
  });

  it('marks ambiguous when multiple candidates tie', () => {
    const processes = [
      baseProcess({
        id: 'Process_E1',
        name: 'Review Application',
        fileName: 'review-application-a.bpmn',
      }),
      baseProcess({
        id: 'Process_E2',
        name: 'Review Application',
        fileName: 'review-application-b.bpmn',
      }),
    ];

    const result = matchCallActivityToProcesses(
      {
        id: 'Call_5',
        name: 'Review Application',
      },
      processes,
    );

    expect(result.matchStatus).toBe('ambiguous');
    expect(result.candidates).toHaveLength(2);
    expect(result.diagnostics[0]?.code).toBe('AMBIGUOUS_MATCH');
  });

  it('returns unresolved when no candidates match', () => {
    const processes = [
      baseProcess({
        id: 'Process_F',
        name: 'Generate Offer',
        fileName: 'generate-offer.bpmn',
      }),
    ];

    const result = matchCallActivityToProcesses(
      {
        id: 'Call_6',
        name: 'Unknown Node',
      },
      processes,
    );

    expect(result.matchStatus).toBe('unresolved');
    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics[0]?.code).toBe('NO_MATCH');
  });
});
