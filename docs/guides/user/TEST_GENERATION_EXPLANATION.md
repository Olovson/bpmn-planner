# Förklaring: Testgenerering (nuvarande)

## Översikt

Testgenerering bygger på två flöden:

1. **E2E‑scenarier** genererade via LLM (endast för root‑filen enligt `bpmn-map.json`)
2. **Feature Goal‑scenarier** genererade direkt från Feature Goal‑dokumentation (LLM) för de filer du genererar för

## Vad som inte längre gäller

- Ingen extraktion av Feature Goal‑tester från E2E‑scenarier.
- Inga Playwright‑stubbar genereras som primär output.

## Viktiga regler

- **E2E** skapas bara för den **sanna root‑filen** (enligt `bpmn-map.json`).
- **Feature Goal** skapas för varje **uppladdad fil** du genererar testinfo för, även om filen saknar callActivities (då används processens Feature Goal‑doc).

## Var sker logiken?

- `src/lib/testGenerators.ts`
- `src/lib/e2eScenarioGenerator.ts`
- `src/lib/featureGoalTestGeneratorDirect.ts`

Se `docs/testing/TEST_GENERATION.md` för detaljer.
