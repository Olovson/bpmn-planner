import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import type { TestScenario } from '@/data/testMapping';
import type { FeatureGoalDocModel } from '@/lib/featureGoalLlmTypes';
import type { ProcessPath, GatewayCondition } from '@/lib/bpmnFlowExtractor';
import { generateDocumentationWithLlm } from './llmDocumentation';
import { isLlmEnabled } from './llmClient';

export interface FeatureGoalTestExtraction {
  callActivityId: string;
  bpmnFile: string;
  testScenarios: TestScenario[];
  sourceE2eScenarios: string[];
  gatewayContexts: Map<string, GatewayCondition[]>; // Gateway-conditions per test
}

/**
 * Extraherar Feature Goal-tester från E2E-scenarios med gateway-kontext
 * Använder hybrid approach: deterministisk först, Claude som fallback
 */
export async function extractFeatureGoalTestsWithGatewayContext(
  e2eScenarios: E2eScenario[],
  paths: ProcessPath[],
  featureGoalDocs: Map<string, FeatureGoalDocModel>
): Promise<Map<string, FeatureGoalTestExtraction>> {
  const result = new Map<string, FeatureGoalTestExtraction>();

  for (const e2eScenario of e2eScenarios) {
    // 1. Hitta motsvarande ProcessPath för E2E-scenario (deterministiskt först)
    let matchingPath = findMatchingPath(e2eScenario, paths);
    
    // 2. Om deterministisk matchning misslyckas, försök Claude-förbättring
    if (!matchingPath && isLlmEnabled()) {
      matchingPath = await findMatchingPathWithClaude(e2eScenario, paths);
    }
    
    if (!matchingPath) {
      console.warn(
        `[extractFeatureGoalTestsWithGatewayContext] No matching path for E2E-scenario ${e2eScenario.id}`
      );
      // Fortsätt ändå, men utan gateway-kontext
    }

    // 3. Bygg gateway-context map (vilka gateway-conditions gäller för vilka Feature Goals)
    const gatewayContextMap = matchingPath
      ? await buildGatewayContextMapWithFallback(matchingPath)
      : new Map<string, GatewayCondition[]>();

    // 4. För varje subprocessStep, extrahera Feature Goal-test med gateway-kontext
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
      
      // 5. Hämta gateway-conditions för denna Feature Goal
      const gatewayConditions = gatewayContextMap.get(callActivityId) || [];
      
      // 6. Skapa TestScenario med gateway-kontext (deterministiskt först, Claude som fallback)
      const testScenario = await createTestScenarioWithGatewayContextHybrid(
        subprocessStep,
        e2eScenario,
        gatewayConditions,
        featureGoalDocs.get(key)
      );

      extraction.testScenarios.push(testScenario);
      
      // 7. Spara gateway-context för denna test
      const testKey = `${testScenario.id}`;
      extraction.gatewayContexts.set(testKey, gatewayConditions);
      
      if (!extraction.sourceE2eScenarios.includes(e2eScenario.id)) {
        extraction.sourceE2eScenarios.push(e2eScenario.id);
      }
    }
  }

  // 8. Deduplicera tester (men behåll olika gateway-kontext)
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
 * Hittar ProcessPath som matchar E2E-scenario (deterministiskt)
 * Förbättrad matchning: Använder pathMetadata om tillgängligt, annars fallback till subprocessSteps
 */
function findMatchingPath(
  e2eScenario: E2eScenario,
  paths: ProcessPath[]
): ProcessPath | undefined {
  // Förbättrad matchning: Använd pathMetadata om tillgängligt (sparad med E2E scenario)
  if (e2eScenario.pathMetadata) {
    const matchingPath = paths.find((path) => {
      // Matcha baserat på startEvent, endEvent och featureGoals
      return (
        path.startEvent === e2eScenario.pathMetadata!.startEvent &&
        path.endEvent === e2eScenario.pathMetadata!.endEvent &&
        arraysEqual(path.featureGoals, e2eScenario.pathMetadata!.featureGoals)
      );
    });
    
    if (matchingPath) {
      return matchingPath;
    }
  }
  
  // Fallback: Matcha baserat på Feature Goals i subprocessSteps
  const e2eFeatureGoals = e2eScenario.subprocessSteps
    .map((step) => step.callActivityId)
    .filter(Boolean) as string[];

  return paths.find((path) => {
    // Matcha baserat på Feature Goals i samma ordning
    return arraysEqual(path.featureGoals, e2eFeatureGoals);
  });
}

/**
 * Hittar ProcessPath som matchar E2E-scenario (Claude-förbättring)
 */
