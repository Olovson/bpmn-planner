# Sammanfattning: Hur vi skapar bra E2E-scenarios

## 🎯 Syfte

Sammanfatta hela processen för att skapa bra E2E-scenarios baserat på BPMN-filer, Feature Goal-dokumentation och Claude.

---

## 📊 Process: Steg-för-steg

### Steg 1: Extrahera strukturell information från BPMN (60-70% kvalitet)

**Vad vi gör:**
1. **Parsa BPMN-filer** med `BpmnParser` (redan implementerat)
2. **Extrahera gateways** (ID, namn, typ, outgoing flows)
3. **Extrahera sequence flows** med conditions (som text)
4. **Bygga flödesgraf** av noder och edges
5. **Identifiera paths** genom graf-traversal från start-event till end-event

**Output:**
```typescript
{
  gateways: [
    {
      id: "Gateway_0fhav15",
      name: "KALP OK?",
      type: "exclusiveGateway",
      outgoingFlows: [
        { id: "kalp-ok-yes", target: "confirm-application" },
        { id: "Flow_07etr9g", target: "application-rejected" }
      ]
    }
  ],
  paths: [
    {
      type: "possible-path",
      startEvent: "Event_0isinbn",
      endEvent: "Event_0j4buhs",
      featureGoals: ["internal-data-gathering", "object", "credit-decision"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_0fhav15",
          gatewayName: "KALP OK?",
          condition: "${creditDecision.approved === true}",
          conditionText: "creditDecision.approved === true"
        }
      ]
    }
  ]
}
```

**Kvalitet:** 60-70% (grundstruktur, men ofullständig)

---

### Steg 2: Identifiera alla leaf nodes och säkerställa coverage

**Vad vi gör:**
1. **Identifiera alla leaf nodes** (end events, error events, terminate events)
2. **Identifiera alla paths** till varje leaf node
3. **Analysera coverage** - matcha befintliga scenarios mot paths
4. **Identifiera saknade paths** (gaps i coverage)

**Output:**
```typescript
{
  leafNodes: [
    {
      id: "Event_0j4buhs",
      name: "Application complete",
      type: "endEvent",
      paths: [
        // Path 1: happy-path
        // Path 2: alt-path (manuell godkännande)
        // Path 3: alt-path (med review)
      ]
    },
    {
      id: "application-rejected",
      name: "Application rejected",
      type: "errorEvent",
      paths: [
        // Error paths
      ]
    }
  ],
  coverage: {
    totalPaths: 10,
    coveredPaths: 7,
    coveragePercentage: 70,
    missingPaths: [
      // Path 3: alt-path (med review) - saknas scenario
      // Path 5: error-path - saknas scenario
    ]
  }
}
```

**Kvalitet:** 80-90% (systematisk coverage-analys)

---

### Steg 3: Läsa Feature Goal-dokumentation (redan genererad)

**Vad vi gör:**
1. **Läs Feature Goal-dokumentation** från Supabase Storage (redan genererad av Claude)
2. **Mappa Feature Goals** till Call Activities i paths
3. **Extrahera relevant information:**
   - `summary` - beskrivning av Feature Goal
   - `flowSteps` - vad som händer (t.ex. "Systemet hämtar kundinformation")
   - `userStories` - användarinteraktioner (t.ex. "Kunden fyller i ansökan")
   - `prerequisites` - Given-conditions (t.ex. "Kund är identifierad")
   - `outputs` - Then-assertions (t.ex. "Application.status = 'COMPLETE'")

**Output:**
```typescript
{
  "internal-data-gathering": {
    summary: "Intern datainsamling säkerställer att intern kunddata hämtas...",
    flowSteps: [
      "Systemet initierar automatiskt insamling av intern kunddata",
      "ServiceTask fetch-party-information hämtar kundinformation",
      "ServiceTask fetch-engagements hämtar befintliga engagemang"
    ],
    userStories: [
      {
        role: "Kund",
        goal: "Jag vill fylla i ansökan",
        value: "Så att jag kan ansöka om bolån",
        acceptanceCriteria: "Ansökan är komplett och redo för kreditevaluering"
      }
    ],
    prerequisites: ["Kund är identifierad", "Intern data är tillgänglig"],
    outputs: ["Application.status = 'COMPLETE'", "Application.allDataCollected = true"]
  }
}
```

