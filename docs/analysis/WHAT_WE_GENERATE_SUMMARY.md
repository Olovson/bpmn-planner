# Sammanfattning: Vad vi faktiskt genererar när vi bygger tester

## 🎯 Syfte

Påminna om vad vi faktiskt genererar när vi bygger tester baserat på E2E-scenarios och Feature Goals.

---

## 📊 Genereringsprocess: Steg-för-steg

### Steg 1: E2E-scenario-generering (med Claude)

**Input:**
- BPMN-processgraf (paths med Feature Goals)
- Feature Goal-dokumentation (redan genererad)
- Gateway-conditions (från ProcessPath)

**Output:**
- E2E-scenarios med:
  - `name`, `summary`, `given`, `when`, `then`
  - `bankProjectTestSteps` (teststeg för hela flödet)
  - `subprocessSteps` (Feature Goals i ordning med `given`, `when`, `then`)

**Vad genereras:**
- E2E-scenarios som testar hela processen från start till slut
- Varje E2E-scenario representerar en path genom processen
- E2E-scenarios inkluderar gateway-conditions som "Given"-conditions

---

### Steg 2: Feature Goal-test extraktion (hybrid approach)

**Input:**
- E2E-scenarios (från Steg 1)
- ProcessPath (med gateway-conditions)
- Feature Goal-dokumentation

**Output:**
- Feature Goal-tester (`TestScenario[]`) per Feature Goal:
  - `id`: Unik ID för testet
  - `name`: Testnamn med gateway-kontext (t.ex. "credit-evaluation - System evaluates credit (KALP OK = Yes)")
  - `description`: Given/When/Then format med gateway-conditions, prerequisites, flow steps, acceptance criteria
  - `status`: "pending"
  - `category`: "happy-path" | "edge-case" | "error-case"

**Vad genereras:**
- Feature Goal-tester extraheras från E2E-scenarios
- Varje `subprocessStep` i E2E-scenario → ett Feature Goal-test
- Tester separeras baserat på gateway-conditions (t.ex. `credit-evaluation` med `KALP OK = Yes` vs `KALP OK = No`)
- Tester berikas med Feature Goal-dokumentation (prerequisites, flowSteps, userStories)

---

## 🎯 Vad vi faktiskt genererar

### 1. E2E-scenarios (högsta nivå)

**Vad:**
- Kompletta testscenarios som testar hela processen
- Från start-event till end-event
- Inkluderar alla Feature Goals i ordning

**Exempel:**
```typescript
{
  id: 'e2e-1',
  name: 'Happy path - Application approved',
  summary: 'Komplett E2E-scenario för en person som köper bostadsrätt...',
  given: 'Customer is identified',
  when: 'Customer applies for mortgage',
  then: 'Mortgage is approved',
  subprocessSteps: [
    {
      callActivityId: 'application',
      given: 'Customer is identified',
      when: 'Customer fills in application',
      then: 'Application is validated',
    },
    {
      callActivityId: 'credit-evaluation',
      given: 'Application is validated, KALP OK = Yes', // ← Gateway-condition
      when: 'System evaluates credit',
      then: 'Credit evaluation is complete',
    },
  ],
}
```

---

### 2. Feature Goal-tester (Feature Goal-nivå)

**Vad:**
- Testscenarios för individuella Feature Goals (Call Activities)
- Extraheras från E2E-scenarios
- Separerade baserat på gateway-conditions

**Exempel:**
```typescript
// Feature Goal: 'credit-evaluation'
[
  {
    id: 'credit-evaluation-e2e-1-step-2',
    name: 'credit-evaluation - System evaluates credit (KALP OK = Yes)',
    description: `
      Given: Application is validated
      Gateway Conditions: KALP OK = Yes
      Prerequisites: Household data is complete
      When: System evaluates credit
      Flow: System evaluates credit → System generates credit decision
      Then: Credit evaluation is complete
      Acceptance: Credit evaluation is complete
    `,
    status: 'pending',
    category: 'happy-path',
  },
  {
    id: 'credit-evaluation-e2e-2-step-2',
    name: 'credit-evaluation - System evaluates credit (KALP OK = No)',
    description: `
      Given: Application is validated
      Gateway Conditions: KALP OK = No
      Prerequisites: Household data is complete
      When: System evaluates credit
      Flow: System evaluates credit → System generates credit decision
      Then: Credit evaluation is complete
      Acceptance: Credit evaluation is complete
    `,
    status: 'pending',
    category: 'error-case',
  },
]
```

