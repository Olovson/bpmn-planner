# Förklaring: Diff-funktionalitet för Selektiv Regenerering

**Datum:** 2025-12-22  
**Syfte:** Förklara hur diff-funktionaliteten fungerar när användaren laddar upp nya BPMN-filer.

---

## 1. Översikt

Diff-funktionaliteten gör det möjligt att:
- **Detektera ändringar** i BPMN-filer när de uppdateras
- **Spara diff-resultat** i databasen (`bpmn_file_diffs` tabell)
- **Selektivt regenerera** endast noder som har ändrats, lagts till eller tagits bort
- **Undvika onödig regenerering** av noder som inte har ändrats

---

## 2. Flöde: När Användaren Laddar Upp En Ny Fil

### Steg 1: Filuppladdning
**Plats:** `src/hooks/useBpmnFiles.ts` (rad 39-123)

1. Användaren laddar upp en BPMN-fil via UI
2. Filen skickas till Supabase Edge Function (`upload-bpmn-file`)
3. Funktionen:
   - Sparar filen i Supabase Storage
   - Skapar/uppdaterar post i `bpmn_files` tabell
   - Parsar BPMN-filen och extraherar metadata
   - Sparar metadata i `bpmn_files.meta` kolumn

### Steg 2: Diff-beräkning (Automatiskt)
**Plats:** `src/hooks/useBpmnFiles.ts` (rad 61-92)

Efter lyckad uppladdning:
1. **Hämtar filinnehåll** från Storage
2. **Anropar `calculateAndSaveDiff()`** (rad 74)
   - Funktionen finns i `src/lib/bpmnDiffRegeneration.ts`

### Steg 3: Diff-beräkning (Detaljerat)
**Plats:** `src/lib/bpmnDiffRegeneration.ts` → `calculateAndSaveDiff()` (rad 163-312)

#### 3.1: Hämta Filinformation
```typescript
// Hämta fil-post från databasen
const fileData = await supabase
  .from('bpmn_files')
  .select('id')
  .eq('file_name', fileName)
  .single();
```

#### 3.2: Beräkna Version Hash
```typescript
// Beräkna hash för nytt innehåll
const newContentHash = await calculateContentHash(newContent);

// Hämta nuvarande version (om den finns)
const currentVersion = await getCurrentVersion(fileName);
const previousVersion = currentVersion ? await getPreviousVersion(fileName) : null;
```

#### 3.3: Skapa Ny Version
```typescript
// Skapa eller hämta version för nytt innehåll
const { version: newVersion, isNew } = await createOrGetVersion(
  bpmnFileId,
  fileName,
  newContent,
  newMeta
);
```

**Viktigt:**
- Om `isNew === false` → Innehållet är identiskt med tidigare version → **Ingen diff behövs** → Returnera `{ diffCount: 0 }`
- Om `isNew === true` → Ny version skapad → Fortsätt med diff-beräkning

#### 3.4: Två Scenarion

##### Scenario A: Ny Fil (Ingen Tidigare Version)
**Plats:** Rad 209-252

Om `!currentVersion || !previousVersion`:
1. **Parsa ny fil** → `parseBpmnFile(fileName)`
2. **Enrich call activities** med mapping-information → `enrichCallActivitiesWithMapping()`
3. **Extrahera alla noder** → `extractNodeSnapshots()`
4. **Markera alla som "added"** → Skapa diff-poster med `diff_type: 'added'`
5. **Spara till databas** → `bpmn_file_diffs` tabell

**Resultat:** Alla noder i den nya filen markeras som "added" och behöver genereras.

##### Scenario B: Uppdaterad Fil (Finns Tidigare Version)
**Plats:** Rad 254-306

Om `currentVersion && previousVersion` finns:
1. **Parsa ny version** → `parseBpmnFile(fileName)`
2. **Enrich call activities** → `enrichCallActivitiesWithMapping()`
3. **Konvertera gammal metadata** → `convertBpmnMetaToParseResult(oldMeta)`
   - Konverterar `BpmnMeta` från databasen till `BpmnParseResult` format
4. **Beräkna diff** → `calculateBpmnDiff(oldParseResult, newParseResult, fileName)`
5. **Konvertera till databas-format** → `diffResultToDbFormat()`
6. **Rensa gamla unresolved diffs** → Ta bort gamla unresolved diffs för filen
7. **Spara nya diffs** → Insert i `bpmn_file_diffs` tabell

**Resultat:** Noder kategoriseras som:
- `added` - Nya noder som behöver genereras
- `removed` - Borttagna noder (behöver cleanup)
- `modified` - Ändrade noder som behöver regenereras
- `unchanged` - Oförändrade noder (behöver inte regenereras)

---

## 3. Diff-beräkning (Detaljerat)

