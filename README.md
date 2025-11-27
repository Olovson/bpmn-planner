# 🚀 BPMN Planner

**BPMN Planner** tar BPMN-/DMN-filer, bygger en deterministisk processhierarki, visualiserar processen (diagram, strukturträd, listvy) och genererar dokumentation, testunderlag och metadata för produkt- och utvecklingsteamet. Supabase används som backend och innehåll kan genereras både via mallar (utan LLM) och via LLM (ChatGPT/Ollama).

> Arkitektur & hierarki: `docs/bpmn-hierarchy-architecture.md`  
> LLM-kontrakt & prompts: `prompts/llm/*`  
> Test-scenarion & design-scenarion: `docs/TEST_MAPPING_DESIGN_SCENARIOS.md`
>
> **Not om subprocesser (callActivity vs subProcess)**  
> I många modeller används både `bpmn:callActivity` (tydlig extern subprocess) och `bpmn:subProcess` (inlinad subprocess) för att beskriva logiken.  
> För BPMN Planner betraktas vissa `subProcess`-noder som “subprocess-kandidater” på samma sätt som `callActivity`, och kan därför få kopplingar i `bpmn-map.json` till separata BPMN-filer.  
> – Root-processen (`mortgage.bpmn`) använder främst `callActivity` som subprocess-indikator.  
> – I subprocess-filerna (t.ex. `mortgage-se-application.bpmn`, `mortgage-se-manual-credit-evaluation.bpmn`) används `subProcess` eller andra aktivitetsnoder (`stakeholder`, `object`, `household`, `documentation-assessment`, `credit-evaluation` etc.) som logiska subprocesser.  
> – `bpmn-map.json` är sanningen för vilka av dessa noder som faktiskt ska länkas till egna `.bpmn`-filer.  
> Parsern och valideringen utökas stegvis för att behandla både `callActivity` och utpekade `subProcess`-noder som subprocesser, så att hierarki, dokumentation och tester alltid utgår från samma explicita karta.

---

# 🧠 Översikt: hierarki, dokumentation & LLM

- **BPMN-hierarki**
  - XML → `BpmnParser` → `BpmnMeta`
  - `ProcessDefinition` + `SubprocessLink` → `buildProcessHierarchy`
  - `buildBpmnProcessGraph` → `BpmnProcessGraph` (root, children, missingDependencies)
  - denna graf används av UI, dokumentationsgeneratorn och testgeneratorn.
- **Ordningslogik för callActivities/tasks**
  - `orderIndex` beräknas enbart för noder som deltar i sequence edges (DFS/topologisk sort). Övriga noder lämnas utan `orderIndex`.
  - Noder utan `orderIndex` får istället `visualOrderIndex` baserat på DI-koordinater (vänster→höger-sortering per fil).
  - Sortering i UI och Gantt följer alltid `visualOrderIndex` → `orderIndex` → `branchId` (endast root) → `label`. Se `docs/VISUAL_ORDERING_IMPLEMENTATION.md`.
  - För felsökning finns scriptet `npm run mortgage:order-debug` som kör hela parse → graph → tree-flödet för mortgage-fixtures och skriver ut tabeller (både full traversal och “unika aktiviteter per fil”) med ordningsmetadata.

- **Dokumentation**
  - Feature Goals, Epics och Business Rules genereras via modellbaserade JSON-kontrakt:
    - `FeatureGoalDocModel`, `EpicDocModel`, `BusinessRuleDocModel`
  - LLM fyller JSON → mappers → HTML via templates i `src/lib/documentationTemplates.ts`.
  - Samma HTML-layout används för lokal (mallbaserad) och LLM-baserad dokumentation.
  - Prompts i `prompts/llm/*` instruerar LLM att alltid svara med **ett JSON-objekt** (ingen HTML/markdown) och att markera numeriska tröskelvärden som **exempelvärden** (t.ex. `600 (exempelvärde)`).
  - Input till LLM består av:
    - ett `processContext` (kondenserad processöversikt med processnamn, nyckelnoder samt fas `phase` och roll `lane` per nyckelnod),
    - ett `currentNodeContext` (aktuellt BPMN‑element med hierarki, släktnoder, flöden, dokumentation och länkar).
    Dokumentation och scenarier ska alltid förankras i dessa fält – promptkontrakten finns i `prompts/llm/PROMPT_CONTRACT.md`.
  - **Per-node overrides**: Varje nod kan ha en override-fil i `src/data/node-docs/` som överskrider mallbaserad/LLM-genererad innehåll. Se `docs/CODEX_BATCH_AUTO.md` för batch-generering med Codex.
  - **Prompt-versionering**: Prompts är versionerade för att spåra när innehåll behöver re-genereras. Se `docs/PROMPT_VERSIONING.md`.

