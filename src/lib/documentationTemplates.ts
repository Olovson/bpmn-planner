import { NodeDocumentationContext } from './documentationContext';
import { getNodeDocViewerPath } from './nodeArtifactPaths';
import { mapFeatureGoalLlmToSections } from './featureGoalLlmMapper';
import type { FeatureGoalDocModel } from './featureGoalLlmTypes';
import type { EpicDocModel } from './epicDocTypes';
import { mapEpicLlmToSections } from './epicLlmMapper';
import type { BusinessRuleDocModel } from './businessRuleDocTypes';
import { mapBusinessRuleLlmToSections } from './businessRuleLlmMapper';

export interface TemplateLinks {
  bpmnViewerLink?: string;
  dorLink?: string;
  testLink?: string;
  docLink?: string;
  dmnLink?: string;
}

export type DocSectionId =
  | 'title-metadata'
  | 'summary'
  | 'scope'
  | 'inputs'
  | 'flow'
  | 'decision-logic'
  | 'outputs'
  | 'business-rules-policy'
  | 'business-scenarios'
  | 'test-linking'
  | 'implementation-notes'
  | 'related-items'
  | 'dependencies'
  | 'epics-overview';

export interface DocSectionConfig {
  id: DocSectionId;
  label: string;
  enabledByDefault?: boolean;
}

export interface DocTemplateSchema {
  id: string;
  sections: DocSectionConfig[];
}

type TemplateId = 'feature-goal' | 'epic' | 'business-rule';

// Master schema per nod-typ. Dessa används som referens för vilka sektioner
// som finns och i vilken ordning de förväntas visas. Själva renderingen
// använder idag fortfarande hårdkodade sektioner, men schemat är grunden
// för framtida konsolidering.

export const FEATURE_GOAL_DOC_SCHEMA: DocTemplateSchema = {
  id: 'feature-goal',
  sections: [
    { id: 'title-metadata', label: 'Titel & metadata', enabledByDefault: true },
    { id: 'summary', label: 'Sammanfattning', enabledByDefault: true },
    { id: 'scope', label: 'Omfattning & avgränsningar', enabledByDefault: true },
    { id: 'epics-overview', label: 'Ingående Epics', enabledByDefault: true },
    { id: 'flow', label: 'Affärsflöde', enabledByDefault: true },
    { id: 'dependencies', label: 'Kritiska beroenden', enabledByDefault: true },
    { id: 'business-scenarios', label: 'Affärs-scenarion & testbarhet', enabledByDefault: true },
    { id: 'test-linking', label: 'Koppling till automatiska tester', enabledByDefault: true },
    { id: 'implementation-notes', label: 'Implementation Notes (för dev)', enabledByDefault: true },
    { id: 'related-items', label: 'Relaterade regler / subprocesser', enabledByDefault: true },
  ],
};

export const EPIC_DOC_SCHEMA: DocTemplateSchema = {
  id: 'epic',
  sections: [
    { id: 'title-metadata', label: 'Titel & metadata', enabledByDefault: true },
    { id: 'summary', label: 'Syfte & värde', enabledByDefault: true },
    { id: 'inputs', label: 'Inputs', enabledByDefault: true },
    { id: 'flow', label: 'Funktionellt flöde', enabledByDefault: true },
    { id: 'outputs', label: 'Output', enabledByDefault: true },
    { id: 'business-rules-policy', label: 'Affärsregler & beroenden', enabledByDefault: true },
    { id: 'business-scenarios', label: 'Affärs-scenarion & testbarhet', enabledByDefault: true },
    { id: 'test-linking', label: 'Koppling till automatiska tester', enabledByDefault: true },
    { id: 'implementation-notes', label: 'Implementation notes', enabledByDefault: true },
    { id: 'related-items', label: 'Relaterade steg & artefakter', enabledByDefault: true },
  ],
};

export const BUSINESS_RULE_DOC_SCHEMA: DocTemplateSchema = {
  id: 'business-rule',
  sections: [
    { id: 'title-metadata', label: 'Titel & metadata', enabledByDefault: true },
    { id: 'summary', label: 'Sammanfattning', enabledByDefault: true },
    { id: 'inputs', label: 'Inputs & datakällor', enabledByDefault: true },
    { id: 'decision-logic', label: 'Beslutslogik (DMN / regler)', enabledByDefault: true },
    { id: 'outputs', label: 'Output & effekter', enabledByDefault: true },
    { id: 'business-rules-policy', label: 'Affärsregler & policystöd', enabledByDefault: true },
    { id: 'business-scenarios', label: 'Affärs-scenarion & testbarhet', enabledByDefault: true },
    { id: 'test-linking', label: 'Koppling till automatiska tester', enabledByDefault: true },
    { id: 'implementation-notes', label: 'Implementation notes (för dev)', enabledByDefault: true },
    { id: 'related-items', label: 'Relaterade regler / subprocesser', enabledByDefault: true },
  ],
};

// Gemensamt gränssnitt för framtida sections-renderers. I denna iteration
// är de endast förberedda som no-op-stubs – befintlig HTML-generering
// används fortfarande direkt i renderFeatureGoalDoc / renderEpicDoc /
// renderBusinessRuleDoc.

interface SectionRendererContext {
  templateId: TemplateId;
  context: NodeDocumentationContext;
  links: TemplateLinks;
}

const SECTION_RENDERERS: Partial<Record<DocSectionId, (ctx: SectionRendererContext) => string>> =
  {
    // I detta steg renderar vi hela dokument-body via title-metadata-sektionen
    // per template. Övriga sektioner kan successivt brytas ut vid behov.
    'title-metadata': (ctx) => {
      switch (ctx.templateId) {
        case 'feature-goal':
          return buildFeatureGoalDocHtmlFromModel(
            ctx.context,
            ctx.links,
            buildFeatureGoalDocModelFromContext(ctx.context),
          );
        case 'epic':
          return buildEpicDocHtmlFromModel(
            ctx.context,
            ctx.links,
            buildEpicDocModelFromContext(ctx.context),
          );
        case 'business-rule':
          return buildBusinessRuleDocBody(ctx.context, ctx.links);
        default:
          return '';
      }
    },
  };

let USE_SCHEMA_RENDERING = true;

// Test-only hook: låter tester toggla schema-rendering utan att ändra
// produktionsbeteende i källkoden.
export const __setUseSchemaRenderingForTests = (value: boolean) => {
  USE_SCHEMA_RENDERING = value;
};

function renderFromSchema(schema: DocTemplateSchema, ctx: SectionRendererContext): string {
  return schema.sections
    .map((section) => {
      const renderer = SECTION_RENDERERS[section.id];
      if (!renderer) return '';
      return renderer(ctx);
    })
    .join('\n');
}

function renderDocWithSchema(
  templateId: TemplateId,
  schema: DocTemplateSchema,
  context: NodeDocumentationContext,
  links: TemplateLinks,
): string {
  const node = context.node;
  const fallbackTitle =
    templateId === 'feature-goal'
      ? 'Feature Goal'
      : templateId === 'epic'
      ? 'Epic'
      : templateId === 'business-rule'
      ? 'Business Rule'
      : templateId;
  const title = node?.name || node?.bpmnElementId || fallbackTitle;
  const body = renderFromSchema(schema, { templateId, context, links });
  return wrapDocument(title, body);
}

export interface LlmMetadata {
  provider: 'cloud' | 'local';
  model: string;
}

export interface LlmHtmlRenderOptions {
  llmMetadata?: LlmMetadata;
  /**
   * När true visas en tydlig badge högst upp i dokumentet som markerar
   * att ChatGPT (moln-LLM) var otillgänglig och fallback har aktiverats.
   */
  fallbackBadge?: boolean;
  /**
   * Visas som detaljtext under badgen (t.ex. nätverksfel).
   */
  fallbackReason?: string;
  /**
   * Om LLM-fallback användes för att generera dokumentet.
   */
  fallbackUsed?: boolean;
  /**
   * Slutlig provider efter eventuell fallback.
   */
  finalProvider?: 'cloud' | 'local';
}

