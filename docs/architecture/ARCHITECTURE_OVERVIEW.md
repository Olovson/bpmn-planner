# Arkitekturöversikt

## Runtime och UI‑struktur

- Frontend är en Vite + React‑app.
- Routing sker via `HashRouter` (se `src/App.tsx`).
- Data‑fetching och caching sker via React Query (`@tanstack/react-query`).
- Globala kontexter: BPMN‑val, integrationer, global projekt‑konfig, version‑val (se `src/contexts/*` och `src/hooks/useVersionSelection`).
- Huvudsidor finns i `src/pages/*` och är kopplade till routes i `src/App.tsx`.

## Primära moduler

### 1) BPMN‑inläsning och parsing
- BPMN‑filer lagras i Supabase Storage bucket `bpmn-files`.
- Parsing sker client‑side via `src/lib/bpmnParser.ts`.
- Parsing byggs vidare i `src/lib/bpmn/*` för processmodeller, graph och tree.

### 2) Processmodell & processgraf
- Den centrala grafen byggs via `buildBpmnProcessGraph` i `src/lib/bpmnProcessGraph.ts`.
- Grafen byggs från processdefinitioner och BPMN‑metadata, samt en mappning i `bpmn-map.json` om den finns i storage.
- Grafen har per‑fil noder (`fileNodes`) och en global nod‑index (`allNodes`) för generering och coverage.

### 3) Generering av dokumentation & tester
- Huvudflöde: `generateAllFromBpmnWithGraph` i `src/lib/bpmnGenerators.ts`.
- Generering körs i klienten och skriver HTML‑dokumentation samt testunderlag till Supabase Storage.
- Dokumentationsmallar och rendering: `src/lib/documentationTemplates.ts`, `src/lib/bpmnGenerators/*`.
- LLM‑stöd finns via `src/lib/llmClients/*` och `src/lib/llmDocumentation.ts`.

### 4) Lagring och metadata
- Supabase används för:
  - Storage bucket `bpmn-files` (BPMN‑filer, docs, tests, export‑artefakter).
  - Tabeller som `bpmn_files`, `bpmn_dependencies`, `generation_jobs`, `node_planned_scenarios`, m.fl.
- Supabase edge functions används för t.ex. listning och uppladdning av BPMN‑filer, synkning mot GitHub och andra backend‑uppgifter (se `supabase/functions/*`).

## Centrala vyer (exempel)

- **BPMN File Manager** (`/files`): huvud‑UI för filhantering, generering och status (`src/pages/BpmnFileManager.tsx`).
- **Process Explorer** (`/process-explorer`): navigerar graf/hierarki i UI.
- **Test Coverage / E2E** (`/test-coverage`, `/e2e-tests`): visar genererad test‑coverage och scenarier.
- **Doc Viewer** (`/doc-viewer/:docId`): visar genererade dokument från storage.

## Vad som INTE görs

- Appen använder inte en fristående backend‑server för kärnlogiken; generering och BPMN‑analys sker i browsern och använder Supabase som storage/DB.
- Filordning för generering byggs inte via en separat dependency‑graph‑topologisk sortering, utan via traversal av callActivities med UI‑ordning (se `src/lib/bpmnGenerators.ts`).

