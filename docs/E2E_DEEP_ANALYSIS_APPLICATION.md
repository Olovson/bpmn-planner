# Djup analys: Application E2E-scenarion

## Syfte
Göra en ordentlig analys av Application-processen för att identifiera de viktigaste e2e-scenarion baserat på faktiska BPMN-filer och user stories, med fokus på realistiska scenarion inklusive kund med medsökare.

---

## 1. Analys av BPMN-struktur: mortgage-se-application.bpmn

### Huvudflöde (sekvensordning från start-event)

1. **Event_0isinbn** (StartEvent)
   - Processen startar när Application anropas från Mortgage huvudprocessen

2. **internal-data-gathering** (CallActivity)
   - **Multi-instance**: ✅ Ja (`<bpmn:multiInstanceLoopCharacteristics />`)
   - Körs per identifierad part (huvudansökande, medsökare, etc.)
   - **Boundary Event**: `Event_03349px` → `Event_1uj7wwd` ("Party rejected")
   - Error: `Error_1vtortg` ("pre-screen-rejected")

3. **object** (CallActivity)
   - Samlar in grundläggande objektinformation
   - Körs INNAN stakeholders-subprocessen
   - **Boundary Event**: `Event_152muhg` → `Event_07jlrhu` ("Object rejected")
   - Error: `Error_1pe398g` ("object-rejected")

4. **stakeholders** (SubProcess) - "Per household"
   - **Multi-instance**: ✅ Ja (`<bpmn:multiInstanceLoopCharacteristics />`)
   - Körs per hushåll
   - **Innehåll** (sekventiellt för varje hushåll):
     - `household` (CallActivity) - hushållsekonomi för den specifika stakeholder:n
     - `stakeholder` (CallActivity) - personlig information och bedömning
       - **Multi-instance**: ✅ Ja (körs per stakeholder i hushållet)
   - **Boundary Event**: `Event_1dhapnx` → `Event_1uk9ycv` ("Stakeholder rejected")
   - Error: `Error_0xx0ma1` ("stakeholder-rejected")

5. **skip-confirm-application** (ExclusiveGateway)
   - Avgör om bekräftelsesteget ska hoppas över
   - **Yes** → `Gateway_1nszp2i` → `fetch-credit-information`
   - **No** → `Activity_0p3rqyp` (KALP)

6. **Activity_0p3rqyp** (ServiceTask) - "KALP"
   - Beräknar maximalt lånebelopp
   - DataStore: `DataStoreReference_07kqoi1` ("KALP")

7. **Activity_1mezc6h** (BusinessRuleTask) - "Screen KALP"
   - Utvärderar KALP-resultat mot affärsregler
   - Dokumentation: "For purchase: KALP Max Loan below threshold : reject, KALP Max Loan below applied amount: set applied loan to Max Loan. Above applied: No change. For move/refinance: KALP Max Loan below applied amount: reject"

8. **Gateway_0fhav15** (ExclusiveGateway) - "KALP OK?"
   - **Yes** → `confirm-application`
   - **No** → `application-rejected` (Error: `Error_08o6vkh`)

9. **confirm-application** (UserTask)
   - Kunden bekräftar ansökan
   - **Boundary Event**: `Event_0ao6cvb` (Timer) → `Event_111g1im` ("Timeout")
   - Error: `Error_1bicfvu` ("application-timeout")

10. **Gateway_1nszp2i** (ExclusiveGateway) - "Sammanför flöden"
    - Samlar ihop flöden från:
      - `skip-confirm-application-yes` (om bekräftelse hoppades över)
      - `Flow_1kf7xpl` (efter confirm-application)

11. **fetch-credit-information** (ServiceTask)
    - **Multi-instance**: ✅ Ja (`<bpmn:multiInstanceLoopCharacteristics />`)
    - Körs per stakeholder
    - DataStore: `DataStoreReference_0i5y9x3` ("Personal credit information source")
    - Dokumentation: "T.ex UC3. Per stakeholder"

12. **Event_0j4buhs** (EndEvent)
    - Processen avslutas normalt

---

## 2. Viktiga strukturella detaljer

### Multi-instance struktur

