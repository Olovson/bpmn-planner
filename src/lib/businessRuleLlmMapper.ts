import type {
  BusinessRuleDocModel,
  BusinessRuleLlmSections,
  BusinessRuleScenario,
} from './businessRuleDocTypes';
import type {
  ScenarioAssertionType,
  ScenarioPersona,
  ScenarioRiskLevel,
  ScenarioUiStep,
} from './epicDocTypes';

const stripText = (value: string): string =>
  value
    .replace(/\s+/g, ' ')
    .trim();

function createEmptyBusinessRuleModel(): BusinessRuleDocModel {
  return {
    summary: '',
    inputs: [],
    decisionLogic: [],
    outputs: [],
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
      .map((v) => (typeof v === 'string' ? stripText(v) : ''))
      .filter((v) => v.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return [stripText(value)];
  }
  return [];
}

function parseScenarioPersona(value: unknown): ScenarioPersona | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().toLowerCase();
  if (['customer', 'advisor', 'system', 'unknown'].includes(trimmed)) {
    return trimmed as ScenarioPersona;
  }
  return undefined;
}

function parseScenarioRiskLevel(value: unknown): ScenarioRiskLevel | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().toUpperCase();
  if (['P0', 'P1', 'P2'].includes(trimmed)) {
    return trimmed as ScenarioRiskLevel;
  }
  return undefined;
}

function parseScenarioAssertionType(value: unknown): ScenarioAssertionType | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().toLowerCase();
  if (['functional', 'regression', 'compliance', 'other'].includes(trimmed)) {
    return trimmed as ScenarioAssertionType;
  }
  return undefined;
}

function parseScenarioUiStep(value: unknown): ScenarioUiStep | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as any;
  const pageId = typeof obj.pageId === 'string' ? obj.pageId.trim() : '';
  const action = typeof obj.action === 'string' ? obj.action.trim() : '';
  if (!pageId || !action) return null;
  return {
    pageId,
    action,
    locatorId: typeof obj.locatorId === 'string' ? obj.locatorId.trim() : undefined,
    dataProfileId: typeof obj.dataProfileId === 'string' ? obj.dataProfileId.trim() : undefined,
  };
}

function parseScenarioUiFlow(value: unknown): ScenarioUiStep[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(parseScenarioUiStep).filter((step): step is ScenarioUiStep => step !== null);
  }
  const singleStep = parseScenarioUiStep(value);
  return singleStep ? [singleStep] : [];
}

function parseStructuredBusinessRule(rawContent: string): BusinessRuleDocModel | null {
  const parsed = tryParseJson(rawContent);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as any as BusinessRuleLlmSections;
  const model = createEmptyBusinessRuleModel();

  if (typeof obj.summary === 'string') {
    model.summary = stripText(obj.summary);
  }

  model.inputs = coerceStringArray((obj as any).inputs);
  model.decisionLogic = coerceStringArray((obj as any).decisionLogic);
  model.outputs = coerceStringArray((obj as any).outputs);
  model.businessRulesPolicy = coerceStringArray((obj as any).businessRulesPolicy);

  if (Array.isArray((obj as any).scenarios)) {
    for (const item of (obj as any).scenarios as BusinessRuleScenario[]) {
      if (!item || typeof item !== 'object') continue;
      const scenario: BusinessRuleScenario = {
        id: typeof item.id === 'string' ? stripText(item.id) : '',
        name: typeof item.name === 'string' ? stripText(item.name) : '',
        input: typeof item.input === 'string' ? stripText(item.input) : '',
        outcome: typeof item.outcome === 'string' ? stripText(item.outcome) : '',
        type: typeof item.type === 'string' ? stripText(item.type) : undefined,
      };
      
      // Parse optional new fields
      const persona = parseScenarioPersona(item.persona);
      if (persona) scenario.persona = persona;
      
      const riskLevel = parseScenarioRiskLevel(item.riskLevel);
      if (riskLevel) scenario.riskLevel = riskLevel;
      
      const assertionType = parseScenarioAssertionType(item.assertionType);
      if (assertionType) scenario.assertionType = assertionType;
      
      if (typeof item.dataProfileId === 'string' && item.dataProfileId.trim()) {
        scenario.dataProfileId = item.dataProfileId.trim();
      }
      
      const uiFlow = parseScenarioUiFlow(item.uiFlow);
      if (uiFlow.length > 0) scenario.uiFlow = uiFlow;
      
      if (scenario.id || scenario.name || scenario.outcome) {
        model.scenarios.push(scenario);
      }
    }
  }

  if (typeof (obj as any).testDescription === 'string') {
    model.testDescription = stripText((obj as any).testDescription);
  }

  model.implementationNotes = coerceStringArray((obj as any).implementationNotes);
  model.relatedItems = coerceStringArray((obj as any).relatedItems);

  const hasContent =
    model.summary ||
    model.inputs.length > 0 ||
    model.decisionLogic.length > 0 ||
    model.outputs.length > 0 ||
    model.businessRulesPolicy.length > 0 ||
    model.scenarios.length > 0 ||
    model.testDescription ||
    model.implementationNotes.length > 0 ||
    model.relatedItems.length > 0;

  return hasContent ? model : null;
}

function parseBusinessRuleWithFallback(rawContent: string): BusinessRuleDocModel {
  const model = createEmptyBusinessRuleModel();
  if (!rawContent || !rawContent.trim()) return model;
  model.summary = stripText(rawContent);
  return model;
}

let ALLOW_FALLBACK = true;

// Test-only hook: låter t.ex. LLM-smoke-tester slå av fallback
// för att verifiera att modellen returnerar strukturerad JSON enligt kontraktet.
export const __setAllowBusinessRuleLlmFallbackForTests = (value: boolean) => {
  ALLOW_FALLBACK = value;
};

export function mapBusinessRuleLlmToSections(rawContent: string): BusinessRuleDocModel {
  const structured = parseStructuredBusinessRule(rawContent);
  if (structured) return structured;
  if (!ALLOW_FALLBACK) {
    throw new Error(
      'Business Rule LLM response did not match structured JSON contract (no structured sections, fallback disabled)',
    );
  }
  return parseBusinessRuleWithFallback(rawContent);
}
