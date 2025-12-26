# Strategi: Generera Test Coverage Explorer med Claude

## 🎯 Syfte

Analysera vad som finns på Test Coverage Explorer-sidan och vad vi kan generera med Claude för att återskapa den.

---

## 📊 Vad finns på Test Coverage Explorer-sidan

### 1. E2E Scenario-struktur

**Var:** `src/pages/E2eTestsOverviewPage.tsx` - `E2eScenario` type

**Vad:**
```typescript
{
  id: string;                    // T.ex. 'E2E_BR001'
  name: string;                 // T.ex. 'E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt'
  priority: 'P0' | 'P1' | 'P2';
  type: 'happy-path' | 'alt-path' | 'error';
  iteration: Iteration;         // T.ex. 'Köp bostadsrätt'
  bpmnProcess: string;          // T.ex. 'mortgage.bpmn'
  bpmnCallActivityId?: string;
  featureGoalFile: string;      // T.ex. 'public/local-content/feature-goals/mortgage-application-v2.html'
  featureGoalTestId?: string;
  testFile: string;             // T.ex. 'tests/playwright-e2e/scenarios/happy-path/mortgage-bostadsratt-happy.spec.ts'
  command: string;              // T.ex. 'npx playwright test ...'
  summary: string;              // Lång beskrivning av scenariot
  given: string;                // Given-conditions
  when: string;                 // When-actions
  then: string;                 // Then-assertions
  notesForBankProject: string;  // Anteckningar för bankprojektet
  bankProjectTestSteps: BankProjectTestStep[];  // Teststeg per BPMN-nod
  userStories?: UserStory[];     // User stories
  subprocessSteps: SubprocessStep[];  // Subprocess-steg
}
```

**Kan genereras med Claude:** ✅ Ja (70-80% kvalitet)

---

### 2. BankProjectTestStep (Teststeg per BPMN-nod)

**Var:** `src/pages/E2eTestsOverviewPage.tsx` - `BankProjectTestStep` type

**Vad:**
```typescript
{
  bpmnNodeId: string;           // T.ex. 'application', 'is-purchase'
  bpmnNodeType: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'CallActivity' | 'BoundaryEvent' | 'Gateway';
  bpmnNodeName: string;        // T.ex. 'Application', 'Is purchase?'
  action: string;              // Vad som händer - baserat på Feature Goal och BPMN-nodens syfte
  uiInteraction?: string;       // För UserTask: vad användaren gör i UI
  apiCall?: string;            // För ServiceTask: vilket API som anropas
  dmnDecision?: string;        // För BusinessRuleTask: vilket DMN-beslut som körs
  assertion: string;           // Vad som verifieras - baserat på Feature Goal "Then"
  backendState?: string;      // Förväntat backend-tillstånd efter teststeget
}
```

**Kan genereras med Claude:** ✅ Ja (60-70% kvalitet)
- `action`: ✅ Kan genereras från Feature Goal `flowSteps`
- `uiInteraction`: ⚠️ Kan genereras från Feature Goal `userStories` (50-60% kvalitet)
- `apiCall`: ❌ Kan inte genereras (saknar API-dokumentation)
- `dmnDecision`: ⚠️ Kan genereras från Feature Goal `businessRules` (50-60% kvalitet)
- `assertion`: ✅ Kan genereras från Feature Goal `userStories.acceptanceCriteria`
- `backendState`: ⚠️ Kan genereras från Feature Goal `outputs` (50-60% kvalitet)

---

### 3. SubprocessStep (Subprocess-steg)

**Var:** `src/pages/E2eTestsOverviewPage.tsx` - `subprocessSteps` field

