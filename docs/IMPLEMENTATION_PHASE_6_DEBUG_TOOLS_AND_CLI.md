# 🟧 FAS 6 – Debug Tools & CLI
### _“Gör Graph & Tree lätta att inspektera – för både dig och AI-agenten.”_

## 🎯 Mål för FAS 6

När FAS 1–5 är klara har ni:

- Parser → ProcessGraph → ProcessTree  
- UI & generators på ProcessTree  
- Tester + snapshots  
- Logging/observability i Edge Functions  

FAS 6 fokuserar på att bygga verktyg för:

1. **ProcessGraph Debug UI** – för att se noder, edges, cykler, missing deps.  
2. **ProcessTree Debug UI** – för att se hierarkin, ordning och diagnostik.  
3. **CLI-verktyg** – t.ex. `npm run graph:inspect mortgage`.

---

## 🧱 Del 1 – ProcessGraph Debug UI

### 🎯 Syfte

En sida där du snabbt kan:

- se alla noder i ProcessGraph  
- filtrera på typ/fil  
- inspektera cycles & missingDependencies  
- klicka på en nod och se dess inkommande/utgående edges  

### 🔧 1.1. Ny sida: `ProcessGraphDebugPage`

**Fil:** `src/pages/ProcessGraphDebug.tsx` (namn valfritt)

```tsx
import React, { useEffect, useState } from 'react';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';

export function ProcessGraphDebugPage() {
  const [graph, setGraph] = useState<ProcessGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const parseResults = await loadAllBpmnParseResults();
      const bpmnMap = await loadBpmnMap();
      const g = buildProcessGraph(parseResults, { bpmnMap, preferredRootProcessId: 'Mortgage' });
      setGraph(g);
    }
    load();
  }, []);

  if (!graph) return <div>Laddar ProcessGraph…</div>;

  const nodes = [...graph.nodes.values()];
  const edges = [...graph.edges.values()];

  const selectedNode = selectedNodeId
    ? nodes.find(n => n.id === selectedNodeId) ?? null
    : null;

  const outgoingEdges = selectedNode
    ? edges.filter(e => e.from === selectedNode.id)
    : [];
  const incomingEdges = selectedNode
    ? edges.filter(e => e.to === selectedNode.id)
    : [];

  return (
    <div className="graph-debug">
      <aside className="graph-debug-sidebar">
        <h2>Nodes ({nodes.length})</h2>
        <ul>
          {nodes.map(n => (
            <li key={n.id}>
              <button onClick={() => setSelectedNodeId(n.id)}>
                [{n.type}] {n.name ?? n.bpmnElementId} ({n.bpmnFile})
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="graph-debug-main">
        <section>
          <h2>Graph Info</h2>
          <pre>
            roots: {JSON.stringify(graph.roots, null, 2)}
            cycles: {JSON.stringify(graph.cycles, null, 2)}
            missingDependencies: {JSON.stringify(graph.missingDependencies, null, 2)}
          </pre>
        </section>

        {selectedNode && (
          <section>
            <h2>Selected Node</h2>
            <pre>{JSON.stringify(selectedNode, null, 2)}</pre>

            <h3>Outgoing edges</h3>
            <pre>{JSON.stringify(outgoingEdges, null, 2)}</pre>

            <h3>Incoming edges</h3>
            <pre>{JSON.stringify(incomingEdges, null, 2)}</pre>
          </section>
        )}
      </main>
    </div>
  );
}
```

---

### 🔧 1.2. Data-loader för debug

**Fil:** `src/lib/bpmn/debugDataLoader.ts`

```ts
import type { BpmnParseResult } from './bpmnParserTypes';
import type { BpmnMap } from './bpmnMapLoader';

export async function loadAllBpmnParseResults(): Promise<Map<string, BpmnParseResult>> {
  const results = new Map<string, BpmnParseResult>();
  // TODO: läs BPMN-fixtures eller produktionskällor, parsa via BpmnParser
  return results;
}

export async function loadBpmnMap(): Promise<BpmnMap | undefined> {
  // TODO: ladda bpmn-map.json (fixtures eller storage)
  return undefined;
}
```

---

## 🌳 Del 2 – ProcessTree Debug UI

### 🎯 Syfte

Visualisera ProcessTree som:

- en hierarki  
- med tydlig `orderIndex`, `branchId`, `scenarioPath`  
- och diagnostik per nod  

### 🔧 2.1. Ny sida: `ProcessTreeDebugPage`

