import type { FeatureGoalLlmSections } from './featureGoalLlmTypes';

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

const splitSentences = (value: string): string[] =>
  value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

function createEmptySections(): FeatureGoalLlmSections {
  return {
    summary: '',
    flowSteps: [],
    dependencies: [],
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

function parseStructuredSections(rawContent: string): FeatureGoalLlmSections | null {
  const parsed = tryParseJson(rawContent);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as any;
  const sections = createEmptySections();

  if (typeof obj.summary === 'string') {
    sections.summary = obj.summary.trim();
  }

  // prerequisites har konsoliderats till dependencies (samma som Epic)
  sections.flowSteps = coerceStringArray(obj.flowSteps);
  sections.dependencies = coerceStringArray(obj.dependencies);

  // Handle userStories
  if (Array.isArray(obj.userStories)) {
    sections.userStories = [];
    for (const item of obj.userStories) {
      if (!item || typeof item !== 'object') continue;
      const story = {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `US-${sections.userStories.length + 1}`,
        role: typeof item.role === 'string' ? item.role.trim() : '',
        goal: typeof item.goal === 'string' ? item.goal.trim() : '',
        value: typeof item.value === 'string' ? item.value.trim() : '',
        acceptanceCriteria: coerceStringArray(item.acceptanceCriteria),
      };
      if (story.role || story.goal || story.value || story.acceptanceCriteria.length > 0) {
        sections.userStories = sections.userStories || [];
        sections.userStories.push(story);
      }
    }
  }

  const hasContent =
    sections.summary ||
    sections.flowSteps.length > 0 ||
    (sections.dependencies && sections.dependencies.length > 0) ||
    (sections.userStories && sections.userStories.length > 0);

  return hasContent ? sections : null;
}

function parseWithRegexFallback(rawContent: string): FeatureGoalLlmSections {
  const sections = createEmptySections();

  if (!rawContent || !rawContent.trim()) {
    return sections;
  }

  const text = stripHtmlTags(rawContent);
  if (!text) {
    return sections;
  }

  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const lowerText = normalizedText.toLowerCase();

  const firstScopeIndex = lowerText.search(/ingår( inte)?:/);
  const firstEpicIndex = lowerText.indexOf('epic:');
  const firstDependencyIndex = lowerText.indexOf('beroende:');

  const sectionStartCandidates = [
    firstScopeIndex,
    firstEpicIndex,
    firstDependencyIndex,
  ].filter((index) => index >= 0);
  const firstSectionIndex =
    sectionStartCandidates.length > 0 ? Math.min(...sectionStartCandidates) : -1;

  let summaryPart = normalizedText;
  let bodyPart = '';

  if (firstSectionIndex >= 0) {
    summaryPart = normalizedText.slice(0, firstSectionIndex).trim();
    bodyPart = normalizedText.slice(firstSectionIndex).trim();
  }

  const summaryLines = splitLines(summaryPart).filter((line) => {
    const lower = line.toLowerCase();
    return !(
      lower.startsWith('beroende:')
    );
  });
  sections.summary = summaryLines.join(' ');

  const body = bodyPart || '';

  if (!body) {
    return sections;
  }

  const sentences = splitSentences(body);
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (
      /^(kunden|systemet|den insamlade datan|resultaten|processen)/i.test(
        sentence.trim(),
      )
    ) {
      sections.flowSteps.push(sentence.replace(/\s+/g, ' ').trim());
      continue;
    }

  }

  const dependencyRegex =
    /Beroende:\s*([^;]+);\s*Id:\s*([^;]+);\s*Beskrivning:\s*([^.;]+(?:\.[^A-ZÅÄÖ0-9]|$)?)/gi;
  let dependencyMatch: RegExpExecArray | null;
  while ((dependencyMatch = dependencyRegex.exec(body))) {
    const name = dependencyMatch[1]?.trim();
    const id = dependencyMatch[2]?.trim();
    const description = dependencyMatch[3]
      ?.trim()
      .replace(/\s+/g, ' ')
      .replace(/\.$/, '');
    const dependencyParts = [];
    if (name) dependencyParts.push(`Beroende: ${name}`);
    if (id) dependencyParts.push(`Id: ${id}`);
    if (description) dependencyParts.push(`Beskrivning: ${description}`);
    const dependency = dependencyParts.join('; ');
    if (dependency) {
      sections.dependencies.push(dependency);
    }
  }



  return sections;
}

let ALLOW_FALLBACK = true;

// Test-only hook: låter t.ex. LLM-smoke-tester slå av regex-fallback
// för att verifiera att modellen returnerar strukturerad JSON enligt kontraktet.
export const __setAllowFeatureGoalLlmFallbackForTests = (value: boolean) => {
  ALLOW_FALLBACK = value;
};

export function mapFeatureGoalLlmToSections(
  rawContent: string,
): FeatureGoalLlmSections {
  const structured = parseStructuredSections(rawContent);
  if (structured) return structured;
  if (!ALLOW_FALLBACK) {
    throw new Error(
      'Feature Goal LLM response did not match structured JSON contract (no structured sections, fallback disabled)',
    );
  }
  return parseWithRegexFallback(rawContent);
}
