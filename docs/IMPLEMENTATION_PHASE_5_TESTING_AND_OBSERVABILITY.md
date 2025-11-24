# 🟦 FAS 5 – Testning & Observability
### _“Gör hela BPMN-kedjan testbar, mätbar och felsökbar.”_

## 🎯 Mål för FAS 5

När FAS 1–4 är klara har ni:

- Parser → ProcessGraph → ProcessTree  
- UI (Process Explorer) på ProcessTree  
- Generators (docs/tests/DoR/DoD) på ProcessTree  
- Edge Functions på Graph/Tree  

FAS 5 fokuserar på att:

1. Bygga en **testmatris**: unit + integration + e2e.
2. Införa **snapshot-baserade regressions-tester** för Mortgage-processen.
3. Införa **observability**:
   - logging av cycles, missingDependencies, matchningar
   - debug-sätt att inspektera Graph/Tree på serversidan.

---

## 🧱 Del 1 – Testmatris (Unit, Integration, E2E)

### 1.1. Översikt

**Unit tests** för:

- `processGraph.ts`
- `sequenceFlowExtractor.ts`
- `bpmnMapLoader.ts`
- `processGraphBuilder.ts`
- `buildProcessTreeFromGraph.ts`

**Integrationstester** för:

- parse → graph → tree på Mortgage-fixtures  
- generateDocsFromTree  
- generateTestsFromTree  

**E2E / UI smoke**:

- laddning av Process Explorer
- enkel navigering i trädet
- kontrollera att inget kraschar

---

### 1.2. Unit tests – komplettering

#### a) sequenceFlowExtractor

- test: linjär process (A→B→C)
- test: branch med gateway (A→B1 och A→B2)
- test: startNodes hittas korrekt

#### b) processGraphBuilder

- rätt antal noder/edges för mortgage-caset
- subprocess-edges skapade enligt bpmn-map
- missingDependencies fylls om bpmn-map pekar på icke-existerande fil
- cycles detekteras med cykel-fixture

#### c) buildProcessTreeFromGraph

- korrekt root och hierarki
- callActivities expanderar barn
- tasks i ordning enligt orderIndex
- diagnostics fylls vid cycle/missing subprocess

---

### 1.3. Integrationstest – Mortgage end-to-end (kod)

**Filförslag:**  
`src/lib/bpmn/__tests__/mortgage.e2e.test.ts`

Pseudokod:

```ts
it('builds a consistent ProcessTree for Mortgage', () => {
  const parseResults = loadMortgageFixturesAndParse();
  const bpmnMap = loadMortgageMap();
  const graph = buildProcessGraph(parseResults, { bpmnMap });
  const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });

  expect(tree.label).toContain('Mortgage');
  expect(tree.type).toBe('process');
  // Förvänta att vissa viktiga callActivities finns:
  const labels = collectLabels(tree);
  expect(labels).toEqual(expect.arrayContaining([
    expect.stringContaining('Application'),
    expect.stringContaining('Signing'),
  ]));
});

function collectLabels(root: ProcessTreeNode): string[] {
  const labels: string[] = [];
  (function visit(node: ProcessTreeNode) {
    labels.push(node.label);
    node.children.forEach(visit);
  })(root);
  return labels;
}
```

---

### 1.4. E2E / UI smoke – Process Explorer

Med t.ex. Playwright eller Cypress:

- starta appen med lokal backend/fixtures  
- gå till `/process-explorer`  
- vänta tills trädet laddats  
- asserta:
  - root-nod syns  
  - ett antal expected labels finns  
  - klick på Application expanderar dess children  
  - inga konsoll-fel

Målet är bara att fånga “totalt trasigt läge”.

---

## 🧾 Del 2 – Snapshot-regressioner

### 2.1. Snapshot av Mortgage ProcessTree

**Fil:** `src/lib/bpmn/__tests__/mortgage.tree.snapshot.test.ts`

```ts
it('matches the Mortgage ProcessTree snapshot', () => {
  const parseResults = loadMortgageFixturesAndParse();
  const bpmnMap = loadMortgageMap();
  const graph = buildProcessGraph(parseResults, { bpmnMap });
  const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });

  expect(tree).toMatchSnapshot();
});
```

**Tips:**

- undvik nondeterministiska fält i tree (t.ex. timestamp)
- eller mocka bort dem innan snapshot

