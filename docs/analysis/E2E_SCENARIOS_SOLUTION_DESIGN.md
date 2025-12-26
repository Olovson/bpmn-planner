# Lösningsförslag: E2E-scenario-generering

## 🎯 Syfte

Konkret lösningsförslag för att generera E2E-scenarios baserat på:
- ✅ Befintlig infrastruktur (`buildBpmnProcessGraph`, `ProcessTree`, `flattenToPaths`)
- ✅ Feature Goal-dokumentation (redan genererad)
- ✅ Claude för scenario-generering

---

## 📊 Arkitektur

### Översikt

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Identifiera paths (använd befintlig infrastruktur)       │
│    - buildBpmnProcessGraph()                                 │
│    - ProcessTree                                            │
│    - flattenToPaths()                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Identifiera saknade paths                                │
│    - Matcha befintliga scenarios mot paths                 │
│    - Identifiera gaps i coverage                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Läsa Feature Goal-dokumentation                        │
│    - För varje call activity i path                         │
│    - Läs summary, flowSteps, userStories, prerequisites    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Claude-generering                                        │
│    - Skicka path + Feature Goal-dokumentation till Claude   │
│    - Claude genererar E2E-scenario                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Spara scenarios                                          │
│    - Spara till node_planned_scenarios tabellen             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Implementation

### Steg 1: Identifiera paths (använd befintlig infrastruktur)

**Fil:** `src/lib/e2eScenarioPathIdentifier.ts`

```typescript
import { buildBpmnProcessGraph } from './bpmnProcessGraph';
import { buildProcessTree } from './bpmn/processTreeBuilder';
import { flattenToPaths, type PathRow } from './testCoverageHelpers';
import type { ProcessTreeNode } from './processTree';

export interface E2ePath {
  id: string; // Unik ID för pathen
  path: ProcessTreeNode[]; // Noderna i pathen
  featureGoals: string[]; // Call activity IDs i pathen
  startEvent: string; // Start event ID
  endEvent: string; // End event ID
  gatewayConditions?: Array<{
    gatewayId: string;
    gatewayName: string;
    condition: string;
  }>;
}

/**
 * Identifierar alla paths från en BPMN-processgraf
 */
export async function identifyAllPaths(
  rootFile: string,
  existingBpmnFiles: string[]
): Promise<E2ePath[]> {
  // 1. Bygg processgraf (använd befintlig infrastruktur)
  const graph = await buildBpmnProcessGraph(rootFile, existingBpmnFiles);
  
  // 2. Bygg ProcessTree (använd befintlig infrastruktur)
  const tree = buildProcessTree(graph);
  
  // 3. Flattena till paths (använd befintlig infrastruktur)
  const pathRows = flattenToPaths(tree.root, [], undefined);
  
  // 4. Konvertera till E2ePath-format
  const paths: E2ePath[] = pathRows.map((row, index) => {
    const featureGoals = row.path
      .filter(node => node.type === 'callActivity')
      .map(node => node.bpmnElementId)
      .filter(Boolean) as string[];
    
    const startEvent = row.path[0]?.id || '';
    const endEvent = row.path[row.path.length - 1]?.id || '';
    
    return {
      id: `path-${index + 1}`,
      path: row.path,
      featureGoals,
      startEvent,
      endEvent,
      // TODO: Extrahera gateway-conditions från BPMN (om det finns)
    };
  });
  
  return paths;
}
```

---

### Steg 2: Identifiera saknade paths

**Fil:** `src/lib/e2eScenarioCoverageAnalyzer.ts`