### 3.1: Extrahera Node Snapshots
**Plats:** `src/lib/bpmnDiff.ts` → `extractNodeSnapshots()` (rad 42-120)

**Vad görs:**
1. **Call Activities** → Extraheras från `parseResult.callActivities`
2. **User Tasks** → Extraheras från `parseResult.userTasks`
3. **Service Tasks** → Extraheras från `parseResult.serviceTasks`
4. **Business Rule Tasks** → Extraheras från `parseResult.businessRuleTasks`

**Format:**
```typescript
{
  nodeKey: "mortgage.bpmn::application",  // Format: "fileName::elementId"
  nodeType: "callActivity",
  nodeName: "Application",
  bpmnFile: "mortgage.bpmn",
  bpmnElementId: "application",
  metadata: {
    name: "Application",
    type: "callActivity",
    calledElement: "...",
    mapping: { ... }  // För call activities
  }
}
```

**⚠️ PROBLEM:** Process nodes (subprocess Feature Goals) inkluderas **INTE** i `extractNodeSnapshots()`!

### 3.2: Jämföra Noder
**Plats:** `src/lib/bpmnDiff.ts` → `calculateBpmnDiff()` (rad 166-218)

**Process:**
1. **Skapa maps** → `oldMap` och `newMap` baserat på `nodeKey`
2. **Hitta added nodes** → I `newMap` men inte i `oldMap`
3. **Hitta removed nodes** → I `oldMap` men inte i `newMap`
4. **Hitta modified/unchanged nodes** → I båda maps, jämför med `compareNodes()`

**Jämförelse:**
- `compareNodes()` jämför: `nodeName`, `nodeType`, och alla `metadata` fält
- Om något ändrats → `modified`
- Om inget ändrats → `unchanged`

---

## 4. Spara Diff till Databas

### 4.1: Databas-format
**Plats:** `src/lib/bpmnDiff.ts` → `diffResultToDbFormat()` (rad 223-335)

**Tabell:** `bpmn_file_diffs`

**Kolumner:**
- `bpmn_file_id` - ID från `bpmn_files` tabell
- `file_name` - BPMN-filnamn
- `diff_type` - `'added' | 'removed' | 'modified' | 'unchanged'`
- `node_key` - Format: `"fileName::elementId"`
- `node_type` - `'callActivity' | 'userTask' | 'serviceTask' | 'businessRuleTask'`
- `node_name` - Nodens namn
- `old_content` - Gammal metadata (JSON)
- `new_content` - Ny metadata (JSON)
- `diff_details` - Detaljerade ändringar (JSON)
- `from_version_hash` - Hash för gammal version
- `to_version_hash` - Hash för ny version
- `from_version_number` - Versionsnummer för gammal version
- `to_version_number` - Versionsnummer för ny version
- `resolved_at` - När diff markerades som löst (NULL = unresolved)
- `resolved_by` - Användare som löste diff

### 4.2: Rensa Gamla Diffs
**Plats:** `src/lib/bpmnDiffRegeneration.ts` (rad 284-289)

När nya diffs sparas:
1. **Ta bort gamla unresolved diffs** för filen
2. **Insert nya diffs** (alla typer: added, removed, modified)

**Anledning:** Gamla diffs är inte längre relevanta när en ny version laddas upp.

---

## 5. Selektiv Regenerering

### 5.1: Hämta Unresolved Diffs
**Plats:** `src/lib/bpmnDiffRegeneration.ts` → `getAllUnresolvedDiffs()` (rad 62-84)

**Vad görs:**
1. Hämta alla diffs där `resolved_at IS NULL`
2. Gruppera per fil → `Map<fileName, Set<nodeKey>>`

**Användning:** Används för att skapa en `nodeFilter` som bara inkluderar noder med unresolved diffs.

### 5.2: Skapa Node Filter
**Plats:** `src/lib/bpmnDiffRegeneration.ts` → `createDiffBasedNodeFilter()` (rad 94-130)

**Funktion:**
```typescript
const filter = createDiffBasedNodeFilter(unresolvedDiffs, {
  autoRegenerateChanges: true,      // Regenerera added/modified
  autoRegenerateUnchanged: false,   // Regenerera unchanged (konservativt: false)
  autoRegenerateRemoved: false,     // Regenerera removed (konservativt: false)
});

// Använd filter i generateAllFromBpmnWithGraph()
const result = await generateAllFromBpmnWithGraph(
  fileName,
  existingFiles,
  dmnFiles,
  useHierarchy,
  useLlm,
  progressCallback,
  generationSource,
  llmProvider,
  filter,  // ← Node filter som bara inkluderar noder med unresolved diffs
  ...
);
```

**Resultat:** Endast noder med unresolved diffs genereras.

### 5.3: Markera Diffs som Lösta
**Plats:** `src/lib/bpmnDiffRegeneration.ts` → `markDiffsAsResolved()` (rad 135-156)

