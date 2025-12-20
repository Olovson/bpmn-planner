# Analys: Progressions Popup och Generation Progress Popup

## Problem 1: Progressions Popup på Files Sidan

### Nuvarande Situation

**Problem:**
- Progressions popupen på files sidan räknar fel vilka leaf nodes och subprocesser som hör till en specifik process
- Den räknar fel och slutar inte när den skall
- Användaren misstänker att logik har duplicerats istället för att återanvända befintlig logik

### Nuvarande Implementation

**Fil:** `src/hooks/useFileArtifactCoverage.ts`

**Hur coverage räknas:**
1. **För dokumentation (`docs`):**
   - Räknar noder från `bpmn_element_documentation` tabellen
   - Filtrerar på `bpmn_file = fileName`
   - Räknar `COUNT(*)` som `total`
   - Räknar noder med `generated_at IS NOT NULL` som `covered`

2. **För tester (`tests`):**
   - Räknar noder från `hierarchical_tests` tabellen
   - Filtrerar på `bpmn_file = fileName`
   - Räknar `COUNT(*)` som `total`
   - Räknar noder med `test_file_path IS NOT NULL` som `covered`

**Problem identifierat:**
- Räknar bara noder som finns i databasen för den specifika filen
- Räknar INTE rekursivt leaf nodes och subprocesser som hör till processen
- Om en process har subprocesser, räknas inte noder från subprocesserna
- Om en process har nested subprocesser, räknas inte noder från nested subprocesserna

**Exempel:**
- Process: `mortgage-se-application.bpmn`
  - Har subprocess: `mortgage-se-object.bpmn`
    - Har subprocess: `mortgage-se-object-information.bpmn`
      - Har leaf nodes: Fetch fastighets-information, Fetch bostadsrätts-information, etc.
- **Nuvarande beteende:** Räknar bara noder direkt i `mortgage-se-application.bpmn`
- **Förväntat beteende:** Räknar alla noder rekursivt (inklusive subprocesser och leaf nodes)

### Befintlig Logik som Kan Återanvändas

**1. `buildBpmnProcessGraph` (`src/lib/bpmnProcessGraph.ts`)**
- Bygger en komplett processgraf med alla noder rekursivt
- Innehåller `allNodes` Map med alla noder
- Innehåller `fileNodes` Map med noder per fil
- **Kan användas för att räkna alla noder som hör till en process**

**2. `getTestableNodes` (`src/lib/bpmnProcessGraph.ts`)**
- Returnerar alla testbara noder från en graf
- Filtrerar på `userTask`, `serviceTask`, `businessRuleTask`, `callActivity`
- **Kan användas för att räkna testbara noder**

**3. `collectDescendants` (`src/lib/documentationContext.ts`)**
- Samlar alla descendant nodes rekursivt
- Används redan för `childrenDocumentation` i LLM-generering
- **Kan användas för att räkna alla descendant nodes för en process**

**4. `createGraphSummary` (`src/lib/bpmnProcessGraph.ts`)**
- Skapar en sammanfattning av grafen
- Räknar `totalNodes` från `graph.allNodes.size`
- **Kan användas för att räkna totala antalet noder**

**5. ProcessTree-hierarki (`src/lib/bpmn/processTreeBuilder.ts`, `src/lib/processTree.ts`)**
- Bygger en hierarkisk trädstruktur
- Innehåller alla noder rekursivt med `children`
- **Kan användas för att räkna alla noder i en process**

### Rekommenderad Lösning

**Återanvänd befintlig logik:**
1. Använd `buildBpmnProcessGraph` för att bygga processgraf för filen
2. Använd `getTestableNodes` eller `collectDescendants` för att få alla noder som hör till processen
3. Räknar noder från denna graf istället för att bara räkna från databasen

