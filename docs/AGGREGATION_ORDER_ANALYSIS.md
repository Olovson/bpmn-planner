# Analys: Aggregering av innehåll från subprocesser till parent process

## Problemidentifiering

### Nuvarande sorteringslogik

I `bpmnGenerators.ts` (rad 1712-1727) sorteras noder enligt:

```typescript
const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
  const depthA = nodeDepthMap.get(a.id) ?? 0;
  const depthB = nodeDepthMap.get(b.id) ?? 0;

  // Primär sortering: högre depth först (leaf nodes före parent nodes)
  if (depthA !== depthB) {
    return depthB - depthA; // <-- HÖGRE DEPTH FÖRST
  }

  // Sekundär sortering: orderIndex (exekveringsordning)
  const orderA = a.orderIndex ?? a.visualOrderIndex ?? 0;
  const orderB = b.orderIndex ?? b.visualOrderIndex ?? 0;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // Tertiär sortering: alfabetiskt
  return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
});
```

### Depth-beräkning

Depth beräknas rekursivt (rad 1485-1500):

```typescript
const calculateNodeDepth = (node: BpmnProcessNode, visited = new Set<string>()): number => {
  if (!node.children || node.children.length === 0) {
    return 0; // Leaf nodes har depth 0
  }
  
  const maxChildDepth = Math.max(
    ...node.children.map(child => calculateNodeDepth(child, visited))
  );
  return maxChildDepth + 1; // Parent nodes har högre depth
};
```

### Problemet

**Exempel med mortgage-se-application.bpmn:**

1. **Application process** (root):
   - Har många children (callActivities: household, stakeholder, object, internal-data-gathering)
   - Får depth = max(child depths) + 1
   - Om household har depth 2, application får depth 3

2. **Household subprocess**:
   - Har children (tasks)
   - Får depth = max(task depths) + 1
   - Om tasks har depth 0, household får depth 1

3. **Tasks** (leaf nodes):
   - Inga children
   - Får depth 0

**Sorteringsordning blir:**
- Application (depth 3) → genereras FÖRST
- Household (depth 1) → genereras EFTER
- Tasks (depth 0) → genereras EFTER

**Konsekvens:**
- När Application Feature Goal genereras, finns INTE household-dokumentation i `generatedChildDocs` ännu
- `collectChildDocsRecursively()` hittar inga child docs för household
- Application Feature Goal genereras utan aggregerat innehåll från subprocesser

### Nuvarande aggregeringslogik

När Application Feature Goal genereras (rad 1829-1878):

```typescript
const collectChildDocsRecursively = (currentNode: BpmnProcessNode) => {
  for (const child of currentNode.children) {
    const childDocKey = child.type === 'callActivity' && child.subprocessFile
      ? `subprocess:${child.subprocessFile}`
      : `${child.bpmnFile}::${child.bpmnElementId}`;

    const childDoc = generatedChildDocs.get(childDocKey); // <-- TOMT om subprocess inte genererats ännu!
    if (childDoc) {
      childDocsForNode.set(child.id, childDoc);
    }
    // Rekursivt samla från nested children
    if (child.children && child.children.length > 0) {
      collectChildDocsRecursively(child);
    }
  }
};
```

**Problem:**
- `generatedChildDocs` är tom när Application genereras
- Household-dokumentation sparas i `generatedChildDocs` EFTER att Application redan genererats
- Application Feature Goal saknar aggregerat innehåll från subprocesser

## Lösningsalternativ

### Alternativ 1: Invertera sorteringsordning (Rekommenderat)

**Ändra sorteringen så att lägre depth genereras först:**

```typescript
// Primär sortering: lägre depth först (subprocesser före parent)
if (depthA !== depthB) {
  return depthA - depthB; // <-- LÄGRE DEPTH FÖRST
}
```

**Fördelar:**
- Enkel ändring
- Säkerställer att subprocesser genereras före parent
- Child docs finns tillgängliga när parent genereras

