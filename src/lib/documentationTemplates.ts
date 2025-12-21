import { NodeDocumentationContext } from './documentationContext';
import { getNodeDocViewerPath } from './nodeArtifactPaths';
import { mapFeatureGoalLlmToSections } from './featureGoalLlmMapper';
import type { FeatureGoalDocModel, FeatureGoalLlmSections } from './featureGoalLlmTypes';
import type {
  EpicDocModel,
  EpicUserStory,
} from './epicDocTypes';
import { mapEpicLlmToSections } from './epicLlmMapper';
import type { BusinessRuleDocModel } from './businessRuleDocTypes';
import { mapBusinessRuleLlmToSections } from './businessRuleLlmMapper';
import {
  loadFeatureGoalOverrides,
  loadEpicOverrides,
  loadBusinessRuleOverrides,
  mergeFeatureGoalOverrides,
  mergeEpicOverrides,
  mergeBusinessRuleOverrides,
  mergeLlmPatch,
} from './nodeDocOverrides';
import {
  fetchPlannedScenarios,
  findE2eTestInfoForNode,
  aggregateE2eTestInfoForFeatureGoal,
  type ScenarioProvider,
  type TestScenarioData,
  type E2eTestStepInfo,
} from './testDataHelpers';
import {
  validateFeatureGoalModelAfterMerge,
  validateEpicModelAfterMerge,
  validateBusinessRuleModelAfterMerge,
} from './nodeDocOverrides';

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
    { id: 'dependencies', label: 'Beroenden', enabledByDefault: true },
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
          return buildBusinessRuleDocHtmlFromModel(
            ctx.context,
            ctx.links,
            buildBusinessRuleDocModelFromContext(ctx.context, ctx.links),
          );
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

/**
 * @deprecated Use unified render functions (renderFeatureGoalDoc, renderEpicDoc, renderBusinessRuleDoc) instead.
 * This function is kept for backward compatibility but will be removed in the future.
 */
async function renderFromSchema(schema: DocTemplateSchema, ctx: SectionRendererContext): Promise<string> {
  const results = await Promise.all(
    schema.sections.map(async (section) => {
      const renderer = SECTION_RENDERERS[section.id];
      if (!renderer) return '';
      const result = renderer(ctx);
      // Handle both sync and async renderers
      if (!result) {
        return '';
      }
      // Check if it's a Promise (object with 'then' method)
      const maybePromise = result as string | Promise<string>;
      if (typeof maybePromise === 'object' && maybePromise !== null && 'then' in maybePromise) {
        return await maybePromise;
      }
      return String(maybePromise);
    })
  );
  return results.join('\n');
}

/**
 * @deprecated Use unified render functions (renderFeatureGoalDoc, renderEpicDoc, renderBusinessRuleDoc) instead.
 * This function is kept for backward compatibility but will be removed in the future.
 */