**Exempel på implementation:**
```typescript
// I useFileArtifactCoverage.ts
const graph = await buildBpmnProcessGraph(fileName, existingBpmnFiles);
const allNodesForProcess = collectDescendants(graph.root);
const testableNodes = getTestableNodes(graph);

// Räknar totala antalet noder som hör till processen
const totalNodes = allNodesForProcess.length;
// eller
const totalTestableNodes = testableNodes.filter(node => 
  node.bpmnFile === fileName || 
  isDescendantOf(graph, node, fileName)
).length;
```

---

## Problem 2: Generation Progress Popup

### Nuvarande Situation

**Problem:**
- Popupen har återställts till en gammal version
- Användaren gillade procent-laddaren som fanns tidigare
- Nu står det "Steg 4 av 9" och "Dokumentation 2 av 3 noder" vilket är förvirrande
- Det verkar stå referenser till "testinstruktioner" som inte längre är relevanta

### Nuvarande Implementation

**Fil:** `src/pages/BpmnFileManager.tsx`

**Vad popupen visar nu:**
1. **Steg-räknare:**
   - `Steg ${jobProgressCount} av ${jobTotalCount}`
   - Uppdateras via `incrementJobProgress`
   - Initieras med `JOB_PHASE_TOTAL` (9 steg)
   - Kan ökas via `ensureJobTotal` när `total:init` får information

2. **Dokumentation-räknare:**
   - `Dokumentation ${docgenCompleted} av ${graphTotals.nodes}`
   - Uppdateras via `setDocgenProgress`
   - Initieras från `total:init` med `nodes` från `testableNodes.length`

3. **Text:**
   - "Genererar dokumentation/testinstruktioner" (rad 1124)
   - "Pågående steg: Genererar dokumentation/testinstruktioner" (rad 3575)

**Problem identifierat:**

1. **Förvirrande steg-räknare:**
   - "Steg 4 av 9" är inte tydligt vad det betyder
   - Användaren förstår inte vad steg 4 är eller vad de 9 stegen är
   - Tidigare fanns en procent-laddare som var tydligare

2. **Förvirrande nod-räknare:**
   - "Dokumentation 2 av 3 noder" är inte tydligt
   - Användaren förstår inte om det är 2 av 3 filer eller 2 av 3 noder
   - Saknar kontext om vad som räknas

3. **Felaktig text:**
   - "Genererar dokumentation/testinstruktioner" är felaktigt
   - Testinstruktioner genereras inte längre (separat process)
   - Borde vara "Genererar dokumentation" eller liknande

4. **Saknad procent-laddare:**
   - Användaren gillade procent-laddaren som fanns tidigare
   - Nu finns bara steg-räknare och nod-räknare
   - Procent-laddare är mer intuitivt för användaren

### Vad Användaren Vill Ha

**Baserat på användarens feedback:**
1. **Procent-laddare** (som fanns tidigare)
2. **Tydligare progress-information**
3. **Inga referenser till "testinstruktioner"**
4. **Tydligare vad som räknas** (filer vs noder)

### Befintlig Logik som Kan Återanvändas

**1. `Progress` komponent (`src/components/ui/progress.tsx`)**
- Redan implementerad Radix UI Progress komponent
- Tar `value` prop (0-100)
- **Kan användas för procent-laddare**

**2. Progress-beräkning i `bpmnGenerators.ts`:**
- `reportProgress` callback används för att rapportera progress
- Skickar `total:init` med `files` och `nodes`
- **Kan användas för att beräkna procent**

**3. Job progress tracking:**
- `GenerationJob` har `progress` och `total` fält
- Uppdateras via `updateGenerationJob`
- **Kan användas för att beräkna procent**

### Rekommenderad Lösning

**Återställ procent-laddare:**
1. Använd `Progress` komponenten med `value` baserat på total progress
2. Beräkna procent: `(completed / total) * 100`
3. Visa tydlig text: "Genererar dokumentation" (utan "testinstruktioner")
4. Visa tydlig progress: "X% klar" eller "X av Y noder (Z%)"

**Exempel på implementation:**
```tsx
<Progress value={(docgenProgress.completed / docgenProgress.total) * 100} />
<p className="text-sm">
  {docgenProgress.completed} av {docgenProgress.total} noder (
  {Math.round((docgenProgress.completed / docgenProgress.total) * 100)}%)
</p>
```

