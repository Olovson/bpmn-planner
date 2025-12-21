import type {
  EpicDocModel,
  EpicLlmSections,
  EpicUserStory,
} from './epicDocTypes';

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
    flowSteps: [],
    userStories: [],
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
  model.flowSteps = coerceStringArray((obj as any).flowSteps);
  // interactions is optional - only include if present
  if ((obj as any).interactions !== undefined) {
    model.interactions = coerceStringArray((obj as any).interactions);
  }
  // dependencies is optional - only include if present
  if ((obj as any).dependencies !== undefined) {
    model.dependencies = coerceStringArray((obj as any).dependencies);
  }

  if (Array.isArray((obj as any).userStories)) {
    for (const item of (obj as any).userStories) {
      if (!item || typeof item !== 'object') continue;
      const userStory: EpicUserStory = {
        id: typeof item.id === 'string' ? item.id.trim() : '',
        role: typeof item.role === 'string' ? item.role.trim() : '',
        goal: typeof item.goal === 'string' ? item.goal.trim() : '',
        value: typeof item.value === 'string' ? item.value.trim() : '',
        acceptanceCriteria: coerceStringArray(item.acceptanceCriteria),
      };
      
      if (userStory.id && userStory.role && userStory.goal && userStory.value) {
        model.userStories.push(userStory);
      }
    }
  }

  const hasContent =
    model.summary ||
    model.prerequisites.length > 0 ||
    model.flowSteps.length > 0 ||
    (model.interactions && model.interactions.length > 0) ||
    (model.dependencies && model.dependencies.length > 0) ||
    model.userStories.length > 0;

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
  const flowLines: string[] = [];
  const interactionLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (/scenario[:]/i.test(line)) continue;

    if (/förutsättningar|triggas normalt/i.test(lower)) {
      prereqLines.push(line);
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
