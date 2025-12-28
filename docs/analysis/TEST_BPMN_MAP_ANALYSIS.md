# Analys: bpmn-map.json och Test-Systemet

## Översikt

Detta dokument analyserar hur `bpmn-map.json` fungerar i produktion vs. i testerna, och identifierar logiska problem i det nuvarande systemet.

## Hur Appen Fungerar i Produktion

### 1. bpmn-map.json Generering och Uppdatering

**När filer laddas upp:**
1. `useFileUpload.ts` → `uploadFiles()` → `uploadMutation.mutateAsync(file)`
2. Efter lyckad uppladdning: `analyzeAndSuggestMapUpdates()` anropas
3. `analyzeAndSuggestMapUpdates()`:
   - Laddar alla BPMN-filer från databasen (`bpmn_files` tabellen)
   - Laddar nuvarande `bpmn-map.json` från Storage via `loadBpmnMapFromStorageSimple()`
   - Anropar `suggestBpmnMapUpdates()` för att hitta nya matchningar
   - Automatiskt accepterar och sparar hög konfidens-matchningar via `saveBpmnMapToStorage()`

**När bpmn-map.json saknas:**
1. `loadBpmnMapFromStorage()` försöker ladda från Storage
2. Om filen saknas (400/404), anropas `generateBpmnMapFromFiles()` automatiskt
3. `generateBpmnMapFromFiles()`:
   - Läser alla BPMN-filer från `bpmn_files` tabellen
   - Parsar alla filer
   - Genererar en ny `bpmn-map.json` med automatisk matchning
   - Sparar till Storage

**När dokumentation genereras:**
1. `bpmnGenerators.ts` → `generateAllFromBpmnWithGraph()` laddar `bpmn-map.json` via `loadBpmnMapFromStorage()`
2. Använder `bpmn-map.json` för att matcha call activities till subprocess-filer
3. Dokumentation sparas under subprocess-filens version hash
4. `extractBpmnFileFromDocFileName()` används för att identifiera vilken BPMN-fil dokumentationen tillhör

### 2. Dokumentation Storage Paths

**Feature Goal dokumentation (call activities):**
- Sparas under: `docs/claude/{subprocessFileName}/{versionHash}/feature-goals/{hierarchicalKey}`
- Hierarchical key: `{parentFileName}-{elementId}.html` (t.ex. `mortgage-se-application-internal-data-gathering.html`)
- **VIKTIGT**: Dokumentationen sparas under **subprocess-filens** version hash, inte parent-filens

**Epic dokumentation (tasks):**
- Sparas under: `docs/claude/{bpmnFileName}/{versionHash}/nodes/{fileBaseName}/{elementId}.html`

### 3. Node-Matrix Dokumentation Lookup

**När node-matrix laddar:**
1. `useAllBpmnNodes.ts` → `fetchAllNodes()` itererar över alla noder
2. För call activities:
   - Använder `node.subprocessFile` för att identifiera subprocess-filen
   - Anropar `getFeatureGoalDocStoragePaths()` med:
     - `subprocessFile` (subprocess BPMN-fil)
     - `elementId` (call activity element ID)
     - `parentBpmnFile` (parent BPMN-fil där call activity är definierad)
     - `subprocessVersionHash` (subprocess-filens version hash)
   - Anropar `checkDocsAvailable()` med dessa paths
3. `checkDocsAvailable()` kontrollerar om dokumentation finns i Storage

## Hur Testerna Försöker Fungera

### 1. bpmn-map.json Mocking

**`bpmnMapTestHelper.ts`:**
- Mockar Supabase storage-anrop för `bpmn-map.json`
- Test-versionen börjar **tom** (`testMapContent = null` på rad 63)
- När appen försöker skriva till `bpmn-map.json`, sparas det i minnet (inte i Storage)
- När appen försöker läsa `bpmn-map.json`, returneras test-versionen om den finns

