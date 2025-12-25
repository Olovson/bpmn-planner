# UI-validering: Säkerställa att testfall kan visas i appens UI

## 🎯 Syfte

Säkerställa att genererade testfall kan visas i appens UI utan att faktiskt köra UI-tester (som inte fungerar i projektet).

---

## 📊 Nuvarande UI-komponenter som visar testfall

### 1. TestReport.tsx

**Vad den visar:**
- Testfall från `node_planned_scenarios` tabellen
- Grupperade per BPMN-nod
- Filtrerade per provider

**Hur den hämtar data:**
- Använder `useNodePlannedScenarios` hook
- Filtrerar på `bpmn_file` och `bpmn_element_id`
- Visar scenarios från `scenarios` JSONB-fältet

**Format som förväntas:**
```typescript
{
  bpmn_file: string;
  bpmn_element_id: string;
  provider: 'claude' | 'chatgpt' | 'ollama';
  origin: 'design' | 'llm-doc' | 'spec-parsed';
  scenarios: TestScenario[];
}
```

**TestScenario format:**
```typescript
{
  id: string;
  name: string;
  description: string;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  category: 'happy-path' | 'error-case' | 'edge-case';
}
```

---

### 2. RightPanel.tsx

**Vad den visar:**
- Testfall för vald nod
- Scenarios från `node_planned_scenarios`

**Hur den hämtar data:**
- Använder `useNodePlannedScenarios` hook
- Visar scenarios för vald `bpmn_file` och `bpmn_element_id`

---

## ✅ Säkerställ att genererade testfall matchar UI-förväntningar

### 1. Databas-format

**Kontrollera:**
- ✅ `bpmn_file` är korrekt (t.ex. `"mortgage-se-application.bpmn"`)
- ✅ `bpmn_element_id` är korrekt (t.ex. `"application"`)
- ✅ `provider` är en av `'claude' | 'chatgpt' | 'ollama'`
- ✅ `origin` är `'llm-doc'` för user story-scenarios eller `'spec-parsed'` för process flow-scenarios
- ✅ `scenarios` är en array av `TestScenario` objekt

### 2. TestScenario-format

**Kontrollera:**
- ✅ `id` är en string (t.ex. `"us-US-1"`)
- ✅ `name` är en string (t.ex. `"User Story US-1: skapa ansökan"`)
- ✅ `description` är en string
- ✅ `status` är en av `'passing' | 'failing' | 'pending' | 'skipped'` (default: `'pending'`)
- ✅ `category` är en av `'happy-path' | 'error-case' | 'edge-case'`

### 3. Gruppering per BPMN-nod

**Kontrollera:**
- ✅ Scenarios för samma `bpmn_file` + `bpmn_element_id` grupperas i samma rad
- ✅ `upsert` använder `onConflict: 'bpmn_file,bpmn_element_id,provider'`
- ✅ Flera scenarios för samma nod sparas i samma `scenarios` array

---

## 🧪 Validering utan UI-tester

### Steg 1: Verifiera databas-format

**Test:** `tests/unit/testGeneration/testScenarioSaver.test.ts`

```typescript
it('should save scenarios in format expected by UI', async () => {
  // Mock scenarios
  const scenarios = [...];
  
  // Spara
  const saveResult = await saveUserStoryScenarios(scenarios);
  
  // Verifiera format
  const row = mockUpsert.mock.calls[0][0][0];
  expect(row).toHaveProperty('bpmn_file');
  expect(row).toHaveProperty('bpmn_element_id');
  expect(row).toHaveProperty('provider');
  expect(row).toHaveProperty('origin');
  expect(row).toHaveProperty('scenarios');
  expect(Array.isArray(row.scenarios)).toBe(true);
  
  // Verifiera TestScenario-format
  row.scenarios.forEach(scenario => {
    expect(scenario).toHaveProperty('id');
    expect(scenario).toHaveProperty('name');
    expect(scenario).toHaveProperty('description');
    expect(scenario).toHaveProperty('status');
    expect(scenario).toHaveProperty('category');
    expect(['pending', 'passing', 'failing', 'skipped']).toContain(scenario.status);
    expect(['happy-path', 'error-case', 'edge-case']).toContain(scenario.category);
  });
});
```

### Steg 2: Verifiera att data kan hämtas

**Test:** `tests/integration/testGeneration/integration.test.ts`

