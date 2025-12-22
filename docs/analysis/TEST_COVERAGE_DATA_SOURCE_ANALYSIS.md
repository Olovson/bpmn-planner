# Analys: Var Kommer Data Från i Test Coverage Explorer?

**Datum:** 2025-12-22  
**Fråga:** Kommer innehållet i tabellen från riktiga filer eller är det hårdkodat?

---

## 1. Två Olika Datakällor

### A. BPMN-Data (Hierarki-kolumner)

**Vad visas:**
- Nivå 0, Nivå 1, Nivå 2, etc. (hierarki-kolumner)
- Node labels (t.ex. "Application", "Mortgage commitment")
- BPMN filnamn (t.ex. "mortgage.bpmn")
- BPMN element IDs (t.ex. "application", "mortgage-commitment")

**Var kommer det från:**
- ✅ **Riktiga BPMN-filer** i Supabase Storage
- ✅ `useProcessTree()` hook (rad 27 i `TestCoverageExplorerPage.tsx`)
- ✅ `buildClientProcessTree()` (rad 57-150 i `useProcessTree.ts`)

**Flöde:**
```
1. useProcessTree() 
   → buildClientProcessTree()
     → Läser BPMN-filer från Supabase Storage (rad 61-64)
     → parseBpmnFile() för varje fil (rad 100)
     → buildProcessGraph() (rad 130)
     → buildProcessTreeFromGraph() (rad 138)
     → Returnerar ProcessTree med alla noder från BPMN-filer
```

**Slutsats:** ✅ BPMN-data kommer från riktiga filer, INTE hårdkodat!

### B. Test-Scenarion (Given/When/Then, UI/API/DMN)

**Vad visas:**
- Given/When/Then kolumner
- UI-interaktion, API-anrop, DMN-beslut

**Var kommer det från:**
- ❌ **Hårdkodat** i `E2eTestsOverviewPage.tsx` (rad 140-986)
- ❌ `scenarios` array exporteras och importeras i `TestCoverageExplorerPage.tsx` (rad 15, 32)

**Flöde:**
```
1. TestCoverageExplorerPage.tsx
   → import { scenarios as allScenarios } from '@/pages/E2eTestsOverviewPage' (rad 15)
   → allScenarios.filter((s) => s.id === 'E2E_BR001' || s.id === 'E2E_BR006') (rad 32)
   → Skickas till TestCoverageTable som scenarios prop
```

**Slutsats:** ❌ Test-scenarion är hårdkodat, INTE från filer!

---

## 2. Detaljerad Analys

### BPMN-Data (Riktiga Filer)

**Kod:**
```typescript
// useProcessTree.ts rad 57-150
async function buildClientProcessTree(rootFile: string, ...) {
  // 1. Läser BPMN-filer från databasen
  const { data: bpmnFiles } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');

  // 2. Parsar varje BPMN-fil från Supabase Storage
  for (const fileName of existingFiles) {
    const versionHash = versionHashes.get(fileName) || null;
    const parsed = await parseBpmnFile(fileName, versionHash); // ← Läser från Storage!
    parseResults.set(fileName, parsed);
  }

  // 3. Bygger ProcessGraph från parsed BPMN-data
  const graph = buildProcessGraph(parseResults, { bpmnMap, ... });

  // 4. Bygger ProcessTree från graph
  const newTree = buildProcessTreeFromGraph(graph, { ... });

  return tree; // ← Innehåller alla noder från BPMN-filer
}
```

**Bevis:**
- ✅ Läser från `bpmn_files` tabell i databasen
- ✅ Använder `parseBpmnFile()` som laddar från Supabase Storage
- ✅ Bygger hierarki från faktiska BPMN XML-filer
- ✅ Node labels, filnamn, element IDs kommer från BPMN-filer

### Test-Scenarion (Hårdkodat)

