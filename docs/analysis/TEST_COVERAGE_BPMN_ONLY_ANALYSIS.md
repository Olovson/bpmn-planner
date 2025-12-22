# Analys: Kan Test Coverage Explorer Visa BPMN-Data Utan Test-Info?

**Datum:** 2025-12-22  
**Fråga:** Kan de första raderna i tabellen visas med bara BPMN-diagram-information, utan genererad testinfo?

---

## 1. Hur Tabellen Byggs Nu

### Data-källor

1. **BPMN-data (från `ProcessTree`):**
   - `tree: ProcessTreeNode` - hela processhierarkin
   - Innehåller: `label`, `bpmnFile`, `bpmnElementId`, `type`, `children`
   - Kommer från `useProcessTree()` hook

2. **Test-data (från `E2eScenario`):**
   - `scenarios: E2eScenario[]` - hårdkodade scenarion
   - Innehåller: `given`, `when`, `then`, `subprocessSteps`, `bankProjectTestSteps`
   - Används för att fylla i test-kolumner

### Tabell-kolumner

**BPMN-kolumner (från ProcessTree):**
- Hierarki-kolumner (Nivå 0, Nivå 1, Nivå 2, etc.)
- Visar: `label`, `bpmnFile`, `bpmnElementId`, `type`
- Dessa kan visas **utan** test-data

**Test-kolumner (från E2eScenario):**
- Given/When/Then
- UI-interaktion
- API-anrop
- DMN-beslut
- Dessa **kräver** test-data

---

## 2. Nuvarande Implementation

### `flattenToPaths()` (rad 223-227 i `TestCoverageTable.tsx`)

```typescript
const pathRows = useMemo(() => {
  const rows = flattenToPaths(tree, scenarios, selectedScenarioId);
  return sortPathsByProcessTreeOrder(rows);
}, [tree, scenarios, selectedScenarioId]);
```

**Vad gör den:**
- Flattenar `ProcessTree` till paths (sökvägar från root till leaf-noder)
- För varje path, samlar test-info från `scenarios`
- Returnerar `PathRow[]` med både BPMN-data och test-data

### `groupedRows` (rad 299-350 i `TestCoverageTable.tsx`)

```typescript
const groupedRows = useMemo(() => {
  const groups: GroupedRow[] = [];
  
  filteredPathRows.forEach((pathRow) => {
    // Hitta den lägsta callActivity med test-information
    let callActivityNode: ProcessTreeNode | null = null;
    let testInfo: TestInfo | null = null;
    
    // Gå igenom sökvägen från slutet (leaf-noden) och hitta första callActivity med test-info
    for (let i = pathRow.path.length - 1; i >= 0; i--) {
      const node = pathRow.path[i];
      if (node.type === 'callActivity' && node.bpmnElementId) {
        if (callActivityIdsWithTestInfo.has(node.bpmnElementId)) {
          const testInfoArray = pathRow.testInfoByCallActivity.get(node.bpmnElementId);
          if (testInfoArray && testInfoArray.length > 0) {
            callActivityNode = node;
            testInfo = testInfoArray[0];
            break;
          }
        }
      }
    }
    
    // Om ingen test-info hittades, använd "no-test-info" groupKey
    if (!callActivityNode) {
      groupKey = `no-test-info-${pathRow.path.map((n) => n.id).join('-')}`;
    }
    
    groups.push({
      pathRow,
      callActivityNode,
      testInfo,
      groupKey,
    });
  });
  
  return groups;
}, [filteredPathRows, callActivityIdsWithTestInfo]);
```

**Vad gör den:**
- Grupperar rader baserat på callActivity med test-info
- Om ingen test-info finns, används `no-test-info-{path}` som groupKey
- **VIKTIGT:** Tabellen kan visa rader även utan test-info!

---

## 3. Kan Tabellen Visa BPMN-Data Utan Test-Info?

### ✅ JA - Tabellen kan redan visa BPMN-data utan test-info!

**Bevis:**