const escapeHtmlForBadge = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const wrapDocument = (
  title: string,
  body: string,
  options?: LlmMetadata | LlmHtmlRenderOptions
) => {
  let llmMetadata: LlmMetadata | undefined;
  let fallbackBadge = false;
  let fallbackReason: string | undefined;
  let fallbackUsed: boolean | undefined;
  let finalProvider: 'cloud' | 'local' | undefined;

  if (options) {
    if ('provider' in options) {
      llmMetadata = options;
    } else {
      llmMetadata = options.llmMetadata;
      fallbackBadge = Boolean(options.fallbackBadge);
      fallbackReason = options.fallbackReason;
      fallbackUsed = options.fallbackUsed;
      finalProvider = options.finalProvider;
    }
  }

  const dataAttrs: string[] = [];
  if (llmMetadata) {
    dataAttrs.push(`data-llm-provider="${llmMetadata.provider}"`);
    dataAttrs.push(`data-llm-model="${llmMetadata.model}"`);
  }
  if (typeof fallbackUsed === 'boolean') {
    dataAttrs.push(`data-llm-fallback-used="${fallbackUsed ? 'true' : 'false'}"`);
  }

  const docShellAttrs =
    dataAttrs.length > 0
      ? ` class="doc-shell" ${dataAttrs.join(' ')}`
      : ' class="doc-shell"';

  const fallbackBadgeHtml = fallbackBadge
    ? `
    <div class="llm-fallback-badge">
      ChatGPT (moln-LLM) otillgänglig — fallback aktiverad
    </div>${
      fallbackReason
        ? `
    <div class="llm-fallback-details">
      Orsak: ${escapeHtmlForBadge(fallbackReason)}
    </div>`
        : ''
    }`
    : '';
  const showFallbackBanner = fallbackUsed && finalProvider === 'local';
  const fallbackBannerHtml = showFallbackBanner
    ? `
    <div class="llm-fallback-banner">
      ChatGPT (moln-LLM) kunde inte nås. Detta dokument är genererat av lokal LLM (Ollama) som fallback.
    </div>`
    : '';
  
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --card-bg: #ffffff;
      --primary: #1d4ed8;
      --text-strong: #0f172a;
      --text-muted: #475569;
      --border: #e2e8f0;
      --accent: #dbeafe;
    }
    body {
      margin: 0;
      padding: 16px;
      background: #ffffff;
      color: var(--text-strong);
      line-height: 1.7;
    }
    .doc-shell {
      max-width: 960px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0 0 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }
    h2 {
      color: var(--primary);
      margin: 24px 0 12px;
      font-size: 1.1rem;
    }
    p { margin: 0 0 12px; }
    ul { padding-left: 20px; margin: 0 0 12px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      background: var(--card-bg);
      border: 1px solid var(--border);
    }
    table th,
    table td {
      border-bottom: 1px solid var(--border);
      padding: 8px;
      text-align: left;
    }
    table th {
      background: var(--accent);
      color: var(--primary);
      font-weight: 600;
    }
    table tr:last-child td {
      border-bottom: none;
    }
    .muted { color: var(--text-muted); font-size: 0.9rem; }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover { text-decoration: underline; }
    .doc-section {
      margin-bottom: 24px;
      padding: 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
    }
    .doc-section + .doc-section { margin-top: 16px; }
    .doc-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent);
      color: var(--primary);
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .llm-fallback-banner {
      padding: 8px 12px;
      margin-bottom: 16px;
      border-radius: 6px;
      background-color: #fefce8;
      color: #854d0e;
      border: 1px solid #fef9c3;
      font-size: 0.85rem;
    }
    .llm-fallback-badge {
      display: inline-block;
      padding: 4px 8px;
      margin-bottom: 12px;
      border-radius: 4px;
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeeba;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .llm-fallback-details {
      font-size: 0.8rem;
      color: #4b5563;
      margin-bottom: 16px;
      white-space: pre-wrap;
    }
    .llm-fallback-local-note {
      font-size: 0.8rem;
      color: #2563eb;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div${docShellAttrs}>
    ${fallbackBadgeHtml}
    ${fallbackBannerHtml}
    ${body}
  </div>
</body>
</html>`;
};

const buildNodeLink = (node: NodeDocumentationContext['node'], label?: string) => {
  const elementId = node.bpmnElementId || node.bpmnElementId || '';
  const path = getNodeDocViewerPath(node.bpmnFile, elementId || node.id);
  return `<a href="#/doc-viewer/${encodeURIComponent(path)}">${label || node.name || elementId}</a>`;
};

const renderList = (items: string[]) =>
  items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>` : '<p class="muted">Ingen information angiven.</p>';

const formatNodeName = (node: NodeDocumentationContext['node']) =>
  node.name || node.bpmnElementId || node.id;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const buildNodeNameList = (nodes: NodeDocumentationContext['node'][], limit = nodes.length) =>
  nodes.slice(0, limit).map((child) => `${formatNodeName(child)}`).join(', ');

const inferTeamForNode = (type: NodeDocumentationContext['node']['type']) => {
  switch (type) {
    case 'userTask':
      return 'Frontend & UX';
    case 'serviceTask':
      return 'Backend & Integration';
    case 'businessRuleTask':
      return 'Risk & Policy';
    case 'callActivity':
      return 'Process / Feature Team';
    default:
      return 'Tvärfunktionellt produktteam';
  }
};

function buildFeatureGoalDocModelFromContext(
  context: NodeDocumentationContext,
): FeatureGoalDocModel {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Feature Goal';
  const upstreamNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const downstreamNode = context.childNodes.length
    ? context.childNodes[context.childNodes.length - 1]
    : undefined;
  const upstreamName = upstreamNode ? formatNodeName(upstreamNode) : 'Processstart';
  const downstreamName = downstreamNode ? formatNodeName(downstreamNode) : 'Nedströms leverans';
  const descendantEpics = context.childNodes.filter((child) =>
    ['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'].includes(child.type),
  );
  const initiative = node.bpmnFile.replace('.bpmn', '');

  const scopePoints = [
    `Feature Goal <strong>${nodeName}</strong> binder ihop ${upstreamName} med ${downstreamName} i initiativet ${initiative}.`,
    'Möjliggör ett sammanhängande kreditflöde där data, regler och interaktioner hänger ihop.',
    'Fokuserar på att skapa ett spårbart underlag för kreditbeslut i hela initiativet.',
  ];

  const boundaries = [
    'Ingår: end-to-end-flöde för det specifika kreditinitiativet.',
    'Ingår inte: eftermarknadsprocesser och generella engagemangsändringar.',
    'Ingår inte: tekniska implementationer i underliggande system – dessa dokumenteras separat.',
  ];

  const epicRows = descendantEpics.slice(0, 6).map((epic, index) => ({
    id: `E${index + 1}`,
    name: formatNodeName(epic),
    description: `Delsteg som bidrar till att ${nodeName.toLowerCase()} uppnås.`,
    team: inferTeamForNode(epic.type),
  }));

  const flowSteps = [
    `Initiativet startar i ${upstreamName} när en kreditprocess initieras.`,
    `${nodeName} samlar in, koordinerar och kvalitetssäkrar data och beslut från ingående epics.`,
    'Regler och policystöd appliceras på ett konsekvent sätt för att möjliggöra välgrundade kreditbeslut.',
    `Resultat och status förs vidare till ${downstreamName} och vidare in i efterföljande processer.`,
  ];

  const dependencyBullets = [
    'Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering.',
    'Integrationer mot kunddata, engagemangsdata och externa källor (t.ex. UC, PSD2).',
    'Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj.',
  ];

  const scenarioRows = [
    {
      id: 'S1',
      name: 'Normalflöde – komplett ansökan',
      type: 'Happy',
      outcome: 'Kunden får ett tydligt besked och flödet fortsätter utan manuell friktion.',
    },
    {
      id: 'S2',
      name: 'Ofullständig information',
      type: 'Edge',
      outcome: 'Kunden eller handläggaren styrs till komplettering, och beslut skjuts upp på ett kontrollerat sätt.',
    },
    {
      id: 'S3',
      name: 'Hög riskprofil',
      type: 'Edge',
      outcome: 'Ärendet flaggas för extra granskning eller avslag enligt policy.',
    },
  ];

  return {
    summary:
      `${nodeName} samlar och koordinerar ett antal epics för att skapa ett sammanhängande kreditflöde med tydlig ansvarsfördelning och spårbarhet. ` +
      'Feature Goalet säkerställer att rätt data, regler och interaktioner finns på plats för att fatta välgrundade kreditbeslut.',
    effectGoals: [
      'Ökad automatisering i kreditprocessen, med mindre manuellt arbete per ansökan.',
      'Minskad handläggningstid per ansökan genom mer komplett och strukturerad datainsamling.',
      'Förbättrad datakvalitet och minskade felkällor i underlag för kreditevaluering.',
      'Säkrade och mer förutsägbara kreditevalueringar enligt kreditpolicy och riskramverk.',
      'Högre kundnöjdhet genom snabbare och tydligare besked i tidiga steg av kundresan.',
    ],
    scopeIncluded: scopePoints,
    scopeExcluded: boundaries,
    epics: epicRows,
    flowSteps,
    dependencies: dependencyBullets,
    scenarios: scenarioRows,
    testDescription: '',
    implementationNotes: [],
    relatedItems: [],
  };
}

function cleanScopeItem(text: string): string {
  let result = text.trim();
  result = result.replace(/^Ingår inte:\s*/i, '');
  result = result.replace(/^Ingår:\s*/i, '');
  return result.trim();
}

function buildFeatureGoalDocHtmlFromModel(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  model: FeatureGoalDocModel,
): string {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Feature Goal';
  const upstreamNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const downstreamNode = context.childNodes.length
    ? context.childNodes[context.childNodes.length - 1]
    : undefined;
  const upstreamName = upstreamNode ? formatNodeName(upstreamNode) : 'Processstart';
  const downstreamName = downstreamNode ? formatNodeName(downstreamNode) : 'Nedströms leverans';
  const inputNodes = context.parentChain.slice(-2);
  const descendantEpics = context.childNodes.filter((child) =>
    ['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'].includes(child.type),
  );
  const initiative = node.bpmnFile.replace('.bpmn', '');
  const owner = 'Produktägare Kredit / Risk & Policy';
  const versionLabel = model.summary
    ? '1.0 (LLM-validerad) – uppdateras vid ändring'
    : '1.0 (exempel) – uppdateras vid ändring';

  const epicRows =
    model.epics.length > 0
      ? model.epics
      : descendantEpics.slice(0, 6).map((epic, index) => ({
          id: `E${index + 1}`,
          name: formatNodeName(epic),
          description: `Delsteg som bidrar till att ${nodeName.toLowerCase()} uppnås.`,
          team: inferTeamForNode(epic.type),
        }));

  const flowSteps =
    model.flowSteps.length > 0
      ? model.flowSteps
      : [
          `Initiativet startar i ${upstreamName} när en kreditprocess initieras.`,
          `${nodeName} samlar in, koordinerar och kvalitetssäkrar data och beslut från ingående epics.`,
          'Regler och policystöd appliceras på ett konsekvent sätt för att möjliggöra välgrundade kreditbeslut.',
          `Resultat och status förs vidare till ${downstreamName} och vidare in i efterföljande processer.`,
        ];

  const dependencies =
    model.dependencies.length > 0
      ? model.dependencies
      : [
          'Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering.',
          'Integrationer mot kunddata, engagemangsdata och externa källor (t.ex. UC, PSD2).',
          'Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj.',
        ];

  const scenarioRows =
    model.scenarios.length > 0
      ? model.scenarios
      : [
          {
            id: 'S1',
            name: 'Normalflöde – komplett ansökan',
            type: 'Happy',
            outcome: 'Kunden får ett tydligt besked och flödet fortsätter utan manuell friktion.',
          },
          {
            id: 'S2',
            name: 'Ofullständig information',
            type: 'Edge',
            outcome:
              'Kunden eller handläggaren styrs till komplettering, och beslut skjuts upp på ett kontrollerat sätt.',
          },
          {
            id: 'S3',
            name: 'Hög riskprofil',
            type: 'Edge',
            outcome: 'Ärendet flaggas för extra granskning eller avslag enligt policy.',
          },
        ];

  const summaryText =
    model.summary ||
    `${nodeName} samlar och koordinerar ett antal epics för att skapa ett sammanhängande kreditflöde med tydlig ansvarsfördelning och spårbarhet.`;

  const effectGoals =
    model.effectGoals && model.effectGoals.length
      ? model.effectGoals
      : [
          'Ökad automatisering i kreditprocessen, med mindre manuellt arbete per ansökan.',
          'Minskad handläggningstid per ansökan genom mer komplett och strukturerad datainsamling.',
          'Förbättrad datakvalitet och minskade felkällor i underlag för kreditevaluering.',
          'Säkrade och mer förutsägbara kreditevalueringar enligt kreditpolicy och riskramverk.',
          'Högre kundnöjdhet genom snabbare och tydligare besked i tidiga steg av kundresan.',
        ];

  const scopeIncluded = model.scopeIncluded.length ? model.scopeIncluded : [];
  const scopeExcluded = model.scopeExcluded.length ? model.scopeExcluded : [];
  let effectiveScopeIncluded = scopeIncluded;
  let effectiveScopeExcluded = scopeExcluded;
  if (!effectiveScopeIncluded.length && !effectiveScopeExcluded.length) {
    effectiveScopeIncluded = [
      'Ingår: end-to-end-flöde för det specifika kreditinitiativet.',
    ];
    effectiveScopeExcluded = [
      'Ingår inte: eftermarknadsprocesser och generella engagemangsändringar.',
      'Ingår inte: tekniska implementationer i underliggande system – dessa dokumenteras separat.',
    ];
  }

  const implementationNotes =
    model.implementationNotes.length > 0
      ? model.implementationNotes
      : [
          'API- och integrationskontrakt ska vara dokumenterade per epic och nod.',
          'Viktiga datafält bör speglas i loggar och domän-events för spårbarhet.',
          'Edge-cases (t.ex. avbrutna flöden eller externa tjänstefel) ska hanteras konsekvent över epics.',
          'DMN-kopplingar för risk, skuldsättning och produktvillkor dokumenteras i respektive Business Rule-dokumentation.',
        ];

  const relatedItems =
    model.relatedItems.length > 0
      ? model.relatedItems
      : [
          links.bpmnViewerLink
            ? `Relaterad subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`
            : `Relaterad subprocess: BPMN-fil ${node.bpmnFile}`,
          links.dmnLink
            ? `Relaterade regler/DMN: <a href="${links.dmnLink}">${links.dmnLink.split('/').pop()}</a>`
            : 'Relaterade regler/DMN dokumenteras per Business Rule.',
          inputNodes.length
            ? `Föregående noder: ${buildNodeNameList(inputNodes)}`
            : 'Föregående noder: initierande steg i processen.',
        ];

  const testDescription =
    model.testDescription ||
    'Scenarion ovan mappas mot automatiska tester. Testblock och scenarionamngivning bör återspegla affärs-scenariernas ID och namn.';

  const dorBullets = [
    'Syfte, målgrupper och affärsvärde för Feature Goalet är dokumenterat och förankrat.',
    'Ingående epics och beroende huvudflöden är identifierade och övergripande beskrivna.',
    'Centrala beroenden (regelmotor, datakällor, externa tjänster) är identifierade och ägarskap är tydliggjort.',
    'Övergripande affärsscenarier och risk-/policykrav är kända och dokumenterade.',
    'Tekniska förutsättningar (plattform, integrationer, miljöer) är klarlagda på en övergripande nivå.',
  ];

  const dodBullets = [
    'Feature Goalet stödjer de definierade affärsscenarierna och uppfyller beskrivna policys och regler.',
    'Alla epics som ingår är implementerade, testade och dokumenterade med spårbarhet mot detta Feature Goal.',
    'Automatiska tester täcker centrala flöden, felhantering och definierade risk-/policykrav.',
    'Loggning och mätpunkter finns på plats för uppföljning, insikter och incidenthantering.',
    'Dokumentation (Feature Goal, epics, regler) är uppdaterad och tillgänglig för berörda team.',
  ];

  return `
    <section class="doc-section">
      <span class="doc-badge">Feature Goal</span>
      <h1>${nodeName}</h1>
      <ul>
        <li><strong>Initiativ:</strong> ${initiative}</li>
        <li><strong>BPMN Call Activity:</strong> ${node.bpmnElementId} (${nodeName})</li>
        <li><strong>Regel/affärsägare:</strong> ${owner}</li>
        <li><strong>Kreditprocess-steg:</strong> ${initiative}</li>
        <li><strong>Version / datum:</strong> ${versionLabel}</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Sammanfattning &amp; scope</h2>
      <p>${summaryText}</p>
      ${
        effectiveScopeIncluded.length
          ? `
      <h3>Ingår</h3>
      <ul>
        ${effectiveScopeIncluded
          .map((item) => `<li>${cleanScopeItem(item)}</li>`)
          .join('')}
      </ul>`
          : ''
      }
      ${
        effectiveScopeExcluded.length
          ? `
      <h3>Ingår inte</h3>
      <ul>
        ${effectiveScopeExcluded
          .map((item) => `<li>${cleanScopeItem(item)}</li>`)
          .join('')}
      </ul>`
          : ''
      }
    </section>

    <section class="doc-section">
      <h2>Effektmål</h2>
      ${renderList(effectGoals)}
    </section>

    <section class="doc-section">
      <h2>Ingående Epics</h2>
      ${
        epicRows.length
          ? `
      <table>
        <tr>
          <th>Epic-ID</th>
          <th>Epic-namn</th>
          <th>Beskrivning</th>
          <th>Team</th>
        </tr>
        ${epicRows
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.description}</td>
          <td>${row.team}</td>
        </tr>`,
          )
          .join('')}
      </table>`
          : '<p class="muted">Inga epics identifierade ännu – fyll på när BPMN-hierarkin är komplett.</p>'
      }
    </section>

    <section class="doc-section">
      <h2>Affärsflöde</h2>
      <ol>
        ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </section>

    <section class="doc-section">
      <h2>Affärs-scenarion</h2>
      <table>
        <tr>
          <th>Scenario</th>
          <th>Beskrivning</th>
          <th>Typ (Happy/Edge/Error)</th>
          <th>Förväntat resultat</th>
        </tr>
        ${scenarioRows
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.type}</td>
          <td>${row.outcome}</td>
        </tr>`,
          )
          .join('')}
      </table>
    </section>

    <section class="doc-section">
      <h2>Koppling till automatiska tester</h2>
      <p>
        ${testDescription}
        ${
          links.testLink
            ? `<br />Testfil: <code>${links.testLink}</code>`
            : '<br /><span class="muted">Testfil länkas via node_test_links</span>'
        }
        <br />
        Testblock och scenarionamngivning bör återspegla affärs-scenariernas ID och namn.
      </p>
    </section>

    <section class="doc-section">
      <h2>Implementation Notes (för dev)</h2>
      ${renderList(implementationNotes)}
    </section>

    <section class="doc-section">
      <h2>Tekniska &amp; externa beroenden</h2>
      ${renderList([
        'Regelmotor(er) och beslutsmotorer kopplade till Feature Goalet.',
        'Datakällor (interna register, databaser och domäntjänster) som används i flödet.',
        'Externa API:er och tjänster som tillhandahåller kredit-, person- eller objektsdata.',
        'Integrationer och integrationslager som hanterar kommunikation mot interna/externa system.',
        'Påverkade interna system, moduler och komponenter som behöver anpassas eller övervakas.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade regler / subprocesser</h2>
      ${renderList(relatedItems)}
    </section>

    <section class="doc-section">
      <h2>Definition of Ready</h2>
      ${renderList(dorBullets)}
    </section>

    <section class="doc-section">
      <h2>Definition of Done</h2>
      ${renderList(dodBullets)}
    </section>
  `;
}

function buildFeatureGoalLlmDocBody(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  sections: FeatureGoalLlmSections,
): string {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Feature Goal';
  const upstreamNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const downstreamNode = context.childNodes.length
    ? context.childNodes[context.childNodes.length - 1]
    : undefined;
  const upstreamName = upstreamNode ? formatNodeName(upstreamNode) : 'Processstart';
  const downstreamName = downstreamNode ? formatNodeName(downstreamNode) : 'Nedströms leverans';
  const inputNodes = context.parentChain.slice(-2);
  const descendantEpics = context.childNodes.filter((child) =>
    ['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'].includes(child.type),
  );
  const initiative = node.bpmnFile.replace('.bpmn', '');
  const owner = 'Produktägare Kredit / Risk & Policy';
  const versionLabel = '1.0 (LLM-genererad) – valideras innan produktion';

  const epicRows =
    sections.epics.length > 0
      ? sections.epics
      : descendantEpics.slice(0, 6).map((epic, index) => ({
          id: `E${index + 1}`,
          name: formatNodeName(epic),
          description: `Delsteg som bidrar till att ${nodeName.toLowerCase()} uppnås.`,
          team: inferTeamForNode(epic.type),
        }));

  const epicRowsSource = sections.epics.length > 0 ? 'llm' : 'fallback';

  const flowSteps =
    sections.flowSteps.length > 0
      ? sections.flowSteps
      : [
          `Initiativet startar i ${upstreamName} när en kreditprocess initieras.`,
          `${nodeName} samlar in, koordinerar och kvalitetssäkrar data och beslut från ingående epics.`,
          'Regler och policystöd appliceras på ett konsekvent sätt för att möjliggöra välgrundade kreditbeslut.',
          `Resultat och status förs vidare till ${downstreamName} och vidare in i efterföljande processer.`,
        ];

  const flowStepsSource = sections.flowSteps.length > 0 ? 'llm' : 'fallback';

  const dependencies =
    sections.dependencies.length > 0
      ? sections.dependencies
      : [
          'Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering.',
          'Integrationer mot kunddata, engagemangsdata och externa källor (t.ex. UC, PSD2).',
          'Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj.',
        ];

  const dependenciesSource = sections.dependencies.length > 0 ? 'llm' : 'fallback';

  const scenarioRows =
    sections.scenarios.length > 0
      ? sections.scenarios
      : [
          {
            id: 'S1',
            name: 'Normalflöde – komplett ansökan',
            type: 'Happy',
            outcome: 'Kunden får ett tydligt besked och flödet fortsätter utan manuell friktion.',
          },
          {
            id: 'S2',
            name: 'Ofullständig information',
            type: 'Edge',
            outcome:
              'Kunden eller handläggaren styrs till komplettering, och beslut skjuts upp på ett kontrollerat sätt.',
          },
          {
            id: 'S3',
            name: 'Hög riskprofil',
            type: 'Edge',
            outcome: 'Ärendet flaggas för extra granskning eller avslag enligt policy.',
          },
        ];

  const scenariosSource = sections.scenarios.length > 0 ? 'llm' : 'fallback';

  const summaryText =
    sections.summary ||
    `${nodeName} samlar och koordinerar ett antal epics för att skapa ett sammanhängande kreditflöde med tydlig ansvarsfördelning och spårbarhet.`;

  const summarySource = sections.summary ? 'llm' : 'fallback';

  const effectGoals =
    sections.effectGoals && sections.effectGoals.length
      ? sections.effectGoals
      : [
          'Ökad automatisering i kreditprocessen, med mindre manuellt arbete per ansökan.',
          'Minskad handläggningstid per ansökan genom mer komplett och strukturerad datainsamling.',
          'Förbättrad datakvalitet och minskade felkällor i underlag för kreditevaluering.',
          'Säkrade och mer förutsägbara kreditevalueringar enligt kreditpolicy och riskramverk.',
          'Högre kundnöjdhet genom snabbare och tydligare besked i tidiga steg av kundresan.',
        ];

  const effectGoalsSource =
    sections.effectGoals && sections.effectGoals.length ? 'llm' : 'fallback';

  const scopeIncludedLLm = sections.scopeIncluded.length ? sections.scopeIncluded : [];
  const scopeExcludedLLm = sections.scopeExcluded.length ? sections.scopeExcluded : [];
  let effectiveScopeIncludedLLm = scopeIncludedLLm;
  let effectiveScopeExcludedLLm = scopeExcludedLLm;
  if (!effectiveScopeIncludedLLm.length && !effectiveScopeExcludedLLm.length) {
    effectiveScopeIncludedLLm = [
      'Ingår: end-to-end-flöde för det specifika kreditinitiativet.',
    ];
    effectiveScopeExcludedLLm = [
      'Ingår inte: eftermarknadsprocesser och generella engagemangsändringar.',
      'Ingår inte: tekniska implementationer i underliggande system – dessa dokumenteras separat.',
    ];
  }

  const implementationNotes =
    sections.implementationNotes.length > 0
      ? sections.implementationNotes
      : [
          'API- och integrationskontrakt ska vara dokumenterade per epic och nod.',
          'Viktiga datafält bör speglas i loggar och domän-events för spårbarhet.',
          'Edge-cases (t.ex. avbrutna flöden eller externa tjänstefel) ska hanteras konsekvent över epics.',
          'DMN-kopplingar för risk, skuldsättning och produktvillkor dokumenteras i respektive Business Rule-dokumentation.',
        ];

  const implementationNotesSource =
    sections.implementationNotes.length > 0 ? 'llm' : 'fallback';

  const relatedItems =
    sections.relatedItems.length > 0
      ? sections.relatedItems
      : [
          links.bpmnViewerLink
            ? `Relaterad subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`
            : `Relaterad subprocess: BPMN-fil ${node.bpmnFile}`,
          links.dmnLink
            ? `Relaterade regler/DMN: <a href="${links.dmnLink}">${links.dmnLink.split('/').pop()}</a>`
            : 'Relaterade regler/DMN dokumenteras per Business Rule.',
          inputNodes.length
            ? `Föregående noder: ${buildNodeNameList(inputNodes)}`
            : 'Föregående noder: initierande steg i processen.',
        ];

  const relatedItemsSource =
    sections.relatedItems.length > 0 ? 'llm' : 'fallback';

  const testDescription =
    sections.testDescription ||
    'Scenarion ovan mappas mot automatiska tester. Testblock och scenarionamngivning bör återspegla affärs-scenariernas ID och namn.';

  const testDescriptionSource = sections.testDescription ? 'llm' : 'fallback';

  const dorBullets = [
    'Syfte, målgrupper och affärsvärde för Feature Goalet är dokumenterat och förankrat.',
    'Ingående epics och beroende huvudflöden är identifierade och övergripande beskrivna.',
    'Centrala beroenden (regelmotor, datakällor, externa tjänster) är identifierade och ägarskap är tydliggjort.',
    'Övergripande affärsscenarier och risk-/policykrav är kända och dokumenterade.',
    'Tekniska förutsättningar (plattform, integrationer, miljöer) är klarlagda på en övergripande nivå.',
  ];

  const dodBullets = [
    'Feature Goalet stödjer de definierade affärsscenarierna och uppfyller beskrivna policys och regler.',
    'Alla epics som ingår är implementerade, testade och dokumenterade med spårbarhet mot detta Feature Goal.',
    'Automatiska tester täcker centrala flöden, felhantering och definierade risk-/policykrav.',
    'Loggning och mätpunkter finns på plats för uppföljning, insikter och incidenthantering.',
    'Dokumentation (Feature Goal, epics, regler) är uppdaterad och tillgänglig för berörda team.',
  ];

  return `
    <section class="doc-section">
      <span class="doc-badge">Feature Goal</span>
      <h1>${nodeName}</h1>
      <ul>
        <li><strong>Initiativ:</strong> ${initiative}</li>
        <li><strong>BPMN Call Activity:</strong> ${node.bpmnElementId} (${nodeName})</li>
        <li><strong>Regel/affärsägare:</strong> ${owner}</li>
        <li><strong>Kreditprocess-steg:</strong> ${initiative}</li>
        <li><strong>Version / datum:</strong> ${versionLabel}</li>
      </ul>
    </section>

    <section class="doc-section" data-source-summary="${summarySource}">
      <h2>Sammanfattning &amp; scope</h2>
      <p>${summaryText}</p>
      ${
        effectiveScopeIncludedLLm.length
          ? `
      <h3>Ingår</h3>
      <ul>
        ${effectiveScopeIncludedLLm
          .map((item) => `<li>${cleanScopeItem(item)}</li>`)
          .join('')}
      </ul>`
          : ''
      }
      ${
        effectiveScopeExcludedLLm.length
          ? `
      <h3>Ingår inte</h3>
      <ul>
        ${effectiveScopeExcludedLLm
          .map((item) => `<li>${cleanScopeItem(item)}</li>`)
          .join('')}
      </ul>`
          : ''
      }
    </section>

    <section class="doc-section" data-source-effect-goals="${effectGoalsSource}">
      <h2>Effektmål</h2>
      ${renderList(effectGoals)}
    </section>

    <section class="doc-section" data-source-epics="${epicRowsSource}">
      <h2>Ingående Epics</h2>
      ${
        epicRows.length
          ? `
      <table>
        <tr>
          <th>Epic-ID</th>
          <th>Epic-namn</th>
          <th>Beskrivning</th>
          <th>Team</th>
        </tr>
        ${epicRows
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.description}</td>
          <td>${row.team}</td>
        </tr>`,
          )
          .join('')}
      </table>`
          : '<p class="muted">Inga epics identifierade ännu – fyll på när BPMN-hierarkin är komplett.</p>'
      }
    </section>

    <section class="doc-section" data-source-flow="${flowStepsSource}">
      <h2>Affärsflöde</h2>
      <ol>
        ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </section>

    <section class="doc-section" data-source-scenarios="${scenariosSource}">
      <h2>Affärs-scenarion</h2>
      ${
        scenarioRows.length
          ? `
      <table>
        <tr>
          <th>Scenario</th>
          <th>Beskrivning</th>
          <th>Typ (Happy/Edge/Error)</th>
          <th>Förväntat resultat</th>
        </tr>
        ${scenarioRows
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.type}</td>
          <td>${row.outcome}</td>
        </tr>`,
          )
          .join('')}
      </table>`
          : '<p class="muted">Inga affärs-scenarion identifierade ännu.</p>'
      }
    </section>

    <section class="doc-section" data-source-test-description="${testDescriptionSource}">
      <h2>Koppling till automatiska tester</h2>
      <p>
        ${testDescription}
        ${
          links.testLink
            ? `<br />Testfil: <code>${links.testLink}</code>`
            : '<br /><span class="muted">Testfil länkas via node_test_links</span>'
        }
      </p>
    </section>

    <section class="doc-section" data-source-implementation-notes="${implementationNotesSource}">
      <h2>Implementation Notes (för dev)</h2>
      ${renderList(implementationNotes)}
    </section>

    <section class="doc-section" data-source-dependencies="${dependenciesSource}">
      <h2>Tekniska &amp; externa beroenden</h2>
      ${renderList([
        'Regelmotor(er) och beslutsmotorer kopplade till Feature Goalet.',
        'Datakällor (interna register, databaser och domäntjänster) som används i flödet.',
        'Externa API:er och tjänster som tillhandahåller kredit-, person- eller objektsdata.',
        'Integrationer och integrationslager som hanterar kommunikation mot interna/externa system.',
        'Påverkade interna system, moduler och komponenter som behöver anpassas eller övervakas.',
      ])}
    </section>

    <section class="doc-section" data-source-related-items="${relatedItemsSource}">
      <h2>Relaterade regler / subprocesser</h2>
      ${renderList(relatedItems)}
    </section>

    <section class="doc-section">
      <h2>Definition of Ready</h2>
      ${renderList(dorBullets)}
    </section>

    <section class="doc-section">
      <h2>Definition of Done</h2>
      ${renderList(dodBullets)}
    </section>
  `;
}

