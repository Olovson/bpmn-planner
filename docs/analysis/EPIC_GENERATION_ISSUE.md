# Epic-generering fungerar inte i tester

**Datum:** 2025-12-22  
**Status:** 🔍 Problem identifierat

## Problem

Epics genereras inte i `validate-feature-goals-generation.test.ts`:
- `epicDocs.length === 0` (förväntat: > 0)
- Testet visar: `Epics (nodes/): 0`

## Analys

### Vad fungerar

1. ✅ Feature Goals genereras korrekt (54 st)
2. ✅ Mockad LLM fungerar (`generateDocumentationWithLlm` är mockad)
3. ✅ `isLlmEnabled` är mockad att returnera `true`

### Möjliga orsaker

#### 1. Tasks finns inte i `nodesToGenerate`

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1483-1522

Tasks/epics filtreras baserat på:
- `nodeFilter` (om den finns)
- `analyzedFiles.includes(node.bpmnFile)` (rad 1521)

**Möjlighet:** Tasks finns i grafen men deras `bpmnFile` matchar inte någon fil i `analyzedFiles`.

#### 2. Tasks hoppas över på grund av `alreadyProcessedGlobally`

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1882-1884

```typescript
if (node.type !== 'callActivity' && alreadyProcessedGlobally) {
  continue; // Hoppa över tasks/epics som redan processats
}
```

**Möjlighet:** Tasks markeras som redan processade globalt innan de genereras.

#### 3. Storage-check hoppar över Epic-generering

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1893-1959

Storage-checken körs för tasks/epics när `forceRegenerate = false`, men testet använder `forceRegenerate = true`, så detta borde inte vara problemet.

**MEN:** Om `storageFileExists` returnerar `true` (trots mockad Supabase), hoppas Epic-generering över.

#### 4. Tasks finns inte i BPMN-filerna

**Möjlighet:** BPMN-filerna innehåller inga tasks (UserTask, ServiceTask, BusinessRuleTask).

## Nästa steg för debugging

1. **Logga `nodesToGenerate`:**
   - Hur många tasks/epics finns i `nodesToGenerate`?
   - Vilka typer har de?

2. **Logga `alreadyProcessedGlobally`:**
   - Är tasks redan markerade som processade?

3. **Logga `analyzedFiles`:**
   - Innehåller `analyzedFiles` alla filer där tasks finns?

4. **Verifiera att tasks faktiskt finns i grafen:**
   - Anropa `getTestableNodes(graph)` och räkna tasks

5. **Kontrollera Storage-check:**
   - Är `storageFileExists` mockad korrekt?
   - Returnerar den `false` som förväntat?

## Lösning

När orsaken är identifierad, fixa genom att:
1. Säkerställa att tasks inkluderas i `nodesToGenerate`
2. Säkerställa att `alreadyProcessedGlobally` inte är `true` för tasks i första filen
3. Säkerställa att Storage-checken respekterar `forceRegenerate = true`
4. Mocka `storageFileExists` att returnera `false` i tester
