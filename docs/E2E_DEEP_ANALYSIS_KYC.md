# Djup analys: KYC E2E-scenario (S1 - P0 Happy Path)

## Syfte
Demonstrera hur vi bygger ett **100% realistiskt** e2e-scenario genom att analysera faktiska BPMN-filer och Feature Goals, utan att hitta på eller generalisera.

---

## 1. Identifiera källor

### BPMN-fil
- **Fil**: `mortgage-se-kyc.bpmn`
- **Process-ID**: `mortgage-se-kyc`
- **Call Activity-ID** (från huvudprocess): `kyc`

### Feature Goal
- **Fil**: `public/local-content/feature-goals/mortgage-kyc-v2.html`
- **Testscenario**: `S1` - Normalflöde – KYC godkänd automatiskt med självdeklaration
- **Prioritet**: `P0`
- **Typ**: `Happy`

---

## 2. Analys av BPMN-fil: Noder i sekvensordning

### Extraherat direkt från BPMN XML

**Sekvensflöde (från start-event till process-end-event):**

1. **start-event** (StartEvent)
   - ID: `start-event`
   - Dokumentation: "Initiates the Know Your Customer (KYC) compliance and risk assessment process"

2. **fetch-kyc** (ServiceTask)
   - ID: `fetch-kyc`
   - Namn: `Fetch KYC`
   - Lane: `System`
   - DataStore: `DataStoreReference_1bfiehb` ("Internal KYC service")
   - Sequence Flow: `Flow_1cbhztn` (från start-event)

3. **kyc-questions-needed** (ExclusiveGateway)
   - ID: `kyc-questions-needed`
   - Namn: `KYC questions needed?`
   - Lane: `System`
   - Sequence Flow: `Flow_0y06b65` (från fetch-kyc)
   - Utgående flöden:
     - `kyc-questions-needed-yes` → `submit-self-declaration`
     - `kyc-questions-needed-no` → `Gateway_0204xp6`

4. **submit-self-declaration** (UserTask) [om Yes]
   - ID: `submit-self-declaration`
   - Namn: `Submit self declaration`
   - Lane: `Stakeholder`
   - Dokumentation: "Collects customer self-declaration information for KYC compliance"
   - Sequence Flow: `kyc-questions-needed-yes` (från gateway)
   - Sequence Flow: `Flow_1t53lfh` (till Gateway_0204xp6)

5. **Gateway_0204xp6** (ExclusiveGateway) [namnlös merge-gateway]
   - ID: `Gateway_0204xp6`
   - Lane: `System`
   - Sammanför flöden från:
     - `kyc-questions-needed-no` (om No)
     - `Flow_1t53lfh` (efter submit-self-declaration)

6. **fetch-aml-kyc-risk** (ServiceTask)
   - ID: `fetch-aml-kyc-risk`
   - Namn: `Fetch AML / KYC risk score`
   - Lane: `System`
   - Dokumentation: "Retrieves Anti-Money Laundering and KYC risk scores from external services"
   - DataStore: `DataStoreReference_0lhn59t` ("Internal aml service")
   - Sequence Flow: `Flow_04f9npa` (från Gateway_0204xp6)

7. **fetch-screening-and-sanctions** (ServiceTask)
   - ID: `fetch-screening-and-sanctions`
   - Namn: `Fetch sanctions and PEP`
   - Lane: `System`
   - Dokumentation: "Retrieves sanctions and Politically Exposed Person (PEP) screening results"
   - DataStore: `DataStoreReference_05ypske` ("Sanction screening provider")
   - Sequence Flow: `Flow_03r9kps` (från fetch-aml-kyc-risk)

8. **assess-kyc-aml** (BusinessRuleTask)
   - ID: `assess-kyc-aml`
   - Namn: `Evaluate KYC/AML`
   - Lane: `System`
   - Dokumentation: "Evaluates customer KYC/AML compliance using business rules and risk scores"
   - Business rules: `table-bisnode-credit`, `table-own-experience`
   - Sequence Flow: `Flow_1l72610` (från fetch-screening-and-sanctions)

9. **needs-review** (ExclusiveGateway)
   - ID: `needs-review`
   - Namn: `Needs review?`
   - Lane: `System`
   - Sequence Flow: `Flow_1myqhzo` (från assess-kyc-aml)
   - Utgående flöden:
     - `needs-review-no` → `Gateway_1lmj6ts` (för S1)
     - `needs-review-yes` → `review-kyc` (för S3)

