# Implementeringsplan: Testgenerering MED Claude

## 🎯 Syfte

Implementera testgenerering med Claude för högre kvalitet baserat på:
1. **Befintlig dokumentation** (Epic/Feature Goal med user stories)
2. **BPMN-processflöde** (struktur, paths, error events)
3. **Kombinationen** av båda för bättre kontext

---

## ✅ Redan Implementerat

### 1. Analys och Design
- ✅ `docs/analysis/TEST_GENERATION_WITH_CLAUDE_ANALYSIS.md` - Analys av vad Claude kan göra
- ✅ `docs/analysis/TEST_GENERATION_WITH_CLAUDE_DESIGN.md` - Designförslag
- ✅ `prompts/llm/test_scenario_prompt.md` - Claude-prompt för testgenerering

### 2. Core-funktionalitet
- ✅ `src/lib/testGeneration/testScenarioLlmTypes.ts` - TypeScript-typer
- ✅ `src/lib/testGeneration/testScenarioContextBuilder.ts` - Bygger kontext för Claude
- ✅ `src/lib/testGeneration/testScenarioLlmGenerator.ts` - Anropar Claude
- ✅ `src/lib/testGeneration/testScenarioJsonSchema.ts` - JSON schema för structured output
- ✅ `src/lib/testGeneration/testScenarioValidator.ts` - Validerar Claude-output
- ✅ `src/lib/promptLoader.ts` - Uppdaterad med `getTestScenarioPrompt()`

### 3. Tester (alla mockar Claude)
- ✅ `tests/unit/testGeneration/testScenarioContextBuilder.test.ts`
- ✅ `tests/unit/testGeneration/testScenarioLlmGenerator.test.ts`
- ✅ `tests/unit/testGeneration/testScenarioValidator.test.ts`
- ✅ `tests/integration/testGeneration/claude.test.ts`

---

## 🔨 Återstående Implementation

### Fas 1: Integrera Claude-generering i TestGenerationPage (2-3 timmar)

**Fil:** `src/pages/TestGenerationPage.tsx`

**Vad som behöver göras:**
1. Lägg till alternativ: "Med Claude" vs "Utan Claude"
2. Uppdatera mutation för att använda Claude-generering
3. Visa progress för Claude-anrop
4. Hantera fel och fallback

**Kod-exempel:**
```typescript
const generateWithClaudeMutation = useMutation({
  mutationFn: async () => {
    // 1. Extrahera user stories
    const userStories = await extractUserStoriesFromAllDocs(nodesToExtract);
    
    // 2. Bygg BPMN-processgraf
    const graph = await buildBpmnProcessGraph(bpmnFile, allBpmnFiles);
    
    // 3. Bygg kontext
    const context = buildTestScenarioContext(
      userStories,
      documentation,
      graph,
      bpmnFile,
      elementId,
      nodeType,
      nodeName
    );
    
    // 4. Generera med Claude
    const llmResult = await generateTestScenariosWithLlm(context);
    
    if (!llmResult || llmResult.scenarios.length === 0) {
      // Fallback till deterministic
      return await generateWithoutClaude();
    }
    
    // 5. Konvertera och spara
    const testScenarios = convertLlmScenariosToTestScenarios(
      llmResult.scenarios,
      bpmnFile,
      elementId
    );
    
    return await saveUserStoryScenarios(testScenarios);
  },
});
```

---

### Fas 2: Uppdatera testScenarioSaver för Claude-scenarios (1-2 timmar)

**Fil:** `src/lib/testGeneration/testScenarioSaver.ts`

**Vad som behöver göras:**
1. Lägg till funktion för att spara Claude-genererade scenarios
2. Sätt `origin: 'llm-doc'` och `provider: 'claude'`
3. Inkludera `steps`, `prerequisites`, `edgeCases` om de finns

