# Analys: Given/When/Then Test-information

**Datum:** 2025-01-XX  
**Syfte:** Analysera hur given/when/then test-information genereras, visas och vad som saknas

---

## 📊 Nuvarande Situation

### Vad Vi Har

#### 1. **Data-struktur**

**E2eScenario-typ** (`src/pages/E2eTestsOverviewPage.tsx`):
```typescript
export type E2eScenario = {
  id: string;
  name: string;
  // ... andra fält
  given: string;        // ✅ På scenarionivå
  when: string;         // ✅ På scenarionivå
  then: string;         // ✅ På scenarionivå
  subprocessSteps: {
    order: number;
    bpmnFile: string;
    callActivityId?: string;
    given?: string;     // ✅ På subprocess-nivå
    when?: string;      // ✅ På subprocess-nivå
    then?: string;      // ✅ På subprocess-nivå
    // ... andra fält
  }[];
  bankProjectTestSteps: BankProjectTestStep[]; // UI/API/DMN info
};
```

**TestInfo-interface** (`src/lib/testCoverageHelpers.ts`):
```typescript
export interface TestInfo {
  scenarioId: string;
  scenarioName: string;
  subprocessStep: E2eScenario['subprocessSteps'][0]; // Innehåller given/when/then
  bankProjectStep?: BankProjectTestStep;
}
```

#### 2. **Visning**

**TestCoverageTable** (`src/components/TestCoverageTable.tsx`):
- ✅ Visar `given/when/then` från `subprocessStep` i tabellen
- ✅ Visar UI-interaktion, API-anrop, DMN-beslut från `bankProjectStep`
- ✅ Använder `renderBulletList()` för formatering
- ✅ Stödjer tre vyer: condensed, hierarchical, full

**TestCoverageExplorerPage** (`src/pages/TestCoverageExplorerPage.tsx`):
- ✅ Använder `TestCoverageTable` för att visa given/when/then
- ✅ Filtrerar scenarion baserat på valt scenario
- ✅ Exporterar till Excel/HTML

#### 3. **Data-källor**

**Hårdkodade scenarion** (`src/pages/E2eTestsOverviewPage.tsx`):
- ✅ `scenarios`-array med hårdkodade `E2eScenario`-objekt
- ✅ Innehåller given/when/then på både scenarionivå och subprocessStep-nivå
- ⚠️ **Problem:** Statiska, manuellt underhållna (skapade tidigare med AI-assistans i chatten)
- ⚠️ **Mål:** Automatisera genereringen med Claude istället för manuellt arbete

**TestDataHelpers** (`src/lib/testDataHelpers.ts`):
- ✅ `findE2eTestInfoForNode()` - hittar E2E-testinfo för en nod
- ✅ `aggregateE2eTestInfoForFeatureGoal()` - aggregerar för Feature Goal
- ⚠️ **Problem:** Använder endast hårdkodade scenarion, ingen databas-integration
- ⚠️ **Mål:** Ladda given/when/then från databas (genererat av Claude)

---

## ❌ Vad Som Saknas

### 1. **Automatisk Generering med Claude**

**Problem:**
- Given/when/then är **hårdkodade** i `E2eTestsOverviewPage.tsx` (skapade manuellt tidigare)
- Ingen automatisk generering från BPMN eller Claude
- Ingen integration med dokumentationsgenerering
- **Mål:** Ersätta manuellt arbete med automatisk Claude-generering

**Saknas:**
- ❌ **Prompt för given/when/then-generering** - Claude behöver instruktioner för att generera given/when/then
- ❌ **LLM-generering av given/when/then** från BPMN-struktur och dokumentation
- ❌ **Integration med `generateDocumentationWithLlm()`** - generera given/when/then tillsammans med dokumentation
- ❌ **Extrahera given/when/then från LLM-response** - parsa och spara resultatet
- ❌ **Integration med `generateTestSpecWithLlm()`** - alternativt generera separat

### 2. **Databas-lagring**

**Problem:**
- Given/when/then sparas **inte** i databasen
- Ingen persistent lagring av test-information
- Kan inte återskapa given/when/then efter generering

