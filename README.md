# 🚀 BPMN Planner

**BPMN Planner** tar BPMN-/DMN-filer, bygger en deterministisk processhierarki, visualiserar processen (diagram, strukturträd, listvy) och genererar dokumentation, testunderlag och metadata för produkt- och utvecklingsteamet. Supabase används som backend och innehåll kan genereras både via mallar (utan LLM) och via LLM (ChatGPT/Ollama).

> Arkitektur & hierarki: `docs/bpmn-hierarchy-architecture.md`  
> LLM-kontrakt & prompts: `prompts/llm/*`

---

# 🧠 Översikt: hierarki, dokumentation & LLM

- **BPMN-hierarki**
  - XML → `BpmnParser` → `BpmnMeta`
  - `ProcessDefinition` + `SubprocessLink` → `buildProcessHierarchy`
  - `buildBpmnProcessGraph` → `BpmnProcessGraph` (root, children, missingDependencies)
  - denna graf används av UI, dokumentationsgeneratorn och testgeneratorn.

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
  - Node tests i UI (kopplade till `node_test_links`).
- Övrig metadata:
  - Jira-typer/namn per nod.
  - Subprocess-mappningar (`bpmn_dependencies`) + diagnostik (`missingDependencies`).

Alla artefakter lagras i Supabase (tabeller + storage) och kan regenereras från UI.

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
npm run supabase:reset  # Stoppar, resetar DB och startar om (rekommenderat)
# eller
npm run supabase:ensure-schema  # Säkerställer schema-sync vid start
```

Detta säkerställer att PostgREST läser om schemat och uppdaterar sin cache.

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

## 2.5. Snabbstart – Starta hela utvecklingsmiljön

**Enklaste sättet att starta allt:**

```bash
npm run start:dev
```

Detta script startar automatiskt:
- ✅ Supabase (om den inte redan körs)
- ✅ Edge functions (`llm-health` och `build-process-tree`) i bakgrunden
- ✅ Dev-server (`npm run dev`) i bakgrunden
- ✅ Verifierar schema

**Viktigt om processer:**
- Processerna körs i bakgrunden, så du kan stänga terminalen eller Cursor och de fortsätter köra.
- Supabase körs i Docker, så den fortsätter köra även om du stänger Cursor (så länge Docker Desktop är igång).
- Edge functions och dev-server måste startas om nästa gång du öppnar Cursor (använd `npm run start:dev` igen).
- För att stoppa allt: `npm run stop:dev`

**För att stoppa allt:**

```bash
npm run stop:dev
```

Detta stoppar Supabase, edge functions och dev-server.

---

**Manuell start (om du föredrar separata terminaler):**

När du ska jobba med LLM (ChatGPT/Ollama), kan du också starta allt manuellt:

1. Gå till projektet
```bash
cd /Users/magnusolovson/Documents/Projects/bpmn-planner
```

2. Starta Supabase (lokalt projekt)
```bash
npm run start:supabase   # guidat start/reset-flöde för Supabase
```

3. Starta edge functions i separata terminaler:

```bash
# Terminal 1 – LLM health (Ollama/ChatGPT-status)
supabase functions serve llm-health --no-verify-jwt --env-file supabase/.env

# Terminal 2 – build-process-tree (för processgrafen)
supabase functions serve build-process-tree --no-verify-jwt --env-file supabase/.env
```

4. Starta dev‑server (Terminal 3)
```bash
npm run dev   # http://localhost:8080/
```

5. Snabbkolla att Ollama svarar (valfritt men bra vid strul)
```bash
curl -s http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3:latest","prompt":"ping","stream":false,"options":{"num_predict":5}}'
```

6. Lokal LLM health‑test via Supabase‑funktion
```bash
LLM_HEALTH_TEST=true npx vitest run tests/integration/llm.health.local.test.ts
```

> Om du ändrar `.env.local` eller `supabase/.env` behöver du:
> - starta om Supabase (`npm run start:supabase`), och
> - om du kör `supabase functions serve llm-health ...` i en separat terminal: stoppa med Ctrl+C och starta om kommandot.

## 3. Edge Functions (valfritt men rekommenderat vid LLM-utveckling)

För att vissa delar av appen ska fungera fullt ut lokalt (t.ex. LLM‑health och process‑trädet) behöver du starta relevanta edge functions. Detta görs automatiskt med `npm run start:dev`, men du kan också starta dem manuellt i egna terminalfönster:

```bash
# Terminal 1 – LLM health (Ollama/ChatGPT-status)
supabase functions serve llm-health --no-verify-jwt --env-file supabase/.env

# Terminal 2 – build-process-tree (för processgrafen)
supabase functions serve build-process-tree --no-verify-jwt --env-file supabase/.env
```

Så länge dessa edge functions är igång får du:
- korrekt LLM‑status på sidan `#/files` (ChatGPT/Ollama tillgänglig/ej tillgänglig),
- fungerande process‑träd/byggfunktioner i UI.

## 4. Dev-server
```bash
npm run dev   # http://localhost:8080/
```

## 5. Inloggning
`seed-bot@local.test / Passw0rd!`

## 6. Validering & tester

**Testmiljö:**
- **Vitest** för unit- och integrationstester.
- Standard environment är `node`. jsdom används selektivt i de testfiler som behöver DOM (t.ex. parser-tester).

## 🔍 Snabb fusklapp – testkommandon

