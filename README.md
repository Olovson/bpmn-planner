# 🚀 BPMN Planner

**BPMN Planner** är en intern plattform för att:

- läsa in BPMN-/DMN-filer,
- bygga en deterministisk BPMN‑hierarki (ProcessDefinition → HierarchyNode),
- visualisera processen (BPMN‑viewer, strukturträd, listvy),
- generera dokumentation, tester, DoR/DoD och metadata,
- och koppla allt till Supabase (tabeller + Storage) på ett spårbart sätt.

Systemet stödjer både **ren lokal generering** (mallar, inga LLM‑anrop) och **LLM‑förstärkt generering** via tre tydliga modes: Local / Fast LLM / Slow LLM.

---

## 🧠 Kärnarkitektur – hierarki & matcher

All logik vilar på den nya, deterministiska hierarki‑implementationen (se `docs/bpmn-hierarchy-architecture.md` för full detaljerad design).

### ProcessDefinition
- Strukturerad representation av en BPMN‑process:
  - processId, namn, bpmnFile,
  - call activities, tasks,
  - parse‑diagnostik.

### SubprocessLink
- Resultat av matchningen mellan Call Activity och subprocess‑process:
  - `matchStatus`: `matched | ambiguous | lowConfidence | unresolved`
  - confidence score,
  - kandidatlista,
  - diagnostikmeddelanden.
- Matchningsordningen är deterministisk:
  1. `calledElement`
  2. processId / processName
  3. activityName
  4. filnamn
  5. (ev.) fuzzy

### HierarchyNode
- Träd/graph över hela processen:
  - noder: processer, call activities, tasks,
  - länkar: parent/child, subprocess‑relationer,
  - diagnostik på noder och länkar.
- **Alla vyer och generatorer använder samma träd**:
  - BPMN‑viewer
  - Strukturträd
  - Listvy / Node‑matrix
  - Dokumentation / tester / DoR/DoD

---

## 🧭 UI‑översikt

Hela appen delar samma top‑layout med tabs:

- **BPMN‑diagram** (`#/`)
- **Strukturträd** (`#/process-explorer`)
- **Listvy** (`#/node-matrix`)
- **DoR/DoD** (`#/dor-dod`)
- **Tests** (`#/test-report`)
- **Filer** (`#/files`)

### BPMN‑diagram (Viewer)
- Laddar BPMN‑diagram för vald fil.
- **Dubbelklick på Call Activity**:
  - navigerar deterministiskt till subprocess‑filen (om `matchStatus === 'matched'`),
  - gör *ingenting* (eller visar diagnostik) om subprocess saknas eller är olöst – inga felkast.
- **Sidopanel (RightPanel)**:
  - visar nodens metadata, Jira‑typ/namn, Figma‑länk, DMN‑länk,
  - knappar för:
    - Dokumentation
    - Automatisk testfil
    - Testrapport
    - Öppna DoR/DoD
  - knapparna baseras på **faktiska artefakter**:
    - docs: `docs/nodes/<fil>/<element>.html` i Supabase,
    - testfil: `node_test_links` + Storage,
    - DoR/DoD: `dor_dod_status`,
    - testrapport: explicit `test_report_url`.

### Strukturträd (`#/process-explorer`)
- D3‑baserat träd över `HierarchyNode`:
  - ett träd per root‑process (t.ex. `mortgage.bpmn`),
  - färgkodade nodtyper (Call Activity, UserTask, ServiceTask, BusinessRuleTask, events/gateways).
- Dubbelklick / klick plockar upp samma nod i viewer/sidopanel.

### Listvy / Node‑matrix (`#/node-matrix`)
- Platt lista över alla noder i hierarkin:
  - fil, elementId, namn, nodtyp,
  - Figma‑länk, dokumentation, testfil, DoR/DoD‑status,
  - Jira‑typ (feature goal/epic) + Jira‑namn,
  - diagnostik (olösta/ambigua subprocesser, m.m.).
- Dokumentations‑, test‑ och DoR/DoD‑kolumner använder **samma logik som RightPanel** för att avgöra om artefakter verkligen finns.
- Stöd för export till Excel (`xlsx`).

### DoR/DoD‑dashboard (`#/dor-dod`)
- Samlad vy över alla subprocesser/noder med genererade DoR/DoD‑kriterier.
- Progress per nod (DoR/DoD‑procent), filtrering på nodtyp och orphan‑detektion (noder utan motsvarande BPMN‑element).
- DoR/DoD‑definitioner kommer alltid från **statisk mall** (`src/lib/templates/dorDodTemplates.ts`) – LLM får aldrig ändra definitionerna.

