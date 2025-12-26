# BPMN Diff-sida Analys

## Översikt

Diff-sidan (`/bpmn-diff`) visar ändringar mellan olika versioner av BPMN-filer och möjliggör selektiv regenerering.

## Vad som visas nu

### 1. Översikt
- **Summary per fil**: Antal added/removed/modified/unresolved
- **Expandable cards**: Klicka för att se detaljer per fil
- **Badges**: Visuell indikering av ändringstyper

### 2. Detaljerad tabell
För varje diff visas:
- **Typ**: Added (grön), Removed (röd), Modified (gul) med ikoner
- **Nod**: Namn, typ, och node key
- **Status**: Löst/olöst med badges
- **Ändringar**: `diff_details` som visar "key: old → new"
- **Upptäckt**: Datum när diff upptäcktes

### 3. Särskild hantering
- **Call Activities**: Visar mappningsinformation och problem
- **Mappningsproblem**: Alert med detaljer om call activities som inte kan mappas
- **Diagnostics**: Visar diagnostik-koder och meddelanden

### 4. Funktioner
- **Välj alla olösta**: Snabbmarkering
- **Selektiv regenerering**: Välj specifika diff:er att regenerera
- **Länk till version history**: Via "Visa detaljerad diff" knapp

## Vad som fungerar bra ✅

1. **Översiktlig vy**: Bra översikt över alla ändringar
2. **Visuell feedback**: Ikoner och badges gör det lätt att se ändringstyper
3. **Call Activity-mappning**: Bra hantering av mappningsproblem
4. **Selektiv regenerering**: Användbart att kunna välja specifika diff:er
5. **Status tracking**: Tydligt vilka diff:er som är lösta/olösta

## Förbättringsmöjligheter ⚠️

### 1. Version Information
**Problem**: Ingen visning av version numbers eller version hashes
**Förslag**: 
- Visa "v{from_version_number} → v{to_version_number}" i tabellen
- Visa version hash (kortad) för spårning
- Länk till version history-sidan

### 2. Diff Details Formatting
**Problem**: `diff_details` visas bara som "key: old → new" vilket kan vara begränsat
**Förslag**:
- Bättre formatering för komplexa värden (objekt, arrays)
- Visa fler metadata-fält som ändrats
- För call activities: visa mer detaljerad mappningsinformation

### 3. Fältnamn
**Problem**: Tekniska fältnamn visas direkt (t.ex. "calledElement")
**Förslag**:
- Översätt till svenska: "calledElement" → "Anropad process"
- Använd samma formatering som i `DiffResultView.tsx` (`formatFieldName`)

### 4. Länk till Version History
**Problem**: Ingen direkt länk till version history för att se detaljerad diff
**Förslag**:
- Lägg till knapp/länk "Visa i version history" per fil
- Eller expandera diff-detaljer direkt på sidan

### 5. Flera ändringar i samma nod
**Problem**: Om många fält ändrats kan det bli rörigt
**Förslag**:
- Collapsible sektion för diff_details
- Gruppera ändringar logiskt
- Visa sammanfattning först, expandera för detaljer

### 6. Tomma diff_details
**Problem**: För added/removed noder är `diff_details` null
**Förslag**:
- Visa relevant information från `new_content` eller `old_content`
- För added: visa metadata om den nya noden
- För removed: visa vad som togs bort

## Rekommenderade förbättringar

### Prioritet 1: Hög
1. **Visa version numbers**: Lägg till kolumn eller badge med "v{from} → v{to}"
2. **Bättre fältnamn**: Använd `formatFieldName` för att översätta tekniska namn
3. **Länk till version history**: Direkt länk för att se detaljerad diff

### Prioritet 2: Medel
4. **Bättre formatering av diff_details**: Hantera objekt/arrays bättre
5. **Collapsible diff_details**: För noder med många ändringar
6. **Visa mer info för added/removed**: Använd `new_content`/`old_content`

### Prioritet 3: Låg
7. **Filtrering**: Filtrera på typ, status, fil
8. **Sortering**: Sortera på datum, typ, status
9. **Export**: Exportera diff-rapport

## Exempel på förbättrad visning

### Nuvarande:
```
Ändringar:
  calledElement: process-1 → process-2
  name: Old Name → New Name
```

### Förbättrat:
```
Ändringar:
  Anropad process: process-1 → process-2
  Namn: Old Name → New Name
  Version: v2 → v3
  [Visa i version history] [Expandera detaljer]
```

## Slutsats

Diff-sidan fungerar bra för grundläggande översikt, men kan förbättras med:
- ✅ Version information (numbers/hashes)
- ✅ Bättre formatering av fältnamn
- ✅ Länkar till version history
- ✅ Mer detaljerad information för added/removed noder

Användaren får **grundläggande information** men kan behöva gå till version history-sidan för mer detaljer.

