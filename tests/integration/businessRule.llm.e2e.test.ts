import { describe, it, expect, vi } from 'vitest';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import {
  renderBusinessRuleDocFromLlm,
  type TemplateLinks,
} from '@/lib/documentationTemplates';
import { generateDocumentationWithLlm } from '@/lib/llmDocumentation';

const STRUCTURED_BUSINESS_RULE_JSON = JSON.stringify(
  {
    summary:
      'Eligibility Rule kombinerar risk- och kreditparametrar för att avgöra om en ansökan kan godkännas, skickas till manuell granskning eller avslås.',
    inputs: [
      'Fält: riskScore; Datakälla: Kreditmotor / UC; Typ: Tal (0–1000); Obligatoriskt: Ja; Validering: Inom definierat intervall; Felhantering: Avslå eller skicka till manuell granskning.',
    ],
    decisionLogic: [
      'Regeln kombinerar riskScore, skuldsättning och belåningsgrad för att klassificera ansökan som APPROVE, REFER eller DECLINE.',
    ],
    outputs: [
      'Outputtyp: beslut; Typ: APPROVE / REFER / DECLINE; Effekt: Styr om processen fortsätter, pausas eller avslutas; Loggning: beslut, huvudparametrar och regelversion loggas.',
    ],
    businessRulesPolicy: [
      'Stödjer intern kreditpolicy för skuldsättning, belåningsgrad och betalningsanmärkningar.',
    ],
    scenarios: [
      {
        id: 'BR1',
        name: 'Standardkund med låg risk',
        type: 'Happy',
        input: 'Stabil inkomst, låg skuldsättning, normal kreditdata.',
        outcome: 'APPROVE utan extra flaggor.',
      },
      {
        id: 'BR2',
        name: 'Kund med hög skuldsättning',
        type: 'Edge',
        input: 'Hög debt-to-income, flera befintliga krediter.',
        outcome: 'REFER till manuell granskning med flagga för hög skuldsättning.',
      },
    ],
    testDescription:
      'Affärs-scenarierna ska mappas mot automatiska tester där scenario-ID och namn återanvänds i testfil och testbeskrivning.',
    implementationNotes: [
      'Regeln implementeras i en DMN-tabell i bankens beslutstjänst.',
    ],
    relatedItems: [
      'Relaterad Business Rule: huvudbeslutsregel.',
      'Relaterad subprocess: kompletteringshantering.',
    ],
  },
  null,
  2,
);

const generateChatCompletionMock = vi.fn(async () => STRUCTURED_BUSINESS_RULE_JSON);

vi.mock('@/lib/llmClient', () => {
  return {
    isLlmEnabled: () => true,
    generateChatCompletion: (...args: any[]) => generateChatCompletionMock(...args),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        list: vi.fn(async () => ({ data: [], error: null })),
      })),
    },
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

describe('Business Rule LLM JSON → modell → HTML', () => {
  it('använder strukturerad LLM-output för att rendera Business Rule-dokumentation', async () => {
    const node: BpmnProcessNode = {
      id: 'mortgage:Rule_Eligibility',
      name: 'Eligibility Rule',
      type: 'businessRuleTask',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Rule_Eligibility',
      children: [],
    } as any;

    const parentNode: BpmnProcessNode = {
      id: 'mortgage:Task_Previous',
      name: 'Run Scoring',
      type: 'userTask',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Task_Previous',
      children: [],
    } as any;

    const context: NodeDocumentationContext = {
      node,
      parentChain: [parentNode],
      childNodes: [],
      siblingNodes: [],
      descendantNodes: [],
    };

    const links: TemplateLinks = {
      bpmnViewerLink: '#/bpmn/mortgage.bpmn',
      dorLink: undefined,
      testLink: 'tests/mortgage.eligibility-rule.spec.ts',
      docLink: undefined,
      dmnLink: '/dmn/eligibility-rule.dmn',
    };

    const raw = await generateDocumentationWithLlm('businessRule', context, links);

    expect(generateChatCompletionMock).toHaveBeenCalledTimes(1);
    expect(raw).toBeTruthy();

    const html = renderBusinessRuleDocFromLlm(context, links, raw || '');

    expect(html).toContain('Business Rule');
    expect(html).toContain('Sammanfattning &amp; scope');
    expect(html).toContain('Nyckelscenarier / testkriterier (affärsnivå)');
    expect(html).toContain('Standardkund med låg risk');
    expect(html).toContain('Kund med hög skuldsättning');
  });
});

