# Prompt för nästa steg: Validera hybrid approach

## 🎯 Prompt

**Kontext:**
Vi har implementerat en hybrid approach för att extrahera Feature Goal-tester från E2E-scenarios. Deterministisk approach fungerar (70-80% kvalitet) och tester passerar med mock-data. Claude-fallback är stubbad (inte implementerad).

**Uppgift:**
Validera att hybrid approach fungerar med riktiga BPMN-filer och hela flödet end-to-end:

1. **Validera deterministisk approach med riktiga BPMN-filer**
   - Skapa integrationstest som laddar riktiga BPMN-filer (t.ex. `mortgage-se-application.bpmn`)
   - Extrahera ProcessPath med gateway-conditions från riktiga BPMN-filer
   - Generera E2E-scenarios (mock eller riktiga via `generateE2eScenarios`)
   - Extrahera Feature Goal-tester via `extractFeatureGoalTestsWithGatewayContext`
   - Validera att gateway-conditions inkluderas korrekt i Feature Goal-tester
   - Validera att deduplicering fungerar korrekt

2. **Validera hela flödet: E2E → Feature Goal-tester → Databas**
   - Använd `generateE2eScenarios` för att generera E2E-scenarios
   - Använd `extractFeatureGoalTestsWithGatewayContext` för att extrahera Feature Goal-tester
   - Använd `generateFeatureGoalTestsFromE2e` för att spara till databasen
   - Läs från databasen (`node_planned_scenarios` tabellen)
   - Validera att data är korrekt sparad och kan läsas

3. **Validera gateway-condition hantering i verklig miljö**
   - Ladda riktiga BPMN-filer som har gateway-conditions
   - Extrahera gateway-conditions korrekt via `extractGateways` och `extractUniqueGatewayConditions`
   - Validera att Feature Goal-tester inkluderar gateway-conditions korrekt i `name` och `description`
   - Validera att tester separeras baserat på gateway-conditions (t.ex. `credit-evaluation` med `KALP OK = Yes` vs `KALP OK = No`)

**Förväntat resultat:**
- Integrationstester som validerar hela flödet med riktiga BPMN-filer
- Tester som validerar gateway-condition hantering
- Dokumentation av eventuella problem eller begränsningar
- Tester som kan köras med `npm test`

**Begränsningar:**
- Claude-integration är stubbad (mocka Claude-anrop i tester)
- Fokusera på deterministisk approach först
- Använd befintliga fixtures (t.ex. `tests/fixtures/bpmn/mortgage-se-application.bpmn`)

**Viktigt:**
- Använd befintlig infrastruktur (`buildFlowGraph`, `findPathsThroughProcess`, etc.)
- Mocka Claude-anrop där nödvändigt
- Validera att strukturen är korrekt även om Claude-integration saknas

---

## 📋 Specifika tester att skapa

### Test 1: Deterministisk approach med riktiga BPMN-filer
```typescript
it('should extract Feature Goal tests from real E2E scenarios with real BPMN files', async () => {
  // 1. Ladda riktig BPMN-fil
  const parseResult = await parseBpmnFile('mortgage-se-application.bpmn');
  const flowGraph = buildFlowGraph(parseResult);
  const startEvents = findStartEvents(flowGraph);
  const paths = findPathsThroughProcess(flowGraph, startEvents[0].id);
  
  // 2. Generera E2E-scenarios (mock eller riktiga)
  const e2eScenarios = [ /* mock E2E scenarios */ ];
  
  // 3. Extrahera Feature Goal-tester
  const extractions = await extractFeatureGoalTestsWithGatewayContext(
    e2eScenarios,
    paths,
    featureGoalDocs
  );
  
  // 4. Validera att gateway-conditions inkluderas
  expect(extractions.size).toBeGreaterThan(0);
  // ... mer validering
});
```

### Test 2: Hela flödet end-to-end
```typescript
it('should generate, save, and display Feature Goal tests end-to-end', async () => {
  // 1. Generera E2E-scenarios
  const e2eScenarios = await generateE2eScenarios({ ... });
  
  // 2. Extrahera Feature Goal-tester
  const extractions = await extractFeatureGoalTestsWithGatewayContext(...);
  
  // 3. Spara till databasen
  const saveResult = await generateFeatureGoalTestsFromE2e({
    e2eScenarios,
    paths,
    bpmnFiles: ['mortgage-se-application.bpmn'],
  });
  
  // 4. Läs från databasen
  const savedTests = await loadPlannedScenarios(...);
  
  // 5. Validera att data är korrekt
  expect(savedTests.length).toBeGreaterThan(0);
  // ... mer validering
});
```

### Test 3: Gateway-condition hantering
```typescript
it('should handle gateway conditions from real BPMN files', async () => {
  // 1. Ladda riktig BPMN-fil med gateway-conditions
  const parseResult = await parseBpmnFile('mortgage-se-application.bpmn');
  const gateways = extractGateways(parseResult);
  
  // 2. Extrahera gateway-conditions
  const flowGraph = buildFlowGraph(parseResult);
  const paths = findPathsThroughProcess(flowGraph, startEventId);
  const gatewayConditions = extractUniqueGatewayConditions(paths);
  
  // 3. Validera att gateway-conditions extraheras korrekt
  expect(gatewayConditions.length).toBeGreaterThanOrEqual(0);
  
  // 4. Extrahera Feature Goal-tester
  const extractions = await extractFeatureGoalTestsWithGatewayContext(...);
  
  // 5. Validera att gateway-conditions inkluderas i tester
  const creditEvaluationTests = extractions.get('mortgage-se-application.bpmn::credit-evaluation');
  if (creditEvaluationTests) {
    expect(creditEvaluationTests.testScenarios.length).toBeGreaterThan(0);
    // Validera att gateway-conditions inkluderas i name eller description
  }
});
```

---

**Datum:** 2025-12-22
**Status:** Prompt formulerad - Redo för implementation





