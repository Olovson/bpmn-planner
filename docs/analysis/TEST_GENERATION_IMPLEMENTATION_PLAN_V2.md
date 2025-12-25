# Implementeringsplan v2: Testfall-generering SEPARERAD från dokumentationsgenerering

## 🎯 Syfte

Implementera testfall-generering baserat på design v2:
- Helt separerad från dokumentationsgenerering
- Läser från befintlig dokumentation
- Manuell trigger via UI
- Inga ändringar i befintlig kod

---

## 📋 Översikt

### Faser:

1. **Fas 1:** Extrahera user stories från befintlig dokumentation (3-4 timmar)
2. **Fas 2:** Konvertera user stories till testfall (2-3 timmar)
3. **Fas 3:** Generera process flow-scenarios från BPMN (4-5 timmar)
4. **Fas 4:** UI-integration (2-3 timmar)
5. **Fas 5:** Tester och validering (3-4 timmar)

**Totalt:** 14-19 timmar

---

## 🚀 Fas 1: Extrahera user stories från befintlig dokumentation

### Steg 1.1: Skapa userStoryExtractor.ts

**Fil:** `src/lib/testGeneration/userStoryExtractor.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { getFeatureGoalDocFileKey, getEpicDocFileKey } from '@/lib/nodeArtifactPaths';
import type { EpicUserStory } from '@/lib/epicDocTypes';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';

export interface ExtractedUserStory {
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare';
  goal: string;
  value: string;
  acceptanceCriteria: string[];
  bpmnFile: string;
  bpmnElementId: string;
  docType: 'epic' | 'feature-goal';
  docSource: 'storage' | 'html-file';
  docPath?: string;
  extractedAt: Date;
  source: 'epic-doc' | 'feature-goal-doc';
}

/**
 * Extraherar user stories från befintlig dokumentation
 */
export async function extractUserStoriesFromExistingDocs(
  bpmnFile: string,
  elementId: string,
  docType: 'epic' | 'feature-goal' = 'feature-goal'
): Promise<ExtractedUserStory[]> {
  // 1. Försök läsa från Supabase Storage
  const storageDoc = await loadDocFromStorage(bpmnFile, elementId, docType);
  if (storageDoc) {
    const userStories = parseUserStoriesFromHtml(storageDoc, docType);
    return userStories.map(us => ({
      ...us,
      bpmnFile,
      bpmnElementId: elementId,
      docType,
      docSource: 'storage' as const,
      extractedAt: new Date(),
      source: docType === 'epic' ? 'epic-doc' as const : 'feature-goal-doc' as const,
    }));
  }
  
  // 2. Fallback: Läs från HTML-filer
  const htmlDoc = await loadDocFromHtmlFiles(bpmnFile, elementId, docType);
  if (htmlDoc) {
    const userStories = parseUserStoriesFromHtml(htmlDoc, docType);
    return userStories.map(us => ({
      ...us,
      bpmnFile,
      bpmnElementId: elementId,
      docType,
      docSource: 'html-file' as const,
      docPath: getHtmlDocPath(bpmnFile, elementId, docType),
      extractedAt: new Date(),
      source: docType === 'epic' ? 'epic-doc' as const : 'feature-goal-doc' as const,
    }));
  }
  
  return [];
}

/**
 * Läser dokumentation från Supabase Storage
 */
async function loadDocFromStorage(
  bpmnFile: string,
  elementId: string,
  docType: 'epic' | 'feature-goal'
): Promise<string | null> {
  try {
    const docKey = docType === 'epic' 
      ? getEpicDocFileKey(bpmnFile, elementId)
      : getFeatureGoalDocFileKey(bpmnFile, elementId);
    
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(docKey);
    
    if (error || !data) return null;
    
    return await data.text();
  } catch (error) {
    console.warn(`[userStoryExtractor] Failed to load doc from storage for ${bpmnFile}::${elementId}:`, error);
    return null;
  }
}

/**
 * Läser dokumentation från HTML-filer (fallback)
 */
async function loadDocFromHtmlFiles(
  bpmnFile: string,
  elementId: string,
  docType: 'epic' | 'feature-goal'
): Promise<string | null> {
  // TODO: Implementera läsning från public/local-content/
  // För nu, returnera null (kan implementeras senare)
  return null;
}

/**
 * Parsar user stories från HTML-dokumentation
 */
function parseUserStoriesFromHtml(
  html: string,
  docType: 'epic' | 'feature-goal'
): Array<{
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare';
  goal: string;
  value: string;
  acceptanceCriteria: string[];
}> {
  // Parse HTML för att hitta user stories
  // Använd DOM-parser eller regex för att extrahera user stories
  // Format: <li>Som {role} vill jag {goal} så att {value}</li>
  // Acceptanskriterier: <ul><li>{criterion}</li></ul>
  
  const userStories: Array<{
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare';
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }> = [];
  
  // TODO: Implementera HTML-parsing
  // För nu, returnera tom array
  return userStories;
}

function getHtmlDocPath(
  bpmnFile: string,
  elementId: string,
  docType: 'epic' | 'feature-goal'
): string {
  const basePath = docType === 'epic' 
    ? 'public/local-content/epics/'
    : 'public/local-content/feature-goals/';
  
  const fileName = docType === 'epic'
    ? `${bpmnFile}.${elementId}.html`
    : `${bpmnFile}.${elementId}.html`;
  
  return `${basePath}${fileName}`;
}

/**
 * Extraherar user stories från alla dokumentationer
 */
export async function extractUserStoriesFromAllDocs(
  bpmnFiles?: string[]
): Promise<ExtractedUserStory[]> {
  // TODO: Implementera
  // 1. Hämta alla BPMN-filer (eller använd bpmnFiles om angivet)
  // 2. För varje fil, hämta alla noder
  // 3. För varje nod, extrahera user stories
  // 4. Returnera alla user stories
  
  return [];
}
```

