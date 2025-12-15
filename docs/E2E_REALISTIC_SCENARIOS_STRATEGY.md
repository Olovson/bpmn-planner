# Strategi: Realistiska E2E-scenarion utan fusk eller generalisering

## Syfte
Säkerställa att alla e2e-scenarion är **100% baserade på faktiska källor** (BPMN-filer, Feature Goals, user stories) och **aldrig hittar på eller generaliserar** information.

---

## Grundprinciper

### ✅ VIKTIGT: Vad vi ALLTID gör

1. **Extrahera från faktiska källor**: All information kommer från:
   - BPMN-filer (node-ID:n, typer, namn, sekvensflöden)
   - Feature Goal HTML-filer (testscenarion, UI Flow, user stories)
   - User stories (acceptanskriterier, UI-interaktioner)
   - `bpmn-map.json` (processstruktur, call activities)

2. **Använd exakta BPMN-node-ID:n**: Varje teststeg refererar till faktiska node-ID:n från BPMN-filerna

3. **Följ Feature Goal testscenarion**: Använd de strukturerade testscenarion (S1, S2, S3, etc.) som redan finns i Feature Goals

4. **Använd UI Flow från Feature Goals**: Varje Feature Goal har detaljerade UI Flow-tabeller med Page ID, Action, Locator ID, Data Profile

5. **Markera saknad information tydligt**: Om information saknas, markera det som `TODO` eller `[Saknas i Feature Goal]` istället för att hitta på

---

## Process: Skapa ett realistiskt E2E-scenario

### Steg 1: Identifiera Feature Goal och BPMN-fil

1. **Välj process** (t.ex. KYC, Offer, Signing)
2. **Hitta Feature Goal-fil** (t.ex. `mortgage-kyc-v2.html`)
3. **Hitta BPMN-fil** (t.ex. `mortgage-se-kyc.bpmn`)
4. **Verifiera koppling** i `bpmn-map.json`

### Steg 2: Extrahera BPMN-information

**Källor:**
- BPMN-filen direkt (parsa XML eller använd `BpmnParser`)
- `bpmn-map.json` för call activities och processstruktur

**Extrahera:**
- **Process-ID**: `mortgage-se-kyc`
- **Call Activity-ID** (om subprocess): `kyc`
- **Alla noder i sekvensordning**:
  - UserTask: `submit-self-declaration`, `review-kyc`
  - ServiceTask: `fetch-kyc`, `fetch-aml-kyc-risk`, `fetch-screening-and-sanctions`
  - BusinessRuleTask: `assess-kyc-aml`
  - Gateway: `kyc-questions-needed`, `needs-review`, `kyc-approved`
  - Events: `Event_0u9r5gv` (kyc-rejected escalation event)

**Metod:**
```typescript
// Använd BpmnParser eller läs BPMN XML direkt
const parseResult = await bpmnParser.parse(bpmnXml);
const nodes = parseResult.elements.filter(e => 
  e.type.includes('Task') || 
  e.type.includes('Gateway') || 
  e.type.includes('Event')
);
```

### Steg 3: Extrahera Feature Goal testscenarion

**Källor:**
- Feature Goal HTML-fil, sektion `Testgenerering`
- Tabell `Testscenarier` med S1, S2, S3, etc.
- Detaljerade `UI Flow`-tabeller per scenario

**Extrahera för varje scenario:**
- **ID**: `S1`, `S2`, etc.
- **Namn**: `Normalflöde – KYC godkänd automatiskt med självdeklaration`
- **Given/When/Then**: Från `Outcome`-kolumnen
- **UI Flow-steg**: Från expanderade `UI Flow`-tabellen
  - Page ID: `submit-self-declaration`
  - Action: `fill`, `click`, `navigate`, `verify`
  - Locator ID: `input-pep-status`, `btn-submit-declaration`
  - Data Profile: `customer-standard`
  - Kommentar: BPMN-node-referenser

**Exempel från KYC Feature Goal:**
```html
<tr>
  <td><strong>S1</strong></td>
  <td>Normalflöde – KYC godkänd automatiskt med självdeklaration</td>
  <td>Happy</td>
  <td>customer</td>
  <td>P0</td>
  <td>compliance</td>
  <td><strong>Given:</strong> Ny kund utan befintlig KYC-data... 
      <strong>When:</strong> "KYC questions needed?" gateway (kyc-questions-needed) = Yes...
      <strong>Then:</strong> "Needs review?" gateway (needs-review) = No...</td>
</tr>
```

### Steg 4: Extrahera User Stories (för kontext)

**Källor:**
- Feature Goal HTML-fil, sektion `User stories`
- Acceptanskriterier i user stories

