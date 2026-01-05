# BPMN Map – Design för Automatisk Generering (Heuristik + Claude)

Detta dokument beskriver den föreslagna designen för att generera och uppdatera `bpmn-map.json` automatiskt, med en kombination av befintlig heuristik och Claude‑baserade förslag.

Läs gärna först `docs/analysis/BPMN_MAP_GENERATION_ANALYSIS.md` för kontext om nuvarande läge och utmaningar.

## 1. Mål och icke‑mål

**Mål:**
- Generera en komplett, konsistent `bpmn-map.json` från befintliga BPMN‑filer.
- Hålla `callActivity → subprocess_bpmn_file`‑mappningar så korrekta som möjligt.
- Markera osäkra mappningar tydligt (`needs_manual_review`) i stället för att gissa fel.
- Använda Claude där heuristik är osäker, utan att göra LLM till “single source of truth”.
- Inte skriva över manuellt kuraterade maps i tysthet.

**Icke‑mål (nu):**
- Bygga ett fullständigt UI för att editera `bpmn-map.json` (kan komma senare).
- Lösa alla tänkbara edge‑cases för alla typer av BPMN‑modellering.
- Göra LLM till “single source of truth” – LLM är alltid ett förslag, aldrig ensam sanning.

## 2. Övergripande arkitektur

Vi delar upp systemet i tre lager:

1. **Heuristisk generator** (finns redan men förbättras)
   - Läser alla BPMN‑filer via Supabase.
   - Bygger `ProcessDefinition[]`.
   - Kör `SubprocessMatcher` för att mappa callActivities → subprocessprocesser.
   - Producerar en “rå” `BpmnMap` med:
     - `call_activities[].subprocess_bpmn_file` där vi är säkra.
     - `matchStatus`/`needs_manual_review` för resten.

2. **Claude‑stödd förfining**
   - Bearbetar endast callActivities med status `lowConfidence`, `ambiguous`, `unresolved`.
   - Skickar strukturerade prompts till Claude med:
     - parentprocess, callActivity, kandidatprocesser.
   - Får tillbaka strukturerade JSON‑förslag.
   - Uppdaterar `BpmnMap` där LLM‑förslag är tillräckligt starka.

3. **Persistens & skydd**
  - Spara den genererade mappen till Supabase Storage (`bpmn-files/bpmn-map.json`).
  - Aldrig overwrite:a en befintlig, manuellt justerad map utan explicit flagga.
  - (Valfritt) synka till GitHub via befintlig edge function när det är önskvärt.

## 3. API & entrypoints

### 3.1 Script entrypoint

Vi introducerar ett script, t.ex.:

- `scripts/generate-bpmn-map.mjs`

Detta script:

1. Läser konfiguration/flags (CLI):
   - `--force` – tillåt overwrite av befintlig map i Storage.
   - `--no-llm` – kör enbart heuristik.
   - `--preview` – generera men spara inte; skriv ut stats + diff.
2. Använder Supabase‑test/prod beroende på env (standard: test).
3. Anropar en ny modul:
   - `src/lib/bpmn/generateBpmnMapOrchestrator.ts` (ny).

### 3.2 Orchestrator‑modul

Ny modul (förslagsvis):

- `src/lib/bpmn/bpmnMapGenerationOrchestrator.ts`

Ansvar:

1. Hämta befintlig map (om den finns) via `bpmnMapStorage.loadBpmnMapFromStorage`.
2. Kör heuristisk generator:
   - `generateBpmnMapFromFiles()` (befintlig i `bpmnMapAutoGenerator.ts`) – ev. utökad med mer diagnostics.
3. Jämför heuristisk map med befintlig:
   - upptäck nya callActivities / processer,
   - markera var det finns konflikter (t.ex. tidigare manuell mappning vs ny heuristik).
4. (Valfritt) anropa Claude‑lagret för svåra fall.
5. Mergar ihop (se avsnitt 6 för exakta regler):
   - behåller manuella mappningar,
   - kompletterar med heuristik/Claude där det saknas,
   - flaggar konflikter i en rapport i stället för att tyst skriva över.
