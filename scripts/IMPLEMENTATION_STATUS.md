# Status: bpmn-map.json Support Implementation

## ✅ Implementerat

1. **SubprocessMatcher** (`src/lib/bpmn/SubprocessMatcher.ts`):
   - ✅ Lagt till `bpmnMap` och `currentBpmnFile` i `SubprocessMatcherConfig`
   - ✅ Försöker först matcha via bpmn-map.json innan automatisk matchning
   - ✅ Returnerar matchning med `matchedFileName` även om kandidaten saknas

2. **buildProcessHierarchy** (`src/lib/bpmn/buildProcessHierarchy.ts`):
   - ✅ Skickar `currentBpmnFile` till `matchCallActivityToProcesses`
   - ✅ Använder `matchedFileName` från link om det finns

3. **buildProcessModel** (`src/lib/bpmn/buildProcessModel.ts`):
   - ✅ Lagt till `bpmnMap` i `BuildProcessModelOptions`
   - ✅ Skickar `bpmnMap` till `buildProcessHierarchy` via `matcherConfig`

4. **buildBpmnProcessGraph** (`src/lib/bpmnProcessGraph.ts`):
   - ✅ Laddar bpmn-map.json från storage
   - ✅ Skickar `bpmnMap` till `buildProcessModelFromDefinitions`

5. **buildBpmnProcessGraphFromParseResults** (`src/lib/bpmnProcessGraph.ts`):
   - ✅ Tar emot `bpmnMap` som optional parameter
   - ✅ Skickar `bpmnMap` till `buildProcessModelFromDefinitions`

6. **convertProcessModelChildren** (`src/lib/bpmnProcessGraph.ts`):
   - ✅ Använder `matchedFileName` direkt om det finns (från bpmn-map.json)
   - ✅ Försöker hitta target-process via filnamnet om `matchedProcessId` saknas

## ❌ Återstående Problem

**`object-control` callActivity parsas inte från BPMN-filen**

- BPMN-filen innehåller 3 callActivities:
  1. `object-control` (rad 88) - saknar `calledElement`
  2. `documentation-assessment` (rad 103) - saknar `calledElement`
  3. `Activity_1gzlxx4` (rad 123) - har `calledElement="credit-evaluation"`

- ParseResult innehåller bara 2 callActivities:
  - `documentation-assessment` ✅
  - `credit-evaluation` (matchas till `Activity_1gzlxx4` via `calledElement`) ✅
  - `object-control` ❌ **SAKNAS**

Detta är ett **parsningsproblem**, inte ett matchningsproblem. Parsern (bpmn-js) hittar inte `object-control` callActivity i BPMN-filen.

## Nästa Steg

1. Undersök varför `object-control` callActivity inte parsas
2. Fixa parsningen så att alla callActivities inkluderas
3. Validera att alla 20 subprocess-filer får process-noder i grafen
