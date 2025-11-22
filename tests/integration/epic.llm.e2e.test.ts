import { describe, it, expect, vi } from 'vitest';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import {
  renderEpicDocFromLlm,
  type TemplateLinks,
} from '@/lib/documentationTemplates';
import { generateDocumentationWithLlm } from '@/lib/llmDocumentation';

const STRUCTURED_EPIC_JSON = JSON.stringify(
  {
    summary:
      'Approve Application säkerställer att ansökan granskas, kompletteras vid behov och förs vidare till beslut med korrekt information.',
    prerequisites: [
      'Grundläggande kund- och ansökningsdata är validerad.',
      'Eventuella föregående KYC/AML- och identitetskontroller är godkända.',
    ],
    inputs: [
      'Input: sammanfattad ansökningsdata från föregående steg.',
      'Input: interna risk- och engagemangsflaggor.',
    ],
    flowSteps: [
      'Användaren öppnar vyn och ser sammanfattad ansöknings- och kundinformation.',
      'Formulär eller val presenteras baserat på föregående steg och riskprofil.',
      'Användaren fyller i eller bekräftar uppgifter och skickar vidare.',
      'Systemet validerar indata och uppdaterar status samt triggar nästa steg.',
    ],
    interactions: [
      'Kanal: web/app eller internt handläggargränssnitt.',
      'Felmeddelanden ska vara begripliga och vägleda användaren till rätt åtgärd.',
    ],
    dataContracts: [
      'Input: Previous Step – underlag som triggar epiken.',
      'Output: Next Step – status, flaggor och berikad data.',
    ],
    businessRulesPolicy: [
      'Epiken använder relevanta Business Rules / DMN‑beslut för kreditbedömning.',
    ],
    scenarios: [
      {
        id: 'EPIC-S1',
        name: 'Happy path',
        type: 'Happy',
        description:
          'Komplett ansökan utan avvikelser där beslut kan fattas direkt.',
        outcome:
          'Epiken slutförs utan avvikelser och processen går vidare till nästa steg.',
      },
      {
        id: 'EPIC-S2',
        name: 'Valideringsfel',
        type: 'Edge',
        description:
          'Användaren lämnar ofullständig eller inkonsekvent information.',
        outcome:
          'Fel visas/loggas och användaren kan rätta indata innan processen går vidare.',
      },
    ],
    testDescription:
      'Scenarierna ovan ska mappas mot automatiska tester där scenario-ID och namn återanvänds i testfall.',
    implementationNotes: [
      'Approve Application exponeras via intern UI-komponent och bakomliggande API.',
    ],
    relatedItems: ['Relaterad Business Rule: Eligibility Rule.'],
  },
  null,
  2,
);

const generateChatCompletionMock = vi.fn(async () => STRUCTURED_EPIC_JSON);

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

describe('Epic LLM JSON → modell → HTML', () => {
  it('använder strukturerad LLM-output för att rendera Epic-dokumentation', async () => {
    const node: BpmnProcessNode = {
      id: 'mortgage:Task_Approve',
      name: 'Approve Application',
      type: 'userTask',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Task_Approve',
      children: [],
    } as any;

    const parentNode: BpmnProcessNode = {
      id: 'mortgage:Task_Previous',
      name: 'Previous Step',
      type: 'userTask',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Task_Previous',
      children: [],
    } as any;

    const nextNode: BpmnProcessNode = {
      id: 'mortgage:Task_Next',
      name: 'Next Step',
      type: 'serviceTask',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Task_Next',
      children: [],
    } as any;

    const context: NodeDocumentationContext = {
      node,
      parentChain: [parentNode],
      childNodes: [nextNode],
      siblingNodes: [],
      descendantNodes: [],
    };

    const links: TemplateLinks = {
      bpmnViewerLink: '#/bpmn/mortgage.bpmn',
      dorLink: undefined,
      testLink: 'tests/mortgage.approve-application.spec.ts',
      docLink: undefined,
      dmnLink: undefined,
    };

    const raw = await generateDocumentationWithLlm('epic', context, links);

    expect(generateChatCompletionMock).toHaveBeenCalledTimes(1);
    expect(raw).toBeTruthy();

    const html = renderEpicDocFromLlm(context, links, raw || '');

    expect(html).toContain('Epic');
    expect(html).toContain('Syfte &amp; Scope');
    expect(html).toContain('Approve Application');
    expect(html).toContain('Happy path');
    expect(html).toContain('Valideringsfel');
  });
});

