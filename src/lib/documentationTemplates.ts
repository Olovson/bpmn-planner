import { NodeDocumentationContext } from './documentationContext';
import { getNodeDocViewerPath } from './nodeArtifactPaths';

export interface TemplateLinks {
  bpmnViewerLink?: string;
  dorLink?: string;
  testLink?: string;
  docLink?: string;
  dmnLink?: string;
}

const wrapDocument = (title: string, body: string) => `<!DOCTYPE html>
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

export const renderFeatureGoalDoc = (
  context: NodeDocumentationContext,
  links: TemplateLinks
) => {
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
    ['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'].includes(child.type)
  );
  const hasUserFacingDescendants = context.descendantNodes.some((desc) => desc.type === 'userTask');
  const firstUserFacing = context.descendantNodes.find((desc) => desc.type === 'userTask');
  const coreIntentItems = [
    `Processdel: ${nodeName} knyter ihop ${upstreamName} med ${downstreamName}.`,
    `Affärsresultat: möjliggör ett spårbart kreditbeslut för ${node.bpmnFile.replace('.bpmn', '')}.`,
    `Primär input: ${inputNodes.length ? buildNodeNameList(inputNodes) : 'Processstart & kunddata'}.`,
    `Primär output: ${outputNodes.length ? buildNodeNameList(outputNodes) : 'Beslut & notifiering'}.`,
    `Viktig hierarki: ${descendantEpics.length ? buildNodeNameList(descendantEpics, 4) : 'Epics definieras från barnnoder'}.`,
    `Utanför scope: senare Feature Goals och externa eftermarknadsflöden.`,
  ];

  const body = `
    <section class="doc-section">
      <span class="doc-badge">Feature Goal</span>
      <h1>${nodeName}</h1>
      <p class="muted">Kopplar ${upstreamName} → ${downstreamName} i ${node.bpmnFile.replace('.bpmn', '')}.</p>
    </section>

    <section class="doc-section">
      <h2>Core Intent</h2>
      ${renderList(coreIntentItems)}
    </section>

    <section class="doc-section">
      <h2>Start och slut</h2>
      <ul>
        <li><strong>Startas av:</strong> ${upstreamName}</li>
        <li><strong>Avslutas av:</strong> ${downstreamName}</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Involverade team</h2>
      <p class="muted">Lägg till dina egna team och ansvar här.</p>
    </section>

    <section class="doc-section">
      <h2>Funktionellt innehåll</h2>
      <p>${nodeName} möjliggör ${context.childNodes.length ? `${context.childNodes.length} identifierade epics/delprocesser` : 'en samlad process'} och säkerställer att beroenden mellan ${upstreamName} och ${downstreamName} hanteras konsekvent.</p>
    </section>

    <section class="doc-section">
      <h2>Ingående Epics</h2>
      ${renderList(
        descendantEpics.length
          ? descendantEpics.map(
              (epic) => `${formatNodeName(epic)} – Team: ${inferTeamForNode(epic.type)}`
            )
          : ['Epics härleds från barnnoder när detaljer finns i BPMN.']
      )}
    </section>

    <section class="doc-section">
      <h2>User Stories</h2>
      ${
        descendantEpics.length
          ? renderList(
              descendantEpics.slice(0, 5).map(
                (epic, index) =>
                  `FG-${index + 1} – Som produktteam vill vi leverera ${formatNodeName(
                    epic
                  )} för att ${nodeName.toLowerCase()} ska bli komplett.`
              )
            )
          : '<p class="muted">User stories fylls i manuellt här.</p>'
      }
    </section>

    <section class="doc-section">
      <h2>Affärs- &amp; kreditregler (översikt)</h2>
      ${renderList([
        'Samtliga kreditprinciper och policygränser ska vara dokumenterade.',
        `Regler för ${nodeName} styr när ärenden ska eskaleras till manuell granskning.`,
        'Data- och regelversioner måste vara spårbara genom hela processen.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Data – översikt</h2>
      <table>
        <tr><th>Typ</th><th>Objekt</th><th>Beskrivning</th></tr>
        <tr><td>Input</td><td>${inputNodes.length ? buildNodeNameList(inputNodes) : 'Processstart'}</td><td>Underlag från föregående noder samt kund-/produktdata</td></tr>
        <tr><td>Output</td><td>${outputNodes.length ? buildNodeNameList(outputNodes) : downstreamName}</td><td>Kreditbeslut, statuskoder och kommunikéer</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>UX-relatering (om tillämpligt)</h2>
      <p>${
        hasUserFacingDescendants
          ? `Påverkar UI-flöden såsom ${formatNodeName(firstUserFacing!)} och relaterade skärmar i viewer.`
          : 'Ingen direkt UX-koppling; levereras huvudsakligen som bakgrundsflöde.'
      }</p>
    </section>

    <section class="doc-section">
      <h2>Avgränsningar / Out of Scope</h2>
      ${renderList([
        'Eftermarknadsaktiviteter efter avslutat kreditbeslut.',
        'System utanför kreditplattformens domän.',
        'Globala policyuppdateringar som ägs av andra initiativ.',
        'Lokala landanpassningar som inte ingår i BPMN-filerna.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Definition of Ready (DoR)</h2>
      ${renderList([
        'Processgränser och triggers kartlagda.',
        'Epics/Call Activities identifierade och uppskattade.',
        'Regler, data och externa beroenden dokumenterade.',
        'Teamkapacitet och ansvar tydliggjorda.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Definition of Done (DoD)</h2>
      ${renderList([
        'Samtliga epics klara och integrerade end-to-end.',
        'Regression och QA godkänd inklusive regelmotor.',
        'Dokumentation och artefakter (HTML, test) uppdaterade.',
        'Övervakning och KPI:er i drift, releasekoordinerad.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade artefakter</h2>
      ${renderList([
        links.docLink ? `<a href="${links.docLink}">Genererad dokumentation</a>` : 'HTML genereras automatiskt vid byggtid.',
        links.testLink ? `<a href="${links.testLink}">Automatiserade tester</a>` : 'Testartefakter skapas för relevanta noder.',
        links.dorLink ? `<a href="${links.dorLink}">Definition of Ready/Done</a>` : 'DoR/DoD-länk sätts via Jira.',
        links.bpmnViewerLink ? `<a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>` : `BPMN-fil: ${node.bpmnFile}`,
      ])}
    </section>
  `;

  return wrapDocument(nodeName, body);
};

export const renderEpicDoc = (
  context: NodeDocumentationContext,
  links: TemplateLinks
) => {
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
  const coreIntentItems = [
    `Funktionalitet: ${nodeName} levererar ett ${node.type} med fokus på ${node.bpmnFile.replace('.bpmn', '')}.`,
    `Ägande team: ${inferTeamForNode(node.type)}.`,
    `Processkoppling: tar emot från ${upstreamName} och lämnar till ${downstreamName}.`,
    `Primär input: ${previousNode ? formatNodeName(previousNode) : 'Kund- och ansökningsdata'}.`,
    `Primär output: ${nextNode ? formatNodeName(nextNode) : 'Status & beslut'}.`,
  ];

  const dataTable = `
    <table>
      <tr><th>Typ</th><th>Fält / Objekt</th><th>Källa / Mottagare</th><th>Kommentar</th></tr>
      <tr><td>Input</td><td>${previousNode ? formatNodeName(previousNode) : 'Processstart'}</td><td>${previousNode ? previousNode.bpmnFile : 'Intern källa'}</td><td>Data som triggar epiken</td></tr>
      <tr><td>Output</td><td>${nextNode ? formatNodeName(nextNode) : 'Nästa steg'}</td><td>${nextNode ? nextNode.bpmnFile : 'Nedströms nod'}</td><td>Resultat, status och loggar</td></tr>
    </table>
  `;

  const body = `
    <section class="doc-section">
      <span class="doc-badge">Epic</span>
      <h1>${nodeName}</h1>
      <p class="muted">${node.type} mellan ${upstreamName} → ${downstreamName}.</p>
    </section>

    <section class="doc-section">
      <h2>Core Intent</h2>
      ${renderList(coreIntentItems)}
    </section>

    <section class="doc-section">
      <h2>BPMN-koppling</h2>
      <ul>
        <li><strong>Nodtyp:</strong> ${node.type}</li>
        <li><strong>Nod-ID:</strong> ${node.bpmnElementId}</li>
        <li><strong>Startpunkt:</strong> ${upstreamName}</li>
        <li><strong>Slutpunkt:</strong> ${downstreamName}</li>
        <li><strong>BPMN-länk:</strong> ${
          links.bpmnViewerLink ? `<a href="${links.bpmnViewerLink}">Öppna i viewer</a>` : 'Öppna från huvudflödet'
        }</li>
      </ul>
      <p><strong>Viktiga noder runt epiken:</strong></p>
      ${renderList(
        relatedNodes.length
          ? relatedNodes.map((relatedNode) => `${formatNodeName(relatedNode)} (${relatedNode.type})`)
          : ['Inga ytterligare noder identifierade i BPMN-traverseringen.']
      )}
    </section>

    <section class="doc-section">
      <h2>Funktionell beskrivning</h2>
      <p>${nodeName} realiserar ${node.type} som omsätter BPMN-flödet till praktisk funktionalitet, säkerställer dataflöden och triggar efterföljande aktiviteter.</p>
    </section>

    <section class="doc-section">
      <h2>Affärs- &amp; kreditregler</h2>
      ${renderList([
        'Validera produkt- och kundspecifika regler innan handoff.',
        'Säkerställ att kreditpolicy och riskparametrar kontrolleras.',
        'Hanterar eskalering vid avvikande score eller saknade underlag.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Data In / Data Ut</h2>
      ${dataTable}
    </section>

    <section class="doc-section">
      <h2>Arkitektur / Systeminteraktioner</h2>
      ${renderList([
        `API: POST /api/${apiSlug} för primär exekvering.`,
        `Event ${apiSlug}.status.changed publiceras till övriga system.`,
        'Felhantering via retry-queue och incidentloggning.',
        'Integration mot kreditmotor eller externa register vid behov.',
      ])}
    </section>

    <section class="doc-section">
      <h2>API-översikt</h2>
      <table>
        <tr><th>Metod</th><th>Endpoint</th><th>Syfte</th></tr>
        <tr><td>POST</td><td>/api/${apiSlug}</td><td>Initiera epikens huvudflöde</td></tr>
        <tr><td>GET</td><td>/api/${apiSlug}/{id}</td><td>Hämta status och beslut</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>UX-relatering (om tillämpligt)</h2>
      <p>${
        node.type === 'userTask'
          ? `Epiken kopplas till UI-skärmen <strong>${nodeName}</strong> och relaterade Figma-flöden.`
          : 'Ingen direkt UX-koppling; epiken körs som backend-/integrationsflöde.'
      }</p>
    </section>

    <section class="doc-section">
      <h2>User Stories</h2>
      ${
        context.childNodes.length
          ? renderList(
              context.childNodes.slice(0, 5).map(
                (child, index) =>
                  `STORY-${slugify(nodeName)}-${index + 1} – Leverera ${formatNodeName(
                    child
                  )} som del av ${nodeName}.`
              )
            )
          : '<p class="muted">User stories kopplas till epiken i Jira / produktplanen.</p>'
      }
    </section>

    <section class="doc-section">
      <h2>Acceptanskriterier</h2>
      ${renderList([
        'Validera obligatoriska fält och regelutfall.',
        'Hantera fel från externa tjänster med tydliga svarskoder.',
        'Logga beslut, input och output för audit.',
        'Utlösa nedströms event när epiken är klar.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Testscenarier (nyckelscenarier)</h2>
      ${renderList([
        'Normalflöde – lyckad hantering med kompletta data.',
        'Felaktig eller saknad input – avvisning med tydlig felkod.',
        'Regelavslag – korrekt branching och kommunikation.',
        'Systemfel/fallback – externa beroenden nere.',
        'Edge cases – parallella ansökningar, tidsgränser.',
      ])}
      <p>${links.testLink ? `<a href="${links.testLink}">Läs testfil /spec</a>` : 'Testfil länkas automatiskt när den genereras.'}</p>
    </section>

    <section class="doc-section">
      <h2>Testdata</h2>
      <table>
        <tr><th>Scenario</th><th>Input</th><th>Förväntat resultat</th></tr>
        <tr><td>Normalfall</td><td>applicationId=OK123, score=720</td><td>Godkänt beslut, status=APPROVED</td></tr>
        <tr><td>Regelavslag</td><td>applicationId=RISK999, score=480</td><td>Avslag med kod RISK_LOW_SCORE</td></tr>
        <tr><td>Systemfel</td><td>applicationId=TIMEOUT1</td><td>Retry + incidentloggning</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Observability &amp; Logging</h2>
      ${renderList([
        'Logga correlationId, ansöknings-ID och regelutfall.',
        'Emit metrics för svarstider och felkoder.',
        'Auditspåra ändringar i data som skickas vidare.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Regression – påverkade områden</h2>
      ${renderList([
        upstreamName,
        ...downstreamNodes.map((child) => formatNodeName(child)),
        context.parentChain.length ? formatNodeName(context.parentChain[0]) : 'Rotprocess',
      ])}
    </section>

    <section class="doc-section">
      <h2>Definition of Ready (DoR)</h2>
      ${renderList([
        'Syfte och scope bekräftat med processägare.',
        'BPMN-nod och datafält kartlagda.',
        'Regler, API-behov och beroenden identifierade.',
        'Estimaten är verifierbara och teststrategi framtagen.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Definition of Done (DoD)</h2>
      ${renderList([
        'Stories klara och distribuerade till produktion.',
        'End-to-end tester gröna inkl. regression.',
        'Observability dashboards uppdaterade.',
        'Dokumentation och artefakter uppdaterade.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade noder</h2>
      ${renderList(
        relatedNodes.length
          ? relatedNodes.map((relatedNode) => `${formatNodeName(relatedNode)} – ${buildNodeLink(relatedNode)}`)
          : ['Inga extra noder identifierade.']
      )}
    </section>
  `;

  return wrapDocument(nodeName, body);
};

export const renderBusinessRuleDoc = (
  context: NodeDocumentationContext,
  links: TemplateLinks
) => {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Business Rule';
  const inputs = context.parentChain.slice(-2);
  const outputs = context.childNodes.slice(0, 3);
  const previousNode = context.parentChain.length
    ? context.parentChain[context.parentChain.length - 1]
    : undefined;
  const upstreamName = previousNode ? formatNodeName(previousNode) : 'Processstart';
  const downstreamName = outputs.length ? formatNodeName(outputs[0]) : 'Nästa beslut';
  const hasUxRelation = context.parentChain.some((parent) => parent.type === 'userTask');
  const coreIntentItems = [
    `Avgör kreditbeslutet "${nodeName}" baserat på policy och riskparametrar.`,
    `Input: ${inputs.length ? buildNodeNameList(inputs) : 'Föregående nod'} med kompletterande data.`,
    `Output: ${outputs.length ? buildNodeNameList(outputs) : 'Flaggor för fortsättning/avslag'}.`,
    'Policygrund: kreditmanual och regulatoriska krav.',
    'Risk: felkonfigurerade regler kan släppa igenom felaktiga ansökningar.',
  ];

  const body = `
    <section class="doc-section">
      <span class="doc-badge">Business Rule</span>
      <h1>${nodeName}</h1>
      <p class="muted">Policybeslut mellan ${upstreamName} → ${downstreamName}.</p>
    </section>

    <section class="doc-section">
      <h2>Core Intent</h2>
      ${renderList(coreIntentItems)}
    </section>

    <section class="doc-section">
      <h2>BPMN-koppling</h2>
      <ul>
        <li><strong>Nodtyp:</strong> Business Rule Task</li>
        <li><strong>Nod-ID:</strong> ${node.bpmnElementId}</li>
        <li><strong>Startar efter:</strong> ${upstreamName}</li>
        <li><strong>Leder vidare till:</strong> ${downstreamName}</li>
        <li><strong>BPMN-länk:</strong> ${
          links.bpmnViewerLink ? `<a href="${links.bpmnViewerLink}">Öppna i viewer</a>` : 'Öppna i BPMN viewer'
        }</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Funktionell beskrivning</h2>
      <p>${nodeName} applicerar kreditreglerna med hjälp av regelmotor/DMN och avgör om processen kan fortsätta, kräver manuell kontroll eller ska avslås.</p>
    </section>

    <section class="doc-section">
      <h2>Regelmatris</h2>
      <table>
        <tr><th>Regel</th><th>Input</th><th>Output</th><th>Prioritet</th><th>Konfigurerbar</th></tr>
        <tr><td>${nodeName}-Eligibility</td><td>riskScore, loanAmount</td><td>APPROVE / REVIEW / REJECT</td><td>1</td><td>Ja</td></tr>
        <tr><td>${nodeName}-Fraud</td><td>sanctionCheck, partyFlags</td><td>STOP_PROCESS</td><td>2</td><td>Ja</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>DMN / Regeldefinitioner</h2>
      ${renderList([
        links.dmnLink
          ? `<a href="${links.dmnLink}">Öppna DMN-diagram</a>`
          : 'Ingen DMN-länk konfigurerad ännu – lägg till beslutstabell/DMN när den finns.',
        'Versionering i Supabase storage med auditspår.',
        'Ägarskap: Risk & Policy team.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Datamodell (Input/Output)</h2>
      <table>
        <tr><th>Typ</th><th>Fält</th><th>Källa / Beskrivning</th></tr>
        <tr><td>Input</td><td>applicationId</td><td>Nyckel från föregående nod</td></tr>
        <tr><td>Input</td><td>riskScore</td><td>Beräknas av kreditmotor</td></tr>
        <tr><td>Input</td><td>loanAmount</td><td>Ansökt belopp</td></tr>
        <tr><td>Output</td><td>decision</td><td>APPROVE / REVIEW / REJECT</td></tr>
        <tr><td>Output</td><td>reasonCodes</td><td>Lista med regelutfall</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>User Stories (om tillämpligt)</h2>
      ${
        context.childNodes.length
          ? renderList(
              context.childNodes.slice(0, 3).map(
                (child, index) =>
                  `RULE-STORY-${index + 1} – Implementera ${formatNodeName(child)} som konsument av ${nodeName}.`
              )
            )
          : '<p class="muted">Inga specifika user stories kopplade – regeln exekveras via generisk engine.</p>'
      }
    </section>

    <section class="doc-section">
      <h2>UX-relatering (om tillämpligt)</h2>
      <p>${
        hasUxRelation
          ? 'Resultatet visas för handläggare i nästa User Task och måste vara begripligt.'
          : 'Ingen direkt UX-koppling; svar används av automatiserade flöden.'
      }</p>
    </section>

    <section class="doc-section">
      <h2>Testspecificitet</h2>
      ${renderList([
        'Testa varje regelgren och konfigurationsparameter.',
        'Verifiera DMN-versioner och fallback när regelmotor ej nås.',
        'Säkerställ deterministiska svar vid lika score.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Testscenarier (nyckelscenarier)</h2>
      ${renderList([
        'Regel-succéfall – riskScore över tröskel, beslut APPROVE.',
        'Regel-felfall – saknade data eller ogiltig kombination.',
        'Systemfel från regelmotor – fallback till defaultbeslut.',
        'Edge cases – extrem belåningsgrad, manuella flaggor.',
      ])}
      <p>${links.testLink ? `<a href="${links.testLink}">Se automatisk testfil</a>` : 'Testfil skapas när scenarier genereras.'}</p>
    </section>

    <section class="doc-section">
      <h2>Testdata</h2>
      <table>
        <tr><th>Scenario</th><th>Input</th><th>Förväntad output</th></tr>
        <tr><td>Approve</td><td>riskScore=780, loanAmount=1.2M</td><td>decision=APPROVE</td></tr>
        <tr><td>Manual review</td><td>riskScore=620, sanctionCheck=HIT</td><td>decision=REVIEW, reason=SANCTION</td></tr>
        <tr><td>Stop</td><td>fraudFlag=true</td><td>decision=STOP_PROCESS</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Processpåverkan / Stop Criteria</h2>
      ${renderList([
        'Processen fortsätter när decision är APPROVE.',
        'Review triggar manuell hantering och paus i automatiserat flöde.',
        'STOP_PROCESS eller REJECT avslutar processen och loggar incident.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Observability &amp; Logging</h2>
      ${renderList([
        'Logga regelversion, inputdata och utfallet.',
        'Knyt loggar till applicationId och correlationId.',
        'Publicera metrics för antal avslag, review och fel.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Regression – påverkade områden</h2>
      ${renderList([
        upstreamName,
        ...outputs.map((out) => formatNodeName(out)),
        context.parentChain.length ? formatNodeName(context.parentChain[0]) : 'Rotprocess',
      ])}
    </section>

    <section class="doc-section">
      <h2>Definition of Ready (DoR)</h2>
      ${renderList([
        'Regelkrav dokumenterade och godkända av Risk.',
        'Input/Output-fält fastställda och mappade.',
        'Testdata och DMN-versioner identifierade.',
        'Policybeslut om fallback/stop-kriterier klara.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Definition of Done (DoD)</h2>
      ${renderList([
        'Regler implementerade och testade.',
        'DMN publicerad med version och ägarskap.',
        'Logging/audit bekräftade i QA/PROD.',
        'Dokumentation och tester uppdaterade.',
      ])}
    </section>

    <section class="doc-section">
      <h2>Relaterade noder</h2>
      ${renderList(
        [...outputs, previousNode].filter(Boolean).length
          ? [...outputs, previousNode]
              .filter(Boolean)
              .map((relatedNode) => `${formatNodeName(relatedNode!)} – ${buildNodeLink(relatedNode!)}`)
          : ['Inga relaterade noder identifierade.']
      )}
    </section>
  `;

  return wrapDocument(nodeName, body);
};
