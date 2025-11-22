import type { TestStatusFilter, TestDocTypeFilter } from '@/components/TestReportFilters';
import type { TestResult } from '@/hooks/useTestResults';
import type { NodeType } from '@/data/subprocessRegistry';

export type ExecutedTestWithMeta = TestResult & {
  bpmnFile?: string | null;
  docType?: 'feature-goal' | 'epic' | 'business-rule' | null;
};

export function applyExecutedTestsFilter(
  tests: ExecutedTestWithMeta[],
  status: TestStatusFilter,
  type: TestDocTypeFilter,
  bpmnFile: string,
): ExecutedTestWithMeta[] {
  return tests
    .filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (bpmnFile !== 'all' && t.bpmnFile !== bpmnFile) return false;
      if (type !== 'all' && t.docType !== type) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      const aTime = (a as any).executed_at
        ? new Date((a as any).executed_at).getTime()
        : 0;
      const bTime = (b as any).executed_at
        ? new Date((b as any).executed_at).getTime()
        : 0;
      return bTime - aTime;
    });
}

export function applyPlannedNodesFilter(
  mapping: Record<string, { bpmnFile?: string | null }>,
  nodeTypeById: Record<string, NodeType>,
  type: TestDocTypeFilter,
  bpmnFile: string,
): string[] {
  return Object.entries(mapping)
    .filter(([nodeId, entry]) => {
      const nodeType = nodeTypeById[nodeId];

      if (type === 'feature-goal' && nodeType !== 'CallActivity') {
        return false;
      }
      if (type === 'epic' && nodeType !== 'UserTask' && nodeType !== 'ServiceTask') {
        return false;
      }
      if (type === 'business-rule' && nodeType !== 'BusinessRuleTask') {
        return false;
      }

      if (bpmnFile !== 'all' && entry.bpmnFile !== bpmnFile) {
        return false;
      }

      return true;
    })
    .map(([nodeId]) => nodeId);
}