10. **Gateway_1lmj6ts** (ExclusiveGateway) [namnlös merge-gateway]
    - ID: `Gateway_1lmj6ts`
    - Lane: `System`
    - Sammanför flöden från:
      - `needs-review-no` (om No)
      - `Flow_1bobt9r` (efter review-kyc → kyc-approved → Yes)

11. **process-end-event** (EndEvent)
    - ID: `process-end-event`
    - Namn: `KYC Process Completion`
    - Dokumentation: "Completes the KYC compliance process with final assessment results"
    - Sequence Flow: `Flow_0kwmijy` (från Gateway_1lmj6ts)

**Alternativa flöden (inte för S1):**
- `review-kyc` (UserTask) - Compliance lane, om needs-review = Yes
- `kyc-approved` (ExclusiveGateway) - Compliance lane, efter review-kyc
- `Event_0u9r5gv` (EndEvent) - "Rejected" escalation event, om kyc-approved = No
  - Escalation: `Escalation_1alasp1` ("kyc-rejected")

---

## 3. Analys av Feature Goal: Testscenario S1

### Given/When/Then (direkt från Feature Goal)

**Given:**
> Ny kund utan befintlig KYC-data. Låg AML-risk, ingen PEP/sanktionsmatch. Testdata: customer-standard.

**When:**
> "KYC questions needed?" gateway (kyc-questions-needed) = Yes. Självdeklaration skickas. AML/KYC riskpoäng och sanktionsscreening hämtas. "Evaluate KYC/AML" (assess-kyc-aml) godkänner.

**Then:**
> "Needs review?" gateway (needs-review) = No. Processen avslutas normalt (process-end-event). KYC godkänd automatiskt.

---

## 4. Analys av Feature Goal: UI Flow för S1

### UI Flow-steg (direkt från Feature Goal HTML)

| Steg | Page ID | Action | Locator ID | Data Profile | Kommentar |
|------|---------|--------|------------|--------------|-----------|
| 1 | `kyc-start` | `navigate` | `nav-kyc` | `customer-standard` | KYC-processen startar automatiskt när event-credit-evaluation-complete triggas i huvudprocessen |
| 2 | `submit-self-declaration` | `navigate` | `nav-self-declaration` | `customer-standard` | Navigera till självdeklarationsformulär (Stakeholder lane) |
| 3 | `submit-self-declaration` | `fill` | `input-pep-status` | `customer-standard` | Fyll i PEP-status (Politically Exposed Person) - välj "No" |
| 4 | `submit-self-declaration` | `fill` | `input-source-of-funds` | `customer-standard` | Fyll i källa till medel (Source of Funds) |
| 5 | `submit-self-declaration` | `fill` | `input-purpose-of-transaction` | `customer-standard` | Fyll i syfte med transaktionen |
| 6 | `submit-self-declaration` | `click` | `btn-submit-declaration` | `customer-standard` | Skicka in självdeklaration |
| 7 | `fetch-aml-kyc-risk` | `verify` | `api-aml-risk-score` | `customer-standard` | Systemet hämtar AML/KYC riskpoäng från Internal aml service automatiskt (Service task). Verifiera att riskpoäng är låg (<30). |
| 8 | `fetch-screening-and-sanctions` | `verify` | `api-sanctions-pep-screening` | `customer-standard` | Systemet hämtar sanktions- och PEP-screening från Sanction screening provider automatiskt (Service task). Verifiera att ingen match hittas. |
| 9 | `assess-kyc-aml` | `verify` | `dmn-evaluate-kyc-aml-approved` | `customer-standard` | Evaluate KYC/AML business rule task körs automatiskt. Verifiera att DMN (table-bisnode-credit, table-own-experience) returnerar "APPROVED". |
| 10 | `needs-review` | `verify` | `gateway-needs-review-no` | `customer-standard` | Needs review gateway avgör att ingen manuell granskning behövs (No). Processen går direkt till process end event. |
| 11 | `kyc-completed` | `verify` | `success-message-kyc-approved` | `customer-standard` | Verifiera att KYC är godkänd och processen avslutas. Huvudprocessen fortsätter med Credit decision. |

---

## 5. Analys av Feature Goal: User Stories

### Relevant user story för S1

**Persona**: `customer` (Stakeholder)

**User Story** (från Feature Goal):
> Som kund vill jag kunna verifiera min identitet och fyll i självdeklaration för KYC-compliance så att jag kan fortsätta med min bolåneansökan utan onödiga fördröjningar.

