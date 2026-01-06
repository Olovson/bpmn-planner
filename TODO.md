# 📋 TODO - BPMN Planner

Detta dokument innehåller en prioriterad lista över uppgifter och förbättringar för BPMN Planner.

> **Se även:** [Feature Roadmap](docs/FEATURE_ROADMAP.md) för strategiska funktioner och långsiktiga visioner.
> **Miljöer:** Just nu körs **”production”‑Supabase lokalt** via Supabase CLI (`npm run start:supabase`), medan **test‑Supabase** ligger i molnet (`bpmn-planner-test`).

---

## 🎯 Snabböversikt: De 3 Kritiska Punkterna

**Uppdatering 2026‑01‑04:** Testmiljö (se punkt 1) är i stort sett klar – vi har nu ett separat Supabase-testprojekt, seed/reset-script, Vite test‑mode och Playwright/Vitest som kör mot testmiljön. Preview deployments återstår.

**Fokus just nu:** Dessa tre punkter är viktigast för stabilitet, automatiserad mapping och vidare utveckling:

1. **🤖 Claude‑stödd bpmn-map.json generering (LLM-refinement)** (HÖG – pågående)
   - **Status:** 
     - Heuristik + merge + validering är implementerat och testat.
     - LLM‑refinementlagret (`refineBpmnMapWithLlm`) används nu både från CLI och från UI (BPMN‑mappningskortet).
     - Files‑sidan har ett BPMN‑mappningskort + detaljerad dialog där:
       - alla problemrader syns,
       - Claude kan köras explicit på otydliga mappningar,
       - ändringar sparas manuellt till `bpmn-map.json`.
   - **Problem just nu:** 
     - CLI‑scriptet `scripts/generate-bpmn-map.mjs` med `--llm` har fortfarande ESM/`path-intersection`‑strul (påverkar CLI, inte appen).
     - Vi har ännu inte gjort en kontrollerad, dokumenterad end‑to‑end‑genomgång av “ladda upp 2026‑filer → fixa mappning i UI → generera docs/tests” som en formaliserad checklista.
   - **Nästa steg (praktiskt fokus):** 
     1. **UI‑checklista:** Skriv en kort, konkret “Så här mappar du nya BPMN‑filer”‑sektion i en user‑guide (eller uppdatera befintlig) som beskriver:
        - upload → suggestions‑popup → BPMN‑mappningskort → spara → validera.
     2. **Bekräfta 2026‑flödet:** Kör igenom fulla flödet för `mortgage-se 2026.01.04 16:30`:
        - se att alla callActivities får korrekt subprocess eller tydlig varning,
        - justera det som behövs och spara,
        - verifiera att dokumentation/testgenerering fungerar utan fel.
     3. **Separat:** när ork finns, stabilisera CLI‑scriptet eller dokumentera att UI‑flödet är “primary path” och CLI är experimentellt.
   - **Varför:** Detta är hjärtat i appen – mappningen måste vara både **pålitlig** och **lätt att förstå** för användaren.

2. **🚨 Testmiljö & Preview Deployments** (HÖG – pågående)
   - Preview deployments (Vercel/Netlify eller motsv.)
   - Test Supabase‑projekt, säker test‑miljö (✅ klart)
   - Möjlighet att testa kodändringar säkert innan merge
   - **Varför:** Förhindrar att vi förstör fungerande funktionalitet

3. **🔧 Files-sidan analys/fixar** (HÖG – pågående, fokus på BPMN‑mappning)
   - **Status:** 
     - Nytt BPMN‑mappningskort på Files‑sidan visar alla problemrader och låter användaren justera mappningar + spara.
     - Mappningsdialog och valideringsdialog är kopplade till samma `bpmn-map.json`.
     - Upload‑flödet visar nu “Föreslagna uppdateringar…”‑popup automatiskt när heuristiken hittar förslag.
   - **Nästa steg:** 
     - Köra igenom ett par “riktiga” användarflöden (t.ex. ladda upp 2026‑mappen från scratch) och justera små UX‑detaljer (texter, tooltips) efter hur det faktiskt känns.
   - **Varför:** Files‑sidan är den primära arbetsytan; den måste vara stabil och begriplig även när man är trött.

**Total tid:** ~4-7 dagar för de 3 kritiska punkterna

---