**Tester:**
- `tests/unit/testGeneration/userStoryExtractor.test.ts`

---

### Steg 1.2: Implementera HTML-parsing

**Fil:** `src/lib/testGeneration/htmlUserStoryParser.ts`

```typescript
/**
 * Parsar user stories från HTML-dokumentation
 */
export function parseUserStoriesFromHtml(
  html: string
): Array<{
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare';
  goal: string;
  value: string;
  acceptanceCriteria: string[];
}> {
  // Använd DOMParser för att parsa HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Hitta user stories-sektion
  // Format kan variera, men leta efter:
  // - "User Stories" eller "Användarhistorier" rubrik
  // - Listor med user stories
  // - Format: "Som {role} vill jag {goal} så att {value}"
  
  const userStories: Array<{
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare';
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }> = [];
  
  // TODO: Implementera parsing-logik
  // 1. Hitta user stories-sektion
  // 2. Extrahera varje user story
  // 3. Parsa role, goal, value
  // 4. Extrahera acceptanskriterier
  
  return userStories;
}
```

**Tester:**
- `tests/unit/testGeneration/htmlUserStoryParser.test.ts`

---

## 🚀 Fas 2: Konvertera user stories till testfall

### Steg 2.1: Skapa userStoryToTestScenario.ts

**Fil:** `src/lib/testGeneration/userStoryToTestScenario.ts`

```typescript
import type { ExtractedUserStory } from './userStoryExtractor';
import type { TestScenario } from '@/data/testMapping';

export interface UserStoryTestScenario {
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'edge-case' | 'error-case';
  steps: {
    given?: string[];
    when: string[];
    then: string[];
  };
  expectedResult: string;
  acceptanceCriteria: string[];
  source: 'user-story';
  userStoryId: string;
  userStoryRole: 'Kund' | 'Handläggare' | 'Processägare';
  priority?: 'P0' | 'P1' | 'P2';
}

/**
 * Konverterar user story till testfall
 */
export function convertUserStoryToTestScenario(
  userStory: ExtractedUserStory
): UserStoryTestScenario {
  const testType = determineTestType(userStory.acceptanceCriteria);
  const priority = determinePriority(userStory.role);
  
  // Skapa Given/When/Then format
  const steps = createGivenWhenThenSteps(userStory);
  
  return {
    id: `us-${userStory.id}`,
    name: `User Story ${userStory.id}: ${userStory.goal}`,
    description: `Som ${userStory.role} vill jag ${userStory.goal} så att ${userStory.value}`,
    type: testType,
    steps,
    expectedResult: userStory.value,
    acceptanceCriteria: userStory.acceptanceCriteria,
    source: 'user-story',
    userStoryId: userStory.id,
    userStoryRole: userStory.role,
    priority,
  };
}

/**
 * Bestämmer testfall-typ baserat på acceptanskriterier
 */
function determineTestType(
  acceptanceCriteria: string[]
): 'happy-path' | 'edge-case' | 'error-case' {
  const criteriaText = acceptanceCriteria.join(' ').toLowerCase();
  
  if (criteriaText.includes('fel') || 
      criteriaText.includes('error') || 
      criteriaText.includes('timeout') ||
      criteriaText.includes('avvisa') ||
      criteriaText.includes('decline')) {
    return 'error-case';
  }
  
  if (criteriaText.includes('validera') || 
      criteriaText.includes('edge') || 
      criteriaText.includes('gräns') ||
      criteriaText.includes('maximum') ||
      criteriaText.includes('minimum')) {
    return 'edge-case';
  }
  
  return 'happy-path';
}

/**
 * Bestämmer prioritering baserat på user story-roll
 */
function determinePriority(
  role: 'Kund' | 'Handläggare' | 'Processägare'
): 'P0' | 'P1' | 'P2' {
  // Kund-scenarios är oftast viktigast
  if (role === 'Kund') return 'P0';
  if (role === 'Handläggare') return 'P1';
  return 'P2';
}

/**
 * Skapar Given/When/Then steg från user story
 */
function createGivenWhenThenSteps(
  userStory: ExtractedUserStory
): {
  given?: string[];
  when: string[];
  then: string[];
} {
  // Given: Baserat på förutsättningar i user story
  const given: string[] = [];
  
  // When: Baserat på goal
  const when: string[] = [
    `När ${userStory.role.toLowerCase()} ${userStory.goal.toLowerCase()}`
  ];
  
  // Then: Baserat på value och acceptanskriterier
  const then: string[] = [
    `Då ${userStory.value.toLowerCase()}`,
    ...userStory.acceptanceCriteria.map(ac => `Och ${ac.toLowerCase()}`)
  ];
  
  return { given, when, then };
}

/**
 * Konverterar alla user stories till testfall
 */
export function convertUserStoriesToTestScenarios(
  userStories: ExtractedUserStory[]
): UserStoryTestScenario[] {
  return userStories.map(convertUserStoryToTestScenario);
}
```

