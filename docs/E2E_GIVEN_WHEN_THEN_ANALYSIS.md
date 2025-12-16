# Analys: Given/When/Then - Feature Goals vs Testfiler

**Datum:** 2025-01-XX  
**Syfte:** Analysera skillnaden mellan Given/When/Then från Feature Goals vs från faktiska testfiler (`bankProjectTestSteps`)

---

## Problem

### Nuvarande situation

1. **`subprocessSteps.given/when/then`** kommer från **Feature Goals**
   - Mer generiska beskrivningar
   - Kan sakna specifika API-anrop, DMN-beslut, backend states
   - Kan sakna specifika UI-interaktioner
   - Kan vara baserade på gamla versioner av Feature Goals

2. **`bankProjectTestSteps`** kommer från **faktisk BPMN-analys**
   - Mycket mer detaljerad och specifik
   - Innehåller exakta API-anrop (`GET /api/party/information`, `POST /api/application/kalp`)
   - Innehåller exakta DMN-beslut (`Pre-screen Party DMN = APPROVED`, `Screen KALP DMN = APPROVED`)
   - Innehåller exakta backend states (`Application.status = "COMPLETE"`, `Application.readyForEvaluation = true`)
   - Innehåller exakta UI-interaktioner (`Navigate: application-start`, `Fill: expenses-cars-loans`)
   - Innehåller exakta assertions

3. **Playwright-testet** använder `bankProjectTestSteps` som källa, inte `subprocessSteps.given/when/then`

### Exempel: Application subprocess

#### Från Feature Goal (`subprocessSteps`):
```
Given: En person ansöker om bolån för köp. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening via Pre-screen Party DMN). Fastigheten är bostadsrätt och uppfyller bankens krav (godkänd vid bedömning via Evaluate Bostadsrätt DMN). Testdata: customer-standard.

When: Systemet hämtar automatiskt befintlig kunddata (fetch-party-information, fetch-engagements) och visar den för kunden. Kunden fyller i hushållsekonomi (expenses: bilar + billån, barn, underhållsbidrag, andra utgifter; incomes: underhållsbidrag, andra inkomster). Systemet hämtar personlig information för stakeholder (fetch-personal-information). Kunden fyller i personlig ekonomi-information (inkomster: löner, andra inkomster; utgifter: boende, transport, andra utgifter). Kunden väljer objekttyp (Bostadsrätt) och anger värdering. Systemet värderar fastigheten om nödvändigt (valuate-property). Systemet beräknar automatiskt maximalt lånebelopp (KALP) och screenar resultatet (Screen KALP DMN = APPROVED). Kunden granskar sammanfattning av all information (intern data, hushåll, stakeholder, objekt) och bekräftar ansökan. Systemet hämtar kreditinformation automatiskt (fetch-credit-information).

Then: Kunden ser hämtad information med visuell markering av auto-ifyllda fält. Kunden ser en sammanfattning med tydliga rubriker (Intern data, Hushållsekonomi, Stakeholders, Objekt). Kunden bekräftar ansökan via tydlig Bekräfta-knapp. Kreditinformation är hämtad för alla stakeholders. Pre-screen Party DMN returnerar APPROVED. Screen KALP DMN returnerar APPROVED. KALP-beräkning är högre än ansökt belopp. Processen avslutas normalt (Event_0j4buhs) och ansökan är redo för kreditevaluering.
```

#### Från `bankProjectTestSteps` (faktisk BPMN-analys):
```
action: Kunden fyller i komplett ansökan (intern data, objekt, hushåll, stakeholder)

uiInteraction: Navigate: application-start (nav-application). Navigate: household (/application/household). Navigate: register-household-economy (/application/household/register). Fill: expenses-cars-loans (bilar + billån), expenses-children (barn), expenses-child-support (underhållsbidrag), expenses-other (andra utgifter), incomes-child-support (underhållsbidrag), incomes-other (andra inkomster). Click: submit-button. Verify: success-message. Navigate: stakeholders (nav-stakeholders) → stakeholder (nav-stakeholder). Navigate: register-personal-economy-information (/application/stakeholder/personal-economy). Fill: input-personal-income (löner, andra inkomster), input-personal-expenses (boende, transport, andra utgifter). Click: btn-submit-personal-economy. Verify: success-message. Navigate: object (nav-object). Select: select-property-type (Bostadsrätt). Fill: input-property-valuation. Click: btn-submit-object. Navigate: confirm-application (nav-confirm-application). Verify: summary-all-data (visar intern data, hushåll, stakeholder, objekt). Click: btn-confirm-application. Verify: success-message (ansökan bekräftad).

apiCall: GET /api/party/information (fetch-party-information), GET /api/party/engagements (fetch-engagements), GET /api/stakeholder/personal-information (fetch-personal-information), POST /api/valuation/property (valuate-property), POST /api/application/kalp, POST /api/application/fetch-credit-information

dmnDecision: Pre-screen Party DMN = APPROVED, Evaluate Bostadsrätt DMN = APPROVED, Screen KALP DMN = APPROVED

assertion: Ansökan är komplett och redo för kreditevaluering. All data är insamlad (intern data, hushåll, stakeholder, objekt). Pre-screen Party DMN returnerar APPROVED. KALP-beräkning är högre än ansökt belopp.

backendState: Application.status = "COMPLETE", Application.readyForEvaluation = true, Application.allDataCollected = true
```

