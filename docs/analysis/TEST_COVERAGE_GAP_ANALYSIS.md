# Analys: Test Coverage Gaps - Feature Goals med Saknade Subprocess-filer

**Datum:** 2025-01-XX  
**Status:** ✅ Gap identifierat och fixat

---

## 📊 Problem: Varför Tester Inte Fångade Upp Detta

### 1. Befintliga Tester Testar Inte Detta Scenario

**Problem:** Befintliga tester verifierar INTE att Feature Goals INTE genereras när subprocess-filer saknas.

**Exempel från befintliga tester:**

#### `application-documentation-generation.test.ts`
```typescript
it('should generate correct documentation files for mortgage-se-application.bpmn', async () => {
  const result = await generateAllFromBpmnWithGraph(
    'mortgage-se-application.bpmn',
    ['mortgage-se-application.bpmn'], // Bara application, INTE subprocess-filer
    [],
    false, // useHierarchy = false (isolated)
    false,
  );
  
  // Testet verifierar att Feature Goals genereras, men INTE att de INTE genereras för saknade subprocesser
  expect(featureGoalKeys.length).toBeGreaterThanOrEqual(1);
});
```

**Gap:** Testet verifierar att Feature Goals genereras, men kontrollerar INTE att Feature Goals INTE genereras för call activities med saknade subprocess-filer.

#### `generation-order-scenarios.test.ts`
```typescript
it('should generate all Feature Goals, Epics, and Combined docs regardless of order', async () => {
  const files = [
    'mortgage-se-application.bpmn',
    'mortgage-se-internal-data-gathering.bpmn',
    'mortgage-se-household.bpmn',
    'mortgage-se-stakeholder.bpmn',
    'mortgage-se-object.bpmn',
  ]; // ALLA filer finns
  
  // Testet verifierar att Feature Goals genereras när ALLA filer finns
  expect(hasFeatureGoal).toBe(true);
});
```

**Gap:** Testet verifierar att Feature Goals genereras när filer finns, men testar INTE scenariot där vissa filer saknas.

#### `mortgage-documentation-analysis.test.ts`
```typescript
it('should analyze BPMN file and compare expected vs actual generation (with hierarchy)', async () => {
  const result = await generateAllFromBpmnWithGraph(
    'mortgage.bpmn',
    ['mortgage.bpmn'], // Bara mortgage, INTE subprocess-filer
    [],
    true, // useHierarchy = true
    false,
  );
  
  // Testet räknar callActivities och förväntar sig Feature Goals för dem
  const expectedFeatureGoals = 1 + totalFeatureGoalNodes; // Process + callActivities
  expect(featureGoalKeys.length).toBe(expectedFeatureGoals);
});
```

**Gap:** Testet förväntar sig Feature Goals för callActivities även när subprocess-filerna saknas, vilket är felaktigt.

---

## 🔍 Varför Tester Inte Fångade Upp Detta

### 1. Tester Antog Att Alla Filer Finns

**Problem:** Tester antog implicit att alla subprocess-filer finns i `existingBpmnFiles`, även när de bara lade till root-filen.

**Exempel:**
- `['mortgage-se-application.bpmn']` - Tester antog att subprocess-filer skulle finnas
- Men i verkligheten kan användare bara ladda upp vissa filer

### 2. Tester Verifierade Inte Negativa Scenarion

**Problem:** Tester verifierade bara positiva scenarion ("Feature Goals genereras när filer finns"), men inte negativa scenarion ("Feature Goals genereras INTE när filer saknas").

**Saknade tester:**
- ❌ Test som verifierar att Feature Goals INTE genereras när subprocess-filen saknas
- ❌ Test som verifierar beteende när vissa subprocess-filer finns men andra saknas

### 3. Tester Fokuserade På Genereringsordning, Inte Saknade Filer

**Problem:** Tester fokuserade på genereringsordning (subprocess först vs parent först), men inte på scenariot där filer saknas helt.

**Exempel:**
- `generation-order-scenarios.test.ts` testar ordning, men alla filer finns alltid
- `mortgage-documentation-analysis.test.ts` analyserar antal dokument, men antog att alla callActivities skulle generera Feature Goals

---

## 🎯 Andra Liknande Scenarion Som Inte Fångats Upp

### 1. BusinessRuleTasks och DMN-filer

**Scenario:** BusinessRuleTasks använder DMN-filer för beslutslogik.

**Nuvarande beteende:**
- Dokumentation genereras även om DMN-filen saknas
- `subprocessFile` blir undefined, men dokumentation genereras ändå
- DMN-information visas bara om filen finns

**Kritisitet:** Låg (dokumentation fungerar utan DMN-fil, bara mindre informativ)

**Rekommendation:** Överväg att lägga till en varning i dokumentationen när DMN-filen saknas, men detta är inte lika kritiskt som Feature Goals.

### 2. Embedded SubProcesses

**Scenario:** Embedded subProcesses (subprocesser inbäddade i samma BPMN-fil) behandlas som callActivities.

**Nuvarande beteende:**
- Embedded subProcesses genererar Feature Goals
- De har ingen `subprocessFile` (de är inbäddade)
- De har INTE `missingDefinition = true`

**Kritisitet:** Ingen (embedded subProcesses har alltid sin definition i samma fil)

**Rekommendation:** Ingen åtgärd behövs.

### 3. Nested CallActivities

**Scenario:** CallActivity i en subprocess som pekar på en annan subprocess.

**Nuvarande beteende:**
- Om nested subprocess-filen saknas, kommer callActivity att ha `missingDefinition = true`
- Fixen kommer att hantera detta korrekt

**Kritisitet:** Hanteras av fixen

**Rekommendation:** Verifiera med tester för nested scenarion.

---

## ✅ Nya Tester Som Skapats

### `tests/integration/feature-goal-missing-subprocess.test.ts`

**Tester:**
1. ✅ `should NOT generate Feature Goal when subprocess file is missing`
2. ✅ `should generate Feature Goal when subprocess file exists`
3. ✅ `should handle partially missing subprocess files correctly`
4. ✅ `should verify missingDependencies in result metadata`

**Coverage:**
- Negativa scenarion (Feature Goals genereras INTE när filer saknas)
- Positiva scenarion (Feature Goals genereras när filer finns)
- Delvis saknade filer (vissa finns, andra saknas)
- Metadata-verifiering (missingDependencies)

---

## 📋 Checklista för Framtida Tester

När man skapar tester för dokumentationsgenerering, ska man alltid inkludera:

- [ ] **Positiva scenarion:** Verifiera att dokumentation genereras när alla filer finns
- [ ] **Negativa scenarion:** Verifiera att dokumentation INTE genereras när filer saknas
- [ ] **Delvis saknade filer:** Verifiera beteende när vissa filer finns men andra saknas
- [ ] **Metadata-verifiering:** Verifiera att `missingDependencies` är korrekt
- [ ] **Edge cases:** Nested subprocesser, återkommande subprocesser, etc.

---

## 🔗 Relaterade Filer

- `tests/integration/feature-goal-missing-subprocess.test.ts` - Nya tester
- `tests/integration/application-documentation-generation.test.ts` - Befintliga tester (gap identifierat)
- `tests/integration/generation-order-scenarios.test.ts` - Befintliga tester (gap identifierat)
- `tests/integration/mortgage-documentation-analysis.test.ts` - Befintliga tester (gap identifierat)
- `docs/analysis/TEST_COVERAGE_GAP_ANALYSIS.md` - Denna analys


