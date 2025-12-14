# E2E Test Strategy för Mortgage Process

## Översikt

Detta dokument beskriver strategin för att skapa E2E (End-to-End) test-scenarier baserat på BPMN-filerna i mortgage-processen.

## 1. Strategi för att identifiera test-scenarier från BPMN

### 1.1 Analys av BPMN-struktur

Vi använder följande approach för att extrahera test-scenarier:

#### A. Process-hierarki
- **Root process** (`mortgage.bpmn`) - orkestrerar hela flödet
- **Subprocesser** - anropas via call activities
- **Mapping** - `bpmn-map.json` mappar call activities till subprocess-filer

#### B. Flödes-element att analysera

1. **Start Events** - Identifierar startpunkter för test-scenarier
2. **End Events** - Identifierar slutpunkter (success, error, cancel)
3. **Gateways** - Identifierar besluts-punkter och alternativa vägar:
   - **Exclusive Gateways (XOR)** - Väljer en väg baserat på villkor
   - **Inclusive Gateways (OR)** - Kan ta flera vägar
   - **Parallel Gateways (AND)** - Tar alla vägar parallellt
   - **Event-based Gateways** - Väljer väg baserat på events
4. **Sequence Flows** - Identifierar flödes-ordning
5. **Conditions** - Extraherar villkor från sequence flows
6. **Tasks** - Identifierar aktiviteter som behöver testas:
   - **User Tasks** - Kräver användarinteraktion
   - **Service Tasks** - API-anrop
   - **Business Rule Tasks** - DMN-beslut
   - **Script Tasks** - Automatiserad logik
7. **Boundary Events** - Identifierar felhantering och timeout-scenarier
8. **Intermediate Events** - Identifierar mellanliggande händelser

### 1.2 Scenarie-identifiering

#### Happy Path Scenarier
- **Metod**: Följ huvudflödet från start event till success end event
- **Identifiering**: 
  - Hitta alla sequence flows utan conditions (default flows)
  - Följ call activities i ordning
  - Ignorera error paths och alternative paths

#### Alternative Path Scenarier
- **Metod**: För varje gateway, identifiera alla utgående sequence flows med conditions
- **Identifiering**:
  - Extrahera condition expressions från sequence flows
  - Skapa ett scenario per condition
  - Inkludera både true och false paths där relevant

#### Error Handling Scenarier
- **Metod**: Identifiera boundary events och error end events
- **Identifiering**:
  - Hitta alla boundary events (error, timer, escalation)
  - Identifiera error end events
  - Skapa scenarier för varje feltyp

#### Integration Scenarier
- **Metod**: Följ call activities och deras subprocesser
- **Identifiering**:
  - För varje call activity, validera att subprocessen kan köras
  - Testa dataflöde mellan parent och subprocess
  - Testa att subprocess kan returnera till parent

## 2. Strukturering och prioritering av test-scenarier

### 2.1 Prioriteringsnivåer

#### P0 - Critical Path (Måste fungera)
- **Happy path** genom hela processen
- **Kritiska subprocesser** (Application, Credit Decision, Signing, Disbursement)
- **Felhantering** för kritiska fel

#### P1 - High Priority (Viktigt för produktion)
- **Alternative paths** i kritiska subprocesser
- **Integration** mellan huvudprocess och subprocesser
- **Data validation** vid viktiga steg

#### P2 - Medium Priority (Bör fungera)
- **Edge cases** och boundary conditions
- **Timeout-scenarier**
- **Rollback och compensation**

#### P3 - Low Priority (Nice to have)
- **Performance testing**
- **Load testing**
- **Stress testing**

### 2.2 Test-struktur

