# Design: Testgenerering MED Claude för Högre Kvalitet

## 🎯 Syfte

Designa en lösning som använder Claude för att generera högkvalitativa test scenarios baserat på:
1. **Befintlig dokumentation** (Epic/Feature Goal med user stories)
2. **BPMN-processflöde** (struktur, paths, error events)
3. **Kombinationen** av båda för bättre kontext

---

## 🏗️ Arkitektur

### Översikt

```
┌─────────────────────────────────────────────────────────────┐
│              Befintlig Dokumentation (HTML/Storage)           │
│  - Epic dokumentation med user stories                       │
│  - Feature Goal dokumentation med user stories               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 1: Extrahera User Stories (Deterministisk)      │
│  - Läser från dokumentation                                   │
│  - Parserar HTML för att hitta user stories                  │
│  - Strukturerar data                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BPMN Process Graph                         │
│  - Byggs från BPMN-filer                                     │
│  - Sequence flows, nodtyper, error events                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 2: Bygg Kontext för Claude                      │
│  - Kombinerar user stories + BPMN-processflöde                │
│  - Bygger kontext-payload för Claude                         │
│  - Inkluderar dokumentation + BPMN-struktur                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 3: Anropa Claude för Analys                     │
│  - Skickar kontext till Claude                               │
│  - Claude analyserar och genererar test scenarios            │
│  - Returnerar strukturerad JSON med scenarios                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 4: Validera och Spara                           │
│  - Validerar Claude-output mot schema                        │
│  - Konverterar till TestScenario-format                      │
│  - Sparar till node_planned_scenarios                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Detaljerad Design

### Steg 1: Extrahera User Stories (Deterministisk)

**Fil:** `src/lib/testGeneration/userStoryExtractor.ts` (befintlig)

**Vad den gör:**
- Läser från dokumentation
- Parserar HTML
- Extraherar strukturerad data

**Output:**
```typescript
{
  userStories: ExtractedUserStory[],
  documentation: {
    summary: string,
    flowSteps: string[],
    dependencies: string[]
  }
}
```

---

### Steg 2: Bygg BPMN-processgraf (Deterministisk)

**Fil:** `src/lib/testGeneration/bpmnProcessFlowTestGenerator.ts` (befintlig, modifierad)

**Vad den gör:**
- Bygger graf från BPMN-filer
- Identifierar paths
- Extraherar error events

**Output:**
```typescript
{
  processGraph: BpmnProcessGraph,
  paths: Array<{
    type: 'happy-path' | 'error-path',
    nodes: BpmnProcessNode[],
    description: string
  }>,
  errorEvents: Array<{
    nodeId: string,
    errorCode?: string,
    errorName: string
  }>
}
```

---

### Steg 3: Bygg Kontext för Claude (NY)

**Fil:** `src/lib/testGeneration/testScenarioContextBuilder.ts` (NY)

**Vad den gör:**
- Kombinerar user stories + BPMN-processflöde
- Bygger kontext-payload för Claude
- Inkluderar dokumentation + BPMN-struktur

**Funktion:**
```typescript
export function buildTestScenarioContext(
  userStories: ExtractedUserStory[],
  documentation: DocumentationContext,
  processGraph: BpmnProcessGraph,
  bpmnFile: string,
  elementId: string
): TestScenarioContext {
  // Kombinera all information till en kontext-payload
  return {
    nodeContext: {
      bpmnFile,
      elementId,
      nodeType: 'userTask' | 'serviceTask' | 'businessRuleTask' | 'callActivity',
      nodeName: string
    },
    documentation: {
      userStories,
      summary: documentation.summary,
      flowSteps: documentation.flowSteps,
      dependencies: documentation.dependencies
    },
    bpmnProcessFlow: {
      paths: extractPathsFromGraph(processGraph),
      errorEvents: extractErrorEvents(processGraph),
      gateways: extractGateways(processGraph)
    }
  };
}
```

---

### Steg 4: Anropa Claude för Analys (NY)

**Fil:** `src/lib/testGeneration/testScenarioLlmGenerator.ts` (NY)

**Vad den gör:**
- Skickar kontext till Claude
- Claude analyserar och genererar test scenarios
- Returnerar strukturerad JSON

**Funktion:**
```typescript
export async function generateTestScenariosWithLlm(
  context: TestScenarioContext,
  llmProvider?: LlmProvider
): Promise<TestScenarioLlmResult> {
  // Hämta prompt
  const prompt = await getTestScenarioPrompt();
  
  // Bygg input för Claude
  const llmInput = {
    nodeContext: context.nodeContext,
    documentation: context.documentation,
    bpmnProcessFlow: context.bpmnProcessFlow
  };
  
  // Anropa Claude
  const result = await generateChatCompletion({
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(llmInput, null, 2) }
    ],
    provider: llmProvider,
    schema: buildTestScenarioJsonSchema()
  });
  
  // Validera och returnera
  return validateAndParseTestScenarioOutput(result);
}
```

---

### Steg 5: Validera och Spara (NY)

**Fil:** `src/lib/testGeneration/testScenarioValidator.ts` (NY)

**Vad den gör:**
- Validerar Claude-output mot schema
- Konverterar till TestScenario-format
- Sparar till databasen

**Funktion:**
```typescript
export function validateAndConvertTestScenarios(
  llmOutput: TestScenarioLlmOutput
): TestScenario[] {
  // Validera mot schema
  const validated = validateTestScenarioSchema(llmOutput);
  
  // Konvertera till TestScenario-format
  return validated.scenarios.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    status: 'pending',
    category: s.category,
    riskLevel: s.priority,
    // ... andra fält
  }));
}
```

---

## 📝 Claude-prompt Design

### Prompt-struktur

**Fil:** `prompts/llm/test_scenario_prompt.md` (NY)

**Innehåll:**
1. **System-instruction:** Vad Claude ska göra
2. **Input-format:** Vad Claude får som input
3. **Output-format:** Vad Claude ska returnera
4. **Exempel:** Exempel på input/output

**System-instruction:**
```
Du är en erfaren testanalytiker inom kreditprocesser. 
Du ska analysera user stories och BPMN-processflöde för att generera 
högkvalitativa test scenarios.

