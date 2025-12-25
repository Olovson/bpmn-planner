# Realistisk plan: Hur skapar vi bra E2E-scenarios?

## 🎯 Syfte

Reviderad, realistisk plan baserad på vad som redan finns och vad som faktiskt är möjligt.

---

## ❌ Problem med min ursprungliga plan

### Problem 1: Bygga ny flödesgraf

**Min plan:**
- "Extrahera gateways, sequence flows, paths"
- "Bygga flödesgraf"

**Verklighet:**
- ✅ Ni har redan `buildBpmnProcessGraph()` som bygger en komplett processgraf
- ✅ Ni har redan `ProcessTree` som används i appen
- ✅ Ni har redan `flattenToPaths()` i `testCoverageHelpers.ts`
- ✅ Ni har lagt hundratals timmar på att skapa korrekt hierarki
- ❌ Min plan ignorerar allt detta och föreslår att bygga något nytt

**Rätt approach:**
- ✅ **Använd befintlig `buildBpmnProcessGraph()`** - fungerar redan
- ✅ **Använd befintlig `ProcessTree`** - fungerar redan
- ✅ **Använd befintlig `flattenToPaths()`** - fungerar redan
- ❌ **Bygg INTE ny flödesgraf** - använd det som redan finns

---

### Problem 2: Epics-dokumentation

**Min plan:**
- Nämnde inte epics alls
- Fokuserade bara på Feature Goals

**Verklighet:**
- ✅ Ni har Epic-dokumentation (redan genererad)
- ✅ Epics innehåller `userStories` som är relevanta
- ✅ Epics har `flowSteps`, `prerequisites`, `interactions`
- ❌ Jag vet inte hur epics kopplas till feature goals
- ❌ Jag vet inte hur epics ska användas i E2E-scenarios

**Frågor som behöver svaras:**
1. **Hur kopplas epics till feature goals?**
   - Är epics på process-nivå och feature goals på call activity-nivå?
   - Eller är epics och feature goals på samma nivå?

2. **Hur använder vi Epic-dokumentation?**
   - Epics innehåller user stories - ska dessa användas i E2E-scenarios?
   - Hur kombineras Epic user stories med Feature Goal user stories?

3. **Vilka epics hör till vilka feature goals?**
   - Behöver vi en mapping mellan epics och feature goals?
   - Eller kan vi inferera detta från BPMN-struktur?

---

### Problem 3: "Saknad path"

**Min plan:**
- "För varje saknad path, skicka till Claude"
- Tydliggjorde inte vad "saknad path" betyder

**Vad "saknad path" betyder:**
- En path från start-event till end-event som **inte har ett E2E-scenario ännu**
- Identifieras genom att matcha befintliga scenarios mot paths

**Hur identifierar vi saknade paths:**
1. **Identifiera alla paths** från `flattenToPaths()` (redan implementerat)
2. **Matcha befintliga scenarios** mot paths baserat på:
   - Feature Goals i pathen
   - Gateway-conditions i pathen
   - End event i pathen
3. **Identifiera gaps** - paths som inte matchar något scenario

**Implementation:**
```typescript
// Identifiera alla paths (använd befintlig funktionalitet)
const allPaths = flattenToPaths(tree.root, [], undefined);

// Matcha befintliga scenarios mot paths
const coveredPaths = allPaths.filter(path => {
  return existingScenarios.some(scenario => 
    matchesPath(scenario, path)
  );
});

// Identifiera saknade paths
const missingPaths = allPaths.filter(path => 
  !coveredPaths.includes(path)
);
```

---

## ✅ Reviderad plan: Realistisk approach

### Steg 1: Använda befintlig infrastruktur ✅

**Vad vi gör:**
- ✅ Använd `buildBpmnProcessGraph()` (redan finns, fungerar)
- ✅ Använd `ProcessTree` (redan finns, fungerar)
- ✅ Använd `flattenToPaths()` (redan finns, fungerar)
- ❌ Bygg INTE ny flödesgraf

**Implementation:**
```typescript
// Använd befintlig processgraf
const graph = await buildBpmnProcessGraph(rootFile, existingBpmnFiles);

// Använd befintlig ProcessTree
const tree = await buildProcessTree(graph);

// Använd befintlig path-identifiering
const paths = flattenToPaths(tree.root, existingScenarios, undefined);
```

**Kvalitet:** 80-90% (använder befintlig, beprövad infrastruktur)

---

### Steg 2: Identifiera end events (leaf nodes) ✅

**Vad vi gör:**
- ✅ Använd befintlig `flattenToPaths()` för att identifiera paths
- ✅ Identifiera end events från paths (varje path slutar i en end event)
- ✅ Kategorisera end events (normal, error, terminate)

**Implementation:**
```typescript
// Använd befintlig path-identifiering
const allPaths = flattenToPaths(tree.root, [], undefined);

// Identifiera alla end events (leaf nodes)
const leafNodes = new Map<string, ProcessPath[]>();
allPaths.forEach(path => {
  const endNode = path.path[path.path.length - 1];
  if (!leafNodes.has(endNode.id)) {
    leafNodes.set(endNode.id, []);
  }
  leafNodes.get(endNode.id)!.push(path);
});
```

