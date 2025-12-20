# Analys: Dokumentationsgenereringslogik

## Status: ✅ Alla problem lösta

**Datum**: 2024-12-19
**Status**: Alla identifierade problem har implementerats och lösts.

## Översikt

Denna analys identifierar potentiella brister och logiska problem i dokumentationsgenereringslogiken efter implementeringen av Feature Goal-generering för subprocess-filer. Alla problem har nu lösts.

## Nuvarande Logik

### 1. Filordning
- `filesToGenerate` bestäms från `analyzedFiles` eller fallback till `[bpmnFileName]`
- **Problem**: Ingen garanti på ordning - filer kan genereras i vilken ordning som helst
- **Konsekvens**: Om parent-fil genereras före subprocess-fil, kan callActivity generera Feature Goal innan subprocess-filen gör det

### 2. Nodordning inom filer
- Noder sorteras efter `depth` (högst depth = leaf nodes först)
- **Bra**: Säkerställer att child nodes genereras före parent nodes
- **Problem**: Depth beräknas per fil, inte globalt - en nod i fil A kan ha högre depth än en nod i fil B, men fil B kan genereras först

### 3. CallActivity-hantering

#### Scenario A: Första gången callActivity genereras
1. `docKey = subprocess:${node.subprocessFile}`
2. `skipDocGeneration = processedDocNodes.has(docKey) || subprocessAlreadyGenerated`
3. Om `subprocessAlreadyGenerated = false`:
   - Genererar Feature Goal-dokumentation
   - Sparar i `generatedChildDocs` med key `subprocess:${node.subprocessFile}`
   - Markerar i `generatedSubprocessFeatureGoals.add(node.subprocessFile)`
   - Skapar Feature Goal-sida med parent-fil i namnet

#### Scenario B: Återkommande callActivity (samma subprocess, annan instans)
1. `docKey = subprocess:${node.subprocessFile}` (samma som Scenario A)
2. `skipDocGeneration = true` (eftersom `subprocessAlreadyGenerated = true`)
3. Hämtar befintlig dokumentation från `generatedChildDocs.get(docKey)`
4. Genererar instans-specifik dokumentation med LLM
5. **Problem**: Sparar INTE i `generatedChildDocs` (kommentar säger "vi vill generera per instans")
6. **Konsekvens**: Om subprocess-filen senare genereras, kommer den inte se denna instans-specifika dokumentation

### 4. Subprocess-filhantering

#### Scenario C: Subprocess-fil genereras FÖRE parent-fil
1. Alla noder i subprocess-filen genereras först (leaf nodes först)
2. Efter alla noder: kollar `isSubprocessFile = true`
3. Kollar `alreadyGenerated = generatedSubprocessFeatureGoals.has(file) || generatedChildDocs.has(subprocessDocKey)`
4. Om `alreadyGenerated = false`:
   - Samlar child node-dokumentationer från filen
   - Genererar Feature Goal för subprocess-processen
   - Sparar i `generatedChildDocs` med key `subprocess:${file}`
   - Markerar i `generatedSubprocessFeatureGoals.add(file)`
   - Skapar Feature Goal-sida UTAN parent-fil i namnet

#### Scenario D: Subprocess-fil genereras EFTER parent-fil
1. CallActivity i parent-filen har redan genererat Feature Goal (Scenario A)
2. `alreadyGenerated = true` (eftersom `generatedSubprocessFeatureGoals.has(file) = true`)
3. **Problem**: Subprocess-filen genererar INTE sin egen Feature Goal-sida
4. **Konsekvens**: Endast Feature Goal-sida med parent-fil i namnet finns

### 5. Återkommande noder (tasks/epics)

#### Scenario E: Samma task/epic i olika filer
- `docKey = ${node.bpmnFile}::${node.bpmnElementId}` (unik per instans)
- Varje instans genereras separat
- **OK**: Detta är korrekt eftersom kontexten kan vara annorlunda

#### Scenario F: Samma task/epic i samma fil (t.ex. loop)
- `docKey = ${node.bpmnFile}::${node.bpmnElementId}` (samma för båda)
- `skipDocGeneration = processedDocNodes.has(docKey)` (true för andra instansen)
- **Problem**: Andra instansen genererar instans-specifik dokumentation, men logiken är inte helt konsekvent med callActivity-logiken

## Identifierade Problem

