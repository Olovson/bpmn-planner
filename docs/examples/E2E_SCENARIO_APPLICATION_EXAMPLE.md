# Exempel: E2E-scenario output för Application Feature Goal

**Datum:** 2025-12-22  
**Syfte:** Exempel på vad outputten skulle kunna bli för Feature Goal "Application" baserat på den uppdaterade E2E-scenario prompten.

**Scenario:** En sökande - Bostadsrätt godkänd automatiskt (Happy Path)

---

## JSON Output

```json
{
  "id": "e2e-happy-path-application-1",
  "name": "En sökande - Bostadsrätt godkänd automatiskt (Happy Path)",
  "priority": "P1",
  "type": "happy-path",
  "iteration": "Köp bostadsrätt - En sökande",
  "summary": "Komplett E2E-scenario för en person som köper sin första bostadsrätt. Bostadsrätten uppfyller alla kriterier automatiskt (värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV ≤ 85%, plats acceptabel). Processen går genom Application (ansökan), Credit Evaluation (kreditbedömning), Offer (erbjudande), Document Generation (dokumentgenerering), Disbursement (utbetalning) och Collateral Registration (panträttsregistrering).",
  "given": "En person köper sin första bostadsrätt. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening via Pre-screen Party DMN). Bostadsrätten uppfyller alla kriterier automatiskt: värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV-ratio ≤ 85%, plats är acceptabel (inte riskområde). Ingen befintlig fastighet att sälja.",
  "when": "Kunden fyller i komplett ansökan (Application) med personuppgifter, inkomst och önskat lånebelopp. Systemet hämtar kunddata från externa källor automatiskt via internal-data-gathering. Kunden registrerar hushållets inkomster och utgifter (household). Kunden kompletterar personlig information (stakeholder). Kunden fyller i bostadsrättens uppgifter och systemet värderar objektet (object). Credit Evaluation utvärderar kreditvärdigheten och godkänner automatiskt. KYC godkänns automatiskt med självdeklaration. Credit Decision godkänner. Kunden accepterar erbjudandet (Offer). Systemet genererar dokument (Document Generation). Kunden signerar digitalt. Systemet genomför utbetalning (Disbursement). Handläggaren registrerar säkerhet (Collateral Registration) och distribuerar meddelande om panträtt till BRF.",
  "then": "Hela processen från Application till Collateral Registration slutförs utan fel. Application är komplett med all nödvändig data (personuppgifter, inkomst, hushållsekonomi, objektinformation). Credit Evaluation godkänner automatiskt. Offer accepteras av kunden. Document Generation genererar alla nödvändiga dokument. Disbursement genomförs framgångsrikt. Collateral Registration registrerar säkerhet och meddelande om panträtt distribueras till BRF. Alla relevanta DMN-beslut (Pre-screen Party DMN, Evaluate Bostadsrätt DMN, Screen KALP DMN) ger utfall som leder till godkännande.",
  "notesForBankProject": "Detta är det enklaste och vanligaste E2E-scenariot - en person, ingen befintlig fastighet, allt godkänns automatiskt. Alla teststeg nedan är baserade på faktiska BPMN-noder från mortgage.bpmn och Feature Goals, direkt användbara i bankprojektet.",
  "bankProjectTestSteps": [
    {
      "bpmnNodeId": "application",
      "bpmnNodeType": "CallActivity",
      "bpmnNodeName": "Application",
      "action": "Kunden fyller i komplett ansökan (Application) med personuppgifter, inkomst och önskat lånebelopp. Systemet hämtar kunddata automatiskt via internal-data-gathering. Kunden registrerar hushållets inkomster och utgifter (household). Kunden kompletterar personlig information (stakeholder). Kunden fyller i bostadsrättens uppgifter och systemet värderar objektet (object). Kunden bekräftar ansökan.",
      "assertion": "Application är komplett och redo för kreditevaluering. All data är insamlad (personuppgifter, inkomst, önskat lånebelopp, hushållsekonomi, objektinformation). Pre-screen Party DMN returnerar APPROVED. Evaluate Bostadsrätt DMN returnerar APPROVED. Screen KALP DMN returnerar APPROVED. KALP-beräkning är högre än ansökt belopp."
    },
    {
      "bpmnNodeId": "credit-evaluation",
      "bpmnNodeType": "CallActivity",
      "bpmnNodeName": "Credit Evaluation",
      "action": "Credit Evaluation utvärderar kreditvärdigheten baserat på insamlad data från Application. Systemet bedömer risknivå och kreditvärdighet automatiskt.",
      "assertion": "Credit Evaluation är slutförd och godkänner ansökan automatiskt. Riskbedömning är klar och kreditvärdighet är godkänd. Ansökan är redo för Credit Decision."
    },
    {
      "bpmnNodeId": "offer",
      "bpmnNodeType": "CallActivity",
      "bpmnNodeName": "Offer",
      "action": "Systemet genererar erbjudande baserat på Credit Evaluation-resultat. Kunden accepterar erbjudandet.",
      "assertion": "Offer är genererat och accepterat av kunden. Erbjudandet innehåller korrekt lånebelopp, ränta och villkor."
    },
    {
      "bpmnNodeId": "document-generation",
      "bpmnNodeType": "CallActivity",
      "bpmnNodeName": "Document Generation",
      "action": "Systemet genererar alla nödvändiga dokument baserat på accepterat erbjudande. Kunden signerar dokument digitalt.",
      "assertion": "Alla nödvändiga dokument är genererade och signerade av kunden. Dokument är redo för utbetalning."
    },
    {
      "bpmnNodeId": "disbursement",
      "bpmnNodeType": "CallActivity",
      "bpmnNodeName": "Disbursement",
      "action": "Systemet genomför utbetalning baserat på signerade dokument. Utbetalning sker automatiskt till angiven mottagare.",
      "assertion": "Utbetalning är slutförd framgångsrikt. Beloppet är överfört till angiven mottagare. Transaktionen är registrerad."
    },
    {
      "bpmnNodeId": "collateral-registration",
      "bpmnNodeType": "CallActivity",
      "bpmnNodeName": "Collateral Registration",
      "action": "Handläggaren registrerar säkerhet (panträtt) baserat på utbetalning. Handläggaren distribuerar meddelande om panträtt till BRF.",
      "assertion": "Säkerhet är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Collateral Registration är slutförd."
    }
  ],
  "subprocessSteps": [
    {
      "order": 1,
      "bpmnFile": "mortgage-se-application.bpmn",
      "callActivityId": "application",
      "description": "Application – Komplett ansökan med en person",
      "given": "En person ansöker om bolån för köp av bostadsrätt. Kunden är redan godkänd i förhandsbedömning via Pre-screen Party DMN. Bostadsrätten uppfyller bankens grundkrav enligt Evaluate Bostadsrätt DMN (värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV ≤ 85%).",
      "when": "Kunden går in i ansökningsflödet (Application). Systemet hämtar kund- och engagemangsdata automatiskt via internal-data-gathering (fetch-party-information, fetch-engagements). Kunden registrerar hushållets inkomster och utgifter (household - register-household-economy-information). Kunden kompletterar personlig information (stakeholder - register-personal-economy-information). Kunden fyller i bostadsrättens uppgifter och systemet värderar objektet (object - valuate-property). Systemet beräknar KALP och screenar resultatet via Screen KALP DMN. Kunden granskar sammanfattningen och bekräftar ansökan (confirm-application).",
      "then": "Alla relevanta steg i Application-processen har körts. Intern data är uppdaterad via internal-data-gathering. Hushållets ekonomi är registrerad via household. Stakeholder-information är komplett via stakeholder. Objektet är värderat via object. KALP-beräkning är klar och Screen KALP DMN returnerar APPROVED. Ansökan är bekräftad av kunden och redo för kreditevaluering.",
      "subprocessesSummary": "internal-data-gathering (CallActivity → mortgage-se-internal-data-gathering.bpmn). household (CallActivity → mortgage-se-household.bpmn). stakeholder (CallActivity → mortgage-se-stakeholder.bpmn). object (CallActivity → mortgage-se-object.bpmn).",
      "serviceTasksSummary": "fetch-party-information (internal-data-gathering - hämtar kundinformation från externa källor). fetch-engagements (internal-data-gathering - hämtar engagemangsdata). fetch-personal-information (stakeholder - hämtar personlig information). valuate-property (object - värderar fastighet). KALP (application - beräknar KALP). fetch-credit-information (application - hämtar kreditinformation).",
      "userTasksSummary": "register-household-economy-information (household - kunden fyller i hushållsekonomi). register-personal-economy-information (stakeholder - kunden fyller i personlig ekonomi). confirm-application (application - kunden bekräftar ansökan).",
      "businessRulesSummary": "Pre-screen Party DMN (förhandsbedömning av kund - returnerar APPROVED). Evaluate Bostadsrätt DMN (bedömning av objekt - returnerar APPROVED). Screen KALP DMN (bedömning av KALP-resultat - returnerar APPROVED)."
    },
    {
      "order": 2,
      "bpmnFile": "mortgage-se-credit-evaluation.bpmn",
      "callActivityId": "credit-evaluation",
      "description": "Credit Evaluation – Kreditbedömning och riskanalys",
      "given": "Application är komplett och redo för kreditevaluering. All nödvändig data är insamlad (personuppgifter, inkomst, hushållsekonomi, objektinformation). Pre-screen Party DMN, Evaluate Bostadsrätt DMN och Screen KALP DMN har alla returnerat APPROVED.",
      "when": "Credit Evaluation startar automatiskt när Application är komplett. Systemet utvärderar kreditvärdigheten baserat på insamlad data. Systemet bedömer risknivå och kreditvärdighet automatiskt. Systemet genererar kreditbedömning och rekommendationer.",
      "then": "Credit Evaluation är slutförd och godkänner ansökan automatiskt. Riskbedömning är klar och kreditvärdighet är godkänd. Kreditbedömning och rekommendationer är tillgängliga. Ansökan är redo för Credit Decision."
    },
    {
      "order": 3,
      "bpmnFile": "mortgage-se-offer.bpmn",
      "callActivityId": "offer",
      "description": "Offer – Erbjudande och acceptans",
      "given": "Credit Evaluation är slutförd och godkänner ansökan. Kreditbedömning och rekommendationer är tillgängliga. Credit Decision har godkänt ansökan.",
      "when": "Systemet genererar erbjudande baserat på Credit Evaluation-resultat. Kunden granskar erbjudandet. Kunden accepterar erbjudandet.",
      "then": "Offer är genererat och accepterat av kunden. Erbjudandet innehåller korrekt lånebelopp, ränta och villkor. Ansökan är redo för dokumentgenerering."
    },
    {
      "order": 4,
      "bpmnFile": "mortgage-se-document-generation.bpmn",
      "callActivityId": "document-generation",
      "description": "Document Generation – Dokumentgenerering och signering",
      "given": "Offer är genererat och accepterat av kunden. Erbjudandet innehåller korrekt lånebelopp, ränta och villkor.",
      "when": "Systemet genererar alla nödvändiga dokument baserat på accepterat erbjudande. Kunden granskar dokumenten. Kunden signerar dokument digitalt.",
      "then": "Alla nödvändiga dokument är genererade och signerade av kunden. Dokument är redo för utbetalning. Signering är verifierad och registrerad."
    },
    {
      "order": 5,
      "bpmnFile": "mortgage-se-disbursement.bpmn",
      "callActivityId": "disbursement",
      "description": "Disbursement – Utbetalning",
      "given": "Alla nödvändiga dokument är genererade och signerade av kunden. Dokument är redo för utbetalning. Signering är verifierad och registrerad.",
      "when": "Systemet genomför utbetalning baserat på signerade dokument. Utbetalning sker automatiskt till angiven mottagare.",
      "then": "Utbetalning är slutförd framgångsrikt. Beloppet är överfört till angiven mottagare. Transaktionen är registrerad. Processen är redo för panträttsregistrering."
    },
    {
      "order": 6,
      "bpmnFile": "mortgage-se-collateral-registration.bpmn",
      "callActivityId": "collateral-registration",
      "description": "Collateral Registration – Panträttsregistrering",
      "given": "Utbetalning är slutförd framgångsrikt. Beloppet är överfört till angiven mottagare. Transaktionen är registrerad.",
      "when": "Handläggaren registrerar säkerhet (panträtt) baserat på utbetalning. Handläggaren verifierar säkerheten. Handläggaren distribuerar meddelande om panträtt till BRF.",
      "then": "Säkerhet är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Collateral Registration är slutförd. Hela processen från Application till Collateral Registration är slutförd."
    }
  ]
}
```

