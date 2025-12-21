# Snabbstart och Utveckling

**Syfte:** Detaljerad guide för att komma igång med BPMN Planner lokalt

> 📋 **För snabb översikt, se huvud-README.md**

---

## ⚙️ Snabbstart (lokal utveckling)

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
VITE_ANTHROPIC_API_KEY=<Claude API key>
VITE_LLM_LOCAL_BASE_URL=http://localhost:11434
VITE_LLM_LOCAL_MODEL=llama3:latest
```

> **Obs:** när `VITE_USE_LLM=true` och `VITE_ANTHROPIC_API_KEY` är satt används LLM-kontrakten för Claude/Ollama. Om LLM är avstängd används alltid lokal modellbaserad dokumentation.

## 2.5. Fusklapp – LLM‑utveckling (starta allt)

När du ska jobba med LLM (Claude/Ollama), använd alltid samma grundsekvens:

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
# Terminal 1 – LLM health (Ollama/Claude-status)
supabase functions serve llm-health --no-verify-jwt --env-file supabase/.env

# Terminal 2 – build-process-tree (för processgrafen)
supabase functions serve build-process-tree --no-verify-jwt --env-file supabase/.env
```

Kör därefter dev-servern i en tredje terminal:

```bash
npm run dev
```

Så länge dessa tre terminaler är igång får du:
- korrekt LLM‑status på sidan `#/files` (Claude/Ollama tillgänglig/ej tillgänglig),
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

---

## Scripts & Verktyg

**BPMN Tree Export:**
```bash
npm run print:bpmn-tree  # Genererar både bpmn-tree-output.md och bpmn-tree-output.xlsx
```

Detta script:
- Parsar alla BPMN-filer från fixtures (`tests/fixtures/bpmn/analytics/`)
- Bygger ProcessGraph och ProcessTree baserat på `bpmn-map.json`
- Genererar **två filer** i projektets root:

**1. Markdown-fil (`bpmn-tree-output.md`):**
  - Hierarkisk trädvy (alla noder sorterade enligt orderIndex → visualOrderIndex → branchId → label)
  - Flat lista (markdown-tabell med alla noder och metadata)
  - Metadata (antal noder, edges, root process, etc.)
  - Legend (ikoner och nodtyper)
  - Ordering information (förklaring av sorteringslogik)

**2. Excel-fil (`bpmn-tree-output.xlsx`):**
  - **Sheet 1: Tree Hierarchy** - Hierarkisk vy med separata kolumner för varje nivå (Level 1, Level 2, etc.)
    - Visar hela trädet med tydlig hierarki
    - Inkluderar alla metadata (Type, Label, Element ID, BPMN File, Order Index, Visual Order Index, Branch ID, Path)
  - **Sheet 2: Flat List** - Flat lista med alla noder i sorterad ordning
  - **Sheet 3: Summary** - Metadata, legend och ordering information

**Användning:**
- **Markdown**: Kopiera till Claude eller andra verktyg, använd för dokumentation, versionkontrollera i Git
- **Excel**: Öppna i Excel/LibreOffice/Google Sheets för enkel läsning, filtrering och sortering
  - Perfekt för att analysera hierarkin visuellt
  - Kan exporteras till andra format (CSV, PDF, etc.)
  - Enkelt att dela med teamet

**Feature Goal Export/Import (för AI-förbättring):**
```bash
npm run export:feature-goals    # Exporterar alla Feature Goal HTML-filer till exports/feature-goals/
npm run import:feature-goals    # Importerar förbättrade HTML-filer tillbaka till Supabase Storage
```
- Se `templates/CODEX_BATCH_AUTO.md` för komplett workflow: Export → Förbättra med AI → Import

**Andra scripts:**
```bash
npm run graph:inspect           # Inspectera ProcessGraph
npm run mortgage:order-debug     # Debug callActivity-ordning för mortgage-fixtures
```

---

## Validering & tester

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
- Fallback-resultat är tydligt markerade med metadata. Se `templates/FALLBACK_SAFETY.md` för detaljer.

**Riktiga LLM-smoke-tester (opt-in):**

Det finns dedikerade script för att köra ett litet antal riktiga LLM-tester (Feature Goal + Epic + Business Rule) utan att påverka resten av sviten:

```bash
npm run test:llm:smoke        # endast Claude (cloud)
npm run test:llm:smoke:cloud  # strikt Claude-smoke med LLM_SMOKE_STRICT=true
npm run test:llm:smoke:local  # endast Ollama (lokal), best-effort
```

Scriptet `test:llm:smoke` sätter:

- `VITE_USE_LLM=true`
- `VITE_ALLOW_LLM_IN_TESTS=true`
- `LLM_PROVIDER=cloud`

och kör `tests/integration/llm.real.smoke.test.ts`, som:

- använder `generateDocumentationWithLlm` med verklig Claude-klient när:
  - `VITE_ANTHROPIC_API_KEY` är satt,
  - `VITE_USE_LLM=true`,
  - `VITE_ALLOW_LLM_IN_TESTS=true`,
