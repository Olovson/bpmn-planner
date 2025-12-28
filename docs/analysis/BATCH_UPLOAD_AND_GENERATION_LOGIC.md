# Batch-uppladdning och Generering: Logik och Beteende

## Datum: 2025-12-29

## Syfte

Denna analys förklarar hur systemet hanterar batch-uppladdning och generering när alla filer från en mapp (t.ex. `/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29`) laddas upp samtidigt.

---

## Scenario: Alla Filer Laddas Upp Samtidigt

**Exempel:** Användaren laddar upp alla 19 BPMN-filer från mappen:
- `mortgage.bpmn` (root)
- `mortgage-se-application.bpmn` (subprocess)
- `mortgage-se-internal-data-gathering.bpmn` (subprocess)
- ... (17 fler filer)

---

## Steg 1: Uppladdning

### Vad som händer:

1. **Sequential Upload** (`useFileUpload.ts` rad 131-180):
   - Filer laddas upp sekventiellt (en i taget)
   - För varje fil: `uploadMutation.mutateAsync(file)`
   - Efter varje uppladdning: `analyzeAndSuggestMapUpdates()` anropas
   - `bpmn-map.json` uppdateras automatiskt med nya matchningar

2. **bpmn-map.json Generering**:
   - Om `bpmn-map.json` saknas: genereras automatiskt från alla filer
   - Om `bpmn-map.json` finns: uppdateras med nya matchningar
   - Hög konfidens-matchningar accepteras automatiskt

3. **bpmn_dependencies Tabell**:
   - Uppdateras automatiskt när filer laddas upp
   - Identifierar parent-child-relationer mellan filer

---

## Steg 2: Generering

### Alternativ A: "Generera Alla" (Rekommenderat)

**När användaren klickar på "Generera Alla":**

1. **Root-fil Identifieras** (`useFileGeneration.ts` rad 1615-1655):
   ```typescript
   const rootFile = await resolveRootBpmnFile();
   ```
   - Hittar root-filen (t.ex. `mortgage.bpmn`) från `bpmn-map.json` eller `rootFileName`

2. **EN Generering för Hela Hierarkin**:
   ```typescript
   if (rootFile) {
     await handleGenerateArtifacts(rootFile, generationMode, 'file', true);
   }
   ```
   - Genererar **EN gång** för root-filen med `useHierarchy = true`
   - Detta inkluderar automatiskt alla subprocesser i hierarkin

3. **Logik i `handleGenerateArtifacts`** (rad 647-742):
   - `isRootFile = true` (rad 647)
   - `useHierarchy = true` (rad 661)
   - `graphFiles = existingBpmnFiles` (rad 678) - **ALLA filer inkluderas**
   - `isActualRootFile = true` (rad 740)

4. **Logik i `generateAllFromBpmnWithGraph`**:
   - `graphFileScope = existingBpmnFiles` (rad 1482) - **ALLA 19 filer**
   - `isRootFileGeneration = true` (rad 1547-1551) - **Generera för hela hierarkin**
   - `analyzedFiles = graphFileScope` (rad 1559) - **ALLA filer genereras**

### Vad som genereras:

För **varje fil** i hierarkin:

1. **Epic-dokumentation** för alla tasks/epics:
   - `nodes/{fileBaseName}/{elementId}.html`

2. **CallActivity Feature Goals** (hierarchical naming):
   - `feature-goals/{parentBaseName}-{elementId}.html`
   - Genereras för varje callActivity där subprocess-filen finns

3. **File-level documentation**:
   - `{fileBaseName}.html`
   - Genereras för alla filer (root och subprocesser)

4. **Root Process Feature Goal**:
   - `feature-goals/mortgage.html`
   - Genereras **ENDAST** för root-processen (`mortgage.bpmn`)

### Progress-räkning:

- **Total filer:** 19 (alla BPMN-filer)
- **Total noder:** 
  - Antal epics (UserTask, ServiceTask, BusinessRuleTask)
  - Antal callActivities (med subprocess-filer)
  - + 19 file-level docs (en per fil)
  - + 1 Root Process Feature Goal (endast för root)

---

### Alternativ B: "Generera för Varje Fil" (Fallback)

**Om ingen root-fil hittas:**

1. **Loop över Alla Filer** (rad 1678-1708):
   ```typescript
   for (const file of allBpmnFiles) {
     await handleGenerateArtifacts(file, generationMode, 'file', false);
   }
   ```

2. **För varje fil:**
   - `isRootFile = false` (om det inte är root-filen)
   - `isSubprocess = true/false` (beroende på om filen har parent)
   - `useHierarchy = isRootFile || (isSubprocess && parentFile)`
   - `graphFiles` bestäms baserat på filens typ

3. **Problem:**
   - Dubbel generering kan uppstå (samma noder genereras flera gånger)
   - Mindre effektivt än Alternativ A
   - Används bara som fallback om root-fil inte hittas

---

## Exempel: mortgage-se 2025.11.29

### Filer i mappen (19 st):

