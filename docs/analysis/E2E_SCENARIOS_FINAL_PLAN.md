# Final plan: Hur skapar vi bra E2E-scenarios (realistisk)

## 🎯 Syfte

Final, realistisk plan baserad på vad som redan finns och vad som faktiskt är möjligt.

---

## ✅ Vad vi HAR (befintlig infrastruktur)

### 1. `buildBpmnProcessGraph()` ✅
- Bygger komplett processgraf
- Hanterar hierarkier, subprocesser, call activities
- Fungerar redan, beprövad

### 2. `ProcessTree` ✅
- Bygger hierarkiskt träd från processgraf
- Används i appen för Process Explorer
- Fungerar redan, beprövad

### 3. `flattenToPaths()` ✅
- Flattenar träd till paths (varje path = en rad i Test Coverage Explorer)
- Identifierar Feature Goals (call activities) i paths
- Fungerar redan, används i Test Coverage Explorer

### 4. Epic-dokumentation ✅
- Redan genererad för leaf nodes (tasks/epics)
- Innehåller `userStories`, `flowSteps`, `prerequisites`
- Epics är INNE i Feature Goals (callActivities)

### 5. Feature Goal-dokumentation ✅
- Redan genererad för call activities (subprocesser)
- Innehåller `userStories`, `flowSteps`, `prerequisites`, `outputs`
- Feature Goals innehåller flera epics/tasks

---

## 📊 Förståelse: Epics vs Feature Goals

### Struktur:

```
Feature Goal (Call Activity)
  ├── Epic 1 (User Task / Service Task / Business Rule Task)
  │   ├── userStories
  │   ├── flowSteps
  │   └── prerequisites
  ├── Epic 2 (User Task / Service Task / Business Rule Task)
  │   ├── userStories
  │   ├── flowSteps
  │   └── prerequisites
  └── Epic 3 (User Task / Service Task / Business Rule Task)
      ├── userStories
      ├── flowSteps
      └── prerequisites
```

**Epics:**
- Leaf nodes (tasks/epics) - de faktiska aktiviteterna
- User Tasks, Service Tasks, Business Rule Tasks
- Innehåller `userStories`, `flowSteps`, `prerequisites`

**Feature Goals:**
- Call Activities (subprocesser) - högre nivå
- Innehåller flera epics/tasks
- Innehåller `userStories`, `flowSteps`, `prerequisites`, `outputs`

**Koppling:**
- Feature Goals innehåller epics
- Epic user stories kan användas för att förbättra E2E-scenarios
- Feature Goal user stories är på högre nivå (subprocess-nivå)

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
const allPaths = flattenToPaths(tree.root, [], undefined);
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

### Steg 3: Identifiera "saknade paths" ⚠️

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
    .map(node => node.bpmnElementId)
    .filter(Boolean);
  
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

### Steg 4: Läsa Epic- och Feature Goal-dokumentation ✅

**Vad vi gör:**
1. **Läs Feature Goal-dokumentation** (redan genererad för call activities)
   - `summary`, `flowSteps`, `userStories`, `prerequisites`, `outputs`

2. **Läs Epic-dokumentation** (redan genererad för leaf nodes)
   - `summary`, `flowSteps`, `userStories`, `prerequisites`
   - Epics är INNE i Feature Goals

3. **Kombinera Epic- och Feature Goal-dokumentation:**
   - Feature Goal-dokumentation ger högre nivå (subprocess-nivå)
   - Epic-dokumentation ger detaljnivå (task-nivå)
   - Båda är relevanta för E2E-scenarios

**Implementation:**
```typescript
// Läs Feature Goal-dokumentation (för call activities)
const featureGoalDocs = await loadFeatureGoalDocs(callActivityIds);

// Läs Epic-dokumentation (för leaf nodes i Feature Goals)
const epicDocs = await loadEpicDocs(epicIds);

// Kombinera:
// - Feature Goal-dokumentation ger subprocess-kontext
// - Epic-dokumentation ger task-detaljer
```

**Kvalitet:** 80-90% (dokumentation är redan genererad, bara att läsa)

---

### Steg 5: Använda Claude för att generera E2E-scenarios ⚠️

**Vad vi gör:**
1. **För varje saknad path**, skicka till Claude:
   - Path-struktur (Feature Goals, gateway-conditions)
   - Feature Goal-dokumentation (subprocess-nivå)
   - Epic-dokumentation (task-nivå, INNE i Feature Goals)
   - BPMN process-information

2. **Claude genererar:**
   - `name`, `summary`, `given`, `when`, `then`
   - `bankProjectTestSteps` (med `action`, `assertion`, delvis `uiInteraction`, `dmnDecision`, `backendState`)
   - `subprocessSteps` (med `description`, `given`, `when`, `then`)

