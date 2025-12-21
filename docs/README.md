# BPMN Planner – Dokumentation (översikt)

Det här `docs/`‑trädet samlar den interna dokumentation som kompletterar koden.  
Det är främst riktat till utvecklare, arkitekter och testare som jobbar med BPMN Planner.

## Viktiga Guider

### Batch-generering & Overrides
- **`BATCH_GENERATION.md`** - Batch-generering av dokumentation (Codex, prompt-versionering, override-filer)
- **`CODEX_BATCH_AUTO.md`** - Detaljerad guide för Codex batch-generering
- **`PROMPT_VERSIONING.md`** - Hantera prompt-versioner och re-generera innehåll
- **`FALLBACK_SAFETY.md`** - Säkerhet och debugging för fallback-resultat

### Funktionalitet och Arkitektur
- **`FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`** - Komplett översikt över appens funktionalitet, logik och arkitektur
- **`FUNCTIONALITY_ANALYSIS_SUMMARY.md`** - Kort sammanfattning av funktionalitetsanalysen
- **`DATAFLOW_OVERVIEW.md`** - Dataflödesöversikt med diagram och beskrivningar
- **`ARCHITECTURE_OVERVIEW.md`** - Översikt över hierarki, dokumentation och LLM
- **`FEATURES_AND_FUNCTIONALITY.md`** - Detaljerad beskrivning av funktioner och arbetsflöde
- **`QUICKSTART_AND_DEVELOPMENT.md`** - Snabbstart och utvecklingsguide

### Testing
- **`TESTING.md`** - Testguide, best practices och test-isolering
- **`TEST_OVERVIEW_AND_GAPS.md`** - Översikt över tester, gap-analys och teststrategi (baserat på funktionalitetsöversikten)
- **`TEST_IMPLEMENTATION_PLAN.md`** - Konkret implementeringsplan för att förbättra testtäckningen
- **`TEST_EXPORT.md`** - Guide för export-ready test scripts
- **`TEST_SCENARIOS.md`** - Test-scenarion och design-scenarion

### Arkitektur (Detaljerad)
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

- **`JIRA_NAMING.md`** - Jira-namngivning (namngivningsregler, exempel, implementation)
- `JIRA_NAMING_UPDATE_SUMMARY.md` & `JIRA_NAMING_CONSOLIDATION_COMPLETE.md`  
  Historisk dokumentation för Jira-namngivning (se `JIRA_NAMING.md` för aktuell info)

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

## Praktiska npm‑kommandon

> 📋 **För komplett lista med alla kommandon och detaljerad guide, se [`QUICKSTART_AND_DEVELOPMENT.md`](./QUICKSTART_AND_DEVELOPMENT.md)**

**Snabböversikt:**
- `npm run dev` – startar Vite‑devservern
- `npm run start:supabase` – starta Supabase (guidad)
- `npm test` – kör alla Vitest‑tester
- `npx playwright test` – kör Playwright E2E-tester
- `npm run print:bpmn-tree` – exportera BPMN-träd