6. Returnerar ett **finalt** `BpmnMap` + stats:
   - antal callActivities,
   - fördelning per matchstatus,
   - antal LLM‑förslag accepterade.

## 4. Heuristisk generator – krav och justeringar

`bpmnMapAutoGenerator.ts` finns redan men behöver justeras för att:

- Tydligt använda `matchStatus`‑modellen i `SubprocessMatcher`:
  - `matched`, `lowConfidence`, `ambiguous`, `unresolved`.
- Skriva dessa in i `BpmnMap`:
  - via `needs_manual_review` + ev. en ny `match_status` i callActivity‑entryn.
- Hantera processer med flera callActivities korrekt:
  - callActivities från rätt process, inte bara “alla i filen”.

**Viktiga förbättringar:**

1. **Per‑process callActivities**
   - I dag används ibland `parseResult.callActivities` globalt för en fil.
   - Justera så att vi per process:
     - använder callActivities som hör till den processen (via meta/processId), eller
     - annoterar vilka callActivities som hör till vilken process.
   - I `bpmn-map.json` ska varje `call_activities[]`‑rad knytas till en specifik process via t.ex.:
     - `process_id` (eller intern ID) utöver `bpmn_file`.
   - `process_id` i JSON ses som kanonisk nyckel på map‑nivå; internt kan vi mappa den mot t.ex. `internalId` i `ProcessDefinition`, men själva JSON‑fältet ska vara stabilt.

2. **Root process‑val**
   - I stället för hårdkodat “mortgage.bpmn eller första filen”:
     - bygg en graf av `SubprocessLink`s,
     - root‑kandidater = processer utan inbound länkar,
     - om flera: välj en heuristiskt (filnamn/ID/namn) eller låt config styra.

3. **Normalisering av filnamn**
   - Säkerställ att `subprocess_bpmn_file` alltid är:
     - basename utan mappar,
     - i samma format som resten av systemet använder (matchar `bpmn_files.file_name` etc.).

4. **Utökade diagnostics och metadata**
   - Utöver befintliga stats i `note`:
     - skriv per‑callActivity:
       - `match_status: 'matched' | 'lowConfidence' | 'ambiguous' | 'unresolved'`
       - `needs_manual_review: boolean`
       - `source: 'manual' | 'heuristic' | 'llm'` (nytt fält)
   - I JSON‑schemat används snake_case (`match_status`), medan interna modeller gärna kan använda camelCase (`matchStatus`) – konvertering sker på ett ställe i loader/serializer för att undvika dubbletter av fältnamn i koden.
   - `source` används i merge‑logiken:
     - `manual` har högre prioritet än `heuristic`/`llm`.
     - `llm` ersätter bara `heuristic` där `source !== 'manual'`.

## 5. Claude‑lagret – design

### 5.1 När Claude ska användas

Claude ska **inte** köras på alla callActivities automatiskt, utan bara på de som:

- efter heuristik har `matchStatus` ∈ {`lowConfidence`, `ambiguous`, `unresolved`}.
- och där det finns minst en rimlig kandidat (annars är allt `unresolved`).

Detta minskar kostnad och gör prompts mindre “brusiga”.

### 5.2 Input till Claude

Per callActivity skickar vi ett litet JSON‑paket, t.ex.:

```jsonc
{
  "bpmn_file": "mortgage.bpmn",
  "process": {
    "id": "MortgageOrchestration",
    "name": "Mortgage Orchestration"
  },
  "call_activity": {
    "bpmn_id": "Call_Application",
    "name": "Application",
    "called_element": "ApplicationProcess"
  },
  "candidates": [
    {
      "bpmn_file": "mortgage-se-application.bpmn",
      "process_id": "MortgageSeApplication",
      "name": "Mortgage SE – Application",
      "summary": "Short auto/LLM-generated summary of what this process does"
    },
    {
      "bpmn_file": "mortgage-se-household.bpmn",
      "process_id": "MortgageSeHousehold",
      "name": "Mortgage SE – Household",
      "summary": "..."
    }
  ],
  "heuristic": {
    "previous_status": "ambiguous",
    "previous_subprocess_bpmn_file": null
  }
}
```

