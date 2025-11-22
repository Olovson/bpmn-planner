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

const tryMatch = (line: string, regex: RegExp): RegExpExecArray | null => {
  const match = regex.exec(line);
  if (!match) return null;
  return match;
};

export function mapFeatureGoalLlmToSections(rawContent: string): FeatureGoalLlmSections {
  const sections: FeatureGoalLlmSections = {
    summary: '',
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

  if (!rawContent || !rawContent.trim()) {
    return sections;
  }

  const text = stripHtmlTags(rawContent);
  const lines = splitLines(text);

  let summaryCollected = false;
  const summaryLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Sammanfattning: ta första blocket innan vi stöter på någon av de tydliga sektionerna.
    if (!summaryCollected) {
      if (
        lower.startsWith('ingår:') ||
        lower.startsWith('ingår inte:') ||
        lower.startsWith('epic:') ||
        lower.startsWith('scenario:') ||
        lower.startsWith('beroende:') ||
        /^\d+\./.test(line)
      ) {
        summaryCollected = true;
      } else {
        summaryLines.push(line);
        continue;
      }
    }

    // Scope – Ingår / Ingår inte
    if (lower.startsWith('ingår:')) {
      const rest = line.slice(line.indexOf(':') + 1).trim();
      if (rest) {
        sections.scopeIncluded.push(rest);
      }
      continue;
    }
    if (lower.startsWith('ingår inte:')) {
      const rest = line.slice(line.indexOf(':') + 1).trim();
      if (rest) {
        sections.scopeExcluded.push(rest);
      }
      continue;
    }

    // Epics
    if (lower.startsWith('epic:')) {
      const parts = line.split(';').map((part) => part.trim());
      const epic: { id: string; name: string; description: string; team: string } = {
        id: '',
        name: '',
        description: '',
        team: '',
      };

      for (const part of parts) {
        const lowerPart = part.toLowerCase();
        if (lowerPart.startsWith('epic:')) {
          epic.name = part.slice(part.indexOf(':') + 1).trim();
        } else if (lowerPart.startsWith('syfte:')) {
          epic.description = part.slice(part.indexOf(':') + 1).trim();
        } else if (lowerPart.startsWith('team:')) {
          epic.team = part.slice(part.indexOf(':') + 1).trim();
        } else if (lowerPart.startsWith('id:') || lowerPart.startsWith('epic-id:')) {
          epic.id = part.slice(part.indexOf(':') + 1).trim();
        }
      }

      if (!epic.id) {
        epic.id = `E${sections.epics.length + 1}`;
      }

      if (epic.name || epic.description || epic.team) {
        sections.epics.push(epic);
      }
      continue;
    }

    // Affärsflöde – numererade steg
    const flowMatch = tryMatch(line, /^(\d+)\.\s*(.+)$/);
    if (flowMatch) {
      const step = flowMatch[2].trim();
      if (step) {
        sections.flowSteps.push(step);
      }
      continue;
    }

    // Beroenden
    if (lower.startsWith('beroende:')) {
      const rest = line.slice(line.indexOf(':') + 1).trim();
      if (rest) {
        sections.dependencies.push(rest);
      }
      continue;
    }

    // Affärs-scenarion
    if (lower.startsWith('scenario:')) {
      const parts = line.split(';').map((part) => part.trim());
      const scenario: {
        id: string;
        name: string;
        type: string;
        outcome: string;
      } = {
        id: '',
        name: '',
        type: '',
        outcome: '',
      };

      for (const part of parts) {
        const lowerPart = part.toLowerCase();
        if (lowerPart.startsWith('scenario:')) {
          scenario.id = part.slice(part.indexOf(':') + 1).trim();
        } else if (lowerPart.startsWith('typ:')) {
          scenario.type = part.slice(part.indexOf(':') + 1).trim();
        } else if (lowerPart.startsWith('beskrivning:')) {
          scenario.name = part.slice(part.indexOf(':') + 1).trim();
        } else if (lowerPart.startsWith('förväntat utfall:')) {
          scenario.outcome = part.slice(part.indexOf(':') + 1).trim();
        }
      }

      if (scenario.id || scenario.name || scenario.outcome) {
        sections.scenarios.push(scenario);
      }
      continue;
    }

    // Implementation Notes – samla generiska bullets (börjar med - eller •) som inte fångats ovan.
    if (/^[-•]/.test(line)) {
      const bullet = line.replace(/^[-•]\s*/, '').trim();
      if (bullet) {
        sections.implementationNotes.push(bullet);
      }
      continue;
    }

    // Testkoppling – plocka upp första stycket som både nämner scenarion och tester/testfil
    if (
      !sections.testDescription &&
      /scenari/.test(lower) &&
      (/\btest\b/.test(lower) || /playwright/.test(lower))
    ) {
      sections.testDescription = line;
      continue;
    }

    // Relaterade regler / subprocesser – ta rader som nämner relaterade regler/subprocesser
    if (lower.startsWith('relaterad') || lower.startsWith('relaterade')) {
      sections.relatedItems.push(line);
      continue;
    }
  }

  if (!sections.summary && summaryLines.length) {
    sections.summary = summaryLines.join(' ');
  }

  return sections;
}

