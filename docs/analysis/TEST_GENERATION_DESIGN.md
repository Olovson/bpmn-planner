# Design: Testfall-generering från User Stories + BPMN-processflöde

## 🎯 Syfte

Designa en lösning för att generera testfall baserat på:
1. **User stories med acceptanskriterier** (från Epic/Feature Goal dokumentation)
2. **BPMN-processflöde** (sequence flows, nodtyper, error events)

---

## 🏗️ Arkitektur

### Översikt

```
┌─────────────────────────────────────────────────────────────┐
│                    Dokumentationsgenerering                  │
│  (Epic/Feature Goal med User Stories)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              User Story Extractor                            │
│  - Extraherar user stories från dokumentation               │
│  - Kopplar till BPMN-noder                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         User Story → Test Scenario Converter                 │
│  - Konverterar user stories till testfall                   │
│  - Bestämmer typ (happy-path/edge-case/error-case)          │
│  - Skapar Given/When/Then format                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BPMN Process Graph                        │
│  (Sequence flows, nodtyper, error events)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Process Flow Test Generator                          │
│  - Genererar happy path-scenarios                           │
│  - Genererar error path-scenarios                           │
│  - Skapar steg-för-steg testfall                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Test Scenario Aggregator                        │
│  - Kombinerar user story-scenarios                          │
│  - Kombinerar process flow-scenarios                        │
│  - Deduplicerar och prioriterar                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           node_planned_scenarios (Database)                   │
│  - Sparar scenarios med origin: 'llm-doc'                    │
│  - Sparar scenarios med origin: 'spec-parsed'               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Datastrukturer

### 1. ExtractedUserStory

```typescript
export interface ExtractedUserStory {
  // User story data
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare';
  goal: string;
  value: string;
  acceptanceCriteria: string[];
  
  // Koppling till BPMN
  bpmnFile: string;
  bpmnElementId: string;
  
  // Koppling till dokumentation
  docType: 'epic' | 'feature-goal';
  docContext?: {
    epicId?: string;
    featureGoalId?: string;
  };
  
  // Metadata
  extractedAt: Date;
  source: 'epic-doc' | 'feature-goal-doc';
}
```

**Designbeslut:**
- Separera user story-data från BPMN-koppling
- Inkludera metadata för spårbarhet
- Stöd både Epic och Feature Goal som källor

---

### 2. UserStoryTestScenario

```typescript
export interface UserStoryTestScenario {
  // Test scenario data
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'edge-case' | 'error-case';
  
  // Test steps (Given/When/Then format)
  steps: {
    given?: string[];
    when: string[];
    then: string[];
  };
  
  // Expected result
  expectedResult: string;
  
  // Acceptance criteria (som assertions)
  acceptanceCriteria: string[];
  
  // Source tracking
  source: 'user-story';
  userStoryId: string;
  userStoryRole: 'Kund' | 'Handläggare' | 'Processägare';
  
  // Priority (baserat på user story)
  priority?: 'P0' | 'P1' | 'P2';
}
```

**Designbeslut:**
- Strukturerad Given/When/Then format
- Separera steps i given/when/then
- Inkludera acceptanskriterier som assertions
- Prioritering baserat på user story-roll

---

### 3. ProcessFlowTestScenario

```typescript
export interface ProcessFlowTestScenario {
  // Test scenario data
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'error-case';
  
  // Process flow steps
  steps: ProcessFlowTestStep[];
  
  // Expected result
  expectedResult: string;
  
  // Source tracking
  source: 'bpmn-process-flow';
  bpmnFile: string;
  processId: string;
  
  // Flow metadata
  flowType: 'happy-path' | 'error-path';
  pathNodes: string[]; // Node IDs i ordning
}

export interface ProcessFlowTestStep {
  order: number;
  nodeId: string;
  nodeType: BpmnNodeType;
  nodeName: string;
  
  // Action description
  action: string;
  
  // Expected result
  expectedResult: string;
  
