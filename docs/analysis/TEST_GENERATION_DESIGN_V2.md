# Design v2: Testfall-generering SEPARERAD från dokumentationsgenerering

## 🎯 Syfte

Designa en lösning för att generera testfall baserat på:
1. **User stories med acceptanskriterier** (från BEFINTLIG Epic/Feature Goal dokumentation)
2. **BPMN-processflöde** (sequence flows, nodtyper, error events)

**VIKTIGT:** 
- ✅ **Separerad från dokumentationsgenerering** - ingen risk att förstöra befintlig dokumentation
- ✅ **Kan köras på befintlig dokumentation** - behöver inte generera om dokumentation
- ✅ **Inga ändringar i befintlig kod** - helt ny funktionalitet

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
│         SEPARAT: User Story Extractor                        │
│  - Läser från befintlig dokumentation                        │
│  - Extraherar user stories                                   │
│  - Kopplar till BPMN-noder                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SEPARAT: User Story → Test Scenario Converter         │
│  - Konverterar user stories till testfall                   │
│  - Bestämmer typ (happy-path/edge-case/error-case)          │
│  - Skapar Given/When/Then format                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BPMN Process Graph                        │
│  (Sequence flows, nodtyper, error events)                   │
│  - Byggs från BPMN-filer (separat från dokumentation)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SEPARAT: Process Flow Test Generator                  │
│  - Genererar happy path-scenarios                           │
│  - Genererar error path-scenarios                           │
│  - Skapar steg-för-steg testfall                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SEPARAT: Test Scenario Aggregator                │
│  - Kombinerar user story-scenarios                          │
│  - Kombinerar process flow-scenarios                        │
│  - Deduplicerar och prioriterar                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           node_planned_scenarios (Database)                   │
│  - Sparar scenarios med origin: 'llm-doc'                    │
│  - Sparar scenarios med origin: 'spec-parsed'               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Separata processer

### Process 1: Extrahera user stories från befintlig dokumentation

**Trigger:** Manuell via UI eller kommando

**Steg:**
1. Läs befintlig dokumentation från Supabase Storage eller HTML-filer
2. Extrahera user stories från dokumentationen
3. Koppla user stories till BPMN-noder
4. Konvertera till testfall
5. Spara till `node_planned_scenarios`

**Inga ändringar i:**
- ❌ `bpmnGenerators.ts` (dokumentationsgenerering)
- ❌ `documentationTemplates.ts` (dokumentationsrendering)
- ❌ Befintlig dokumentation

---

### Process 2: Generera testfall från BPMN-processflöde

**Trigger:** Manuell via UI eller kommando

**Steg:**
1. Läs BPMN-filer (separat från dokumentation)
2. Bygg processgraf
3. Generera process flow-scenarios
4. Spara till `node_planned_scenarios`

**Inga ändringar i:**
- ❌ `bpmnGenerators.ts` (dokumentationsgenerering)
- ❌ Befintlig dokumentation

---

## 📊 Datastrukturer

(Samma som i v1, men med tydlig separation)

### 1. ExtractedUserStory

```typescript
export interface ExtractedUserStory {
  // User story data
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare';
  goal: string;
  value: string;
  acceptanceCriteria: string[];
  
  // Koppling till BPMN
  bpmnFile: string;
  bpmnElementId: string;
  
  // Koppling till dokumentation (för spårbarhet)
  docType: 'epic' | 'feature-goal';
  docSource: 'storage' | 'html-file'; // Var dokumentationen läses från
  docPath?: string; // Sökväg till dokumentationen
  
  // Metadata
  extractedAt: Date;
  source: 'epic-doc' | 'feature-goal-doc';
}
```

---

### 2. UserStoryTestScenario

(Samma som i v1)

---

### 3. ProcessFlowTestScenario

(Samma som i v1)

---

## 🔌 Integration med befintligt system

### Integration 1: Läsning av befintlig dokumentation

**Ny fil:** `src/lib/testGeneration/userStoryExtractor.ts`

```typescript
/**
 * Extraherar user stories från BEFINTLIG dokumentation
 * Läser från Supabase Storage eller HTML-filer
 */
export async function extractUserStoriesFromExistingDocs(
  bpmnFile: string,
  elementId: string
): Promise<ExtractedUserStory[]> {
  // 1. Försök läsa från Supabase Storage
  const storageDoc = await loadDocFromStorage(bpmnFile, elementId);
  if (storageDoc) {
    return extractUserStoriesFromHtml(storageDoc, bpmnFile, elementId);
  }
  
  // 2. Fallback: Läs från HTML-filer
  const htmlDoc = await loadDocFromHtmlFiles(bpmnFile, elementId);
  if (htmlDoc) {
    return extractUserStoriesFromHtml(htmlDoc, bpmnFile, elementId);
  }
  
  // 3. Inga user stories hittades
  return [];
}

/**
 * Läser dokumentation från Supabase Storage
 */
async function loadDocFromStorage(
  bpmnFile: string,
  elementId: string
): Promise<string | null> {
  try {
    const docKey = getFeatureGoalDocFileKey(bpmnFile, elementId);
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(docKey);
    
    if (error || !data) return null;
    
    return await data.text();
  } catch (error) {
    console.warn(`Failed to load doc from storage for ${bpmnFile}::${elementId}:`, error);
    return null;
  }
}

/**
 * Läser dokumentation från HTML-filer (fallback)
 */
async function loadDocFromHtmlFiles(
  bpmnFile: string,
  elementId: string
): Promise<string | null> {
  // Implementera läsning från public/local-content/feature-goals/
  // eller dist/local-content/feature-goals/
  // ...
}
```

