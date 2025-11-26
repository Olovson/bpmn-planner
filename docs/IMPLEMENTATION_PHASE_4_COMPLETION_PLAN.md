# FAS 4 – Slutförandeplan

## 🎯 Mål
Färdigställa FAS 4 genom att säkerställa att ProcessTree används konsekvent överallt där det är praktiskt möjligt, med pragmatiska lösningar för Edge Functions.

## ✅ Vad som redan är klart

### Client-side (React-appen)
- ✅ Process Explorer använder ProcessTree
- ✅ `generateHierarchicalTestFileFromTree()` implementerad
- ✅ `generateDocumentationFromTree()` implementerad  
- ✅ `generateAllFromBpmnWithGraph` uppdaterad att använda ProcessTree

## 🔧 Vad som behöver göras

### Steg 1: Verifiera client-side funktionalitet (1-2 timmar)
**Prioritet: Hög**

1. **Testa testgenerering:**
   ```bash
   # I appen, kör testgenerering för mortgage.bpmn
   # Verifiera att:
   # - Tester genereras korrekt från ProcessTree
   # - Hierarkisk struktur matchar ProcessTree
   # - orderIndex och scenarioPath inkluderas
   ```

2. **Testa dokumentationsgenerering:**
   ```bash
   # Generera dokumentation och verifiera:
   # - Dokumentation följer ProcessTree-struktur
   # - Alla noder är med
   # - Sekvensordning är korrekt
   ```

3. **Testa Process Explorer:**
   ```bash
   # Öppna Process Explorer och verifiera:
   # - Trädet laddas korrekt
   # - Alla noder visas
   # - Diagnostik visas korrekt
   ```

**Acceptanskriterier:**
- [ ] Testgenerering fungerar med ProcessTree
- [ ] Dokumentationsgenerering fungerar med ProcessTree
- [ ] Process Explorer visar korrekt struktur
- [ ] Inga console errors

---

### Steg 2: Förbättra Edge Functions (2-4 timmar)
**Prioritet: Medel**

**Strategi:** Istället för att porta hela processGraphBuilder till Deno (komplext), förbättra nuvarande Edge Functions så de:
1. Producerar ProcessTree-struktur som matchar client-side
2. Inkluderar orderIndex/scenarioPath där möjligt
3. Använder bpmn-map.json om tillgänglig

#### 2.1 Uppdatera `build-process-tree` Edge Function

**Nuvarande problem:**
- Använder meta-baserad parsing (fungerar men inte optimalt)
- Saknar orderIndex/scenarioPath
- Matchar inte exakt ProcessTree-struktur från client

**Lösning:**
1. **Behåll nuvarande meta-baserad approach** (fungerar i Deno)
2. **Förbättra output-strukturen** så den matchar ProcessTree:
   ```typescript
   // Lägg till orderIndex och scenarioPath där möjligt
   // Använd bpmn-map.json för matchning om tillgänglig
   // Säkerställ att strukturen matchar ProcessTreeNode interface
   ```

3. **Lägg till sekvensordning:**
   ```typescript
   // Parse sequence flows från BPMN XML
   // Beräkna orderIndex baserat på sequence flows
   // Lägg till branchId och scenarioPath för branches
   ```

**Kodändringar:**
- Uppdatera `buildTree()` funktionen att inkludera orderIndex
- Lägg till sekvensflow-parsing
- Förbättra matchning med bpmn-map.json

#### 2.2 Uppdatera `generate-artifacts` Edge Function

**Nuvarande problem:**
- Använder `buildBpmnHierarchyForFile()` som bygger från meta
- Genererar inte tester/dokumentation från ProcessTree

**Lösning:**
1. **Bygg ProcessTree** (använd förbättrad `build-process-tree` logik)
2. **Använd ProcessTree för artefaktgenerering:**
   - För testgenerering: använd ProcessTree-struktur
   - För dokumentation: använd ProcessTree-struktur
   - För DoR/DoD: använd ProcessTree-noder

**Alternativ (om ovan är för komplext):**
- Behåll nuvarande approach men dokumentera att det är en "simplified version"
- Lägg till kommentar om att full ProcessTree-stöd kommer i framtida iteration

---

### Steg 3: Dokumentation och cleanup (1-2 timmar)
**Prioritet: Låg**

1. **Markera deprecated funktioner:**
   ```typescript
   /**
    * @deprecated Use generateHierarchicalTestFileFromTree() instead
    * This function uses BpmnHierarchyNode which is being phased out
    */
   export function generateHierarchicalTestFile(...) { ... }
   ```

2. **Uppdatera dokumentation:**
   - Lägg till exempel på ProcessTree-baserad generering
   - Dokumentera skillnader mellan client och edge functions
   - Uppdatera arkitekturdokumentation

3. **Skapa migration guide:**
   - Hur man migrerar från gamla till nya funktioner
   - Vad som har ändrats och varför

---

## 📋 Konkret implementation

### Implementation 1: Förbättra build-process-tree Edge Function

**Fil:** `supabase/functions/build-process-tree/index.ts`

**Ändringar:**

