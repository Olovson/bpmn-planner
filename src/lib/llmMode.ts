export type LlmGenerationMode = 'fast' | 'slow';

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
  value === 'fast' || value === 'slow';

const MODE_CONFIG: Record<LlmGenerationMode, LlmModeConfig> = {
  fast: {
    key: 'fast',
    label: 'Fast LLM mode (snabb, kortfattad)',
    description: 'Snabb generering med korta, fokuserade sektioner.',
    speedCaption: 'Rekommenderas i utveckling – prioriterar hastighet.',
    runHint: 'Genererar 1–2 meningar per sektion. Bra vid många iterationer.',
    docGuidance: 'Fokusera på 1–2 meningar eller ett fåtal bullets per sektion. Ta endast med mest kritiska datapunkter.',
    docTone: 'Direkt och koncis ton utan onödiga exempel.',
    docMaxTokens: 150,
    docTemperature: 0.2,
    docExtraInstruction: 'Undvik upprepningar mellan sektioner.',
    testGuidance: 'Generera ett fåtal representativa scenarier med fokus på happy-path, edge-case och error-case.',
    testScenarioRange: '2–3 scenarier',
    testMinScenarios: 2,
    testMaxScenarios: 3,
    testMaxTokens: 200,
    testTemperature: 0.2,
  },
  slow: {
    key: 'slow',
    label: 'Slow LLM mode (full kvalitet)',
    description: 'Mer kontext, exempel och täckning av beroenden.',
    speedCaption: 'Långsammare men med rikare innehåll.',
    runHint: 'Bra när du behöver slutligt material för delning.',
    docGuidance: 'Avsätt 3–4 meningar eller bullets per sektion med konkreta exempel och tydliga beroenden.',
    docTone: 'Strategiskt språk med fokus på sammanhang och konsekvenser.',
    docMaxTokens: 1800,
    docTemperature: 0.35,
    docExtraInstruction: 'Lyft gärna upp till två exempel per sektion om relevant.',
    testGuidance: 'Generera flera scenarier med variation (happy-path, error-case, edge-case).',
    testScenarioRange: '3–5 scenarier',
    testMinScenarios: 3,
    testMaxScenarios: 5,
    testMaxTokens: 900,
    testTemperature: 0.3,
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
