# Analys: Gateway-komplexitet i E2E → Feature Goal-koppling

## 🎯 Problem

**Komplexitet:** Inte alla Feature Goals anropas i varje E2E-scenario. Gateways avgör vilka Feature Goals som är relevanta baserat på conditions.

**Exempel:**
```
E2E-scenario 1 (Happy path):
  → Application (alltid)
  → Household (alltid)
  → Credit Evaluation (om KALP OK = Yes)
  → Mortgage Commitment (om KALP OK = Yes)
  → Collateral Registration (om KALP OK = Yes)

E2E-scenario 2 (Rejection path):
  → Application (alltid)
  → Household (alltid)
  → Credit Evaluation (om KALP OK = No)
  → Rejection (om KALP OK = No)
  → INTE: Mortgage Commitment, Collateral Registration
```

**Problem:**
- E2E-scenario 1 innehåller `credit-evaluation`, `mortgage-commitment`, `collateral-registration`
- E2E-scenario 2 innehåller `credit-evaluation`, `rejection`
- Feature Goal `credit-evaluation` är relevant för BÅDA scenarios, men med OLIKA kontext
- Feature Goal `mortgage-commitment` är INTE relevant för E2E-scenario 2

---

## 📊 Nuvarande struktur

### E2E-scenario med gateway-conditions

```typescript
interface E2eScenario {
  id: string;
  name: string;
  subprocessSteps: {
    order: number;
    callActivityId?: string; // Feature Goal
    given?: string; // Inkluderar gateway-conditions
    when?: string;
    then?: string;
  }[];
  // OBS: Gateway-conditions finns i path, inte direkt i E2eScenario
}
```

**Problem:**
- E2E-scenario har `subprocessSteps` med `callActivityId`
- Men gateway-conditions finns i **path** (från `bpmnFlowExtractor`), inte i E2E-scenario
- Vi behöver koppla gateway-conditions till Feature Goals

---

### Path med gateway-conditions

```typescript
interface ProcessPath {
  type: 'possible-path' | 'error-path';
  startEvent: string;
  endEvent: string;
  featureGoals: string[]; // Call activity IDs
  gatewayConditions: GatewayCondition[]; // ← Gateway-conditions
  nodeIds: string[];
}

interface GatewayCondition {
  gatewayId: string;
  gatewayName: string;
  condition: string;
  conditionText: string;
  flowId: string;
  targetNodeId: string;
}
```

**Viktigt:**
- `ProcessPath` har `gatewayConditions` - dessa avgör vilka Feature Goals som anropas
- `ProcessPath.featureGoals` är Feature Goals som anropas i denna path
- Gateway-conditions är "Given"-conditions för Feature Goals efter gateway

---

## 🔍 Analys: Hur gateway-conditions påverkar Feature Goals

### Scenario 1: Feature Goal före gateway

**Path:**
```
Start → Application → Household → Gateway (KALP OK?) → Credit Evaluation
```

**Gateway-condition:**
- `Gateway: KALP OK?`
- `Condition: KALP OK = Yes`
- `Target: Credit Evaluation`

**Feature Goals:**
- `Application` - alltid anropas (före gateway)
- `Household` - alltid anropas (före gateway)
- `Credit Evaluation` - anropas ENDAST om `KALP OK = Yes`

**E2E-scenario:**
- `subprocessSteps` innehåller `Application`, `Household`, `Credit Evaluation`
- Men `Credit Evaluation` ska ha `given: "KALP OK = Yes"`

---

### Scenario 2: Feature Goal efter gateway

**Path:**
```
Start → Application → Household → Gateway (KALP OK?) → Credit Evaluation → Mortgage Commitment
```

**Gateway-conditions:**
- `Gateway: KALP OK?`
  - `Condition: KALP OK = Yes` → `Credit Evaluation`
  - `Condition: KALP OK = No` → `Rejection`

**Feature Goals:**
- `Application` - alltid anropas
- `Household` - alltid anropas
- `Credit Evaluation` - anropas om `KALP OK = Yes`
- `Mortgage Commitment` - anropas om `KALP OK = Yes` OCH `Credit Evaluation` är klar
- `Rejection` - anropas om `KALP OK = No`

**E2E-scenario:**
- E2E-scenario 1 (Happy path): `Application`, `Household`, `Credit Evaluation`, `Mortgage Commitment`
- E2E-scenario 2 (Rejection path): `Application`, `Household`, `Rejection`

---

## 💡 Lösning: Gateway-aware Feature Goal-test extraktion

### Steg 1: Koppla gateway-conditions till Feature Goals

