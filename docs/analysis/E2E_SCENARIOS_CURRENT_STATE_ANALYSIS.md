# Analys: Nuvarande tillstånd för E2E-scenario-generering

## 🎯 Syfte

Analysera vad som faktiskt genereras idag, vad som planeras, och vad som saknas för E2E-scenario-generering.

---

## 📊 Vad genereras idag (implementerat)

### 1. Enkel E2E-scenario-generering i `generate-artifacts` edge function

**Var:** `supabase/functions/generate-artifacts/index.ts` - `generateE2EScenarios()`

**Vad genereras:**
- **Happy path scenario:** Alla Call Activities i ordning
- **Application approved scenario:** Om det finns "credit" i Feature Goal-namn
- **Application rejected scenario:** Om det finns "credit" i Feature Goal-namn

**Kvalitet:** 30-40% (mycket enkel, baserad på namn-matchning)

**Exempel:**
```typescript
// Happy path scenario
{
  initiative: "Mortgage",
  name: "Happy path",
  description: "Complete mortgage application flow with all steps successful",
  path: {
    subprocessName: "Complete Flow",
    featureGoals: ["Application", "Mortgage commitment", "Object valuation"],
    keyNodes: ["First 5 key nodes"]
  },
  tags: ["happy-path", "complete-flow"]
}
```

**Problem:**
- ❌ Ingen logik för "en sökare" vs "medsökare"
- ❌ Ingen logik för olika typer av scenarios (bostadsrätt, småhus, etc)
- ❌ Ingen användning av gateway-conditions
- ❌ Ingen användning av Feature Goal-dokumentation
- ❌ Ingen användning av Claude
- ❌ Ingen `bankProjectTestSteps` med UI-interaktion, API-anrop, DMN-beslut

---

## 📋 Vad planeras (inte implementerat)

### 1. E2E-scenario-generering med Claude

**Planerad process:**
1. Extrahera paths från BPMN-processgraf (med gateway-conditions)
2. Ladda Feature Goal-dokumentation
3. Skicka till Claude med:
   - Path-struktur (Feature Goals, gateway-conditions)
   - Feature Goal-dokumentation
   - BPMN process-information
4. Claude genererar:
   - `name`, `summary`, `given`, `when`, `then`
   - `bankProjectTestSteps` (med `action`, `assertion`, delvis `uiInteraction`, `dmnDecision`, `backendState`)
   - `subprocessSteps` (med `description`, `given`, `when`, `then`)

**Status:** ❌ **INTE IMPLEMENTERAT**

**Saknas:**
- ❌ Ingen prompt för E2E-scenario-generering (`prompts/llm/e2e_scenario_prompt.md` finns inte)
- ❌ Ingen funktion för att generera E2E-scenarios med Claude
- ❌ Ingen logik för att identifiera paths med gateway-conditions
- ❌ Ingen logik för att kombinera Feature Goal-dokumentation med paths

---

## ❌ Vad saknas för komplett E2E-scenario-generering

### 1. Prompt för E2E-scenario-generering

**Saknas:** `prompts/llm/e2e_scenario_prompt.md`

**Vad prompten behöver innehålla:**
- Instruktioner för att generera E2E-scenarios baserat på paths
- Instruktioner för att använda Feature Goal-dokumentation
- Instruktioner för att inkludera gateway-conditions i `given`
- Instruktioner för att generera `bankProjectTestSteps` med UI-interaktion, API-anrop, DMN-beslut
- Instruktioner för att generera `subprocessSteps` med `given`, `when`, `then`
- Exempel på output-format

**Exempel struktur:**
```markdown
# E2E Scenario Generation Prompt

Du ska generera E2E-scenarios baserat på:
- BPMN-processgraf (paths med Feature Goals)
- Feature Goal-dokumentation
- Gateway-conditions

För varje path, generera:
- name: Beskrivande namn (t.ex. "En sökande - Bostadsrätt godkänd automatiskt")
- summary: Lång beskrivning
- given: Given-conditions (inkl. gateway-conditions)
- when: When-actions
- then: Then-assertions
- bankProjectTestSteps: Teststeg per BPMN-nod med UI-interaktion, API-anrop, DMN-beslut
- subprocessSteps: Feature Goals i ordning med given/when/then
```

---

### 2. Logik för att identifiera olika typer av scenarios

