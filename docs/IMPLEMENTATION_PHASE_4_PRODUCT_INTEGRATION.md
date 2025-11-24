# 🟩 FAS 4 – Produktintegration ✅ SLUTFÖRD
### _“Koppla samman nya Graph/Tree-modellen med Process Explorer, generators och Edge Functions.”_

**Status:** ✅ Slutförd  
**Datum:** 2025-01-XX  
**Se:** `IMPLEMENTATION_PHASE_4_COMPLETED.md` för detaljerad sammanfattning

## 🎯 Mål för FAS 4

Med FAS 1–3 på plats:

- Parser → ProcessGraph → ProcessTree  
- buildProcessGraph & buildProcessTreeFromGraph  
- ArtifactBuilder-hook

ska vi nu:

1. Koppla in **ProcessTree som enda datakälla** i:
   - Process Explorer UI  
   - Dokumentationsgenerator  
   - Testgenerator  
   - DoR/DoD-generator  

2. Uppdatera **Edge Functions**:
   - `build-process-tree`
   - `generate-artifacts`

3. **Fasa ut all meta-baserad logik** (bpmn_files.meta, äldre hierarki/ProcessModel-lager).

---

## 🧭 Steg 1 – Uppdatera useProcessTree()

**Fil:** `src/hooks/useProcessTree.ts` (eller motsvarande hook)

### Före (meta-baserat upplägg, förenklat):

```ts
const { files, dependencies } = useMeta();
const defs = collectProcessDefinitionsFromMeta(files);
const model = buildProcessModelFromDefinitions(defs, dependencies);
const tree = buildProcessTreeFromModel(model);
return tree;
```

### Efter (graf-baserat):

```ts
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/buildProcessTreeFromGraph';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
// samt en funktion för att hämta/parsa BPMN-filer

export function useProcessTree(rootProcessId: string = 'Mortgage') {
  const [tree, setTree] = useState<ProcessTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const parseResults = await loadAllBpmnParseResultsFromBackendOrStorage();
        const bpmnMap = await loadBpmnMap();
        const graph = buildProcessGraph(parseResults, {
          bpmnMap,
          preferredRootProcessId: rootProcessId,
        });
        const tree = buildProcessTreeFromGraph(graph, {
          rootProcessId,
          artifactBuilder,
        });
        setTree(tree);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [rootProcessId]);

  return { tree, loading, error };
}
```

### Viktigt

- Ta bort alla referenser till:
  - `collectProcessDefinitionsFromMeta`
  - `buildProcessHierarchy`
  - `buildProcessModelFromHierarchy`
  - `buildProcessTreeFromModel`
- Använd **enbart** Graph→Tree-flödet.

---

## 🧭 Steg 2 – Uppdatera Process Explorer UI

**Filer:**

- `src/pages/ProcessExplorer.tsx`
- `src/components/ProcessTreeD3.tsx`

### 2.1. Byt datatyp till ProcessTreeNode

Där UI tidigare förväntade sig något som:

```ts
type OldNode = {
  id: string;
  label: string;
  children: OldNode[];
  // ...
};
```

ska den nu ta:

```ts
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';

interface ProcessTreeProps {
  root: ProcessTreeNode;
}
```

### 2.2. Rendera noder baserat på ProcessTreeNode

För varje nod:

- visa:
  - `[type] label`  
  - `orderIndex`  
  - `branchId` / `scenarioPath`  
  - `bpmnFile#bpmnElementId`  

- highlighta:
  - `diagnostics` (badges/icons)  

Exempel:

```tsx
function TreeNodeView({ node }: { node: ProcessTreeNode }) {
  return (
    <g>
      <text>{`[${node.type}] ${node.label}`}</text>
      {typeof node.orderIndex === 'number' && (
        <text>{`#${node.orderIndex}`}</text>
      )}
      {node.branchId && <text>{`branch: ${node.branchId}`}</text>}
      {node.diagnostics?.length ? (
        <text>{`diag: ${node.diagnostics.length}`}</text>
      ) : null}
    </g>
  );
}
```

### 2.3. Navigering & interaktion

- Klick på callActivity:
  - expandera dess children
  - ev. visa länk till subprocess fil/sektion

- Klick på task:
  - visa kopplade artifacts (test/doc etc)

---

## 🧭 Steg 3 – Dokumentationsgenerator → ProcessTree

**Fil(er):** `src/lib/bpmnGenerators.ts` (och angränsande)

### Före (förenklat):

```ts
export function generateDocumentation(model: ProcessModel) {
  // traversera ProcessModel/HierarchyNode/etc.
}
```

### Efter:

```ts
import type { ProcessTreeNode } from './processTreeTypes';

