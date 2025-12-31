# Vad Förväntas När Du Genererar Testinformation

## 🎯 Översikt

När du genererar testinformation i Test Generation-sidan (`/test-generation`) skapas **testfiler och test scenarios** baserat på:
1. **Feature Goal-dokumentation** (Call Activities)
2. **E2E-scenarios** (genererade från BPMN-processgraf och Feature Goals)
3. **BPMN-processflöde** (strukturen i dina BPMN-filer)

**Viktigt:** Epic-testgenerering har tagits bort. Epic-information finns redan inkluderad i Feature Goal-dokumentation via `childrenDocumentation`, vilket ger tillräcklig kontext för E2E och Feature Goal-testgenerering.

Testfiler och scenarios sparas i:
- **Testfiler:** Supabase Storage
- **Test scenarios:** Databasen (`node_planned_scenarios`)

Dessa kan sedan visas i:
- **Test Report-sidan** (`/test-report`)
- **RightPanel** (när du väljer en nod i BPMN-viewern)

---

## 📋 Typer av Testgenerering

**Viktigt:** Playwright-testfiler har tagits bort - de innehöll bara stubbar och användes inte för att generera given/when/then.

### 1. E2E-scenarios (från BPMN-processgraf och Feature Goals)

**Vad händer:**
1. Systemet bygger en processgraf från dina BPMN-filer
2. Systemet identifierar alla **paths** (flöden) från start till end genom Feature Goals
3. Systemet filtrerar paths för att hitta de tre prioriterade scenarios:
   - Lyckad sökning för en sökare (bostadsrätt)
   - Lyckad sökning för en sökare med en medsökare (bostadsrätt)
   - En sökare som behöver genomgå mest möjliga steg (bostadsrätt, med manuella evalueringar)
4. Systemet genererar **E2E-scenarios** med Claude baserat på:
   - BPMN-processgraf (paths med Feature Goals)
   - Feature Goal-dokumentation (summary, flowSteps, userStories, prerequisites)
   - Gateway-conditions (från ProcessPath)

**Vad du får:**
- E2E-scenarios som testar hela processen från start till slut
- Varje E2E-scenario representerar en path genom processen
- E2E-scenarios inkluderar `subprocessSteps` (Feature Goals i ordning)
- E2E-scenarios sparas i Supabase Storage som JSON (`e2e-scenarios/{bpmnFile}-scenarios.json`)
- E2E-scenarios visas på `/e2e-tests`-sidan

### 2. Feature Goal-test scenarios (från E2E-scenarios)

**Vad händer:**
1. Systemet extraherar Feature Goal-tester från E2E-scenarios
2. Varje `subprocessStep` i E2E-scenario → ett Feature Goal-test
3. Tester separeras baserat på gateway-conditions
4. Tester berikas med Feature Goal-dokumentation

**Vad du får:**
- Feature Goal-tester (`TestScenario[]`) per Feature Goal
- Tester inkluderar gateway-kontext
- Tester sparas i `node_planned_scenarios` tabellen
- Origin: `e2e-to-feature-goal` (indikerar att de kommer från E2E-scenarios)

---

## 💾 Var Sparas Data?

### E2E Scenarios
E2E-scenarios sparas i **Supabase Storage** som JSON-filer:

```
bpmn-files/
└── e2e-scenarios/
    └── {bpmnFile}-scenarios.json
```

**Exempel:**
- `e2e-scenarios/mortgage-scenarios.json` - E2E-scenarios för mortgage.bpmn

**Viktigt:**
- E2E-scenarios **ersätter** befintliga scenarios vid varje generering (upsert)
- E2E-scenarios innehåller de tre prioriterade scenarios:
  1. Lyckad sökning för en sökare (bostadsrätt)
  2. Lyckad sökning för en sökare med en medsökare (bostadsrätt)
  3. En sökare som behöver genomgå mest möjliga steg (bostadsrätt, med manuella evalueringar)

### Feature Goal-test Scenarios
Feature Goal-test scenarios sparas i **Supabase-databasen** i tabellen `node_planned_scenarios`:

```sql
node_planned_scenarios
├── bpmn_file (t.ex. "mortgage-se-application.bpmn")
├── bpmn_element_id (t.ex. "application")
├── provider ("claude")
├── origin ("llm-doc" eller "spec-parsed")
└── scenarios (JSONB-array med TestScenario-objekt)
```

**Viktigt:**
- Scenarios **ersätter inte** befintliga scenarios - de använder `upsert` med conflict resolution
- Om du kör generering flera gånger, uppdateras befintliga scenarios (inte dubbletter)
- Manuellt skapade scenarios bevaras (om de har samma `bpmn_file` + `bpmn_element_id` + `provider`)

