# Guide: Lokal Diff-analys

**Datum:** 2025-12-22  
**Syfte:** Förklara hur man använder "Analysera Lokal Mapp"-funktionen för att analysera diff för lokala BPMN-filer utan att ladda upp dem.

---

## Översikt

"Analysera Lokal Mapp" är en read-only funktion som låter dig:
- Analysera lokala BPMN-filer rekursivt från en mapp
- Se diff-resultat mot befintliga filer i systemet
- Förhandsgranska ändringar innan uppladdning
- **Säkerhet:** Inga filer laddas upp eller modifieras automatiskt

---

## Hur man använder

### Steg 1: Öppna funktionen

1. Gå till "Analysera Lokal Mapp" via vänster menyn
2. Eller navigera till `/bpmn-folder-diff`

### Steg 2: Välj mapp

1. Klicka på "Välj Mapp"
2. Välj en mapp som innehåller BPMN-filer
3. Systemet hittar automatiskt alla `.bpmn` filer rekursivt

**Krav:**
- File System Access API måste vara tillgängligt (Chrome, Edge, Safari 15.2+)
- I Brave: Inaktivera Shields för localhost eller använd Chrome/Edge

### Steg 3: Granska resultat

Systemet visar:
- **Totalt antal filer** hittade
- **Filer med ändringar:**
  - Tillagda noder (nya noder)
  - Borttagna noder (tagna bort)
  - Ändrade noder (med detaljerad information om vad som ändrats)
- **Filer utan ändringar** (listas separat)

### Steg 4: Förstå diff-resultat

#### Nya filer
- Markeras med "✨ Ny process-fil"
- Visar process-namn, antal call activities och tasks
- Alla noder i filen markeras som "tillagda"

#### Ändrade noder
- Visar exakt vad som ändrats:
  - **Namn:** Gammalt namn → Nytt namn
  - **Mapping:** (tomt) → Filnamn (för call activities)
  - **Antal tasks/call activities:** Gammalt antal → Nytt antal (för process nodes)

#### Tillagda noder
- Visar nodnamn, typ och relevant metadata
- För call activities: visar vilken process som anropas

#### Borttagna noder
- Visar nodnamn, typ och metadata om vad som förlorats

---

## Exempel

### Scenario: Uppdaterad fil

```
mortgage-se-application.bpmn
5 ändrade

Ändrade (5)
Internal data gathering
  callActivity
  mapping: (tomt) → mortgage-se-internal-data-gathering.bpmn

Object
  callActivity
  mapping: (tomt) → mortgage-se-object.bpmn

Household
  callActivity
  mapping: (tomt) → mortgage-se-household.bpmn

Stakeholder
  callActivity
  mapping: (tomt) → mortgage-se-stakeholder.bpmn

mortgage-se-application
  process
  name: Application Mortgage → mortgage-se-application
```

**Tolkning:**
- 5 noder har ändrats i filen
- 4 call activities har fått mapping-information (från tomt till specifik fil)
- Process-noden har fått ett nytt namn

### Scenario: Ny fil

```
mortgage-se-documentation-handling.bpmn
Ny fil

✨ Ny process-fil
mortgage-se-documentation-handling
Call activities: 0
Tasks: 5
Totalt 6 noder i den nya processen
```

**Tolkning:**
- Hela filen är ny
- Innehåller 5 tasks och 1 process-nod
- Alla noder kommer att markeras som "tillagda" vid uppladdning

---

## Nästa steg

### Efter analys

1. **Granska resultatet** - Se vilka filer som har ändringar
2. **Ladda upp filer** - Gå till "Filer"-sidan och ladda upp de filer du vill uppdatera
3. **Regenerera dokumentation** - Systemet kommer automatiskt att:
   - Spara diffs i databasen
   - Regenerera endast ändrade/tillagda noder
   - Behålla dokumentation för oförändrade noder

### Säkerhet

- **Read-only:** Lokal analys modifierar inga filer
- **Ingen uppladdning:** Filerna laddas inte upp automatiskt
- **Explicit val:** Du måste explicit ladda upp filer via "Filer"-sidan

---

## Tekniska detaljer

### Fil System Access API

Funktionen använder File System Access API för att:
- Läsa lokala filer direkt från disken
- Rekursivt söka efter `.bpmn` filer
- Behålla filhandles för framtida användning

**Stöd:**
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Safari 15.2+
- ⚠️ Brave: Kräver att Shields är inaktiverat för localhost

### Diff-beräkning

Systemet:
1. Parsar lokala BPMN-filer
2. Hämtar befintlig metadata från Supabase
3. Jämför lokala filer mot befintliga versioner
4. Beräknar diff (added/removed/modified/unchanged)

**Viktigt:** Diff-beräkningen är read-only och skriver inget till databasen.

---

## Felsökning

### "Funktionen stöds inte"

**Orsak:** File System Access API är inte tillgängligt

**Lösning:**
- Använd Chrome, Edge eller Safari 15.2+
- I Brave: Inaktivera Shields för localhost
- Eller använd en annan webbläsare

### "Alla filer visas som tillagda"

**Orsak:** Filer finns inte i systemet eller metadata saknas

**Lösning:**
- Detta är korrekt beteende för nya filer
- Om filer redan finns, kontrollera att de är korrekt uppladdade i systemet

### "Inga BPMN-filer hittades"

**Orsak:** Mappen innehåller inga `.bpmn` filer

**Lösning:**
- Kontrollera att mappen innehåller `.bpmn` filer
- Systemet söker rekursivt, så filer kan ligga i undermappar

---

## Testning

För att testa lokal diff-analys med samma funktionalitet som appen (utan att öppna appen):

```bash
npm test -- tests/integration/local-folder-diff.test.ts
```

Detta test:
- Hittar alla BPMN-filer rekursivt i en mapp
- Beräknar diff mot befintliga filer i Supabase
- Använder samma funktioner som appen
- Validerar att diff-analys fungerar korrekt

**Test-mapp (kan ändras i testfilen):**
- `/Users/magnusolovson/Documents/Projects/mortgage-template-main/modules/mortgage-se`

Se [`tests/integration/local-folder-diff.test.ts`](../../../tests/integration/local-folder-diff.test.ts) för detaljer.

---

## Relaterad dokumentation

- [Diff-funktionalitet - Förklaring](../analysis/DIFF_FUNCTIONALITY_EXPLANATION.md)
- [Diff-funktionalitet - Analys](../analysis/DIFF_FUNCTIONALITY_ANALYSIS.md)
- [Funktionalitet & Arkitektur](../../architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md)
- [Testing Guide](../../testing/TESTING.md)

