# Exakt Syfte: Process Feature Goals vs CallActivity Feature Goals

## Datum: 2025-12-29

## KRITISK ANALYS

Denna analys dokumenterar **exakt** när och varför varje typ av Feature Goal genereras, baserat på faktisk kod i `bpmnGenerators.ts`.

---

## 1. CallActivity Feature Goals (Hierarchical Naming)

### När Genereras

**Kod-location:** `bpmnGenerators.ts` rad 2380-2580

**Exakt villkor:**
```typescript
if (node.type === 'callActivity') {
  // 1. Måste vara en CallActivity (inte task eller subProcess)
  // 2. Måste ha subprocessFile (inte embedded subprocess)
  // 3. subprocessFile måste finnas i existingBpmnFiles
  // 4. missingDefinition måste vara false
  // 5. Genereras ALLTID (även om subprocess redan genererat Feature Goal)
}
```

**Genereras för:**
- Varje `callActivity`-nod i parent-filen som har en `subprocessFile`
- **ALLTID** när villkoren är uppfyllda (ingen skip-logik)
- Både första gången subprocessen genereras OCH när subprocessen redan genererat Feature Goal (instans-specifik dokumentation)

### Namngivning

**Format:** Hierarchical naming med parent-fil
```typescript
const featureDocPath = getFeatureGoalDocFileKey(
  bpmnFileForFeatureGoal,  // subprocess-filen (t.ex. mortgage-se-internal-data-gathering.bpmn)
  node.bpmnElementId,       // call activity element ID (t.ex. internal-data-gathering)
  undefined,                 // no version suffix
  parentBpmnFile,           // parent BPMN file (t.ex. mortgage-se-application.bpmn)
);
```

**Resultat:**
- `feature-goals/mortgage-se-application-internal-data-gathering.html`
- Sparas under: `docs/claude/{subprocessBpmnFile}/{versionHash}/feature-goals/{hierarchicalKey}.html`

### Syfte (Enligt Kod)

**Kommentarer i koden (rad 2432-2442):**
```typescript
// STRATEGI: För callActivities som pekar på subprocesser:
// - Om subprocess-filen redan genererat Feature Goal → skapa instans-specifik dokumentation
//   med parent-fil i namnet (hierarkisk naming)
// - Om subprocess-filen inte genererat än → generera base Feature Goal och spara
//   (subprocess-filen kommer senare använda denna base doc)

// VIKTIGT: För callActivities måste vi ALLTID generera Feature Goal-dokumentation,
// även om subprocess-filen redan har genererat sin egen Feature Goal.
// Detta säkerställer att alla callActivity-instanser får dokumentation.
```

**Kommentarer i koden (rad 2554-2565):**
```typescript
// VIKTIGT: För call activities använder vi ALLTID hierarchical naming (med parent)
// eftersom filen alltid sparas under subprocess-filens version hash.
// Subprocess-filen kommer senare generera sin egen Feature Goal-sida (utan parent)
// när subprocess-filen genereras separat.

// Use hierarchical naming: parent BPMN file (where call activity is defined) + elementId
// This matches Jira naming (e.g., "Application - Internal data gathering")
// VIKTIGT: För call activities använder vi ALLTID parent för hierarchical naming,
// eftersom filen sparas under parent-filens version hash i storage.
```

### Kontext som Används

**Byggs via:** `buildNodeDocumentationContext(graph, node.id)`

**Innehåller:**
- **Parent-processens kontext:** Var callActivity är definierad
- **Subprocess-filens kontext:** Vad subprocessen gör
- **Child documentation:** Dokumentation från subprocessens noder (om redan genererad)
- **Structural info:** Gateway-conditions, process paths, flow context
- **Hierarchy:** Parents, siblings, children

**Perspektiv:**
- **Från parent-processens perspektiv**
- Beskriver callActivity's roll i parent-processen
- Inkluderar parent-processens kontext (gateway-conditions, process paths)
- Instans-specifik för varje callActivity-anrop

### När Används

1. **När subprocess-filen genereras via callActivity:**
   - Första gången: Genererar "base" Feature Goal (sparas i `generatedChildDocs`)
   - Återkommande: Genererar instans-specifik Feature Goal med parent-kontext