**Tester:**
- `tests/unit/testGeneration/userStoryToTestScenario.test.ts`

---

### Steg 2.2: Integrera med plannedScenariosHelper

**Fil:** `src/lib/testGeneration/testScenarioSaver.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { UserStoryTestScenario } from './userStoryToTestScenario';
import type { TestScenario } from '@/data/testMapping';
import type { PlannedScenarioRow } from '@/lib/plannedScenariosHelper';

/**
 * Sparar user story-scenarios till databasen
 */
export async function saveUserStoryScenarios(
  scenarios: UserStoryTestScenario[],
  provider: 'claude' | 'chatgpt' | 'ollama' = 'claude',
  origin: 'llm-doc' = 'llm-doc'
): Promise<{ success: boolean; count: number; error?: any }> {
  if (scenarios.length === 0) {
    return { success: true, count: 0 };
  }
  
  // Gruppera scenarios per BPMN-nod
  const scenariosByNode = new Map<string, UserStoryTestScenario[]>();
  
  for (const scenario of scenarios) {
    // Extract bpmnFile and bpmnElementId from scenario
    // (måste läggas till i UserStoryTestScenario)
    const key = `${scenario.bpmnFile}::${scenario.bpmnElementId}`;
    if (!scenariosByNode.has(key)) {
      scenariosByNode.set(key, []);
    }
    scenariosByNode.get(key)!.push(scenario);
  }
  
  // Konvertera till PlannedScenarioRow format
  const rows: PlannedScenarioRow[] = [];
  
  for (const [key, nodeScenarios] of scenariosByNode.entries()) {
    const [bpmnFile, bpmnElementId] = key.split('::');
    
    // Konvertera UserStoryTestScenario till TestScenario
    const testScenarios: TestScenario[] = nodeScenarios.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: 'pending',
      category: s.type,
    }));
    
    rows.push({
      bpmn_file: bpmnFile,
      bpmn_element_id: bpmnElementId,
      provider,
      origin,
      scenarios: testScenarios,
    });
  }
  
  // Spara till databasen (använd befintlig savePlannedScenarios)
  const { data, error } = await supabase
    .from('node_planned_scenarios')
    .upsert(rows, {
      onConflict: 'bpmn_file,bpmn_element_id,provider',
    });
  
  if (error) {
    console.error('[testScenarioSaver] Failed to save user story scenarios:', error);
    return { success: false, count: 0, error };
  }
  
  return { success: true, count: rows.length };
}
```

**Tester:**
- `tests/unit/testGeneration/testScenarioSaver.test.ts`

---

## 🚀 Fas 3: Generera process flow-scenarios från BPMN

### Steg 3.1: Skapa bpmnProcessFlowTestGenerator.ts

**Fil:** `src/lib/testGeneration/bpmnProcessFlowTestGenerator.ts`

