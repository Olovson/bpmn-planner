# Komplett guide: Testgenerering

Den här guiden beskriver testgenerering **som den fungerar i koden idag**.

## Kort sammanfattning

- E2E‑scenarier genereras med LLM **endast för root‑filen** enligt `bpmn-map.json` och sparas i storage.
- Feature Goal‑scenarier genereras **direkt från Feature Goal‑dokumentation** och sparas i DB.
- Playwright‑testfiler genereras inte längre som primär output.

## Var sparas data?

- **E2E‑scenarier:**
  - `e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json`
- **Feature Goal‑scenarier:**
  - `node_planned_scenarios` med `origin = 'claude-direct'`

## LLM‑krav

LLM måste vara aktivt för att skapa E2E‑ och Feature Goal‑scenarier:

- `VITE_USE_LLM=true`
- API‑nyckel (cloud)

## Länkar

- Detaljerad logik: `docs/testing/TEST_GENERATION.md`
- Testdata i DB: `docs/guides/user/WHERE_IS_TEST_DATA_STORED.md`