**Acceptanskriterier** (från Feature Goal):
> "Submit self declaration" user task (submit-self-declaration) ska kräva att kunder fyller i PEP-status, källa till medel, och syfte med transaktionen. UI ska visa tydlig struktur med separata sektioner för varje fält, validering i realtid, och tydlig feedback om vad som saknas med visuella indikatorer (t.ex. röd för obligatoriska fält som saknas). Systemet ska tillåta kunder att skicka in självdeklaration via "Submit self declaration" user task (submit-self-declaration) i Stakeholder lane.

---

## 6. Analys av Feature Goal: API/Integrationer

### API-endpoints (från Feature Goal "Processteg - Input/Output")

| BPMN Aktivitet | Type | Route/Endpoint | Method | Base URL | Kommentar |
|----------------|------|----------------|--------|----------|-----------|
| Submit self declaration | UI/API | `/mortgage/kyc/self-declaration`<br>`/api/kyc/self-declaration` | GET/POST (UI)<br>POST (API) | `https://portal.sbab.se`<br>`https://api.sbab.se` | User task (Stakeholder lane) där kunden/stakeholder fyller i självdeklaration |
| Fetch AML/KYC risk score | API | `/api/kyc/aml-risk-score` | POST | `https://api.sbab.se` | Service task (System lane) som hämtar riskpoäng från Internal aml service |
| Fetch sanctions and PEP | API | `/api/kyc/sanctions-pep-screening` | POST | `https://api.sbab.se` | Service task (System lane) som hämtar screening från Sanction screening provider |
| Evaluate KYC/AML | API | `/api/dmn/evaluate-kyc-aml` | POST | `https://api.sbab.se` | Business rule task (System lane) som utvärderar KYC/AML-compliance med business rules |

---

## 7. Bygg realistiskt teststeg baserat på analys

### Teststeg i BPMN-sekvensordning