2. **När subprocess-filen genereras separat:**
   - CallActivity Feature Goal används INTE (subprocess-filen genererar sin egen dokumentation)

---

## 2. Process Feature Goals (Non-hierarchical Naming)

### När Genereras

**Kod-location:** `bpmnGenerators.ts` rad ~2261-2345

**Exakt villkor:**
```typescript
const shouldGenerateProcessFeatureGoal = isSubprocessFileForRoot && 
  !!processNodeForFileForRoot && 
  processNodeForFileForRoot.type === 'process' &&
  !sortedNodesInFile.some(n => n.type === 'callActivity'); // Inga callActivities
```

**Genereras för:**
- Subprocess-filer (inte root)
- Process node av typ 'process'
- Inga callActivities i filen (annars genereras Feature Goal via callActivity istället)
- **Detta är vad användaren ska se i doc-viewer för subprocess-filer**

### Namngivning

**Format:** Non-hierarchical naming (ingen parent)
```typescript
const processFeatureGoalKey = getFeatureGoalDocFileKey(
  file,                    // subprocess-filen (t.ex. mortgage-se-internal-data-gathering.bpmn)
  processNodeForFileForRoot.bpmnElementId || fileBaseName,  // process node ID eller base name
  undefined,                // no version suffix
  undefined,                // INGEN parent (non-hierarchical)
  false,                    // isRootProcess = false (detta är en subprocess)
);
```

**Resultat:**
- `feature-goals/mortgage-se-internal-data-gathering.html`
- Sparas under: `docs/claude/{bpmnFileName}/{versionHash}/feature-goals/{baseName}.html`

### Syfte

**Syfte:**
- Dokumentera subprocess-processen från **subprocess-filens perspektiv**
- Standalone dokumentation (ingen parent-kontext)
- Beskriver subprocess-processen i isolering
- **Detta är vad användaren ser i doc-viewer för subprocess-filer**
- Har Feature Goal-struktur (summary, flowSteps, userStories, dependencies)

**Relation till File-level Documentation:**
- File-level docs genereras också (för E2E-scenarier - JSON-data)
- Process Feature Goal är primär dokumentation för användaren
- File-level docs är sekundär (bara för systemet/E2E-scenarier)

---

## 3. Root Process Feature Goals

### När Genereras

**Kod-location:** `bpmnGenerators.ts` rad 2778-2870

**Exakt villkor:**
```typescript
if (file === bpmnFileName && isActualRootFile && isRootFileGeneration) {
  // 1. Filen måste vara den valda filen (bpmnFileName)
  // 2. isActualRootFile måste vara true
  // 3. isRootFileGeneration måste vara true
  // 4. Filen måste vara root-processen enligt bpmn-map.json (eller fallback)
}
```

**Genereras för:**
- Root-processen (t.ex. `mortgage.bpmn`)
- Endast när hela hierarkin genereras (isRootFileGeneration = true)
- Endast när isActualRootFile = true (explicit flag)

### Namngivning

**Format:** Non-hierarchical naming (ingen parent, root process)
```typescript
const rootFeatureDocPath = getFeatureGoalDocFileKey(
  file,                                    // root-filen (t.ex. mortgage.bpmn)
  processNodeForRoot.bpmnElementId || fileBaseName,  // process node ID eller base name
  undefined,                                // no version suffix
  undefined,                                // no parent (root process)
);
```

**Resultat:**
- `feature-goals/mortgage.html` (eller process node ID)
- Sparas under: `docs/claude/{bpmnFileName}/{versionHash}/feature-goals/{baseName}.html`

### Syfte

**Kommentarer i koden (rad 2778-2779):**
```typescript
// VIKTIGT: Generera Feature Goal för root-processen (mortgage.bpmn)
// Detta görs endast för root-processen när isActualRootFile = true
```

**Syfte:**
- Dokumentera root-processen från **root-processens perspektiv**
- Inkluderar child documentation från alla callActivities i root-processen
- Beskriver hela processhierarkin från root-processens perspektiv

---

## 4. File-Level Documentation (Ersätter Process Feature Goals)

### När Genereras

**Kod-location:** `bpmnGenerators.ts` rad ~1713-1800

