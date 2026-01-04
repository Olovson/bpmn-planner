# Testgenerering – nuvarande flöde

Den här guiden beskriver **hur testgenerering fungerar i koden just nu**.

> **🧪 Test Environment:** For safe testing without affecting production data, see [../guides/user/QUICKSTART_AND_DEVELOPMENT.md](../guides/user/QUICKSTART_AND_DEVELOPMENT.md#test-environment) and [../analysis/TEST_ENVIRONMENT_PLAN.md](../analysis/TEST_ENVIRONMENT_PLAN.md).

## Översikt

Systemet genererar två typer av testinfo:

1. **E2E‑scenarier** (process‑nivå, endast root‑filen enligt `bpmn-map.json`)
2. **Feature Goal‑scenarier** (per BPMN‑fil)

All generering sker client‑side och lagras i Supabase.

## Var logiken finns

- Orkestrering: `src/lib/testGenerators.ts` (`generateTestsForFile`)
- E2E‑scenarier: `src/lib/e2eScenarioGenerator.ts`
- Lagring E2E: `src/lib/e2eScenarioStorage.ts`
- Feature Goal‑scenarier: `src/lib/featureGoalTestGeneratorDirect.ts`
- Lagring Feature Goal‑scenarier: `src/lib/plannedScenariosHelper.ts`

## E2E‑scenarier

- Skapas via LLM (kräver `VITE_USE_LLM=true` + API‑nyckel).
- Genereras utifrån processpaths + Feature Goal‑dokumentation.
- **Endast för root‑processen** enligt `bpmn-map.json`.
- Sparas i Supabase Storage:
  - `e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json`

## Feature Goal‑scenarier

- Genereras **direkt från Feature Goal‑dokumentation** (Claude), inte från E2E.
- För filer utan callActivities används processens Feature Goal‑doc (elementId = filens baseName).
- Sparas i DB‑tabellen `node_planned_scenarios` med:
  - `provider: 'claude'`
  - `origin: 'claude-direct'`

## Filordning vid generering

- **Testgenerering** använder topologisk sortering av filer baserat på callActivity‑beroenden (`topologicalSortFiles`).
- **Dokumentationsgenerering** använder traversal‑ordning (UI‑ordning för callActivities) i `src/lib/bpmnGenerators.ts`.

## När LLM är avstängt

Om LLM inte är aktivt:
- Inga E2E‑scenarier genereras.
- Feature Goal‑scenarier hoppar över generering (resultatet blir tomt).
