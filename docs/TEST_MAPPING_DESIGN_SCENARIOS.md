# Test Mapping & Design-scenarion

Detta dokument beskriver hur design-scenarion fungerar i BPMN Planner och hur de används för lokal testgenerering.

## Översikt

BPMN Planner stödjer två sätt att generera testscenarion:

1. **LLM-genererade scenarion** (när `VITE_USE_LLM=true`)
   - Genereras via ChatGPT eller Ollama
   - Sparas i `node_planned_scenarios` med provider `chatgpt` eller `ollama`

2. **Design-scenarion** (för lokal generering)
   - Statiska scenarion definierade i `src/data/testMapping.ts`
   - Används när LLM är avstängt (`useLlm = false`)
   - Sparas i `node_planned_scenarios` med provider `local-fallback` och `origin: 'design'`

## testMapping.ts

Filen `src/data/testMapping.ts` innehåller en statisk konfiguration av testscenarion per nod.

### Struktur

```typescript
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  duration?: number;
  category: 'happy-path' | 'error-case' | 'edge-case';
  contextWarning?: boolean;
}

export interface TestInfo {
  nodeId: string;
  nodeName: string;
  testFile: string;
  githubUrl: string;
  testCount: number;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  lastRun?: string;
  duration?: number;
  scenarios: TestScenario[];
}

export const testMapping: Record<string, TestInfo> = {
  'assess-stakeholder': {
    nodeId: 'assess-stakeholder',
    nodeName: 'Assess Stakeholder',
    // ... metadata
    scenarios: [
      {
        id: 'as-happy-1',
        name: 'Accept primary borrower with good metrics',
        description: 'Approves primary borrower with income 600k and DTI 25%',
        status: 'passing',
        category: 'happy-path',
      },
      // ... fler scenarion
    ],
  },
  // ... fler noder
};
```

### Hur design-scenarion används

#### 1. Vid hierarkibyggnad

När hierarkin byggs via `BpmnFileManager.handleBuildHierarchy()`:

- `createPlannedScenariosFromTree()` går igenom alla testbara noder i ProcessTree
- För varje nod:
  - Om `testMapping[nodeId]` finns → använd dess scenarion
  - Annars → skapa ett automatiskt "Happy path"-scenario
- Alla scenarion sparas i `node_planned_scenarios` med:
  - `provider: 'local-fallback'`
  - `origin: 'design'`

#### 2. Vid lokal testgenerering

När testscript genereras lokalt (utan LLM):

- `generateAllFromBpmn()` (legacy) eller `generateAllFromBpmnWithGraph()` (hierarkisk)
- För varje nod anropas `getDesignScenariosForElement(element)`:
  - Letar upp `testMapping[element.id]`
  - Mappar `TestScenario[]` till formatet som `generateTestSkeleton()` förväntar sig
  - Returnerar `undefined` om ingen mapping finns
- `generateTestSkeleton(element, scenarioInputs)` genererar Playwright-testscript med:
  - Ett `test()`-case per scenario från `testMapping`
  - Eller generiska TODO-kommentarer om inga scenarion finns

#### 3. I UI (Test Report)

- **Test Report** (`#/test-report`): Visar alla planerade scenarion per nod och provider
- **Node Tests** (`#/node-tests`): Visar detaljerad vy för en specifik nod med scenarion per provider
- Design-scenarion visas under provider `local-fallback`

## Utöka design-scenarion

För att lägga till fler eller bättre scenarion:

1. Öppna `src/data/testMapping.ts`
2. Lägg till eller uppdatera entry för noden (nyckel = `elementId` från BPMN-filen)
3. Definiera scenarion med relevanta kategorier:
   - `happy-path`: Normal, lyckad exekvering
   - `error-case`: Felhantering, ogiltiga inputs, etc.
   - `edge-case`: Gränsvärden, specialfall, etc.
4. När du kör lokal generering kommer dessa scenarion användas direkt i Playwright-testscripten

### Exempel

```typescript
'fetch-credit-information': {
  nodeId: 'fetch-credit-information',
  nodeName: 'Fetch Credit Information',
  testFile: 'tests/fetch-credit-information.spec.ts',
  githubUrl: 'https://github.com/...',
  testCount: 4,
  status: 'passing',
  scenarios: [
    {
      id: 'fci-happy-1',
      name: 'Retrieve credit information successfully',
      description: 'Successfully fetches credit data from UC/Bisnode',
      status: 'passing',
      category: 'happy-path',
    },
    {
      id: 'fci-error-1',
      name: 'Handle API timeout',
      description: 'Properly handles timeout when credit bureau is unavailable',
      status: 'passing',
      category: 'error-case',
    },
    {
      id: 'fci-edge-1',
      name: 'Process partial credit data',
      description: 'Handles scenarios where only partial credit information is available',
      status: 'passing',
      category: 'edge-case',
    },
  ],
},
```

## Viktiga noteringar

- **LLM-generering påverkas inte**: Design-scenarion används **endast** när `useLlm = false`. När LLM är aktiverat används LLM-genererade scenarion istället.
- **Fallback-scenarion**: Om en nod saknar entry i `testMapping.ts` skapas automatiskt ett enkelt "Happy path"-scenario vid hierarkibyggnad.
- **Persistens**: Design-scenarion sparas i `node_planned_scenarios`-tabellen i Supabase, så de är tillgängliga även efter reload.
- **Täckning**: Alla testbara noder (UserTask, ServiceTask, BusinessRuleTask, CallActivity) kan ha design-scenarion, men inte alla har entries i `testMapping.ts` ännu.

## Relaterade filer

- `src/data/testMapping.ts` – Statisk konfiguration av design-scenarion
- `src/lib/plannedScenariosHelper.ts` – Helper-funktioner för att skapa och spara planerade scenarion
- `src/lib/bpmnGenerators.ts` – Testgenerering med `getDesignScenariosForElement()` och `generateTestSkeleton()`
- `src/hooks/useNodeTests.ts` – Hook för att läsa planerade scenarion i UI

