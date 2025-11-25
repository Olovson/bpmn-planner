# Förklaring: XML-ordning vs Exekveringsordning

## Kort svar: NEJ, XML-ordningen påverkar INTE exekveringsordningen

**bpmn-js och BPMN-specifikationen använder INTE XML-ordningen för att bestämma exekveringsordning.**

Ordningen i XML:en är **irrelevant** - exekveringsordningen bestäms av **sequence flows** (referenser mellan element).

## Vad bestämmer exekveringsordningen?

### Exekveringsordningen bestäms av SEQUENCE FLOWS, inte XML-ordning

**I BPMN:**
- Exekveringsordningen följer **sequence flows** (`sourceRef` → `targetRef`)
- XML-ordningen spelar **ingen roll**
- Element kan vara definierade i vilken ordning som helst i XML:en

**Exempel:**
```xml
<!-- Detta är OK - ordningen spelar ingen roll -->
<bpmn:callActivity id="offer" />
<bpmn:callActivity id="kyc" />
<bpmn:sequenceFlow sourceRef="kyc" targetRef="offer" />
```

**Exekveringsordningen är ändå:**
1. `kyc` (först, eftersom sequence flow går från kyc till offer)
2. `offer` (efter, eftersom sequence flow går till offer)

## Ordningen i mortgage.bpmn XML

### I vilken ordning är elementen definierade i XML:en?

Från `mortgage.bpmn` (rad för rad i XML:en):

1. **startEvent** (`Event_0ssbeto`) - rad 4
2. **intermediateThrowEvent** (`event-application-evaluation-completed`) - rad 7
3. **callActivity** (`credit-evaluation`) - rad 12
4. **exclusiveGateway** (`Gateway_0kd315e`) - rad 17
5. **intermediateThrowEvent** (`event-credit-evaluation-complete`) - rad 22
6. **callActivity** (`credit-decision`) - rad 27
7. **exclusiveGateway** (`is-credit-approved`) - rad 32
8. **intermediateThrowEvent** (`event-credit-decision-completed`) - rad 37
9. **endEvent** (`event-application-evaluated`) - rad 42
10. **callActivity** (`signing`) - rad 54
11. **callActivity** (`disbursement`) - rad 59
12. **callActivity** (`offer`) - rad 64
13. **intermediateThrowEvent** (`event-loan-ready`) - rad 78
14. **intermediateThrowEvent** (`event-signing-completed`) - rad 87
15. **callActivity** (`collateral-registration`) - rad 93
16. **intermediateThrowEvent** (`event-collateral-registration-completed`) - rad 98
17. **exclusiveGateway** (`is-automatically-approved`) - rad 122
18. **intermediateThrowEvent** (`event-automatically-approved`) - rad 128
19. **endEvent** (`application-automatically-rejected`) - rad 134
20. **intermediateThrowEvent** (`event-application-manually-approved`) - rad 139
21. **exclusiveGateway** (`is-purchase`) - rad 149
22. **callActivity** (`mortgage-commitment`) - rad 155
23. **exclusiveGateway** (`Gateway_0m8pi2g`) - rad 162
24. **intermediateThrowEvent** (`event-credit-evaluation-completed`) - rad 170
25. **callActivity** (`kyc`) - rad 200
26. **intermediateThrowEvent** (`Event_111bwbu`) - rad 206
27. **callActivity** (`signing-advance`) - rad 216
28. **callActivity** (`disbursement-advance`) - rad 224
29. **callActivity** (`document-generation`) - rad 235
30. **callActivity** (`document-generation-advance`) - rad 239
31. **callActivity** (`application`) - rad 253
32. **callActivity** (`appeal`) - rad 286
33. **callActivity** (`manual-credit-evaluation`) - rad 328

### Observera: XML-ordningen matchar INTE exekveringsordningen!

**XML-ordning (som de är definierade):**
1. `credit-evaluation` (rad 12)
2. `credit-decision` (rad 27)
3. `signing` (rad 54)
4. `disbursement` (rad 59)
5. `offer` (rad 64)
6. `kyc` (rad 200) ← **Kommer EFTER offer i XML!**
7. `application` (rad 253) ← **Kommer EFTER kyc i XML!**

**Exekveringsordning (från sequence flows):**
1. `application` (först - start event → application)
2. `credit-evaluation`
3. `kyc` (efter credit-evaluation-complete event)
4. `credit-decision` (efter kyc)
5. `offer` (efter credit-decision-completed event)
6. `signing`
7. `disbursement`

**XML-ordningen är helt annorlunda än exekveringsordningen!**

## Hur bpmn-js fungerar

### bpmn-js bygger en intern modell baserat på referenser

**När bpmn-js läser XML:en:**

1. **Läser alla element** (i vilken ordning som helst)
2. **Bygger en intern modell** baserat på **referenser** (ID:n, sourceRef, targetRef)
3. **Använder INTE XML-ordningen** för något

**Exempel:**
```typescript
// bpmn-js läser XML och bygger modell:
allElements.forEach((element) => {
  // Läser element oavsett ordning i XML
  // Bygger modell baserat på ID:n och referenser
});

// Sequence flows länkar element tillsammans:
sequenceFlows.forEach((flow) => {
  // sourceRef → targetRef (referenser, inte XML-ordning)
});
```

**bpmn-js använder:**
- ✅ **Referenser** (ID:n, sourceRef, targetRef)
- ❌ **INTE XML-ordningen**

## Sammanfattning

### XML-ordningen:
- ❌ **Påverkar INTE** exekveringsordningen
- ❌ **Används INTE** av bpmn-js för något
- ✅ **Kan vara vilken ordning som helst** - BPMN-specifikationen tillåter det

### Exekveringsordningen:
- ✅ **Bestäms av sequence flows** (`sourceRef` → `targetRef`)
- ✅ **Följer BPMN-specifikationen** (start event → sequence flows → end event)
- ✅ **Beräknas av vår kod** (`calculateOrderFromSequenceFlows`)

### I mortgage.bpmn:
- **XML-ordning**: `credit-evaluation` → `credit-decision` → `offer` → `kyc` → `application`
- **Exekveringsordning**: `application` → `credit-evaluation` → `kyc` → `credit-decision` → `offer`

**XML-ordningen och exekveringsordningen är helt olika!**


