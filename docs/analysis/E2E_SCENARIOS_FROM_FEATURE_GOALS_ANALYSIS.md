# Analys: E2E-scenarios från Feature Goals

## 🎯 Syfte

Analysera hur E2E-scenarios skulle genereras från Feature Goals och hur de kopplas till Feature Goals i systemet.

---

## 📊 Vad är en Feature Goal?

En **Feature Goal** är dokumentation för en **Call Activity** i BPMN. Den beskriver:
- **Vad** subprocessen gör (summary)
- **Hur** den fungerar (flowSteps)
- **Vem** som drar nytta (userStories)
- **Vad** den behöver (prerequisites, dependencies)
- **Vad** den producerar (outputs)

**Exempel Feature Goal:**
```json
{
  "summary": "Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut.",
  "prerequisites": [
    "Triggas normalt efter att en kreditansökan har registrerats i systemet.",
    "Förutsätter att grundläggande kund- och ansökningsdata är validerade."
  ],
  "flowSteps": [
    "Processen startar när en kreditansökan har registrerats i systemet.",
    "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata från relevanta källor.",
    "Den insamlade datan kvalitetssäkras och valideras mot förväntade format och regler.",
    "Data berikas med metadata och flaggor som är relevanta för kreditbedömning.",
    "Resultaten görs tillgängliga för efterföljande steg i kreditprocessen."
  ],
  "userStories": [
    {
      "id": "US-1",
      "role": "Handläggare",
      "goal": "få automatiskt insamlad intern kunddata",
      "value": "jag kan spara tid och minska manuellt arbete",
      "acceptanceCriteria": [
        "Systemet hämtar intern kunddata automatiskt",
        "Data kvalitetssäkras och valideras",
        "Resultaten är tillgängliga för kreditbedömning"
      ]
    }
  ]
}
```

---

## 🔄 Vad är en E2E-scenario?

En **E2E-scenario** (End-to-End scenario) är ett testfall som:
- **Testar hela flödet** från start till slut
- **Spänner över flera Feature Goals** (subprocesser)
- **Inkluderar användarinteraktioner** (UI, API, DMN)
- **Verifierar affärsresultat** (not just technical)

**Exempel E2E-scenario:**
```typescript
{
  id: "e2e-1",
  name: "Köp bostadsrätt - Happy Path",
  type: "happy-path",
  priority: "P0",
  bpmnProcess: "mortgage-se-application.bpmn",
  featureGoals: [
    "internal-data-gathering",
    "external-data-gathering",
    "credit-decision"
  ],
  steps: [
    {
      order: 1,
      featureGoal: "internal-data-gathering",
      action: "Systemet hämtar intern kunddata automatiskt",
      assertion: "Intern kunddata är hämtad och kvalitetssäkrad"
    },
    {
      order: 2,
      featureGoal: "external-data-gathering",
      action: "Systemet hämtar extern kreditdata från UC",
      assertion: "Extern kreditdata är hämtad och validerad"
    },
    {
      order: 3,
      featureGoal: "credit-decision",
      action: "Systemet fattar kreditbeslut baserat på insamlad data",
      assertion: "Kreditbeslut är fattat och tillgängligt"
    }
  ]
}
```

---

## 🔗 Hur kopplas E2E-scenarios till Feature Goals?

### 1. Feature Goals är byggstenar för E2E-scenarios

**E2E-scenarios byggs från Feature Goals:**
- Varje Feature Goal representerar en **delprocess** i ett större flöde
- E2E-scenarios kombinerar flera Feature Goals till ett **komplett flöde**
- Feature Goals ger **kontext** för vad som händer i varje steg

**Exempel:**
```
E2E-scenario: "Köp bostadsrätt - Happy Path"
  ├─ Feature Goal 1: "internal-data-gathering"
  │   └─ flowSteps: ["Systemet hämtar intern kunddata", "Data kvalitetssäkras"]
  ├─ Feature Goal 2: "external-data-gathering"
  │   └─ flowSteps: ["Systemet hämtar extern kreditdata", "Data valideras"]
  └─ Feature Goal 3: "credit-decision"
      └─ flowSteps: ["Systemet fattar kreditbeslut", "Beslut sparas"]
```

---

### 2. Feature Goals ger kontext för E2E-steg

**Varje steg i en E2E-scenario kan mappas till:**
- **Feature Goal** (vilken subprocess)
- **flowSteps** från Feature Goal (vad som händer)
- **userStories** från Feature Goal (vem som drar nytta)
- **prerequisites** från Feature Goal (vad som behövs)
- **dependencies** från Feature Goal (vad som används)