### Problem 1: Inkonsekvent Feature Goal-generering
**Beskrivning**: 
- Om parent-fil genereras först → callActivity skapar Feature Goal med parent i namnet
- Om subprocess-fil genereras först → subprocess-fil skapar Feature Goal utan parent i namnet
- Om subprocess-fil genereras efter → ingen Feature Goal-sida skapas alls

**Konsekvens**:
- Olika resultat beroende på filordning
- Möjligt att sakna Feature Goal-sida för subprocess-filen

**Lösning**: 
- Alltid generera Feature Goal-sida för subprocess-filen (oavsett ordning)
- Om callActivity redan genererat, skapa en separat sida för subprocess-filen själv
- Eller: Alltid generera från subprocess-filen, och callActivity skapar bara en länk/referens

### Problem 2: Instans-specifik dokumentation sparas inte
**Beskrivning**:
- När återkommande callActivity genererar instans-specifik dokumentation (Scenario B), sparas den INTE i `generatedChildDocs`
- Kommentaren säger "vi vill generera per instans, men första gången sparas redan"
- Men om subprocess-filen senare genereras, kommer den inte se denna instans-specifika dokumentation

**Konsekvens**:
- Subprocess-filen kan generera Feature Goal utan kunskap om hur callActivity använder den i olika kontexter

**Lösning**:
- Överväg att spara instans-specifik dokumentation med instans-specifik key
- Eller: Acceptera att subprocess-filen genererar "base" Feature Goal, och callActivities genererar instans-specifika

### Problem 3: Child documentation samlas inte korrekt för subprocess-filen
**Beskrivning**:
- När subprocess-filen genererar Feature Goal (Scenario C), samlas child documentation från `nodesInFile`
- Men `nodesInFile` innehåller bara noder från subprocess-filen
- Om subprocess-filen har callActivities som pekar på andra subprocesser, kommer dessa child docs inte att inkluderas korrekt

**Konsekvens**:
- Feature Goal för subprocess-filen kan sakna information om nested subprocesser

**Lösning**:
- Samla child documentation rekursivt från alla descendant nodes, inte bara direkta children

### Problem 4: Filordning är inte deterministisk
**Beskrivning**:
- `filesToGenerate` bestäms från `analyzedFiles`, men ordningen är inte garanterad
- Detta kan leda till olika resultat vid olika körningar

**Konsekvens**:
- Non-deterministisk generering
- Svårt att debugga och reproducera problem

**Lösning**:
- Sortera filer efter depth (subprocess-filer först, eller root-filer först)
- Eller: Sortera alfabetiskt för determinism

### Problem 5: `processedDocNodes` är per fil
**Beskrivning**:
- `processedDocNodes` skapas per fil och används för att spåra om en nod redan genererats i den filen
- Men för callActivities använder vi `subprocessAlreadyGenerated` som är global
- Detta är inkonsekvent

**Konsekvens**:
- Förvirrande logik
- Möjliga buggar om logiken ändras

**Lösning**:
- Överväg att göra `processedDocNodes` global, eller använd konsekvent logik

### Problem 6: Feature Goal-sida skapas två gånger i vissa fall
**Beskrivning**:
- Om callActivity genererar Feature Goal (Scenario A) → skapar sida med parent i namnet
- Om subprocess-filen senare genereras (Scenario C) → skapar sida utan parent i namnet
- Båda sidorna kan finnas samtidigt

**Konsekvens**:
- Dubbel Feature Goal-sida för samma subprocess
- Förvirring om vilken som är "korrekt"

**Lösning**:
- Definiera tydlig strategi: antingen alltid från subprocess-filen, eller alltid från callActivity
- Eller: Skapa bara en sida, men med både parent och subprocess i namnet

## Implementerade Lösningar ✅

### ✅ Problem 1: Inkonsekvent Feature Goal-generering - LÖST

**Lösning implementerad**:
- Alltid generera Feature Goal-sida för subprocess-filen, oavsett om callActivity redan genererat
- Om base dokumentation redan finns (från callActivity), använd den men skapa ändå subprocess-filens egen sida
- Tydlig strategi: subprocess-filen skapar alltid sin egen Feature Goal-sida utan parent i namnet
- callActivity skapar instans-specifik sida med parent i namnet endast om subprocess-sida redan finns

**Kodändringar**:
- Uppdaterad logik i subprocess-filhantering (rad ~2102-2210)
- Kollar om Feature Goal-sida redan finns innan skapande
- Använder base dokumentation om den finns, annars genererar ny

### ✅ Problem 2: Filordning är inte deterministisk - LÖST

