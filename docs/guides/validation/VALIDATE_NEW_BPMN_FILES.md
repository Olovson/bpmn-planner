# Validera nya BPMN‑filer (A‑Ö)

Den här guiden beskriver en **praktisk och kod‑nära** validering som matchar nuvarande implementation.

## 1) Ladda upp filer

- Gå till `/files` och ladda upp BPMN‑filer.
- Kontrollera att filerna syns i listan och att root‑filen känns igen.

## 2) Bygg hierarki + generera artefakter

I UI:
- Kör generering (alla filer) så att graf, dokumentation och testinfo byggs.

## 3) Kör integrations‑tester (rekommenderat)

Följande tester använder **appens faktiska kod** och är en bra baseline:

```bash
npm test -- tests/integration/validate-feature-goals-generation.test.ts
npm test -- tests/integration/bpmnProcessGraph.mortgage.integration.test.ts
npm test -- tests/integration/documentation-generation-order-validation.test.ts
```

Om du vill validera en **lokal mapp** utan uppladdning:

```bash
BPMN_TEST_DIR=/path/to/bpmn npm test -- tests/integration/local-folder-diff.test.ts
```

## 4) Verifiera i UI

- **Process Explorer** (`/process-explorer`) – kontrollera att hierarkin ser rimlig ut.
- **Test Coverage** (`/test-coverage`) – kontrollera att testinfo laddas.
- **E2E Tests** (`/e2e-tests`) – kontrollera att E2E‑scenarios finns för **root‑filen** om LLM är aktiv.

## 5) Vanliga fel och åtgärder

- **Saknade subprocess‑filer / felaktiga mappningar:**  
  - Gå till `/files` och använd BPMN‑mappningskortet:
    - se vilka callActivities som har status “Otydlig” eller “Saknas”,
    - justera subprocess via dropdown eller låt Claude hjälpa till,
    - klicka “Spara mappningar” så uppdateras `bpmn-map.json` i storage.
  - Vid behov kan du även öppna den detaljerade mappningsdialogen för att se alla rader.
- **Fel i ordning/coverage:** Kör om generering och använd test‑suite ovan.
- **LLM‑fel:** Kontrollera `VITE_USE_LLM` + API‑nyckel samt `/api/llm/health`.