**Exempel:**
```typescript
{
  order: 1,
  featureGoal: "internal-data-gathering",
  featureGoalSummary: "Intern datainsamling säkerställer att intern kunddata hämtas...",
  featureGoalFlowSteps: [
    "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata",
    "Den insamlade datan kvalitetssäkras och valideras"
  ],
  action: "Systemet hämtar intern kunddata automatiskt", // Från flowSteps
  assertion: "Intern kunddata är hämtad och kvalitetssäkrad", // Från userStories acceptanceCriteria
  prerequisites: [
    "Kreditansökan har registrerats i systemet",
    "Grundläggande kund- och ansökningsdata är validerade"
  ]
}
```

---

### 3. Feature Goals ger testdata-referenser

**Feature Goals kan innehålla:**
- **Testdata-referenser** (vilka testdata som ska användas)
- **Implementation mapping** (vilka API-endpoints, UI-routes, DMN-tabeller som används)

**Exempel:**
```typescript
{
  featureGoal: "internal-data-gathering",
  testDataReferences: [
    {
      id: "internal-data-gathering-standard",
      description: "Standard testdata för intern datainsamling"
    }
  ],
  implementationMapping: [
    {
      activity: "Fetch party information",
      type: "API",
      route: "/api/party-information",
      method: "GET",
      baseUrl: "https://internal-api.example.com"
    }
  ]
}
```

---

## 🎯 Hur skulle E2E-scenarios genereras från Feature Goals?

### Steg 1: Identifiera Feature Goals i BPMN-processen

**Input:**
- BPMN-processfil (t.ex. `mortgage-se-application.bpmn`)
- Feature Goal-dokumentation (från Supabase Storage)

**Process:**
1. **Parsa BPMN-filen** för att hitta Call Activities
2. **Läs Feature Goal-dokumentation** för varje Call Activity
3. **Bygg en graf** av Feature Goals och deras relationer

**Output:**
```typescript
{
  bpmnProcess: "mortgage-se-application.bpmn",
  featureGoals: [
    {
      callActivityId: "internal-data-gathering",
      featureGoalDoc: { ... }, // Från Supabase Storage
      prerequisites: [...],
      flowSteps: [...],
      userStories: [...]
    },
    {
      callActivityId: "external-data-gathering",
      featureGoalDoc: { ... },
      prerequisites: [...],
      flowSteps: [...],
      userStories: [...]
    }
  ]
}
```

---

### Steg 2: Identifiera flöden genom Feature Goals (inkl. Gateways)

**Input:**
- BPMN-processfil (sequence flows, gateways, conditions)
- Feature Goals och deras prerequisites

**Process:**
1. **Parsa BPMN-filen** för att hitta:
   - Gateways (exclusive, parallel, inclusive)
   - Sequence flows med conditions
   - Start-events och end-events
2. **Bygga en flödesgraf** av noder och edges
3. **Identifiera paths** från start-event till end-event:
   - Följ sequence flows genom Call Activities (Feature Goals)
   - Vid gateways: följ alla outgoing flows (en per condition)
   - Identifiera gateway-conditions som avgör vilken path som används
4. **Identifiera error paths** (paths som slutar i error events)

**Output:**
```typescript
{
  paths: [
    {
      type: "happy-path",
      featureGoals: [
        "internal-data-gathering",
        "external-data-gathering",
        "credit-decision",
        "offer" // Bara om gateway-condition är true
      ],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          gatewayName: "Is credit approved?",
          condition: "${creditDecision.approved === true}",
          conditionText: "creditDecision.approved === true"
        }
      ]
    },
    {
      type: "error-path",
      featureGoals: [
        "internal-data-gathering",
        "external-data-gathering",
        "credit-decision"
      ],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          gatewayName: "Is credit approved?",
          condition: "${creditDecision.approved === false}",
          conditionText: "creditDecision.approved === false"
        }
      ],
      errorEvent: {
        id: "credit-rejected",
        errorCode: "CREDIT_REJECTED"
      }
    }
  ]
}
```

**Viktigt om Gateways:**
- Gateways avgör **vilka Feature Goals** som används i olika flöden
- Conditions avgör **när** varje path används
- Olika paths = olika E2E-scenarios
- Se [`E2E_SCENARIOS_GATEWAYS_AND_FLOW_ANALYSIS.md`](./E2E_SCENARIOS_GATEWAYS_AND_FLOW_ANALYSIS.md) för detaljerad analys

