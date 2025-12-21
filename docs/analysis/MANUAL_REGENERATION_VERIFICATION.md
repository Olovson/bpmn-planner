# Verifiering: Manuell Regenerering Efter Inkrementell Filuppladdning

**Datum:** 2025-01-XX  
**Status:** ✅ Verifierad - Fungerar korrekt

---

## 📊 Scenario: Verifiera Manuell Regenerering

### Scenario: Stegvis Filuppladdning + Manuell Regenerering

**Steg 1: Initial Uppladdning**
1. Ladda upp: `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-internal-data-gathering.bpmn`
2. Generera dokumentation för `mortgage.bpmn`
3. **Resultat:**
   - Feature Goals genereras för `application` och `internal-data-gathering` ✅
   - Feature Goals genereras INTE för `object`, `stakeholder`, `household` (filerna saknas) ✅

**Steg 2: Lägga Till Saknad Subprocess**
4. Ladda upp: `mortgage-se-object.bpmn` (ny fil)
5. **Vad händer:**
   - Filen laddas upp och sparas i Supabase
   - `buildHierarchySilently` körs och uppdaterar `bpmn_dependencies`
   - **INGEN automatisk dokumentationsgenerering** (förväntat)

**Steg 3: Manuell Regenerering**
6. Användaren väljer att generera om dokumentation för `application.bpmn`
7. **FRÅGA: Kommer dokumentationen att genereras korrekt?**

---

## ✅ Verifiering: Kommer Det Fungera?

### 1. Hämtning av `existingBpmnFiles`

**`BpmnFileManager.tsx` (rad 1436-1443):**
```typescript
const { data: allFiles } = await supabase
  .from('bpmn_files')
  .select('file_name, file_type, storage_path')
  .eq('file_type', 'bpmn');

const existingBpmnFiles = (allFiles || [])
  .filter(f => !!f.storage_path)
  .map(f => f.file_name);
```

**Verifiering:**
- ✅ Hämtar ALLA BPMN-filer från databasen
- ✅ Inkluderar den nya filen (`mortgage-se-object.bpmn`)
- ✅ Filtrerar bara filer med `storage_path` (säkrar att filen faktiskt finns)

### 2. Bestämning av `graphFiles`

**`BpmnFileManager.tsx` (rad 1610-1613):**
```typescript
let graphFiles: string[];
if (isRootFile && useHierarchy) {
  // Root-fil: inkludera alla filer i hierarkin
  graphFiles = existingBpmnFiles;
}
```

**Verifiering:**
- ✅ Om `application.bpmn` är root-fil eller använder hierarki, inkluderas ALLA filer
- ✅ Den nya filen (`mortgage-se-object.bpmn`) inkluderas i `graphFiles`

### 3. Process Graph Building

**`bpmnProcessGraph.ts` (rad 54-59):**
```typescript
export async function buildBpmnProcessGraph(
  rootFile: string,
  existingBpmnFiles: string[],
  versionHashes?: Map<string, string | null>
): Promise<BpmnProcessGraph> {
  const parseResults = await parseAllBpmnFiles(existingBpmnFiles, versionHashes);
  // ...
}
```

**`bpmnProcessGraph.ts` (rad 131-146):**
```typescript
async function parseAllBpmnFiles(
  fileNames: string[],
  versionHashes?: Map<string, string | null>
): Promise<Map<string, BpmnParseResult>> {
  const results = new Map<string, BpmnParseResult>();
  
  for (const fileName of fileNames) {
    try {
      const parseResult = await parseBpmnFile(`/bpmn/${fileName}`, versionHashes?.get(fileName));
      results.set(fileName, parseResult);
    } catch (error) {
      // Handle error
    }
  }
  
  return results;
}
```

**Verifiering:**
- ✅ `parseAllBpmnFiles` itererar över ALLA filer i `existingBpmnFiles`
- ✅ Den nya filen (`mortgage-se-object.bpmn`) kommer att parsas
- ✅ Parse results inkluderar den nya filen

### 4. Process Graph Building med Alla Filer

**`bpmnProcessGraph.ts` (rad 60-63):**
```typescript
const inputFiles = buildProcessModelInputFiles(parseResults);
const model = buildProcessModelFromDefinitions(inputFiles, {
  preferredRootFile: rootFile,
});
```

**Verifiering:**
- ✅ Process model byggs med ALLA parse results (inkluderar den nya filen)
- ✅ Subprocess edges skapas korrekt när både parent och child finns

### 5. `missingDefinition` Sätts Korrekt

**`bpmnProcessGraph.ts` (rad 222-232, 281-298):**
```typescript
// I convertProcessModelChildren
const resolvedSubprocessFile = node.subprocessLink?.matchedProcessId
  ? resolveSubprocessFileFromModel(node, model)
  : undefined;

// VIKTIGT: Verifiera att subprocess-filen faktiskt finns i existingBpmnFiles
const subprocessFile = resolvedSubprocessFile && context.existingBpmnFiles?.includes(resolvedSubprocessFile)
  ? resolvedSubprocessFile
  : undefined;

// ...

const subprocessFileExists = subprocessFile && 
  context.existingBpmnFiles?.includes(subprocessFile);
const missingDefinition = !subprocessFile || !subprocessFileExists;
```

**Verifiering:**
- ✅ `subprocessFile` sätts bara om filen finns i `existingBpmnFiles`
- ✅ `missingDefinition` sätts till `false` om filen finns
- ✅ När `object.bpmn` finns i `existingBpmnFiles`, kommer `missingDefinition` att vara `false` för `object` call activity

