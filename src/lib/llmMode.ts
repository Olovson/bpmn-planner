export type LlmGenerationMode = 'slow';

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

const envDefault = (import.meta.env?.VITE_LLM_MODE_DEFAULT ?? 'slow').toString().toLowerCase();

const isMode = (value: unknown): value is LlmGenerationMode =>
  value === 'slow';

const MODE_CONFIG: Record<LlmGenerationMode, LlmModeConfig> = {
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

let currentMode: LlmGenerationMode = isMode(envDefault) ? envDefault : 'slow';

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