```typescript
import type { E2ePath } from './e2eScenarioPathIdentifier';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

export interface CoverageGap {
  path: E2ePath;
  reason: 'no-scenario' | 'partial-match';
}

/**
 * Identifierar paths som saknar E2E-scenarios
 */
export function identifyCoverageGaps(
  allPaths: E2ePath[],
  existingScenarios: E2eScenario[]
): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  
  for (const path of allPaths) {
    const matchingScenario = findMatchingScenario(path, existingScenarios);
    
    if (!matchingScenario) {
      gaps.push({
        path,
        reason: 'no-scenario',
      });
    } else if (!isFullMatch(path, matchingScenario)) {
      gaps.push({
        path,
        reason: 'partial-match',
      });
    }
  }
  
  return gaps;
}

/**
 * Hittar scenario som matchar en path
 */
function findMatchingScenario(
  path: E2ePath,
  scenarios: E2eScenario[]
): E2eScenario | undefined {
  return scenarios.find(scenario => {
    const scenarioFeatureGoals = scenario.subprocessSteps
      .map(step => step.callActivityId)
      .filter(Boolean);
    
    // Matcha baserat på Feature Goals i samma ordning
    return arraysEqual(path.featureGoals, scenarioFeatureGoals);
  });
}

/**
 * Kontrollerar om scenario matchar pathen fullt ut
 */
function isFullMatch(path: E2ePath, scenario: E2eScenario): boolean {
  const scenarioFeatureGoals = scenario.subprocessSteps
    .map(step => step.callActivityId)
    .filter(Boolean);
  
  // Full match = samma Feature Goals i samma ordning
  return arraysEqual(path.featureGoals, scenarioFeatureGoals);
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}
```

---

### Steg 3: Läsa Feature Goal-dokumentation

**Fil:** `src/lib/e2eScenarioFeatureGoalLoader.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import type { FeatureGoalDocModel } from './featureGoalLlmTypes';

export interface PathFeatureGoalDoc {
  callActivityId: string;
  bpmnFile: string;
  documentation: FeatureGoalDocModel | null;
}

/**
 * Laddar Feature Goal-dokumentation för alla call activities i en path
 */
export async function loadFeatureGoalDocsForPath(
  path: E2ePath
): Promise<PathFeatureGoalDoc[]> {
  const featureGoalDocs: PathFeatureGoalDoc[] = [];
  
  for (const node of path.path) {
    if (node.type === 'callActivity' && node.bpmnElementId && node.bpmnFile) {
      const docKey = getFeatureGoalDocFileKey(node.bpmnFile, node.bpmnElementId);
      
      // Läs dokumentation från Supabase Storage
      const { data, error } = await supabase.storage
        .from('documentation')
        .download(docKey);
      
      if (error || !data) {
        console.warn(`[loadFeatureGoalDocsForPath] Kunde inte ladda dokumentation för ${docKey}:`, error);
        featureGoalDocs.push({
          callActivityId: node.bpmnElementId,
          bpmnFile: node.bpmnFile,
          documentation: null,
        });
        continue;
      }
      
      // Parse HTML och extrahera JSON
      const htmlContent = await data.text();
      const docModel = parseFeatureGoalDocFromHtml(htmlContent);
      
      featureGoalDocs.push({
        callActivityId: node.bpmnElementId,
        bpmnFile: node.bpmnFile,
        documentation: docModel,
      });
    }
  }
  
  return featureGoalDocs;
}

/**
 * Parser Feature Goal-dokumentation från HTML
 */
function parseFeatureGoalDocFromHtml(html: string): FeatureGoalDocModel | null {
  // Extrahera JSON från HTML (samma logik som i befintlig kod)
  // Se src/lib/featureGoalLlmMapper.ts för referens
  // ...
}
```

---

### Steg 4: Claude-generering

**Fil:** `src/lib/e2eScenarioLlmGenerator.ts`