---

## Jämförelse: Nuvarande vs Förväntat

### Progressions Popup (Files Sidan)

| Aspekt | Nuvarande | Förväntat |
|--------|-----------|-----------|
| **Räknar noder** | Bara noder direkt i filen | Alla noder rekursivt (inklusive subprocesser) |
| **Räknar leaf nodes** | Nej | Ja |
| **Räknar subprocesser** | Nej | Ja |
| **Använder befintlig logik** | Nej (duplicerad logik) | Ja (återanvänder `buildBpmnProcessGraph`, etc.) |
| **Slutar när den skall** | Nej (räknar fel) | Ja (räknar korrekt) |

### Generation Progress Popup

| Aspekt | Nuvarande | Förväntat |
|--------|-----------|-----------|
| **Visar progress** | Steg-räknare ("Steg 4 av 9") | Procent-laddare ("75% klar") |
| **Visar nod-progress** | "Dokumentation 2 av 3 noder" | "2 av 3 noder (67%)" eller liknande |
| **Text** | "Genererar dokumentation/testinstruktioner" | "Genererar dokumentation" |
| **Tydlighet** | Förvirrande (vad är steg 4?) | Tydlig (procent är intuitivt) |

---

## Identifierade Problem

### Problem 1: Progressions Popup - Duplicerad Logik

**Nuvarande implementation:**
- Räknar noder direkt från databasen (`bpmn_element_documentation`, `hierarchical_tests`)
- Räknar bara noder för specifik fil (`bpmn_file = fileName`)
- Räknar INTE rekursivt subprocesser och leaf nodes

**Befintlig logik som kan återanvändas:**
- `buildBpmnProcessGraph` - bygger komplett processgraf
- `getTestableNodes` - returnerar alla testbara noder
- `collectDescendants` - samlar alla descendant nodes rekursivt
- `createGraphSummary` - räknar totala antalet noder

**Rekommendation:**
- Återanvänd `buildBpmnProcessGraph` för att bygga processgraf
- Använd `collectDescendants` eller `getTestableNodes` för att räkna alla noder
- Räknar noder från grafen istället för bara från databasen

### Problem 2: Generation Progress Popup - Återställd till Gammal Version

**Nuvarande implementation:**
- Visar "Steg X av Y" (förvirrande)
- Visar "Dokumentation X av Y noder" (förvirrande)
- Text: "Genererar dokumentation/testinstruktioner" (felaktigt)
- Saknar procent-laddare (som användaren gillade)

**Befintlig logik som kan återanvändas:**
- `Progress` komponenten finns redan
- `reportProgress` callback används redan
- `GenerationJob` har `progress` och `total` fält

**Rekommendation:**
- Återställ procent-laddare med `Progress` komponenten
- Beräkna procent: `(completed / total) * 100`
- Uppdatera text: "Genererar dokumentation" (utan "testinstruktioner")
- Visa tydlig progress: "X av Y noder (Z%)"

---

## Sammanfattning

### Progressions Popup (Files Sidan)
- **Problem:** Räknar fel vilka noder som hör till en process
- **Orsak:** Duplicerad logik som bara räknar noder direkt i filen, inte rekursivt
- **Lösning:** Återanvänd `buildBpmnProcessGraph` och `collectDescendants` för att räkna alla noder rekursivt

### Generation Progress Popup
- **Problem:** Återställd till gammal version, saknar procent-laddare, förvirrande text
- **Orsak:** Okänt (möjligen återställd efter buggfix)
- **Lösning:** Återställ procent-laddare, uppdatera text, gör progress-information tydligare

### Gemensamt Problem
- **Duplicerad logik:** Progressions popupen har duplicerad logik istället för att återanvända befintlig logik
- **Rekommendation:** Återanvänd befintlig logik från `buildBpmnProcessGraph`, `getTestableNodes`, `collectDescendants`, etc.
