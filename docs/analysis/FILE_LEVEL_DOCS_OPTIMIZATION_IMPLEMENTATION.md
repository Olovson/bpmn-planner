# Implementeringsanalys: Optimering av File-level Docs för E2E-generering

## Översikt

Detta dokument beskriver hur **milda optimeringar** för file-level documentation token-användning ska implementeras för att minska kostnader och förbättra prestanda vid E2E-scenariogenerering.

**VIKTIGT - Realistiska Siffror:**
- De flesta BPMN-filer: 4-5 epics
- Största filer: ~10 epics
- **Optimering fokuserar på deduplicering, INTE aggregering**
- **Behåller all viktig information för att säkerställa kvalitet**

## Nuvarande Struktur

### Interfaces

**`FeatureGoalDoc`** (används i E2E-generatorn):
```typescript
export interface FeatureGoalDoc {
  callActivityId: string;
  bpmnFile: string;
  summary: string;
  flowSteps: string[];
  userStories?: Array<{
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>;
  dependencies?: string[];
  // ... andra fält
}
```

**File-level doc data** (från `loadFileLevelDocFromStorage`):
```typescript
{
  summary: string;
  flowSteps: string[];
  userStories?: Array<{...}>;
  dependencies?: string[];
}
```

### Nuvarande Flöde

1. `loadFileLevelDocFromStorage()` laddar HTML och extraherar JSON
2. Data konverteras till `FeatureGoalDoc` format
3. ALLA data skickas till Claude i `generateE2eScenarioWithLlm()`

## Implementeringsplan

### Steg 1: Skapa Optimeringstyper

**Ny fil: `src/lib/e2eScenarioOptimizer.ts`**

```typescript
/**
 * Optimized version of FeatureGoalDoc for E2E scenario generation.
 * Reduces token usage by ~15-20% while maintaining ALL critical information.
 * 
 * VIKTIGT: Behåller alla unika user stories och flowSteps - bara deduplicerar identiska.
 */
export interface OptimizedFeatureGoalDoc {
  callActivityId: string;
  bpmnFile: string;
  summary: string;
  flowSteps: string[]; // Deduplicerade (behåller alla unika)
  userStories?: Array<{...}>; // Deduplicerade (behåller alla unika) - INTE sammanfattade
  dependencies?: AggregatedDependencies; // Kategoriserade och deduplicerade
  // ... andra fält (businessRules, userTasks, etc. behålls som de är)
}

/**
 * OBS: UserStoriesSummary används INTE längre (för aggressiv).
 * Istället behåller vi alla unika user stories och deduplicerar bara identiska.
 */

/**
 * Aggregated dependencies categorized by type.
 */
export interface AggregatedDependencies {
  inputs: string[];
  outputs: string[];
  systems: string[];
  processes: string[];
}
```

### Steg 2: Implementera Optimeringsfunktioner

**Funktion 1: Deduplicera User Stories (Mild Optimering)**

```typescript
/**
 * Deduplicates identical or nearly identical user stories.
 * 
 * Strategy:
 * - Behåller ALLA unika user stories
 * - Tar bort endast identiska duplicat (samma goal, value, acceptanceCriteria)
 * - Behåller alla stories med unika information
 */
export function deduplicateUserStories(
  userStories: Array<{
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>
): Array<{
  id: string;
  role: string;
  goal: string;
  value: string;
  acceptanceCriteria: string[];
}> {
  if (!userStories || userStories.length === 0) {
    return [];
  }

  // Normalisera för jämförelse (ta bort whitespace, sortera acceptanceCriteria)
  const normalize = (story: typeof userStories[0]) => ({
    role: story.role?.trim().toLowerCase() || 'kund',
    goal: story.goal?.trim().toLowerCase() || '',
    value: story.value?.trim().toLowerCase() || '',
    acceptanceCriteria: (story.acceptanceCriteria || [])
      .map(ac => ac.trim().toLowerCase())
      .sort()
      .join('|'),
  });

  const seen = new Set<string>();
  const result: typeof userStories = [];

  for (const story of userStories) {
    const normalized = normalize(story);
    const key = JSON.stringify(normalized);
    
    if (!seen.has(key)) {
      seen.add(key);
      result.push(story); // Behåll original (med original formatting)
    }
    // Annars: hoppa över (duplicerad)
  }

  return result;
}

/**
 * Extracts most common items from an array.
 * Uses simple frequency counting and returns top N items.
 */
function extractCommonItems(items: string[], maxItems: number): string[] {
  const frequency = new Map<string, number>();
  
  for (const item of items) {
    const normalized = item.trim().toLowerCase();
    frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
  }

  // Sort by frequency (descending) and return top N
  const sorted = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([item]) => item);

  // Return original items (not normalized) that match
  const result: string[] = [];
  const seen = new Set<string>();
  
  for (const item of items) {
    const normalized = item.trim().toLowerCase();
    if (sorted.includes(normalized) && !seen.has(normalized)) {
      result.push(item.trim());
      seen.add(normalized);
    }
    if (result.length >= maxItems) break;
  }

  return result;
}
```

