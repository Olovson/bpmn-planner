# Analys: Inkrementell Filuppladdning och Dokumentationsgenerering

**Datum:** 2025-01-XX  
**Status:** ✅ Analys klar - Rekommendationer dokumenterade

---

## 📊 Scenario: Stegvis Filuppladdning

### Scenario 1: Initial Uppladdning
1. **Första uppladdningen:**
   - `mortgage.bpmn` (root)
   - `mortgage-se-application.bpmn`
   - `mortgage-se-internal-data-gathering.bpmn`

2. **Vad händer:**
   - Dokumentation genereras för alla tre filer
   - `mortgage.bpmn` har call activities som pekar på `application` och andra subprocesser
   - `application.bpmn` har call activities som pekar på `internal-data-gathering`, `object`, `stakeholder`, `household`
   - **Problem:** Feature Goals genereras INTE för `object`, `stakeholder`, `household` eftersom filerna saknas (korrekt beteende efter vår fix)

### Scenario 2: Lägga Till Saknad Subprocess
3. **Andra uppladdningen:**
   - `mortgage-se-object.bpmn` (ny fil)

4. **Vad händer NU:**
   - Filen laddas upp och sparas
   - **FRÅGA:** Genereras Feature Goals retroaktivt för `object` call activity i `application.bpmn`?
   - **FRÅGA:** Uppdateras dokumentationen för `application.bpmn` automatiskt?

### Scenario 3: Lägga Till Ytterligare Subprocess
5. **Tredje uppladdningen:**
   - `mortgage-se-object-information.bpmn` (ny fil, subprocess till `object`)

6. **Vad händer NU:**
   - Filen laddas upp och sparas
   - **FRÅGA:** Genereras Feature Goals retroaktivt för `object-information` call activity i `object.bpmn`?
   - **FRÅGA:** Uppdateras dokumentationen för `object.bpmn` automatiskt?

---

## 🔍 Nuvarande Beteende

### Vid Filuppladdning

**`useBpmnFiles.ts` (rad 39-122):**
```typescript
onSuccess: async (data) => {
  invalidateStructureQueries(queryClient);
  queryClient.invalidateQueries({ queryKey: ['root-bpmn-file'] });
  await queryClient.refetchQueries({ queryKey: ['bpmn-files'] });
  
  // Calculate and save diff for the uploaded file
  if (data?.file?.file_name && data?.file?.file_type === 'bpmn') {
    await calculateAndSaveDiff(...);
  }
}
```

**Observation:**
- Filen laddas upp och sparas
- Diff beräknas och sparas
- Queries invalideras (struktur + filer)
- **INGEN automatisk dokumentationsgenerering**

### Vid Dokumentationsgenerering

**`BpmnFileManager.tsx` - `handleGenerateForFile`:**
```typescript
const result = await generateAllFromBpmnWithGraph(
  bpmnFileName,
  graphFileScope, // Alla filer i hierarkin
  [],
  useHierarchy,
  useLlm,
  ...
);
```

**Observation:**
- När man genererar dokumentation för en fil, inkluderas ALLA filer i `graphFileScope`
- `graphFileScope` bestäms av `buildBpmnProcessGraph` som läser ALLA filer i `existingBpmnFiles`
- Om en ny fil läggs till, kommer den att inkluderas i `graphFileScope` nästa gång man genererar

---

## ⚠️ Problem: Ingen Automatisk Retroaktiv Generering

### Problem 1: Feature Goals Genereras Inte Retroaktivt

**Scenario:**
1. Ladda upp `mortgage.bpmn`, `application.bpmn`, `internal-data-gathering.bpmn`
2. Generera dokumentation → Feature Goals genereras INTE för `object` (filen saknas) ✅
3. Ladda upp `mortgage-se-object.bpmn`
4. **Problem:** Feature Goal för `object` call activity i `application.bpmn` genereras INTE automatiskt ❌