**Saknas:** Logik för att generera scenarios för:
- **En sökare** vs **medsökare**
- **Bostadsrätt** vs **småhus**
- **Första bostaden** vs **befintlig fastighet att sälja**
- **Automatiskt godkänd** vs **manuell granskning**

**Vad behövs:**
- Analysera gateway-conditions för att identifiera olika typer
- Analysera Feature Goal-dokumentation för att identifiera olika typer
- Kombinera gateway-conditions med Feature Goals för att skapa olika scenarios

**Exempel:**
```typescript
// Identifiera scenarios baserat på gateway-conditions
const scenarios = [
  {
    type: "single-applicant",
    gatewayConditions: ["stakeholders.length === 1"],
    featureGoals: ["application", "credit-evaluation", "mortgage-commitment"]
  },
  {
    type: "co-applicant",
    gatewayConditions: ["stakeholders.length > 1"],
    featureGoals: ["application", "credit-evaluation", "mortgage-commitment"]
  },
  {
    type: "bostadsratt",
    gatewayConditions: ["propertyType === 'BOSTADSRATT'"],
    featureGoals: ["application", "object-valuation", "credit-evaluation"]
  },
  {
    type: "smahus",
    gatewayConditions: ["propertyType === 'SMAHUS'"],
    featureGoals: ["application", "object-valuation", "credit-evaluation"]
  }
];
```

---

### 3. Funktion för att generera E2E-scenarios med Claude

**Saknas:** `src/lib/e2eScenarioGenerator.ts` eller liknande

**Vad funktionen behöver göra:**
1. Identifiera paths från BPMN-processgraf
2. Ladda Feature Goal-dokumentation för varje Feature Goal i pathen
3. Bygga prompt-kontext med paths och Feature Goal-dokumentation
4. Anropa Claude med E2E-scenario-prompt
5. Parse och validera Claude-output
6. Spara E2E-scenarios till databas

**Exempel struktur:**
```typescript
export async function generateE2eScenariosWithClaude(
  bpmnFile: string,
  paths: ProcessPath[],
  featureGoalDocs: Map<string, FeatureGoalDoc>
): Promise<E2eScenario[]> {
  // 1. Ladda prompt
  const prompt = await loadE2eScenarioPrompt();
  
  // 2. För varje path, generera scenario
  const scenarios = await Promise.all(
    paths.map(async (path) => {
      // 3. Bygg kontext
      const context = buildE2eScenarioContext(path, featureGoalDocs);
      
      // 4. Anropa Claude
      const result = await renderDocWithLlm({
        prompt,
        context,
        docType: 'e2e-scenario'
      });
      
      // 5. Parse och validera
      return parseE2eScenarioFromLlmOutput(result.text, path);
    })
  );
  
  return scenarios;
}
```

---

## 🎯 Svar på användarens frågor

### 1. Vilka E2E-scenarios kommer vi generera?

**Idag (implementerat):**
- ❌ Mycket enkla scenarios baserade på namn-matchning
- ❌ Ingen logik för olika typer (en sökare, medsökare, etc)

**Planerat (inte implementerat):**
- ✅ Scenarios baserade på paths från BPMN-processgraf
- ✅ Scenarios med gateway-conditions (t.ex. "KALP OK = Yes" vs "KALP OK = No")
- ⚠️ **OSÄKERT:** Om vi kommer generera scenarios för "en sökare" vs "medsökare" - det beror på om gateway-conditions eller Feature Goal-dokumentation innehåller denna information

---

### 2. Kommer vi generera för en sökare, medsökare etc?

**Svar:** ⚠️ **OSÄKERT - BEROR PÅ IMPLEMENTERING**

**Vad som behövs:**
- Gateway-conditions eller Feature Goal-dokumentation som identifierar "en sökare" vs "medsökare"
- Logik för att identifiera olika typer baserat på gateway-conditions
- Prompt-instructioner för Claude om att generera olika typer av scenarios

**Exempel på vad som behövs i BPMN:**
```xml
<!-- Gateway som identifierar antal sökande -->
<bpmn:exclusiveGateway id="Gateway_stakeholders" name="Number of stakeholders?">
  <bpmn:outgoing>Flow_single</bpmn:outgoing>
  <bpmn:outgoing>Flow_co_applicant</bpmn:outgoing>
</bpmn:exclusiveGateway>

<bpmn:sequenceFlow id="Flow_single" sourceRef="Gateway_stakeholders" targetRef="CallActivity_application">
  <bpmn:conditionExpression>${stakeholders.length === 1}</bpmn:conditionExpression>
</bpmn:sequenceFlow>

<bpmn:sequenceFlow id="Flow_co_applicant" sourceRef="Gateway_stakeholders" targetRef="CallActivity_application">
  <bpmn:conditionExpression>${stakeholders.length > 1}</bpmn:conditionExpression>
</bpmn:sequenceFlow>
```