## 🔥 Högsta prioritet

### 🚨 KRITISKT: Komplett Test-Miljö för Säker Utveckling
- [ ] **SÄTT UPP: Preview Deployments (Vercel/Netlify)**
  - **Problem:** Vi kan INTE testa kodändringar säkert innan merge - risk för att förstöra fungerande funktionalitet
  - **Påverkan:** Appen är instabil eftersom vi inte kan verifiera att ändringar fungerar innan merge
  - **Lösning:** Sätt upp automatiska preview deployments per feature branch
  - **Steg:**
    1. Skapa Vercel/Netlify-konto (gratis tier räcker)
    2. Koppla GitHub-repo till Vercel/Netlify
    3. Konfigurera automatiska preview deployments per PR/branch
    4. Testa att varje feature branch får egen isolerad URL
  - **Referens:** Se `docs/analysis/HOW_OTHERS_HANDLE_TEST_ENVIRONMENTS.md`
  - **Tid:** 1-2 timmar
- [x] **SÄTT UPP: Test Supabase-projekt**
  - **Problem:** Vi kan INTE testa faktisk Storage-integration säkert - risk för att korrumpera produktionsdata
  - **Påverkan:** Kan inte testa kärnfunktionalitet (upload, hierarki, generering, visning) säkert
  - **Lösning:** Skapa separat Supabase-projekt för tester (gratis tier räcker)
  - **Steg:**
    1. Skapa nytt Supabase-projekt för tester ✅ `bpmn-planner-test` finns
    2. Kopiera schema från produktion (migrations) ✅ migrations körs mot test
    3. Skapa `.env.test` med test-projekt credentials ✅ finns och används
    4. Konfigurera Vite för att använda `.env.test` i test-mode ✅ `vite --mode test`, `npm test --mode test`
    5. Verifiera isolering från produktion ✅ guardrails i `src/integrations/supabase/client.ts`
  - **Referens:** Se `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md` (Test Environment)
  - **Tid:** 2-3 timmar
- [x] **KONFIGURERA: Environment Variables för Test-Miljö**
  - **Steg:**
    1. Skapa `.env.test` med test-Supabase credentials ✅
    2. Uppdatera `vite.config.ts` för att stödja `test` mode ✅ (loadEnv, `dev:test`)
    3. (Preview config kvar att göra – se föregående punkt)
    4. Verifiera att test-miljö är isolerad från produktion ✅ via guardrails + separat projekt
  - **Tid:** 1 timme
- [x] **DOKUMENTERA: Test-Miljö Workflow**
  - **Steg:**
    1. Dokumentera workflow: Feature branch → Testmiljö (Supabase test) → Tester → Merge ✅
    2. Skapa guide för hur man testar i isolerad miljö ✅ `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`
    3. Dokumentera cleanup-process ✅ `npm run reset:test-db` mm.
  - **Tid:** 1 timme
- [x] **MIGRERA: E2E-tester till Test-Miljö**
  - **Steg:**
    1. Uppdatera Playwright config för att använda test-Supabase ✅ `webServer.command: npm run dev:test`
    2. Verifiera att alla tester fungerar i isolerad miljö ✅ design + guardrails; löpande validering vid körning
    3. Lägg till automatisk cleanup efter tester ✅ reset/seed-skript finns för testmiljön
  - **Tid:** 2-3 timmar
- [ ] **VALIDERA: Hela Flödet i Isolerad Miljö (manuell check kvar)**
  - **Steg:**
    1. Testa filuppladdning i test-miljö
    2. Testa hierarki-byggnad i test-miljö
    3. Testa dokumentationsgenerering i test-miljö
    4. Testa visning av dokumentation i test-miljö
    5. Verifiera att inget läcker till produktion
  - **Tid:** 2-3 timmar
- **Total tid:** 9-13 timmar (1-2 dagar)
- **Kostnad:** Gratis (gratis tiers räcker)
- **Prioritet:** HÖG – Preview deployments + manuell end‑to‑end validering kvar