  // Gateway conditions (om gateway)
  condition?: {
    gatewayId: string;
    conditionName: string; // "Yes" eller "No"
    conditionValue: boolean;
  };
  
  // Error event (om error)
  errorEvent?: {
    errorCode: string;
    errorName: string;
  };
}
```

**Designbeslut:**
- Steg-för-steg genom processen
- Separera gateway conditions och error events
- Spåra hela path för debugging
- Stöd både happy path och error path

---

### 4. AggregatedTestScenario

```typescript
export interface AggregatedTestScenario {
  // Combined test scenario
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'edge-case' | 'error-case';
  
  // Combined steps
  steps: TestStep[];
  
  // Expected result
  expectedResult: string;
  
  // Sources (kan ha flera källor)
  sources: {
    userStory?: {
      id: string;
      role: string;
    };
    processFlow?: {
      bpmnFile: string;
      processId: string;
    };
  };
  
  // Priority (högsta från källor)
  priority: 'P0' | 'P1' | 'P2';
  
  // Origin for database
  origin: 'llm-doc' | 'spec-parsed' | 'combined';
}
```

**Designbeslut:**
- Kombinera user story och process flow-scenarios
- Behålla spårbarhet till källor
- Prioritera baserat på källor
- Stöd combined origin för scenarios som kommer från båda

---

## 🔄 Dataflöden

### Flöde 1: User Story → Test Scenario

```
1. Dokumentation genereras (Epic/Feature Goal)
   ↓
2. User stories extraheras från dokumentation
   ↓
3. User stories kopplas till BPMN-noder
   ↓
4. User stories konverteras till testfall
   - Bestämmer typ baserat på acceptanskriterier
   - Skapar Given/When/Then format
   ↓
5. Testfall sparas till node_planned_scenarios
   - origin: 'llm-doc'
   - provider: 'claude' (eller annan LLM-provider)
```

**Designbeslut:**
- Extraktion sker efter dokumentationsgenerering
- Koppling till BPMN-noder baserat på kontext
- Konvertering sker omedelbart efter extraktion
- Sparning sker asynkront för att inte blockera dokumentationsgenerering

---

### Flöde 2: BPMN Process Flow → Test Scenario

```
1. BPMN-fil processas
   ↓
2. Processgraf byggs (BpmnProcessGraph)
   ↓
3. Process flow-scenarios genereras
   - Identifierar happy paths
   - Identifierar error paths
   ↓
4. Testfall skapas för varje path
   - Steg-för-steg genom processen
   ↓
5. Testfall sparas till node_planned_scenarios
   - origin: 'spec-parsed'
   - provider: 'claude' (default)
```

**Designbeslut:**
- Generering sker när BPMN-fil processas
- Separera happy paths och error paths
- Generera ett testfall per path
- Sparning sker asynkront

---

### Flöde 3: Aggregation och Deduplicering

```
1. User story-scenarios hämtas från databas
   ↓
2. Process flow-scenarios hämtas från databas
   ↓
3. Scenarios aggregeras per BPMN-nod
   ↓
4. Deduplicering sker
   - Samma scenario från olika källor → kombinera
   - Liknande scenarios → behåll båda med prioritering
   ↓
