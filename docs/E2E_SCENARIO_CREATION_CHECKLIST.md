# Checklista: Skapa ett realistiskt E2E-scenario

Använd denna checklista när du skapar ett nytt e2e-scenario för att säkerställa att det är 100% baserat på faktiska källor.

---

## Förberedelse

### 1. Identifiera källor

- [ ] **BPMN-fil**: `________________.bpmn`
  - [ ] Verifierad att filen finns
  - [ ] Process-ID: `________________`
  - [ ] Call Activity-ID (om subprocess): `________________`

- [ ] **Feature Goal-fil**: `public/local-content/feature-goals/________________.html`
  - [ ] Verifierad att filen finns
  - [ ] Har sektion "Testgenerering": ✅ / ❌
  - [ ] Har testscenarion (S1, S2, etc.): ✅ / ❌
  - [ ] Har UI Flow-tabeller: ✅ / ❌

- [ ] **bpmn-map.json**: Verifierad koppling mellan BPMN-fil och Feature Goal

---

## Steg 1: Extrahera BPMN-information

### Noder i sekvensordning

Lista alla noder i BPMN-filen (från start till end):

1. **Node-ID**: `________________` | **Typ**: `________________` | **Namn**: `________________`
2. **Node-ID**: `________________` | **Typ**: `________________` | **Namn**: `________________`
3. **Node-ID**: `________________` | **Typ**: `________________` | **Namn**: `________________`
4. **Node-ID**: `________________` | **Typ**: `________________` | **Namn**: `________________`
5. **Node-ID**: `________________` | **Typ**: `________________` | **Namn**: `________________`

**Källa**: BPMN-fil direkt (parsa XML eller använd BpmnParser)

**Validering**:
- [ ] Alla node-ID:n är faktiska (verifierade mot BPMN-fil)
- [ ] Sekvensordning är korrekt (följer sequence flows)
- [ ] Inga node-ID:n är hittade på

---

## Steg 2: Extrahera Feature Goal testscenario

### Välj testscenario

- [ ] **Scenario-ID**: `S1` / `S2` / `S3` / `________________`
- [ ] **Namn**: `________________`
- [ ] **Typ**: `Happy` / `Edge` / `Error`
- [ ] **Prioritet**: `P0` / `P1` / `P2`

### Given/When/Then

**Given** (från Feature Goal):
```
________________
________________
________________
```

**When** (från Feature Goal):
```
________________
________________
________________
```

**Then** (från Feature Goal):
```
________________
________________
________________
```

**Validering**:
- [ ] Given/When/Then är kopierade direkt från Feature Goal
- [ ] Inga ändringar eller generaliseringar
- [ ] BPMN-node-ID:n i texten är korrekta

---

## Steg 3: Extrahera UI Flow (om finns)

### UI Flow-steg från Feature Goal

| Steg | Page ID | Action | Locator ID | Data Profile | Kommentar |
|------|---------|--------|------------|-------------|-----------|
| 1 | `________________` | `________________` | `________________` | `________________` | `________________` |
| 2 | `________________` | `________________` | `________________` | `________________` | `________________` |
| 3 | `________________` | `________________` | `________________` | `________________` | `________________` |

**Källa**: Feature Goal HTML, expanderad UI Flow-tabell

**Validering**:
- [ ] Alla UI Flow-steg är kopierade direkt från Feature Goal
- [ ] Page ID, Action, Locator ID matchar Feature Goal
- [ ] Om UI Flow saknas, markera: `[Saknas i Feature Goal]`

---

## Steg 4: Extrahera User Stories (för kontext)

### Relevant user story

**Persona**: `________________`
**Mål**: `________________`
**Värde**: `________________`
**Acceptanskriterier**: 
```
________________
________________
________________
```

**Källa**: Feature Goal HTML, sektion "User stories"

**Validering**:
- [ ] User story är relevant för testscenariot
- [ ] Acceptanskriterier innehåller BPMN-node-ID:n
- [ ] UI/UX-krav är specifika (inte generiska)

---

## Steg 5: Bygg teststeg

### För varje BPMN-nod, skapa teststeg

#### Teststeg 1: `[BPMN-node-ID]`

- [ ] **bpmnNodeId**: `________________` (exakt från BPMN)
- [ ] **bpmnNodeType**: `UserTask` / `ServiceTask` / `BusinessRuleTask` / `Gateway` / `CallActivity`
- [ ] **bpmnNodeName**: `________________` (exakt från BPMN)
- [ ] **action**: `________________` (från Feature Goal processbeskrivning eller user story)
- [ ] **uiInteraction**: `________________` (från Feature Goal UI Flow, om UserTask)
- [ ] **apiCall**: `________________` (från Feature Goal processbeskrivning, om ServiceTask)
- [ ] **dmnDecision**: `________________` (från Feature Goal processbeskrivning, om BusinessRuleTask)
- [ ] **assertion**: `________________` (från Feature Goal Then-sektion)
- [ ] **backendState**: `________________` (baserat på Feature Goal user stories)

**Källor**:
- BPMN-node-ID: BPMN-fil
- Action: Feature Goal processbeskrivning
- UI Interaction: Feature Goal UI Flow
- API Call: Feature Goal processbeskrivning eller user story
- Assertion: Feature Goal testscenario Then-sektion
- Backend State: Feature Goal user stories acceptanskriterier

**Validering**:
- [ ] Alla fält är fyllda med faktisk information (inte hittad på)
- [ ] Om information saknas, markera: `[Saknas i Feature Goal]` eller `[TODO: Verifiera]`
- [ ] Inga generiska beskrivningar

