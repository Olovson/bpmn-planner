# 🚀 BPMN Planner

**BPMN Planner** är en intern plattform som tar BPMN-/DMN-filer, bygger en fullständig och deterministisk processhierarki, visualiserar processen (diagram, strukturträd, listvy) och genererar omfattande dokumentation, testunderlag och metadata för hela produkt- och utvecklingsteamet. Plattformen använder Supabase som backend och kan generera innehåll både via egna funktioner och via LLM i två olika lägen – ett snabbt och ett mer detaljerat.

---

# 🧠 Grundlogiken i appen

Appen bygger på tre centrala datastrukturer:

### **ProcessDefinition**
Beskriver en BPMN-process exakt som i filen (process-ID, namn, call activities, tasks, parse-diagnostics).

### **SubprocessLink**
Representerar matchningen mellan en Call Activity och dess subprocess. Innehåller matchStatus, confidence score, matchkandidater och diagnostik. All matchning är deterministisk och transparent.

### **HierarchyNode**
Det logiska trädet som binder samman hela processen: process → subprocess → subprocess, call activities, tasks, länkar och diagnostik.  
**Alla UI-vyer och all generering i appen baseras på detta träd.**

> Arkitektur & hierarki: se `docs/bpmn-hierarchy-architecture.md` för detaljer om den deterministiska matchningsordningen (calledElement → process-ID/namn → call activity-namn → filnamn → fuzzy) och hur diagnostics följer med i varje steg.

---

## 🔍 LLM‑kontrakt & modellbaserad dokumentation

Dokumentationen för **Feature Goals**, **Epics** och **Business Rules** genereras nu via **modellbaserade domänmodeller**. LLM fyller ett JSON‑objekt, inte fri HTML, och samma HTML‑builder används för både lokalt innehåll och LLM‑innehåll.

- Feature Goals:
  - Modell: `FeatureGoalDocModel` (`src/lib/featureGoalLlmTypes.ts`)
  - Mapper: `mapFeatureGoalLlmToSections` (`src/lib/featureGoalLlmMapper.ts`)
  - HTML‑builder: `buildFeatureGoalDocHtmlFromModel` (`src/lib/documentationTemplates.ts`)
  - Promptkontrakt: Feature‑delen i `prompts/llm/feature_epic_prompt.md`
  - Sektionen **“Tekniska & externa beroenden”** har i dagsläget en statisk fallback‑lista (regelmotorer, interna datakällor, externa API:er, integrationslager, påverkade interna system) som används när modellen inte explicit fyller denna del.
- Epics:
  - Modell: `EpicDocModel` (`src/lib/epicDocTypes.ts`)
  - Mapper: `mapEpicLlmToSections` (`src/lib/epicLlmMapper.ts`)
  - HTML‑builder: `buildEpicDocHtmlFromModel`
  - Promptkontrakt: Epic‑delen i `prompts/llm/feature_epic_prompt.md`
- Business Rules:
  - Modell: `BusinessRuleDocModel` (`src/lib/businessRuleDocTypes.ts`)
  - Mapper: `mapBusinessRuleLlmToSections` (`src/lib/businessRuleLlmMapper.ts`)
  - HTML‑builder: `buildBusinessRuleDocHtmlFromModel`
  - Promptkontrakt: `prompts/llm/dmn_businessrule_prompt.md`

LLM‑flow:

- För varje dokumenttyp (`feature`, `epic`, `businessRule`) gäller:
  1. Prompt instruerar LLM att returnera **ett JSON‑objekt** som matchar respektive modell.
  2. Mappern försöker först tolka svaret som JSON → domänmodell.
  3. Om JSON saknas eller är ogiltig används en enkel fallback (t.ex. allt i `summary`).
  4. HTML byggs alltid via modell + common builder (inte fri HTML från LLM).

> Övergripande kontrakt för LLM‑output finns dokumenterat i `prompts/llm/PROMPT_CONTRACT.md`.

---

# 📝 Genererad dokumentation och artefakter

En central funktion i BPMN Planner är att generera **automatiserad dokumentation och testartefakter direkt baserat på BPMN-hierarkin**. Detta möjliggör konsekvent, aktuell och spårbar information för alla roller:

### Dokumentationen inkluderar:
- **Feature Goals / Epics / User Journeys**
- **Beskrivningar av Business Rule Tasks**
- **Effektmål per Feature Goal** (t.ex. automatisering, kvalitet, kundupplevelse, regelefterlevnad)
- **Processöversikter och tekniska flöden**
- **Kravsammanställningar** (funktionella & icke-funktionella)
- **Arkitekturbeskrivningar kopplade till processtegen**
- **Design-/Figma-referenser bundna till varje nod**
- **Testfall och acceptanskriterier**
- **DoR/DoD-kriterier**