**Varför:**
- När `object.bpmn` laddas upp, triggas ingen dokumentationsgenerering
- Användaren måste manuellt generera om dokumentation för `application.bpmn`
- När man genererar om, kommer `object.bpmn` att inkluderas i `graphFiles` (rad 1613: `graphFiles = existingBpmnFiles`), och Feature Goal kommer att genereras ✅

### Problem 2: Dokumentation Uppdateras Inte Automatiskt

**Scenario:**
1. Ladda upp `mortgage.bpmn`, `application.bpmn`
2. Generera dokumentation → `application.bpmn` får dokumentation utan Feature Goals för saknade subprocesser
3. Ladda upp `mortgage-se-object.bpmn`
4. **Problem:** Dokumentationen för `application.bpmn` uppdateras INTE automatiskt ❌

**Varför:**
- Ingen automatisk regenerering när nya filer läggs till
- Användaren måste manuellt generera om dokumentation
- När man genererar om, inkluderas alla filer i `graphFiles`, så nya subprocesser kommer att inkluderas ✅

---

## ✅ Lösningar

### Lösning 1: Automatisk Retroaktiv Generering (Rekommenderad)

**När en ny fil laddas upp:**
1. Identifiera alla befintliga filer som refererar till den nya filen som subprocess
2. Generera om dokumentation för dessa filer automatiskt
3. Detta säkerställer att Feature Goals genereras retroaktivt

**Implementering:**
```typescript
// I useBpmnFiles.ts onSuccess
if (data?.file?.file_name && data?.file?.file_type === 'bpmn') {
  // Hitta alla filer som refererar till den nya filen
  const filesThatReferenceNewFile = await findFilesReferencingSubprocess(
    data.file.file_name
  );
  
  // Generera om dokumentation för dessa filer
  for (const parentFile of filesThatReferenceNewFile) {
    await regenerateDocumentationForFile(parentFile);
  }
}
```

**Fördelar:**
- Automatisk uppdatering
- Feature Goals genereras retroaktivt
- Användaren behöver inte manuellt generera om

**Nackdelar:**
- Kan vara kostsamt (många LLM-anrop)
- Kan ta tid om många filer behöver uppdateras

### Lösning 2: Varning + Manuell Generering (Nuvarande)

**När en ny fil laddas upp:**
1. Visa varning: "Ny fil laddades upp. Vissa befintliga filer kan behöva regenereras."
2. Lista filer som kan behöva regenereras
3. Användaren genererar manuellt om

**Implementering:**
```typescript
// I BpmnFileManager.tsx
const [filesNeedingRegeneration, setFilesNeedingRegeneration] = useState<string[]>([]);

// När ny fil laddas upp
useEffect(() => {
  if (newFileUploaded) {
    const filesToRegenerate = findFilesReferencingSubprocess(newFile);
    setFilesNeedingRegeneration(filesToRegenerate);
  }
}, [newFileUploaded]);
```

**Fördelar:**
- Användaren har kontroll
- Inga oväntade LLM-anrop
- Enkelt att implementera

**Nackdelar:**
- Kräver manuell åtgärd
- Användaren kan glömma att generera om

### Lösning 3: Hybrid (Rekommenderad)

**När en ny fil laddas upp:**
1. Identifiera filer som behöver uppdateras
2. Visa varning med lista
3. Erbjud "Generera om automatiskt" knapp
4. Om användaren klickar, generera om automatiskt

**Fördelar:**
- Användaren har kontroll
- Automatisk generering om önskat
- Bästa av båda världar

---

## 🔧 BusinessRuleTasks och DMN-filer

### Nuvarande Beteende ✅

**`bpmnGenerators.ts` (rad 2546-2559):**
```typescript
} else if (nodeType === 'BusinessRuleTask') {
  // Match DMN file for BusinessRuleTask
  const { matchDmnFile } = await import('./dmnParser');
  subprocessFile = matchDmnFile(element.name || element.id, existingDmnFiles);
  
  // Parse DMN if file exists
  if (subprocessFile && existingDmnFiles.includes(subprocessFile)) {
    subprocessSummary = await parseDmnSummary(subprocessFile) || undefined;
    result.subprocessMappings.set(element.id, subprocessFile);
  }
}

if (['UserTask', 'ServiceTask', 'BusinessRuleTask', 'CallActivity'].includes(nodeType)) {
  docContent = generateDocumentationHTML(element, subprocessFile, subprocessSummary);
  // ...
}
```