```typescript
import { renderDocWithLlm } from './llmDocumentation';
import type { E2ePath } from './e2eScenarioPathIdentifier';
import type { PathFeatureGoalDoc } from './e2eScenarioFeatureGoalLoader';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

export interface E2eScenarioGenerationContext {
  path: E2ePath;
  featureGoalDocs: PathFeatureGoalDoc[];
  bpmnProcessInfo: {
    rootFile: string;
    processName: string;
  };
}

/**
 * Genererar E2E-scenario med Claude
 */
export async function generateE2eScenarioWithClaude(
  context: E2eScenarioGenerationContext
): Promise<E2eScenario> {
  // 1. Bygg prompt-kontext
  const promptContext = buildPromptContext(context);
  
  // 2. Ladda prompt-template
  const promptTemplate = await loadE2eScenarioPrompt();
  
  // 3. Anropa Claude
  const llmResult = await renderDocWithLlm({
    prompt: promptTemplate,
    context: promptContext,
    docType: 'testScenario', // Ny docType för E2E-scenarios
  });
  
  // 4. Parse och validera resultat
  const scenario = parseE2eScenarioFromLlmOutput(llmResult.text);
  
  // 5. Enricha med path-information
  scenario.id = generateScenarioId(context.path);
  scenario.pathId = context.path.id;
  
  return scenario;
}

/**
 * Bygger prompt-kontext för Claude
 */
function buildPromptContext(context: E2eScenarioGenerationContext): string {
  const featureGoalSummaries = context.featureGoalDocs
    .map(doc => {
      if (!doc.documentation) return null;
      return {
        callActivityId: doc.callActivityId,
        summary: doc.documentation.summary,
        flowSteps: doc.documentation.flowSteps,
        userStories: doc.documentation.userStories,
        prerequisites: doc.documentation.prerequisites,
        dependencies: doc.documentation.dependencies,
      };
    })
    .filter(Boolean);
  
  return JSON.stringify({
    path: {
      startEvent: context.path.startEvent,
      endEvent: context.path.endEvent,
      featureGoals: context.path.featureGoals,
      gatewayConditions: context.path.gatewayConditions,
    },
    featureGoals: featureGoalSummaries,
    processInfo: context.bpmnProcessInfo,
  }, null, 2);
}

/**
 * Parser E2E-scenario från Claude-output
 */
function parseE2eScenarioFromLlmOutput(llmOutput: string): E2eScenario {
  // Parse JSON från Claude-output
  // Validera mot E2eScenario-typ
  // ...
}
```

---

### Steg 5: Spara scenarios

**Fil:** `src/lib/e2eScenarioSaver.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

/**
 * Sparar E2E-scenario till databasen
 */
export async function saveE2eScenario(scenario: E2eScenario): Promise<void> {
  const { error } = await supabase
    .from('node_planned_scenarios')
    .insert({
      node_id: scenario.id,
      scenario_name: scenario.name,
      scenario_summary: scenario.summary,
      scenario_given: scenario.given,
      scenario_when: scenario.when,
      scenario_then: scenario.then,
      scenario_steps: scenario.bankProjectTestSteps,
      scenario_subprocess_steps: scenario.subprocessSteps,
      // ... andra fält
    });
  
  if (error) {
    throw new Error(`Kunde inte spara scenario: ${error.message}`);
  }
}
```

---

## 📁 Filstruktur

```
src/lib/
├── e2eScenarioPathIdentifier.ts          # Steg 1: Identifiera paths
├── e2eScenarioCoverageAnalyzer.ts       # Steg 2: Identifiera saknade paths
├── e2eScenarioFeatureGoalLoader.ts      # Steg 3: Läsa Feature Goal-dokumentation
├── e2eScenarioLlmGenerator.ts           # Steg 4: Claude-generering
├── e2eScenarioSaver.ts                  # Steg 5: Spara scenarios
└── e2eScenarioGenerator.ts              # Huvudfunktion som orkestrerar allt

prompts/llm/
└── e2e_scenario_prompt.md               # Claude-prompt för E2E-scenario-generering

tests/
├── unit/
│   ├── e2eScenarioPathIdentifier.test.ts
│   ├── e2eScenarioCoverageAnalyzer.test.ts
│   ├── e2eScenarioFeatureGoalLoader.test.ts
│   └── e2eScenarioLlmGenerator.test.ts
└── integration/
    └── e2eScenarioGeneration.test.ts
```

---

## 🎯 Huvudfunktion

**Fil:** `src/lib/e2eScenarioGenerator.ts`