function buildEpicDocModelFromContext(
  context: NodeDocumentationContext,
): EpicDocModel {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Epic';
  const previousNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const nextNode = context.childNodes.length ? context.childNodes[0] : undefined;
  const downstreamNodes = context.childNodes.slice(0, 3);
  const relatedNodes = [
    previousNode,
    ...downstreamNodes,
    ...context.siblingNodes.slice(0, 2),
  ].filter(Boolean) as NodeDocumentationContext['node'][];
  const apiSlug = slugify(nodeName);
  const upstreamName = previousNode ? formatNodeName(previousNode) : 'Processstart';
  const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg';
  const processStep = node.bpmnFile.replace('.bpmn', '');
  const isUserTask = node.type === 'userTask';
  const isServiceTask = node.type === 'serviceTask';
  const swimlaneOwner = isUserTask
    ? 'Kund / Rådgivare'
    : isServiceTask
    ? 'Backend & Integration'
    : inferTeamForNode(node.type);
  const versionLabel = '1.0 (exempel) – uppdateras vid ändring';
  const ownerLabel = 'Produktteam Kredit / Arkitektur';

  const scopeBullets = [
    `Epiken <strong>${nodeName}</strong> ingår i steget <strong>${processStep}</strong> mellan ${upstreamName} och ${downstreamName}.`,
    isUserTask
      ? 'Fokuserar på interaktion mellan kund/rådgivare och kreditplattformen.'
      : 'Fokuserar på automatiserad systemexekvering utan direkt användarinteraktion.',
    'Påverkar vilka data och beslut som förs vidare i kreditkedjan.',
    'Utanför scope: eftermarknad och generella kundengagemang utanför den aktuella ansökan.',
  ];

  const triggerBullets = [
    previousNode
      ? `Triggas normalt efter <strong>${formatNodeName(previousNode)}</strong>.`
      : 'Triggas när föregående processsteg är klart.',
    'Förutsätter att grundläggande kund- och ansökningsdata är validerade.',
    'Eventuella föregående KYC/AML- och identitetskontroller ska vara godkända.',
  ];

  const highLevelStepsUser = [
    'Användaren öppnar vyn och ser sammanfattad ansöknings- och kundinformation.',
    'Formulär eller val presenteras baserat på föregående steg och riskprofil.',
    'Användaren fyller i eller bekräftar uppgifter och skickar vidare.',
    'Systemet validerar indata och uppdaterar processens status samt triggar nästa steg.',
  ];

  const highLevelStepsService = [
    'Processmotorn triggar tjänsten med relevant ansöknings- och kunddata.',
    'Tjänsten anropar interna och/eller externa system för att hämta eller berika data.',
    'Svar kontrolleras mot förväntade format och felkoder hanteras på övergripande nivå.',
    'Resultatet lagras och vidarebefordras till nästa BPMN-nod.',
  ];

  const interactionBulletsUser = [
    'Kanal: web/app eller internt handläggargränssnitt beroende på roll.',
    'UI ska vara förklarande, med tydlig koppling till kreditbeslut och nästa steg.',
    'Felmeddelanden ska vara begripliga och vägleda till rätt åtgärd.',
  ];

  const interactionBulletsService = [
    `Primära API:er: t.ex. POST /api/${apiSlug} för exekvering.`,
    'Tjänsten ska hantera timeouts och felkoder från beroenden på ett kontrollerat sätt (retry/circuit breaker på plattformsnivå).',
    'Respons ska vara deterministisk och innehålla tydliga statusfält som går att logga och följa upp.',
  ];

  const dataTable = `
    <table>
      <tr>
        <th>Typ</th>
        <th>Fält / Objekt</th>
        <th>Källa / Konsument</th>
        <th>Kommentar</th>
      </tr>
      <tr>
        <td>Input</td>
        <td>${previousNode ? formatNodeName(previousNode) : 'Ansökningsdata'}</td>
        <td>${previousNode ? previousNode.bpmnFile : 'Intern källa'}</td>
        <td>Underlag som triggar epiken.</td>
      </tr>
      <tr>
        <td>Output</td>
        <td>${nextNode ? formatNodeName(nextNode) : 'Nästa steg i processen'}</td>
        <td>${nextNode ? nextNode.bpmnFile : 'Nedströms nod'}</td>
        <td>Status, flaggor och eventuell berikad data.</td>
      </tr>
    </table>
  `;

  const businessRuleRefs = [
    'Regeln använder eller påverkas av relevanta Business Rule / DMN-beslut (se separat dokumentation).',
    'Policykrav för risk, skuldsättning och produktvillkor ska vara spårbara via kopplade regler.',
    'Eventuella AML/KYC-krav hanteras i samverkan med dedikerade kontrollnoder.',
  ];

  const testRows = [
    {
      name: 'Happy path',
      description: isUserTask
        ? 'Kunden/handläggaren fyller i korrekta uppgifter och flödet går vidare utan avvikelser.'
        : 'Tjänsten får kompletta data, alla beroenden svarar OK och flödet går vidare.',
    },
    {
      name: 'Valideringsfel',
      description: isUserTask
        ? 'Användaren lämnar fält tomma eller anger ogiltiga värden, och får begripliga felmeddelanden.'
        : 'Indata saknar obligatoriska fält eller bryter mot format – tjänsten ska avvisa och logga tydligt.',
    },
    {
      name: 'Tekniskt fel / beroende nere',
      description: isUserTask
        ? 'Systemfel eller otillgänglig tjänst ska ge information utan att tappa ansökan.'
        : 'Extern tjänst svarar inte eller ger fel – epiken ska hantera detta enligt övergripande felstrategi.',
    },
  ];

  const relatedList = relatedNodes.length
    ? relatedNodes.map((n) => `${formatNodeName(n)} (${n.type})`)
    : ['Inga närliggande noder identifierade.'];

  const summary =
    `${nodeName} är ett delsteg i kreditflödet som säkerställer att rätt data, regler och interaktioner hanteras innan processen går vidare. ` +
    'Epiken bidrar till en spårbar och begriplig kreditprocess för både kund och interna användare.';

  const prerequisites = triggerBullets;

  const inputs = [
    isUserTask
      ? `Input: användarens/handläggarens uppgifter och val från ${upstreamName}.`
      : `Input: data och status från föregående systemsteg (${upstreamName}).`,
  ];

  const flowSteps = (isUserTask ? highLevelStepsUser : highLevelStepsService).slice();

  const interactions = isUserTask ? interactionBulletsUser : interactionBulletsService;

  const dataContracts: string[] = [
    `Input: ${previousNode ? formatNodeName(previousNode) : 'Ansökningsdata'} – underlag som triggar epiken.`,
    `Output: ${nextNode ? formatNodeName(nextNode) : 'Nästa steg i processen'} – status, flaggor och berikad data.`,
  ];

  const businessRulesPolicy = businessRuleRefs;

  const scenarios: EpicScenario[] = [
    {
      id: 'EPIC-S1',
      name: 'Happy path',
      type: 'Happy',
      description: testRows[0].description,
      outcome: isUserTask
        ? 'Epiken slutförs utan avvikelser och processen går vidare till nästa steg.'
        : 'Tjänsten exekverar utan fel och uppdaterar processen enligt förväntan.',
    },
    {
      id: 'EPIC-S2',
      name: 'Valideringsfel',
      type: 'Edge',
      description: testRows[1].description,
      outcome: 'Fel visas/loggas och användaren eller tjänsten kan hantera och rätta indata innan processen går vidare.',
    },
    {
      id: 'EPIC-S3',
      name: 'Tekniskt fel / beroende nere',
      type: 'Error',
      description: testRows[2].description,
      outcome: 'Ärendet hanteras enligt felstrategi utan att data tappas, och fel loggas för uppföljning.',
    },
  ];

  const testDescription =
    'Scenarierna ovan bör mappas till automatiska tester där scenarionas namn används i testbeskrivningar.';

  const implementationNotes = [
    `Primära API:er/tjänster: t.ex. POST /api/${apiSlug} för exekvering.`,
    'Viktiga fält och beslut bör loggas för att möjliggöra felsökning och efterkontroll.',
    'Eventuella externa beroenden (kreditupplysning, folkbokföring, engagemangsdata) hanteras via plattformens integrationslager.',
    'Prestanda- och tillgänglighetskrav hanteras på plattformsnivå men bör beaktas i designen.',
  ];

  const relatedItems = [
    relatedList.length ? `Närliggande noder: ${relatedList.join(', ')}` : 'Inga närliggande noder identifierade.',
  ];

  return {
    summary,
    prerequisites,
    inputs,
    flowSteps,
    interactions,
    dataContracts,
    businessRulesPolicy,
    scenarios,
    testDescription,
    implementationNotes,
    relatedItems,
  };
}