1. **`flattenToPaths()` använder `tree` som primär källa:**
   - Bygger paths från `ProcessTree` (BPMN-data)
   - Test-data är sekundär (används bara om det finns)

2. **`groupedRows` hanterar saknad test-info:**
   - Om ingen test-info hittas, används `no-test-info-{path}` som groupKey
   - Raden visas ändå, men med tomma test-kolumner

3. **Tabell-rendering (rad 1107-1136):**
   - Hierarki-kolumner renderas från `node` (BPMN-data)
   - Test-kolumner renderas från `testInfo` (kan vara `null`)

### Vad Visas Utan Test-Info?

**BPMN-kolumner (visas alltid):**
- ✅ Hierarki-kolumner (Nivå 0, Nivå 1, etc.)
- ✅ Node label (t.ex. "Application")
- ✅ BPMN filnamn (t.ex. "mortgage-se-application.bpmn")
- ✅ BPMN element ID (t.ex. "application")
- ✅ Node typ (t.ex. "User Task", "Service Task")

**Test-kolumner (visas som tomma):**
- ❌ Given/When/Then (visas som "–")
- ❌ UI-interaktion (visas som "–")
- ❌ API-anrop (visas som "–")
- ❌ DMN-beslut (visas som "–")

---

## 4. Nuvarande Beteende

### När `scenarios` är tom eller saknar data:

1. **`flattenToPaths()` returnerar paths:**
   - Paths byggs från `tree` (BPMN-data)
   - `testInfoByCallActivity` är tom Map

2. **`groupedRows` skapar grupper:**
   - Alla rader får `groupKey = "no-test-info-{path}"`
   - `testInfo` är `null` för alla rader

3. **Tabellen renderas:**
   - BPMN-kolumner visas korrekt
   - Test-kolumner visas som "–" (tomma)

### När `scenarios` innehåller data:

1. **`flattenToPaths()` samlar test-info:**
   - Paths byggs från `tree`
   - Test-info samlas från `scenarios` och mappas till callActivities

2. **`groupedRows` grupperar baserat på test-info:**
   - Rader med test-info grupperas per callActivity
   - Rader utan test-info får `no-test-info-{path}`

3. **Tabellen renderas:**
   - BPMN-kolumner visas korrekt
   - Test-kolumner visas med data (om tillgängligt) eller "–"

---

## 5. Slutsats

### ✅ Tabellen kan redan visa BPMN-data utan test-info!

**Vad fungerar:**
- Hierarki-kolumner visas från `ProcessTree`
- Node-information (label, fil, elementId, typ) visas
- Test-kolumner visas som tomma ("–") när test-info saknas

**Vad behövs för att visa "de första raderna":**
- ✅ `tree: ProcessTreeNode` (från `useProcessTree()`)
- ✅ `scenarios: E2eScenario[]` (kan vara tom array `[]`)

**Vad behövs INTE:**
- ❌ Genererad test-info
- ❌ `node_planned_scenarios` data
- ❌ Test-filer i Storage

### Rekommendation

**Tabellen borde redan fungera utan test-info!**

Om den inte gör det, kan det bero på:
1. **`scenarios` är `undefined` eller `null`** - ska vara tom array `[]`
2. **`tree` är `undefined` eller `null`** - ska komma från `useProcessTree()`
3. **Fel i rendering** - test-kolumner kanske inte hanterar `null` korrekt

### Verifiering

**Testa med:**
```typescript
<TestCoverageTable 
  tree={tree} 
  scenarios={[]}  // Tom array - ingen test-info
  selectedScenarioId={undefined}
/>
```

**Förväntat resultat:**
- ✅ Hierarki-kolumner visas med BPMN-data
- ✅ Test-kolumner visas som "–" (tomma)
- ✅ Alla paths från `ProcessTree` visas

---

## Relaterade Dokument

- `TEST_COVERAGE_USER_GUIDE.md` - Användarguide
- `testCoverageHelpers.ts` - Helper-funktioner
- `TestCoverageTable.tsx` - Tabell-komponent