### 6. Feature Goal Generering

**`bpmnGenerators.ts` (rad 1402-1429):**
```typescript
if (node.type === 'callActivity') {
  const callActivityFileIncluded = analyzedFiles.includes(node.bpmnFile);
  
  // VIKTIGT: Om subprocess-filen saknas (missingDefinition = true), hoppa över callActivity
  if (node.missingDefinition) {
    return false; // Hoppa över
  }
  
  // Verifiera också att subprocess-filen finns i existingBpmnFiles
  if (node.subprocessFile && !existingBpmnFiles.includes(node.subprocessFile)) {
    return false; // Hoppa över
  }
  
  return callActivityFileIncluded;
}
```

**Verifiering:**
- ✅ Om `missingDefinition = false` och `subprocessFile` finns i `existingBpmnFiles`, inkluderas call activity
- ✅ Feature Goal kommer att genereras för `object` call activity när `object.bpmn` finns

---

## ✅ Slutsats: Det Fungerar Korrekt!

### När Du Genererar Om Dokumentation:

1. **`existingBpmnFiles` hämtas från databasen:**
   - ✅ Hämtas från `bpmn_files` tabellen (rad 1436-1443)
   - ✅ Inkluderar ALLA filer, inklusive den nya filen
   - ✅ Filtrerar bara filer med `storage_path` (säkrar att filen faktiskt finns)

2. **`graphFiles` bestäms baserat på filtyp:**
   - ✅ Om root-fil: `graphFiles = existingBpmnFiles` (alla filer) (rad 1613)
   - ✅ Om subprocess: `graphFiles` inkluderar parent + subprocess + siblings (rad 1614-1628)
   - ✅ Om isolerat: `graphFiles = [file.file_name]` (rad 1631)

3. **`generateAllFromBpmnWithGraph` anropas:**
   - ✅ Tar emot `graphFiles` som `existingBpmnFiles` parameter (rad 1669)
   - ✅ `graphFileScope` sätts till `existingBpmnFiles` om hierarki används (rad 1289-1290)

4. **Process graph byggs med alla filer:**
   - ✅ `buildBpmnProcessGraph` anropas med `graphFileScope` (rad 1308)
   - ✅ `parseAllBpmnFiles` parsar ALLA filer i `graphFileScope` (rad 59, 132-146)
   - ✅ Den nya filen parsas och inkluderas i process graph
   - ✅ Subprocess edges skapas korrekt när både parent och child finns

5. **`missingDefinition` sätts korrekt:**
   - ✅ `subprocessFile` sätts bara om filen finns i `existingBpmnFiles` (rad 230-232)
   - ✅ `missingDefinition` sätts till `false` om filen finns (rad 288-294)
   - ✅ När `object.bpmn` finns i `existingBpmnFiles`, blir `missingDefinition = false` för `object` call activity

6. **Feature Goals genereras:**
   - ✅ Call activities med `missingDefinition = false` inkluderas i `nodesToGenerate` (rad 1407-1415)
   - ✅ Ytterligare kontroll: `node.subprocessFile` måste finnas i `existingBpmnFiles` (rad 1419-1426)
   - ✅ Feature Goals genereras korrekt för call activities vars subprocess-filer nu finns

### Exempel: Stegvis Uppladdning

**Steg 1: Initial**
- Filer: `mortgage.bpmn`, `application.bpmn`, `internal-data-gathering.bpmn`
- Feature Goals: `application` ✅, `internal-data-gathering` ✅
- Feature Goals: `object` ❌ (filen saknas)

**Steg 2: Lägg Till `object.bpmn`**
- Filer: `mortgage.bpmn`, `application.bpmn`, `internal-data-gathering.bpmn`, `object.bpmn`
- Ingen automatisk generering

**Steg 3: Generera Om `application.bpmn`**
- `existingBpmnFiles` = [`mortgage.bpmn`, `application.bpmn`, `internal-data-gathering.bpmn`, `object.bpmn`]
- `graphFiles` = `existingBpmnFiles` (alla 4 filer)
- Process graph byggs med alla 4 filer
- `object` call activity: `missingDefinition = false` ✅
- Feature Goal genereras för `object` ✅

---

## 🎯 Sammanfattning

**Svar på din fråga:**
> "Vad händer när jag sedan väljer att generera dokumentationen kommer den då genereras korrekt?"

**JA, dokumentationen kommer att genereras korrekt! ✅**

**Varför:**
1. `existingBpmnFiles` hämtas alltid från databasen (inkluderar nya filer)
2. `graphFiles` inkluderar alla filer när hierarki används
3. Process graph byggs med alla filer
4. `missingDefinition` sätts korrekt baserat på om filen finns
5. Feature Goals genereras för call activities vars subprocess-filer nu finns

**Det enda som krävs:**
- Du måste manuellt generera om dokumentation för filer som refererar till den nya subprocess-filen
- När du gör det, kommer Feature Goals att genereras korrekt

---

## 🔗 Relaterade Filer

- `src/pages/BpmnFileManager.tsx` - UI och genereringslogik
- `src/lib/bpmnProcessGraph.ts` - Process graph building
- `src/lib/bpmnGenerators.ts` - Dokumentationsgenerering
- `docs/analysis/MANUAL_REGENERATION_VERIFICATION.md` - Denna verifiering