Summaries kan komma från befintlig dokumentation (om sådan finns) eller genereras separat.

### 5.3 Output från Claude

Claude ska alltid svara med strikt JSON, t.ex.:

```jsonc
{
  "subprocess_bpmn_file": "mortgage-se-application.bpmn",
  "process_id": "MortgageSeApplication",
  "confidence": 0.97,
  "reason": "Call activity name and calledElement both match the Application process, and tasks within the candidate process align with the parent context."
}
```

Schéma (TypeScript‑liknande):

```ts
type LlmMapSuggestion = {
  subprocess_bpmn_file: string | null;
  process_id?: string | null;
  confidence: number; // 0–1
  reason?: string;
};
```

### 5.4 Beslutslogik ovanpå LLM

När vi har ett LLM‑förslag:

- Om `confidence >= 0.9`:
  - sätt `subprocess_bpmn_file` till kandidaten,
  - sätt `needs_manual_review = false` (om heuristiken också var hög‑confidence),
  - spara `reason` i diagnostics (valfritt).
- Om `0.6 <= confidence < 0.9`:
  - uppdatera `subprocess_bpmn_file` men behåll `needs_manual_review = true`,
  - mer som “förslag” som UI kan visa.
- Om `confidence < 0.6` eller `subprocess_bpmn_file == null`:
  - behåll heuristikens status,
  - spara `reason` för UI/human review.

- LLM‑anrop ska göras med deterministiska inställningar (t.ex. låg/0 temperatur) och helst per callActivity eller i små batchar.
- Ogiltiga eller ej‑parsbara LLM‑svar behandlas som `confidence = 0` (dvs. ignoreras, men loggas).

Alltså: LLM får aldrig tyst override:a heuristiken eller manuella ändringar, utan fungerar som ett extra beslutslager.

## 6. Persistens och skydd

### 6.1 Spara map till Storage

Vi återanvänder `saveBpmnMapToStorage` i `bpmnMapStorage.ts`, men:

- Vid autogenerering utan `--force`:
  - om filen redan finns:
    - spara i en “preview path” (t.ex. `bpmn-map.generated.json`) eller
    - bara visa diff i CLI/UI utan att skriva.
- Vid `--force`:
  - explicit overwrite av `bpmn-map.json` med loggning.

### 6.2 Integrering med GitHub

Existerande edge function `update-github-file` kan användas, men bara när:

- utvecklaren uttryckligen säger “synka mapen till repo”.

### 6.3 Relation mellan Storage och lokala map‑filer

- I repo:t finns även lokala map‑filer (`bpmn-map.json`, historik/backups m.m.).
- `bpmnMapStorage` definierar redan prioritet mellan Storage och lokal fil:
  - Storage ses som primär källa,
  - lokal fil används som fallback.
- CLI/orchestrator ska bygga på samma prioriteringslogik, så att runtime och skript alltid ser samma “source of truth” och vi undviker divergerande map‑versioner.

## 7. UX‑konsekvenser och framtida UI

Den här designen förbereder för, men kräver inte direkt:

- En enkel vy (t.ex. “BPMN Map Editor”) där man kan:
  - se alla callActivities med `needs_manual_review=true`,
  - se heuristikens och LLM:s förslag + reason,
  - manuellt välja rätt subprocess och spara,
  - visualisera root‑process och hierarki.

I nuläget kan vi nöja oss med:

- CLI‑output (stats + lista på osäkra mappningar),
- loggar i `note`‑fältet,
- ev. en enkel markdown‑rapport.

## 8. Merge‑ och valideringslogik (per callActivity)

### 8.1 Merge‑regler (befintlig map + heuristik + LLM)

