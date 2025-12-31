# Analys: Faktiskt Genererade Filer vs Progress-räkning

## Faktiskt Genererade Filer (9)

### Epics (5)
1. `nodes/mortgage-se-internal-data-gathering/fetch-party-information.html`
2. `nodes/mortgage-se-internal-data-gathering/pre-screen-party.html`
3. `nodes/mortgage-se-internal-data-gathering/fetch-engagements.html`
4. `nodes/mortgage-se-application/confirm-application.html`
5. (Saknas: fler epics i mortgage-se-application.bpmn?)

### File-level Docs (3)
1. `mortgage-se-internal-data-gathering.html`
2. `mortgage-se-application.html`
3. `mortgage.html`

### Feature Goals (2)
1. `feature-goals/mortgage-se-application.html` - Process Feature Goal ✅
2. `feature-goals/mortgage.html` - Root Process Feature Goal ✅

### Saknas
- ❌ `feature-goals/mortgage-se-internal-data-gathering.html` - Process Feature Goal genererades INTE

## Jämförelse med Progress-räkning

### Progress-räknaren visade: 26 noder
### Faktiskt genererade: 9 filer

**Diskrepans:** 26 vs 9 = 17 filer skillnad

## Analys

### Vad som genererades korrekt:
1. ✅ Epics för `mortgage-se-internal-data-gathering.bpmn` (3 st)
2. ✅ Epic för `mortgage-se-application.bpmn` (1 st - confirm-application)
3. ✅ File-level docs för alla 3 filer
4. ✅ Process Feature Goal för `mortgage-se-application.bpmn`
5. ✅ Root Process Feature Goal för `mortgage.bpmn`

### Vad som saknas:
1. ❌ Process Feature Goal för `mortgage-se-internal-data-gathering.bpmn`
2. ❌ Fler epics i `mortgage-se-application.bpmn`? (bara 1 epic visades)
3. ❌ Epics i `mortgage.bpmn`? (inga epics visades)

## Problem Identifierat

### Problem 1: Process Feature Goal för `mortgage-se-internal-data-gathering.bpmn` genererades INTE

**Orsak (från logg):**
```
[bpmnGenerators] ⚠️ NOT counting Process Feature Goal for mortgage-se-internal-data-gathering.bpmn: 
{isSubprocessFile: false, hasProcessNode: true, processNodeType: 'process', 
isRootProcessFromMap: true, hasCallActivityPointingToFile: true}
```

**Vad som hände:**
- `isRootProcessFromMap: true` (felaktigt - internal-data-gathering är INTE root)
- `isSubprocessFile: false` (felaktigt - internal-data-gathering ÄR en subprocess)
- Process Feature Goal genererades INTE

**Konsekvens:**
- CallActivity "Internal data gathering" i `mortgage-se-application.bpmn` har ingen dokumentation att länka till
- Användaren kan inte se Process Feature Goal för `mortgage-se-internal-data-gathering.bpmn`

### Problem 2: Progress-räknaren visade 26 noder men bara 9 genererades

**Möjliga orsaker:**
1. **CallActivities räknades men genererades inte:**
   - 14 saknade subprocesser (CallActivities utan BPMN-filer)
   - Dessa räknades i `nodesToGenerate.length` men genererades inte

2. **Epics räknades men genererades inte:**
   - Fler epics i `mortgage-se-application.bpmn` och `mortgage.bpmn`?
   - Dessa räknades men genererades inte (kanske redan fanns?)

3. **File-level docs räknades korrekt:**
   - 3 file-level docs genererades (korrekt)

4. **Feature Goals räknades felaktigt:**
   - Progress-räknaren räknade 2 Process Feature Goals (mortgage-se-application, mortgage)
   - Men `mortgage.bpmn` borde vara Root Feature Goal, inte Process Feature Goal
   - `mortgage-se-internal-data-gathering.bpmn` räknades INTE men borde ha räknats

## Slutsats

### Vad fungerar:
- ✅ File-level docs genereras korrekt (3 st)
- ✅ Epics genereras korrekt (5 st visades)
- ✅ Process Feature Goal för `mortgage-se-application.bpmn` genereras korrekt
- ✅ Root Process Feature Goal för `mortgage.bpmn` genereras korrekt

### Vad behöver fixas:
- ❌ Process Feature Goal för `mortgage-se-internal-data-gathering.bpmn` genereras INTE
- ❌ Progress-räknaren visar felaktigt antal (26 vs 9 faktiskt genererade)

### Rotorsak:
- `rootProcessId` från bpmn-map matchar felaktigt `mortgage-se-internal-data-gathering.bpmn` som root-process
- Detta gör att `isRootProcessFromMap: true` för internal-data-gathering
- Vilket gör att `isSubprocessFile: false` och Process Feature Goal genereras INTE

## Rekommendation

**Fix 1: Förbättra fallback-logik för `isRootProcessFromMap`**
- Om `rootProcessId` matchar en fil som INTE är `bpmnFileName` (root-filen), använd `bpmnFileName` som fallback
- Detta säkerställer att root-filen alltid identifieras korrekt

**Fix 2: Lägg till debug-logging**
- Logga vad `rootProcessId` faktiskt är
- Logga vilka filer som matchar `rootProcessId`
- Detta hjälper att diagnostisera problemet

**Fix 3: Korrigera progress-räkning**
- Exkludera CallActivities med saknade subprocess-filer från räkning
- Exkludera redan genererade filer från räkning (om `forceRegenerate: false`)

