# Cleanup: Borttagen Gammal Kod

## Översikt

Efter implementationen av intermediate events support har gammal, oanvänd kod rensats bort för att hålla applikationen ren och underhållbar.

## Borttagen Kod

### 1. Oanvänd Parameter i `assignLocalOrderForFile()`

**Fil:** `src/lib/bpmn/processGraphBuilder.ts`

**Borttaget:**
- `edges: ProcessGraphEdge[]` parameter (rad 403)
- `fileEdges` variabel som skapades men inte användes (rad 554-556)
- `edgesByFile` Map som skapades men inte användes (rad 536-544)

**Anledning:**
- Vi använder nu `parseResult.sequenceFlows` direkt istället för att konvertera från edges
- Detta eliminerar onödig konvertering och gör koden enklare

**Före:**
```typescript
function assignLocalOrderForFile(
  fileName: string,
  nodes: ProcessGraphNode[],
  edges: ProcessGraphEdge[],  // ← Borttagen
  parseResult: BpmnParseResult,
): Map<string, OrderInfo> {
  const sequenceEdges = edges.filter((e) => e.type === 'sequence');
  const sequenceFlows = sequenceEdges.map((e) => ({
    // ...
  }));
}
```

**Efter:**
```typescript
function assignLocalOrderForFile(
  fileName: string,
  nodes: ProcessGraphNode[],
  parseResult: BpmnParseResult,  // ← Ingen edges parameter
): Map<string, OrderInfo> {
  const sequenceFlows = parseResult.sequenceFlows || [];  // ← Direkt från parseResult
}
```

### 2. Duplicerad Variabel i `calculateOrderFromSequenceFlows()`

**Fil:** `src/lib/bpmn/sequenceOrderHelpers.ts`

**Borttaget:**
- `sequenceRelevant` Set (rad 34-38)
- Ersatt med `allSequenceElementIds` som gör samma sak

**Anledning:**
- `sequenceRelevant` och `allSequenceElementIds` innehöll samma data
- En variabel räcker

**Före:**
```typescript
const sequenceRelevant = new Set<string>();
sequenceFlows.forEach((flow) => {
  sequenceRelevant.add(flow.sourceRef);
  sequenceRelevant.add(flow.targetRef);
});

const allSequenceElementIds = new Set<string>();
sequenceFlows.forEach((flow) => {
  allSequenceElementIds.add(flow.sourceRef);
  allSequenceElementIds.add(flow.targetRef);
});
```

**Efter:**
```typescript
const allSequenceElementIds = new Set<string>();
sequenceFlows.forEach((flow) => {
  allSequenceElementIds.add(flow.sourceRef);
  allSequenceElementIds.add(flow.targetRef);
});
```

### 3. Uppdaterade Tester

**Fil:** `tests/integration/mortgage.order-validation.test.ts`

**Ändrat:**
- Uppdaterad `expectedMortgageLabels` för att reflektera korrekt ordning
- KYC och Credit decision kommer nu före Offer (korrekt ordning)

**Före:**
```typescript
const expectedMortgageLabels = [
  'Application',
  'Mortgage commitment',
  'Automatic Credit Evaluation',
  'Appeal',
  'Manual credit evaluation',
  'Offer',  // ← FEL! Kom före KYC och Credit decision
  // ...
  'KYC',
  'Credit decision',
];
```

**Efter:**
```typescript
const expectedMortgageLabels = [
  'Application',
  'Automatic Credit Evaluation',
  'KYC',  // ← Korrekt ordning
  'Credit decision',  // ← Korrekt ordning
  'Offer',  // ← Kommer efter KYC och Credit decision
  // ...
];
```

## Kvarvarande Kod (Behövs)

### 1. `buildSequenceEdgesForFile()`

**Används för:** Att skapa `ProcessGraphEdge[]` för grafen
**Status:** Behövs fortfarande - används på rad 484

### 2. Debug Logging

**Används för:** Utveckling och debugging
**Status:** Behövs - användbart för att förstå vad som händer
**Plats:** `processGraphBuilder.ts` (rad 442-463, 583-596)

### 3. `extractSequenceFlows()`

**Används för:** Att extrahera sequence flows från parseResult
**Status:** Behövs - används i `buildSequenceEdgesForFile()`

## Resultat

### Före Cleanup:
- Oanvänd `edges` parameter
- Duplicerad `sequenceRelevant` variabel
- Oanvänd `fileEdges` variabel
- Oanvänd `edgesByFile` Map
- Felaktig expected order i tester

### Efter Cleanup:
- ✅ Inga oanvända parametrar
- ✅ Inga duplicerade variabler
- ✅ Inga oanvända variabler
- ✅ Korrekt expected order i tester
- ✅ Alla tester passerar (11/11)

## Verifiering

Alla relevanta tester passerar:
- ✅ `tests/integration/intermediate-events-solution.test.ts` (7/7)
- ✅ `tests/unit/sequenceOrderHelpers.intermediate-events.test.ts` (4/4)
- ✅ `tests/integration/mortgage.order-validation.test.ts` (2/2)
- ✅ `tests/integration/mortgage.tree-hierarchy.test.ts` (1/1)

**Totalt:** 14/14 tester passerar