**Om detta finns i BPMN:**
- ✅ Vi kan identifiera olika paths (en sökare vs medsökare)
- ✅ Vi kan generera separata E2E-scenarios för varje path
- ✅ Claude kan generera scenarios med rätt kontext

**Om detta INTE finns i BPMN:**
- ❌ Vi kan inte automatiskt identifiera olika typer
- ❌ Claude kan inte generera olika typer utan kontext
- ⚠️ Manuell komplettering krävs

---

### 3. Hur vet vi vad Claude kommer skapa?

**Svar:** ⚠️ **VI VET INTE - INGEN PROMPT FINNS**

**Vad som saknas:**
- ❌ Ingen prompt för E2E-scenario-generering
- ❌ Ingen funktion för att generera E2E-scenarios med Claude
- ❌ Ingen validering av Claude-output

**Vad som behövs:**
- ✅ Prompt med tydliga instruktioner
- ✅ Exempel på output-format
- ✅ Validering av Claude-output mot E2eScenario-typ

---

### 4. Har Claude fått en bra prompt för att generera testinfo?

**Svar:** ❌ **NEJ - INGEN PROMPT FINNS FÖR E2E-SCENARIO-GENERERING**

**Vad som finns:**
- ✅ `prompts/llm/feature_epic_prompt.md` - För dokumentationsgenerering (Feature Goals, Epics)
- ✅ `prompts/llm/test_scenario_prompt.md` - För test scenario-generering (men inte E2E-scenarios)
- ❌ **INGEN prompt för E2E-scenario-generering**

**Vad som behövs:**
- ✅ Ny prompt: `prompts/llm/e2e_scenario_prompt.md`
- ✅ Instruktioner för att generera E2E-scenarios baserat på paths
- ✅ Instruktioner för att inkludera gateway-conditions
- ✅ Instruktioner för att generera `bankProjectTestSteps` med UI-interaktion, API-anrop, DMN-beslut
- ✅ Exempel på output-format

---

## 📊 Sammanfattning

### Vad genereras idag:
- ❌ Mycket enkla E2E-scenarios (happy path, approved, rejected)
- ❌ Ingen användning av Claude
- ❌ Ingen logik för olika typer (en sökare, medsökare, etc)

### Vad planeras:
- ✅ E2E-scenarios med Claude baserat på paths och Feature Goal-dokumentation
- ⚠️ **OSÄKERT:** Om olika typer (en sökare, medsökare) kommer genereras - beror på BPMN-struktur

### Vad saknas:
- ❌ Prompt för E2E-scenario-generering
- ❌ Funktion för att generera E2E-scenarios med Claude
- ❌ Logik för att identifiera olika typer av scenarios
- ❌ Validering av Claude-output

---

## 🎯 Rekommendationer

### 1. Skapa prompt för E2E-scenario-generering
- Fil: `prompts/llm/e2e_scenario_prompt.md`
- Innehåll: Instruktioner för Claude om hur man genererar E2E-scenarios
- Exempel: Output-format med `bankProjectTestSteps`, `subprocessSteps`, etc

### 2. Implementera E2E-scenario-generering med Claude
- Funktion: `generateE2eScenariosWithClaude()`
- Input: BPMN-processgraf (paths), Feature Goal-dokumentation
- Output: E2E-scenarios med `bankProjectTestSteps` och `subprocessSteps`

### 3. Identifiera olika typer av scenarios
- Analysera gateway-conditions för att identifiera olika typer
- Kombinera gateway-conditions med Feature Goals för att skapa olika scenarios
- Dokumentera vilka typer som kan genereras baserat på BPMN-struktur

### 4. Validera Claude-output
- Validera mot E2eScenario-typ
- Kontrollera att alla obligatoriska fält finns
- Kontrollera att `bankProjectTestSteps` innehåller rätt information

---

**Datum:** 2025-12-22
**Status:** Analys klar - Nuvarande tillstånd och saknade delar dokumenterade