**Kod-exempel:**
```typescript
export async function saveClaudeTestScenarios(
  scenarios: TestScenario[],
  bpmnFile: string,
  elementId: string
): Promise<{ success: boolean; count: number; error?: any }> {
  const row: PlannedScenarioRow = {
    bpmn_file: bpmnFile,
    bpmn_element_id: elementId,
    provider: 'claude',
    origin: 'llm-doc',
    scenarios: scenarios.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      category: s.category,
      riskLevel: s.riskLevel,
      assertionType: s.assertionType,
      steps: s.steps,
      expectedResult: s.expectedResult,
      acceptanceCriteria: s.acceptanceCriteria,
      prerequisites: s.prerequisites,
      edgeCases: s.edgeCases,
    })),
  };
  
  const { error } = await supabase.from('node_planned_scenarios').upsert([row], {
    onConflict: 'bpmn_file,bpmn_element_id,provider,origin',
  });
  
  if (error) {
    return { success: false, count: 0, error };
  }
  
  return { success: true, count: 1 };
}
```

---

### Fas 3: Uppdatera TestScenario-interface för Claude-fält (1 timme)

**Fil:** `src/data/testMapping.ts`

**Vad som behöver göras:**
1. Lägg till valfria fält: `prerequisites`, `edgeCases`
2. Säkerställ att `steps` stödjer både `{ when: string[], then: string[] }` och `ProcessFlowStep[]`

**Kod-exempel:**
```typescript
export interface TestScenario {
  // ... existing fields ...
  steps?: {
    when: string[];
    then: string[];
  } | ProcessFlowStep[];
  prerequisites?: string[];
  edgeCases?: string[];
}
```

---

### Fas 4: Dokumentation (1-2 timmar)

**Filer:**
- `docs/guides/user/TEST_GENERATION_WITH_CLAUDE.md` - Användarguide
- `docs/analysis/TEST_GENERATION_WITH_CLAUDE_IMPLEMENTATION_PLAN.md` - Denna fil
- Uppdatera `tests/README.md` med nya tester

---

## 🧪 Teststrategi

### Unit-tester (alla mockar Claude)

**Redan implementerat:**
- ✅ `testScenarioContextBuilder.test.ts` - Testar kontext-byggning
- ✅ `testScenarioLlmGenerator.test.ts` - Testar Claude-anrop (mockad)
- ✅ `testScenarioValidator.test.ts` - Testar validering

**Vad testerna gör:**
- Mockar `generateChatCompletion` och `isLlmEnabled`
- Testar att kontext byggs korrekt
- Testar att validering fungerar
- Testar felhantering

**VIKTIGT:** Inga faktiska Claude-anrop i testerna!

---

### Integrationstester (mockar Claude)

**Redan implementerat:**
- ✅ `claude.test.ts` - Testar hela flödet (mockad Claude)

**Vad testerna gör:**
- Mockar alla externa dependencies (Supabase, LLM)
- Testar hela flödet: extract → build context → generate (mockad) → validate → save
- Testar felhantering och fallback

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

## ⚠️ Utmaningar och Lösningar

### 1. Kostnad

**Problem:** Många noder = många Claude-anrop = hög kostnad

**Lösning:**
- **Batch-processing:** Gruppera flera noder i samma anrop (framtida förbättring)
- **Caching:** Spara resultat för att undvika dubbletter (framtida förbättring)
- **Selective generation:** Använd Claude bara för viktiga noder (användarval)
- **Fallback:** Deterministic generering om Claude misslyckas (implementerat)

---

### 2. Hastighet

**Problem:** API-anrop tar tid

**Lösning:**
- **Parallel processing:** Anropa Claude för flera noder parallellt (framtida förbättring)
- **Progress feedback:** Visa progress i UI (implementerat)
- **Background processing:** Kör i bakgrunden (framtida förbättring)

---

### 3. Pålitlighet

**Problem:** API kan vara nere, rate limits, fel i output

**Lösning:**
- **Fallback:** Deterministic generering om Claude misslyckas (implementerat)
- **Retry logic:** Försök igen vid fel (framtida förbättring)
- **Validation:** Validera output mot schema (implementerat)
- **Error handling:** Graceful degradation (implementerat)

---

## 🎯 Nästa Steg

1. **Implementera Fas 1:** Integrera Claude-generering i TestGenerationPage
2. **Implementera Fas 2:** Uppdatera testScenarioSaver
3. **Implementera Fas 3:** Uppdatera TestScenario-interface
4. **Implementera Fas 4:** Dokumentation
5. **Testa:** Manuell validering i UI
6. **Iterera:** Förbättra baserat på feedback

---

**Datum:** 2025-12-22
**Status:** Core-funktionalitet klar, väntar på integration i UI