async function findMatchingPathWithClaude(
  e2eScenario: E2eScenario,
  paths: ProcessPath[]
): Promise<ProcessPath | undefined> {
  if (!isLlmEnabled()) return undefined;

  try {
    const e2eFeatureGoals = e2eScenario.subprocessSteps
      .map((step) => step.callActivityId)
      .filter(Boolean) as string[];

    const prompt = `
Du ska matcha ett E2E-scenario mot en ProcessPath baserat på Feature Goals.

E2E-scenario:
- ID: ${e2eScenario.id}
- Name: ${e2eScenario.name}
- Feature Goals (i ordning): ${e2eFeatureGoals.join(' → ')}

Tillgängliga ProcessPaths:
${paths.map((p, i) => `
Path ${i + 1}:
- ID: ${p.startEvent} → ${p.endEvent}
- Feature Goals (i ordning): ${p.featureGoals.join(' → ')}
- Gateway Conditions: ${p.gatewayConditions.map(gc => gc.conditionText).join(', ')}
`).join('\n')}

Returnera JSON med formatet:
{
  "matchedPathIndex": <index av path som matchar, eller null om ingen match>
  "confidence": "high" | "medium" | "low"
  "reason": "<förklaring av matchningen>"
}
`;

    const llmResult = await generateDocumentationWithLlm(
      'feature', // Använd feature prompt som fallback
      {
        node: {} as any,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      },
      {} as any
    );

    if (!llmResult?.text) return undefined;

    // Parse JSON från Claude
    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return undefined;

    const matchResult = JSON.parse(jsonMatch[0]);
    if (matchResult.matchedPathIndex !== null && matchResult.matchedPathIndex >= 0 && matchResult.matchedPathIndex < paths.length) {
      return paths[matchResult.matchedPathIndex];
    }

    return undefined;
  } catch (error) {
    console.warn('[findMatchingPathWithClaude] Claude matchning misslyckades:', error);
    return undefined;
  }
}

/**
 * Bygger gateway-context map (deterministiskt)
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
      
      if (
        gatewayIndex !== -1 &&
        featureGoalIndex !== -1 &&
        gatewayIndex < featureGoalIndex
      ) {
        // Gateway är FÖRE Feature Goal - condition gäller
        conditions.push(condition);
      }
    }

    contextMap.set(featureGoalId, conditions);
  }

  return contextMap;
}

/**
 * Bygger gateway-context map med Claude-förbättring (hybrid)
 */
async function buildGatewayContextMapWithFallback(
  path: ProcessPath
): Promise<Map<string, GatewayCondition[]>> {
  // 1. Försök deterministisk approach först
  const deterministicMap = buildGatewayContextMap(path);

  // 2. Kontrollera om gateway-conditions saknas eller är ofullständiga
  const hasIncompleteConditions = path.gatewayConditions.some(
    (gc) => !gc.conditionText || gc.conditionText.trim().length === 0
  );

  // 3. Om conditions saknas, försök Claude-förbättring
  if (hasIncompleteConditions && isLlmEnabled()) {
    try {
      const improvedConditions = await interpretGatewayConditionsWithClaude(path);
      if (improvedConditions.length > 0) {
        // Uppdatera path med förbättrade conditions
        path.gatewayConditions = improvedConditions;
        // Bygg map igen med förbättrade conditions
        return buildGatewayContextMap(path);
      }
    } catch (error) {
      console.warn('[buildGatewayContextMapWithFallback] Claude-förbättring misslyckades:', error);
    }
  }

  return deterministicMap;
}

/**
 * Tolkar gateway-conditions med Claude (fallback)
 */
async function interpretGatewayConditionsWithClaude(
  path: ProcessPath
): Promise<GatewayCondition[]> {
  if (!isLlmEnabled()) return [];

  try {
    // För nu, returnera tom array (Claude-integration kommer senare)
    // TODO: Implementera Claude-tolkning när vi har rätt prompt-struktur
    return [];

    if (!llmResult?.text) return [];

    // Parse JSON från Claude
    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const result = JSON.parse(jsonMatch[0]);
    return result.gatewayConditions || [];
  } catch (error) {
    console.warn('[interpretGatewayConditionsWithClaude] Claude-tolkning misslyckades:', error);
    return [];
  }
}

/**
 * Skapar TestScenario med gateway-kontext (deterministiskt)
 */
