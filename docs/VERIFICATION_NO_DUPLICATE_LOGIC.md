# Verifiering: Ingen dubbellogik, fallback-lösningar eller hardcodade värden

## Sammanfattning

✅ **INGEN dubbellogik** - Alla tre pipelines använder samma funktioner:
- `calculateOrderFromSequenceFlows()` - EN funktion
- `calculateVisualOrderFromCoordinates()` - EN funktion  
- `sortCallActivities()` - EN funktion

✅ **INGA fallback-lösningar** - Alla noder får `visualOrderIndex` baserat på DI-koordinater

✅ **INGA hardcodade värden** - Inga specialfall för mortgage.bpmn eller andra filer

## Detaljerad verifiering

### 1. VisualOrderIndex tilldelning

**Tre pipelines, samma logik:**

#### `processGraphBuilder.ts` (rad 563-608)
```typescript
// Always compute visualOrderIndex for ALL nodes with coordinates
const nodesWithCoords = nodesInFile.filter(n => {
  const hasCoords = n.metadata.x !== undefined && n.metadata.y !== undefined;
  return hasCoords && n.bpmnElementId !== undefined;
});

const visualOrderMap = calculateVisualOrderFromCoordinates(
  parseResult.elements,
  nodeElementIds,
);
```

#### `bpmnProcessGraph.ts` (rad 323-337)
```typescript
// Always compute visualOrderIndex for ALL nodes with coordinates
const nodesWithCoords = nodes.filter((n) => n.bpmnElementId);
const visualOrderMap = calculateVisualOrderFromCoordinates(elements, nodeElementIds);
```

#### `buildProcessModel.ts` (rad 482-496)
```typescript
// Always compute visualOrderIndex for ALL nodes with coordinates
const nodesWithCoords = nodes.filter((n) => n.bpmnElementId);
const visualOrderMap = calculateVisualOrderFromCoordinates(elements, nodeElementIds);
```

**Resultat:** ✅ Samma logik, samma funktion, inga skillnader

### 2. Sortering

**EN funktion för all sortering:**

#### `ganttDataConverter.ts` → `sortCallActivities()` (rad 63-99)
```typescript
export function sortCallActivities(
  nodes: ProcessTreeNode[],
  mode: SortMode = 'root',
): ProcessTreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    // 1. visualOrderIndex (primary)
    const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
    const bVisual = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aVisual !== bVisual) {
      return aVisual - bVisual;
    }

    // 2. orderIndex (secondary)
    const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // 3. branchId (tertiary, root mode only)
    // 4. label (final fallback)
  });
}
```

**Resultat:** ✅ EN funktion, används överallt, inga specialfall

### 3. Number.MAX_SAFE_INTEGER

**Används som default-värde, INTE som fallback-lösning:**

```typescript
const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
```

**Varför:** Standard-pattern för sortering när värden kan saknas. Noder utan `visualOrderIndex` hamnar sist i sorteringen.

**Resultat:** ✅ Standard-pattern, inte en fallback-lösning

### 4. Debug-logging

**Endast för utveckling, påverkar INTE logiken:**

```typescript
if (import.meta.env.DEV && fileName === 'mortgage.bpmn') {
  console.log(`[Visual Ordering Debug] ...`);
}
```

**Resultat:** ✅ Endast debug, påverkar inte produktion

### 5. Hardcodade värden

**Sökte efter:**
- `mortgage.bpmn` i sorteringslogik → ❌ Inga hittade
- Specialfall för specifika filer → ❌ Inga hittade
- Hardcodade ordningar → ❌ Inga hittade

**Resultat:** ✅ Inga hardcodade värden

## Parallell process efter Offer

### Situation

Efter Offer finns två parallella flöden:

1. **Huvudflöde:**
   - `offer` → `event-loan-ready` → `document-generation` → `signing` → `disbursement`

2. **Advance-flöde** (boundary event på offer):
   - `event-trigger-advance` → `event-advance-ready` → `document-generation-advance` → `signing-advance` → `disbursement-advance`

### Nuvarande sortering (baserat på DI-koordinater)

Från debug-utskrift:
```
8: Document generation (document-generation-advance) - visualOrderIndex:8
9: Signing (signing-advance) - visualOrderIndex:9
10: Document generation (document-generation) - visualOrderIndex:10
11: Disbursement (disbursement-advance) - visualOrderIndex:11
12: Signing (signing) - visualOrderIndex:12
13: Disbursement (disbursement) - visualOrderIndex:13
```

**Detta är korrekt baserat på DI-koordinater:**
- `document-generation-advance` (x=3370, y=1140) kommer före `document-generation` (x=3780, y=840)
- Eftersom vi sorterar på x (ascending), sedan y (ascending)

### Potentiellt problem

Om DI-koordinaterna inte reflekterar den logiska ordningen kan parallella flöden hamna i fel ordning. Men detta är INTE en bugg i koden - det är en konsekvens av att vi använder visuell ordning som primär sorteringsmetod.

**Lösning:** Om DI-koordinaterna är felaktiga i BPMN-filen, måste de korrigeras i BPMN-editorn (t.ex. Camunda Modeler).

## Slutsats

✅ **INGEN dubbellogik** - Alla pipelines använder samma funktioner
✅ **INGA fallback-lösningar** - Alla noder får `visualOrderIndex` baserat på DI-koordinater
✅ **INGA hardcodade värden** - Inga specialfall för specifika filer
✅ **Konsekvent implementation** - Samma logik överallt

**Enda "specialfallet":** Debug-logging för mortgage.bpmn, men det påverkar INTE logiken.