**Exakt villkor:**
```typescript
// Generera file-level docs för både root och subprocesser
if (combinedBody.trim().length > 0) {
  // Genereras för ALLA filer som har noder
  // Både root-processer OCH subprocesser
}
```

**Genereras för:**
- **Alla filer** (både root och subprocess) som har noder
- Innehåller combined documentation för alla noder i filen

### Namngivning

**Format:** Filens base name (inte feature-goals/)
```typescript
const docFileName = file.replace('.bpmn', '.html');
// Resultat: mortgage-se-internal-data-gathering.html
```

**Resultat:**
- `mortgage-se-internal-data-gathering.html` (inte `feature-goals/...`)
- Sparas under: `docs/claude/{bpmnFileName}/{versionHash}/{fileBaseName}.html`

### Syfte

**Kommentarer i koden (rad 1713-1729):**
```typescript
// Generera combined file-level documentation för både root-processer och subprocesser
// Root-processer behöver combined doc som en samlad översikt över alla noder
// Subprocesser får också file-level docs (ersätter Process Feature Goals)
```

**Syfte:**
- **Primärt:** JSON-data för E2E-scenariogenerering (embeddad i HTML)
- För subprocess-filer: **Visas INTE för användaren** (Process Feature Goal visas istället)
- För root-filer: Visas i doc-viewer
- **Förbättrad implementation (2025-01-XX):** Använder processens struktur (flow graph, paths) för att skapa en intelligent sammanfattning av hela processen baserat på alla noders dokumentation
- **JSON-data för E2E-scenarier:** Innehåller `summary`, `flowSteps`, `userStories`, och `dependencies` som används av E2E-scenariogenerering

**Detaljerad implementation:** Se [`FILE_LEVEL_DOCUMENTATION_IMPLEMENTATION.md`](./FILE_LEVEL_DOCUMENTATION_IMPLEMENTATION.md)
- **Förbättrad implementation (2025-01-XX):** Använder processens struktur (flow graph, paths) för att skapa en intelligent sammanfattning av hela processen baserat på alla noders dokumentation
- **JSON-data för E2E-scenarier:** Innehåller `summary`, `flowSteps`, `userStories`, och `dependencies` som används av E2E-scenariogenerering

---

## Sammanfattning: När Vad Används

### Scenario 1: CallActivity i Parent-fil → Subprocess-fil Existerar

**Genereras:**
1. ✅ **CallActivity Feature Goal** (hierarchical naming)
   - `feature-goals/mortgage-se-application-internal-data-gathering.html`
   - Perspektiv: Parent-processens perspektiv
   - Kontext: Parent-processens kontext + subprocess-filens kontext

**Genereras INTE:**
- ❌ Process Feature Goal (ersatt av file-level documentation)

### Scenario 2: Subprocess-fil Genereras Isolerat (utan parent)

**Genereras:**
1. ✅ **Process Feature Goal** (non-hierarchical naming)
   - `feature-goals/mortgage-se-internal-data-gathering.html`
   - Perspektiv: Subprocess-filens perspektiv
   - Kontext: Standalone (ingen parent-kontext)
   - **Detta är vad användaren ser i doc-viewer**

2. ✅ **File-level documentation** (för E2E-scenarier - JSON-data)
   - `mortgage-se-internal-data-gathering.html`
   - Innehåll: JSON-data för E2E-scenariogenerering
   - **Visas INTE för användaren (Process Feature Goal visas istället)**

**Genereras INTE:**
- ❌ CallActivity Feature Goal (ingen callActivity i filen)

### Scenario 3: Root-fil Genereras med Hela Hierarkin

**Genereras:**
1. ✅ **Root Process Feature Goal** (non-hierarchical naming)
   - `feature-goals/mortgage.html`
   - Perspektiv: Root-processens perspektiv
   - Kontext: Hela hierarkin + child documentation från callActivities

2. ✅ **File-level documentation**
   - `mortgage.bpmn.html`
   - Innehåll: Combined documentation för alla noder i root-filen

### Scenario 4: Subprocess-fil Används på Flera Ställen

