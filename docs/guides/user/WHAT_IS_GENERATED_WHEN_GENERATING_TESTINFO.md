# Vad Genereras När Du Genererar Testinfo i Appen

**Datum:** 2025-12-22  
**Uppdaterad:** Efter implementering av E2E scenario-generering

---

## 🎯 Översikt

När du klickar på **"Generera testinfo"** i Files-sidan (`/files`) genereras följande:

1. **Playwright-testfiler** för Feature Goals (Call Activities)
2. **E2E-scenarios** för root-processen (mortgage.bpmn)
3. **Test scenarios** extraheras från E2E-scenarios och sparas i databasen

**Viktigt:** Epic-testgenerering har tagits bort. Epic-information finns redan inkluderad i Feature Goal-dokumentation.

---

## 📋 Detaljerad Process

### Steg 1: Validering av Dokumentation

**Vad som händer:**
- Systemet kontrollerar att all nödvändig dokumentation finns för alla testbara noder
- För Call Activities (Feature Goals): Kontrollerar att Feature Goal-dokumentation finns
- För andra noder: Kontrollerar att vanlig nod-dokumentation finns

**Vad händer om dokumentation saknas:**
- Genereringen stoppas
- Ett felmeddelande visas med lista över saknad dokumentation
- Du måste generera dokumentation först

---

### Steg 2: Generering av E2E-scenarios

**Viktigt:** Playwright-testfiler har tagits bort - de innehöll bara stubbar och användes inte för att generera given/when/then. All testinformation genereras nu direkt från E2E scenarios.

**Vad som händer:**
1. Systemet bygger en processgraf från BPMN-filen
2. Systemet identifierar alla **paths** (flöden) från start till end genom Feature Goals
3. Systemet filtrerar paths för att hitta de tre prioriterade scenarios:
   - ✅ **Lyckad ansökan för en sökare** (bostadsrätt, happy path, inga manuella steg)
   - ✅ **Lyckad ansökan för en sökare med en medsökare** (bostadsrätt, happy path, inga manuella steg)
   - ✅ **En sökare som behöver genomgå mest möjliga steg** (bostadsrätt, med manuella evalueringar)
4. Systemet laddar Feature Goal-dokumentation för varje Feature Goal i pathen
5. Systemet genererar **E2E-scenarios** med Claude baserat på:
   - BPMN-processgraf (paths med Feature Goals)
   - Feature Goal-dokumentation (summary, flowSteps, userStories, prerequisites)
   - Gateway-conditions (från ProcessPath)
   - Root-processens namn (t.ex. "Mortgage Application")

**Vad du får:**
- E2E-scenarios som testar hela processen från start till slut
- Varje E2E-scenario representerar en path genom processen
- E2E-scenarios inkluderar:
  - `given`, `when`, `then` på root-nivå (introduktion till hela scenariot)
  - `subprocessSteps` (Feature Goals i ordning med detaljerad given/when/then)
  - `bankProjectTestSteps` (Feature Goals i ordning med action och assertion)
  - `summary`, `priority`, `type`, `iteration`

**Var sparas:**
- Supabase Storage: `bpmn-files/e2e-scenarios/{bpmnFile}-scenarios.json`
- Exempel: `e2e-scenarios/mortgage-scenarios.json`