**Kvalitet:** 80-90% (Feature Goals är redan genererade med hög kvalitet)

---

### Steg 4: Använda Claude för att generera E2E-scenarios (70-80% kvalitet)

**Vad vi gör:**
1. **För varje saknad path**, skicka till Claude:
   - Path-struktur (Feature Goals, gateway-conditions)
   - Feature Goal-dokumentation (redan genererad)
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
        id: "internal-data-gathering",
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
        outputs: ["Application.status = 'COMPLETE'"]
      }
    ],
    gatewayConditions: [
      {
        gatewayId: "Gateway_0fhav15",
        gatewayName: "KALP OK?",
        condition: "${creditDecision.approved === true}",
        conditionText: "creditDecision.approved === true"
      }
    ]
  }
}
```

**Output från Claude:**
```typescript
{
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
      // Claude genererar från Feature Goal flowSteps och userStories
      uiInteraction: "Navigate to application page. Verify that application form is visible...", // Generiska interaktioner
      // apiCall: undefined // Saknar API-dokumentation
      assertion: "Ansökan är komplett och redo för kreditevaluering...", // Från Feature Goal userStories.acceptanceCriteria
      backendState: "Application.status should be COMPLETE..." // Från Feature Goal outputs
    }
  ],
  subprocessSteps: [
    {
      order: 1,
      bpmnFile: "mortgage-se-application.bpmn",
      callActivityId: "application",
      description: "Intern datainsamling säkerställer...", // Från Feature Goal summary
      given: "Kund är identifierad, Intern data är tillgänglig", // Från Feature Goal prerequisites
      when: "Systemet initierar automatiskt insamling...", // Från Feature Goal flowSteps
      then: "Ansökan är komplett och redo för kreditevaluering" // Från Feature Goal userStories.acceptanceCriteria
    }
  ]
}
```

**Kvalitet:** 70-80% (hög kvalitet, men saknar vissa detaljer)

---

### Steg 5: Testprofessional kompletterar (80-100% kvalitet)

**Vad testprofessional gör:**
1. **Lägger till konkreta API-endpoints** i `bankProjectTestSteps.apiCall`
   - Exempel: `GET /api/party/information` → `GET /api/party/information (fetch-party-information)`

2. **Lägger till konkreta UI-selectors** i `bankProjectTestSteps.uiInteraction`
   - Exempel: "Navigate to application page" → `Navigate: application-start (nav-application)`

3. **Lägger till konkreta DMN-tabellnamn** i `bankProjectTestSteps.dmnDecision`
   - Exempel: "Pre-screen Party DMN" → `Pre-screen Party DMN = APPROVED, Evaluate Bostadsrätt DMN = APPROVED`

4. **Lägger till konkreta backend-strukturer** i `bankProjectTestSteps.backendState`
   - Exempel: "Application.status should be COMPLETE" → `Application.status = "COMPLETE", Application.readyForEvaluation = true`

5. **Validerar att scenarios är korrekta**

**Kvalitet:** 80-100% (komplett, produktionsklar)

---

## 📊 Kvalitetsbedömning per steg

| Steg | Kvalitet | Vad vi får | Vad som saknas |
|------|----------|------------|----------------|
| **1. Extrahera strukturell information** | 60-70% | Gateways, paths, Feature Goals | Conditions (0%), subprocesser (50%) |
| **2. Identifiera leaf nodes** | 80-90% | Alla leaf nodes, coverage-analys | - |
| **3. Läsa Feature Goal-dokumentation** | 80-90% | flowSteps, userStories, prerequisites, outputs | - |
| **4. Claude-generering** | 70-80% | name, summary, given, when, then, action, assertion | API-endpoints (0%), UI-selectors (50-60%), DMN-tabellnamn (50-60%), backend-strukturer (50-60%) |
| **5. Testprofessional komplettering** | 80-100% | Komplett, produktionsklar | - |

---

## 🎯 Slutsats: Hur vi skapar bra E2E-scenarios

### ✅ Vad fungerar bra:

1. **Systematisk coverage-analys** (80-90% kvalitet)
   - Identifierar alla leaf nodes
   - Identifierar alla paths till varje leaf node
   - Säkerställer att alla paths har scenarios

2. **Feature Goal-baserad generering** (70-80% kvalitet)
   - Använder `flowSteps` för att beskriva vad som händer
   - Använder `userStories` för att beskriva användarinteraktioner
   - Använder `prerequisites` för Given-conditions
   - Använder `outputs` för Then-assertions
   - **Fungerar även utan konkreta API:er och GUI**

3. **Claude-förbättrad struktur** (70-80% kvalitet)
   - Bra `name`, `summary`, `given`, `when`, `then`
   - Bra `action` och `assertion` i teststeg
   - Bra `subprocessSteps` med beskrivningar

---

### ⚠️ Vad som saknas (kräver komplettering):

1. **API-endpoints** (0% kvalitet)
   - Saknar API-dokumentation
   - Testprofessional måste lägga till alla API-endpoints

2. **UI-selectors** (50-60% kvalitet)
   - Kan generera generiska interaktioner
   - Testprofessional måste lägga till konkreta selectors

3. **DMN-tabellnamn** (50-60% kvalitet)
   - Kan generera generiska beslut
   - Testprofessional måste lägga till konkreta tabellnamn

4. **Backend-strukturer** (50-60% kvalitet)
   - Kan generera generiska states
   - Testprofessional måste lägga till konkreta strukturer

---

## 💡 Process-sammanfattning

### 1. Extrahera strukturell information (60-70% kvalitet)
- Parsa BPMN-filer
- Extrahera gateways, paths, Feature Goals
- Bygga flödesgraf

### 2. Identifiera alla leaf nodes (80-90% kvalitet)
- Identifiera alla end events, error events, terminate events
- Identifiera alla paths till varje leaf node
- Analysera coverage (identifiera saknade paths)

### 3. Läsa Feature Goal-dokumentation (80-90% kvalitet)
- Läs Feature Goal-dokumentation (redan genererad)
- Extrahera flowSteps, userStories, prerequisites, outputs

### 4. Claude-generering (70-80% kvalitet)
- För varje saknad path, skicka till Claude:
  - Path-struktur + Feature Goal-dokumentation
- Claude genererar:
  - name, summary, given, when, then
  - bankProjectTestSteps (action, assertion, delvis uiInteraction, dmnDecision, backendState)
  - subprocessSteps (description, given, when, then)

### 5. Testprofessional komplettering (80-100% kvalitet)
- Lägger till konkreta API-endpoints
- Lägger till konkreta UI-selectors
- Lägger till konkreta DMN-tabellnamn
- Lägger till konkreta backend-strukturer
- Validerar att scenarios är korrekta

---

## 🎯 Slutsats

**Hur vi skapar bra E2E-scenarios:**

1. ✅ **Systematisk coverage-analys** - säkerställer att alla leaf nodes analyseras
2. ✅ **Feature Goal-baserad generering** - använder beskrivningar även utan konkreta API:er och GUI
3. ✅ **Claude-förbättrad struktur** - 70-80% kvalitet på grundstruktur
4. ⚠️ **Testprofessional komplettering** - 40-50% måste manuellt läggas till (API-endpoints, UI-selectors, etc.)

**Resultat:**
- ✅ **Bra grund** (70-80% kvalitet) - strukturerad, konsistent, användbar
- ⚠️ **Kräver komplettering** (40-50% måste manuellt läggas till)
- ✅ **Bättre än ingenting** - sparar tid, ger konsistens, bra startpunkt

**Rekommendation:**
- ✅ Implementera systematisk coverage-analys
- ✅ Använd Feature Goal-beskrivningar för Claude-generering
- ⚠️ Förvänta komplettering (40-50% måste manuellt läggas till)
- ✅ **Bra grund att bygga vidare på, men inte komplett utan manuell komplettering**

---

**Datum:** 2025-12-22
**Status:** Sammanfattning klar - Process för att skapa bra E2E-scenarios





