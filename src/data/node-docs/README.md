# Node Documentation Overrides

Denna mapp innehåller per-nod dokumentationsöverskridanden som kan användas för att förbättra och anpassa den automatiskt genererade dokumentationen.

## Struktur

```
node-docs/
  feature-goal/
    mortgage.application.doc.ts
    mortgage-se-application.internal-data-gathering.doc.ts
  epic/
    mortgage-se-application.confirm-application.doc.ts
    mortgage-se-application.household.doc.ts
  business-rule/
    mortgage-se-credit-evaluation.credit-decision.doc.ts
```

## Skapa en ny override-fil

Använd scriptet:

```bash
npm run create:node-doc <docType> <bpmnFile> <elementId>
```

**Exempel:**
```bash
# Feature Goal
npm run create:node-doc feature-goal mortgage.bpmn application

# Epic
npm run create:node-doc epic mortgage-se-application.bpmn confirm-application

# Business Rule
npm run create:node-doc business-rule mortgage-se-credit-evaluation.bpmn credit-decision
```

## Filnamn

Format: `<bpmnBaseName>.<elementId>.doc.ts`

- `bpmnBaseName`: Filnamnet utan `.bpmn` (t.ex. `mortgage.bpmn` → `mortgage`)
- `elementId`: Element-ID från BPMN-filen (t.ex. `application`, `confirm-application`)

## Innehåll

Varje fil exporterar en `overrides`-objekt som kan innehålla:

- **Simple fields**: `summary`, `testDescription` - ersätter base-värden
- **Array fields**: `effectGoals`, `flowSteps`, `scenarios`, etc. - ersätter eller utökar base-arrayer
- **Merge strategy**: Använd `_mergeStrategy` för att utöka arrayer istället för att ersätta dem

## Exempel

Se `feature-goal/mortgage.application.doc.ts` (om den finns) för ett komplett exempel.

## Hur det fungerar

1. Base model byggs från `NodeDocumentationContext`
2. Override-fil laddas (om den finns)
3. Override mergas in i base model
4. LLM-patch appliceras (om LLM används)
5. HTML renderas från final model

## Tips

- Börja med att generera dokumentation lokalt för att se base-innehållet
- Skapa override-fil för noder som behöver förbättring
- Använd ChatGPT/Ollama för att generera innehåll, kopiera till override-fil, och commit
- Iterativt förbättra override-filerna över tid

