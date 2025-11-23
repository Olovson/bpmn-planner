import { useMemo } from 'react';
import { useTestResults } from './useTestResults';
import { useNodeTestLinks, type NodeTestLinkVariant } from './useNodeTestLinks';
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
  variant?: NodeTestVariant;
   scriptProvider?: 'local-fallback' | 'chatgpt' | 'ollama' | null;
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

type NodeTestVariant = 'local-fallback' | 'llm' | 'unknown';

export const useNodeTests = ({ nodeId, bpmnFile, elementId }: UseNodeTestsParams) => {
  const { testResults, isLoading: resultsLoading } = useTestResults();
  const { data: linkEntries = [], isLoading: linksLoading } = useNodeTestLinks();

  const { tests, nodeInfo, plannedScenarios } = useMemo(() => {
    const effectiveNodeId = nodeId || elementId;
    
    if (!effectiveNodeId) {
      return { tests: [] as NodeTestCase[], nodeInfo: null as NodeInfo | null, plannedScenarios: [] as TemplateScenario[] };
    }

    // Försök hitta testlänkar/varianter för aktuell nod
    let variants: NodeTestLinkVariant[] = [];
    if (bpmnFile && elementId) {
      const entry = linkEntries.find(
        (e) => e.bpmnFile === bpmnFile && e.elementId === elementId,
      );
      if (entry) {
        variants = entry.variants;
      }
    }

    const variantByTestFile: Record<string, NodeTestVariant> = {};
    for (const v of variants) {
      const variant: NodeTestVariant =
        v.mode === 'slow' ? 'llm' : 'local-fallback';
      variantByTestFile[v.testFilePath] = variant;
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

      const testCases: NodeTestCase[] = dbTests.map(test => {
        const fileName = test.test_file.replace('tests/', '');
        let variant: NodeTestVariant = 'unknown';

        // Försök först använda script_provider/script_mode från test_results
        if (test.script_provider === 'local-fallback') {
          variant = 'local-fallback';
        } else if (test.script_provider === 'chatgpt' || test.script_provider === 'ollama') {
          variant = 'llm';
        } else {
          // Fallback till node_test_links.mode -> variantByTestFile
          variant = variantByTestFile[test.test_file] ?? 'unknown';
        }
        return {
          id: test.id,
          title: test.node_name || test.test_file,
          fileName,
          status: test.status,
          lastRunAt: test.last_run,
          duration: test.duration || undefined,
          bpmnElementId: effectiveNodeId,
          bpmnFile: bpmnFile,
          variant,
          scriptProvider: (test.script_provider as 'local-fallback' | 'chatgpt' | 'ollama' | null) ?? null,
        };
      });

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
  }, [testResults, linkEntries, nodeId, bpmnFile, elementId]);

  return {
    tests,
    nodeInfo,
    plannedScenarios,
    isLoading: resultsLoading || linksLoading,
    error: null,
  };
};