**Nackdelar:**
- Bryter mot nuvarande logik som genererar "leaf nodes först"
- Kan påverka andra delar av systemet som förväntar sig nuvarande ordning

### Alternativ 2: Två-pass generering

**Generera Feature Goals i två pass:**

1. **Pass 1:** Generera alla subprocess Feature Goals (spara i `generatedChildDocs`)
2. **Pass 2:** Generera parent Feature Goals (använd `generatedChildDocs`)

**Fördelar:**
- Bevarar nuvarande sorteringslogik
- Säkerställer att child docs finns tillgängliga

**Nackdelar:**
- Mer komplex implementation
- Kräver två iterationer över noder

### Alternativ 3: Lazy aggregation

**Generera parent Feature Goal EFTER att alla subprocesser är klara:**

- Generera alla noder enligt nuvarande ordning
- Men skjut upp Feature Goal-generering för parent process tills alla children är klara
- Använd en "pending parent generations" kö

**Fördelar:**
- Bevarar nuvarande sorteringslogik
- Säkerställer korrekt aggregering

**Nackdelar:**
- Komplex implementation
- Kräver state management för pending generations

## Rekommendation

**Alternativ 1 (Invertera sorteringsordning)** är enklast och mest direkt.

**Men:** Vi måste också överväga:
- Är det viktigt att generera "leaf nodes först" för någon specifik anledning?
- Påverkar detta andra delar av systemet?

**Förslag:** Implementera Alternativ 1 med en flagga för att kunna växla mellan beteenden om det behövs.

## Implementering

### ✅ Lösning implementerad

**Ändring i `bpmnGenerators.ts` (rad 1716-1719):**

```typescript
// FÖRE (fel):
// Primär sortering: högre depth först (leaf nodes före parent nodes)
if (depthA !== depthB) {
  return depthB - depthA; // Application (depth 3) → Household (depth 1)
}

// EFTER (korrekt):
// Primär sortering: lägre depth först (subprocesser före parent nodes)
// Detta säkerställer att child documentation sparas i generatedChildDocs innan parent genereras
if (depthA !== depthB) {
  return depthA - depthB; // Household (depth 1) → Application (depth 3)
}
```

### ✅ Verifiering

**Test: `tests/integration/aggregation-order.test.ts`**

Testet verifierar:
- ✅ Subprocess Feature Goals genereras
- ✅ Parent Feature Goal genereras
- ✅ Application Feature Goal innehåller "household" reference (15273 chars)
- ✅ Med ny sortering (lägre depth först), child docs finns tillgängliga för aggregering

**Resultat:**
```
Application Feature Goal: feature-goals/mortgage-se-application-v2.html
Feature Goal content length: 15273 chars
Contains household reference: true
Household Feature Goal: feature-goals/mortgage-se-household-stakeholders-v2.html
```

### Konsekvenser

**Positiva:**
- ✅ Parent Feature Goals innehåller nu aggregerat innehåll från subprocesser
- ✅ `generatedChildDocs` är fylld när parent genereras
- ✅ `collectChildDocsRecursively()` hittar child documentation

**Potentiella påverkan:**
- ⚠️ Andra delar av systemet som förväntar sig "högre depth först" kan påverkas
- ⚠️ Progress-indikatorer kan visa annan ordning
- ✅ Testfall verifierar att funktionaliteten fungerar korrekt

## Testfall att verifiera

1. **Application Feature Goal innehåller household-innehåll:**
   - Generera mortgage-se-application.bpmn med useHierarchy=true
   - Verifiera att Application Feature Goal innehåller aggregerat innehåll från household, stakeholder, object

2. **Nested subprocesser aggregeras korrekt:**
   - Om household innehåller en subprocess, verifiera att household Feature Goal innehåller den subprocessens innehåll

3. **Återkommande subprocesser:**
   - Om samma subprocess används flera gånger, verifiera att parent aggregerar korrekt
