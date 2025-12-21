import type {
  ProcessDefinition,
  SubprocessLink,
  MatchCandidate,
  DiagnosticsEntry,
} from './types';

export type SubprocessMatcherConfig = {
  fuzzyThreshold?: number;
  ambiguityDelta?: number;
};

const DEFAULT_CONFIG: Required<SubprocessMatcherConfig> = {
  fuzzyThreshold: 0.75,
  ambiguityDelta: 0.1,
};

const MATCH_SCORES = {
  calledElementProcessId: 1,
  calledElementProcessName: 0.96,
  callActivityIdProcessId: 0.9,
  callActivityNameProcessName: 0.85,
  fileNameHeuristic: 0.8,
} as const;

const TIMESTAMP = () => new Date().toISOString();

export function matchCallActivityToProcesses(
  callActivity: {
    id: string;
    name?: string;
    calledElement?: string;
    kind?: 'callActivity' | 'subProcess';
  },
  candidates: ProcessDefinition[],
  config: SubprocessMatcherConfig = {},
): SubprocessLink {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const evaluatedCandidates = candidates
    .map((candidate) => evaluateCandidate(callActivity, candidate))
    .filter((candidate): candidate is MatchCandidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  // Debug-loggar har tagits bort för att minska loggbruset
  // Om debug behövs, sätt DEBUG_SUBPROCESS_MATCHER=true i localStorage
  const DEBUG_ENABLED = typeof window !== 'undefined' && localStorage.getItem('DEBUG_SUBPROCESS_MATCHER') === 'true';

  const bestCandidate = evaluatedCandidates[0];
  const diagnostics: DiagnosticsEntry[] = [];

  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log('[SubprocessMatcher][debug]', {
      callActivity,
      evaluatedCandidates: evaluatedCandidates.map((c) => ({
        processId: c.processId,
        fileName: c.fileName,
        score: c.score,
        reason: c.reason,
      })),
    });
  }

  if (!bestCandidate) {
    if (DEBUG_CALL_ACTIVITY_IDS.has(callActivity.id)) {
      // eslint-disable-next-line no-console
      console.log('[SubprocessMatcher][decision]', {
        callActivityId: callActivity.id,
        calledElement: callActivity.calledElement,
        status: 'unresolved' as const,
        best: null,
        secondBest: null,
        threshold: mergedConfig.fuzzyThreshold,
        ambiguityDelta: mergedConfig.ambiguityDelta,
      });
    }
    diagnostics.push({
      severity: 'warning',
      code: 'NO_MATCH',
      message: 'Inga potentiella subprocesser hittades för Call Activity.',
      context: {
        callActivityId: callActivity.id,
        calledElement: callActivity.calledElement,
      },
      timestamp: TIMESTAMP(),
    });

    return {
      callActivityId: callActivity.id,
      callActivityName: callActivity.name,
      calledElement: callActivity.calledElement,
      confidence: 0,
      matchStatus: 'unresolved',
      candidates: [],
      diagnostics,
    };
  }

  const secondBest = evaluatedCandidates[1];
  const status = deriveStatus(bestCandidate, secondBest, mergedConfig);

  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log('[SubprocessMatcher][decision]', {
      callActivityId: callActivity.id,
      calledElement: callActivity.calledElement,
      status,
      best: {
        processId: bestCandidate.processId,
        fileName: bestCandidate.fileName,
        score: bestCandidate.score,
        reason: bestCandidate.reason,
      },
      secondBest: secondBest
        ? {
            processId: secondBest.processId,
            fileName: secondBest.fileName,
            score: secondBest.score,
            reason: secondBest.reason,
          }
        : null,
      threshold: mergedConfig.fuzzyThreshold,
      ambiguityDelta: mergedConfig.ambiguityDelta,
    });
  }

  if (status === 'ambiguous' && secondBest) {
    diagnostics.push({
      severity: 'warning',
      code: 'AMBIGUOUS_MATCH',
      message: 'Flera subprocesser matchar nästan lika bra.',
      context: {
        callActivityId: callActivity.id,
        bestScore: bestCandidate.score,
        secondScore: secondBest.score,
      },
      timestamp: TIMESTAMP(),
    });
  } else if (status === 'lowConfidence') {
    diagnostics.push({
      severity: 'warning',
      code: 'LOW_CONFIDENCE_MATCH',
      message: 'Endast lågkonfidensmatchning hittades för Call Activity.',
      context: {
        callActivityId: callActivity.id,
        score: bestCandidate.score,
        threshold: mergedConfig.fuzzyThreshold,
      },
      timestamp: TIMESTAMP(),
    });
  }

  return {
    callActivityId: callActivity.id,
    callActivityName: callActivity.name,
    calledElement: callActivity.calledElement,
    matchedProcessId: bestCandidate.processId,
    matchedFileName: bestCandidate.fileName,
    matchStatus: status,
    confidence: bestCandidate.score,
    candidates: evaluatedCandidates,
    diagnostics,
  };
}

function deriveStatus(
  best: MatchCandidate,
  second: MatchCandidate | undefined,
  config: Required<SubprocessMatcherConfig>,
): SubprocessLink['matchStatus'] {
  if (!best || best.score === 0) {
    return 'unresolved';
  }
  if (second && second.score >= best.score - config.ambiguityDelta) {
    return 'ambiguous';
  }
  if (best.score < config.fuzzyThreshold) {
    return 'lowConfidence';
  }
  return 'matched';
}