```
tests/e2e/
├── scenarios/
│   ├── happy-path/
│   │   ├── complete-mortgage-flow.test.ts
│   │   └── application-to-disbursement.test.ts
│   ├── alternative-paths/
│   │   ├── credit-decision-rejected.test.ts
│   │   ├── application-incomplete.test.ts
│   │   └── signing-timeout.test.ts
│   ├── error-handling/
│   │   ├── service-task-failure.test.ts
│   │   ├── timeout-scenarios.test.ts
│   │   └── rollback-scenarios.test.ts
│   └── integration/
│       ├── call-activity-integration.test.ts
│       └── subprocess-data-flow.test.ts
├── fixtures/
│   ├── test-data/
│   │   ├── valid-application.json
│   │   ├── invalid-application.json
│   │   └── credit-decision-data.json
│   └── mocks/
│       ├── api-mocks.ts
│       └── service-mocks.ts
└── utils/
    ├── bpmn-scenario-extractor.ts
    ├── test-data-builder.ts
    └── assertion-helpers.ts
```

## 3. Mappning av BPMN-flöden till konkreta test-steg

### 3.1 Test-steg struktur

Varje test-scenario följer denna struktur:

```typescript
describe('Mortgage Application - Happy Path', () => {
  it('should complete full mortgage application flow', async () => {
    // 1. SETUP - Initiera test-miljö
    const testContext = await setupTestEnvironment();
    
    // 2. START - Starta processen
    const processInstance = await startProcess('mortgage', {
      applicationData: validApplicationData
    });
    
    // 3. EXECUTE - Följ BPMN-flödet steg för steg
    // Steg 1: Application subprocess
    await waitForTask('application', processInstance.id);
    await completeTask('application', {
      data: applicationData
    });
    
    // Steg 2: Internal data gathering
    await waitForCallActivity('internal-data-gathering', processInstance.id);
    await completeCallActivity('internal-data-gathering', {
      internalData: mockInternalData
    });
    
    // Steg 3: Credit evaluation
    await waitForTask('credit-evaluation', processInstance.id);
    await completeTask('credit-evaluation', {
      decision: 'APPROVED'
    });
    
    // ... fortsätt genom hela flödet
    
    // 4. ASSERT - Validera resultat
    const finalState = await getProcessState(processInstance.id);
    expect(finalState.status).toBe('COMPLETED');
    expect(finalState.endEvent).toBe('mortgage-completed');
  });
});
```

### 3.2 BPMN-element till test-steg mappning

| BPMN Element | Test-steg | Implementation |
|--------------|-----------|----------------|
| Start Event | `startProcess()` | API-anrop för att starta process |
| User Task | `waitForTask()` + `completeTask()` | Vänta på task, fyll i formulär, submit |
| Service Task | `waitForServiceTask()` + mock response | Mocka API-anrop, validera request |
| Business Rule Task | `waitForBusinessRule()` + `provideDecision()` | Mocka DMN-beslut |
| Call Activity | `waitForCallActivity()` + `completeCallActivity()` | Starta subprocess, vänta på completion |
| Exclusive Gateway | `assertGatewayCondition()` | Validera att rätt väg tas baserat på condition |
| Parallel Gateway | `waitForAllPaths()` | Vänta på att alla parallella paths är klara |
| Boundary Event | `triggerBoundaryEvent()` | Simulera error/timeout |
| End Event | `assertEndEvent()` | Validera att processen når rätt end event |

### 3.3 Condition-hantering

```typescript
// Exempel: Gateway med condition
const gateway = findGateway('credit-decision-gateway');
const condition = gateway.outgoingFlows[0].condition;

// Test true path
await setProcessVariable('creditScore', 750);
await continueProcess(processInstance.id);
await assertPathTaken('approved-path');

// Test false path
await setProcessVariable('creditScore', 600);
await continueProcess(processInstance.id);
await assertPathTaken('rejected-path');
```

## 4. Verktyg och ramverk

### 4.1 Rekommenderade verktyg

#### Test Framework
- **Vitest** - Redan i projektet, bra för unit och integration tests
- **Playwright** - För UI-baserade E2E-tester (om UI finns)
- **Supertest** - För API-baserade E2E-tester

#### BPMN Processing
- **bpmn-js** - Redan i projektet, för att läsa BPMN-filer
- **bpmn-moddle** - För att parsa BPMN XML
- **Custom parsers** - Använd befintliga `bpmnParser` och `processGraphBuilder`

