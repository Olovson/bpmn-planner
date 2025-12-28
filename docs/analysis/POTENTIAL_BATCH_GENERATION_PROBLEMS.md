# Potentiella Problem i Batch-Generering

## Datum: 2025-12-29

## Analys av Batch-Scenario

När alla 19 filer från `mortgage-se 2025.11.29` laddas upp och genereras:

---

## ✅ Vad som BORDE fungera

### 1. Progress-räkning
- ✅ `fileLevelDocsCount = analyzedFiles.length` (19 filer)
- ✅ `totalNodesToGenerate = nodesToGenerate.length + processNodesToGenerate + fileLevelDocsCount`
- ✅ Progress visar korrekt antal: epics + callActivities + 19 file-level docs

### 2. File-level Documentation
- ✅ Genereras för alla filer i `analyzedFiles` (alla 19 filer)
- ✅ Loopar över `sortedAnalyzedFiles` (rad 1970)

### 3. CallActivity Feature Goals
- ✅ Genereras för alla callActivities där subprocess-filen finns
- ✅ Använder hierarchical naming med parent

---

## ⚠️ Potentiella Problem

### Problem 1: Root Process Feature Goal genereras INTE

**Villkor för Root Process Feature Goal** (rad 2798):
```typescript
if (file === bpmnFileName && isActualRootFile && isRootFileGeneration && isRootProcessFromMapForRoot && !isSubprocessFileForRoot)
```

**När root-filen genereras med hierarki:**
- ✅ `file === bpmnFileName` = true (för root-filen `mortgage.bpmn`)
- ✅ `isActualRootFile` = true (rad 740: `isRootFile` = true)
- ✅ `isRootFileGeneration` = true (rad 1547-1551: `useHierarchy && !nodeFilter && ...`)
- ⚠️ `isRootProcessFromMapForRoot` = **BEROR PÅ bpmn-map.json**
- ✅ `!isSubprocessFileForRoot` = true (root-filen är inte en subprocess)

**Problem:**
- Om `bpmn-map.json` inte kan laddas → `rootProcessId = null`
- Om `rootProcessId = null` → `isRootProcessFromMapForRoot = false`
- Om `isRootProcessFromMapForRoot = false` → Root Process Feature Goal genereras INTE

**Lösning:**
- Säkerställ att `bpmn-map.json` kan laddas
- Säkerställ att `orchestration.root_process` är satt korrekt
- Eller förbättra fallback-logiken

---

### Problem 2: isRootFileGeneration kan vara false

**Villkor för isRootFileGeneration** (rad 1547-1551):
```typescript
const isRootFileGeneration = useHierarchy && 
  !nodeFilter && 
  summary.filesIncluded.length > 0 &&
  summary.filesIncluded[0] === bpmnFileName &&
  (isActualRootFile === true || graphFileScope.length > 1);
```

**När root-filen genereras med hierarki:**
- ✅ `useHierarchy` = true (rad 661: `isRootFile || (isSubprocess && parentFile)`)
- ✅ `!nodeFilter` = true (om ingen nodeFilter finns)
- ⚠️ `summary.filesIncluded.length > 0` = **BEROR PÅ GRAFEN**
- ⚠️ `summary.filesIncluded[0] === bpmnFileName` = **BEROR PÅ FILORDNINGEN**
- ✅ `isActualRootFile === true` = true (rad 740)

**Problem:**
- Om `summary.filesIncluded` är tom → `isRootFileGeneration = false`
- Om `summary.filesIncluded[0] !== bpmnFileName` → `isRootFileGeneration = false`
- Om `isRootFileGeneration = false` → `analyzedFiles = [bpmnFileName]` (bara root-filen)
- Om `analyzedFiles = [bpmnFileName]` → Bara root-filen genereras, inte alla 19 filer!

**Lösning:**
- Säkerställ att grafen byggs korrekt med alla filer
- Säkerställ att `summary.filesIncluded` innehåller alla filer
- Eller förbättra fallback-logiken för `isRootFileGeneration`

---

### Problem 3: isActualRootFile kan vara false

**När root-filen genereras med hierarki:**
- `isRootFile = rootFileName && file.file_name === rootFileName` (rad 647)
- `isActualRootFile = isRootFile` (rad 740)

**Problem:**
- Om `rootFileName` är undefined/null → `isRootFile = false`
- Om `isRootFile = false` → `isActualRootFile = false`
- Om `isActualRootFile = false` → Root Process Feature Goal genereras INTE
- Om `isActualRootFile = false` → `isRootFileGeneration` kan vara false (om `graphFileScope.length <= 1`)

**Lösning:**
- Säkerställ att `rootFileName` är satt korrekt
- Eller förbättra identifieringen av root-filen från `bpmn-map.json`

---

### Problem 4: Summeringssidan visar fel antal

**Summeringssidan visar:**
- `result.docFiles.length` (från `detailedDocFiles` array)
- `detailedDocFiles` fylls när filer laddas upp (rad 1311)

**Problem:**
- Om Root Process Feature Goal genereras men inte laddas upp korrekt → räknas inte
- Om file-level docs genereras men inte laddas upp korrekt → räknas inte
- Om samma fil genereras flera gånger → räknas dubbelt