**Algoritm:**
1. För varje E2E-scenario:
   - Hitta motsvarande `ProcessPath` (baserat på `featureGoals` i ordning)
   - Extrahera `gatewayConditions` från `ProcessPath`
   - Koppla gateway-conditions till Feature Goals

2. För varje `subprocessStep` i E2E-scenario:
   - Identifiera gateway-conditions som gäller FÖRE denna Feature Goal
   - Lägg till gateway-conditions i `subprocessStep.given`

**Exempel:**
```typescript
// ProcessPath
{
  featureGoals: ['application', 'household', 'credit-evaluation', 'mortgage-commitment'],
  gatewayConditions: [
    {
      gatewayId: 'gateway-1',
      gatewayName: 'KALP OK?',
      condition: 'KALP OK = Yes',
      targetNodeId: 'credit-evaluation',
    },
  ],
}

// E2E-scenario subprocessStep för 'credit-evaluation'
{
  callActivityId: 'credit-evaluation',
  given: 'Application is complete, Household is complete, KALP OK = Yes', // ← Gateway-condition
  when: 'System evaluates credit',
  then: 'Credit evaluation is complete',
}
```

---

### Steg 2: Extrahera Feature Goal-tester med gateway-kontext

**Algoritm:**
1. För varje E2E-scenario:
   - För varje `subprocessStep`:
     - Identifiera gateway-conditions som gäller för denna Feature Goal
     - Skapa `TestScenario` med gateway-conditions i `given`

2. Gruppera Feature Goal-tester per Feature Goal:
   - Samla alla tester för samma `callActivityId`
   - **VIKTIGT:** Separera tester baserat på gateway-conditions
   - T.ex. `credit-evaluation` med `KALP OK = Yes` vs `credit-evaluation` med `KALP OK = No`

3. Deduplicera tester:
   - Tester med samma `given`, `when`, `then` är duplicerade
   - Men tester med OLIKA gateway-conditions är INTE duplicerade

---

### Steg 3: Skapa Feature Goal-tester med gateway-kontext

**Transformation:**
```typescript
// Input: E2E-scenario med gateway-conditions
{
  id: 'e2e-1',
  subprocessSteps: [
    {
      callActivityId: 'application',
      given: 'Customer is identified',
      when: 'Customer fills in application',
      then: 'Application is validated',
    },
    {
      callActivityId: 'credit-evaluation',
      given: 'Application is complete, Household is complete, KALP OK = Yes', // ← Gateway-condition
      when: 'System evaluates credit',
      then: 'Credit evaluation is complete',
    },
  ],
}

// Output: Feature Goal-tester
// Feature Goal: 'application'
{
  id: 'application-e2e-1-step-1',
  name: 'Application - Customer fills in application',
  description: 'Given: Customer is identified\nWhen: Customer fills in application\nThen: Application is validated',
  category: 'happy-path',
}

// Feature Goal: 'credit-evaluation'
{
  id: 'credit-evaluation-e2e-1-step-2',
  name: 'Credit Evaluation - System evaluates credit (KALP OK = Yes)',
  description: 'Given: Application is complete, Household is complete, KALP OK = Yes\nWhen: System evaluates credit\nThen: Credit evaluation is complete',
  category: 'happy-path',
}
```

---

## 🏗️ Implementation

### Fil: `src/lib/e2eToFeatureGoalTestExtractor.ts` (uppdaterad)