Per callActivity (identifierad av `bpmn_file` + `process_id` + `bpmn_id`):

1. **Befintlig entry saknas i mapen**
   - Heuristik/LLM kan skapa en ny entry:
     - `source = 'heuristic'` eller `'llm'` beroende på var `subprocess_bpmn_file` kommer ifrån.
     - `match_status` sätts enligt `SubprocessMatcher` (ev. uppgraderad av LLM med hög confidence).

2. **Befintlig entry finns, `source = 'manual'`**
   - Denna ses som “låst”:
     - varken heuristik eller LLM får ändra `subprocess_bpmn_file`.
     - heuristik/LLM får uppdatera `match_status`/diagnostics om vi vill visa nya signaler, men inte påverka själva mappningen.
   - Konflikter (heuristik/LLM föreslår annan fil) ska:
     - loggas i en rapport,
     - inte ändra mapen.

3. **Befintlig entry finns, `source = 'heuristic' | 'llm'`**
   - Heuristik:
     - kan uppdatera `match_status` och `subprocess_bpmn_file` om ny analys ger en bättre kandidat.
   - LLM:
     - kan ersätta heuristikens `subprocess_bpmn_file` om:
       - confidence ≥ `ACCEPT_THRESHOLD` (t.ex. 0.9), och
       - nuvarande `source !== 'manual'`.
     - sätter då `source = 'llm'`.

4. **Undefined/legacy entries (utan `source`/`match_status`)**
   - Vid första körningen:
     - anta `source = 'manual'` om det redan finns `subprocess_bpmn_file`,
     - eller `source = 'heuristic'` om `subprocess_bpmn_file` saknas men heuristik fyller i.

### 8.2 Validering av genererad map

Efter att vi byggt en ny map (och innan vi overwrite:ar `bpmn-map.json`) bör vi:

1. Bygga en processgraf med den nya mapen:
   - `buildBpmnProcessGraphFromParseResults(rootFile, parseResults, bpmnMap)`.
2. Kontrollera:
   - att det finns minst en root‑process (eller att `orchestration.root_process` är giltig),
   - att `missingDependencies` är rimliga (saknade filer, inte felstavade subprocess‑filnamn),
   - att inga oväntade cykler/hopp uppstår jämfört med tidigare version (om sådan finns).
3. (Valfritt) köra ett litet set “guldtester”:
   - t.ex. mortgage/household‑senarier där vi vet hur mapen ska se ut.

Om valideringen misslyckas:

- ska scriptet:
  - inte overwrite:a befintlig map,
  - skriva ut en tydlig rapport,
  - returnera ett fel (så att CI/pipeline kan stoppa).

## 9. Implementation roadmap (kort)

1. **Städa heuristiken:**
   - Justera `bpmnMapAutoGenerator` enligt avsnitt 4.
   - Lägg till `match_status` per callActivity.
2. **Skapa orchestrator + script:**
   - `bpmnMapGenerationOrchestrator.ts` + `scripts/generate-bpmn-map.mjs`.
3. **Införa LLM‑lagret:**
   - Ny modul `src/lib/bpmn/bpmnMapLlmRefinement.ts`:
     - tar in en `BpmnMap` + lista callActivities att förfina,
     - anropar Claude via befintligt LLM‑infrastruktur,
     - returnerar uppdaterad `BpmnMap` + stats.
4. **Skydd och diff:**
   - Implementera logik för att aldrig overwrite:a befintlig map utan `--force`.
   - Lägg till “preview mode” som bara skriver rapport.
5. **Validering:**
   - Lägg till ett valideringssteg som bygger grafen med nya mapen och kör grundläggande kontroller.

6. **(Senare) UI:**
   - Enkel adminvy för att se/osäkra matchningar och manuellt uppdatera mapen.

Detta ger en stegvis väg från dagens heuristik till en robust, Claude‑assisterad `bpmn-map.json`‑generation, utan att offra säkerhet eller kontroll.
