# Analys: Koppling mellan E2E-scenarios och Feature Goal-tester

## 🎯 Syfte

Analysera hur E2E-scenarios kopplas till Feature Goals och hur vi kan generera Feature Goal-tester baserat på E2E-scenarios.

---

## 📊 Nuvarande struktur

### E2E-scenario struktur

```typescript
interface E2eScenario {
  id: string;
  name: string;
  summary: string;
  given: string;
  when: string;
  then: string;
  bankProjectTestSteps: BankProjectTestStep[]; // Teststeg för hela flödet
  subprocessSteps: {
    order: number;
    bpmnFile: string;
    callActivityId?: string; // ← Koppling till Feature Goal
    featureGoalFile?: string;
    description: string;
    given?: string;
    when?: string;
    then?: string;
    // ...
  }[];
}
```

**Viktigt:**
- `subprocessSteps` innehåller `callActivityId` - detta är kopplingen till Feature Goals
- Varje `subprocessStep` representerar ett Feature Goal i E2E-scenariot
- `subprocessSteps` har `given`, `when`, `then` - dessa kan användas för Feature Goal-tester

---

### Feature Goal struktur

```typescript
interface FeatureGoalDocModel {
  summary: string;
  prerequisites: string[];
  flowSteps: string[];
  userStories: UserStory[];
  dependencies: string[];
}
```

**Viktigt:**
- Feature Goals är dokumentation, inte tester
- Feature Goals har `userStories` med `acceptanceCriteria` - dessa kan användas för tester
- Feature Goals har `flowSteps` - dessa kan användas för teststeg

---

### TestScenario struktur (node_planned_scenarios)

```typescript
interface TestScenario {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  category: 'happy-path' | 'alt-path' | 'error' | 'edge-case';
}
```

**Viktigt:**
- `node_planned_scenarios` tabellen sparar `TestScenario[]` per Feature Goal
- Varje Feature Goal kan ha flera `TestScenario`
- `TestScenario` är på Feature Goal-nivå, inte E2E-nivå

---

## 🔗 Koppling: E2E → Feature Goal

### Nuvarande koppling

**E2E-scenario → Feature Goal:**
- E2E-scenario har `subprocessSteps` med `callActivityId`
- `callActivityId` motsvarar Feature Goal (call activity)
- Varje `subprocessStep` har `given`, `when`, `then` - dessa är Feature Goal-specifika

**Exempel:**
```typescript
// E2E-scenario
{
  id: 'e2e-1',
  name: 'Happy path - Application',
  subprocessSteps: [
    {
      order: 1,
      callActivityId: 'application', // ← Feature Goal
      description: 'Application process',
      given: 'Customer is identified',
      when: 'Customer fills in application',
      then: 'Application is validated',
    },
    {
      order: 2,
      callActivityId: 'household', // ← Feature Goal
      description: 'Household process',
      given: 'Application is validated',
      when: 'System collects household data',
      then: 'Household data is complete',
    },
  ],
}
```

**Feature Goal (application):**
- `callActivityId: 'application'` → Feature Goal för `application` call activity
- `subprocessStep.given` → Feature Goal `prerequisites`
- `subprocessStep.when` → Feature Goal `flowSteps`
- `subprocessStep.then` → Feature Goal `outputs` (eller assertions)

---

## 🎯 Problem: Hur genererar vi Feature Goal-tester från E2E-scenarios?

### Problem 1: E2E-scenarios är på högre nivå

**E2E-scenario:**
- Testar hela flödet (flera Feature Goals i ordning)
- Har kontext från hela processen
- Har gateway-conditions och end events

**Feature Goal-test:**
- Testar en enskild subprocess (Feature Goal)
- Har isolerad kontext
- Har inga gateway-conditions eller end events

**Lösning:**
- Extrahera `subprocessStep` från E2E-scenario
- Använd `subprocessStep.given`, `when`, `then` som grund för Feature Goal-test
- Använd Feature Goal-dokumentation för att berika testet

---

### Problem 2: E2E-scenarios har flera Feature Goals

**E2E-scenario:**
- Har flera `subprocessSteps` (flera Feature Goals)
- Varje `subprocessStep` är en Feature Goal

**Feature Goal-test:**
- Testar en enskild Feature Goal
- Behöver isolerad kontext