```typescript
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { TestScenario } from '@/data/testMapping';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import type { ProcessPath, GatewayCondition } from '@/lib/bpmnFlowExtractor';

export interface FeatureGoalTestExtraction {
  callActivityId: string;
  bpmnFile: string;
  testScenarios: TestScenario[];
  sourceE2eScenarios: string[];
  gatewayContexts: Map<string, GatewayCondition[]>; // Gateway-conditions per test
}

/**
 * Extraherar Feature Goal-tester från E2E-scenarios med gateway-kontext
 */
export function extractFeatureGoalTestsWithGatewayContext(
  e2eScenarios: E2eScenario[],
  paths: ProcessPath[], // Paths med gateway-conditions
  featureGoalDocs: Map<string, FeatureGoalDocModel>
): Map<string, FeatureGoalTestExtraction> {
  const result = new Map<string, FeatureGoalTestExtraction>();

  for (const e2eScenario of e2eScenarios) {
    // 1. Hitta motsvarande ProcessPath för E2E-scenario
    const matchingPath = findMatchingPath(e2eScenario, paths);
    
    if (!matchingPath) {
      console.warn(`[extractFeatureGoalTestsWithGatewayContext] No matching path for E2E-scenario ${e2eScenario.id}`);
      continue;
    }

    // 2. Bygg gateway-context map (vilka gateway-conditions gäller för vilka Feature Goals)
    const gatewayContextMap = buildGatewayContextMap(matchingPath);

    // 3. För varje subprocessStep, extrahera Feature Goal-test med gateway-kontext
    for (const subprocessStep of e2eScenario.subprocessSteps) {
      if (!subprocessStep.callActivityId) continue;

      const callActivityId = subprocessStep.callActivityId;
      const key = `${subprocessStep.bpmnFile}::${callActivityId}`;

      if (!result.has(key)) {
        result.set(key, {
          callActivityId,
          bpmnFile: subprocessStep.bpmnFile,
          testScenarios: [],
          sourceE2eScenarios: [],
          gatewayContexts: new Map(),
        });
      }

      const extraction = result.get(key)!;
      
      // 4. Hämta gateway-conditions för denna Feature Goal
      const gatewayConditions = gatewayContextMap.get(callActivityId) || [];
      
      // 5. Skapa TestScenario med gateway-kontext
      const testScenario = createTestScenarioWithGatewayContext(
        subprocessStep,
        e2eScenario,
        gatewayConditions,
        featureGoalDocs.get(key)
      );

      extraction.testScenarios.push(testScenario);
      
      // 6. Spara gateway-context för denna test
      const testKey = `${testScenario.id}`;
      extraction.gatewayContexts.set(testKey, gatewayConditions);
      
      if (!extraction.sourceE2eScenarios.includes(e2eScenario.id)) {
        extraction.sourceE2eScenarios.push(e2eScenario.id);
      }
    }
  }

  // 7. Deduplicera tester (men behåll olika gateway-kontext)
  for (const extraction of result.values()) {
    extraction.testScenarios = deduplicateTestScenariosWithGatewayContext(
      extraction.testScenarios,
      extraction.gatewayContexts
    );
    extraction.testScenarios = sortTestScenarios(extraction.testScenarios);
  }

  return result;
}

/**
 * Hittar ProcessPath som matchar E2E-scenario
 */
function findMatchingPath(
  e2eScenario: E2eScenario,
  paths: ProcessPath[]
): ProcessPath | undefined {
  const e2eFeatureGoals = e2eScenario.subprocessSteps
    .map(step => step.callActivityId)
    .filter(Boolean) as string[];

  return paths.find(path => {
    // Matcha baserat på Feature Goals i samma ordning
    return arraysEqual(path.featureGoals, e2eFeatureGoals);
  });
}

/**
 * Bygger gateway-context map (vilka gateway-conditions gäller för vilka Feature Goals)
 */
function buildGatewayContextMap(
  path: ProcessPath
): Map<string, GatewayCondition[]> {
  const contextMap = new Map<string, GatewayCondition[]>();

  // För varje Feature Goal, samla gateway-conditions som gäller FÖRE denna Feature Goal
  for (let i = 0; i < path.featureGoals.length; i++) {
    const featureGoalId = path.featureGoals[i];
    const conditions: GatewayCondition[] = [];

    // Hitta gateway-conditions som gäller FÖRE denna Feature Goal
    for (const condition of path.gatewayConditions) {
      // Kontrollera om gateway är FÖRE denna Feature Goal i pathen
      const gatewayIndex = path.nodeIds.indexOf(condition.gatewayId);
      const featureGoalIndex = path.nodeIds.indexOf(featureGoalId);
      
      if (gatewayIndex !== -1 && featureGoalIndex !== -1 && gatewayIndex < featureGoalIndex) {
        // Gateway är FÖRE Feature Goal - condition gäller
        conditions.push(condition);
      }
    }

    contextMap.set(featureGoalId, conditions);
  }

  return contextMap;
}

/**
 * Skapar TestScenario med gateway-kontext
 */
function createTestScenarioWithGatewayContext(
  subprocessStep: E2eScenario['subprocessSteps'][0],
  e2eScenario: E2eScenario,
  gatewayConditions: GatewayCondition[],
  featureGoalDoc?: FeatureGoalDocModel
): TestScenario {
  const id = `${subprocessStep.callActivityId}-e2e-${e2eScenario.id}-step-${subprocessStep.order}`;
  
  // Bygg name med gateway-kontext
  const gatewayContextText = gatewayConditions.length > 0
    ? ` (${gatewayConditions.map(gc => gc.conditionText).join(', ')})`
    : '';
  const name = `${subprocessStep.callActivityId} - ${subprocessStep.description}${gatewayContextText}`;
  
  // Bygg description med gateway-conditions
  const descriptionParts: string[] = [];
  
  // Given: subprocessStep.given + gateway-conditions
  if (subprocessStep.given) {
    descriptionParts.push(`Given: ${subprocessStep.given}`);
  }
  if (gatewayConditions.length > 0) {
    const gatewayText = gatewayConditions.map(gc => gc.conditionText).join(', ');
    descriptionParts.push(`Gateway Conditions: ${gatewayText}`);
  }
  if (featureGoalDoc?.prerequisites) {
    descriptionParts.push(`Prerequisites: ${featureGoalDoc.prerequisites.join(', ')}`);
  }
  
  // When: subprocessStep.when + Feature Goal flowSteps
  if (subprocessStep.when) {
    descriptionParts.push(`When: ${subprocessStep.when}`);
  }
  if (featureGoalDoc?.flowSteps) {
    descriptionParts.push(`Flow: ${featureGoalDoc.flowSteps.join(' → ')}`);
  }
  
  // Then: subprocessStep.then + Feature Goal acceptanceCriteria
  if (subprocessStep.then) {
    descriptionParts.push(`Then: ${subprocessStep.then}`);
  }
  if (featureGoalDoc?.userStories) {
    const acceptanceCriteria = featureGoalDoc.userStories
      .flatMap(us => us.acceptanceCriteria)
      .join(', ');
    if (acceptanceCriteria) {
      descriptionParts.push(`Acceptance: ${acceptanceCriteria}`);
    }
  }

  const description = descriptionParts.join('\n');

  return {
    id,
    name,
    description,
    status: 'pending',
    category: mapE2eTypeToCategory(e2eScenario.type),
  };
}

/**
 * Deduplicerar TestScenarios med gateway-kontext
 * Tester med samma innehåll OCH samma gateway-conditions är duplicerade
 * Tester med OLIKA gateway-conditions är INTE duplicerade
 */
function deduplicateTestScenariosWithGatewayContext(
  scenarios: TestScenario[],
  gatewayContexts: Map<string, GatewayCondition[]>
): TestScenario[] {
  const seen = new Set<string>();
  const unique: TestScenario[] = [];

  for (const scenario of scenarios) {
    const gatewayConditions = gatewayContexts.get(scenario.id) || [];
    const gatewayKey = gatewayConditions.map(gc => gc.conditionText).join('|');
    
    // Skapa unik nyckel baserat på name, description OCH gateway-conditions
    const key = `${scenario.name}:${scenario.description}:${gatewayKey}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(scenario);
    }
  }

  return unique;
}

