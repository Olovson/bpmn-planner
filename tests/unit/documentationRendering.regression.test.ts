import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderFeatureGoalDoc,
  renderEpicDoc,
  renderBusinessRuleDoc,
  __setUseSchemaRenderingForTests,
} from '@/lib/documentationTemplates';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import { normalizeHtml } from '../utils/htmlNormalize';

// Mock LLM content for Feature Goal
const mockFeatureGoalLlmContent = JSON.stringify({
  summary: 'Application Assessment samlar och koordinerar ett antal epics för att skapa ett sammanhängande kreditflöde med tydlig ansvarsfördelning och spårbarhet. Feature Goalet säkerställer att rätt data, regler och interaktioner finns på plats för att fatta välgrundade kreditbeslut.',
  flowSteps: [
    'Initiativet startar i Start Application när en kreditprocess initieras.',
    'Application Assessment samlar in, koordinerar och kvalitetssäkrar data och beslut från ingående epics.',
    'Regler och policystöd appliceras på ett konsekvent sätt för att möjliggöra välgrundade kreditbeslut.',
    'Resultat och status förs vidare till Collect Applicant Data och vidare in i efterföljande processer.',
  ],
  dependencies: [
    'Beroende: Process; Id: application-initiation; Beskrivning: Ansökan måste vara initierad innan processen kan starta.',
  ],
  userStories: [
    {
      id: 'US-1',
      role: 'Kund',
      goal: 'skapa ansökan',
      value: 'jag kan ansöka om lån',
      acceptanceCriteria: [
        'Systemet ska validera att alla obligatoriska fält är ifyllda',
        'Systemet ska visa tydliga felmeddelanden om fält saknas',
      ],
    },
    {
      id: 'US-2',
      role: 'Handläggare',
      goal: 'få komplett ansökningsdata',
      value: 'spara tid genom att få all data på ett ställe',
      acceptanceCriteria: [
        'Systemet ska samla data från alla relevanta källor',
        'Systemet ska presentera data på ett strukturerat sätt',
      ],
    },
  ],
});

// Mock LLM content for Epic
const mockEpicLlmContent = JSON.stringify({
  summary: 'Approve Application är ett delsteg i kreditflödet som säkerställer att rätt data, regler och interaktioner hanteras innan processen går vidare. Epiken bidrar till en spårbar och begriplig kreditprocess för både kund och interna användare.',
  flowSteps: [
    'Användaren öppnar vyn och ser sammanfattad ansöknings- och kundinformation.',
    'Formulär eller val presenteras baserat på föregående steg och riskprofil.',
    'Användaren fyller i eller bekräftar uppgifter och skickar vidare.',
    'Systemet validerar indata och uppdaterar processens status samt triggar nästa steg.',
  ],
  userStories: [
    {
      id: 'US-1',
      role: 'Handläggare',
      goal: 'godkänna ansökan',
      value: 'kunna fatta välgrundade beslut snabbt',
      acceptanceCriteria: [
        'Systemet ska visa all relevant information för beslutet',
        'Systemet ska logga beslutet för spårbarhet',
      ],
    },
    {
      id: 'US-2',
      role: 'Kund',
      goal: 'få besked om min ansökan',
      value: 'kunna planera min ekonomi',
      acceptanceCriteria: [
        'Systemet ska meddela kunden om beslutet',
        'Systemet ska förklara nästa steg',
      ],
    },
    {
      id: 'US-3',
      role: 'Processägare',
      goal: 'säkerställa konsekvent beslutsfattande',
      value: 'följa bankens policy och regler',
      acceptanceCriteria: [
        'Systemet ska följa definierade regler och policy',
        'Systemet ska logga alla beslut för granskning',
      ],
    },
  ],
  dependencies: [
    'Beroende: Process; Id: previous-step; Beskrivning: Föregående steg måste vara slutfört.',
  ],
});

