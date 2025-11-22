import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { generateChatCompletion, isLlmEnabled } from './llmClient';
import type { BpmnElement } from './bpmnParser';
import { buildBpmnElementSummary } from './llmUtils';
import { logLlmFallback } from './llmMonitoring';
import { saveLlmDebugArtifact } from './llmDebugStorage';
import type { LlmProvider } from './llmClientAbstraction';
import { getDefaultLlmProvider } from './llmClients';
import { LocalLlmUnavailableError } from './llmClients/localLlmClient';
import { getTestscriptPrompt, buildSystemPrompt } from './promptLoader';
import { getLlmProfile } from './llmProfiles';
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
): Promise<LlmTestScenario[] | null> {
  if (!isLlmEnabled()) return null;

  // Hämta prompt via central promptLoader
  const basePrompt = getTestscriptPrompt();

  // Hämta provider-specifik profil
  const effectiveProvider = llmProvider || getDefaultLlmProvider();
  const profile = getLlmProfile('testscript', effectiveProvider);

  // Bygg system prompt med ev. extra prefix för provider
  const systemPrompt = buildSystemPrompt(basePrompt, profile.extraSystemPrefix);

  // Bygg test scenario schema (använder standardvärden för nu)
  // TODO: Detta kan ev. göras provider-aware i framtiden
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
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    let response: string | null = null;
    try {
      response = await generateChatCompletion(
        messages,
        {
          temperature: profile.temperature,
          maxTokens: profile.maxTokens,
          responseFormat: {
            type: 'json_schema',
            json_schema: scenarioSchema,
          },
          model: 'slow',
        },
        effectiveProvider
      );
    } catch (error) {
      // Hantera LocalLlmUnavailableError
      if (error instanceof LocalLlmUnavailableError) {
        console.warn('Local LLM unavailable during test generation:', error.message);
        return null;
      }

      if (isSchemaFormatError(error)) {
        console.warn('JSON schema response_format unsupported, retrying with plain text:', error);
        try {
          response = await generateChatCompletion(
            messages,
            {
              temperature: profile.temperature,
              maxTokens: profile.maxTokens,
              model: 'slow',
            },
            effectiveProvider
          );
        } catch (retryError) {
          if (retryError instanceof LocalLlmUnavailableError) {
            console.warn('Local LLM unavailable during test generation (retry):', retryError.message);
            return null;
          }
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    if (!response) {
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
      const parsedJson = sanitizeJsonResponse(response);
      await saveLlmDebugArtifact('test', element.id || element.name || 'unknown', parsedJson);
      const parsed = JSON.parse(parsedJson) as
        | { scenarios: LlmTestScenario[] }
        | LlmTestScenario[];

      // Validera JSON-struktur mot kontrakt
      const validationResult = validateTestscriptJson(parsed, effectiveProvider);
      logValidationResult(validationResult, effectiveProvider, 'testscript', element.id);

      if (!validationResult.valid) {
        console.error(
          `[LLM Tests] JSON validation failed for testscript (${effectiveProvider}). Errors:`,
          validationResult.errors
        );
        // Fortsätt ändå - validering är varning, inte blockerande
      }

      const scenarios = Array.isArray(parsed) ? parsed : parsed?.scenarios;
      if (Array.isArray(scenarios)) {
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
      await saveLlmDebugArtifact('test', `${element.id || element.name || 'unknown'}-parse-error`, response);
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