### E2E Scenarios
E2E-scenarios sparas i **Supabase Storage** som JSON-filer:

```
bpmn-files/
└── e2e-scenarios/
    └── {bpmnFile}-scenarios.json
```

**Exempel:**
- `e2e-scenarios/mortgage-scenarios.json` - E2E-scenarios för mortgage.bpmn

**Viktigt:**
- E2E-scenarios **ersätter** befintliga scenarios vid varje generering (upsert)
- E2E-scenarios innehåller de tre prioriterade scenarios:
  1. Lyckad sökning för en sökare (bostadsrätt)
  2. Lyckad sökning för en sökare med en medsökare (bostadsrätt)
  3. En sökare som behöver genomgå mest möjliga steg (bostadsrätt, med manuella evalueringar)

---

## 👀 Var Kan Du Se Resultaten?

### 1. E2E Tests Overview-sidan (`/e2e-tests`)

**Vad du ser:**
- Alla genererade E2E-scenarios
- Filtrerade på iteration, typ, prioritet
- Detaljerad information om varje scenario:
  - `given`, `when`, `then` på scenario-nivå
  - `subprocessSteps` med `given`, `when`, `then` per Feature Goal
  - `bankProjectTestSteps` med `action` och `assertion` per Feature Goal

**Viktigt:**
- E2E-scenarios laddas automatiskt från Supabase Storage när sidan öppnas
- Om inga scenarios finns, visas en tom lista (generera testinfo först)

---

### 2. Test Report-sidan (`/test-report`)

**Vad du ser:**
- Översikt över alla test scenarios i systemet
- Grupperade per BPMN-fil och nod
- Filtrerade på provider (claude/chatgpt/ollama)
- Statistik: antal scenarios, täckning, etc.

**För user story-scenarios:**
- Origin: `llm-doc`
- Visas under rätt nod
- Kategoriserade som happy-path, error-case, eller edge-case

**För process flow-scenarios:**
- Origin: `spec-parsed`
- Visas under rätt nod
- Innehåller detaljerade steg som följer processflödet

---

### 3. RightPanel (när du väljer en nod)

**Vad du ser:**
- Alla test scenarios för den valda noden
- Grupperade per provider och origin
- Detaljerad information om varje scenario

**Exempel:**
Om du väljer noden "application" i BPMN-viewern:
- User story-scenarios från Epic-dokumentationen
- Process flow-scenarios från BPMN-processflödet
- Alla scenarios med status, kategori, beskrivning, etc.

---

## 📊 Vad Innehåller Varje Test Scenario?

### User Story-scenario:

```typescript
{
  id: "us-us-1",
  name: "User Story US-1: skapa ansökan",
  description: "Som Kund vill jag skapa ansökan så att jag kan ansöka om lån",
  status: "pending",
  category: "happy-path", // eller "error-case", "edge-case"
  riskLevel: "P1", // eller "P0", "P2"
  assertionType: "functional",
  source: "user-story",
  userStoryId: "US-1",
  userStoryRole: "Kund"
}
```

### Process Flow-scenario:

```typescript
{
  id: "flow-happy-mortgage-se-application-1",
  name: "Happy Path – Application",
  description: "Happy path från Application till End. Processen följer huvudflödet utan fel.",
  status: "pending",
  category: "happy-path", // eller "error-case"
  source: "bpmn-process-flow",
  bpmnFile: "mortgage-se-application.bpmn",
  bpmnElementId: "application",
  processId: "application",
  flowType: "happy-path", // eller "error-path"
  pathNodes: ["start", "task1", "task2", "end"], // Node IDs i ordning
  steps: [
    {
      order: 1,
      nodeId: "start",
      nodeType: "event",
      nodeName: "Start",
      action: "Processen startar",
      expectedResult: "Processen har startats"
    },
    // ... fler steg
  ]
}
```

---

## ⚠️ Viktiga Punkter

### 1. Inga Ändringar i Befintlig Dokumentation
- Testgenerering **påverkar inte** befintlig dokumentation
- Den läser bara från dokumentationen, skriver inte till den
- Du kan köra generering flera gånger utan risk

### 2. Kräver Befintlig Dokumentation
- User story-scenarios kräver att dokumentation redan finns
- Om ingen dokumentation finns, returneras 0 scenarios
- Process flow-scenarios fungerar alltid (baserat på BPMN-struktur)

### 3. Gruppering per Nod
- Scenarios grupperas per `bpmn_file` + `bpmn_element_id`
- Flera scenarios för samma nod sparas i samma rad
- Detta gör det enkelt att se alla scenarios för en nod

