import type {
  BusinessRuleDocModel,
  BusinessRuleLlmSections,
} from './businessRuleDocTypes';

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
      .filter((v) => {
        if (!v || v.length === 0) return false;
        // Ignorera strängar som bara består av skiljetecken (t.ex. ",")
        return /[A-Za-zÅÄÖåäö0-9]/.test(v);
      });
  }
  if (typeof value === 'string' && value.trim()) {
    const s = stripText(value);
    // Ignorera triviala värden som bara är skiljetecken
    if (!/[A-Za-zÅÄÖåäö0-9]/.test(s)) {
      return [];
    }
    return [s];
  }
  return [];
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
  model.relatedItems = coerceStringArray((obj as any).relatedItems);

  const hasContent =
    model.summary ||
    model.inputs.length > 0 ||
    model.decisionLogic.length > 0 ||
    model.outputs.length > 0 ||
    model.businessRulesPolicy.length > 0 ||
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