---

### Steg 3: Generera E2E-scenarios från flöden (inkl. Gateway-conditions)

**Input:**
- Flöden genom Feature Goals (inkl. gateway-conditions)
- Feature Goal-dokumentation (flowSteps, userStories, prerequisites)

**Process:**
1. **För varje path** (happy-path, error-path):
   - Skapa en E2E-scenario
   - Mappa varje Feature Goal i pathen till ett steg
   - Använd flowSteps från Feature Goal för att beskriva vad som händer
   - Använd userStories acceptanceCriteria för att beskriva assertions
   - Använd prerequisites för att beskriva Given-conditions
   - **Använd gateway-conditions** för att beskriva Given-conditions (t.ex. "Kreditbeslut är godkänt")
2. **För gateway-conditions**:
   - Konvertera BPMN conditions (t.ex. `${creditDecision.approved === true}`) till Given-text (t.ex. "Kreditbeslut är godkänt")
   - Använd Claude för att förstå semantiken om nödvändigt

**Output:**
```typescript
{
  scenarios: [
    {
      id: "e2e-happy-path-1",
      name: "Köp bostadsrätt - Happy Path",
      type: "happy-path",
      priority: "P0",
      bpmnProcess: "mortgage-se-application.bpmn",
      featureGoals: [
        "internal-data-gathering",
        "external-data-gathering",
        "credit-decision"
      ],
      steps: [
        {
          order: 1,
          featureGoal: "internal-data-gathering",
          action: "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata",
          assertion: "Intern kunddata är hämtad och kvalitetssäkrad",
          prerequisites: [
            "Kreditansökan har registrerats i systemet",
            "Grundläggande kund- och ansökningsdata är validerade"
          ]
        },
        {
          order: 2,
          featureGoal: "external-data-gathering",
          action: "Systemet hämtar extern kreditdata från UC",
          assertion: "Extern kreditdata är hämtad och validerad",
          prerequisites: [
            "Intern kunddata är hämtad och kvalitetssäkrad"
          ]
        },
        {
          order: 3,
          featureGoal: "credit-decision",
          action: "Systemet fattar kreditbeslut baserat på insamlad data",
          assertion: "Kreditbeslut är fattat och tillgängligt",
          prerequisites: [
            "Intern och extern kreditdata är hämtad och validerad"
          ],
          gatewayConditions: [
            {
              gatewayId: "Gateway_1",
              gatewayName: "Is credit approved?",
              condition: "${creditDecision.approved === true}",
              givenCondition: "Kreditbeslut är godkänt" // Konverterat från BPMN condition
            }
          ]
        },
        {
          order: 4,
          featureGoal: "offer", // Bara om gateway-condition är true
          action: "Systemet skapar erbjudande baserat på kreditbeslut",
          assertion: "Erbjudande är skapat och tillgängligt",
          prerequisites: [
            "Kreditbeslut är godkänt",
            "Kreditbeslut är fattat"
          ]
        }
      ]
    }
  ]
}
```

---

## 🔍 Vad behöver vi för att generera E2E-scenarios?

### 1. Feature Goal-dokumentation (finns redan)

**Vad vi har:**
- ✅ Feature Goal-dokumentation genereras av Claude
- ✅ Sparas i Supabase Storage (`docs/claude/feature-goals/`)
- ✅ Innehåller: summary, flowSteps, userStories, prerequisites, dependencies

**Vad vi behöver:**
- ⚠️ **Testdata-referenser** (kan läggas till i Feature Goal-dokumentation)
- ⚠️ **Implementation mapping** (kan läggas till i Feature Goal-dokumentation)

---

### 2. BPMN-processstruktur (finns redan)

**Vad vi har:**
- ✅ BPMN-filer parsas redan
- ✅ Call Activities identifieras
- ✅ Sequence flows, gateways, events identifieras

**Vad vi behöver:**
- ⚠️ **Koppling mellan Call Activities och Feature Goals** (mappning mellan callActivityId och Feature Goal-dokumentation)

---

### 3. Flödesanalys med Gateways (behöver implementeras)

**Vad vi behöver:**
- ❌ **Extrahera gateway-information** från BPMN (gateway-typ, outgoing flows, conditions)
- ❌ **Bygga en flödesgraf** av noder (start events, tasks, call activities, gateways, end events) och edges (sequence flows)
- ❌ **Identifiera paths** genom BPMN-processen (happy-path, error-path) med gateway-conditions
- ❌ **Identifiera error events** och deras error codes

