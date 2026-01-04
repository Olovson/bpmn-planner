import { NodeDocumentationContext } from './documentationContext';
import type { BpmnProcessNode } from './bpmnProcessGraph';
import { getNodeDocViewerPath, getFeatureGoalDocFileKey } from './nodeArtifactPaths';
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
  /**
   * JSON-data som ska bäddas in i dokumentet (för testinfo/automation).
   */
  jsonData?: unknown;
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
  let jsonData: unknown = undefined;

  if (options) {
    if ('provider' in options) {
      llmMetadata = options;
    } else {
      llmMetadata = options.llmMetadata;
      fallbackBadge = Boolean(options.fallbackBadge);
      fallbackReason = options.fallbackReason;
      fallbackUsed = options.fallbackUsed;
      finalProvider = options.finalProvider;
      jsonData = options.jsonData;
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
  
  const jsonScript = jsonData
    ? `\n  <script type="application/json">${JSON.stringify(jsonData, null, 2).replaceAll('</script>', '<\\\\/script>')}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>${jsonScript}
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

/**
 * Extraherar gemensamma kontextvariabler från NodeDocumentationContext.
 * Används av både buildEpicDocModelFromContext och buildEpicDocHtmlFromModel.
 */
interface EpicContextVars {
  nodeName: string;
  previousNode: NodeDocumentationContext['node'] | undefined;
  nextNode: NodeDocumentationContext['node'] | undefined;
  upstreamName: string;
  downstreamName: string;
  processStep: string;
  isUserTask: boolean;
  isServiceTask: boolean;
  apiSlug: string;
}

/**
 * Hittar nästa nod i sekvensflödet baserat på BPMN-elementets outgoing flows.
 * Detta är mer korrekt än att använda childNodes (som är hierarkiska children, inte nästa steg i flödet).
 */
function findNextNodeInSequenceFlow(
  context: NodeDocumentationContext
): BpmnProcessNode | undefined {
  const node = context.node;
  
  // Försök hitta nästa nod via BPMN-elementets outgoing flows
  if (node.element?.businessObject?.outgoing) {
    const outgoing = node.element.businessObject.outgoing;
    // outgoing kan vara en array eller ett enskilt objekt
    const outgoingFlows = Array.isArray(outgoing) ? outgoing : [outgoing];
    
    if (outgoingFlows.length > 0) {
      // Ta första outgoing flow
      const firstFlow = outgoingFlows[0];
      // targetRef kan vara ett objekt med id eller en sträng
      const targetRef = firstFlow?.targetRef?.id || firstFlow?.targetRef || firstFlow?.$?.targetRef;
      
      if (targetRef) {
        // Hitta noden med samma element ID i samma fil
        // Först kolla siblings (noder i samma process)
        const nextSibling = context.siblingNodes.find(
          (sibling) => sibling.bpmnElementId === targetRef && sibling.bpmnFile === node.bpmnFile
        );
        if (nextSibling) {
          return nextSibling;
        }
        
        // Om inte hittat i siblings, kolla children (kan vara en subprocess)
        const nextChild = context.childNodes.find(
          (child) => child.bpmnElementId === targetRef && child.bpmnFile === node.bpmnFile
        );
        if (nextChild) {
          return nextChild;
        }
      }
    }
  }
  
  // Fallback: använd första child om det finns (för subprocesser)
  return context.childNodes.length > 0 ? context.childNodes[0] : undefined;
}

function extractEpicContextVars(context: NodeDocumentationContext): EpicContextVars {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Epic';
  const previousNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  // Använd sequence flow för att hitta nästa steg istället för hierarkiska children
  const nextNode = findNextNodeInSequenceFlow(context);
  const upstreamName = previousNode ? formatNodeName(previousNode) : 'Processstart';
  const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg';
  const processStep = node.bpmnFile.replace('.bpmn', '');
  const isUserTask = node.type === 'userTask';
  const isServiceTask = node.type === 'serviceTask';
  const apiSlug = slugify(nodeName);

  return {
    nodeName,
    previousNode,
    nextNode,
    upstreamName,
    downstreamName,
    processStep,
    isUserTask,
    isServiceTask,
    apiSlug,
  };
}

/**
 * Identifierar nodtyp baserat på nodnamn.
 */
interface NodeTypeFlags {
  isDataGathering: boolean;
  isEvaluation: boolean;
  isDecision: boolean;
}

function identifyNodeType(nodeName: string): NodeTypeFlags {
  const nodeNameLower = nodeName.toLowerCase();
  return {
    isDataGathering: nodeNameLower.includes('data') && (nodeNameLower.includes('gathering') || nodeNameLower.includes('fetch') || nodeNameLower.includes('hämta')),
    isEvaluation: nodeNameLower.includes('evaluation') || nodeNameLower.includes('bedömning') || nodeNameLower.includes('utvärdering'),
    isDecision: nodeNameLower.includes('decision') || nodeNameLower.includes('beslut'),
  };
}

/**
 * Build Feature Goal base model from context - kopierad från Epic för konsistens.
 * 
 * Feature Goals använder nu samma struktur som Epics.
 */
export function buildFeatureGoalDocModelFromContext(
  context: NodeDocumentationContext,
): FeatureGoalDocModel {
  // INGEN FALLBACK-TEXT - LLM måste generera allt
  // User stories måste ha roll 'Kund', 'Handläggare' eller 'Processägare' - inga System-roller
  // Returnerar tom modell - LLM måste fylla i allt
  // prerequisites konsoliderat till dependencies (samma som Epic)
  return {
    summary: '',
    flowSteps: [],
    dependencies: [],
    userStories: [],
    usageCases: context.usageCases, // Include usageCases from context if available
  };
}

function buildEpicDocModelFromContext(
  context: NodeDocumentationContext,
): EpicDocModel {
  // INGEN FALLBACK-TEXT - LLM måste generera allt
  const summary = '';
  const flowSteps: string[] = [];
  const interactions: string[] = [];
  const dependencies: string[] = [];
  const userStories: EpicUserStory[] = [];

  return {
    summary,
    flowSteps,
    interactions,
    dependencies,
    userStories,
  };
}

function buildEpicDocHtmlFromModel(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  model: EpicDocModel,
): string {
  const node = context.node;
  const ctx = extractEpicContextVars(context);
  const nodeTypes = identifyNodeType(ctx.nodeName);

  // INGEN FALLBACK-TEXT - LLM måste generera allt
  const summaryText = model.summary || '';
  const summarySource = model.summary ? 'llm' : 'missing';
  
  // Funktionellt flöde: endast om LLM genererat (inga fallback)
  const flowSteps = model.flowSteps.length ? model.flowSteps : [];
  const flowStepsSource = model.flowSteps.length ? 'llm' : 'missing';

  // Interaktioner: endast för user tasks, endast om LLM genererat (inga fallback)
  const interactions = model.interactions && model.interactions.length ? model.interactions : [];
  const interactionsSource = model.interactions && model.interactions.length ? 'llm' : 'missing';

  // Beroenden: endast om LLM genererat (inga fallback)
  // Inkluderar både process-kontext (vad måste vara klart före) och tekniska system (vad behövs för att köra)
  const dependencies = model.dependencies && Array.isArray(model.dependencies) && model.dependencies.length > 0
    ? model.dependencies
    : [];
  const dependenciesSource = model.dependencies && Array.isArray(model.dependencies) && model.dependencies.length > 0 ? 'llm' : 'missing';

  // User stories: endast från LLM, inga fallback
  const userStories = model.userStories.length > 0 ? model.userStories : [];
  const userStoriesSource = model.userStories.length > 0 ? 'llm' : 'missing';


  return `
    <section class="doc-section">
      <span class="doc-badge">Epic</span>
      <h1>${ctx.nodeName}</h1>
      <p class="muted">${node.type} i ${ctx.processStep} mellan ${ctx.upstreamName} → ${ctx.downstreamName}.</p>
      <ul>
        <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
        <li><strong>Kreditprocess-steg:</strong> ${ctx.processStep}</li>
      </ul>
    </section>

    ${summaryText ? `
    <section class="doc-section" data-source-summary="${summarySource}">
      <h2>Sammanfattning</h2>
      <p>${summaryText}</p>
    </section>
    ` : ''}

    ${flowSteps.length > 0 ? `
    <section class="doc-section" data-source-flow="${flowStepsSource}">
      <h2>Funktionellt flöde</h2>
      <ol>
        ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </section>
    ` : ''}

    ${interactions.length > 0 && interactionsSource !== 'missing' ? `
    <section class="doc-section" data-source-interactions="${interactionsSource}">
      <h2>Interaktioner</h2>
      ${renderList(interactions)}
    </section>
    ` : ''}

    ${dependencies.length > 0 ? `
    <section class="doc-section" data-source-dependencies="${dependenciesSource}">
      <h2>Beroenden</h2>
      ${renderList(dependencies)}
    </section>
    ` : ''}

    ${userStories.length > 0 ? `
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
    ` : ''}

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
 */
export function buildFeatureGoalDocHtmlFromModel(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  model: FeatureGoalDocModel,
): string {
  const node = context.node;
  const ctx = extractEpicContextVars(context);

  // INGEN FALLBACK-TEXT - LLM måste generera allt
  const summaryText = model.summary || '';
  const summarySource = model.summary ? 'llm' : 'missing';

  // INGEN FALLBACK-TEXT - LLM måste generera allt
  const flowSteps = model.flowSteps && model.flowSteps.length > 0 ? model.flowSteps : [];
  const flowStepsSource = model.flowSteps && model.flowSteps.length > 0 ? 'llm' : 'missing';
  
  // Beroenden: endast om LLM genererat (inga fallback)
  // Inkluderar både process-kontext (vad måste vara klart före, tidigare prerequisites) och tekniska system (vad behövs för att köra)
  const dependencies = model.dependencies && Array.isArray(model.dependencies) && model.dependencies.length > 0
    ? model.dependencies
    : [];
  const dependenciesSource = model.dependencies && Array.isArray(model.dependencies) && model.dependencies.length > 0 ? 'llm' : 'missing';
  
  const userStories = model.userStories || [];
  const userStoriesSource = model.userStories && model.userStories.length > 0 ? 'llm' : 'missing';

  // Samla in ingående tasks från descendant nodes (för översiktlig lista)
  // Lägg till länkar till Epic-dokumentationen för varje task/activity
  // VIKTIGT: Deduplicera baserat på unik nyckel (bpmnFile + bpmnElementId) för att undvika duplicering
  // när samma subprocess anropas flera gånger
  
  // Service Tasks: Deduplicera baserat på bpmnFile + bpmnElementId
  // VIKTIGT: Spara även bpmnFile för att kunna deduplicera korrekt i allEpics
  const serviceTasksMap = new Map<string, { id: string; name: string; docUrl: string; bpmnFile: string }>();
  context.descendantNodes
    .filter(n => n.type === 'serviceTask' && n.bpmnElementId && n.bpmnFile)
    .forEach(n => {
      if (!n.bpmnElementId || !n.bpmnFile) return;
      const uniqueKey = `${n.bpmnFile}::${n.bpmnElementId}`;
      if (!serviceTasksMap.has(uniqueKey)) {
        const docPath = getNodeDocViewerPath(n.bpmnFile, n.bpmnElementId);
        const docUrl = `#/doc-viewer/${encodeURIComponent(docPath)}`;
        serviceTasksMap.set(uniqueKey, {
          id: n.bpmnElementId,
          name: n.name || n.bpmnElementId,
          docUrl,
          bpmnFile: n.bpmnFile,
        });
      }
    });
  const serviceTasks = Array.from(serviceTasksMap.values());
  
  // User Tasks: Deduplicera baserat på bpmnFile + bpmnElementId
  // VIKTIGT: Spara även bpmnFile för att kunna deduplicera korrekt i allEpics
  const userTasksMap = new Map<string, { id: string; name: string; docUrl: string; bpmnFile: string }>();
  context.descendantNodes
    .filter(n => n.type === 'userTask' && n.bpmnElementId && n.bpmnFile)
    .forEach(n => {
      if (!n.bpmnElementId || !n.bpmnFile) return;
      const uniqueKey = `${n.bpmnFile}::${n.bpmnElementId}`;
      if (!userTasksMap.has(uniqueKey)) {
        const docPath = getNodeDocViewerPath(n.bpmnFile, n.bpmnElementId);
        const docUrl = `#/doc-viewer/${encodeURIComponent(docPath)}`;
        userTasksMap.set(uniqueKey, {
          id: n.bpmnElementId,
          name: n.name || n.bpmnElementId,
          docUrl,
          bpmnFile: n.bpmnFile,
        });
      }
    });
  const userTasks = Array.from(userTasksMap.values());
  
  // Call Activities: Deduplicera baserat på subprocessFile (eller bpmnFile + bpmnElementId som fallback)
  const callActivitiesMap = new Map<string, { id: string; name: string; docUrl: string }>();
  context.descendantNodes
    .filter(n => n.type === 'callActivity' && n.bpmnElementId && n.bpmnFile && n.subprocessFile)
    .forEach(n => {
      // För call activities: länka till Process Feature Goal för subprocess-filen (non-hierarchical)
      // VIKTIGT: CallActivities länkar till Process Feature Goal för subprocess-filen, INTE till CallActivity Feature Goal
      // Process Feature Goals använder non-hierarchical naming: feature-goals/{subprocessBaseName}
      if (!n.bpmnElementId || !n.bpmnFile || !n.subprocessFile) return;
      
      // Använd subprocessFile som unik nyckel (samma subprocess ska bara visas en gång)
      const uniqueKey = n.subprocessFile;
      if (!callActivitiesMap.has(uniqueKey)) {
        const subprocessBaseName = n.subprocessFile.replace('.bpmn', '');
        try {
          // Använd non-hierarchical naming för Process Feature Goal (ingen parent)
          const featureGoalPath = getFeatureGoalDocFileKey(
            n.subprocessFile,
            subprocessBaseName, // För Process Feature Goals är elementId = baseName
            undefined, // no version suffix
            undefined, // no parent (non-hierarchical)
            false, // isRootProcess = false (detta är en subprocess)
          );
          const featureGoalViewerPath = featureGoalPath.replace('.html', '');
          const docUrl = `#/doc-viewer/${encodeURIComponent(featureGoalViewerPath)}`;
          callActivitiesMap.set(uniqueKey, {
            id: n.bpmnElementId,
            name: n.name || n.bpmnElementId,
            docUrl,
          });
        } catch (error) {
          // Logga varning men fortsätt (kan hända om subprocessFile saknas)
          if (import.meta.env.DEV) {
            console.warn(
              `[buildFeatureGoalDocHtmlFromModel] Failed to generate Feature Goal link for call activity ${n.bpmnElementId}:`,
              error
            );
          }
        }
      }
    });
  const callActivities = Array.from(callActivitiesMap.values());
  
  // Business Rule Tasks: Deduplicera baserat på bpmnFile + bpmnElementId
  // VIKTIGT: Spara även bpmnFile för att kunna deduplicera korrekt i allEpics
  const businessRuleTasksMap = new Map<string, { id: string; name: string; docUrl: string; bpmnFile: string }>();
  context.descendantNodes
    .filter(n => n.type === 'businessRuleTask' && n.bpmnElementId && n.bpmnFile)
    .forEach(n => {
      if (!n.bpmnElementId || !n.bpmnFile) return;
      const uniqueKey = `${n.bpmnFile}::${n.bpmnElementId}`;
      if (!businessRuleTasksMap.has(uniqueKey)) {
        const docPath = getNodeDocViewerPath(n.bpmnFile, n.bpmnElementId);
        const docUrl = `#/doc-viewer/${encodeURIComponent(docPath)}`;
        businessRuleTasksMap.set(uniqueKey, {
          id: n.bpmnElementId,
          name: n.name || n.bpmnElementId,
          docUrl,
          bpmnFile: n.bpmnFile,
        });
      }
    });
  const businessRuleTasks = Array.from(businessRuleTasksMap.values());

  const hasIncludedTasks = serviceTasks.length > 0 || userTasks.length > 0 || callActivities.length > 0 || businessRuleTasks.length > 0;

  // Samla alla epics (serviceTasks, userTasks, businessRuleTasks) för att visa i BPMN-element-listan
  // VIKTIGT: Deduplicera baserat på bpmnFile + id för att undvika duplicering när samma element-ID
  // finns i olika filer eller när samma subprocess anropas flera gånger
  const allEpicsMap = new Map<string, { id: string; name: string; type: string }>();
  
  // Lägg till service tasks (använd bpmnFile + id som unik nyckel)
  serviceTasks.forEach(t => {
    const uniqueKey = `${t.bpmnFile}::${t.id}`;
    if (!allEpicsMap.has(uniqueKey)) {
      allEpicsMap.set(uniqueKey, { id: t.id, name: t.name, type: 'serviceTask' });
    }
  });
  
  // Lägg till user tasks (använd bpmnFile + id som unik nyckel)
  userTasks.forEach(t => {
    const uniqueKey = `${t.bpmnFile}::${t.id}`;
    if (!allEpicsMap.has(uniqueKey)) {
      allEpicsMap.set(uniqueKey, { id: t.id, name: t.name, type: 'userTask' });
    }
  });
  
  // Lägg till business rule tasks (använd bpmnFile + id som unik nyckel)
  businessRuleTasks.forEach(t => {
    const uniqueKey = `${t.bpmnFile}::${t.id}`;
    if (!allEpicsMap.has(uniqueKey)) {
      allEpicsMap.set(uniqueKey, { id: t.id, name: t.name, type: 'businessRuleTask' });
    }
  });
  
  const allEpics = Array.from(allEpicsMap.values());

  // Generera genereringsdatum
  const generationDate = new Date().toLocaleString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <section class="doc-section">
      <span class="doc-badge">Feature Goal</span>
      <h1>${ctx.nodeName}</h1>
      <p class="muted">${node.type} i ${ctx.processStep} mellan ${ctx.upstreamName} → ${ctx.downstreamName}.</p>
      <ul>
        ${allEpics.length > 0 ? `
          <li><strong>BPMN-element:</strong> ${allEpics.map(epic => `${epic.name} (${epic.id})`).join(', ')}</li>
        ` : `
          <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
        `}
        <li><strong>Kreditprocess-steg:</strong> ${ctx.processStep}</li>
        <li><strong>Genererat:</strong> ${generationDate}</li>
      </ul>
    </section>

    ${summaryText ? `
    <section class="doc-section" data-source-summary="${summarySource}">
      <h2>Sammanfattning</h2>
      <p>${summaryText}</p>
    </section>
    ` : ''}

    ${hasIncludedTasks ? `
    <section class="doc-section" data-source-included-tasks="context">
      <h2>Ingående komponenter</h2>
      <p class="muted">Översikt över service tasks, user tasks, call activities och business rules som ingår i detta Feature Goal.</p>
      ${serviceTasks.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">Service Tasks (${serviceTasks.length})</h3>
          <ul style="margin-top: 0;">
            ${serviceTasks.map(task => `<li><a href="${task.docUrl}" style="color: #3b82f6; text-decoration: none;">${task.name}</a> <code style="font-size: 0.875rem; color: #64748b;">(${task.id})</code></li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${userTasks.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">User Tasks (${userTasks.length})</h3>
          <ul style="margin-top: 0;">
            ${userTasks.map(task => `<li><a href="${task.docUrl}" style="color: #3b82f6; text-decoration: none;">${task.name}</a> <code style="font-size: 0.875rem; color: #64748b;">(${task.id})</code></li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${callActivities.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">Call Activities (${callActivities.length})</h3>
          <ul style="margin-top: 0;">
            ${callActivities.map(task => `<li><a href="${task.docUrl}" style="color: #3b82f6; text-decoration: none;">${task.name}</a> <code style="font-size: 0.875rem; color: #64748b;">(${task.id})</code></li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${businessRuleTasks.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">Business Rules (${businessRuleTasks.length})</h3>
          <ul style="margin-top: 0;">
            ${businessRuleTasks.map(task => `<li><a href="${task.docUrl}" style="color: #3b82f6; text-decoration: none;">${task.name}</a> <code style="font-size: 0.875rem; color: #64748b;">(${task.id})</code></li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </section>
    ` : ''}

    ${flowSteps.length > 0 ? `
    <section class="doc-section" data-source-flow="${flowStepsSource}">
      <h2>Funktionellt flöde</h2>
      <ol>
        ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </section>
    ` : ''}

    ${dependencies.length > 0 ? `
    <section class="doc-section" data-source-dependencies="${dependenciesSource}">
      <h2>Beroenden</h2>
      ${renderList(dependencies)}
    </section>
    ` : ''}

    ${model.usageCases && model.usageCases.length > 0 ? `
    <section class="doc-section" data-source-usage-cases="llm">
      <h2>Användningsfall</h2>
      <p class="muted">Denna subprocess används i flera parent-processer med följande skillnader:</p>
      ${(() => {
        // VIKTIGT: Deduplicera usage cases baserat på parentProcess för att undvika duplicering
        // även om LLM genererar duplicerade poster
        const uniqueUsageCasesMap = new Map<string, typeof model.usageCases[0]>();
        for (const uc of model.usageCases) {
          const uniqueKey = uc.parentProcess;
          if (!uniqueUsageCasesMap.has(uniqueKey)) {
            uniqueUsageCasesMap.set(uniqueKey, uc);
          } else {
            // Om det redan finns, kombinera conditions (ta bort duplicering)
            const existing = uniqueUsageCasesMap.get(uniqueKey)!;
            const combinedConditions = existing.conditions && uc.conditions
              ? [...new Set([...existing.conditions, ...uc.conditions])]
              : existing.conditions || uc.conditions;
            uniqueUsageCasesMap.set(uniqueKey, {
              ...existing,
              conditions: combinedConditions,
              // Behåll differences från första förekomsten (eller kombinera om båda har)
              differences: existing.differences || uc.differences,
            });
          }
        }
        const uniqueUsageCases = Array.from(uniqueUsageCasesMap.values());
        
        // VIKTIGT: Visa sektionen ENDAST om det finns flera parent-processer
        // Om LLM genererar usageCases för bara en parent-process, dölj sektionen
        if (uniqueUsageCases.length <= 1) {
          return ''; // Dölj sektionen om det bara finns en parent-process
        }
        return uniqueUsageCases.map((usageCase) => {
          const hasConditions = usageCase.conditions && usageCase.conditions.length > 0;
          const hasDifferences = usageCase.differences && usageCase.differences.trim().length > 0;
          const hasContent = hasConditions || hasDifferences;
          
          return `
          <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 0.5rem;">
            <h3 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">
              <strong>${usageCase.parentProcess}-processen:</strong>
            </h3>
            ${hasContent ? `
              <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                ${hasConditions ? `
                  <li><strong>Särskilda villkor:</strong> ${usageCase.conditions.join(', ')}</li>
                ` : ''}
                ${hasDifferences ? `
                  <li>${usageCase.differences}</li>
                ` : ''}
              </ul>
            ` : `
              <p style="margin-top: 0.5rem; color: #64748b; font-style: italic;">
                Subprocessen anropas från ${usageCase.parentProcess}-processen utan särskilda villkor eller skillnader.
              </p>
            `}
          </div>
        `;
        }).join('');
      })()}
    </section>
    ` : ''}

    <section class="doc-section" data-source-user-stories="${userStoriesSource}">
      <h2>User Stories</h2>
      ${userStories.length > 0 ? `
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
      ` : `
        <p class="muted" style="color: #ef4444; font-style: italic;">
          ⚠️ Inga user stories genererade. User stories är obligatoriska för Feature Goals och ska genereras av LLM.
        </p>
      `}
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
  // INGEN FALLBACK-TEXT - LLM måste generera allt
  const summary = '';
  const inputs: string[] = [];
  const decisionLogic: string[] = [];
  const outputs: string[] = [];
  const businessRulesPolicy: string[] = [];
  
  // Related items: endast länkar om de finns (inga fallback-texter)
  const relatedItems: string[] = [];
  const dmnLabel = links.dmnLink ? links.dmnLink.split('/').pop() : 'Beslutstabell';
  
  if (links.dmnLink) {
    relatedItems.push(`Relaterad DMN-modell: <a href="${links.dmnLink}">${dmnLabel}</a>`);
  }
  if (links.bpmnViewerLink) {
    relatedItems.push(`Relaterad BPMN-subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`);
  }
  if (context.parentChain.length > 0) {
    relatedItems.push(`Överordnad nod: ${buildNodeLink(context.parentChain[context.parentChain.length - 1])}`);
  }

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
        console.error(
          `[renderFeatureGoalDoc] Error parsing/merging LLM content for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
          error
        );
        throw new Error(
          `Failed to parse LLM content for Feature Goal documentation (${context.node.bpmnFile}::${context.node.bpmnElementId}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // INGEN LLM-INNEHÅLL - kasta fel istället för att visa tom dokumentation
      throw new Error(
        `Feature Goal documentation has not been generated with LLM for ${context.node.bpmnFile}::${context.node.bpmnElementId}. LLM generation is required.`
      );
    }

    // 3.5. Validate model after merge
    const validation = validateFeatureGoalModelAfterMerge(model);
    if (!validation.valid) {
      const errorMessage = `Feature Goal documentation validation failed for ${context.node.bpmnFile}::${context.node.bpmnElementId}: ${validation.errors.join(', ')}`;
      console.error(`[renderFeatureGoalDoc] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    if (validation.warnings.length > 0) {
      console.warn(
        `[renderFeatureGoalDoc] Model validation warnings for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
        validation.warnings
      );
    }

    // 4. Fetch test data from database and E2E scenarios
    let plannedScenarios: TestScenarioData | null = null;
    let e2eTestInfo: Map<string, E2eTestStepInfo[]> | undefined = undefined;

    {
      // Determine preferred provider: use cloud if LLM was used, otherwise claude
      const preferredProvider = scenarioProvider || (llmContent ? 'cloud' : 'claude');
      
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

    const docJson = {
      summary: model.summary,
      flowSteps: Array.isArray(model.flowSteps) ? model.flowSteps : [],
      dependencies: Array.isArray(model.dependencies) ? model.dependencies : [],
      userStories: Array.isArray(model.userStories) ? model.userStories : [],
      usageCases: Array.isArray(model.usageCases) ? model.usageCases : undefined,
    };

    const wrapOptions: LlmHtmlRenderOptions = llmMetadata && 'provider' in llmMetadata
      ? { llmMetadata: llmMetadata as LlmMetadata, jsonData: docJson }
      : { ...(llmMetadata as LlmHtmlRenderOptions | undefined), jsonData: docJson };

    return wrapDocument(title, body, wrapOptions);
  } catch (error) {
    // Kasta fel vidare - inga fallbacks
    console.error(
      `[renderFeatureGoalDoc] Critical error rendering documentation for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`,
      error
    );
    throw error;
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

  // INGEN FALLBACK-TEXT - LLM måste generera allt
  const summaryText = model.summary || '';
  const summarySource = model.summary ? 'llm' : 'missing';
  
  // Decision logic: endast om LLM genererat (inga fallback)
  const decisionBullets = model.decisionLogic.length ? model.decisionLogic : [];
  const decisionLogicSource = model.decisionLogic.length ? 'llm' : 'missing';

  // Business rules policy: endast om LLM genererat (inga fallback)
  const policySupportBullets = model.businessRulesPolicy.length ? model.businessRulesPolicy : [];
  const policySource = model.businessRulesPolicy.length ? 'llm' : 'missing';

  // Related items: endast om länkar finns eller LLM genererat (inga fallback-texter)
  const relatedItems: string[] = [];
  const dmnLabel = links.dmnLink ? links.dmnLink.split('/').pop() : 'Beslutstabell';
  
  // Lägg till LLM-genererade items
  if (model.relatedItems.length > 0) {
    relatedItems.push(...model.relatedItems);
  }
  
  // Lägg till länkar om de finns
  if (links.dmnLink) {
    relatedItems.push(`Relaterad DMN-modell: <a href="${links.dmnLink}">${dmnLabel}</a>`);
  }
  if (links.bpmnViewerLink) {
    relatedItems.push(`Relaterad BPMN-subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`);
  }
  if (context.parentChain.length > 0) {
    relatedItems.push(`Överordnad nod: ${buildNodeLink(context.parentChain[context.parentChain.length - 1])}`);
  }
  
  const relatedItemsSource = model.relatedItems.length > 0 ? 'llm' : (relatedItems.length > 0 ? 'links' : 'missing');

  const renderInputsTable = () => {
    const inputs = model.inputs;
    // INGEN FALLBACK-TABELL - visas endast om LLM genererat inputs
    if (!inputs.length) {
      return '';
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
    // INGEN FALLBACK-TABELL - visas endast om LLM genererat outputs
    if (!outputs.length) {
      return '';
    }
    const rowsSource = outputs;

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
        <li><strong>Kreditprocess-steg:</strong> ${node.bpmnFile.replace('.bpmn', '')}</li>
      </ul>
    </section>

    ${summaryText ? `
    <section class="doc-section" data-source-summary="${summarySource}">
      <h2>Sammanfattning &amp; scope</h2>
      <p>${summaryText}</p>
    </section>
    ` : ''}

    ${model.inputs.length > 0 ? `
    <section class="doc-section" data-source-inputs="llm">
      <h2>Inputs &amp; datakällor</h2>
      ${renderInputsTable()}
    </section>
    ` : ''}

    ${decisionBullets.length > 0 ? `
    <section class="doc-section" data-source-decision-logic="${decisionLogicSource}">
      <h2>Beslutslogik (DMN / regler)</h2>
      ${renderList(decisionBullets)}
    </section>
    ` : ''}

    ${model.outputs.length > 0 ? `
    <section class="doc-section" data-source-outputs="llm">
      <h2>Output &amp; effekter</h2>
      ${renderOutputsTable()}
    </section>
    ` : ''}

    ${policySupportBullets.length > 0 ? `
    <section class="doc-section" data-source-business-rules="${policySource}">
      <h2>Affärsregler &amp; policystöd</h2>
      ${renderList(policySupportBullets)}
    </section>
    ` : ''}

    ${relatedItems.length > 0 ? `
    <section class="doc-section" data-source-related-items="${relatedItemsSource}">
      <h2>Relaterade regler &amp; subprocesser</h2>
      ${renderList(relatedItems)}
    </section>
    ` : ''}
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
