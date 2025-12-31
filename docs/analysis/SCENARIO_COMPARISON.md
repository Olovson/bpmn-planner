# Scenario-jämförelse: Isolerad vs Batch-generering

## Datum: 2025-01-XX

## Scenario 1: Bara "internal data gathering" laddas upp och används (ISOLERAT)

### Vad genereras:

1. **Epic-dokumentation** för alla tasks/epics i filen:
   - `nodes/mortgage-se-internal-data-gathering/{elementId}.html`
   - För varje UserTask, ServiceTask, BusinessRuleTask

2. **Process Feature Goal** (non-hierarchical naming):
   - `feature-goals/mortgage-se-internal-data-gathering.html`
   - **Detta är vad användaren ser i doc-viewer**
   - Standalone dokumentation från subprocess-filens perspektiv
   - Har Feature Goal-struktur (summary, flowSteps, userStories, dependencies)

3. **File-level documentation** (för E2E-scenarier - JSON-data):
   - `mortgage-se-internal-data-gathering.html`
   - Innehåller JSON-data embeddad i HTML
   - **Visas INTE för användaren** (Process Feature Goal visas istället)

### Vad genereras INTE:

- ❌ Root Process Feature Goal (detta är inte root-filen)
- ❌ CallActivity Feature Goals (inga callActivities i filen)
- ❌ Dokumentation för andra filer (bara denna fil genereras)

### Vad användaren ser i doc-viewer:

- När användaren går till `/doc-viewer/mortgage-se-internal-data-gathering`:
  - **Process Feature Goal** visas (`feature-goals/mortgage-se-internal-data-gathering.html`)
  - Feature Goal-struktur med summary, flowSteps, userStories, dependencies

---

## Scenario 2: Alla filer i mappen laddas upp och används (BATCH)

### Vad genereras:

**För varje fil i hierarkin (alla 19 filer):**

1. **Epic-dokumentation** för alla tasks/epics:
   - `nodes/{fileBaseName}/{elementId}.html`
   - För varje UserTask, ServiceTask, BusinessRuleTask i varje fil

2. **CallActivity Feature Goals** (hierarchical naming):
   - `feature-goals/{parentBaseName}-{elementId}.html`
   - Genereras för varje callActivity där subprocess-filen finns
   - Exempel: `feature-goals/mortgage-se-application-internal-data-gathering.html`
   - Instans-specifik dokumentation med parent-kontext

3. **File-level documentation**:
   - `{fileBaseName}.html`
   - För alla filer (root och subprocesser)
   - Innehåller JSON-data för E2E-scenariogenerering

**För root-filen (`mortgage.bpmn`):**

4. **Root Process Feature Goal**:
   - `feature-goals/mortgage.html`
   - Genereras ENDAST för root-processen
   - Non-hierarchical naming
   - Visas i doc-viewer för root-processen

**För subprocess-filer (t.ex. `mortgage-se-internal-data-gathering.bpmn`):**

5. **Process Feature Goal** (non-hierarchical naming):
   - `feature-goals/mortgage-se-internal-data-gathering.html`
   - Standalone dokumentation från subprocess-filens perspektiv
   - **Detta är vad användaren ser i doc-viewer för subprocess-filen**
   - Har Feature Goal-struktur (summary, flowSteps, userStories, dependencies)

### Vad användaren ser i doc-viewer:

**För root-filen (`mortgage.bpmn`):**
- När användaren går till `/doc-viewer/mortgage`:
  - **File-level documentation** visas (`mortgage.html`)
  - ELLER **Root Process Feature Goal** om den finns (`feature-goals/mortgage.html`)

**För subprocess-filer (t.ex. `mortgage-se-internal-data-gathering.bpmn`):**
- När användaren går till `/doc-viewer/mortgage-se-internal-data-gathering`:
  - **Process Feature Goal** visas (`feature-goals/mortgage-se-internal-data-gathering.html`)
  - Feature Goal-struktur med summary, flowSteps, userStories, dependencies

**För callActivities:**
- När användaren klickar på en callActivity i parent-processen:
  - **CallActivity Feature Goal** visas (`feature-goals/{parent}-{elementId}.html`)
  - Hierarchical naming med parent-kontext

---

## Kritiska Skillnader

| Aspekt | Scenario 1 (Isolerat) | Scenario 2 (Batch) |
|--------|----------------------|-------------------|
| **Antal filer genereras** | 1 fil | 19 filer (alla i hierarkin) |
| **Process Feature Goal** | ✅ Genereras | ✅ Genereras (för subprocess-filer) |
| **CallActivity Feature Goals** | ❌ Genereras INTE (inga callActivities) | ✅ Genereras (för varje callActivity) |
| **Root Process Feature Goal** | ❌ Genereras INTE | ✅ Genereras (för root-filen) |
| **File-level docs** | ✅ Genereras (JSON-data) | ✅ Genereras (för alla filer) |
| **Vad användaren ser** | Process Feature Goal | Process Feature Goal (subprocess) eller Root Process Feature Goal (root) |

---

## Sammanfattning

### Scenario 1: Isolerat
- **Genereras:** Epic-docs, Process Feature Goal, File-level docs
- **Visas för användare:** Process Feature Goal
- **Kontext:** Standalone (ingen parent-kontext)

### Scenario 2: Batch
- **Genereras:** Epic-docs (alla filer), CallActivity Feature Goals, Process Feature Goals (subprocesser), Root Process Feature Goal (root), File-level docs (alla filer)
- **Visas för användare:** Process Feature Goal (subprocess) eller Root Process Feature Goal (root)
- **Kontext:** Hela hierarkin (parent-kontext för callActivities)

