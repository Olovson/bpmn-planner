# Fixar Efter Borttagning av Process Feature Goal-bakåtkompatibilitet

## Datum: 2025-12-29

## ✅ Fixade Problem

### 1. Root Process Feature Goal - FIXAT
- **Fil:** `src/lib/nodeArtifactPaths.ts`
- **Fix:** Tillåter nu `undefined` för root process (kollar om elementId matchar fileBaseName)
- **Status:** ✅ Fungerar

### 2. e2eScenarioGenerator.ts - FIXAT
- **Fil:** `src/lib/e2eScenarioGenerator.ts`
- **Fix:** 
  - Lade till `findParentBpmnFileForSubprocess` helper-funktion i `bpmnMapLoader.ts`
  - Uppdaterade `loadFeatureGoalDocFromStorage` att hitta parentBpmnFile från bpmn-map
  - Uppdaterade anropet att skicka parentBpmnFile (rootBpmnFile där callActivity är definierad)
- **Status:** ✅ Fungerar

### 3. featureGoalTestGenerator.ts - FIXAT
- **Fil:** `src/lib/featureGoalTestGenerator.ts`
- **Fix:**
  - Uppdaterade `loadFeatureGoalDocFromStorage` att hitta parentBpmnFile från bpmn-map
  - Uppdaterade anropet att skicka parentBpmnFile (bpmnFile där callActivity är definierad)
- **Status:** ✅ Fungerar

### 4. userStoryExtractor.ts - FIXAT
- **Fil:** `src/lib/testGeneration/userStoryExtractor.ts`
- **Fix:**
  - Uppdaterade `loadDocFromStorage` att hitta parentBpmnFile från bpmn-map för feature-goal
  - Skickar parentBpmnFile till `getFeatureGoalDocStoragePaths`
- **Status:** ✅ Fungerar

### 5. bpmnDiffRegeneration.ts - FIXAT
- **Fil:** `src/lib/bpmnDiffRegeneration.ts`
- **Fix:** Tog bort Process Feature Goal cleanup-kod (rad 713-729)
- **Status:** ✅ Fungerar

### 6. useFileArtifactCoverage.ts - FIXAT
- **Fil:** `src/hooks/useFileArtifactCoverage.ts`
- **Fix:** Tog bort legacy key-sökning (rad 180-185, 428-435)
- **Status:** ✅ Fungerar

### 7. htmlTestGenerationParser.ts - FIXAT
- **Fil:** `src/lib/htmlTestGenerationParser.ts`
- **Fix:**
  - Uppdaterade `fetchFeatureGoalHtml` att hitta parentBpmnFile från bpmn-map
  - Uppdaterade `getTestScenariosFromHtml` att acceptera parentBpmnFile
- **Status:** ✅ Fungerar

### 8. featureGoalJsonExport.ts - FIXAT
- **Fil:** `src/lib/featureGoalJsonExport.ts`
- **Fix:**
  - Uppdaterade `fetchExistingModel` att hitta parentBpmnFile från bpmn-map
- **Status:** ✅ Fungerar

### 9. testExport.ts - FIXAT
- **Fil:** `src/lib/testExport.ts`
- **Fix:** Tog bort onödig tredje parameter från `getTestScenariosFromHtml`-anrop
- **Status:** ✅ Fungerar

---

## Nya Helper-funktioner

### `findParentBpmnFileForSubprocess`
- **Fil:** `src/lib/bpmn/bpmnMapLoader.ts`
- **Syfte:** Hitta parent BPMN-fil för en subprocess-fil och elementId från bpmn-map
- **Används i:** e2eScenarioGenerator, featureGoalTestGenerator, userStoryExtractor, htmlTestGenerationParser, featureGoalJsonExport

---

## Sammanfattning

Alla problem har fixats:
- ✅ Root Process Feature Goal fungerar
- ✅ Alla Feature Goal-laddningar hittar nu parentBpmnFile från bpmn-map
- ✅ All legacy/cleanup-kod är borttagen
- ✅ Inga linter-fel

Systemet använder nu bara:
- CallActivity Feature Goals (hierarchical naming med parent)
- File-level documentation (ersätter Process Feature Goals)
- Root Process Feature Goals (endast för root-processen)

