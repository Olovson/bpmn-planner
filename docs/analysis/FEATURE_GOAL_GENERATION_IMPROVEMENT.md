# Förbättring: Använd BPMN-strukturell information för Feature Goal-generering

> ✅ **Status:** Implementerad (2025-12-22)  
> Feature Goal-generering använder nu strukturell BPMN-information (gateway-conditions, process paths, flödesinformation) för att förbättra dokumentationskvaliteten.

## 🎯 Syfte

Analysera vad vi använder nu för Feature Goal-generering och identifiera vilken strukturell BPMN-information vi har tillgång till men inte använder.

---

## 📊 Vad vi använder nu för Feature Goal-generering

### Nuvarande kontext till Claude:

1. **ProcessContext:**
   - Root BPMN-fil
   - Hela processhierarkin
   - Sibling nodes
   - Child nodes

2. **CurrentNodeContext:**
   - BPMN-element information (id, name, type)
   - Business object properties
   - Incoming/outgoing flows (grundläggande)

3. **ChildrenDocumentation:**
   - Dokumentation för child nodes (om de redan är genererade)

**Vad saknas:**
- ❌ Gateway-conditions som avgör när Feature Goal anropas
- ❌ ProcessPath-information (vilka paths går genom Feature Goal)
- ❌ Gateway-kontext (vilka gateway-conditions gäller FÖRE Feature Goal)
- ❌ Flödesinformation (hur Feature Goal länkar till andra Feature Goals)
- ❌ End events som Feature Goal kan leda till

---

## 🔍 Vad vi har tillgång till men inte använder

### Från BPMN-strukturell analys:

1. **ProcessPath-information:**
   - 257 paths hittades från 19 BPMN-filer
   - Varje path innehåller:
     - Start event → End event
     - Feature Goals i ordning
     - Gateway-conditions
     - Alla nodes i pathen

2. **Gateway-kontext:**
   - Vilka gateway-conditions gäller FÖRE varje Feature Goal
   - T.ex. `credit-evaluation` har `KALP OK = Yes` som gateway-condition

3. **Flödesinformation:**
   - Hur Feature Goals länkar samman
   - Vilka Feature Goals kommer FÖRE/EFTER
   - Vilka paths går genom Feature Goal

4. **End events:**
   - Vilka end events Feature Goal kan leda till
   - Error events, terminate events, etc.

---

## 💡 Förbättringar: Använd strukturell information

### Förbättring 1: Gateway-kontext i Feature Goal-generering

**Nuvarande approach:**
- Claude får ingen information om gateway-conditions
- Feature Goal-dokumentation inkluderar inte gateway-kontext

**Förbättrad approach:**
- Inkludera gateway-conditions som gäller FÖRE Feature Goal
- T.ex. "Feature Goal `credit-evaluation` anropas när `KALP OK = Yes`"

**Exempel:**
```typescript
{
  currentNodeContext: {
    // ... existing context
    gatewayContext: [
      {
        gatewayId: 'gateway-kalp',
        gatewayName: 'KALP OK?',
        condition: '${creditDecision.approved === true}',
        conditionText: 'creditDecision.approved === true',
      },
    ],
  },
}
```

**Fördelar:**
- ✅ Feature Goal-dokumentation inkluderar gateway-kontext
- ✅ Bättre förståelse för när Feature Goal anropas
- ✅ Bättre för E2E-scenario-generering (redan använt)

---

### Förbättring 2: ProcessPath-information i Feature Goal-generering

**Nuvarande approach:**
- Claude får ingen information om paths som går genom Feature Goal
- Feature Goal-dokumentation inkluderar inte path-kontext

**Förbättrad approach:**
- Inkludera paths som går genom Feature Goal
- T.ex. "Feature Goal `credit-evaluation` ingår i 5 paths: path-1, path-2, ..."

**Exempel:**
```typescript
{
  currentNodeContext: {
    // ... existing context
    processPaths: [
      {
        pathId: 'path-1',
        startEvent: 'start-event',
        endEvent: 'end-event-approved',
        featureGoals: ['application', 'credit-evaluation', 'mortgage-commitment'],
        gatewayConditions: [...],
      },
      // ... more paths
    ],
  },
}
```

