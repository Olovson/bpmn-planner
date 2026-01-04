# Vad genereras när du genererar testinfo?

## Översikt

När du kör **"Generera testinfo"** i appen skapas:

1. **E2E‑scenarier** (process‑nivå, endast root‑fil enligt `bpmn-map.json`)
2. **Feature Goal‑scenarier** (per uppladdad BPMN‑fil)

## E2E‑scenarier

- Genereras via LLM om LLM är aktiverat.
- **Endast för root‑processen** enligt `bpmn-map.json`.
- Bygger på processpaths + Feature Goal‑dokumentation.
- Sparas i storage:
  - `e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json`

## Feature Goal‑scenarier

- Genereras **direkt från Feature Goal‑dokumentation** (Claude).
- Om en BPMN‑fil saknar callActivities genereras Feature Goal‑scenarier ändå via processens Feature Goal‑doc (filens baseName).
- Sparas i `node_planned_scenarios` med:
  - `provider: 'claude'`
  - `origin: 'claude-direct'`

## När LLM är avstängt

- E2E‑scenarier skapas inte.
- Feature Goal‑scenarier skapas inte.

Se `docs/testing/TEST_GENERATION.md` för detaljer.