**Extrahera:**
- **Persona**: `customer`, `advisor`, `system`
- **Mål**: Vad personan vill uppnå
- **Värde**: Varför det är viktigt
- **Acceptanskriterier**: Specifika UI/UX-krav, BPMN-node-referenser

**Exempel:**
```html
<li><strong>Som kund</strong> vill jag kunna verifiera min identitet...
    <em>Acceptanskriterier: "Submit self declaration" user task (submit-self-declaration) 
    ska kräva att kunder fyller i PEP-status...</em></li>
```

### Steg 5: Bygg teststeg från BPMN-noder i sekvensordning

**Metod:**
1. **Följ BPMN-sekvensflödet** (från start till end)
2. **För varje nod**, skapa ett teststeg med:
   - **bpmnNodeId**: Exakt ID från BPMN (t.ex. `submit-self-declaration`)
   - **bpmnNodeType**: `UserTask`, `ServiceTask`, `BusinessRuleTask`, `Gateway`, `CallActivity`
   - **bpmnNodeName**: Namn från BPMN (t.ex. `Submit self declaration`)
   - **action**: Baserat på nodtyp och Feature Goal UI Flow
   - **uiInteraction**: Från Feature Goal UI Flow (om UserTask)
   - **apiCall**: Från Feature Goal processbeskrivning (om ServiceTask)
   - **dmnDecision**: Från Feature Goal processbeskrivning (om BusinessRuleTask)
   - **assertion**: Från Feature Goal testscenario Then-sektion
   - **backendState**: Baserat på Feature Goal user stories och acceptanskriterier

**Exempel teststeg för KYC S1:**

```typescript
{
  bpmnNodeId: 'fetch-kyc',
  bpmnNodeType: 'ServiceTask',
  bpmnNodeName: 'Fetch KYC',
  action: 'Systemet hämtar automatiskt befintlig KYC-data från Internal KYC service',
  apiCall: 'GET /api/kyc/{customerId} (eller motsvarande integration mot Internal KYC service data store)',
  assertion: 'KYC-data är hämtad (eller null om ny kund)',
  backendState: 'KYC.existingData = null (för ny kund)',
},
{
  bpmnNodeId: 'kyc-questions-needed',
  bpmnNodeType: 'Gateway',
  bpmnNodeName: 'KYC questions needed?',
  action: 'Systemet avgör om självdeklaration behövs baserat på befintlig KYC-data',
  assertion: 'Gateway avgör Yes (för ny kund utan befintlig data)',
  backendState: 'KYC.questionsNeeded = true',
},
{
  bpmnNodeId: 'submit-self-declaration',
  bpmnNodeType: 'UserTask',
  bpmnNodeName: 'Submit self declaration',
  action: 'Kunden fyller i självdeklaration för KYC-compliance',
  uiInteraction: 'Fyll i PEP-status (No), källa till medel, syfte med transaktionen, klicka "Skicka in"',
  apiCall: 'POST /api/kyc/{id}/self-declaration (eller motsvarande API)',
  assertion: 'Självdeklaration är sparad och validerad',
  backendState: 'KYC.selfDeclaration.complete = true, KYC.selfDeclaration.pepStatus = "NO"',
},
```

### Steg 6: Bygg subprocessSteps från call activities

**Metod:**
1. **Identifiera call activities** i huvudprocessen (från `bpmn-map.json`)
2. **För varje call activity**, skapa en subprocessStep med:
   - **order**: Körordning i huvudprocessen
   - **bpmnFile**: BPMN-filnamn (t.ex. `mortgage-se-kyc.bpmn`)
   - **callActivityId**: Call activity ID (t.ex. `kyc`)
   - **featureGoalFile**: Feature Goal-fil (t.ex. `mortgage-kyc-v2.html`)
   - **description**: Från Feature Goal processbeskrivning
   - **given/when/then**: Från Feature Goal testscenarion

**Exempel:**
```typescript
{
  order: 1,
  bpmnFile: 'mortgage-se-kyc.bpmn',
  callActivityId: 'kyc',
  featureGoalFile: 'public/local-content/feature-goals/mortgage-kyc-v2.html',
  description: 'KYC-processen – verifierar kundens identitet och compliance',
  hasPlaywrightSupport: false, // Sätt till true när testet är implementerat
  given: 'Ny kund utan befintlig KYC-data. Låg AML-risk, ingen PEP/sanktionsmatch.',
  when: 'KYC-processen körs automatiskt för varje stakeholder',
  then: 'KYC är godkänd automatiskt, processen fortsätter till credit-evaluation',
},
```

### Steg 7: Validera mot Feature Goal testscenarion

