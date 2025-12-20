# Översikt: Information i Appen och Claude-generering

## 📊 Total Information i Appen

### 1. **Dokumentation (HTML-filer)**
- **Feature Goals** (CallActivities/subprocesser)
- **Epics** (UserTasks, ServiceTasks)
- **Business Rules** (BusinessRuleTasks/DMN)

### 2. **Testinformation**
- **Testscenarion** (från `node_planned_scenarios` databas)
  - Provider: `cloud` (Claude), `local-fallback`, `ollama`
  - Origin: `llm-doc`, `design`, `spec-parsed`
- **E2E-testinformation** (från `E2eTestsOverviewPage.tsx`)
  - API-anrop (ServiceTasks)
  - UI-interaktioner (UserTasks)
  - DMN-beslut (BusinessRuleTasks)
  - Given/When/Then per subprocess
  - Backend states

### 3. **Testscripts**
- Playwright-testfiler per nod
- Testscenarion (genererade eller från databas)

### 4. **Metadata**
- DoR/DoD-kriterier
- Jira-typer/namn
- BPMN-dependencies
- Subprocess-mappningar

---

## 🤖 Vad Genereras med Claude (useLlm = true)

### Dokumentation (via `generateDocumentationWithLlm`)

Claude genererar **JSON-struktur** som mappas till HTML:

#### Feature Goals:
- ✅ `summary` - Sammanfattning
- ✅ `effectGoals` - Effektmål
- ✅ `scopeIncluded` - Omfattning
- ✅ `scopeExcluded` - Avgränsning
- ✅ `epics` - Ingående epics
- ✅ `flowSteps` - Flödessteg
- ✅ `dependencies` - Beroenden
- ✅ `scenarios` - Testscenarion (sparas i `node_planned_scenarios` med `provider: 'cloud'`)
- ✅ `testDescription` - Testbeskrivning
- ✅ `implementationNotes` - Tekniska noteringar
- ✅ `relatedItems` - Relaterade items

#### Epics:
- ✅ `summary` - Sammanfattning
- ✅ `prerequisites` - Förutsättningar
- ✅ `inputs` - Indata
- ✅ `flowSteps` - Flödessteg
- ✅ `interactions` - Interaktioner
- ✅ `dataContracts` - Data-kontrakt
- ✅ `businessRulesPolicy` - Affärsregler
- ✅ `scenarios` - Testscenarion
- ✅ `testDescription` - Testbeskrivning
- ✅ `implementationNotes` - Tekniska noteringar
- ✅ `relatedItems` - Relaterade items

#### Business Rules:
- ✅ `summary` - Sammanfattning
- ✅ `inputs` - Indata
- ✅ `decisionLogic` - Beslutslogik
- ✅ `outputs` - Utdata
- ✅ `businessRulesPolicy` - Policyer
- ✅ `scenarios` - Testscenarion
- ✅ `testDescription` - Testbeskrivning
- ✅ `implementationNotes` - Tekniska noteringar
- ✅ `relatedItems` - Relaterade items

### Testscenarion (via `generateTestSpecWithLlm`)

Claude genererar testscenarion som sparas i `node_planned_scenarios`:
- ✅ Scenario-ID, namn, beskrivning
- ✅ Typ (happy-path, error-case, edge-case)
- ✅ Prioritet (P0, P1, P2)
- ✅ Expected result
- ✅ Test steps

---

## 📦 Vad Hämtas från Databas/E2E (inte genererat av Claude)

### Från `node_planned_scenarios` (databas):
- ✅ Testscenarion (om de redan finns)
  - Används i HTML-filer när `renderFeatureGoalDoc` körs
  - Hämtas via `fetchPlannedScenarios()`
  - Prioriterar `cloud` provider om Claude användes

### Från E2E-scenarion (`E2eTestsOverviewPage.tsx`):
- ✅ API-anrop (från `bankProjectTestSteps`)
- ✅ UI-interaktioner (från `bankProjectTestSteps`)
- ✅ DMN-beslut (från `bankProjectTestSteps`)
- ✅ Given/When/Then (från `subprocessSteps`)
- ✅ Backend states

**Detta hämtas automatiskt** när HTML-filer genereras med v2-template.

---

## ⚠️ Vad Kan Saknas med Claude

### 1. **Testscenarion i Databasen**
- Om `node_planned_scenarios` är tom → fallback-scenarion genereras från `processOutputs`
- **Lösning**: Claude genererar scenarion och sparar dem i databasen automatiskt

### 2. **E2E-testinformation**
- Om noden inte finns i E2E-scenarion → inga API-anrop/UI-interaktion/DMN-beslut visas
- **Lösning**: Information visas om den finns, annars visas `[TODO]`-platshållare

### 3. **Per-node Overrides**
- Manuellt skapade overrides i `src/data/node-docs/` används alltid (både med och utan Claude)
- **Inget saknas här** - overrides appliceras alltid

### 4. **Mock APIs**
- Mock APIs genereras **inte** automatiskt
- **Inte implementerat** (enligt din tidigare kommentar att de inte behövs)

---

## 🔄 Flöde: Lokal vs Claude

### Lokal generering (useLlm = false):
1. Bygger basmodell från BPMN-kontext
2. Applicerar per-node overrides
3. Genererar HTML från mall (v2-template)
4. Hämtar testscenarion från databas (`local-fallback` provider)
5. Hämtar E2E-testinfo om tillgängligt
6. **Sparar INTE** nya scenarion i databasen

### Claude-generering (useLlm = true):
1. Bygger basmodell från BPMN-kontext
2. Applicerar per-node overrides
3. **Claude genererar JSON-struktur** (via structured outputs)
4. JSON mappas till modell och appliceras som "patch"
5. Genererar HTML från modell (v2-template)
6. **Sparar testscenarion** i `node_planned_scenarios` med `provider: 'cloud'`
7. Hämtar E2E-testinfo om tillgängligt

---

## ✅ Sammanfattning: Vad Får Du med Claude?

### Extra med Claude:
1. **Rikare textinnehåll** - Claude genererar mer detaljerad och kontextuell text
2. **Testscenarion sparas automatiskt** - sparas i databasen för framtida användning
3. **Structured outputs** - garanterar korrekt JSON-struktur (inga parsing-fel)

### Samma med Claude som Lokalt:
1. **Per-node overrides** - appliceras alltid
2. **E2E-testinformation** - hämtas om tillgängligt
3. **v2-template** - samma template används
4. **Testinformation i HTML** - API-anrop, UI-interaktion, DMN-beslut visas om tillgängligt

### Vad Saknas INTE med Claude:
- ✅ All information från databasen hämtas
- ✅ All E2E-testinformation hämtas
- ✅ Alla overrides appliceras
- ✅ Samma template används

**Slutsats**: Med Claude får du **mer** information (rikare text + sparade scenarion), inte mindre. Allt som finns lokalt finns också med Claude.




