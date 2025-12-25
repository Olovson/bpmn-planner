# Implementeringsplan: Testfall från User Stories + BPMN-processflöde

## 🎯 Syfte

Implementera generering av testfall baserat på:
1. **User stories med acceptanskriterier** (från Epic/Feature Goal dokumentation)
2. **BPMN-processflöde** (sequence flows, nodtyper, error events)

**VIKTIGT:** Inte förstöra redan existerande dokumentation eller funktionalitet.

---

## 📊 Nuvarande situation

### Vad som redan finns:

1. **Dokumentationsgenerering:**
   - `bpmnGenerators.ts` - genererar Epic/Feature Goal dokumentation med user stories
   - `documentationTemplates.ts` - renderar dokumentation
   - User stories finns i `EpicDocModel` och `FeatureGoalDocModel`

2. **Testgenerering:**
   - `testGenerators.ts` - genererar testfiler med LLM-scenarios
   - `llmTests.ts` - genererar testscenarios med LLM
   - `plannedScenariosHelper.ts` - skapar planned scenarios från graph/tree
   - `buildScenariosFromDocJson()` - konverterar user stories till scenarios (finns men används inte)

3. **BPMN-parsing:**
   - `bpmnParser.ts` - parsar BPMN-filer
   - `bpmnProcessGraph.ts` - bygger processgraf med sequence flows
   - `BpmnProcessNode` - har all information vi behöver (nodtyper, sequence flows, error events)

4. **Databas:**
   - `node_planned_scenarios` tabell finns redan
   - `savePlannedScenarios()` - sparar scenarios till databasen

### Vad som saknas:

1. **Koppling mellan user stories och BPMN-noder:**
   - User stories finns i dokumentation, men är inte kopplade till specifika BPMN-noder
   - Behöver mappa user stories till rätt noder

2. **Testfall från BPMN-processflöde:**
   - `createPlannedScenariosFromGraph()` skapar bara fallback-scenarios
   - Behöver generera testfall baserat på sequence flows och error events

3. **Integration:**
   - Testfall från user stories sparas inte till `node_planned_scenarios`
   - Testfall från BPMN-processflöde genereras inte

---

## 🚀 Implementeringsplan

### Fas 1: Extrahera user stories från dokumentation (2-3 timmar)

**Syfte:** Hämta user stories från genererad dokumentation och koppla till BPMN-noder.

**Filer att skapa/modifiera:**

1. **`src/lib/userStoryExtractor.ts`** (NY FIL)
   ```typescript
   /**
    * Extraherar user stories från genererad dokumentation
    */
   export interface ExtractedUserStory {
     id: string;
     role: 'Kund' | 'Handläggare' | 'Processägare';
     goal: string;
     value: string;
     acceptanceCriteria: string[];
     // Koppling till BPMN
     bpmnFile?: string;
     bpmnElementId?: string;
     // Koppling till dokumentation
     docType: 'epic' | 'feature-goal';
     docContext?: string;
   }

   /**
    * Extraherar user stories från Epic-dokumentation
    */
   export async function extractUserStoriesFromEpic(
     bpmnFile: string,
     elementId: string
   ): Promise<ExtractedUserStory[]>

   /**
    * Extraherar user stories från Feature Goal-dokumentation
    */
   export async function extractUserStoriesFromFeatureGoal(
     bpmnFile: string,
     elementId: string
   ): Promise<ExtractedUserStory[]>
   ```

   **Implementation:**
   - Läs dokumentation från Supabase Storage eller HTML-filer
   - Parsa user stories från dokumentationen
   - Koppla till BPMN-noder baserat på `bpmnFile` och `elementId`

2. **Modifiera `src/lib/bpmnGenerators.ts`:**
   - Lägg till funktion för att extrahera user stories när dokumentation genereras
   - Spara user stories temporärt för senare användning

**Test:**
- Testa att extrahera user stories från befintlig dokumentation
- Verifiera att user stories är korrekt kopplade till BPMN-noder

---

### Fas 2: Generera testfall från user stories (3-4 timmar)

**Syfte:** Konvertera user stories till testfall och spara till `node_planned_scenarios`.

**Filer att skapa/modifiera:**

1. **`src/lib/userStoryToTestScenario.ts`** (NY FIL)
   ```typescript
   /**
    * Konverterar user stories till testfall
    */
   export interface UserStoryTestScenario {
     id: string;
     name: string;
     description: string;
     type: 'happy-path' | 'edge-case' | 'error-case';
     steps: string[];
     expectedResult: string;
     acceptanceCriteria: string[];
     source: 'user-story';
     userStoryId: string;
   }

   /**
    * Konverterar user story till testfall
    */
   export function convertUserStoryToTestScenario(
     userStory: ExtractedUserStory
   ): UserStoryTestScenario

   /**
    * Bestämmer testfall-typ baserat på acceptanskriterier
    */
   function determineTestType(
     acceptanceCriteria: string[]
   ): 'happy-path' | 'edge-case' | 'error-case'
   ```

   **Implementation:**
   - Använd befintlig `buildScenariosFromEpicUserStories()` som mall
   - Förbättra logiken för att bestämma testfall-typ
   - Lägg till Given/When/Then format från Feature Goals

