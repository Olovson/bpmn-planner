# Analys: Testinformation-generering

## 📋 Nuvarande Situation

### Vad vi har

#### 1. Dokumentationsgenerering (Claude)
- **Plats:** `src/lib/bpmnGenerators.ts`
- **Funktion:** `renderDocWithLlm()` genererar dokumentation för:
  - Epics (med user stories)
  - Feature Goals (call activities)
  - Business Rules
- **Output:** HTML-dokumentation sparas i Storage
- **Scenarios i dokumentation:** Epics innehåller user stories som kan konverteras till testscenarios

#### 2. Testinformation-generering (Separat system)
- **Plats:** `src/lib/testGenerators.ts` + `src/lib/llmTests.ts`
- **Funktion:** `generateTestsForFile()` genererar testfiler separat från dokumentation
- **Process:**
  1. Parsar BPMN-fil
  2. Bygger graf och hittar testbara noder
  3. Genererar testscenarios med LLM (`generateTestSpecWithLlm()`)
  4. Skapar testfiler (`generateTestSkeleton()`)
  5. Sparar testfiler i Storage
  6. Skapar länkar i `node_test_links` tabell
- **Output:** Testfiler i Storage + länkar i databas

#### 3. Planned Scenarios (Database)
- **Plats:** `src/lib/plannedScenariosHelper.ts`
- **Tabell:** `node_planned_scenarios`
- **Syfte:** Spara planerade testscenarios för noder
- **Origin-typer:**
  - `design` - från testMapping (legacy)
  - `llm-doc` - från dokumentation (INTE IMPLEMENTERAT)
  - `spec-parsed` - från BPMN-specifikationer

#### 4. Test Mapping (Legacy)
- **Plats:** `src/data/testMapping.ts`
- **Syfte:** Statiska testscenarios för specifika noder
- **Användning:** Används som fallback när LLM inte genererar scenarios

### Vad som INTE fungerar

#### 1. Scenarios från dokumentationen sparas inte
- **Problem:** `buildScenariosFromEpicUserStories()` och `buildScenariosFromDocJson()` finns men anropas ALDRIG
- **Plats:** `src/lib/bpmnGenerators.ts` (rad 856-926)
- **Påverkan:** Epic user stories genereras i dokumentationen, men scenarios extraheras inte och sparas inte till `node_planned_scenarios`
- **Kommentar i kod:** "OBS: Testscenarion (scenarios) genereras inte längre i dokumentationssteget." (rad 2351-2352)

#### 2. `createPlannedScenariosFromGraph()` returnerar tom array (KRITISK BUGG)
- **Problem:** Funktionen skapar `scenarios` array (rad 129-144) men pushar dem ALDRIG till `rows` array
- **Plats:** `src/lib/plannedScenariosHelper.ts` (rad 96-151)
- **Påverkan:** Inga fallback-scenarios sparas från `testMapping`, `savePlannedScenarios()` får tom array
- **Kod:**
  ```typescript
  // Scenarios skapas men pushas aldrig:
  let scenarios: TestScenario[] = [];
  if (template && template.scenarios && template.scenarios.length > 0) {
    scenarios = template.scenarios;
  } else {
    scenarios = [{ id: `${nodeId}-auto`, ... }];
  }
  // HÄR SKA DET VARA: rows.push({ bpmn_file, bpmn_element_id, provider, origin, scenarios });
  // Men det finns inte!
  ```

#### 3. Två separata system som inte samverkar
- **Problem:** Testfiler (Storage) och planned scenarios (Database) är helt separata
- **Påverkan:**
  - LLM-genererade scenarios i testfiler sparas inte i `node_planned_scenarios`
  - Scenarios från dokumentationen sparas inte alls
  - Ingen koppling mellan dokumentation, planned scenarios och faktiska testfiler

#### 4. Duplicerad logik
- **Problem:** Testgenerering görs två gånger:
  1. I dokumentationssteget (för scenarios i dokumentationen) - men sparas inte
  2. I separat testgenereringssteg (för faktiska testfiler)