### 🤖 Automatisk Generering av bpmn-map.json från BPMN-filer
- [ ] **IMPLEMENTERA: BPMN-map pipeline enligt design/plan**
  - **Problem:** Nuvarande auto-generering/heuristik räcker inte för att robust hålla `bpmn-map.json` uppdaterad när BPMN-filer ändras eller tillkommer.
  - **Påverkan:** Manuell, felbenägen uppdatering av `bpmn-map.json` och risk för trasig hierarki/graf vid ändringar.
  - **Lösning:** Genomför faserna i `docs/analysis/BPMN_MAP_GENERATION_IMPLEMENTATION_PLAN.md` baserat på analysen (`docs/analysis/BPMN_MAP_GENERATION_ANALYSIS.md`) och designen (`docs/architecture/BPMN_MAP_GENERATION_DESIGN.md`).
  - **Steg (hög nivå, se plan‑dokumentet för detaljer):**
    1. Fas 1 – Utöka datamodell/JSON‑schema för `bpmn-map.json` (`process_id`, `match_status`, `needs_manual_review`, `source`) med bakåtkompatibilitet.
    2. Fas 2 – Städa heuristiken i `bpmnMapAutoGenerator` (per‑process callActivities, korrekt `process_id`, normaliserade filnamn, tydlig `match_status`).
    3. Fas 3 – Skapa `bpmnMapGenerationOrchestrator` + CLI‑script `scripts/generate-bpmn-map.mjs` med merge‑regler där `source='manual'` alltid vinner.
    4. Fas 4 – Koppla in LLM‑refinement för svåra fall (`lowConfidence/ambiguous/unresolved`) via befintlig LLM‑infrastruktur med strikt JSON‑output och confidence‑baserad beslutslogik.
    5. Fas 5 – Inför säkra persistensregler (preview‑läge, `--force` krävs för overwrite, aldrig tyst skriva över manuella maps).
    6. Fas 6 – Lägg till validering och 1–2 “guldtester” (t.ex. mortgage‑kedjan) som bygger grafen med ny map och verifierar förväntade subprocess‑kopplingar.
    7. Fas 7 – Uppdatera dokumentation/guider (hur man kör scriptet, hur man tolkar `match_status/needs_manual_review` i UI) och uppdatera TODO‑status.
    8. Lägg till minst ett manuellt Claude‑integrationstest för bpmn‑map‑refinement (se Fas 4 i implementeringsplanen) som körs med separat npm‑script och sparar svar i `tests/llm-output/`.
    9. Använd mortgage‑snapshot‑mapparna som primära fixtures när du skriver tester för heuristik/graf/validering:
       - `tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11`
       - `tests/fixtures/bpmn/mortgage-se 2026.01.04 16:30`
    10. Gör hela arbetet på en separat feature‑branch (t.ex. `feature/bpmn-map-generation`); när faserna du genomfört är klara och testerna går igenom, merg:a branchen till `main` och push:a till GitHub så att ändringar och dokumentation synkas.
  - **Referens:** `docs/analysis/BPMN_MAP_GENERATION_ANALYSIS.md`, `docs/architecture/BPMN_MAP_GENERATION_DESIGN.md`, `docs/analysis/BPMN_MAP_GENERATION_IMPLEMENTATION_PLAN.md`
  - **Tid:** Ca 3–5 dagar (kan tas fas för fas; minsta värdefulla subset är faserna 1–3/5 utan LLM)
  - **Prioritet:** HÖG – Kritisk för robust hierarki och framtida automation

### 🔧 Files-sidan: Grundfunktionalitet fungerar inte korrekt
- [ ] **ANALYSERA: Vad fungerar och inte fungerar på Files-sidan**
  - **Problem:** Grundfunktionaliteten på Files-sidan verkar inte fungera korrekt, och vi vet inte längre vad som faktiskt fungerar och inte
  - **Påverkan:** Kärnfunktionalitet i appen är instabil, svårt att veta vad som är trasigt vs fungerande
  - **Lösning:** Systematisk analys och validering av alla funktioner på Files-sidan
  - **Steg:**
    1. **Inventera alla funktioner på Files-sidan:**
       - Filuppladdning (single/multiple)
       - Filvisning (lista, hierarki, artefakter)
       - Filversionering (diff, historik)
       - Filgenerering (dokumentation, tester)
       - Filhantering (radera, uppdatera)
       - MapSuggestionsDialog (bpmn-map.json uppdateringar)
    2. **Testa varje funktion systematiskt:**
       - Skapa test-checklista för varje funktion
       - Testa i isolerad testmiljö (kräver punkt 1 i listan)
       - Dokumentera vad som fungerar vs inte fungerar
    3. **Identifiera rotorsaker:**
       - Är det relaterat till bpmn-map.json problem? (kräver punkt 2 i listan)
       - Är det Storage-integration problem?
       - Är det UI/UX problem?
       - Är det data-hantering problem?
    4. **Prioritera fixar:**
       - Kritiska buggar (hindrar användning)
       - Viktiga buggar (försämrar användarupplevelse)
       - Mindre buggar (kosmetiska)
  - **Beroenden:**
    - Kräver punkt 1 (Testmiljö) för att kunna testa säkert
    - Kräver punkt 2 (bpmn-map.json generering) för att lösa relaterade problem
  - **Tid:** 2-3 dagar (analys) + varierande (fixar)
  - **Prioritet:** HÖG - Kärnfunktionalitet måste fungera
