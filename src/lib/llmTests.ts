import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { generateChatCompletion, isLlmEnabled } from './llmClient';
import type { BpmnElement } from './bpmnParser';
import { buildBpmnElementSummary } from './llmUtils';
import { logLlmFallback } from './llmMonitoring';
import { saveLlmDebugArtifact } from './llmDebugStorage';
import type { LlmProvider } from './llmClientAbstraction';
import { getDefaultLlmProvider } from './llmClients';
import { LocalLlmUnavailableError } from './llmClients/localLlmClient';
import { getTestscriptPrompt } from './promptLoader';
import { resolveLlmProvider } from './llmProviderResolver';
import { generateWithFallback } from './llmFallback';
import { logLlmEvent, extractErrorCode } from './llmLogging';
import { validateTestscriptJson, logValidationResult } from './llmValidation';

interface LlmTestScenario {
  name: string;
  description: string;
  expectedResult: string;
  type: 'happy-path' | 'error-case' | 'edge-case';
  steps: string[];
}

const buildTestScenarioSchema = (minItems: number, maxItems: number) => ({
  name: 'TestScenarioObject',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['scenarios'],
    properties: {
      scenarios: {
        type: 'array',
        minItems,
        maxItems,
        items: {
          type: 'object',
          required: ['name', 'description', 'expectedResult', 'type', 'steps'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            expectedResult: { type: 'string' },
            type: { type: 'string', enum: ['happy-path', 'error-case', 'edge-case'] },
            steps: {
              type: 'array',
              minItems: 3,
              maxItems: 6,
              items: { type: 'string' },
            },
          },
          additionalProperties: false,
        },
      },
    },
  },
});