---

## 🔗 Koppling: E2E → Feature Goal

### Hur E2E-scenarios kopplas till Feature Goals:

1. **E2E-scenario har `subprocessSteps`:**
   - Varje `subprocessStep` har `callActivityId` (Feature Goal)
   - Varje `subprocessStep` har `given`, `when`, `then`

2. **Feature Goal-tester extraheras:**
   - För varje `subprocessStep` → skapa ett Feature Goal-test
   - Använd `subprocessStep.given`, `when`, `then` som grund
   - Berika med Feature Goal-dokumentation
   - Inkludera gateway-conditions (från ProcessPath)

3. **Gateway-conditions separerar tester:**
   - `credit-evaluation` med `KALP OK = Yes` → ett test
   - `credit-evaluation` med `KALP OK = No` → ett annat test
   - Tester dedupliceras, men separeras baserat på gateway-kontext

---

## 📊 Vad sparas till databasen

### `node_planned_scenarios` tabellen

**Struktur:**
```typescript
{
  bpmn_file: 'mortgage-se-application.bpmn',
  bpmn_element_id: 'credit-evaluation',
  provider: 'claude',
  origin: 'llm-doc',
  scenarios: TestScenario[] // Feature Goal-tester
}
```

**Innehåll:**
- Feature Goal-tester (`TestScenario[]`) per Feature Goal
- Tester inkluderar gateway-kontext
- Tester är separerade baserat på gateway-conditions

---

## 🎯 Sammanfattning: Vad vi genererar

### 1. E2E-scenarios (högsta nivå)
- **Vad:** Kompletta testscenarios för hela processen
- **Var:** Sparas separat (inte i `node_planned_scenarios`)
- **Användning:** E2E-testning av hela processen

### 2. Feature Goal-tester (Feature Goal-nivå)
- **Vad:** Testscenarios för individuella Feature Goals
- **Var:** Sparas i `node_planned_scenarios` tabellen
- **Användning:** Feature Goal-testning (enklare, isolerade tester)

### 3. Gateway-kontext
- **Vad:** Gateway-conditions som avgör vilka Feature Goals som anropas
- **Var:** Inkluderas i Feature Goal-tester (`name` och `description`)
- **Användning:** Separerar tester baserat på gateway-conditions

---

## 🔍 Exempel: Fullständig generering

### Input:
- E2E-scenario 1 (Happy path): `application` → `household` → `credit-evaluation` (KALP OK = Yes) → `mortgage-commitment`
- E2E-scenario 2 (Rejection path): `application` → `household` → `credit-evaluation` (KALP OK = No) → `rejection`

### Output:

**Feature Goal: `application`**
- 1 test (samma i båda scenarios, deduplicerad)

**Feature Goal: `household`**
- 1 test (samma i båda scenarios, deduplicerad)

**Feature Goal: `credit-evaluation`**
- 2 tester (separerade baserat på gateway-conditions):
  - Test 1: `credit-evaluation - System evaluates credit (KALP OK = Yes)`
  - Test 2: `credit-evaluation - System evaluates credit (KALP OK = No)`

**Feature Goal: `mortgage-commitment`**
- 1 test (endast för KALP OK = Yes)

**Feature Goal: `rejection`**
- 1 test (endast för KALP OK = No)

---

## 💡 Viktiga poänger

### 1. E2E-scenarios är på högre nivå
- Testar hela processen
- Inkluderar flera Feature Goals i ordning
- Inkluderar gateway-conditions och end events

### 2. Feature Goal-tester är på lägre nivå
- Testar individuella Feature Goals
- Isolerade från resten av processen
- Separerade baserat på gateway-conditions

### 3. Gateway-conditions avgör vilka tester som genereras
- Feature Goals före gateway → tester utan gateway-kontext
- Feature Goals efter gateway → tester med gateway-kontext
- Olika gateway-conditions → separata tester

---

**Datum:** 2025-12-22
**Status:** Sammanfattning klar - Vad vi genererar dokumenterat





