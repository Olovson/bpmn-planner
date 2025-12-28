# Analys: Konsolidera till Bara CallActivity Feature Goals

## Syfte

Analysera konsekvenserna av att ta bort Process Feature Goals och ersätta dem med "file-level documentation" för subprocesser, samt skapa en implementeringsplan.

---

## Nuvarande Situation

### Process Feature Goals (Att Ta Bort)

**Genereras:**
- I `bpmnGenerators.ts` rad 2581-2592
- För process-noder i subprocess-filer (inte root)
- Även om `nodesInFile.length === 0` (tomma subprocess-filer)
- Namn: `feature-goals/{baseName}.html` (non-hierarchical)

**Används:**
- I `useAllBpmnNodes.ts` (just nu fixat för att visa länkar)
- I `getDocumentationUrl()` för subprocesser utan elementId (rad 30-37)
- I `DocViewer` för att hitta dokumentation
- I `bpmnDiffRegeneration.ts` för cleanup (rad 700-701)

**Antal i Storage:**
- ~26 Process Feature Goals enligt `scripts/feature-goals-summary.md`

---

## Vad Är "File-Level Documentation"?

### Nuvarande File-Level Documentation (Root-processer)

**Genereras:**
- I `bpmnGenerators.ts` rad 2513-2537, 2730-2853
- Endast för root-processer (inte subprocesser)
- Namn: `{bpmnFile}.html` (t.ex. `mortgage.bpmn.html`)
- Viewer path: `{baseName}` (t.ex. `mortgage`)
- Innehåll: Combined documentation för alla noder i filen

**Format:**
```html
<div class="node-section">
  <span class="node-type">{node.type}</span>
  <h2>{node.name}</h2>
  {node documentation body}
</div>
```

**Struktur:**
- Samlar alla noders dokumentation i en fil
- Varje nod får sin egen sektion
- Ingen Feature Goal-struktur (summary, epics, etc.)
- Enkel samling av Epic-dokumentation för alla tasks

**Används:**
- I `getDocumentationUrl()` för root-processer (rad 40-41)
- Via `getFileDocViewerPath(bpmnFile)`

---

## Förslag: File-Level Documentation för Subprocesser

### Ny Implementation

**Genereras:**
- För subprocess-filer (inte root)
- Namn: `{bpmnFile}.html` (samma format som root)
- Viewer path: `{baseName}` (t.ex. `mortgage-se-application`)
- Innehåll: Combined documentation för alla noder i subprocess-filen
- **INTE** Feature Goal-format, utan samma format som root file-level docs

**Format (samma som root):**
```html
<div class="node-section">
  <span class="node-type">{node.type}</span>
  <h2>{node.name}</h2>
  {node documentation body}
</div>
```

**Skillnad från Process Feature Goals:**
- **Process Feature Goals:** Feature Goal-format (summary, epics, flowSteps, userStories, etc.) - strukturerad Feature Goal-dokumentation
- **File-Level Documentation:** Combined format (alla noder samlade) - enkel samling av Epic-dokumentation

**Fördel:**
- Enhetlig format för både root och subprocesser
- Enklare modell (ingen Process Feature Goal)
- Tydligare: file-level docs = alla noder i filen
- Mindre komplexitet i path-resolution

**Nackdel:**
- Förlorar Feature Goal-struktur (summary, epics, flowSteps)
- File-level docs är mer "rå" samling av Epic-dokumentation
- Mindre strukturerad än Process Feature Goals

---

## Påverkan på Appen

### 1. Dokumentationsgenerering (`bpmnGenerators.ts`)

**Nuvarande:**
- Process Feature Goals genereras i rad 2581-2592
- Använder `getFeatureGoalDocFileKey(file, fileBaseName, undefined, undefined)`
- Genereras även om `nodesInFile.length === 0`

**Efter ändring:**
- Ta bort Process Feature Goal-generering (rad 2581-2592)
- Lägg till file-level documentation för subprocesser (liknande root, men för subprocesser)
- Generera file-level docs även om `nodesInFile.length === 0` (för tomma subprocesser)

**Filer att ändra:**
- `src/lib/bpmnGenerators.ts` (rad 2581-2592, 2513-2537)

---

### 2. Node Matrix (`useAllBpmnNodes.ts`)

**Nuvarande:**
- Kollar Process Feature Goal paths för callActivities (just fixat)
- Använder `getFeatureGoalDocStoragePaths()` med Process Feature Goal paths

