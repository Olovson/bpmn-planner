# Testgenerering: Komplett Guide

## 📋 Översikt

Systemet genererar två typer av testinformation:
1. **E2E-scenarios** - End-to-end scenarios för root-processen
2. **Feature Goal-tester** - Frikopplade tester för varje Feature Goal (callActivity) som kan testas separat

## 🔄 Hur det fungerar

### När du klickar "Generera testinformation (alla filer)"

#### Steg 1: Identifiera root-filen
- Systemet hittar root-filen (t.ex. `mortgage.bpmn`) baserat på bpmn-map.json eller hierarki
- Bygger hierarki med alla filer (mortgage, application, internal-data-gathering)

#### Steg 2: Generera E2E-scenarios ENDAST för root-filen
- **VIKTIGT:** E2E-scenarios genereras BARA för root-filen (mortgage.bpmn)
- **INTE** för subprocesser (application.bpmn, internal-data-gathering.bpmn)

**Process:**
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

#### Steg 3: Generera Feature Goal-tester direkt från dokumentation med Claude
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

#### Steg 4: Feature Goal-tester genereras för alla callActivities
- Feature Goal-tester genereras direkt från dokumentation med Claude
- Fungerar för både root-filen och subprocesser
- Inga extra steg behövs - alla callActivities behandlas lika

## 📊 Vad genereras för vad?

| Fil | E2E-scenarios | Feature Goal-tester |
|-----|---------------|---------------------|
| **mortgage.bpmn** (root) | ✅ Ja - Genereras med Claude | ✅ Ja - Extraheras från E2E-scenarios |
| **application.bpmn** (subprocess) | ❌ Nej - Hoppas över | ✅ Ja - Extraheras från root-filens E2E-scenarios |
| **internal-data-gathering.bpmn** (subprocess) | ❌ Nej - Hoppas över | ✅ Ja - Extraheras från root-filens E2E-scenarios |

## 🔍 Viktiga detaljer

### Subprocesser analyseras indirekt

När E2E-scenarios genereras för root-filen:
- ✅ Systemet analyserar **alla tillhörande BPMN-filer** indirekt
- ✅ Hittar callActivities i root-filen
- ✅ Hittar subprocess-filer via `parseResult.subprocesses` eller `bpmn-map.json`
- ✅ Laddar Feature Goal-dokumentation från subprocess-filerna
- ✅ Skickar all dokumentation till Claude för korrekta E2E-scenarios

**Exempel:**
För `mortgage.bpmn` med callActivities: `application`, `credit-evaluation`:
1. Systemet parsar `mortgage.bpmn` och hittar callActivities
2. För `application` callActivity:
   - Hittar subprocess-filen: `application.bpmn` (via parseResult eller bpmn-map)
   - Laddar Feature Goal-dokumentation från `application.bpmn`
3. För `credit-evaluation` callActivity:
   - Hittar subprocess-filen: `credit-evaluation.bpmn`
   - Laddar Feature Goal-dokumentation från `credit-evaluation.bpmn`
4. Skickar alla Feature Goal-dokumentationer till Claude för att generera E2E-scenario

### Claude identifierar scenarios dynamiskt

- ✅ Inget hårdkodat filter - Claude identifierar relevanta scenarios baserat på gateway-conditions
- ✅ Fungerar för alla processer, inte bara bostadsrätt
- ✅ Mer flexibelt och anpassningsbart

## 📝 Dataflöde

```
1. Root-fil (mortgage.bpmn)
   ↓
2. Hitta alla paths genom processen
   ↓
3. För varje path:
   - Hitta callActivities i root-filen
   - Hitta subprocess-filer (via parseResult eller bpmn-map)
   - Ladda Feature Goal-dokumentation från subprocess-filerna
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

## 💾 Var sparas data?

- **E2E-scenarios:** Supabase Storage (`e2e-scenarios/{bpmnFile}/{versionHash}/{bpmnFile}-scenarios.json`)
- **Feature Goal-tester:** Supabase Database (`node_planned_scenarios` tabellen med `origin: 'e2e-to-feature-goal'`)

## 🔧 Tekniska detaljer

### Viktiga filer

- `src/lib/testGenerators.ts` - Huvudlogik för testgenerering
- `src/lib/e2eScenarioGenerator.ts` - E2E-scenario-generering
- `src/lib/featureGoalTestGenerator.ts` - Feature Goal-test-generering
- `src/lib/e2eToFeatureGoalTestExtractor.ts` - Extraktion av Feature Goal-tester från E2E-scenarios

### Viktiga ändringar

1. **E2E-scenarios genereras ENDAST för root-filen**
   - Kontrollerar `isActualRootFile === true` innan E2E-generering
   - Sätter `isActualRootFile = true` bara för första filen i hierarkin

2. **Tog bort `checkIfPathMatchesPrioritizedScenario`-filtret**
   - Claude identifierar relevanta scenarios dynamiskt baserat på gateway-conditions
   - Mer flexibelt och fungerar för alla processer

3. **Feature Goal-tester genereras direkt med Claude**
   - Genereras direkt från Feature Goal-dokumentation (inte från E2E-scenarios)
   - Claude genererar kortfattade given/when/then (1-2 meningar vardera)
   - Baseras på dependencies (given), flowSteps (when), userStories.acceptanceCriteria (then)

## 🚀 Framtida förbättringar

1. **Förbättra E2E-scenario-kvalitet**
   - Lägg till mer kontext i prompten
   - Validera att scenarios är kompletta och testbara

2. **Förbättra Feature Goal-test-kvalitet**
   - Optimera prompten för bättre given/when/then-generering
   - Validera att given/when/then är testbara och konkreta

## 📚 Relaterad dokumentation

- **Detaljerad analys:** [`docs/analysis/TESTINFO_GENERATION_LOGIC.md`](../analysis/TESTINFO_GENERATION_LOGIC.md)
- **Test Coverage Guide:** [`docs/guides/user/TEST_COVERAGE_USER_GUIDE.md`](../guides/user/TEST_COVERAGE_USER_GUIDE.md)
- **Test Lead Guide:** [`docs/guides/user/README_FOR_TESTLEAD.md`](../guides/user/README_FOR_TESTLEAD.md)

