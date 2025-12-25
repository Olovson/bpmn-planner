# Code Refactoring Plan - Stora Kodfiler

## Problem
Vi har flera stora kodfiler som gör uppdateringar långsamma och mindre stabila:
- `bpmnGenerators.ts` - 3200 rader
- `documentationTemplates.ts` - 2008 rader
- `BpmnFileManager.tsx` - 5313 rader
- `llmDocumentation.ts` - 1193 rader

## Analys av bpmnGenerators.ts

### Nuvarande struktur (3200 rader)
1. **Hierarchical Test Generation** (~60 rader)
   - `HierarchicalTestNode` interface
   - `generateNodeTests()` function

2. **Export-ready Test Generator** (~25 rader)
   - `generateExportReadyTestFromUserStory()` function

3. **Legacy Test Skeleton Generator** (~120 rader)
   - `generateTestSkeleton()` function

4. **DoR/DoD Generator** (~170 rader)
   - `DorDodCriterion` interface
   - `GeneratedCriterion` interface
   - `generateDorDodCriteria()` function
   - `generateDorDodForNodeType()` function

5. **Documentation Generator** (~330 rader)
   - `SubprocessSummary` interface
   - `generateDocumentationHTML()` function
   - `parseSubprocessFile()` function
   - `parseDmnSummary()` function

6. **Batch Generator** (~2000 rader) - HUVUDFUNKTION
   - `GenerationResult` interface
   - `NodeArtifactEntry` interface
   - `renderDocWithLlm()` function
   - `extractDocInfoFromJson()` function
   - `loadChildDocFromStorage()` function
   - `generateAllFromBpmnWithGraph()` function (huvudfunktion)
   - `generateAllFromBpmn()` function (legacy)

7. **Process Tree Based Generators** (~280 rader)
   - `generateHierarchicalTestFileFromTree()` function
   - `generateNodeTestsFromProcessTree()` function
   - `generateDocumentationFromTree()` function
   - `generateNodeDocumentation()` function

## Lösningsförslag

### Strategi: Dela upp i logiska moduler

**Fördelar:**
- Snabbare att hitta relevant kod
- Enklare att testa isolerat
- Mindre risk för merge-konflikter
- Bättre separation of concerns
- Enklare att underhålla

**Nackdelar:**
- Kräver refaktorering
- Kan kräva uppdatering av imports
- Måste validera att allt fungerar

### Implementeringsplan

#### Steg 1: Skapa nya moduler för bpmnGenerators.ts

1. **`bpmnGenerators/testGenerators.ts`** (~200 rader)
   - Hierarchical Test Generation
   - Export-ready Test Generator
   - Legacy Test Skeleton Generator
   - Process Tree Based Generators

2. **`bpmnGenerators/dorDodGenerator.ts`** (~170 rader)
   - DoR/DoD Generator (flytta från bpmnGenerators.ts)
   - Använd redan existerande `templates/dorDodTemplates.ts`

3. **`bpmnGenerators/documentationGenerator.ts`** (~330 rader)
   - Documentation Generator
   - Subprocess parsing
   - DMN parsing

4. **`bpmnGenerators/batchGenerator.ts`** (~2000 rader)
   - Batch Generator (huvudfunktion)
   - `generateAllFromBpmnWithGraph()`
   - `generateAllFromBpmn()` (legacy)
   - Helper functions för batch-generering

5. **`bpmnGenerators/docRendering.ts`** (~200 rader)
   - `renderDocWithLlm()` function
   - `extractDocInfoFromJson()` function
   - `loadChildDocFromStorage()` function

6. **`bpmnGenerators/types.ts`** (~100 rader)
   - Alla interfaces och typer
   - `GenerationResult`
   - `NodeArtifactEntry`
   - `GenerationPhaseKey`
   - etc.

7. **`bpmnGenerators/index.ts`** (~50 rader)
   - Re-exports för bakåtkompatibilitet
   - Export all public APIs

#### Steg 2: Uppdatera imports

- Uppdatera alla filer som importerar från `bpmnGenerators.ts`
- Använd barrel export från `bpmnGenerators/index.ts`

#### Steg 3: Validera

- Köra alla tester
- Verifiera att inga breaking changes introducerats
- Kontrollera att alla exports fungerar

## Implementeringsordning

1. ✅ Skapa nya moduler
2. ✅ Flytta kod till nya moduler
3. ✅ Uppdatera imports i nya moduler
4. ✅ Skapa index.ts med re-exports
5. ✅ Uppdatera tester
6. ✅ Validera att allt fungerar
7. ✅ Ta bort gammal kod från bpmnGenerators.ts

## Mål

- `bpmnGenerators.ts` → Delas upp i 7 moduler (~200-500 rader vardera)
- Behålla 100% bakåtkompatibilitet
- Alla tester ska passera
- Inga breaking changes