**Observation:**
- ✅ BusinessRuleTasks genererar dokumentation även om DMN-filen saknas
- Om DMN-filen finns, inkluderas DMN-information i dokumentationen
- Om DMN-filen saknas, genereras dokumentation ändå (men utan DMN-information)

**Detta är korrekt beteende:**
- BusinessRuleTasks behöver dokumentation även utan DMN-filer
- DMN-information är komplementär, inte kritiskt
- Till skillnad från callActivities där Feature Goals är beroende av subprocess-filen

**Inga ändringar behövs för BusinessRuleTasks** ✅

---

## ✅ Nuvarande Beteende: Hur Det Fungerar Nu

### Scenario: Stegvis Filuppladdning

**Steg 1: Initial Uppladdning**
1. Ladda upp: `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-internal-data-gathering.bpmn`
2. Generera dokumentation för `mortgage.bpmn` (root-fil)
3. **Vad händer:**
   - `graphFiles = existingBpmnFiles` (alla 3 filer inkluderas)
   - Feature Goals genereras för `application` och `internal-data-gathering` ✅
   - Feature Goals genereras INTE för `object`, `stakeholder`, `household` (filerna saknas) ✅
   - Dokumentation sparas i Supabase Storage

**Steg 2: Lägga Till Saknad Subprocess**
4. Ladda upp: `mortgage-se-object.bpmn` (ny fil)
5. **Vad händer NU:**
   - Filen laddas upp och sparas
   - `bpmn_dependencies` uppdateras (via `buildHierarchySilently`)
   - **INGEN automatisk dokumentationsgenerering** ❌
   - Användaren måste manuellt generera om dokumentation

6. **När användaren genererar om dokumentation för `application.bpmn`:**
   - `graphFiles = existingBpmnFiles` (nu inkluderar alla 4 filer)
   - `object.bpmn` finns nu i `existingBpmnFiles`
   - `missingDefinition` blir `false` för `object` call activity
   - Feature Goal genereras för `object` call activity ✅

**Steg 3: Lägga Till Ytterligare Subprocess**
7. Ladda upp: `mortgage-se-object-information.bpmn` (ny fil, subprocess till `object`)
8. **Vad händer NU:**
   - Filen laddas upp och sparas
   - `bpmn_dependencies` uppdateras
   - **INGEN automatisk dokumentationsgenerering** ❌
   - Användaren måste manuellt generera om dokumentation

9. **När användaren genererar om dokumentation för `object.bpmn`:**
   - `graphFiles = existingBpmnFiles` (nu inkluderar alla 5 filer)
   - `object-information.bpmn` finns nu i `existingBpmnFiles`
   - Feature Goal genereras för `object-information` call activity ✅

### ✅ Positiva Aspekter

1. **När man genererar dokumentation, inkluderas ALLA filer:**
   - `graphFiles = existingBpmnFiles` (rad 1613)
   - Detta säkerställer att nya filer inkluderas nästa gång man genererar

2. **Feature Goals genereras retroaktivt:**
   - När man genererar om dokumentation, kommer nya subprocess-filer att inkluderas
   - Feature Goals genereras för call activities vars subprocess-filer nu finns

3. **Hierarki byggs automatiskt:**
   - `buildHierarchySilently` körs när filer laddas upp (rad 1423)
   - `bpmn_dependencies` uppdateras automatiskt

### ⚠️ Problem: Ingen Automatisk Retroaktiv Generering

**Problem:**
- När en ny fil laddas upp, triggas ingen dokumentationsgenerering
- Användaren måste manuellt generera om dokumentation för att få Feature Goals för nya subprocesser
- Detta kan vara förvirrande - användaren kan tro att Feature Goals borde genereras automatiskt

