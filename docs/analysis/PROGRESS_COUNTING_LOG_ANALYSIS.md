# Analys: Progress-räkning baserat på logg

## Loggdata

### analyzedFiles
- `mortgage-se-application.bpmn`
- `mortgage.bpmn`
- `mortgage-se-internal-data-gathering.bpmn`

### Process Feature Goals som räknas
1. ✅ `mortgage-se-application.bpmn` - räknas korrekt (subprocess file with process node)
2. ❌ `mortgage.bpmn` - räknas FELAKTIGT som Process Feature Goal (borde vara Root Feature Goal)
3. ❌ `mortgage-se-internal-data-gathering.bpmn` - räknas INTE (borde räknas som Process Feature Goal)

### Root Feature Goal
- `rootFeatureGoalCount: 0` - **FEL!** Borde vara 1 för `mortgage.bpmn`

### CallActivities som hoppas över
- `object` (Object) - missingDefinition=true
- `kyc` (KYC) - missingDefinition=true

### Root callActivities
- 14 st totalt (många pekar på `mortgage-se-application.bpmn` och `mortgage-se-internal-data-gathering.bpmn`)

## Problem Identifierade

### Problem 1: `mortgage.bpmn` räknas som Process Feature Goal istället för Root Feature Goal

**Logg:**
```
[bpmnGenerators] 📊 Counting Process Feature Goal for progress: mortgage.bpmn (subprocess file with process node (hasCallActivity: false, isRootProcess: false))
```

**Vad som händer:**
- `isRootProcessFromMap: false` (felaktigt - mortgage.bpmn ÄR root-processen)
- `isSubprocessFile: true` (felaktigt - mortgage.bpmn är INTE en subprocess)
- Räknas som Process Feature Goal istället för Root Feature Goal

**Orsak:**
- `rootProcessId` från bpmn-map matchar inte `mortgage.bpmn` korrekt
- `isRootProcessFromMap` blir `false` när den borde vara `true`

### Problem 2: `mortgage-se-internal-data-gathering.bpmn` räknas INTE som Process Feature Goal

**Logg:**
```
[bpmnGenerators] ⚠️ NOT counting Process Feature Goal for mortgage-se-internal-data-gathering.bpmn: 
{isSubprocessFile: false, hasProcessNode: true, processNodeType: 'process', isRootProcessFromMap: true, hasCallActivityPointingToFile: true}
```

**Vad som händer:**
- `isRootProcessFromMap: true` (felaktigt - internal-data-gathering är INTE root-processen)
- `isSubprocessFile: false` (felaktigt - internal-data-gathering ÄR en subprocess)
- Räknas INTE som Process Feature Goal

**Orsak:**
- `rootProcessId` från bpmn-map matchar felaktigt `mortgage-se-internal-data-gathering.bpmn`
- `isRootProcessFromMap` blir `true` när den borde vara `false`

### Problem 3: Root Feature Goal räknas inte

**Logg:**
```
rootFeatureGoalCount: 0
```

**Vad som händer:**
- Root Feature Goal för `mortgage.bpmn` räknas INTE
- `shouldGenerateRootFeatureGoal` blir `false` när den borde vara `true`

**Orsak:**
- `isRootProcessFromMap` är `false` för `mortgage.bpmn`
- `shouldGenerateRootFeatureGoal` kollar `isRootProcessFromMap` och misslyckas

## Rotorsak

**`rootProcessId` från bpmn-map matchar felaktigt filerna:**

1. `mortgage.bpmn` matchar INTE `rootProcessId` → `isRootProcessFromMap: false` → räknas som Process Feature Goal
2. `mortgage-se-internal-data-gathering.bpmn` matchar `rootProcessId` → `isRootProcessFromMap: true` → räknas INTE som Process Feature Goal
3. `rootFeatureGoalCount` blir 0 eftersom `mortgage.bpmn` inte identifieras som root

## Beräkning av 26 Noder

Baserat på loggen:
- `nodesToGenerate.length`: ? (epics + callActivities med subprocess-filer)
- `processNodesToGenerate`: 2 (mortgage-se-application.bpmn, mortgage.bpmn - FELAKTIGT)
- `fileLevelDocsCount`: 3 (alla filer i analyzedFiles)
- `rootFeatureGoalCount`: 0 (borde vara 1)

**Om `nodesToGenerate.length` är 21:**
- 21 (epics/callActivities) + 2 (Process Feature Goals) + 3 (file-level docs) + 0 (Root Feature Goal) = **26 noder**

## Lösning

### Fix 1: Korrigera `isRootProcessFromMap` logik
- Kontrollera att `rootProcessId` matchar korrekt
- `mortgage.bpmn` ska identifieras som root-process
- `mortgage-se-internal-data-gathering.bpmn` ska INTE identifieras som root-process

### Fix 2: Korrigera Process Feature Goal-räkning
- `mortgage.bpmn` ska INTE räknas som Process Feature Goal (det är root)
- `mortgage-se-internal-data-gathering.bpmn` ska räknas som Process Feature Goal (det är en subprocess)

### Fix 3: Korrigera Root Feature Goal-räkning
- `rootFeatureGoalCount` ska vara 1 för `mortgage.bpmn`
- `shouldGenerateRootFeatureGoal` ska vara `true` för `mortgage.bpmn`

## Förväntad Räkning (Efter Fix)

- `nodesToGenerate.length`: ~21 (epics + callActivities)
- `processNodesToGenerate`: 2 (mortgage-se-application.bpmn, mortgage-se-internal-data-gathering.bpmn)
- `fileLevelDocsCount`: 3
- `rootFeatureGoalCount`: 1 (mortgage.bpmn)
- **Totalt**: 21 + 2 + 3 + 1 = **27 noder** (eller 26 om en callActivity saknas)

## Nästa Steg

1. Kontrollera vad `rootProcessId` faktiskt är i bpmn-map
2. Verifiera att `isRootProcessFromMap` logik matchar korrekt
3. Fixa Process Feature Goal-räkning för att exkludera root-filer
4. Fixa Root Feature Goal-räkning för att inkludera root-filer