function buildEpicDocHtmlFromModel(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  model: EpicDocModel,
): string {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Epic';
  const previousNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const nextNode = context.childNodes.length ? context.childNodes[0] : undefined;
  const relatedNodes = [
    previousNode,
    ...context.childNodes.slice(0, 3),
    ...context.siblingNodes.slice(0, 2),
  ].filter(Boolean) as NodeDocumentationContext['node'][];
  const apiSlug = slugify(nodeName);
  const upstreamName = previousNode ? formatNodeName(previousNode) : 'Processstart';
  const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg';
  const processStep = node.bpmnFile.replace('.bpmn', '');
  const isUserTask = node.type === 'userTask';
  const isServiceTask = node.type === 'serviceTask';
  const swimlaneOwner = isUserTask
    ? 'Kund / Rådgivare'
    : isServiceTask
    ? 'Backend & Integration'
    : inferTeamForNode(node.type);
  const versionLabel = '1.0 (exempel) – uppdateras vid ändring';
  const ownerLabel = 'Produktteam Kredit / Arkitektur';

  const summaryText =
    model.summary ||
    `${nodeName} är ett delsteg i kreditflödet som säkerställer att rätt data, regler och interaktioner hanteras innan processen går vidare.`;
  const summarySource = model.summary ? 'llm' : 'fallback';

  const prerequisites = model.prerequisites.length
    ? model.prerequisites
    : [
        previousNode
          ? `Triggas normalt efter <strong>${formatNodeName(previousNode)}</strong>.`
          : 'Triggas när föregående processsteg är klart.',
        'Förutsätter att grundläggande kund- och ansökningsdata är validerade.',
        'Eventuella föregående KYC/AML- och identitetskontroller ska vara godkända.',
      ];
  const prerequisitesSource = model.prerequisites.length ? 'llm' : 'fallback';

  const inputs = model.inputs.length
    ? model.inputs
    : [
      isUserTask
        ? `Input: användarens/handläggarens uppgifter och val från ${upstreamName}.`
        : `Input: data och status från föregående systemsteg (${upstreamName}).`,
    ];
  const inputsSource = model.inputs.length ? 'llm' : 'fallback';
  const renderEpicInputsTable = () => {
    const rowsSource = inputs;

    if (!rowsSource.length) {
      return '<p class="muted">Inga inputs specificerade ännu.</p>';
    }

    const rows = rowsSource.map((raw) => {
      if (typeof raw !== 'string') {
        return {
          field: '',
          source: '',
          type: '',
          required: '',
          validation: '',
          errorHandling: '',
        };
      }

      const parts = raw.split(';').map((p) => p.trim());
      const row: {
        field: string;
        source: string;
        type: string;
        required: string;
        validation: string;
        errorHandling: string;
      } = {
        field: '',
        source: '',
        type: '',
        required: '',
        validation: '',
        errorHandling: '',
      };

      for (const part of parts) {
        const [label, ...rest] = part.split(':');
        const value = rest.join(':').trim();
        if (!label || !value) continue;
        const key = label.toLowerCase();
        if (key.startsWith('fält')) {
          row.field = value;
        } else if (key.startsWith('datakälla')) {
          row.source = value;
        } else if (key.startsWith('typ')) {
          row.type = value;
        } else if (key.startsWith('obligatoriskt')) {
          row.required = value;
        } else if (key.startsWith('validering')) {
          row.validation = value;
        } else if (key.startsWith('felhantering')) {
          row.errorHandling = value;
        }
      }

      // Om parsing misslyckas helt – lägg hela raden i fält-kolumnen
      if (
        !row.field &&
        !row.source &&
        !row.type &&
        !row.required &&
        !row.validation &&
        !row.errorHandling
      ) {
        row.field = raw;
      }

      return row;
    });

    return `
      <table>
        <tr>
          <th>Fält</th>
          <th>Datakälla</th>
          <th>Typ</th>
          <th>Obligatoriskt</th>
          <th>Validering</th>
          <th>Felhantering</th>
        </tr>
        ${rows
          .map(
            (r) => `
        <tr>
          <td>${r.field}</td>
          <td>${r.source}</td>
          <td>${r.type}</td>
          <td>${r.required}</td>
          <td>${r.validation}</td>
          <td>${r.errorHandling}</td>
        </tr>`,
          )
          .join('')}
      </table>`;
  };

  const flowSteps = model.flowSteps.length
    ? model.flowSteps
    : isUserTask
    ? [
        'Användaren öppnar vyn och ser sammanfattad ansöknings- och kundinformation.',
        'Formulär eller val presenteras baserat på föregående steg och riskprofil.',
        'Användaren fyller i eller bekräftar uppgifter och skickar vidare.',
        'Systemet validerar indata och uppdaterar processens status samt triggar nästa steg.',
      ]
    : [
        'Processmotorn triggar tjänsten med relevant ansöknings- och kunddata.',
        'Tjänsten anropar interna och/eller externa system för att hämta eller berika data.',
        'Svar kontrolleras mot förväntade format och felkoder hanteras på övergripande nivå.',
        'Resultatet lagras och vidarebefordras till nästa BPMN-nod.',
      ];
  const flowStepsSource = model.flowSteps.length ? 'llm' : 'fallback';

  const interactions = model.interactions.length
    ? model.interactions
    : isUserTask
    ? [
        'Kanal: web/app eller internt handläggargränssnitt beroende på roll.',
        'UI ska vara förklarande, med tydlig koppling till kreditbeslut och nästa steg.',
        'Felmeddelanden ska vara begripliga och vägleda till rätt åtgärd.',
      ]
    : [
        `Primära API:er: t.ex. POST /api/${apiSlug} för exekvering.`,
        'Tjänsten ska hantera timeouts och felkoder från beroenden på ett kontrollerat sätt (retry/circuit breaker på plattformsnivå).',
        'Respons ska vara deterministisk och innehålla tydliga statusfält som går att logga och följa upp.',
      ];
  const interactionsSource = model.interactions.length ? 'llm' : 'fallback';

  const dataContracts = model.dataContracts.length
    ? model.dataContracts
    : [
        `Input: ${previousNode ? formatNodeName(previousNode) : 'Ansökningsdata'} – underlag som triggar epiken.`,
        `Output: ${nextNode ? formatNodeName(nextNode) : 'Nästa steg i processen'} – status, flaggor och berikad data.`,
      ];
  const dataContractsSource = model.dataContracts.length ? 'llm' : 'fallback';

  const businessRulesPolicy = model.businessRulesPolicy.length
    ? model.businessRulesPolicy
    : [
        'Regeln använder eller påverkas av relevanta Business Rule / DMN-beslut (se separat dokumentation).',
        'Policykrav för risk, skuldsättning och produktvillkor ska vara spårbara via kopplade regler.',
        'Eventuella AML/KYC-krav hanteras i samverkan med dedikerade kontrollnoder.',
      ];
  const businessRulesPolicySource =
    model.businessRulesPolicy.length ? 'llm' : 'fallback';

  const scenarios =
    model.scenarios.length > 0
      ? model.scenarios
      : [
          {
            id: 'EPIC-S1',
            name: 'Happy path',
            type: 'Happy',
            description: isUserTask
              ? 'Kunden/handläggaren fyller i korrekta uppgifter och flödet går vidare utan avvikelser.'
              : 'Tjänsten får kompletta data, alla beroenden svarar OK och flödet går vidare.',
            outcome:
              'Epiken slutförs utan avvikelser och processen går vidare till nästa steg.',
          },
        ];
  const scenariosSource = model.scenarios.length > 0 ? 'llm' : 'fallback';

  const testDescription =
    model.testDescription ||
    'Scenarierna ovan bör mappas till automatiska tester där scenarionas namn används i testbeskrivningar.';
  const testDescriptionSource = model.testDescription ? 'llm' : 'fallback';

  const implementationNotes =
    model.implementationNotes.length > 0
      ? model.implementationNotes
      : [
          `Primära API:er/tjänster: t.ex. POST /api/${apiSlug} för exekvering.`,
          'Viktiga fält och beslut bör loggas för att möjliggöra felsökning och efterkontroll.',
          'Eventuella externa beroenden (kreditupplysning, folkbokföring, engagemangsdata) hanteras via plattformens integrationslager.',
          'Prestanda- och tillgänglighetskrav hanteras på plattformsnivå men bör beaktas i designen.',
        ];
  const implementationNotesSource =
    model.implementationNotes.length > 0 ? 'llm' : 'fallback';

  const relatedList = relatedNodes.length
    ? relatedNodes.map((n) => `${formatNodeName(n)} (${n.type})`)
    : ['Inga närliggande noder identifierade.'];

  const relatedItems =
    model.relatedItems.length > 0
      ? model.relatedItems
      : [
          relatedList.length
            ? `Närliggande noder: ${relatedList.join(', ')}`
            : 'Inga närliggande noder identifierade.',
          links.bpmnViewerLink
            ? `Visa processen: <a href="${links.bpmnViewerLink}">BPMN viewer</a>`
            : `BPMN-fil: ${node.bpmnFile}`,
        ];
  const relatedItemsSource = model.relatedItems.length > 0 ? 'llm' : 'fallback';

  const dorBullets = [
    'Syfte, effektmål och förväntat affärsvärde för epiken är beskrivet och förankrat.',
    'Upstream- och downstream-noder, beroenden och grundläggande affärsregler är identifierade.',
    'Indata, gränssnitt och eventuella externa beroenden är kända och övergripande dokumenterade.',
    'Affärs-scenarion och testkriterier är definierade på en nivå som möjliggör planering av automatiska tester.',
    'Acceptanskriterier och icke‑funktionella krav (prestanda, robusthet, spårbarhet) är övergripande klarlagda.',
  ];

  const dodBullets = [
    'Epiken levererar den avtalade effekten och stöder definierade affärsflöden utan kritiska gap.',
    'Alla in- och utdataflöden fungerar, är testade och dokumenterade med spårbarhet mot beroende noder.',
    'Affärsregler som triggas av epiken är implementerade, testade och dokumenterade.',
    'Automatiska tester täcker huvudflöde, relevanta edge-cases och felhantering.',
    'Monitorering/loggning är på plats och dokumentation är uppdaterad för berörda team.',
  ];

  return `
    <section class="doc-section">
      <span class="doc-badge">Epic</span>
      <h1>${nodeName}</h1>
      <p class="muted">${node.type} i ${processStep} mellan ${upstreamName} → ${downstreamName}.</p>
      <ul>
        <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
        <li><strong>Kreditprocess-steg:</strong> ${processStep}</li>
        <li><strong>Swimlane/ägare:</strong> ${swimlaneOwner}</li>
        <li><strong>Version &amp; datum:</strong> ${versionLabel}</li>
        <li><strong>Ansvarig:</strong> ${ownerLabel}</li>
      </ul>
    </section>

    <section class="doc-section" data-source-summary="${summarySource}">
      <h2>Syfte &amp; Effekt</h2>
      <p>${summaryText}</p>
    </section>

    <section class="doc-section" data-source-inputs="${inputsSource}">
      <h2>Inputs</h2>
      
      ${renderEpicInputsTable()}
    </section>

    <section class="doc-section" data-source-flow="${flowStepsSource}">
      <h2>Funktionellt flöde</h2>
      <ol>
        ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </section>

    <section class="doc-section" data-source-outputs="${dataContractsSource}">
      <h2>Output</h2>
      ${renderList(dataContracts)}
    </section>

    <section class="doc-section" data-source-business-rules="${businessRulesPolicySource}">
      <h2>Affärsregler som triggas</h2>
      ${renderList(businessRulesPolicy)}
    </section>

    <section class="doc-section" data-source-scenarios="${scenariosSource}">
      <h2>Affärs-scenarion (tabell)</h2>
      <p class="muted">Scenarierna nedan är affärsnära och ska mappas till automatiska tester.</p>
      <table>
        <tr>
          <th>Scenario-ID</th>
          <th>Scenario</th>
          <th>Typ</th>
          <th>Förväntat utfall</th>
          <th>Automatiskt test</th>
        </tr>
        ${scenarios
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.type}</td>
          <td>${row.outcome}</td>
          <td>${
            links.testLink
              ? `<code>${links.testLink}</code>`
              : '<span class="muted">Test mappas i node_test_links</span>'
          }</td>
        </tr>`,
          )
          .join('')}
      </table>
    </section>

    <section class="doc-section" data-source-test-description="${testDescriptionSource}">
      <h2>Koppling till automatiska tester</h2>
      <p>
        ${testDescription}
        ${
          links.testLink
            ? `<br />Testfil: <code>${links.testLink}</code>`
            : '<br /><span class="muted">Testfil länkas via node_test_links</span>'
        }
      </p>
    </section>

    <section class="doc-section" data-source-implementation-notes="${implementationNotesSource}">
      <h2>Implementation Notes</h2>
      ${renderList(implementationNotes)}
    </section>

    <section class="doc-section">
      <h2>Tekniska &amp; externa beroenden</h2>
      ${renderList([
        'Beroende tjänster och API:er som epiken anropar eller är beroende av.',
        'Datakällor (tabeller, domäner och register) som epiken läser eller uppdaterar.',
        'Externa system eller tredjepartstjänster som påverkar epikens flöde och tillgänglighet.',
        'Påverkade komponenter i backend, frontend och integrationslager som behöver samspela.',
        'Tekniska risker och känsliga beroenden som kräver särskild övervakning eller fallback-hantering.',
      ])}
    </section>

    <section class="doc-section" data-source-related-items="${relatedItemsSource}">
      <h2>Relaterade steg &amp; artefakter</h2>
      ${renderList(relatedItems)}
    </section>

    <section class="doc-section">
      <h2>Definition of Ready</h2>
      ${renderList(dorBullets)}
    </section>

    <section class="doc-section">
      <h2>Definition of Done</h2>
      ${renderList(dodBullets)}
    </section>
  `;
}

function buildBusinessRuleDocBody(
  context: NodeDocumentationContext,
  links: TemplateLinks,
): string {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Business Rule';
  const upstreamNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const nextNode = context.childNodes.length
    ? context.childNodes[0]
    : undefined;
  const upstreamName = upstreamNode ? formatNodeName(upstreamNode) : 'Processstart';
  const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg i processen';
  const dmnLabel = links.dmnLink ? links.dmnLink.split('/').pop() : 'Beslutstabell';

  const scopeBullets = [
    `${nodeName} avgör om en ansökan ligger inom bankens riktlinjer för kreditgivning.`,
    'Regeln används för att automatisera delar av kreditbeslutet och säkerställa likabehandling.',
    'Omfattar endast den aktuella kreditprodukten – andra produkter hanteras i separata regler.',
  ];

  const prerequisites = [
    upstreamNode
      ? `Triggas normalt efter <strong>${formatNodeName(upstreamNode)}</strong>.`
      : 'Triggas när föregående processsteg (t.ex. scoring eller datainsamling) är klart.',
    'Kräver att central kund- och ansökningsdata är komplett och validerad.',
    'Förutsätter att nödvändiga externa registerslagningar (t.ex. UC, kreditupplysning) är gjorda.',
  ];

  const policySupportBullets = [
    'Stödjer intern kreditpolicy och mandat för respektive produkt och segment.',
    'Bygger på dokumenterade riskramverk och beslutsmodeller.',
    'Tar hänsyn till regulatoriska krav (t.ex. konsumentkreditlag, AML/KYC) på en övergripande nivå.',
  ];

  const scenariosRows = [
    {
      id: 'BR1',
      name: 'Standardkund med låg risk',
      input: 'Stabil inkomst, låg skuldsättning, normal kreditdata.',
      outcome: 'Beslut: APPROVE utan manuell granskning.',
    },
    {
      id: 'BR2',
      name: 'Kund med hög skuldsättning',
      input: 'Hög debt-to-income, flera befintliga krediter.',
      outcome: 'Beslut: REFER till manuell granskning med tydlig flagga.',
    },
    {
      id: 'BR3',
      name: 'Kund med allvarliga betalningsanmärkningar',
      input: 'Aktiva betalningsanmärkningar eller inkassoärenden.',
      outcome: 'Beslut: DECLINE enligt exklusionskriterier.',
    },
  ];

  return `
    <section class="doc-section">
      <span class="doc-badge">Business Rule / DMN</span>
      <h1>${nodeName}</h1>
      <ul>
        <li><strong>Regel-ID:</strong> ${node.bpmnElementId}</li>
        <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
        <li><strong>Version:</strong> 1.0 (exempel) – uppdateras vid ändring</li>
        <li><strong>Ägare:</strong> Risk &amp; Kreditpolicy</li>
        <li><strong>Kreditprocess-steg:</strong> ${node.bpmnFile.replace('.bpmn', '')}</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Sammanfattning &amp; scope</h2>
      <p>${nodeName} kombinerar flera risk- och kreditparametrar för att avgöra om en ansökan kan godkännas, ska skickas till manuell granskning eller avslås.</p>
      <p>Regeln säkerställer konsekvent tillämpning av kreditpolicy och riskmandat för målgrupperna.</p>
      ${renderList(scopeBullets)}
    </section>

    <section class="doc-section">
      <h2>Förutsättningar &amp; kontext</h2>
      ${renderList(prerequisites)}
    </section>

    <section class="doc-section">
      <h2>Inputs &amp; datakällor</h2>
      <table>
        <tr>
          <th>Fält</th>
          <th>Datakälla</th>
          <th>Typ / format</th>
          <th>Obligatoriskt</th>
          <th>Validering</th>
          <th>Felhantering</th>
        </tr>
        <tr>
          <td>riskScore</td>
          <td>Kreditmotor / UC</td>
          <td>Tal (0–1000)</td>
          <td>Ja</td>
          <td>Inom definierat intervall</td>
          <td>Avslå eller skicka till manuell granskning</td>
        </tr>
        <tr>
          <td>debtToIncomeRatio</td>
          <td>Intern beräkning</td>
          <td>Decimal</td>
          <td>Ja</td>
          <td>&gt;= 0</td>
          <td>Flagga för manuell granskning vid saknade data</td>
        </tr>
        <tr>
          <td>loanToValue</td>
          <td>Fastighetsvärdering</td>
          <td>Procent</td>
          <td>Ja</td>
          <td>0–100 %</td>
          <td>Avslå vid orimliga värden</td>
        </tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Beslutslogik (DMN / regler)</h2>
      <p>Regeln kombinerar riskScore, skuldsättning, belåningsgrad och eventuella riskflaggor för att fatta ett samlat beslut.</p>
      ${renderList([
        'Hög riskScore och måttlig skuldsättning ger normalt auto-approve.',
        'Mellanrisk eller ofullständig data leder till manuell granskning.',
        'Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Output &amp; effekter</h2>
      ${renderList([
        'Beslut: APPROVE, REFER (manuell granskning) eller DECLINE.',
        `Processpåverkan: fortsätter till ${downstreamName} vid APPROVE, pausas i manuell kö vid REFER, avslutas vid DECLINE.`,
        'Flaggor: t.ex. hög skuldsättning, bristfällig dokumentation, sanktions-/fraudträff.',
        'Loggning: beslut, huvudparametrar och regelversion loggas för audit.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Affärsregler &amp; policystöd</h2>
      ${renderList(policySupportBullets)}
    </section>

    <section class="doc-section">
      <h2>Nyckelscenarier / testkriterier (affärsnivå)</h2>
      <p class="muted">Nedan scenarier är affärsnära exempel och ska mappas mot automatiska tester.</p>
      <table>
        <tr>
          <th>Scenario-ID</th>
          <th>Scenario</th>
          <th>Input (kortfattat)</th>
          <th>Förväntat beslut/flagga</th>
          <th>Automatiskt test</th>
        </tr>
        ${scenariosRows
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.input}</td>
          <td>${row.outcome}</td>
          <td>${
            links.testLink
              ? `<code>${links.testLink}</code>`
              : '<span class="muted">Test mappas i node_test_links</span>'
          }</td>
        </tr>`,
          )
          .join('')}
      </table>
    </section>

    <section class="doc-section">
      <h2>Implementation &amp; integrationsnoter</h2>
      ${renderList([
        links.dmnLink
          ? `DMN-tabell: <a href="${links.dmnLink}">${dmnLabel}</a>`
          : 'DMN-tabell: ej länkad – lägg till beslutstabell/DMN när den finns.',
        `BPMN-koppling: Business Rule Task i filen ${node.bpmnFile}.`,
        links.bpmnViewerLink
          ? `BPMN viewer: <a href="${links.bpmnViewerLink}">Öppna noden i viewer</a>`
          : 'BPMN viewer-länk sätts via applikationen.',
        'API: regelmotorn exponeras normalt via intern tjänst (t.ex. /decision/evaluate).',
        'Beroenden: kreditmotor, kunddata, engagemangsdata och sanktions-/fraudregister.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade regler &amp; subprocesser</h2>
      ${renderList([
        links.dmnLink
          ? `Relaterad DMN-modell: <a href="${links.dmnLink}">${dmnLabel}</a>`
          : 'Ingen DMN-länk konfigurerad ännu – lägg till beslutstabell/DMN när den finns.',
        links.bpmnViewerLink
          ? `Relaterad BPMN-subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`
          : 'Subprocess-länk sätts via BPMN viewer.',
        context.parentChain.length
          ? `Överordnad nod: ${buildNodeLink(context.parentChain[context.parentChain.length - 1])}`
          : 'Överordnad nod: Rotprocess',
      ])}
    </section>
  `;
}

export const renderFeatureGoalDoc = (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => renderDocWithSchema('feature-goal', FEATURE_GOAL_DOC_SCHEMA, context, links);

export const renderFeatureGoalDocFromLlm = (
  context: NodeDocumentationContext,
  links: TemplateLinks,
  rawLlmContent: string,
  llmMetadata?: LlmMetadata | LlmHtmlRenderOptions,
) => {
  const node = context.node;
  const title = node.name || node.bpmnElementId || 'Feature Goal';
  const sections = mapFeatureGoalLlmToSections(rawLlmContent);
  const body = buildFeatureGoalDocHtmlFromModel(context, links, sections);
  return wrapDocument(title, body, llmMetadata);
};

export const renderEpicDoc = (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => renderDocWithSchema('epic', EPIC_DOC_SCHEMA, context, links);

export const renderEpicDocFromLlm = (
  context: NodeDocumentationContext,
  links: TemplateLinks,
  rawLlmContent: string,
  llmMetadata?: LlmMetadata | LlmHtmlRenderOptions,
) => {
  const sections = mapEpicLlmToSections(rawLlmContent);
  const body = buildEpicDocHtmlFromModel(context, links, sections);
  const node = context.node;
  const title = node.name || node.bpmnElementId || 'Epic';
  return wrapDocument(title, body, llmMetadata);
};

const renderBusinessRuleDocLegacy = (
  context: NodeDocumentationContext,
  links: TemplateLinks
) => {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Business Rule';
  const ruleId = node.bpmnElementId || node.id;
  const upstreamNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const downstreamNode = context.childNodes.length ? context.childNodes[0] : undefined;
  const upstreamName = upstreamNode ? formatNodeName(upstreamNode) : 'Processstart';
  const downstreamName = downstreamNode ? formatNodeName(downstreamNode) : 'Nästa beslut';
  const processStep = node.bpmnFile.replace('.bpmn', '');
  const dmnLabel = links.dmnLink ? links.dmnLink.split('/').pop() : undefined;
  const owner = 'Risk & Policy team';
  const channel = 'Digital ansökan / intern handläggare';

  const scopeBullets = [
    `Regeln avgör kreditutfall för delsteget <strong>${processStep}</strong>.`,
    `Gäller typiskt nyutlåning och limitändringar för bolån/konsumtionskrediter.`,
    `Triggas efter ${upstreamName} och före ${downstreamName}.`,
    'Utanför scope: eftermarknadsflöden, generella produktkampanjer och manuella undantag.',
  ];

  const prerequisites = [
    'Grundläggande ansökningsuppgifter är kompletta och validerade.',
    'Kund- och engagemangsdata är inläst från kärnsystem/UC eller motsvarande.',
    'Produkt- och kanalregler för aktuellt erbjudande är applicerade.',
    'Nödvändiga DMN-tabeller/regelmotorer är tillgängliga.',
  ];

  const decisionBullets = [
    'Auto-approve vid låg risk och komplett underlag.',
    'Refer (manuell granskning) vid blandad riskbild eller policyundantag.',
    'Decline vid tydligt överskriden risknivå eller hårda exklusionskriterier.',
  ];

  const policySupportBullets = [
    'Stödjer kreditpolicy för skuldkvot, belåningsgrad och betalningsanmärkningar.',
    'Säkerställer likformig hantering av risk enligt riskmanual.',
    'Minimerar manuell hantering genom tydliga auto-approve/auto-decline-kriterier.',
  ];

  const scenariosRows = [
    {
      id: 'SCN-1',
      name: 'Normalfall – stabil kund',
      input: 'Hög kreditvärdighet, skuldkvot inom riktvärde, god säkerhet.',
      outcome: 'Beslut = APPROVE, inga extra flaggor.',
    },
    {
      id: 'SCN-2',
      name: 'Hög skuldsättning',
      input: 'Skuldkvot över tröskel och/eller hög belåningsgrad.',
      outcome: 'Beslut = REFER eller DECLINE, flagga för hög skuldsättning.',
    },
    {
      id: 'SCN-3',
      name: 'Sanktions- eller fraudträff',
      input: 'Träff på sanktions-/fraudlista eller allvarlig betalningshistorik.',
      outcome: 'Beslut = DECLINE, markering för specialhantering.',
    },
  ];

  const body = `
    <section class="doc-section">
      <span class="doc-badge">Business Rule</span>
      <h1>${nodeName}</h1>
      <p class="muted">Policybeslut mellan ${upstreamName} → ${downstreamName} i steget ${processStep}.</p>
      <ul>
        <li><strong>Regel-ID:</strong> ${ruleId}</li>
        <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
        <li><strong>DMN / beslutsmodell:</strong> ${dmnLabel || 'Ej länkad DMN-tabell'}</li>
        <li><strong>Version &amp; status:</strong> 1.0 (exempel) – Aktiv</li>
        <li><strong>Ägare:</strong> ${owner}</li>
        <li><strong>Kreditprocess-steg &amp; kanal:</strong> ${processStep} – ${channel}</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Sammanfattning &amp; scope</h2>
      <p>${nodeName} använder kreditdata och policypunkter för att avgöra om en ansökan kan godkännas automatiskt, ska skickas till manuell granskning eller ska avslås.</p>
      <p>Regeln fokuserar på risknivå, betalningsförmåga och formella exklusionskriterier för den aktuella produkten.</p>
      ${renderList(scopeBullets)}
    </section>

    <section class="doc-section">
      <h2>Förutsättningar &amp; kontext</h2>
      ${renderList(prerequisites)}
    </section>

    <section class="doc-section">
      <h2>Inputs &amp; datakällor</h2>
      <table>
        <tr>
          <th>Fält</th>
          <th>Datakälla</th>
          <th>Typ / format</th>
          <th>Obligatoriskt</th>
          <th>Validering</th>
          <th>Felhantering</th>
        </tr>
        <tr>
          <td>riskScore</td>
          <td>Kreditmotor / UC</td>
          <td>Tal (0–1000)</td>
          <td>Ja</td>
          <td>Inom definierat intervall</td>
          <td>Avslå eller skicka till manuell granskning</td>
        </tr>
        <tr>
          <td>debtToIncomeRatio</td>
          <td>Intern beräkning</td>
          <td>Decimal</td>
          <td>Ja</td>
          <td>&gt;= 0</td>
          <td>Flagga för manuell granskning vid saknade data</td>
        </tr>
        <tr>
          <td>loanToValue</td>
          <td>Fastighetsvärdering</td>
          <td>Procent</td>
          <td>Ja</td>
          <td>0–100 %</td>
          <td>Avslå vid orimliga värden</td>
        </tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Beslutslogik (DMN / regler)</h2>
      <p>Regeln kombinerar riskScore, skuldsättning, belåningsgrad och eventuella riskflaggor för att fatta ett samlat beslut.</p>
      ${renderList([
        'Hög riskScore och måttlig skuldsättning ger normalt auto-approve.',
        'Mellanrisk eller ofullständig data leder till manuell granskning.',
        'Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Output &amp; effekter</h2>
      ${renderList([
        'Beslut: APPROVE, REFER (manuell granskning) eller DECLINE.',
        `Processpåverkan: fortsätter till ${downstreamName} vid APPROVE, pausas i manuell kö vid REFER, avslutas vid DECLINE.`,
        'Flaggor: t.ex. hög skuldsättning, bristfällig dokumentation, sanktions-/fraudträff.',
        'Loggning: beslut, huvudparametrar och regelversion loggas för audit.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Affärsregler &amp; policystöd</h2>
      ${renderList(policySupportBullets)}
    </section>

    <section class="doc-section">
      <h2>Nyckelscenarier / testkriterier (affärsnivå)</h2>
      <p class="muted">Nedan scenarier är affärsnära exempel och ska mappas mot automatiska tester.</p>
      <table>
        <tr>
          <th>Scenario-ID</th>
          <th>Scenario</th>
          <th>Input (kortfattat)</th>
          <th>Förväntat beslut/flagga</th>
          <th>Automatiskt test</th>
        </tr>
        ${scenariosRows
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.input}</td>
          <td>${row.outcome}</td>
          <td>${
            links.testLink
              ? `<code>${links.testLink}</code>`
              : '<span class="muted">Test mappas i node_test_links</span>'
          }</td>
        </tr>`,
          )
          .join('')}
      </table>
    </section>

    <section class="doc-section">
      <h2>Implementation &amp; integrationsnoter</h2>
      ${renderList([
        links.dmnLink
          ? `DMN-tabell: <a href="${links.dmnLink}">${dmnLabel}</a>`
          : 'DMN-tabell: ej länkad – lägg till beslutstabell/DMN när den finns.',
        `BPMN-koppling: Business Rule Task i filen ${node.bpmnFile}.`,
        links.bpmnViewerLink
          ? `BPMN viewer: <a href="${links.bpmnViewerLink}">Öppna noden i viewer</a>`
          : 'BPMN viewer-länk sätts via applikationen.',
        'API: regelmotorn exponeras normalt via intern tjänst (t.ex. /decision/evaluate).',
        'Beroenden: kreditmotor, kunddata, engagemangsdata och sanktions-/fraudregister.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade regler &amp; subprocesser</h2>
      ${renderList([
        links.dmnLink
          ? `Relaterad DMN-modell: <a href="${links.dmnLink}">${dmnLabel}</a>`
          : 'Ingen DMN-länk konfigurerad ännu – lägg till beslutstabell/DMN när den finns.',
        links.bpmnViewerLink
          ? `Relaterad BPMN-subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`
          : 'Subprocess-länk sätts via BPMN viewer.',
        context.parentChain.length
          ? `Överordnad nod: ${buildNodeLink(context.parentChain[context.parentChain.length - 1])}`
          : 'Överordnad nod: Rotprocess',
      ])}
    </section>
  `;

  if (USE_SCHEMA_RENDERING) {
    const schemaBody = renderFromSchema(BUSINESS_RULE_DOC_SCHEMA, {
      templateId: 'business-rule',
      context,
      links,
    });
    return wrapDocument(nodeName, schemaBody || body);
  }

  return wrapDocument(nodeName, body);
};

export const renderBusinessRuleDoc = (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => renderDocWithSchema('business-rule', BUSINESS_RULE_DOC_SCHEMA, context, links);

function buildBusinessRuleDocHtmlFromModel(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  model: BusinessRuleDocModel,
): string {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Business Rule';
  const upstreamNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const nextNode = context.childNodes.length ? context.childNodes[0] : undefined;
  const upstreamName = upstreamNode ? formatNodeName(upstreamNode) : 'Processstart';
  const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg i processen';
  const dmnLabel = links.dmnLink ? links.dmnLink.split('/').pop() : 'Beslutstabell';

  const scopeBullets =
    model.summary && !model.summary.includes('avgör om en ansökan ligger')
      ? [model.summary]
      : [
          `${nodeName} avgör om en ansökan ligger inom bankens riktlinjer för kreditgivning.`,
          'Regeln används för att automatisera delar av kreditbeslutet och säkerställa likabehandling.',
          'Omfattar endast den aktuella kreditprodukten – andra produkter hanteras i separata regler.',
        ];

  const prerequisites = [
    upstreamNode
      ? `Triggas normalt efter <strong>${formatNodeName(upstreamNode)}</strong>.`
      : 'Triggas när föregående processsteg (t.ex. scoring eller datainsamling) är klart.',
    'Kräver att central kund- och ansökningsdata är komplett och validerad.',
    'Förutsätter att nödvändiga externa registerslagningar (t.ex. UC, kreditupplysning) är gjorda.',
  ];

  const decisionBullets = model.decisionLogic.length
    ? model.decisionLogic
    : [
        'Hög riskScore och måttlig skuldsättning ger normalt auto-approve.',
        'Mellanrisk eller ofullständig data leder till manuell granskning.',
        'Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline.',
      ];

  const policySupportBullets = model.businessRulesPolicy.length
    ? model.businessRulesPolicy
    : [
        'Stödjer intern kreditpolicy och mandat för respektive produkt och segment.',
        'Bygger på dokumenterade riskramverk och beslutsmodeller.',
        'Tar hänsyn till regulatoriska krav (t.ex. konsumentkreditlag, AML/KYC) på en övergripande nivå.',
      ];

  const scenariosRows =
    model.scenarios.length > 0
      ? model.scenarios
      : [
          {
            id: 'BR1',
            name: 'Standardkund med låg risk',
            input: 'Stabil inkomst, låg skuldsättning, normal kreditdata.',
            outcome: 'Beslut: APPROVE utan manuell granskning.',
          },
        ];
  const scenariosSource = model.scenarios.length > 0 ? 'llm' : 'fallback';

  const testDescription =
    model.testDescription ||
    'Affärs-scenarierna ovan ska mappas mot automatiska tester där respektive scenario-ID och namn återanvänds i testfil och testbeskrivning.';

  const implementationNotes =
    model.implementationNotes.length > 0
      ? model.implementationNotes
      : [
          links.dmnLink
            ? `DMN-tabell: <a href="${links.dmnLink}">${dmnLabel}</a>`
            : 'DMN-tabell: ej länkad – lägg till beslutstabell/DMN när den finns.',
          `BPMN-koppling: Business Rule Task i filen ${node.bpmnFile}.`,
          links.bpmnViewerLink
            ? `BPMN viewer: <a href="${links.bpmnViewerLink}">Öppna noden i viewer</a>`
            : 'BPMN viewer-länk sätts via applikationen.',
          'API: regelmotorn exponeras normalt via intern tjänst (t.ex. /decision/evaluate).',
          'Beroenden: kreditmotor, kunddata, engagemangsdata och sanktions-/fraudregister.',
        ];
  const implementationNotesSource =
    model.implementationNotes.length > 0 ? 'llm' : 'fallback';

  const relatedItems =
    model.relatedItems.length > 0
      ? model.relatedItems
      : [
          links.dmnLink
            ? `Relaterad DMN-modell: <a href="${links.dmnLink}">${dmnLabel}</a>`
            : 'Ingen DMN-länk konfigurerad ännu – lägg till beslutstabell/DMN när den finns.',
          links.bpmnViewerLink
            ? `Relaterad BPMN-subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`
            : 'Subprocess-länk sätts via BPMN viewer.',
          context.parentChain.length
            ? `Överordnad nod: ${buildNodeLink(
                context.parentChain[context.parentChain.length - 1],
              )}`
            : 'Överordnad nod: Rotprocess',
       ];
  const relatedItemsSource = model.relatedItems.length > 0 ? 'llm' : 'fallback';

  const renderInputsTable = () => {
    const inputs = model.inputs;
    if (!inputs.length) {
      return `
      <table>
        <tr>
          <th>Fält</th>
          <th>Datakälla</th>
          <th>Typ / format</th>
          <th>Obligatoriskt</th>
          <th>Validering</th>
          <th>Felhantering</th>
        </tr>
        <tr>
          <td>riskScore</td>
          <td>Kreditmotor / UC</td>
          <td>Tal (0–1000)</td>
          <td>Ja</td>
          <td>Inom definierat intervall</td>
          <td>Avslå eller skicka till manuell granskning</td>
        </tr>
        <tr>
          <td>debtToIncomeRatio</td>
          <td>Intern beräkning</td>
          <td>Decimal</td>
          <td>Ja</td>
          <td>&gt;= 0</td>
          <td>Flagga för manuell granskning vid saknade data</td>
        </tr>
        <tr>
          <td>loanToValue</td>
          <td>Fastighetsvärdering</td>
          <td>Procent</td>
          <td>Ja</td>
          <td>0–100 %</td>
          <td>Avslå vid orimliga värden</td>
        </tr>
      </table>`;
    }

    const rows = inputs.map((raw) => {
      const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
      const row = {
        field: '',
        source: '',
        type: '',
        required: '',
        validation: '',
        errorHandling: '',
      };

      for (const part of parts) {
        const [keyRaw, ...rest] = part.split(':');
        if (!rest.length) {
          if (!row.field) row.field = part;
          continue;
        }
        const key = keyRaw.toLowerCase();
        const value = rest.join(':').trim();
        if (!value) continue;
        if (key.includes('fält') || key.includes('attribut')) {
          row.field = value;
        } else if (key.includes('datakälla') || key.includes('källa')) {
          row.source = value;
        } else if (key.includes('typ') || key.includes('format')) {
          row.type = value;
        } else if (key.includes('obligatorisk')) {
          row.required = value;
        } else if (key.includes('validering')) {
          row.validation = value;
        } else if (key.includes('felhantering')) {
          row.errorHandling = value;
        }
      }

      if (!row.field) {
        row.field = raw;
      }

      return row;
    });

    return `
      <table>
        <tr>
          <th>Fält</th>
          <th>Datakälla</th>
          <th>Typ / format</th>
          <th>Obligatoriskt</th>
          <th>Validering</th>
          <th>Felhantering</th>
        </tr>
        ${rows
          .map(
            (r) => `
        <tr>
          <td>${r.field}</td>
          <td>${r.source}</td>
          <td>${r.type}</td>
          <td>${r.required}</td>
          <td>${r.validation}</td>
          <td>${r.errorHandling}</td>
        </tr>`,
          )
          .join('')}
      </table>`;
  };

  const renderOutputsTable = () => {
    const outputs = model.outputs;
    const rowsSource = outputs.length
      ? outputs
      : [
          'Outputtyp: Beslut; Typ: APPROVE/REFER/DECLINE; Effekt: Kreditprocessen fortsätter, pausas eller avslutas; Loggning: Beslut, huvudparametrar och regelversion loggas för audit.',
          `Outputtyp: Processpåverkan; Typ: Flödesstyrning; Effekt: Fortsätter till ${downstreamName} vid APPROVE, pausas i manuell kö vid REFER, avslutas vid DECLINE; Loggning: Flödesbeslut loggas med tidsstämpel.`,
          'Outputtyp: Flagga; Typ: Risk/Datakvalitet; Effekt: T.ex. hög skuldsättning, bristfällig dokumentation, sanktions-/fraudträff; Loggning: Flagga + orsak loggas för spårbarhet.',
          'Outputtyp: Loggning; Typ: Audit; Effekt: Underlag för revision och efterhandskontroll; Loggning: Beslut, inputparametrar och regelversion.',
        ];

    const rows = rowsSource.map((raw) => {
      if (typeof raw !== 'string') {
        return {
          outputType: '',
          type: '',
          effect: '',
          logging: '',
        };
      }
      const parts = raw.split(';').map((p) => p.trim());
      const row: { outputType: string; type: string; effect: string; logging: string } = {
        outputType: '',
        type: '',
        effect: '',
        logging: '',
      };

      for (const part of parts) {
        const [label, ...rest] = part.split(':');
        const value = rest.join(':').trim();
        if (!label || !value) continue;
        const key = label.toLowerCase();
        if (key.startsWith('outputtyp')) {
          row.outputType = value;
        } else if (key.startsWith('typ')) {
          row.type = value;
        } else if (key.startsWith('effekt')) {
          row.effect = value;
        } else if (key.startsWith('loggning')) {
          row.logging = value;
        }
      }

      // Om parsing misslyckas helt – lägg hela raden i outputType
      if (!row.outputType && !row.type && !row.effect && !row.logging) {
        row.outputType = raw;
      }

      return row;
    });

    return `
      <table>
        <tr>
          <th>Outputtyp</th>
          <th>Typ</th>
          <th>Effekt</th>
          <th>Loggning</th>
        </tr>
        ${rows
          .map(
            (r) => `
        <tr>
          <td>${r.outputType}</td>
          <td>${r.type}</td>
          <td>${r.effect}</td>
          <td>${r.logging}</td>
        </tr>`,
          )
          .join('')}
      </table>`;
  };

  return `
    <section class="doc-section">
      <span class="doc-badge">Business Rule / DMN</span>
      <h1>${nodeName}</h1>
      <ul>
        <li><strong>Regel-ID:</strong> ${node.bpmnElementId}</li>
        <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
        <li><strong>Version:</strong> 1.0 (exempel) – uppdateras vid ändring</li>
        <li><strong>Ägare:</strong> Risk &amp; Kreditpolicy</li>
        <li><strong>Kreditprocess-steg:</strong> ${node.bpmnFile.replace('.bpmn', '')}</li>
      </ul>
    </section>

    <section class="doc-section" data-source-summary="${
      model.summary && !model.summary.includes('avgör om en ansökan ligger')
        ? 'llm'
        : 'fallback'
    }">
      <h2>Sammanfattning &amp; scope</h2>
      ${renderList(scopeBullets)}
    </section>

    <section class="doc-section" data-source-prerequisites="fallback">
      <h2>Förutsättningar &amp; kontext</h2>
      ${renderList(prerequisites)}
    </section>

    <section class="doc-section" data-source-inputs="${
      model.inputs.length ? 'llm' : 'fallback'
    }">
      <h2>Inputs &amp; datakällor</h2>
      
      ${renderInputsTable()}
    </section>

    <section class="doc-section" data-source-decision-logic="${
      model.decisionLogic.length ? 'llm' : 'fallback'
    }">
      <h2>Beslutslogik (DMN / regler)</h2>
      ${renderList(decisionBullets)}
    </section>

    <section class="doc-section" data-source-outputs="${
      model.outputs.length ? 'llm' : 'fallback'
    }">
      <h2>Output &amp; effekter</h2>
      ${renderOutputsTable()}
    </section>

    <section class="doc-section" data-source-business-rules="${
      model.businessRulesPolicy.length ? 'llm' : 'fallback'
    }">
      <h2>Affärsregler &amp; policystöd</h2>
      ${renderList(policySupportBullets)}
    </section>

    <section class="doc-section" data-source-scenarios="${scenariosSource}">
      <h2>Nyckelscenarier / testkriterier (affärsnivå)</h2>
      <p class="muted">Nedan scenarier är affärsnära exempel och ska mappas mot automatiska tester.</p>
      <table>
        <tr>
          <th>Scenario-ID</th>
          <th>Scenario</th>
          <th>Input (kortfattat)</th>
          <th>Förväntat beslut/flagga</th>
          <th>Automatiskt test</th>
        </tr>
        ${scenariosRows
          .map(
            (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.input}</td>
          <td>${row.outcome}</td>
          <td>${
            links.testLink
              ? `<code>${links.testLink}</code>`
              : '<span class="muted">Test mappas i node_test_links</span>'
          }</td>
        </tr>`,
          )
          .join('')}
      </table>
    </section>

    <section class="doc-section" data-source-implementation-notes="${implementationNotesSource}">
      <h2>Implementation &amp; integrationsnoter</h2>
      ${renderList(implementationNotes)}
    </section>

    <section class="doc-section" data-source-related-items="${relatedItemsSource}">
      <h2>Relaterade regler &amp; subprocesser</h2>
      ${renderList(relatedItems)}
    </section>
  `;
}

export const renderBusinessRuleDocFromLlm = (
  context: NodeDocumentationContext,
  links: TemplateLinks,
  rawLlmContent: string,
  llmMetadata?: LlmMetadata,
) => {
  const sections = mapBusinessRuleLlmToSections(rawLlmContent);
  const body = buildBusinessRuleDocHtmlFromModel(context, links, sections);
  const node = context.node;
  const title = node.name || node.bpmnElementId || 'Business Rule';
  return wrapDocument(title, body, llmMetadata);
};
