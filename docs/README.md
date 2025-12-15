# BPMN Planner – Dokumentation (översikt)

Det här `docs/`‑trädet samlar den interna dokumentation som kompletterar koden.  
Det är främst riktat till utvecklare, arkitekter och testare som jobbar med BPMN Planner.

## Viktiga Guider

### Batch-generering & Overrides
- **`CODEX_BATCH_AUTO.md`** - Batch-generera dokumentation med Codex för många noder
- **`PROMPT_VERSIONING.md`** - Hantera prompt-versioner och re-generera innehåll
- **`FALLBACK_SAFETY.md`** - Säkerhet och debugging för fallback-resultat

### Testing
- **`TESTING.md`** - Testguide, best practices och test-isolering

### Arkitektur
- **`bpmn-hierarchy-architecture.md`**  
  Detaljerad arkitektur‑ och implementationsbeskrivning av hur vi bygger BPMN‑hierarkin:
  - parser → meta → processdefinitioner → hierarki → processgraf,
  - hur CallActivities matchas mot subprocesser,
  - hur samma modell återanvänds i UI, dokumentations‑ och testgeneratorerna.

- **`hierarchy-overview.md`**  
  Kortare, mer UI‑orienterad översikt:
  - hur hierarkin används i Process Explorer,
  - flattening av subprocesser,
  - hur lokalgenerering/LLM bygger på samma graf.

- **`test-report-views.md`**  
  Beskriver de två testrapportvyerna:
  - `#/test-report` – global vy per provider (local‑fallback, ChatGPT, Ollama) och BPMN‑fil,
  - `#/node-tests` – nodspecifik vy med planerade scenarier och körda tester.

- **`GANTT_TIMELINE_ANALYSIS.md`** & **`GANTT_TIMELINE_IMPLEMENTATION_SUMMARY.md`**  
  Dokumentation för Timeline / Planning View:
  - analys av befintliga strukturer och tidsordning,
  - implementation av Gantt-chart för visualisering av subprocesser,
  - redigering av start/end datum baserat på orderIndex.

- `JIRA_NAMING_UPDATE_SUMMARY.md` & `JIRA_NAMING_CONSOLIDATION_COMPLETE.md`  
  Dokumentation för Jira-namngivning:
  - namngivningsregler för feature goals (callActivity) och epics (tasks),
  - top-level subprocess-baserad namngivning för feature goals,
  - path-baserad namngivning för epics (endast callActivity-noder i pathen),
  - konsolidering av namngivningslogik över hela applikationen.

- `confluence/`  
  Confluence‑orienterad dokumentation och mallar:
  - `README.md` – hur Confluence‑strukturen hänger ihop med BPMN‑noderna,
  - `template.md` – mall för nodspecifika Confluence‑sidor (call activities, tasks etc.),
  - `application.md` – exempel på en ifylld noddokumentation,
  - `REFACTORING_SUMMARY.md` – bakgrund och motiv till hierarki‑refaktoreringen.

- `feature-goals/feature-goal-template.html`  
  HTML‑mall för Feature Goal‑dokumentation. Används som referens när man skriver manuella övergripande dokument.

- `epics/epic-template.html`  
  HTML‑mall för Epic‑dokumentation kopplad till en eller flera BPMN‑noder.

- `rules/business-rule-task-template.html`  
  HTML‑mall för Business Rule Task‑dokumentation, med fokus på DMN‑logik.

## Nyckelidéer att ha i huvudet

- **En hierarki, många konsumenter**  
  BPMN‑hierarkin byggs en gång och kör sedan:
  - Process Explorer / trädet,
  - dokumentationsgeneratorn,
  - testgeneratorn (Playwright),
  - testrapportvyerna,
  - Timeline / Planning View (Gantt),
  - samt Jira‑namngivning och DoR/DoD.

- **Planerade scenarier i `node_planned_scenarios`**  
  Alla “planerade scenarion” i UI kommer från tabellen `node_planned_scenarios`:
  - LLM‑flöden (ChatGPT/Ollama) skriver in scenarier per nod/provider när dokumentation/testunderlag genereras.
  - Den hierarkiska generatorn seedar även bas‑scenarion för `local-fallback` per nod (antingen från `testMapping` eller ett auto‑genererat happy‑path).

- **Lokala mallar vs. genererad dokumentation**  
  Mallarna i `docs/feature-goals`, `docs/epics` och `docs/rules` är referensmallar
  för manuell dokumentation. Den dokumentation som slutanvändaren ser i appen
  genereras och lagras som HTML i Supabase Storage och visas via `DocViewer`.

## När ska du läsa vad?

- Du ska **förstå hur hierarkin fungerar** → börja med `bpmn-hierarchy-architecture.md` och `hierarchy-overview.md`.
- Du ska **förstå testrapporten** → läs `test-report-views.md`.
- Du ska **skriva/uppdatera Confluence‑sidor** → använd `confluence/template.md` och `confluence/README.md`.
- Du ska **förstå varför hierarkin infördes** → läs `confluence/REFACTORING_SUMMARY.md`.

## Praktiska npm‑kommandon (snabböversikt)

För dagligt arbete räcker det i princip med dessa:

- **Utveckling & bygg**  
  - `npm run dev` – startar Vite‑devservern.  
  - `npm run build` – bygger produktion.  
  - `npm run preview` – testar byggd version lokalt.

- **Tester (Vitest)**  
  - `npm test` – kör alla Vitest‑tester (unit + integration).  
  - `npm run test:watch` – Vitest i watch‑läge.  
  - `npm run test:llm:smoke` – minimal smoke‑test mot LLM (cloud‑läge).

- **Playwright / E2E**  
  - `npx playwright test` – kör alla Playwright‑tester i `tests/playwright-e2e/`.  
  - `npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-credit-decision-happy.spec.ts`  
    – endast mortgage credit decision happy‑path (pilot).

Övriga skript i `package.json` är mer avancerade/engångsverktyg. De finns kvar för behovsanvändning,
men behövs normalt inte i det dagliga flödet.

