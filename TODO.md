# 📋 TODO - BPMN Planner

Detta dokument innehåller en prioriterad lista över uppgifter och förbättringar för BPMN Planner.

> **Se även:** [Feature Roadmap](docs/FEATURE_ROADMAP.md) för strategiska funktioner och långsiktiga visioner.

---

## 🎯 Snabböversikt: De 3 Kritiska Punkterna

**Fokus just nu:** Dessa tre punkter måste lösas för att appen ska vara stabil och utvecklingsbar:

1. **🚨 Testmiljö** (KRITISK - 1-2 dagar)
   - Preview deployments (Vercel/Netlify)
   - Test Supabase-projekt
   - Möjlighet att testa kodändringar säkert innan merge
   - **Varför:** Förhindrar att vi förstör fungerande funktionalitet

2. **🤖 bpmn-map.json generering** (HÖG - 1-2 dagar)
   - Claude-baserad automatisk generering
   - Eller förbättrad heuristik-baserad mappning
   - **Varför:** Eliminerar manuell process och risk för fel

3. **🔧 Files-sidan analys/fixar** (HÖG - 2-3 dagar analys + fixar)
   - Systematisk analys av vad som fungerar/inte fungerar
   - Fixa kritiska buggar
   - **Varför:** Kärnfunktionalitet måste fungera korrekt
   - **Beroende:** Kräver punkt 1 och 2 för att kunna testa och fixa säkert

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
- [ ] **SÄTT UPP: Test Supabase-projekt**
  - **Problem:** Vi kan INTE testa faktisk Storage-integration säkert - risk för att korrumpera produktionsdata
  - **Påverkan:** Kan inte testa kärnfunktionalitet (upload, hierarki, generering, visning) säkert
  - **Lösning:** Skapa separat Supabase-projekt för tester (gratis tier räcker)
  - **Steg:**
    1. Skapa nytt Supabase-projekt för tester
    2. Kopiera schema från produktion (migrations)
    3. Skapa `.env.test` med test-projekt credentials
    4. Konfigurera Vite för att använda `.env.test` i test-mode
    5. Verifiera isolering från produktion
  - **Referens:** Se `docs/analysis/CRITICAL_TESTING_GAP_ANALYSIS.md`
  - **Tid:** 2-3 timmar
- [ ] **KONFIGURERA: Environment Variables för Test-Miljö**
  - **Steg:**
    1. Skapa `.env.test` med test-Supabase credentials
    2. Uppdatera `vite.config.ts` för att stödja `test` mode
    3. Konfigurera Vercel/Netlify att använda `.env.test` för preview deployments
    4. Verifiera att test-miljö är isolerad från produktion
  - **Tid:** 1 timme
- [ ] **DOKUMENTERA: Test-Miljö Workflow**
  - **Steg:**
    1. Dokumentera workflow: Feature branch → Preview deployment → Test → Merge
    2. Skapa guide för hur man testar i isolerad miljö
    3. Dokumentera cleanup-process
  - **Tid:** 1 timme
- [ ] **MIGRERA: E2E-tester till Test-Miljö**
  - **Steg:**
    1. Uppdatera Playwright config för att använda test-Supabase
    2. Verifiera att alla tester fungerar i isolerad miljö
    3. Lägg till automatisk cleanup efter tester
  - **Tid:** 2-3 timmar
- [ ] **VALIDERA: Hela Flödet i Isolerad Miljö**
  - **Steg:**
    1. Testa filuppladdning i test-miljö
    2. Testa hierarki-byggnad i test-miljö
    3. Testa dokumentationsgenerering i test-miljö
    4. Testa visning av dokumentation i test-miljö
    5. Verifiera att inget läcker till produktion
  - **Tid:** 2-3 timmar
- **Total tid:** 9-13 timmar (1-2 dagar)
- **Kostnad:** Gratis (gratis tiers räcker)
- **Prioritet:** KRITISK - Måste göras innan större kodändringar

### 🤖 Automatisk Generering av bpmn-map.json från BPMN-filer
- [ ] **FORSKA: Claude-baserad bpmn-map.json generering**
  - **Problem:** Vi kan INTE via kod/regex automatiskt deducera korrekt `bpmn-map.json` från nya BPMN-filer som laddas upp
  - **Påverkan:** Manuell process att uppdatera `bpmn-map.json` när nya filer laddas upp, risk för fel och inkonsistens
  - **Lösning:** Utforska att använda Claude för att analysera BPMN-filer och generera/uppdatera `bpmn-map.json` automatiskt
  - **Steg:**
    1. Analysera nuvarande problem med automatisk mappning (regex/heuristik)
    2. Designa Claude-prompt för att analysera BPMN-filer och extrahera call activities
    3. Designa JSON-schema för Claude-output (strukturerad output)
    4. Implementera Claude-integration för bpmn-map.json generering
    5. Validera att genererad bpmn-map.json är korrekt
    6. Integrera med upload-process (automatisk generering vid uppladdning)
  - **Referens:** Se tidigare analys om Claude för bpmn-map generering
  - **Tid:** 1-2 dagar
  - **Prioritet:** HÖG - Förbättrar användarupplevelse och minskar risk för fel
- [ ] **ALTERNATIV: Förbättra nuvarande heuristik-baserad mappning**
  - **Om Claude-lösning inte fungerar:**
    1. Analysera varför nuvarande heuristik misslyckas
    2. Förbättra fuzzy matching algoritmer
    3. Förbättra confidence scoring
    4. Lägg till fler heuristik-regler
  - **Tid:** 2-3 dagar
  - **Prioritet:** MEDIUM - Fallback om Claude-lösning inte fungerar

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

**Senast uppdaterad:** 2025-12-27

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

