# Analys: Testinformation generering

**Datum:** 2025-12-22  
**Status:** ⚠️ Flera problem identifierade

## Sammanfattning

Analys av hur testinformation genereras i appen visar flera problem och inkonsekvenser mellan olika system.

## Vad som finns

### 1. Testfiler i Storage (`testGenerators.ts`)
- ✅ `generateTestsForFile()` - genererar testfiler (.spec.ts) för varje nod
- ✅ `generateTestSpecWithLlm()` - genererar test scenarios via LLM
- ✅ Sparar testfiler i Storage: `tests/{bpmnFile}/{elementId}.spec.ts`
- ✅ Skapar länkar i `node_test_links` tabell
- ✅ Används separat från dokumentationsgenerering

### 2. Planned scenarios i database (`node_planned_scenarios`)
- ✅ `savePlannedScenarios()` - sparar scenarios till databasen
- ✅ `createPlannedScenariosFromGraph()` - skapar fallback-scenarios från `testMapping`
- ✅ Används i dokumentationen för att visa testscenarios

### 3. Scenarios från dokumentation (funktioner finns men används INTE)
- ⚠️ `buildScenariosFromEpicUserStories()` - extraherar scenarios från Epic user stories
- ⚠️ `buildScenariosFromDocJson()` - anropar `buildScenariosFromEpicUserStories()` för epics
- ❌ **PROBLEM:** Dessa funktioner anropas ALDRIG!
- ❌ **PROBLEM:** Scenarios från dokumentationen sparas INTE till `node_planned_scenarios`

## Identifierade problem

### 1. Scenarios från dokumentation sparas inte

**Problem:**
- `buildScenariosFromEpicUserStories()` och `buildScenariosFromDocJson()` finns men anropas aldrig
- Kommentaren säger "Testscenarion (scenarios) genereras inte längre i dokumentationssteget"
- Men funktionerna finns kvar och det finns ingen tydlig dokumentation om vad som faktiskt händer

**Påverkan:**
- Epic user stories genereras i dokumentationen, men scenarios extraheras inte och sparas inte
- `node_planned_scenarios` får bara fallback-scenarios från `testMapping` eller "happy path"
- Testinformation från dokumentationen går förlorad

**Kod:**
- `src/lib/bpmnGenerators.ts` rad 856-926: Funktionerna finns men används inte
- `src/lib/bpmnGenerators.ts` rad 2321: Kommentar säger "Testscenarion genereras inte längre"

### 2. Två separata system som inte samverkar

**Problem:**
- **System 1:** Testfiler i Storage (`testGenerators.ts`)
  - Genererar testfiler (.spec.ts) med LLM-scenarios
  - Sparar länkar i `node_test_links`
  - Används separat från dokumentation

- **System 2:** Planned scenarios i database (`node_planned_scenarios`)
  - Sparar scenarios för visning i dokumentationen
  - Får bara fallback-scenarios från `testMapping`
  - Används i dokumentationen för att visa testscenarios

**Påverkan:**
- Testfiler har LLM-genererade scenarios, men dessa sparas inte i `node_planned_scenarios`
- Dokumentationen visar bara fallback-scenarios, inte LLM-genererade
- Ingen koppling mellan testfiler och planned scenarios

### 3. `createPlannedScenariosFromGraph()` returnerar tom array (KRITISK BUGG)

**Problem:**
- `createPlannedScenariosFromGraph()` i `plannedScenariosHelper.ts` (rad 96-151)
- Funktionen skapar `scenarios` array (rad 129-144) men pushar dem ALDRIG till `rows` array!
- Funktionen returnerar tom `rows` array (rad 150)
- Detta är en tydlig bugg - scenarios skapas men sparas aldrig

**Påverkan:**
- Inga fallback-scenarios sparas från `testMapping`
- `savePlannedScenarios()` får tom array och sparar ingenting
- Kommentaren säger "legacy - används inte längre" men funktionen anropas fortfarande (rad 1649 i `bpmnGenerators.ts`)

**Kod:**
- `src/lib/plannedScenariosHelper.ts` rad 96-151: Funktionen skapar scenarios men saknar `rows.push()` efter rad 144
- **Fix:** Lägg till `rows.push()` med korrekt `PlannedScenarioRow` struktur

### 4. Testgenerering använder inte dokumentation

**Problem:**
- `generateTestsForFile()` i `testGenerators.ts` genererar testfiler
- Använder `generateTestSpecWithLlm()` för att generera scenarios via LLM
- Men använder INTE scenarios från dokumentationen (user stories)

