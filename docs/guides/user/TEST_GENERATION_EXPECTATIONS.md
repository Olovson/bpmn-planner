# Vad kan du förvänta dig av testgenerering?

## Kort svar

- **E2E‑scenarier** genereras via LLM **endast för root‑filen** (enligt `bpmn-map.json`) och sparas i storage.
- **Feature Goal‑scenarier** genereras via LLM direkt från Feature Goal‑dokumentation och sparas i DB.
- **Inga Playwright‑stubbar** skapas längre som primär output.

## Var kan du se resultatet?

- **E2E Tests** (`/e2e-tests`) – laddas från storage.
- **Test Coverage** (`/test-coverage`) – visar sammanställning per nod.
- **DB‑tabell** `node_planned_scenarios` – Feature Goal‑scenarier.

## Länkar

- Full logik: `docs/testing/TEST_GENERATION.md`
- Dataplatser: `docs/guides/user/WHERE_IS_TEST_DATA_STORED.md`