### Tests / Testrapport (`#/test-report`)
- Samlar testresultat (Playwright) och e2e‑scenarier med statistik:
  - total tests, passing/failing/pending/skipped,
  - grupperingar per initiative/feature goal,
  - länkning tillbaka till BPMN‑noder där det går.

### Filer (`#/files`)
- Upload & hantering av BPMN/DMN:
  - uppladdning,
  - GitHub‑synk,
  - “Build hierarchy” (ren hierarkibyggnad),
  - “Generate documentation/tests/DoR/DoD” i olika lägen,
  - jobblista (generation_jobs) och status.
- Här finns även:
  - **Reset registret** (se nedan),
  - **Radera alla filer** (tar bort källfiler).

På Filer‑sidan finns en **genereringspanel** där du väljer vilket mode som ska användas:

- `Local` – ingen LLM, snabb, mall‑ och schema‑baserad generering.  
  Bra för utveckling, regression och när du vill se ren struktur utan LLM‑kostnad.
- `Fast LLM` – använder `gpt-4o-mini` och en minimal prompt.  
  Ger kortfattad dokumentation (1–2 meningar per sektion) med låg latens.
- `Slow LLM` – använder `gpt-4o` och de fulla promptarna.  
  Ger mer komplett, rik dokumentation men med högre latens och tokenkostnad.

Alla tre modes körs via **samma pipeline**:

- samma hierarkibyggnad (`generateAllFromBpmnWithGraph`),
- samma schema‑ och section‑renderers för HTML,
- samma jobbkön (`generation_jobs`) och statusmodell.

---

## 📄 Dokumentation, tester & DoR/DoD

Genereringen sker via `generateAllFromBpmnWithGraph`:

1. Bygger processgraf (`buildBpmnProcessGraph`) från Supabase‑lagrade filer.
2. Plockar ut testbara noder (`getTestableNodes`).
3. Skapar:
   - hierarkiska Playwright‑tester per root‑fil,
   - per‑nod docs (`docs/nodes/...`),
   - per‑nod tests (`tests/nodes/...`),
   - DoR/DoD‑kriterier per nod (statisk mall),
   - subprocess‑mappningar (bpmn_dependencies),
   - Jira‑metadata (bpmn_element_mappings).

### Lokalt läge (ingen LLM) – `mode = local`
- Använder bara mallar + BPMN‑hierarki, inga LLM‑anrop.
- Dokumentation genereras för:
  - alla relevanta noder (CallActivity, UserTask, ServiceTask, BusinessRuleTask),
  - **även när subprocess‑match är olöst**:
    - noden dokumenteras,
    - en *extra sektion* “Subprocess‑diagnostik” kan beskriva t.ex.  
      `Subprocess match: unresolved • Ingen subprocess kunde matchas …`.
- Tester:
  - genereras som Playwright‑skelett per nod, alltid, oberoende av subprocess‑matchning.
- DoR/DoD:
  - genereras per nod via statiska templates,
  - sparas i `dor_dod_status` med `bpmn_file`, `bpmn_element_id` och `subprocess_name`.

### LLM‑lägen – `mode = fast | slow`
- Aktiveras via genereringspanelen på Filer‑sidan och styrs av `llmMode`:
  - **Fast LLM (`fast`)**
    - modell: `gpt-4o-mini`,
    - korta sektioner (1–2 meningar eller få bullets),
    - lägre tokenbudget, låg latens.
  - **Slow LLM (`slow`)**
    - modell: `gpt-4o`,
    - rikare sektioner, fler affärs-scenarion,
    - högre tokenbudget, längre svarstid.
- Viktigt:
  - LLM används bara som **textförfattare** för docs/tests – DoR/DoD‑definitioner är alltid statiska.
  - Om LLM är avstängt eller `useLlm=false` → generatorn faller tillbaka till samma mall‑/schema‑flöde som i local‑läget.

---

## 🔄 Reset Registry (full reset)

Knappen **“Reset registret”** på `#/files` kör `reset-generated-data` edge function och gör (i nuvarande implementation):

- Rensar:
  - genererade dokument (`docs/...`),
  - genererade testfiler (`tests/...`),
  - DoR/DoD‑kriterier (`dor_dod_status`),
  - node‑test‑länkar (`node_test_links`),
  - testresultat,
  - LLM‑loggar (`llm_generation_logs`),
  - jobbhistorik (`generation_jobs`),
  - mappings/beroende‑tabeller kopplade till genererade artefakter.
- **Behåller BPMN/DMN‑källfiler** (använd “Radera alla filer” för att ta bort även dem).
- Rensar cache/state i frontend:
  - React Query‑cache,
  - localStorage/sessionStorage (LLM‑läge, mappings, etc.).