- **Påverkan:** Dubbelt arbete, inkonsistent data

---

## 🎯 Vad vi BORDE ha

### Vision: Enhetligt system för testinformation

#### 1. En källa av sanning: `node_planned_scenarios`
- **Syfte:** Central databas för ALLA testscenarios
- **Källor:**
  - `llm-doc` - Scenarios extraherade från dokumentation (Epic user stories)
  - `llm-test` - Scenarios genererade direkt via testgenerering
  - `design` - Manuellt skapade scenarios (testMapping)
  - `spec-parsed` - Scenarios från BPMN-specifikationer

#### 2. Integrerad generering
- **När dokumentation genereras:**
  1. Generera dokumentation med Claude
  2. Extrahera scenarios från dokumentation (`buildScenariosFromDocJson()`)
  3. Spara till `node_planned_scenarios` med `origin: 'llm-doc'`
  
- **När testfiler genereras:**
  1. Hämta scenarios från `node_planned_scenarios` (prioritera `llm-doc` > `llm-test` > `design`)
  2. Om inga scenarios finns, generera med LLM
  3. Spara nya scenarios till `node_planned_scenarios` med `origin: 'llm-test'`
  4. Generera testfiler baserat på scenarios
  5. Spara testfiler i Storage

#### 3. Konsistent dataflöde
```
Dokumentation (Claude)
  ↓
Extrahera scenarios (buildScenariosFromDocJson)
  ↓
Spara till node_planned_scenarios (origin: 'llm-doc')
  ↓
Testgenerering använder scenarios från node_planned_scenarios
  ↓
Generera testfiler baserat på scenarios
  ↓
Spara testfiler i Storage
```

---

## 🔧 Vad vi BORDE göra

### Prioritet 1: Fixa kritiska buggar

#### 1. Fixa `createPlannedScenariosFromGraph()`
- **Problem:** Scenarios pushas aldrig till `rows`
- **Lösning:** Lägg till `rows.push()` efter rad 144
- **Kod:**
  ```typescript
  // Efter rad 144:
  rows.push({
    bpmn_file: node.bpmnFile,
    bpmn_element_id: node.bpmnElementId,
    provider: 'claude', // eller 'chatgpt' / 'ollama' baserat på kontext
    origin: 'design',
    scenarios: scenarios,
  });
  ```

#### 2. Spara scenarios från dokumentationen
- **Problem:** `buildScenariosFromDocJson()` anropas aldrig
- **Lösning:** Anropa i `renderDocWithLlm()` callback för epics
- **Plats:** `src/lib/bpmnGenerators.ts` (rad ~2316-2353)
- **Kod:**
  ```typescript
  async (provider, fallbackUsed, docJson) => {
    // ... existing code ...
    
    // Extrahera och spara scenarios från dokumentationen
    if (docJson && node.type === 'epic') {
      const scenarios = buildScenariosFromDocJson('epic', docJson);
      if (scenarios.length > 0) {
        const scenarioProvider = mapProviderToScenarioProvider(provider, fallbackUsed);
        await savePlannedScenarios([{
          bpmn_file: node.bpmnFile,
          bpmn_element_id: node.bpmnElementId,
          provider: scenarioProvider,
          origin: 'llm-doc',
          scenarios: scenarios,
        }], 'epic-documentation');
      }
    }
  }
  ```

### Prioritet 2: Integrera systemen