function evaluateCandidate(
  callActivity: {
    id: string;
    name?: string;
    calledElement?: string;
    kind?: 'callActivity' | 'subProcess';
  },
  candidate: ProcessDefinition,
): MatchCandidate {
  const reasons: string[] = [];
  let score = 0;

  score = pickBestScore(
    score,
    reasons,
    () =>
      equals(callActivity.calledElement, candidate.id) && MATCH_SCORES.calledElementProcessId,
    'calledElement matchade processens ID',
  );

  score = pickBestScore(
    score,
    reasons,
    () =>
      equals(callActivity.calledElement, candidate.name) &&
      MATCH_SCORES.calledElementProcessName,
    'calledElement matchade processens namn',
  );

  score = pickBestScore(
    score,
    reasons,
    () => equals(callActivity.id, candidate.id) && MATCH_SCORES.callActivityIdProcessId,
    'Call Activity ID matchade processens ID',
  );

  score = pickBestScore(
    score,
    reasons,
    () =>
      normalizedEquals(callActivity.name, candidate.name) &&
      MATCH_SCORES.callActivityNameProcessName,
    'Call Activity-namnet matchade processens namn',
  );

  const callActivityName = normalize(callActivity.name);
  const calledElement = normalize(callActivity.calledElement);
  const candidateProcessName = normalize(candidate.name);
  const candidateProcessId = normalize(candidate.id);
  const candidateFileBase = normalize(stripBpmnExtension(candidate.fileName));
  const stripCommonPrefix = (value: string) =>
    value.replace(/^mortgage-se-/, '').replace(/^mortgage-/, '');
  const candidateFileBaseNoPrefix = stripCommonPrefix(candidateFileBase);

  score = pickBestScore(
    score,
    reasons,
    () => {
      if (
        (callActivityName && callActivityName === candidateFileBase) ||
        (calledElement && calledElement === candidateFileBase)
      ) {
        return MATCH_SCORES.fileNameHeuristic;
      }
      if (
        callActivityName &&
        (candidateFileBase.endsWith(callActivityName) || candidateFileBaseNoPrefix.endsWith(callActivityName))
      ) {
        return MATCH_SCORES.fileNameHeuristic;
      }
      if (
        calledElement &&
        (candidateFileBase.endsWith(calledElement) || candidateFileBaseNoPrefix.endsWith(calledElement))
      ) {
        return MATCH_SCORES.fileNameHeuristic;
      }
      return 0;
    },
    'Filnamnsheuristik matchade subprocess',
  );

  const fuzzyTargets = [
    candidateProcessName,
    candidateFileBase,
    candidateProcessId,
  ].filter(Boolean) as string[];
  const fuzzyScore = computeFuzzyScore(
    callActivityName || calledElement || '',
    fuzzyTargets,
  );

  score = pickBestScore(
    score,
    reasons,
    () => fuzzyScore,
    `Fuzzy-matchning (${fuzzyScore.toFixed(2)})`,
  );

  return {
    processId: candidate.id,
    processName: candidate.name ?? candidate.id,
    fileName: candidate.fileName,
    score,
    reason: reasons[reasons.length - 1] ?? 'Ingen träff',
  };
}

function computeFuzzyScore(source: string, targets: string[]): number {
  if (!source || targets.length === 0) return 0;
  const sourceNorm = normalize(source);
  if (!sourceNorm) return 0;

  const best = targets.reduce((max, target) => {
    const value = diceCoefficient(sourceNorm, target);
    return value > max ? value : max;
  }, 0);

  // Scale fuzzy values so a perfect similarity tops out below deterministic matches.
  return best * 0.7;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (str: string) => {
    const grams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i += 1) {
      const gram = str.slice(i, i + 2);
      grams.set(gram, (grams.get(gram) ?? 0) + 1);
    }
    return grams;
  };

  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);

  let intersection = 0;
  aBigrams.forEach((count, gram) => {
    if (bBigrams.has(gram)) {
      intersection += Math.min(count, bBigrams.get(gram)!);
    }
  });

  const total = a.length - 1 + (b.length - 1);
  return total === 0 ? 0 : (2 * intersection) / total;
}

function pickBestScore(
  currentScore: number,
  reasons: string[],
  scorer: () => number | false,
  reason: string,
): number {
  const result = scorer();
  if (typeof result === 'number' && result > currentScore) {
    reasons.push(reason);
    return result;
  }
  return currentScore;
}

function equals(a?: string | null, b?: string | null): boolean {
  return Boolean(a) && Boolean(b) && a === b;
}

function normalizedEquals(a?: string | null, b?: string | null): boolean {
  const normA = normalize(a);
  const normB = normalize(b);
  return Boolean(normA) && Boolean(normB) && normA === normB;
}

function normalize(value?: string | null): string {
  return (value ?? '').toLowerCase().trim().replace(/[\s_]+/g, '-');
}

function stripBpmnExtension(fileName: string): string {
  return fileName.replace(/\.bpmn$/i, '').replace(/^\/?public\//, '');
}