**Saknas:**
- ❌ Tabell för att spara given/when/then per nod/scenario
- ❌ Integration med `node_planned_scenarios` (eller ny tabell)
- ❌ Versionering av given/when/then
- ❌ Provider-tracking (cloud/ollama/local-fallback)

### 3. **Återskapande av Information**

**Problem:**
- Sidan `TestCoverageExplorerPage` kan inte återskapa given/when/then
- Måste ladda från hårdkodade scenarion
- Ingen dynamisk generering baserat på aktuell BPMN-struktur

**Saknas:**
- ❌ Funktion för att ladda given/when/then från databasen
- ❌ Funktion för att generera given/when/then från BPMN om saknas
- ❌ Fallback-mekanism om databasen är tom
- ❌ Cache/refresh-mekanism

### 4. **Integration med Dokumentationsgenerering**

**Problem:**
- Given/when/then genereras **inte** tillsammans med dokumentation
- Ingen koppling mellan dokumentationsgenerering och test-information
- Måste manuellt underhålla given/when/then separat

**Saknas:**
- ❌ Integration i `generateAllFromBpmnWithGraph()`
- ❌ Integration i `renderFeatureGoalDoc()`
- ❌ Extrahera given/when/then från LLM-response
- ❌ Spara given/when/then när dokumentation genereras

---

## 🔧 Vad Som Behöver Göras

### Prioritet 1: Databas-struktur

#### 1.1 Skapa/Utöka Tabell

**Alternativ A: Utöka `node_planned_scenarios`**
```sql
ALTER TABLE node_planned_scenarios
ADD COLUMN given_when_then JSONB;
-- Struktur: { given?: string, when?: string, then?: string }
```

**Alternativ B: Ny tabell `node_test_given_when_then`**
```sql
CREATE TABLE node_test_given_when_then (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bpmn_file TEXT NOT NULL,
  bpmn_element_id TEXT NOT NULL,
  scenario_id TEXT, -- Koppling till scenario (om relevant)
  provider TEXT NOT NULL, -- 'cloud', 'ollama', 'local-fallback'
  origin TEXT NOT NULL, -- 'llm-doc', 'design', 'spec-parsed'
  given TEXT,
  when TEXT,
  then TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bpmn_file, bpmn_element_id, scenario_id, provider)
);
```

**Rekommendation:** Alternativ A (utöka befintlig tabell) för enklare integration.

#### 1.2 TypeScript-typer

```typescript
// src/lib/testDataHelpers.ts
export interface GivenWhenThen {
  given?: string;
  when?: string;
  then?: string;
}

export interface TestScenarioData {
  provider: ScenarioProvider;
  origin: 'design' | 'llm-doc' | 'spec-parsed';
  scenarios: TestScenario[];
  givenWhenThen?: GivenWhenThen; // ✅ Nytt fält
}
```

### Prioritet 2: Generering med Claude

#### 2.1 Skapa Prompt för Given/When/Then

**Ny prompt-fil:** `prompts/llm/given_when_then_prompt.md`

**Innehåll:**
- Instruktioner för Claude att generera given/when/then baserat på BPMN-struktur
- Format: JSON med `given`, `when`, `then` fält
- Kontext: BPMN-nod, Feature Goal/Epic-beskrivning, hierarki
- Exempel på bra given/when/then för svenska kreditprocesser

**Inspiration från befintliga prompts:**
- Följ samma struktur som `feature_epic_prompt.md` (versionering, JSON-format, svenska)
- Använd samma stil som `testscript_prompt.md` (testautomationsexpert, svenska kreditprocesser)
- Inkludera exempel på bra given/when/then

**Struktur:**
```markdown
# Claude Prompt – Given/When/Then för BPMN-noder (Swedish)

Du är en senior testautomationsexpert med djup förståelse för svenska kredit- och bolåneprocesser och BPMN-flöden.
Du ska generera given/when/then i JSON-format baserat på BPMN-nodens syfte och kontext.

INPUT:
- BPMN-nod information (namn, typ, syfte)
- Feature Goal/Epic-beskrivning (om tillgänglig)
- Hierarki-kontext (föregående/nästa steg, subprocesser)

OUTPUT:
{
  "given": "Beskrivning av förutsättningar och initialt tillstånd",
  "when": "Beskrivning av vad som händer/triggar testet",
  "then": "Beskrivning av förväntat resultat och verifiering"
}

Exempel:
{
  "given": "En person har fyllt i komplett ansökan med normal inkomst och låg skuldsättning. Bostadsrätten uppfyller alla kriterier automatiskt.",
  "when": "Kunden bekräftar ansökan och systemet genomför automatisk kreditbedömning.",
  "then": "Ansökan godkänns automatiskt och går vidare till nästa steg i processen."
}
```