5. Aggregerade scenarios visas i UI
```

**Designbeslut:**
- Aggregering sker vid visning, inte vid generering
- Deduplicering baserat på innehåll, inte ID
- Behålla spårbarhet till källor
- Prioritera user story-scenarios över process flow-scenarios

---

## 🎨 Designbeslut

### Beslut 1: När ska testfall genereras?

**Alternativ A:** Under dokumentationsgenerering (synkront)
- ✅ Testfall genereras direkt när dokumentation genereras
- ❌ Kan blockera dokumentationsgenerering
- ❌ Om dokumentation misslyckas, genereras inga testfall

**Alternativ B:** Efter dokumentationsgenerering (asynkront)
- ✅ Blockar inte dokumentationsgenerering
- ✅ Kan retry om generering misslyckas
- ❌ Testfall kan vara försenade

**Val:** **Alternativ B** - Asynkront efter dokumentationsgenerering
- Använd event-baserad arkitektur
- Generera testfall i bakgrunden
- Retry-logik för misslyckade genereringar

---

### Beslut 2: Hur kopplar vi user stories till BPMN-noder?

**Alternativ A:** Baserat på dokumentationskontext
- ✅ Enkel implementation
- ❌ Kan vara felaktig om kontext är otydlig

**Alternativ B:** Baserat på explicit mapping i dokumentation
- ✅ Tydlig koppling
- ❌ Kräver ändringar i dokumentationsformat

**Alternativ C:** Baserat på namn-matchning
- ✅ Ingen ändring i dokumentation
- ❌ Kan vara felaktig vid namnändringar

**Val:** **Alternativ A + C** - Kombinera kontext och namn-matchning
- Först försök med kontext (Epic/Feature Goal → BPMN-nod)
- Fallback till namn-matchning
- Logga varningar vid osäker koppling

---

### Beslut 3: Hur bestämmer vi testfall-typ?

**Alternativ A:** Baserat på acceptanskriterier (textanalys)
- ✅ Enkel implementation
- ❌ Kan vara felaktig vid otydlig text

**Alternativ B:** Baserat på explicit typ i user story
- ✅ Tydlig typ
- ❌ Kräver ändringar i user story-format

**Alternativ C:** Baserat på BPMN error events
- ✅ Korrekt för error cases
- ❌ Fungerar bara för error cases

**Val:** **Alternativ A + C** - Kombinera textanalys och BPMN
- Textanalys av acceptanskriterier för happy-path/edge-case
- BPMN error events för error-case
- Default till happy-path om osäker

---

### Beslut 4: Hur kombinerar vi user story och process flow-scenarios?

**Alternativ A:** Separata scenarios (ingen kombination)
- ✅ Enkel implementation
- ❌ Kan vara duplicerade scenarios

**Alternativ B:** Kombinera scenarios (merge)
- ✅ Färre dupliceringar
- ❌ Komplex implementation

**Alternativ C:** Prioritera user story-scenarios
- ✅ User story-scenarios är mer detaljerade
- ❌ Process flow-scenarios kan försvinna

**Val:** **Alternativ C** - Prioritera user story-scenarios
- User story-scenarios prioriteras över process flow-scenarios
- Process flow-scenarios används som fallback
- Kombinera endast om scenarios är identiska

---

### Beslut 5: Var sparas testfall?

**Alternativ A:** Endast i `node_planned_scenarios`
- ✅ Enkel implementation
- ✅ Konsistent med befintlig struktur

**Alternativ B:** Separata tabeller för user story och process flow
- ✅ Tydlig separation
- ❌ Mer komplex databasstruktur

**Val:** **Alternativ A** - Endast i `node_planned_scenarios`
- Använd `origin` för att skilja källor
- `origin: 'llm-doc'` för user story-scenarios
- `origin: 'spec-parsed'` för process flow-scenarios

---

## 🔌 Integration med befintligt system

### Integration 1: Dokumentationsgenerering

```typescript
// I bpmnGenerators.ts, efter dokumentationsgenerering:

async function generateDocumentationForNode(...) {
  // ... befintlig kod ...
  
  // Generera dokumentation
  const doc = await renderEpicDoc(...);
  
  // Nya: Extrahera och generera testfall (asynkront)
  generateTestScenariosFromDocumentation(node, doc)
    .catch(error => {
      console.warn('Failed to generate test scenarios:', error);
      // Inte kasta fel - testfall är optional
    });
  
  return doc;
}
```

**Designbeslut:**
- Asynkront för att inte blockera dokumentationsgenerering
- Fel hanteras gracefully (warnings, inte errors)
- Testfall är optional, dokumentation är required

---

### Integration 2: BPMN-processering

```typescript
// I bpmnGenerators.ts, när BPMN-fil processas:

