# Archive BPMN Files Script

Script för att arkivera alla BPMN-filer från en källmapp till en ny tidsstämplad mapp.

## Användning

### Med npm script:
```bash
npm run archive:bpmn <sökväg-till-källmapp>
```

### Direkt med tsx:
```bash
npx tsx scripts/archive-bpmn-files.ts <sökväg-till-källmapp>
```

## Exempel

```bash
# Arkivera alla BPMN-filer från tests/fixtures/bpmn
npm run archive:bpmn tests/fixtures/bpmn

# Eller med absolut sökväg
npx tsx scripts/archive-bpmn-files.ts /path/to/source/directory
```

## Vad scriptet gör

1. **Söker rekursivt** efter alla `.bpmn`-filer i källmappen och alla undermappar
2. **Skapar en ny mapp** med formatet: `mortgage-se YYYY.MM.DD HH:MM` (t.ex. `mortgage-se 2025.12.08 14:30`)
3. **Kopierar alla filer** till den nya mappen (platt struktur, ingen undermappstruktur)
4. **Hanterar namnkonflikter** genom att lägga till nummer (t.ex. `file.bpmn`, `file_1.bpmn`, `file_2.bpmn`)
5. **Visar bekräftelse** med:
   - Antal BPMN-filer som hittades
   - Antal filer som kopierades
   - Sökvägen till den nya mappen
   - Lista över namnkonflikter (om några)

## Exempel på output

```
================================================================================
BPMN FILARKIVERING
================================================================================

Söker efter BPMN-filer i: /path/to/tests/fixtures/bpmn...
Hittade 21 BPMN-fil(er)
Skapade mapp: /path/to/tests/fixtures/mortgage-se 2025.12.08 14:30

================================================================================
✅ ARKIVERING KLAR
================================================================================

📁 Antal BPMN-filer hittade: 21
📋 Antal filer kopierade: 21
📂 Destinationsmapp: /path/to/tests/fixtures/mortgage-se 2025.12.08 14:30

================================================================================
```

## Felhantering

Scriptet hanterar följande fel:
- Om källmappen inte finns
- Om sökvägen inte är en mapp
- Om inga BPMN-filer hittas
- Om destinationsmappen redan finns

## Noteringar

- Den nya mappen skapas på **samma nivå** som källmappen (i källmappens föräldramapp)
- Alla filer kopieras till **platt struktur** (inga undermappar)
- **Namnkonflikter** hanteras automatiskt med nummer
- Scriptet **kopierar** filer, tar inte bort originalfiler