Kör alltid dessa från projektroten: `cd /Users/magnusolovson/Documents/Projects/bpmn-planner`

- **Alla tester (snabb sanity‑check):**
  - `npm test`
  - `npm run test:watch` – interaktivt läge under utveckling

- **Generatorns enhetstest (generateAllFromBpmnWithGraph):**
  - `npm run check:generator`
  - (direkt via Vitest om du vill):  
    `npx vitest run tests/unit/generateAllFromBpmnWithGraph.test.ts`

- **LLM smoke – ChatGPT (cloud, “gold standard”):**
  - `npm run test:llm:smoke` – kort smoke mot ChatGPT
  - `npm run test:llm:smoke:cloud` – strict‑läge med `LLM_SMOKE_STRICT=true`

- **LLM smoke – Ollama (lokal, best‑effort):**
  - `npm run test:llm:smoke:local`
  - Används för att se hur den lokala modellen beter sig; får gärna vara röd utan att blockera ChatGPT‑flödet.

- **Lokal LLM health‑test (via Supabase‑funktion):**
  - `LLM_HEALTH_TEST=true npx vitest run tests/integration/llm.health.local.test.ts`

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
4. Visa resultat i **Viewer / Tree / List**.  
5. Justera metadata i **Node Matrix**.  
6. Öppna resultat i **Doc Viewer** eller **Node Tests**.  
7. **Återgenerera vid behov**.  
8. **Reset Registry** – rensa allt.

---

# ✨ Funktioner i korthet

- Deterministisk BPMN-hierarki  
- Subprocess-matchning med confidence score  
- Dokumentgenerering i två lägen (Local / Slow LLM)  
- Playwright-skapande automatiskt  
- Node Dashboard  
- SOT i Supabase Storage  
- Job queue för historik  
- Full diagnostik vid mismatch eller otydliga subprocesser  
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
      - `missingDependencies` för saknade mortgage‑subprocesser (Stakeholder/Object/Household).
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

# 🧭 TODO / Idébank (framtida förbättringar)

En kort lista över förbättringsidéer som vi kan plocka upp senare:

- **Parallellisering av LLM‑generering**
  - Lägg till en enkel concurrency‑pool i `generateAllFromBpmnWithGraph` så att flera noder kan genereras parallellt (t.ex. 3–5 samtidiga anrop per provider).
  - Var försiktig med ordning/loggning/aggregation av HTML så resultatet blir deterministiskt.

- **Caching av LLM‑resultat**
  - Spara LLM‑output i Supabase per `(bpmnFile, nodeId, provider, promptVersion)` så att noder inte behöver köras om om inget ändrats.
  - Använd cache både i UI (“regenerera bara ändrade noder”) och i batch‑körningar.

- **Selektiv körning**
  - Kör LLM‑generering endast för noder/filer som ändrats sedan senaste körning.
  - Koppla mot t.ex. `bpmn_files.updated_at` och jobbhistorik för att avgöra vad som behöver regenereras.

- **Lokal LLM‑profil / modellbyte**
  - Utvärdera alternativ lokal modell (t.ex. `mistral:latest`) som kanske är snabbare/stabilare än `llama3:latest` på svagare hårdvara.
  - Håll ChatGPT‑kontrakten oförändrade; behandla lokal modell som best‑effort fallback.

- **Bättre LLM‑progress & statistik**
  - Utöka `LlmDebugView`/LLM‑events med tydligare progress för batch‑körningar:
    - totalt antal noder,
    - hur många som är klara per provider/docType,
    - uppskattad kvarvarande tid vid större körningar (300+ noder).

- **Separata testscript per LLM‑provider**
  - I dag finns en gemensam LLM‑testfil per nod (`tests/slow/...`) oavsett om ChatGPT eller Ollama användes.
  - Utred att införa separata paths per provider, t.ex. `tests/slow/chatgpt/...` och `tests/slow/ollama/...`, samt:
    - uppdatera `buildTestStoragePaths` och `node_test_links` så att provider ingår i testfilens path,
    - utöka `NodeTestScriptViewer`/`TestScriptsPage` så användaren kan se och jämföra ChatGPT‑ respektive Ollama‑testscript sida vid sida.

# 📍 Lokal URL
`http://localhost:8080/`

# 📦 Bygga för produktion

```bash
npm run build        # Produktionsbygg
npm run build:dev    # Utvecklingsbygg (med source maps)
```

Bygget lägger statiska filer under `dist/` som kan deployas bakom valfri reverse proxy.  
Se till att Supabase-URL/nycklar och edge-funktioner är korrekt konfigurerade i den miljö du deployar till.

---

# 🔄 Synka till GitHub

För att synka dina lokala ändringar till GitHub på ett säkert sätt:

```bash
npm run sync:github
```

Detta script:
- ✅ Verifierar att du är på `main` branch
- ✅ Kontrollerar divergence mot remote (stoppar om remote ligger före)
- ✅ Committar alla lokala ändringar
- ✅ Pushar till GitHub

**Säkerhet:**
- Scriptet skriver **aldrig över** lokala ändringar
- Om remote ligger före stoppar scriptet och rapporterar
- Lokal kod är alltid source of truth

**Manuell synkning:**
Om du föredrar att göra det manuellt:
```bash
git status
git add .
git commit -m "chore: sync local changes to origin"
git push origin main
```
