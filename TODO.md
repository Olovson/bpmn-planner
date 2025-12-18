# 📋 TODO - BPMN Planner

Detta dokument innehåller en prioriterad lista över uppgifter och förbättringar för BPMN Planner.

> **Se även:** [Feature Roadmap](docs/FEATURE_ROADMAP.md) för strategiska funktioner och långsiktiga visioner.

---

## 🔥 Högsta prioritet

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

- [ ] Utöka `bpmn_files` tabell med versioning
- [ ] Skapa diff-vy för BPMN XML (visuell jämförelse)
- [ ] Skapa diff-vy för genererad dokumentation
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
- [ ] Förbättra test-isolering för LLM-tester
- [ ] Lägg till E2E-tester för kritiska användarflöden

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

**Senast uppdaterad:** 2025-01-27

## ✅ Nyligen slutförda uppgifter

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

