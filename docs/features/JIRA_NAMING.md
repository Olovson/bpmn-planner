# Jira-namngivning

BPMN Planner genererar automatiskt Jira-namn för alla relevanta noder (feature goals och epics) baserat på processhierarkin.

## Namngivningsregler

**Alla nodtyper använder samma full path-baserad namngivning:**

- **Fullständig path från root till nod** (root-processnamn exkluderas)
- **Format**: `<parent1> - <parent2> - ... - <node.label>`
- **Root-processnamn ingår aldrig** i Jira-namn (t.ex. "Mortgage" ingår inte)

### Feature Goals (callActivity)

Feature goals använder full path-baserad namngivning:

- **Top-level subprocess** (direkt under root):
  - Format: `<SubprocessLabel>`
  - Exempel: `Application`

- **Nested subprocess** (under en annan subprocess):
  - Format: `<Parent1> - <Parent2> - ... - <SubprocessLabel>`
  - Exempel: `Application - Internal data gathering`

### Epics (userTask, serviceTask, businessRuleTask)

Epics använder samma full path-baserad namngivning:

- **Path innehåller alla föräldranoder** från root till nod (exklusive root)
- Format: `<Parent1> - <Parent2> - ... - <TaskLabel>`
- Exempel: `Automatic Credit Evaluation - Calculate household affordability` (serviceTask under Automatic Credit Evaluation subprocess)

## Exempel

För en processhierarki:
```
Mortgage (root)
  └─ Application (callActivity)
      ├─ Internal data gathering (callActivity)
      │   └─ Verify customer info (userTask)
      └─ Confirm application (userTask)
  └─ Automatic Credit Evaluation (callActivity)
      └─ Calculate household affordability (serviceTask)
```

Genererade Jira-namn:
- `Application` (feature goal, top-level)
- `Application - Internal data gathering` (feature goal, nested)
- `Application - Internal data gathering - Verify customer info` (epic, under nested subprocess)
- `Application - Confirm application` (epic, under top-level subprocess)
- `Automatic Credit Evaluation` (feature goal, top-level)
- `Automatic Credit Evaluation - Calculate household affordability` (epic, under top-level subprocess)

## Implementation

Jira-namn genereras via `buildJiraName()` i `src/lib/jiraNaming.ts` och används konsekvent i:
- Hierarkibyggnad (`BpmnFileManager.handleBuildHierarchy`) - **endast plats som skriver Jira-namn till databasen**
- Fallback-namn (`useAllBpmnNodes`)
- Edge Functions (`generate-artifacts`) - sätter bara `jira_type`, inte `jira_name`

**Viktigt**: Jira-namn skrivs endast till databasen när hierarkin byggs via "Bygg/uppdatera hierarki från root". Detta säkerställer att korrekta fullständiga paths används baserat på hela ProcessTree.