**Kod:**
```typescript
// E2eTestsOverviewPage.tsx rad 140-986
export const scenarios: E2eScenario[] = [
  {
    id: 'E2E_BR001',
    name: 'E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)',
    given: '...',
    when: '...',
    then: '...',
    subprocessSteps: [
      {
        order: 1,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'application',
        given: '...',
        when: '...',
        then: '...',
      },
      // ... fler steg
    ],
    bankProjectTestSteps: [
      // ... UI/API/DMN info
    ],
  },
  // ... fler scenarion
];

// TestCoverageExplorerPage.tsx rad 15, 32
import { scenarios as allScenarios } from '@/pages/E2eTestsOverviewPage';
const e2eScenarios = useMemo(
  () => allScenarios.filter((s) => s.id === 'E2E_BR001' || s.id === 'E2E_BR006'),
  [],
);
```

**Bevis:**
- ❌ `scenarios` är en hårdkodad array i `E2eTestsOverviewPage.tsx`
- ❌ Innehåller given/when/then, subprocessSteps, bankProjectTestSteps
- ❌ Importeras direkt som JavaScript/TypeScript-kod
- ❌ INTE laddat från filer eller databas

---

## 3. Vad Användaren Ser

### Rad-exempel från användaren:

```
Rad: Application
Nivå 0: mortgage (mortgage.bpmn)
Nivå 1: Application (mortgage.bpmn, application)
```

**Detta kommer från:**
- ✅ **BPMN-filer** (riktiga filer)
- ✅ ProcessTree byggs från parsed BPMN XML
- ✅ "Application" är label från BPMN-filen
- ✅ "mortgage.bpmn" är filnamn från databasen
- ✅ "application" är element ID från BPMN XML

### Test-Scenarion (Given/When/Then):

**Detta kommer från:**
- ❌ **Hårdkodat** i `E2eTestsOverviewPage.tsx`
- ❌ `scenarios` array med given/when/then
- ❌ Mappas till callActivities baserat på `callActivityId`

---

## 4. Slutsats

### BPMN-Data (Hierarki-kolumner): ✅ Från Riktiga Filer

**Källa:**
- BPMN XML-filer i Supabase Storage
- Parsas via `parseBpmnFile()`
- Bygger ProcessTree via `buildProcessGraph()` och `buildProcessTreeFromGraph()`

**Vad visas:**
- Node labels, filnamn, element IDs från BPMN-filer
- Hierarki byggs från faktiska callActivities och subprocesser

### Test-Scenarion (Given/When/Then): ❌ Hårdkodat

**Källa:**
- Hårdkodad array i `E2eTestsOverviewPage.tsx`
- Exporteras och importeras som TypeScript-kod

**Vad visas:**
- Given/When/Then från hårdkodad `scenarios` array
- UI/API/DMN info från hårdkodad `bankProjectTestSteps`

---

## 5. Rekommendation

### För BPMN-Data:
✅ **Ingen ändring behövs** - data kommer redan från riktiga filer

### För Test-Scenarion:
❌ **Borde komma från filer/databas** istället för hårdkodat

**Möjliga lösningar:**
1. **Ladda från databas:**
   - Spara scenarion i `node_planned_scenarios` tabell
   - Ladda från databas istället för hårdkodad array

2. **Ladda från genererade filer:**
   - Använd scenarios från genererad dokumentation
   - Extrahera från HTML/JSON i Supabase Storage

3. **Hybrid:**
   - Använd hårdkodad array som fallback
   - Men prioritera scenarios från databas/filer om de finns

---

## Relaterade Dokument

- `TEST_COVERAGE_BPMN_ONLY_ANALYSIS.md` - Analys av BPMN-data utan test-info
- `TEST_COVERAGE_NAVIGATION_ISSUE.md` - Navigation-problem
- `E2eTestsOverviewPage.tsx` - Hårdkodad scenarios array
- `useProcessTree.ts` - ProcessTree-byggning från BPMN-filer