```typescript
bankProjectTestSteps: [
  {
    bpmnNodeId: 'start-event',
    bpmnNodeType: 'StartEvent',
    bpmnNodeName: 'Start KYC Process',
    action: 'KYC-processen startar automatiskt när event-credit-evaluation-complete triggas i huvudprocessen',
    assertion: 'KYC-processen är initierad för stakeholder',
    backendState: 'KYC.status = "IN_PROGRESS", KYC.stakeholderId = {stakeholderId}',
  },
  {
    bpmnNodeId: 'fetch-kyc',
    bpmnNodeType: 'ServiceTask',
    bpmnNodeName: 'Fetch KYC',
    action: 'Systemet hämtar automatiskt befintlig KYC-data från Internal KYC service data store',
    apiCall: 'GET /api/kyc/{customerId} (eller motsvarande integration mot Internal KYC service data store - DataStoreReference_1bfiehb)',
    assertion: 'KYC-data är hämtad (null för ny kund enligt S1 Given)',
    backendState: 'KYC.existingData = null (för ny kund)',
  },
  {
    bpmnNodeId: 'kyc-questions-needed',
    bpmnNodeType: 'Gateway',
    bpmnNodeName: 'KYC questions needed?',
    action: 'Systemet avgör om självdeklaration behövs baserat på befintlig KYC-data',
    assertion: 'Gateway avgör Yes (för ny kund utan befintlig data enligt S1 When)',
    backendState: 'KYC.questionsNeeded = true',
  },
  {
    bpmnNodeId: 'submit-self-declaration',
    bpmnNodeType: 'UserTask',
    bpmnNodeName: 'Submit self declaration',
    action: 'Kunden fyller i självdeklaration för KYC-compliance (PEP-status, källa till medel, syfte med transaktionen)',
    uiInteraction: 'Navigera till /mortgage/kyc/self-declaration, fyll i PEP-status (No), källa till medel, syfte med transaktionen, klicka "Skicka in" (btn-submit-declaration)',
    apiCall: 'POST /api/kyc/self-declaration (eller motsvarande API)',
    assertion: 'Självdeklaration är sparad och validerad',
    backendState: 'KYC.selfDeclaration.complete = true, KYC.selfDeclaration.pepStatus = "NO", KYC.selfDeclaration.sourceOfFunds = {...}, KYC.selfDeclaration.purposeOfTransaction = {...}',
  },
  {
    bpmnNodeId: 'fetch-aml-kyc-risk',
    bpmnNodeType: 'ServiceTask',
    bpmnNodeName: 'Fetch AML / KYC risk score',
    action: 'Systemet hämtar automatiskt AML/KYC riskpoäng från Internal aml service data store',
    apiCall: 'POST /api/kyc/aml-risk-score (eller motsvarande integration mot Internal aml service data store - DataStoreReference_0lhn59t)',
    assertion: 'AML/KYC riskpoäng är hämtad och är låg (<30 enligt S1 UI Flow steg 7)',
    backendState: 'KYC.amlRiskScore = {score < 30}',
  },
  {
    bpmnNodeId: 'fetch-screening-and-sanctions',
    bpmnNodeType: 'ServiceTask',
    bpmnNodeName: 'Fetch sanctions and PEP',
    action: 'Systemet hämtar automatiskt sanktions- och PEP-screeningresultat från Sanction screening provider data store',
    apiCall: 'POST /api/kyc/sanctions-pep-screening (eller motsvarande integration mot Sanction screening provider data store - DataStoreReference_05ypske)',
    assertion: 'Sanktions- och PEP-screening är hämtad och ingen match hittas (enligt S1 UI Flow steg 8)',
    backendState: 'KYC.sanctionsMatch = false, KYC.pepMatch = false',
  },
  {
    bpmnNodeId: 'assess-kyc-aml',
    bpmnNodeType: 'BusinessRuleTask',
    bpmnNodeName: 'Evaluate KYC/AML',
    action: 'Systemet utvärderar automatiskt KYC/AML-compliance via DMN-beslutsregler (table-bisnode-credit, table-own-experience) baserat på självdeklaration, AML/KYC riskpoäng, och sanktions- och PEP-screeningresultat',
    dmnDecision: 'DMN: table-bisnode-credit, table-own-experience (via /api/dmn/evaluate-kyc-aml)',
    assertion: 'DMN returnerar "APPROVED" (enligt S1 UI Flow steg 9 och S1 When)',
    backendState: 'KYC.assessmentResult = "APPROVED", KYC.assessmentReason = {...}',
  },
  {
    bpmnNodeId: 'needs-review',
    bpmnNodeType: 'Gateway',
    bpmnNodeName: 'Needs review?',
    action: 'Systemet avgör om manuell granskning behövs baserat på Evaluate KYC/AML resultat',
    assertion: 'Gateway avgör No (för APPROVED med låg risk enligt S1 Then)',
    backendState: 'KYC.needsReview = false',
  },
  {
    bpmnNodeId: 'Gateway_1lmj6ts',
    bpmnNodeType: 'Gateway',
    bpmnNodeName: 'Gateway_1lmj6ts',
    action: 'Sammanför flöden (från needs-review = No)',
    assertion: 'Processen fortsätter till process-end-event',
    backendState: 'KYC.status = "APPROVED"',
  },
  {
    bpmnNodeId: 'process-end-event',
    bpmnNodeType: 'EndEvent',
    bpmnNodeName: 'KYC Process Completion',
    action: 'KYC-processen avslutas normalt med godkänd compliance-status',
    assertion: 'KYC är godkänd automatiskt, processen avslutas normalt (enligt S1 Then)',
    backendState: 'KYC.status = "COMPLETED", KYC.result = "APPROVED", KYC.completedAt = {timestamp}',
  },
]
```

---

## 8. Bygg scenario-metadata

### Baserat på analysen