**Lösning:**
- För varje `subprocessStep` i E2E-scenario, skapa ett Feature Goal-test
- Använd `subprocessStep.given`, `when`, `then` som grund
- Använd Feature Goal-dokumentation för att berika testet

---

### Problem 3: E2E-scenarios har kontext från hela processen

**E2E-scenario:**
- `given` innehåller kontext från hela processen
- `when` innehåller flera Feature Goals
- `then` innehåller assertions för hela flödet

**Feature Goal-test:**
- `given` ska vara isolerad (bara för Feature Goal)
- `when` ska vara isolerad (bara för Feature Goal)
- `then` ska vara isolerad (bara för Feature Goal)

**Lösning:**
- Extrahera isolerad kontext från `subprocessStep`
- Använd `subprocessStep.given`, `when`, `then` direkt
- Använd Feature Goal-dokumentation för att berika testet

---

## 💡 Lösning: Generera Feature Goal-tester från E2E-scenarios

### Steg 1: Extrahera Feature Goal-tester från E2E-scenarios

**Algoritm:**
1. För varje E2E-scenario:
   - För varje `subprocessStep`:
     - Extrahera `callActivityId` (Feature Goal)
     - Extrahera `subprocessStep.given`, `when`, `then`
     - Skapa Feature Goal-test baserat på dessa

2. Gruppera Feature Goal-tester per Feature Goal:
   - Samla alla tester för samma `callActivityId`
   - Deduplicera liknande tester
   - Sortera efter relevans

3. Berika Feature Goal-tester med Feature Goal-dokumentation:
   - Lägg till `prerequisites` från Feature Goal-dokumentation
   - Lägg till `flowSteps` från Feature Goal-dokumentation
   - Lägg till `userStories` från Feature Goal-dokumentation

---

### Steg 2: Skapa TestScenario från E2E subprocessStep

**Transformation:**
```typescript
// Input: E2E subprocessStep
{
  order: 1,
  callActivityId: 'application',
  description: 'Application process',
  given: 'Customer is identified',
  when: 'Customer fills in application',
  then: 'Application is validated',
}

// Output: TestScenario för Feature Goal
{
  id: 'application-e2e-1-step-1',
  name: 'Application - Customer fills in application',
  description: 'Given: Customer is identified\nWhen: Customer fills in application\nThen: Application is validated',
  status: 'pending',
  category: 'happy-path', // Baserat på E2E-scenario type
}
```

---

### Steg 3: Berika med Feature Goal-dokumentation

**Transformation:**
```typescript
// Input: TestScenario + Feature Goal-dokumentation
{
  id: 'application-e2e-1-step-1',
  name: 'Application - Customer fills in application',
  description: 'Given: Customer is identified\nWhen: Customer fills in application\nThen: Application is validated',
}

// Feature Goal-dokumentation:
{
  summary: 'Application process collects customer information',
  prerequisites: ['Customer is identified', 'Application form is available'],
  flowSteps: [
    'System initiates application process',
    'Customer fills in application form',
    'System validates application data',
  ],
  userStories: [
    {
      role: 'Kund',
      goal: 'Fylla i ansökan',
      acceptanceCriteria: ['Application is complete', 'Application is validated'],
    },
  ],
}

// Output: Berikad TestScenario
{
  id: 'application-e2e-1-step-1',
  name: 'Application - Customer fills in application',
  description: `
    Given: Customer is identified, Application form is available
    When: Customer fills in application form
    Then: Application is validated, Application is complete
  `,
  status: 'pending',
  category: 'happy-path',
  // Ytterligare metadata från Feature Goal-dokumentation
}
```

---

## 🏗️ Implementation

### Fil: `src/lib/e2eToFeatureGoalTestExtractor.ts`