**Exempel:**
1. Ladda upp `mortgage.bpmn`, `application.bpmn`, `internal-data-gathering.bpmn`
2. Generera dokumentation → Feature Goals genereras INTE för `object` (filen saknas) ✅
3. Ladda upp `mortgage-se-object.bpmn`
4. **Problem:** Feature Goal för `object` call activity i `application.bpmn` genereras INTE automatiskt ❌
5. Användaren måste manuellt generera om dokumentation för `application.bpmn`
6. När man genererar om, kommer `object.bpmn` att inkluderas, och Feature Goal kommer att genereras ✅

---

## 📋 Rekommendationer

### 1. BusinessRuleTasks: Inga Ändringar Behövs ✅

BusinessRuleTasks genererar redan dokumentation även när DMN-filer saknas. Detta är korrekt beteende.

### 2. Inkrementell Filuppladdning: Implementera Hybrid-lösning

**Steg 1: Identifiera filer som behöver uppdateras**
```typescript
async function findFilesReferencingSubprocess(
  subprocessFileName: string
): Promise<string[]> {
  // Hitta alla filer som har call activities som pekar på subprocessFileName
  // Använd bpmn_dependencies som redan byggs automatiskt vid filuppladdning
  const { data: dependencies } = await supabase
    .from('bpmn_dependencies')
    .select('parent_file')
    .eq('child_file', subprocessFileName);
  
  return dependencies?.map(d => d.parent_file) || [];
}
```

**Steg 2: Visa varning i UI (i `useBpmnFiles.ts` onSuccess)**
```typescript
// När ny fil laddas upp
if (data?.file?.file_name && data?.file?.file_type === 'bpmn') {
  // Vänta lite så att buildHierarchySilently hinner köra
  setTimeout(async () => {
    const filesToRegenerate = await findFilesReferencingSubprocess(data.file.file_name);
    if (filesToRegenerate.length > 0) {
      toast({
        title: 'Filer behöver uppdateras',
        description: `${filesToRegenerate.length} fil(er) refererar till ${data.file.file_name} och kan behöva regenereras för att inkludera Feature Goals.`,
        action: (
          <Button onClick={() => regenerateFiles(filesToRegenerate)}>
            Generera om automatiskt
          </Button>
        ),
      });
    }
  }, 2000); // Vänta 2 sekunder så att buildHierarchySilently hinner köra
}
```

**Steg 3: Implementera automatisk regenerering**
```typescript
async function regenerateFiles(files: string[]) {
  // Hämta alla befintliga filer (inkluderar den nya filen)
  const { data: allFiles } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');
  
  const allExistingFiles = (allFiles || []).map(f => f.file_name);
  
  for (const file of files) {
    await generateAllFromBpmnWithGraph(
      file,
      allExistingFiles, // Inkludera den nya filen
      [],
      true, // useHierarchy
      useLlm,
      ...
    );
  }
}
```

**Alternativ: Automatisk regenerering (mindre rekommenderat)**
```typescript
// I useBpmnFiles.ts onSuccess
if (data?.file?.file_name && data?.file?.file_type === 'bpmn') {
  // Vänta lite så att buildHierarchySilently hinner köra
  setTimeout(async () => {
    const filesToRegenerate = await findFilesReferencingSubprocess(data.file.file_name);
    if (filesToRegenerate.length > 0) {
      // Automatisk regenerering (kan vara kostsamt)
      await regenerateFiles(filesToRegenerate);
    }
  }, 2000);
}
```

---

## 🔗 Relaterade Filer

- `src/hooks/useBpmnFiles.ts` - Filuppladdning
- `src/pages/BpmnFileManager.tsx` - UI för filhantering
- `src/lib/bpmnGenerators.ts` - Dokumentationsgenerering
- `src/lib/bpmnProcessGraph.ts` - Process graph building
- `docs/analysis/INCREMENTAL_FILE_UPLOAD_ANALYSIS.md` - Denna analys