- testar LLM-flödet (JSON → modell → HTML) för:
  - Feature Goal (`docType = "feature"`),
  - Epic (`docType = "epic"`),
  - Business Rule (`docType = "businessRule"`),
- skriver LLM-baserad HTML (Claude) och mallbaserad fallback-HTML till `tests/llm-output/html/`:
  - `llm-feature-goal-cloud.html` / `llm-feature-goal-ollama.html` / `llm-feature-goal-fallback.html`
  - `llm-epic-cloud.html` / `llm-epic-ollama.html` / `llm-epic-fallback.html`
  - `llm-business-rule-cloud.html` / `llm-business-rule-ollama.html` / `llm-business-rule-fallback.html`
- skriver även råa LLM-svar (texten/JSON-strängen som skickas tillbaka från respektive LLM) till `tests/llm-output/json/`:
  - `llm-feature-goal-cloud.json` / `llm-feature-goal-ollama.json`
  - `llm-epic-cloud.json` / `llm-epic-ollama.json`
  - `llm-business-rule-cloud.json` / `llm-business-rule-ollama.json`
- markerar i den LLM-baserade HTML:en vilka sektioner som kommer från LLM kontra fallback (t.ex. `data-source-summary="llm|fallback"`, `data-source-scenarios="llm|fallback"` per `<section class="doc-section">`), vilket gör det enkelt att inspektera källan i browserns devtools.
 - vid Feature Goal‑körning verifierar den även att LLM‑scenarion (Claude) lagras i tabellen `node_planned_scenarios` och därmed blir tillgängliga i nodens testrapport.  
   Den hierarkiska BPMN‑generatorn seedar dessutom alltid bas‑scenarion för `local-fallback` per nod till samma tabell, så att Lokal fallback‑läget i testrapporten har ett tydligt utgångsläge även utan LLM.

Om LLM inte är aktiverat i tests (t.ex. ingen API-nyckel) hoppar smoke-test-filen automatiskt över sina tester (`describe.skip`).

### Extra viktig LLM-notis (för både människor och agenter)

- **Claude (cloud) är "gold standard" för kontraktet.**  
  - Använd alltid:  
    `npm run test:llm:smoke:cloud`  
    för att verifiera att promptar, validering och JSON-kontrakt fortfarande fungerar.
  - Om denna svit är grön vet vi att kontrakten fungerar som avsett.

- **Lokal Ollama är best-effort fallback.**  
  - Använd:  
    `npm run test:llm:smoke:local`  
    för att inspektera lokal-modellens beteende (Feature/Epic/BusinessRule), se rå-output och valideringsfel.
  - Den sviten får gärna vara röd under utveckling – den ska **inte** blockera Claude-flödet.

- **Ändra aldrig JSON-modellerna lättvindigt.**  
  - Typer/kontrakt som `FeatureGoalDocModel`, `EpicDocModel`, `BusinessRuleDocModel` är centrala:
    - UI, mappers, HTML-templates och tester förlitar sig på dessa.
  - Vid behov: justera **promptar** och **validering** först, inte själva modellen.

- **Efter ändringar i prompts eller validering:**  
  1. Kör alltid `npm run test:llm:smoke:cloud` först.  
  2. När cloud är grön, kör `npm run test:llm:smoke:local` för att se hur lokal LLM beter sig.  
  3. Använd `tests/llm-output/json/*.raw.json` för att analysera lokal LLM-output.

_Tips: hierarkin byggs från metadata i tabellen `bpmn_files.meta` (genereras vid uppladdning/parsing). Se till att metadata finns för att träd/diagram/listor ska spegla aktuell struktur._

---

## Local Schema Debug Checklist

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

## Schema-cache problem (PGRST204) & `supabase db reset`

När du kör `supabase db reset` i det här projektet är det normalt att se:

- `NOTICE: trigger "<namn>" for relation "<tabell>" does not exist, skipping`  
  Dessa kommer från `DROP TRIGGER IF EXISTS ...` i migrations och betyder bara att det inte fanns någon trigger att ta bort – det är inte ett fel.

Om du ser fel som `PGRST204: Could not find the 'mode' column` vid körning i appen:

1. Kör `npm run check:db-schema` för att kontrollera att kolumnen `mode` finns på `generation_jobs` och `node_test_links` i den aktiva databasen.
2. Om checken säger att schema/cachen är fel: kör `npm run supabase:reset` för att stoppa, resetta och starta om Supabase med aktuella migrationer.
3. **Förhindra problem:** Använd `npm run supabase:ensure-schema` innan dev-server startar för att säkerställa schema-sync.

Detta problem uppstår när PostgREST schema-cache är utdaterad efter migrationer.

---

## BPMN‑fixtures & hierarki‑tester (mortgage‑case)

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

---

## Bygga för produktion

```bash
npm run build        # Produktionsbygg
npm run build:dev    # Utvecklingsbygg (med source maps)
```

Bygget lägger statiska filer under `dist/` som kan deployas bakom valfri reverse proxy.  
Se till att Supabase-URL/nycklar och edge-funktioner är korrekt konfigurerade i den miljö du deployar till.
