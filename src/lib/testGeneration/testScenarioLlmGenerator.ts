import { generateChatCompletion, isLlmEnabled } from '@/lib/llmClient';
import { getTestScenarioPrompt } from '@/lib/promptLoader';
import { buildTestScenarioJsonSchema } from './testScenarioJsonSchema';
import { validateTestScenarioOutput } from './testScenarioValidator';
import type { TestScenarioContext, TestScenarioLlmResult, TestScenarioLlmOutput } from './testScenarioLlmTypes';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { getDefaultLlmProvider } from '@/lib/llmClients';
import { resolveLlmProvider } from '@/lib/llmProviderResolver';
import { generateWithFallback } from '@/lib/llmFallback';
import { logLlmEvent } from '@/lib/llmLogging';
import { saveLlmDebugArtifact } from '@/lib/llmDebugStorage';

/**
 * Genererar test scenarios med Claude baserat på kontext.
 * 
 * @param context - Kontext med user stories, dokumentation och BPMN-processflöde
 * @param llmProvider - LLM provider att använda (default: från konfiguration)
 * @param allowFallback - Om fallback ska tillåtas
 * @returns Genererade test scenarios eller null om LLM är inaktiverat
 */
export async function generateTestScenariosWithLlm(
  context: TestScenarioContext,
  llmProvider?: LlmProvider,
  allowFallback: boolean = true,
  abortSignal?: AbortSignal
): Promise<TestScenarioLlmResult | null> {
  if (!isLlmEnabled()) {
    return null;
  }

  // Hämta prompt
  const prompt = getTestScenarioPrompt();
  
  // Resolvera provider
  const globalDefault = getDefaultLlmProvider();
  const resolution = resolveLlmProvider({
    userChoice: llmProvider,
    globalDefault,
    allowFallback,
  });

  // Bygg input för Claude
  const llmInput = {
    nodeContext: context.nodeContext,
    documentation: context.documentation,
    bpmnProcessFlow: context.bpmnProcessFlow,
  };

  const userPrompt = JSON.stringify(llmInput, null, 2);

  // Håller senaste validerade output
  let lastValidOutput: TestScenarioLlmOutput | null = null;

  const startTime = Date.now();

  try {
    // Anropa Claude med structured output
    const result = await generateWithFallback(
      {
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userPrompt },
        ],
        provider: resolution.provider,
        schema: buildTestScenarioJsonSchema(),
        temperature: 0.3, // Lägre temperatur för mer konsistent output
      },
      resolution.fallbackProvider,
      abortSignal
    );

    if (!result) {
      return null;
    }

    const latencyMs = Date.now() - startTime;

    // Validera output
    const validated = validateTestScenarioOutput(result.text);
    if (validated) {
      lastValidOutput = validated;
    }

    // Logga event
    await logLlmEvent({
      event: 'test-scenario-generation',
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      latencyMs,
      nodeId: context.nodeContext.elementId,
      bpmnFile: context.nodeContext.bpmnFile,
    });

    // Spara debug artifact
    await saveLlmDebugArtifact({
      type: 'test-scenario',
      nodeId: context.nodeContext.elementId,
      bpmnFile: context.nodeContext.bpmnFile,
      prompt,
      input: userPrompt,
      output: result.text,
      provider: result.provider,
    });

    return {
      scenarios: lastValidOutput?.scenarios || [],
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      latencyMs,
    };
  } catch (error) {
    console.error('[testScenarioLlmGenerator] Error generating test scenarios:', error);
    return null;
  }
}

// Prompt hämtas via getTestScenarioPrompt() från promptLoader

