# BPMN Map – Analys av nuvarande läge och utmaningar

Detta dokument sammanfattar hur `bpmn-map.json` används idag, hur kopplingen mellan BPMN‑filer och subprocesser fungerar, och vilka utmaningar vi behöver lösa för att få en robust, automatiserbar generering.

## 1. Syfte med `bpmn-map.json`

`bpmn-map.json` är tänkt att vara en kuraterad karta över:

- **Orchestration‑nivå**
  - `orchestration.root_process` – vilken process som är “root” för hela domänen (t.ex. mortgage‑orchestration).
- **Per process / fil**
  - `processes[]` innehåller:
    - `bpmn_file` – vilket BPMN‑filnamn processen bor i.
    - `id` / `process_id` / `alias` – ID + mänskligt namn.
    - `call_activities[]` – alla callActivities i processen:
      - `bpmn_id` – element‑ID i BPMN.
      - `name` – visat namn i diagrammet.
      - `called_element` – ev. BPMN `calledElement`‑referens.
      - `subprocess_bpmn_file` – vilket BPMN‑fil som är subprocess.
      - `needs_manual_review` – flagga för osäkra matchningar.

Den här mappen används i:

- `buildProcessHierarchy` / `buildProcessModelFromDefinitions`
- `buildBpmnProcessGraph` (graf + `missingDependencies`)
- `generateAllFromBpmnWithGraph` (ordning, Feature Goals, coverage m.m.)

Kort sagt: `bpmn-map.json` är sanningskällan för **callActivity → subprocess‑fil** + root‑process.

## 2. Dagens flöde – från filer till graf

### 2.1 Parsing och meta

- `bpmnParser` ger `BpmnParseResult` per fil med:
  - `meta.processes[]` (processId, namn, callActivities, tasks, m.m.)

### 2.2 ProcessDefinition

- `collectProcessDefinitionsFromMeta` (`processDefinition.ts`) bygger `ProcessDefinition`:
  - `id`, `name`, `fileName`, `callActivities`, `subprocessCandidates`, `tasks`, `parseDiagnostics`.

### 2.3 Hierarki och matchning

- `buildProcessHierarchy`:
  - Normaliserar process‑ID:n (`internalId`).
  - Bygger lista över alla kandidater (alla processer i alla filer).
  - För varje process:
    - Tar fram `effectiveCallActivities` (filtrerar bort embedded `subProcess`‑noder).
    - För varje callActivity:
      - Anropar `matchCallActivityToProcesses` (i `SubprocessMatcher`) med:
        - callActivity (id, name, calledElement, kind).
        - alla kandidater (processId, name, fileName, callActivities, tasks).
        - `matcherConfig.currentBpmnFile` – används för bpmn‑map‑stöd.
      - Matchern använder:
        - `bpmn-map.json` (via `matchCallActivityUsingMap` i `bpmnMapLoader.ts`) om den finns.
        - Annars ren heuristik (ID, namn, calledElement mot kandidater).
      - Resultat blir ett `SubprocessLink` med:
        - `matchedFileName`, `matchedProcessId`, `matchStatus`, diagnostics.

### 2.4 Graf

- `buildProcessModelFromDefinitions` + `buildBpmnProcessGraphFromParseResults`:
  - Använder processmodellen, `SubprocessLink`s och optional `bpmnMap` för att skapa:
    - `root` (processnoden).
    - `fileNodes` (alla noder per fil).
    - `allNodes` (global index).
    - `missingDependencies`.

## 3. Auto‑generering av bpmn‑map idag

`bpmnMapStorage.ts` försöker hämta/matcha `bpmn-map.json` så här:

1. **Storage → validering**
   - Försöker läsa `bpmn-map.json` från Supabase Storage (`bpmn-files/bpmn-map.json`).
   - Validerar struktur (måste ha `processes[]` med `bpmn_file` och `call_activities[]`).
2. **Om fil saknas: auto‑generator**
   - Om Storage säger “not found”, kör:
     - `generateBpmnMapFromFiles()` i `bpmnMapAutoGenerator.ts`.
   - Auto‑generatorn:
     - Läser BPMN‑filer (från DB/Storage).
     - Parse: bygger `processDefs` via `buildProcessDefinitionsFromRegistry`.
     - För varje callActivity:
       - anropar `matchCallActivityToProcesses`.
       - klassar matchen som `matched`, `lowConfidence`, `ambiguous`, `unresolved`.
       - sätter `subprocess_bpmn_file` + `needs_manual_review`.
     - Räknar stats och skriver dem i `note`.
     - Sätter `orchestration.root_process` (id eller första process).
3. **Fallback till projektfil**
   - Om auto‑generering inte kan användas (t.ex. inga filer) eller Storage är korrupt:
     - faller tillbaka till `rawBpmnMap` från `bpmn-map.json` i projektet.

Det finns alltså redan ett heuristiskt auto‑genereringssteg, men TODO‑punkterna säger att det inte alltid räcker och att vi behöver både bättre heuristik och LLM‑stöd där heuristiken är osäker.

## 4. Centrala svårigheter

1. **Inget unikt “nyckelfält”**
   - Kopplingen callActivity → subprocess bygger på flera signaler:
     - `calledElement` (kan vara processId, alias, eller något helt annat).
     - `name` (kan vara liknande men inte exakt samma).
     - struktur (vilka tasks/callActivities subprocessen innehåller).
   - Processer har sin egen uppsättning ID/namn/filnamn; det är lätt att det glider.