**Funktion 2: Deduplicera FlowSteps (Mild Optimering)**

```typescript
/**
 * Deduplicates identical or nearly identical flowSteps.
 * 
 * Strategy:
 * - Behåller ALLA unika flowSteps
 * - Grupperar identiska steps med node-kontext (t.ex. "Epic 1: X" och "Epic 2: X" → "X (Epic 1, Epic 2)")
 * - Behåller alla steps med unik information
 */
export function deduplicateFlowSteps(
  flowSteps: string[]
): string[] {
  if (!flowSteps || flowSteps.length === 0) {
    return [];
  }

  // Gruppera steps efter action (utan node-kontext)
  const groups = new Map<string, string[]>();
  
  for (const step of flowSteps) {
    // Extrahera action (ta bort node-kontext som "Epic 1:", "Fetch party information:", etc.)
    const normalized = step
      .replace(/^[^:]+:\s*/i, '') // Ta bort "Epic 1: " eller "Node: "
      .trim()
      .toLowerCase();
    
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(step);
  }

  // Om en grupp har flera items, kombinera med node-kontext
  const result: string[] = [];
  for (const [normalized, steps] of groups.entries()) {
    if (steps.length === 1) {
      result.push(steps[0]); // Behåll original
    } else {
      // Extrahera node-kontext från alla steps
      const nodeContexts = steps.map(step => {
        const match = step.match(/^([^:]+):/);
        return match ? match[1].trim() : null;
      }).filter(Boolean) as string[];
      
      // Kombinera: "Action (Node1, Node2, ...)"
      const action = steps[0].replace(/^[^:]+:\s*/i, '').trim();
      const uniqueNodes = [...new Set(nodeContexts)];
      if (uniqueNodes.length > 0) {
        result.push(`${action} (${uniqueNodes.join(', ')})`);
      } else {
        result.push(action); // Ingen node-kontext
      }
    }
  }

  return result;
}
```

**Funktion 3: Aggregera Dependencies**

```typescript
/**
 * Aggregates dependencies by category to reduce duplication.
 */
export function aggregateDependencies(
  dependencies: string[]
): AggregatedDependencies | undefined {
  if (!dependencies || dependencies.length === 0) {
    return undefined;
  }

  const inputs: string[] = [];
  const outputs: string[] = [];
  const systems: string[] = [];
  const processes: string[] = [];

  for (const dep of dependencies) {
    const normalized = dep.trim();
    
    // Categorize based on prefix or content
    if (normalized.toLowerCase().startsWith('input:')) {
      const value = normalized.replace(/^input:\s*/i, '').trim();
      if (value && !inputs.includes(value)) {
        inputs.push(value);
      }
    } else if (normalized.toLowerCase().startsWith('output:')) {
      const value = normalized.replace(/^output:\s*/i, '').trim();
      if (value && !outputs.includes(value)) {
        outputs.push(value);
      }
    } else if (
      normalized.toLowerCase().includes('system') ||
      normalized.toLowerCase().includes('databas') ||
      normalized.toLowerCase().includes('integration')
    ) {
      if (!systems.includes(normalized)) {
        systems.push(normalized);
      }
    } else if (
      normalized.toLowerCase().includes('process') ||
      normalized.toLowerCase().includes('ansökan')
    ) {
      if (!processes.includes(normalized)) {
        processes.push(normalized);
      }
    } else {
      // Default: treat as input if unclear
      if (!inputs.includes(normalized)) {
        inputs.push(normalized);
      }
    }
  }

  // Only return if we have at least one category with items
  if (inputs.length === 0 && outputs.length === 0 && systems.length === 0 && processes.length === 0) {
    return undefined;
  }

  return {
    inputs: inputs.length > 0 ? inputs : undefined,
    outputs: outputs.length > 0 ? outputs : undefined,
    systems: systems.length > 0 ? systems : undefined,
    processes: processes.length > 0 ? processes : undefined,
  };
}
```