async function renderDocWithSchema(
  templateId: TemplateId,
  schema: DocTemplateSchema,
  context: NodeDocumentationContext,
  links: TemplateLinks,
): Promise<string> {
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
  const body = await renderFromSchema(schema, { templateId, context, links });
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
   * att Claude (moln-LLM) var otillgänglig och fallback har aktiverats.
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

  // Fallback information removed per user request
  const fallbackBadgeHtml = '';
  const fallbackBannerHtml = '';
  
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
    /* Fallback CSS removed per user request */
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

/**
 * Build Feature Goal base model from context - kopierad från Epic för konsistens.
 * 
 * Feature Goals använder nu samma struktur som Epics.
 */
export function buildFeatureGoalDocModelFromContext(
  context: NodeDocumentationContext,
): FeatureGoalDocModel {
  // Kopierar Epic base model builder och anpassar för Feature Goal
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Feature Goal';
  const previousNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const nextNode = context.childNodes.length ? context.childNodes[0] : undefined;
  const downstreamNodes = context.childNodes.slice(0, 3);
  const upstreamName = previousNode ? formatNodeName(previousNode) : 'Processstart';
  const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg';
  const processStep = node.bpmnFile.replace('.bpmn', '');
  const isUserTask = node.type === 'userTask';
  const isServiceTask = node.type === 'serviceTask';

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

  const flowSteps = isUserTask ? highLevelStepsUser : highLevelStepsService;

  const interactionBulletsUser = [
    'Kanal: web/app eller internt handläggargränssnitt beroende på roll.',
    'UI ska vara förklarande, med tydlig koppling till kreditbeslut och nästa steg.',
    'Felmeddelanden ska vara begripliga och vägleda till rätt åtgärd.',
  ];

  const interactionBulletsService = [
    `Primära API:er: t.ex. POST /api/${slugify(nodeName)} för exekvering.`,
    'Tjänsten ska hantera timeouts och felkoder från beroenden på ett kontrollerat sätt (retry/circuit breaker på plattformsnivå).',
    'Respons ska vara deterministisk och innehålla tydliga statusfält som går att logga och följa upp.',
  ];

  const dependencyBullets = [
    'Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering.',
    'Integrationer mot kunddata, engagemangsdata och externa källor (t.ex. UC, PSD2).',
    'Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj.',
  ];

  const userStories: FeatureGoalDocModel['userStories'] = [
    {
      id: 'US-1',
      role: isUserTask ? 'Kund' : 'System',
      goal: isUserTask
        ? 'Få tydlig vägledning och feedback i kreditprocessen'
        : 'Automatiskt hantera kreditprocesssteg',
      value: isUserTask
        ? 'Kunna fatta välgrundade beslut och förstå nästa steg'
        : 'Minska manuellt arbete och öka processhastighet',
      acceptanceCriteria: isUserTask
        ? [
            'Systemet ska presentera tydlig information om vad som behöver göras.',
            'Systemet ska ge begriplig feedback vid fel eller avvisningar.',
            'Systemet ska vägleda användaren till nästa steg i processen.',
          ]
        : [
            'Systemet ska automatiskt hantera standardfall utan manuell intervention.',
            'Systemet ska logga alla viktiga steg för spårbarhet.',
            'Systemet ska hantera fel på ett kontrollerat sätt.',
          ],
    },
  ];

  const implementationNotes = [
    'API- och integrationskontrakt ska vara dokumenterade per epic och nod.',
    'Viktiga datafält bör speglas i loggar och domän-events för spårbarhet.',
    'Edge-cases (t.ex. avbrutna flöden eller externa tjänstefel) ska hanteras konsekvent över epics.',
    'DMN-kopplingar för risk, skuldsättning och produktvillkor dokumenteras i respektive Business Rule-dokumentation.',
  ];

  return {
    summary:
      `${nodeName} samlar och koordinerar ett antal epics för att skapa ett sammanhängande kreditflöde med tydlig ansvarsfördelning och spårbarhet. ` +
      'Feature Goalet säkerställer att rätt data, regler och interaktioner finns på plats för att fatta välgrundade kreditbeslut.',
    prerequisites: triggerBullets,
    flowSteps,
    dependencies: dependencyBullets,
    userStories,
    implementationNotes,
  };
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

  const flowSteps = (isUserTask ? highLevelStepsUser : highLevelStepsService).slice();

  const interactions = isUserTask ? interactionBulletsUser : interactionBulletsService;

  const userStories: EpicUserStory[] = isUserTask
    ? [
        {
          id: 'US-1',
          role: 'Kund',
          goal: 'Fylla i ansökningsinformation',
          value: 'Kunna ansöka om lån på ett enkelt sätt',
          acceptanceCriteria: [
            'Systemet ska validera att alla obligatoriska fält är ifyllda innan formuläret kan skickas',
            'Systemet ska visa tydliga felmeddelanden om fält saknas eller är ogiltiga',
            'Systemet ska spara utkast automatiskt så att kunden inte förlorar information',
            'Systemet ska bekräfta när informationen är sparad',
          ],
        },
        {
          id: 'US-2',
          role: 'Handläggare',
          goal: 'Se och granska kundens ansökningsinformation',
          value: 'Kunna bedöma ansökan korrekt och effektivt',
          acceptanceCriteria: [
            'Systemet ska visa all relevant ansökningsinformation på ett överskådligt sätt',
            'Systemet ska markera vilka fält som är obligatoriska och vilka som är valfria',
            'Systemet ska visa status för ansökan och vilka steg som är klara',
          ],
        },
        {
          id: 'US-3',
          role: 'Kund',
          goal: 'Få tydlig feedback om vad som händer med ansökan',
          value: 'Förstå processen och veta vad som förväntas',
          acceptanceCriteria: [
            'Systemet ska visa tydlig status för ansökan',
            'Systemet ska ge information om nästa steg i processen',
            'Systemet ska hantera fel på ett begripligt sätt',
          ],
        },
      ]
    : [
        {
          id: 'US-1',
          role: 'Handläggare',
          goal: 'Få systemet att automatiskt hantera processsteg',
          value: 'Spara tid genom automatisering',
          acceptanceCriteria: [
            'Systemet ska automatiskt exekvera tjänsten när föregående steg är klart',
            'Systemet ska hantera fel och timeouts på ett kontrollerat sätt',
            'Systemet ska logga alla viktiga steg för spårbarhet',
          ],
        },
        {
          id: 'US-2',
          role: 'System',
          goal: 'Hämta och validera data från externa källor',
          value: 'Säkerställa datakvalitet och kompletthet',
          acceptanceCriteria: [
            'Systemet ska validera att all nödvändig data finns innan exekvering',
            'Systemet ska hantera fel från externa källor på ett robust sätt',
            'Systemet ska logga alla datahämtningar för spårbarhet',
          ],
        },
        {
          id: 'US-3',
          role: 'Handläggare',
          goal: 'Få tydlig information om vad systemet har gjort',
          value: 'Kunna följa upp och felsöka vid behov',
          acceptanceCriteria: [
            'Systemet ska logga alla viktiga steg och beslut',
            'Systemet ska ge tydlig status om exekveringen',
            'Systemet ska eskalera fel på ett begripligt sätt',
          ],
        },
      ];

  const dependencies = [
    'Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering.',
    'Integrationer mot kunddata, engagemangsdata och externa källor (t.ex. UC, PSD2).',
    'Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj.',
  ];

  const implementationNotes = [
    `Primära API:er/tjänster: t.ex. POST /api/${apiSlug} för exekvering.`,
    'Viktiga fält och beslut bör loggas för att möjliggöra felsökning och efterkontroll.',
    'Eventuella externa beroenden (kreditupplysning, folkbokföring, engagemangsdata) hanteras via plattformens integrationslager.',
    'Prestanda- och tillgänglighetskrav hanteras på plattformsnivå men bör beaktas i designen.',
    ...businessRuleRefs.map(ref => `Affärsregler: ${ref}`),
  ];

  return {
    summary,
    prerequisites,
    flowSteps,
    interactions,
    dependencies,
    userStories,
    implementationNotes,
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


  const flowSteps = model.flowSteps.length
    ? model.flowSteps
    : isUserTask
    ? [
        'Kunden öppnar sidan och ser sammanfattad ansöknings- och kundinformation.',
        'Systemet visar formulär eller val baserat på föregående steg och riskprofil.',
        'Kunden fyller i eller bekräftar uppgifter och skickar vidare.',
        'Systemet validerar uppgifterna och uppdaterar processen innan den fortsätter till nästa steg.',
      ]
    : [
        'Systemet startar automatiskt när ansökningsdata är tillgänglig.',
        'Systemet hämtar kompletterande information från externa källor (t.ex. kreditupplysning, folkbokföring).',
        'Systemet validerar att informationen är korrekt och komplett.',
        'Systemet sparar resultatet och skickar vidare till nästa steg i processen.',
      ];
  const flowStepsSource = model.flowSteps.length ? 'llm' : 'fallback';

  const interactions = model.interactions && model.interactions.length
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
  const interactionsSource = model.interactions && model.interactions.length ? 'llm' : 'fallback';

  const dependencies = model.dependencies && Array.isArray(model.dependencies) && model.dependencies.length > 0
    ? model.dependencies
    : [
        'Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering.',
        'Integrationer mot kunddata, engagemangsdata och externa källor (t.ex. UC, PSD2).',
        'Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj.',
      ];
  const dependenciesSource = model.dependencies && Array.isArray(model.dependencies) && model.dependencies.length > 0 ? 'llm' : 'fallback';

  const userStories = model.userStories.length > 0
    ? model.userStories
    : [
        {
          id: 'US-1',
          role: isUserTask ? 'Kund' : 'Handläggare',
          goal: isUserTask
            ? 'Fylla i ansökningsinformation'
            : 'Få systemet att automatiskt hantera processsteg',
          value: isUserTask
            ? 'Kunna ansöka om lån på ett enkelt sätt'
            : 'Spara tid genom automatisering',
          acceptanceCriteria: isUserTask
            ? [
                'Systemet ska validera att alla obligatoriska fält är ifyllda innan formuläret kan skickas',
                'Systemet ska visa tydliga felmeddelanden om fält saknas eller är ogiltiga',
                'Systemet ska spara utkast automatiskt så att användaren inte förlorar information',
              ]
            : [
                'Systemet ska automatiskt exekvera tjänsten när föregående steg är klart',
                'Systemet ska hantera fel och timeouts på ett kontrollerat sätt',
                'Systemet ska logga alla viktiga steg för spårbarhet',
              ],
        },
      ];
  const userStoriesSource = model.userStories.length > 0 ? 'llm' : 'fallback';

  const implementationNotes =
    model.implementationNotes && model.implementationNotes.length > 0
      ? model.implementationNotes
      : [
          `Primära API:er/tjänster: t.ex. POST /api/${apiSlug} för exekvering.`,
          'Viktiga fält och beslut bör loggas för att möjliggöra felsökning och efterkontroll.',
          'Eventuella externa beroenden (kreditupplysning, folkbokföring, engagemangsdata) hanteras via plattformens integrationslager.',
          'Prestanda- och tillgänglighetskrav hanteras på plattformsnivå men bör beaktas i designen.',
        ];
  const implementationNotesSource =
    model.implementationNotes && model.implementationNotes.length > 0 ? 'llm' : 'fallback';

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
      </ul>
    </section>

    <section class="doc-section" data-source-summary="${summarySource}">
      <h2>Sammanfattning</h2>
      <p>${summaryText}</p>
    </section>

    <section class="doc-section" data-source-prerequisites="${prerequisitesSource}">
      <h2>Förutsättningar</h2>
      ${renderList(prerequisites)}
    </section>

    <section class="doc-section" data-source-flow="${flowStepsSource}">
      <h2>Funktionellt flöde</h2>
      <ol>
        ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </section>

    ${interactions && interactions.length > 0 ? `
    <section class="doc-section" data-source-interactions="${interactionsSource}">
      <h2>Interaktioner</h2>
      ${renderList(interactions)}
    </section>
    ` : ''}

    <section class="doc-section" data-source-dependencies="${dependenciesSource}">
      <h2>Beroenden</h2>
      ${renderList(dependencies)}
    </section>

    <section class="doc-section" data-source-user-stories="${userStoriesSource}">
      <h2>User Stories</h2>
      <p class="muted">User stories med acceptanskriterier som ska mappas till automatiska tester.</p>
      ${userStories.map((story) => `
        <div class="user-story" style="margin-bottom: 2rem; padding: 1rem; border-left: 3px solid #3b82f6; background: #f8fafc;">
          <h3 style="margin-top: 0; margin-bottom: 0.5rem;">
            <strong>${story.id}:</strong> Som <strong>${story.role}</strong> vill jag <strong>${story.goal}</strong> så att <strong>${story.value}</strong>
          </h3>
          <div style="margin-top: 1rem;">
            <p style="margin-bottom: 0.5rem; font-weight: 600;">Acceptanskriterier:</p>
            <ul style="margin-top: 0;">
              ${story.acceptanceCriteria.map((ac) => `<li>${ac}</li>`).join('')}
            </ul>
          </div>
          ${
            links.testLink
              ? `<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil: <code>${links.testLink}</code></p>`
              : '<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil länkas via node_test_links</p>'
          }
        </div>
      `).join('')}
    </section>

    <section class="doc-section" data-source-implementation-notes="${implementationNotesSource}">
      <h2>Implementation Notes</h2>
      ${renderList(implementationNotes)}
    </section>

  `;
}

/**
 * Build Feature Goal HTML from model.
 *
 * This template follows the same structure as Epic template (for consistency).
 *
 * Structure:
 * - Header
 * - Sammanfattning
 * - Förutsättningar
 * - Funktionellt flöde
 * - Beroenden
 * - User Stories
 * - Implementation Notes
 */
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
  const downstreamName = downstreamNode ? formatNodeName(downstreamNode) : 'Nästa steg';
  const processStep = node.bpmnFile.replace('.bpmn', '');
  const versionLabel = model.summary
    ? '1.0 (LLM-validerad) – uppdateras vid ändring'
    : '1.0 (exempel) – uppdateras vid ändring';
  const ownerLabel = 'Produktägare Kredit / Risk & Policy';

  const summaryText =
    model.summary ||
    `${nodeName} samlar och koordinerar ett antal epics för att skapa ett sammanhängande kreditflöde med tydlig ansvarsfördelning och spårbarhet.`;
  const summarySource = model.summary ? 'llm' : 'fallback';

  const prerequisites = model.prerequisites && model.prerequisites.length > 0
    ? model.prerequisites
    : [
        upstreamNode
          ? `Triggas normalt efter <strong>${formatNodeName(upstreamNode)}</strong>.`
          : 'Triggas när föregående processsteg är klart.',
        'Förutsätter att grundläggande kund- och ansökningsdata är validerade.',
        'Eventuella föregående KYC/AML- och identitetskontroller ska vara godkända.',
      ];
  const prerequisitesSource = model.prerequisites && model.prerequisites.length > 0 ? 'llm' : 'fallback';

  const flowSteps = model.flowSteps && model.flowSteps.length > 0
    ? model.flowSteps
    : [
        `Initiativet startar i ${upstreamName} när en kreditprocess initieras.`,
        `${nodeName} samlar in, koordinerar och kvalitetssäkrar data och beslut från ingående epics.`,
        'Regler och policystöd appliceras på ett konsekvent sätt för att möjliggöra välgrundade kreditbeslut.',
        `Resultat och status förs vidare till ${downstreamName} och vidare in i efterföljande processer.`,
      ];
  const flowStepsSource = model.flowSteps && model.flowSteps.length > 0 ? 'llm' : 'fallback';

  const dependencies = model.dependencies && model.dependencies.length > 0
    ? model.dependencies
    : [
        'Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering.',
        'Integrationer mot kunddata, engagemangsdata och externa källor (t.ex. UC, PSD2).',
        'Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj.',
      ];
  const dependenciesSource = model.dependencies && model.dependencies.length > 0 ? 'llm' : 'fallback';

  const userStories = model.userStories && model.userStories.length > 0
    ? model.userStories
    : [
        {
          id: 'US-1',
          role: 'Produktägare',
          goal: 'Få Feature Goalet implementerat och levererat',
          value: 'Möjliggöra affärsvärde genom sammanhängande kreditflöde',
          acceptanceCriteria: [
            'Alla ingående epics är implementerade och testade',
            'Feature Goalet stödjer definierade affärsscenarier',
            'Automatiska tester täcker centrala flöden',
            'Dokumentation är uppdaterad och tillgänglig',
          ],
        },
      ];
  const userStoriesSource = model.userStories && model.userStories.length > 0 ? 'llm' : 'fallback';

  const implementationNotes =
    model.implementationNotes && model.implementationNotes.length > 0
      ? model.implementationNotes
      : [
          'API- och integrationskontrakt ska vara dokumenterade per epic och nod.',
          'Viktiga datafält bör speglas i loggar och domän-events för spårbarhet.',
          'Edge-cases (t.ex. avbrutna flöden eller externa tjänstefel) ska hanteras konsekvent över epics.',
          'DMN-kopplingar för risk, skuldsättning och produktvillkor dokumenteras i respektive Business Rule-dokumentation.',
        ];
  const implementationNotesSource =
    model.implementationNotes && model.implementationNotes.length > 0 ? 'llm' : 'fallback';

  return `
    <section class="doc-section">
      <span class="doc-badge">Feature Goal</span>
      <h1>${nodeName}</h1>
      <p class="muted">${node.type} i ${processStep} mellan ${upstreamName} → ${downstreamName}.</p>
      <ul>
        <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
        <li><strong>Kreditprocess-steg:</strong> ${processStep}</li>
        <li><strong>Ägare:</strong> ${ownerLabel}</li>
        <li><strong>Version &amp; datum:</strong> ${versionLabel}</li>
      </ul>
    </section>

    <section class="doc-section" data-source-summary="${summarySource}">
      <h2>Sammanfattning</h2>
      <p>${summaryText}</p>
    </section>

    <section class="doc-section" data-source-prerequisites="${prerequisitesSource}">
      <h2>Förutsättningar</h2>
      ${renderList(prerequisites)}
    </section>

    <section class="doc-section" data-source-flow="${flowStepsSource}">
      <h2>Funktionellt flöde</h2>
      <ol>
        ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </section>

    <section class="doc-section" data-source-dependencies="${dependenciesSource}">
      <h2>Beroenden</h2>
      ${renderList(dependencies)}
    </section>

    <section class="doc-section" data-source-user-stories="${userStoriesSource}">
      <h2>User Stories</h2>
      <p class="muted">User stories med acceptanskriterier som ska mappas till automatiska tester.</p>
      ${userStories.map((story) => `
        <div class="user-story" style="margin-bottom: 2rem; padding: 1rem; border-left: 3px solid #3b82f6; background: #f8fafc;">
          <h3 style="margin-top: 0; margin-bottom: 0.5rem;">
            <strong>${story.id}:</strong> Som <strong>${story.role}</strong> vill jag <strong>${story.goal}</strong> så att <strong>${story.value}</strong>
          </h3>
          <div style="margin-top: 1rem;">
            <p style="margin-bottom: 0.5rem; font-weight: 600;">Acceptanskriterier:</p>
            <ul style="margin-top: 0;">
              ${story.acceptanceCriteria.map((ac) => `<li>${ac}</li>`).join('')}
            </ul>
          </div>
          ${
            links.testLink
              ? `<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil: <code>${links.testLink}</code></p>`
              : '<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil länkas via node_test_links</p>'
          }
        </div>
      `).join('')}
    </section>

    <section class="doc-section" data-source-implementation-notes="${implementationNotesSource}">
      <h2>Implementation Notes</h2>
      ${renderList(implementationNotes)}
    </section>

  `;
}

/**
 * Builds a BusinessRuleDocModel from NodeDocumentationContext.
 * This extracts the model-building logic so it can be reused for both
 * local generation and LLM-based generation.
 */
function buildBusinessRuleDocModelFromContext(
  context: NodeDocumentationContext,
  links: TemplateLinks,
): BusinessRuleDocModel {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Business Rule';
  const upstreamNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const nextNode = context.childNodes.length ? context.childNodes[0] : undefined;
  const upstreamName = upstreamNode ? formatNodeName(upstreamNode) : 'Processstart';
  const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg i processen';

  const summary = `${nodeName} kombinerar flera risk- och kreditparametrar för att avgöra om en ansökan kan godkännas, ska skickas till manuell granskning eller avslås. Regeln säkerställer konsekvent tillämpning av kreditpolicy och riskmandat för målgrupperna.`;

  const inputs = [
    upstreamNode
      ? `Triggas normalt efter <strong>${formatNodeName(upstreamNode)}</strong>.`
      : 'Triggas när föregående processsteg (t.ex. scoring eller datainsamling) är klart.',
    'Kräver att central kund- och ansökningsdata är komplett och validerad.',
    'Förutsätter att nödvändiga externa registerslagningar (t.ex. UC, kreditupplysning) är gjorda.',
  ];

  const decisionLogic = [
    'Hög riskScore och måttlig skuldsättning ger normalt auto-approve.',
    'Mellanrisk eller ofullständig data leder till manuell granskning.',
    'Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline.',
  ];

  const outputs = [
    'Beslut: APPROVE, REFER (manuell granskning) eller DECLINE.',
    `Processpåverkan: fortsätter till ${downstreamName} vid APPROVE, pausas i manuell kö vid REFER, avslutas vid DECLINE.`,
    'Flaggor: t.ex. hög skuldsättning, bristfällig dokumentation, sanktions-/fraudträff.',
    'Loggning: beslut, huvudparametrar och regelversion loggas för audit.',
  ];

  const businessRulesPolicy = [
    'Stödjer intern kreditpolicy och mandat för respektive produkt och segment.',
    'Bygger på dokumenterade riskramverk och beslutsmodeller.',
    'Tar hänsyn till regulatoriska krav (t.ex. konsumentkreditlag, AML/KYC) på en övergripande nivå.',
  ];

  const scenarios = [
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


  const dmnLabel = links.dmnLink ? links.dmnLink.split('/').pop() : 'Beslutstabell';

  const relatedItems = [
    links.dmnLink
      ? `Relaterad DMN-modell: <a href="${links.dmnLink}">${dmnLabel}</a>`
      : 'Ingen DMN-länk konfigurerad ännu – lägg till beslutstabell/DMN när den finns.',
    links.bpmnViewerLink
      ? `Relaterad BPMN-subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`
      : 'Subprocess-länk sätts via BPMN viewer.',
    context.parentChain.length
      ? `Överordnad nod: ${buildNodeLink(context.parentChain[context.parentChain.length - 1])}`
      : 'Överordnad nod: Rotprocess',
  ];

  return {
    summary,
    inputs,
    decisionLogic,
    outputs,
    businessRulesPolicy,
    relatedItems,
  };
}

/**
 * Legacy function that builds HTML directly from context.
 * Now refactored to use the model-based approach for consistency.
 * @deprecated Use buildBusinessRuleDocModelFromContext + buildBusinessRuleDocHtmlFromModel instead
 */
function buildBusinessRuleDocBody(
  context: NodeDocumentationContext,
  links: TemplateLinks,
): string {
  const model = buildBusinessRuleDocModelFromContext(context, links);
  return buildBusinessRuleDocHtmlFromModel(context, links, model);
}

/**
 * Unified render function for Feature Goal documentation.
 * 
 * ## Pipeline Steps
 * 
 * 1. **Build base model** from BPMN context
 * 2. **Apply per-node overrides** (if any exist in `src/data/node-docs/`)
 * 3. **Apply LLM patch** (if `llmContent` is provided - from Claude/Anthropic)
 * 4. **Fetch test data**:
 *    - Planned scenarios from database (prioritizes provider based on LLM usage)
 *    - E2E test info (API calls, UI interactions, DMN decisions)
 * 5. **Render HTML** using the unified template
 * 
 * ## Error Handling
 * 
 * - **Missing overrides**: Gracefully falls back to base model (expected behavior)
 * - **Invalid LLM content**: Falls back to base model, logs warning
 * - **Missing test scenarios**: Uses empty array, logs info (not critical)
 * - **Missing E2E test info**: Uses undefined, renders with placeholders (not critical)
 * 
 * ## Validation
 * 
 * The model is validated after merge to ensure:
 * - All required fields are present
 * - String fields are non-empty (or have fallback values)
 * - Array fields are arrays (even if empty)
 * 
 * @param context - Node documentation context
 * @param links - Template links
 * @param llmContent - Optional LLM-generated content (from Claude/Anthropic)
 * @param llmMetadata - Optional LLM metadata
 * @param scenarioProvider - Explicit scenario provider (overrides auto-detection)
 * @returns Complete HTML document
 * @throws Never throws - always returns valid HTML (falls back gracefully on errors)
 */
export async function renderFeatureGoalDoc(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  llmContent?: string,
  llmMetadata?: LlmMetadata | LlmHtmlRenderOptions,
  scenarioProvider?: ScenarioProvider,
): Promise<string> {
  try {
    // 1. Build base model from context
    let model = buildFeatureGoalDocModelFromContext(context);

    // 2. Apply per-node overrides (if any)
    let overrides;
    try {
      overrides = await loadFeatureGoalOverrides(context);
      model = mergeFeatureGoalOverrides(model, overrides);
    } catch (error) {
      console.warn(
        `[renderFeatureGoalDoc] Error loading overrides for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        error
      );
      // Continue with base model - overrides are optional
    }

    // 3. Apply LLM patch (if provided)
    if (llmContent) {
      try {
        const llmModel = mapFeatureGoalLlmToSections(llmContent);
        model = mergeLlmPatch(model, llmModel);
      } catch (error) {
        console.warn(
          `[renderFeatureGoalDoc] Error parsing/merging LLM content for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
          error
        );
        // Continue with base/override model - LLM patch is optional
      }
    }

    // 3.5. Validate model after merge
    const validation = validateFeatureGoalModelAfterMerge(model);
    if (!validation.valid) {
      console.error(
        `[renderFeatureGoalDoc] Model validation failed for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        validation.errors
      );
      // Log warnings but don't fail
      if (validation.warnings.length > 0) {
        console.warn(
          `[renderFeatureGoalDoc] Model validation warnings for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
          validation.warnings
        );
      }
      // Continue anyway - model might still be renderable with missing fields
    } else if (validation.warnings.length > 0) {
      // Log warnings for empty arrays (not critical)
      console.info(
        `[renderFeatureGoalDoc] Model validation warnings for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        validation.warnings
      );
    }

    // 4. Fetch test data from database and E2E scenarios
    let plannedScenarios: TestScenarioData | null = null;
    let e2eTestInfo: Map<string, E2eTestStepInfo[]> | undefined = undefined;

    {
      // Determine preferred provider: use cloud if LLM was used, otherwise local-fallback
      const preferredProvider = scenarioProvider || (llmContent ? 'cloud' : 'local-fallback');
      
      // Fetch planned scenarios from database
      if (context.node.bpmnFile && context.node.bpmnElementId) {
        try {
          plannedScenarios = await fetchPlannedScenarios(
            context.node.bpmnFile,
            context.node.bpmnElementId,
            preferredProvider,
          );
        } catch (error) {
          console.warn(
            `[renderFeatureGoalDoc] Error fetching planned scenarios for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
            error
          );
          // Continue with null - scenarios are optional
        }
      }

      // Aggregate E2E test info for child nodes
      const childNodeIds = context.childNodes
        .filter(child => ['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'].includes(child.type))
        .map(child => child.bpmnElementId)
        .filter((id): id is string => Boolean(id));
      
      if (childNodeIds.length > 0) {
        try {
          e2eTestInfo = aggregateE2eTestInfoForFeatureGoal(childNodeIds, context.node.bpmnFile);
        } catch (error) {
          console.warn(
            `[renderFeatureGoalDoc] Error aggregating E2E test info for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
            error
          );
          // Continue with undefined - E2E test info is optional
        }
      }
    }

    // 5. Render HTML via unified renderer
    const body = buildFeatureGoalDocHtmlFromModel(context, links, model);
    const title = context.node.name || context.node.bpmnElementId || 'Feature Goal';
    return wrapDocument(title, body, llmMetadata);
  } catch (error) {
    // Final fallback: return minimal HTML document
    console.error(
      `[renderFeatureGoalDoc] Critical error rendering documentation for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
      error
    );
    const title = context.node.name || context.node.bpmnElementId || 'Feature Goal';
    return wrapDocument(
      title,
      `<section><h2>Error</h2><p>Failed to render documentation. Please check the console for details.</p></section>`,
      llmMetadata
    );
  }
}

/**
 * Unified render function for Epic documentation.
 * 
 * ## Pipeline Steps
 * 
 * 1. **Build base model** from BPMN context
 * 2. **Apply per-node overrides** (if any exist in `src/data/node-docs/`)
 * 3. **Apply LLM patch** (if `llmContent` is provided - from Claude/Anthropic)
 * 4. **Validate model** after merge
 * 5. **Render HTML** using unified renderer
 * 
 * ## Error Handling
 * 
 * - **Missing overrides**: Gracefully falls back to base model (expected behavior)
 * - **Invalid LLM content**: Falls back to base model, logs warning
 * - **Validation errors**: Logs errors but continues (model might still be renderable)
 * 
 * @param context - Node documentation context
 * @param links - Template links
 * @param llmContent - Optional LLM-generated content (from Claude/Anthropic)
 * @param llmMetadata - Optional LLM metadata
 * @returns Complete HTML document
 * @throws Never throws - always returns valid HTML (falls back gracefully on errors)
 */
export async function renderEpicDoc(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  llmContent?: string,
  llmMetadata?: LlmMetadata | LlmHtmlRenderOptions,
): Promise<string> {
  try {
    // 1. Build base model from context
    let model = buildEpicDocModelFromContext(context);

    // 2. Apply per-node overrides (if any)
    let overrides;
    try {
      overrides = await loadEpicOverrides(context);
      model = mergeEpicOverrides(model, overrides);
    } catch (error) {
      console.warn(
        `[renderEpicDoc] Error loading overrides for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        error
      );
      // Continue with base model - overrides are optional
    }

    // 3. Apply LLM patch (if provided)
    if (llmContent) {
      try {
        const llmModel = mapEpicLlmToSections(llmContent);
        model = mergeLlmPatch(model, llmModel);
      } catch (error) {
        console.warn(
          `[renderEpicDoc] Error parsing/merging LLM content for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
          error
        );
        // Continue with base/override model - LLM patch is optional
      }
    }

    // 3.5. Validate model after merge
    const validation = validateEpicModelAfterMerge(model);
    if (!validation.valid) {
      console.error(
        `[renderEpicDoc] Model validation failed for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        validation.errors
      );
      // Log warnings but don't fail
      if (validation.warnings.length > 0) {
        console.warn(
          `[renderEpicDoc] Model validation warnings for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
          validation.warnings
        );
      }
      // Continue anyway - model might still be renderable with missing fields
    } else if (validation.warnings.length > 0) {
      // Log warnings for empty arrays (not critical)
      console.info(
        `[renderEpicDoc] Model validation warnings for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        validation.warnings
      );
    }

    // 4. Render HTML via unified renderer
    const body = buildEpicDocHtmlFromModel(context, links, model);
    const title = context.node.name || context.node.bpmnElementId || 'Epic';
    return wrapDocument(title, body, llmMetadata);
  } catch (error) {
    // Final fallback: return minimal HTML document
    console.error(
      `[renderEpicDoc] Critical error rendering documentation for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
      error
    );
    const title = context.node.name || context.node.bpmnElementId || 'Epic';
    return wrapDocument(
      title,
      `<section><h2>Error</h2><p>Failed to render documentation. Please check the console for details.</p></section>`,
      llmMetadata
    );
  }
}

const renderBusinessRuleDocLegacy = async (
  context: NodeDocumentationContext,
  links: TemplateLinks
): Promise<string> => {
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
    const schemaBody = await renderFromSchema(BUSINESS_RULE_DOC_SCHEMA, {
      templateId: 'business-rule',
      context,
      links,
    });
    return wrapDocument(nodeName, schemaBody || body);
  }

  return wrapDocument(nodeName, body);
};

/**
 * Unified render function for Business Rule documentation.
 * Handles: base model → per-node overrides → optional LLM patch → HTML renderer
 * 
 * @param context - Node documentation context
 * @param links - Template links
 * @param llmContent - Optional LLM-generated content (for Claude/Ollama)
 * @param llmMetadata - Optional LLM metadata
 * @returns Complete HTML document
 */
/**
 * Unified render function for Business Rule documentation.
 * 
 * ## Pipeline Steps
 * 
 * 1. **Build base model** from BPMN context
 * 2. **Apply per-node overrides** (if any exist in `src/data/node-docs/`)
 * 3. **Apply LLM patch** (if `llmContent` is provided - from Claude/Anthropic)
 * 4. **Validate model** after merge
 * 5. **Render HTML** using unified renderer
 * 
 * ## Error Handling
 * 
 * - **Missing overrides**: Gracefully falls back to base model (expected behavior)
 * - **Invalid LLM content**: Falls back to base model, logs warning
 * - **Validation errors**: Logs errors but continues (model might still be renderable)
 * 
 * @param context - Node documentation context
 * @param links - Template links
 * @param llmContent - Optional LLM-generated content (from Claude/Anthropic)
 * @param llmMetadata - Optional LLM metadata
 * @returns Complete HTML document
 * @throws Never throws - always returns valid HTML (falls back gracefully on errors)
 */
export async function renderBusinessRuleDoc(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  llmContent?: string,
  llmMetadata?: LlmMetadata | LlmHtmlRenderOptions,
): Promise<string> {
  try {
    // 1. Build base model from context
    let model = buildBusinessRuleDocModelFromContext(context, links);

    // 2. Apply per-node overrides (if any)
    let overrides;
    try {
      overrides = await loadBusinessRuleOverrides(context);
      model = mergeBusinessRuleOverrides(model, overrides);
    } catch (error) {
      console.warn(
        `[renderBusinessRuleDoc] Error loading overrides for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        error
      );
      // Continue with base model - overrides are optional
    }

    // 3. Apply LLM patch (if provided)
    if (llmContent) {
      try {
        const llmModel = mapBusinessRuleLlmToSections(llmContent);
        model = mergeLlmPatch(model, llmModel);
      } catch (error) {
        console.warn(
          `[renderBusinessRuleDoc] Error parsing/merging LLM content for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
          error
        );
        // Continue with base/override model - LLM patch is optional
      }
    }

    // 3.5. Validate model after merge
    const validation = validateBusinessRuleModelAfterMerge(model);
    if (!validation.valid) {
      console.error(
        `[renderBusinessRuleDoc] Model validation failed for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        validation.errors
      );
      // Log warnings but don't fail
      if (validation.warnings.length > 0) {
        console.warn(
          `[renderBusinessRuleDoc] Model validation warnings for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
          validation.warnings
        );
      }
      // Continue anyway - model might still be renderable with missing fields
    } else if (validation.warnings.length > 0) {
      // Log warnings for empty arrays (not critical)
      console.info(
        `[renderBusinessRuleDoc] Model validation warnings for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        validation.warnings
      );
    }

    // 4. Render HTML via unified renderer
    const body = buildBusinessRuleDocHtmlFromModel(context, links, model);
    const title = context.node.name || context.node.bpmnElementId || 'Business Rule';
    return wrapDocument(title, body, llmMetadata);
  } catch (error) {
    // Final fallback: return minimal HTML document
    console.error(
      `[renderBusinessRuleDoc] Critical error rendering documentation for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
      error
    );
    const title = context.node.name || context.node.bpmnElementId || 'Business Rule';
    return wrapDocument(
      title,
      `<section><h2>Error</h2><p>Failed to render documentation. Please check the console for details.</p></section>`,
      llmMetadata
    );
  }
}

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