---

## Steg 6: Bygg subprocessSteps

### Call activities i huvudprocessen

#### Subprocess 1: `[Call Activity ID]`

- [ ] **order**: `1` / `2` / `3` / `________________`
- [ ] **bpmnFile**: `________________.bpmn` (exakt filnamn)
- [ ] **callActivityId**: `________________` (exakt från BPMN)
- [ ] **featureGoalFile**: `public/local-content/feature-goals/________________.html`
- [ ] **description**: `________________` (från Feature Goal processbeskrivning)
- [ ] **hasPlaywrightSupport**: `true` / `false`
- [ ] **given**: `________________` (från Feature Goal testscenario)
- [ ] **when**: `________________` (från Feature Goal testscenario)
- [ ] **then**: `________________` (från Feature Goal testscenario)

**Källa**: `bpmn-map.json` och Feature Goal

**Validering**:
- [ ] Call Activity ID matchar `bpmn-map.json`
- [ ] Feature Goal-fil är korrekt
- [ ] Given/When/Then matchar Feature Goal testscenario

---

## Steg 7: Bygg scenario-metadata

### Grundläggande information

- [ ] **id**: `FG_[PROCESS]_[SCENARIO]` (t.ex. `FG_KYC_S1`)
- [ ] **name**: `________________` (från Feature Goal testscenario namn)
- [ ] **priority**: `P0` / `P1` / `P2` (från Feature Goal)
- [ ] **type**: `happy-path` / `alt-path` / `error` (från Feature Goal)
- [ ] **iteration**: `Köp bostadsrätt` / `Köp villa` / `Flytta och höj bostadslån`
- [ ] **bpmnProcess**: `________________.bpmn` (exakt filnamn)
- [ ] **bpmnCallActivityId**: `________________` (om subprocess)
- [ ] **featureGoalFile**: `public/local-content/feature-goals/________________.html`
- [ ] **featureGoalTestId**: `Testgenerering / S1` / `Testgenerering / S2` / etc.
- [ ] **testFile**: `tests/playwright-e2e/scenarios/[type]/[name].spec.ts`
- [ ] **command**: `npx playwright test [testFile]`
- [ ] **summary**: `________________` (från Feature Goal testscenario)
- [ ] **given**: `________________` (från Feature Goal testscenario)
- [ ] **when**: `________________` (från Feature Goal testscenario)
- [ ] **then**: `________________` (från Feature Goal testscenario)
- [ ] **notesForBankProject**: `________________` (beskrivning av vad som behöver implementeras)

**Validering**:
- [ ] Alla fält är fyllda med faktisk information
- [ ] Feature Goal testscenario-ID matchar Feature Goal
- [ ] Testfil-sökväg följer konventioner

---

## Steg 8: Slutlig validering

### ✅ Alla krav uppfyllda

- [ ] Alla BPMN-node-ID:n är faktiska (verifierade mot BPMN-fil)
- [ ] Alla teststeg följer BPMN-sekvensordning
- [ ] Given/When/Then matchar Feature Goal testscenario exakt
- [ ] UI-interaktioner kommer från Feature Goal UI Flow (eller markerade som saknade)
- [ ] API-anrop är baserade på Feature Goal processbeskrivning (eller markerade som saknade)
- [ ] Assertions matchar Feature Goal Then-sektion
- [ ] Backend-tillstånd är baserade på Feature Goal user stories
- [ ] Inga generiska beskrivningar (alltid specifika node-ID:n)
- [ ] Saknad information är tydligt markerad (inte hittad på)
- [ ] SubprocessSteps matchar `bpmn-map.json`
- [ ] Scenario-metadata är komplett

### ❌ Röd flagga: Om något av detta finns

- [ ] Generiska beskrivningar utan BPMN-node-ID:n
- [ ] API-endpoints som inte finns i Feature Goal
- [ ] UI-interaktioner som inte finns i Feature Goal UI Flow (och inte markerade som saknade)
- [ ] Teststeg som inte följer BPMN-sekvensordning
- [ ] Assertions som inte matchar Feature Goal Then-sektion
- [ ] BPMN-node-ID:n som inte finns i BPMN-filen

---

## Dokumentation av brister

Om information saknas, dokumentera det här:

### Saknad information

1. **BPMN-node-ID**: `________________`
   - **Saknas**: `________________`
   - **Åtgärd**: `[TODO: Verifiera mot BPMN-fil]` / `[Saknas i Feature Goal]`

2. **UI Flow**: `________________`
   - **Saknas**: `________________`
   - **Åtgärd**: `[TODO: Extrahera från Feature Goal processbeskrivning]`

3. **API-endpoint**: `________________`
   - **Saknas**: `________________`
   - **Åtgärd**: `[TODO: Verifiera med bankprojektet]`

---

## Nästa steg

- [ ] Scenario är klar och validerad
- [ ] Lägg till i `E2eTestsOverviewPage.tsx` scenarios-array
- [ ] Skapa Playwright-testfil (om applicable)
- [ ] Uppdatera dokumentation

---

## Noteringar

- **Alltid börja med Feature Goal testscenarion**: De är redan strukturerade och realistiska
- **Använd BPMN-filer som sanning**: BPMN-node-ID:n och sekvensordning är fakta
- **Kombinera källor**: Feature Goals ger kontext, BPMN ger struktur
- **Dokumentera brister**: Om information saknas, dokumentera det tydligt istället för att hitta på
- **Iterera stegvis**: Bygg ett scenario i taget, validera, förbättra processen