**Viktiga aspekter:**
- **Given:** Beskriv initialt tillstånd, förutsättningar, data som finns
- **When:** Beskriv vad som händer, vilken åtgärd som utförs, vad som triggar
- **Then:** Beskriv förväntat resultat, vad som ska verifieras, vilket tillstånd som ska uppnås
- Använd **affärsspråk** (inte teknisk BPMN-terminologi)
- Fokusera på **svenska kreditprocesser** och realistiska scenarion

#### 2.2 LLM-generering

**Valt alternativ: Separat LLM-anrop** ✅

**Beslut:** Alternativ B valdes eftersom testinformation inte alltid genereras tillsammans med dokumentation. Detta ger större flexibilitet.

**Implementation:**

**Ny funktion:**
```typescript
// src/lib/llmDocumentation.ts (eller src/lib/llmTests.ts)
export async function generateGivenWhenThenWithLlm(
  context: NodeDocumentationContext,
  documentationSummary?: string, // Valfritt: använd dokumentation som kontext om tillgänglig
  llmProvider?: LlmProvider,
  localAvailable: boolean = false,
  checkCancellation?: () => void,
  abortSignal?: AbortSignal,
): Promise<GivenWhenThen | null> {
  // 1. Ladda prompt från prompts/llm/given_when_then_prompt.md
  // 2. Bygg kontext från BPMN-struktur
  //    - Använd context.node (namn, typ, syfte)
  //    - Använd context.hierarchy (föregående/nästa steg)
  //    - Använd documentationSummary om tillgänglig (från genererad dokumentation)
  // 3. Anropa Claude med prompt och kontext
  // 4. Parse JSON-response (given, when, then)
  // 5. Validera response
  // 6. Returnera GivenWhenThen | null
}
```

**Integration-punkter:**
- Kan anropas **oberoende** av dokumentationsgenerering
- Kan anropas **efter** dokumentationsgenerering (använd dokumentation som kontext)
- Kan anropas från `generateAllFromBpmnWithGraph()` när testinformation behövs
- Kan anropas från UI när användaren väljer att generera testinformation

**Fördelar med Alternativ B:**
- ✅ Flexibelt - kan generera testinformation när det behövs
- ✅ Oberoende av dokumentationsgenerering
- ✅ Kan använda dokumentation som kontext om den finns
- ✅ Enklare att testa och debugga separat
- ✅ Kan optimeras separat (t.ex. olika prompts för olika nodtyper)

#### 2.2 Fallback-generering

**Lokal generering (utan LLM):**
- Generera enkla given/when/then från BPMN-nodnamn
- Använd Feature Goal/Epic-beskrivningar
- Skapa generiska test-scenarion

**Ny funktion:**
```typescript
// src/lib/testGenerators.ts
function generateGivenWhenThenFromBpmn(
  element: BpmnElement,
  context: NodeDocumentationContext,
): GivenWhenThen {
  // Generera från BPMN-struktur
  // Använd nodnamn, typ, beskrivning
}
```

### Prioritet 3: Lagring och Hämtning

#### 3.1 Spara given/when/then

**Integrera i `bpmnGenerators.ts`:**
```typescript
// När dokumentation genereras, spara även given/when/then
async function saveGivenWhenThen(
  bpmnFile: string,
  elementId: string,
  givenWhenThen: GivenWhenThen,
  provider: ScenarioProvider,
  origin: 'llm-doc' | 'design' | 'spec-parsed',
): Promise<void> {
  // Spara i node_planned_scenarios eller ny tabell
}
```

#### 3.2 Ladda given/when/then

