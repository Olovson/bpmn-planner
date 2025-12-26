# Reset och Radera - Vad händer med Storage?

## 1. "Reset registret" - Vad raderas från Storage?

### Vad som raderas:
✅ **Dokumentation**: `docs/`, `generated-docs/`
✅ **Tester**: `tests/`, `tests/e2e/`
✅ **llm-debug**: Hela `llm-debug/` mappen (efter fix)
✅ **Rapporter**: `test-reports/`, `reports/`
✅ **Databas**: Alla genererade artefakter, jobbhistorik, DoR/DoD, etc.

### Vad som BEHÅLLS:
❌ **BPMN/DMN källfiler**: Behålls medvetet (enligt design)
❌ **bpmn-map.json**: Raderas INTE (konfigurationsfil, skapas automatiskt om den saknas)

### Kod:
- `src/pages/BpmnFileManager/hooks/useReset.ts`: Anropar `resetGeneratedData` med `deleteTests: true`
- `supabase/functions/reset-generated-data/index.ts`: 
  - I `safeMode`: Raderar `llm-debug` när `shouldDeleteTests` är `true` (efter fix)
  - I `!safeMode`: Raderar alltid `llm-debug`

## 2. "Radera alla filer" - Vad händer med Storage?

### Vad som raderas:
✅ **BPMN/DMN filer från Storage**: Ja, filerna raderas från Storage
✅ **BPMN/DMN filer från databasen**: Ja, raderas från `bpmn_files` tabellen
✅ **GitHub**: Synkas också (om konfigurerat)

### Vad som BEHÅLLS:
❌ **bpmn-map.json**: Raderas INTE (finns inte i `bpmn_files` tabellen)
❌ **Dokumentation, tester, etc.**: Raderas INTE (de är kopplade till filer som raderas, men raderas inte automatiskt)

### Kod:
- `src/pages/BpmnFileManager/hooks/useFileOperations.ts`: Anropar `deleteMutation.mutateAsync()` för varje fil
- `src/hooks/useBpmnFiles.ts`: Anropar `delete-bpmn-file` Edge Function
- `supabase/functions/delete-bpmn-file/index.ts`:
  - Rad 91-93: Raderar från Storage med `file.storage_path`
  - Rad 103-106: Raderar från databasen

## 3. Problem och lösningar

### Problem 1: llm-debug raderas inte helt i safe mode
**Status**: ✅ FIXAT
- **Före**: Raderade bara `llm-debug/tests` i safe mode
- **Efter**: Raderar hela `llm-debug/` mappen när `deleteTests: true`

### Problem 2: bpmn-map.json raderas inte
**Status**: ⚠️ DESIGN-BESLUT
- `bpmn-map.json` är en konfigurationsfil, inte data
- Den skapas automatiskt om den saknas (från projektfilen)
- Om du vill radera den, använd: `npm run cleanup:all-storage`

### Problem 3: Dokumentation/tester raderas inte när BPMN-filer raderas
**Status**: ⚠️ DESIGN-BESLUT
- Dokumentation och tester är kopplade till filer, men raderas inte automatiskt
- Använd "Reset registret" för att rensa genererade artefakter
- Eller använd: `npm run cleanup:all-storage` för att rensa allt

## 4. Rekommendationer

### För att starta helt om från scratch:

1. **Radera alla filer** i appen (raderar BPMN/DMN filer)
2. **Reset registret** (raderar genererade artefakter, inklusive llm-debug)
3. **Kör cleanup-script** om du vill radera `bpmn-map.json` också:
   ```bash
   npm run cleanup:all-storage
   ```

### För att bara rensa genererade artefakter:

1. **Reset registret** (raderar dokumentation, tester, llm-debug, etc.)
2. BPMN/DMN källfiler behålls

## 5. Sammanfattning

| Åtgärd | BPMN-filer (Storage) | Dokumentation | Tester | llm-debug | bpmn-map.json |
|--------|---------------------|---------------|--------|-----------|---------------|
| **Reset registret** | ❌ Behålls | ✅ Raderas | ✅ Raderas | ✅ Raderas (efter fix) | ❌ Behålls |
| **Radera alla filer** | ✅ Raderas | ❌ Behålls | ❌ Behålls | ❌ Behålls | ❌ Behålls |
| **cleanup:all-storage** | ✅ Raderas | ✅ Raderas | ✅ Raderas | ✅ Raderas | ✅ Raderas |

## Historik

- **2025-12-22**: Fixat så att `llm-debug` raderas helt när `deleteTests: true` i safe mode
- **2025-12-22**: Dokumenterat beteende för Reset och Radera alla filer