**Genereras:**
1. ✅ **CallActivity Feature Goal** för varje callActivity (hierarchical naming)
   - `feature-goals/mortgage-se-application-internal-data-gathering.html`
   - `feature-goals/mortgage-se-other-process-internal-data-gathering.html`
   - Varje instans har parent-kontext

2. ✅ **Process Feature Goal** för subprocess-filen (non-hierarchical naming)
   - `feature-goals/mortgage-se-internal-data-gathering.html`
   - Perspektiv: Subprocess-filens perspektiv
   - **Detta är vad användaren ser i doc-viewer**

3. ✅ **File-level documentation** för subprocess-filen (för E2E-scenarier - JSON-data)
   - `mortgage-se-internal-data-gathering.html`
   - Innehåll: JSON-data för E2E-scenariogenerering
   - **Visas INTE för användaren (Process Feature Goal visas istället)**

---

## Kritiska Skillnader

### 1. CallActivity Feature Goals vs Process Feature Goals

| Aspekt | CallActivity Feature Goals | Process Feature Goals (Historisk) |
|--------|---------------------------|----------------------------------|
| **När genereras** | För varje callActivity | För subprocess-filer utan callActivities |
| **Namngivning** | Hierarchical (med parent) | Non-hierarchical (ingen parent) |
| **Perspektiv** | Parent-processens perspektiv | Subprocess-filens perspektiv |
| **Kontext** | Parent-kontext + subprocess-kontext | Standalone (ingen parent-kontext) |
| **Användning** | När subprocess anropas via callActivity | När subprocess-filen refereras direkt (visas i doc-viewer) |
| **Status** | ✅ Genereras | ✅ Genereras |

### 2. File-Level Documentation vs Process Feature Goals

| Aspekt | File-Level Documentation | Process Feature Goals (Historisk) |
|--------|-------------------------|----------------------------------|
| **När genereras** | För alla filer med noder | För subprocess-filer utan callActivities |
| **Namngivning** | `{fileBaseName}.html` | `feature-goals/{baseName}.html` |
| **Innehåll** | JSON-data för E2E-scenarier | Feature Goal-struktur (summary, flowSteps, userStories, dependencies) |
| **Struktur** | JSON-data (embeddad i HTML) | Feature Goal-struktur med summary, flowSteps, etc. |
| **Visas för användare** | ❌ Nej (bara för systemet) | ✅ Ja (visas i doc-viewer) |
| **Status** | ✅ Genereras | ✅ Genereras |

---

## Slutsats

### Nuvarande System (2025-01-XX)

1. **CallActivity Feature Goals:** ✅ Genereras för varje callActivity
   - Hierarchical naming med parent-kontext
   - Instans-specifik dokumentation
   - Visas i doc-viewer när subprocess anropas via callActivity

2. **Process Feature Goals:** ✅ Genereras för subprocess-filer (utan callActivities)
   - Non-hierarchical naming (ingen parent)
   - Standalone dokumentation från subprocess-filens perspektiv
   - **Visas i doc-viewer för subprocess-filer**
   - Har Feature Goal-struktur (summary, flowSteps, userStories, dependencies)

3. **File-Level Documentation:** ✅ Genereras för alla filer
   - Innehåller JSON-data för E2E-scenariogenerering
   - **Visas INTE för användaren (Process Feature Goal visas istället för subprocess-filer)**
   - För root-filer: visas i doc-viewer

4. **Root Process Feature Goals:** ✅ Genereras för root-processen
   - Endast när hela hierarkin genereras
   - Non-hierarchical naming
   - Visas i doc-viewer för root-processen

### Status i Koden (2025-01-XX)

**Genereras:**
- ✅ Process Feature Goals genereras för subprocess-filer (rad ~2261-2345)
- ✅ File-level documentation genereras för alla filer (rad ~1892-2116)
- ✅ Process Feature Goals är primär dokumentation för användaren (subprocess-filer)
- ✅ File-level docs är sekundär (bara för E2E-scenarier - JSON-data)

**Nuvarande system:**
- ✅ CallActivity Feature Goals (hierarchical naming med parent)
- ✅ Process Feature Goals (non-hierarchical naming för subprocess-filer)
- ✅ File-level documentation (JSON-data för E2E-scenarier)
- ✅ Root Process Feature Goals (endast för root-processen)

