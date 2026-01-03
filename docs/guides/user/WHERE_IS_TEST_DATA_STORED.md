# Var sparas testinformation?

## Översikt

Testinformation sparas på två olika platser beroende på typ:

1. **E2E-scenarios**: Sparas i Supabase Storage
2. **Feature Goal-test scenarios**: Sparas i Supabase Database (`node_planned_scenarios` tabellen)

## E2E-scenarios (Storage)

**Plats:** Supabase Storage → `bpmn-files` bucket → `e2e-scenarios/`

**Sökväg:** `e2e-scenarios/{bpmnFile}/{versionHash}/{bpmnFile}-scenarios.json`

**Exempel:**
```
e2e-scenarios/mortgage-se-internal-data-gathering.bpmn/ffdfca047babb6a16156f203dfbe9ee5a08d9dc630a151a620d2bdb34b0c2f78/mortgage-se-internal-data-gathering-scenarios.json
```

**Innehåll:** JSON-array med `E2eScenario[]` objekt, inklusive:
- `subprocessSteps` med `given`, `when`, `then` för varje callActivity
- `bankProjectTestSteps` med UI/API/DMN-information

## Feature Goal-test scenarios (Database)

**Plats:** Supabase Database → `node_planned_scenarios` tabellen

**Tabellstruktur:**
```sql
CREATE TABLE node_planned_scenarios (
  bpmn_file TEXT NOT NULL,
  bpmn_element_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'claude', 'chatgpt', 'ollama'
  origin TEXT NOT NULL, -- 'design', 'llm-doc', 'e2e-to-feature-goal', 'spec-parsed'
  scenarios JSONB NOT NULL, -- Array av TestScenario objekt
  PRIMARY KEY (bpmn_file, bpmn_element_id, provider)
);
```

**Viktiga fält:**
- `bpmn_file`: **Parent-filen** där callActivity är definierad (t.ex. `mortgage.bpmn`)
- `bpmn_element_id`: CallActivity ID (t.ex. `application`)
- `provider`: `'claude'` (för Feature Goal-tester genererade från E2E)
- `origin`: `'e2e-to-feature-goal'` (för Feature Goal-tester genererade från E2E)
- `scenarios`: JSON-array med `TestScenario[]` objekt, inklusive `given`, `when`, `then`

**Exempel-query:**
```sql
SELECT 
  bpmn_file,
  bpmn_element_id,
  provider,
  origin,
  jsonb_array_length(scenarios) as scenario_count,
  scenarios->0->>'name' as first_scenario_name,
  scenarios->0->>'given' as first_scenario_given,
  scenarios->0->>'when' as first_scenario_when,
  scenarios->0->>'then' as first_scenario_then
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND bpmn_element_id = 'application'
  AND origin = 'e2e-to-feature-goal';
```

## Varför Feature Goal-tester sparas i databasen?

Feature Goal-test scenarios sparas i databasen (inte Storage) eftersom:
1. De är relaterade till specifika noder (`bpmn_file` + `bpmn_element_id`)
2. De behöver kunna uppdateras via `upsert` (uppdatera om de redan finns)
3. De behöver kunna queryas effektivt baserat på BPMN-fil och element-ID
4. De är strukturerade data (JSON) som passar bättre i en databastabell än i Storage

## Hur hittar jag mina Feature Goal-test scenarios?

### I Supabase Dashboard:

1. Gå till **Table Editor** → `node_planned_scenarios`
2. Filtrera på:
   - `bpmn_file`: t.ex. `mortgage.bpmn`
   - `bpmn_element_id`: t.ex. `application`
   - `origin`: `e2e-to-feature-goal` (för Feature Goal-tester genererade från E2E)

### Via SQL Query:

```sql
-- Hitta alla Feature Goal-tester för en specifik callActivity
SELECT * FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND bpmn_element_id = 'application'
  AND origin = 'e2e-to-feature-goal';

-- Hitta alla Feature Goal-tester för en specifik BPMN-fil
SELECT 
  bpmn_element_id,
  jsonb_array_length(scenarios) as scenario_count,
  scenarios
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND origin = 'e2e-to-feature-goal'
ORDER BY bpmn_element_id;
```

## Varför ser jag inget i Test Coverage-tabellen?

Om `given/when/then`-kolumnerna är tomma i Test Coverage-tabellen, kan det bero på:

1. **Inga Feature Goal-tester finns i databasen:**
   - Kör "Generera testinformation (alla filer)" för att skapa dem
   - Kontrollera att E2E-scenarios genererades framgångsrikt först

2. **Fel `bpmn_file`-värde:**
   - Feature Goal-tester sparas med **parent-filen** där callActivity är definierad
   - För `application` callActivity i `mortgage.bpmn`, sök efter `bpmn_file = 'mortgage.bpmn'`
   - För `internal-data-gathering` callActivity i `mortgage-se-application.bpmn`, sök efter `bpmn_file = 'mortgage-se-application.bpmn'`

3. **Gamla testscenarios utan `given/when/then`:**
   - Gamla testscenarios kan sakna `given/when/then`-fält
   - Regenerera testinformationen för att få nya testscenarios med dessa fält
   - Systemet försöker parsa `description` som fallback, men det är bättre att regenerera

4. **E2E-scenarios saknar `given/when/then`:**
   - Om E2E-scenarios saknar `given/when/then` i `subprocessSteps`, kommer systemet att försöka hämta Feature Goal-tester från databasen
   - Om Feature Goal-tester också saknar dessa fält, kommer kolumnerna att vara tomma

## Debugging

För att se vad som händer, öppna konsolen (F12) och leta efter:
- `[fetchPlannedScenarios] Querying for {bpmnFile}::{elementId}`
- `[fetchPlannedScenarios] Found {count} row(s) for {bpmnFile}::{elementId}`
- `[testCoverageHelpers] Fetching Feature Goal tests for {bpmnFile}::{callActivityId}`
- `[testCoverageHelpers] Found Feature Goal test for {bpmnFile}::{callActivityId}: {hasGiven, hasWhen, hasThen}`

Om du ser `hasGiven: false, hasWhen: false, hasThen: false`, betyder det att testscenarios saknar dessa fält och du behöver regenerera testinformationen.


