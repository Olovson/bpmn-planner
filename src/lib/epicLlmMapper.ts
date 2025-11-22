import type { EpicDocModel, EpicLlmSections, EpicScenario } from './epicDocTypes';

const stripHtmlTags = (value: string): string =>
  value
    .replace(/<\/?script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

function createEmptyEpicModel(): EpicDocModel {
  return {
    summary: '',
    prerequisites: [],
    inputs: [],
    flowSteps: [],
    interactions: [],
    dataContracts: [],
    businessRulesPolicy: [],
    scenarios: [],
    testDescription: '',
    implementationNotes: [],
    relatedItems: [],
  };
}

function tryParseJson(rawContent: string): unknown | null {
  if (!rawContent) return null;
  const trimmed = rawContent.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonSlice = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch {
    return null;
  }
}

function coerceStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function parseStructuredEpic(rawContent: string): EpicDocModel | null {
  const parsed = tryParseJson(rawContent);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as any as EpicLlmSections;
  const model = createEmptyEpicModel();

  if (typeof obj.summary === 'string') {
    model.summary = obj.summary.trim();
  }

  model.prerequisites = coerceStringArray((obj as any).prerequisites);
  model.inputs = coerceStringArray((obj as any).inputs);
  model.flowSteps = coerceStringArray((obj as any).flowSteps);
  model.interactions = coerceStringArray((obj as any).interactions);
  model.dataContracts = coerceStringArray((obj as any).dataContracts);
  model.businessRulesPolicy = coerceStringArray((obj as any).businessRulesPolicy);

  if (Array.isArray((obj as any).scenarios)) {
    for (const item of (obj as any).scenarios as EpicScenario[]) {
      if (!item || typeof item !== 'object') continue;
      const scenario: EpicScenario = {
        id: typeof item.id === 'string' ? item.id.trim() : '',
        name: typeof item.name === 'string' ? item.name.trim() : '',
        type: typeof item.type === 'string' ? item.type.trim() : '',
        description:
          typeof item.description === 'string' ? item.description.trim() : '',
        outcome: typeof item.outcome === 'string' ? item.outcome.trim() : '',
      };
      if (scenario.id || scenario.name || scenario.outcome) {
        model.scenarios.push(scenario);
      }
    }
  }

  if (typeof (obj as any).testDescription === 'string') {
    model.testDescription = (obj as any).testDescription.trim();
  }

  model.implementationNotes = coerceStringArray((obj as any).implementationNotes);
  model.relatedItems = coerceStringArray((obj as any).relatedItems);

  const hasContent =
    model.summary ||
    model.prerequisites.length > 0 ||
    model.inputs.length > 0 ||
    model.flowSteps.length > 0 ||
    model.interactions.length > 0 ||
    model.dataContracts.length > 0 ||
    model.businessRulesPolicy.length > 0 ||
    model.scenarios.length > 0 ||
    model.testDescription ||
    model.implementationNotes.length > 0 ||
    model.relatedItems.length > 0;

  return hasContent ? model : null;
}

function parseEpicWithFallback(rawContent: string): EpicDocModel {
  const model = createEmptyEpicModel();

  if (!rawContent || !rawContent.trim()) {
    return model;
  }

  const text = stripHtmlTags(rawContent);
  if (!text) return model;

  const lines = splitLines(text);

  const summaryLines: string[] = [];
  const prereqLines: string[] = [];
  const inputLines: string[] = [];
  const flowLines: string[] = [];
  const interactionLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (/scenario[:]/i.test(line)) continue;

    if (/förutsättningar|triggas normalt/i.test(lower)) {
      prereqLines.push(line);
      continue;
    }

    if (/input/i.test(lower)) {
      inputLines.push(line);
      continue;
    }

    if (/flöde|steg/i.test(lower)) {
      flowLines.push(line);
      continue;
    }

    if (/kanal|api|tjänst|service/i.test(lower)) {
      interactionLines.push(line);
      continue;
    }

    summaryLines.push(line);
  }

  if (summaryLines.length) {
    model.summary = summaryLines.join(' ');
  }
  model.prerequisites = prereqLines;
  model.inputs = inputLines;
  model.flowSteps = flowLines;
  model.interactions = interactionLines;

  return model;
}

let ALLOW_FALLBACK = true;

// Test-only hook: låter t.ex. LLM-smoke-tester slå av regex/fri-text-fallback
// för att verifiera att modellen returnerar strukturerad JSON enligt kontraktet.
export const __setAllowEpicLlmFallbackForTests = (value: boolean) => {
  ALLOW_FALLBACK = value;
};

export function mapEpicLlmToSections(rawContent: string): EpicDocModel {
  const structured = parseStructuredEpic(rawContent);
  if (structured) return structured;
  if (!ALLOW_FALLBACK) {
    throw new Error(
      'Epic LLM response did not match structured JSON contract (no structured sections, fallback disabled)',
    );
  }
  return parseEpicWithFallback(rawContent);
}