**Designbeslut:**
- ✅ Läser från befintlig dokumentation, skriver inte över
- ✅ Stöd både Supabase Storage och HTML-filer
- ✅ Graceful fallback om dokumentation inte finns

---

### Integration 2: Separata UI-komponenter

**Ny fil:** `src/pages/TestGenerationPage.tsx`

```typescript
/**
 * Separerad sida för testfall-generering
 * Inte kopplad till dokumentationsgenerering
 */
export function TestGenerationPage() {
  const [status, setStatus] = useState<'idle' | 'extracting' | 'generating' | 'complete'>('idle');
  const [results, setResults] = useState<TestGenerationResults | null>(null);
  
  const handleExtractUserStories = async () => {
    setStatus('extracting');
    try {
      const userStories = await extractUserStoriesFromAllDocs();
      const scenarios = await convertUserStoriesToTestScenarios(userStories);
      await saveUserStoryScenarios(scenarios);
      setResults({ userStoryScenarios: scenarios.length });
      setStatus('complete');
    } catch (error) {
      console.error('Failed to extract user stories:', error);
      setStatus('idle');
    }
  };
  
  const handleGenerateProcessFlowScenarios = async () => {
    setStatus('generating');
    try {
      const scenarios = await generateProcessFlowScenariosForAllFiles();
      await saveProcessFlowScenarios(scenarios);
      setResults({ processFlowScenarios: scenarios.length });
      setStatus('complete');
    } catch (error) {
      console.error('Failed to generate process flow scenarios:', error);
      setStatus('idle');
    }
  };
  
  return (
    <div>
      <h1>Testfall-generering</h1>
      <p>Generera testfall från befintlig dokumentation och BPMN-processflöde</p>
      
      <div>
        <button onClick={handleExtractUserStories}>
          Extrahera user stories från dokumentation
        </button>
        <button onClick={handleGenerateProcessFlowScenarios}>
          Generera process flow-scenarios
        </button>
      </div>
      
      {results && (
        <div>
          <p>User story-scenarios: {results.userStoryScenarios}</p>
          <p>Process flow-scenarios: {results.processFlowScenarios}</p>
        </div>
      )}
    </div>
  );
}
```

**Designbeslut:**
- ✅ Separerad sida, inte kopplad till dokumentationsgenerering
- ✅ Manuell trigger, användaren väljer när
- ✅ Visar resultat och status

---

### Integration 3: Separata funktioner

**Ny fil:** `src/lib/testGeneration/testScenarioGenerator.ts`

```typescript
/**
 * Huvudfunktion för testfall-generering
 * SEPARERAD från dokumentationsgenerering
 */
export async function generateTestScenariosFromExistingDocs(
  options: {
    bpmnFiles?: string[]; // Om tom, processar alla
    extractUserStories?: boolean;
    generateProcessFlow?: boolean;
  } = {}
): Promise<TestGenerationResults> {
  const results: TestGenerationResults = {
    userStoryScenarios: [],
    processFlowScenarios: [],
    errors: [],
  };
  
  // 1. Extrahera user stories från befintlig dokumentation
  if (options.extractUserStories !== false) {
    try {
      const userStories = await extractUserStoriesFromAllDocs(options.bpmnFiles);
      const scenarios = await convertUserStoriesToTestScenarios(userStories);
      await saveUserStoryScenarios(scenarios);
      results.userStoryScenarios = scenarios;
    } catch (error) {
      results.errors.push({
        type: 'user-story-extraction',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // 2. Generera process flow-scenarios
  if (options.generateProcessFlow !== false) {
    try {
      const scenarios = await generateProcessFlowScenariosForAllFiles(options.bpmnFiles);
      await saveProcessFlowScenarios(scenarios);
      results.processFlowScenarios = scenarios;
    } catch (error) {
      results.errors.push({
        type: 'process-flow-generation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  return results;
}
```

**Designbeslut:**
- ✅ Separerad funktion, inte kopplad till dokumentationsgenerering
- ✅ Kan köras oberoende
- ✅ Fel hanteras gracefully

---

## 🎨 Designbeslut

### Beslut 1: Separerad från dokumentationsgenerering

**Val:** Helt separerad process
- ✅ Ingen risk att förstöra befintlig dokumentation
- ✅ Kan köras på befintlig dokumentation
- ✅ Inga ändringar i befintlig kod