**Vad:**
```typescript
{
  order: number;
  bpmnFile: string;            // T.ex. 'mortgage-se-application.bpmn'
  callActivityId?: string;    // T.ex. 'application'
  featureGoalFile?: string;    // T.ex. 'public/local-content/feature-goals/mortgage-application-v2.html'
  description: string;         // Beskrivning av subprocess-steget
  hasPlaywrightSupport: boolean;
  given?: string;              // Given-conditions
  when?: string;               // When-actions
  then?: string;               // Then-assertions
  linkedUserStories?: number[]; // Länkade user stories
  subprocessesSummary?: string;
  serviceTasksSummary?: string;
  userTasksSummary?: string;
  businessRulesSummary?: string;
}
```

**Kan genereras med Claude:** ✅ Ja (70-80% kvalitet)
- `description`: ✅ Kan genereras från Feature Goal `summary`
- `given`: ✅ Kan genereras från Feature Goal `prerequisites`
- `when`: ✅ Kan genereras från Feature Goal `flowSteps`
- `then`: ✅ Kan genereras från Feature Goal `userStories.acceptanceCriteria`

---

### 4. UserStory

**Var:** `src/pages/E2eTestsOverviewPage.tsx` - `UserStory` type

**Vad:**
```typescript
{
  id?: string;
  role: string;                // T.ex. 'Kund', 'Handläggare'
  goal: string;                // T.ex. 'Jag vill fylla i ansökan'
  value: string;               // T.ex. 'Så att jag kan ansöka om bolån'
  acceptanceCriteria?: string; // T.ex. 'Ansökan är komplett och redo för kreditevaluering'
  linkedToSubprocessStep?: number;
}
```

**Kan genereras med Claude:** ✅ Ja (80-90% kvalitet)
- Redan finns i Feature Goal-dokumentation (`userStories` field)
- Kan extraheras direkt från Feature Goal HTML

---

## 🎯 Vad kan vi generera med Claude?

### Steg 1: Extrahera strukturell information från BPMN (60-70% kvalitet)

**Vad vi gör:**
1. Identifiera Feature Goals (Call Activities) i paths
2. Identifiera error paths
3. Identifiera gateways
4. Bygga grundläggande scenario-struktur

**Output:**
```typescript
{
  scenarioId: "E2E_BR001",
  type: "happy-path",
  featureGoals: [
    { id: "application", name: "Application" },
    { id: "mortgage-commitment", name: "Mortgage commitment" },
    { id: "object-valuation", name: "Object valuation" }
  ],
  gatewayDecisions: [
    { gatewayId: "is-purchase", gatewayName: "Is purchase?", decision: "Yes" }
  ]
}
```

**Kvalitet:** 60-70% (grundstruktur, men ofullständig)

---

### Steg 2: Använd Claude för att förbättra (70-80% kvalitet)

**Input till Claude:**
```typescript
{
  scenario: {
    id: "E2E_BR001",
    type: "happy-path",
    featureGoals: [
      { id: "application", name: "Application" },
      { id: "mortgage-commitment", name: "Mortgage commitment" }
    ],
    gatewayDecisions: [
      { gatewayId: "is-purchase", gatewayName: "Is purchase?", decision: "Yes" }
    ]
  },
  featureGoalDocs: {
    "application": {
      summary: "Intern datainsamling säkerställer...",
      flowSteps: ["Systemet initierar automatiskt insamling..."],
      userStories: [
        {
          role: "Kund",
          goal: "Jag vill fylla i ansökan",
          value: "Så att jag kan ansöka om bolån",
          acceptanceCriteria: "Ansökan är komplett och redo för kreditevaluering"
        }
      ],
      prerequisites: ["Kund är identifierad", "Intern data är tillgänglig"],
      outputs: ["Application.status = 'COMPLETE'"]
    }
  }
}
```