1. **internal-data-gathering**: Multi-instance per part
   - Om ansökan har huvudansökande + medsökare, körs den 2 gånger (parallellt)

2. **stakeholders subprocess**: Multi-instance per household
   - Om det finns 2 hushåll, körs subprocessen 2 gånger (parallellt)
   - Inne i varje subprocess:
     - `household` (CallActivity) - körs 1 gång per hushåll
     - `stakeholder` (CallActivity) - **multi-instance** per stakeholder i hushållet
       - Om hushåll 1 har 2 stakeholders, körs stakeholder 2 gånger för hushåll 1

3. **fetch-credit-information**: Multi-instance per stakeholder
   - Körs för alla stakeholders i alla hushåll

### Parallella flöden

- **Household** (call activity på huvudnivå) körs parallellt med **stakeholders** subprocess
- Men inne i stakeholders subprocess körs Household → Stakeholder → Object sekventiellt

**VIKTIGT**: Det finns TVÅ olika Household-call activities:
1. `household` på huvudnivå (parallellt med stakeholders)
2. `household` inne i stakeholders subprocess (sekventiellt före stakeholder)

---

## 3. Analys av Feature Goal testscenarion

### S1: Normalflöde – komplett ansökan med en person (P0)
- **Status**: ✅ Planerad
- **Prioritet**: P0
- **Given**: En person ansöker om bolån för köp. Personen uppfyller alla grundläggande krav.
- **BPMN-referens**: Pre-screening → objekt → hushåll/stakeholders → KALP-beräkning → bekräftelse → kreditupplysning

### S2: Normalflöde – ansökan med flera personer och hushåll (P0) ⭐ VIKTIGT
- **Status**: ✅ Planerad
- **Prioritet**: P0
- **Given**: Flera personer ansöker tillsammans med separata hushåll. Alla personer är godkända.
- **When**: Kunden fyller i information för flera hushåll parallellt. Systemet bearbetar varje hushåll individuellt med sekventiell körning (Household → Stakeholder → Object) per hushåll.
- **BPMN-referens**: Två parallella flöden startar: (1) Household för alla hushåll parallellt, (2) Per household subprocess med sekventiell körning (Household → Stakeholder → Object) per hushåll.

**Detta är scenariot användaren vill ha - kund med medsökare!**

### S3: Pre-screen avvisad (P0)
- **Status**: ✅ Planerad
- **Prioritet**: P0
- **BPMN-referens**: Pre-screen Party DMN returnerar REJECTED. Boundary event Event_03349px triggas.

### S4: Stakeholder avvisad – medlåntagare uppfyller inte krav (P1)
- **Status**: ✅ Planerad
- **Prioritet**: P1
- **Given**: Flera personer ansöker tillsammans. Medlåntagare uppfyller INTE kraven.
- **BPMN-referens**: Assess Stakeholder DMN returnerar REJECTED. Boundary event Event_1dhapnx triggas.

---

## 4. Problem med befintligt S1-scenario

### Befintliga teststeg är INTE korrekta

**Nuvarande teststeg (felaktigt):**
```typescript
{
  bpmnNodeId: 'stakeholder',
  bpmnNodeType: 'CallActivity',
  // ...
},
{
  bpmnNodeId: 'household',
  bpmnNodeType: 'CallActivity',
  // ...
},
```

**Problem:**
1. `stakeholder` och `household` visas som separata call activities på samma nivå
2. Men i BPMN är `stakeholder` inne i `stakeholders` subprocess
3. `household` finns på TVÅ nivåer:
   - Huvudnivå (parallellt med stakeholders)
   - Inne i stakeholders subprocess (sekventiellt före stakeholder)

**Korrekt struktur:**
```
1. internal-data-gathering (multi-instance per part)
2. object
3. stakeholders (subprocess, multi-instance per household)
   - household (call activity, 1 gång per hushåll)
   - stakeholder (call activity, multi-instance per stakeholder i hushållet)
4. skip-confirm-application (gateway)
5. KALP (service task) [om No]
6. Screen KALP (business rule task) [om No]
7. KALP OK? (gateway)
8. confirm-application (user task) [om Yes]
9. Gateway_1nszp2i (sammanför flöden)
10. fetch-credit-information (multi-instance per stakeholder)
11. Event_0j4buhs (end event)
```