export function generateDocumentationFromTree(root: ProcessTreeNode) {
  // traversera ProcessTreeNode i stället
}
```

### Principer:

- Root-process = toppnivå (t.ex. “Mortgage Credit Process”)
- CallActivities = kapitel/sektioner (Application, Object, Signing, Disbursement …)
- Tasks = underrubriker/punkter i respektive sektion
- `orderIndex` och `scenarioPath` används för:
  - sortering  
  - generering av rubrik-prefix (t.ex. “Steg 1.2.3”)  

---

## 🧭 Steg 4 – Testgenerator → ProcessTree

**Fil(er):** samma modul eller separat, t.ex. `src/lib/bpmnTestGenerators.ts`.

### Efter:

```ts
export function generateTestsFromTree(root: ProcessTreeNode) {
  // 1. traversera trädet djup-först
  // 2. för varje process/callActivity → describe-block
  // 3. för varje task → it-block
}
```

Exempelidé:

- `describe('[Process] Mortgage', ...)`
- `describe('[CallActivity] Application', ...)`
- `it('[Task] Fetch fastighets-information (#orderIndex)', ...)`

Scenario-path kan användas som del av testnamn eller metadata:

```ts
const scenarioId = node.scenarioPath?.join('/') ?? 'main';
```

---

## 🧭 Steg 5 – Uppdatera Edge Functions

### 5.1. build-process-tree Edge Function

**Fil:** `supabase/functions/build-process-tree/index.ts`

### Före (meta-baserat):

- Laddar rader från `bpmn_files` inklusive `meta`
- Bygger processDefinitions från `meta`
- Bygger hierarki med custom logik
- Returnerar meta-baserat träd

### Efter (graf/Tree-baserat):

1. Läs BPMN-filer från storage (bpmn-files bucket).
2. Parsa dem (t.ex. med samma logik som BpmnParser).
3. Ladda `bpmn-map.json` (från bucket eller table).
4. Bygg ProcessGraph:

```ts
const graph = buildProcessGraph(parseResultsMap, {
  bpmnMap,
  preferredRootProcessId: rootProcessId,
});
```

5. Bygg ProcessTree:

```ts
const tree = buildProcessTreeFromGraph(graph, {
  rootProcessId,
  artifactBuilder: serverArtifactBuilder,
});
```

6. Returnera `tree` som JSON.

**Rensa bort:**

- all `metaByFile`-logik
- `extractCallActivitiesFromMeta`
- `parseTaskNodesFromMeta`
- `buildTree`-funktionalitet baserad på meta

### 5.2. generate-artifacts Edge Function

Byt från att använda modell/meta till att ta in **ProcessTree**:

- antingen:
  - generera ProcessTree direkt i funktionen
  - eller
  - förvänta ProcessTree som input (beroende på er arkitektur)

Poängen: **ingen meta**.

---

## 🧭 Steg 6 – Rensa bort all meta-baserad kod

Gå igenom projektet och ta bort (eller flytta till en `legacy/`-mapp om du vill spara till senare referens):

- `bpmn_files.meta` beroenden
- `ProcessDefinition`/`HierarchyNode`/`ProcessNodeModel`-baserade builders
- `buildProcessHierarchy`
- `buildProcessModelFromHierarchy`
- `buildProcessTreeFromModel`
- kod som direkt läser/antar att meta innehåller tasks/callActivities

Målet är att framtida utveckling:

> alltid börjar från BPMN → Graph → Tree.

---

## 🧪 Tester & sanity checks i FAS 4

- ✅ Process Explorer:
  - laddar trädet utan fel
  - visar root + förväntade subprocesser
- ✅ Dokumentation:
  - genereras från ProcessTree
- ✅ Testgenerator:
  - producerar describe/it-struktur som speglar trädet
- ✅ Edge Function `build-process-tree`:
  - returnerar ProcessTree JSON
  - loggar cycles/missingDependencies
- ✅ Inga referenser till meta:
  - global sökning efter `.meta` i koden ska inte visa produktionsvägar

---

## ✅ Exit-kriterier för FAS 4

| Krav | Beskrivning |
|------|-------------|
| Process Explorer använder ProcessTreeNode | All rendering bygger på ProcessTree |
| Docs/test/DoR/DoD använder ProcessTree | Ingen egen modell längre |
| build-process-tree edge använder Graph+Tree | Meta inte längre i bruk |
| generate-artifacts använder Graph/Tree | Inte meta |
| meta/hierarchy/old models bortplockade | Endast Graph/Tree kvar som sanning |
