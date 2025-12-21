# Analys: Feature Goal-generering när subprocess-filer saknas

**Datum:** 2025-01-XX  
**Status:** 🔴 Problem identifierat

---

## 📊 Problembeskrivning

När användaren bara laddar upp vissa filer (t.ex. `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-internal-data-gathering.bpmn`) så genereras dokumentation för call activities (som "Signing") även om subprocess-filerna inte är laddade upp. Detta leder till ofullständig information eftersom Feature Goals genereras utan att subprocess-filen faktiskt finns.

**Exempel:**
- Användaren laddar upp: `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-internal-data-gathering.bpmn`
- Systemet genererar Feature Goal för "Signing" call activity
- Men `mortgage-se-signing.bpmn` finns inte i `existingBpmnFiles`
- Resultat: Ofullständig Feature Goal-dokumentation utan information från subprocess-filen

---

## 🔍 Nuvarande Logik

### 0. Process Graph Building

Process graph bygger noder med `missingDefinition` flagga och `graph.missingDependencies` array:

```typescript
// I bpmnProcessGraph.ts
missingDefinition: !subprocessFile, // True om subprocess-filen inte hittades
```

```typescript
// I bpmnGenerators.ts
missingDependencies: graph.missingDependencies, // Array med saknade subprocess-filer
```

**Problem:** Vi använder inte `node.missingDefinition` eller `graph.missingDependencies` för att filtrera bort callActivities med saknade subprocess-filer.

### 1. Node Filtering (rad 1390-1402)

```typescript
const nodesToGenerate = testableNodes.filter(node => {
  // För callActivities: inkludera om callActivity-filen är med i analyzedFiles,
  // även om subprocess-filen inte är med (subprocess-filen kan genereras senare eller saknas)
  if (node.type === 'callActivity') {
    const callActivityFileIncluded = analyzedFiles.includes(node.bpmnFile);
    // Inkludera callActivity om dess fil är med i analyzedFiles
    // (subprocess-filen behöver inte vara med - Feature Goal genereras ändå)
    return callActivityFileIncluded;
  }
  // För tasks/epics: inkludera bara om filen är med i analyzedFiles
  return analyzedFiles.includes(node.bpmnFile);
});
```

**Problem:** CallActivities inkluderas även om `node.subprocessFile` inte finns i `analyzedFiles` eller `existingBpmnFiles`.

### 2. Feature Goal Generation (rad 1788-1802)

```typescript
if (node.type === 'callActivity') {
  // VIKTIGT: För callActivities måste vi ALLTID generera Feature Goal-dokumentation,
  // även om subprocess-filen redan har genererat sin egen Feature Goal.
  // Detta säkerställer att alla callActivity-instanser får dokumentation.
  // skipDocGeneration för callActivities betyder bara att subprocess redan genererats,
  // men vi genererar ändå instans-specifik dokumentation.
  
  // För callActivities: generera alltid Feature Goal (skipDocGeneration används bara för att avgöra base vs instans-specifik)
  if (skipDocGeneration && node.subprocessFile) {
    // ... generera instans-specifik dokumentation
  } else {
    // ... generera base Feature Goal
  }
}
```

**Problem:** Feature Goals genereras alltid, även om `node.subprocessFile` inte finns i `existingBpmnFiles`.

---

## ✅ Hur Det Borde Fungera

### Regel 1: Feature Goals ska bara genereras om subprocess-filen finns

**När ska Feature Goal genereras för en callActivity?**

1. **CallActivity-filen måste vara med i `analyzedFiles`** (✓ Redan implementerat)
2. **Subprocess-filen måste finnas i `existingBpmnFiles`** (✗ Saknas!)
3. **Subprocess-filen måste kunna parsas och inkluderas i grafen** (✗ Saknas!)

### Regel 2: Om subprocess-filen saknas, ska callActivity hoppas över

**Alternativ:**
- **Alternativ A:** Hoppa över callActivity helt (ingen dokumentation genereras)
- **Alternativ B:** Generera en "placeholder" Feature Goal som indikerar att subprocess-filen saknas
- **Alternativ C:** Generera en minimal Feature Goal med varning om att subprocess-filen saknas

**Rekommendation:** Alternativ A (hoppa över) är enklast och säkrast. Om subprocess-filen saknas, kan vi inte generera korrekt dokumentation.

---

## 🧪 Testning