---

## Förklaring av exempel

### Balans mellan affärsspråk och konkret information

**Bra exempel (som följs i outputten):**

1. **Summary:**
   - ✅ Inkluderar Feature Goal-namn i ordning: "Application (ansökan), Credit Evaluation (kreditbedömning)..."
   - ✅ Konkret information: "värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m²"
   - ✅ Affärsspråk: "en person som köper sin första bostadsrätt"

2. **When (scenario-nivå):**
   - ✅ Inkluderar Feature Goal-namn: "Application", "Credit Evaluation", "Offer"
   - ✅ Inkluderar subprocesser: "internal-data-gathering", "household", "stakeholder", "object"
   - ✅ Affärsspråk: "Kunden fyller i komplett ansökan", "Systemet hämtar kunddata"

3. **Action (bankProjectTestSteps för Application):**
   - ✅ Inkluderar Feature Goal-namn: "Application"
   - ✅ Inkluderar subprocesser: "internal-data-gathering", "household", "stakeholder", "object"
   - ✅ Affärsspråk: "Kunden fyller i komplett ansökan", "Systemet hämtar kunddata automatiskt"

4. **Assertion (bankProjectTestSteps för Application):**
   - ✅ Konkret information som kan valideras: "Pre-screen Party DMN returnerar APPROVED"
   - ✅ Konkret data: "personuppgifter, inkomst, önskat lånebelopp, hushållsekonomi"
   - ✅ Affärsspråk: "Application är komplett och redo för kreditevaluering"