Efter lyckad generering:
1. **Anropa `markDiffsAsResolved()`** med lista över genererade `nodeKey`s
2. **Uppdatera `resolved_at`** och `resolved_by` i databasen
3. **Diffs är nu "lösta"** och kommer inte att regenereras igen (förrän nästa uppladdning)

---

## 6. Nuvarande Problem (TODO)

### Problem 1: Process Nodes Inkluderas Inte
**Plats:** `src/lib/bpmnDiff.ts` → `extractNodeSnapshots()` (rad 42-120)

**Problem:**
- `extractNodeSnapshots()` inkluderar bara: `callActivity`, `userTask`, `serviceTask`, `businessRuleTask`
- **Saknas:** `process` nodes (subprocess Feature Goals)

**Påverkan:**
- När en subprocess-fil ändras, detekteras inte ändringen i process-noden
- Process-nodens Feature Goal dokumentation regenereras inte automatiskt

**Lösning:**
- Lägg till logik för att extrahera process nodes från `parseResult`
- Process nodes identifieras av: `type === 'process'` och finns i subprocess-filer

### Problem 2: Cascade-diff-detection Saknas
**Plats:** `src/lib/bpmnDiffRegeneration.ts`

**Problem:**
- Om en subprocess-fil ändras, behöver alla call activities som anropar den också regenereras
- Detta detekteras inte automatiskt

**Påverkan:**
- Ändringar i subprocess påverkar call activity Feature Goals, men detekteras inte
- Användaren måste manuellt regenerera call activities

**Lösning:**
- Efter diff-beräkning, hitta alla call activities som anropar ändrade subprocess-filer
- Markera dessa call activities som `modified` i diff-tabellen

### Problem 3: Cleanup av Removed Nodes Saknas
**Plats:** `src/lib/bpmnDiffRegeneration.ts`

**Problem:**
- När en nod tas bort, tas inte dokumentationen bort från Storage
- Döda länkar i dokumentation

**Påverkan:**
- Dokumentation för borttagna noder finns kvar i Storage
- Förvirring om vilka noder som faktiskt finns

**Lösning:**
- Implementera cleanup-funktion som:
  1. Hittar alla `removed` nodes i diff-tabellen
  2. Tar bort dokumentation från Storage
  3. Alternativt: Markera som "deprecated" istället för att ta bort

---

## 7. Exempel: Komplett Flöde

### Scenario: Användaren Uppdaterar `mortgage-se-application.bpmn`

1. **Uppladdning:**
   - Användaren laddar upp ny version av `mortgage-se-application.bpmn`
   - Filen sparas i Storage och databasen

2. **Diff-beräkning:**
   - `calculateAndSaveDiff()` anropas automatiskt
   - Jämför ny version med tidigare version
   - Hittar:
     - **Added:** Ny task `"verify-identity"` lagts till
     - **Modified:** Task `"confirm-application"` har ändrat namn
     - **Removed:** Task `"old-validation"` tagits bort
     - **Unchanged:** 15 andra tasks är oförändrade

3. **Spara Diffs:**
   - 3 diff-poster sparas i `bpmn_file_diffs`:
     - `{ diff_type: 'added', node_key: 'mortgage-se-application.bpmn::verify-identity', ... }`
     - `{ diff_type: 'modified', node_key: 'mortgage-se-application.bpmn::confirm-application', ... }`
     - `{ diff_type: 'removed', node_key: 'mortgage-se-application.bpmn::old-validation', ... }`

4. **Selektiv Regenerering:**
   - Användaren klickar "Generera allt"
   - `getAllUnresolvedDiffs()` hittar 3 unresolved diffs
   - `createDiffBasedNodeFilter()` skapar filter som bara inkluderar:
     - `verify-identity` (added)
     - `confirm-application` (modified)
   - **Resultat:** Endast 2 noder genereras (inte alla 17)

5. **Markera som Lösta:**
   - Efter lyckad generering, `markDiffsAsResolved()` anropas
   - `resolved_at` sätts för de 2 genererade noderna
   - `old-validation` (removed) förblir unresolved (behöver cleanup)

6. **Cleanup (TODO):**
   - Cleanup-funktion tar bort dokumentation för `old-validation` från Storage
   - Eller markerar som "deprecated"

---

## 8. Sammanfattning

**Nuvarande Flöde:**
1. ✅ Filuppladdning → Automatisk diff-beräkning
2. ✅ Diff sparas i databasen
3. ✅ Selektiv regenerering baserat på unresolved diffs
4. ✅ Diffs markeras som lösta efter generering

**Saknas:**
1. ❌ Process nodes i diff-beräkning
2. ❌ Cascade-diff-detection (subprocess → call activities)
3. ❌ Cleanup av removed nodes

**Nästa Steg:**
- Implementera de 3 saknade funktionerna enligt TODO-listan