---

### 2.2. Snapshot av genererade artefakter (rekommenderat)

Exempel:

- genererade testfiler
- genererade docs (Markdown/HTML)
- genererade DoR/DoD

```ts
it('matches generated test suite snapshot for Mortgage', () => {
  const parseResults = loadMortgageFixturesAndParse();
  const bpmnMap = loadMortgageMap();
  const graph = buildProcessGraph(parseResults, { bpmnMap });
  const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });

  const testSource = generateTestsFromTree(tree);
  expect(testSource).toMatchSnapshot();
});
```

Detta gör det extremt tydligt om en ändring påverkar output.

---

## 👀 Del 3 – Observability (logging + debug-endpoints)

### 3.1. Logging i Edge Functions

**Fil:** `supabase/functions/build-process-tree/index.ts`

Lägg in loggning:

```ts
console.log(JSON.stringify({
  level: 'info',
  event: 'build-process-tree.start',
  rootProcessId,
  fileCount: parseResults.size,
}));

console.log(JSON.stringify({
  level: 'info',
  event: 'build-process-tree.graphBuilt',
  nodeCount: graph.nodes.size,
  edgeCount: graph.edges.size,
  cycles: graph.cycles,
  missingDependencies: graph.missingDependencies,
}));

console.log(JSON.stringify({
  level: 'info',
  event: 'build-process-tree.treeBuilt',
  rootLabel: tree.label,
  totalNodes: countTreeNodes(tree),
  diagnosticsSummary: summarizeDiagnostics(tree),
}));
```

Med hjälp-funktioner:

```ts
function countTreeNodes(root: ProcessTreeNode): number {
  return 1 + root.children.reduce((sum, c) => sum + countTreeNodes(c), 0);
}

function summarizeDiagnostics(root: ProcessTreeNode): Record<string, number> {
  const counts: Record<string, number> = {};

  function visit(node: ProcessTreeNode) {
    (node.diagnostics ?? []).forEach(d => {
      const key = `${d.severity}:${d.code}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    node.children.forEach(visit);
  }

  visit(root);
  return counts;
}
```

---

### 3.2. Debug-mode på build-process-tree

I samma edge function:

```ts
const debugMode = url.searchParams.get('debug');

if (debugMode === 'graph') {
  return Response.json({
    nodes: [...graph.nodes.values()],
    edges: [...graph.edges.values()],
    cycles: graph.cycles,
    missingDependencies: graph.missingDependencies,
  });
}

if (debugMode === 'tree') {
  return Response.json(tree);
}
```

Detta gör att du kan besöka t.ex.:

- `/build-process-tree?debug=graph`
- `/build-process-tree?debug=tree`

och se exakt vad som produceras.

---

### 3.3. UI-diagnostics

I Process Explorer eller en separat debug-sida:

- visa en sammanfattning:

```tsx
const summary = summarizeDiagnostics(root);

return (
  <div className="diagnostics-summary">
    <h3>Diagnostics</h3>
    <ul>
      {Object.entries(summary).map(([key, count]) => (
        <li key={key}>{key}: {count}</li>
      ))}
    </ul>
  </div>
);
```

Det gör det omedelbart synligt om:

- MISSING_SUBPROCESS uppträder  
- CYCLE_DETECTED finns  
- andra koder dyker upp

---

## 📊 Del 4 – Liten monitoring

Om ni vill gå ett steg längre:

- logga `durationMs` för build-process-tree
- logga “size” (nodes, edges, treeNodes)  
- i CI: lägg ett test som varnar om:
  - noder > X  
  - edges > Y  
  - durationMs > threshold

Det är inte strikt nödvändigt men hjälper vid skalning.

---

## ✅ Exit-kriterier för FAS 5

| Krav | Beskrivning |
|------|-------------|
| Enhetstester täcker Graph/Tree/Map/Sequence | Ja |
| Mortgage e2e-integrationstest är grönt | Ja |
| Snapshot-test för Mortgage ProcessTree finns | Ja |
| Minst en generator (doc/test) har snapshot-regression | Rekommenderat starkt |
| Edge Function logging ger insyn i cycles/missingDeps | Ja |
| Debug-mode för graph/tree-output finns | Ja |
| UI visar någon form av diagnostics-sammanfattning | Minst på debug-sida |

---