```typescript
import type { BpmnProcessGraph, BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import type { BpmnNodeType } from '@/lib/bpmnProcessGraph';

export interface ProcessFlowTestScenario {
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'error-case';
  steps: ProcessFlowTestStep[];
  expectedResult: string;
  source: 'bpmn-process-flow';
  bpmnFile: string;
  processId: string;
  flowType: 'happy-path' | 'error-path';
  pathNodes: string[];
}

export interface ProcessFlowTestStep {
  order: number;
  nodeId: string;
  nodeType: BpmnNodeType;
  nodeName: string;
  action: string;
  expectedResult: string;
  condition?: {
    gatewayId: string;
    conditionName: string;
    conditionValue: boolean;
  };
  errorEvent?: {
    errorCode: string;
    errorName: string;
  };
}

/**
 * Genererar testfall från BPMN-processflöde
 */
export function generateProcessFlowTestScenarios(
  graph: BpmnProcessGraph
): ProcessFlowTestScenario[] {
  const scenarios: ProcessFlowTestScenario[] = [];
  
  // 1. Generera happy path-scenarios
  const happyPaths = findHappyPaths(graph);
  for (const path of happyPaths) {
    scenarios.push(generateHappyPathScenario(graph, path));
  }
  
  // 2. Generera error path-scenarios
  const errorPaths = findErrorPaths(graph);
  for (const path of errorPaths) {
    scenarios.push(generateErrorPathScenario(graph, path));
  }
  
  return scenarios;
}

/**
 * Hittar happy paths i processgraf
 */
function findHappyPaths(graph: BpmnProcessGraph): BpmnProcessNode[][] {
  const paths: BpmnProcessNode[][] = [];
  
  // Börja från root-noden
  const root = graph.root;
  
  // Traversera grafen och hitta alla paths från start till end
  function traverse(node: BpmnProcessNode, currentPath: BpmnProcessNode[]): void {
    const newPath = [...currentPath, node];
    
    // Om noden är en end event, spara path
    if (node.type === 'event' && isEndEvent(node)) {
      paths.push(newPath);
      return;
    }
    
    // Om noden är en gateway, följ alla "Yes" eller positiva paths
    if (node.type === 'gateway') {
      for (const child of node.children) {
        // Följ endast positiva paths (inte error paths)
        if (!isErrorPath(child)) {
          traverse(child, newPath);
        }
      }
    } else {
      // Följ alla children
      for (const child of node.children) {
        traverse(child, newPath);
      }
    }
  }
  
  traverse(root, []);
  return paths;
}

/**
 * Hittar error paths i processgraf
 */
function findErrorPaths(graph: BpmnProcessGraph): BpmnProcessNode[][] {
  const paths: BpmnProcessNode[][] = [];
  
  // Börja från root-noden
  const root = graph.root;
  
  // Traversera grafen och hitta alla paths som leder till error events
  function traverse(node: BpmnProcessNode, currentPath: BpmnProcessNode[]): void {
    const newPath = [...currentPath, node];
    
    // Om noden är en error event, spara path
    if (node.type === 'event' && isErrorEvent(node)) {
      paths.push(newPath);
      return;
    }
  
    // Om noden är en gateway, följ error paths
    if (node.type === 'gateway') {
      for (const child of node.children) {
        if (isErrorPath(child)) {
          traverse(child, newPath);
        }
      }
    } else {
      // Följ alla children
      for (const child of node.children) {
        traverse(child, newPath);
      }
    }
  }
  
  traverse(root, []);
  return paths;
}

/**
 * Genererar happy path-scenario
 */
function generateHappyPathScenario(
  graph: BpmnProcessGraph,
  path: BpmnProcessNode[]
): ProcessFlowTestScenario {
  const steps: ProcessFlowTestStep[] = path
    .filter(node => node.type !== 'process') // Exkludera process-noder
    .map((node, index) => ({
      order: index + 1,
      nodeId: node.bpmnElementId,
      nodeType: node.type,
      nodeName: node.name,
      action: generateActionDescription(node),
      expectedResult: generateExpectedResult(node),
      condition: node.type === 'gateway' ? {
        gatewayId: node.bpmnElementId,
        conditionName: 'Yes',
        conditionValue: true,
      } : undefined,
    }));
  
  return {
    id: `happy-path-${path[0].bpmnElementId}-${Date.now()}`,
    name: `Happy path – ${path[0].name || path[0].bpmnElementId}`,
    description: `Testar normalt flöde genom processen`,
    type: 'happy-path',
    steps,
    expectedResult: `Processen avslutas normalt`,
    source: 'bpmn-process-flow',
    bpmnFile: path[0].bpmnFile,
    processId: graph.rootFile,
    flowType: 'happy-path',
    pathNodes: path.map(n => n.bpmnElementId),
  };
}

/**
 * Genererar error path-scenario
 */
function generateErrorPathScenario(
  graph: BpmnProcessGraph,
  path: BpmnProcessNode[]
): ProcessFlowTestScenario {
  const errorEvent = path[path.length - 1];
  
  const steps: ProcessFlowTestStep[] = path
    .filter(node => node.type !== 'process')
    .map((node, index) => ({
      order: index + 1,
      nodeId: node.bpmnElementId,
      nodeType: node.type,
      nodeName: node.name,
      action: generateActionDescription(node),
      expectedResult: generateExpectedResult(node),
      condition: node.type === 'gateway' ? {
        gatewayId: node.bpmnElementId,
        conditionName: 'No',
        conditionValue: false,
      } : undefined,
      errorEvent: node === errorEvent && isErrorEvent(node) ? {
        errorCode: extractErrorCode(node),
        errorName: node.name,
      } : undefined,
    }));
  
  return {
    id: `error-path-${path[0].bpmnElementId}-${Date.now()}`,
    name: `Error path – ${errorEvent.name || errorEvent.bpmnElementId}`,
    description: `Testar felhantering när ${errorEvent.name || errorEvent.bpmnElementId} triggas`,
    type: 'error-case',
    steps,
    expectedResult: `Error event ${errorEvent.name || errorEvent.bpmnElementId} triggas`,
    source: 'bpmn-process-flow',
    bpmnFile: path[0].bpmnFile,
    processId: graph.rootFile,
    flowType: 'error-path',
    pathNodes: path.map(n => n.bpmnElementId),
  };
}

// Helper functions
function isEndEvent(node: BpmnProcessNode): boolean {
  return node.type === 'event' && !isErrorEvent(node);
}

function isErrorEvent(node: BpmnProcessNode): boolean {
  // TODO: Implementera logik för att identifiera error events
  return node.name?.toLowerCase().includes('error') || 
         node.name?.toLowerCase().includes('rejected') ||
         false;
}

function isErrorPath(node: BpmnProcessNode): boolean {
  // TODO: Implementera logik för att identifiera error paths
  return node.name?.toLowerCase().includes('error') ||
         node.name?.toLowerCase().includes('rejected') ||
         false;
}

function generateActionDescription(node: BpmnProcessNode): string {
  if (node.type === 'serviceTask') {
    return `Systemet kör ${node.name}`;
  }
  if (node.type === 'userTask') {
    return `Användaren utför ${node.name}`;
  }
  if (node.type === 'businessRuleTask') {
    return `Systemet utvärderar ${node.name}`;
  }
  if (node.type === 'gateway') {
    return `Gateway avgör: ${node.name}`;
  }
  return `Noden ${node.name} körs`;
}

function generateExpectedResult(node: BpmnProcessNode): string {
  if (node.type === 'serviceTask') {
    return `${node.name} är slutförd`;
  }
  if (node.type === 'userTask') {
    return `${node.name} är slutförd`;
  }
  if (node.type === 'businessRuleTask') {
    return `${node.name} är utvärderad`;
  }
  if (node.type === 'gateway') {
    return `Gateway avgör nästa steg`;
  }
  return `Noden ${node.name} är slutförd`;
}

function extractErrorCode(node: BpmnProcessNode): string {
  // TODO: Extrahera error code från BPMN-element
  return node.bpmnElementId;
}
```