**Problem:**
1. Test-versionen börjar tom, men appen förväntar sig att `bpmn-map.json` ska genereras automatiskt när filer laddas upp
2. När appen försöker generera `bpmn-map.json` automatiskt, använder den `generateBpmnMapFromFiles()` som läser från databasen
3. Men i testerna kanske filerna inte finns i databasen när `bpmn-map.json` genereras, eller så genereras den innan filerna är uppladdade

### 2. Test-Flöde

**Test-flöde i `feature-goal-documentation.spec.ts`:**
1. `setupBpmnMapMocking(page)` - Mockar bpmn-map.json (börjar tom)
2. `stepLogin(ctx)` - Loggar in
3. `stepUploadBpmnFile(ctx, subprocessFileName, ...)` - Laddar upp subprocess-fil
4. `stepUploadBpmnFile(ctx, parentFileName, ...)` - Laddar upp parent-fil
5. Klickar på "Bygg hierarki" - Bygger hierarki
6. `stepSelectFile(ctx, parentFileName)` - Väljer parent-fil
7. `stepStartGeneration(ctx)` - Startar generering
8. `stepWaitForGenerationComplete(ctx, ...)` - Väntar på generering
9. Navigerar till node-matrix och kontrollerar att dokumentation finns

**Problem:**
1. När filer laddas upp, anropas `analyzeAndSuggestMapUpdates()` som försöker ladda `bpmn-map.json` från Storage
2. Men `bpmn-map.json` är mockad och börjar tom
3. Appen försöker generera `bpmn-map.json` automatiskt, men detta kan misslyckas om filerna inte finns i databasen ännu
4. När dokumentation genereras, använder appen `bpmn-map.json` för att matcha call activities, men om `bpmn-map.json` är tom eller saknas, kan matchningen misslyckas

## Identifierade Logiska Problem

### Problem 1: Race Condition i bpmn-map.json Generering

**Beskrivning:**
- Test-versionen av `bpmn-map.json` börjar tom
- När filer laddas upp, anropas `analyzeAndSuggestMapUpdates()` som försöker ladda `bpmn-map.json`
- Om `bpmn-map.json` saknas, försöker appen generera den automatiskt via `generateBpmnMapFromFiles()`
- Men `generateBpmnMapFromFiles()` läser från databasen, och filerna kanske inte finns där ännu när genereringen sker

**Konsekvens:**
- `bpmn-map.json` kan genereras innan filerna är uppladdade, vilket leder till en tom eller ofullständig map
- Matchningar mellan call activities och subprocess-filer kan misslyckas

### Problem 2: bpmn-map.json Mocking Hanterar Inte Automatisk Generering

**Beskrivning:**
- `bpmnMapTestHelper.ts` mockar bara storage-anrop för `bpmn-map.json`
- Men när appen försöker generera `bpmn-map.json` automatiskt, använder den `generateBpmnMapFromFiles()` som:
  - Läser från databasen (inte mockad)
  - Parsar BPMN-filer från Storage (inte mockad)
  - Skapar en ny map och försöker spara den
- Mockingen fångar upp sparningen, men genereringen kan misslyckas om filerna inte finns i databasen

**Konsekvens:**
- `bpmn-map.json` kan vara tom eller ofullständig i testerna
- Matchningar kan misslyckas, vilket leder till att dokumentation inte hittas

### Problem 3: Dokumentation Sparas Under Fel Version Hash

**Beskrivning:**
- När dokumentation genereras, använder appen `extractBpmnFileFromDocFileName()` för att identifiera vilken BPMN-fil dokumentationen tillhör
- För Feature Goal dokumentation (call activities), ska dokumentationen sparas under **subprocess-filens** version hash
- Men `extractBpmnFileFromDocFileName()` kan ha problem med att identifiera subprocess-filen korrekt, särskilt för test-filer med dynamiska timestamps

