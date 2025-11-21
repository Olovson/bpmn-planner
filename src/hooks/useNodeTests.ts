import { useMemo } from 'react';
import { useTestResults } from './useTestResults';
import { testMapping, TestInfo, TestScenario as TemplateScenario } from '@/data/testMapping';

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

  const { tests, nodeInfo, plannedScenarios } = useMemo(() => {
    const effectiveNodeId = nodeId || elementId;
    
    if (!effectiveNodeId) {
      return { tests: [] as NodeTestCase[], nodeInfo: null as NodeInfo | null, plannedScenarios: [] as TemplateScenario[] };
    }

    // First try to get from database using nodeId or elementId
    const dbTests = testResults.filter(result => result.node_id === effectiveNodeId);
    const template = testMapping[effectiveNodeId];
    
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

      return { tests: testCases, nodeInfo: info, plannedScenarios: template?.scenarios ?? [] };
    }

    if (template) {
      const info: NodeInfo = {
        name: template.nodeName,
        type: 'BPMN Node',
        elementId: effectiveNodeId,
        bpmnFile: bpmnFile,
      };
      return { tests: [] as NodeTestCase[], nodeInfo: info, plannedScenarios: template.scenarios };
    }

    return { tests: [] as NodeTestCase[], nodeInfo: null as NodeInfo | null, plannedScenarios: [] as TemplateScenario[] };
  }, [testResults, nodeId, bpmnFile, elementId]);

  return {
    tests,
    nodeInfo,
    plannedScenarios,
    isLoading,
    error: null,
  };
};
