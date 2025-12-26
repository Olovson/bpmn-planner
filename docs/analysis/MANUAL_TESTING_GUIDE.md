# Guide: Manuell testning av filval och generering

## Syfte

Denna guide hjälper dig att testa samma scenario som E2E-testet försöker köra, för att se om sidan kraschar när en fil väljs eller när generering startar.

## Förberedelser

1. **Starta appen lokalt:**
   ```bash
   npm run dev
   ```

2. **Logga in:**
   - Gå till `http://localhost:8080`
   - Logga in med test-användare (t.ex. `test-bot@local.test`)

3. **Öppna Developer Tools:**
   - Tryck `F12` eller `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Gå till fliken **Console** för att se JavaScript-fel
   - Gå till fliken **Network** för att se HTTP-anrop

## Testscenario 1: Filval utan generering

### Steg 1: Navigera till filhantering
- Klicka på **"Filer"** i navigationsmenyn
- Vänta på att filtabellen laddas

### Steg 2: Välj en fil
- Klicka på en fil i tabellen (t.ex. `mortgage-se-object.bpmn`)
- **Observera:**
  - Kraschar sidan?
  - Får du några JavaScript-fel i Console?
  - Uppdateras UI:t korrekt?
  - Öppnas någon dialog?

### Steg 3: Kontrollera Console
- Kolla Console för felmeddelanden
- Leta efter:
  - `Uncaught Error`
  - `TypeError`
  - `ReferenceError`
  - `Page crashed`

## Testscenario 2: Filuppladdning + Filval

### Steg 1: Ladda upp en testfil
- Klicka på **"Välj filer"** eller dra och släpp en BPMN-fil
- Vänta på att filen laddas upp
- **Observera:**
  - Öppnas `MapSuggestionsDialog`?
  - Stängs dialogen korrekt?

### Steg 2: Välj den uppladdade filen
- Klicka på den nyligen uppladdade filen i tabellen
- **Observera:**
  - Kraschar sidan?
  - Får du några JavaScript-fel?
  - Uppdateras UI:t korrekt?

### Steg 3: Kontrollera Console
- Kolla Console för felmeddelanden
- Leta efter fel relaterade till:
  - `bpmn-map.json`
  - `analyzeAndSuggestMapUpdates`
  - `loadBpmnMapFromStorageSimple`

## Testscenario 3: Filval + Generering

### Steg 1: Välj en fil
- Klicka på en fil i tabellen

### Steg 2: Starta generering
- Klicka på **"Generera artefakter"** eller **"Generera information för vald fil"**
- **Observera:**
  - Öppnas `GenerationDialog`?
  - Kraschar sidan när dialogen öppnas?
  - Startar genereringen?

### Steg 3: Vänta på generering
- Vänta medan genereringen pågår
- **Observera:**
  - Kraschar sidan under genereringen?
  - Får du några JavaScript-fel?
  - Uppdateras progress-korrek?

### Steg 4: Kontrollera Console
- Kolla Console för felmeddelanden
- Leta efter fel relaterade till:
  - `useFileGeneration`
  - `handleGenerateArtifacts`
  - `Claude API`
  - `bpmnMapAutoGenerator`

## Testscenario 4: Flera filer + Hierarki + Generering

### Steg 1: Ladda upp två filer
- Ladda upp `mortgage-se-object.bpmn` (parent)
- Ladda upp `mortgage-se-object-information.bpmn` (subprocess)
- Stäng `MapSuggestionsDialog` om den öppnas

### Steg 2: Bygg hierarki
- Klicka på **"Bygg hierarki"** knappen
- Vänta på att hierarkin byggs

### Steg 3: Välj parent-fil
- Klicka på `mortgage-se-object.bpmn` i tabellen
- **Observera:**
  - Kraschar sidan?
  - Får du några JavaScript-fel?

### Steg 4: Starta generering
- Klicka på **"Generera artefakter"**
- **Observera:**
  - Öppnas `GenerationDialog`?
  - Kraschar sidan?
  - Startar genereringen?

## Vad ska jag leta efter?

### JavaScript-fel i Console
- **Uncaught Error:** Ohanterat fel som kan krascha sidan
- **TypeError:** Försök att använda något som inte är definierat
- **ReferenceError:** Referens till något som inte finns
- **Promise rejection:** Ohanterat promise-fel

### Network-fel
- **404:** Fil eller endpoint saknas
- **400:** Felaktig request
- **500:** Serverfel
- **CORS:** Cross-origin problem

### UI-problem
- **Sidan laddas om:** Navigation eller redirect
- **Sidan blir vit:** React error boundary triggas
- **Dialog öppnas/stängs:** Oväntat beteende
- **Tabellen försvinner:** Query invalidation problem

## Debugging-tips

### 1. Aktivera verbose logging
I Console, kör:
```javascript
localStorage.setItem('debug', 'true');
// Ladda om sidan
```

### 2. Kolla React DevTools
- Installera React DevTools extension
- Kolla komponentens state när filen väljs
- Se om någon komponent kraschar

### 3. Kolla Network-anrop
- Filtrera på `bpmn-map.json` för att se storage-anrop
- Filtrera på `anthropic.com` för att se Claude API-anrop
- Kolla om några anrop misslyckas

### 4. Kolla Storage
- Öppna Application/Storage tab
- Kolla `localStorage` för session data
- Kolla `sessionStorage` för temporär data

## Vanliga problem och lösningar

### Problem: Sidan kraschar när fil väljs
**Möjliga orsaker:**
- `onSelectFile` hanteraren kraschar
- Query invalidation orsakar problem
- `bpmn-map.json` läsning misslyckas

**Lösning:**
- Kolla Console för specifikt fel
- Kolla om `bpmn-map.json` finns i Storage
- Kolla om queries invalideras korrekt

### Problem: Sidan kraschar när generering startar
**Möjliga orsaker:**
- `useFileGeneration` hook kraschar
- Claude API mockning misslyckas
- `GenerationDialog` komponent kraschar

**Lösning:**
- Kolla Console för specifikt fel
- Verifiera att Claude API mockning fungerar
- Kolla om `GenerationDialog` renderas korrekt

### Problem: `MapSuggestionsDialog` öppnas och stänger sidan
**Möjliga orsaker:**
- `analyzeAndSuggestMapUpdates` kraschar
- `bpmnMapAutoGenerator` kraschar
- JSON-parsing misslyckas

**Lösning:**
- Kolla Console för specifikt fel
- Verifiera att `bpmn-map.json` är giltig JSON
- Kolla om `bpmnMapAutoGenerator` körs korrekt

## Rapportera problem

Om du hittar ett problem, samla in:
1. **Console-fel:** Kopiera alla felmeddelanden
2. **Network-anrop:** Screenshot av misslyckade anrop
3. **Steg för att reproducera:** Exakt vad du gjorde
4. **Förväntat beteende:** Vad borde hända?
5. **Faktiskt beteende:** Vad hände istället?

## Ytterligare resurser

- **E2E-test:** `tests/playwright-e2e/feature-goal-documentation.spec.ts`
- **Analys:** `docs/analysis/TEST_PAGE_CLOSED_ANALYSIS_SUMMARY.md`
- **Test helper:** `tests/playwright-e2e/utils/bpmnMapTestHelper.ts`


