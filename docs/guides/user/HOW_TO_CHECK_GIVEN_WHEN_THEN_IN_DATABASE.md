# Hur kontrollerar jag given/when/then i databasen?

## För en specifik callActivity

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
  scenarios->0->>'then' as first_scenario_then
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND bpmn_element_id = 'application'
  AND origin = 'claude-direct';
```

## För alla callActivities i en fil

```sql
SELECT 
  bpmn_element_id,
  provider,
  origin,
  jsonb_array_length(scenarios) as scenario_count,
  scenarios->0->>'name' as first_scenario_name,
  CASE 
    WHEN scenarios->0->>'given' IS NOT NULL AND scenarios->0->>'when' IS NOT NULL AND scenarios->0->>'then' IS NOT NULL 
    THEN 'COMPLETE'
    ELSE 'INCOMPLETE'
  END as status
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage-se-application.bpmn'
ORDER BY bpmn_element_id;
```

## Origin‑värden (nuvarande)

- `claude-direct` – Feature Goal‑scenarier genererade direkt från dokumentation.
- `design` – äldre seedade scenarier (kan sakna given/when/then).
- `llm-doc` – historiskt, kan förekomma i äldre data.
- `spec-parsed` – historiskt/legacy.