**Kontrollera:**
1. **Alla BPMN-noder i sekvens** är täckta i teststeg
2. **UI Flow-steg** från Feature Goal matchar teststeg
3. **Given/When/Then** från Feature Goal matchar scenario-beskrivningen
4. **User stories** är reflekterade i teststeg (särskilt UI-interaktioner)

---

## Hantera saknad information

### ❌ ALDRIG göra

1. **Hitta på BPMN-node-ID:n**: Om ID saknas, markera som `[Saknas i BPMN]`
2. **Hitta på API-endpoints**: Om API saknas, markera som `[Saknas i Feature Goal]` eller `[TODO: Verifiera med bankprojektet]`
3. **Hitta på UI-interaktioner**: Om UI Flow saknas, markera som `[Saknas i Feature Goal]`
4. **Generalisera**: Använd alltid specifika BPMN-node-ID:n och Feature Goal-referenser

### ✅ Gör istället

1. **Markera saknad information tydligt**:
   ```typescript
   {
     bpmnNodeId: '[Saknas i BPMN - verifiera mot mortgage-se-kyc.bpmn]',
     action: '[TODO: Extrahera från Feature Goal processbeskrivning]',
     apiCall: '[TODO: Verifiera med bankprojektet - vilket API används?]',
   }
   ```

2. **Använd Feature Goal processbeskrivning**: Om UI Flow saknas, använd processbeskrivningen som referens

3. **Använd user stories**: Om UI Flow saknas, använd user stories acceptanskriterier

4. **Dokumentera brister**: Skapa en lista över saknad information som behöver kompletteras

---

## Verktyg och hjälpfunktioner

### 1. Extrahera BPMN-noder från fil

```typescript
// Pseudokod för att extrahera noder från BPMN-fil
async function extractBpmnNodes(bpmnFile: string): Promise<BpmnNode[]> {
  const bpmnXml = await readFile(bpmnFile);
  const parser = new BpmnParser();
  const parseResult = await parser.parse(bpmnXml);
  
  return parseResult.elements
    .filter(e => 
      e.type.includes('Task') || 
      e.type.includes('Gateway') || 
      e.type.includes('Event') ||
      e.type.includes('CallActivity')
    )
    .map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      // Extrahera sekvensordning från DI coordinates eller sequence flows
    }));
}
```

### 2. Extrahera testscenarion från Feature Goal

```typescript
// Pseudokod för att extrahera testscenarion från Feature Goal HTML
function extractTestScenarios(featureGoalHtml: string): TestScenario[] {
  // Parse HTML och hitta "Testgenerering" sektion
  // Extrahera tabell med testscenarion (S1, S2, S3, etc.)
  // Extrahera UI Flow-tabeller för varje scenario
  // Returnera strukturerad data
}
```

### 3. Kombinera BPMN-noder med Feature Goal testscenarion

```typescript
// Pseudokod för att kombinera information
function buildTestSteps(
  bpmnNodes: BpmnNode[],
  testScenario: TestScenario
): BankProjectTestStep[] {
  // Följ BPMN-sekvensordning
  // För varje nod, matcha mot Feature Goal UI Flow
  // Bygg teststeg med faktiska node-ID:n och UI Flow-information
  // Markera saknad information tydligt
}
```

---

## Exempel: Komplett process för KYC-scenario

### 1. Identifiera källor

- **BPMN-fil**: `mortgage-se-kyc.bpmn`
- **Feature Goal**: `mortgage-kyc-v2.html`
- **Call Activity**: `kyc` (från `mortgage.bpmn`)

### 2. Extrahera BPMN-noder (från BPMN-fil)

```
1. fetch-kyc (ServiceTask)
2. kyc-questions-needed (Gateway)
3. submit-self-declaration (UserTask) [om Yes]
4. fetch-aml-kyc-risk (ServiceTask)
5. fetch-screening-and-sanctions (ServiceTask)
6. assess-kyc-aml (BusinessRuleTask)
7. needs-review (Gateway)
8. review-kyc (UserTask) [om Yes]
9. kyc-approved (Gateway) [om review]
10. Event_0u9r5gv (EscalationEvent) [om No]
```

### 3. Extrahera testscenario S1 (från Feature Goal)

- **ID**: `S1`
- **Namn**: `Normalflöde – KYC godkänd automatiskt med självdeklaration`
- **Given**: Ny kund utan befintlig KYC-data. Låg AML-risk, ingen PEP/sanktionsmatch.
- **When**: "KYC questions needed?" gateway = Yes. Självdeklaration skickas. AML/KYC riskpoäng och sanktionsscreening hämtas. "Evaluate KYC/AML" godkänner.
- **Then**: "Needs review?" gateway = No. Processen avslutas normalt. KYC godkänd automatiskt.

