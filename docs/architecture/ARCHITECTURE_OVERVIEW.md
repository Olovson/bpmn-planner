# Arkitekturöversikt

**Syfte:** Översikt över hierarki, dokumentation och LLM

> 📋 **För komplett arkitektur, se `bpmn-hierarchy-architecture.md` och `FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`**

---

## BPMN-hierarki

- XML → `BpmnParser` → `BpmnMeta`
- `ProcessDefinition` + `SubprocessLink` → `buildProcessHierarchy`
- `buildBpmnProcessGraph` → `BpmnProcessGraph` (root, children, missingDependencies)
- denna graf används av UI, dokumentationsgeneratorn och testgeneratorn.

## Ordningslogik för callActivities/tasks

- `orderIndex` beräknas enbart för noder som deltar i sequence edges (DFS/topologisk sort). Övriga noder lämnas utan `orderIndex`.
- Noder utan `orderIndex` får istället `visualOrderIndex` baserat på DI-koordinater (vänster→höger-sortering per fil).
- Sortering i UI och Gantt följer alltid `visualOrderIndex` → `orderIndex` → `branchId` (endast root) → `label`. Se `docs/VISUAL_ORDERING_IMPLEMENTATION.md`.
- För felsökning finns scriptet `npm run mortgage:order-debug` som kör hela parse → graph → tree-flödet för mortgage-fixtures och skriver ut tabeller (både full traversal och "unika aktiviteter per fil") med ordningsmetadata.
- För att exportera hela BPMN-trädet i markdown-format (användbart för Claude/andra verktyg): `npm run print:bpmn-tree` - genererar `bpmn-tree-output.md` med hierarkisk trädvy och flat lista av alla noder sorterade i ordningsföljd.

## Dokumentation

- Feature Goals, Epics och Business Rules genereras via modellbaserade JSON-kontrakt:
  - `FeatureGoalDocModel`, `EpicDocModel`, `BusinessRuleDocModel`
- LLM fyller JSON → mappers → HTML via templates i `src/lib/documentationTemplates.ts`.
- Samma HTML-layout används för lokal (mallbaserad) och LLM-baserad dokumentation.
- Prompts i `prompts/llm/*` instruerar LLM att alltid svara med **ett JSON-objekt** (ingen HTML/markdown) och att markera numeriska tröskelvärden som **exempelvärden** (t.ex. `600 (exempelvärde)`).
- Input till LLM består av:
  - ett `processContext` (kondenserad processöversikt med processnamn, nyckelnoder samt fas `phase` och roll `lane` per nyckelnod),
  - ett `currentNodeContext` (aktuellt BPMN‑element med hierarki, släktnoder, flöden, dokumentation och länkar).
  Dokumentation och scenarier ska alltid förankras i dessa fält – promptkontrakten finns i `prompts/llm/PROMPT_CONTRACT.md`.
- **Per-node overrides**: Varje nod kan ha en override-fil i `src/data/node-docs/` som överskrider mallbaserad/LLM-genererad innehåll. Se `docs/CODEX_BATCH_AUTO.md` för batch-generering med Codex.
- **Prompt-versionering**: Prompts är versionerade för att spåra när innehåll behöver re-genereras. Se `docs/PROMPT_VERSIONING.md`.

## LLM-lägen & providers

- Lokal generering (utan LLM): snabb, deterministisk, mallbaserad.
- Slow LLM Mode: rikare text via:
  - Claude (moln, claude-sonnet-4-20250514) via `cloudLlmClient`.
  - Lokal modell via Ollama (t.ex. `llama3:latest`) via `localLlmClient`.
- Internt används providers som `'cloud'` och `'local'`, men i loggar/UI visas alltid:
  - `Claude` (cloud),
  - `Ollama` (local),
  - `Ollama` (lokal LLM via Ollama).
- `generateDocumentationWithLlm` bygger JSON-input (processContext/currentNodeContext), använder `generateWithFallback` per docType/provider och loggar LLM-events (inkl. latency, tokenbudget-varningar) som kan inspekteras i LLM Debug-vyn.
- HTML-dokument får metadata om LLM-användning och visar en diskret banner när lokal LLM används som fallback istället för Claude.

---

## Not om subprocesser (callActivity vs subProcess)

I många modeller används både `bpmn:callActivity` (tydlig extern subprocess) och `bpmn:subProcess` (inlinad subprocess) för att beskriva logiken.  
För BPMN Planner betraktas vissa `subProcess`-noder som "subprocess-kandidater" på samma sätt som `callActivity`, och kan därför få kopplingar i `bpmn-map.json` till separata BPMN-filer.  
– Root-processen (`mortgage.bpmn`) använder främst `callActivity` som subprocess-indikator.  
– I subprocess-filerna (t.ex. `mortgage-se-application.bpmn`, `mortgage-se-manual-credit-evaluation.bpmn`) används `subProcess` eller andra aktivitetsnoder (`stakeholder`, `object`, `household`, `documentation-assessment`, `credit-evaluation` etc.) som logiska subprocesser.  
– `bpmn-map.json` är sanningen för vilka av dessa noder som faktiskt ska länkas till egna `.bpmn`-filer.  
Parsern och valideringen utökas stegvis för att behandla både `callActivity` och utpekade `subProcess`-noder som subprocesser, så att hierarki, dokumentation och tester alltid utgår från samma explicita karta.
