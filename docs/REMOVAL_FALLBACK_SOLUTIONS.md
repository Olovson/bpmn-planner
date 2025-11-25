# Borttagning av fallback-lösningar för sorteringsordning

## Översikt

Alla fallback-lösningar relaterade till sorteringsordning har tagits bort för att säkerställa att det bara finns en källa till funktionaliteten. Detta gör det möjligt att felsöka problem till samma källa.

## Ändringar

### 1. `calculateOrderFromSequenceFlows()` i `sequenceOrderHelpers.ts`

**Före:**
```typescript
// If all nodes participate in cycles (no zero incoming), fall back to all relevant nodes
if (!startNodes.length) {
  startNodes = sequenceRelevantNodeIds;
}
```

**Efter:**
```typescript
// If no start nodes found, return empty map (no orderIndex can be assigned)
// This ensures we can debug the issue rather than silently falling back
if (!startNodes.length) {
  return new Map<string, OrderInfo>();
}
```

**Resultat:** Funktionen returnerar nu en tom map istället för att fallback till alla relevanta noder. Detta gör att problem blir synliga istället för att döljas.

### 2. `assignExecutionOrder()` i `bpmnProcessGraph.ts`

**Före:** Separata kodvägar:
- Om `sequenceFlows.length === 0` → beräkna bara `visualOrderIndex`
- Om `sequenceFlows.length > 0` → beräkna `orderIndex`, sedan `visualOrderIndex`

**Efter:** En enda kodväg:
- Alltid anropa `calculateOrderFromSequenceFlows()` först (även om tom array)
- Alltid anropa `calculateVisualOrderFromCoordinates()` för noder utan `orderIndex`

**Resultat:** Samma funktioner anropas alltid i samma ordning, oavsett om sequence flows finns eller inte.

### 3. `assignExecutionOrderFromSequenceFlows()` i `buildProcessModel.ts`

**Före:** Separata kodvägar:
- Om `sequenceFlows.length === 0` → beräkna bara `visualOrderIndex`
- Om `sequenceFlows.length > 0` → beräkna `primaryPathIndex`, sedan `visualOrderIndex`

**Efter:** En enda kodväg:
- Alltid anropa `calculateOrderFromSequenceFlows()` först (även om tom array)
- Alltid anropa `calculateVisualOrderFromCoordinates()` för noder utan `primaryPathIndex`

**Resultat:** Samma funktioner anropas alltid i samma ordning.

### 4. `buildProcessGraph()` i `processGraphBuilder.ts`

**Före:** Separata kodvägar för "no sequence flows"

**Efter:** En enda kodväg:
- Alltid anropa `assignLocalOrderForFile()` (som anropar `calculateOrderFromSequenceFlows()`)
- Alltid anropa `calculateVisualOrderFromCoordinates()` för noder utan `orderIndex`

**Resultat:** Samma funktioner anropas alltid i samma ordning.

## Fördelar

1. **En källa till sanningen:** Alla pipelines använder exakt samma funktioner i samma ordning
2. **Lättare att felsöka:** Om något går fel, går det att spåra till samma källa
3. **Inga dolda fallback:** Problem blir synliga istället för att döljas av fallback-lösningar
4. **Konsekvent beteende:** Samma input ger alltid samma output, oavsett vilken pipeline som används

## Verifiering

Alla relevanta tester passerar:
- ✅ `mortgage.order-validation.test.ts`
- ✅ `mortgage.tree-hierarchy.test.ts`
- ✅ `mortgage.order-debug.test.ts`

## Kvarvarande fallback (ej relaterade till ordering)

Följande fallback-lösningar finns kvar men är **inte** relaterade till sorteringsordning:
- `buildProcessTreeFromGraph.ts`: Fallback för root-process
- `debugDataLoader.ts`: Fallback för fil-laddning
- `buildProcessHierarchy.ts`: Fallback för rotprocess-identifiering
- `processDefinition.ts`: Fallback för process-ID

Dessa kan behållas eller tas bort separat beroende på behov.