2. **Flera processer per fil**
   - En `.bpmn` kan innehålla flera processdefinitioner.
   - `bpmn-map.json` jobbar på filnivå (`bpmn_file`), men matchning sker också på processnivå.
   - Risken är att man väljer “fel process i rätt fil” om man bara har `subprocess_bpmn_file` utan processId.

3. **Återanvändning av samma subprocess**
   - En subprocess‑fil kan kallas från många callActivities och filer.
   - Mappen måste vara deterministisk:
     - samma callActivity ska alltid mappa till samma subprocessfil/process,
     - men samtidigt kunna stödja semantiska varianter om det behövs.

4. **Inkonsekventa namn/ID:n**
   - Filnamn, processId, `calledElement`, visat namn och interna ID:n kan alla skilja sig:
     - t.ex. fil `mortgage-se-application.bpmn`,
     - processId `mortgage-se-application-process`,
     - callActivity.calledElement `ApplicationProcess`.
   - Matchern måste hantera:
     - case skillnader,
     - prefix/suffix,
     - olika konventioner (bindestreck vs underscore),
     - ibland helt olika ord.

5. **Embedded vs externa subprocesser**
   - Embedded `subProcess` (i samma process) ska inte behandlas som separata filer.
   - `buildProcessHierarchy` försöker filtrera bort `subProcess`‑kandidater, men input‑metat kan vara rörigt (subprocessCandidates vs callActivities).
   - `bpmn-map` får inte börja mappa embedded subprocesser mot externa `.bpmn`‑filer.

6. **Sökvägar vs filnamn**
   - DB/Storage kan ha filer med paths (ex. `mortgage-se 2025.12.11/file.bpmn`), medan `bpmn-map` använder rena filnamn.
   - `matchCallActivityUsingMap` normaliserar redan till basename, men auto‑generatorn måste också skriva `subprocess_bpmn_file` på det format som resten av systemet förväntar.

7. **Partiell / legacy bpmn‑map**
   - I verkligheten kan det finnas:
     - en gammal `bpmn-map.json` i repo,
     - en ny i Storage,
     - eller ingen alls.
   - `bpmnMapStorage` måste hantera vilket som är “source of truth” utan att tappa bort manuella ändringar.

8. **Val av root‑process**
   - `orchestration.root_process` ska motsvara den verkliga root:en i domänen (inte bara “första filen”).
   - Auto‑generatorn har idag specialfall (t.ex. `mortgage.bpmn`), vilket inte är allmängiltigt.

## 5. Vad en robust generering behöver göra

För att `bpmn-map.json` ska vara pålitlig och automatiserbar behöver vi:

1. **Bygga en komplett, deterministisk kandidatmodell**
   - Prata igenom alla BPMN‑filer och bygga:
     - lista över processer (`ProcessDefinition[]`),
     - lista över callActivities per process.
   - För varje callActivity skapa en entry med:
     - parent `bpmn_file` + processId/alias,
     - `bpmn_id`, `name`, `called_element`,
     - `subprocess_bpmn_file` (ev. tom),
     - `match_status`, `needs_manual_review`.

2. **Köra heuristisk matchning med tydlig kvalitetssignal**
   - Använd `SubprocessMatcher` för att:
     - hitta kandidater per callActivity,
     - klassificera resultatet: `matched`, `lowConfidence`, `ambiguous`, `unresolved`.
   - Sätt `subprocess_bpmn_file` när vi är säkra, annars bara `needs_manual_review=true`.

3. **Root‑processval baserat på grafen**
   - Välja root som:
     - process(er) utan inbound `SubprocessLink`s (dvs ingen kallar dem),
     - gärna med konfigurerbart namn/ID,
     - eller explicit angiven av användaren.

4. **Skydda manuella mappningar**
   - Aldrig skriva över en befintlig, manuellt kuraterad `bpmn-map.json` utan explicit “overwrite”.
   - För nya filer/ändringar:
     - upptäcka bara nya callActivities,
     - föreslå uppdateringar (LLM eller heuristik) i stället för full overwrite.

5. **Tydliga diagnostics**
   - För varje genererad map:
     - summera statistik i `note`,
     - markera var `needs_manual_review=true` så UI kan guida användaren.

## 6. LLM:s roll (Claude) i detta

LLM behövs framför allt där heuristiken inte räcker:

- CallActivities där heuristiken ger:
  - `lowConfidence`, `ambiguous` eller `unresolved`.
- Situationer med:
  - fler processer i samma fil,
  - flera subprocesser med snarlika namn,
  - semantiska skillnader som heuristiken inte kan se.

En rimlig design (som nästa dokument tar vidare) är att:

- Låta heuristiken göra första passet och producera en “rå” `bpmn-map`.
- Skicka **svåra fall** (inte allt) till Claude med:
  - info om parentprocess, callActivity, tänkbara subprocesser.
- Få tillbaka strukturerade förslag:
  - `subprocess_bpmn_file`, ev. `process_id`, `confidence`, `reason`.
- Applicera beslutslogik ovanpå:
  - acceptera hög‑confidence förslag,
  - markera resten som `needs_manual_review` men med bra underlag i UI.

Nästa steg finns i `docs/architecture/BPMN_MAP_GENERATION_DESIGN.md` där själva produkt/design‑specen för automatiserad (heuristik + Claude) generering beskrivs.

