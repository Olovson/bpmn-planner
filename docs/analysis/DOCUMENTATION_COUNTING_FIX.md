# Fix för Dokumentationsräkning

## Datum: 2025-12-26

### Problem

Nästan alla filer visade samma antal dokumentationer (11), vilket inte stämde med faktiska filer i Storage.

### Rotorsak

1. **Legacy naming matchade fel filer**: När vi använde legacy naming (utan parent) för call activities, kunde samma feature-goal-fil matcha call activities från olika parent-filer. Till exempel kunde `mortgage-se-credit-evaluation.html` matcha både:
   - Call activity i `mortgage.bpmn` (korrekt)
   - Call activity i `mortgage-se-object-control.bpmn` (felaktigt)

2. **Process Feature Goals räknades inte korrekt**: Process Feature Goal dokumentation (t.ex. `mortgage-se-object-control.html`) är dokumentation för processen själv, inte för noder i filen, och ska inte räknas i node documentation coverage.

### Lösning

1. **Använd bara hierarchical naming**: Tog bort legacy naming-fallback när vi räknar dokumentation för call activities. Nu använder vi bara hierarchical naming (med parent prefix), vilket säkerställer att vi matchar rätt fil.

2. **Ignorera process-noder**: Lade till explicit check för att ignorera process-noder när vi räknar dokumentation, eftersom de har Feature Goal dokumentation som är separat och inte räknas som "node documentation".

### Ändringar

**`src/hooks/useFileArtifactCoverage.ts`:**
- Tog bort legacy naming-fallback för call activities
- Lade till explicit check för att ignorera process-noder
- Uppdaterade kommentarer för att förklara varför vi bara använder hierarchical naming

**Före:**
```typescript
const legacyKey = getFeatureGoalDocFileKey(
  node.subprocessFile,
  node.bpmnElementId,
  undefined,
  undefined, // Ingen parent
);
// ...
if (featureGoalNames.has(hierarchicalFileName) || featureGoalNames.has(legacyFileName)) {
  foundDoc = true;
}
```

**Efter:**
```typescript
// Använd BARA hierarchical naming för att undvika att matcha fel filer
// Legacy naming kan matcha samma fil för call activities från olika parent-filer
if (featureGoalNames.has(hierarchicalFileName)) {
  foundDoc = true;
}
```

### Ytterligare Fix: Node Documentation Paths

Efter första fixen upptäcktes att node documentation inte hittades korrekt. Problemet var att vi letade i fel paths.

**Node docs sparas som:**
- `docs/claude/nodes/{fileBaseName}/{elementId}.html` (non-versioned, mest vanliga)
- `docs/claude/{fileName}/{versionHash}/nodes/{fileBaseName}/{elementId}.html` (versioned)

**Men vi letade bara i:**
- `docs/claude/{fileName}/{versionHash}/nodes/{fileBaseName}` (versioned)
- `docs/nodes/{fileBaseName}` (legacy)

**Fix:**
- Lade till `docs/claude/nodes/{fileBaseName}` (non-versioned path) som första prioritet
- Lade till `docs/ollama/nodes/{fileBaseName}` och `docs/local/nodes/{fileBaseName}` som fallback

### Ytterligare Fix: Call Activities Räknas i Parent-Filen

**VIKTIGT:** Call activities räknas som Feature Goals för filen där de är **definierade** (parent-filen), INTE när subprocess-filen genereras.

**Exempel:**
- `mortgage-se-object.bpmn` har call activity "object-information" som pekar på `mortgage-se-object-information.bpmn`
- Feature Goal genereras när `mortgage-se-object.bpmn` genereras
- Feature Goal-filnamn: `mortgage-se-object-object-information.html` (hierarchical naming)
- Detta räknas som dokumentation för `mortgage-se-object.bpmn`, INTE för `mortgage-se-object-information.bpmn`

**Logik:**
- **UserTask/ServiceTask/BusinessRuleTask** → Epic (räknas i filen)
- **CallActivity** → Feature Goal (räknas i parent-filen)

**Exempel för `mortgage-se-object.bpmn`:**
- 2 UserTasks → 2 Epics
- 1 ServiceTask → 1 Epic
- 1 CallActivity → 1 Feature Goal
- **Total: 4/4** (3 Epics + 1 Feature Goal)

### Resultat

Nu borde dokumentationsräkningen visa korrekt antal för varje fil, baserat på faktiska noder i filen och deras dokumentation med hierarchical naming. Call activities räknas korrekt i parent-filen som Feature Goals.

### Validering

Kör `npm run check:storage-docs <fileName>` för att se vilka dokumentationer som faktiskt finns i Storage för en specifik fil.
Kör `npm run count:all-docs` för att se totalt antal dokumentationsfiler i Storage.

Se även `docs/analysis/DOCUMENTATION_COVERAGE_COUNTING_RULES.md` för fullständig dokumentation av räkningsreglerna.