1. **Lägg till sekvensflow-parsing:**
```typescript
function parseSequenceFlows(xml: string): Array<{ sourceRef: string; targetRef: string }> {
  const flows: Array<{ sourceRef: string; targetRef: string }> = [];
  const regex = /<bpmn:sequenceFlow[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"[^>]*>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    flows.push({ sourceRef: match[1], targetRef: match[2] });
  }
  return flows;
}
```

2. **Beräkna orderIndex:**
```typescript
function calculateOrderIndex(
  tasks: Array<{ id: string }>,
  sequenceFlows: Array<{ sourceRef: string; targetRef: string }>
): Map<string, number> {
  // Simple topological sort based on sequence flows
  const orderMap = new Map<string, number>();
  const visited = new Set<string>();
  let order = 0;
  
  // Find start nodes (nodes without incoming edges)
  const allTargets = new Set(sequenceFlows.map(f => f.targetRef));
  const startNodes = tasks.filter(t => !allTargets.has(t.id));
  
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    orderMap.set(nodeId, order++);
    
    // Visit successors
    sequenceFlows
      .filter(f => f.sourceRef === nodeId)
      .forEach(f => visit(f.targetRef));
  }
  
  startNodes.forEach(n => visit(n.id));
  tasks.forEach(t => {
    if (!visited.has(t.id)) {
      orderMap.set(t.id, order++);
    }
  });
  
  return orderMap;
}
```

3. **Uppdatera buildTree att inkludera orderIndex:**
```typescript
const sequenceFlows = parseSequenceFlows(xml);
const orderMap = calculateOrderIndex(tasks, sequenceFlows);

// I taskNode:
const taskNode: ProcessTreeNode = {
  // ... existing fields
  orderIndex: orderMap.get(t.id),
  // ... rest
};
```

### Implementation 2: Uppdatera generate-artifacts att använda ProcessTree-struktur

**Fil:** `supabase/functions/generate-artifacts/index.ts`

**Ändringar:**

1. **Bygg ProcessTree istället för HierarchyNode:**
```typescript
// Ersätt buildBpmnHierarchyForFile med:
// 1. Anropa build-process-tree edge function internt, eller
// 2. Använd samma logik som build-process-tree för att bygga ProcessTree
```

2. **Använd ProcessTree för artefaktgenerering:**
```typescript
// För testgenerering: traversera ProcessTree istället för HierarchyNode
// För dokumentation: använd ProcessTree-struktur
```

---

## 🎯 Prioriterad ordning

### Fas A: Verifiering (1-2 timmar) - **GÖR FÖRST**
1. Testa client-side funktionalitet
2. Fixa eventuella buggar
3. Verifiera att allt fungerar

### Fas B: Edge Functions förbättring (2-4 timmar) - **GÖR SEDAN**
1. Lägg till orderIndex i build-process-tree
2. Förbättra matchning med bpmn-map.json
3. Uppdatera generate-artifacts att använda ProcessTree-struktur

### Fas C: Dokumentation (1-2 timmar) - **GÖR SIST**
1. Markera deprecated funktioner
2. Uppdatera dokumentation
3. Skapa migration guide

---

## ✅ Exit-kriterier för FAS 4

| Krav | Status | Notering |
|------|--------|----------|
| Process Explorer använder ProcessTreeNode | ✅ | Klart |
| Client-side testgenerering använder ProcessTree | ✅ | Klart |
| Client-side dokumentation använder ProcessTree | ✅ | Klart |
| build-process-tree returnerar ProcessTree JSON | 🔄 | Behöver förbättras |
| generate-artifacts använder ProcessTree-struktur | 🔄 | Behöver uppdateras |
| Alla funktioner testade och verifierade | ⏳ | Väntar på testning |
| Deprecated kod markerad | ⏳ | Väntar på cleanup |

---

## 🚀 Rekommendation

**För att snabbt slutföra FAS 4:**

1. **Börja med verifiering** (1-2 timmar)
   - Testa att allt fungerar client-side
   - Fixa eventuella buggar
   - Säkerställ att ProcessTree fungerar korrekt

2. **Förbättra Edge Functions pragmatiskt** (2-4 timmar)
   - Lägg till orderIndex i build-process-tree
   - Förbättra output-struktur
   - Dokumentera eventuella begränsningar

3. **Cleanup och dokumentation** (1-2 timmar)
   - Markera deprecated funktioner
   - Uppdatera dokumentation
   - Skapa migration guide

**Total tid: 4-8 timmar**

**Alternativ (om Edge Functions är för komplext nu):**
- Fokusera på client-side (redan klart)
- Dokumentera att Edge Functions använder "simplified version"
- Planera full ProcessTree-stöd i Edge Functions som separat uppgift

---

## 📝 Nästa steg

1. **Börja med verifiering** - testa att allt fungerar client-side
2. **Förbättra Edge Functions** - lägg till orderIndex och förbättra struktur
3. **Dokumentera** - markera deprecated kod och uppdatera docs

Efter detta är FAS 4 färdigställd med pragmatiska lösningar som fungerar i praktiken.