---

## 5. Rekommenderade viktigaste scenarion

### P0 (Kritiska happy path)

1. **S1: En person** ✅ (behöver korrigeras)
   - En huvudansökande
   - Ett hushåll
   - En stakeholder
   - Objekt
   - KALP-beräkning
   - Bekräftelse
   - Kreditupplysning

2. **S2: Flera personer med medsökare** ⭐ (SAKNAS - VIKTIGT!)
   - Huvudansökande + medsökare
   - Ett eller flera hushåll
   - Multi-instance stakeholder
   - Objekt
   - KALP-beräkning
   - Bekräftelse
   - Kreditupplysning för alla stakeholders

### P0 (Kritiska error paths)

3. **S3: Pre-screen avvisad** ✅ (finns redan)
4. **S4: Stakeholder avvisad** (P1, men viktigt för medsökare-scenario)

---

## 6. Bygg korrekt S2-scenario: Kund med medsökare

### Scenario-metadata

```typescript
{
  id: 'FG_APPLICATION_S2',
  name: 'Application – Normalflöde, ansökan med flera personer (huvudansökande + medsökare)',
  priority: 'P0',
  type: 'happy-path',
  iteration: 'Köp bostadsrätt',
  bpmnProcess: 'mortgage-se-application.bpmn',
  bpmnCallActivityId: 'application',
  featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
  featureGoalTestId: 'Testgenerering / S2',
  testFile: 'tests/playwright-e2e/scenarios/happy-path/mortgage-application-multi-stakeholder.spec.ts',
  command: 'npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-application-multi-stakeholder.spec.ts',
  summary: 'Täcker huvudflödet för Application-subprocessen där en kund med medsökare fyller i en komplett ansökan. Processen testar multi-instance hantering för internal-data-gathering, stakeholders subprocess, och fetch-credit-information.',
  given: 'Flera personer ansöker tillsammans med separata hushåll. Alla personer är godkända. Testdata: customer-multi-household.',
  when: 'Kunden fyller i information för flera hushåll parallellt. Kunden kan öppna både Household- och Stakeholders-formulären samtidigt i separata flikar/fönster för varje hushåll. Systemet bearbetar varje hushåll individuellt med sekventiell körning (Household → Stakeholder → Object) per hushåll.',
  then: 'Kunden kan se status för varje hushåll med tydliga statusindikatorer (t.ex. "Pågår", "Klar", "Fel"). Varje hushåll bearbetas i rätt ordning. Kunden kan spara progress i varje formulär oberoende av varandra. Alla hushåll och personer är bearbetade. Processen fortsätter när båda flöden är klara.',
  notesForBankProject: 'Detta scenario testar hela Application-subprocessen med flera personer (huvudansökande + medsökare). Alla teststeg nedan är baserade på faktiska BPMN-noder från mortgage-se-application.bpmn och Feature Goals, direkt användbara i bankprojektet. Processen testar multi-instance hantering för internal-data-gathering (per part), stakeholders subprocess (per household), stakeholder call activity (per stakeholder i hushållet), och fetch-credit-information (per stakeholder).',
  // ... teststeg nedan
}
```

### Teststeg i korrekt BPMN-sekvensordning