**Kvalitet:** 80-90% (använder befintlig infrastruktur)

---

### Steg 3: Förstå Epic- och Feature Goal-koppling ⚠️

**Vad vi behöver veta:**
1. **Hur kopplas epics till feature goals?**
   - Är epics på process-nivå och feature goals på call activity-nivå?
   - Eller är epics och feature goals på samma nivå?

2. **Hur använder vi Epic-dokumentation?**
   - Epics innehåller user stories - ska dessa användas i E2E-scenarios?
   - Hur kombineras Epic user stories med Feature Goal user stories?

3. **Vilka epics hör till vilka feature goals?**
   - Behöver vi en mapping mellan epics och feature goals?
   - Eller kan vi inferera detta från BPMN-struktur?

**Frågor som behöver svaras:**
- Hur är epics strukturerade i förhållande till feature goals?
- Kan vi använda Epic user stories för att förbättra E2E-scenarios?
- Hur kombineras Epic-dokumentation med Feature Goal-dokumentation?

**Kvalitet:** 60-70% (beroende på svar på frågorna)

---

### Steg 4: Identifiera "saknade paths" realistiskt ⚠️

**Vad "saknad path" betyder:**
- En path från start-event till end-event som **inte har ett E2E-scenario ännu**
- Identifieras genom att matcha befintliga scenarios mot paths

**Hur identifierar vi saknade paths:**
1. **Identifiera alla paths** från `flattenToPaths()` (redan implementerat)
2. **Matcha befintliga scenarios** mot paths baserat på:
   - Feature Goals i pathen (call activities)
   - Gateway-conditions i pathen (om det finns)
   - End event i pathen
3. **Identifiera gaps** - paths som inte matchar något scenario

**Implementation:**
```typescript
// Identifiera alla paths (använd befintlig funktionalitet)
const allPaths = flattenToPaths(tree.root, [], undefined);

// Matcha befintliga scenarios mot paths
function matchesPath(scenario: E2eScenario, path: ProcessPath): boolean {
  // Matcha baserat på Feature Goals i pathen
  const pathFeatureGoals = path.path
    .filter(node => node.type === 'callActivity')
    .map(node => node.bpmnElementId);
  
  const scenarioFeatureGoals = scenario.subprocessSteps
    .map(step => step.callActivityId)
    .filter(Boolean);
  
  // Matcha om Feature Goals är samma (i samma ordning)
  return arraysEqual(pathFeatureGoals, scenarioFeatureGoals);
}

// Identifiera saknade paths
const coveredPaths = allPaths.filter(path => {
  return existingScenarios.some(scenario => 
    matchesPath(scenario, path)
  );
});

const missingPaths = allPaths.filter(path => 
  !coveredPaths.includes(path)
);
```

**Kvalitet:** 70-80% (komplext, men möjligt med befintlig infrastruktur)

---

### Steg 5: Läsa Epic- och Feature Goal-dokumentation ⚠️

**Vad vi gör:**
1. **Läs Epic-dokumentation** (redan genererad)
2. **Läs Feature Goal-dokumentation** (redan genererad)
3. **Kombinera Epic user stories med Feature Goal user stories**
4. **Använd båda** för att generera E2E-scenarios med Claude

**Frågor som behöver svaras:**
- Hur kopplas epics till feature goals?
- Kan vi använda Epic user stories för att förbättra E2E-scenarios?
- Hur kombineras Epic-dokumentation med Feature Goal-dokumentation?

**Kvalitet:** 60-70% (beroende på hur epics och feature goals är kopplade)

---

### Steg 6: Använda Claude för att generera E2E-scenarios ⚠️

**Vad vi gör:**
1. **För varje saknad path**, skicka till Claude:
   - Path-struktur (Feature Goals, gateway-conditions)
   - Epic-dokumentation (om kopplad)
   - Feature Goal-dokumentation
   - BPMN process-information

2. **Claude genererar:**
   - `name`, `summary`, `given`, `when`, `then`
   - `bankProjectTestSteps` (med `action`, `assertion`, delvis `uiInteraction`, `dmnDecision`, `backendState`)
   - `subprocessSteps` (med `description`, `given`, `when`, `then`)

**Kvalitet:** 70-80% (beroende på Epic- och Feature Goal-koppling)

---

## 🎯 Realistisk bedömning

### ✅ Realistiskt:

1. **Använda befintlig infrastruktur** (80-90% kvalitet)
   - `buildBpmnProcessGraph()` fungerar redan
   - `ProcessTree` fungerar redan
   - `flattenToPaths()` fungerar redan
   - **Inga nya problem**

2. **Identifiera end events (leaf nodes)** (80-90% kvalitet)
   - Använder befintlig `flattenToPaths()`
   - Identifierar end events från paths
   - **Inga nya problem**

3. **Identifiera "saknade paths"** (70-80% kvalitet)
   - Komplext att matcha scenarios mot paths
   - Men möjligt med befintlig infrastruktur
   - **Möjligt, men komplext**

---

### ⚠️ Delvis realistiskt (kräver mer information):

