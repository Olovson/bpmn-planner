# Diagnos: mortgage-se-object-control.bpmn saknas i grafen

## Problem
`mortgage-se-object-control.bpmn` har mängder av saker i sig enligt användaren, men filen har 0 noder i grafen och ingen callActivity pekar på den.

## Rotorsak
1. **CallActivity finns i BPMN-filen**: `object-control` callActivity finns i `mortgage-se-manual-credit-evaluation.bpmn` (rad 88)
2. **CallActivity matchas inte**: CallActivity matchas inte korrekt till `mortgage-se-object-control.bpmn` när grafen byggs
3. **bpmn-map.json används inte**: `buildProcessModelFromDefinitions` använder `buildProcessHierarchy` som använder `matchCallActivityToProcesses` (automatisk matchning), inte `matchCallActivityUsingMap` (bpmn-map.json)

## Matchning i bpmn-map.json
```json
{
  "bpmn_id": "object-control",
  "name": "Object control",
  "subprocess_bpmn_file": "mortgage-se-object-control.bpmn"
}
```

## CallActivity i BPMN-filen
```xml
<bpmn:callActivity id="object-control" name="Object control">
```

Matchningen borde fungera eftersom `bpmn_id: "object-control"` matchar `id="object-control"`.

## Lösning
`buildProcessModelFromDefinitions` behöver använda bpmn-map.json för matchning. Detta kräver att:
1. `buildBpmnProcessGraphFromParseResults` laddar bpmn-map.json
2. `buildProcessModelFromDefinitions` tar emot bpmn-map.json som parameter
3. `buildProcessHierarchy` använder bpmn-map.json för matchning (eller `SubprocessMatcher` får bpmn-map.json support)

## Alternativ lösning
Använd `buildProcessGraph` (från `processGraphBuilder.ts`) istället för `buildProcessModelFromDefinitions`, eftersom `buildProcessGraph` redan använder bpmn-map.json via `matchSubprocesses`.
