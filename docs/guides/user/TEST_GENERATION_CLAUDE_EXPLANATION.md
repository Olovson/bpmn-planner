# Testgenerering med Claude

När LLM är aktiverat (cloud/Claude) genereras:

 - **E2E‑scenarier** från processpaths + Feature Goal‑dokumentation (endast root‑filen enligt `bpmn-map.json`)
 - **Feature Goal‑scenarier** direkt från Feature Goal‑dokumentation för de filer du genererar

Allt sparas i Supabase:
- Storage för E2E (`e2e-scenarios/{bpmnFile}/{versionHash}/...`)
- DB för Feature Goal‑scenarier (`node_planned_scenarios`, origin `claude-direct`)

Detaljer: `docs/testing/TEST_GENERATION.md`.