Ditt uppdrag:
1. Analysera user stories för att identifiera test scenarios
2. Analysera BPMN-processflöde för att identifiera paths och edge cases
3. Kombinera båda för att skapa kompletta test scenarios
4. Kategorisera scenarios (happy-path/error-case/edge-case)
5. Prioritera scenarios baserat på risk
6. Generera konkreta steg baserat på dokumentation + BPMN
```

**Input-format:**
```json
{
  "nodeContext": {
    "bpmnFile": "mortgage-se-application.bpmn",
    "elementId": "application",
    "nodeType": "userTask",
    "nodeName": "Application"
  },
  "documentation": {
    "userStories": [...],
    "summary": "...",
    "flowSteps": [...],
    "dependencies": [...]
  },
  "bpmnProcessFlow": {
    "paths": [...],
    "errorEvents": [...],
    "gateways": [...]
  }
}
```

**Output-format:**
```json
{
  "scenarios": [
    {
      "id": "scenario-1",
      "name": "Happy Path: Skapa ansökan",
      "description": "...",
      "category": "happy-path",
      "priority": "P1",
      "steps": [
        {
          "order": 1,
          "action": "...",
          "expectedResult": "..."
        }
      ],
      "acceptanceCriteria": [...],
      "edgeCases": [...]
    }
  ]
}
```

---

## 🔄 Dataflöde

### 1. User Story-scenarios (MED Claude)

```
1. Extrahera user stories från dokumentation (deterministisk)
   ↓
2. Bygg BPMN-processgraf (deterministisk)
   ↓
3. Bygg kontext (kombinera user stories + BPMN)
   ↓
4. Anropa Claude för analys
   ↓
5. Claude genererar test scenarios
   ↓
6. Validera och spara
```

### 2. Process Flow-scenarios (MED Claude)

```
1. Bygg BPMN-processgraf (deterministisk)
   ↓
2. Identifiera paths (deterministisk)
   ↓
3. Bygg kontext (inkludera dokumentation om tillgänglig)
   ↓
4. Anropa Claude för varje path
   ↓
5. Claude genererar konkreta steg för varje path
   ↓
