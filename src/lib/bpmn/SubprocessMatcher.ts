import type {
  ProcessDefinition,
  SubprocessLink,
  MatchCandidate,
  DiagnosticsEntry,
} from './types';
import type { BpmnMap } from './bpmnMapLoader';
import { matchCallActivityUsingMap } from './bpmnMapLoader';

export type SubprocessMatcherConfig = {
  fuzzyThreshold?: number;
  ambiguityDelta?: number;
  bpmnMap?: BpmnMap;
  currentBpmnFile?: string; // BPMN-filen som callActivity tillhör
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
  
  // VIKTIGT: Försök först matcha via bpmn-map.json om det finns
  if (config.bpmnMap && config.currentBpmnFile) {
    const mapMatch = matchCallActivityUsingMap(
      callActivity,
      config.currentBpmnFile,
      config.bpmnMap,
    );
    
    if (mapMatch.matchedFileName) {
      // Hjälpfunktion för att extrahera bara filnamnet från en sökväg
      const getFileNameOnly = (pathOrName: string): string => {
        if (pathOrName.includes('/')) {
          return pathOrName.split('/').pop() || pathOrName;
        }
        return pathOrName;
      };
      
      // Normalisera matchedFileName från bpmn-map.json (kan vara bara filnamn)
      const normalizedMatchedFileName = getFileNameOnly(mapMatch.matchedFileName);
      
      // Hitta kandidaten som matchar filnamnet från bpmn-map.json
      // Jämför både med full sökväg och bara filnamnet (för att hantera både paths och korta filnamn)
      const matchedCandidate = candidates.find(
        (c) => {
          const candidateFileNameOnly = getFileNameOnly(c.fileName);
          return c.fileName === mapMatch.matchedFileName || 
                 candidateFileNameOnly === normalizedMatchedFileName ||
                 c.fileName === normalizedMatchedFileName;
        }
      );
      
      if (matchedCandidate) {
        // Returnera matchning baserad på bpmn-map.json
        return {
          callActivityId: callActivity.id,
          callActivityName: callActivity.name,
          calledElement: callActivity.calledElement,
          matchedProcessId: matchedCandidate.id,
          matchedFileName: matchedCandidate.fileName,
          confidence: 1.0, // Hög konfidens när matchning kommer från bpmn-map.json
          matchStatus: 'matched',
          matchSource: 'bpmn-map',
          candidates: [{
            processId: matchedCandidate.id,
            fileName: matchedCandidate.fileName,
            score: 1.0,
            reason: 'bpmn-map.json match',
          }],
          diagnostics: [],
        };
      } else {
        // VIKTIGT: Även om kandidaten inte finns bland kandidaterna (t.ex. filen inte är direkt nåbar),
        // returnera matchningen med matchedFileName så att den kan användas senare
        // Detta är viktigt för filer som inte är direkt nåbara från root-processen
        // Inte logga här - detta är normalt när filer inte är direkt synliga i kandidatlistan,
        // men systemet hanterar det korrekt genom att använda matchedFileName från bpmn-map.json
        
        // Returnera matchning med matchedFileName även om kandidaten saknas
        // matchedProcessId kan vara undefined, men matchedFileName är viktigare
        return {
          callActivityId: callActivity.id,
          callActivityName: callActivity.name,
          calledElement: callActivity.calledElement,
          matchedProcessId: undefined, // Kan inte hitta process ID om kandidaten saknas
          matchedFileName: mapMatch.matchedFileName, // Men filnamnet är känt från bpmn-map.json
          confidence: 1.0, // Hög konfidens när matchning kommer från bpmn-map.json
          matchStatus: 'matched', // Fortfarande matched eftersom bpmn-map.json säger det
          matchSource: 'bpmn-map',
          candidates: [],
          diagnostics: [],
        };
      }
    }
  }
  
  // Fallback till automatisk matchning om bpmn-map.json inte matchade
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
    if (DEBUG_ENABLED) {
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

  // Domän-specifik regel: "Automatic Credit Evaluation" ska starkt kopplas till
  // processen "mortgage-se-credit-evaluation" oavsett exakta stavningsskillnader.
  // Domänregel: koppla tekniska ID:t "credit-evaluation" till rätt subprocess.
  // Vi baserar detta på stabila, tekniska fält (calledElement / id),
  // inte på skärmnamn/översättningar som kan ändras över tid.
  const isAutomaticCreditEvaluation =
    calledElement === 'credit-evaluation' ||
    callActivityName === 'credit-evaluation';

  const candidateLooksLikeCreditEvaluation =
    candidateFileBase.includes('credit-evaluation') ||
    candidateProcessId.includes('credit-evaluation') ||
    candidateProcessName.includes('credit-evaluation');

  score = pickBestScore(
    score,
    reasons,
    () => {
      if (isAutomaticCreditEvaluation && candidateLooksLikeCreditEvaluation) {
        // Treat as near-perfect deterministic match, slightly below explicit map match
        return 0.95;
      }
      return 0;
    },
    'Domänregel: Automatic Credit Evaluation kopplad till credit-evaluation-subprocess',
  );

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