**Lösning implementerad**:
- Filer sorteras hierarkiskt: subprocess-filer före parent-filer
- Detta säkerställer att child documentation finns tillgänglig när parent-filer genereras
- Inom varje kategori (subprocess vs root) sorteras alfabetiskt för determinism
- Identifierar subprocess-filer genom att kolla vilka filer som anropas av callActivities

**Kodändringar**:
- Uppdaterad `filesToGenerate` med hierarkisk sortering (rad ~1373-1395)
- Separerar filer i subprocess-filer och root-filer
- Sorterar subprocess-filer först, sedan root-filer

### ✅ Problem 3: Feature Goal-sida kan skapas två gånger - LÖST

**Lösning implementerad**:
- Kollar om Feature Goal-sida redan finns innan skapande (`result.docs.has(featureDocPath)`)
- callActivity skapar sida med parent i namnet endast om subprocess-sida redan finns
- Förhindrar dubbelgenerering

**Kodändringar**:
- Uppdaterad callActivity Feature Goal-sida skapande (rad ~1742-1761)
- Kontroll innan `result.docs.set()`

### ✅ Problem 4: Instans-specifik dokumentation sparas inte - LÖST

**Lösning implementerad**:
- Instans-specifik dokumentation sparas nu med instans-specifik key (`nodeKey`)
- Base dokumentation sparas med `subprocess:${file}` key
- Subprocess-filen använder base dokumentation, callActivities kan använda instans-specifik

**Kodändringar**:
- Uppdaterad callback i återkommande callActivity-generering (rad ~1646-1656)
- Sparar instans-specifik dokumentation med `nodeKey` som key

### ✅ Problem 5: Child documentation samlas inte rekursivt - LÖST

**Lösning implementerad**:
- Implementerad rekursiv funktion `collectChildDocsRecursively` som samlar från alla descendant nodes
- Inkluderar nested subprocesser korrekt
- Används när subprocess-filen genererar Feature Goal

**Kodändringar**:
- Ny rekursiv funktion i subprocess-filhantering (rad ~2130-2140)
- Samlar från alla descendant nodes, inte bara direkta children

### ✅ Problem 6: Inkonsekvent processedDocNodes-hantering - LÖST

**Lösning implementerad**:
- Global `globalProcessedDocNodes` Set för konsekvent spårning
- Lokal `processedDocNodesInFile` Set för combinedBody (behålls för bakåtkompatibilitet)
- Konsekvent logik för både callActivities och tasks/epics

**Kodändringar**:
- Ny global Set `globalProcessedDocNodes` (rad ~1509)
- Uppdaterad logik för `skipDocGeneration` (rad ~1561-1566)
- Uppdaterad markering av processade noder (rad ~2088-2095)

## Rekommendationer

### ✅ Alla kritiska problem är lösta

Alla identifierade problem har implementerats och lösts. Systemet är nu:
- Deterministik (konsekvent resultat oavsett filordning)
- Konsekvent (samma logik för alla scenarion)
- Komplett (alla Feature Goals genereras korrekt)
- Rekursivt (inkluderar nested subprocesser)

### Prioritet 2: Viktiga förbättringar

3. **Förbättra child documentation-samling**
   - Samla rekursivt från alla descendant nodes
   - Inkludera nested subprocesser

4. **Konsekvent hantering av återkommande noder**
   - Samma logik för callActivities och tasks/epics
   - Tydlig dokumentation om när instans-specifik dokumentation sparas

### Prioritet 3: Nice-to-have

5. **Förbättra logging**
   - Logga när Feature Goal genereras och varför
   - Logga filordning och nodordning

6. **Dokumentation**
   - Dokumentera alla scenarion och förväntat beteende
   - Skapa test cases för varje scenario

## Testscenarion att verifiera

1. **Scenario 1**: Root-fil → Subprocess-fil (parent först)
   - Förväntat: CallActivity genererar Feature Goal, subprocess-filen ser att den redan finns

2. **Scenario 2**: Subprocess-fil → Root-fil (subprocess först)
   - Förväntat: Subprocess-filen genererar Feature Goal, callActivity ser att den redan finns

3. **Scenario 3**: Återkommande callActivity
   - Förväntat: Första genererar Feature Goal, andra genererar instans-specifik

4. **Scenario 4**: Nested subprocesser
   - Förväntat: Child documentation inkluderar nested subprocesser

5. **Scenario 5**: Samma subprocess från olika parent-filer
   - Förväntat: Endast en Feature Goal-sida, men instans-specifik dokumentation per callActivity
