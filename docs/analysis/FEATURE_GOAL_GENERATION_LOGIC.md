# Feature Goal-generering: Logik och Syfte

## Översikt

För en subprocess-fil (t.ex. `mortgage-se-internal-data-gathering.bpmn`) kan det genereras **upp till 3 olika filer** beroende på kontext:

1. **CallActivity Feature Goal** (hierarchical naming)
2. **Process Feature Goal** (non-hierarchical naming)
3. **File-level documentation** (JSON-data för E2E-scenarier)

---

## 1. CallActivity Feature Goal

### När genereras?
- **Endast** när en `callActivity` i en **parent-process** anropar subprocessen
- **Endast** i **batch-generering** (när flera filer genereras samtidigt)

### Var i koden?
- `src/lib/bpmnGenerators.ts`, rad 1289-1424
- Genereras när `node.type === 'callActivity'` och `node.subprocessFile` finns

### Filnamn
- Format: `feature-goals/{parentBaseName}-{elementId}.html`
- Exempel: `feature-goals/mortgage-se-application-internal-data-gathering.html`
- **Hierarchical naming** (med parent-process i namnet)

### Innehåll
- **Genereras med LLM** (Claude) via `renderDocWithLlm('feature', nodeContext, ...)`
- **Kontext**: CallActivity-noden i parent-processen
- **Perspektiv**: Subprocessen sett från parent-processens synvinkel
- **Kan inkludera**: Parent-kontext, instans-specifik information

### Används när?
- När användaren klickar på en callActivity i parent-processen
- Visas i doc-viewer: `#/doc-viewer/feature-goals/{parent}-{elementId}`

---

## 2. Process Feature Goal

### När genereras?
- **Alltid** för subprocess-filer som:
  - Har en process-nod
  - **INGA** callActivities (annars genereras Feature Goal via callActivity)
- Genereras i **både isolerad och batch-generering**

### Var i koden?
- `src/lib/bpmnGenerators.ts`, rad 2221-2321
- Genereras när `shouldGenerateProcessFeatureGoal === true`

### Filnamn
- Format: `feature-goals/{fileBaseName}.html`
- Exempel: `feature-goals/mortgage-se-internal-data-gathering.html`
- **Non-hierarchical naming** (ingen parent i namnet)

### Innehåll
- **Genereras med LLM** (Claude) via `renderDocWithLlm('feature', subprocessContext, ...)`
- **Kontext**: Process-noden i subprocess-filen
- **Perspektiv**: Subprocessen som standalone (utan parent-kontext)
- **Inkluderar**: Alla tasks/epics i subprocess-filen

### Används när?
- När användaren går direkt till subprocess-filen i doc-viewer
- Visas i doc-viewer: `#/doc-viewer/feature-goals/{fileBaseName}`

---

## 3. File-level Documentation

### När genereras?
- **Alltid** för alla filer (root och subprocesser)
- Genereras i **både isolerad och batch-generering**

### Var i koden?
- `src/lib/bpmnGenerators.ts`, rad 1853-2050
- Genereras för varje fil i `analyzedFiles`

### Filnamn
- Format: `{fileBaseName}.html`
- Exempel: `mortgage-se-internal-data-gathering.html`

### Innehåll
- **HTML** med **JSON-data embeddad** (`enhancedJsonData`)
- JSON-data innehåller:
  - `summary`: Sammanfattning av processen
  - `flowSteps`: Flödessteg
  - `userStories`: User stories
  - `dependencies`: Beroenden
- **Används INTE för användaren** - bara för E2E-scenariogenerering

### Används när?
- **Läses av E2E-scenariogenerator** för att generera testscenarier
- **Visas INTE för användaren** (Process Feature Goal visas istället)

---

## Scenario-jämförelse

### Scenario 1: Isolerad generering (bara `mortgage-se-internal-data-gathering.bpmn`)

**Genereras:**
1. ✅ **Process Feature Goal**: `feature-goals/mortgage-se-internal-data-gathering.html`
   - Genereras med LLM (Claude)
   - Kontext: Process-noden i subprocess-filen
   - **Visas för användaren**

2. ✅ **File-level docs**: `mortgage-se-internal-data-gathering.html`
   - Innehåller JSON-data för E2E-scenarier
   - **Används INTE för användaren**

3. ❌ **CallActivity Feature Goal**: Genereras INTE (ingen parent-process)

**Totalt: 2 filer**

---

### Scenario 2: Batch-generering (alla filer, inkl. `mortgage-se-application.bpmn` som anropar subprocessen)

**För `mortgage-se-internal-data-gathering.bpmn`:**

1. ✅ **CallActivity Feature Goal**: `feature-goals/mortgage-se-application-internal-data-gathering.html`
   - Genereras med LLM (Claude)
   - Kontext: CallActivity-noden i `mortgage-se-application.bpmn`
   - **Visas när användaren klickar på callActivity i parent-processen**