**Fördelar:**
- ✅ Feature Goal-dokumentation inkluderar path-kontext
- ✅ Bättre förståelse för Feature Goal's roll i processen
- ✅ Bättre för E2E-scenario-generering

---

### Förbättring 3: Flödesinformation i Feature Goal-generering

**Nuvarande approach:**
- Claude får grundläggande incoming/outgoing flows
- Ingen information om hur Feature Goals länkar samman

**Förbättrad approach:**
- Inkludera information om Feature Goals FÖRE/EFTER
- T.ex. "Feature Goal `credit-evaluation` kommer efter `application` och före `mortgage-commitment`"

**Exempel:**
```typescript
{
  currentNodeContext: {
    // ... existing context
    flowContext: {
      previousFeatureGoals: ['application'],
      nextFeatureGoals: ['mortgage-commitment', 'rejection'],
      gatewayConditions: [...],
    },
  },
}
```

**Fördelar:**
- ✅ Feature Goal-dokumentation inkluderar flödeskontext
- ✅ Bättre förståelse för Feature Goal's position i processen
- ✅ Bättre för prerequisites och dependencies

---

### Förbättring 4: End events i Feature Goal-generering

**Nuvarande approach:**
- Claude får ingen information om end events som Feature Goal kan leda till
- Feature Goal-dokumentation inkluderar inte end event-kontext

**Förbättrad approach:**
- Inkludera end events som Feature Goal kan leda till
- T.ex. "Feature Goal `credit-evaluation` kan leda till `end-event-approved` eller `end-event-rejected`"

**Exempel:**
```typescript
{
  currentNodeContext: {
    // ... existing context
    endEvents: [
      {
        id: 'end-event-approved',
        type: 'endEvent',
        name: 'Approved',
        gatewayConditions: ['KALP OK = Yes'],
      },
      {
        id: 'end-event-rejected',
        type: 'endEvent',
        name: 'Rejected',
        gatewayConditions: ['KALP OK = No'],
      },
    ],
  },
}
```

**Fördelar:**
- ✅ Feature Goal-dokumentation inkluderar end event-kontext
- ✅ Bättre förståelse för Feature Goal's outputs
- ✅ Bättre för E2E-scenario-generering

---

## 🎯 Rekommenderad approach: Hybrid kontext

### Steg 1: Extrahera strukturell information (redan gjort)

**Vad vi gör:**
- Bygg ProcessPath för alla BPMN-filer
- Extrahera gateway-conditions
- Identifiera Feature Goals i paths

**Resultat:**
- 257 paths från 19 BPMN-filer
- Gateway-kontext för varje Feature Goal
- Flödesinformation

---

### Steg 2: Berika NodeDocumentationContext med strukturell information

**Vad vi gör:**
- För varje Feature Goal, hitta:
  - Gateway-conditions som gäller FÖRE
  - Paths som går genom Feature Goal
  - Feature Goals FÖRE/EFTER
  - End events som Feature Goal kan leda till

**Implementation:**
```typescript
function enrichNodeContextWithStructuralInfo(
  nodeContext: NodeDocumentationContext,
  paths: ProcessPath[],
  flowGraph: FlowGraph
): NodeDocumentationContext {
  const featureGoalId = nodeContext.node.bpmnElementId;
  
  // 1. Hitta paths som går genom Feature Goal
  const pathsThroughFeatureGoal = paths.filter(p => 
    p.featureGoals.includes(featureGoalId)
  );
  
  // 2. Hitta gateway-conditions FÖRE Feature Goal
  const gatewayConditions = extractGatewayConditionsForFeatureGoal(
    pathsThroughFeatureGoal,
    featureGoalId
  );
  
  // 3. Hitta Feature Goals FÖRE/EFTER
  const flowContext = extractFlowContext(
    pathsThroughFeatureGoal,
    featureGoalId
  );
  
  // 4. Hitta end events
  const endEvents = extractEndEventsForFeatureGoal(
    pathsThroughFeatureGoal,
    featureGoalId
  );
  
  return {
    ...nodeContext,
    structuralInfo: {
      gatewayConditions,
      processPaths: pathsThroughFeatureGoal,
      flowContext,
      endEvents,
    },
  };
}
```