### Nuvarande Tester

**Problem:** Tester verifierar inte att Feature Goals bara genereras när subprocess-filer finns.

**Exempel från tester:**
- `tests/integration/application-documentation-generation.test.ts` - Testar isolerad generering av `mortgage-se-application.bpmn`
- `tests/integration/household-documentation-generation.test.ts` - Testar isolerad generering av `mortgage-se-household.bpmn`
- `tests/integration/generation-order-scenarios.test.ts` - Testar genereringsordning men inte saknade filer

**Saknade tester:**
- ❌ Test som verifierar att Feature Goals INTE genereras när subprocess-filen saknas
- ❌ Test som verifierar att Feature Goals genereras när subprocess-filen finns
- ❌ Test som verifierar beteende när vissa subprocess-filer saknas men andra finns

---

## 🔧 Föreslagen Lösning

### Steg 1: Uppdatera Node Filtering

**Alternativ A: Använd `node.missingDefinition` (Rekommenderat)**

```typescript
const nodesToGenerate = testableNodes.filter(node => {
  if (nodeFilter && !nodeFilter(node)) {
    return false;
  }
  
  // För callActivities: kolla både callActivity-filen OCH om subprocess-filen finns
  if (node.type === 'callActivity') {
    const callActivityFileIncluded = analyzedFiles.includes(node.bpmnFile);
    
    // VIKTIGT: Om subprocess-filen saknas (missingDefinition = true), hoppa över callActivity
    // Detta säkerställer att vi bara genererar Feature Goals när subprocess-filen faktiskt finns
    if (node.missingDefinition) {
      // Subprocess-filen saknas - hoppa över callActivity
      if (import.meta.env.DEV) {
        console.warn(
          `[bpmnGenerators] ⚠️ Skipping callActivity ${node.bpmnElementId} ` +
          `(subprocess file ${node.subprocessFile || 'unknown'} not found)`
        );
      }
      return false;
    }
    
    // Verifiera också att subprocess-filen finns i existingBpmnFiles (extra säkerhet)
    if (node.subprocessFile && !existingBpmnFiles.includes(node.subprocessFile)) {
      if (import.meta.env.DEV) {
        console.warn(
          `[bpmnGenerators] ⚠️ Skipping callActivity ${node.bpmnElementId} ` +
          `(subprocess file ${node.subprocessFile} not in existingBpmnFiles)`
        );
      }
      return false;
    }
    
    return callActivityFileIncluded;
  }
  
  // För tasks/epics: inkludera bara om filen är med i analyzedFiles
  return analyzedFiles.includes(node.bpmnFile);
});
```

**Alternativ B: Använd `graph.missingDependencies`**

```typescript
// Skapa en Set för snabb lookup
const missingSubprocessFiles = new Set(
  graph.missingDependencies.map(dep => dep.childProcess)
);

const nodesToGenerate = testableNodes.filter(node => {
  if (nodeFilter && !nodeFilter(node)) {
    return false;
  }
  
  if (node.type === 'callActivity') {
    const callActivityFileIncluded = analyzedFiles.includes(node.bpmnFile);
    
    // Kolla om subprocess-filen finns i missingDependencies
    if (node.subprocessFile && missingSubprocessFiles.has(node.subprocessFile)) {
      if (import.meta.env.DEV) {
        console.warn(
          `[bpmnGenerators] ⚠️ Skipping callActivity ${node.bpmnElementId} ` +
          `(subprocess file ${node.subprocessFile} is in missingDependencies)`
        );
      }
      return false;
    }
    
    return callActivityFileIncluded;
  }
  
  return analyzedFiles.includes(node.bpmnFile);
});
```

**Rekommendation:** Använd Alternativ A (`node.missingDefinition`) eftersom det är mer direkt och tydligt.

### Steg 2: Verifiera i Feature Goal Generation

```typescript
if (node.type === 'callActivity') {
  // VIKTIGT: Verifiera att subprocess-filen faktiskt finns
  if (!node.subprocessFile) {
    console.warn(`[bpmnGenerators] ⚠️ CallActivity ${node.bpmnElementId} has no subprocessFile, skipping Feature Goal generation`);
    continue;
  }
  
  if (!existingBpmnFiles.includes(node.subprocessFile)) {
    console.warn(
      `[bpmnGenerators] ⚠️ Skipping Feature Goal for ${node.bpmnElementId} ` +
      `(subprocess file ${node.subprocessFile} not found in existingBpmnFiles)`
    );
    continue;
  }
  
  // ... resten av Feature Goal-genereringen
}
```