- [ ] **FIXA: Kritiska buggar på Files-sidan**
  - **Efter analys:**
    1. Fixa kritiska buggar som hindrar användning
    2. Fixa viktiga buggar som försämrar användarupplevelse
    3. Verifiera fixar i testmiljö
  - **Tid:** Varierande (beroende på vad som hittas)
  - **Prioritet:** HÖG - Måste fixas efter analys
- [ ] **DOKUMENTERA: Status för Files-sidan funktionalitet**
  - **Steg:**
    1. Skapa dokumentation över vad som fungerar
    2. Skapa dokumentation över kända problem
    3. Skapa test-checklista för framtida validering
  - **Tid:** 1 timme
  - **Prioritet:** MEDIUM - För att hålla koll på status

---
## 🔴 Hög prioritet (Efter de 3 kritiska punkterna)

### Testinformation generering
- [ ] **FIXA:** Scenarios från dokumentationen sparas inte till `node_planned_scenarios`
  - **Problem:** `buildScenariosFromEpicUserStories()` och `buildScenariosFromDocJson()` finns men anropas aldrig
  - **Påverkan:** Epic user stories genereras i dokumentationen, men scenarios extraheras inte och sparas inte
  - **Lösning:** Anropa `buildScenariosFromDocJson()` när Epic-dokumentation genereras och spara till `node_planned_scenarios` med `origin: 'llm-doc'`
  - **Plats:** `src/lib/bpmnGenerators.ts` (rad 2286-2323, callback i `renderDocWithLlm` för epics)
  - **Beroende:** Kräver punkt 1 (Testmiljö) för att kunna testa säkert
  - **Prioritet:** HÖG - Viktig funktionalitet
- [ ] **FIXA:** `createPlannedScenariosFromGraph()` returnerar tom array (KRITISK BUGG)
  - **Problem:** Funktionen skapar `scenarios` array (rad 129-144) men pushar dem ALDRIG till `rows` array
  - **Påverkan:** Inga fallback-scenarios sparas från `testMapping`, `savePlannedScenarios()` får tom array
  - **Lösning:** Lägg till `rows.push()` efter rad 144 med korrekt `PlannedScenarioRow` struktur (bpmn_file, bpmn_element_id, provider, origin, scenarios)
  - **Plats:** `src/lib/plannedScenariosHelper.ts` (rad 144-148, `createPlannedScenariosFromGraph()`)
  - **Beroende:** Kräver punkt 1 (Testmiljö) för att kunna testa säkert
  - **Prioritet:** HÖG - Kritisk bugg
- [ ] **FIXA:** Två separata system som inte samverkar
  - **Problem:** Testfiler (Storage) och planned scenarios (Database) är separata system
  - **Påverkan:** LLM-genererade scenarios i testfiler sparas inte i `node_planned_scenarios`
  - **Lösning:** Koppla testgenerering till dokumentationen - använd scenarios från `node_planned_scenarios` eller spara LLM-scenarios dit
  - **Plats:** `src/lib/testGenerators.ts` och `src/lib/bpmnGenerators.ts`
  - **Beroende:** Kräver punkt 1 (Testmiljö) för att kunna testa säkert
  - **Prioritet:** MEDIUM - Förbättring

### Timeline / Planning View
- [ ] Spara redigerade datum till backend/database
- [ ] Automatisk staggering av datum baserat på orderIndex
- [ ] Visa dependencies mellan subprocesser i Gantt
- [ ] Export av timeline till Excel/PDF

