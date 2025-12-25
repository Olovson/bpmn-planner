# Analys: BPMN Execution Semantics för E2E-scenarios

## 🎯 Syfte

Analysera hur vi kan förstå hur en BPMN-process faktiskt fungerar (execution semantics) utan att köra den i en BPMN-engine som Camunda. Vad kan vi extrahera från BPMN XML, och vad kräver faktisk execution?

---

## 📊 Vad är BPMN Execution Semantics?

**BPMN Execution Semantics** beskriver **hur** en BPMN-process faktiskt körs:

1. **Sequence Flow Execution**: Vilken ordning noder körs i
2. **Gateway Evaluation**: Hur gateways evaluerar conditions och väljer paths
3. **Data Flow**: Hur data flödar mellan noder (input/output)
4. **Event Handling**: Hur events triggas (start, end, error, timer, etc.)
5. **Subprocess Execution**: Hur subprocesser (Call Activities) anropas och returnerar

**Exempel:**
```xml
<bpmn:exclusiveGateway id="Gateway_1">
  <bpmn:outgoing>Flow_1</bpmn:outgoing>
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
</bpmn:exclusiveGateway>

<bpmn:sequenceFlow id="Flow_1" sourceRef="Gateway_1" targetRef="CallActivity_Offer">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
    ${creditDecision.approved === true}
  </bpmn:conditionExpression>
</bpmn:sequenceFlow>
```

**Execution Semantics:**
- När processen når `Gateway_1`, evalueras `Flow_1` condition: `${creditDecision.approved === true}`
- Om condition är `true` → följ `Flow_1` → kör `CallActivity_Offer`
- Om condition är `false` → följ `Flow_2` → hoppa över `CallActivity_Offer`

**Problemet:** Utan en BPMN-engine kan vi inte **faktiskt evaluera** conditions. Vi kan bara **läsa** dem.

---

## 🔍 Vad kan vi extrahera från BPMN XML?

### 1. Strukturell information (90-100% säkerhet)

**Vad vi KAN extrahera:**
- ✅ Gateway-typ (exclusive, parallel, inclusive, event-based)
- ✅ Sequence flows (source, target)
- ✅ Conditions som **text** (t.ex. `${creditDecision.approved === true}`)
- ✅ Nod-typer (start event, task, call activity, gateway, end event)
- ✅ Nod-ordning (baserat på sequence flows)

**Exempel:**
```typescript
{
  gateway: {
    id: "Gateway_1",
    type: "exclusiveGateway",
    outgoingFlows: [
      {
        id: "Flow_1",
        target: "CallActivity_Offer",
        condition: "${creditDecision.approved === true}" // Text, inte evaluerad
      },
      {
        id: "Flow_2",
        target: "EndEvent_Rejected",
        condition: "${creditDecision.approved === false}" // Text, inte evaluerad
      }
    ]
  }
}
```

**Säkerhet:** ⭐⭐⭐⭐⭐ Hög (90-100%)
- XML är strukturerad och kan parsas deterministiskt
- Information finns explicit i XML

---

### 2. Path-identifiering (70-80% säkerhet)

**Vad vi KAN göra:**
- ✅ Identifiera **alla möjliga paths** genom processen
- ✅ Identifiera **vilka Feature Goals** som finns i varje path
- ✅ Identifiera **gateway-conditions** som avgör vilken path som används

**Vad vi INTE kan göra:**
- ❌ **Vet inte** vilken path som faktiskt körs (kräver condition evaluation)
- ❌ **Vet inte** när en path körs (kräver runtime data)

**Exempel:**
```typescript
{
  paths: [
    {
      type: "possible-path", // Inte "happy-path" - vi vet inte om den faktiskt körs
      featureGoals: ["internal-data-gathering", "credit-decision", "offer"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          condition: "${creditDecision.approved === true}" // Vi vet inte om denna är true
        }
      ]
    },
    {
      type: "possible-path",
      featureGoals: ["internal-data-gathering", "credit-decision"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          condition: "${creditDecision.approved === false}" // Vi vet inte om denna är true
        }
      ]
    }
  ]
}
```

**Säkerhet:** ⭐⭐⭐ Medel-Hög (70-80%)
- Vi kan identifiera alla möjliga paths
- Men vi vet inte vilken path som faktiskt körs utan runtime data

---

### 3. Condition-semantik (30-50% säkerhet)

**Vad vi KAN göra:**
- ✅ Läsa conditions som **text**
- ✅ Använda Claude för att **förstå semantiken** (t.ex. "Kreditbeslut är godkänt")
- ✅ Identifiera **variabler** i conditions (t.ex. `creditDecision.approved`)

**Vad vi INTE kan göra:**
- ❌ **Evaluera** conditions (kräver runtime data)
- ❌ **Veta** när en condition är true/false (kräver runtime data)
- ❌ **Förstå** komplexa expressions utan Claude (t.ex. `${amount > 100000 && creditScore > 700}`)