function createTestScenarioWithGatewayContext(
  subprocessStep: E2eScenario['subprocessSteps'][0],
  e2eScenario: E2eScenario,
  gatewayConditions: GatewayCondition[],
  featureGoalDoc?: FeatureGoalDocModel
): TestScenario {
  const id = `${subprocessStep.callActivityId}-e2e-${e2eScenario.id}-step-${subprocessStep.order}`;
  
  // Bygg name med gateway-kontext
  const gatewayContextText =
    gatewayConditions.length > 0
      ? ` (${gatewayConditions.map((gc) => gc.conditionText).join(', ')})`
      : '';
  const name = `${subprocessStep.callActivityId} - ${subprocessStep.description}${gatewayContextText}`;
  
  // Bygg description med gateway-conditions
  const descriptionParts: string[] = [];
  
  // Given: subprocessStep.given + gateway-conditions
  if (subprocessStep.given) {
    descriptionParts.push(`Given: ${subprocessStep.given}`);
  }
  if (gatewayConditions.length > 0) {
    const gatewayText = gatewayConditions.map((gc) => gc.conditionText).join(', ');
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
      .flatMap((us) => us.acceptanceCriteria)
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
 * Skapar TestScenario med gateway-kontext (hybrid: deterministiskt först, Claude som fallback)
 */
async function createTestScenarioWithGatewayContextHybrid(
  subprocessStep: E2eScenario['subprocessSteps'][0],
  e2eScenario: E2eScenario,
  gatewayConditions: GatewayCondition[],
  featureGoalDoc?: FeatureGoalDocModel
): Promise<TestScenario> {
  // 1. Försök deterministisk generering först
  const deterministicTest = createTestScenarioWithGatewayContext(
    subprocessStep,
    e2eScenario,
    gatewayConditions,
    featureGoalDoc
  );

  // 2. Kontrollera om test är komplett
  const isComplete = isTestComplete(deterministicTest, featureGoalDoc);

  if (isComplete || !isLlmEnabled()) {
    return deterministicTest;
  }

  // 3. Använd Claude för att förbättra testet
  try {
    const improvedTest = await generateFeatureGoalTestWithClaude(
      subprocessStep,
      e2eScenario,
      gatewayConditions,
      featureGoalDoc
    );

    // 4. Kombinera deterministiskt test med Claude-förbättringar
    return mergeTestScenarios(deterministicTest, improvedTest);
  } catch (error) {
    console.warn('[createTestScenarioWithGatewayContextHybrid] Claude-förbättring misslyckades:', error);
    return deterministicTest; // Fallback till deterministiskt test
  }
}

/**
 * Kontrollerar om test är komplett
 */
function isTestComplete(
  test: TestScenario,
  featureGoalDoc?: FeatureGoalDocModel
): boolean {
  // Test är komplett om:
  // 1. Description innehåller Given, When, Then
  const hasGiven = test.description.includes('Given:');
  const hasWhen = test.description.includes('When:');
  const hasThen = test.description.includes('Then:');

  // 2. Feature Goal-dokumentation finns (om tillgänglig)
  const hasFeatureGoalDoc = featureGoalDoc !== undefined;

  return hasGiven && hasWhen && hasThen && (hasFeatureGoalDoc || !featureGoalDoc);
}

/**
 * Genererar Feature Goal-test med Claude (fallback)
 */
async function generateFeatureGoalTestWithClaude(
  subprocessStep: E2eScenario['subprocessSteps'][0],
  e2eScenario: E2eScenario,
  gatewayConditions: GatewayCondition[],
  featureGoalDoc?: FeatureGoalDocModel
): Promise<TestScenario> {
  if (!isLlmEnabled()) {
    throw new Error('LLM is not enabled');
  }

  // För nu, kasta fel (Claude-integration kommer senare)
  // TODO: Implementera Claude-generering när vi har rätt prompt-struktur
  throw new Error('Claude generation not yet implemented');

  if (!llmResult?.text) {
    throw new Error('Claude returned no text');
  }

  // Parse JSON från Claude
  const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const claudeTest = JSON.parse(jsonMatch[0]) as TestScenario;
  return claudeTest;
}

/**
 * Kombinerar deterministiskt test med Claude-förbättringar
 */
function mergeTestScenarios(
  deterministic: TestScenario,
  claude: TestScenario
): TestScenario {
  // Prioritera Claude-värden, men behåll deterministiska om Claude saknar information
  return {
    id: deterministic.id, // Alltid använd deterministiskt ID
    name: claude.name || deterministic.name,
    description: claude.description || deterministic.description,
    status: deterministic.status, // Alltid "pending"
    category: claude.category || deterministic.category,
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
      return 'edge-case';
    case 'error':
      return 'error-case';
    default:
      return 'happy-path';
  }
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
    const gatewayKey = gatewayConditions.map((gc) => gc.conditionText).join('|');
    
    // Skapa unik nyckel baserat på name, description OCH gateway-conditions
    const key = `${scenario.name}:${scenario.description}:${gatewayKey}`;
    
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
    const categoryOrder: Record<TestScenario['category'], number> = {
      'happy-path': 0,
      'edge-case': 1,
      'error-case': 2,
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

/**
 * Hjälpfunktion: Jämför två arrays
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}