```typescript
bankProjectTestSteps: [
  {
    bpmnNodeId: 'Event_0isinbn',
    bpmnNodeType: 'StartEvent',
    bpmnNodeName: 'Start Application',
    action: 'Application-processen startar när den anropas från Mortgage huvudprocessen',
    assertion: 'Application-processen är initierad',
    backendState: 'Application.status = "IN_PROGRESS"',
  },
  {
    bpmnNodeId: 'internal-data-gathering',
    bpmnNodeType: 'CallActivity',
    bpmnNodeName: 'Internal data gathering',
    action: 'Systemet hämtar automatiskt befintlig kunddata från interna system och gör pre-screening för varje identifierad part (multi-instance per part)',
    apiCall: 'GET /api/customer/{id}, GET /api/engagements/{id}, GET /api/credit-information/{id} (eller motsvarande integrationer) - körs för huvudansökande OCH medsökare parallellt',
    assertion: 'Kunddata är hämtad för alla parter (huvudansökande och medsökare), pre-screening är godkänd för alla',
    backendState: 'Application.internalDataGathered = true, Application.parts.length = 2 (huvudansökande + medsökare), Application.parts[0].preScreenResult.status = "APPROVED", Application.parts[1].preScreenResult.status = "APPROVED"',
  },
  {
    bpmnNodeId: 'object',
    bpmnNodeType: 'CallActivity',
    bpmnNodeName: 'Object',
    action: 'Kunden anger grundläggande objektinformation (körs INNAN stakeholders subprocess)',
    uiInteraction: 'Fyll i fastighetsinformation (adress, typ, pris), klicka "Spara"',
    apiCall: 'POST /api/application/{id}/object (eller motsvarande API)',
    assertion: 'Objektinformation är sparad och validerad',
    backendState: 'Application.objectData.complete = true, Application.objectData.status = "APPROVED"',
  },
  {
    bpmnNodeId: 'stakeholders',
    bpmnNodeType: 'SubProcess',
    bpmnNodeName: 'Per household',
    action: 'Stakeholders subprocess startar (multi-instance per household). För varje hushåll körs sekventiellt: Household → Stakeholder (multi-instance) → Object',
    assertion: 'Stakeholders subprocess är initierad för alla hushåll',
    backendState: 'Application.stakeholdersSubprocess.status = "IN_PROGRESS", Application.stakeholdersSubprocess.households.length = {antal hushåll}',
  },
  {
    bpmnNodeId: 'household',
    bpmnNodeType: 'CallActivity',
    bpmnNodeName: 'Household',
    action: 'Inne i stakeholders subprocess: Kunden fyller i hushållsekonomi för den specifika stakeholder:n (körs 1 gång per hushåll, sekventiellt före stakeholder)',
    uiInteraction: 'Fyll i inkomster, utgifter, lån och tillgångar för hushållet, klicka "Spara"',
    apiCall: 'POST /api/application/{id}/household/{householdId} (eller motsvarande API)',
    assertion: 'Hushållsekonomi är sparad för hushållet',
    backendState: 'Application.households[{householdId}].householdData.complete = true',
  },
  {
    bpmnNodeId: 'stakeholder',
    bpmnNodeType: 'CallActivity',
    bpmnNodeName: 'Stakeholder',
    action: 'Inne i stakeholders subprocess: Kunden fyller i stakeholder-information (multi-instance per stakeholder i hushållet). För hushåll 1: körs för huvudansökande OCH medsökare',
    uiInteraction: 'Fyll i formulär för huvudansökande med persondata, klicka "Spara". Fyll i formulär för medsökare med persondata, klicka "Spara"',
    apiCall: 'POST /api/application/{id}/stakeholders/{stakeholderId} (eller motsvarande API) - körs för varje stakeholder',
    assertion: 'Stakeholder-information är sparad och validerad för alla stakeholders (huvudansökande och medsökare)',
    backendState: 'Application.stakeholders.length = 2 (huvudansökande + medsökare), Application.stakeholders[0].status = "APPROVED", Application.stakeholders[1].status = "APPROVED"',
  },
  {
    bpmnNodeId: 'skip-confirm-application',
    bpmnNodeType: 'Gateway',
    bpmnNodeName: 'Skip step?',
    action: 'Systemet avgör om bekräftelsesteget ska hoppas över',
    assertion: 'Gateway avgör No (bekräftelse ska INTE hoppas över för S2)',
    backendState: 'Application.skipConfirm = false',
  },
  {
    bpmnNodeId: 'Activity_0p3rqyp',
    bpmnNodeType: 'ServiceTask',
    bpmnNodeName: 'KALP',
    action: 'Systemet beräknar automatiskt maximalt lånebelopp baserat på hushållsekonomi för alla hushåll',
    apiCall: 'POST /api/application/{id}/kalp (eller motsvarande API)',
    assertion: 'KALP-beräkning är klar och visar maximalt lånebelopp',
    backendState: 'Application.kalpResult.maxLoanAmount = {belopp}, Application.kalpResult.status = "CALCULATED"',
  },
  {
    bpmnNodeId: 'Activity_1mezc6h',
    bpmnNodeType: 'BusinessRuleTask',
    bpmnNodeName: 'Screen KALP',
    action: 'Systemet utvärderar KALP-resultat mot affärsregler (för köp: om maximalt < tröskelvärde → reject, om maximalt < ansökt → justera, om maximalt >= ansökt → no change)',
    dmnDecision: 'Screen KALP DMN (affärsregler för köp vs flytt/omlåning)',
    assertion: 'DMN returnerar APPROVED (maximalt belopp >= ansökt belopp)',
    backendState: 'Application.kalpScreenResult.status = "APPROVED"',
  },
  {
    bpmnNodeId: 'Gateway_0fhav15',
    bpmnNodeType: 'Gateway',
    bpmnNodeName: 'KALP OK?',
    action: 'Systemet avgör om KALP-beräkning och screening är godkänd',
    assertion: 'Gateway avgör Yes (KALP är OK)',
    backendState: 'Application.kalpApproved = true',
  },
  {
    bpmnNodeId: 'confirm-application',
    bpmnNodeType: 'UserTask',
    bpmnNodeName: 'Confirm application',
    action: 'Kunden bekräftar ansökan med alla stakeholders (huvudansökande + medsökare)',
    uiInteraction: 'Granska sammanfattning av ansökan med information för alla stakeholders, klicka "Bekräfta ansökan"',
    apiCall: 'POST /api/application/{id}/confirm (eller motsvarande API)',
    assertion: 'Ansökan är bekräftad och redo för kreditevaluering',
    backendState: 'Application.status = "CONFIRMED", Application.readyForCreditEvaluation = true',
  },
  {
    bpmnNodeId: 'Gateway_1nszp2i',
    bpmnNodeType: 'Gateway',
    bpmnNodeName: 'Gateway_1nszp2i',
    action: 'Sammanför flöden (från confirm-application)',
    assertion: 'Processen fortsätter till fetch-credit-information',
    backendState: 'Application.status = "READY_FOR_CREDIT_INFORMATION"',
  },
  {
    bpmnNodeId: 'fetch-credit-information',
    bpmnNodeType: 'ServiceTask',
    bpmnNodeName: 'Fetch credit information',
    action: 'Systemet hämtar automatiskt kreditinformation från externa källor (t.ex. UC3) för alla stakeholders (multi-instance per stakeholder)',
    apiCall: 'POST /api/credit-information/fetch (eller motsvarande integration mot Personal credit information source - UC3) - körs för huvudansökande OCH medsökare parallellt',
    assertion: 'Kreditinformation är hämtad för alla stakeholders (huvudansökande och medsökare)',
    backendState: 'Application.creditInformation.length = 2, Application.creditInformation[0].stakeholderId = {huvudansökande}, Application.creditInformation[1].stakeholderId = {medsökare}, Application.creditInformation[0].status = "FETCHED", Application.creditInformation[1].status = "FETCHED"',
  },
  {
    bpmnNodeId: 'Event_0j4buhs',
    bpmnNodeType: 'EndEvent',
    bpmnNodeName: 'Application completed',
    action: 'Application-processen avslutas normalt',
    assertion: 'Ansökan är komplett och redo för kreditevaluering i Mortgage huvudprocessen',
    backendState: 'Application.status = "COMPLETED", Application.readyForCreditEvaluation = true',
  },
]
```