- Loggar ut användaren för att garantera en “ren” state efter reset.

Efter reset:
- På `#/` får du:
  - en tydlig tom‑state om inga BPMN‑filer finns:  
    “Ingen BPMN-fil hittades. Ladda upp en BPMN-fil via sidan Filer.”
  - annars laddas root‑filen via `useRootBpmnFile` eller ett deterministiskt fallback (mortgage.bpmn → första fil).

---

## ⚙️ Snabbstart (lokal utveckling)

```bash
git clone https://github.com/Olovson/bpmn-planner.git
cd bpmn-planner
npm install
```

### 1. Starta Supabase

```bash
supabase start
```

### 2. Miljövariabler (`.env.local`)

Minsta uppsättning:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role>

SEED_USER_EMAIL=seed-bot@local.test
SEED_USER_PASSWORD=Passw0rd!

VITE_USE_LLM=true              # sätt till false om du vill tvinga lokalt läge
VITE_OPENAI_API_KEY=<OpenAI key>   # krävs om LLM används
```

### 3. Edge Functions (hierarki + generering)

I separat terminal:

```bash
supabase functions serve build-process-tree --env-file supabase/.env --no-verify-jwt
supabase functions serve generate-artifacts --env-file supabase/.env --no-verify-jwt   # om använd
```

### 4. Dev‑server (Vite)

```bash
npm run dev   # http://localhost:8080/
```

### 5. Logga in

Standard seed‑användare:

```text
E-post:    seed-bot@local.test
Lösenord:  Passw0rd!
```

---

## ✅ Tester & validering

```bash
npm test                 # kör alla Vitest-tester
npm run check:generator  # fokuserad körning på generatorn
```

Nyckeltester:

- `src/lib/bpmn/SubprocessMatcher.test.ts` – matchningslogik (SubprocessLink).
- `src/lib/bpmn/buildProcessHierarchy.test.ts` – hierarkiträd & diagnoser.
- `src/lib/processTreeNavigation.test.ts` – navigation viewer ↔ hierarki.
- `tests/unit/generateAllFromBpmnWithGraph.test.ts` – docs/tests/DoR/DoD‑generering, inkl. olösta subprocesser.
- `tests/unit/artifactAvailability.test.ts` – logik för när docs/tests/DoR finns.

---

## 🔁 Typiskt arbetsflöde

1. **Filer**: ladda upp BPMN/DMN eller synka från GitHub.
2. **Build hierarchy**: kör hierarkibyggnad (endast struktur, inga docs/tests).
3. **Generate artifacts**: kör generering för vald fil i valt mode (Local/Fast LLM/Slow LLM):
   - dokumentation per nod + fil (HTML enligt schema/SECTION_RENDERERS),
   - Playwright‑tester (inkl. hierarkiska tester),
   - DoR/DoD,
   - mappings, node‑test‑länkar, m.m.
4. **Utforska**:
   - BPMN‑viewer + RightPanel (doc/test/DoR‑knappar),
   - Strukturträd,
   - Listvy / Node‑matrix (per‑nod översikt).
5. **Justera metadata**:
   - Figma‑länkar,
   - Jira‑typ och namn,
   - DMN‑kopplingar.
6. **Kör tester / testrapporter** (Playwright).
7. **Regenerera** vid modelländringar.
8. **Reset registret** när du vill börja om med ett rent artefakt‑/jobbläge.

---

## 🆘 Felsökning (vanliga problem)

- **Viewer visar inget efter reset**  
  → Kontrollera att du har laddat upp minst en BPMN‑fil; annars visas tom‑state med länk till “Filer”.

- **Ingen DoR/DoD / docs / tester efter generering**  
  → Se jobbhistorik på `#/files` och Supabase‑tabeller:
  - `generation_jobs` – status och fel,
  - `dor_dod_status` – DoR/DoD‑rader,
  - `node_test_links` – testlänkar,
  - Storage: `bpmn-files/docs/...`, `bpmn-files/tests/...`.

- **Dubbelklick på Call Activity gör inget**  
  → Kontrollera `subprocessLink.matchStatus` i Node‑matrix:
  - `unresolved/ambiguous` → ingen navigation (men docs/tests/DoR genereras fortfarande för noden).

- **LLM känns extremt långsamt**  
  → Kör **lokalt läge** för snabb körning, använd LLM‑lägen endast när du behöver rik text.

---

## 📦 Bygga för produktion

```bash
npm run build
```

Bygget lägger statiska filer under `dist/` som kan deployas bakom valfri reverse proxy.  
Se till att Supabase‑URL/nycklar och edge‑funktioner är korrekt konfigurerade i den miljö du deployar till.  