export async function generateTestSpecWithLlm(
  element: BpmnElement,
  llmProvider?: LlmProvider,
  localAvailable: boolean = false,
): Promise<LlmTestScenario[] | null> {
  if (!isLlmEnabled()) return null;

  // Hämta prompt via central promptLoader
  const basePrompt = getTestscriptPrompt();

  // Resolvera provider med smart logik
  const globalDefault = getDefaultLlmProvider();
  const resolution = resolveLlmProvider({
    userChoice: llmProvider,
    globalDefault,
    localAvailable,
  });

  // Bygg test scenario schema (använder standardvärden för nu)
  const scenarioSchema = buildTestScenarioSchema(3, 5);

  const summary = buildBpmnElementSummary(element);
  const llmInput = {
    nodeName: summary.name,
    type: summary.type,
    purpose: summary.purpose ?? summary.description ?? '',
    bpmnContext: {
      file: summary.bpmnFile,
      elementId: summary.id,
      hierarchyTrail: (summary as any).hierarchyTrail ?? undefined,
    },
    rawSummary: summary,
  };
  const userPrompt = JSON.stringify(llmInput, null, 2);

  // Valideringsfunktion för response
  const validateResponse = (response: string, provider: LlmProvider): { valid: boolean; errors: string[] } => {
    try {
      const parsedJson = sanitizeJsonResponse(response);
      const parsed = JSON.parse(parsedJson) as
        | { scenarios: LlmTestScenario[] }
        | LlmTestScenario[];

      const validationResult = validateTestscriptJson(parsed, provider);
      logValidationResult(validationResult, provider, 'testscript', element.id);

      return {
        valid: validationResult.valid,
        errors: validationResult.errors,
      };
    } catch (parseError) {
      return {
        valid: false,
        errors: [`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
      };
    }
  };

  try {
    // Använd hybrid/fallback-strategi
    // För testscript behöver vi hantera JSON schema response format
    // Vi gör ett första försök med JSON schema, sedan fallback till plain text om det failar
    let result;
    try {
      // Försök med JSON schema response format först (om cloud)
      if (resolution.chosen === 'cloud') {
        const { generateChatCompletion } = await import('./llmClient');
        const response = await generateChatCompletion(
          [
            { role: 'system', content: basePrompt },
            { role: 'user', content: userPrompt },
          ],
          {
            temperature: 0.3,
            maxTokens: 900,
            responseFormat: {
              type: 'json_schema',
              json_schema: scenarioSchema,
            },
            model: 'slow',
          },
          resolution.chosen
        );

        if (response) {
          const validation = validateResponse(response, resolution.chosen);
          if (validation.valid) {
            result = {
              text: response,
              provider: resolution.chosen as LlmProvider,
              fallbackUsed: false,
              attemptedProviders: [resolution.chosen],
              latencyMs: 0, // Vi mäter inte latency här eftersom vi använder generateChatCompletion direkt
            };
          } else {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
          }
        } else {
          throw new Error('LLM returned null response');
        }
      } else {
        // För local, använd generateWithFallback direkt (ingen JSON schema support)
        result = await generateWithFallback({
          docType: 'testscript',
          resolution,
          systemPrompt: basePrompt,
          userPrompt,
          validateResponse,
        });
      }
    } catch (error) {
      // Om JSON schema failar, försök med plain text
      if (isSchemaFormatError(error) && resolution.chosen === 'cloud') {
        result = await generateWithFallback({
          docType: 'testscript',
          resolution,
          systemPrompt: basePrompt,
          userPrompt,
          validateResponse,
        });
      } else {
        // Annars, använd generateWithFallback som hanterar fallback automatiskt
        result = await generateWithFallback({
          docType: 'testscript',
          resolution,
          systemPrompt: basePrompt,
          userPrompt,
          validateResponse,
        });
      }
    }

    if (!result || !result.text) {
      // Logga event
      logLlmEvent({
        docType: 'testscript',
        attemptedProviders: result?.attemptedProviders || resolution.attempted,
        finalProvider: result?.provider || resolution.chosen,
        fallbackUsed: result?.fallbackUsed || false,
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        validationOk: false,
        errorMessage: 'Empty response or invalid structure',
      });

      await logLlmFallback({
        eventType: 'test',
        status: 'fallback',
        reason: 'empty-response',
        nodeId: element.id,
        nodeName: element.name,
        metadata: { elementType: element.type },
      });
      return null;
    }

    try {
      const parsedJson = sanitizeJsonResponse(result.text);
      await saveLlmDebugArtifact('test', element.id || element.name || 'unknown', parsedJson);
      const parsed = JSON.parse(parsedJson) as
        | { scenarios: LlmTestScenario[] }
        | LlmTestScenario[];

      const scenarios = Array.isArray(parsed) ? parsed : parsed?.scenarios;
      if (Array.isArray(scenarios)) {
        // Logga event
        logLlmEvent({
          docType: 'testscript',
          attemptedProviders: result.attemptedProviders,
          finalProvider: result.provider,
          fallbackUsed: result.fallbackUsed,
          success: true,
          validationOk: true,
          latencyMs: result.latencyMs,
        });

        return scenarios;
      }
      await logLlmFallback({
        eventType: 'test',
        status: 'fallback',
        reason: 'invalid-response-structure',
        nodeId: element.id,
        nodeName: element.name,
        metadata: { elementType: element.type },
      });
      return null;
    } catch (error) {
      console.warn('Failed to parse LLM test scenarios:', error);
      await saveLlmDebugArtifact('test', `${element.id || element.name || 'unknown'}-parse-error`, result.text);
      
      // Logga event
      const errorCode = extractErrorCode(error);
      logLlmEvent({
        docType: 'testscript',
        attemptedProviders: result.attemptedProviders,
        finalProvider: result.provider,
        fallbackUsed: result.fallbackUsed,
        success: false,
        errorCode,
        validationOk: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      await logLlmFallback({
        eventType: 'test',
        status: 'error',
        reason: 'parse-error',
        error,
        nodeId: element.id,
        nodeName: element.name,
        metadata: { elementType: element.type },
      });
      return null;
    }
  } catch (error) {
    // Logga fel-event
    const errorCode = extractErrorCode(error);
    logLlmEvent({
      docType: 'testscript',
      attemptedProviders: resolution.attempted,
      finalProvider: resolution.chosen,
      fallbackUsed: false,
      success: false,
      errorCode,
      validationOk: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    await logLlmFallback({
      eventType: 'test',
      status: 'error',
      reason: 'request-error',
      error,
      nodeId: element.id,
      nodeName: element.name,
      metadata: { elementType: element.type },
    });
    return null;
  }
}

function isSchemaFormatError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as Record<string, any>;
  const status = anyError.status ?? anyError?.response?.status;
  const message = anyError?.error?.message || anyError?.message || '';
  return (
    status === 400 &&
    typeof message === 'string' &&
    (message.toLowerCase().includes('response_format') ||
      message.toLowerCase().includes('json_schema'))
  );
}

function sanitizeJsonResponse(raw: string): string {
  let result = raw.trim();
  result = result.replace(/```(?:json)?/gi, '').replace(/```/g, '');

  // Remove any leading text before the first JSON character
  const firstBrace = result.indexOf('{');
  const firstBracket = result.indexOf('[');
  const startCandidates = [firstBrace, firstBracket].filter((idx) => idx >= 0);
  if (startCandidates.length) {
    const start = Math.min(...startCandidates);
    if (start > 0) {
      result = result.slice(start);
    }
  }

  // Trim anything after the last closing brace/bracket
  const lastBrace = result.lastIndexOf('}');
  const lastBracket = result.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  if (end >= 0 && end + 1 < result.length) {
    result = result.slice(0, end + 1);
  }

  return result.trim();
}