**Utöka `fetchPlannedScenarios()`:**
```typescript
// src/lib/testDataHelpers.ts
export async function fetchPlannedScenarios(
  bpmnFile: string,
  elementId: string,
  preferredProvider?: ScenarioProvider,
): Promise<TestScenarioData | null> {
  // ✅ Lägg till given/when/then i response
  // ✅ Ladda från databasen
  // ✅ Fallback till generering om saknas
}
```

### Prioritet 4: UI-Integration

#### 4.1 TestCoverageExplorerPage

**Uppdatera för att ladda från databas:**
```typescript
// src/pages/TestCoverageExplorerPage.tsx
const { data: givenWhenThen } = useQuery({
  queryKey: ['given-when-then', bpmnFile, elementId],
  queryFn: () => fetchGivenWhenThen(bpmnFile, elementId),
});
```

#### 4.2 TestCoverageTable

**Uppdatera för att använda databas-data:**
- Ladda given/when/then från databas istället för hårdkodade scenarion
- Fallback till hårdkodade scenarion om databasen är tom
- Visa provider/origin för given/when/then

### Prioritet 5: Återskapande av Sidan

#### 5.1 Dynamisk Generering

**När sidan laddas:**
1. Ladda given/when/then från databasen
2. Om saknas → generera från BPMN/LLM
3. Spara i databasen
4. Visa i tabellen

**Ny hook:**
```typescript
// src/hooks/useGivenWhenThen.ts
export function useGivenWhenThen(
  bpmnFile: string,
  elementId: string,
  scenarioId?: string,
) {
  // Ladda från databas
  // Generera om saknas
  // Returnera given/when/then
}
```

---

## 📋 Implementeringsplan

### Fas 1: Databas-struktur (1-2 dagar)
- [ ] Utöka `node_planned_scenarios` med `given_when_then` JSONB-fält
- [ ] Skapa migration
- [ ] Uppdatera TypeScript-typer

### Fas 2: Generering med Claude (2-3 dagar)
- [ ] Skapa `prompts/llm/given_when_then_prompt.md` med instruktioner för Claude
  - [ ] Följ struktur från `feature_epic_prompt.md` och `testscript_prompt.md`
  - [ ] Inkludera exempel på bra given/when/then för svenska kreditprocesser
  - [ ] Specificera JSON-format: `{ given, when, then }`
  - [ ] Inkludera instruktioner om att använda BPMN-kontext och dokumentation
- [ ] Implementera `generateGivenWhenThenWithLlm()` funktion
  - [ ] Skapa i `src/lib/llmDocumentation.ts` eller `src/lib/llmTests.ts`
  - [ ] Ladda prompt från fil
  - [ ] Bygg kontext från `NodeDocumentationContext`
  - [ ] Stöd för valfri `documentationSummary` som kontext
  - [ ] Anropa Claude med prompt och kontext
  - [ ] Parse JSON-response (given, when, then)
  - [ ] Validera response
  - [ ] Error handling och fallback
- [ ] Implementera `generateGivenWhenThenFromBpmn()` (fallback utan LLM)
  - [ ] Generera enkla given/when/then från BPMN-nodnamn
  - [ ] Använd Feature Goal/Epic-beskrivningar om tillgängliga
  - [ ] Skapa generiska test-scenarion
- [ ] Integrera i `generateAllFromBpmnWithGraph()` (valfritt)
  - [ ] Lägg till parameter för att generera testinformation
  - [ ] Anropa `generateGivenWhenThenWithLlm()` för varje nod om flaggan är satt
  - [ ] Spara given/when/then i databasen
- [ ] Skapa separat funktion för batch-generering av testinformation
  - [ ] `generateGivenWhenThenForAllNodes()` - generera för alla noder
  - [ ] Kan anropas från UI eller script
- [ ] Testa generering med Claude för olika nodtyper
  - [ ] Feature Goals (CallActivities)
  - [ ] Epics (UserTasks, ServiceTasks)
  - [ ] Business Rules (BusinessRuleTasks)

### Fas 3: Lagring och Hämtning (1-2 dagar)
- [ ] Implementera `saveGivenWhenThen()`
- [ ] Utöka `fetchPlannedScenarios()` med given/when/then
- [ ] Skapa `fetchGivenWhenThen()`-funktion
- [ ] Testa databas-integration

