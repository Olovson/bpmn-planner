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
    effectGoals: [],
    scopeIncluded: [],
    scopeExcluded: [],
    epics: [],
    flowSteps: [],
    dependencies: [],
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

function parseStructuredSections(rawContent: string): FeatureGoalLlmSections | null {
  const parsed = tryParseJson(rawContent);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as any;
  const sections = createEmptySections();

  if (typeof obj.summary === 'string') {
    sections.summary = obj.summary.trim();
  }

  sections.effectGoals = coerceStringArray(obj.effectGoals);
  sections.scopeIncluded = coerceStringArray(obj.scopeIncluded);
  sections.scopeExcluded = coerceStringArray(obj.scopeExcluded);

  if (Array.isArray(obj.epics)) {
    for (const item of obj.epics) {
      if (!item || typeof item !== 'object') continue;
      const epic = {
        id:
          typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `E${sections.epics.length + 1}`,
        name: typeof item.name === 'string' ? item.name.trim() : '',
        description:
          typeof item.description === 'string' ? item.description.trim() : '',
        team: typeof item.team === 'string' ? item.team.trim() : '',
      };
      if (epic.name || epic.description || epic.team) {
        sections.epics.push(epic);
      }
    }
  }

  sections.flowSteps = coerceStringArray(obj.flowSteps);
  sections.dependencies = coerceStringArray(obj.dependencies);

  if (Array.isArray(obj.scenarios)) {
    for (const item of obj.scenarios) {
      if (!item || typeof item !== 'object') continue;
      const scenario = {
        id: typeof item.id === 'string' ? item.id.trim() : '',
        name: typeof item.name === 'string' ? item.name.trim() : '',
        type: typeof item.type === 'string' ? item.type.trim() : '',
        outcome: typeof item.outcome === 'string' ? item.outcome.trim() : '',
      };
      if (scenario.id || scenario.name || scenario.outcome) {
        sections.scenarios.push(scenario);
      }
    }
  }

  if (typeof obj.testDescription === 'string') {
    sections.testDescription = obj.testDescription.trim();
  }

  sections.implementationNotes = coerceStringArray(obj.implementationNotes);
  sections.relatedItems = coerceStringArray(obj.relatedItems);

  const hasContent =
    sections.summary ||
    sections.scopeIncluded.length > 0 ||
    sections.scopeExcluded.length > 0 ||
    sections.epics.length > 0 ||
    sections.flowSteps.length > 0 ||
    sections.dependencies.length > 0 ||
    sections.scenarios.length > 0 ||
    sections.testDescription ||
    sections.implementationNotes.length > 0 ||
    sections.relatedItems.length > 0;

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
  const firstScenarioIndex = lowerText.indexOf('scenario:');
  const firstDependencyIndex = lowerText.indexOf('beroende:');

  const sectionStartCandidates = [
    firstScopeIndex,
    firstEpicIndex,
    firstScenarioIndex,
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
      lower.startsWith('ingår:') ||
      lower.startsWith('ingår inte:') ||
      lower.startsWith('epic:') ||
      lower.startsWith('scenario:') ||
      lower.startsWith('beroende:') ||
      lower.startsWith('relaterad') ||
      lower.startsWith('relaterade')
    );
  });
  sections.summary = summaryLines.join(' ');

  // Derivera enkla effektmål från sammanfattningen om LLM inte levererat egna.
  if (!sections.effectGoals || sections.effectGoals.length === 0) {
    const summarySentences = splitSentences(sections.summary);
    const effectCandidates = summarySentences.filter((s) => s.length > 0);
    if (effectCandidates.length) {
      sections.effectGoals = effectCandidates.slice(0, 3);
    }
  }

  const body = bodyPart || '';

  if (!body) {
    return sections;
  }

  const scopeRegex = /(Ingår(?: inte)?):\s*([^.;]+(?:\.[^A-ZÅÄÖ0-9]|$)?)/gi;
  let scopeMatch: RegExpExecArray | null;
  while ((scopeMatch = scopeRegex.exec(body))) {
    const label = scopeMatch[1].toLowerCase();
    const value = scopeMatch[2].trim().replace(/\s+/g, ' ').replace(/\.$/, '');
    if (!value) continue;
    if (label.startsWith('ingår inte')) {
      sections.scopeExcluded.push(value);
    } else {
      sections.scopeIncluded.push(value);
    }
  }

  if (body.toLowerCase().includes('endast digital ansökan via webbplattformen')) {
    sections.scopeIncluded.push('Endast digital ansökan via webbplattformen.');
  }

  const epicRegex =
    /Epic:\s*([^;]+);\s*Syfte:\s*([^.;]+)(?:;\s*Team:\s*([^.;]+))?(?:;\s*(?:Id|Epic-Id):\s*([^.;]+))?/gi;
  let epicMatch: RegExpExecArray | null;
  while ((epicMatch = epicRegex.exec(body))) {
    const name = epicMatch[1]?.trim();
    const description = epicMatch[2]?.trim();
    const team = epicMatch[3]?.trim() ?? '';
    const idFromText = epicMatch[4]?.trim();

    if (!name && !description && !team) continue;

    const epic = {
      id: idFromText || `E${sections.epics.length + 1}`,
      name,
      description,
      team,
    };

    sections.epics.push(epic);
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

    if (
      !sections.testDescription &&
      /scenari/.test(lowerSentence) &&
      (/\btest\b/.test(lowerSentence) || /playwright/.test(lowerSentence))
    ) {
      sections.testDescription = sentence.trim();
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

  const scenarioRegex =
    /Scenario:\s*([^;]+);\s*Typ:\s*([^;]+);\s*Beskrivning:\s*([^;]+);\s*Förväntat utfall:\s*([^.;]+(?:\.[^A-ZÅÄÖ0-9]|$)?)/gi;
  let scenarioMatch: RegExpExecArray | null;
  while ((scenarioMatch = scenarioRegex.exec(body))) {
    const id = scenarioMatch[1]?.trim();
    const type = scenarioMatch[2]?.trim();
    const description = scenarioMatch[3]?.trim();
    const outcome = scenarioMatch[4]?.trim();
    if (id || description || outcome) {
      sections.scenarios.push({
        id,
        name: description,
        type,
        outcome,
      });
    }
  }

  const bulletRegex = /(?:^|\s)[-•]\s+([\s\S]*?)(?=(?:\s[-•]\s)|$)/g;
  let bulletMatch: RegExpExecArray | null;
  while ((bulletMatch = bulletRegex.exec(body))) {
    const bullet = bulletMatch[1]?.trim();
    if (bullet) {
      sections.implementationNotes.push(bullet);
    }
  }

  const relatedRegex = /(Relaterat? [^:]+:[^.]+(?:\.)?)/gi;
  let relatedMatch: RegExpExecArray | null;
  while ((relatedMatch = relatedRegex.exec(body))) {
    const related = relatedMatch[1]?.trim();
    if (related) {
      sections.relatedItems.push(related);
    }
  }

  const bodyLines = splitLines(body);
  for (const line of bodyLines) {
    const lower = line.toLowerCase();

    if (/^[-•]/.test(line)) {
      const bullet = line.replace(/^[-•]\s*/, '').trim();
      if (bullet) {
        sections.implementationNotes.push(bullet);
      }
      continue;
    }

    if (
      !sections.testDescription &&
      /scenari/.test(lower) &&
      (/\btest\b/.test(lower) || /playwright/.test(lower))
    ) {
      sections.testDescription = line;
      continue;
    }

    if (lower.startsWith('relaterad') || lower.startsWith('relaterade')) {
      sections.relatedItems.push(line);
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
