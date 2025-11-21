import { NodeDocumentationContext } from './documentationContext';
import { getNodeDocViewerPath } from './nodeArtifactPaths';

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

const SECTION_RENDERERS: Partial<Record<DocSectionId, (ctx: SectionRendererContext) => string>> = {
  // I detta steg renderar vi hela dokument-body via title-metadata-sektionen
  // per template. Övriga sektioner kan successivt brytas ut vid behov.
  'title-metadata': (ctx) => {
    switch (ctx.templateId) {
      case 'feature-goal':
        return buildFeatureGoalDocBody(ctx.context, ctx.links);
      case 'epic':
        return buildEpicDocBody(ctx.context, ctx.links);
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

export const wrapDocument = (title: string, body: string) => `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="doc-shell">
    ${body}
  </div>
</body>
</html>`;

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const stripDangerousTags = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi, '');

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Normaliserar LLM-innehåll (markdown, fragment eller full HTML) till en
 * wrapper-kompatibel HTML-sida med gemensam layout.
 *
 * - Tar bort egna <html>/<head>/<body>-skal från LLM-output.
 * - Tar bort script/style/link-taggar.
 * - Konverterar enkel markdown/text till <p>/<h2>-block.
 * - Kan lägga till placeholders för kända sektioner (t.ex. Feature Goals).
 */
export const wrapLlmContentAsDocument = (
  rawContent: string,
  title: string,
  options?: { docType?: string },
): string => {
  const trimmed = rawContent.trim();

  if (!trimmed) {
    return wrapDocument(title, '<p class="muted">Inget innehåll genererades av LLM.</p>');
  }

  let innerHtml = trimmed;
  const hasHtmlTag = /<html[\s>]/i.test(trimmed);
  const hasBodyTag = /<body[\s>]/i.test(trimmed);

  if (hasHtmlTag || hasBodyTag) {
    const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1].trim()) {
      innerHtml = bodyMatch[1].trim();
    } else {
      innerHtml = trimmed
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?(html|head|body)[^>]*>/gi, '')
        .trim();
    }
  } else if (!looksLikeHtml(trimmed)) {
    const blocks = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    innerHtml = blocks
      .map((block) => {
        const lines = block.split('\n');
        const first = lines[0] || '';
        const headingMatch = first.match(/^#+\s+(.*)$/);
        if (headingMatch) {
          const heading = escapeHtml(headingMatch[1].trim());
          return `<h2>${heading}</h2>`;
        }
        const paragraphs = block
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('\n');
        return paragraphs;
      })
      .join('\n');
  }

  let sanitized = stripDangerousTags(innerHtml);

  if (options?.docType === 'feature') {
    const placeholderSections: Array<{ label: string; heading: string }> = [
      { label: 'Sammanfattning', heading: 'Sammanfattning' },
      { label: 'Omfattning &amp; Avgränsningar', heading: 'Omfattning &amp; Avgränsningar' },
      { label: 'Ingående Epics', heading: 'Ingående Epics' },
      { label: 'Affärsflöde', heading: 'Affärsflöde' },
      { label: 'Kritiska beroenden', heading: 'Kritiska beroenden' },
      { label: 'Affärs-scenarion', heading: 'Affärs-scenarion' },
      { label: 'Koppling till automatiska tester', heading: 'Koppling till automatiska tester' },
      { label: 'Implementation Notes (för dev)', heading: 'Implementation Notes (för dev)' },
      { label: 'Relaterade regler / subprocesser', heading: 'Relaterade regler / subprocesser' },
    ];

    for (const section of placeholderSections) {
      if (!sanitized.includes(section.heading)) {
        sanitized += `
<section class="doc-section">
  <h2>${section.label}</h2>
  <p class="muted">Denna sektion behöver kompletteras för detta Feature Goal.</p>
</section>`;
      }
    }
  }

  return wrapDocument(title, sanitized);
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

function buildFeatureGoalDocBody(
  context: NodeDocumentationContext,
  links: TemplateLinks,
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
  const outputNodes = context.childNodes.slice(0, 3);
  const descendantEpics = context.childNodes.filter((child) =>
    ['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'].includes(child.type),
  );
  const initiative = node.bpmnFile.replace('.bpmn', '');
  const owner = 'Produktägare Kredit / Risk & Policy';
  const versionLabel = '1.0 (exempel) – uppdateras vid ändring';

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
      <p>${nodeName} samlar och koordinerar ett antal epics för att skapa ett sammanhängande kreditflöde med tydlig ansvarsfördelning och spårbarhet.</p>
      <p>Feature Goalet säkerställer att rätt data, regler och interaktioner finns på plats för att fatta välgrundade kreditbeslut.</p>
      ${renderList(scopePoints)}
    </section>

    <section class="doc-section">
      <h2>Omfattning &amp; Avgränsningar</h2>
      ${renderList(boundaries)}
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
      <h2>Kritiska beroenden</h2>
      ${renderList(dependencyBullets)}
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
        Scenarion ovan mappas mot automatiska tester i:
        ${
          links.testLink
            ? `<code>${links.testLink}</code>`
            : '<span class="muted">Testfil länkas via node_test_links</span>'
        }
        <br />
        Testblock och scenarionamngivning bör återspegla affärs-scenariernas ID och namn.
      </p>
    </section>

    <section class="doc-section">
      <h2>Implementation Notes (för dev)</h2>
      ${renderList([
        'API- och integrationskontrakt ska vara dokumenterade per epic och nod.',
        'Viktiga datafält bör speglas i loggar och domän-events för spårbarhet.',
        'Edge-cases (t.ex. avbrutna flöden eller externa tjänstefel) ska hanteras konsekvent över epics.',
        'DMN-kopplingar för risk, skuldsättning och produktvillkor dokumenteras i respektive Business Rule-dokumentation.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade regler / subprocesser</h2>
      ${renderList([
        links.bpmnViewerLink
          ? `Relaterad subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`
          : `Relaterad subprocess: BPMN-fil ${node.bpmnFile}`,
        links.dmnLink
          ? `Relaterade regler/DMN: <a href="${links.dmnLink}">${links.dmnLink.split('/').pop()}</a>`
          : 'Relaterade regler/DMN dokumenteras per Business Rule.',
        inputNodes.length
          ? `Föregående noder: ${buildNodeNameList(inputNodes)}`
          : 'Föregående noder: initierande steg i processen.',
      ])}
    </section>
  `;
}

function buildEpicDocBody(
  context: NodeDocumentationContext,
  links: TemplateLinks,
): string {
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

    <section class="doc-section">
      <h2>Syfte &amp; Scope</h2>
      <p>${nodeName} är ett delsteg i kreditflödet som säkerställer att rätt data, regler och interaktioner hanteras innan processen går vidare.</p>
      <p>Epiken bidrar till en spårbar och begriplig kreditprocess för både kund och interna användare.</p>
      ${renderList(scopeBullets)}
    </section>

    <section class="doc-section">
      <h2>Trigger &amp; Förutsättningar</h2>
      ${renderList(triggerBullets)}
    </section>

    <section class="doc-section">
      <h2>Huvudflöde (High-level scenario)</h2>
      <ol>
        ${(
          isUserTask ? highLevelStepsUser : highLevelStepsService
        )
          .map((step) => `<li>${step}</li>`)
          .join('')}
      </ol>
    </section>

    <section class="doc-section">
      <h2>Interaktioner &amp; Kanaler</h2>
      ${renderList(isUserTask ? interactionBulletsUser : interactionBulletsService)}
    </section>

    <section class="doc-section">
      <h2>Data &amp; Kontrakt</h2>
      ${dataTable}
    </section>

    <section class="doc-section">
      <h2>Affärsregler &amp; Policykoppling</h2>
      ${renderList(businessRuleRefs)}
    </section>

    <section class="doc-section">
      <h2>Testkriterier (affärsnivå)</h2>
      <p class="muted">Scenarierna nedan är affärsnära och ska mappas till automatiska tester.</p>
      <table>
        <tr>
          <th>Scenario</th>
          <th>Beskrivning</th>
          <th>Automatiskt test</th>
        </tr>
        ${testRows
          .map(
            (row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.description}</td>
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
      <h2>Implementation Notes (för dev/test)</h2>
      ${renderList([
        `Primära API:er/tjänster: t.ex. POST /api/${apiSlug} för exekvering.`,
        'Viktiga fält och beslut bör loggas för att möjliggöra felsökning och efterkontroll.',
        'Eventuella externa beroenden (kreditupplysning, folkbokföring, engagemangsdata) hanteras via plattformens integrationslager.',
        'Prestanda- och tillgänglighetskrav hanteras på plattformsnivå men bör beaktas i designen.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade steg &amp; artefakter</h2>
      ${renderList([
        relatedList.length ? `Närliggande noder: ${relatedList.join(', ')}` : 'Inga närliggande noder identifierade.',
        links.bpmnViewerLink
          ? `Visa processen: <a href="${links.bpmnViewerLink}">BPMN viewer</a>`
          : `BPMN-fil: ${node.bpmnFile}`,
      ])}
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
      <h2>Sammanfattning</h2>
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

export const renderEpicDoc = (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => renderDocWithSchema('epic', EPIC_DOC_SCHEMA, context, links);

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