1. `mortgage.bpmn` (root)
2. `mortgage-se-application.bpmn`
3. `mortgage-se-appeal.bpmn`
4. `mortgage-se-collateral-registration.bpmn`
5. `mortgage-se-credit-decision.bpmn`
6. `mortgage-se-credit-evaluation.bpmn`
7. `mortgage-se-disbursement.bpmn`
8. `mortgage-se-document-generation.bpmn`
9. `mortgage-se-documentation-assessment.bpmn`
10. `mortgage-se-household.bpmn`
11. `mortgage-se-internal-data-gathering.bpmn`
12. `mortgage-se-kyc.bpmn`
13. `mortgage-se-manual-credit-evaluation.bpmn`
14. `mortgage-se-mortgage-commitment.bpmn`
15. `mortgage-se-object-information.bpmn`
16. `mortgage-se-object.bpmn`
17. `mortgage-se-offer.bpmn`
18. `mortgage-se-signing.bpmn`
19. `mortgage-se-stakeholder.bpmn`

### När "Generera Alla" används:

1. **Root-fil identifieras:** `mortgage.bpmn`

2. **EN generering för hela hierarkin:**
   - `graphFileScope = [alla 19 filer]`
   - `isRootFileGeneration = true`
   - `analyzedFiles = [alla 19 filer]`

3. **Filer sorteras** (subprocess-filer före parent-filer):
   - Subprocess-filer genereras först (för aggregerat innehåll)
   - Root-filen genereras sist

4. **För varje fil genereras:**
   - Epic-dokumentation för alla tasks/epics
   - CallActivity Feature Goals (om callActivities finns)
   - File-level documentation

5. **För root-filen (`mortgage.bpmn`) genereras också:**
   - Root Process Feature Goal (`feature-goals/mortgage.html`)

### Total Antal Dokumentationsfiler:

- **Epics:** Antal UserTask + ServiceTask + BusinessRuleTask i alla filer
- **CallActivity Feature Goals:** Antal callActivities med subprocess-filer
- **File-level docs:** 19 (en per fil)
- **Root Process Feature Goal:** 1 (endast för root)

**Exempel:**
- Om det finns 50 epics totalt
- Om det finns 20 callActivities med subprocess-filer
- Total: 50 + 20 + 19 + 1 = **90 dokumentationsfiler**

---

## Viktiga Punkter

### 1. Root-fil Identifiering

**Hur root-filen identifieras:**
- Från `bpmn-map.json` → `orchestration.root_process`
- Från `rootFileName` prop (om satt)
- Fallback: första filen som inte är en subprocess-fil

### 2. Hierarki vs Isolerad Generering

**När `useHierarchy = true`:**
- Root-fil: inkluderar alla filer i hierarkin
- Subprocess-fil: inkluderar parent + subprocess + siblings (för kontext)

**När `useHierarchy = false`:**
- Isolerad generering: bara filen själv

### 3. isRootFileGeneration

**När `isRootFileGeneration = true`:**
- Genererar för **ALLA filer** i hierarkin
- `analyzedFiles = graphFileScope` (alla filer)
- Root Process Feature Goal genereras för root-processen

**När `isRootFileGeneration = false`:**
- Genererar bara för vald fil
- `analyzedFiles = [bpmnFileName]` (bara vald fil)
- Root Process Feature Goal genereras INTE

### 4. File-level Documentation

**Genereras för:**
- ✅ Root-filer
- ✅ Subprocess-filer
- ✅ Alla filer i `analyzedFiles`

**Genereras INTE:**
- ❌ Om filen är tom (inga noder)

### 5. Root Process Feature Goal

**Genereras ENDAST om:**
- ✅ `file === bpmnFileName` (vald fil)
- ✅ `isActualRootFile === true` (explicit flag)
- ✅ `isRootFileGeneration === true` (hierarkisk generering)
- ✅ `isRootProcessFromMapForRoot === true` (root-processen enligt bpmn-map)
- ✅ `!isSubprocessFileForRoot` (INTE en subprocess-fil)

**Genereras INTE för:**
- ❌ Subprocess-filer (även om de laddas upp isolerat)
- ❌ När `isRootFileGeneration === false`

---

## Rekommendationer

### För Batch-uppladdning:

1. **Använd "Generera Alla"** istället för att generera för varje fil individuellt
   - Mer effektivt (en generering istället för 19)
   - Undviker dubbel generering
   - Säkerställer korrekt hierarkisk struktur

2. **Säkerställ att root-filen identifieras korrekt:**
   - Kontrollera att `bpmn-map.json` har `orchestration.root_process` satt
   - Eller sätt `rootFileName` prop explicit

3. **Förvänta dig:**
   - En lång generering (alla filer genereras i en körning)
   - Progress visar totalt antal noder + file-level docs
   - Root Process Feature Goal genereras endast för root-processen

---

## Sammanfattning

| Aspekt | Batch-uppladdning (19 filer) |
|--------|------------------------------|
| **Uppladdning** | Sekventiell (en i taget) |
| **bpmn-map.json** | Uppdateras automatiskt |
| **Generering** | EN generering för hela hierarkin (om root-fil hittas) |
| **Filer som genereras** | Alla 19 filer |
| **File-level docs** | 19 (en per fil) |
| **Root Process Feature Goal** | 1 (endast för root) |
| **CallActivity Feature Goals** | Antal callActivities med subprocess-filer |
| **Epics** | Antal tasks/epics i alla filer |