**Efter ändring:**
- Ta bort Process Feature Goal path-checking (rad 321-336)
- Kolla bara CallActivity Feature Goal paths
- För subprocesser utan callActivities: använd file-level documentation

**Filer att ändra:**
- `src/hooks/useAllBpmnNodes.ts` (rad 321-336, 205-220)

---

### 3. Documentation URLs (`artifactUrls.ts`)

**Nuvarande:**
- `getDocumentationUrl()` för subprocesser utan elementId länkar till Process Feature Goal (rad 30-37)
- Använder `getFeatureGoalDocFileKey(bpmnFile, processElementId)` utan parent

**Efter ändring:**
- För subprocesser utan elementId: länka till file-level documentation
- Använd `getFileDocViewerPath(bpmnFile)` (samma som root)

**Filer att ändra:**
- `src/lib/artifactUrls.ts` (rad 16-42)

---

### 4. DocViewer (`DocViewer.tsx`)

**Nuvarande:**
- Kan hitta Process Feature Goals via `feature-goals/{baseName}` paths
- Hanterar både CallActivity Feature Goals och Process Feature Goals

**Efter ändring:**
- Ta bort Process Feature Goal path-resolution
- Hantera bara CallActivity Feature Goals och file-level documentation
- File-level docs använder samma path-format som root

**Filer att ändra:**
- `src/pages/DocViewer.tsx` (rad 126-134+)

---

### 5. File Generation (`useFileGeneration.ts`)

**Nuvarande:**
- `extractBpmnFileFromDocFileName()` hanterar Process Feature Goals (rad 1075-1241)
- Matchar `feature-goals/{baseName}.html` till subprocess-filer

**Efter ändring:**
- Ta bort Process Feature Goal matching-logik
- File-level docs använder `{bpmnFile}.html` format (samma som root)
- Enklare matching: `{bpmnFile}.html` → `{bpmnFile}.bpmn`

**Filer att ändra:**
- `src/pages/BpmnFileManager/hooks/useFileGeneration.ts` (rad 1075-1241)

---

### 6. Diff Regeneration (`bpmnDiffRegeneration.ts`)

**Nuvarande:**
- Cleanup för Process Feature Goals (rad 700-701)
- Använder Process Feature Goal paths

**Efter ändring:**
- Ta bort Process Feature Goal cleanup
- Lägg till cleanup för file-level documentation (samma som root)

**Filer att ändra:**
- `src/lib/bpmnDiffRegeneration.ts` (rad 700-701)

---

### 7. Test Generation (`testGenerators.ts`)

**Nuvarande:**
- Kollar Process Feature Goals för callActivities (rad 114-139)
- Använder `getFeatureGoalDocStoragePaths()` med Process Feature Goal paths

**Efter ändring:**
- Ta bort Process Feature Goal path-checking
- Kolla bara CallActivity Feature Goal paths

**Filer att ändra:**
- `src/lib/testGenerators.ts` (rad 114-139)

---

## Risker och Utmaningar

### Risk 1: Subprocesser Utan CallActivities

**Problem:**
- Process Feature Goals genereras även om inga callActivities pekar på subprocess-filen
- Vad händer med subprocesser som laddas upp men inte används än?

**Nuvarande beteende:**
- Process Feature Goal genereras för subprocess-filen (rad 2581-2592)
- Dokumentation finns även om ingen callActivity använder subprocessen

**Efter ändring:**
- File-level documentation genereras för subprocess-filen
- Dokumentation finns även om ingen callActivity använder subprocessen
- **Lösning:** ✅ Ingen risk - file-level docs fungerar likadant

---

### Risk 2: Tomma Subprocess-filer

**Problem:**
- Process Feature Goals genereras även om `nodesInFile.length === 0`
- Vad händer med tomma subprocess-filer?

**Nuvarande beteende:**
- Process Feature Goal genereras (rad 2580-2592)
- Dokumentation finns även för tomma filer

**Efter ändring:**
- File-level documentation genereras (samma logik som root)
- Dokumentation finns även för tomma filer
- **Lösning:** ✅ Ingen risk - file-level docs fungerar likadant

---

### Risk 3: Befintlig Dokumentation i Storage

**Problem:**
- ~26 Process Feature Goals finns redan i Storage
- Vad händer med dessa när vi tar bort Process Feature Goals?

**Status:**
- ✅ **Ingen risk** - Dokumentation kommer att genereras om efter implementering
- Befintlig dokumentation är "så gott som borttaget ändå efter senaste misslyckanden"
- Nya Process Feature Goals kommer inte att genereras, gamla kan ignoreras eller tas bort