### 4. Extrahera UI Flow (från Feature Goal)

```
1. navigate → kyc-start → nav-kyc
2. navigate → submit-self-declaration → nav-self-declaration
3. fill → submit-self-declaration → input-pep-status → "No"
4. fill → submit-self-declaration → input-source-of-funds → "..."
5. fill → submit-self-declaration → input-purpose-of-transaction → "..."
6. click → submit-self-declaration → btn-submit-declaration
7. verify → fetch-aml-kyc-risk → api-aml-risk-score
8. verify → fetch-screening-and-sanctions → api-sanctions-pep-screening
9. verify → assess-kyc-aml → dmn-evaluate-kyc-aml-approved
10. verify → needs-review → gateway-needs-review-no
11. verify → kyc-completed → success-message-kyc-approved
```

### 5. Bygg teststeg (kombinera BPMN + Feature Goal)

```typescript
bankProjectTestSteps: [
  {
    bpmnNodeId: 'fetch-kyc',
    bpmnNodeType: 'ServiceTask',
    bpmnNodeName: 'Fetch KYC',
    action: 'Systemet hämtar automatiskt befintlig KYC-data från Internal KYC service data store',
    apiCall: 'GET /api/kyc/{customerId} (eller motsvarande integration mot Internal KYC service data store)',
    assertion: 'KYC-data är hämtad (null för ny kund)',
    backendState: 'KYC.existingData = null',
  },
  {
    bpmnNodeId: 'kyc-questions-needed',
    bpmnNodeType: 'Gateway',
    bpmnNodeName: 'KYC questions needed?',
    action: 'Systemet avgör om självdeklaration behövs baserat på befintlig KYC-data',
    assertion: 'Gateway avgör Yes (för ny kund utan befintlig data)',
    backendState: 'KYC.questionsNeeded = true',
  },
  {
    bpmnNodeId: 'submit-self-declaration',
    bpmnNodeType: 'UserTask',
    bpmnNodeName: 'Submit self declaration',
    action: 'Kunden fyller i självdeklaration för KYC-compliance',
    uiInteraction: 'Fyll i PEP-status (No), källa till medel, syfte med transaktionen, klicka "Skicka in"',
    apiCall: 'POST /api/kyc/{id}/self-declaration (eller motsvarande API)',
    assertion: 'Självdeklaration är sparad och validerad',
    backendState: 'KYC.selfDeclaration.complete = true, KYC.selfDeclaration.pepStatus = "NO"',
  },
  // ... resten av stegen
]
```

---

## Checklista: Validera att scenario är realistiskt

### ✅ Alla krav uppfyllda

- [ ] Alla BPMN-node-ID:n är faktiska (verifierade mot BPMN-fil)
- [ ] Alla teststeg följer BPMN-sekvensordning
- [ ] Given/When/Then matchar Feature Goal testscenario
- [ ] UI-interaktioner kommer från Feature Goal UI Flow
- [ ] API-anrop är baserade på Feature Goal processbeskrivning eller user stories
- [ ] Assertions matchar Feature Goal Then-sektion
- [ ] Backend-tillstånd är baserade på Feature Goal user stories
- [ ] Inga generiska beskrivningar (alltid specifika node-ID:n)
- [ ] Saknad information är tydligt markerad (inte hittad på)

### ❌ Röd flagga: Om något av detta finns

- [ ] Generiska beskrivningar utan BPMN-node-ID:n
- [ ] API-endpoints som inte finns i Feature Goal
- [ ] UI-interaktioner som inte finns i Feature Goal UI Flow
- [ ] Teststeg som inte följer BPMN-sekvensordning
- [ ] Assertions som inte matchar Feature Goal Then-sektion

---

## Nästa steg

1. **Implementera verktyg**: Skapa hjälpfunktioner för att extrahera BPMN-noder och Feature Goal testscenarion
2. **Skapa första scenario**: Använd processen ovan för att skapa KYC S1-scenario
3. **Validera**: Gå igenom checklistan för att säkerställa att scenariot är realistiskt
4. **Iterera**: Förbättra processen baserat på erfarenhet

---

## Noteringar

- **Alltid börja med Feature Goal testscenarion**: De är redan strukturerade och realistiska
- **Använd BPMN-filer som sanning**: BPMN-node-ID:n och sekvensordning är fakta
- **Kombinera källor**: Feature Goals ger kontext, BPMN ger struktur
- **Dokumentera brister**: Om information saknas, dokumentera det tydligt istället för att hitta på
- **Iterera stegvis**: Bygg ett scenario i taget, validera, förbättra processen

