# Validering och nästa steg: Hybrid approach för Feature Goal-test generering

## 🎯 Syfte

Identifiera vad som behöver göras för att validera att hybrid approach fungerar, och formulera ett prompt för nästa steg.

---

## ✅ Vad som redan är validerat

### 1. Deterministisk approach (fungerar)
- ✅ Gateway-context mapping fungerar
- ✅ Feature Goal-test extraktion fungerar
- ✅ Deduplicering fungerar
- ✅ Tester passerar (5/5 tester)

**Kvalitet:** 70-80% (deterministisk approach)

---

## ⚠️ Vad som INTE är validerat

### 1. Claude-fallback integration (stubbad)
- ❌ `findMatchingPathWithClaude()` returnerar `undefined` (stubbad)
- ❌ `interpretGatewayConditionsWithClaude()` returnerar `[]` (stubbad)
- ❌ `generateFeatureGoalTestWithClaude()` kastar error (stubbad)

**Problem:** Claude-integration är inte implementerad, bara strukturen finns.

---

### 2. Hela flödet från E2E → Feature Goal-tester
- ❌ Ingen integrationstest som testar hela flödet
- ❌ Ingen validering att Feature Goal-tester faktiskt sparas till databasen
- ❌ Ingen validering att UI kan visa Feature Goal-tester

**Problem:** Vi vet inte om hela flödet fungerar end-to-end.

---

### 3. Gateway-condition hantering i verklig miljö
- ❌ Ingen validering med riktiga BPMN-filer
- ❌ Ingen validering att gateway-conditions faktiskt extraheras korrekt
- ❌ Ingen validering att ProcessPath matchning fungerar med riktiga E2E-scenarios

**Problem:** Tester använder mock-data, inte riktiga BPMN-filer.

---

## 🔍 Vad behöver valideras

### 1. Deterministisk approach med riktiga BPMN-filer

**Vad:**
- Ladda riktiga BPMN-filer (t.ex. `mortgage-se-application.bpmn`)
- Extrahera ProcessPath med gateway-conditions
- Generera E2E-scenarios (mock eller riktiga)
- Extrahera Feature Goal-tester
- Validera att gateway-conditions inkluderas korrekt

**Test:**
```typescript
it('should extract Feature Goal tests from real E2E scenarios with real BPMN files', async () => {
  // 1. Ladda riktig BPMN-fil
  const parseResult = await parseBpmnFile('mortgage-se-application.bpmn');
  const flowGraph = buildFlowGraph(parseResult);
  const paths = findPathsThroughProcess(flowGraph, startEventId);
  
  // 2. Generera E2E-scenarios (mock eller riktiga)
  const e2eScenarios = await generateE2eScenarios({ paths, ... });
  
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

---

### 2. Claude-fallback när deterministisk approach misslyckas

**Vad:**
- Simulera att deterministisk approach misslyckas (t.ex. ProcessPath matchning misslyckas)
- Validera att Claude-fallback anropas
- Validera att Claude-resultat används korrekt

**Test:**
```typescript
it('should use Claude fallback when deterministic matching fails', async () => {
  // 1. Mock deterministisk matchning att misslyckas
  const e2eScenario = { ... }; // Scenario som inte matchar exakt
  const paths = [ ... ]; // Paths som inte matchar exakt
  
  // 2. Mock Claude-fallback att returnera match
  vi.spyOn(..., 'findMatchingPathWithClaude').mockResolvedValue(matchingPath);
  
  // 3. Extrahera Feature Goal-tester
  const extractions = await extractFeatureGoalTestsWithGatewayContext(...);
  
  // 4. Validera att Claude-fallback användes
  expect(findMatchingPathWithClaude).toHaveBeenCalled();
  expect(extractions.size).toBeGreaterThan(0);
});
```

---

### 3. Hela flödet: E2E → Feature Goal-tester → Databas → UI

**Vad:**
- Generera E2E-scenarios
- Extrahera Feature Goal-tester
- Spara till databasen
- Läs från databasen
- Validera att UI kan visa tester

**Test:**
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
    bpmnFiles,
  });
  
  // 4. Läs från databasen
  const savedTests = await loadPlannedScenarios(...);
  
  // 5. Validera att UI kan visa tester
  expect(savedTests.length).toBeGreaterThan(0);
  // ... mer validering
});
```

---

### 4. Gateway-condition hantering i verklig miljö

**Vad:**
- Ladda riktiga BPMN-filer med gateway-conditions
- Extrahera gateway-conditions korrekt
- Validera att Feature Goal-tester inkluderar gateway-conditions

**Test:**
```typescript
it('should handle gateway conditions from real BPMN files', async () => {
  // 1. Ladda riktig BPMN-fil med gateway-conditions
  const parseResult = await parseBpmnFile('mortgage-se-application.bpmn');
  const gateways = extractGateways(parseResult);
  
  // 2. Extrahera gateway-conditions
  const gatewayConditions = extractUniqueGatewayConditions(paths);
  
  // 3. Validera att gateway-conditions extraheras korrekt
  expect(gatewayConditions.length).toBeGreaterThan(0);
  
  // 4. Extrahera Feature Goal-tester
  const extractions = await extractFeatureGoalTestsWithGatewayContext(...);
  
  // 5. Validera att gateway-conditions inkluderas i tester
  const creditEvaluationTests = extractions.get('mortgage-se-application.bpmn::credit-evaluation');
  expect(creditEvaluationTests?.testScenarios.some(t => t.name.includes('KALP OK'))).toBe(true);
});
```