```typescript
import { identifyAllPaths } from './e2eScenarioPathIdentifier';
import { identifyCoverageGaps } from './e2eScenarioCoverageAnalyzer';
import { loadFeatureGoalDocsForPath } from './e2eScenarioFeatureGoalLoader';
import { generateE2eScenarioWithClaude } from './e2eScenarioLlmGenerator';
import { saveE2eScenario } from './e2eScenarioSaver';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

export interface E2eScenarioGenerationOptions {
  rootFile: string;
  existingBpmnFiles: string[];
  existingScenarios?: E2eScenario[]; // Om tom, identifierar alla saknade paths
  generateForAllGaps?: boolean; // Om true, genererar för alla gaps
}

export interface E2eScenarioGenerationResult {
  generated: E2eScenario[];
  skipped: Array<{ path: E2ePath; reason: string }>;
  errors: Array<{ path: E2ePath; error: string }>;
}

/**
 * Huvudfunktion för E2E-scenario-generering
 */
export async function generateE2eScenarios(
  options: E2eScenarioGenerationOptions
): Promise<E2eScenarioGenerationResult> {
  const result: E2eScenarioGenerationResult = {
    generated: [],
    skipped: [],
    errors: [],
  };
  
  // 1. Identifiera alla paths
  const allPaths = await identifyAllPaths(
    options.rootFile,
    options.existingBpmnFiles
  );
  
  // 2. Identifiera saknade paths
  const existingScenarios = options.existingScenarios || [];
  const gaps = identifyCoverageGaps(allPaths, existingScenarios);
  
  if (gaps.length === 0) {
    return result; // Inga gaps att fylla
  }
  
  // 3. Generera scenarios för varje gap
  for (const gap of gaps) {
    try {
      // 3a. Ladda Feature Goal-dokumentation
      const featureGoalDocs = await loadFeatureGoalDocsForPath(gap.path);
      
      // 3b. Kontrollera om vi har dokumentation för alla Feature Goals
      const missingDocs = featureGoalDocs.filter(doc => !doc.documentation);
      if (missingDocs.length > 0) {
        result.skipped.push({
          path: gap.path,
          reason: `Saknar Feature Goal-dokumentation för: ${missingDocs.map(d => d.callActivityId).join(', ')}`,
        });
        continue;
      }
      
      // 3c. Generera scenario med Claude
      const scenario = await generateE2eScenarioWithClaude({
        path: gap.path,
        featureGoalDocs,
        bpmnProcessInfo: {
          rootFile: options.rootFile,
          processName: gap.path.path[0]?.label || 'Unknown',
        },
      });
      
      // 3d. Spara scenario
      await saveE2eScenario(scenario);
      
      result.generated.push(scenario);
    } catch (error) {
      result.errors.push({
        path: gap.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  return result;
}
```

---

## 🧪 Tester

### Unit-tester

**Fil:** `tests/unit/e2eScenarioPathIdentifier.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { identifyAllPaths } from '@/lib/e2eScenarioPathIdentifier';

describe('e2eScenarioPathIdentifier', () => {
  it('should identify all paths from process graph', async () => {
    const paths = await identifyAllPaths(
      'mortgage-se-application.bpmn',
      ['mortgage-se-application.bpmn', 'household.bpmn', 'stakeholder.bpmn']
    );
    
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]).toHaveProperty('id');
    expect(paths[0]).toHaveProperty('featureGoals');
    expect(paths[0]).toHaveProperty('startEvent');
    expect(paths[0]).toHaveProperty('endEvent');
  });
});
```

**Fil:** `tests/unit/e2eScenarioCoverageAnalyzer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { identifyCoverageGaps } from '@/lib/e2eScenarioCoverageAnalyzer';
import type { E2ePath } from '@/lib/e2eScenarioPathIdentifier';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

describe('e2eScenarioCoverageAnalyzer', () => {
  it('should identify paths without scenarios', () => {
    const paths: E2ePath[] = [
      {
        id: 'path-1',
        path: [],
        featureGoals: ['application', 'household'],
        startEvent: 'start-1',
        endEvent: 'end-1',
      },
    ];
    
    const scenarios: E2eScenario[] = []; // Inga scenarios
    
    const gaps = identifyCoverageGaps(paths, scenarios);
    
    expect(gaps.length).toBe(1);
    expect(gaps[0].reason).toBe('no-scenario');
  });
  
  it('should not identify paths with matching scenarios', () => {
    const paths: E2ePath[] = [
      {
        id: 'path-1',
        path: [],
        featureGoals: ['application', 'household'],
        startEvent: 'start-1',
        endEvent: 'end-1',
      },
    ];
    
    const scenarios: E2eScenario[] = [
      {
        id: 'scenario-1',
        name: 'Test Scenario',
        subprocessSteps: [
          { callActivityId: 'application' },
          { callActivityId: 'household' },
        ],
        // ... andra fält
      },
    ];
    
    const gaps = identifyCoverageGaps(paths, scenarios);
    
    expect(gaps.length).toBe(0);
  });
});
```