### Fas 4: UI-Integration (2-3 dagar)
- [ ] Skapa `useGivenWhenThen()`-hook
  - [ ] Ladda given/when/then från databasen
  - [ ] Stöd för provider-prioritering (cloud > chatgpt > local-fallback > ollama)
  - [ ] Cache och refresh-mekanism
- [ ] Uppdatera `TestCoverageExplorerPage` för att ladda från databas
  - [ ] Använd `useGivenWhenThen()`-hook
  - [ ] Visa loading-state medan data laddas
  - [ ] Hantera saknad data (visa meddelande eller generera)
- [ ] Uppdatera `TestCoverageTable` för att använda databas-data
  - [ ] Ladda given/when/then från databas istället för hårdkodade scenarion
  - [ ] Fallback till hårdkodade scenarion om databasen är tom
  - [ ] Visa provider/origin för given/when/then
- [ ] Lägg till knapp/funktion för att generera testinformation
  - [ ] "Generera testinformation" knapp i UI
  - [ ] Anropa `generateGivenWhenThenWithLlm()` för valda noder
  - [ ] Visa progress och resultat
- [ ] Lägg till batch-generering i UI
  - [ ] "Generera testinformation för alla noder" funktion
  - [ ] Progress-indikator för batch-generering

### Fas 5: Återskapande och Batch-generering (1-2 dagar)
- [ ] Implementera dynamisk generering när sidan laddas (valfritt)
  - [ ] Om given/when/then saknas i databasen → generera automatiskt
  - [ ] Visa loading-state medan generering pågår
  - [ ] Spara resultatet i databasen
- [ ] Cache/refresh-mekanism
  - [ ] Cache given/when/then i React Query
  - [ ] Invalidera cache när ny data genereras
  - [ ] Refresh-funktion för att uppdatera data
- [ ] Error handling och fallback
  - [ ] Hantera LLM-fel gracefully
  - [ ] Fallback till `generateGivenWhenThenFromBpmn()` om LLM misslyckas
  - [ ] Fallback till hårdkodade scenarion om allt misslyckas
  - [ ] Visa tydliga felmeddelanden i UI
- [ ] Batch-generering script/funktion
  - [ ] Skapa script för att generera testinformation för alla noder
  - [ ] Kan köras från kommandorad eller UI
  - [ ] Progress-tracking och error reporting

---

## 🎯 Success Metrics

### Kvalitet
- ✅ Given/when/then genereras automatiskt från BPMN/LLM
- ✅ Given/when/then sparas i databasen
- ✅ Given/when/then kan återskapas när sidan laddas
- ✅ Integration med dokumentationsgenerering fungerar

### Prestanda
- ✅ Sidan laddar given/when/then snabbt (< 1 sekund)
- ✅ Generering tar < 5 sekunder per nod (med LLM)
- ✅ Fallback-generering tar < 100ms per nod

### Användbarhet
- ✅ Användare kan se given/when/then direkt när sidan laddas
- ✅ Given/when/then uppdateras automatiskt när BPMN ändras
- ✅ Provider/origin visas tydligt i UI

---

## 🔍 Ytterligare Överväganden

### 1. **Subprocess-nivå vs Nod-nivå**

**Nuvarande:**
- Given/when/then finns på både scenarionivå och subprocessStep-nivå
- SubprocessStep-nivå används i `TestCoverageTable`
- **Manuellt skapade** given/when/then för subprocesser i hårdkodade scenarion

**Fråga:**
- Ska Claude generera given/when/then per subprocess eller per individuell nod?
- Hur hanterar vi hierarkiska strukturer?

**Rekommendation:**
- Generera på **subprocess-nivå** (callActivity) först:
  - **Subprocess-nivå:** För varje callActivity/subprocess (används i `TestCoverageTable`)
  - Detta matchar nuvarande användning och är mest relevant för E2E-testning
- **Scenarionivå:** Kan genereras separat för hela E2E-scenariot (valfritt)
- **Nod-nivå:** För individuella noder (lägre prioritet, kan läggas till senare)

### 2. **Prompt-design**