**Output från Claude:**
```typescript
{
  scenario: {
    id: "E2E_BR001",
    name: "E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)",
    summary: "Komplett E2E-scenario för en person som köper sin första bostadsrätt...",
    given: "En person köper sin första bostadsrätt. Personen uppfyller alla grundläggande krav...",
    when: "Kunden fyller i Application (intern data, hushåll, stakeholder, objekt)...",
    then: "Hela processen från Application till Collateral Registration slutförs utan fel...",
    bankProjectTestSteps: [
      {
        bpmnNodeId: "application",
        bpmnNodeType: "CallActivity",
        bpmnNodeName: "Application",
        action: "Kunden fyller i komplett ansökan (intern data, objekt, hushåll, stakeholder)",
        uiInteraction: "Navigate: application-start (nav-application). Verify: page-loaded...",
        apiCall: "GET /api/party/information (fetch-party-information)...",
        dmnDecision: "Pre-screen Party DMN = APPROVED...",
        assertion: "Ansökan är komplett och redo för kreditevaluering...",
        backendState: "Application.status = 'COMPLETE'..."
      }
    ],
    subprocessSteps: [
      {
        order: 1,
        bpmnFile: "mortgage-se-application.bpmn",
        callActivityId: "application",
        featureGoalFile: "public/local-content/feature-goals/mortgage-application-v2.html",
        description: "Intern datainsamling säkerställer...",
        given: "Kund är identifierad, Intern data är tillgänglig",
        when: "Systemet initierar automatiskt insamling...",
        then: "Ansökan är komplett och redo för kreditevaluering"
      }
    ]
  }
}
```

**Kvalitet:** 70-80% (hög kvalitet, men saknar vissa detaljer)

---

## 📊 Vad kan vi generera vs Vad finns redan

| Aspekt | Kan genereras | Kvalitet | Kommentar |
|--------|--------------|----------|------------|
| **Scenario ID** | ✅ Ja | 90% | Kan genereras från BPMN process + iteration |
| **Scenario Name** | ✅ Ja | 70-80% | Claude kan generera från Feature Goals |
| **Priority** | ✅ Ja | 80% | Kan infereras från scenario type (happy-path = P0) |
| **Type** | ✅ Ja | 90% | Kan infereras från paths (error paths = error) |
| **Iteration** | ✅ Ja | 80% | Kan infereras från BPMN process |
| **Summary** | ✅ Ja | 70-80% | Claude kan generera från Feature Goals |
| **Given** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal prerequisites + gateway conditions |
| **When** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal flowSteps |
| **Then** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal userStories.acceptanceCriteria |
| **bankProjectTestSteps.action** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal flowSteps |
| **bankProjectTestSteps.uiInteraction** | ⚠️ Delvis | 50-60% | Claude kan generera från Feature Goal userStories, men saknar konkreta UI-selectors |
| **bankProjectTestSteps.apiCall** | ❌ Nej | 0% | Saknar API-dokumentation |
| **bankProjectTestSteps.dmnDecision** | ⚠️ Delvis | 50-60% | Claude kan generera från Feature Goal businessRules, men saknar konkreta DMN-tabellnamn |
| **bankProjectTestSteps.assertion** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal userStories.acceptanceCriteria |
| **bankProjectTestSteps.backendState** | ⚠️ Delvis | 50-60% | Claude kan generera från Feature Goal outputs, men saknar konkreta backend-strukturer |
| **subprocessSteps.description** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal summary |
| **subprocessSteps.given** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal prerequisites |
| **subprocessSteps.when** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal flowSteps |
| **subprocessSteps.then** | ✅ Ja | 70-80% | Claude kan generera från Feature Goal userStories.acceptanceCriteria |
| **userStories** | ✅ Ja | 80-90% | Redan finns i Feature Goal-dokumentation |

---

## 🎯 Rekommenderad strategi

### Steg 1: Extrahera strukturell information från BPMN (60-70% kvalitet)

**Vad vi gör:**
1. Identifiera Feature Goals (Call Activities) i paths
2. Identifiera error paths
3. Identifiera gateways
4. Bygga grundläggande scenario-struktur

**Output:**
```typescript
{
  scenarioId: "E2E_BR001",
  type: "happy-path",
  featureGoals: [...],
  gatewayDecisions: [...]
}
```

---

### Steg 2: Använd Claude för att generera scenario-struktur (70-80% kvalitet)