### Mortgage-hierarki förbättringar
- [ ] Finslipa subprocesskedjan `Object → Object information` så att callActivity `object-information` alltid matchar `mortgage-se-object-information.bpmn` med tydlig diagnostik när det inte går
- [ ] Låta Node Matrix visa noder från alla relevanta BPMN-filer i mortgage-kedjan (inte bara rootfilen), t.ex. `mortgage-se-application` och `mortgage-se-internal-data-gathering`
- [ ] Utforska att flytta tunga hierarki/graf-beräkningar till en Supabase-funktion (server-side) för att minska CPU/minne i browsern vid "Generera allt"
- [ ] Förenkla "Generera allt" ytterligare genom att återanvända en gemensam processgraf per root i stället för att bygga nya grafer per subprocess-fil

---

## ⚡ Prestanda & Optimering

### Parallellisering av LLM-generering
- [ ] Lägg till en enkel concurrency-pool i `generateAllFromBpmnWithGraph` så att flera noder kan genereras parallellt (t.ex. 3–5 samtidiga anrop per provider)
- [ ] Var försiktig med ordning/loggning/aggregation av HTML så resultatet blir deterministiskt

### Caching av LLM-resultat
- [ ] Spara LLM-output i Supabase per `(bpmnFile, nodeId, provider, promptVersion)` så att noder inte behöver köras om om inget ändrats
- [ ] Använd cache både i UI ("regenerera bara ändrade noder") och i batch-körningar

### Selektiv körning
- [ ] Kör LLM-generering endast för noder/filer som ändrats sedan senaste körning
- [ ] Implementera change detection baserat på `bpmn_files.updated_at` och jobbhistorik

---

## 🚀 Batch-generering & API

### Batch-API för massgenerering
- [ ] Flytta stora genereringsjobb (docs/tests/testscript) från synkrona per-nod-anrop till OpenAI Batch-API
- [ ] Designa om filvyn så att den jobbar mot batch-jobb (status, kö, progress) i stället för att trigga enstaka ChatGPT-anrop direkt från UI
- [ ] Lägg till serverflöde (Supabase function/cron) som bygger batchar, skickar till Batch-API och skriver tillbaka resultat till DB
- [ ] Koppla mot t.ex. `bpmn_files.updated_at` och jobbhistorik för att avgöra vad som behöver regenereras

---

## 🔧 LLM-förbättringar

### Claude-testgenomgång (riktiga API-anrop)
- [x] **Gå igenom tester som använder verkliga Claude-anrop**
  - **Syfte:** Minimera onödig Claude‑användning i tester (kostnad/tid), och säkerställa att endast ett litet antal manuella/verifierande tester använder riktiga API‑anrop.
  - **Varning:** Kör **inte** dessa tester utan att först uttryckligen ta ställning till att använda Claude (kostnad, rate limits, API‑nycklar). Innan de körs i framtiden ska vi ha sett över dem så att de:
    - körs endast manuellt (inte i standard‑CI), och
    - har tydliga env‑flaggor/`describe.skipIf`‑skydd.  
    **Status:** Implementerat. För att köra de här testerna krävs nu explicita env‑flaggor (`CLAUDE_E2E_ENABLE` för Playwright, `CLAUDE_INTEGRATION_ENABLE` för integrationstester).
  - **Tester att gå igenom (använder/kan använda verklig Claude):**
    - Playwright E2E:
      - `tests/playwright-e2e/test-info-generation.spec.ts`
      - `tests/playwright-e2e/claude-generation.spec.ts`
    - Vitest integration:
      - `tests/integration/claude-application.test.ts`
      - `tests/integration/claude-object-information.test.ts`
      - `tests/integration/claude-application-object-info.test.ts`
      - `tests/integration/hierarchy-llm-generation.test.ts`
  - **Steg:**
    1. Bekräfta vilka av dessa som verkligen behöver riktiga Claude‑anrop (t.ex. manuella smoke‑tester) och vilka som kan använda mocks utan att tappa värde.
    2. Märk tydligt vilka som är “manually run only” (t.ex. via `describe.skipIf`/env‑flaggor) och exkludera dem från normal CI‑körning.
    3. Där det är möjligt: byt till befintliga Claude‑mocks eller strukturera testen så att LLM‑delen kan mockas separat från resten av flödet.
  - **Prioritet:** MEDIUM – bra för kostnad/stabilitet, men inte blockerande