**Viktiga överväganden:**
- Claude behöver **tydlig kontext** om BPMN-strukturen
- Använd **Feature Goal/Epic-beskrivningar** som input
- Inkludera **hierarki-information** (vilka noder kommer före/efter)
- Ge **exempel** på bra given/when/then för svenska kreditprocesser
- Specificera **format** (JSON med given/when/then fält)

**Inspiration:**
- Använd samma struktur som `testscript_prompt.md`
- Följ samma stil som `feature_epic_prompt.md`
- Inkludera exempel på svenska kreditprocesser

### 2. **Versionering**

**Fråga:**
- Ska given/when/then versioneras tillsammans med BPMN-versioner?
- Hur hanterar vi ändringar i given/when/then över tid?

**Rekommendation:**
- Använd samma versionering som dokumentation
- Spara `bpmn_file_version` tillsammans med given/when/then
- Tillåt flera versioner i databasen

### 3. **Provider-prioritering**

**Nuvarande:**
- Prioritering: cloud > chatgpt > local-fallback > ollama

**Fråga:**
- Ska given/when/then följa samma prioritering?
- Hur hanterar vi konflikter mellan providers?

**Rekommendation:**
- Följ samma prioritering som för scenarion
- Tillåt användare att välja provider i UI
- Visa alla providers med tydlig markering

---

## 📚 Relaterade Dokument

- [`docs/testing/TEST_SCENARIOS.md`](../testing/TEST_SCENARIOS.md) - Test-scenarion och design-scenarion
- [`docs/testing/TEST_SCENARIO_GENERATION.md`](../testing/TEST_SCENARIO_GENERATION.md) - Testscenarion: Generering från BPMN-filer
- [`docs/testing/test-report-views.md`](../testing/test-report-views.md) - Test report-vyer
- [`docs/architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](../architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md) - Funktionalitetsöversikt

---

## 🔗 Kodexempel

### Nuvarande Användning

```typescript
// src/components/TestCoverageTable.tsx
const testInfo = findTestInfoForCallActivity(callActivityId, scenarios);
if (testInfo.subprocessStep.given) {
  // Visa given
}
if (testInfo.subprocessStep.when) {
  // Visa when
}
if (testInfo.subprocessStep.then) {
  // Visa then
}
```

### Efter Implementering

```typescript
// src/pages/TestCoverageExplorerPage.tsx
const { data: givenWhenThen } = useGivenWhenThen(bpmnFile, elementId, scenarioId);

// src/components/TestCoverageTable.tsx
if (givenWhenThen?.given) {
  // Visa given från databas
}
```

---

## ✅ Nästa Steg

1. **Granska denna analys** med teamet
2. **Besluta om databas-struktur** (Alternativ A eller B)
3. **Skapa prompt för given/when/then** (`prompts/llm/given_when_then_prompt.md`)
   - Använd befintliga prompts som inspiration
   - Inkludera exempel på bra given/when/then
   - Specificera JSON-format
4. **Prioritera implementering** (börja med Fas 1)
5. **Skapa tickets** för varje fas
6. **Börja implementering** när godkänt

## 📝 Viktiga Noteringar

### Från Manuellt till Automatiskt

**Tidigare:**
- Given/when/then skapades manuellt med AI-assistans i chatten
- Hårdkodade i `E2eTestsOverviewPage.tsx`
- Statiska och svåra att underhålla
- Måste genereras tillsammans med dokumentation

**Mål:**
- Claude genererar given/when/then automatiskt från BPMN-struktur
- **Separat från dokumentationsgenerering** - kan genereras oberoende
- Sparas i databasen för persistent lagring
- Kan återskapas när sidan laddas eller på begäran
- Uppdateras automatiskt när BPMN ändras
- Kan genereras i batch för alla noder

**Fördelar:**
- ✅ Konsistent kvalitet
- ✅ Automatisk uppdatering vid BPMN-ändringar
- ✅ Mindre manuellt arbete
- ✅ Bättre skalbarhet
- ✅ **Flexibelt** - kan generera testinformation när det behövs, oberoende av dokumentation
- ✅ **Separat prompt** - kan optimeras specifikt för testinformation



