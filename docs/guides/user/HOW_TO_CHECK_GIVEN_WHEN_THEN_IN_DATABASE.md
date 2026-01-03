# Hur kontrollerar jag given/when/then i databasen?

## SQL-query för att se given/when/then

### För en specifik callActivity:

```sql
SELECT 
  bpmn_file,
  bpmn_element_id,
  provider,
  origin,
  jsonb_array_length(scenarios) as scenario_count,
  scenarios->0->>'id' as first_scenario_id,
  scenarios->0->>'name' as first_scenario_name,
  scenarios->0->>'given' as first_scenario_given,
  scenarios->0->>'when' as first_scenario_when,
  scenarios->0->>'then' as first_scenario_then,
  CASE 
    WHEN scenarios->0->>'given' IS NOT NULL THEN 'HAS given'
    ELSE 'MISSING given'
  END as given_status,
  CASE 
    WHEN scenarios->0->>'when' IS NOT NULL THEN 'HAS when'
    ELSE 'MISSING when'
  END as when_status,
  CASE 
    WHEN scenarios->0->>'then' IS NOT NULL THEN 'HAS then'
    ELSE 'MISSING then'
  END as then_status
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND bpmn_element_id = 'application'
  AND origin = 'e2e-to-feature-goal';
```

### För alla callActivities i en fil:

```sql
SELECT 
  bpmn_element_id,
  provider,
  origin,
  jsonb_array_length(scenarios) as scenario_count,
  scenarios->0->>'name' as first_scenario_name,
  CASE 
    WHEN scenarios->0->>'given' IS NOT NULL AND scenarios->0->>'when' IS NOT NULL AND scenarios->0->>'then' IS NOT NULL 
    THEN 'COMPLETE (has given/when/then)'
    ELSE 'INCOMPLETE (missing given/when/then)'
  END as status
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage-se-application.bpmn'
ORDER BY bpmn_element_id;
```

### För att se hela första scenariot (inklusive given/when/then):

```sql
SELECT 
  bpmn_file,
  bpmn_element_id,
  provider,
  origin,
  scenarios->0 as first_scenario
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND bpmn_element_id = 'application'
  AND origin = 'e2e-to-feature-goal';
```

Detta returnerar hela första scenariot som JSON, inklusive alla fält:
```json
{
  "id": "mortgage-se-application-e2e-...",
  "name": "Application - ...",
  "description": "Given: ...\n\nWhen: ...\n\nThen: ...",
  "given": "En ansökan har skapats...",
  "when": "Application-processen initieras...",
  "then": "Ansökan är komplett...",
  "status": "pending",
  "category": "happy-path"
}
```

### För att se alla scenarios för en callActivity:

```sql
SELECT 
  bpmn_file,
  bpmn_element_id,
  provider,
  origin,
  jsonb_array_elements(scenarios) as scenario
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND bpmn_element_id = 'application'
  AND origin = 'e2e-to-feature-goal';
```

## Vad betyder olika värden?

### `origin: 'e2e-to-feature-goal'`
- Nya testscenarios genererade från E2E-scenarios
- **Bör ha** `given/when/then`-fält
- Sparas med `provider: 'claude'`

### `origin: 'design'`
- Gamla testscenarios (från testMapping eller automatisk generering)
- **Saknar ofta** `given/when/then`-fält
- Har bara `description`-fältet

### `origin: 'llm-doc'`
- Testscenarios genererade direkt från dokumentation
- **Bör ha** `given/when/then`-fält om de genererades efter uppdateringen

## Exempel på korrekt struktur

Ett korrekt TestScenario-objekt i `scenarios` JSONB-kolumnen bör se ut så här:

```json
{
  "id": "mortgage-se-internal-data-gathering-e2e-e2e-Event_1iswmjx-Event_0rzxyhh-happy-path-1767268980874-step-1",
  "name": "mortgage-se-internal-data-gathering - Genomför intern datainsamling från interna källor",
  "description": "Given: ...\n\nWhen: ...\n\nThen: ...",
  "given": "En ansökan har skapats med komplett information.\nGateway Conditions: Ansökan godkänns",
  "when": "Intern datainsamling initieras.\nFlow: System samlar in data → System validerar data",
  "then": "Alla nödvändiga data är samlade.\nAcceptance: Data är komplett och validerad",
  "status": "pending",
  "category": "happy-path"
}
```

## Om given/when/then saknas

Om du ser `hasGiven: false, hasWhen: false, hasThen: false` i loggarna eller i databasen, betyder det att:

1. **Testscenarios är gamla** (genererade innan `given/when/then`-fälten lades till)
2. **Du behöver regenerera testinformationen** för att få nya testscenarios med dessa fält

Kör "Generera testinformation (alla filer)" igen för att skapa nya testscenarios med `given/when/then`-fält.

