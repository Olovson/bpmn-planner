import { describe, it, expect } from 'vitest';
import type { ExecutedTestWithMeta } from '@/lib/testReportFiltering';
import {
  applyExecutedTestsFilter,
  applyPlannedNodesFilter,
} from '@/lib/testReportFiltering';
import type { NodeType } from '@/data/subprocessRegistry';

describe('applyExecutedTestsFilter', () => {
  const base: ExecutedTestWithMeta = {
    id: '1',
    test_file: 'tests/a.spec.ts',
    node_id: 'N1',
    node_name: 'Node 1',
    status: 'passing',
    test_count: 1,
    duration: null,
    last_run: '',
    scenarios: null,
    error_message: null,
    github_run_url: null,
    created_at: '',
    updated_at: '',
    bpmnFile: 'mortgage.bpmn',
    docType: 'feature-goal',
  };

  const tests: ExecutedTestWithMeta[] = [
    base,
    {
      ...base,
      id: '2',
      status: 'failing',
      bpmnFile: 'mortgage.bpmn',
      docType: 'epic',
    },
    {
      ...base,
      id: '3',
      status: 'pending',
      bpmnFile: 'other.bpmn',
      docType: 'business-rule',
    },
  ];

  it('filters by status', () => {
    const result = applyExecutedTestsFilter(tests, 'passing', 'all', 'all');
    expect(result.map((t) => t.id)).toEqual(['1']);
  });

  it('filters by type', () => {
    const result = applyExecutedTestsFilter(tests, 'all', 'epic', 'all');
    expect(result.map((t) => t.id)).toEqual(['2']);
  });

  it('filters by BPMN file', () => {
    const result = applyExecutedTestsFilter(tests, 'all', 'all', 'other.bpmn');
    expect(result.map((t) => t.id)).toEqual(['3']);
  });

  it('combines status, type and BPMN filters (AND)', () => {
    const result = applyExecutedTestsFilter(tests, 'failing', 'epic', 'mortgage.bpmn');
    expect(result.map((t) => t.id)).toEqual(['2']);
  });
});

describe('applyPlannedNodesFilter', () => {
  const mapping: Record<string, { bpmnFile?: string | null }> = {
    N1: { bpmnFile: 'mortgage.bpmn' },
    N2: { bpmnFile: 'mortgage.bpmn' },
    N3: { bpmnFile: 'other.bpmn' },
  };

  const nodeTypeById: Record<string, NodeType> = {
    N1: 'CallActivity' as NodeType,
    N2: 'UserTask' as NodeType,
    N3: 'BusinessRuleTask' as NodeType,
  };

  it('returns all node ids when filters are "all"', () => {
    const ids = applyPlannedNodesFilter(mapping, nodeTypeById, 'all', 'all');
    expect(ids).toContain('N1');
    expect(ids).toContain('N2');
    expect(ids).toContain('N3');
  });

  it('filters by type feature-goal', () => {
    const ids = applyPlannedNodesFilter(mapping, nodeTypeById, 'feature-goal', 'all');
    expect(ids).toEqual(['N1']);
  });

  it('filters by type epic', () => {
    const ids = applyPlannedNodesFilter(mapping, nodeTypeById, 'epic', 'all');
    expect(ids).toEqual(['N2']);
  });

  it('filters by type business-rule', () => {
    const ids = applyPlannedNodesFilter(mapping, nodeTypeById, 'business-rule', 'all');
    expect(ids).toEqual(['N3']);
  });
});