2. ✅ **Process Feature Goal**: `feature-goals/mortgage-se-internal-data-gathering.html`
   - Genereras med LLM (Claude)
   - Kontext: Process-noden i subprocess-filen
   - **Visas när användaren går direkt till subprocess-filen**

3. ✅ **File-level docs**: `mortgage-se-internal-data-gathering.html`
   - Innehåller JSON-data för E2E-scenarier
   - **Används INTE för användaren**

**Totalt: 3 filer**

---

## Viktiga Skillnader

### Innehåll

| Aspekt | CallActivity Feature Goal | Process Feature Goal |
|--------|--------------------------|---------------------|
| **LLM-generering** | ✅ Ja (Claude) | ✅ Ja (Claude) |
| **Kontext** | CallActivity-noden (parent-process) | Process-noden (subprocess-fil) |
| **Perspektiv** | Från parent-processens synvinkel | Standalone (utan parent-kontext) |
| **Innehåll** | Kan inkludera parent-kontext | Fokuserar på subprocessen |
| **Naming** | Hierarchical (med parent) | Non-hierarchical (standalone) |

### Användning

| Aspekt | CallActivity Feature Goal | Process Feature Goal | File-level docs |
|--------|--------------------------|---------------------|-----------------|
| **Visas för användare** | ✅ Ja (när man klickar på callActivity) | ✅ Ja (när man går direkt till filen) | ❌ Nej |
| **Används för E2E** | ❌ Nej | ❌ Nej | ✅ Ja (JSON-data) |
| **LLM-generering** | ✅ Ja | ✅ Ja | ❌ Nej (bara JSON-data) |

---

## Varför två Feature Goal-filer?

### Anledning 1: Olika perspektiv
- **CallActivity Feature Goal**: Visar subprocessen från parent-processens perspektiv
  - Kan inkludera parent-kontext
  - Instans-specifik (en callActivity kan anropa samma subprocess flera gånger)
  
- **Process Feature Goal**: Visar subprocessen som standalone
  - Ingen parent-kontext
  - Generell dokumentation för subprocess-filen

### Anledning 2: Olika användningsfall
- **CallActivity Feature Goal**: När man arbetar med parent-processen och vill se vad en specifik callActivity gör
- **Process Feature Goal**: När man arbetar direkt med subprocess-filen

### Anledning 3: Olika kontext
- **CallActivity Feature Goal**: Genereras med callActivity-kontext (parent-process, elementId, etc.)
- **Process Feature Goal**: Genereras med process-kontext (subprocess-fil, process-nod, etc.)

---

## E2E-scenarier

### Var kommer E2E-scenarier ifrån?

**E2E-scenarier genereras från:**
- **File-level documentation** (JSON-data)
- **Feature Goal-dokumentation** (laddas från Storage)

**Process:**
1. E2E-generator läser file-level docs för att få JSON-data
2. E2E-generator kan också ladda Feature Goal-dokumentation från Storage
3. E2E-generator använder båda för att generera testscenarier

**Ingen tredje fil** - E2E-scenarier genereras dynamiskt från befintlig dokumentation.

---

## Sammanfattning

### För subprocess-filer:

1. **CallActivity Feature Goal** (hierarchical)
   - Genereras: Endast i batch-generering när callActivity finns
   - LLM: ✅ Ja
   - Visas för användare: ✅ Ja (när man klickar på callActivity)
   - Används för E2E: ❌ Nej

2. **Process Feature Goal** (non-hierarchical)
   - Genereras: Alltid (om inga callActivities)
   - LLM: ✅ Ja
   - Visas för användare: ✅ Ja (när man går direkt till filen)
   - Används för E2E: ❌ Nej

3. **File-level docs** (JSON-data)
   - Genereras: Alltid
   - LLM: ❌ Nej (bara JSON-data)
   - Visas för användare: ❌ Nej
   - Används för E2E: ✅ Ja

### Totalt antal filer per subprocess:

- **Isolerad generering**: 2 filer (Process Feature Goal + File-level docs)
- **Batch-generering**: 3 filer (CallActivity Feature Goal + Process Feature Goal + File-level docs)

---

## Rekommendationer

### Om du vill minska antalet filer:

1. **Ta bort CallActivity Feature Goal** (behåll bara Process Feature Goal)
   - Nackdel: Förlorar parent-kontext när man arbetar med callActivities
   
2. **Ta bort Process Feature Goal** (behåll bara CallActivity Feature Goal)
   - Nackdel: Förlorar standalone-dokumentation när man arbetar direkt med subprocess-filen

3. **Slå samman till en fil** (använd Process Feature Goal för båda)
   - Nackdel: Förlorar parent-kontext och instans-specifik information

### Nuvarande design är optimal eftersom:
- ✅ Olika perspektiv för olika användningsfall
- ✅ Instans-specifik dokumentation för callActivities
- ✅ Standalone-dokumentation för subprocess-filer
- ✅ JSON-data separerad från användardokumentation