**Exempel:**
```typescript
{
  condition: "${creditDecision.approved === true}",
  conditionText: "creditDecision.approved === true",
  claudeInterpretation: "Kreditbeslut är godkänt", // Från Claude
  variables: ["creditDecision.approved"], // Identifierade variabler
  // Men vi vet INTE om creditDecision.approved faktiskt är true
}
```

**Säkerhet:** ⭐⭐ Låg-Medel (30-50%)
- Vi kan läsa och förstå conditions
- Men vi kan inte evaluera dem utan runtime data

---

## 🤔 Behöver vi Camunda (eller annan BPMN-engine)?

### Alternativ 1: Bara parsa BPMN XML (vad vi gör nu)

**Fördelar:**
- ✅ Ingen extern dependency
- ✅ Snabb och enkel
- ✅ Fungerar offline

**Nackdelar:**
- ❌ Kan inte evaluera conditions
- ❌ Kan inte förstå execution semantics
- ❌ Kan bara identifiera **möjliga** paths, inte **faktiska** paths

**Kvalitet för E2E-scenarios:**
- ⭐⭐⭐ Medel (60-70%)
- Vi kan generera scenarios för alla möjliga paths
- Men vi vet inte vilka paths som faktiskt körs

---

### Alternativ 2: Använda Camunda Engine

**Fördelar:**
- ✅ Kan faktiskt **köra** BPMN-processer
- ✅ Kan **evaluera** conditions med testdata
- ✅ Kan **förstå** execution semantics
- ✅ Kan identifiera **faktiska** paths (inte bara möjliga)

**Nackdelar:**
- ❌ Kräver Camunda Engine (stor dependency)
- ❌ Kräver testdata för att evaluera conditions
- ❌ Komplexare setup och maintenance

**Kvalitet för E2E-scenarios:**
- ⭐⭐⭐⭐ Hög (85-95%)
- Vi kan generera scenarios för faktiska paths
- Men kräver testdata för condition evaluation

---

### Alternativ 3: Hybrid (BPMN XML + Claude + Testdata)

**Fördelar:**
- ✅ Ingen BPMN-engine dependency
- ✅ Kan förstå conditions med Claude
- ✅ Kan använda testdata för att simulera condition evaluation

**Nackdelar:**
- ❌ Kräver testdata för condition evaluation
- ❌ Kan inte faktiskt köra processen
- ❌ Simulering, inte faktisk execution

**Kvalitet för E2E-scenarios:**
- ⭐⭐⭐ Medel-Hög (70-80%)
- Vi kan generera scenarios för paths baserat på testdata
- Men det är simulering, inte faktisk execution

---

## 🎯 Rekommenderad approach: Hybrid (BPMN XML + Claude + Testdata)

### Steg 1: Extrahera strukturell information från BPMN XML

**Vad vi gör:**
1. **Parsa BPMN-filen** för att hitta gateways, sequence flows, conditions
2. **Bygga en flödesgraf** av noder och edges
3. **Identifiera alla möjliga paths** genom processen

**Output:**
```typescript
{
  possiblePaths: [
    {
      id: "path-1",
      featureGoals: ["internal-data-gathering", "credit-decision", "offer"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          condition: "${creditDecision.approved === true}",
          conditionText: "creditDecision.approved === true"
        }
      ]
    },
    {
      id: "path-2",
      featureGoals: ["internal-data-gathering", "credit-decision"],
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          condition: "${creditDecision.approved === false}",
          conditionText: "creditDecision.approved === false"
        }
      ]
    }
  ]
}
```

---

### Steg 2: Använda Claude för att förstå conditions

**Vad vi gör:**
1. **Skicka conditions till Claude** tillsammans med Feature Goal-dokumentation
2. **Låt Claude förstå semantiken** och konvertera till Given-conditions
3. **Låt Claude identifiera** vilka variabler som behövs för condition evaluation

**Output:**
```typescript
{
  condition: "${creditDecision.approved === true}",
  claudeInterpretation: {
    givenCondition: "Kreditbeslut är godkänt",
    requiredVariables: ["creditDecision.approved"],
    requiredFeatureGoals: ["credit-decision"], // Feature Goal som sätter creditDecision
    testDataRequirements: {
      "creditDecision.approved": {
        type: "boolean",
        description: "Om kreditbeslut är godkänt eller inte",
        setBy: "credit-decision" // Feature Goal som sätter detta värde
      }
    }
  }
}
```

---

### Steg 3: Använda testdata för att simulera condition evaluation

**Vad vi gör:**
1. **För varje möjlig path**: Simulera condition evaluation med testdata
2. **Identifiera vilka paths som kan köras** baserat på testdata
3. **Generera E2E-scenarios** för paths som kan köras

**Exempel testdata:**
```typescript
{
  "credit-decision-standard": {
    "creditDecision": {
      "approved": true,
      "amount": 2000000,
      "interestRate": 3.5
    }
  },
  "credit-decision-rejected": {
    "creditDecision": {
      "approved": false,
      "reason": "Insufficient credit score"
    }
  }
}
```