#### 3. Använd `node_planned_scenarios` i testgenerering
- **Problem:** Testgenerering genererar scenarios från scratch varje gång
- **Lösning:** Hämta scenarios från `node_planned_scenarios` först, generera bara om inga finns
- **Plats:** `src/lib/testGenerators.ts` (rad ~106-126)
- **Kod:**
  ```typescript
  // Hämta scenarios från node_planned_scenarios
  const { data: plannedScenarios } = await supabase
    .from('node_planned_scenarios')
    .select('scenarios, origin')
    .eq('bpmn_file', bpmnFileName)
    .eq('bpmn_element_id', element.id)
    .eq('provider', llmProvider || 'claude')
    .order('origin', { ascending: false }) // Prioritize llm-doc > llm-test > design
    .limit(1)
    .single();
  
  let llmScenarios = plannedScenarios?.scenarios || null;
  
  // Om inga scenarios finns, generera med LLM
  if (!llmScenarios && isLlmEnabled() && llmProvider) {
    const scenarios = await generateTestSpecWithLlm(...);
    // Spara till node_planned_scenarios
    await savePlannedScenarios([{
      bpmn_file: bpmnFileName,
      bpmn_element_id: element.id,
      provider: llmProvider,
      origin: 'llm-test',
      scenarios: scenarios,
    }], 'test-generation');
    llmScenarios = scenarios;
  }
  ```

#### 4. Ta bort duplicerad logik
- **Problem:** Scenarios genereras både i dokumentation och testgenerering
- **Lösning:** 
  - Ta bort scenario-generering från dokumentationssteget (redan gjort, men spara dem!)
  - Använd endast `node_planned_scenarios` som källa

### Prioritet 3: Förbättringar

#### 5. Prioritering av scenarios
- **Logik:** `llm-doc` > `llm-test` > `design` > `spec-parsed`
- **Anledning:** Dokumentation är mer komplett och kontextuell

#### 6. Uppdatering av scenarios
- **När dokumentation regenereras:** Uppdatera scenarios i `node_planned_scenarios`
- **När testfiler regenereras:** Behåll befintliga scenarios om de finns

#### 7. UI-integration
- **Visa scenarios från `node_planned_scenarios` i UI**
- **Låt användare se vilken origin varje scenario har**
- **Låt användare manuellt redigera scenarios**

---

## 🗑️ Vad vi BORDE ta bort eller förändra

### Ta bort

#### 1. Legacy testMapping som primär källa
- **Behåll:** Som fallback när inga andra scenarios finns
- **Ta bort:** Som primär källa för scenarios
- **Anledning:** Statisk data är inte lika bra som LLM-genererad

#### 2. Duplicerad scenario-generering
- **Ta bort:** Scenario-generering i dokumentationssteget (redan gjort)
- **Behåll:** Extraktion och sparande av scenarios från dokumentationen

### Förändra

#### 1. `createPlannedScenariosFromGraph()` - Fixa buggen
- **Förändra:** Lägg till `rows.push()` för att faktiskt spara scenarios
- **Behåll:** Funktionen som fallback-mekanism

#### 2. Testgenerering - Använd planned scenarios
- **Förändra:** Hämta scenarios från `node_planned_scenarios` istället för att alltid generera nya
- **Behåll:** LLM-generering som fallback när inga scenarios finns

#### 3. `node_test_links` - Koppla till planned scenarios
- **Förändra:** Lägg till referens till `node_planned_scenarios` i `node_test_links`
- **Anledning:** Koppla faktiska testfiler till planerade scenarios

---

## 📊 Sammanfattning

### Nuvarande problem
1. ❌ Scenarios från dokumentationen sparas inte
2. ❌ `createPlannedScenariosFromGraph()` returnerar tom array (bugg)
3. ❌ Två separata system som inte samverkar
4. ❌ Duplicerad logik och inkonsistent data

### Önskat tillstånd
1. ✅ Enhetligt system med `node_planned_scenarios` som källa
2. ✅ Scenarios extraheras från dokumentation och sparas
3. ✅ Testgenerering använder scenarios från databas
4. ✅ Konsistent dataflöde: Dokumentation → Scenarios → Testfiler

### Åtgärder
1. **Fix:** `createPlannedScenariosFromGraph()` bugg
2. **Implementera:** Spara scenarios från dokumentationen
3. **Integrera:** Använd `node_planned_scenarios` i testgenerering
4. **Förenkla:** Ta bort duplicerad logik

---

**Datum:** 2025-12-22
**Status:** Analys klar, väntar på implementering