**Exempel på innehåll:**
```json
{
  "id": "e2e-happy-path-1",
  "name": "En sökande - Bostadsrätt godkänd automatiskt (Happy Path)",
  "priority": "P1",
  "type": "happy-path",
  "iteration": "Köp bostadsrätt - En sökande",
  "summary": "Komplett E2E-scenario för en person som köper sin första bostadsrätt...",
  "given": "Mortgage Application-processen startar när en person köper sin första bostadsrätt...",
  "when": "Mortgage Application-processen startar. Kunden fyller i komplett ansökan (Application)...",
  "then": "Mortgage Application-processen slutförs framgångsrikt. Application är komplett...",
  "bankProjectTestSteps": [
    {
      "bpmnNodeId": "application",
      "bpmnNodeType": "CallActivity",
      "bpmnNodeName": "Application",
      "action": "Kunden fyller i komplett ansökan (Application)...",
      "assertion": "Application är komplett och redo för kreditevaluering..."
    }
  ],
  "subprocessSteps": [
    {
      "order": 1,
      "bpmnFile": "mortgage-se-application.bpmn",
      "callActivityId": "application",
      "description": "Application – Komplett ansökan med en person",
      "given": "En person ansöker om bolån för köp av bostadsrätt...",
      "when": "Kunden går in i ansökningsflödet (Application)...",
      "then": "Alla relevanta steg i Application-processen har körts..."
    }
  ]
}
```

**Viktigt:**
- Endast de tre prioriterade scenarios genereras med fullständig testinfo
- Andra möjliga scenarios dokumenteras i `notesForBankProject` men genereras inte ännu
- Fokus på bostadsrätter (inte villor/småhus)
- UI-interaktion, API-anrop och DMN-beslut genereras INTE i `bankProjectTestSteps` (enligt önskemål)

---

### Steg 3: Extrahering av Feature Goal-test scenarios (från E2E-scenarios)

**Vad som händer:**
1. Systemet extraherar Feature Goal-tester från E2E-scenarios
2. Varje `subprocessStep` i E2E-scenario → ett Feature Goal-test
3. Tester separeras baserat på gateway-conditions
4. Tester berikas med Feature Goal-dokumentation

**Vad du får:**
- Feature Goal-tester (`TestScenario[]`) per Feature Goal
- Tester inkluderar gateway-kontext
- Tester sparas i `node_planned_scenarios` tabellen
- Origin: `e2e-to-feature-goal` (indikerar att de kommer från E2E-scenarios)

**Var sparas:**
- Databas: `node_planned_scenarios` tabellen
- Origin: `e2e-to-feature-goal`

---

## 📊 Sammanfattning: Vad Genereras

**Viktigt:** Playwright-testfiler har tagits bort. All testinformation finns nu i E2E scenarios och Feature Goal-test scenarios.

### 1. E2E-scenarios
- **Typ:** JSON-filer
- **Antal:** 1-3 scenarios (beroende på vilka paths som matchar prioriterade scenarios)
- **Innehåll:** Komplett E2E-scenario med given/when/then på root-nivå och subprocessSteps
- **Var:** Supabase Storage (`e2e-scenarios/{bpmnFile}-scenarios.json`)
- **Visas:** E2E Tests Overview-sidan (`/test-coverage`) och Test Coverage-sidan (`/test-coverage`)

### 2. Feature Goal-test scenarios
- **Typ:** Databasrader
- **Antal:** En per Feature Goal i varje E2E-scenario
- **Innehåll:** Test scenarios med gateway-kontext
- **Var:** Databas (`node_planned_scenarios` tabellen)
- **Origin:** `e2e-to-feature-goal`

---

## 🚫 Vad Genereras INTE

### Playwright-testfiler
- **Varför:** Playwright-testfiler har tagits bort
- **Anledning:** De innehöll bara stubbar och användes inte för att generera given/when/then. All testinformation finns nu i E2E scenarios och Feature Goal-test scenarios.
- **Fördelar:** Sparar tid och pengar (färre LLM-anrop), enklare system, alltid synkroniserat med E2E scenarios

### Epic-testfiler
- **Varför:** Epic-testgenerering har tagits bort
- **Anledning:** Epic-information finns redan inkluderad i Feature Goal-dokumentation via `childrenDocumentation`

### UI-interaktion, API-anrop, DMN-beslut i bankProjectTestSteps
- **Varför:** Enligt önskemål - dessa behövs inte för nu
- **Status:** Kan läggas till senare om behövs

### E2E-scenarios för alla möjliga paths
- **Varför:** Endast tre prioriterade scenarios genereras
- **Status:** Andra scenarios dokumenteras i `notesForBankProject` men genereras inte ännu

