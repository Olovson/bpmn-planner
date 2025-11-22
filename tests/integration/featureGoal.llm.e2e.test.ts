import { describe, it, expect, vi } from 'vitest';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import {
  renderFeatureGoalDocFromLlm,
  type TemplateLinks,
} from '@/lib/documentationTemplates';
import { generateDocumentationWithLlm } from '@/lib/llmDocumentation';

// Minimal, kritisk LLM-"end-to-end"-test för Feature Goals.
// Vi mockar själva LLM-klienten men låter:
//   NodeDocumentationContext → generateDocumentationWithLlm
//   → (JSON från "LLM") → renderFeatureGoalDocFromLlm
// köra med verklig mapper + HTML-builder.

const STRUCTURED_FEATURE_JSON = JSON.stringify(
  {
    summary:
      'Internal data gathering säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut.',
    scopeIncluded: [
      'Ingår: insamling av intern kund- och engagemangsdata.',
      'Ingår: kvalitetssäkring och berikning av data för kreditbeslut.',
    ],
    scopeExcluded: [
      'Ingår inte: externa kreditupplysningar (hanteras i separata steg).',
    ],
    epics: [
      {
        id: 'E1',
        name: 'Insamling av intern kunddata',
        description: 'Hämtar och sammanställer intern kund- och engagemangsdata.',
        team: 'Risk & Kredit',
      },
      {
        id: 'E2',
        name: 'Analys av intern data',
        description:
          'Analyserar insamlad data för att ta fram underlag till kreditbeslut.',
        team: 'Analys / Data',
      },
    ],
    flowSteps: [
      'Kunden skickar in en bolåneansökan.',
      'Systemet initierar insamling av intern kund- och engagemangsdata.',
      'Den insamlade datan analyseras och avvikelser flaggas.',
      'Resultaten görs tillgängliga för efterföljande beslutsteg.',
    ],
    dependencies: [
      'Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation.',
      'Beroende: Engagemangsdata; Id: internal-engagements; Beskrivning: visar befintliga krediter och säkerheter.',
    ],
    scenarios: [
      {
        id: 'S1',
        name: 'Komplett intern data tillgänglig',
        type: 'Happy',
        outcome: 'Data kan användas direkt för kreditbeslut utan manuell komplettering.',
      },
      {
        id: 'S2',
        name: 'Ofullständig intern data',
        type: 'Edge',
        outcome:
          'Ärendet flaggas för komplettering eller manuell granskning innan beslut fattas.',
      },
    ],
    testDescription:
      'Affärsscenarierna ovan ska mappas mot automatiska tester där scenario-ID och namn används i testfall och rapportering.',
    implementationNotes: [
      'Internal data gathering exponeras via interna API:er för kund- och engagemangsdata.',
      'Loggning ska inkludera vilka datakällor som användes och eventuella avvikelser.',
    ],
    relatedItems: [
      'Relaterad Business Rule: Eligibility Rule.',
      'Relaterad subprocess: Pre-screen party.',
    ],
  },
  null,
  2,
);

const generateChatCompletionMock = vi.fn(async () => STRUCTURED_FEATURE_JSON);

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

describe('Feature Goal LLM JSON → modell → HTML', () => {
  it('använder strukturerad LLM-output för att rendera Feature Goal-dokumentation', async () => {
    const node: BpmnProcessNode = {
      id: 'mortgage:Call_InternalData',
      name: 'Internal data gathering',
      type: 'callActivity',
      bpmnFile: 'mortgage-se-application.bpmn',
      bpmnElementId: 'internal-data-gathering',
      children: [],
      bpmnElement: undefined,
      element: undefined,
      missingDefinition: false,
      subprocessDiagnostics: [],
      subprocessFile: undefined,
      subprocessMatchStatus: undefined,
    } as any;

    const context: NodeDocumentationContext = {
      node,
      parentChain: [],
      childNodes: [],
      siblingNodes: [],
      descendantNodes: [],
    };

    const links: TemplateLinks = {
      bpmnViewerLink: '#/bpmn/mortgage-se-application.bpmn',
      dorLink: undefined,
      testLink: 'tests/nodes/mortgage/internal-data-gathering.spec.ts',
      docLink: undefined,
      dmnLink: undefined,
    };

    const raw = await generateDocumentationWithLlm('feature', context, links);

    expect(generateChatCompletionMock).toHaveBeenCalledTimes(1);
    expect(raw).toBeTruthy();

    const html = renderFeatureGoalDocFromLlm(context, links, raw || '');

    expect(html).toContain('Feature Goal');
    expect(html).toContain('Sammanfattning');
    expect(html).toContain('Ingående Epics');
    expect(html).toContain('Insamling av intern kunddata');
    expect(html).toContain('Analys av intern data');
  });
});
