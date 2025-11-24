# FAS 4 – Produktintegration: Status & Nästa Steg

## ✅ Genomförda ändringar

### 1. ProcessTree-baserade generatorer
- ✅ Lagt till `generateHierarchicalTestFileFromTree()` i `src/lib/bpmnGenerators.ts`
- ✅ Lagt till `generateDocumentationFromTree()` i `src/lib/bpmnGenerators.ts`
- ✅ Dessa funktioner använder `ProcessTreeNode` direkt istället för `BpmnHierarchyNode`

### 2. Process Explorer
- ✅ Redan uppdaterad att använda `buildBpmnProcessGraph` och `buildProcessTreeFromGraph`
- ✅ Använder `ProcessTreeNode` direkt i UI-komponenter

## 🔄 Pågående / Kvarvarande arbete

### 1. Uppdatera `generateAllFromBpmnWithGraph` att använda ProcessTree
**Fil:** `src/lib/bpmnGenerators.ts`

**Nuvarande:** Funktionen använder `BpmnProcessGraph` och konverterar till `BpmnHierarchyNode` via `graphNodeToHierarchy`.

**Behöver:** Uppdatera för att:
1. Bygga `ProcessTree` från `BpmnProcessGraph` med `buildProcessTreeFromGraph`
2. Använda `generateHierarchicalTestFileFromTree()` istället för `generateHierarchicalTestFile()`
3. Använda `generateDocumentationFromTree()` för dokumentation

**Kodändring:**
```typescript
// I generateAllFromBpmnWithGraph, efter att grafen är byggd:
const tree = buildProcessTreeFromGraph(graph, effectiveRootFile, buildArtifacts);

// Använd tree istället för graph.root för testgenerering:
const hierarchicalTestContent = generateHierarchicalTestFileFromTree(
  tree,
  file
);
```

### 2. Uppdatera Edge Function: `build-process-tree`
**Fil:** `supabase/functions/build-process-tree/index.ts`

**Nuvarande:** Använder meta-baserad logik med `extractCallActivitiesFromMeta`, `parseTaskNodesFromMeta`, etc.

**Behöver:** 
1. Ladda BPMN-filer från storage
2. Parsa dem (använd samma parser-logik eller enklare variant för Deno)
3. Bygga `ProcessGraph` (kräver att processGraphBuilder-logiken portas eller delas)
4. Bygga `ProcessTree` från grafen
5. Returnera ProcessTree JSON

**Utmaning:** Edge Functions kör i Deno och kan inte direkt importera TypeScript från `src/`. Lösningar:
- **Alternativ A:** Porta nödvändig logik till Edge Function (duplicering)
- **Alternativ B:** Skapa en shared library/module som både client och edge kan använda
- **Alternativ C:** Använda en bundler (t.ex. esbuild) för att skapa edge-compatible kod

**Rekommendation:** Börja med Alternativ A för snabb implementation, planera för Alternativ B/C längre sikt.

### 3. Uppdatera Edge Function: `generate-artifacts`
**Fil:** `supabase/functions/generate-artifacts/index.ts`

**Nuvarande:** Använder `buildBpmnHierarchyForFile()` som bygger hierarki från meta.

**Behöver:**
1. Bygga ProcessGraph för alla relevanta filer
2. Bygga ProcessTree från grafen
3. Använda ProcessTree-baserade generatorer för dokumentation/tester

**Samma utmaning som ovan** gällande Deno/imports.

### 4. Rensa meta-baserad kod
**Filer att granska:**
- `src/lib/bpmn/buildProcessHierarchy.ts` - Behålls för nu (används av `buildProcessModel`)
- `src/lib/bpmn/processModelToProcessTree.ts` - Behålls för nu (används av vissa komponenter)
- `src/lib/bpmnGenerators.ts` - Ta bort gamla funktioner som inte längre används

**Strategi:**
1. Markera gamla funktioner som `@deprecated`
2. Uppdatera alla callers att använda nya ProcessTree-baserade funktioner
3. Ta bort deprecated kod efter verifiering

## 📋 Checklista för fullföljande

- [ ] Uppdatera `generateAllFromBpmnWithGraph` att använda ProcessTree
- [ ] Testa att testgenerering fungerar med ProcessTree
- [ ] Testa att dokumentationsgenerering fungerar med ProcessTree
- [ ] Porta processGraphBuilder-logik till Edge Function (eller skapa shared module)
- [ ] Uppdatera `build-process-tree` edge function
- [ ] Uppdatera `generate-artifacts` edge function
- [ ] Testa Edge Functions med ProcessTree
- [ ] Markera gamla meta-baserade funktioner som deprecated
- [ ] Uppdatera dokumentation

## 🎯 Prioritering

**Hög prioritet:**
1. Uppdatera `generateAllFromBpmnWithGraph` (client-side, enklare)
2. Testa ProcessTree-baserade generatorer

**Medel prioritet:**
3. Uppdatera Edge Functions (kräver mer arbete pga Deno-miljö)

**Låg prioritet:**
4. Rensa deprecated kod (kan göras efter att allt fungerar)