```typescript
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { TestScenario } from '@/data/testMapping';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';

export interface FeatureGoalTestExtraction {
  callActivityId: string;
  bpmnFile: string;
  testScenarios: TestScenario[];
  sourceE2eScenarios: string[]; // E2E-scenario IDs som användes
}

/**
 * Extraherar Feature Goal-tester från E2E-scenarios
 */
export function extractFeatureGoalTests(
  e2eScenarios: E2eScenario[],
  featureGoalDocs: Map<string, FeatureGoalDocModel>
): Map<string, FeatureGoalTestExtraction> {
  const result = new Map<string, FeatureGoalTestExtraction>();

  for (const e2eScenario of e2eScenarios) {
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
        });
      }

      const extraction = result.get(key)!;
      
      // Skapa TestScenario från subprocessStep
      const testScenario = createTestScenarioFromSubprocessStep(
        subprocessStep,
        e2eScenario,
        featureGoalDocs.get(key)
      );

      extraction.testScenarios.push(testScenario);
      
      if (!extraction.sourceE2eScenarios.includes(e2eScenario.id)) {
        extraction.sourceE2eScenarios.push(e2eScenario.id);
      }
    }
  }

  // Deduplicera och sortera tester
  for (const extraction of result.values()) {
    extraction.testScenarios = deduplicateTestScenarios(extraction.testScenarios);
    extraction.testScenarios = sortTestScenarios(extraction.testScenarios);
  }

  return result;
}

/**
 * Skapar TestScenario från E2E subprocessStep
 */
function createTestScenarioFromSubprocessStep(
  subprocessStep: E2eScenario['subprocessSteps'][0],
  e2eScenario: E2eScenario,
  featureGoalDoc?: FeatureGoalDocModel
): TestScenario {
  const id = `${subprocessStep.callActivityId}-e2e-${e2eScenario.id}-step-${subprocessStep.order}`;
  const name = `${subprocessStep.callActivityId} - ${subprocessStep.description}`;
  
  // Bygg description från subprocessStep + Feature Goal-dokumentation
  const descriptionParts: string[] = [];
  
  if (subprocessStep.given) {
    descriptionParts.push(`Given: ${subprocessStep.given}`);
  }
  if (featureGoalDoc?.prerequisites) {
    descriptionParts.push(`Prerequisites: ${featureGoalDoc.prerequisites.join(', ')}`);
  }
  
  if (subprocessStep.when) {
    descriptionParts.push(`When: ${subprocessStep.when}`);
  }
  if (featureGoalDoc?.flowSteps) {
    descriptionParts.push(`Flow: ${featureGoalDoc.flowSteps.join(' → ')}`);
  }
  
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
 * Mappar E2E-scenario type till TestScenario category
 */
function mapE2eTypeToCategory(
  e2eType: E2eScenario['type']
): TestScenario['category'] {
  switch (e2eType) {
    case 'happy-path':
      return 'happy-path';
    case 'alt-path':
      return 'alt-path';
    case 'error':
      return 'error';
    default:
      return 'happy-path';
  }
}

/**
 * Deduplicerar TestScenarios
 */
function deduplicateTestScenarios(
  scenarios: TestScenario[]
): TestScenario[] {
  const seen = new Set<string>();
  const unique: TestScenario[] = [];

  for (const scenario of scenarios) {
    // Skapa unik nyckel baserat på name och description
    const key = `${scenario.name}:${scenario.description}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(scenario);
    }
  }

  return unique;
}

/**
 * Sorterar TestScenarios
 */
function sortTestScenarios(scenarios: TestScenario[]): TestScenario[] {
  return [...scenarios].sort((a, b) => {
    // Sortera efter category (happy-path först)
    const categoryOrder = {
      'happy-path': 0,
      'alt-path': 1,
      'edge-case': 2,
      'error': 3,
    };
    const aOrder = categoryOrder[a.category] ?? 99;
    const bOrder = categoryOrder[b.category] ?? 99;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    // Sedan sortera efter name
    return a.name.localeCompare(b.name);
  });
}
```

---

### Fil: `src/lib/featureGoalTestGenerator.ts`

```typescript
import { extractFeatureGoalTests } from './e2eToFeatureGoalTestExtractor';
import { savePlannedScenarios } from './plannedScenariosHelper';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import { loadFeatureGoalDocs } from './featureGoalDocLoader';

export interface FeatureGoalTestGenerationOptions {
  e2eScenarios: E2eScenario[];
  bpmnFiles: string[];
}

export interface FeatureGoalTestGenerationResult {
  generated: number;
  skipped: number;
  errors: Array<{ callActivityId: string; error: string }>;
}

/**
 * Genererar Feature Goal-tester från E2E-scenarios
 */
