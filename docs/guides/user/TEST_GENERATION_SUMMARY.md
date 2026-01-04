# Testgenerering – sammanfattning

- E2E‑scenarier genereras via LLM **endast för root‑filen** enligt `bpmn-map.json` och sparas i storage.
- Feature Goal‑scenarier genereras via LLM direkt från Feature Goal‑dokumentation och sparas i DB.
- Inga Playwright‑stubbar genereras som primär output.

Se `docs/testing/TEST_GENERATION.md`.