**Funktion 4: Huvudoptimering**

```typescript
/**
 * Optimizes a FeatureGoalDoc for E2E scenario generation.
 * Reduces token usage by ~15-20% while maintaining ALL critical information.
 * 
 * VIKTIGT: Behåller alla unika user stories och flowSteps - bara deduplicerar identiska.
 * 
 * @param doc - Original FeatureGoalDoc
 * @param options - Optimization options
 * @returns Optimized version
 */
export function optimizeFeatureGoalDocForE2E(
  doc: FeatureGoalDoc,
  options: {
    deduplicateUserStories?: boolean;
    deduplicateFlowSteps?: boolean;
    aggregateDependencies?: boolean;
  } = {}
): OptimizedFeatureGoalDoc {
  const {
    deduplicateUserStories: shouldDeduplicate = true,
    deduplicateFlowSteps: shouldDeduplicateSteps = true,
    aggregateDependencies: shouldAggregate = true,
  } = options;

  // Deduplicate flowSteps (behåller alla unika)
  const optimizedFlowSteps = shouldDeduplicateSteps && doc.flowSteps
    ? deduplicateFlowSteps(doc.flowSteps)
    : doc.flowSteps || [];

  // Deduplicate userStories (behåller alla unika)
  const optimizedUserStories = shouldDeduplicate && doc.userStories
    ? deduplicateUserStories(doc.userStories)
    : doc.userStories;

  // Aggregate dependencies (kategoriserar och deduplicerar)
  const aggregatedDependencies = shouldAggregate && doc.dependencies
    ? aggregateDependencies(doc.dependencies)
    : undefined;

  return {
    callActivityId: doc.callActivityId,
    bpmnFile: doc.bpmnFile,
    summary: doc.summary,
    flowSteps: optimizedFlowSteps,
    userStories: optimizedUserStories, // Behåller array, inte summary
    dependencies: aggregatedDependencies,
    // Preserve other fields as-is
    subprocesses: doc.subprocesses,
    serviceTasks: doc.serviceTasks,
    userTasks: doc.userTasks,
    businessRules: doc.businessRules,
  };
}
```

### Steg 3: Uppdatera E2E-generatorn

**Ändring 1: Använd optimering i `loadFileLevelDocFromStorage`**

```typescript
// I src/lib/e2eScenarioGenerator.ts

import { optimizeFeatureGoalDocForE2E } from './e2eScenarioOptimizer';

async function loadFileLevelDocFromStorage(
  bpmnFile: string
): Promise<OptimizedFeatureGoalDoc | null> {
  // ... existing code to load and parse JSON ...
  
  const rawDoc = {
    summary,
    flowSteps,
    userStories,
    dependencies,
  };

  // Optimize before returning
  const optimized = optimizeFeatureGoalDocForE2E({
    callActivityId: bpmnFile.replace('.bpmn', ''),
    bpmnFile,
    ...rawDoc,
  });

  return optimized;
}
```

**Ändring 2: Uppdatera `FeatureGoalDoc` interface eller skapa nytt**

Alternativ A: Utöka `FeatureGoalDoc` med optional fields:
```typescript
export interface FeatureGoalDoc {
  // ... existing fields ...
  userStories?: Array<{...}>; // Keep for backward compatibility
  userStoriesSummary?: UserStoriesSummary; // New optimized version
  dependencies?: string[]; // Keep for backward compatibility
  dependenciesAggregated?: AggregatedDependencies; // New optimized version
}
```

Alternativ B: Skapa separat `OptimizedFeatureGoalDoc` (rekommenderat):
- Behåller `FeatureGoalDoc` för Feature Goal-dokumentation (inte optimerad)
- Använder `OptimizedFeatureGoalDoc` endast i E2E-generatorn