**Lösning:**
- Säkerställ att alla genererade filer laddas upp korrekt
- Säkerställ att `detailedDocFiles` innehåller alla filer

---

## 🔍 Specifika Kontroller för Batch-Scenario

### Kontroll 1: Root-fil Identifiering
```typescript
// useFileGeneration.ts rad 1616
const rootFile = await resolveRootBpmnFile();
```
- ✅ Kontrollera att `resolveRootBpmnFile()` hittar `mortgage.bpmn`
- ✅ Kontrollera att `rootFileName` är satt korrekt

### Kontroll 2: isRootFileGeneration
```typescript
// bpmnGenerators.ts rad 1547-1551
const isRootFileGeneration = useHierarchy && 
  !nodeFilter && 
  summary.filesIncluded.length > 0 &&
  summary.filesIncluded[0] === bpmnFileName &&
  (isActualRootFile === true || graphFileScope.length > 1);
```
- ✅ Kontrollera att `useHierarchy = true`
- ✅ Kontrollera att `!nodeFilter = true`
- ✅ Kontrollera att `summary.filesIncluded.length > 0`
- ✅ Kontrollera att `summary.filesIncluded[0] === 'mortgage.bpmn'`
- ✅ Kontrollera att `isActualRootFile = true` ELLER `graphFileScope.length > 1`

### Kontroll 3: analyzedFiles
```typescript
// bpmnGenerators.ts rad 1559-1561
const analyzedFiles = isRootFileGeneration
  ? graphFileScope // Använd ALLTID graphFileScope för att säkerställa att alla filer bearbetas
  : [bpmnFileName]; // Generera bara för vald fil (hierarki används bara för kontext)
```
- ✅ Kontrollera att `isRootFileGeneration = true`
- ✅ Kontrollera att `analyzedFiles = graphFileScope` (alla 19 filer)
- ❌ Om `isRootFileGeneration = false` → `analyzedFiles = ['mortgage.bpmn']` (bara root-filen!)

### Kontroll 4: Root Process Feature Goal
```typescript
// bpmnGenerators.ts rad 2798
if (file === bpmnFileName && isActualRootFile && isRootFileGeneration && isRootProcessFromMapForRoot && !isSubprocessFileForRoot)
```
- ✅ Kontrollera att `file === 'mortgage.bpmn'` (för root-filen)
- ✅ Kontrollera att `isActualRootFile = true`
- ✅ Kontrollera att `isRootFileGeneration = true`
- ⚠️ Kontrollera att `isRootProcessFromMapForRoot = true` (beror på bpmn-map.json)
- ✅ Kontrollera att `!isSubprocessFileForRoot = true`

---

## 🎯 Rekommenderade Åtgärder

### 1. Förbättra Root-fil Identifiering
- Säkerställ att `resolveRootBpmnFile()` alltid hittar root-filen
- Använd `bpmn-map.json` som primär källa
- Fallback till första filen som inte är subprocess

### 2. Förbättra isRootFileGeneration Logik
- Om `graphFileScope.length > 1` OCH `isActualRootFile = true` → `isRootFileGeneration = true`
- Fallback: Om `graphFileScope.length > 5` → `isRootFileGeneration = true` (hela hierarkin)

### 3. Förbättra Root Process Feature Goal Logik
- Om `isRootFileGeneration = true` OCH `file === bpmnFileName` OCH `!isSubprocessFileForRoot` → Generera Root Process Feature Goal
- Fallback: Om `rootProcessId = null` men `isRootFileGeneration = true` → Generera ändå (för root-filen)

### 4. Validera Summeringssidan
- Säkerställ att `detailedDocFiles` innehåller alla genererade filer
- Säkerställ att inga filer räknas dubbelt

---

## 🧪 Testfall

### Test 1: Batch-uppladdning med root-fil
1. Ladda upp alla 19 filer från `mortgage-se 2025.11.29`
2. Klicka på "Generera Alla"
3. Verifiera att:
   - ✅ `isRootFileGeneration = true`
   - ✅ `analyzedFiles.length = 19`
   - ✅ `fileLevelDocsCount = 19`
   - ✅ Root Process Feature Goal genereras för `mortgage.bpmn`
   - ✅ Summeringssidan visar korrekt antal filer

### Test 2: Batch-uppladdning utan root-fil identifiering
1. Ladda upp alla 19 filer (men `rootFileName` är undefined)
2. Klicka på "Generera Alla"
3. Verifiera att:
   - ⚠️ `isActualRootFile` kan vara false
   - ⚠️ `isRootFileGeneration` kan vara false
   - ⚠️ Bara root-filen genereras (inte alla 19 filer)

---

## Slutsats

**Potentiella problem:**
1. ⚠️ Root Process Feature Goal genereras INTE om `bpmn-map.json` inte kan laddas
2. ⚠️ `isRootFileGeneration` kan vara false om villkoren inte är uppfyllda
3. ⚠️ Bara root-filen genereras om `isRootFileGeneration = false`
4. ⚠️ Summeringssidan kan visa fel antal om filer inte laddas upp korrekt

**Rekommendation:**
- Testa batch-uppladdning med alla 19 filer
- Verifiera att alla filer genereras korrekt
- Verifiera att Root Process Feature Goal genereras
- Verifiera att summeringssidan visar korrekt antal