**Fil:** `src/pages/ProcessTreeDebug.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/buildProcessTreeFromGraph';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

export function ProcessTreeDebugPage() {
  const [root, setRoot] = useState<ProcessTreeNode | null>(null);

  useEffect(() => {
    async function load() {
      const parseResults = await loadAllBpmnParseResults();
      const bpmnMap = await loadBpmnMap();
      const graph = buildProcessGraph(parseResults, { bpmnMap, preferredRootProcessId: 'Mortgage' });
      const tree = buildProcessTreeFromGraph(graph, { rootProcessId: 'Mortgage' });
      setRoot(tree);
    }
    load();
  }, []);

  if (!root) return <div>Laddar ProcessTree…</div>;

  return (
    <div className="tree-debug">
      <h2>ProcessTree Debug</h2>
      <TreeNodeView node={root} depth={0} />
    </div>
  );
}

interface TreeNodeViewProps {
  node: ProcessTreeNode;
  depth: number;
}

function TreeNodeView({ node, depth }: TreeNodeViewProps) {
  const indentStyle = { paddingLeft: depth * 16 };

  return (
    <div style={indentStyle} className={`tree-node tree-node--${node.type}`}>
      <div className="tree-node-header">
        <span className="tree-node-label">
          [{node.type}] {node.label}
        </span>
        {typeof node.orderIndex === 'number' && (
          <span className="tree-node-order">#{node.orderIndex}</span>
        )}
        {node.branchId && (
          <span className="tree-node-branch">branch: {node.branchId}</span>
        )}
      </div>

      <div className="tree-node-meta">
        <span className="tree-node-file">
          {node.bpmnFile}#{node.bpmnElementId}
        </span>
        {node.scenarioPath && (
          <span className="tree-node-scenario">
            scenario: {node.scenarioPath.join(' / ')}
          </span>
        )}
      </div>

      {node.diagnostics && node.diagnostics.length > 0 && (
        <ul className="tree-node-diagnostics">
          {node.diagnostics.map((d, i) => (
            <li key={i} className={`diag diag--${d.severity}`}>
              {d.code}: {d.message}
            </li>
          ))}
        </ul>
      )}

      {node.children.map(child => (
        <TreeNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

---

## 💻 Del 3 – CLI-verktyg `graph:inspect`

### 🎯 Syfte

Ett CLI-kommando som:

- kör hela pipeline: parse → graph → tree  
- printar sammanfattningar till terminalen  
- används i lokal dev och CI

### 🔧 3.1. Script

**Fil:** `scripts/graph-inspect.ts`

```ts
#!/usr/bin/env node
import { buildProcessGraph } from '../src/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '../src/lib/bpmn/buildProcessTreeFromGraph';
import { loadAllBpmnParseResults, loadBpmnMap } from '../src/lib/bpmn/debugDataLoader';
import type { ProcessTreeNode } from '../src/lib/bpmn/processTreeTypes';

async function main() {
  const rootProcessId = process.argv[2] || 'Mortgage';

  console.log(`Inspecting process graph for root: ${rootProcessId}`);

  const parseResults = await loadAllBpmnParseResults();
  const bpmnMap = await loadBpmnMap();

  const graph = buildProcessGraph(parseResults, { bpmnMap, preferredRootProcessId: rootProcessId });

  console.log(`Graph: ${graph.nodes.size} nodes, ${graph.edges.size} edges`);
  console.log(`Roots: ${JSON.stringify(graph.roots, null, 2)}`);
  console.log(`Cycles: ${JSON.stringify(graph.cycles, null, 2)}`);
  console.log(`Missing deps: ${JSON.stringify(graph.missingDependencies, null, 2)}`);

  const tree = buildProcessTreeFromGraph(graph, { rootProcessId });

  const totalNodes = countTreeNodes(tree);
  console.log(`\nProcessTree: ${totalNodes} nodes`);
  console.log(`Root: [${tree.type}] ${tree.label}`);

  const diagSummary = summarizeDiagnostics(tree);
  console.log(`Diagnostics summary: ${JSON.stringify(diagSummary, null, 2)}`);

  printTree(tree, 0, 3);
}

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

function printTree(node: ProcessTreeNode, depth: number, maxDepth: number) {
  if (depth > maxDepth) return;
  const indent = ' '.repeat(depth * 2);
  console.log(
    `${indent}- [${node.type}] ${node.label} (file: ${node.bpmnFile}#${node.bpmnElementId}, order: ${node.orderIndex})`
  );
  node.children.forEach(child => printTree(child, depth + 1, maxDepth));
}

main().catch(err => {
  console.error('graph:inspect failed:', err);
  process.exit(1);
});
```

### 🔧 3.2. package.json

```json
{
  "scripts": {
    "graph:inspect": "ts-node scripts/graph-inspect.ts"
  }
}
```

(Justera efter ert build-setup.)

---

## 🧪 Del 4 – Lätta tester för debug-tools

- Enkla tester för `summarizeDiagnostics` och `printTree` (t.ex. att de inte kraschar och ger rimlig output).
- Valfritt snapshot-test för CLI-output i testmode (mockade parseResults).

Exempel:

```ts
it('summarizeDiagnostics counts diagnostics correctly', () => {
  const tree: ProcessTreeNode = {
    id: 'root',
    label: 'Root',
    type: 'process',
    bpmnFile: 'mortgage.bpmn',
    children: [],
    diagnostics: [
      { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'x' },
      { severity: 'warning', code: 'MISSING_SUBPROCESS', message: 'y' },
    ],
  };

  const summary = summarizeDiagnostics(tree);
  expect(summary['warning:MISSING_SUBPROCESS']).toBe(2);
});
```

---

## ✅ Exit-kriterier för FAS 6

| Krav | Beskrivning |
|------|-------------|
| ProcessGraph Debug UI | Sida som visar noder, edges, cycles, missing deps |
| ProcessTree Debug UI | Sida som visar hierarki, orderIndex, diagnostics |
| CLI `graph:inspect` | Går att köra lokalt mot Mortgage (eller annan root) |
| Minst enklare tester för debug-utils | T.ex. summarizeDiagnostics |

---

När FAS 6 är klar har ni:

- visuella verktyg för att förstå Graph & Tree  
- ett CLI som snabbt berättar om modellen är “frisk”  
- en miljö där både du och AI-assistenten kan felsöka och utveckla BPMN-modellen utan att famla i mörkret.