### Lokal LLM-profil / modellbyte
- [ ] Utvärdera alternativ lokal modell (t.ex. `mistral:latest`) som kanske är snabbare/stabilare än `llama3:latest` på svagare hårdvara
- [ ] Håll ChatGPT-kontrakten oförändrade; behandla lokal modell som best-effort fallback

### Bättre LLM-progress & statistik
- [ ] Utöka `LlmDebugView`/LLM-events med tydligare progress för batch-körningar:
  - totalt antal noder
  - hur många som är klara per provider/docType
  - uppskattad kvarvarande tid vid större körningar (300+ noder)

### Separata testscript per LLM-provider
- [ ] I dag finns en gemensam LLM-testfil per nod (`tests/slow/...`) oavsett om ChatGPT eller Ollama användes
- [ ] Utred att införa separata paths per provider, t.ex. `tests/slow/chatgpt/...` och `tests/slow/ollama/...`
- [ ] Uppdatera `buildTestStoragePaths` och `node_test_links` så att provider ingår i testfilens path
- [ ] Utöka `NodeTestScriptViewer`/`TestScriptsPage` så användaren kan se och jämföra ChatGPT- respektive Ollama-testscript sida vid sida

---

## 🐛 Bugfixar & Förbättringar

### Kända problem
- [ ] Fixa eventuella PGRST204-fel (schema-cache mismatch) genom bättre cache-hantering
- [ ] Förbättra felhantering vid saknade BPMN-filer i subprocess-kedjor
- [ ] Förbättra diagnostik för LOW_CONFIDENCE matchningar i subprocess-synkning

### UI/UX-förbättringar
- [x] Test Coverage-sida med tre vyer (kondenserad, hierarkisk, fullständig)
- [x] HTML-export med interaktiv filtrering och vy-växling
- [x] Excel-export för test coverage-data
- [x] E2E Quality Validation-sida med kopiera-knappar och exempel-kod
- [x] Färgkodning av user tasks (kund vs handläggare) i Process Explorer
- [x] Färgkodning av user tasks i Test Coverage-sidan
- [ ] Förbättra loading states i Process Explorer
- [ ] Lägg till keyboard shortcuts för vanliga åtgärder
- [ ] Förbättra responsivitet på mobil enheter
- [ ] Lägg till dark mode toggle (om inte redan implementerat)
- [ ] Lägg till sökfunktion i Test Coverage-tabellen
- [ ] Lägg till filter för att dölja kolumner utan test-info

---

## 📊 Analytics & Monitoring

### Cost Tracking
- [ ] Implementera detaljerad kostnadstracking för LLM-anrop (tokens, kostnad per provider)
- [ ] Skapa dashboard för LLM-usage analytics
- [ ] Lägg till budget alerts och limits

### Quality Metrics
- [ ] Implementera quality metrics dashboard (dokumentationstäckning, testtäckning, etc.)
- [ ] Skapa heatmap över processhierarkin som visar kvalitet per område
- [ ] Lägg till trendgrafer över tid

---

## 🔍 Sök & Discovery

- [ ] Implementera global sökning över noder, dokumentation och tester
- [ ] Lägg till filter och facetter för sökning
- [ ] Implementera fuzzy search med typo-tolerans
- [ ] Lägg till sökhistorik och favoriter

---

## 🔄 Versionering & Change Tracking

- [x] Utöka `bpmn_files` tabell med versioning (✅ Implementerad)
- [x] Skapa diff-vy för BPMN XML (✅ `BpmnDiffOverviewPage.tsx` finns)
- [x] Diff-funktionalitet för selektiv regenerering (✅ Implementerad: process nodes, cascade-detection, cleanup)
- [ ] Skapa diff-vy för genererad dokumentation (jämför HTML-innehåll)
- [ ] Implementera "What changed since last generation?"-vy
- [ ] Lägg till changelog per fil/nod

---

## 🤝 Collaboration

- [ ] Implementera kommentarer på noder och dokumentation
- [ ] Lägg till review workflow för ändringar
- [ ] Implementera @mentions och notifikationer
- [ ] Lägg till activity feed (vem gjorde vad, när)
- [ ] Implementera assignments (tilldela noder till personer)

