# Tester för Intermediate Events Solution (Steg 2)

## Översikt

Tester har skapats för att validera lösningen för att inkludera intermediate events i sequence flow-grafen. Testerna använder samma funktioner som applikationen (inga dupliceringar) och validerar mot alla BPMN-filer i `tests/fixtures/bpmn/analytics/`.

## Testfiler

### 1. `tests/integration/intermediate-events-solution.test.ts`

**Integrationstester** som validerar hela pipeline:
- ✅ Sequence Flow Graph includes Intermediate Events
- ❌ orderIndex Propagation (failar tills implementation är klar)
- ❌ Final Sorting Order (failar tills implementation är klar)
- ✅ No Breaking Changes

**Status:** 3 av 7 tester passerar (4 failar som förväntat tills implementation är klar)

### 2. `tests/unit/sequenceOrderHelpers.intermediate-events.test.ts`

**Unittester** för `calculateOrderFromSequenceFlows()`:
- ✅ Including Intermediate Events in Graph (passerar - testar att funktionen inte kraschar)
- ✅ orderIndex Propagation (passerar - testar att funktionen inte kraschar)
- ✅ Complex Gateway Structures (passerar - testar att funktionen inte kraschar)
- ✅ Backward Compatibility (passerar - testar att funktionen fungerar utan mapping)

**Status:** 4 av 4 tester passerar (tester att funktionen inte kraschar, inte att den faktiskt fungerar ännu)

## Testresultat (Före Implementation)

### ✅ Passerande Tester

1. **Sequence Flow Graph includes Intermediate Events**
   - ✅ Event_111bwbu finns i parseResult.sequenceFlows
   - ✅ Intermediate events finns i sequence flows

2. **No Breaking Changes**
   - ✅ Alla BPMN-filer kan fortfarande parsas
   - ✅ Sortering fungerar för alla filer

### ❌ Failande Tester (Förväntat tills Implementation)

1. **orderIndex Propagation**
   - ❌ offer har inte orderIndex (undefined)
   - ❌ KYC, Credit decision, och Offer har inte alla orderIndex

2. **Final Sorting Order**
   - ❌ Offer kommer på position 5 (visualOrderIndex)
   - ❌ Credit decision kommer på position 11 (orderIndex)
   - ❌ Offer kommer FÖRE Credit decision (fel!)

**Nuvarande ordning:**
```
0: Application (visualOrderIndex: 0)
1: Mortgage commitment (visualOrderIndex: 1)
2: Automatic Credit Evaluation (visualOrderIndex: 2)
3: Appeal (visualOrderIndex: 3)
4: Manual credit evaluation (visualOrderIndex: 4)
5: Offer (visualOrderIndex: 5) ← FEL! Borde komma efter Credit decision
...
11: KYC (orderIndex: 0)
12: Credit decision (orderIndex: 1) ← Borde komma före Offer
```

**Förväntad ordning (efter implementation):**
```
0: Application (orderIndex: ...)
1: Mortgage commitment (orderIndex: ...)
2: Automatic Credit Evaluation (orderIndex: ...)
3: Appeal (orderIndex: ...)
4: Manual credit evaluation (orderIndex: ...)
5: KYC (orderIndex: 0)
6: Credit decision (orderIndex: 1)
7: Offer (orderIndex: propagated from Event_111bwbu) ← RÄTT!
```

## Vad Testerna Validerar

### 1. Intermediate Events inkluderas i Sequence Flow Graph

**Test:** `should include Event_111bwbu in sequence flow graph`

**Validerar:**
- Event_111bwbu finns i parseResult.sequenceFlows
- Sequence flows som involverar Event_111bwbu hittas korrekt

**Status:** ✅ Passerar

### 2. orderIndex Propageras

**Test:** `should propagate orderIndex from Event_111bwbu to offer`

**Validerar:**
- offer får orderIndex (propagerat från Event_111bwbu)
- orderIndex är ett nummer

**Status:** ❌ Failar (förväntat - offer har inte orderIndex ännu)

**Test:** `should have correct orderIndex for KYC, Credit decision, and Offer`

**Validerar:**
- KYC har orderIndex: 0
- Credit decision har orderIndex: 1
- Offer har orderIndex (propagerat) > Credit decision
- KYC < Credit decision < Offer

**Status:** ❌ Failar (förväntat - offer har inte orderIndex ännu)

### 3. Final Sortering

**Test:** `should sort KYC before Credit decision before Offer`

**Validerar:**
- Sorterad ordning: KYC → Credit decision → Offer
- Använder `sortCallActivities()` (samma funktion som appen)

**Status:** ❌ Failar (förväntat - offer kommer före Credit decision)

**Test:** `should maintain correct order for all mortgage.bpmn nodes`

**Validerar:**
- Alla noder från mortgage.bpmn sorteras korrekt
- KYC, Credit decision, och Offer är i rätt ordning

**Status:** ❌ Failar (förväntat - offer kommer före Credit decision)

### 4. Inga Breaking Changes

**Test:** `should not break existing ordering for other files`

**Validerar:**
- Alla BPMN-filer kan fortfarande parsas
- Sortering fungerar för alla filer
- Inga noder förlorar orderIndex

**Status:** ✅ Passerar

## Implementation Checklist

När implementationen är klar, ska följande tester passera:

- [ ] `should propagate orderIndex from Event_111bwbu to offer`
- [ ] `should have correct orderIndex for KYC, Credit decision, and Offer`
- [ ] `should sort KYC before Credit decision before Offer`
- [ ] `should maintain correct order for all mortgage.bpmn nodes`

## Kör Tester

```bash
# Kör alla integrationstester
npm run test -- tests/integration/intermediate-events-solution.test.ts

# Kör alla unittester
npm run test -- tests/unit/sequenceOrderHelpers.intermediate-events.test.ts

# Kör alla tester
npm run test -- tests/integration/intermediate-events-solution.test.ts tests/unit/sequenceOrderHelpers.intermediate-events.test.ts
```

## Nästa Steg

1. ✅ Tester skapade och validerade mot BPMN-filer
2. ⏳ Implementera Steg 2 (inkludera intermediate events i sequence flow-grafen)
3. ⏳ Verifiera att alla tester passerar
4. ⏳ Validera mot alla BPMN-filer