**Exempel:**
```typescript
function findPathsThroughFeatureGoals(
  bpmnProcess: BpmnProcess,
  featureGoals: FeatureGoal[]
): Path[] {
  // 1. Extrahera gateway-information från BPMN
  const gateways = extractGateways(bpmnProcess);
  const sequenceFlows = extractSequenceFlows(bpmnProcess);
  
  // 2. Bygga en flödesgraf
  const graph = buildFlowGraph(bpmnProcess.elements, sequenceFlows);
  
  // 3. Hitta start-event
  const startEvent = findStartEvent(bpmnProcess);
  
  // 4. Följ sequence flows genom Call Activities
  // 5. Vid gateways: följ alla outgoing flows (en per condition)
  // 6. Identifiera gateway-conditions som avgör vilken path som används
  // 7. Identifiera end-events (happy path, error paths)
  const paths = findPathsFromStartToEnd(graph, startEvent.id);
  
  // 8. Returnera paths med Feature Goals och gateway-conditions
  return paths.map(path => ({
    ...path,
    featureGoals: path.nodes
      .filter(node => node.type === 'callActivity')
      .map(node => node.id),
    gatewayConditions: path.gateways.map(gw => ({
      gatewayId: gw.id,
      gatewayName: gw.name,
      condition: gw.condition,
      conditionText: extractConditionText(gw.condition)
    }))
  }));
}
```

**Se [`E2E_SCENARIOS_GATEWAYS_AND_FLOW_ANALYSIS.md`](./E2E_SCENARIOS_GATEWAYS_AND_FLOW_ANALYSIS.md) för detaljerad analys av gateways och BPMN-logik.**

---

### 4. E2E-scenario-generering (behöver implementeras)

**Vad vi behöver:**
- ❌ **Generera E2E-scenarios** från paths och Feature Goals
- ❌ **Mappa Feature Goals till steg** i E2E-scenarios
- ❌ **Använd flowSteps, userStories, prerequisites** från Feature Goals

**Exempel:**
```typescript
function generateE2eScenariosFromPaths(
  paths: Path[],
  featureGoals: FeatureGoal[]
): E2eScenario[] {
  // 1. För varje path:
  //    - Skapa en E2E-scenario
  //    - Mappa varje Feature Goal i pathen till ett steg
  //    - Använd flowSteps för action
  //    - Använd userStories acceptanceCriteria för assertion
  //    - Använd prerequisites för Given-conditions
  // 2. Returnera E2E-scenarios
}
```

---

## 📊 Kvalitet: Vad kan vi faktiskt generera?

### Vad vi KAN generera med hög kvalitet (80-90%)

**1. E2E-scenarios baserat på BPMN-processflöde:**
- ✅ **Paths** genom Feature Goals (happy-path, error-path)
- ✅ **Steg-ordning** baserat på sequence flows
- ✅ **Feature Goal-koppling** (vilken Feature Goal i vilket steg)

**2. E2E-steg baserat på Feature Goal-dokumentation:**
- ✅ **Actions** från flowSteps (vad som händer)
- ✅ **Assertions** från userStories acceptanceCriteria (vad som verifieras)
- ✅ **Given-conditions** från prerequisites (vad som behövs)

**3. Prioritering:**
- ✅ **P0** för error-paths (kritiska felhantering)
- ✅ **P1** för happy-paths (normal funktionalitet)

---

### Vad vi INTE kan generera med hög kvalitet (0-30%)

**1. Konkreta testdata:**
- ❌ Specifika värden (t.ex. `personnummer: "198001011234"`)
- ❌ Testdata-referenser (om de inte finns i Feature Goal-dokumentation)

**2. Konkreta API-endpoints:**
- ❌ Exakta endpoints (t.ex. `POST /api/party-information`)
- ❌ Request/response-strukturer

**3. Konkreta UI-selectors:**
- ❌ Exakta selectors (t.ex. `[data-testid='application-form']`)
- ❌ UI-interaktioner (klick, input, etc.)

**4. Konkreta DMN-tabellnamn:**
- ❌ Exakta tabellnamn (t.ex. `credit-evaluation-dmn`)
- ❌ Input/output-strukturer

---

## 🎯 Rekommenderad approach

### 1. Generera E2E-scenarios från Feature Goals

**Process:**
1. **Läs BPMN-processfil** och identifiera Call Activities
2. **Läs Feature Goal-dokumentation** för varje Call Activity
3. **Identifiera paths** genom BPMN-processen (happy-path, error-path)
4. **Generera E2E-scenarios** från paths och Feature Goals
5. **Spara E2E-scenarios** i databasen (t.ex. `e2e_scenarios`-tabell)