### Skillnader

1. **API-anrop**: `bankProjectTestSteps` har exakta API-endpoints med HTTP-metoder
2. **UI-interaktioner**: `bankProjectTestSteps` har exakta page IDs, locator IDs, actions
3. **Backend states**: `bankProjectTestSteps` har exakta backend state-assertions
4. **DMN-beslut**: `bankProjectTestSteps` har exakta DMN-namn och resultat
5. **Struktur**: `bankProjectTestSteps` är strukturerad per BPMN-nod, medan `subprocessSteps` är en sammanfattning

---

## Rekommenderad arbetsprocess

### Nuvarande process (problematisk)
1. ✅ Skapa Feature Goals
2. ✅ Skapa `bankProjectTestSteps` baserat på BPMN-analys
3. ✅ Skapa Playwright-test baserat på `bankProjectTestSteps`
4. ❌ Skapa `subprocessSteps.given/when/then` baserat på Feature Goals (kan vara inaktuellt/inkorrekt)

### Förbättrad process (rekommenderad)

#### Steg 1: Skapa detaljerade testfiler baserat på BPMN
1. Analysera BPMN-filer systematiskt:
   - ServiceTasks → API-anrop
   - UserTasks → UI-interaktioner
   - BusinessRuleTasks → DMN-beslut
   - CallActivities → Subprocesser
   - Gateways → Beslutspunkter
   - Sequence flows → Körordning

2. Skapa `bankProjectTestSteps` med:
   - Exakta API-anrop (HTTP-metod, endpoint, service task ID)
   - Exakta UI-interaktioner (page IDs, locator IDs, actions)
   - Exakta DMN-beslut (DMN-namn, resultat)
   - Exakta backend states (objekt, properties, värden)
   - Exakta assertions

3. Skapa Playwright-test baserat på `bankProjectTestSteps`

#### Steg 2: Skapa Given/When/Then utifrån testfiler
1. **Given**: Kombinera initial state från:
   - `bankProjectTestSteps[0].backendState` (före testet)
   - Testdata-profil (customer-standard, application-commitment-happy, etc.)
   - Preconditions från BPMN (t.ex. "Objekt är inte utvärderat")

2. **When**: Kombinera actions från:
   - `bankProjectTestSteps[*].action` (vad som händer)
   - `bankProjectTestSteps[*].uiInteraction` (vad användaren gör)
   - `bankProjectTestSteps[*].apiCall` (vilka API-anrop som görs)
   - `bankProjectTestSteps[*].dmnDecision` (vilka DMN-beslut som fattas)

3. **Then**: Kombinera assertions från:
   - `bankProjectTestSteps[*].assertion` (vad som verifieras)
   - `bankProjectTestSteps[*].backendState` (slutligt backend-tillstånd)
   - `bankProjectTestSteps[last].backendState` (slutligt tillstånd efter hela subprocessen)

#### Steg 3: Validera mot Feature Goals
1. Jämför `subprocessSteps.given/when/then` (från testfiler) med Feature Goals
2. Identifiera skillnader:
   - Om Feature Goal är mer detaljerad → uppdatera testfilen
   - Om testfilen är mer detaljerad → behåll testfilen (den är baserad på faktisk BPMN)
3. Uppdatera Feature Goals om nödvändigt (om testfilen avslöjar fel i Feature Goals)

---

## Rekommenderad lösning för E2E_BR001

### Steg 1: Extrahera Given/When/Then från `bankProjectTestSteps`

För varje subprocess i `subprocessSteps`, aggregera information från relevanta `bankProjectTestSteps`:

#### Exempel: Application subprocess

**Given** (från initial state + testdata):
```
En person ansöker om bolån för köp. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening via Pre-screen Party DMN). Fastigheten är bostadsrätt och uppfyller bankens krav (godkänd vid bedömning via Evaluate Bostadsrätt DMN). Testdata: customer-standard.
```

