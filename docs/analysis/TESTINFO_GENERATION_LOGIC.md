# Testinfo-generering: Hur systemet fungerar

## Översikt

Systemet genererar två typer av testinformation:
1. **E2E-scenarios** - End-to-end scenarios för root-processen
2. **Feature Goal-tester** - Frikopplade tester för varje Feature Goal (callActivity) som kan testas separat

## Flöde när du klickar "Generera testinformation (alla filer)"

### Steg 1: Identifiera root-filen
- Systemet hittar root-filen (t.ex. `mortgage.bpmn`) baserat på bpmn-map.json eller hierarki
- Bygger hierarki med alla filer (mortgage, application, internal-data-gathering)

### Steg 2: Generera E2E-scenarios ENDAST för root-filen
- **VIKTIGT:** E2E-scenarios genereras BARA för root-filen (mortgage.bpmn)
- **INTE** för subprocesser (application.bpmn, internal-data-gathering.bpmn)
- Systemet:
  1. Parsar root-filen och hittar alla paths genom processen
  2. För varje path:
     - **Analyserar alla tillhörande BPMN-filer indirekt:**
       - Hittar callActivities i root-filen
       - Hittar subprocess-filer via `parseResult.subprocesses` eller `bpmn-map.json`
       - Laddar Feature Goal-dokumentation från subprocess-filerna
     - Skickar path + dokumentation till Claude
     - Claude identifierar relevanta scenarios baserat på gateway-conditions:
       - "En sökande" om `stakeholders.length === 1`
       - "Medsökande" om `stakeholders.length > 1`
       - "Köp bostadsrätt" om `propertyType === 'BOSTADSRATT'`
       - etc.
     - Claude genererar E2E-scenario med given/when/then och subprocessSteps
  3. Sparar E2E-scenarios i Supabase Storage

### Steg 3: Generera Feature Goal-tester direkt från dokumentation med Claude
- För varje callActivity i hierarkin:
  - Systemet laddar Feature Goal-dokumentation
  - Skickar dokumentation till Claude för att generera given/when/then
  - Claude genererar kortfattade given/when/then (1-2 meningar vardera) baserat på:
    - `dependencies` → given
    - `flowSteps` → when
    - `userStories.acceptanceCriteria` → then
  - Skapar TestScenario-objekt med:
    - `id`, `name`, `description`, `status`, `category`
    - `given`, `when`, `then` (genererade med Claude)
  - Sparar i `node_planned_scenarios` tabellen med `origin: 'claude-direct'`

## Vad genereras för vad?

| Fil | E2E-scenarios | Feature Goal-tester |
|-----|---------------|---------------------|
| **mortgage.bpmn** (root) | ✅ Ja - Genereras med Claude | ✅ Ja - Extraheras från E2E-scenarios |
| **application.bpmn** (subprocess) | ❌ Nej - Hoppas över | ✅ Ja - Extraheras från root-filens E2E-scenarios |
| **internal-data-gathering.bpmn** (subprocess) | ❌ Nej - Hoppas över | ✅ Ja - Extraheras från root-filens E2E-scenarios |

## Viktiga ändringar

### 1. E2E-scenarios genereras ENDAST för root-filen
**Före:** E2E-scenarios genererades för alla filer i hierarkin
**Efter:** E2E-scenarios genereras bara för root-filen (mortgage.bpmn)

**Kod:**
- `testGenerators.ts` rad 547-550: Kontrollerar `isActualRootFile === true` innan E2E-generering
- `testGenerators.ts` rad 246: Sätter `isActualRootFile = true` bara för första filen i hierarkin

### 2. Tog bort `checkIfPathMatchesPrioritizedScenario`-filtret
**Före:** Hårdkodad filter som bara accepterade tre specifika scenarios (en sökande, medsökande, manuell granskning)
**Efter:** Inget filter - Claude identifierar relevanta scenarios dynamiskt baserat på gateway-conditions

**Anledning:**
- Filtret var hårdkodad för bostadsrätt-processer och filtrerade bort paths för mortgage/application-processer
- Claude kan identifiera relevanta scenarios baserat på gateway-conditions i prompten
- Mer flexibelt och fungerar för alla processer

**Kod:**
- `e2eScenarioGenerator.ts` rad 860-871: Tog bort filter-kontrollen
- `e2eScenarioGenerator.ts` rad 930-998: Tog bort `checkIfPathMatchesPrioritizedScenario`-funktionen

### 3. Feature Goal-tester genereras direkt med Claude
**Före:** Feature Goal-tester extraherades från E2E-scenarios (ingen given/when/then)
**Efter:** Feature Goal-tester genereras direkt från dokumentation med Claude (med given/when/then)

**Anledning:**
- Extraktion från E2E-scenarios gav inte bra given/when/then för Feature Goals
- Claude kan generera kortfattade given/when/then (1-2 meningar vardera) direkt från Feature Goal-dokumentation
- Mer relevant och testbart för Feature Goals

**Kod:**
- `featureGoalTestGeneratorDirect.ts`: Ny funktion som genererar Feature Goal-tester direkt med Claude
- `testMapping.ts`: Lagt till `given?`, `when?`, `then?` i `TestScenario` interface
- `testGenerators.ts`: Använder `generateFeatureGoalTestsDirect` istället för `generateFeatureGoalTestsFromE2e`

## Dataflöde

```
1. Root-fil (mortgage.bpmn)
   ↓
2. Hitta alla paths genom processen
   ↓
3. För varje path:
   - Ladda Feature Goal-dokumentation
   - Skicka till Claude → Generera E2E-scenario
   ↓
4. Spara E2E-scenarios i Storage
   ↓
5. Generera Feature Goal-tester direkt från dokumentation med Claude
   - För varje callActivity: Ladda dokumentation → Generera given/when/then med Claude
   ↓
6. Spara Feature Goal-tester i node_planned_scenarios
   (origin: 'claude-direct')
```

## Exempel

### Input
- `mortgage.bpmn` (root) - innehåller callActivities: application, credit-evaluation, etc.
- `application.bpmn` (subprocess) - anropas från mortgage
- `internal-data-gathering.bpmn` (subprocess) - anropas från mortgage

### Output

**E2E-scenarios (bara för mortgage.bpmn):**
- "En sökande - Bostadsrätt godkänd automatiskt (Happy Path)"
- "Medsökande - Bostadsrätt godkänd automatiskt (Happy Path)"
- "En sökande - Manuell granskning krävs (Alt Path)"

**Feature Goal-tester (för alla callActivities):**
- `mortgage.bpmn::application` - "Application - Hanterar ansökan"
- `mortgage.bpmn::credit-evaluation` - "Credit Evaluation - Utvärderar kreditvärdighet"
- `application.bpmn::internal-data-gathering` - "Internal Data Gathering - Samlar in intern data"
- etc.

## Framtida förbättringar

1. **Implementera Claude-generering för given/when/then i Feature Goal-tester**
   - Använd Claude för att generera meningsfulla given/when/then från Feature Goal-dokumentation
   - Spara i `TestScenario` interface

2. **Förbättra E2E-scenario-kvalitet**
   - Lägg till mer kontext i prompten
   - Validera att scenarios är kompletta och testbara

3. **Optimera Feature Goal-test-extraktion**
   - Förbättra logiken för att extrahera Feature Goal-tester från E2E-scenarios
   - Hantera edge cases bättre

## Relaterad dokumentation

- **Komplett guide:** [`docs/testing/TEST_GENERATION.md`](../testing/TEST_GENERATION.md) - Användarguide för testgenerering
- **Detaljerad analys:** Denna fil - Teknisk analys av logiken