### SubprocessSteps

```typescript
subprocessSteps: [
  {
    order: 1,
    bpmnFile: 'mortgage-se-application.bpmn',
    callActivityId: 'internal-data-gathering',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-se-internal-data-gathering-v2.html',
    description: 'Intern datainsamling – systemet hämtar befintlig kunddata och gör initial pre-screening för varje part (multi-instance).',
    hasPlaywrightSupport: false,
    given: 'Huvudansökande och medsökare är identifierade och har befintlig data i banksystemen.',
    when: 'Systemet hämtar intern kunddata automatiskt och gör pre-screening mot grundläggande krav för varje part parallellt.',
    then: 'Kunddata är hämtad för alla parter, pre-screening är godkänd för huvudansökande och medsökare.',
  },
  {
    order: 2,
    bpmnFile: 'mortgage-se-application.bpmn',
    callActivityId: 'object',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-se-application-object-v2.html',
    description: 'Objektinformation – kunden anger uppgifter om bostadsrätt/fastighet.',
    hasPlaywrightSupport: false,
    given: 'En bostadsrätt/fastighet som kunden vill köpa och som ska ligga till grund för lånet.',
    when: 'Kunden fyller i objektformulär med uppgifter om bostadsrätt/fastighet (adress, typ, pris, etc.).',
    then: 'Objektinformationen är komplett och uppfyller kraven för att kunna värderas och användas som säkerhet.',
  },
  {
    order: 3,
    bpmnFile: 'mortgage-se-application.bpmn',
    callActivityId: 'stakeholders',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
    description: 'Stakeholders subprocess "Per household" – för varje hushåll körs sekventiellt: Household → Stakeholder (multi-instance) → Object.',
    hasPlaywrightSupport: false,
    given: 'Ett eller flera hushåll med huvudansökande och eventuella medsökare som ska ingå i ansökan.',
    when: 'Stakeholders subprocess körs per hushåll (multi-instance). För varje hushåll: kunden fyller i hushållsekonomi, sedan fyller kunden i stakeholder-information för alla stakeholders i hushållet (huvudansökande + medsökare).',
    then: 'Alla hushåll är bearbetade. För varje hushåll: hushållsekonomi är komplett, alla stakeholders (huvudansökande + medsökare) har kompletta och validerade stakeholder-profiler.',
  },
  {
    order: 4,
    bpmnFile: 'mortgage-se-application.bpmn',
    callActivityId: 'household',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-se-application-household-v2.html',
    description: 'Hushållsekonomi inne i stakeholders subprocess – kunden fyller i inkomster, utgifter, lån och tillgångar för den specifika stakeholder:n.',
    hasPlaywrightSupport: false,
    given: 'Hushåll som ska utvärderas för ansökan, med behov av komplett ekonomisk information.',
    when: 'Kunden fyller i inkomster, utgifter, lån och tillgångar per hushåll i household-formuläret (körs sekventiellt före stakeholder per hushåll).',
    then: 'Hushållsekonomi är komplett och kan användas för KALP-beräkning och kreditbedömning.',
  },
  {
    order: 5,
    bpmnFile: 'mortgage-se-application.bpmn',
    callActivityId: 'stakeholder',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-se-application-stakeholder-v2.html',
    description: 'Stakeholder-information inne i stakeholders subprocess – kunden fyller i personuppgifter för alla parter (multi-instance per stakeholder i hushållet).',
    hasPlaywrightSupport: false,
    given: 'Huvudansökande och medsökare som ska ingå i ansökan.',
    when: 'Kunden fyller i stakeholder-formulär med persondata för alla parter i ansökan (huvudansökande + medsökare). Processen körs multi-instance per stakeholder.',
    then: 'Alla definierade parter (huvudansökande + medsökare) har kompletta och validerade stakeholder-profiler kopplade till ansökan.',
  },
]
```

---

## 7. Korrigera befintligt S1-scenario

Befintliga teststeg behöver korrigeras för att reflektera korrekt BPMN-struktur:

1. Ta bort `stakeholder` och `household` som separata call activities på huvudnivå
2. Lägg till `stakeholders` subprocess med korrekt struktur
3. Uppdatera sekvensordning för att matcha BPMN

---

## 8. Slutsats och rekommendationer

### Viktigaste scenarion att etablera

1. **S1: En person** (P0) - ✅ Finns, men behöver korrigeras
2. **S2: Flera personer med medsökare** (P0) - ❌ SAKNAS - VIKTIGT!
3. **S3: Pre-screen avvisad** (P0) - ✅ Finns
4. **S4: Stakeholder avvisad** (P1) - Kan läggas till senare

### Nästa steg

1. **Korrigera S1**: Uppdatera teststeg för att matcha korrekt BPMN-struktur
2. **Skapa S2**: Implementera scenario för kund med medsökare (P0, högsta prioritet)
3. **Validera**: Gå igenom BPMN-strukturen noggrant för att säkerställa att teststeg är korrekta

