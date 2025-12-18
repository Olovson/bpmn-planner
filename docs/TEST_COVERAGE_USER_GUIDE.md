# Test Coverage Explorer - Användarguide

## Översikt

Test Coverage Explorer (`/test-coverage`) är en interaktiv sida som visualiserar E2E test-scenarion i relation till BPMN-processstrukturen. Den visar vilka subprocesser och aktiviteter som har test-information dokumenterad, och ger en överblick över test-täckningen.

## Funktioner

### 1. Tre olika vyer

#### Kondenserad vy (per subprocess)
- **Vad**: Visar endast toppnivå-subprocesser med grupperade aktiviteter
- **När att använda**: När du vill ha en översiktlig bild av test-täckningen
- **Vad visas**:
  - Hierarki-kolumner (Nivå 0, Nivå 1, etc.)
  - Aktiviteter grupperade per subprocess (Service Tasks, User Tasks kund, User Tasks handläggare, Business Rules)
  - Given/When/Then för varje subprocess
  - UI-interaktion, API-anrop, DMN-beslut

#### Hierarkisk vy (alla subprocesser)
- **Vad**: Visar alla subprocesser i hierarkisk ordning (t.ex. `application → object → object information`)
- **När att använda**: När du vill se hela processhierarkin med test-information
- **Vad visas**: Samma som kondenserad vy, men för alla subprocesser i hierarkin

#### Fullständig vy (per aktivitet)
- **Vad**: Visar varje leaf-nod (aktivitet) som en egen kolumn
- **När att använda**: När du behöver se exakt vilka aktiviteter som har test-information
- **Vad visas**:
  - En kolumn per leaf-nod (Service Task, User Task, etc.)
  - Given/When/Then grupperade per subprocess (med rowspan)
  - UI-interaktion, API-anrop, DMN-beslut per aktivitet

### 2. Scenario-filtrering

- **Alla scenarion**: Visar alla E2E-scenarion tillsammans
- **Specifikt scenario**: Filtrera för att se endast ett scenario (t.ex. `E2E_BR001`)

### 3. Export-funktioner

#### Export till HTML
- Exporterar tabellen som en interaktiv HTML-fil
- Inkluderar alla tre vyerna (kan växlas i den exporterade filen)
- Behåller alla färger och formatering
- Fungerar offline (alla data är inbäddade)

#### Export till Excel
- Exporterar tabellen som Excel-fil
- Strukturerad data som kan redigeras i Excel
- Användbart för rapportering och analys

## Hur man använder

### Steg 1: Välj vy
1. Klicka på vy-knapparna överst på sidan:
   - **Kondenserad**: För översikt
   - **Hierarkisk**: För fullständig hierarki
   - **Fullständig**: För detaljerad aktivitetsvy

### Steg 2: Filtrera scenario (valfritt)
1. Klicka på scenario-knapparna för att filtrera:
   - **Alla scenarion**: Standard, visar allt
   - **E2E_BR001**: Visar endast happy path-scenariot
   - **E2E_BR006**: Visar endast multi-instance-scenariot

### Steg 3: Navigera tabellen
- **Horisontell scrollning**: Använd scrollbaren under tabellen för att se alla kolumner
- **Vertikal scrollning**: Scrolla ner för att se alla rader
- **Sticky kolumner**: "Rad"-kolumnen är fast (sticky) så den alltid syns

### Steg 4: Läs test-information
- **Given**: Förutsättningar för testet
- **When**: Vad som händer i testet
- **Then**: Förväntat resultat
- **UI-interaktion**: Vilka sidor/element som används
- **API-anrop**: Vilka API-endpoints som anropas
- **DMN-beslut**: Vilka beslut som förväntas

### Steg 5: Exportera (valfritt)
1. Klicka på **"Exportera till HTML"** eller **"Exportera till Excel"**
2. Filen laddas ner automatiskt
3. För HTML: Öppna filen i en webbläsare och använd filtrering/vy-växling

## Tips och tricks

### 1. Använd rätt vy för rätt syfte
- **Översikt**: Använd kondenserad vy
- **Fullständig analys**: Använd hierarkisk eller fullständig vy
- **Specifik aktivitet**: Använd fullständig vy och sök efter aktiviteten

### 2. Färgkodning
- Subprocesser har färgkodning baserat på toppnivå-subprocess
- Samma färgfamilj används för alla subprocesser under samma toppnivå
- Test-information (Given/When/Then) har samma bakgrundsfärg som subprocessen

### 3. Scrollning
- Tabellen kan bli mycket bred, använd horisontell scrollning
- "Rad"-kolumnen är alltid synlig (sticky)
- Test-information celler har max-höjd och scrollbar om innehållet är långt

### 4. Export
- HTML-exporten inkluderar alla tre vyerna - växla mellan dem i den exporterade filen
- Excel-exporten är användbar för dataanalys och rapportering

## Vanliga frågor

### Varför ser jag inte test-information för vissa subprocesser?
- Subprocessen har inte dokumenterats i `subprocessSteps` i `E2eTestsOverviewPage.tsx`
- Använd valideringssystemet (`/e2e-quality-validation`) för att se vad som saknas

### Varför är vissa kolumner tomma?
- Aktiviteten/subprocessen har inte test-information dokumenterad
- Detta är normalt för aktiviteter som inte ingår i test-scenariot

### Hur uppdaterar jag test-information?
- Redigera `E2eTestsOverviewPage.tsx` och lägg till/uppdatera `subprocessSteps` och `bankProjectTestSteps`
- Se [E2E Maintenance Guide](./E2E_MAINTENANCE_GUIDE.md) för detaljer

### Kan jag söka i tabellen?
- Inte ännu, men det är planerat som framtida förbättring
- Använd webbläsarens sökfunktion (Ctrl+F / Cmd+F) för att söka efter text

## Relaterade sidor

- **Process Explorer** (`/process-explorer`): Visar BPMN-processstrukturen visuellt
- **E2E Quality Validation** (`/e2e-quality-validation`): Validerar test-scenarion mot BPMN
- **E2E Tests Overview** (`/e2e-tests-overview`): Visar alla E2E-scenarion i detalj

## Support

Om du stöter på problem eller har frågor:
1. Kontrollera [E2E Maintenance Guide](./E2E_MAINTENANCE_GUIDE.md)
2. Använd valideringssystemet för att identifiera problem
3. Kontakta utvecklingsteamet


