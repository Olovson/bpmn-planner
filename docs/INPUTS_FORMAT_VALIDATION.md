# Inputs Format Validation

Detta dokument beskriver valideringen av `inputs`-fältet i Epic-filer.

## Problem

Epic-filer måste ha `inputs`-fältet i ett specifikt format enligt prompten. Om formatet inte följs kan dokumentationen bli inkonsekvent och svår att använda.

## Lösning

Vi har implementerat:

1. **Tydliga instruktioner i batch-scriptet** - Codex får exakta exempel på rätt format
2. **Valideringsscript** - Automatisk kontroll av formatet
3. **Automatisk uppdatering** - Codex instrueras att uppdatera inputs-formatet även om det inte är 'TODO'

## Format

För Epic-filer måste `inputs`-fältet följa detta format:

```typescript
inputs: [
  "Fält: ansökningsdata; Datakälla: kundgränssnitt; Typ: JSON-struktur; Obligatoriskt: Ja; Validering: schema-validering; Felhantering: visa felmeddelande och kräv korrigering",
  "Fält: status; Datakälla: föregående processsteg; Typ: enum; Obligatoriskt: Ja; Validering: kontrollera att status är giltig; Felhantering: flagga för manuell granskning",
  "Fält: parametrar; Datakälla: systemkonfiguration; Typ: objekt; Obligatoriskt: Nej; Validering: kontrollera att värden är inom tillåtna intervall; Felhantering: använd standardvärden vid saknade data"
]
```

Varje input måste innehålla alla dessa delar:
- `Fält:` - Namnet på fältet
- `Datakälla:` - Varifrån data kommer
- `Typ:` - Datatypen
- `Obligatoriskt:` - Ja eller Nej
- `Validering:` - Hur data valideras
- `Felhantering:` - Vad som händer vid fel

## Validering

### Validera en specifik fil

```bash
npm run validate:inputs-format src/data/node-docs/epic/filnamn.doc.ts
```

### Validera alla Epic-filer

```bash
npm run validate:inputs-format
```

### Exempel på output

**Korrekt format:**
```
✅ Format korrekt (3 inputs validerade)
```

**Fel format:**
```
❌ Format fel:

   Input 1: Saknar nödvändiga fält. Format: "Fält: ...; Datakälla: ...; Typ: ...; Obligatoriskt: ...; Validering: ...; Felhantering: ..."
     Nuvarande: "Strukturerad ansökningsdata som beskriver kund..."
```

## Automatisk uppdatering

När Codex kör batch-generering:

1. **Kontrollerar inputs-formatet** för alla Epic-filer
2. **Uppdaterar automatiskt** om formatet är fel, även om fältet inte var 'TODO'
3. **Följer exakta instruktioner** från `.codex-batch-all.md`

## Integration i CI/CD

Du kan lägga till valideringen i din CI/CD-pipeline:

```yaml
# Exempel för GitHub Actions
- name: Validate inputs format
  run: npm run validate:inputs-format
```

## Felsökning

### Problem: "Saknar nödvändiga fält"

**Lösning:** Uppdatera inputs-fältet till rätt format. Se exempel ovan.

### Problem: "Inga inputs hittades"

**Lösning:** Detta är OK om filen inte har några inputs eller om arrayen är tom.

### Problem: Validering misslyckas i batch

**Lösning:** 
1. Kör `npm run validate:inputs-format` för att se vilka filer som har fel
2. Kör batch-generering igen - Codex kommer att uppdatera formatet automatiskt
3. Kör validering igen för att bekräfta

## Framtida förbättringar

- Automatisk formatering av inputs-fältet (prettier-liknande)
- Integration med pre-commit hooks
- Validering av andra fält som kan ha format-krav