// Mock LLM content for Business Rule
const mockBusinessRuleLlmContent = JSON.stringify({
  summary: 'Eligibility Rule kombinerar flera risk- och kreditparametrar för att avgöra om en ansökan kan godkännas, ska skickas till manuell granskning eller avslås. Regeln säkerställer konsekvent tillämpning av kreditpolicy och riskmandat för målgrupperna.',
  inputs: [
    'Fält: riskScore; Datakälla: Kreditmotor / UC; Typ: Tal (0–1000); Obligatoriskt: Ja; Validering: Inom definierat intervall; Felhantering: Avslå eller skicka till manuell granskning',
    'Fält: debtToIncomeRatio; Datakälla: Intern beräkning; Typ: Decimal; Obligatoriskt: Ja; Validering: >= 0; Felhantering: Flagga för manuell granskning vid saknade data',
    'Fält: loanToValue; Datakälla: Fastighetsvärdering; Typ: Procent; Obligatoriskt: Ja; Validering: 0–100 %; Felhantering: Avslå vid orimliga värden',
  ],
  decisionLogic: [
    'Hög riskScore och måttlig skuldsättning ger normalt auto-approve.',
    'Mellanrisk eller ofullständig data leder till manuell granskning.',
    'Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline.',
  ],
  outputs: [
    'Outputtyp: Beslut; Typ: APPROVE, REFER (manuell granskning) eller DECLINE; Effekt: Processpåverkan: fortsätter till Final Decision vid APPROVE, pausas i manuell kö vid REFER, avslutas vid DECLINE',
    'Outputtyp: Flaggor; Typ: t.ex. hög skuldsättning, bristfällig dokumentation, sanktions-/fraudträff; Effekt: Används för vidare analys och beslutsfattande',
    'Outputtyp: Loggning; Typ: beslut, huvudparametrar och regelversion; Effekt: Loggas för audit och spårbarhet',
  ],
  businessRulesPolicy: [
    'Stödjer intern kreditpolicy och mandat för respektive produkt och segment.',
    'Bygger på dokumenterade riskramverk och beslutsmodeller.',
    'Tar hänsyn till regulatoriska krav (t.ex. konsumentkreditlag, AML/KYC) på en övergripande nivå.',
  ],
  scenarios: [
    {
      id: 'BR1',
      name: 'Standardkund med låg risk',
      type: 'Happy',
      outcome: 'Beslut: APPROVE utan manuell granskning.',
    },
    {
      id: 'BR2',
      name: 'Kund med hög skuldsättning',
      type: 'Edge',
      outcome: 'Beslut: REFER till manuell granskning med tydlig flagga.',
    },
    {
      id: 'BR3',
      name: 'Kund med allvarliga betalningsanmärkningar',
      type: 'Error',
      outcome: 'Beslut: DECLINE enligt exklusionskriterier.',
    },
  ],
});

const buildFeatureGoalContext = (): NodeDocumentationContext => {
  const featureNode = {
    id: 'mortgage:Call_Feature',
    name: 'Application Assessment',
    type: 'callActivity' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Call_Feature',
    children: [] as any[],
  };

  const upstreamNode = {
    id: 'mortgage:Task_Start',
    name: 'Start Application',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Start',
    children: [] as any[],
  };

  const epicNode = {
    id: 'mortgage:Task_Epic',
    name: 'Collect Applicant Data',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Epic',
    children: [] as any[],
  };

  return {
    node: featureNode as any,
    parentChain: [upstreamNode as any],
    childNodes: [epicNode as any],
    siblingNodes: [],
    descendantNodes: [epicNode as any],
  };
};

const buildEpicContext = (): NodeDocumentationContext => {
  const epicNode = {
    id: 'mortgage:Task_Approve',
    name: 'Approve Application',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Approve',
    children: [] as any[],
  };

  const upstreamNode = {
    id: 'mortgage:Task_Previous',
    name: 'Previous Step',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.mpmn',
    bpmnElementId: 'Task_Previous',
    children: [] as any[],
  };

  const downstreamNode = {
    id: 'mortgage:Task_Next',
    name: 'Next Step',
    type: 'serviceTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Next',
    children: [] as any[],
  };

  return {
    node: epicNode as any,
    parentChain: [upstreamNode as any],
    childNodes: [downstreamNode as any],
    siblingNodes: [],
    descendantNodes: [],
  };
};