Dokumentationen genereras **en gång per körning**, och användaren väljer *vilket modus som ska användas för just den körningen*.  
Man kan sedan alltid **återgenerera** dokumentationen om man önskar byta modus eller uppdatera efter ändringar — men det är inget krav.

### Valbara genereringslägen

#### **1. Lokal generering (snabbast)**
Bygger dokument helt utan LLM – förutsägbart och snabbt, baserat på mallar och den deterministiska BPMN-hierarkin.

#### **2. Slow LLM Mode (full kvalitet)**
Använder LLM för att generera rikare innehåll:
- Mer komplett affärslogik
- Djupare produkt- och UX-innehåll
- Rikare testscenarier
- Fördjupade tekniska beskrivningar

Alla dokument sparas i Supabase Storage och versioneras genom mappar i `bpmn-files/docs/`.

---

# 🧪 Testgenerering (Playwright + scenarier)

BPMN Planner genererar även:

- **Playwright-testfiler** per nod eller per processträdgren  
- **Testscenarier och testlogik** kopplade till centrala noder  
- **Node tests** som visas direkt i UI  
- **LLM-genererade testfall** i Slow LLM Mode  
- Debug-kopior av rå-LLM sparas i `llm-debug/tests/`

---

# 🧩 Ytterligare metadata som genereras

Plattformen genererar även följande automatiskt:

- **Jira Issue Types och namn** (per BPMN-nod)
- **Figma/Confluence-länkar** per nod
- **Process-ID-register**
- **Nodklassificeringar** (User Task, Service Task, System Task, Business Rule, m.m.)
- **Kvalitetsdiagnostik** för matchning och subprocess-hierarki

---

# 🖥️ Hur UI:t använder hierarkin

### **BPMN-diagram**
- Visar originaldiagrammet.  
- Dubbelklick på Call Activity → öppnar subprocess (via deterministiskt hierarki-träd).  
- Klick på task → öppnar detaljerad sidopanel.

### **Strukturträd (D3.js)**
- Visualiserar hela processen baserat på HierarchyNode.

### **Listvy**
- Visar alla noder i en platt, filtreringsbar, sökbar samt exporterbar lista.

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
```

> **Obs:** när `VITE_USE_LLM=true` och `VITE_OPENAI_API_KEY` är satt använder appen de JSON‑baserade LLM‑kontrakten ovan. Om LLM är avstängd används alltid lokal modellbaserad dokumentation.

## 3. Edge Functions (valfritt)
```bash
supabase functions serve build-process-tree --env-file supabase/.env --no-verify-jwt
```

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

Det finns ett dedikerat script för att köra ett litet antal riktiga LLM-tester (Feature Goal + Epic + Business Rule) utan att påverka resten av sviten:

```bash
npm run test:llm:smoke
```

Scriptet sätter:

- `VITE_USE_LLM=true`
- `VITE_ALLOW_LLM_IN_TESTS=true`

och kör `tests/integration/llm.real.smoke.test.ts`, som:

- använder `generateDocumentationWithLlm` med verklig OpenAI-klient när:
  - `VITE_OPENAI_API_KEY` är satt,
  - `VITE_USE_LLM=true`,
  - `VITE_ALLOW_LLM_IN_TESTS=true`,
- testar LLM-flödet (JSON → modell → HTML) för:
  - Feature Goal (`docType = "feature"`),
  - Epic (`docType = "epic"`),
  - Business Rule (`docType = "businessRule"`),
- skriver både LLM- och lokal HTML till lokala filer under `tests/llm-output/`:
  - `llm-feature-goal-smoke.html` / `local-feature-goal-smoke.html`
  - `llm-epic-smoke.html` / `local-epic-smoke.html`
  - `llm-business-rule-smoke.html` / `local-business-rule-smoke.html`

Om LLM inte är aktiverat i tests (t.ex. ingen API-nyckel) hoppar smoke-test-filen automatiskt över sina tester (`describe.skip`).

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
3. **Generate documentation** – välj Local eller Slow LLM Mode.  
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

# 📍 Lokal URL
`http://localhost:8080/`

# 📦 Bygga för produktion

```bash
npm run build        # Produktionsbygg
npm run build:dev    # Utvecklingsbygg (med source maps)
```

Bygget lägger statiska filer under `dist/` som kan deployas bakom valfri reverse proxy.  
Se till att Supabase-URL/nycklar och edge-funktioner är korrekt konfigurerade i den miljö du deployar till.