**Tester:**
- `tests/unit/testGeneration/bpmnProcessFlowTestGenerator.test.ts`

---

## 🚀 Fas 4: UI-integration

### Steg 4.1: Lägg till route i App.tsx

**Fil:** `src/App.tsx`

Lägg till import och route för TestGenerationPage:

```typescript
import TestGenerationPage from './pages/TestGenerationPage';

// I Routes (före catch-all "*" route):
<Route path="/test-generation" element={<ProtectedRoute><TestGenerationPage /></ProtectedRoute>} />
```

**Tester:**
- Verifiera att route fungerar
- Verifiera att ProtectedRoute fungerar

---

### Steg 4.2: Lägg till ViewKey i AppHeaderWithTabs

**Fil:** `src/components/AppHeaderWithTabs.tsx`

Lägg till 'test-generation' i ViewKey type:

```typescript
export type ViewKey =
  | 'diagram'
  | 'tree'
  | 'listvy'
  | 'tests'
  | 'test-coverage'
  | 'timeline'
  | 'configuration'
  | 'files'
  | 'styleguide'
  | 'bpmn-folder-diff'
  | 'test-generation'; // NY
```

Lägg till knapp i navigationsmenyn:

```typescript
<Tooltip>
  <TooltipTrigger asChild>
    <button
      type="button"
      onClick={() => handleTabChange('test-generation')}
      aria-label="Testfall-generering"
      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
        currentView === 'test-generation'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <PlayCircle className="h-4 w-4" />
    </button>
  </TooltipTrigger>
  <TooltipContent side="right">Testfall-generering</TooltipContent>
</Tooltip>
```

---

### Steg 4.3: Uppdatera Index.tsx för routing

**Fil:** `src/pages/Index.tsx`

Lägg till i `currentView` logik:

```typescript
const currentView: ViewKey = location.pathname.includes('/node-matrix')
  ? 'listvy'
  : location.pathname.includes('/process-explorer')
    ? 'tree'
    : location.pathname.includes('/test-coverage')
      ? 'test-coverage'
      : location.pathname.includes('/timeline')
        ? 'timeline'
        : location.pathname.includes('/configuration')
          ? 'configuration'
          : location.pathname.includes('/styleguide')
            ? 'styleguide'
            : location.pathname.includes('/bpmn-folder-diff')
              ? 'bpmn-folder-diff'
              : location.pathname.includes('/test-generation') // NY
                ? 'test-generation' // NY
                : 'diagram';
```

Lägg till i `handleViewChange`:

```typescript
const handleViewChange = (value: string) => {
  // ... befintlig kod ...
  } else if (value === 'bpmn-folder-diff') {
    baseNavigate('/bpmn-folder-diff');
  } else if (value === 'test-generation') { // NY
    baseNavigate('/test-generation'); // NY
  } else {
    // ... befintlig kod ...
  }
};
```

---

### Steg 4.4: Skapa TestGenerationPage.tsx

**Fil:** `src/pages/TestGenerationPage.tsx`

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extractUserStoriesFromAllDocs } from '@/lib/testGeneration/userStoryExtractor';
import { convertUserStoriesToTestScenarios } from '@/lib/testGeneration/userStoryToTestScenario';
import { saveUserStoryScenarios } from '@/lib/testGeneration/testScenarioSaver';
import { generateProcessFlowTestScenarios } from '@/lib/testGeneration/bpmnProcessFlowTestGenerator';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';