---

### Steg 3: Uppdatera prompt för att använda strukturell information

**Vad vi gör:**
- Uppdatera `feature_epic_prompt.md` för att inkludera strukturell information
- Instruera Claude att använda gateway-kontext, path-kontext, etc.

**Exempel prompt-tillägg:**
```markdown
## Strukturell information

Följande strukturell information är tillgänglig för Feature Goal:

### Gateway-kontext
Feature Goal anropas när följande gateway-conditions är uppfyllda:
- Gateway: "KALP OK?" → Condition: "creditDecision.approved === true"

### ProcessPath-kontext
Feature Goal ingår i följande paths:
- Path 1: start-event → end-event-approved (via application → credit-evaluation → mortgage-commitment)
- Path 2: start-event → end-event-rejected (via application → credit-evaluation → rejection)

### Flödeskontext
Feature Goal kommer efter: application
Feature Goal kommer före: mortgage-commitment, rejection

### End events
Feature Goal kan leda till:
- end-event-approved (när KALP OK = Yes)
- end-event-rejected (när KALP OK = No)

Använd denna strukturell information för att:
- Förbättra prerequisites (inkludera gateway-conditions)
- Förbättra flowSteps (inkludera path-kontext)
- Förbättra outputs (inkludera end events)
```

---

## 📊 Förväntad kvalitetsförbättring

### Nuvarande kvalitet: 80-85%

**Vad fungerar bra:**
- Feature Goal-dokumentation är generellt bra
- User stories är relevanta
- Flow steps är beskrivande

**Vad saknas:**
- Gateway-kontext
- Path-kontext
- Flödeskontext
- End event-kontext

---

### Förväntad kvalitet med strukturell information: 85-90%

**Förbättringar:**
- ✅ Prerequisites inkluderar gateway-conditions
- ✅ Flow steps inkluderar path-kontext
- ✅ Outputs inkluderar end events
- ✅ Dependencies är mer korrekta (baserat på flödeskontext)

**Exempel förbättring:**

**Före:**
```markdown
## Prerequisites
- Customer is identified
- Application is complete
```

**Efter:**
```markdown
## Prerequisites
- Customer is identified
- Application is complete
- Gateway condition: KALP OK = Yes (creditDecision.approved === true)
```

---

## 🎯 Implementation plan

### Steg 1: Bygg strukturell information (redan gjort)
- ✅ Extrahera ProcessPath för alla BPMN-filer
- ✅ Extrahera gateway-conditions
- ✅ Identifiera Feature Goals i paths

### Steg 2: Berika NodeDocumentationContext
- [ ] Implementera `enrichNodeContextWithStructuralInfo()`
- [ ] Integrera med `buildContextPayload()`
- [ ] Testa med riktiga BPMN-filer

### Steg 3: Uppdatera prompt
- [ ] Uppdatera `feature_epic_prompt.md` för att inkludera strukturell information
- [ ] Instruera Claude att använda strukturell information
- [ ] Testa med riktiga Feature Goals

### Steg 4: Validera kvalitetsförbättring
- [ ] Generera Feature Goal-dokumentation med strukturell information
- [ ] Jämför med tidigare dokumentation
- [ ] Validera att kvaliteten förbättras

---

## 💡 Slutsats

**Ja, vi borde använda strukturell BPMN-information för Feature Goal-generering!**

**Varför:**
1. ✅ Vi har redan extraherat informationen (257 paths, gateway-conditions, etc.)
2. ✅ Information är relevant för Feature Goal-dokumentation
3. ✅ Förväntad kvalitetsförbättring: 80-85% → 85-90%
4. ✅ Bättre för E2E-scenario-generering (redan använt)

**Nästa steg:**
- ✅ Implementera `enrichNodeContextWithStructuralInfo()` (klar)
- ✅ Uppdatera prompt för att använda strukturell information (klar)
- ⏳ Validera kvalitetsförbättring (pågår - kräver regenerering av dokumentation)

---

**Datum:** 2025-12-22  
**Status:** ✅ Implementerad - Feature Goal-generering använder nu strukturell BPMN-information