**Konsekvens:**
- Dokumentation kan sparas under fel version hash
- Node-matrix kan inte hitta dokumentationen eftersom den letar under fel path

### Problem 4: bpmn-map.json Uppdateras Inte Automatiskt i Tester

**Beskrivning:**
- I produktion uppdateras `bpmn-map.json` automatiskt när filer laddas upp via `analyzeAndSuggestMapUpdates()`
- Men i testerna är `bpmn-map.json` mockad och börjar tom
- När filer laddas upp, försöker appen uppdatera `bpmn-map.json`, men detta kan misslyckas om:
  - Filerna inte finns i databasen ännu
  - `bpmn-map.json` är tom och genereringen misslyckas

**Konsekvens:**
- `bpmn-map.json` kan vara tom eller ofullständig i testerna
- Matchningar kan misslyckas, vilket leder till att dokumentation inte hittas

## Rekommendationer

### Rekommendation 1: Förbättra bpmn-map.json Mocking

**Lösning:**
- När filer laddas upp i testerna, simulera automatisk uppdatering av `bpmn-map.json`
- När appen försöker generera `bpmn-map.json` automatiskt, låt mockingen generera en test-version baserat på uppladdade filer
- Spara test-versionen i minnet så att appen kan använda den

**Implementation:**
- Lägg till logik i `bpmnMapTestHelper.ts` för att generera `bpmn-map.json` baserat på uppladdade filer
- När en fil laddas upp, uppdatera test-versionen av `bpmn-map.json` med matchningar

### Rekommendation 2: Förbättra extractBpmnFileFromDocFileName

**Lösning:**
- Förbättra `extractBpmnFileFromDocFileName()` för att korrekt identifiera subprocess-filen från Feature Goal dokumentationsfilnamn
- Särskilt för test-filer med dynamiska timestamps, se till att matchningen fungerar korrekt

**Implementation:**
- Förbättra matching-logiken i `extractBpmnFileFromDocFileName()` för att hantera test-filer
- Lägg till fallback-logik för att hitta subprocess-filen om direkt matchning misslyckas

### Rekommendation 3: Vänta på bpmn-map.json Uppdatering

**Lösning:**
- I testerna, vänta på att `bpmn-map.json` uppdateras efter filuppladdning innan generering startar
- Detta säkerställer att matchningar finns när dokumentation genereras

**Implementation:**
- Lägg till en väntefunktion i testerna som väntar på att `bpmn-map.json` uppdateras
- Eller, förbättra mockingen så att den automatiskt uppdaterar `bpmn-map.json` när filer laddas upp

### Rekommendation 4: Debugging och Logging

**Lösning:**
- Lägg till mer debugging och logging i testerna för att se vad som händer med `bpmn-map.json`
- Logga när `bpmn-map.json` laddas, genereras, uppdateras och används

**Implementation:**
- Lägg till console.log i `bpmnMapTestHelper.ts` för att logga alla operationer
- Lägg till logging i testerna för att se när `bpmn-map.json` används

## Sammanfattning

Huvudproblemet är att `bpmn-map.json` mockning i testerna inte hanterar automatisk generering och uppdatering korrekt. När filer laddas upp i testerna, försöker appen automatiskt generera och uppdatera `bpmn-map.json`, men detta kan misslyckas eftersom:

1. Test-versionen börjar tom
2. Genereringen kan misslyckas om filerna inte finns i databasen ännu
3. Uppdateringen kan misslyckas om `bpmn-map.json` är tom

Detta leder till att matchningar mellan call activities och subprocess-filer kan misslyckas, vilket i sin tur leder till att dokumentation inte hittas i node-matrix.

Lösningen är att förbättra `bpmn-map.json` mockingen så att den automatiskt genererar och uppdaterar test-versionen baserat på uppladdade filer, och att säkerställa att matchningar fungerar korrekt även för test-filer med dynamiska timestamps.




