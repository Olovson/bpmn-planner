# API Reference - E2E Test Coverage System

Detta dokument beskriver komponenter, hooks och funktioner som används i E2E test coverage-systemet.

## Komponenter

### `TestCoverageTable`

Huvudkomponenten för att visa test coverage-tabellen.

**Plats**: `src/components/TestCoverageTable.tsx`

**Props**:
```typescript
interface TestCoverageTableProps {
  tree: ProcessTreeNode;                    // Process tree från BPMN-parsing
  scenarios: E2eScenario[];                 // Array av E2E-scenarion
  selectedScenarioId?: string;               // Filtrera på specifikt scenario (valfritt)
  viewMode?: 'condensed' | 'hierarchical' | 'full'; // Vy-läge (valfritt, annars används intern state)
}
```

**Funktionalitet**:
- Renderar tabell med tre olika vyer (condensed, hierarchical, full)
- Grupperar aktiviteter per subprocess
- Visar test-information (Given/When/Then, UI-interaktion, API-anrop, DMN-beslut)
- Färgkodar subprocesser baserat på hierarki

**Användning**:
```tsx
<TestCoverageTable
  tree={processTree}
  scenarios={e2eScenarios}
  selectedScenarioId="E2E_BR001"
  viewMode="condensed"
/>
```

### `E2eQualityValidationPage`

Sida för kvalitetsvalidering av E2E-scenarion.

**Plats**: `src/pages/E2eQualityValidationPage.tsx`

**Funktionalitet**:
- Validerar BPMN → Scenarios mapping
- Identifierar saknade tasks, mocks och fält
- Visar förslag med kopiera-knappar
- Genererar exempel-kod för att fixa problem

**Valideringar**:
- ServiceTasks/UserTasks/BusinessRuleTasks som saknas i `bankProjectTestSteps`
- Tasks som saknar API-anrop/UI-interaktion/DMN-beslut
- Saknade mocks för dokumenterade API-anrop
- Saknade fält i mock-responser jämfört med `backendState`
- CallActivities som saknas i `subprocessSteps`

### `TestCoverageExplorerPage`

Huvudsidan för test coverage-visualisering.

**Plats**: `src/pages/TestCoverageExplorerPage.tsx`

**Funktionalitet**:
- Hanterar scenario- och vy-filtrering
- Exporterar till HTML och Excel
- Renderar `TestCoverageTable` med rätt props

## Hooks

### `useProcessTree`

Hook för att parsa BPMN-filer och bygga process tree.

**Plats**: `src/hooks/useProcessTree.ts`