2. **Modifiera `src/lib/plannedScenariosHelper.ts`:**
   - Lägg till funktion för att spara user story-scenarios
   - Integrera med befintlig `savePlannedScenarios()`

   ```typescript
   /**
    * Sparar user story-scenarios till databasen
    */
   export async function saveUserStoryScenarios(
     userStories: ExtractedUserStory[],
     provider: 'claude' | 'chatgpt' | 'ollama' = 'claude',
     origin: 'llm-doc' = 'llm-doc'
   ): Promise<{ success: boolean; count: number }>
   ```

**Test:**
- Testa konvertering av user stories till testfall
- Verifiera att testfall sparas korrekt till databasen

---

### Fas 3: Generera testfall från BPMN-processflöde (4-5 timmar)

**Syfte:** Generera testfall baserat på BPMN sequence flows och error events.

**Filer att skapa/modifiera:**

1. **`src/lib/bpmnProcessFlowTestGenerator.ts`** (NY FIL)
   ```typescript
   /**
    * Genererar testfall från BPMN-processflöde
    */
   export interface ProcessFlowTestScenario {
     id: string;
     name: string;
     description: string;
     type: 'happy-path' | 'error-case';
     steps: ProcessFlowTestStep[];
     expectedResult: string;
     source: 'bpmn-process-flow';
   }

   export interface ProcessFlowTestStep {
     order: number;
     nodeId: string;
     nodeType: BpmnNodeType;
     nodeName: string;
     action: string;
     expectedResult: string;
     condition?: string; // För gateways
   }

   /**
    * Genererar testfall från BPMN-processflöde
    */
   export function generateProcessFlowTestScenarios(
     graph: BpmnProcessGraph,
     startNodeId?: string
   ): ProcessFlowTestScenario[]

   /**
    * Genererar happy path testfall
    */
   function generateHappyPathScenario(
     graph: BpmnProcessGraph,
     path: BpmnProcessNode[]
   ): ProcessFlowTestScenario

   /**
    * Genererar error path testfall
    */
   function generateErrorPathScenario(
     graph: BpmnProcessGraph,
     errorEvent: BpmnProcessNode
   ): ProcessFlowTestScenario
   ```

   **Implementation:**
   - Använd `BpmnProcessGraph` för att följa sequence flows
   - Identifiera happy paths (normalt flöde)
   - Identifiera error paths (error events)
   - Generera teststeg för varje nod i flödet

2. **Modifiera `src/lib/plannedScenariosHelper.ts`:**
   - Lägg till funktion för att spara process flow-scenarios
   - Konvertera `ProcessFlowTestScenario` till `TestScenario` format

   ```typescript
   /**
    * Konverterar process flow-scenarios till TestScenario format
    */
   function convertProcessFlowToTestScenario(
     scenario: ProcessFlowTestScenario
   ): TestScenario

   /**
    * Sparar process flow-scenarios till databasen
    */
   export async function saveProcessFlowScenarios(
     scenarios: ProcessFlowTestScenario[],
     provider: 'claude' | 'chatgpt' | 'ollama' = 'claude',
     origin: 'spec-parsed' = 'spec-parsed'
   ): Promise<{ success: boolean; count: number }>
   ```

**Test:**
- Testa generering av happy path-scenarios
- Testa generering av error path-scenarios
- Verifiera att scenarios sparas korrekt till databasen

---

### Fas 4: Integration med dokumentationsgenerering (2-3 timmar)

**Syfte:** Integrera testfall-generering med befintlig dokumentationsgenerering.

**Filer att modifiera:**

1. **Modifiera `src/lib/bpmnGenerators.ts`:**
   - Lägg till anrop till testfall-generering när dokumentation genereras
   - Spara user story-scenarios när Epic/Feature Goal dokumentation genereras
   - Spara process flow-scenarios när BPMN-filer processas

   ```typescript
   // I renderEpicDoc() eller renderFeatureGoalDoc():
   // Efter att dokumentation är genererad:
   
   // 1. Extrahera user stories
   const userStories = await extractUserStoriesFromEpic(bpmnFile, elementId);
   
   // 2. Konvertera till testfall
   const testScenarios = userStories.map(convertUserStoryToTestScenario);
   
   // 3. Spara till databasen
   await saveUserStoryScenarios(testScenarios, 'claude', 'llm-doc');
   ```

2. **Modifiera `src/lib/bpmnGenerators.ts`:**
   - Lägg till anrop till process flow-generering när BPMN-filer processas
   - Spara process flow-scenarios när graf byggs

   ```typescript
   // I generateDocumentationForFile() eller liknande:
   // Efter att graf är byggd:
   
   // 1. Generera process flow-scenarios
   const processFlowScenarios = generateProcessFlowTestScenarios(graph);
   
   // 2. Spara till databasen
   await saveProcessFlowScenarios(processFlowScenarios, 'claude', 'spec-parsed');
   ```