**Lösning:**
- **Ingen migrering behövs** - Generera om dokumentationen efter implementering
- Gamla Process Feature Goals kan tas bort eller ignoreras (de kommer inte användas)
- Nya file-level docs kommer genereras automatiskt vid nästa dokumentationsgenerering

---

### Risk 4: Namngivningskonflikt

**Problem:**
- Process Feature Goal: `feature-goals/mortgage-se-application.html`
- File-level doc: `mortgage-se-application.bpmn.html` (eller `mortgage-se-application.html`?)

**Risk:**
- Konflikt om båda finns samtidigt
- Förvirring om vilken som ska användas

**Lösning:**
- File-level docs använder `{bpmnFile}.html` format (samma som root)
- Process Feature Goals använder `feature-goals/{baseName}.html`
- **Ingen konflikt** - olika paths

---

### Risk 5: CallActivity Feature Goals vs File-Level Docs

**Problem:**
- CallActivity Feature Goal: `feature-goals/mortgage-se-application-internal-data-gathering.html`
- File-level doc för subprocess: `mortgage-se-internal-data-gathering.bpmn.html`

**Fråga:**
- Vilken ska användas när användaren klickar på callActivity i Node Matrix?

**Nuvarande:**
- CallActivity Feature Goal (hierarchical naming)
- Process Feature Goal som fallback (just fixat)

**Efter ändring:**
- CallActivity Feature Goal (hierarchical naming)
- File-level doc som fallback (för subprocesser)

**Lösning:**
- ✅ Ingen risk - CallActivity Feature Goal prioriteras
- File-level doc är fallback (samma som Process Feature Goal nu)

---

### Risk 6: UI-komplexitet

**Problem:**
- UI måste hantera både CallActivity Feature Goals och file-level docs
- Ytterligare komplexitet i path-resolution

**Risk:**
- Buggar i path-resolution
- Användare kan inte hitta dokumentation

**Lösning:**
- Enklare modell: bara CallActivity Feature Goals + file-level docs
- Mindre komplexitet än nuvarande (Process Feature Goals + CallActivity Feature Goals)
- **Faktiskt en förbättring** - enklare än nuvarande

---

## Detaljerad Fil-lista för Ändringar

### Filer som Måste Ändras

**1. Dokumentationsgenerering:**
- `src/lib/bpmnGenerators.ts` (rad 2581-2592, 1809, 1930-1938, 2513-2537)
  - Ta bort Process Feature Goal-generering
  - Lägg till file-level documentation för subprocesser
  - Ta bort `generatedSubprocessFeatureGoals` Set
  - Uppdatera `skipDocGeneration` logik

**2. UI och Navigation:**
- `src/hooks/useAllBpmnNodes.ts` (rad 321-336, 205-220)
  - Ta bort Process Feature Goal path-checking
  - Uppdatera `documentationUrl` för callActivities
  - Lägg till file-level doc path-checking

- `src/lib/artifactUrls.ts` (rad 16-42)
  - Uppdatera `getDocumentationUrl()` för subprocesser
  - Använd `getFileDocViewerPath()` istället för Process Feature Goal path

- `src/pages/DocViewer.tsx` (rad 126-300+)
  - Ta bort Process Feature Goal path-resolution
  - Lägg till file-level doc path-resolution

**3. File Generation:**
- `src/pages/BpmnFileManager/hooks/useFileGeneration.ts` (rad 1075-1241)
  - Ta bort Process Feature Goal matching-logik
  - Lägg till file-level doc matching-logik

**4. Diff Regeneration:**
- `src/lib/bpmnDiffRegeneration.ts` (rad 700-701)
  - Ta bort Process Feature Goal cleanup
  - Lägg till file-level doc cleanup

**5. Test Generation:**
- `src/lib/testGenerators.ts` (rad 114-139)
  - Ta bort Process Feature Goal path-checking

**6. Övriga:**
- `src/lib/nodeArtifactPaths.ts` (kommentarer, rad 34, 71)
  - Uppdatera kommentarer om Process Feature Goals

---

## Implementeringsplan

### Fas 1: Förberedelse (1-2 timmar)

**1.1 Inventera befintlig dokumentation**
- [ ] Lista alla Process Feature Goals i Storage
- [ ] Identifiera vilka subprocess-filer som har Process Feature Goals
- [ ] Dokumentera antal filer som behöver migreras