1. **Använda Epic-dokumentation** (60-70% kvalitet)
   - Behöver förstå hur epics kopplas till feature goals
   - Behöver förstå hur Epic user stories ska användas
   - **Kräver svar på frågor**

2. **Kombinera Epic- och Feature Goal-dokumentation** (60-70% kvalitet)
   - Behöver förstå hur de kombineras
   - Behöver förstå vilka epics som hör till vilka feature goals
   - **Kräver svar på frågor**

3. **Claude-generering** (70-80% kvalitet)
   - Fungerar, men kvaliteten beror på Epic- och Feature Goal-koppling
   - **Möjligt, men kvaliteten varierar**

---

### ❌ INTE realistiskt:

1. **Bygga ny flödesgraf** (0% kvalitet)
   - Ignorerar befintlig infrastruktur
   - Skapar nya problem
   - **Inte realistiskt**

2. **Ignorera epics** (0% kvalitet)
   - Epics är viktiga
   - Innehåller relevant information
   - **Inte realistiskt**

---

## ❓ Frågor som behöver svaras

### 1. Hur kopplas epics till feature goals?

**Frågor:**
- Är epics på process-nivå och feature goals på call activity-nivå?
- Eller är epics och feature goals på samma nivå?
- Hur vet vi vilka epics som hör till vilka feature goals?

**Behövs för:**
- Att kunna använda Epic-dokumentation i E2E-scenarios
- Att kunna kombinera Epic user stories med Feature Goal user stories

---

### 2. Hur använder vi Epic-dokumentation?

**Frågor:**
- Epics innehåller user stories - ska dessa användas i E2E-scenarios?
- Hur kombineras Epic user stories med Feature Goal user stories?
- Är Epic `flowSteps` relevanta för E2E-scenarios?

**Behövs för:**
- Att kunna använda Epic-dokumentation för att förbättra E2E-scenarios
- Att kunna generera bättre scenarios med Claude

---

### 3. Vad menar vi med "saknad path"?

**Förtydligande:**
- En path från start-event till end-event som **inte har ett E2E-scenario ännu**
- Identifieras genom att matcha befintliga scenarios mot paths

**Behövs för:**
- Att kunna identifiera vilka paths som behöver scenarios
- Att kunna generera scenarios för saknade paths

---

## 🎯 Slutsats: Hur realistisk är planen?

### ✅ Realistiskt (80-90% kvalitet):

1. **Använda befintlig infrastruktur**
   - `buildBpmnProcessGraph()`, `ProcessTree`, `flattenToPaths()`
   - Fungerar redan, inga nya problem

2. **Identifiera end events (leaf nodes)**
   - Använder befintlig `flattenToPaths()`
   - Identifierar end events från paths

---

### ⚠️ Delvis realistiskt (60-70% kvalitet, kräver mer information):

1. **Använda Epic-dokumentation**
   - Behöver förstå hur epics kopplas till feature goals
   - Behöver förstå hur Epic user stories ska användas
   - **Kräver svar på frågor**

2. **Identifiera "saknade paths"**
   - Komplext att matcha scenarios mot paths
   - Men möjligt med befintlig infrastruktur

3. **Claude-generering**
   - Fungerar, men kvaliteten beror på Epic- och Feature Goal-koppling

---

### ❌ INTE realistiskt:

1. **Bygga ny flödesgraf** - Ignorerar befintlig infrastruktur
2. **Ignorera epics** - Epics är viktiga

---

## 💡 Rekommendation

### Vad vi bör göra:

1. ✅ **Använda befintlig infrastruktur**
   - `buildBpmnProcessGraph()`, `ProcessTree`, `flattenToPaths()`
   - **Inga nya problem**

2. ⚠️ **Förstå Epic- och Feature Goal-koppling**
   - Hur kopplas epics till feature goals?
   - Hur använder vi Epic user stories?
   - **Kräver svar på frågor**

3. ⚠️ **Identifiera "saknade paths" realistiskt**
   - Matcha befintliga scenarios mot paths
   - Identifiera gaps i coverage
   - **Möjligt, men komplext**

4. ⚠️ **Använda Epic- och Feature Goal-dokumentation**
   - Kombinera Epic user stories med Feature Goal user stories
   - Använd båda för Claude-generering
   - **Kvaliteten beror på Epic- och Feature Goal-koppling**

---

## ❓ Frågor som behöver svaras innan vi kan fortsätta

1. **Hur kopplas epics till feature goals?**
   - Är epics på process-nivå och feature goals på call activity-nivå?
   - Eller är epics och feature goals på samma nivå?
   - Hur vet vi vilka epics som hör till vilka feature goals?

2. **Hur använder vi Epic-dokumentation?**
   - Epics innehåller user stories - ska dessa användas i E2E-scenarios?
   - Hur kombineras Epic user stories med Feature Goal user stories?

3. **Vad menar vi med "saknad path"?**
   - En path som inte har ett E2E-scenario ännu?
   - Hur identifierar vi detta?

---

**Datum:** 2025-12-22
**Status:** Realistisk omvärdering klar - Behöver svar på frågor för att fortsätta