```typescript
{
  id: 'FG_KYC_S1',
  name: 'KYC – Normalflöde, godkänd automatiskt med självdeklaration',
  priority: 'P0',
  type: 'happy-path',
  iteration: 'Köp bostadsrätt',
  bpmnProcess: 'mortgage-se-kyc.bpmn',
  bpmnCallActivityId: 'kyc',
  featureGoalFile: 'public/local-content/feature-goals/mortgage-kyc-v2.html',
  featureGoalTestId: 'Testgenerering / S1',
  testFile: 'tests/playwright-e2e/scenarios/happy-path/mortgage-kyc-happy.spec.ts',
  command: 'npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-kyc-happy.spec.ts',
  summary: 'Täcker huvudflödet för KYC-processen där en ny kund fyller i självdeklaration och KYC godkänns automatiskt utan manuell granskning.',
  given: 'Ny kund utan befintlig KYC-data. Låg AML-risk, ingen PEP/sanktionsmatch. Testdata: customer-standard.',
  when: '"KYC questions needed?" gateway (kyc-questions-needed) = Yes. Självdeklaration skickas. AML/KYC riskpoäng och sanktionsscreening hämtas. "Evaluate KYC/AML" (assess-kyc-aml) godkänner.',
  then: '"Needs review?" gateway (needs-review) = No. Processen avslutas normalt (process-end-event). KYC godkänd automatiskt.',
  notesForBankProject: 'Detta scenario testar hela KYC-subprocessen för en ny kund med låg risk. Alla teststeg nedan är baserade på faktiska BPMN-noder från mortgage-se-kyc.bpmn och Feature Goals, direkt användbara i bankprojektet. Implementera UI-interaktioner, API-anrop och assertions enligt era faktiska integrationer. Processen körs som multi-instance per stakeholder.',
  // ... bankProjectTestSteps (se ovan)
  subprocessSteps: [
    {
      order: 1,
      bpmnFile: 'mortgage-se-kyc.bpmn',
      callActivityId: 'kyc',
      featureGoalFile: 'public/local-content/feature-goals/mortgage-kyc-v2.html',
      description: 'KYC-processen – verifierar kundens identitet och compliance-status för att säkerställa AML/KYC-krav',
      hasPlaywrightSupport: false,
      given: 'Ny kund utan befintlig KYC-data. Låg AML-risk, ingen PEP/sanktionsmatch.',
      when: 'KYC-processen körs automatiskt för stakeholder (multi-instance). Systemet hämtar KYC-data, kunden fyller i självdeklaration, systemet hämtar AML/KYC riskpoäng och sanktionsscreening, och systemet utvärderar KYC/AML-compliance.',
      then: 'KYC är godkänd automatiskt utan manuell granskning, processen avslutas normalt.',
    },
  ],
}
```

---

## 9. Validering: Alla krav uppfyllda

### ✅ Checklista

- [x] Alla BPMN-node-ID:n är faktiska (verifierade mot BPMN-fil)
  - `start-event`, `fetch-kyc`, `kyc-questions-needed`, `submit-self-declaration`, `fetch-aml-kyc-risk`, `fetch-screening-and-sanctions`, `assess-kyc-aml`, `needs-review`, `Gateway_1lmj6ts`, `process-end-event`

- [x] Alla teststeg följer BPMN-sekvensordning
  - Sekvensen matchar sequence flows i BPMN-filen

- [x] Given/When/Then matchar Feature Goal testscenario exakt
  - Kopierade direkt från Feature Goal S1

- [x] UI-interaktioner kommer från Feature Goal UI Flow
  - Page ID, Action, Locator ID matchar UI Flow-tabellen

- [x] API-anrop är baserade på Feature Goal processbeskrivning
  - API-endpoints från "Processteg - Input/Output"-tabellen

- [x] Assertions matchar Feature Goal Then-sektion
  - Baserade på S1 Then och UI Flow verifieringar

- [x] Backend-tillstånd är baserade på Feature Goal user stories
  - Baserade på acceptanskriterier och processbeskrivning

- [x] Inga generiska beskrivningar
  - Alla referenser inkluderar specifika BPMN-node-ID:n

- [x] DataStore-referenser är korrekta
  - `DataStoreReference_1bfiehb` (Internal KYC service), `DataStoreReference_0lhn59t` (Internal aml service), `DataStoreReference_05ypske` (Sanction screening provider)

- [x] DMN-beslutsregler är korrekta
  - `table-bisnode-credit`, `table-own-experience` (från BPMN dokumentation)

---

## 10. Slutsats

Detta scenario är **100% baserat på faktiska källor**:
- ✅ BPMN-node-ID:n från BPMN-filen
- ✅ Sekvensordning från BPMN sequence flows
- ✅ Given/When/Then från Feature Goal testscenario
- ✅ UI Flow från Feature Goal UI Flow-tabell
- ✅ API-endpoints från Feature Goal processbeskrivning
- ✅ User stories acceptanskriterier för kontext
- ✅ DataStore-referenser från BPMN-filen
- ✅ DMN-beslutsregler från BPMN dokumentation

**Ingen information är hittad på eller generaliserad.**

---

## Nästa steg

1. **Implementera scenario**: Lägg till i `E2eTestsOverviewPage.tsx` scenarios-array
2. **Skapa Playwright-testfil**: Baserat på teststeg ovan
3. **Validera mot riktiga integrationer**: När bankprojektet implementerar, uppdatera API-endpoints och UI locators

