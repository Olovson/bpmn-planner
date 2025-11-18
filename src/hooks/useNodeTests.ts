import { useMemo } from 'react';
import { useTestResults, TestResult } from './useTestResults';
import { testMapping, TestInfo } from '@/data/testMapping';

export interface NodeTestCase {
  id: string;
  title: string;
  fileName: string;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  lastRunAt: string;
  scenarioName?: string;
  duration?: number;
  bpmnFile?: string;
  bpmnElementId?: string;
}

export interface NodeInfo {
  name: string;
  type?: string;
  bpmnFile?: string;
  elementId?: string;
}

interface UseNodeTestsParams {
  nodeId?: string;
  bpmnFile?: string;
  elementId?: string;
}

export const useNodeTests = ({ nodeId, bpmnFile, elementId }: UseNodeTestsParams) => {
  const { testResults, isLoading } = useTestResults();

  const { tests, nodeInfo } = useMemo(() => {
    const effectiveNodeId = nodeId || elementId;
    
    if (!effectiveNodeId) {
      return { tests: [], nodeInfo: null };
    }

    // First try to get from database using nodeId or elementId
    const dbTests = testResults.filter(result => result.node_id === effectiveNodeId);
    
    if (dbTests.length > 0) {
      const firstTest = dbTests[0];
      const info: NodeInfo = {
        name: firstTest.node_name || effectiveNodeId,
        type: 'BPMN Node',
        elementId: effectiveNodeId,
        bpmnFile: bpmnFile,
      };

      const testCases: NodeTestCase[] = dbTests.map(test => ({
        id: test.id,
        title: test.node_name || test.test_file,
        fileName: test.test_file.replace('tests/', ''),
        status: test.status,
        lastRunAt: test.last_run,
        duration: test.duration || undefined,
        bpmnElementId: effectiveNodeId,
        bpmnFile: bpmnFile,
      }));

      return { tests: testCases, nodeInfo: info };
    }

    // Fallback to mock data from testMapping
    const mockTest = testMapping[effectiveNodeId];
    if (!mockTest) {
      return { tests: [], nodeInfo: null };
    }

    const info: NodeInfo = {
      name: mockTest.nodeName,
      type: 'BPMN Node',
      elementId: effectiveNodeId,
      bpmnFile: bpmnFile,
    };

    // Convert scenarios to test cases
    const testCases: NodeTestCase[] = mockTest.scenarios.map(scenario => ({
      id: scenario.id,
      title: scenario.name,
      fileName: mockTest.testFile.replace('tests/', ''),
      status: scenario.status,
      lastRunAt: mockTest.lastRun || new Date().toISOString(),
      scenarioName: scenario.name,
      duration: scenario.duration,
      bpmnElementId: effectiveNodeId,
      bpmnFile: bpmnFile,
    }));

    return { tests: testCases, nodeInfo: info };
  }, [testResults, nodeId, bpmnFile, elementId]);

  return {
    tests,
    nodeInfo,
    isLoading,
    error: null,
  };
};
