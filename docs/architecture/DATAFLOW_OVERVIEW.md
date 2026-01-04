# Dataflow – översikt

Detta dokument beskriver **hur data faktiskt flödar** i appen idag, från BPMN‑filer till genererade artefakter och UI.

## 1) BPMN‑filer in i systemet

**Källa:** Supabase Storage bucket `bpmn-files`.

- UI listar filer via edge function `list-bpmn-files` (se `src/hooks/useBpmnFiles.ts`).
- Uppladdning sker via edge function `upload-bpmn-file`.
- Filer kan synkas från GitHub via `sync-bpmn-from-github`.

## 2) Parsing och metadata

- När en fil ska användas hämtas den via public URL från storage.
- Parsing sker client‑side i `src/lib/bpmnParser.ts`.
- Parsern bygger ett `BpmnParseResult` som innehåller process‑metadata, tasks, callActivities, gateways, DI‑positioner, etc.

## 3) Bygg processmodell och graf

- `buildBpmnProcessGraph` bygger en graf över alla noder i en given fil‑uppsättning.
- Grafen använder:
  - BPMN‑parse‑resultat
  - processdefinitioner (`src/lib/bpmn/processDefinition.ts`)
  - `bpmn-map.json` om den finns i storage (`src/lib/bpmn/bpmnMapStorage.ts`)
- Grafen ger:
  - `root` (processnoden)
  - `fileNodes` (noder per BPMN‑fil)
  - `allNodes` (global index)
  - `missingDependencies` (saknade subprocesser)

## 4) Fil‑ och nodordning vid generering

- Filordningen byggs genom traversal från root‑processens callActivities i UI‑ordning:
  - Sortering med `compareNodesByVisualOrder` (visualOrderIndex → orderIndex → branchId).
  - Rekursiv traversal: subprocesser först, parent‑filen efteråt.
  - Root‑filen läggs sist, därefter eventuella omatchade filer.
- Denna ordning skapas i `src/lib/bpmnGenerators.ts`.

## 5) Dokumentationsgenerering

- Generering sker i klienten via `generateAllFromBpmnWithGraph`.
- För varje nod/fil:
  - Dokumentations‑HTML skapas (templater + ev. LLM‑genererat innehåll).
  - JSON‑metadata sparas inuti HTML (för E2E‑scenarier och UI‑användning).
- Dokument lagras i `bpmn-files` enligt `docs/claude/{bpmnFile}/{versionHash}/{docFile}`.
  - Se `src/lib/artifactPaths.ts` för faktisk sökvägslogik.

## 6) Testunderlag

- Testspecar och test‑stommar genereras i klienten.
- Testartefakter lagras i `bpmn-files` under `tests/` (se `src/lib/artifactPaths.ts`).

## 7) LLM‑integration

- LLM‑anrop görs via klienten (cloud/local), styrt av env och användarval.
- Health‑check för LLM finns som edge function: `supabase/functions/llm-health`.
- Resultat loggas i tabellen `llm_generation_logs` och debug‑artefakter kan sparas (se `src/lib/llmDebugStorage.ts`).

## 8) UI‑konsumtion

- Process Explorer / Test Coverage / Timeline läser från grafen och från genererade artefakter.
- Doc Viewer hämtar dokument‑HTML från storage.
- Test‑resultat och coverage läses från DB och storage via hooks i `src/hooks/*`.

