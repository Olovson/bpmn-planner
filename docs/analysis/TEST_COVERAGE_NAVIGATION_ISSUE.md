# Analys: Test Coverage Explorer Navigation Problem

**Datum:** 2025-12-22  
**Problem:** Användaren kan inte klicka på länken i vänster menyn till Test Coverage Explorer-sidan.

---

## 1. Navigation Setup

### Route-konfiguration (✅ Korrekt)

**`src/App.tsx` rad 118:**
```typescript
<Route path="/test-coverage" element={<TestCoverageExplorerPage />} />
```

**`src/components/AppHeaderWithTabs.tsx` rad 151-167:**
```typescript
<button
  type="button"
  onClick={() => handleTabChange('test-coverage')}
  aria-label="Test Coverage"
  className={...}
>
  <BarChart3 className="h-4 w-4" />
</button>
```

**`handleTabChange` (rad 39-42):**
```typescript
const handleTabChange = (v: string) => {
  if (v === 'tests' && !isTestsEnabled) return; // Bara tests har guard
  onViewChange(v as ViewKey);
};
```

**Ingen guard för `test-coverage`** - knappen borde fungera!

### Navigation från andra sidor

**`src/pages/Index.tsx` rad 58-59:**
```typescript
} else if (value === 'test-coverage') {
  baseNavigate('/test-coverage');
}
```

**`src/pages/TestCoverageExplorerPage.tsx` rad 878:**
```typescript
else if (view === 'test-coverage') navigate('/test-coverage');
```

Navigation borde fungera från alla sidor!

---

## 2. Möjliga Problem

### Problem 1: Sidan Kraschar Vid Laddning

**Symptom:** Navigation fungerar, men sidan kraschar innan den renderas

**Möjliga orsaker:**

#### A. `allScenarios` är undefined eller null

**Kod:**
```typescript
import { scenarios as allScenarios } from '@/pages/E2eTestsOverviewPage';
const e2eScenarios = useMemo(
  () => allScenarios.filter((s) => s.id === 'E2E_BR001' || s.id === 'E2E_BR006'),
  [],
);
```

**Om `allScenarios` är undefined:**
- `allScenarios.filter()` → `TypeError: Cannot read property 'filter' of undefined`
- Sidan kraschar innan den renderas

**Lösning:**
```typescript
const e2eScenarios = useMemo(
  () => (allScenarios || []).filter((s) => s.id === 'E2E_BR001' || s.id === 'E2E_BR006'),
  [],
);
```

#### B. `tree` är null och sidan renderas för tidigt

**Kod:**
```typescript
const { data: tree, isLoading: isLoadingTree, error } = useProcessTree(rootFile || 'mortgage.bpmn');

if (error || !tree) {
  return <Alert>Kunde inte ladda processträd</Alert>;
}

// Senare:
<TestCoverageTable tree={tree} scenarios={e2eScenarios} ... />
```

**Om `tree` är null:**
- Sidan visar error-meddelande (rad 906-927)
- Men om `TestCoverageTable` renderas innan check, kan det krascha

**Lösning:** Check finns redan (rad 906), men verifiera att den körs innan rendering

#### C. `scenarios` är undefined i `TestCoverageTable`

**Kod:**
```typescript
export function TestCoverageTable({ tree, scenarios, ... }: TestCoverageTableProps) {
  const pathRows = useMemo(() => {
    const rows = flattenToPaths(tree, scenarios, selectedScenarioId);
    return sortPathsByProcessTreeOrder(rows);
  }, [tree, scenarios, selectedScenarioId]);
}
```

**Om `scenarios` är undefined:**
- `flattenToPaths(tree, undefined, ...)` → kan krascha om funktionen inte hanterar undefined

**Lösning:** Verifiera att `scenarios` alltid är en array (tom eller med data)

---

## 3. Verifiering

### Steg 1: Kolla Om `allScenarios` Exporteras Korrekt

**I `src/pages/E2eTestsOverviewPage.tsx`:**
- Leta efter `export const scenarios` eller `export { scenarios }`
- Verifiera att det är en array (tom eller med data)

### Steg 2: Kolla Om Navigation Faktiskt Anropas

**I browser console:**
- Kolla om det finns fel när man klickar på knappen
- Kolla om URL ändras till `/test-coverage`
- Kolla om sidan försöker ladda

### Steg 3: Kolla Om Sidan Kraschar

**I browser console:**
- Leta efter JavaScript-fel
- Leta efter React error boundaries
- Kolla Network-tab för failed requests

---

## 4. Rekommenderade Fixar

### Fix 1: Säkerställ Att `scenarios` Alltid Är En Array

**I `TestCoverageExplorerPage.tsx` rad 31-34:**
```typescript
const e2eScenarios = useMemo(
  () => (allScenarios || []).filter((s) => s.id === 'E2E_BR001' || s.id === 'E2E_BR006'),
  [allScenarios], // Lägg till allScenarios i dependencies
);
```

### Fix 2: Säkerställ Att `scenarios` Alltid Är En Array I `TestCoverageTable`

**I `TestCoverageTable.tsx` rad 208:**
```typescript
export function TestCoverageTable({ tree, scenarios = [], ... }: TestCoverageTableProps) {
  // Använd default value för scenarios
}
```

### Fix 3: Säkerställ Att `flattenToPaths` Hanterar Tom Array

**I `testCoverageHelpers.ts` rad 78-101:**
```typescript
export function flattenToPaths(
  node: ProcessTreeNode,
  scenarios: E2eScenario[] = [], // Default till tom array
  selectedScenarioId: string | undefined,
  currentPath: ProcessTreeNode[] = [],
): PathRow[] {
  // Funktionen borde redan hantera tom array korrekt
}
```

---

## 5. Testning

### Test 1: Navigation

1. Klicka på Test Coverage-knappen i vänster menyn
2. Verifiera att URL ändras till `#/test-coverage`
3. Verifiera att sidan laddas (eller visar loading)

### Test 2: Med Tom Scenarios Array

1. Sätt `e2eScenarios = []` (tom array)
2. Verifiera att sidan laddas utan fel
3. Verifiera att tabellen visas med BPMN-data (hierarki-kolumner)
4. Verifiera att test-kolumner visas som "–" (tomma)

### Test 3: Med Null/Undefined Scenarios

1. Sätt `allScenarios = undefined`
2. Verifiera att sidan inte kraschar
3. Verifiera att `e2eScenarios` blir tom array `[]`

---

## 6. Slutsats

### Möjliga Orsaker:

1. **`allScenarios` är undefined** → `allScenarios.filter()` kraschar
2. **Sidan kraschar vid rendering** → React error boundary fångar felet
3. **Navigation blockeras** → JavaScript-fel hindrar navigation

### Rekommenderade Fixar:

1. ✅ Lägg till fallback för `allScenarios`: `(allScenarios || [])`
2. ✅ Lägg till default value för `scenarios` i `TestCoverageTable`: `scenarios = []`
3. ✅ Verifiera att `flattenToPaths` hanterar tom array korrekt

### Verifiering:

- Kolla browser console för fel
- Kolla om URL ändras när man klickar
- Kolla om sidan försöker ladda (loading state)

---

## Relaterade Dokument

- `TEST_COVERAGE_BPMN_ONLY_ANALYSIS.md` - Analys av BPMN-data utan test-info
- `TestCoverageTable.tsx` - Tabell-komponent
- `TestCoverageExplorerPage.tsx` - Sidan
