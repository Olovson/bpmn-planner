export type LlmGenerationMode = 'fast' | 'extended';

interface LlmModeConfig {
  key: LlmGenerationMode;
  label: string;
  description: string;
  speedCaption: string;
  runHint: string;
  docGuidance: string;
  docTone: string;
  docMaxTokens: number;
  docTemperature: number;
  docExtraInstruction?: string;
  testGuidance: string;
  testScenarioRange: string;
  testMinScenarios: number;
  testMaxScenarios: number;
  testMaxTokens: number;
  testTemperature: number;
}

const STORAGE_KEY = 'bpmn-planner-llm-mode';

const envDefault = (import.meta.env?.VITE_LLM_MODE_DEFAULT ?? 'fast').toString().toLowerCase();

const isMode = (value: unknown): value is LlmGenerationMode =>
  value === 'fast' || value === 'extended';

const MODE_CONFIG: Record<LlmGenerationMode, LlmModeConfig> = {
  fast: {
    key: 'fast',
    label: 'Snabb',
    description: 'Snabb generering med fokuserade sektioner och komprimerade listor.',
    speedCaption: '≈30% snabbare – prioriterar kärninfo.',
    runHint: 'Kortare svar, perfekt vid många iterationer.',
    docGuidance: 'Fokusera på ett fåtal meningar eller 2–3 bullets per sektion. Ta med endast mest kritiska datapunkter.',
    docTone: 'Direkt och koncis ton utan onödiga exempel.',
    docMaxTokens: 1300,
    docTemperature: 0.2,
    docExtraInstruction: 'Undvik upprepningar mellan sektioner.',
    testGuidance: 'Generera exakt tre scenarier (ett happy-path, ett error-case, ett edge-case).',
    testScenarioRange: '3 scenarier',
    testMinScenarios: 3,
    testMaxScenarios: 3,
    testMaxTokens: 900,
    testTemperature: 0.3,
  },
  extended: {
    key: 'extended',
    label: 'Fördjupad',
    description: 'Mer kontext, exempel och täckning av beroenden.',
    speedCaption: 'Tar längre tid men fyller dokumenten rikligt.',
    runHint: 'Bra när du behöver slutligt material för delning.',
    docGuidance: 'Avsätt 3–4 meningar eller bullets per sektion med konkreta exempel och tydliga beroenden.',
    docTone: 'Strategiskt språk med fokus på sammanhang och konsekvenser.',
    docMaxTokens: 2400,
    docTemperature: 0.32,
    docExtraInstruction: 'Lyft gärna upp till två exempel per sektion om relevant.',
    testGuidance: 'Generera fyra till fem scenarier med variation (minst ett per typ).',
    testScenarioRange: '4–5 scenarier',
    testMinScenarios: 4,
    testMaxScenarios: 5,
    testMaxTokens: 1500,
    testTemperature: 0.4,
  },
};

let currentMode: LlmGenerationMode = isMode(envDefault) ? envDefault : 'fast';

if (typeof window !== 'undefined') {
  const storedValue = window.localStorage?.getItem(STORAGE_KEY);
  if (isMode(storedValue)) {
    currentMode = storedValue;
  }
}

export function getLlmGenerationMode(): LlmGenerationMode {
  return currentMode;
}

export function setLlmGenerationMode(mode: LlmGenerationMode) {
  currentMode = mode;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Unable to persist LLM mode:', error);
    }
  }
}

export function getLlmModeConfig(mode: LlmGenerationMode = currentMode): LlmModeConfig {
  return MODE_CONFIG[mode];
}

export const LLM_MODE_OPTIONS = (Object.values(MODE_CONFIG) as LlmModeConfig[]).map((config) => ({
  value: config.key,
  label: config.label,
  description: config.description,
  speedCaption: config.speedCaption,
  runHint: config.runHint,
}));
