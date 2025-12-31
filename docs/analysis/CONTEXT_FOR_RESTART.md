# Kontext för Restart - MapSuggestionsDialog och Filnamnsjämförelser

## Problem som just fixats

Användaren rapporterade två problem när filer laddas upp från mappar (recursively):
1. **Många varningar** i konsolen: `[SubprocessMatcher] bpmn-map.json pekar på mortgage-se 2025.11.29/mortgage-se-household.bpmn men filen hittades inte bland kandidaterna`
2. **MapSuggestionsDialog visas inte längre** efter uppladdning

## Rotorsak

Problemet var att `bpmn-map.json` kan innehålla filnamn med mappstruktur (t.ex. `mortgage-se 2025.11.29/mortgage-se-household.bpmn`), men databasen (`bpmn_files` tabellen) har bara filnamnet (t.ex. `mortgage-se-household.bpmn`). När `suggestBpmnMapUpdates()` jämförde filnamn, matchade de inte eftersom ena hade mappsökväg och andra inte.

## Ändringar som just gjorts

### Fil: `src/lib/bpmn/bpmnMapSuggestions.ts`

1. **Lagt till `getFileNameOnly()` hjälpfunktion** som extraherar bara filnamnet från mappsökvägar
2. **Normaliserat filnamnsjämförelser** i `suggestBpmnMapUpdates()`:
   - När identifiera nya filer: jämför normaliserade filnamn
   - När hitta `fileMeta`: försök både med full sökväg och bara filnamnet
   - När skapa suggestions: normalisera `suggested_subprocess_bpmn_file` till bara filnamnet
3. **Normaliserat filnamnsjämförelser** i `generateUpdatedBpmnMap()`:
   - När lägga till nya filer: jämför normaliserade filnamn

### Relaterade ändringar (gjorda tidigare)

- `src/lib/bpmn/SubprocessMatcher.ts`: Förbättrad matchning för att hantera både fulla sökvägar och bara filnamn
- `src/lib/bpmnParser.ts`: Förbättrad `loadBpmnXml()` för att hantera filer med mappstruktur

## Vad som behöver göras härnäst

1. **Testa ändringarna**: Ladda upp filer från en mapp (recursively) och kontrollera:
   - Om `MapSuggestionsDialog` visas när det finns förslag som behöver granskning
   - Om varningarna i konsolen minskar
   - Om console logs från `analyzeAndSuggestMapUpdates` visar korrekt data:
     - `totalSuggestions`
     - `newFiles`
     - `highConfidence`
     - `needsReview`

2. **Om dialogen fortfarande inte visas**:
   - Kontrollera console logs för att se om `needsReviewSuggestions.length > 0`
   - Om alla suggestions är `matched` (hög konfidens), accepteras de automatiskt och dialogen visas inte (detta är korrekt beteende)
   - Om det finns `needsReview` suggestions men dialogen inte visas, kontrollera `useFileUpload.ts` och `BpmnFileManager.tsx` för att se om callbacks är korrekt kopplade

3. **Om varningarna kvarstår**:
   - Kontrollera om de är från `SubprocessMatcher` och om de är förväntade (t.ex. om filen verkligen inte finns bland kandidaterna)
   - Om matchningen fungerar trots varningarna, kan de vara ofarliga och bara indikera att filen inte är direkt nåbar från root-processen

## Viktiga filer att känna till

- `src/lib/bpmn/bpmnMapSuggestions.ts` - Just fixad, hanterar filnamnsjämförelser
- `src/pages/BpmnFileManager/hooks/useFileUpload.ts` - Anropar `analyzeAndSuggestMapUpdates()` och visar dialogen
- `src/lib/bpmn/SubprocessMatcher.ts` - Matchar call activities till subprocesser
- `src/lib/bpmnParser.ts` - Laddar BPMN-filer från Storage, hanterar mappstruktur

## Status

✅ Filnamnsjämförelser normaliserade i `bpmnMapSuggestions.ts`
⏳ Väntar på användarens testning och feedback






