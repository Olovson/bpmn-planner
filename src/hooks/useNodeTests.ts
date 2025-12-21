import { useMemo } from 'react';
import { useTestResults } from './useTestResults';
import { useNodeTestLinks, type NodeTestLinkVariant } from './useNodeTestLinks';
import { useNodePlannedScenarios, type ProviderScenarioSet } from './useNodePlannedScenarios';
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
   scriptProvider?: 'chatgpt' | 'ollama' | 'claude' | null;
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

type NodeTestVariant = 'llm' | 'unknown';

// Alias-mappning mellan BPMN-element-id och testMapping-nycklar.
// Används när nodens id inte matchar direkt mot testMapping men vi vet
// vilken testmall som hör till noden.
const TEST_TEMPLATE_ALIASES: Record<string, string> = {
  // Appeal-processen: nod-id "screen-appeal" använder scenarion från
  // "appeal-handling-manual" i testMapping.
  'screen-appeal': 'appeal-handling-manual',
};

export const useNodeTests = ({ nodeId, bpmnFile, elementId }: UseNodeTestsParams) => {
  const { testResults, isLoading: resultsLoading } = useTestResults();
  const { data: linkEntries = [], isLoading: linksLoading } = useNodeTestLinks();
  const { variants: plannedScenarioVariants, isLoading: plannedLoading } =
    useNodePlannedScenarios({ bpmnFile, elementId });

  const { tests, nodeInfo, plannedScenariosByProvider } = useMemo(() => {
    const effectiveNodeId = nodeId || elementId;
    
    if (!effectiveNodeId) {
      return {
        tests: [] as NodeTestCase[],
        nodeInfo: null as NodeInfo | null,
        plannedScenariosByProvider: [] as ProviderScenarioSet[],
      };
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

    // Försök först hitta direkt mall på nod-id, annars via alias.
    const templateKey =
      testMapping[effectiveNodeId]
        ? effectiveNodeId
        : TEST_TEMPLATE_ALIASES[effectiveNodeId] ?? null;
    const template = templateKey ? testMapping[templateKey] : undefined;

    // Bygg plannedScenariosByProvider med fallback:
    const plannedSets: ProviderScenarioSet[] = [];

    // 1) Lägg in alla varianter som finns i node_planned_scenarios
    for (const v of plannedScenarioVariants) {
      plannedSets.push(v);
    }

    // Note: local-fallback provider is no longer supported
    
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
        if (test.script_provider === 'chatgpt' || test.script_provider === 'ollama' || test.script_provider === 'claude') {
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
          scriptProvider: (test.script_provider as 'chatgpt' | 'ollama' | 'claude' | null) ?? null,
        };
      });

      return {
        tests: testCases,
        nodeInfo: info,
        plannedScenariosByProvider: plannedSets,
      };
    }

    if (template) {
      const info: NodeInfo = {
        name: template.nodeName,
        type: 'BPMN Node',
        elementId: effectiveNodeId,
        bpmnFile: bpmnFile,
      };
      return {
        tests: [] as NodeTestCase[],
        nodeInfo: info,
        plannedScenariosByProvider: plannedSets,
      };
    }

    return {
      tests: [] as NodeTestCase[],
      nodeInfo: null as NodeInfo | null,
      plannedScenariosByProvider: plannedSets,
    };
  }, [testResults, linkEntries, plannedScenarioVariants, nodeId, bpmnFile, elementId]);

  return {
    tests,
    nodeInfo,
    plannedScenariosByProvider,
    isLoading: resultsLoading || linksLoading || plannedLoading,
    error: null,
  };
};
