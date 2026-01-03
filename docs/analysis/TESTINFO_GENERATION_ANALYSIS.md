# Analys: Fungerar testinfo-genereringen som tänkt?

## Din intention

1. **E2E-scenarios för root-processen (mortgage)**
   - När du laddar upp mortgage, application och internal-data-gathering
   - Vill du ha E2E-scenarios för **mortgage** (root-processen)
   - **INTE** för subprocesserna (application, internal-data-gathering)

2. **Feature Goal-tester (med given/when/then) för varje Feature Goal**
   - Frikopplade given/when/then för varje Feature Goal (callActivity)
   - Så att de kan testas separat
   - T.ex. `application` callActivity ska ha sina egna given/when/then

## Vad systemet faktiskt gör idag

### När du klickar "Generera testinformation (alla filer)"

1. **Systemet hittar root-filen** (mortgage.bpmn)
2. **Systemet bygger hierarki** med alla filer (mortgage, application, internal-data-gathering)
3. **Systemet bestämmer `isRootFileGeneration = true`** (rad 150-151)
4. **Systemet loopar över ALLA filer i hierarkin** (rad 198-322):
   - För `mortgage.bpmn`: Anropar `generateTestsForFile` med `isActualRootFile = false` (rad 246)
   - För `application.bpmn`: Anropar `generateTestsForFile` med `isActualRootFile = false`
   - För `internal-data-gathering.bpmn`: Anropar `generateTestsForFile` med `isActualRootFile = false`

5. **För varje fil genereras E2E-scenarios** (rad 725):
   - `generateE2eScenariosForProcess(mortgage.bpmn)` → Genererar E2E-scenarios för mortgage
   - `generateE2eScenariosForProcess(application.bpmn)` → Genererar E2E-scenarios för application ❌ (INTE önskat)
   - `generateE2eScenariosForProcess(internal-data-gathering.bpmn)` → Genererar E2E-scenarios för internal-data-gathering ❌ (INTE önskat)

6. **Feature Goal-tester extraheras från E2E-scenarios**:
   - Extraheras från mortgage E2E-scenarios → Feature Goal-tester för callActivities i mortgage
   - Men: Om E2E-scenarios inte genereras (pga filter), finns inga att extrahera från

## Problem

### Problem 1: E2E-scenarios genereras för ALLA filer, inte bara root

**Kod som orsakar detta:**
```typescript
// Rad 198-322: Loopar över alla filer i hierarkin
if (filesToGenerate.length > 1) {
  for (let i = 0; i < filesToGenerate.length; i++) {
    const fileName = filesToGenerate[i];
    // Anropar generateTestsForFile för VARJE fil
    const fileResult = await generateTestsForFile(
      fileName,
      // ...
      false, // isActualRootFile = false (rad 246)
    );
  }
}
```

**Resultat:**
- E2E-scenarios genereras för mortgage, application, och internal-data-gathering
- Men du vill bara ha E2E-scenarios för mortgage

### Problem 2: E2E-scenarios genereras inte för application/mortgage pga filter

**Kod som orsakar detta:**
```typescript
// Rad 863-871: Filtrerar bort paths som inte matchar "tre prioriterade scenarios"
const matchesPrioritizedScenario = path.featureGoals.length === 0 
  ? true // Always allow for processes without callActivities
  : checkIfPathMatchesPrioritizedScenario(path, featureGoalDocs);

if (!matchesPrioritizedScenario) {
  console.log(`[e2eScenarioGenerator] Path ${path.startEvent} → ${path.endEvent} does not match prioritized scenarios, skipping`);
  skippedNoMatch++;
  continue;
}
```

**Resultat:**
- Paths för application/mortgage matchar inte "tre prioriterade scenarios"
- Paths hoppas över → Inga E2E-scenarios genereras
- Inga E2E-scenarios → Inga Feature Goal-tester

### Problem 3: Feature Goal-tester saknar given/when/then

**Kod som orsakar detta:**
- Vi tog bort given/when/then-fälten från TestScenario interface
- `createTestScenarioWithGatewayContext` genererar inte given/when/then längre
- Resultat: Feature Goal-tester har bara `description`, inga separata given/when/then

## Lösning

### Fix 1: Generera E2E-scenarios ENDAST för root-filen

**Ändring i `testGenerators.ts`:**
```typescript
// Rad 198-322: Ändra logiken så att E2E-scenarios bara genereras för root-filen
if (filesToGenerate.length > 1) {
  // Loop över alla filer för Feature Goal-test-generering
  for (let i = 0; i < filesToGenerate.length; i++) {
    const fileName = filesToGenerate[i];
    const isRootFile = fileName === bpmnFileName; // Root-filen är den som anropades
    
    // Generera E2E-scenarios ENDAST för root-filen
    if (isRootFile) {
      // Generera E2E-scenarios här
    } else {
      // För subprocesser: Hoppa över E2E-generering
      // Feature Goal-tester extraheras från root-filens E2E-scenarios
    }
  }
}
```

### Fix 2: Ta bort `checkIfPathMatchesPrioritizedScenario`-filtret

**Ändring i `e2eScenarioGenerator.ts`:**
```typescript
// Rad 863-871: Ta bort filtret eller gör det mer generiskt
// FÖRE:
const matchesPrioritizedScenario = path.featureGoals.length === 0 
  ? true
  : checkIfPathMatchesPrioritizedScenario(path, featureGoalDocs);

// EFTER:
const matchesPrioritizedScenario = true; // Generera för alla paths
```

### Fix 3: Implementera Claude-generering för given/when/then

**Ändring i `e2eToFeatureGoalTestExtractor.ts`:**
- Implementera `generateFeatureGoalTestWithClaude` ordentligt
- Använd Claude för att generera meningsfulla given/when/then från Feature Goal-dokumentation
- Spara given/when/then i TestScenario

## Sammanfattning

**Systemet fungerar INTE som tänkt:**

1. ❌ E2E-scenarios genereras för ALLA filer (inte bara root)
2. ❌ E2E-scenarios genereras inte för application/mortgage (pga filter)
3. ❌ Feature Goal-tester saknar given/when/then

**Vad behöver fixas:**

1. ✅ Generera E2E-scenarios ENDAST för root-filen
2. ✅ Ta bort eller försvaga `checkIfPathMatchesPrioritizedScenario`-filtret
3. ✅ Implementera Claude-generering för given/when/then


