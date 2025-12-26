# Förklaring: Varför filer kan finnas kvar i Storage efter radering

## Problem

När du raderar filer via "Radera alla filer" i appen, raderas de från:
1. ✅ Databasen (`bpmn_files` tabellen)
2. ✅ Storage (via `delete-bpmn-file` Edge Function)

**MEN** vissa filer raderas INTE:

### 1. `bpmn-map.json`
- **Varför den finns kvar**: `bpmn-map.json` är INTE en BPMN-fil
- Den finns inte i `bpmn_files` tabellen
- "Radera alla filer" raderar bara filer som finns i `bpmn_files` tabellen
- Den skapas automatiskt om den saknas (från projektfilen `bpmn-map.json`)

### 2. Orphaned filer
- Om filer raderades från databasen men Storage-radering misslyckades
- Om filer laddades upp direkt till Storage utan att registreras i databasen
- Om filer finns i undermappar som inte hanteras av delete-funktionen

## Lösningar

### Lösning 1: Rensa allt från Storage (Starta om från scratch)

```bash
# Dry-run (visar bara vad som skulle raderas)
npm run cleanup:all-storage:dry

# Rensa allt
npm run cleanup:all-storage
```

Detta raderar:
- Alla BPMN/DMN filer i root
- `bpmn-map.json`
- Alla dokumentation, tester, reports
- `llm-debug`
- `e2e-scenarios`

### Lösning 2: Rensa bara specifika filer

```bash
# Rensa bara llm-debug
npm run cleanup:llm-debug

# Rensa legacy dokumentation
npm run cleanup:legacy-docs
```

### Lösning 3: Använd "Reset registret"

"Reset registret" raderar:
- ✅ Genererad dokumentation, tester, DoR/DoD
- ✅ llm-debug
- ✅ Testresultat
- ❌ BPMN/DMN källfiler (behålls medvetet)
- ❌ `bpmn-map.json` (raderas INTE - detta är en bugg/design-beslut)

## Varför `bpmn-map.json` inte raderas automatiskt

1. **Design-beslut**: `bpmn-map.json` anses vara konfiguration, inte data
2. **Auto-generering**: Den skapas automatiskt om den saknas
3. **Fallback**: Om Storage-filen saknas, används projektfilen som fallback

## Rekommendation

Om du vill starta helt om från scratch:

1. **Radera alla filer** i appen (raderar BPMN/DMN filer från databas + Storage)
2. **Kör cleanup-script** för att rensa resten:
   ```bash
   npm run cleanup:all-storage
   ```

Detta ger dig en helt ren Storage.

## Scripts

- `npm run cleanup:all-storage` - Rensa ALLT från Storage
- `npm run cleanup:all-storage:dry` - Dry-run (visar bara vad som skulle raderas)
- `npm run cleanup:llm-debug` - Rensa bara llm-debug mappen
- `npm run cleanup:legacy-docs` - Rensa legacy dokumentation