**1.2 (Valfritt) Backup**
- [ ] (Valfritt) Backup av alla Process Feature Goals i Storage
- [ ] Dokumentera backup-location
- **Notera:** Ingen migrering behövs - dokumentation kommer genereras om efter implementering

---

### Fas 2: Kodändringar - Generering (2-3 timmar)

**2.1 Ta bort Process Feature Goal-generering**
- [ ] Ta bort Process Feature Goal-generering i `bpmnGenerators.ts` (rad 2581-2592)
  - Ta bort hela `if (isSubprocessFileForSubprocess && processNodeForFileForSubprocess...)` blocket
  - Ta bort `subprocessFeatureDocPath` logik
  - Ta bort `renderDocWithLlm('feature', ...)` för Process Feature Goals
- [ ] Ta bort `generatedSubprocessFeatureGoals` Set (rad 1809)
  - Ta bort Set-deklarationen
  - Ta bort alla `.add()` och `.has()` anrop
- [ ] Ta bort `skipDocGeneration` logik för Process Feature Goals (rad 1930-1938)
  - Ta bort `subprocessAlreadyGenerated` check
  - Förenkla `skipDocGeneration` logik (bara för tasks/epics)

**2.2 Lägg till file-level documentation för subprocesser**
- [ ] Modifiera file-level doc-generering (rad 2513-2537) för att inkludera subprocesser
  - Ändra `isSubprocessFileForRoot` check till att INTE exkludera subprocesser
  - Eller skapa separat logik för subprocess file-level docs
- [ ] Säkerställ att file-level docs genereras även om `nodesInFile.length === 0`
  - Uppdatera tom fil-hantering (rad 2538-2564) för subprocesser
- [ ] Testa generering för subprocess-filer
  - Testa med subprocess-fil med noder
  - Testa med tom subprocess-fil

**2.3 Uppdatera path-logik**
- [ ] Uppdatera `getFileDocViewerPath()` om nödvändigt
  - Verifiera att den fungerar för både root och subprocesser
- [ ] Säkerställ att file-level docs använder samma format som root
  - Filnamn: `{bpmnFile}.html` (t.ex. `mortgage-se-application.bpmn.html`)
  - Viewer path: `{baseName}` (t.ex. `mortgage-se-application`)

---

### Fas 3: Kodändringar - UI och Navigation (2-3 timmar)

**3.1 Uppdatera `useAllBpmnNodes.ts`**
- [ ] Ta bort Process Feature Goal path-checking (rad 321-336)
  - Ta bort `processFeatureGoalKey` logik
  - Ta bort `featureGoalPaths.push(...)` för Process Feature Goals
- [ ] Uppdatera `documentationUrl` för callActivities (rad 205-220)
  - Ta bort Process Feature Goal viewer path-logik
  - Använd CallActivity Feature Goal viewer path direkt
  - Eller behåll CallActivity Feature Goal path (hierarchical)
- [ ] Lägg till file-level doc path-checking för subprocesser utan callActivities
  - För subprocesser utan callActivities: kolla file-level doc paths
  - Använd `getFileDocViewerPath(bpmnFile)` för viewer path

**3.2 Uppdatera `artifactUrls.ts`**
- [ ] Uppdatera `getDocumentationUrl()` för subprocesser (rad 30-37)
  - Ta bort Process Feature Goal path-logik
  - Använd `getFileDocViewerPath(bpmnFile)` istället (samma som root)
- [ ] Testa att länkar fungerar korrekt

**3.3 Uppdatera `DocViewer.tsx`**
- [ ] Ta bort Process Feature Goal path-resolution (rad 126-300+)
  - Ta bort `isProcessNode` check för Process Feature Goals
  - Ta bort Process Feature Goal path-building
- [ ] Lägg till file-level doc path-resolution för subprocesser
  - För file-level docs (inte `nodes/` paths): använd `getFileDocViewerPath()` format
  - Lägg till paths: `docs/claude/{bpmnFile}/{versionHash}/{bpmnFile}.html`
  - Lägg till paths: `docs/claude/{bpmnFile}.html`
- [ ] Testa att dokumentation visas korrekt
  - Testa file-level docs för subprocesser
  - Testa CallActivity Feature Goals

---

### Fas 4: Kodändringar - Övriga Filer (1-2 timmar)

**4.1 Uppdatera `useFileGeneration.ts`**
- [ ] Ta bort Process Feature Goal matching-logik (rad 1075-1241)
  - Ta bort `feature-goals/{baseName}.html` matching
  - Ta bort Process Feature Goal path-extraction
