# Problem efter Borttagning av Process Feature Goal-bakåtkompatibilitet

## Datum: 2025-12-29

## Identifierade Problem

### 1. Root Process Feature Goal - KRITISKT

**Fil:** `src/lib/bpmnGenerators.ts` rad 2855-2860

**Problem:**
```typescript
const rootFeatureDocPath = getFeatureGoalDocFileKey(
  file,
  processNodeForRoot.bpmnElementId || fileBaseName,
  undefined, // no version suffix
  undefined, // no parent (root process) ❌ KASTAR NU FEL!
);
```

**Lösning:** Tillåt `undefined` för root process i `getFeatureGoalDocFileKey`

---

### 2. bpmnDiffRegeneration.ts - Cleanup av Process Feature Goals

**Fil:** `src/lib/bpmnDiffRegeneration.ts` rad 714-719

**Problem:**
```typescript
const featureGoalKey = getFeatureGoalDocFileKey(
  node.bpmnFile,
  fileBaseName, // Use file base name as elementId for process nodes
  undefined,
  undefined // No parent for process nodes ❌ KASTAR NU FEL!
);
```

**Kontext:** Detta är för cleanup av gamla Process Feature Goals när filer ändras.

**Lösning:** Ta bort denna cleanup-kod (Process Feature Goals genereras inte längre)

---

### 3. useFileArtifactCoverage.ts - Legacy Keys

**Fil:** `src/hooks/useFileArtifactCoverage.ts` rad 180-185 och 433-438

**Problem:**
```typescript
const legacyKey = getFeatureGoalDocFileKey(
  node.subprocessFile,
  node.bpmnElementId,
  undefined, // no version suffix
  undefined, // Ingen parent ❌ KASTAR NU FEL!
);
```

**Kontext:** Detta är för bakåtkompatibilitet med "legacy keys" (Process Feature Goals).

**Lösning:** Ta bort legacy key-sökningen (Process Feature Goals genereras inte längre)

---

### 4. e2eScenarioGenerator.ts - Laddar Feature Goal utan Parent

**Fil:** `src/lib/e2eScenarioGenerator.ts` rad 282 och 324

**Problem:**
```typescript
// Rad 282: Anropar utan parentBpmnFile
const storagePaths = getFeatureGoalDocStoragePaths(bpmnFile, elementId);
// Returnerar nu tom array ❌

// Rad 324: Anropar utan parentBpmnFile
getFeatureGoalDocFileKey(bpmnFile, elementId) // ❌ KASTAR NU FEL!
```

**Kontext:** Försöker ladda Feature Goal-dokumentation för E2E-scenariogenerering.

**Lösning:** Måste hitta parentBpmnFile från bpmn-map eller process graph

---

### 5. featureGoalTestGenerator.ts - Laddar Feature Goal utan Parent

**Fil:** `src/lib/featureGoalTestGenerator.ts` rad 150 och 196

**Problem:**
```typescript
// Rad 150: Anropar utan parentBpmnFile
const storagePaths = getFeatureGoalDocStoragePaths(bpmnFile, elementId);
// Returnerar nu tom array ❌

// Rad 196: Anropar utan parentBpmnFile
getFeatureGoalDocFileKey(bpmnFile, elementId) // ❌ KASTAR NU FEL!
```

**Kontext:** Försöker ladda Feature Goal-dokumentation för testgenerering.

**Lösning:** Måste hitta parentBpmnFile från bpmn-map eller process graph

---

### 6. userStoryExtractor.ts - Laddar Feature Goal utan Parent

**Fil:** `src/lib/testGeneration/userStoryExtractor.ts` rad 69

**Problem:**
```typescript
const storagePaths = docType === 'epic'
  ? getEpicDocStoragePaths(bpmnFile, elementId)
  : getFeatureGoalDocStoragePaths(bpmnFile, elementId); // ❌ Returnerar tom array utan parent
```

