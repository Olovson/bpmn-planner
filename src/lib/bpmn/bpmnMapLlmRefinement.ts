import type { BpmnMap, BpmnMapProcess, BpmnMapCallActivity, BpmnMatchStatus } from './bpmnMapLoader';
import { generateChatCompletion } from '@/lib/llmClient';
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

type LlmSuggestionSource = 'heuristic' | 'llm' | 'manual';

interface LlmMapSuggestion {
  subprocess_bpmn_file: string | null;
  process_id?: string | null;
  confidence: number;
  reason?: string;
}

function isRefinementCandidate(process: BpmnMapProcess, ca: BpmnMapCallActivity): boolean {
  // Respektera manuella mappningar fullt ut
  const source: LlmSuggestionSource = ca.source ?? 'manual';
  if (source === 'manual') return false;

  const status: BpmnMatchStatus | undefined = ca.match_status;
  const noTarget = !ca.subprocess_bpmn_file;

  // Kandidater: saknad mappning eller låg/ambiguous/unresolved match
  if (noTarget) return true;
  if (!status) return false;

  return status === 'lowConfidence' || status === 'ambiguous' || status === 'unresolved';
}

function buildCandidates(map: BpmnMap): { bpmn_file: string; process_id: string; name?: string }[] {
  return map.processes.map((p) => ({
    bpmn_file: p.bpmn_file,
    process_id: p.process_id,
    name: (p as any).alias || (p as any).description,
  }));
}

function buildLlmMessages(
  proc: BpmnMapProcess,
  ca: BpmnMapCallActivity,
  candidates: { bpmn_file: string; process_id: string; name?: string }[],
): ChatCompletionMessageParam[] {
  const systemPrompt =
    'You are a BPMN subprocess mapping assistant. ' +
    'Your task is to map a callActivity in a BPMN process to the most likely subprocess BPMN file.';

  const payload = {
    parent: {
      bpmn_file: proc.bpmn_file,
      process_id: proc.process_id,
      name: (proc as any).alias || (proc as any).description || proc.process_id,
    },
    call_activity: {
      bpmn_id: ca.bpmn_id,
      name: ca.name,
      called_element: ca.called_element,
      current_subprocess_bpmn_file: ca.subprocess_bpmn_file ?? null,
      match_status: ca.match_status ?? null,
      source: ca.source ?? null,
    },
    candidates,
    instructions: {
      goal:
        'Pick the single most appropriate subprocess BPMN file for this callActivity, ' +
        'or return null if you are not confident.',
      constraints: [
        'Only return files that exist in the candidates array',
        'Be conservative: if unsure, set confidence below 0.6',
        'Prefer higher confidence only when name/calledElement clearly matches a candidate',
      ],
    },
  };

  const userPrompt =
    'Given the following BPMN context, return a JSON suggestion with:\n' +
    '{ "subprocess_bpmn_file": string | null, "process_id": string | null, "confidence": number, "reason": string }\n' +
    'Do not include any extra keys.\n\n' +
    JSON.stringify(payload, null, 2);

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

function parseLlmSuggestion(raw: string | null): LlmMapSuggestion | null {
  if (!raw) return null;

  let text = raw.trim();
  // Ta bort ev. ```json wrappers
  text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(text) as LlmMapSuggestion;
    if (
      typeof parsed.confidence !== 'number' ||
      parsed.confidence < 0 ||
      parsed.confidence > 1
    ) {
      return null;
    }
    if (
      parsed.subprocess_bpmn_file !== null &&
      typeof parsed.subprocess_bpmn_file !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function applySuggestionToCallActivity(
  ca: BpmnMapCallActivity,
  suggestion: LlmMapSuggestion,
  availableFiles: Set<string>,
): BpmnMapCallActivity {
  // Endast acceptera förslag som pekar på befintliga filer
  if (suggestion.subprocess_bpmn_file && !availableFiles.has(suggestion.subprocess_bpmn_file)) {
    return ca;
  }

  const confidence = suggestion.confidence ?? 0;

  if (confidence >= 0.9 && suggestion.subprocess_bpmn_file) {
    // Hög confidence: uppdatera mappningen, markera som matched utan review
    return {
      ...ca,
      subprocess_bpmn_file: suggestion.subprocess_bpmn_file,
      match_status: 'matched',
      needs_manual_review: false,
      source: 'llm',
    };
  }

  if (confidence >= 0.6 && suggestion.subprocess_bpmn_file) {
    // Mellan confidence: sätt LLM-förslag men behåll review-flagga
    return {
      ...ca,
      subprocess_bpmn_file: suggestion.subprocess_bpmn_file,
      match_status: ca.match_status ?? 'lowConfidence',
      needs_manual_review: true,
      source: 'llm',
    };
  }

  // Låg confidence eller null: behåll befintlig heuristik
  return ca;
}

/**
 * LLM-refinementlager för bpmn-map.
 *
 * V1: mycket konservativt; uppdaterar endast callActivities där heuristiken
 * varit osäker eller saknar mappning, och bara när LLM ger ett
 * hög- eller medelkonfidensförslag till en känd subprocess-fil.
 *
 * Kallas endast när orchestratorn explicit får useLlm=true.
 */
export async function refineBpmnMapWithLlm(map: BpmnMap): Promise<BpmnMap> {
  // Om LLM inte är aktiverat globalt, returnera originalet
  const availableFiles = new Set(map.processes.map((p) => p.bpmn_file));
  const candidates = buildCandidates(map);

  const updatedProcesses: BpmnMapProcess[] = [];

  for (const proc of map.processes) {
    const updatedCallActivities: BpmnMapCallActivity[] = [];

    for (const ca of proc.call_activities || []) {
      if (!isRefinementCandidate(proc, ca)) {
        updatedCallActivities.push(ca);
        continue;
      }

      const messages = buildLlmMessages(proc, ca, candidates);

      let suggestion: LlmMapSuggestion | null = null;
      try {
        const raw = await generateChatCompletion(messages, {
          temperature: 0,
          responseFormat: {
            type: 'json_schema',
            json_schema: {
              name: 'bpmn_map_refinement_suggestion',
              schema: {
                type: 'object',
                properties: {
                  subprocess_bpmn_file: { type: ['string', 'null'] },
                  process_id: { type: ['string', 'null'] },
                  confidence: { type: 'number' },
                  reason: { type: 'string' },
                },
                required: ['subprocess_bpmn_file', 'confidence'],
                additionalProperties: false,
              },
            },
          } as any,
        });
        suggestion = parseLlmSuggestion(raw);
      } catch (error) {
        console.warn(
          '[bpmnMapLlmRefinement] LLM refinement failed for',
          `${proc.bpmn_file}::${proc.process_id}::${ca.bpmn_id}`,
          error instanceof Error ? error.message : String(error),
        );
        suggestion = null;
      }

      if (!suggestion) {
        updatedCallActivities.push(ca);
        continue;
      }

      const refined = applySuggestionToCallActivity(ca, suggestion, availableFiles);
      updatedCallActivities.push(refined);
    }

    updatedProcesses.push({
      ...proc,
      call_activities: updatedCallActivities,
    });
  }

  return {
    ...map,
    processes: updatedProcesses,
  };
}

