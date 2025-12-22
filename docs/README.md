# BPMN Planner – Dokumentation (översikt)

Det här `docs/`‑trädet samlar den interna dokumentation som kompletterar koden.  
Det är främst riktat till utvecklare, arkitekter och testare som jobbar med BPMN Planner.

> 📋 **Struktur:** Se [`architecture/STRUCTURE.md`](./architecture/STRUCTURE.md) för dokumentationsstrukturen

---

## 🚀 Snabbstart

**Nya användare bör börja här:**
- **Snabbstart & Utveckling**: [`guides/user/QUICKSTART_AND_DEVELOPMENT.md`](./guides/user/QUICKSTART_AND_DEVELOPMENT.md)
- **Funktionalitet & Arkitektur**: [`architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](./architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md)
- **Dataflöden**: [`architecture/DATAFLOW_OVERVIEW.md`](./architecture/DATAFLOW_OVERVIEW.md)

---

## 📚 Dokumentationskategorier

### 🎯 Användarguider (`guides/user/`)
- **`QUICKSTART_AND_DEVELOPMENT.md`** - Snabbstart och utvecklingsguide
- **`README_FOR_TESTLEAD.md`** - Guide för test lead
- **`TEST_COVERAGE_USER_GUIDE.md`** - Test coverage guide
- **`LOCAL_DIFF_ANALYSIS_GUIDE.md`** - Guide för lokal diff-analys i appen

### ✅ Validering (`guides/validation/`)
- **`VALIDATE_NEW_BPMN_FILES.md`** - **Komplett guide för att validera nya BPMN-filer från A till Ö** (hitta filer, diff, parsing, graph, tree, dokumentationsgenerering)

### 🏗️ Arkitektur (`architecture/`)
- **`bpmn-hierarchy-architecture.md`** - Detaljerad hierarki-arkitektur
- **`ARCHITECTURE_OVERVIEW.md`** - Översikt över hierarki, dokumentation och LLM
- **`DATAFLOW_OVERVIEW.md`** - Dataflödesöversikt
- **`FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`** - Komplett funktionalitetsöversikt
- **`BPMN_VERSIONING_STRATEGY.md`** - BPMN-versionering strategi
- **`VERSIONING_FINAL_DECISION.md`** - Versionslösning - slutgiltigt beslut
- **`VERSIONING_IMPLEMENTATION_COMPLETE.md`** - Versionslösning - implementeringsstatus
- **`guides/API_REFERENCE.md`** - API-referens

### ✨ Funktioner (`features/`)
- **`FEATURES_AND_FUNCTIONALITY.md`** - Funktioner och arbetsflöde
- **`JIRA_NAMING.md`** - Jira-namngivning
- **`INTEGRATIONS.md`** - Integrationer
- **`FEATURE_ROADMAP.md`** - Feature roadmap

### 🧪 Testing (`testing/`)
- **`TESTING.md`** - Testguide, best practices
- **`TEST_EXPORT.md`** - Test export guide
- **`TEST_SCENARIOS.md`** - Test-scenarion och design-scenarion
- **`test-report-views.md`** - Testrapportvyer
- **`TEST_SCENARIO_GENERATION.md`** - Test scenario generation
- **`TEST_MAPPING_DESIGN_SCENARIOS.md`** - Test mapping design scenarios
- **`strategy/TEST_OVERVIEW_AND_GAPS.md`** - Testanalys och gaps
- **`strategy/TEST_IMPLEMENTATION_PLAN.md`** - Test implementeringsplan

### 📝 Templates (`templates/`)
- **`BATCH_GENERATION.md`** - Batch-generering
- **`CODEX_BATCH_AUTO.md`** - Codex batch-generering (detaljerad)
- **`PROMPT_VERSIONING.md`** - Prompt-versionering
- **`FALLBACK_SAFETY.md`** - Fallback-säkerhet
- **`BUSINESS_RULE_TEMPLATE_CONTENT.md`** - Business Rule template content
- **`EPIC_TEMPLATE_CONTENT.md`** - Epic template content
- **`FEATURE_GOAL_TEMPLATE_CONTENT.md`** - Feature Goal template content
- **`html/`** - HTML-mallar (feature-goals, epics, rules)

### 📋 Confluence (`confluence/`)
- **`README.md`** - Confluence-dokumentation översikt
- **`template.md`** - Mall för Confluence-sidor
- **`application.md`** - Exempel på Confluence-dokumentation

### 📊 Projektorganisation (`project-organization/`)
- Ways of working, teststrategi, roller, projektstruktur

### 📁 Analysis (`analysis/`)
- **`DIFF_FUNCTIONALITY_ANALYSIS.md`** - Analys av diff-funktionalitet för selektiv regenerering
- **`DIFF_FUNCTIONALITY_EXPLANATION.md`** - Förklaring av diff-funktionalitet
- **`historical/`** - Historiska analyser och temporära dokument (43 filer arkiverade)

---

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
  Alla "planerade scenarion" i UI kommer från tabellen `node_planned_scenarios`:
  - LLM‑flöden (ChatGPT/Ollama) skriver in scenarier per nod/provider när dokumentation/testunderlag genereras.
  - Den hierarkiska generatorn seedar även bas‑scenarion för test-scenarion per nod (antingen från `testMapping` eller ett auto‑genererat happy‑path).

- **Lokala mallar vs. genererad dokumentation**  
  Mallarna i `templates/html/` är referensmallar för manuell dokumentation. Den dokumentation som slutanvändaren ser i appen genereras och lagras som HTML i Supabase Storage och visas via `DocViewer`.

---

## När ska du läsa vad?

- Du ska **komma igång** → börja med `guides/user/QUICKSTART_AND_DEVELOPMENT.md`
- Du ska **förstå hur hierarkin fungerar** → börja med `architecture/bpmn-hierarchy-architecture.md`
- Du ska **analysera diff för lokala filer** → läs `guides/user/LOCAL_DIFF_ANALYSIS_GUIDE.md`
- Du ska **validera nya BPMN-filer från A till Ö** → läs `guides/validation/VALIDATE_NEW_BPMN_FILES.md` ⭐
- Du ska **förstå testrapporten** → läs `testing/test-report-views.md`
- Du ska **skriva/uppdatera Confluence‑sidor** → använd `confluence/template.md` och `confluence/README.md`
- Du ska **förstå teststrategi** → läs `testing/strategy/TEST_OVERVIEW_AND_GAPS.md`

---

## Praktiska npm‑kommandon

> 📋 **För komplett lista med alla kommandon och detaljerad guide, se [`guides/user/QUICKSTART_AND_DEVELOPMENT.md`](./guides/user/QUICKSTART_AND_DEVELOPMENT.md)**

**Snabböversikt:**
- `npm run dev` – startar Vite‑devservern
- `npm run start:supabase` – starta Supabase (guidad)
- `npm test` – kör alla Vitest‑tester
- `npx playwright test` – kör Playwright E2E-tester
- `npm run print:bpmn-tree` – exportera BPMN-träd
