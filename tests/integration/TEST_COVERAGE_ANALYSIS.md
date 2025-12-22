# Test Coverage Analysis: Dokumentationsgenerering

## Hur appen faktiskt fungerar

### BpmnFileManager.tsx anropar:
```typescript
generateAllFromBpmnWithGraph(
  file.file_name,
  graphFiles,                    // Kan vara flera filer (hierarki)
  existingDmnFiles,
  useHierarchy,                  // true/false baserat på root/subprocess
  true,                          // useLlm = true (använder LLM)
  handleGeneratorPhase,
  generationSourceLabel,          // 'llm-slow-chatgpt'
  llmProvider,                   // 'cloud' (Claude)
  nodeFilter,                    // Diff-baserad filter (kan finnas)
  getVersionHashForFile,         // Version selection
  checkCancellation,             // Cancellation check
  abortSignal,                   // Abort signal
  isRootFile,                    // Root file flag
  true,                          // forceRegenerate = true (alltid)
)
```

### Viktiga parametrar:
- ✅ `useHierarchy`: true för root-filer, false för isolerade subprocesser
- ✅ `useLlm`: true (använder Claude)
- ✅ `forceRegenerate`: true (alltid regenerera)
- ✅ `nodeFilter`: Diff-baserad filter (kan finnas)
- ✅ `getVersionHashForFile`: Version hash-hantering
- ✅ `checkCancellation` / `abortSignal`: Cancellation support

## Nuvarande testtäckning

### ✅ Testade scenarion:

1. **Isolerad generering (en fil)**
   - `application-documentation-generation.test.ts`
   - `household-documentation-generation.test.ts`
   - Använder: `generateAllFromBpmnWithGraph` med `useHierarchy = false`, `useLlm = false`

2. **Hierarkisk generering (flera filer)**
   - `generation-order-scenarios.test.ts`
   - `application-hierarchy-documentation.test.ts`
   - Använder: `generateAllFromBpmnWithGraph` med `useHierarchy = true`, `useLlm = false`

3. **Olika genereringsordningar**
   - `generation-order-scenarios.test.ts`
   - Testar: subprocess först, parent först, olika nivåer

4. **Batch-generering (alla filer i mapp)**
   - `mortgage-se-batch-generation.test.ts` (NYTT)
   - Använder: `generateAllFromBpmn` (legacy) med `useLlm = false`

5. **LLM-generering (Claude)**
   - `claude-application.test.ts`
   - Använder: `generateAllFromBpmnWithGraph` med `useLlm = true`, `forceRegenerate = false`

### ❌ Saknade testscenarion:

1. **forceRegenerate = true**
   - Ingen test testar att `forceRegenerate = true` faktiskt hoppar över Storage-checks
   - Appen använder alltid `forceRegenerate = true`

2. **nodeFilter med diff-baserad regenerering**
   - Ingen test testar att `nodeFilter` faktiskt filtrerar noder korrekt
   - Ingen test testar kombinationen `forceRegenerate = true` + `nodeFilter`

3. **Version hash-hantering**
   - Ingen test testar `getVersionHashForFile` funktionalitet
   - Ingen test testar versioned vs non-versioned paths

4. **Cancellation/Abort**
   - Ingen test testar `checkCancellation` eller `abortSignal`

5. **Storage-checks med forceRegenerate**
   - Ingen test verifierar att Storage-checks hoppas över när `forceRegenerate = true`
   - Ingen test verifierar att Storage-checks respekterar `nodeFilter`

6. **Batch-generering med hierarki**
   - `mortgage-se-batch-generation.test.ts` använder legacy generator (ingen hierarki)
   - Ingen test testar batch-generering med `useHierarchy = true`

7. **LLM-generering med hierarki**
   - `claude-application.test.ts` använder `useHierarchy = false`
   - Ingen test testar LLM-generering med hierarki

8. **Kombinationer:**
   - `forceRegenerate = true` + `useHierarchy = true` + `useLlm = true`
   - `nodeFilter` + `forceRegenerate = true` + `useHierarchy = true`
   - Version hash + `forceRegenerate = true`

## Gap-analys

### Kritiska gaps (appens faktiska användning):

1. **forceRegenerate = true** - Appen använder alltid detta, men inga tester gör det
2. **useLlm = true** - Appen använder LLM, men de flesta tester använder templates
3. **useHierarchy = true** - Appen använder hierarki för root-filer, men batch-testet gör inte det
4. **nodeFilter** - Appen använder diff-baserad filter, men inga tester testar detta

### Mindre kritiska gaps:

1. Version hash-hantering
2. Cancellation/Abort
3. Kombinationer av parametrar

## Rekommendationer

### Prioritet 1: Kritiska gaps
1. Uppdatera `mortgage-se-batch-generation.test.ts` att använda `generateAllFromBpmnWithGraph` med hierarki
2. Skapa test för `forceRegenerate = true` + Storage-checks
3. Skapa test för `nodeFilter` + `forceRegenerate = true`
4. Skapa test för LLM-generering med hierarki

### Prioritet 2: Viktiga gaps
5. Test för version hash-hantering
6. Test för cancellation/abort
7. Test för kombinationer av parametrar