**Påverkan:**
- Testfiler genereras med LLM-scenarios, men dessa är separata från dokumentationen
- Ingen koppling mellan Epic user stories och testscenarios
- Potentiell inkonsistens mellan dokumentation och tester

### 5. Origin-typ är oklar

**Problem:**
- `PlannedScenarioRow` har `origin: 'design' | 'llm-doc' | 'spec-parsed'`
- Men `createPlannedScenariosFromGraph()` sätter aldrig `origin` (returnerar tom array)
- `buildScenariosFromEpicUserStories()` skulle kunna använda `origin: 'llm-doc'` men anropas aldrig

**Påverkan:**
- Oklart var scenarios kommer ifrån
- Svårt att spåra ursprung av testinformation

## Nuvarande flöde

### Dokumentationsgenerering:
1. `generateAllFromBpmnWithGraph()` genererar dokumentation
2. `createPlannedScenariosFromGraph()` anropas (rad 1649) men returnerar tom array
3. `savePlannedScenarios()` får tom array och sparar ingenting
4. Epic user stories genereras i dokumentationen, men scenarios extraheras inte

### Testgenerering:
1. `generateTestsForFile()` anropas separat
2. `generateTestSpecWithLlm()` genererar scenarios via LLM
3. Testfiler sparas i Storage
4. Länkar sparas i `node_test_links`
5. Men scenarios sparas INTE i `node_planned_scenarios`

## Förväntat flöde

### Dokumentationsgenerering:
1. Generera dokumentation med Epic user stories
2. Extrahera scenarios från user stories (`buildScenariosFromEpicUserStories()`)
3. Spara scenarios till `node_planned_scenarios` med `origin: 'llm-doc'`
4. Använd scenarios i dokumentationen för att visa testinformation

### Testgenerering:
1. Generera testfiler med LLM-scenarios
2. Spara testfiler i Storage
3. Spara länkar i `node_test_links`
4. **Alternativt:** Använd scenarios från `node_planned_scenarios` istället för att generera nya via LLM

## Rekommenderade förbättringar

### Prioritet 1: Fixa `createPlannedScenariosFromGraph()` (KRITISK BUGG)
- **Problem:** Funktionen skapar scenarios men pushar dem aldrig till `rows` array
- **Fix:** Lägg till `rows.push()` efter rad 144 med korrekt struktur:
  ```typescript
  rows.push({
    bpmn_file: node.bpmnFile,
    bpmn_element_id: node.bpmnElementId,
    provider: 'claude', // eller bestäm provider baserat på kontext
    origin: 'design', // fallback-scenarios från testMapping
    scenarios: scenarios,
  });
  ```
- **Plats:** `src/lib/plannedScenariosHelper.ts` rad 144-148

### Prioritet 2: Spara scenarios från dokumentationen
- Anropa `buildScenariosFromDocJson()` när Epic-dokumentation genereras
- Spara scenarios till `node_planned_scenarios` med `origin: 'llm-doc'`
- Använd `scenarioProvider` från LLM-generering

### Prioritet 3: Koppla testgenerering till dokumentationen
- Använd scenarios från `node_planned_scenarios` i testgenerering
- Eller: Spara LLM-genererade scenarios från testgenerering till `node_planned_scenarios`
- Säkerställ konsistens mellan dokumentation och tester

### Prioritet 4: Tydliggöra origin-typ
- Sätt korrekt `origin` när scenarios sparas:
  - `'llm-doc'` för scenarios från dokumentationen
  - `'spec-parsed'` för scenarios från testfiler
  - `'design'` för manuellt skapade scenarios

## Test-scenarion att validera

1. **Epic genereras:**
   - User stories ska finnas i dokumentationen
   - Scenarios ska extraheras från user stories
   - Scenarios ska sparas i `node_planned_scenarios` med `origin: 'llm-doc'`

2. **Testfiler genereras:**
   - Testfiler ska skapas i Storage
   - Länkar ska sparas i `node_test_links`
   - Scenarios ska antingen komma från `node_planned_scenarios` eller genereras via LLM

3. **Dokumentation visar testinformation:**
   - Dokumentationen ska hämta scenarios från `node_planned_scenarios`
   - Scenarios ska visas korrekt i dokumentationen

4. **Konsistens:**
   - Scenarios i dokumentationen ska matcha scenarios i testfilerna
   - Eller: Det ska finnas tydlig koppling mellan dem