5. **When (subprocessSteps för Application):**
   - ✅ Inkluderar Feature Goal-namn: "Application"
   - ✅ Inkluderar aktiviteter: "internal-data-gathering", "household", "stakeholder", "object"
   - ✅ Inkluderar Service Tasks: "fetch-party-information", "valuate-property"
   - ✅ Inkluderar User Tasks: "register-household-economy-information", "confirm-application"
   - ✅ Inkluderar DMN-beslut: "Pre-screen Party DMN", "Evaluate Bostadsrätt DMN", "Screen KALP DMN"
   - ✅ Affärsspråk: "Kunden går in i ansökningsflödet", "Systemet hämtar kunddata automatiskt"

### Vad gör detta exempel bra?

1. **Testbarhet:** Alla assertions innehåller konkret information som kan valideras (t.ex. "Pre-screen Party DMN returnerar APPROVED", "Application är komplett")

2. **Koppling till BPMN:** Feature Goal-namn, subprocesser, Service Tasks, User Tasks och DMN-beslut ingår naturligt i texten

3. **Affärsspråk:** Använder "kunden", "systemet", "handläggaren" istället för teknisk BPMN-terminologi

4. **Konkret information:** Inkluderar specifika aktiviteter och beslut som faktiskt ska valideras i testet

5. **Balans:** Kombinerar affärsspråk med konkret BPMN-information på ett naturligt sätt

