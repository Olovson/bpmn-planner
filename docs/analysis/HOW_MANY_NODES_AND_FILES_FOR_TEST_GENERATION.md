# Analys: Hur Många Noder och Filer Genereras Testinformation För?

**Datum:** 2025-12-22  
**Status:** Analys av testgenereringsomfattning

---

## 📊 Översikt

### Noder som Genereras Testinformation För

**Feature Goals (Call Activities):**
- ✅ **JA** - Testinformation genereras för alla Call Activities (Feature Goals)
- Testinformation inkluderar:
  - Feature Goal-test scenarios (extraherat från E2E scenarios)
  - Sparas i `node_planned_scenarios` tabellen

**Epics (User Tasks, Service Tasks, Business Rule Tasks):**
- ❌ **NEJ** - Testinformation genereras INTE för Epics
- Epic-testgenerering har tagits bort
- Epic-information ingår redan i Feature Goal-dokumentation via `childrenDocumentation`

**E2E Scenarios:**
- ✅ **JA** - E2E scenarios genereras för root-processen (t.ex. `mortgage.bpmn`)
- Genereras baserat på paths genom BPMN-processen
- Filtreras baserat på tre prioriterade scenarios:
  1. Lyckad sökning för en sökare (bostadsrätt)
  2. Lyckad sökning för en sökare med medsökare (bostadsrätt)
  3. En sökare som behöver genomgå mest möjliga steg (bostadsrätt)

---

## 🔍 Detaljerad Analys

### 1. Feature Goal-test Scenarios

**Vilka noder:**
- Alla Call Activities (Feature Goals) i alla BPMN-filer
- Filtreras i `testGenerators.ts` rad 76:
  ```typescript
  const testableNodes = allTestableNodes.filter(node => node.type === 'callActivity');
  ```

**Hur många:**
- Beror på antal Call Activities i BPMN-filerna
- Från tidigare analys: ~91 testable nodes (inkluderade alla typer)
- Efter filtrering: Endast Call Activities (förmodligen ~30-50 noder, beroende på BPMN-struktur)

**Var sparas:**
- `node_planned_scenarios` tabellen i databasen
- En rad per Call Activity med test scenarios

---

### 2. E2E Scenarios

**Vilka filer:**
- Endast root-processen (t.ex. `mortgage.bpmn`)
- Genereras INTE för subprocess-filer individuellt

**Hur många:**
- Beror på antal paths genom root-processen
- Filtreras baserat på tre prioriterade scenarios
- Förväntat: 3-10 E2E scenarios (beroende på BPMN-struktur)

**Var sparas:**
- Supabase Storage: `e2e-scenarios/{bpmnFile}-scenarios.json`
- En JSON-fil per root-process med alla E2E scenarios

---

### 3. Feature Goal-test Scenarios (från E2E)

**Vilka noder:**
- Alla Call Activities som ingår i genererade E2E scenarios
- Extraheras automatiskt från E2E scenarios

**Hur många:**
- Samma som Feature Goals ovan (~30-50 noder)
- Men endast de som ingår i genererade E2E scenarios

**Var sparas:**
- `node_planned_scenarios` tabellen i databasen
- En rad per Call Activity med test scenarios

---

## 📈 Jämförelse: Före vs Efter

### Före (med Epic-testgenerering):

**Noder:**
- Call Activities (Feature Goals): ✅
- User Tasks (Epics): ✅
- Service Tasks (Epics): ✅
- Business Rule Tasks (Epics): ✅
- **Totalt:** ~91 noder (från tidigare analys)

**Filer:**
- Alla BPMN-filer med testable nodes
- E2E scenarios för root-processen

---

### Efter (utan Epic-testgenerering):

**Noder:**
- Call Activities (Feature Goals): ✅
- User Tasks (Epics): ❌
- Service Tasks (Epics): ❌
- Business Rule Tasks (Epics): ❌
- **Totalt:** ~30-50 noder (endast Call Activities)

**Filer:**
- Alla BPMN-filer med Call Activities
- E2E scenarios för root-processen

**Fördelar:**
- ✅ Färre noder att generera testinfo för (~50% reduktion)
- ✅ Snabbare generering
- ✅ Lägre kostnad (färre LLM-anrop)
- ✅ Epic-information ingår redan i Feature Goal-dokumentation

---

## 🎯 Exempel: Mortgage Process

**Antaganden:**
- Root-process: `mortgage.bpmn`
- Subprocess-filer: ~10-15 filer
- Call Activities (Feature Goals): ~30-40 noder
- User Tasks (Epics): ~20-30 noder
- Service Tasks (Epics): ~15-20 noder
- Business Rule Tasks (Epics): ~10-15 noder

**Före:**
- Testinfo för: ~75-105 noder
- E2E scenarios: 3-10 scenarios

**Efter:**
- Testinfo för: ~30-40 noder (endast Call Activities)
- E2E scenarios: 3-10 scenarios
- **Reduktion:** ~50-60% färre noder

---

## 📝 Sammanfattning

### Noder som Genereras Testinformation För:

1. **Feature Goals (Call Activities):** ✅
   - Antal: ~30-50 noder (beroende på BPMN-struktur)
   - Var: Alla BPMN-filer med Call Activities
   - Vad: Feature Goal-test scenarios (extraherat från E2E scenarios)

2. **E2E Scenarios:** ✅
   - Antal: 3-10 scenarios (beroende på paths och filtrering)
   - Var: Root-processen (t.ex. `mortgage.bpmn`)
   - Vad: Kompletta E2E scenarios med paths och Feature Goals

3. **Epics (User/Service/Business Rule Tasks):** ❌
   - Testinformation genereras INTE längre
   - Epic-information ingår i Feature Goal-dokumentation

### Filer som Påverkas:

1. **BPMN-filer med Call Activities:**
   - Alla filer som innehåller Call Activities
   - Testinfo sparas i databasen (`node_planned_scenarios`)

2. **Root-processen:**
   - E2E scenarios sparas i Supabase Storage
   - Fil: `e2e-scenarios/{bpmnFile}-scenarios.json`

---

## 🔍 Hur Räkna Exakt Antal

För att räkna exakt antal noder och filer:

1. **Kör `getTestableNodes()` för alla BPMN-filer:**
   ```typescript
   const graph = buildBpmnProcessGraph(parseResult.elements, bpmnFileName);
   const allTestableNodes = getTestableNodes(graph);
   const testableNodes = allTestableNodes.filter(node => node.type === 'callActivity');
   ```

2. **Räkna Call Activities per fil:**
   - Parse varje BPMN-fil
   - Räkna antal Call Activities
   - Summera över alla filer

3. **Räkna E2E scenarios:**
   - Parse root-processen
   - Hitta alla paths
   - Filtrera baserat på prioriterade scenarios
   - Räkna antal genererade scenarios

---

## ✅ Slutsats

**Noder:**
- **~30-50 noder** (endast Call Activities/Feature Goals)
- Reduktion från ~91 noder (före) till ~30-50 noder (efter)
- **~50% reduktion** i antal noder

**Filer:**
- **Alla BPMN-filer med Call Activities** (förmodligen ~10-15 filer)
- **1 root-process** för E2E scenarios (t.ex. `mortgage.bpmn`)

**Fördelar:**
- ✅ Snabbare generering
- ✅ Lägre kostnad
- ✅ Fokus på Feature Goals (viktigaste testinformationen)
- ✅ Epic-information ingår redan i Feature Goal-dokumentation

---

**Status:** Analys klar. Exakt antal beror på BPMN-struktur, men förväntat ~30-50 noder och ~10-15 filer.



