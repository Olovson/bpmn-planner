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
        // OBS: minItems och maxItems stöds inte av Anthropic API - tas bort
        // LLM instrueras via prompt att generera rätt antal scenarios
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
              // OBS: minItems och maxItems stöds inte av Anthropic API - tas bort
              // LLM instrueras via prompt att generera 3-6 steps
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
  checkCancellation?: () => void,
  abortSignal?: AbortSignal,
): Promise<LlmTestScenario[] | null> {
  if (!isLlmEnabled()) return null;

  // Kontrollera avbrytning INNAN LLM-anrop
  if (checkCancellation) {
    checkCancellation();
  }
  
  // Kontrollera abort signal INNAN LLM-anrop
  if (abortSignal?.aborted) {
    throw new Error('Avbrutet av användaren');
  }

  // Hämta prompt via central promptLoader
  const basePrompt = getTestscriptPrompt();

  // Resolvera provider med smart logik
  const globalDefault = getDefaultLlmProvider();
  const resolution = resolveLlmProvider({
    userChoice: llmProvider,
    globalDefault,
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
            maxTokens: 2000, // Ökad från 900 för att säkerställa kompletta scenarier
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
          abortSignal,
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
          abortSignal,
        });
      } else {
        // Annars, använd generateWithFallback som hanterar fallback automatiskt
        result = await generateWithFallback({
          docType: 'testscript',
          resolution,
          systemPrompt: basePrompt,
          userPrompt,
          validateResponse,
          abortSignal,
        });
      }
    }

    if (!result || !result.text) {
      // Logga event
      logLlmEvent({
        eventType: 'ERROR',
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
          eventType: 'INFO',
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
        eventType: 'ERROR',
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
      eventType: 'ERROR',
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
  
  // Steg 1: Ta bort markdown-code blocks
  result = result.replace(/```(?:json|javascript)?/gi, '').replace(/```/g, '').trim();
  
  // Steg 1.1: Ta bort JSON-kommentarer (// och /* */)
  result = result.replace(/\/\/.*$/gm, '');
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Steg 2: Hitta första JSON-struktur ({ eller [)
  const firstBrace = result.indexOf('{');
  const firstBracket = result.indexOf('[');
  const startCandidates = [firstBrace, firstBracket].filter((idx) => idx >= 0);
  
  if (startCandidates.length === 0) {
    throw new Error('No JSON structure found (no { or [)');
  }

  const start = Math.min(...startCandidates);
  if (start > 0) {
    result = result.slice(start);
  }

  // Steg 3: Hitta sista matchande avslutning med balanserad parsing
  let braceCount = 0;
  let bracketCount = 0;
  let end = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
    
    // Om vi har balanserat alla klammerparenteser, detta är slutet
    if (braceCount === 0 && bracketCount === 0 && i > 0) {
      end = i;
      break;
    }
  }

  if (end >= 0) {
    result = result.slice(0, end + 1);
  } else {
    // Fallback: använd lastIndexOf om balansering misslyckas
    const lastBrace = result.lastIndexOf('}');
    const lastBracket = result.lastIndexOf(']');
    const fallbackEnd = Math.max(lastBrace, lastBracket);
    if (fallbackEnd >= 0 && fallbackEnd + 1 < result.length) {
      result = result.slice(0, fallbackEnd + 1);
    }
  }

  // Steg 4: Fixa vanliga JSON-problem
  result = result.replace(/,(\s*[}\]])/g, '$1'); // Fix trailing commas
  result = result.replace(/,\s*,/g, ','); // Fix double commas

  return result.trim();
}
