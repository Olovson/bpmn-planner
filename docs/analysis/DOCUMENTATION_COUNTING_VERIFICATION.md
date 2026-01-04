# Verifiering: Dokumentationsräkning vs. Faktisk Lagring

## Datum: 2025-12-26

### Hur filer faktiskt sparas vid generering

**Kodflöde:**
1. `generateAllFromBpmnWithGraph()` genererar dokumentation och lägger i `result.docs` Map
2. `useFileGeneration.ts` (rad 1155-1193) itererar över `result.docs.entries()`
3. För varje `[docFileName, docContent]`:
   - Använder `buildDocStoragePaths(docFileName, ...)` för att få `docPath`
   - Uploadar till `docPath` via `supabase.storage.upload(docPath, ...)`

**`docFileName` format:**
- Node docs: `getNodeDocFileKey(bpmnFile, elementId)` = `nodes/{fileBaseName}/{elementId}.html`
- Feature goals: `getFeatureGoalDocFileKey(...)` = `feature-goals/{parentBaseName}-{elementId}.html`

**`buildDocStoragePaths` returnerar:**
- Om `versionHash` finns: `docs/claude/{bpmnFileName}/{versionHash}/{docFileName}`
- Om `versionHash` saknas: `docs/claude/{docFileName}`

### Faktiska lagringsplatser

**Node docs:**
- Non-versioned: `docs/claude/nodes/{fileBaseName}/{elementId}.html`
- Versioned: `docs/claude/{fileName}/{versionHash}/nodes/{fileBaseName}/{elementId}.html`

**Feature goals:**
- Versioned: `docs/claude/{fileName}/{versionHash}/feature-goals/{parentBaseName}-{elementId}.html`

### Räkningslogik (efter fix)

**Node docs - letar i:**
1. `docs/claude/{fileName}/{versionHash}/nodes/{fileBaseName}` ✓ (versioned)
2. `docs/claude/nodes/{fileBaseName}` ✓ (non-versioned, mest vanliga)
3. `docs/ollama/nodes/{fileBaseName}` (fallback)
4. `docs/local/nodes/{fileBaseName}` (fallback)
5. `docs/nodes/{fileBaseName}` (legacy)

**Feature goals - letar i:**
1. `docs/claude/{fileName}/{versionHash}/feature-goals` ✓ (versioned)
5. `docs/feature-goals` (legacy)

### Matchning

✅ **Node docs:** Räkningslogiken letar i exakt samma paths som filerna sparas i
✅ **Feature goals:** Räkningslogiken letar i exakt samma paths som filerna sparas i
✅ **Versioned paths:** Stöds korrekt i både generering och räkning
✅ **Non-versioned paths:** Stöds korrekt i både generering och räkning

### Call Activities Räknas i Parent-Filen

**VIKTIGT:** Call activities räknas som Feature Goals för filen där de är **definierade** (parent-filen), INTE när subprocess-filen genereras.

**Exempel:**
- `mortgage-se-object.bpmn` har call activity "object-information" som pekar på `mortgage-se-object-information.bpmn`
- Feature Goal genereras när `mortgage-se-object.bpmn` genereras
- Feature Goal-filnamn: `mortgage-se-object-object-information.html` (hierarchical naming)
- Detta räknas som dokumentation för `mortgage-se-object.bpmn`, INTE för `mortgage-se-object-information.bpmn`

**Räkningslogik:**
- **UserTask/ServiceTask/BusinessRuleTask** → Epic (räknas i filen)
- **CallActivity** → Feature Goal (räknas i parent-filen)

**Exempel för `mortgage-se-object.bpmn`:**
- 2 UserTasks → 2 Epics
- 1 ServiceTask → 1 Epic
- 1 CallActivity → 1 Feature Goal
- **Total: 4/4** (3 Epics + 1 Feature Goal)

### Slutsats

Räkningslogiken matchar exakt hur filer faktiskt sparas vid generering. Fixen är korrekt och kommer fungera även när filer genereras från scratch. Call activities räknas korrekt i parent-filen som Feature Goals.

Se även `docs/analysis/DOCUMENTATION_COVERAGE_COUNTING_RULES.md` för fullständig dokumentation av räkningsreglerna.
