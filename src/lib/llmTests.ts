import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { generateChatCompletion, isLlmEnabled } from './llmClient';
import type { BpmnElement } from './bpmnParser';
import { buildBpmnElementSummary } from './llmUtils';
import { logLlmFallback } from './llmMonitoring';
import { getLlmModeConfig, getLlmGenerationMode } from './llmMode';
import { saveLlmDebugArtifact } from './llmDebugStorage';
import { TESTSCRIPT_PROMPT } from './llmPrompts';

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
): Promise<LlmTestScenario[] | null> {
  if (!isLlmEnabled()) return null;

  const mode = getLlmGenerationMode();
  const modeConfig = getLlmModeConfig(mode);
  const scenarioSchema = buildTestScenarioSchema(
    modeConfig.testMinScenarios,
    modeConfig.testMaxScenarios
  );
  const summary = buildBpmnElementSummary(element);
  const systemPrompt = TESTSCRIPT_PROMPT;
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
    const isFast = mode === 'fast';
    try {
        response = await generateChatCompletion(messages, {
          temperature: modeConfig.testTemperature,
          maxTokens: modeConfig.testMaxTokens,
          responseFormat: {
            type: 'json_schema',
            json_schema: scenarioSchema,
          },
          model: isFast ? 'fast' : 'slow',
        });
    } catch (error) {
      if (isSchemaFormatError(error)) {
        console.warn('JSON schema response_format unsupported, retrying with plain text:', error);
        response = await generateChatCompletion(messages, {
          temperature: modeConfig.testTemperature,
          maxTokens: modeConfig.testMaxTokens,
          model: isFast ? 'fast' : 'slow',
        });
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