**Output:**
```typescript
{
  id: "e2e-happy-path-1",
  name: "Köp bostadsrätt - Happy Path",
  type: "happy-path",
  priority: "P0",
  bpmnProcess: "mortgage-se-application.bpmn",
  featureGoals: [
    "internal-data-gathering",
    "external-data-gathering",
    "credit-decision"
  ],
  steps: [
    {
      order: 1,
      featureGoal: "internal-data-gathering",
      action: "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata",
      assertion: "Intern kunddata är hämtad och kvalitetssäkrad",
      prerequisites: [...]
    }
  ]
}
```

---

### 2. Koppla E2E-scenarios till Feature Goals

**Databas-struktur:**
```sql
-- E2E-scenarios
CREATE TABLE e2e_scenarios (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'happy-path', 'error-path'
  priority TEXT NOT NULL, -- 'P0', 'P1', 'P2'
  bpmn_process TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- E2E-scenario-steg (kopplade till Feature Goals)
CREATE TABLE e2e_scenario_steps (
  id UUID PRIMARY KEY,
  e2e_scenario_id UUID REFERENCES e2e_scenarios(id),
  order INTEGER NOT NULL,
  feature_goal_bpmn_file TEXT NOT NULL,
  feature_goal_element_id TEXT NOT NULL,
  action TEXT NOT NULL,
  assertion TEXT NOT NULL,
  prerequisites TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index för snabb lookup
CREATE INDEX idx_e2e_scenario_steps_feature_goal 
  ON e2e_scenario_steps(feature_goal_bpmn_file, feature_goal_element_id);
```

**Koppling:**
- Varje steg i en E2E-scenario är kopplat till en Feature Goal via `feature_goal_bpmn_file` och `feature_goal_element_id`
- Feature Goal-dokumentation kan läsas från Supabase Storage
- E2E-scenarios kan visas i UI med länkar till Feature Goal-dokumentation

---

### 3. Använd E2E-scenarios i testdesign

**För testare:**
1. **Se E2E-scenarios** i UI (t.ex. E2E Tests Overview-sidan)
2. **Klicka på en E2E-scenario** för att se detaljer
3. **Se Feature Goals** för varje steg
4. **Läs Feature Goal-dokumentation** för att förstå vad som händer
5. **Lägg till konkreta detaljer** (testdata, API-endpoints, UI-selectors)

**För test lead:**
1. **Se översikt** över alla E2E-scenarios
2. **Prioritera** baserat på priority (P0, P1, P2)
3. **Planera testresurser** baserat på antal E2E-scenarios
4. **Identifiera gaps** (Feature Goals utan E2E-scenarios)

---

## 📝 Slutsats

**Vad vi KAN göra:**
- ✅ Generera E2E-scenarios från Feature Goals med medel-hög kvalitet (70-80%)
- ✅ Koppla E2E-scenarios till Feature Goals via databas
- ✅ Använda Feature Goal-dokumentation för att beskriva steg i E2E-scenarios
- ✅ Identifiera möjliga paths genom processen (inkl. gateway-conditions)

**Vad vi INTE kan göra:**
- ❌ Generera konkreta testdata, API-endpoints, UI-selectors (0-30%)
- ❌ Evaluera gateway-conditions faktiskt (kräver runtime data eller BPMN-engine)
- ❌ Identifiera faktiska paths (kan bara identifiera möjliga paths)

**Rekommendation:**
- Fokusera på att generera **strukturerade E2E-scenarios** från Feature Goals
- Använda **Hybrid approach** (BPMN XML + Claude + Testdata) för att simulera condition evaluation
- Låt testare **lägga till konkreta detaljer** (testdata, API-endpoints, UI-selectors)
- Använd Feature Goal-dokumentation som **grund** för E2E-scenarios

**Se även:**
- [`E2E_SCENARIOS_GATEWAYS_AND_FLOW_ANALYSIS.md`](./E2E_SCENARIOS_GATEWAYS_AND_FLOW_ANALYSIS.md) - Detaljerad analys av gateways och BPMN-logik
- [`E2E_SCENARIOS_BPMN_EXECUTION_SEMANTICS_ANALYSIS.md`](./E2E_SCENARIOS_BPMN_EXECUTION_SEMANTICS_ANALYSIS.md) - Analys av BPMN execution semantics och om Camunda behövs

---

**Datum:** 2025-12-22
**Status:** Analys klar