**Simulering:**
```typescript
function simulatePathExecution(
  path: PossiblePath,
  testData: TestData
): SimulatedPath | null {
  // För varje gateway-condition i pathen:
  for (const condition of path.gatewayConditions) {
    // Evaluera condition med testdata
    const result = evaluateCondition(condition.condition, testData);
    if (!result) {
      // Condition är false, denna path kan inte köras med denna testdata
      return null;
    }
  }
  
  // Alla conditions är true, denna path kan köras
  return {
    ...path,
    type: determinePathType(path), // "happy-path" eller "error-path"
    testData: testData,
    simulated: true
  };
}
```

---

### Steg 4: Generera E2E-scenarios från simulerade paths

**Vad vi gör:**
1. **För varje simulerad path**: Skapa en E2E-scenario
2. **För varje Feature Goal i pathen**: Lägg till ett steg
3. **För varje gateway-condition**: Lägg till Given-conditions (från Claude)

**Output:**
```typescript
{
  id: "e2e-happy-path-1",
  name: "Happy Path - Köp bostadsrätt (Kreditbeslut godkänt)",
  type: "happy-path",
  priority: "P1",
  bpmnProcess: "mortgage-se-application.bpmn",
  testData: "credit-decision-standard", // Testdata som används
  featureGoals: [
    "internal-data-gathering",
    "credit-decision",
    "offer"
  ],
  steps: [
    {
      order: 1,
      featureGoal: "internal-data-gathering",
      action: "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata",
      assertion: "Intern kunddata är hämtad och kvalitetssäkrad"
    },
    {
      order: 2,
      featureGoal: "credit-decision",
      action: "Systemet fattar kreditbeslut baserat på insamlad data",
      assertion: "Kreditbeslut är fattat och tillgängligt",
      gatewayConditions: [
        {
          gatewayId: "Gateway_1",
          gatewayName: "Is credit approved?",
          condition: "${creditDecision.approved === true}",
          givenCondition: "Kreditbeslut är godkänt", // Från Claude
          evaluated: true, // Simulerad med testdata
          result: true // Resultat från simulering
        }
      ]
    },
    {
      order: 3,
      featureGoal: "offer", // Bara om gateway-condition är true
      action: "Systemet skapar erbjudande baserat på kreditbeslut",
      assertion: "Erbjudande är skapat och tillgängligt",
      prerequisites: [
        "Kreditbeslut är godkänt", // Från gateway-condition
        "Kreditbeslut är fattat"
      ]
    }
  ]
}
```

---

## 📊 Jämförelse: BPMN XML vs Camunda Engine

| Aspekt | BPMN XML (Hybrid) | Camunda Engine |
|--------|-------------------|----------------|
| **Dependency** | Ingen | Camunda Engine |
| **Setup** | Enkel | Komplex |
| **Condition Evaluation** | Simulering med testdata | Faktisk evaluation |
| **Path Identification** | Alla möjliga paths | Faktiska paths (med testdata) |
| **Execution Semantics** | Simulering | Faktisk execution |
| **Kvalitet** | ⭐⭐⭐ Medel-Hög (70-80%) | ⭐⭐⭐⭐ Hög (85-95%) |
| **Maintenance** | Låg | Hög |
| **Flexibilitet** | Hög | Låg (bunden till Camunda) |

---

## 🎯 Slutsats och Rekommendation

### Rekommendation: Hybrid (BPMN XML + Claude + Testdata)

**Varför:**
1. **Ingen extern dependency**: Ingen BPMN-engine behövs
2. **Tillräcklig kvalitet**: 70-80% kvalitet är tillräckligt för E2E-scenarios
3. **Flexibilitet**: Kan användas med vilken BPMN-struktur som helst
4. **Underhållbarhet**: Enklare att underhålla än en BPMN-engine

**Vad vi gör:**
1. **Extrahera strukturell information** från BPMN XML (gateways, paths, conditions)
2. **Använda Claude** för att förstå conditions och konvertera till Given-conditions
3. **Använda testdata** för att simulera condition evaluation
4. **Generera E2E-scenarios** från simulerade paths

**Vad vi INTE gör:**
- ❌ Köra BPMN-processer faktiskt (kräver BPMN-engine)
- ❌ Evaluera conditions faktiskt (kräver runtime data)
- ❌ Förstå execution semantics faktiskt (kräver BPMN-engine)

**Kvalitet:**
- ⭐⭐⭐ Medel-Hög (70-80%)
- Tillräckligt för E2E-scenarios
- Men inte perfekt (kräver manuell översyn)

---

### När att använda Camunda Engine

**Använd Camunda Engine om:**
- Du behöver **faktisk execution** av BPMN-processer
- Du behöver **100% korrekta** paths (inte bara möjliga)
- Du har **komplexa conditions** som är svåra att simulera
- Du har **resurser** för att underhålla en BPMN-engine

**Använd Hybrid (BPMN XML + Claude + Testdata) om:**
- Du vill **undvika externa dependencies**
- Du är **nöjd med 70-80% kvalitet**
- Du har **testdata** för condition evaluation
- Du vill ha **flexibilitet** och **lätt underhåll**

---

**Datum:** 2025-12-22
**Status:** Analys klar



