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
  const isFast = mode === 'fast';
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
    try {
      if (isFast) {
        const fastInstruction =
          'FAST MODE: Returnera 1–2 testscenarier i JSON-format: {"scenarios":[{"name":"...","description":"...","expectedResult":"...","type":"happy-path|error-case|edge-case","steps":["..."]}]} utan extra text före eller efter JSON.';
        const fastMessages: ChatCompletionMessageParam[] = [
          { role: 'system', content: `${systemPrompt}\n\n${fastInstruction}` },
          { role: 'user', content: userPrompt },
        ];
        response = await generateChatCompletion(fastMessages, {
          temperature: modeConfig.testTemperature,
          maxTokens: modeConfig.testMaxTokens,
          model: 'fast',
        });
      } else {
        response = await generateChatCompletion(messages, {
          temperature: modeConfig.testTemperature,
          maxTokens: modeConfig.testMaxTokens,
          responseFormat: {
            type: 'json_schema',
            json_schema: scenarioSchema,
          },
          model: 'slow',
        });
      }
    } catch (error) {
      if (!isFast && isSchemaFormatError(error)) {
        console.warn('JSON schema response_format unsupported, retrying with plain text:', error);
        response = await generateChatCompletion(messages, {
          temperature: modeConfig.testTemperature,
          maxTokens: modeConfig.testMaxTokens,
          model: 'slow',
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
      if (isFast) {
        const fallbackScenario: LlmTestScenario = buildFastFallbackScenario(element);
        return [fallbackScenario];
      }
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

function buildFastFallbackScenario(element: BpmnElement): LlmTestScenario {
  const baseName = element.name || element.id || 'Nod';
  const type = element.type || '';
  const lowerType = type.toLowerCase();

  if (lowerType.includes('usertask')) {
    return {
      name: `${baseName} – happy path`,
      description: 'Användaren fyller i alla obligatoriska fält korrekt.',
      expectedResult: 'Steget slutförs och processen går vidare till nästa nod.',
      type: 'happy-path',
      steps: [
        'Öppna sidan eller vyn för uppgiften.',
        'Fyll i alla obligatoriska fält med giltiga värden.',
        'Spara eller skicka in formuläret.',
        'Verifiera att nästa steg i processen visas utan felmeddelanden.',
      ],
    };
  }

  if (lowerType.includes('servicetask')) {
    return {
      name: `${baseName} – lyckat API-anrop`,
      description: 'Systemet anropar tjänsten med giltiga data och får ett lyckat svar.',
      expectedResult: 'Tjänsten returnerar ett 200/OK-svar och processen fortsätter.',
      type: 'happy-path',
      steps: [
        'Initiera service tasken med giltig input payload.',
        'Skicka API-anropet till konfigurerat endpoint.',
        'Verifiera att svaret har status 200/OK.',
        'Verifiera att responsdata lagras eller används enligt specifikation.',
      ],
    };
  }

  if (lowerType.includes('businessruletask')) {
    return {
      name: `${baseName} – regel godkänner`,
      description: 'Inkommande data uppfyller reglernas kriterier.',
      expectedResult: 'Regeln returnerar ett positivt utfall (t.ex. APPROVE/OK).',
      type: 'happy-path',
      steps: [
        'Skapa en inputprofil som uppfyller alla regler och tröskelvärden.',
        'Kör business rule mot denna inputprofil.',
        'Verifiera att beslutsvärdet är APPROVE/OK.',
        'Verifiera att eventuella flaggor/loggar sätts korrekt.',
      ],
    };
  }

  if (lowerType.includes('callactivity')) {
    return {
      name: `${baseName} – subprocess lyckas`,
      description: 'Subprocessen körs klart utan fel.',
      expectedResult: 'Call Activity slutförs och återvänder kontroll till huvudprocessen.',
      type: 'happy-path',
      steps: [
        'Trigga Call Activity med en giltig input som matchar subprocessens förutsättningar.',
        'Verifiera att subprocessens steg genomförs utan avbrott.',
        'Verifiera att subprocessen returnerar ett lyckat resultat.',
        'Verifiera att huvudprocessen fortsätter till nästa steg.',
      ],
    };
  }

  return {
    name: `${baseName} – happy path`,
    description: 'Grundläggande lyckat flöde för denna BPMN-nod.',
    expectedResult: 'Steget slutförs utan fel och processen går vidare.',
    type: 'happy-path',
    steps: [
      'Initiera noden med giltig input.',
      'Utför de åtgärder som noden representerar.',
      'Verifiera att inga fel uppstår.',
      'Verifiera att nästa steg i processen triggas.',
    ],
  };
}