**Ändring 3: Uppdatera `generateE2eScenarioWithLlm`**

```typescript
// I generateE2eScenarioWithLlm()

const llmInput = {
  path: {
    // ... existing ...
  },
  featureGoals: context.featureGoals.map(fg => {
    // Handle both optimized and non-optimized formats
    if ('userStoriesSummary' in fg) {
      // Optimized format
      return {
        callActivityId: fg.callActivityId,
        bpmnFile: fg.bpmnFile,
        summary: fg.summary,
        flowSteps: fg.flowSteps,
        userStoriesSummary: fg.userStoriesSummary, // Use summary instead of full array
        dependencies: fg.dependenciesAggregated || fg.dependencies, // Use aggregated if available
        // ... other fields ...
      };
    } else {
      // Non-optimized format (backward compatibility)
      return {
        // ... existing mapping ...
      };
    }
  }),
  processInfo: context.processInfo,
};
```

**Ändring 4: Uppdatera prompt**

I `prompts/llm/e2e_scenario_prompt.md`, uppdatera sektionen om `featureGoals`:

```markdown
**featureGoals:**
- `featureGoals[].callActivityId`, `featureGoals[].bpmnFile`, `featureGoals[].summary`
- `featureGoals[].flowSteps` (kritiskt för action/when)
- `featureGoals[].userStories` (kritiskt för assertion/then) - OBS: Kan vara `userStoriesSummary` för optimerade docs
- `featureGoals[].dependencies` - OBS: Kan vara `dependenciesAggregated` för optimerade docs
- `featureGoals[].businessRules`, `featureGoals[].userTasks`

**VIKTIGT - Optimized Format:**
Om `userStoriesSummary` finns istället för `userStories`:
- Använd `userStoriesSummary[role].commonGoals` för att förstå huvudmål
- Använd `userStoriesSummary[role].commonAcceptanceCriteria` för assertions
- Använd `userStoriesSummary[role].exampleStories` för kontext om specifika user stories

Om `dependenciesAggregated` finns istället för `dependencies`:
- Använd `dependenciesAggregated.inputs`, `outputs`, `systems`, `processes` för strukturerad information
```

### Steg 4: Uppdatera TypeScript-typer

**Uppdatera `E2eScenarioContext`:**

```typescript
export interface E2eScenarioContext {
  path: ProcessPath;
  featureGoals: (FeatureGoalDoc | OptimizedFeatureGoalDoc)[]; // Support both
  processInfo: {
    bpmnFile: string;
    processName: string;
    initiative: string;
  };
}
```

### Steg 5: Backward Compatibility

**Strategi:**
1. Behåll `FeatureGoalDoc` interface oförändrat
2. Skapa nytt `OptimizedFeatureGoalDoc` interface
3. E2E-generatorn hanterar båda formaten
4. Feature Goal-dokumentation (inte E2E) använder fortfarande `FeatureGoalDoc`

**Type Guards:**

```typescript
export function isOptimizedFeatureGoalDoc(
  doc: FeatureGoalDoc | OptimizedFeatureGoalDoc
): doc is OptimizedFeatureGoalDoc {
  return 'userStoriesSummary' in doc || 'dependenciesAggregated' in doc;
}
```

### Steg 6: Testning

**Unit Tests:**

```typescript
// tests/unit/e2eScenarioOptimizer.test.ts

describe('e2eScenarioOptimizer', () => {
  describe('summarizeUserStories', () => {
    it('should summarize 100 user stories to ~500 tokens', () => {
      const stories = generateMockUserStories(100);
      const summary = summarizeUserStories(stories);
      
      expect(summary).toBeDefined();
      expect(Object.keys(summary!).length).toBeLessThan(10); // Max 10 roles
      // Verify token reduction
      const originalTokens = estimateTokens(JSON.stringify(stories));
      const summaryTokens = estimateTokens(JSON.stringify(summary));
      expect(summaryTokens).toBeLessThan(originalTokens * 0.1); // 90% reduction
    });
  });

  describe('optimizeFlowSteps', () => {
    it('should limit flowSteps to maxSteps', () => {
      const steps = generateMockFlowSteps(100);
      const optimized = optimizeFlowSteps(steps, 30);
      
      expect(optimized.length).toBeLessThanOrEqual(30);
    });
  });

  describe('aggregateDependencies', () => {
    it('should categorize and deduplicate dependencies', () => {
      const deps = [
        'Input: Personnummer',
        'Input: Personnummer', // Duplicate
        'Output: Partsinformation',
        'System: Internal systems',
      ];
      
      const aggregated = aggregateDependencies(deps);
      
      expect(aggregated?.inputs).toHaveLength(1);
      expect(aggregated?.outputs).toHaveLength(1);
      expect(aggregated?.systems).toHaveLength(1);
    });
  });
});
```