---

## Jämförelse: Bra vs Dåligt

### Summary

**✅ Bra (som i exempel):**
> "Processen går genom Application (ansökan), Credit Evaluation (kreditbedömning), Offer (erbjudande)..."

**❌ Dåligt (för generellt):**
> "Processen går genom hela flödet från ansökan till panträttsregistrering"

**❌ Dåligt (för tekniskt):**
> "CallActivity application exekveras, följt av CallActivity credit-evaluation"

### Action (bankProjectTestSteps)

**✅ Bra (som i exempel):**
> "Kunden fyller i komplett ansökan (Application) med personuppgifter, inkomst och önskat lånebelopp. Systemet hämtar kunddata automatiskt via internal-data-gathering."

**❌ Dåligt (för generellt):**
> "Kunden fyller i komplett ansökan med personuppgifter, inkomst och önskat lånebelopp"

**❌ Dåligt (för tekniskt):**
> "UserTask application exekveras och fyller i formulär"

### Assertion (bankProjectTestSteps)

**✅ Bra (som i exempel):**
> "Application är komplett och redo för kreditevaluering. All data är insamlad (personuppgifter, inkomst, önskat lånebelopp, hushållsekonomi, objektinformation). Pre-screen Party DMN returnerar APPROVED."

**❌ Dåligt (för generellt):**
> "Ansökan är komplett och redo för kreditevaluering. All data är insamlad och validerad."

**❌ Dåligt (för tekniskt):**
> "UserTask application.status = COMPLETE. Alla obligatoriska fält är ifyllda."

---

## Slutsats

Detta exempel visar hur den uppdaterade prompten skulle generera E2E-scenarios som:
- Använder affärsspråk
- Behåller kopplingen till faktiska BPMN-aktiviteter
- Kan valideras i tester
- Innehåller konkret information om vad som faktiskt händer

Testet kan nu faktiskt validera att:
- Application-processen går igenom alla subprocesser (internal-data-gathering, household, stakeholder, object)
- Specifika DMN-beslut returnerar rätt resultat (Pre-screen Party DMN, Evaluate Bostadsrätt DMN, Screen KALP DMN)
- Specifika aktiviteter har körts (fetch-party-information, register-household-economy-information, confirm-application)
- Hela flödet från Application till Collateral Registration är slutfört