---

## 📤 Export/Import

- [x] Implementera export till Excel (test coverage)
- [x] Implementera export till HTML (test coverage med interaktiv filtrering)
- [ ] Implementera export till PDF (dokumentation)
- [ ] Implementera export till JSON/XML (process data)
- [ ] Implementera export till Confluence/Notion markdown
- [ ] Skapa REST API för externa verktyg
- [ ] Implementera webhooks för events (generation complete, etc.)

---

## 🧪 Testing

- [ ] Öka testtäckning för edge cases i BPMN-parsing
- [ ] Lägg till integrationstester för batch-generering
- [x] Förbättra test-isolering för LLM-tester ✅ Delvis täckt av punkt 1 (Testmiljö) - komplettera med specifika LLM-test isolering
- [x] Lägg till E2E-tester för kritiska användarflöden ✅ Delvis täckt av punkt 1 (Testmiljö) - komplettera med specifika E2E-tester

---

## 📚 Dokumentation

- [x] Uppdatera API-dokumentation (API_REFERENCE.md skapad)
- [x] Skapa användarguide för test-coverage-sidan (TEST_COVERAGE_USER_GUIDE.md skapad)
- [x] Skapa E2E maintenance guide (E2E_MAINTENANCE_GUIDE.md)
- [x] Skapa BPMN update validation guide (BPMN_UPDATE_VALIDATION.md)
- [ ] Skapa video-guider för vanliga uppgifter
- [ ] Förbättra inline-dokumentation i koden
- [ ] Skapa troubleshooting-guide för vanliga problem

---

## 🗑️ Technical Debt

- [ ] Refaktorera stora filer (t.ex. `bpmnGenerators.ts`)
- [ ] Förbättra type safety i legacy-kod
- [ ] Standardisera error handling patterns
- [ ] Förbättra logging och monitoring

---

## 💡 Framtida Visioner (Låg prioritet)

Se [Feature Roadmap](docs/FEATURE_ROADMAP.md) för detaljerade beskrivningar av:
- AI-Powered Suggestions
- Real-Time Collaboration
- Advanced Access Control
- Mobile App
- Process Simulation

---

## 📝 Noteringar

- **Prioritering:** Uppgifter är ordnade efter prioritet inom varje sektion
- **Status:** Använd checkboxar `[ ]` för att markera progress
- **Länkar:** Se Feature Roadmap för strategiska funktioner
- **Uppdateringar:** Uppdatera denna fil när uppgifter påbörjas eller slutförs

---

**Senast uppdaterad:** 2026-01-04

## ✅ Nyligen slutförda uppgifter

### Progress-räkning för dokumentationsgenerering
- [x] **FIXA:** Process nodes (subprocess Feature Goals) räknas inte i progress-räkningen ✅ FIXAD
  - **Problem:** Appen visar 102 noder istället för 126 (20 process nodes saknas i räkningen)
  - **Orsak:** `getTestableNodes()` inkluderar inte `type === 'process'` noder, och process nodes genereras separat utanför `nodesToGenerate`-loopen
  - **Påverkan:** Alla 126 noder genereras korrekt, men progress-visningen är felaktig
  - **Lösning:** Inkludera process nodes i progress-räkningen (antingen i `nodesToGenerate` eller räkna dem separat och lägg till i totalen)
  - **Plats:** `src/lib/bpmnGenerators.ts` (rad ~1671, `nodesToGenerate.length` används för progress)
  - **Status:** Fixad - process nodes inkluderas nu i `totalNodesToGenerate` och popupen visar "filer" istället för "noder"
  - **Datum:** 2025-12-22

### E2E Test Coverage System
- [x] Test Coverage Explorer-sida med tre vyer (kondenserad, hierarkisk, fullständig)
- [x] HTML-export med alla tre vyerna och interaktiv filtrering
- [x] Excel-export för test coverage-data
- [x] E2E Quality Validation-sida med automatisk validering
- [x] Kopiera-knappar och exempel-kod för valideringsförslag
- [x] Färgkodning av user tasks (kund vs handläggare)
- [x] Gruppering av aktiviteter per subprocess
- [x] BPMN version comparison script (`compare-bpmn-versions.ts`)
- [x] Dokumentation: API Reference, User Guide, Maintenance Guide