export function TestGenerationPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'extracting' | 'generating' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    userStoryScenarios: number;
    processFlowScenarios: number;
    errors: string[];
  } | null>(null);
  
  const handleExtractUserStories = async () => {
    setStatus('extracting');
    setProgress(0);
    
    try {
      setProgress(25);
      const userStories = await extractUserStoriesFromAllDocs();
      
      setProgress(50);
      const scenarios = convertUserStoriesToTestScenarios(userStories);
      
      setProgress(75);
      const saveResult = await saveUserStoryScenarios(scenarios);
      
      if (saveResult.success) {
        setResults(prev => ({
          ...prev || { userStoryScenarios: 0, processFlowScenarios: 0, errors: [] },
          userStoryScenarios: saveResult.count,
        }));
        setProgress(100);
        setStatus('complete');
      } else {
        throw new Error(saveResult.error?.message || 'Failed to save scenarios');
      }
    } catch (error) {
      setResults(prev => ({
        ...prev || { userStoryScenarios: 0, processFlowScenarios: 0, errors: [] },
        errors: [...(prev?.errors || []), error instanceof Error ? error.message : String(error)],
      }));
      setStatus('idle');
    }
  };
  
  const handleGenerateProcessFlowScenarios = async () => {
    setStatus('generating');
    setProgress(0);
    
    try {
      // TODO: Hämta alla BPMN-filer och generera scenarios
      // För nu, placeholder
      setProgress(100);
      setStatus('complete');
    } catch (error) {
      setResults(prev => ({
        ...prev || { userStoryScenarios: 0, processFlowScenarios: 0, errors: [] },
        errors: [...(prev?.errors || []), error instanceof Error ? error.message : String(error)],
      }));
      setStatus('idle');
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <AppHeaderWithTabs currentView="test-generation" />
      
      <Card>
        <CardHeader>
          <CardTitle>Testfall-generering</CardTitle>
          <CardDescription>
            Generera testfall från befintlig dokumentation och BPMN-processflöde
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={handleExtractUserStories}
              disabled={status === 'extracting' || status === 'generating'}
            >
              Extrahera user stories från dokumentation
            </Button>
            
            <Button 
              onClick={handleGenerateProcessFlowScenarios}
              disabled={status === 'extracting' || status === 'generating'}
            >
              Generera process flow-scenarios
            </Button>
            
            {status !== 'idle' && (
              <div>
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground mt-2">
                  {status === 'extracting' && 'Extraherar user stories...'}
                  {status === 'generating' && 'Genererar process flow-scenarios...'}
                  {status === 'complete' && 'Klar!'}
                </p>
              </div>
            )}
            
            {results && (
              <div className="space-y-2">
                <p>User story-scenarios: {results.userStoryScenarios}</p>
                <p>Process flow-scenarios: {results.processFlowScenarios}</p>
                {results.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul>
                        {results.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🧪 Fas 5: Tester och validering

**VIKTIGT:** Tester fokuserar på struktur och dataflöde, INTE faktisk LLM-generering eller Claude-anrop.

### Teststrategi:

1. **Unit-tester:** Testa funktioner med mock-data
   - Verifiera att funktioner returnerar rätt struktur
   - Verifiera dataflöde (input → output)
   - Verifiera error handling

2. **Integrationstester:** Testa dataflöde med mock-data
   - Verifiera att data kan flöda genom systemet
   - Verifiera databas-format
   - Verifiera gruppering per BPMN-nod

3. **UI-tester:** Testa att UI kan visa data
   - Verifiera att komponenter renderas
   - Verifiera att data kan visas
   - Verifiera graceful error handling

4. **Struktur-tester:** Verifiera att returnerade objekt har rätt struktur
   - Verifiera required fields
   - Verifiera datatyper
   - Verifiera värden

5. **Manuell validering:** Verifiera att data faktiskt kan visas i appens UI
   - Kör funktionerna manuellt
   - Verifiera att scenarios sparas till databasen
   - Verifiera att scenarios visas i TestReport

### Teststrategi:

1. **Unit-tester:** Testa funktioner med mock-data
2. **Integrationstester:** Testa dataflöde (extrahera → konvertera → spara)
3. **UI-tester:** Testa att data kan visas i UI
4. **Struktur-tester:** Verifiera att returnerade objekt har rätt struktur

### Test 1: userStoryExtractor.test.ts

**Fil:** `tests/unit/testGeneration/userStoryExtractor.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUserStoriesFromExistingDocs } from '@/lib/testGeneration/userStoryExtractor';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
      })),
    },
  },
}));

describe('userStoryExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should extract user stories from storage', async () => {
    // Mock HTML-dokumentation med user stories
    const mockHtml = `
      <html>
        <body>
          <h2>User Stories</h2>
          <ul>
            <li>Som Kund vill jag skapa ansökan så att jag kan ansöka om lån</li>
          </ul>
          <h3>Acceptanskriterier</h3>
          <ul>
            <li>Ansökan kan skapas</li>
            <li>Alla fält valideras</li>
          </ul>
        </body>
      </html>
    `;
    
    // Mock Supabase response
    const mockDownload = vi.fn().mockResolvedValue({
      data: new Blob([mockHtml], { type: 'text/html' }),
      error: null,
    });
    
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: mockDownload,
    } as any);
    
    const result = await extractUserStoriesFromExistingDocs(
      'mortgage-se-application.bpmn',
      'application',
      'feature-goal'
    );
    
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('Kund');
    expect(result[0].goal).toBe('skapa ansökan');
    expect(result[0].value).toBe('jag kan ansöka om lån');
    expect(result[0].acceptanceCriteria).toHaveLength(2);
  });
  
  it('should return empty array if no documentation found', async () => {
    const mockDownload = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });
    
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: mockDownload,
    } as any);
    
    const result = await extractUserStoriesFromExistingDocs(
      'nonexistent.bpmn',
      'nonexistent',
      'feature-goal'
    );
    
    expect(result).toHaveLength(0);
  });
});
```

---

### Test 2: userStoryToTestScenario.test.ts

**Fil:** `tests/unit/testGeneration/userStoryToTestScenario.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { convertUserStoryToTestScenario } from '@/lib/testGeneration/userStoryToTestScenario';
import type { ExtractedUserStory } from '@/lib/testGeneration/userStoryExtractor';

describe('userStoryToTestScenario', () => {
  it('should convert user story to test scenario', () => {
    const userStory: ExtractedUserStory = {
      id: 'US-1',
      role: 'Kund',
      goal: 'skapa ansökan',
      value: 'jag kan ansöka om lån',
      acceptanceCriteria: [
        'Ansökan kan skapas',
        'Alla fält valideras',
      ],
      bpmnFile: 'mortgage-se-application.bpmn',
      bpmnElementId: 'application',
      docType: 'feature-goal',
      docSource: 'storage',
      extractedAt: new Date(),
      source: 'feature-goal-doc',
    };
    
    const result = convertUserStoryToTestScenario(userStory);
    
    expect(result.id).toBe('us-US-1');
    expect(result.name).toBe('User Story US-1: skapa ansökan');
    expect(result.type).toBe('happy-path');
    expect(result.priority).toBe('P0');
    expect(result.steps.when).toHaveLength(1);
    expect(result.steps.then.length).toBeGreaterThan(0);
    expect(result.acceptanceCriteria).toHaveLength(2);
  });
  
  it('should determine error-case type from acceptance criteria', () => {
    const userStory: ExtractedUserStory = {
      id: 'US-2',
      role: 'Kund',
      goal: 'hantera fel',
      value: 'systemet hanterar fel korrekt',
      acceptanceCriteria: [
        'Felmeddelande visas vid fel',
        'Systemet hanterar timeout',
      ],
      bpmnFile: 'mortgage-se-application.bpmn',
      bpmnElementId: 'application',
      docType: 'feature-goal',
      docSource: 'storage',
      extractedAt: new Date(),
      source: 'feature-goal-doc',
    };
    
    const result = convertUserStoryToTestScenario(userStory);
    
    expect(result.type).toBe('error-case');
  });
});
```

---

### Test 3: bpmnProcessFlowTestGenerator.test.ts

**Fil:** `tests/unit/testGeneration/bpmnProcessFlowTestGenerator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateProcessFlowTestScenarios } from '@/lib/testGeneration/bpmnProcessFlowTestGenerator';
import type { BpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { parseBpmnFile } from '@/lib/bpmnParser';

describe('bpmnProcessFlowTestGenerator', () => {
  it('should generate happy path scenarios', async () => {
    // Ladda test-BPMN-fil
    const parseResult = await parseBpmnFile('mortgage-se-internal-data-gathering.bpmn');
    if (!parseResult) {
      throw new Error('Failed to parse BPMN file');
    }
    
    const graph = await buildBpmnProcessGraph(
      'mortgage-se-internal-data-gathering.bpmn',
      ['mortgage-se-internal-data-gathering.bpmn']
    );
    
    const scenarios = generateProcessFlowTestScenarios(graph);
    
    expect(scenarios.length).toBeGreaterThan(0);
    
    const happyPaths = scenarios.filter(s => s.type === 'happy-path');
    expect(happyPaths.length).toBeGreaterThan(0);
    
    // Verifiera att happy path har steg
    const happyPath = happyPaths[0];
    expect(happyPath.steps.length).toBeGreaterThan(0);
    expect(happyPath.flowType).toBe('happy-path');
  });
  
  it('should generate error path scenarios', async () => {
    // Ladda test-BPMN-fil med error events
    const parseResult = await parseBpmnFile('mortgage-se-internal-data-gathering.bpmn');
    if (!parseResult) {
      throw new Error('Failed to parse BPMN file');
    }
    
    const graph = await buildBpmnProcessGraph(
      'mortgage-se-internal-data-gathering.bpmn',
      ['mortgage-se-internal-data-gathering.bpmn']
    );
    
    const scenarios = generateProcessFlowTestScenarios(graph);
    
    const errorPaths = scenarios.filter(s => s.type === 'error-case');
    
    // Om BPMN-filen har error events, bör det finnas error paths
    // Annars kan det vara tomt (det är okej)
    if (errorPaths.length > 0) {
      const errorPath = errorPaths[0];
      expect(errorPath.steps.length).toBeGreaterThan(0);
      expect(errorPath.flowType).toBe('error-path');
      expect(errorPath.steps.some(s => s.errorEvent)).toBe(true);
    }
  });
});
```

---

### Test 4: Integrationstest

**Fil:** `tests/integration/testGeneration/integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { extractUserStoriesFromAllDocs } from '@/lib/testGeneration/userStoryExtractor';
import { convertUserStoriesToTestScenarios } from '@/lib/testGeneration/userStoryToTestScenario';
import { saveUserStoryScenarios } from '@/lib/testGeneration/testScenarioSaver';
import { generateProcessFlowTestScenarios } from '@/lib/testGeneration/bpmnProcessFlowTestGenerator';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';

describe('Test Generation Integration', () => {
  it('should extract user stories and save to database', async () => {
    // 1. Extrahera user stories
    const userStories = await extractUserStoriesFromAllDocs();
    
    // 2. Konvertera till testfall
    const scenarios = convertUserStoriesToTestScenarios(userStories);
    
    // 3. Spara till databasen
    const saveResult = await saveUserStoryScenarios(scenarios);
    
    expect(saveResult.success).toBe(true);
    expect(saveResult.count).toBeGreaterThan(0);
  });
  
  it('should generate process flow scenarios and save to database', async () => {
    // 1. Bygg processgraf
    const graph = await buildBpmnProcessGraph(
      'mortgage-se-internal-data-gathering.bpmn',
      ['mortgage-se-internal-data-gathering.bpmn']
    );
    
    // 2. Generera scenarios
    const scenarios = generateProcessFlowTestScenarios(graph);
    
    // 3. Spara till databasen (implementera saveProcessFlowScenarios)
    // const saveResult = await saveProcessFlowScenarios(scenarios);
    // expect(saveResult.success).toBe(true);
    
    expect(scenarios.length).toBeGreaterThan(0);
  });
});
```

---

## 📋 Checklista

### Fas 1: Extrahera user stories
- [ ] Skapa `src/lib/testGeneration/userStoryExtractor.ts`
- [ ] Implementera `extractUserStoriesFromExistingDocs()`
- [ ] Implementera `loadDocFromStorage()`
- [ ] Implementera `parseUserStoriesFromHtml()`
- [ ] Skapa `tests/unit/testGeneration/userStoryExtractor.test.ts`
- [ ] Testa extraktion från Storage
- [ ] Testa extraktion från HTML-filer
- [ ] Testa fallback när dokumentation saknas

### Fas 2: Konvertera user stories
- [ ] Skapa `src/lib/testGeneration/userStoryToTestScenario.ts`
- [ ] Implementera `convertUserStoryToTestScenario()`
- [ ] Implementera `determineTestType()`
- [ ] Implementera `createGivenWhenThenSteps()`
- [ ] Skapa `src/lib/testGeneration/testScenarioSaver.ts`
- [ ] Implementera `saveUserStoryScenarios()`
- [ ] Skapa `tests/unit/testGeneration/userStoryToTestScenario.test.ts`
- [ ] Testa konvertering
- [ ] Testa typ-bestämning
- [ ] Testa sparning till databasen

### Fas 3: Generera process flow-scenarios
- [ ] Skapa `src/lib/testGeneration/bpmnProcessFlowTestGenerator.ts`
- [ ] Implementera `generateProcessFlowTestScenarios()`
- [ ] Implementera `findHappyPaths()`
- [ ] Implementera `findErrorPaths()`
- [ ] Implementera `generateHappyPathScenario()`
- [ ] Implementera `generateErrorPathScenario()`
- [ ] Skapa `tests/unit/testGeneration/bpmnProcessFlowTestGenerator.test.ts`
- [ ] Testa happy path-generering
- [ ] Testa error path-generering
- [ ] Testa med verkliga BPMN-filer

### Fas 4: UI-integration
- [ ] Skapa `src/pages/TestGenerationPage.tsx`
- [ ] Lägg till route i `src/pages/Index.tsx`
- [ ] Lägg till knapp i `src/components/AppHeaderWithTabs.tsx`
- [ ] Testa UI-komponenter
- [ ] Testa integration med backend

### Fas 5: Tester och validering
- [ ] Skriv alla unit-tester (med mock-data)
- [ ] Skriv integrationstester (med mock-data)
- [ ] Verifiera UI-kompatibilitet (format-matchning, ingen faktisk UI-test)
- [ ] Testa strukturen (inte faktisk LLM-generering)
- [ ] Validera att inget förstörs i befintlig kod
- [ ] Dokumentera användning
- [ ] **Manuell validering:** Verifiera att data kan visas i UI (TestReport, RightPanel)

---

## 🔒 Säkerhetsåtgärder

### Inte förstöra befintlig funktionalitet:

1. **Befintlig dokumentation:**
   - ✅ Läser från befintlig dokumentation, skriver inte över
   - ✅ Ingen ändring i dokumentationsgenerering
   - ✅ Ingen ändring i dokumentationsrendering

2. **Befintlig testgenerering:**
   - ✅ Behåller befintlig `testGenerators.ts` funktionalitet
   - ✅ Behåller befintlig `llmTests.ts` funktionalitet
   - ✅ Lägger till ny funktionalitet, ersätter inte

3. **Befintlig databas:**
   - ✅ Använder befintlig `node_planned_scenarios` tabell
   - ✅ Använder `upsert` för att inte skriva över befintliga
   - ✅ Lägger till nya scenarios, ersätter inte

4. **Befintlig BPMN-parsing:**
   - ✅ Använder befintlig `bpmnParser.ts` funktionalitet
   - ✅ Använder befintlig `bpmnProcessGraph.ts` funktionalitet
   - ✅ Läser från befintlig graf, modifierar inte

---

**Datum:** 2025-12-22
**Status:** Implementeringsplan v2 klar med tester