---

## 📍 Var Kan Du Se Det Genererade Innehållet?

**Viktigt:** Playwright-testfiler har tagits bort. All testinformation finns nu i E2E scenarios och Feature Goal-test scenarios.

### E2E-scenarios
- **E2E Tests Overview-sidan** (`/test-coverage` eller `/e2e-tests`)
  - Visar alla genererade E2E-scenarios
  - Filter och sökning
  - Expandera scenario för att se given/when/then på root-nivå och subprocessSteps
- **Test Coverage-sidan** (`/test-coverage`)
  - Visar E2E-scenarios i TestCoverageTable
  - Scenario-selector för att välja scenario
  - Visar test coverage per Feature Goal
- **Supabase Storage** (direkt via Supabase Dashboard)

### Feature Goal-test scenarios
- **Test Report-sidan** (`/test-report`)
- **Databas** (`node_planned_scenarios` tabellen)

---

## 🔄 Hela Flödet i Ordning

1. **Du klickar "Generera testinfo"** i Files-sidan
2. **Systemet validerar dokumentation** - Stoppar om dokumentation saknas
3. **Systemet genererar E2E-scenarios** för root-processen (3 prioriterade scenarios)
4. **Systemet extraherar Feature Goal-test scenarios** från E2E-scenarios
5. **Systemet sparar allt** till Supabase Storage och databas
6. **Du kan se resultatet** på E2E Tests Overview, Test Coverage, och Test Report-sidorna

**Viktigt:** Playwright-testfiler genereras inte längre - de innehöll bara stubbar och användes inte för att generera given/when/then.

---

## ✅ Checklista: Vad Du Bör Se Efter Generering

- [ ] E2E-scenarios finns i Supabase Storage (`e2e-scenarios/`)
- [ ] E2E-scenarios visas på E2E Tests Overview-sidan
- [ ] E2E-scenarios visas på Test Coverage-sidan
- [ ] Feature Goal-test scenarios finns i databasen (`node_planned_scenarios`)
- [ ] Feature Goal-test scenarios visas på Test Report-sidan

**Viktigt:** Playwright-testfiler genereras inte längre - de har tagits bort eftersom de bara innehöll stubbar.

---

## 📝 Exempel: För mortgage.bpmn

**Efter generering av testinfo för `mortgage.bpmn`:**

### Playwright-testfiler (exempel):
- `test-files/mortgage-se-application.bpmn/application.spec.ts`
- `test-files/mortgage-se-credit-evaluation.bpmn/credit-evaluation.spec.ts`
- `test-files/mortgage-se-offer.bpmn/offer.spec.ts`
- ... (en per Feature Goal)

### E2E-scenarios:
- `e2e-scenarios/mortgage-scenarios.json` (innehåller 1-3 scenarios)

### Feature Goal-test scenarios:
- Databasrader i `node_planned_scenarios` (en per Feature Goal i varje E2E-scenario)

---

## 🎯 Sammanfattning

**När du genererar testinfo får du:**

1. ✅ **E2E-scenarios** - 1-3 scenarios för root-processen, sparas i Storage som JSON
2. ✅ **Feature Goal-test scenarios** - Extraheras från E2E-scenarios, sparas i databasen

**Viktigt:** Playwright-testfiler har tagits bort - de innehöll bara stubbar och användes inte för att generera given/when/then. Detta sparar tid och pengar (färre LLM-anrop).

**Allt detta är baserat på:**
- BPMN-processgraf (paths genom processen)
- Feature Goal-dokumentation (summary, flowSteps, userStories, prerequisites)
- Gateway-conditions (för att identifiera olika typer av scenarios)

**Du kan se resultatet på:**
- E2E Tests Overview-sidan (alla E2E-scenarios)
- Test Coverage-sidan (E2E-scenarios i TestCoverageTable)
- Test Report-sidan (Playwright-testfiler och test scenarios)