**Integration Tests:**

```typescript
// tests/integration/e2eScenarioGenerator.test.ts

describe('E2E Scenario Generator with Optimization', () => {
  it('should generate scenarios with optimized file-level docs', async () => {
    // Mock file-level doc with 100 user stories
    const mockFileLevelDoc = {
      summary: 'Test summary',
      flowSteps: generateMockFlowSteps(100),
      userStories: generateMockUserStories(100),
      dependencies: generateMockDependencies(50),
    };

    // Generate scenario
    const result = await generateE2eScenariosForProcess(
      'test.bpmn',
      'Test Process',
      'Test Initiative'
    );

    // Verify optimization was applied
    expect(result.scenarios.length).toBeGreaterThan(0);
    // Verify token usage was reduced
    // (check via logging or metrics)
  });
});
```

## Implementeringsordning

### Fas 1: Grundläggande Optimering (Vecka 1)
1. ✅ Skapa `e2eScenarioOptimizer.ts` med grundläggande funktioner
2. ✅ Implementera `summarizeUserStories`
3. ✅ Implementera `optimizeFlowSteps`
4. ✅ Implementera `aggregateDependencies`
5. ✅ Unit tests för varje funktion

### Fas 2: Integration (Vecka 2)
1. ✅ Uppdatera `loadFileLevelDocFromStorage` att använda optimering
2. ✅ Uppdatera `generateE2eScenarioWithLlm` att hantera optimerad format
3. ✅ Uppdatera prompt för optimerad format
4. ✅ Integration tests

### Fas 3: Validering och Optimering (Vecka 3)
1. ✅ Testa med stora file-level docs (50+ epics)
2. ✅ Mät token-reduktion
3. ✅ Validera att E2E-scenarier fortfarande genereras korrekt
4. ✅ Finjustera algoritmer baserat på resultat

## Förväntade Resultat (Realistiska Siffror)

### Token-reduktion
- **Före**: ~25,500 tokens (5 epics) / ~34,000 tokens (10 epics)
- **Efter**: ~24,000 tokens (5 epics) / ~31,000 tokens (10 epics)
- **Minskning**: ~6-9% totalt, ~15-20% för file-level data

### Prestanda
- **Före**: ~2-3 sekunder per scenario (5-10 epics)
- **Efter**: ~2-3 sekunder per scenario (marginal förbättring)
- **Förbättring**: ~5-10% snabbare (marginal)

### Kostnad
- **Före**: ~$0.03-0.04 per scenario (5-10 epics)
- **Efter**: ~$0.03 per scenario (5-10 epics)
- **Minskning**: ~10-15% billigare (marginal men ackumulerat över många scenarios)

## Risker och Mitigeringar

### Risk 1: Information går förlorad
**Mitigering**: 
- **Behåller ALLA unika user stories** (bara deduplicerar identiska)
- **Behåller ALLA unika flowSteps** (bara deduplicerar identiska)
- Testa att genererade scenarios fortfarande är korrekta
- Jämför före/efter för att säkerställa kvalitet

### Risk 2: Claude förstår inte optimerad format
**Mitigering**:
- **Formatet är nästan identiskt** (bara deduplicerade arrays, kategoriserade dependencies)
- Minimal prompt-uppdatering behövs (bara för dependencies-struktur)
- Testa grundligt med olika scenarion

### Risk 3: Backward compatibility
**Mitigering**:
- Behåll stöd för både optimerad och icke-optimerad format
- Använd type guards för att identifiera format
- Gradvis migration

## Nästa Steg

1. ✅ Granska denna analys
2. ✅ Implementera Fas 1 (grundläggande optimering)
3. ✅ Testa med små file-level docs
4. ✅ Iterera baserat på feedback
5. ✅ Implementera Fas 2 och 3