#### Test Data Management
- **Faker.js** - För att generera test-data
- **JSON Schema** - För att validera test-data struktur
- **Test fixtures** - För att spara och återanvända test-data

#### Mocking
- **MSW (Mock Service Worker)** - För att mocka API-anrop
- **Nock** - Alternativ för HTTP-mocking
- **Sinon** - För att mocka funktioner

### 4.2 Integration med befintlig kod

Vi använder redan:
- `parseBpmnFile()` - För att parsa BPMN-filer
- `buildProcessGraph()` - För att bygga process-graf
- `buildProcessTreeFromGraph()` - För att bygga process-träd
- `bpmn-map.json` - För att mappa call activities

## 5. Implementationsplan

### Fas 1: Grundläggande infrastruktur (Vecka 1-2)

#### 1.1 BPMN Scenario Extractor
- [ ] Skapa `bpmn-scenario-extractor.ts` som kan:
  - Extrahera alla paths från en BPMN-process
  - Identifiera gateways och deras conditions
  - Identifiera start/end events
  - Identifiera call activities och deras subprocesser

#### 1.2 Test Data Builder
- [ ] Skapa `test-data-builder.ts` som kan:
  - Generera test-data baserat på BPMN-element
  - Validera test-data mot BPMN-struktur
  - Spara och ladda test-data fixtures

#### 1.3 Process Test Utilities
- [ ] Skapa `process-test-utils.ts` som kan:
  - Starta process-instanser
  - Vänta på tasks/call activities
  - Komplettera tasks
  - Hämta process-state
  - Assert process-state

### Fas 2: Happy Path Tests (Vecka 3-4)

#### 2.1 Root Process Happy Path
- [ ] Test för `mortgage.bpmn` happy path
- [ ] Testa att alla call activities körs i rätt ordning
- [ ] Validera att processen når success end event

#### 2.2 Subprocess Happy Paths
- [ ] Test för varje viktig subprocess:
  - Application
  - Credit Decision
  - Signing
  - Disbursement

### Fas 3: Alternative Paths (Vecka 5-6)

#### 3.1 Gateway Conditions
- [ ] Extrahera alla conditions från gateways
- [ ] Skapa test för varje condition (true/false)
- [ ] Validera att rätt path tas

#### 3.2 Alternative Scenarier
- [ ] Credit decision rejected
- [ ] Application incomplete
- [ ] Signing timeout
- [ ] Disbursement failed

### Fas 4: Error Handling (Vecka 7-8)

#### 4.1 Boundary Events
- [ ] Identifiera alla boundary events
- [ ] Testa error handling
- [ ] Testa timeout handling
- [ ] Testa escalation handling

#### 4.2 Rollback och Compensation
- [ ] Testa rollback-scenarier
- [ ] Testa compensation flows

### Fas 5: Integration Tests (Vecka 9-10)

#### 5.1 Call Activity Integration
- [ ] Testa dataflöde mellan parent och subprocess
- [ ] Testa att subprocess kan returnera data
- [ ] Testa error propagation från subprocess

#### 5.2 Service Task Integration
- [ ] Mocka externa API-anrop
- [ ] Testa felhantering vid API-fel
- [ ] Testa retry-logik

### Fas 6: Dokumentation och underhåll (Pågående)

#### 6.1 Dokumentation
- [ ] Dokumentera alla test-scenarier
- [ ] Skapa test-coverage rapport
- [ ] Dokumentera hur man lägger till nya scenarier

#### 6.2 CI/CD Integration
- [ ] Integrera E2E-tester i CI/CD pipeline
- [ ] Skapa test-reports
- [ ] Alerting vid test-fel

## 6. Exempel-implementation

### 6.1 BPMN Scenario Extractor

