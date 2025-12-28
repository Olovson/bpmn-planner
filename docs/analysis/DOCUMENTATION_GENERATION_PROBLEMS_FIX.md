# Analys: Varför Dokumentationsgenerering Inte Fungerar

## Problem 1: Filtrering Fungerar Inte

### Symptom
Feature Goals genereras för callActivities vars subprocess-filer saknas (t.ex. household, stakeholder, object).

### Rotorsak
I `bpmnProcessGraph.ts` rad 390-392:
```typescript
const subprocessFile = resolvedSubprocessFile && context.existingBpmnFiles?.includes(resolvedSubprocessFile)
  ? resolvedSubprocessFile
  : undefined;
```

Problemet: Om `bpmn-map.json` pekar på en fil som inte finns i `existingBpmnFiles`, sätts `subprocessFile` till `undefined`. Men `missingDefinition` sätts till `true` endast om `subprocessFile` är `undefined` ELLER om filen saknas i `existingBpmnFiles` (rad 497).

Men problemet är att `resolvedSubprocessFile` kan komma från `bpmn-map.json` och peka på en fil som inte är uppladdad. I detta fall:
- `resolvedSubprocessFile = "mortgage-se-household.bpmn"` (från bpmn-map.json)
- `subprocessFile = undefined` (eftersom filen inte finns i existingBpmnFiles)
- `missingDefinition = true` (korrekt)

Men testet visar att Feature Goals ändå genereras. Detta tyder på att:
1. Antingen sätts `missingDefinition` inte korrekt
2. Eller så hoppas filtreringen över någonstans

### Lösning
Verifiera att `missingDefinition` sätts korrekt i `bpmnProcessGraph.ts` och att filtreringen i `bpmnGenerators.ts` faktiskt används.

---

## Problem 2: Root-Process Feature Goal Saknas

### Symptom
Ingen Feature Goal genereras för `mortgage.bpmn` (root-processen).

### Rotorsak
I `bpmnGenerators.ts` genereras Feature Goals ENDAST för `callActivity` noder (rad 2240-2435). Det finns ingen logik för att generera Feature Goal för root-processen (process-noden i root-filen).

### Lösning
Lägg till logik för att generera Feature Goal för root-processen när `isActualRootFile = true` och filen är root-processen enligt `bpmn-map.json`.