### 4. Manuell Redigering
- Scenarios kan redigeras manuellt i databasen
- Nästa generering kommer **inte** att skriva över manuella ändringar
- (Om samma `bpmn_file` + `bpmn_element_id` + `provider` används, uppdateras raden)

---

## 🎯 Praktiskt Exempel

**Scenario:** Du har en BPMN-fil `mortgage-se-application.bpmn` med:
- 1 Call Activity: "internal-data-gathering" (Feature Goal)
- 2 User Tasks: "application", "review" (Epics - genererar INTE längre testfiler)
- Feature Goal-dokumentation för "internal-data-gathering" med flowSteps och userStories

**När du kör testgenerering:**
1. Systemet genererar **1 testfil** för Feature Goal "internal-data-gathering"
2. Systemet genererar **E2E-scenarios** baserat på BPMN-processgraf och Feature Goal-dokumentation
3. Systemet extraherar **Feature Goal-test scenarios** från E2E-scenarios
4. Totalt: **1 testfil** + **Feature Goal-test scenarios** sparas i databasen

**Viktigt:** Epic-noder (User Tasks, Service Tasks, Business Rule Tasks) genererar **inte** längre testfiler eller scenarios. Epic-information finns redan inkluderad i Feature Goal-dokumentationen via `childrenDocumentation`.

**Resultat:**
- **Testfiler:** Endast för Feature Goals (Call Activities)
- **Test scenarios:** Feature Goal-tester extraherade från E2E-scenarios
- Alla synliga i Test Report och RightPanel

---

## 📈 Förväntade Resultat

### Om du har Feature Goal-dokumentation:
- **Testfiler** för alla Feature Goals (Call Activities)
- **E2E-scenarios** genererade från BPMN-processgraf och Feature Goal-dokumentation
- **Feature Goal-test scenarios** extraherade från E2E-scenarios

### Om du har lite dokumentation:
- **Få testfiler** (endast för Feature Goals med dokumentation)
- **E2E-scenarios** baserat på BPMN-struktur (kan vara mindre detaljerade)
- **Feature Goal-test scenarios** baserat på E2E-scenarios

### Om du har ingen dokumentation:
- **0 testfiler** (kräver Feature Goal-dokumentation)
- **E2E-scenarios** kan fortfarande genereras baserat på BPMN-struktur (men med begränsad kvalitet)

---

## 🔍 Felsökning

### "Dokumentation saknas för X nod(er)"
- **Orsak:** Feature Goal-dokumentation saknas för Call Activities
- **Lösning:** Generera Feature Goal-dokumentation först, sedan testgenerering
- **Viktigt:** Epic-dokumentation krävs inte längre för testgenerering
- **Ny funktion:** Systemet genererar nu tester för Feature Goals som har dokumentation, även om några saknas

### "Dokumentation saknas för alla X Feature Goal(s)"
- **Orsak:** All Feature Goal-dokumentation saknas
- **Lösning:** Generera Feature Goal-dokumentation först innan testgenerering
- **Skillnad:** Detta stoppar genereringen (till skillnad från när bara några saknas)

### "0 testfiler genererade"
- **Orsak:** Inga Feature Goals (Call Activities) finns i BPMN-filen, eller dokumentation saknas
- **Lösning:** Kontrollera att BPMN-filen har Call Activities och att Feature Goal-dokumentation finns
- **Ny funktion:** E2E-scenarios kan nu genereras även om det inte finns Call Activities (för processer som är subprocesser)

### "0 scenarios genererade"
- **Orsak:** BPMN-filen har inga testbara paths, eller E2E-scenario-generering misslyckades
- **Lösning:** Kontrollera att BPMN-filen har start- och end-events, och att Feature Goal-dokumentation finns
- **Ny funktion:** Systemet visar nu tydlig feedback om vilka paths som hoppades över och varför

### "Hoppade över X path(s)"
- **Orsak:** Vissa paths hoppades över under E2E-generering
- **Möjliga orsaker:**
  - Path saknade dokumentation
  - Path matchade inte prioriterade scenarios
  - LLM-generering misslyckades för path
- **Lösning:** Kontrollera varningar i konsolen för detaljerad information

### "LLM inte tillgängligt"
- **Orsak:** LLM är inte aktiverat eller konfigurerat
- **Lösning:** Aktivera LLM i inställningar innan testgenerering
- **Ny funktion:** Systemet kontrollerar nu LLM-tillgänglighet innan generering startar

### "Scenarios visas inte i UI"
- **Orsak:** Cache-problem eller fel i databasen
- **Lösning:** Ladda om sidan, kontrollera databasen direkt

---

**Datum:** 2025-12-22
**Status:** Dokumentation för testgenerering