- **LLM-lägen & providers**
  - Lokal generering (utan LLM): snabb, deterministisk, mallbaserad.
  - Slow LLM Mode: rikare text via:
    - ChatGPT (moln, gpt-4o) via `cloudLlmClient`.
    - Lokal modell via Ollama (t.ex. `llama3:latest`) via `localLlmClient`.
  - Internt används providers som `'cloud'` och `'local'`, men i loggar/UI visas alltid:
    - `ChatGPT` (cloud),
    - `Ollama` (local),
    - `Local-fallback` (local när den tagit över efter ett misslyckat ChatGPT-försök).
  - `generateDocumentationWithLlm` bygger JSON-input (processContext/currentNodeContext), använder `generateWithFallback` per docType/provider och loggar LLM-events (inkl. latency, tokenbudget-varningar) som kan inspekteras i LLM Debug-vyn.
  - HTML-dokument får metadata om LLM-användning och visar en diskret banner när lokal LLM används som fallback istället för ChatGPT.

---

# 📝 Vad som genereras

- Dokumentation per nod:
  - Feature Goals / Epics / Business Rules.
  - Effektmål, scenarier, inputs/outputs, beslutslogik, tekniska beroenden.
  - DoR/DoD-kriterier och övrig nodmetadata.
- Tester:
  - Playwright-skelett per nod eller gren.
  - Testscenarier via LLM i Slow LLM Mode (`generateTestSpecWithLlm`).
  - Design-scenarion från `testMapping.ts` för lokal generering (används när LLM är avstängt).
  - Node tests i UI (kopplade till `node_test_links`).
  - **Export-ready test scripts** för complete environment (se [Test Export](#-test-export) nedan).
- Övrig metadata:
  - Jira-typer/namn per nod (se [Jira-namngivning](#jira-namngivning) nedan).
  - Subprocess-mappningar (`bpmn_dependencies`) + diagnostik (`missingDependencies`).
  - Explicit BPMN-karta (`bpmn-map.json`) med kopplingar mellan BPMN-filer och subprocess-noder (både `callActivity` och vissa `subProcess`-noder) – används för att tydligt deklarera vilka delar av modellen som ska tolkas som externa subprocesser.

Alla artefakter lagras i Supabase (tabeller + storage) och kan regenereras från UI.

---

# 🏷️ Jira-namngivning

BPMN Planner genererar automatiskt Jira-namn för alla relevanta noder (feature goals och epics) baserat på processhierarkin.

## Namngivningsregler

**Alla nodtyper använder samma full path-baserad namngivning:**

- **Fullständig path från root till nod** (root-processnamn exkluderas)
- **Format**: `<parent1> - <parent2> - ... - <node.label>`
- **Root-processnamn ingår aldrig** i Jira-namn (t.ex. "Mortgage" ingår inte)

### Feature Goals (callActivity)

Feature goals använder full path-baserad namngivning:

- **Top-level subprocess** (direkt under root):
  - Format: `<SubprocessLabel>`
  - Exempel: `Application`

- **Nested subprocess** (under en annan subprocess):
  - Format: `<Parent1> - <Parent2> - ... - <SubprocessLabel>`
  - Exempel: `Application - Internal data gathering`

### Epics (userTask, serviceTask, businessRuleTask)

Epics använder samma full path-baserad namngivning:

- **Path innehåller alla föräldranoder** från root till nod (exklusive root)
- Format: `<Parent1> - <Parent2> - ... - <TaskLabel>`
- Exempel: `Automatic Credit Evaluation - Calculate household affordability` (serviceTask under Automatic Credit Evaluation subprocess)

## Exempel

För en processhierarki:
```
Mortgage (root)
  └─ Application (callActivity)
      ├─ Internal data gathering (callActivity)
      │   └─ Verify customer info (userTask)
      └─ Confirm application (userTask)
  └─ Automatic Credit Evaluation (callActivity)
      └─ Calculate household affordability (serviceTask)
```

Genererade Jira-namn:
- `Application` (feature goal, top-level)
- `Application - Internal data gathering` (feature goal, nested)
- `Application - Internal data gathering - Verify customer info` (epic, under nested subprocess)
- `Application - Confirm application` (epic, under top-level subprocess)
- `Automatic Credit Evaluation` (feature goal, top-level)
- `Automatic Credit Evaluation - Calculate household affordability` (epic, under top-level subprocess)

## Implementation

Jira-namn genereras via `buildJiraName()` i `src/lib/jiraNaming.ts` och används konsekvent i:
- Hierarkibyggnad (`BpmnFileManager.handleBuildHierarchy`) - **endast plats som skriver Jira-namn till databasen**
- Fallback-namn (`useAllBpmnNodes`)
- Edge Functions (`generate-artifacts`) - sätter bara `jira_type`, inte `jira_name`

**Viktigt**: Jira-namn skrivs endast till databasen när hierarkin byggs via "Bygg/uppdatera hierarki från root". Detta säkerställer att korrekta fullständiga paths används baserat på hela ProcessTree.

---

# 📤 Test Export

BPMN Planner kan generera **export-ready test scripts** som kan tas till en complete environment för finalisering. Dessa scripts innehåller BPMN-metadata, tydliga TODO-markörer och struktur som kan kompletteras i målmiljön.

## Översikt

**BPMN Planner** = Starter environment - Genererar grundläggande testscripts som kan tas vidare  
**Complete Environment** = Nästa miljö - Kompletterar scripts med riktiga routes, UI-element, testdata

### Vad BPMN Planner Genererar

Export-ready test scripts inkluderar:
- ✅ Korrekt teststruktur (Playwright patterns)
- ✅ BPMN-metadata som kommentarer (fil, nod, scenario, persona, riskLevel, etc.)
- ✅ Tydliga TODO-markörer för vad som behöver kompletteras
- ✅ Scenario-baserad logik (persona setup, uiFlow-struktur, assertions)
- ✅ Smart defaults (inferred routes/endpoints från nodnamn)

**Exkluderar** (ska läggas till i complete environment):
- ❌ Riktiga routes/endpoints
- ❌ Riktiga UI locators
- ❌ Riktiga testdata fixtures

### Hur Det Fungerar

1. **Generera test scripts** i BPMN Planner (som vanligt)
2. **Exportera scripts** via export-knapp i UI
3. **Importera till complete environment**
4. **Komplettera** med riktiga routes, locators och testdata
5. **Kör och validera** tester

### Exempel: Export-Ready Test

```typescript
// ============================================
// EXPORT-READY TEST - Generated by BPMN Planner
// BPMN File: mortgage-se-application.bpmn
// Node ID: confirm-application
// Scenario: EPIC-S1 - Normalflöde med komplett underlag
// Persona: customer, Risk Level: P0
// ============================================

import { test, expect } from '@playwright/test';

test.describe('P0 - Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    await page.goto('/login'); // ⚠️ TODO: Update with actual login route
    await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
    
    // Navigation steps (from uiFlow)
    await page.goto('/application-form'); // ⚠️ TODO: Update with actual route
    await page.fill('#form', 'TODO: Add test data'); // ⚠️ TODO: Update locator and add test data
    
    // Assertions based on scenario outcome
    await expect(page.locator('.success-message, .confirmation')).toBeVisible();
  });
});
```

### Dokumentation

Se följande dokumentation för detaljer:
- `docs/STARTER_VS_COMPLETE_ENVIRONMENT.md` - Fullständig plan för starter vs. complete environment
- `docs/EXPORT_INTEGRATION_WITH_EXISTING_UI.md` - Hur export integreras med befintlig UI
- `docs/EXPORT_TO_COMPLETE_ENVIRONMENT.md` - Guide för export-processen
- `docs/COMPLETING_TESTS_IN_COMPLETE_ENVIRONMENT.md` - Guide för att komplettera scripts

---

# 🧪 Test-scenarion & design-scenarion

BPMN Planner stödjer två sätt att generera testscenarion för Playwright-testscript:

## LLM-genererade scenarion (Slow LLM Mode)

När LLM är aktiverat (`VITE_USE_LLM=true`) kan systemet generera testscenarion via:
- **ChatGPT** (moln-LLM) – "gold standard" för kontraktet
- **Ollama** (lokal LLM) – best-effort fallback

LLM-scenarion genereras via `generateTestSpecWithLlm()` och sparas i `node_planned_scenarios` med provider `chatgpt` eller `ollama`.

## Design-scenarion (Lokal generering)

För lokal generering (utan LLM) används **design-scenarion** från `src/data/testMapping.ts`:

- **Statisk konfiguration**: Varje testbar nod kan ha en entry i `testMapping` med manuellt definierade scenarion.
- **Format**: Varje scenario har `id`, `name`, `description`, `status`, `category` (happy-path/error-case/edge-case).
- **Användning**: När lokal generering körs (`useLlm = false`) läser `getDesignScenariosForElement()` scenarion från `testMapping` och skickar dem till `generateTestSkeleton()`.
- **Fallback**: Om en nod saknar entry i `testMapping` skapas automatiskt ett enkelt "Happy path"-scenario.

### Hur design-scenarion sparas

När hierarkin byggs eller dokumentation genereras:
1. `createPlannedScenariosFromTree()` / `createPlannedScenariosFromGraph()` går igenom alla testbara noder.
2. För varje nod:
   - Om `testMapping[nodeId]` finns → använd dess scenarion.
   - Annars → skapa ett automatiskt fallback-scenario.
3. Alla scenarion sparas i `node_planned_scenarios` med `provider: 'local-fallback'` och `origin: 'design'`.

### Utöka design-scenarion

För att lägga till fler eller bättre scenarion:
1. Öppna `src/data/testMapping.ts`.
2. Lägg till eller uppdatera entry för noden (nyckel = `elementId`).
3. Definiera scenarion med relevanta kategorier (happy-path, error-case, edge-case).
4. När du kör lokal generering kommer dessa scenarion användas direkt i Playwright-testscripten.

**Viktigt**: LLM-generering påverkas **inte** av `testMapping.ts` – den använder endast LLM-scenarion. Design-scenarion används enbart när `useLlm = false`.

---

# 🔌 Integrationer

BPMN Planner innehåller en dedikerad sida för att hantera integrationer mellan Stacc och bankens integrationskällor.

## Integrationer-sidan (`#/integrations`)

- **Path**: `#/integrations`
- **Syfte**: Hantera vilka Service Tasks som använder Staccs integrationskälla vs. bankens integrationskälla.
- **Funktionalitet**:
  - Visar alla Service Tasks från `staccIntegrationMapping.ts` (statisk mappning).
  - Kolumner: BPMN Fil, Element, Element ID, Typ, Beskrivning, Staccs integrationskälla (read-only), Ersätts med bankens integrationskälla (checkbox).
  - Checkboxen är **ikryssad som standard** (använder Staccs integrationskälla).
  - När checkboxen **kryssas ur** betyder det att noden ska ersättas med bankens integrationskälla.
  - Val sparas i `integration_overrides`-tabellen i Supabase och är persistent över sessioner.

## Visualisering i andra vyer

- **Timeline** (`#/timeline`): Service Tasks som använder bankens integrationskälla visas i **grön färg** (istället för standard blå).
- **Process Explorer** (`#/process-explorer`): Service Tasks med bankens integrationskälla markeras med grön färg i trädvyn och har en egen legend-typ "Bankens integrationskälla (Service Task)".

## Statisk mappning

Mappningen mellan Service Tasks och Staccs integrationskällor definieras i `src/data/staccIntegrationMapping.ts`:
- 20 fördefinierade Service Tasks med sina integrationskällor.
- Används för att auto-populera "Staccs integrationskälla"-kolumnen.
- Kan utökas med fler Service Tasks vid behov.

---

# ⚙️ Snabbstart (lokal utveckling)

```bash
git clone https://github.com/Olovson/bpmn-planner.git
cd bpmn-planner
npm install
```

## 1. Starta Supabase

**Kontrollera om Supabase körs:**
```bash
npm run check:supabase-status  # Visar om Supabase körs eller inte
# eller
supabase status  # Visar detaljerad status om Supabase körs
```

**Starta Supabase (guide):**
```bash
npm run start:supabase  # Visar instruktioner för att starta Supabase
```

**Starta Supabase manuellt:**
```bash
supabase start  # Startar Supabase lokalt
```

**⚠️ Om du ser felmeddelandet "supabase start is not running" eller "open supabase/.temp/profile: no such file or directory":**

Detta betyder att Supabase CLI inte hittar din lokala projektprofil och faller tillbaka till remote-projektet. Följ dessa steg:

```bash
# 1. Se guide för att fixa profil-problemet
npm run fix:supabase-profile

# 2. Följ instruktionerna i guiden, eller kör manuellt:
supabase start                    # Återskapar projektprofilen
supabase db reset                 # Resetar databasen
supabase start                    # Startar igen (om den inte redan startade)
npm run check:db-schema          # Verifierar att schema är korrekt
```

**Viktigt:** Om du ser `PGRST204`-fel (schema-cache mismatch) efter att ha lagt till nya kolumner:
```bash
npm run supabase:reset  # Stoppar, resetar DB, startar om, verifierar schema och skapar seed-användare automatiskt (rekommenderat)
# eller
npm run supabase:ensure-schema  # Säkerställer schema-sync vid start
```

Detta säkerställer att PostgREST läser om schemat och uppdaterar sin cache.

**Seed-användare skapas automatiskt**: När du kör `npm run supabase:reset` skapas seed-användaren (`seed-bot@local.test` / `Passw0rd!`) automatiskt efter databas-reset. Om du bara behöver skapa användaren utan att resetta databasen kan du köra:
```bash
npm run create:seed-user
```

## 2. Miljövariabler (.env.local)
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role>
SEED_USER_EMAIL=seed-bot@local.test
SEED_USER_PASSWORD=Passw0rd!
VITE_USE_LLM=true
VITE_OPENAI_API_KEY=<OpenAI key>
VITE_LLM_LOCAL_BASE_URL=http://localhost:11434
VITE_LLM_LOCAL_MODEL=llama3:latest
```

> **Obs:** när `VITE_USE_LLM=true` och `VITE_OPENAI_API_KEY` är satt används LLM-kontrakten för ChatGPT/Ollama. Om LLM är avstängd används alltid lokal modellbaserad dokumentation.

## 2.5. Fusklapp – LLM‑utveckling (starta allt)

När du ska jobba med LLM (ChatGPT/Ollama), använd alltid samma grundsekvens:

1. Gå till projektet
```bash
cd /Users/magnusolovson/Documents/Projects/bpmn-planner
```

2. Starta Supabase (lokalt projekt)
```bash
npm run start:supabase   # guidat start/reset-flöde för Supabase
```

3. Starta dev‑server (frontend)
```bash
npm run dev   # http://localhost:8080/
```

4. Snabbkolla att Ollama svarar (valfritt men bra vid strul)
```bash
curl -s http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3:latest","prompt":"ping","stream":false,"options":{"num_predict":5}}'
```

5. Lokal LLM health‑test via Supabase‑funktion
```bash
LLM_HEALTH_TEST=true npx vitest run tests/integration/llm.health.local.test.ts
```

> Om du ändrar `.env.local` eller `supabase/.env` behöver du:
> - starta om Supabase (`npm run start:supabase`), och
> - om du kör `supabase functions serve llm-health ...` i en separat terminal: stoppa med Ctrl+C och starta om kommandot.

## 3. Edge Functions (valfritt men rekommenderat vid LLM-utveckling)

För att vissa delar av appen ska fungera fullt ut lokalt (t.ex. LLM‑health och process‑trädet) behöver du starta relevanta edge functions i egna terminalfönster:

```bash
# Terminal 1 – LLM health (Ollama/ChatGPT-status)
supabase functions serve llm-health --no-verify-jwt --env-file supabase/.env

# Terminal 2 – build-process-tree (för processgrafen)
supabase functions serve build-process-tree --no-verify-jwt --env-file supabase/.env
```

Kör därefter dev-servern i en tredje terminal:

```bash
npm run dev
```

Så länge dessa tre terminaler är igång får du:
- korrekt LLM‑status på sidan `#/files` (ChatGPT/Ollama tillgänglig/ej tillgänglig),
- fungerande process‑träd/byggfunktioner i UI.

## 4. Dev-server
```bash
npm run dev   # http://localhost:8080/
```

> **Not om hierarki & generering:**  
> Full hierarkianalys (`buildBpmnProcessGraph`) körs idag bara för **toppfilen** (root, t.ex. `mortgage.bpmn`).  
> Övriga BPMN‑filer genereras per fil (docs/tester/DoR/DoD) och kopplas in via `bpmn_dependencies`, `bpmn_element_mappings`, `node_test_links` m.m.  
> Process Explorer/Node Matrix bygger alltid sin hierarki från rootfilen och ser cross‑fil‑kopplingar där, så du får en sammanhängande struktur även om genereringen sker per fil.

## 5. Inloggning
`seed-bot@local.test / Passw0rd!`

## 6. Validering & tester

**Testmiljö:**
- **Vitest** för unit- och integrationstester.
- Standard environment är `node`. jsdom används selektivt i de testfiler som behöver DOM (t.ex. parser-tester).

**Kör tester (snabb, deterministisk svit utan riktiga LLM-anrop):**
```bash
npm test                 # kör alla vitest-tester
npm run test:watch       # kör tester i watch-läge
npm run check:generator  # snabb kontroll av BPMN-generatorn
npm run check:db-schema  # verifierar att generation_jobs.mode finns i Supabase-schema
npx vitest run \
  src/lib/bpmn/buildProcessHierarchy.test.ts \
  src/lib/processTreeNavigation.test.ts   # verifierar hierarkin + UI-kartan
# (valfritt) supabase functions serve build-process-tree --env-file supabase/.env --no-verify-jwt
```

**Fallback-säkerhet i tester:**
- Tester använder INTE LLM som standard (`isLlmEnabled() === false` i test-miljö).
- Fallback-resultat är tydligt markerade med metadata. Se `docs/FALLBACK_SAFETY.md` för detaljer.

**Riktiga LLM-smoke-tester (opt-in):**

Det finns dedikerade script för att köra ett litet antal riktiga LLM-tester (Feature Goal + Epic + Business Rule) utan att påverka resten av sviten:

```bash
npm run test:llm:smoke        # endast ChatGPT (cloud)
npm run test:llm:smoke:cloud  # strikt ChatGPT-smoke med LLM_SMOKE_STRICT=true
npm run test:llm:smoke:local  # endast Ollama (lokal), best-effort
```

Scriptet `test:llm:smoke` sätter:

- `VITE_USE_LLM=true`
- `VITE_ALLOW_LLM_IN_TESTS=true`
- `LLM_PROVIDER=cloud`

och kör `tests/integration/llm.real.smoke.test.ts`, som:

- använder `generateDocumentationWithLlm` med verklig OpenAI-klient när:
  - `VITE_OPENAI_API_KEY` är satt,
  - `VITE_USE_LLM=true`,
  - `VITE_ALLOW_LLM_IN_TESTS=true`,
- testar LLM-flödet (JSON → modell → HTML) för:
  - Feature Goal (`docType = "feature"`),
  - Epic (`docType = "epic"`),
  - Business Rule (`docType = "businessRule"`),
- skriver LLM-baserad HTML (ChatGPT) och mallbaserad fallback-HTML till `tests/llm-output/html/`:
  - `llm-feature-goal-chatgpt.html` / `llm-feature-goal-ollama.html` / `llm-feature-goal-fallback.html`
  - `llm-epic-chatgpt.html` / `llm-epic-ollama.html` / `llm-epic-fallback.html`
  - `llm-business-rule-chatgpt.html` / `llm-business-rule-ollama.html` / `llm-business-rule-fallback.html`
- skriver även råa LLM-svar (texten/JSON-strängen som skickas tillbaka från respektive LLM) till `tests/llm-output/json/`:
  - `llm-feature-goal-chatgpt.json` / `llm-feature-goal-ollama.json`
  - `llm-epic-chatgpt.json` / `llm-epic-ollama.json`
  - `llm-business-rule-chatgpt.json` / `llm-business-rule-ollama.json`
- markerar i den LLM-baserade HTML:en vilka sektioner som kommer från LLM kontra fallback (t.ex. `data-source-summary="llm|fallback"`, `data-source-scenarios="llm|fallback"` per `<section class="doc-section">`), vilket gör det enkelt att inspektera källan i browserns devtools.
 - vid Feature Goal‑körning verifierar den även att LLM‑scenarion (ChatGPT) lagras i tabellen `node_planned_scenarios` och därmed blir tillgängliga i nodens testrapport.  
   Den hierarkiska BPMN‑generatorn seedar dessutom alltid bas‑scenarion för `local-fallback` per nod till samma tabell, så att Lokal fallback‑läget i testrapporten har ett tydligt utgångsläge även utan LLM.

Om LLM inte är aktiverat i tests (t.ex. ingen API-nyckel) hoppar smoke-test-filen automatiskt över sina tester (`describe.skip`).

### Extra viktig LLM-notis (för både människor och agenter)

- **ChatGPT (cloud) är “gold standard” för kontraktet.**  
  - Använd alltid:  
    `npm run test:llm:smoke:cloud`  
    för att verifiera att promptar, validering och JSON-kontrakt fortfarande fungerar.
  - Om denna svit är grön vet vi att kontrakten fungerar som avsett.

- **Lokal Ollama är best-effort fallback.**  
  - Använd:  
    `npm run test:llm:smoke:local`  
    för att inspektera lokal-modellens beteende (Feature/Epic/BusinessRule), se rå-output och valideringsfel.
  - Den sviten får gärna vara röd under utveckling – den ska **inte** blockera ChatGPT-flödet.

- **Ändra aldrig JSON-modellerna lättvindigt.**  
  - Typer/kontrakt som `FeatureGoalDocModel`, `EpicDocModel`, `BusinessRuleDocModel` är centrala:
    - UI, mappers, HTML-templates och tester förlitar sig på dessa.
  - Vid behov: justera **promptar** och **validering** först, inte själva modellen.

- **Efter ändringar i prompts eller validering:**  
  1. Kör alltid `npm run test:llm:smoke:cloud` först.  
  2. När cloud är grön, kör `npm run test:llm:smoke:local` för att se hur lokal LLM beter sig.  
  3. Använd `tests/llm-output/json/*.raw.json` för att analysera lokal LLM-output.

_Tips: hierarkin byggs från metadata i tabellen `bpmn_files.meta` (genereras vid uppladdning/parsing). Se till att metadata finns för att träd/diagram/listor ska spegla aktuell struktur._

### Local Schema Debug Checklist

Om du får fel av typen:

> `PGRST204: Could not find the 'mode' column of 'generation_jobs'`

så betyder det att din lokala Supabase‑databas inte har kolumnen `mode` på tabellen `generation_jobs`, eller att Supabase kör mot en gammal databasvolym.

Checklista:

1. Kör `npm run check:db-schema`  
   - Om den rapporterar att `mode` saknas:  
     - Kör `supabase db reset` **i projektets rot** eller `supabase migration up` för att applicera alla migrationer.  
     - Starta om Supabase (`supabase stop && supabase start`).
2. Kontrollera att du inte har flera Supabase‑projekt/containers igång på samma port (127.0.0.1:54321).
3. Kontrollera i Supabase Studio eller via SQL:
   - `SELECT column_name FROM information_schema.columns WHERE table_name = 'generation_jobs';`  
   - Verifiera att `mode` finns.
4. Om problemet kvarstår: rensa lokala Supabase-volymer för det här projektet enligt Supabase‑dokumentationen och gör en ny `supabase db reset`.

---

# 🛠️ Arbetsflöde i UI:t

1. **Files** – ladda upp BPMN/DMN eller synka GitHub.  
2. **Build hierarchy** – bygger deterministisk struktur.  
3. **Generate documentation** – välj Lokal fallback (ingen LLM), ChatGPT (moln-LLM) eller Ollama (lokal LLM).  
4. Visa resultat i **Viewer / Tree / List / Timeline**.  
5. Justera metadata i **Node Matrix**.  
6. **Integrationer** (`#/integrations`) – hantera Stacc vs. bankens integrationskällor för Service Tasks.  
7. **Timeline** – visualisera och redigera tidsordning för subprocesser i Gantt-chart.  
8. Öppna resultat i **Doc Viewer** eller **Node Tests**.  
9. **Återgenerera vid behov**.  
10. **Reset Registry** – rensa allt.

---

# ✨ Funktioner i korthet

- Deterministisk BPMN-hierarki  
- Subprocess-matchning med confidence score  
- Dokumentgenerering i två lägen (Local / Slow LLM)  
- Playwright-skapande automatiskt  
- **Design-scenarion** (`testMapping.ts`) för lokal testgenerering utan LLM
- **Integrationer-sida** (`#/integrations`) för hantering av Stacc vs. bankens integrationskällor
- Node Dashboard  
- SOT i Supabase Storage  
- Job queue för historik  
- Full diagnostik vid mismatch eller otydliga subprocesser  
- **Timeline / Planning View** - Gantt-chart för visualisering och redigering av tidsordning för subprocesser (använder orderIndex och visualOrderIndex för sortering)
- DMN-stöd (på väg)

---

# 🧹 Återställning & städning

**Reset Registry** rensar:  
- dokument  
- tester  
- DoR/DoD  
- node-referenser  
- debugfiler  
- BPMN/DMN-filer  
- Auth-data

---

# 🆘 Support & felsökning

- `llm_generation_logs` i Supabase Studio  
- Rå-LLM finns i `llm-debug/docs` och `llm-debug/tests`  
- Process Tree 404 → starta edge-funktionen  
- Tomma dokument → kör Generate igen  
- Hierarki-problem → se diagnostics i Node Matrix

## Schema-cache problem (PGRST204) & `supabase db reset`

När du kör `supabase db reset` i det här projektet är det normalt att se:

- `NOTICE: trigger "<namn>" for relation "<tabell>" does not exist, skipping`  
  Dessa kommer från `DROP TRIGGER IF EXISTS ...` i migrations och betyder bara att det inte fanns någon trigger att ta bort – det är inte ett fel.

---

## 🧪 BPMN‑fixtures & hierarki‑tester (mortgage‑case)

Det finns nu verkliga BPMN‑fixtures för mortgage‑processer under:

- `tests/fixtures/bpmn/mortgage-se-application.bpmn`
- `tests/fixtures/bpmn/mortgage-se-internal-data-gathering.bpmn`

Dessa används i:

- `tests/unit/bpmnHierarchy.integration.test.ts`
  - Testar att `buildBpmnProcessGraph`:
    - bygger graf för mortgage‑application med `internal-data-gathering` som root‑call activity,
    - identifierar saknade subprocesser (Stakeholder/Object/Household) i `missingDependencies`,
    - aldrig fastnar även när subprocess‑BPMN‑filer saknas (diagnostik istället för hang).
- `tests/integration/bpmnRealParse.mortgage.test.ts`
  - Läser de riktiga XML‑filerna och verifierar att de innehåller:
    - rätt `bpmn:process`‑id:n,
    - förväntade call activities (`internal-data-gathering`, `stakeholder`, `object`, `household`),
    - centrala tasks i internal‑data‑gathering‑processen (`fetch-party-information`, `pre-screen-party`, `fetch-engagements`),
    - en enkel derivation av mortgage‑hierarkin root → internal‑data‑gathering → Stakeholder/Object/Household.
  - `tests/integration/bpmnProcessGraph.mortgage.integration.test.ts`
    - Kör full kedja: real BPMN‑parse → `buildBpmnProcessGraph` → asserts på:
      - rootFile (`mortgage-se-application.bpmn`),
      - noder per fil (`fileNodes`),
      - callActivities (inkl. `internal-data-gathering`, `stakeholder`, `object`, `household`),
      - `missingDependencies` för saknade mortgage‑subprocesser (Stakeholder/Object/Household),
      - att cross‑fil‑subprocesser (t.ex. `signing`, `disbursement`) får rätt `subprocessFile`.
  - `src/lib/bpmn/buildProcessHierarchy.test.ts` (mortgage-likt scenario)
    - Innehåller ett mortgage‑inspirerat testfall som validerar:
      - att callActivity `internal-data-gathering` matchas mot rätt process,
      - att nested callActivities (`stakeholder`, `object`, `household`) blir icke‑matchade,
      - att diagnostiken innehåller NO_MATCH/LOW_CONFIDENCE‑poster för dessa.

Syftet med dessa tester är att:

- säkra att processhierarki‑motorn fungerar även i mortgage‑domänen,
- få tidiga larm om förändringar i BPMN‑filerna som bryter struktur eller call activity‑kedjor,
- garantera att subprocess‑synkning genererar diagnostik i stället för att blockera pipelinen.
- `WARN: no files matched pattern: supabase/seed.sql`  
  Projektet använder ingen global `supabase/seed.sql` just nu; all viktig initiering sker via migrations. Den här varningen kan ignoreras.

Så länge inga **ERROR**-rader visas och kommandot avslutas med något i stil med `Finished supabase db reset on branch main.`, är databasen korrekt återställd.

Om du ser fel som `PGRST204: Could not find the 'mode' column` vid körning i appen:

1. Kör `npm run check:db-schema` för att kontrollera att kolumnen `mode` finns på `generation_jobs` och `node_test_links` i den aktiva databasen.
2. Om checken säger att schema/cachen är fel: kör `npm run supabase:reset` för att stoppa, resetta och starta om Supabase med aktuella migrationer.
3. **Förhindra problem:** Använd `npm run supabase:ensure-schema` innan dev-server startar för att säkerställa schema-sync.

Detta problem uppstår när PostgREST schema-cache är utdaterad efter migrationer.

---

# 🚀 Batch-generering av Dokumentation

## Codex Batch Auto (Rekommenderat)

För att batch-generera innehåll för många noder med Codex:

```bash
# 1. Skapa instruktionsfil
npm run codex:batch:auto

# 2. Öppna Codex-chatten i Cursor och säg:
# "Läs filen .codex-batch-all.md och bearbeta ALLA filer där automatiskt.
#  VIKTIGT: Skriv ALDRIG över befintligt innehåll - ersätt bara 'TODO', tomma arrayer [], eller tomma strängar ''.
#  Fortsätt från fil 1 till sista filen utan att stoppa eller fråga.
#  Bearbeta filerna en i taget, men kontinuerligt."
```

Detta kommer att:
- Hitta alla override-filer med TODO-platshållare eller gamla prompt-versioner
- Skapa en instruktionsfil (`.codex-batch-all.md`) med detaljerade instruktioner per fil
- Codex bearbetar alla filer automatiskt och uppdaterar bara TODO-fält

Se `docs/CODEX_BATCH_AUTO.md` för fullständig dokumentation.

## Prompt-versionering

När du uppdaterar prompt-mallarna (`prompts/llm/*.md`):

```bash
# 1. Uppdatera versionen i prompt-filen (t.ex. 1.0.0 → 1.1.0)
# 2. Kontrollera vilka filer som påverkas
npm run check:prompt-versions

# 3. Re-generera innehåll
npm run codex:batch:auto
```

Se `docs/PROMPT_VERSIONING.md` för detaljer.

## Skapa Override-filer

```bash
# Skapa override-filer för alla BPMN-filer
npm run create:all-node-docs

# Skapa override-filer för en specifik BPMN-fil
npm run create:node-docs-from-bpmn mortgage-se-application.bpmn

# Skapa en enskild override-fil
npm run create:node-doc feature-goal mortgage-se-application.bpmn household
```

---

# 🧭 TODO & Framtida Förbättringar

Se [TODO.md](TODO.md) för en detaljerad, prioriterad lista över uppgifter och förbättringar.

Se [Feature Roadmap](docs/FEATURE_ROADMAP.md) för strategiska funktioner och långsiktiga visioner.

# 📍 Lokal URL
`http://localhost:8080/`

# 📦 Bygga för produktion

```bash
npm run build        # Produktionsbygg
npm run build:dev    # Utvecklingsbygg (med source maps)
```

Bygget lägger statiska filer under `dist/` som kan deployas bakom valfri reverse proxy.  
Se till att Supabase-URL/nycklar och edge-funktioner är korrekt konfigurerade i den miljö du deployar till.