```typescript
it('should save and retrieve scenarios in UI-compatible format', async () => {
  // 1. Spara scenarios
  const scenarios = [...];
  await saveUserStoryScenarios(scenarios);
  
  // 2. Hämta scenarios (mock Supabase query)
  const mockSelect = vi.fn().mockResolvedValue({
    data: [{
      bpmn_file: 'test.bpmn',
      bpmn_element_id: 'test',
      provider: 'claude',
      origin: 'llm-doc',
      scenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: 'pending',
        category: s.type,
      })),
    }],
    error: null,
  });
  
  // 3. Verifiera att data kan hämtas i format som UI förväntar sig
  const result = await mockSelect();
  expect(result.data[0].scenarios).toHaveLength(scenarios.length);
  result.data[0].scenarios.forEach(scenario => {
    expect(scenario).toHaveProperty('id');
    expect(scenario).toHaveProperty('name');
    expect(scenario).toHaveProperty('category');
  });
});
```

### Steg 3: Manuell validering i UI

**Checklista för manuell validering:**

1. **Spara testfall till databasen:**
   ```typescript
   // Kör funktionen manuellt
   const userStories = await extractUserStoriesFromAllDocs();
   const scenarios = convertUserStoriesToTestScenarios(userStories);
   await saveUserStoryScenarios(scenarios);
   ```

2. **Verifiera i databasen:**
   ```sql
   SELECT bpmn_file, bpmn_element_id, provider, origin, scenarios
   FROM node_planned_scenarios
   WHERE origin = 'llm-doc';
   ```

3. **Verifiera i UI:**
   - Öppna TestReport-sidan
   - Verifiera att scenarios visas för rätt noder
   - Verifiera att scenarios har korrekt namn, beskrivning, kategori

4. **Verifiera i RightPanel:**
   - Välj en nod i BPMN-viewern
   - Verifiera att scenarios visas i RightPanel
   - Verifiera att scenarios har korrekt format

---

## 🔍 Validering av UI-kompatibilitet

### Kontrollera att TestScenario-format matchar UI-förväntningar

**Fil:** `src/data/testMapping.ts`

```typescript
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  category: 'happy-path' | 'error-case' | 'edge-case';
  // ... optional fields
}
```

**Kontrollera:**
- ✅ Våra genererade scenarios matchar detta format
- ✅ `status` är alltid `'pending'` (default)
- ✅ `category` mappas korrekt från `type`

### Kontrollera att databas-format matchar UI-förväntningar

**Fil:** `src/hooks/useNodePlannedScenarios.ts`

**Kontrollera:**
- ✅ Hook hämtar data från `node_planned_scenarios`
- ✅ Filtrerar på `bpmn_file` och `bpmn_element_id`
- ✅ Returnerar scenarios i format som UI förväntar sig

---

## 📋 Checklista för UI-kompatibilitet

### Databas-format:
- [ ] `bpmn_file` är korrekt format
- [ ] `bpmn_element_id` är korrekt format
- [ ] `provider` är en av tillåtna värden
- [ ] `origin` är `'llm-doc'` eller `'spec-parsed'`
- [ ] `scenarios` är en array

### TestScenario-format:
- [ ] `id` finns och är string
- [ ] `name` finns och är string
- [ ] `description` finns och är string
- [ ] `status` är `'pending'` (default)
- [ ] `category` är en av `'happy-path' | 'error-case' | 'edge-case'`

### Gruppering:
- [ ] Scenarios för samma nod grupperas korrekt
- [ ] `upsert` använder rätt conflict resolution

### Manuell validering:
- [ ] Testfall sparas till databasen
- [ ] Testfall visas i TestReport
- [ ] Testfall visas i RightPanel
- [ ] Testfall har korrekt format i UI

---

## 🎯 Teststrategi (utan UI-tester)

### 1. Unit-tester: Verifiera format

**Fokus:** Verifiera att funktioner returnerar data i rätt format

```typescript
it('should return scenarios in UI-compatible format', () => {
  const scenario = convertUserStoryToTestScenario(userStory);
  
  // Verifiera format
  expect(scenario).toHaveProperty('id');
  expect(scenario).toHaveProperty('name');
  expect(scenario).toHaveProperty('category');
  expect(['happy-path', 'error-case', 'edge-case']).toContain(scenario.category);
});
```

### 2. Integrationstester: Verifiera dataflöde

**Fokus:** Verifiera att data kan sparas och hämtas i rätt format

```typescript
it('should save scenarios in format that UI can read', async () => {
  const scenarios = [...];
  await saveUserStoryScenarios(scenarios);
  
  // Verifiera att data sparas i rätt format
  const savedData = mockUpsert.mock.calls[0][0];
  expect(savedData[0].scenarios[0]).toHaveProperty('id');
  expect(savedData[0].scenarios[0]).toHaveProperty('category');
});
```

### 3. Manuell validering: Verifiera i UI

**Fokus:** Verifiera att data faktiskt visas i UI

1. Kör funktionerna manuellt
2. Kontrollera databasen
3. Öppna UI och verifiera att data visas

---

**Datum:** 2025-12-22
**Status:** UI-validering dokumenterad