---

## 📝 Claude-prompt

**Fil:** `prompts/llm/e2e_scenario_prompt.md`

```markdown
# E2E Scenario Generation Prompt

Du är en erfaren testanalytiker inom nordiska banker.
Du ska generera **ett enda JSON-objekt** på **svenska** som beskriver ett E2E-testscenario.

## Input

Du får:
- **Path-struktur**: En path genom BPMN-processen med Feature Goals i ordning
- **Feature Goal-dokumentation**: Dokumentation för varje Feature Goal i pathen
- **BPMN-process-information**: Information om processen

## Output

Generera ett JSON-objekt enligt följande struktur:

```json
{
  "name": "string",
  "summary": "string",
  "given": "string",
  "when": "string",
  "then": "string",
  "bankProjectTestSteps": [
    {
      "bpmnNodeId": "string",
      "action": "string",
      "assertion": "string",
      "uiInteraction": "string (optional)",
      "dmnDecision": "string (optional)",
      "backendState": "string (optional)"
    }
  ],
  "subprocessSteps": [
    {
      "callActivityId": "string",
      "description": "string",
      "given": "string",
      "when": "string",
      "then": "string"
    }
  ]
}
```

## Regler

1. **Använd Feature Goal-dokumentation**: Använd `summary`, `flowSteps`, `userStories`, `prerequisites` från Feature Goal-dokumentationen
2. **Beskriv VAD, inte HUR**: Använd affärsspråk, inte teknisk BPMN-terminologi
3. **Given-When-Then format**: Använd Given-When-Then format för scenarios
4. **Teststeg**: Skapa teststeg för varje Feature Goal i pathen
5. **Gateway-conditions**: Använd gateway-conditions som "Given"-conditions om de finns

## Exempel

Se `docs/examples/e2e_scenario_example.json` för exempel på output.
```

---

## 🚀 Implementation-steg

### Steg 1: Skapa grundläggande filer
1. ✅ Skapa `src/lib/e2eScenarioPathIdentifier.ts`
2. ✅ Skapa `src/lib/e2eScenarioCoverageAnalyzer.ts`
3. ✅ Skapa `src/lib/e2eScenarioFeatureGoalLoader.ts`
4. ✅ Skapa `src/lib/e2eScenarioLlmGenerator.ts`
5. ✅ Skapa `src/lib/e2eScenarioSaver.ts`
6. ✅ Skapa `src/lib/e2eScenarioGenerator.ts`

### Steg 2: Skapa Claude-prompt
1. ✅ Skapa `prompts/llm/e2e_scenario_prompt.md`

### Steg 3: Skapa tester
1. ✅ Skapa `tests/unit/e2eScenarioPathIdentifier.test.ts`
2. ✅ Skapa `tests/unit/e2eScenarioCoverageAnalyzer.test.ts`
3. ✅ Skapa `tests/unit/e2eScenarioFeatureGoalLoader.test.ts`
4. ✅ Skapa `tests/integration/e2eScenarioGeneration.test.ts`

### Steg 4: Integrera i UI
1. ✅ Skapa UI-komponent för att trigga generering
2. ✅ Visa progress och resultat
3. ✅ Visa genererade scenarios

---

## 📊 Kvalitetsbedömning

### Förväntad kvalitet: 70-80%

**Varför:**
- ✅ Använder befintlig, beprövad infrastruktur
- ✅ Använder Feature Goal-dokumentation (redan genererad)
- ✅ Claude-generering ger bra kvalitet
- ⚠️ Saknar API-endpoints, UI-selectors (kräver komplettering)

**Vad som saknas (kräver komplettering):**
- Konkreta API-endpoints
- UI-selectors
- DMN-tabellnamn
- Backend-strukturer

---

## 🎯 Nästa steg

1. **Implementera grundläggande funktionalitet** (Steg 1-3)
2. **Testa med befintliga BPMN-filer**
3. **Iterera baserat på resultat**
4. **Integrera i UI**

---

**Datum:** 2025-12-22
**Status:** Lösningsförslag klar - Redo för implementation