- [ ] Lägg till file-level doc matching-logik
  - Matcha `{bpmnFile}.html` format (t.ex. `mortgage-se-application.bpmn.html`)
  - Extrahera BPMN-fil från file-level doc filename
- [ ] Testa file upload och generation
  - Verifiera att file-level docs matchas korrekt
  - Verifiera att CallActivity Feature Goals matchas korrekt

**4.2 Uppdatera `bpmnDiffRegeneration.ts`**
- [ ] Ta bort Process Feature Goal cleanup (rad 700-701)
  - Ta bort `node.nodeType === 'process'` cleanup för Process Feature Goals
- [ ] Lägg till file-level doc cleanup
  - För subprocess-filer: ta bort file-level docs när filen tas bort
  - Använd `{bpmnFile}.html` format
- [ ] Testa diff regeneration
  - Verifiera att file-level docs tas bort korrekt

**4.3 Uppdatera `testGenerators.ts`**
- [ ] Ta bort Process Feature Goal path-checking (rad 114-139)
  - Ta bort Process Feature Goal path-building för callActivities
  - Kolla bara CallActivity Feature Goal paths
- [ ] Testa test generation
  - Verifiera att test generation fungerar utan Process Feature Goals

---

### Fas 5: Rensa Gamla Process Feature Goals (0.5-1 timme)

**5.1 (Valfritt) Ta bort Process Feature Goals från Storage**
- [ ] Lista alla Process Feature Goals i Storage
- [ ] (Valfritt) Skapa backup först
- [ ] Ta bort Process Feature Goals från Storage
  - Eller behåll dem som backup tills vidare (de kommer inte användas)
- [ ] Dokumentera att gamla Process Feature Goals kan ignoreras

**Notera:**
- Ingen migrering behövs - dokumentation kommer genereras om efter implementering
- Gamla Process Feature Goals kommer inte användas av nya koden
- Nya file-level docs kommer genereras automatiskt vid nästa dokumentationsgenerering

---

### Fas 6: Testning (2-3 timmar)

**6.1 Enhetstester**
- [ ] Testa dokumentationsgenerering för subprocess-filer
- [ ] Testa file-level doc-generering
- [ ] Testa CallActivity Feature Goal-generering

**6.2 Integrationstester**
- [ ] Testa Node Matrix länkar
- [ ] Testa DocViewer för både CallActivity Feature Goals och file-level docs
- [ ] Testa file upload och generation

**6.3 Manuell testning**
- [ ] Ladda upp subprocess-fil utan callActivities
- [ ] Verifiera att file-level doc genereras
- [ ] Verifiera att länkar fungerar i UI
- [ ] Generera om dokumentation för att verifiera att file-level docs skapas korrekt

---

### Fas 7: Dokumentation (1 timme)

**7.1 Uppdatera dokumentation**
- [ ] Uppdatera `docs/analysis/WHY_TWO_FEATURE_GOAL_TYPES.md`
- [ ] Dokumentera ny file-level doc-struktur
- [ ] Uppdatera README om dokumentationsstruktur

**7.2 Uppdatera kommentarer**
- [ ] Uppdatera kommentarer i kod
- [ ] Ta bort referenser till Process Feature Goals
- [ ] Lägg till kommentarer om file-level docs för subprocesser

---

## Tidsestimering

**Totalt:** 10-15 timmar

- Fas 1: Förberedelse - 1-2 timmar
- Fas 2: Generering - 2-3 timmar
- Fas 3: UI och Navigation - 2-3 timmar
- Fas 4: Övriga Filer - 1-2 timmar
- Fas 5: Rensa Gamla Process Feature Goals - 0.5-1 timme (valfritt)
- Fas 6: Testning - 2-3 timmar
- Fas 7: Dokumentation - 1 timme

**Buffer:** +2-3 timmar för oförutsedda problem

**Notera:** Tidsestimeringen är reducerad eftersom migrering inte behövs - dokumentation kommer genereras om efter implementering.

---

## Riskbedömning

### Låg Risk ✅
- Subprocesser utan callActivities: File-level docs fungerar likadant
- Tomma subprocess-filer: File-level docs fungerar likadant
- UI-komplexitet: Faktiskt enklare än nuvarande

### Medium Risk ⚠️
- Namngivningskonflikt: Olika paths, ingen konflikt
- CallActivity Feature Goals vs File-Level Docs: CallActivity prioriteras, file-level är fallback

### Ingen Risk ✅
- Befintlig dokumentation: Kommer genereras om efter implementering, ingen migrering behövs