**Input till Claude:**
```typescript
{
  path: {
    startEvent: "Event_0isinbn",
    endEvent: "Event_0j4buhs",
    featureGoals: [
      {
        id: "application",
        // Feature Goal-dokumentation (subprocess-nivå)
        summary: "Intern datainsamling säkerställer...",
        flowSteps: ["Systemet initierar automatiskt insamling..."],
        userStories: [
          {
            role: "Kund",
            goal: "Jag vill fylla i ansökan",
            acceptanceCriteria: "Ansökan är komplett..."
          }
        ],
        prerequisites: ["Kund är identifierad"],
        outputs: ["Application.status = 'COMPLETE'"],
        // Epic-dokumentation (task-nivå, INNE i Feature Goal)
        epics: [
          {
            id: "fetch-party-information",
            summary: "Hämtar kundinformation",
            flowSteps: ["ServiceTask hämtar kundinformation från API"],
            userStories: [
              {
                role: "System",
                goal: "Hämta kundinformation",
                acceptanceCriteria: "Kundinformation är hämtad"
              }
            ]
          }
        ]
      }
    ],
    gatewayConditions: [
      {
        gatewayId: "Gateway_0fhav15",
        gatewayName: "KALP OK?",
        condition: "${creditDecision.approved === true}"
      }
    ]
  }
}
```

**Kvalitet:** 70-80% (hög kvalitet, men saknar vissa detaljer)

---

## 🎯 Realistisk bedömning

### ✅ Realistiskt (80-90% kvalitet):

1. **Använda befintlig infrastruktur**
   - `buildBpmnProcessGraph()`, `ProcessTree`, `flattenToPaths()`
   - Fungerar redan, inga nya problem

2. **Identifiera end events (leaf nodes)**
   - Använder befintlig `flattenToPaths()`
   - Identifierar end events från paths

3. **Läsa Epic- och Feature Goal-dokumentation**
   - Dokumentation är redan genererad
   - Bara att läsa och kombinera

---

### ⚠️ Delvis realistiskt (70-80% kvalitet):

1. **Identifiera "saknade paths"**
   - Komplext att matcha scenarios mot paths
   - Men möjligt med befintlig infrastruktur

2. **Claude-generering**
   - Fungerar, men kvaliteten beror på Epic- och Feature Goal-kombination
   - Saknar API-endpoints, UI-selectors (kräver komplettering)

---

### ❌ INTE realistiskt:

1. **Bygga ny flödesgraf** - Ignorerar befintlig infrastruktur
2. **Ignorera epics** - Epics är viktiga och INNE i Feature Goals

---

## 💡 Slutsats: Hur realistisk är planen?

### ✅ Realistiskt (80-90% kvalitet):

1. **Använda befintlig infrastruktur** ✅
   - `buildBpmnProcessGraph()`, `ProcessTree`, `flattenToPaths()`
   - Fungerar redan, inga nya problem

2. **Identifiera end events (leaf nodes)** ✅
   - Använder befintlig `flattenToPaths()`
   - Identifierar end events från paths

3. **Läsa Epic- och Feature Goal-dokumentation** ✅
   - Dokumentation är redan genererad
   - Bara att läsa och kombinera

---

### ⚠️ Delvis realistiskt (70-80% kvalitet):

1. **Identifiera "saknade paths"** ⚠️
   - Komplext att matcha scenarios mot paths
   - Men möjligt med befintlig infrastruktur

2. **Claude-generering** ⚠️
   - Fungerar, men kvaliteten beror på Epic- och Feature Goal-kombination
   - Saknar API-endpoints, UI-selectors (kräver komplettering)

---

### ❌ INTE realistiskt:

1. **Bygga ny flödesgraf** ❌
   - Ignorerar befintlig infrastruktur
   - Skapar nya problem

2. **Ignorera epics** ❌
   - Epics är viktiga och INNE i Feature Goals
   - Innehåller relevant information

---

## 🎯 Final rekommendation

### Vad vi bör göra:

1. ✅ **Använda befintlig infrastruktur**
   - `buildBpmnProcessGraph()`, `ProcessTree`, `flattenToPaths()`
   - **Inga nya problem**

2. ✅ **Identifiera end events (leaf nodes)**
   - Använd befintlig `flattenToPaths()`
   - Identifiera end events från paths

3. ✅ **Läsa Epic- och Feature Goal-dokumentation**
   - Dokumentation är redan genererad
   - Kombinera Epic- och Feature Goal-dokumentation

4. ⚠️ **Identifiera "saknade paths"**
   - Matcha befintliga scenarios mot paths
   - Identifiera gaps i coverage
   - **Möjligt, men komplext**

5. ⚠️ **Använda Claude för att generera E2E-scenarios**
   - Kombinera Epic- och Feature Goal-dokumentation
   - Generera scenarios med Claude
   - **Kvaliteten beror på Epic- och Feature Goal-kombination**

---

## 📊 Sammanfattning: Realistisk plan

### ✅ Vad fungerar (80-90% kvalitet):

1. **Använda befintlig infrastruktur** ✅
2. **Identifiera end events (leaf nodes)** ✅
3. **Läsa Epic- och Feature Goal-dokumentation** ✅

### ⚠️ Vad fungerar delvis (70-80% kvalitet):

1. **Identifiera "saknade paths"** ⚠️
2. **Claude-generering** ⚠️

### ❌ Vad fungerar INTE:

1. **Bygga ny flödesgraf** ❌
2. **Ignorera epics** ❌

---

**Datum:** 2025-12-22
**Status:** Final plan klar - Realistisk approach baserad på befintlig infrastruktur