**Kontext:** Försöker ladda dokumentation (epic eller feature goal) för user story-extraktion.

**Lösning:** Måste hitta parentBpmnFile om docType är 'feature goal'

---

### 7. htmlTestGenerationParser.ts - Legacy Path

**Fil:** `src/lib/htmlTestGenerationParser.ts` rad 369

**Problem:**
```typescript
const fileKey = getFeatureGoalDocFileKey(bpmnFile, elementId, undefined); // ❌ KASTAR NU FEL!
```

**Kontext:** Försöker ladda Feature Goal-dokumentation från legacy path.

**Lösning:** Måste hitta parentBpmnFile eller ta bort legacy path-hantering

---

### 8. featureGoalJsonExport.ts - Legacy Path

**Fil:** `src/lib/featureGoalJsonExport.ts` rad 56

**Problem:**
```typescript
const fileKey = getFeatureGoalDocFileKey(bpmnFile, elementId, undefined); // ❌ KASTAR NU FEL!
```

**Kontext:** Försöker exportera Feature Goal-dokumentation till JSON.

**Lösning:** Måste hitta parentBpmnFile eller ta bort legacy path-hantering

---

## Lösningsstrategi

### Prioritet 1: Kritiska Problem (Bryter Generering)

1. **Root Process Feature Goal** - Tillåt `undefined` för root process
2. **e2eScenarioGenerator.ts** - Hitta parentBpmnFile från bpmn-map
3. **featureGoalTestGenerator.ts** - Hitta parentBpmnFile från bpmn-map
4. **userStoryExtractor.ts** - Hitta parentBpmnFile om docType är 'feature goal'

### Prioritet 2: Cleanup (Kan Ta Bort)

1. **bpmnDiffRegeneration.ts** - Ta bort Process Feature Goal cleanup
2. **useFileArtifactCoverage.ts** - Ta bort legacy key-sökning
3. **htmlTestGenerationParser.ts** - Ta bort legacy path-hantering
4. **featureGoalJsonExport.ts** - Ta bort legacy path-hantering

---

## Rekommenderade Åtgärder

### 1. ✅ Fixa Root Process Feature Goal - KLAR

Tillåt `undefined` för root process i `getFeatureGoalDocFileKey`:
- ✅ Implementerat: Kollar om elementId matchar fileBaseName (root process)
- ✅ Root process Feature Goals fungerar nu

### 2. Fixa Feature Goal-laddning utan Parent - PÅGÅENDE

För alla ställen som laddar Feature Goals utan parent:
- **e2eScenarioGenerator.ts**: Hitta parentBpmnFile från parseResult eller bpmn-map
- **featureGoalTestGenerator.ts**: Hitta parentBpmnFile från bpmn-map eller process graph
- **userStoryExtractor.ts**: Hitta parentBpmnFile om docType är 'feature goal'
- **htmlTestGenerationParser.ts**: Hitta parentBpmnFile eller ta bort legacy path
- **featureGoalJsonExport.ts**: Hitta parentBpmnFile eller ta bort legacy path

**Strategi:**
1. Uppdatera `loadFeatureGoalDocFromStorage` att acceptera `parentBpmnFile` som optional parameter
2. Om `parentBpmnFile` saknas, försök hitta den från bpmn-map.json
3. Om den fortfarande saknas, returnera null (Feature Goal finns inte)

### 3. Ta Bort Legacy/Cleanup-kod - PÅGÅENDE

För alla ställen som hanterar Process Feature Goals:
- **bpmnDiffRegeneration.ts**: Ta bort Process Feature Goal cleanup (rad 714-719)
- **useFileArtifactCoverage.ts**: Ta bort legacy key-sökning (rad 180-185, 433-438)

---

## Status

- ✅ Root Process Feature Goal fixat
- ⚠️ Feature Goal-laddning utan parent - behöver fixas
- ⚠️ Legacy/cleanup-kod - behöver tas bort