6. Validera och spara
```

---

## 📊 Förväntad Kvalitet

### User Story-scenarios (MED Claude)

**Sannolikhet: 85-95%**

**Vad vi får:**
- ✅ Korrekt kategorisering (semantisk analys, inte bara keywords)
- ✅ Konkreta steg baserat på dokumentation + BPMN
- ✅ Identifierade edge cases
- ✅ Prioritering baserat på risk (inte bara roll)

**Jämfört med deterministisk:**
- Deterministic: 30-40% värde (mycket omskrivning)
- Med Claude: 85-95% värde (analys och förbättring)

---

### Process Flow-scenarios (MED Claude)

**Sannolikhet: 80-90%**

**Vad vi får:**
- ✅ Konkreta steg (inte bara "Systemet exekverar X")
- ✅ Baserat på dokumentation + BPMN-struktur
- ✅ Identifierade prerequisites och dependencies
- ✅ Detaljerade expected results

**Jämfört med deterministisk:**
- Deterministic: 70-80% värde (identifierar paths, men generiska steg)
- Med Claude: 80-90% värde (konkreta steg baserat på kontext)

---

## ⚠️ Utmaningar och Lösningar

### 1. Kostnad

**Problem:** Många noder = många Claude-anrop = hög kostnad

**Lösning:**
- **Batch-processing:** Gruppera flera noder i samma anrop
- **Caching:** Spara resultat för att undvika dubbletter
- **Selective generation:** Använd Claude bara för viktiga noder
- **Fallback:** Deterministic generering om Claude misslyckas

---

### 2. Hastighet

**Problem:** API-anrop tar tid

**Lösning:**
- **Parallel processing:** Anropa Claude för flera noder parallellt
- **Progress feedback:** Visa progress i UI
- **Background processing:** Kör i bakgrunden

---

### 3. Pålitlighet

**Problem:** API kan vara nere, rate limits, fel i output

**Lösning:**
- **Fallback:** Deterministic generering om Claude misslyckas
- **Retry logic:** Försök igen vid fel
- **Validation:** Validera output mot schema
- **Error handling:** Graceful degradation

---

## 🎯 Implementation Plan

### Fas 1: Bygg Kontext-builder (2-3 timmar)

**Fil:** `src/lib/testGeneration/testScenarioContextBuilder.ts`

**Funktioner:**
- `buildTestScenarioContext()` - Kombinera user stories + BPMN
- `extractPathsFromGraph()` - Extrahera paths från graf
- `extractErrorEvents()` - Extrahera error events
- `extractGateways()` - Extrahera gateways

---

### Fas 2: Skapa Claude-prompt (1-2 timmar)

**Fil:** `prompts/llm/test_scenario_prompt.md`

**Innehåll:**
- System-instruction
- Input-format
- Output-format
- Exempel

---

### Fas 3: Implementera LLM-generator (3-4 timmar)

**Fil:** `src/lib/testGeneration/testScenarioLlmGenerator.ts`

**Funktioner:**
- `generateTestScenariosWithLlm()` - Anropa Claude
- `validateAndParseTestScenarioOutput()` - Validera output
- `buildTestScenarioJsonSchema()` - Bygg JSON schema

---

### Fas 4: Implementera Validator (1-2 timmar)

**Fil:** `src/lib/testGeneration/testScenarioValidator.ts`

**Funktioner:**
- `validateTestScenarioSchema()` - Validera mot schema
- `convertToTestScenario()` - Konvertera till TestScenario-format

---

### Fas 5: Uppdatera UI (1-2 timmar)

**Fil:** `src/pages/TestGenerationPage.tsx`

**Ändringar:**
- Lägg till alternativ: "Med Claude" vs "Utan Claude"
- Visa progress för Claude-anrop
- Visa kostnad/estimat

---

### Fas 6: Tester (3-4 timmar)

**Filer:**
- `tests/unit/testGeneration/testScenarioContextBuilder.test.ts`
- `tests/unit/testGeneration/testScenarioLlmGenerator.test.ts`
- `tests/unit/testGeneration/testScenarioValidator.test.ts`
- `tests/integration/testGeneration/claude.test.ts`

---

## 📊 Förväntade Resultat

### Med Claude:

**User Story-scenarios:**
- ✅ Korrekt kategorisering (85-95% noggrannhet)
- ✅ Konkreta steg baserat på dokumentation
- ✅ Identifierade edge cases
- ✅ Prioritering baserat på risk

**Process Flow-scenarios:**
- ✅ Konkreta steg (inte generiska)
- ✅ Baserat på dokumentation + BPMN
- ✅ Detaljerade expected results
- ✅ Prerequisites och dependencies

---

## 💡 Rekommendation

### Hybrid-Approach (Bästa av Båda)

1. **Deterministic för strukturering** (snabb, kostnadsfri)
   - Extrahera user stories
   - Bygg BPMN-processgraf
   - Identifiera paths

2. **Claude för analys** (hög kvalitet)
   - Analysera user stories + BPMN
   - Generera konkreta steg
   - Identifiera edge cases

3. **Fallback** (om Claude misslyckas)
   - Deterministic generering som backup
   - Lägre kvalitet, men fungerar

---

**Datum:** 2025-12-22
**Status:** Design klar - redo för implementation