// ... (resten av funktionerna är samma som tidigare)
```

---

## 📊 Kvalitetsbedömning

### Förväntad kvalitet: 75-85%

**Varför:**
- ✅ Tar hänsyn till gateway-conditions
- ✅ Separerar Feature Goal-tester baserat på gateway-kontext
- ✅ Använder ProcessPath för att hitta gateway-conditions
- ⚠️ Kräver att E2E-scenarios har korrekt koppling till ProcessPath

**Vad som saknas:**
- Automatisk validering att E2E-scenario matchar ProcessPath
- Hantering av komplexa gateway-scenarios (flera gateways i rad)

---

## 🎯 Rekommendation

### Steg 1: Koppla E2E-scenarios till ProcessPath

**Vad vi gör:**
1. När E2E-scenario genereras, spara även `pathId` (referens till ProcessPath)
2. När Feature Goal-tester extraheras, använd `pathId` för att hitta gateway-conditions

---

### Steg 2: Extrahera Feature Goal-tester med gateway-kontext

**Vad vi gör:**
1. För varje E2E-scenario:
   - Hitta motsvarande ProcessPath
   - Bygg gateway-context map
   - Extrahera Feature Goal-tester med gateway-kontext

2. Gruppera Feature Goal-tester:
   - Separera tester baserat på gateway-conditions
   - T.ex. `credit-evaluation` med `KALP OK = Yes` vs `credit-evaluation` med `KALP OK = No`

---

### Steg 3: Spara Feature Goal-tester med gateway-kontext

**Vad vi gör:**
1. Spara `TestScenario[]` till `node_planned_scenarios` tabellen
2. Inkludera gateway-conditions i test-description
3. Använd gateway-conditions för att deduplicera tester

---

## 📝 Slutsats

### ✅ Gateway-komplexitet hanteras

**Lösning:**
1. Koppla E2E-scenarios till ProcessPath (med gateway-conditions)
2. Extrahera gateway-conditions för varje Feature Goal
3. Skapa Feature Goal-tester med gateway-kontext
4. Separera tester baserat på gateway-conditions

**Resultat:**
- Feature Goal `credit-evaluation` får separata tester för `KALP OK = Yes` och `KALP OK = No`
- Feature Goal `mortgage-commitment` får endast tester för `KALP OK = Yes` (inte för `KALP OK = No`)

---

**Datum:** 2025-12-22
**Status:** Analys klar - Gateway-komplexitet hanterad