### Steg 3: Lägg till Tester

```typescript
describe('Feature Goal generation when subprocess files are missing', () => {
  it('should NOT generate Feature Goal when subprocess file is missing', async () => {
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      ['mortgage-se-application.bpmn'], // Bara application, INTE signing
      [],
      false,
      false,
    );
    
    // Verifiera att INGEN Feature Goal genererades för "signing" call activity
    const signingFeatureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('signing') && key.includes('feature-goal')
    );
    expect(signingFeatureGoals.length).toBe(0);
  });
  
  it('should generate Feature Goal when subprocess file exists', async () => {
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      ['mortgage-se-application.bpmn', 'mortgage-se-signing.bpmn'], // Både application OCH signing
      [],
      false,
      false,
    );
    
    // Verifiera att Feature Goal genererades för "signing" call activity
    const signingFeatureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('signing') && key.includes('feature-goal')
    );
    expect(signingFeatureGoals.length).toBeGreaterThan(0);
  });
});
```

---

## 📋 Checklista för Implementation

- [ ] Uppdatera `nodesToGenerate` filter för att kolla `existingBpmnFiles`
- [ ] Lägg till verifiering i Feature Goal-generering
- [ ] Lägg till varningar när subprocess-filer saknas
- [ ] Skapa tester för saknade subprocess-filer
- [ ] Skapa tester för när subprocess-filer finns
- [ ] Uppdatera dokumentation
- [ ] Verifiera att befintliga tester fortfarande fungerar

---

## 🎯 Förväntat Beteende Efter Fix

**Scenario 1: Subprocess-filen saknas**
- Input: `mortgage.bpmn`, `mortgage-se-application.bpmn` (utan `mortgage-se-signing.bpmn`)
- Output: INGEN Feature Goal för "Signing" call activity
- Log: Varning om att subprocess-filen saknas

**Scenario 2: Subprocess-filen finns**
- Input: `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-signing.bpmn`
- Output: Feature Goal för "Signing" call activity genereras
- Log: Normal generering

**Scenario 3: Delvis saknade filer**
- Input: `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-internal-data-gathering.bpmn` (utan `mortgage-se-signing.bpmn`)
- Output: Feature Goal för "Internal data gathering" genereras, INGEN Feature Goal för "Signing"
- Log: Varning om att "Signing" subprocess-filen saknas

---

## 🔍 Andra Liknande Scenarion

### BusinessRuleTasks och DMN-filer

**Problem:** BusinessRuleTasks använder DMN-filer för beslutslogik, men dokumentation genereras även om DMN-filen saknas.

**Nuvarande logik (rad 2546-2555):**
```typescript
if (nodeType === 'BusinessRuleTask') {
  const { matchDmnFile } = await import('./dmnParser');
  subprocessFile = matchDmnFile(element.name || element.id, existingDmnFiles);
  
  // Parse DMN if file exists
  if (subprocessFile && existingDmnFiles.includes(subprocessFile)) {
    subprocessSummary = await parseDmnSummary(subprocessFile) || undefined;
    result.subprocessMappings.set(element.id, subprocessFile);
  }
}
```

**Observation:** BusinessRuleTasks genererar dokumentation även om DMN-filen saknas (subprocessFile blir undefined, men dokumentation genereras ändå). Detta är mindre kritiskt än Feature Goals eftersom BusinessRuleTask-dokumentation inte är beroende av DMN-filen på samma sätt som Feature Goals är beroende av subprocess-filer.

**Rekommendation:** Överväg att lägga till en varning i dokumentationen när DMN-filen saknas, men detta är inte lika kritiskt som Feature Goals.

---

## 🔗 Relaterade Filer

- `src/lib/bpmnGenerators.ts` - Huvudlogik för generering
- `src/lib/bpmnProcessGraph.ts` - Process graph building
- `tests/integration/application-documentation-generation.test.ts` - Befintliga tester
- `tests/integration/feature-goal-missing-subprocess.test.ts` - Nya tester för saknade subprocess-filer
- `docs/analysis/FEATURE_GOAL_GENERATION_WHEN_SUBPROCESS_MISSING.md` - Denna analys