async function processBpmnFile(bpmnFile: string) {
  // ... befintlig kod ...
  
  // Bygg processgraf
  const graph = await buildBpmnProcessGraph(...);
  
  // Nya: Generera process flow-scenarios (asynkront)
  generateProcessFlowScenarios(graph)
    .catch(error => {
      console.warn('Failed to generate process flow scenarios:', error);
      // Inte kasta fel - testfall är optional
    });
  
  return graph;
}
```

**Designbeslut:**
- Asynkront för att inte blockera BPMN-processering
- Fel hanteras gracefully
- Testfall är optional

---

### Integration 3: UI-visning

```typescript
// I TestReport.tsx, när scenarios visas:

const { variants } = useNodePlannedScenarios({
  bpmnFile,
  elementId
});

// Aggregera scenarios från olika källor
const aggregatedScenarios = useMemo(() => {
  const userStoryScenarios = variants
    .filter(v => v.origin === 'llm-doc')
    .flatMap(v => v.scenarios);
  
  const processFlowScenarios = variants
    .filter(v => v.origin === 'spec-parsed')
    .flatMap(v => v.scenarios);
  
  // Prioritera user story-scenarios
  return prioritizeAndDeduplicate(
    userStoryScenarios,
    processFlowScenarios
  );
}, [variants]);
```

**Designbeslut:**
- Använd befintlig `useNodePlannedScenarios` hook
- Aggregera scenarios i UI-komponenten
- Prioritera user story-scenarios

---

## 🎯 Skillnader från implementeringsplan

### Skillnad 1: Asynkron generering
**Design:** Testfall genereras asynkront efter dokumentationsgenerering
**Implementeringsplan:** Synkron generering under dokumentationsgenerering

**Varför:** Asynkron är bättre för att inte blockera dokumentationsgenerering

---

### Skillnad 2: Aggregering i UI
**Design:** Aggregering och deduplicering sker i UI-komponenten
**Implementeringsplan:** Aggregering sker i backend/service

**Varför:** UI-aggregering är enklare och ger mer flexibilitet

---

### Skillnad 3: Event-baserad arkitektur
**Design:** Event-baserad för asynkron generering
**Implementeringsplan:** Direkta funktionsanrop

**Varför:** Event-baserad är bättre för asynkron processing

---

### Skillnad 4: Datastrukturer
**Design:** Separata interfaces för UserStoryTestScenario och ProcessFlowTestScenario
**Implementeringsplan:** Gemensam TestScenario interface

**Varför:** Separata interfaces ger bättre typsäkerhet och flexibilitet

---

### Skillnad 5: Koppling user stories till BPMN
**Design:** Kombinera kontext och namn-matchning
**Implementeringsplan:** Endast kontext

**Varför:** Kombinera ger bättre träffsäkerhet

---

## 📋 Sammanfattning

### Designprinciper:

1. **Asynkron processing** - Blockar inte dokumentationsgenerering
2. **Graceful degradation** - Testfall är optional, fel hanteras gracefully
3. **Spårbarhet** - Behåll koppling till källor (user story, process flow)
4. **Prioritering** - User story-scenarios prioriteras över process flow-scenarios
5. **Flexibilitet** - Stöd både Epic och Feature Goal som källor

### Datastrukturer:

1. **ExtractedUserStory** - User story med BPMN-koppling
2. **UserStoryTestScenario** - Testfall från user story
3. **ProcessFlowTestScenario** - Testfall från BPMN-processflöde
4. **AggregatedTestScenario** - Kombinerat testfall

### Integration:

1. **Dokumentationsgenerering** - Asynkron testfall-generering efter dokumentation
2. **BPMN-processering** - Asynkron process flow-generering
3. **UI-visning** - Aggregering och prioritering i UI

---

**Datum:** 2025-12-22
**Status:** Design klar







