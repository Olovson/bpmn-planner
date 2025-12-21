# Test-scenarion & design-scenarion

BPMN Planner stödjer två sätt att generera testscenarion för Playwright-testscript:

## LLM-genererade scenarion (Slow LLM Mode)

När LLM är aktiverat (`VITE_USE_LLM=true`) kan systemet generera testscenarion via:
- **Claude** (moln-LLM) – "gold standard" för kontraktet
- **Ollama** (lokal LLM) – best-effort fallback

LLM-scenarion genereras via `generateTestSpecWithLlm()` och sparas i `node_planned_scenarios` med provider `cloud` (Claude) eller `ollama`.

## Design-scenarion (Lokal generering)

För lokal generering (utan LLM) används **design-scenarion** från `src/data/testMapping.ts`:

- **Statisk konfiguration**: Varje testbar nod kan ha en entry i `testMapping` med manuellt definierade scenarion.
- **Format**: Varje scenario har `id`, `name`, `description`, `status`, `category` (happy-path/error-case/edge-case).
- **Användning**: När lokal generering körs (`useLlm = false`) läser `getDesignScenariosForElement()` scenarion från `testMapping` och skickar dem till `generateTestSkeleton()`.
- **Fallback**: Om en nod saknar entry i `testMapping` skapas automatiskt ett enkelt "Happy path"-scenario.

### Hur design-scenarion sparas

När hierarkin byggs eller dokumentation genereras:
1. `createPlannedScenariosFromTree()` / `createPlannedScenariosFromGraph()` går igenom alla testbara noder.
2. För varje nod:
   - Om `testMapping[nodeId]` finns → använd dess scenarion.
   - Annars → skapa ett automatiskt fallback-scenario.
3. Alla scenarion sparas i `node_planned_scenarios` med `provider: 'local-fallback'` och `origin: 'design'`.

### Utöka design-scenarion

För att lägga till fler eller bättre scenarion:
1. Öppna `src/data/testMapping.ts`.
2. Lägg till eller uppdatera entry för noden (nyckel = `elementId`).
3. Definiera scenarion med relevanta kategorier (happy-path, error-case, edge-case).
4. När du kör lokal generering kommer dessa scenarion användas direkt i Playwright-testscripten.

**Viktigt**: LLM-generering påverkas **inte** av `testMapping.ts` – den använder endast LLM-scenarion. Design-scenarion används enbart när `useLlm = false`.
