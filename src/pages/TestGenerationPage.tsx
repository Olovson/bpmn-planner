import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { extractUserStoriesFromAllDocs } from '@/lib/testGeneration/userStoryExtractor';
import { buildTestScenarioContext } from '@/lib/testGeneration/testScenarioContextBuilder';
import { generateTestScenariosWithLlm } from '@/lib/testGeneration/testScenarioLlmGenerator';
import { validateTestScenarioOutput, convertLlmScenariosToTestScenarios } from '@/lib/testGeneration/testScenarioValidator';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { supabase } from '@/integrations/supabase/client';
import type { PlannedScenarioRow } from '@/lib/plannedScenariosHelper';
import { isLlmEnabled } from '@/lib/llmClient';

interface GenerationResult {
  success: boolean;
  count: number;
  message?: string;
  error?: string;
}

const TestGenerationPage = () => {
  const { nodes: allBpmnNodes } = useAllBpmnNodes();
  const queryClient = useQueryClient();
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isLlmAvailable, setIsLlmAvailable] = useState(isLlmEnabled());

  const generateTestScenariosMutation = useMutation({
    mutationFn: async () => {
      if (!isLlmEnabled()) {
        throw new Error('Claude API är inte aktiverad. Kontrollera VITE_USE_LLM och VITE_ANTHROPIC_API_KEY.');
      }

      const nodesToProcess = allBpmnNodes
        .filter(node =>
          node.type === 'userTask' ||
          node.type === 'serviceTask' ||
          node.type === 'businessRuleTask' ||
          node.type === 'callActivity'
        );

      if (nodesToProcess.length === 0) {
        return { success: true, count: 0, message: 'Inga noder att bearbeta.' };
      }

      const bpmnFiles = Array.from(new Set(nodesToProcess.map(node => node.bpmnFile)));
      let totalScenarios = 0;
      const errors: string[] = [];

      // Process each node
      for (const node of nodesToProcess) {
        try {
          // Step 1: Extract user stories from documentation
          const userStories = await extractUserStoriesFromAllDocs([{
            bpmnFile: node.bpmnFile,
            bpmnElementId: node.bpmnElementId,
            docType: node.type === 'callActivity' ? 'feature-goal' as const : 'epic' as const,
          }]);

          // Step 2: Build BPMN process graph
          const processGraph = await buildBpmnProcessGraph(node.bpmnFile, bpmnFiles);

          // Step 3: Build context for Claude
          const context = buildTestScenarioContext(
            userStories,
            {
              summary: undefined, // Could be extracted from documentation if needed
              flowSteps: undefined, // Could be extracted from documentation if needed
              dependencies: undefined, // Could be extracted from documentation if needed
            },
            processGraph,
            node.bpmnFile,
            node.bpmnElementId,
            node.type as 'userTask' | 'serviceTask' | 'businessRuleTask' | 'callActivity',
            node.name || node.bpmnElementId
          );

          // Step 4: Generate with Claude
          const llmResult = await generateTestScenariosWithLlm(context);

          if (!llmResult || llmResult.scenarios.length === 0) {
            errors.push(`${node.bpmnFile}::${node.bpmnElementId}: Inga scenarios genererade`);
            continue;
          }

          // Step 5: Convert and save
          const testScenarios = convertLlmScenariosToTestScenarios(
            { scenarios: llmResult.scenarios },
            node.bpmnFile,
            node.bpmnElementId
          );

          // Save to database
          const row: PlannedScenarioRow = {
            bpmn_file: node.bpmnFile,
            bpmn_element_id: node.bpmnElementId,
            provider: 'claude',
            origin: 'llm-doc',
            scenarios: testScenarios.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description,
              status: s.status,
              category: s.category,
              riskLevel: s.riskLevel,
              assertionType: s.assertionType,
              steps: s.steps,
              expectedResult: s.expectedResult,
              acceptanceCriteria: s.acceptanceCriteria,
            })),
          };

          const { error: saveError } = await supabase
            .from('node_planned_scenarios')
            .upsert([row], {
              onConflict: 'bpmn_file,bpmn_element_id,provider,origin',
            });

          if (saveError) {
            errors.push(`${node.bpmnFile}::${node.bpmnElementId}: ${saveError.message}`);
            continue;
          }

          totalScenarios += testScenarios.length;
        } catch (error) {
          errors.push(`${node.bpmnFile}::${node.bpmnElementId}: ${error instanceof Error ? error.message : 'Okänt fel'}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          count: totalScenarios,
          error: `Fel i ${errors.length} nod(er): ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? '...' : ''}`,
        };
      }

      return {
        success: true,
        count: totalScenarios,
        message: `${totalScenarios} scenarios genererade för ${nodesToProcess.length} noder.`,
      };
    },
    onSuccess: (result) => {
      setGenerationResult(result);
      queryClient.invalidateQueries({ queryKey: ['global-planned-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['node-planned-scenarios'] });
    },
    onError: (error) => {
      setGenerationResult({
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Okänt fel',
      });
    },
  });

  return (
    <div className="flex h-screen flex-col">
      <AppHeaderWithTabs />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Testfall-generering med Claude</h1>
          </div>
          
          <p className="text-muted-foreground">
            Generera testfall från befintlig dokumentation och BPMN-processer med Claude.
            Detta är helt separerat från dokumentationsgenerering och påverkar inte befintlig dokumentation.
          </p>

          {!isLlmAvailable && (
            <Alert className="border-yellow-500 bg-yellow-50 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Claude API inte aktiverad</AlertTitle>
              <AlertDescription>
                Claude API är inte aktiverad. Kontrollera VITE_USE_LLM och VITE_ANTHROPIC_API_KEY i din .env-fil.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Scenario Generation */}
          <Card>
            <CardHeader>
              <CardTitle>Generera Testfall med Claude</CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyserar user stories från befintlig Epic- och Feature Goal-dokumentation
                kombinerat med BPMN-processflöde för att generera högkvalitativa testscenarios.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => generateTestScenariosMutation.mutate()}
                disabled={generateTestScenariosMutation.isPending || !isLlmAvailable}
                className="w-full"
              >
                {generateTestScenariosMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Genererar med Claude...
                  </>
                ) : (
                  'Generera Testfall med Claude'
                )}
              </Button>
              {generationResult && (
                <div className="mt-4">
                  {generationResult.success ? (
                    <Alert className="border-green-500 bg-green-50 text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Generering lyckades!</AlertTitle>
                      <AlertDescription>
                        {generationResult.count} testscenarios genererade.
                        {generationResult.message && ` ${generationResult.message}`}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-red-500 bg-red-50 text-red-800">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Generering misslyckades!</AlertTitle>
                      <AlertDescription>
                        {generationResult.error || 'Ett okänt fel inträffade.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Kvalitet:</strong> Claude analyserar semantik och genererar konkreta steg baserat på dokumentation och BPMN-processflöde.
              </p>
              <p>
                <strong>Tid:</strong> Generering kan ta flera minuter eftersom Claude API-anrop görs för varje nod.
              </p>
              <p>
                <strong>Kostnad:</strong> Varje nod kräver ett Claude API-anrop. Kostnaden beror på antal noder.
              </p>
              <p>
                <strong>Fallback:</strong> Om Claude misslyckas för en nod, hoppas den över och genereringen fortsätter för övriga noder.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestGenerationPage;