---

## 🎯 Prompt för nästa steg

### Prompt: "Validera hybrid approach för Feature Goal-test generering"

**Kontext:**
Vi har implementerat en hybrid approach för att extrahera Feature Goal-tester från E2E-scenarios:
- Deterministisk approach fungerar (70-80% kvalitet)
- Claude-fallback är stubbad (inte implementerad)
- Tester passerar med mock-data, men inte validerat med riktiga BPMN-filer

**Uppgift:**
1. **Validera deterministisk approach med riktiga BPMN-filer**
   - Ladda riktiga BPMN-filer (t.ex. `mortgage-se-application.bpmn`)
   - Extrahera ProcessPath med gateway-conditions
   - Generera E2E-scenarios (mock eller riktiga)
   - Extrahera Feature Goal-tester
   - Validera att gateway-conditions inkluderas korrekt i tester

2. **Validera Claude-fallback (när deterministisk approach misslyckas)**
   - Simulera att deterministisk approach misslyckas
   - Validera att Claude-fallback anropas (eller åtminstone att fallback-logiken fungerar)
   - Validera att resultatet är korrekt även när deterministisk approach misslyckas

3. **Validera hela flödet: E2E → Feature Goal-tester → Databas**
   - Generera E2E-scenarios
   - Extrahera Feature Goal-tester
   - Spara till databasen (`node_planned_scenarios`)
   - Läs från databasen
   - Validera att data är korrekt

4. **Validera gateway-condition hantering i verklig miljö**
   - Ladda riktiga BPMN-filer med gateway-conditions
   - Extrahera gateway-conditions korrekt
   - Validera att Feature Goal-tester inkluderar gateway-conditions korrekt

**Förväntat resultat:**
- Integrationstester som validerar hela flödet
- Tester som använder riktiga BPMN-filer (inte bara mock-data)
- Tester som validerar gateway-condition hantering
- Dokumentation av eventuella problem eller begränsningar

**Begränsningar:**
- Claude-integration är stubbad (kan mockas i tester)
- Fokusera på deterministisk approach först
- Validera att strukturen är korrekt även om Claude-integration saknas

---

## 📋 Checklista: Vad behöver göras

### Steg 1: Validera deterministisk approach med riktiga BPMN-filer
- [ ] Skapa integrationstest som laddar riktiga BPMN-filer
- [ ] Extrahera ProcessPath med gateway-conditions
- [ ] Generera E2E-scenarios (mock eller riktiga)
- [ ] Extrahera Feature Goal-tester
- [ ] Validera att gateway-conditions inkluderas korrekt

### Steg 2: Validera Claude-fallback
- [ ] Skapa test som simulerar att deterministisk approach misslyckas
- [ ] Validera att fallback-logiken fungerar
- [ ] Mocka Claude-anrop (eller implementera stubb)
- [ ] Validera att resultatet är korrekt

### Steg 3: Validera hela flödet
- [ ] Skapa integrationstest för hela flödet
- [ ] Generera E2E-scenarios
- [ ] Extrahera Feature Goal-tester
- [ ] Spara till databasen
- [ ] Läs från databasen
- [ ] Validera att data är korrekt

### Steg 4: Validera gateway-condition hantering
- [ ] Skapa test med riktiga BPMN-filer som har gateway-conditions
- [ ] Extrahera gateway-conditions korrekt
- [ ] Validera att Feature Goal-tester inkluderar gateway-conditions

---

## 💡 Rekommendation: Prioritering

### Prioritet 1: Validera deterministisk approach med riktiga BPMN-filer
**Varför:** Detta är grunden - om deterministisk approach inte fungerar med riktiga BPMN-filer, fungerar ingenting.

**Vad:**
- Skapa integrationstest som laddar riktiga BPMN-filer
- Validera att ProcessPath extraheras korrekt
- Validera att gateway-conditions inkluderas i Feature Goal-tester

---

### Prioritet 2: Validera hela flödet
**Varför:** Vi behöver veta att hela flödet fungerar end-to-end.

**Vad:**
- Skapa integrationstest för hela flödet
- Validera att Feature Goal-tester sparas korrekt till databasen
- Validera att data kan läsas från databasen

---

### Prioritet 3: Validera Claude-fallback
**Varför:** Claude-fallback är viktigt för kvalitet, men deterministisk approach måste fungera först.

**Vad:**
- Mocka Claude-anrop i tester
- Validera att fallback-logiken fungerar
- Validera att resultatet är korrekt

---

**Datum:** 2025-12-22
**Status:** Analys klar - Valideringsplan och prompt formulerad