### Hög Risk ❌
- **Inga höga risker identifierade**

---

## Rekommendationer

### 1. Hantering av Befintlig Dokumentation

**Strategi: Generera Om Dokumentationen**
- Ingen migrering behövs - dokumentation kommer genereras om efter implementering
- Gamla Process Feature Goals kan ignoreras eller tas bort (de kommer inte användas)
- Nya file-level docs kommer genereras automatiskt vid nästa dokumentationsgenerering
- **Fördel:** Enklare, ingen komplex migreringslogik behövs

**Rekommendation:** Generera om dokumentationen efter implementering

---

### 2. Rollback-plan

**Om något går fel:**
1. Återställ kod från git
2. Process Feature Goals finns kvar i Storage (om inte raderade)
3. Systemet fungerar som innan

**Säkerhetsåtgärder:**
- Feature flag för att aktivera/avaktivera ny logik (valfritt)
- Gradvis rollout (testa på en fil först)
- Dokumentation kommer genereras om efter implementering

---

### 3. Testning

**Kritiska testfall:**
1. ✅ Subprocess-fil utan callActivities → file-level doc genereras
2. ✅ CallActivity med subprocess → CallActivity Feature Goal genereras
3. ✅ Tom subprocess-fil → file-level doc genereras
4. ✅ Node Matrix länkar fungerar
5. ✅ DocViewer visar dokumentation korrekt
6. ✅ Generera om dokumentation för att verifiera att file-level docs skapas korrekt

---

## Ytterligare Överväganden

### Skillnad i Innehåll: Process Feature Goals vs File-Level Docs

**Process Feature Goals (nuvarande):**
- Strukturerad Feature Goal-dokumentation
- Innehåll: summary, epics, flowSteps, userStories, prerequisites, dependencies
- Genereras med LLM (Claude) med Feature Goal-prompt
- Rik kontext och strukturerad information

**File-Level Documentation (förslag):**
- Combined format: samling av alla noders Epic-dokumentation
- Innehåll: varje nod får sin egen sektion (UserTask, ServiceTask, etc.)
- Genereras från individuella Epic-dokumentation
- Mindre strukturerad, mer "rå" samling

**Konsekvens:**
- Process Feature Goals ger mer värdefull, strukturerad dokumentation
- File-Level Docs ger enklare, mer "rå" samling
- **Förlust av Feature Goal-struktur** för subprocesser utan callActivities

**Lösning:**
- För subprocesser **med** callActivities: CallActivity Feature Goal ger strukturerad dokumentation
- För subprocesser **utan** callActivities: File-level docs ger basic dokumentation
- **Alternativ:** Generera Feature Goal-format även för file-level docs (kräver mer arbete)

---

## Slutsats

**Konsolidering till bara CallActivity Feature Goals är:**
- ✅ **Säkert:** Inga höga risker identifierade
- ✅ **Genomförbart:** Tydlig implementeringsplan
- ✅ **Förbättring:** Enklare modell, mindre komplexitet
- ⚠️ **Kräver arbete:** 10-16 timmar, migrering av befintlig data
- ⚠️ **Förlust av struktur:** File-level docs är mindre strukturerade än Process Feature Goals

**Rekommendation:** 
- **Fortsätt med implementeringen** enligt planen ovan
- **Överväg:** Generera Feature Goal-format även för file-level docs (kräver mer arbete men behåller struktur)
- **Alternativ:** Behåll Process Feature Goals men gör dem valfria (generera bara om ingen callActivity finns)

---

## Ytterligare Risk: Förlust av Feature Goal-struktur

**Problem:**
- Process Feature Goals ger strukturerad Feature Goal-dokumentation (summary, epics, flowSteps)
- File-Level Docs ger bara combined Epic-dokumentation (mindre strukturerad)

**Konsekvens:**
- Subprocesser utan callActivities får mindre strukturerad dokumentation
- Förlorar Feature Goal-perspektiv (summary, epics, userStories)

**Lösning:**
- **Alternativ A:** Acceptera förlusten - file-level docs är tillräckligt för subprocesser utan callActivities
- **Alternativ B:** Generera Feature Goal-format även för file-level docs (kräver mer arbete)
- **Alternativ C:** Behåll Process Feature Goals men gör dem valfria (generera bara om ingen callActivity finns)

**Rekommendation:** Alternativ A (Acceptera förlusten) - file-level docs är tillräckligt för subprocesser utan callActivities, och CallActivity Feature Goals ger strukturerad dokumentation när det behövs.

