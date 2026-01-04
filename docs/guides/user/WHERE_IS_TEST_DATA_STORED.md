# Var sparas testinformation?

## Översikt

Testinformation sparas på två platser:

1. **E2E‑scenarier** → Supabase Storage
2. **Feature Goal‑scenarier** → Supabase Database (`node_planned_scenarios`)

## E2E‑scenarier (Storage)

**Bucket:** `bpmn-files`

**Sökväg:**
```
e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json
```

**Exempel:**
```
e2e-scenarios/mortgage.bpmn/<versionHash>/mortgage-scenarios.json
```

## Feature Goal‑scenarier (Database)

**Tabell:** `node_planned_scenarios`

**Viktiga fält:**
- `bpmn_file`: filen där scenariot hör hemma
- `bpmn_element_id`: callActivity‑ID **eller** processens baseName (för filer utan callActivities)
- `provider`: `claude` (för LLM‑genererade)
- `origin`: `claude-direct`

### Exempel‑query

```sql
SELECT 
  bpmn_file,
  bpmn_element_id,
  provider,
  origin,
  jsonb_array_length(scenarios) as scenario_count,
  scenarios->0->>'name' as first_scenario_name
FROM node_planned_scenarios
WHERE bpmn_file = 'mortgage.bpmn'
  AND bpmn_element_id = 'application'
  AND origin = 'claude-direct';
```

## Varför DB för Feature Goal‑scenarier?

- Enkelt att uppdatera via `upsert`.
- Effektiva queries per nod.
- JSON‑struktur passar bra i tabellformat.