```typescript
// src/lib/e2e/bpmn-scenario-extractor.ts

export interface BpmnScenario {
  id: string;
  name: string;
  type: 'happy-path' | 'alternative' | 'error';
  startEvent: string;
  endEvents: string[];
  path: BpmnPathStep[];
  conditions?: Record<string, string>;
}

export interface BpmnPathStep {
  elementId: string;
  elementType: string;
  name: string;
  type: 'task' | 'gateway' | 'call-activity' | 'event';
  outgoingFlows: string[];
  conditions?: Record<string, string>;
}

export async function extractScenarios(
  bpmnFile: string,
  parseResult: BpmnParseResult
): Promise<BpmnScenario[]> {
  const scenarios: BpmnScenario[] = [];
  
  // 1. Hitta start events
  const startEvents = parseResult.elements.filter(
    e => e.type === 'bpmn:StartEvent'
  );
  
  // 2. För varje start event, hitta alla möjliga paths
  for (const startEvent of startEvents) {
    // Happy path
    const happyPath = findPathToEndEvent(
      startEvent.id,
      parseResult,
      'success'
    );
    scenarios.push({
      id: `${bpmnFile}-happy-path`,
      name: 'Happy Path',
      type: 'happy-path',
      startEvent: startEvent.id,
      endEvents: [happyPath.endEvent],
      path: happyPath.steps
    });
    
    // Alternative paths (via gateways)
    const gateways = parseResult.elements.filter(
      e => e.type.startsWith('bpmn:Gateway')
    );
    
    for (const gateway of gateways) {
      const alternativePaths = findAlternativePaths(
        gateway.id,
        parseResult
      );
      scenarios.push(...alternativePaths);
    }
  }
  
  return scenarios;
}
```

### 6.2 Test Example

```typescript
// tests/e2e/scenarios/happy-path/complete-mortgage-flow.test.ts

import { describe, it, expect } from 'vitest';
import { extractScenarios } from '@/lib/e2e/bpmn-scenario-extractor';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { setupTestEnvironment, startProcess, waitForTask } from '@/lib/e2e/process-test-utils';

describe('Mortgage - Complete Flow (Happy Path)', () => {
  it('should complete full mortgage application from start to disbursement', async () => {
    // Setup
    const env = await setupTestEnvironment();
    
    // Extract scenario from BPMN
    const parseResult = await parseBpmnFile('/bpmn/mortgage.bpmn');
    const scenarios = await extractScenarios('mortgage.bpmn', parseResult);
    const happyPath = scenarios.find(s => s.type === 'happy-path');
    
    expect(happyPath).toBeDefined();
    
    // Start process
    const instance = await startProcess('mortgage', {
      applicationData: {
        customerId: 'test-customer-123',
        propertyValue: 5000000,
        loanAmount: 3500000
      }
    });
    
    // Follow BPMN path step by step
    for (const step of happyPath!.path) {
      if (step.type === 'call-activity') {
        await waitForCallActivity(step.elementId, instance.id);
        await completeCallActivity(step.elementId, {
          // Mock data for subprocess
        });
      } else if (step.type === 'task') {
        await waitForTask(step.elementId, instance.id);
        await completeTask(step.elementId, {
          // Task completion data
        });
      }
    }
    
    // Assert
    const finalState = await getProcessState(instance.id);
    expect(finalState.status).toBe('COMPLETED');
    expect(finalState.endEvent).toBe('mortgage-completed');
  });
});
```

## 7. Nästa steg

1. **Review och godkännande** av denna strategi
2. **Implementera Fas 1** - Grundläggande infrastruktur
3. **Iterativt bygga ut** - Lägg till test-scenarier gradvis
4. **Validera mot verklig process** - Se till att tester matchar faktiskt beteende

## 8. Referenser

- `bpmn-map.json` - Process mapping
- `tests/integration/mortgage.e2e.test.ts` - Befintlig E2E test
- `docs/FROM_BPMN_TO_REAL_TESTS_ANALYSIS.md` - Tidigare analys
- `src/lib/bpmnParser.ts` - BPMN parsing
- `src/lib/bpmn/processGraphBuilder.ts` - Process graph building