**Test:**
- Testa att testfall genereras när dokumentation genereras
- Verifiera att testfall sparas korrekt till databasen
- Verifiera att befintlig funktionalitet inte påverkas

---

### Fas 5: UI-integration (2-3 timmar)

**Syfte:** Visa genererade testfall i UI.

**Filer att modifiera:**

1. **Modifiera `src/pages/TestReport.tsx`:**
   - Lägg till visning av user story-scenarios
   - Lägg till visning av process flow-scenarios
   - Lägg till filter för scenario-källa (user-story vs process-flow)

2. **Modifiera `src/components/RightPanel.tsx`:**
   - Lägg till visning av user story-scenarios för vald nod
   - Lägg till visning av process flow-scenarios för vald nod

**Test:**
- Testa att testfall visas korrekt i UI
- Verifiera att filter fungerar

---

## 🔒 Säkerhetsåtgärder

### Inte förstöra befintlig funktionalitet:

1. **Befintlig dokumentation:**
   - ✅ Läsa från befintlig dokumentation, inte skriva över
   - ✅ Extrahera user stories utan att modifiera dokumentationen
   - ✅ Använda befintliga funktioner som `buildScenariosFromEpicUserStories()`

2. **Befintlig testgenerering:**
   - ✅ Behålla befintlig `testGenerators.ts` funktionalitet
   - ✅ Behålla befintlig `llmTests.ts` funktionalitet
   - ✅ Lägga till ny funktionalitet, inte ersätta

3. **Befintlig databas:**
   - ✅ Använda befintlig `node_planned_scenarios` tabell
   - ✅ Använda befintlig `savePlannedScenarios()` funktion
   - ✅ Lägga till nya scenarios, inte skriva över befintliga (använd `upsert`)

4. **Befintlig BPMN-parsing:**
   - ✅ Använda befintlig `bpmnParser.ts` funktionalitet
   - ✅ Använda befintlig `bpmnProcessGraph.ts` funktionalitet
   - ✅ Läsa från befintlig graf, inte modifiera

---

## 📋 Checklista

### Fas 1: Extrahera user stories
- [ ] Skapa `src/lib/userStoryExtractor.ts`
- [ ] Implementera `extractUserStoriesFromEpic()`
- [ ] Implementera `extractUserStoriesFromFeatureGoal()`
- [ ] Testa extraktion från befintlig dokumentation

### Fas 2: Generera testfall från user stories
- [ ] Skapa `src/lib/userStoryToTestScenario.ts`
- [ ] Implementera `convertUserStoryToTestScenario()`
- [ ] Implementera `determineTestType()`
- [ ] Modifiera `src/lib/plannedScenariosHelper.ts`
- [ ] Implementera `saveUserStoryScenarios()`
- [ ] Testa konvertering och sparning

### Fas 3: Generera testfall från BPMN-processflöde
- [ ] Skapa `src/lib/bpmnProcessFlowTestGenerator.ts`
- [ ] Implementera `generateProcessFlowTestScenarios()`
- [ ] Implementera `generateHappyPathScenario()`
- [ ] Implementera `generateErrorPathScenario()`
- [ ] Modifiera `src/lib/plannedScenariosHelper.ts`
- [ ] Implementera `saveProcessFlowScenarios()`
- [ ] Testa generering och sparning

### Fas 4: Integration
- [ ] Modifiera `src/lib/bpmnGenerators.ts` för user stories
- [ ] Modifiera `src/lib/bpmnGenerators.ts` för process flow
- [ ] Testa integration med dokumentationsgenerering
- [ ] Verifiera att befintlig funktionalitet fungerar

### Fas 5: UI-integration
- [ ] Modifiera `src/pages/TestReport.tsx`
- [ ] Modifiera `src/components/RightPanel.tsx`
- [ ] Testa UI-visning

---

## 🎯 Förväntat resultat

Efter implementering:

1. **User story-scenarios:**
   - Genereras automatiskt när Epic/Feature Goal dokumentation genereras
   - Sparas till `node_planned_scenarios` med `origin: 'llm-doc'`
   - Visas i UI tillsammans med andra scenarios

2. **Process flow-scenarios:**
   - Genereras automatiskt när BPMN-filer processas
   - Sparas till `node_planned_scenarios` med `origin: 'spec-parsed'`
   - Visas i UI tillsammans med andra scenarios

3. **Befintlig funktionalitet:**
   - Fungerar som tidigare
   - Inga breaking changes
   - Befintlig dokumentation påverkas inte

---

## ⚠️ Risker och åtgärder

### Risk 1: User stories kan inte extraheras från dokumentation
**Åtgärd:** Fallback till att generera testfall direkt från BPMN-processflöde

### Risk 2: Process flow-generering kan vara för komplex
**Åtgärd:** Börja med enkel happy path-generering, lägg till error paths senare

### Risk 3: Integration kan påverka befintlig funktionalitet
**Åtgärd:** Omfattande tester, gradvis rollout

---

**Datum:** 2025-12-22
**Status:** Plan klar, redo för implementering