const buildBusinessRuleContext = (): NodeDocumentationContext => {
  const ruleNode = {
    id: 'mortgage:Rule_Eligibility',
    name: 'Eligibility Rule',
    type: 'businessRuleTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Rule_Eligibility',
    children: [] as any[],
  };

  const upstreamNode = {
    id: 'mortgage:Task_Scoring',
    name: 'Run Scoring',
    type: 'serviceTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Scoring',
    children: [] as any[],
  };

  const downstreamNode = {
    id: 'mortgage:Task_Decision',
    name: 'Final Decision',
    type: 'userTask' as const,
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'Task_Decision',
    children: [] as any[],
  };

  return {
    node: ruleNode as any,
    parentChain: [upstreamNode as any],
    childNodes: [downstreamNode as any],
    siblingNodes: [],
    descendantNodes: [],
  };
};

const links = {
  bpmnViewerLink: '#/bpmn/mortgage.bpmn',
  docLink: undefined,
  dorLink: undefined,
  testLink: 'tests/mortgage.example.spec.ts',
  dmnLink: '/dmn/example.dmn',
};

describe('documentation rendering regression (legacy vs schema)', () => {
  beforeEach(() => {
    __setUseSchemaRenderingForTests(false);
  });

  afterEach(() => {
    __setUseSchemaRenderingForTests(false);
  });

  it('Feature Goal legacy HTML matches snapshot and equals schema HTML (normalized)', async () => {
    const ctx = buildFeatureGoalContext();

    __setUseSchemaRenderingForTests(false);
    const legacyHtml = await renderFeatureGoalDoc(ctx, links, mockFeatureGoalLlmContent);
    const legacyNormalized = normalizeHtml(legacyHtml);

    expect(legacyNormalized).toMatchSnapshot('feature-goal-legacy');

    __setUseSchemaRenderingForTests(true);
    const schemaHtml = await renderFeatureGoalDoc(ctx, links, mockFeatureGoalLlmContent);
    const schemaNormalized = normalizeHtml(schemaHtml);

    expect(schemaNormalized).toBe(legacyNormalized);
  });

  it('Epic legacy HTML matches snapshot and equals schema HTML (normalized)', async () => {
    const ctx = buildEpicContext();

    __setUseSchemaRenderingForTests(false);
    const legacyHtml = await renderEpicDoc(ctx, links, mockEpicLlmContent);
    const legacyNormalized = normalizeHtml(legacyHtml);

    expect(legacyNormalized).toMatchSnapshot('epic-legacy');

    __setUseSchemaRenderingForTests(true);
    const schemaHtml = await renderEpicDoc(ctx, links, mockEpicLlmContent);
    const schemaNormalized = normalizeHtml(schemaHtml);

    expect(schemaNormalized).toBe(legacyNormalized);
  });

  it('Business Rule legacy HTML matches snapshot and equals schema HTML (normalized)', async () => {
    const ctx = buildBusinessRuleContext();

    __setUseSchemaRenderingForTests(false);
    const legacyHtml = await renderBusinessRuleDoc(ctx, links, mockBusinessRuleLlmContent);
    const legacyNormalized = normalizeHtml(legacyHtml);

    expect(legacyNormalized).toMatchSnapshot('business-rule-legacy');

    __setUseSchemaRenderingForTests(true);
    const schemaHtml = await renderBusinessRuleDoc(ctx, links, mockBusinessRuleLlmContent);
    const schemaNormalized = normalizeHtml(schemaHtml);

    expect(schemaNormalized).toBe(legacyNormalized);
  });
});