---

### Beslut 2: Läsning av befintlig dokumentation

**Val:** Läs från Supabase Storage eller HTML-filer
- ✅ Stöd både Storage och HTML-filer
- ✅ Graceful fallback
- ✅ Ingen skrivning till dokumentation

---

### Beslut 3: UI-integration

**Val:** Separerad sida för testfall-generering
- ✅ Tydlig separation från dokumentationsgenerering
- ✅ Manuell trigger
- ✅ Visar status och resultat

---

### Beslut 4: När ska testfall genereras?

**Val:** Manuell trigger via UI eller kommando
- ✅ Användaren väljer när
- ✅ Kan köras flera gånger (upsert i databasen)
- ✅ Ingen automatisk generering

---

### Beslut 5: Var sparas testfall?

**Val:** Endast i `node_planned_scenarios`
- ✅ Använd `upsert` för att inte skriva över befintliga
- ✅ `origin: 'llm-doc'` för user story-scenarios
- ✅ `origin: 'spec-parsed'` för process flow-scenarios

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

## 📋 Filstruktur

### Nya filer (separerade):

```
src/lib/testGeneration/
  ├── userStoryExtractor.ts          # Extraherar user stories från befintlig dokumentation
  ├── userStoryToTestScenario.ts     # Konverterar user stories till testfall
  ├── bpmnProcessFlowTestGenerator.ts # Genererar testfall från BPMN-processflöde
  ├── testScenarioAggregator.ts      # Aggregerar och deduplicerar scenarios
  └── testScenarioGenerator.ts       # Huvudfunktion för testfall-generering

src/pages/
  └── TestGenerationPage.tsx         # Separerad sida för testfall-generering

src/components/
  └── TestGenerationControls.tsx    # UI-komponenter för testfall-generering
```

### Inga ändringar i:

- ❌ `src/lib/bpmnGenerators.ts`
- ❌ `src/lib/documentationTemplates.ts`
- ❌ `src/lib/testGenerators.ts`
- ❌ `src/lib/llmTests.ts`
- ❌ Befintlig dokumentation

---

## 🔄 Dataflöden

### Flöde 1: Extrahera user stories från befintlig dokumentation

```
1. Användaren triggar "Extrahera user stories"
   ↓
2. Läser befintlig dokumentation från Storage/HTML
   ↓
3. Extraherar user stories från dokumentationen
   ↓
4. Kopplar user stories till BPMN-noder
   ↓
5. Konverterar till testfall
   ↓
6. Sparar till node_planned_scenarios (upsert)
```

**Designbeslut:**
- Manuell trigger
- Läser från befintlig dokumentation
- Upsert i databasen (inte skriver över)

---

### Flöde 2: Generera process flow-scenarios

```
1. Användaren triggar "Generera process flow-scenarios"
   ↓
2. Läser BPMN-filer (separat från dokumentation)
   ↓
3. Bygger processgraf
   ↓
4. Genererar process flow-scenarios
   ↓
5. Sparar till node_planned_scenarios (upsert)
```

**Designbeslut:**
- Manuell trigger
- Läser från BPMN-filer (inte dokumentation)
- Upsert i databasen

---

## 🎯 Skillnader från v1

### Skillnad 1: Separerad från dokumentationsgenerering
**v1:** Integrerad med dokumentationsgenerering
**v2:** Helt separerad process

**Varför:** Användaren vill inte riskera att förstöra befintlig dokumentation

---

### Skillnad 2: Läsning av befintlig dokumentation
**v1:** Extraherar under dokumentationsgenerering
**v2:** Läser från befintlig dokumentation (Storage/HTML)

**Varför:** Kan köras på befintlig dokumentation utan att generera om

---

### Skillnad 3: Manuell trigger
**v1:** Automatisk under dokumentationsgenerering
**v2:** Manuell trigger via UI

**Varför:** Användaren väljer när testfall ska genereras

---

### Skillnad 4: Separerad UI
**v1:** Integrerad i dokumentationsgenerering
**v2:** Separerad sida för testfall-generering

**Varför:** Tydlig separation, ingen risk att förstöra befintlig funktionalitet

---

## 📋 Sammanfattning

### Designprinciper:

1. **Helt separerad** - Ingen koppling till dokumentationsgenerering
2. **Läser från befintlig dokumentation** - Ingen skrivning till dokumentation
3. **Manuell trigger** - Användaren väljer när
4. **Graceful degradation** - Fel hanteras gracefully
5. **Inga ändringar i befintlig kod** - Helt ny funktionalitet

### Datastrukturer:

(Samma som v1, men med tydlig separation)

### Integration:

1. **Läsning av befintlig dokumentation** - Från Storage eller HTML-filer
2. **Separerad UI** - Ny sida för testfall-generering
3. **Separerade funktioner** - Ny mapp `testGeneration/`

---

**Datum:** 2025-12-22
**Status:** Design v2 klar - Separerad från dokumentationsgenerering