**Signatur**:
```typescript
function useProcessTree(rootBpmnFile: string): {
  data: ProcessTreeNode | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Användning**:
```tsx
const { data: tree, isLoading, error } = useProcessTree('mortgage.bpmn');
```

**Returnerar**:
- `data`: Process tree-struktur med hierarki
- `isLoading`: Laddningsstatus
- `error`: Eventuellt fel

### `useFileArtifactCoverage`

Hook för att hämta coverage-status för en BPMN-fil.

**Plats**: `src/hooks/useFileArtifactCoverage.ts`

**Signatur**:
```typescript
function useFileArtifactCoverage(fileName: string): {
  data: FileArtifactCoverage | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

**Returnerar**:
```typescript
interface FileArtifactCoverage {
  status: 'none' | 'partial' | 'full' | 'noApplicableNodes';
  total: number;
  dorDod: ArtifactCoverage;
  tests: ArtifactCoverage;
  docs: ArtifactCoverage;
  hierarchy: ArtifactCoverage;
}
```

## Typer

### `E2eScenario`

Huvudtyp för E2E-scenarion.

**Plats**: `src/pages/E2eTestsOverviewPage.tsx`

```typescript
type E2eScenario = {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  type: 'happy-path' | 'alt-path' | 'error';
  iteration: Iteration;
  bpmnProcess: string;
  bpmnCallActivityId?: string;
  featureGoalFile: string;
  featureGoalTestId?: string;
  testFile: string;
  command: string;
  summary: string;
  given: string;
  when: string;
  then: string;
  notesForBankProject: string;
  bankProjectTestSteps: BankProjectTestStep[];
  userStories?: UserStory[];
  subprocessSteps: {
    order: number;
    bpmnFile: string;
    callActivityId?: string;
    featureGoalFile?: string;
    description: string;
    hasPlaywrightSupport: boolean;
    given?: string;
    when?: string;
    then?: string;
    linkedUserStories?: number[];
    subprocessesSummary?: string;
    serviceTasksSummary?: string;
    userTasksSummary?: string;
    businessRulesSummary?: string;
  }[];
};
```

### `ProcessTreeNode`

Typ för process tree-noder.

**Plats**: `src/lib/processTree.ts`

```typescript
interface ProcessTreeNode {
  id: string;
  label: string;
  type: 'process' | 'callActivity' | 'subProcess' | 'serviceTask' | 'userTask' | 'businessRuleTask' | 'dmnDecision' | 'gateway' | 'event' | 'other';
  bpmnFile?: string;
  bpmnElementId?: string;
  children: ProcessTreeNode[];
  visualOrderIndex?: number;
  orderIndex?: number;
  branchId?: string;
}
```

### `BankProjectTestStep`

Typ för test-steg i bankprojektet.

**Plats**: `src/pages/E2eTestsOverviewPage.tsx`

```typescript
type BankProjectTestStep = {
  bpmnNodeId: string;
  bpmnNodeName: string;
  bpmnNodeType: 'ServiceTask' | 'UserTask' | 'BusinessRuleTask';
  apiCall?: string;           // För ServiceTasks
  uiInteraction?: string;     // För UserTasks
  dmnDecision?: string;       // För BusinessRuleTasks
  backendState?: string;      // Förväntat backend-tillstånd
};
```

## Hjälpfunktioner

### `findTestInfoForCallActivity`

Hittar test-information för en callActivity.

**Plats**: `src/components/TestCoverageTable.tsx`

```typescript
function findTestInfoForCallActivity(
  callActivityId: string,
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): TestInfo[]
```

**Returnerar**: Array av `TestInfo`-objekt som matchar callActivityId

### `collectActivitiesPerCallActivity`

Samlar alla aktiviteter per callActivity.

**Plats**: `src/components/TestCoverageTable.tsx`

```typescript
function collectActivitiesPerCallActivity(
  tree: ProcessTreeNode,
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): Map<string, {
  callActivityNode: ProcessTreeNode;
  activities: {
    serviceTasks: ProcessTreeNode[];
    userTasksCustomer: ProcessTreeNode[];
    userTasksEmployee: ProcessTreeNode[];
    businessRules: ProcessTreeNode[];
  };
  testInfo: TestInfo | null;
}>
```

**Returnerar**: Map från callActivityId till aktiviteter och test-info

### `sortCallActivities`

Sorterar callActivities baserat på visualOrderIndex, orderIndex, branchId och label.

**Plats**: `src/lib/ganttDataConverter.ts`

```typescript
function sortCallActivities(
  nodes: ProcessTreeNode[],
  context?: 'root' | 'subprocess'
): ProcessTreeNode[]
```

## Valideringsfunktioner

### `validateBpmnMapping`

Validerar BPMN → Scenarios mapping.

**Plats**: `src/pages/E2eQualityValidationPage.tsx`

```typescript
function validateBpmnMapping(
  scenario: E2eScenario,
  processTree: ProcessTreeNode | null
): BpmnValidationResult[]
```

**Returnerar**: Array av valideringsresultat (errors/warnings)

### `extractMockedEndpoints`

Extraherar mockade endpoints från mock-filer.

**Plats**: `src/pages/E2eQualityValidationPage.tsx`

```typescript
async function extractMockedEndpoints(): Promise<Map<string, string[]>>
```

**Returnerar**: Map från endpoint till array av mockade metoder

### `analyzeMockResponses`

Analyserar mock-responser och jämför med backendState.

**Plats**: `src/pages/E2eQualityValidationPage.tsx`

```typescript
function analyzeMockResponses(
  mockResponses: Map<string, any>,
  backendStates: Map<string, string[]>
): MockQualityAnalysis[]
```

**Returnerar**: Array av mock quality-analyser

## Exporteringsfunktioner

### `exportToHtml`

Exporterar test coverage-tabellen till HTML.

**Plats**: `src/pages/TestCoverageExplorerPage.tsx`

**Funktionalitet**:
- Klonar tabell-DOM
- Kopierar styles
- Inkluderar alla tre vyerna
- Lägger till interaktiv JavaScript för filtrering

### `exportToExcel`

Exporterar test coverage-tabellen till Excel.

**Plats**: `src/pages/TestCoverageExplorerPage.tsx`

**Funktionalitet**:
- Genererar Excel-fil med strukturerad data
- Behåller hierarki och gruppering

## Relaterade dokument

- [Test Coverage User Guide](./TEST_COVERAGE_USER_GUIDE.md)
- [E2E Maintenance Guide](./E2E_MAINTENANCE_GUIDE.md)
- [BPMN Update Validation](./BPMN_UPDATE_VALIDATION.md)