**Input till Claude:**
- Scenario-struktur från Steg 1
- Feature Goal-dokumentation (redan genererad)
- BPMN process-information

**Output från Claude:**
- `name`, `summary`, `given`, `when`, `then`
- `bankProjectTestSteps` (med `action`, `assertion`, delvis `uiInteraction`, `dmnDecision`, `backendState`)
- `subprocessSteps` (med `description`, `given`, `when`, `then`)

---

### Steg 3: Testprofessional kompletterar (80-100% kvalitet)

**Vad testprofessional gör:**
- Lägger till konkreta UI-selectors i `uiInteraction`
- Lägger till konkreta API-endpoints i `apiCall`
- Lägger till konkreta DMN-tabellnamn i `dmnDecision`
- Validerar att scenarios är korrekta

---

## 📊 Sammanfattning: Vad kan vi generera?

### ✅ Kan genereras med Claude (70-80% kvalitet):

1. **Scenario-struktur:**
   - `id`, `name`, `summary`, `given`, `when`, `then`
   - `type`, `priority`, `iteration`

2. **bankProjectTestSteps:**
   - `action` (från Feature Goal `flowSteps`)
   - `assertion` (från Feature Goal `userStories.acceptanceCriteria`)
   - Delvis `uiInteraction` (från Feature Goal `userStories`, men saknar konkreta selectors)
   - Delvis `dmnDecision` (från Feature Goal `businessRules`, men saknar konkreta tabellnamn)
   - Delvis `backendState` (från Feature Goal `outputs`, men saknar konkreta strukturer)

3. **subprocessSteps:**
   - `description` (från Feature Goal `summary`)
   - `given` (från Feature Goal `prerequisites`)
   - `when` (från Feature Goal `flowSteps`)
   - `then` (från Feature Goal `userStories.acceptanceCriteria`)

4. **userStories:**
   - Redan finns i Feature Goal-dokumentation

---

### ❌ Kan inte genereras (0-50% kvalitet):

1. **bankProjectTestSteps.apiCall:**
   - Saknar API-dokumentation
   - Kan inte genereras

2. **bankProjectTestSteps.uiInteraction (konkreta selectors):**
   - Saknar UI-dokumentation
   - Kan generera generiska interaktioner, men inte konkreta selectors

3. **bankProjectTestSteps.dmnDecision (konkreta tabellnamn):**
   - Saknar DMN-dokumentation
   - Kan generera generiska beslut, men inte konkreta tabellnamn

4. **bankProjectTestSteps.backendState (konkreta strukturer):**
   - Saknar backend-dokumentation
   - Kan generera generiska states, men inte konkreta strukturer

---

## 🎯 Slutsats

**Vad kan vi generera med Claude för att återskapa Test Coverage Explorer-sidan:**

1. ✅ **Scenario-struktur** (70-80% kvalitet)
   - `name`, `summary`, `given`, `when`, `then`
   - `type`, `priority`, `iteration`

2. ✅ **bankProjectTestSteps** (60-70% kvalitet)
   - `action`, `assertion`
   - Delvis `uiInteraction`, `dmnDecision`, `backendState`

3. ✅ **subprocessSteps** (70-80% kvalitet)
   - `description`, `given`, `when`, `then`

4. ✅ **userStories** (80-90% kvalitet)
   - Redan finns i Feature Goal-dokumentation

**Vad kan inte genereras:**

1. ❌ **Konkreta API-endpoints** (saknar API-dokumentation)
2. ❌ **Konkreta UI-selectors** (saknar UI-dokumentation)
3. ❌ **Konkreta DMN-tabellnamn** (saknar DMN-dokumentation)
4. ❌ **Konkreta backend-strukturer** (saknar backend-dokumentation)

**Rekommendation:** Generera 70-80% av innehållet med Claude, låt testprofessional komplettera med konkreta detaljer (API-endpoints, UI-selectors, DMN-tabellnamn, backend-strukturer).

---

**Datum:** 2025-12-22
**Status:** Strategi klar - Kan generera 70-80% med Claude