**When** (från `bankProjectTestSteps[0]`):
```
Kunden navigerar till ansökningsstart (nav-application). Systemet hämtar automatiskt befintlig kunddata via GET /api/party/information (fetch-party-information) och GET /api/party/engagements (fetch-engagements) och visar den för kunden med visuell markering av auto-ifyllda fält. Kunden fyller i hushållsekonomi (expenses-cars-loans: bilar + billån, expenses-children: barn, expenses-child-support: underhållsbidrag, expenses-other: andra utgifter, incomes-child-support: underhållsbidrag, incomes-other: andra inkomster) och bekräftar. Systemet hämtar personlig information för stakeholder via GET /api/stakeholder/personal-information (fetch-personal-information). Kunden fyller i personlig ekonomi-information (input-personal-income: löner, andra inkomster, input-personal-expenses: boende, transport, andra utgifter) och bekräftar. Kunden väljer objekttyp (select-property-type: Bostadsrätt) och anger värdering (input-property-valuation). Systemet värderar fastigheten via POST /api/valuation/property (valuate-property). Systemet beräknar automatiskt maximalt lånebelopp via POST /api/application/kalp och screenar resultatet (Screen KALP DMN = APPROVED). Kunden granskar sammanfattning av all information (summary-all-data: visar intern data, hushåll, stakeholder, objekt) och bekräftar ansökan (btn-confirm-application). Systemet hämtar kreditinformation automatiskt via POST /api/application/fetch-credit-information.
```

**Then** (från `bankProjectTestSteps[0].assertion` + `backendState`):
```
Ansökan är komplett och redo för kreditevaluering. All data är insamlad (intern data, hushåll, stakeholder, objekt). Pre-screen Party DMN returnerar APPROVED. Screen KALP DMN returnerar APPROVED. KALP-beräkning är högre än ansökt belopp. Backend state: Application.status = "COMPLETE", Application.readyForEvaluation = true, Application.allDataCollected = true. Processen avslutas normalt (Event_0j4buhs) och ansökan är redo för kreditevaluering.
```

### Steg 2: Uppdatera `subprocessSteps.given/when/then`

Uppdatera alla `subprocessSteps` med Given/When/Then som är extraherade från `bankProjectTestSteps`, inte från Feature Goals.

### Steg 3: Skapa en funktion för automatisk extraktion (valfritt)

Skapa en funktion som automatiskt extraherar Given/When/Then från `bankProjectTestSteps`:

```typescript
function extractGivenWhenThenFromBankProjectTestSteps(
  bankProjectTestSteps: BankProjectTestStep[],
  subprocessCallActivityId: string
): { given: string; when: string; then: string } {
  // Filtrera steg som tillhör subprocessen
  const relevantSteps = bankProjectTestSteps.filter(
    step => step.bpmnNodeId === subprocessCallActivityId || 
    // ... logik för att identifiera steg som tillhör subprocessen
  );

  // Extrahera Given från initial state + testdata
  const given = extractGiven(relevantSteps);

  // Extrahera When från actions, UI-interaktioner, API-anrop, DMN-beslut
  const when = extractWhen(relevantSteps);

  // Extrahera Then från assertions + backend states
  const then = extractThen(relevantSteps);

  return { given, when, then };
}
```

---

## Slutsats

### Problem
- `subprocessSteps.given/when/then` kommer från Feature Goals (kan vara inaktuellt/inkorrekt)
- `bankProjectTestSteps` är mer detaljerad och baserad på faktisk BPMN-analys
- Playwright-testet använder `bankProjectTestSteps`, inte `subprocessSteps.given/when/then`

### Lösning
1. **Använd `bankProjectTestSteps` som primär källa** för Given/When/Then
2. **Uppdatera `subprocessSteps.given/when/then`** baserat på `bankProjectTestSteps`
3. **Validera mot Feature Goals** för att säkerställa att inget viktigt saknas
4. **Ändra arbetsprocessen** så att Given/When/Then skapas EFTER testfiler, inte före

### Fördelar
- ✅ Mer korrekt och detaljerad information
- ✅ Konsistent med Playwright-testet
- ✅ Baserat på faktisk BPMN-analys, inte dokumentation
- ✅ Mindre risk för inaktuell information
- ✅ Enklare att underhålla (en källa av sanning: `bankProjectTestSteps`)

### Nackdelar
- ⚠️ Kräver att `bankProjectTestSteps` är komplett innan Given/When/Then kan skapas
- ⚠️ Kan sakna kontext från Feature Goals (men kan läggas till manuellt)

---

## Nästa steg

1. ✅ Analysera skillnaden mellan Feature Goals och `bankProjectTestSteps` (denna fil)
2. ⏳ Extrahera Given/When/Then från `bankProjectTestSteps` för E2E_BR001
3. ⏳ Uppdatera `subprocessSteps.given/when/then` för E2E_BR001
4. ⏳ Validera mot Feature Goals
5. ⏳ Applicera samma process för framtida E2E-scenarion

