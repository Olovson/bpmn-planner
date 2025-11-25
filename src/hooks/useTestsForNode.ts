import { useMemo } from 'react';
import { useTestResults, TestResult, TestScenario } from './useTestResults';
// Removed testMapping import - no longer using fallback logic

export interface TestForNode {
  id: string;
  title: string;
  fileName: string;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  lastRun: string;
  duration?: number;
  scenarios?: TestScenario[];
  nodeId: string | null;
  nodeName: string | null;
}

interface UseTestsForNodeParams {
  bpmnFile?: string | null;
  bpmnElementId?: string | null;
  nodeSlug?: string | null;
}

export const useTestsForNode = ({ bpmnFile, bpmnElementId, nodeSlug }: UseTestsForNodeParams) => {
  const { testResults, isLoading } = useTestResults();

  const normalizedId = (bpmnElementId || '').toLowerCase();
  // Removed fallbackKey - no longer using mock mapping fallback

  const dbTests = useMemo<TestForNode[]>(() => {
    if (!bpmnElementId) return [];
    const matching = testResults.filter(r => (r.node_id || '').toLowerCase() === normalizedId);

    const scenarioItems: TestForNode[] = [];
    matching.forEach((r) => {
      if (r.scenarios && r.scenarios.length > 0) {
        r.scenarios.forEach((sc) => {
          scenarioItems.push({
            id: sc.id || `${r.id}-${sc.name}`,
            title: sc.name,
            fileName: r.test_file.replace('tests/', ''),
            status: sc.status,
            lastRun: r.last_run,
            duration: sc.duration,
            scenarios: [sc],
            nodeId: r.node_id,
            nodeName: r.node_name,
          });
        });
      } else {
        scenarioItems.push({
          id: r.id,
          title: r.node_name || r.test_file,
          fileName: r.test_file.replace('tests/', ''),
          status: r.status,
          lastRun: r.last_run,
          duration: r.duration || undefined,
          scenarios: r.scenarios || undefined,
          nodeId: r.node_id,
          nodeName: r.node_name,
        });
      }
    });

    return scenarioItems;
  }, [testResults, bpmnElementId, normalizedId]);


  // Removed fallback to mock mapping - only use data from database
  // This makes it clear when tests are missing and need to be generated
  const tests = dbTests;

  // Calculate stats
  const stats = useMemo(() => {
    const passed = tests.filter(t => t.status === 'passing').length;
    const failed = tests.filter(t => t.status === 'failing').length;
    const pending = tests.filter(t => t.status === 'pending').length;
    const skipped = tests.filter(t => t.status === 'skipped').length;

    return {
      total: tests.length,
      passed,
      failed,
      pending,
      skipped,
    };
  }, [tests]);

  return {
    tests,
    stats,
    isLoading,
  };
};