export async function generateFeatureGoalTestsFromE2e(
  options: FeatureGoalTestGenerationOptions
): Promise<FeatureGoalTestGenerationResult> {
  const result: FeatureGoalTestGenerationResult = {
    generated: 0,
    skipped: 0,
    errors: [],
  };

  // 1. Ladda Feature Goal-dokumentation
  const featureGoalDocs = await loadFeatureGoalDocs(options.bpmnFiles);

  // 2. Extrahera Feature Goal-tester från E2E-scenarios
  const extractions = extractFeatureGoalTests(
    options.e2eScenarios,
    featureGoalDocs
  );

  // 3. Spara Feature Goal-tester till databas
  for (const [key, extraction] of extractions.entries()) {
    try {
      const [bpmnFile, callActivityId] = key.split('::');
      
      const rows = [{
        bpmn_file: bpmnFile,
        bpmn_element_id: callActivityId,
        provider: 'claude' as const,
        origin: 'llm-doc' as const,
        scenarios: extraction.testScenarios,
      }];

      const saveResult = await savePlannedScenarios(rows, 'e2e-to-feature-goal');
      
      if (saveResult.success) {
        result.generated += extraction.testScenarios.length;
      } else {
        result.skipped += extraction.testScenarios.length;
        result.errors.push({
          callActivityId,
          error: saveResult.error?.message || 'Unknown error',
        });
      }
    } catch (error) {
      result.skipped += extraction.testScenarios.length;
      result.errors.push({
        callActivityId: extraction.callActivityId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
```

---

## 📊 Kvalitetsbedömning

### Förväntad kvalitet: 70-80%

**Varför:**
- ✅ Använder E2E-scenarios som grund (redan genererade)
- ✅ Använder Feature Goal-dokumentation för berikning
- ✅ Deduplicerar liknande tester
- ⚠️ Kan sakna vissa edge cases (beroende på E2E-scenarios)

**Vad som saknas:**
- Feature Goal-specifika edge cases (som inte finns i E2E-scenarios)
- Feature Goal-specifika error scenarios (som inte finns i E2E-scenarios)

---

## 🎯 Rekommendation

### Steg 1: Extrahera Feature Goal-tester från E2E-scenarios

**Vad vi gör:**
1. För varje E2E-scenario:
   - För varje `subprocessStep`:
     - Extrahera `callActivityId` (Feature Goal)
     - Skapa `TestScenario` från `subprocessStep.given`, `when`, `then`

2. Gruppera Feature Goal-tester per Feature Goal:
   - Samla alla tester för samma `callActivityId`
   - Deduplicera liknande tester

3. Berika med Feature Goal-dokumentation:
   - Lägg till `prerequisites`, `flowSteps`, `userStories`

---

### Steg 2: Spara Feature Goal-tester till databas

**Vad vi gör:**
1. Spara `TestScenario[]` till `node_planned_scenarios` tabellen
2. Använd `bpmn_file`, `bpmn_element_id`, `provider: 'claude'`, `origin: 'llm-doc'`

---

### Steg 3: Visa Feature Goal-tester i UI

**Vad vi gör:**
1. Använd `useNodePlannedScenarios` för att läsa Feature Goal-tester
2. Visa tester per Feature Goal
3. Visa koppling till E2E-scenarios (sourceE2eScenarios)

---

## 📝 Slutsats

### ✅ Koppling: E2E → Feature Goal

**Nuvarande koppling:**
- E2E-scenario har `subprocessSteps` med `callActivityId`
- `callActivityId` motsvarar Feature Goal
- Varje `subprocessStep` har `given`, `when`, `then` - dessa är Feature Goal-specifika

**Förbättring:**
- Extrahera Feature Goal-tester från E2E-scenarios
- Berika med Feature Goal-dokumentation
- Spara till `node_planned_scenarios` tabellen

---

### ✅ Generera Feature Goal-tester från E2E-scenarios

**Algoritm:**
1. För varje E2E-scenario → för varje `subprocessStep`:
   - Skapa `TestScenario` från `subprocessStep.given`, `when`, `then`
   - Berika med Feature Goal-dokumentation
   - Gruppera per Feature Goal

2. Deduplicera och sortera tester

3. Spara till `node_planned_scenarios` tabellen

---

**Datum:** 2025-12-22
**Status:** Analys klar - Lösning föreslagen







