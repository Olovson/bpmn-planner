# Projektfilen som Source of Truth - Analys

## Svar på frågorna

### 1. Är `/bpmn-map.json` i projektet source of truth?

**JA** - Projektfilen (`bpmn-map.json` i root) är source of truth.

**Bevis från koden:**
```typescript
// src/lib/bpmn/bpmnMapStorage.ts
import rawBpmnMap from '../../../bpmn-map.json';

// När Storage-filen laddas:
const projectMap = loadBpmnMap(rawBpmnMap);
const mergedMap = mergeBpmnMaps(projectMap, storageMap);
```

**Hur det fungerar:**
1. Projektfilen importeras direkt i koden
2. När Storage-filen laddas, mergas den med projektfilen
3. Projektfilen ger strukturen (id, alias, description)
4. Storage-filen ger användarändringar (call_activities)

### 2. Vad händer om projektfilen skiljer sig från faktiska filer?

**Systemet upptäcker avvikelser, men hanterar dem INTE automatiskt.**

#### Vad systemet UPPTÄCKER:

1. **Nya filer i DB som inte finns i map** (`dbOnlyFiles`)
   - ✅ Upptäcks av `suggestBpmnMapUpdates()`
   - ✅ Läggs till i `newFiles[]`
   - ✅ Föreslås i `MapSuggestionsDialog`

2. **Filer i map som inte finns i DB** (`mapOnlyFiles`)
   - ✅ Upptäcks och loggas i dev-mode
   - ❌ Tas INTE bort automatiskt
   - ⚠️ Skapar "orphaned processes" i map

3. **Nya call activities som saknas i map** (`missingInMap`)
   - ✅ Upptäcks av `suggestBpmnMapUpdates()`
   - ✅ Föreslås i `MapSuggestionsDialog`

4. **Call activities i map som pekar på raderade filer**
   - ⚠️ Upptäcks av validering (`useBpmnMapManagement`)
   - ❌ Fixas INTE automatiskt
   - ⚠️ Skapar "orphaned call activities"

#### Vad systemet INTE gör automatiskt:

1. **Tar INTE bort processer från map** som inte längre finns i DB
   - Orsak: Merge-funktionen tar alltid processer från projektfilen
   - Om projektfilen innehåller en process, kommer den alltid finnas i merged map
   - Även om filen inte finns i DB

2. **Uppdaterar INTE projektfilen automatiskt**
   - Projektfilen är statisk (versionerad i Git)
   - Användaren måste uppdatera den manuellt

## Konsekvenser

### Scenario 1: Projektfilen är gammal (innehåller filer som inte finns i DB)

**Vad händer:**
- Merge-funktionen tar processer från projektfilen
- Dessa processer finns i merged map
- Men filerna finns inte i DB
- Systemet försöker ladda filer som inte finns → 400 Bad Request errors

**Exempel:**
```json
// Projektfilen innehåller:
{
  "processes": [
    { "bpmn_file": "old-file.bpmn" }  // ← Filen finns inte i DB längre
  ]
}
```

**Resultat:**
- Map innehåller `old-file.bpmn`
- När systemet försöker ladda filen → 400 Bad Request
- Validering visar problem, men fixar inte dem

### Scenario 2: Projektfilen saknar nya filer

**Vad händer:**
- Nya filer laddas upp till DB
- `suggestBpmnMapUpdates()` upptäcker dem
- De föreslås i `MapSuggestionsDialog`
- När användaren accepterar, läggs de till i Storage
- Men de läggs INTE till i projektfilen

**Resultat:**
- Nya filer finns i Storage-map
- Men inte i projektfilen
- Vid nästa merge, tas de från Storage (via merge-funktionen)
- Men projektfilen är fortfarande gammal

## Rekommendationer

### För att hålla projektfilen uppdaterad:

1. **Manuell uppdatering** (nuvarande approach)
   - När nya filer läggs till, uppdatera projektfilen manuellt
   - Commit till Git

2. **Automatisk validering** (förbättring)
   - Lägg till validering som varnar när projektfilen är gammal
   - Visa varning i UI när `mapOnlyFiles.length > 0`

3. **Automatisk cleanup** (framtida förbättring)
   - När filer raderas, ta bort dem från map
   - Men detta kräver att vi vet vilka filer som raderades

### För att hantera orphaned processes:

1. **Validering visar problem** (redan implementerat)
   - `useBpmnMapManagement` validerar map
   - Visar orphaned processes i UI

2. **Manuell rensning** (nuvarande approach)
   - Användaren kan regenerera map från scratch
   - Eller manuellt ta bort orphaned processes

3. **Automatisk rensning** (framtida förbättring)
   - När map laddas, filtrera bort processer som inte finns i DB
   - Men detta kan ta bort processer som bara är temporärt borta

## Sammanfattning

**Projektfilen är source of truth, MEN:**
- ✅ Systemet upptäcker när projektfilen är gammal
- ❌ Systemet fixar INTE automatiskt när projektfilen är gammal
- ⚠️ Orphaned processes kan skapas om projektfilen innehåller filer som inte finns i DB
- ✅ Nya filer upptäcks och föreslås automatiskt
- ⚠️ Användaren måste manuellt uppdatera projektfilen när nya filer läggs till






