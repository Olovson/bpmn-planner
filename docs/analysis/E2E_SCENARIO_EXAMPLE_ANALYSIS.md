# Analys: E2E-scenario Exempel - Kan Claude generera detta?

**Datum:** 2025-12-22  
**Syfte:** Analysera exemplet och bedöma om Claude kan generera något liknande baserat på prompten och tillgänglig kontext.

---

## 📊 Vad har Claude tillgång till?

### Input till Claude (från `e2eScenarioGenerator.ts`):

```typescript
{
  path: {
    startEvent: "start",
    endEvent: "end",
    featureGoals: ["application", "credit-evaluation", "offer", ...],
    gatewayConditions: [
      {
        gatewayId: "gateway-1",
        gatewayName: "KALP OK",
        condition: "${kalpOk === true}",
        conditionText: "KALP OK = Yes",
        targetNodeId: "credit-evaluation"
      }
    ]
  },
  featureGoals: [
    {
      callActivityId: "application",
      bpmnFile: "mortgage-se-application.bpmn",
      summary: "Application – Komplett ansökan...",
      flowSteps: [
        "Kunden går in i ansökningsflödet...",
        "Systemet hämtar kunddata automatiskt...",
        ...
      ],
      userStories: [
        {
          id: "US-1",
          role: "Kund",
          goal: "Fylla i komplett ansökan",
          value: "Kunna ansöka om bolån",
          acceptanceCriteria: [
            "Application är komplett och redo för kreditevaluering",
            "All data är insamlad (personuppgifter, inkomst, objektinformation)",
            ...
          ]
        }
      ],
      prerequisites: [
        "Kunden är redan godkänd i förhandsbedömning",
        "Bostadsrätten uppfyller bankens grundkrav",
        ...
      ],
      dependencies: [...],
      subprocesses: [
        { id: "internal-data-gathering", name: "Internal Data Gathering", type: "CallActivity", bpmnFile: "..." },
        { id: "household", name: "Household", type: "CallActivity", bpmnFile: "..." },
        ...
      ],
      serviceTasks: [
        { id: "fetch-party-information", name: "Fetch Party Information", type: "ServiceTask" },
        { id: "valuate-property", name: "Valuate Property", type: "ServiceTask" },
        ...
      ],
      userTasks: [
        { id: "register-household-economy-information", name: "Register Household Economy Information", type: "UserTask", isCustomer: true },
        { id: "confirm-application", name: "Confirm Application", type: "UserTask", isCustomer: true },
        ...
      ],
      businessRules: [
        { id: "pre-screen-party-dmn", name: "Pre-screen Party DMN", type: "dmnDecision" },
        { id: "evaluate-bostadsratt-dmn", name: "Evaluate Bostadsrätt DMN", type: "dmnDecision" },
        ...
      ]
    },
    // ... fler Feature Goals
  ],
  processInfo: {
    bpmnFile: "mortgage.bpmn",
    processName: "Mortgage Application",
    initiative: "Mortgage"
  }
}
```

**Slutsats:** Claude har **all information** som behövs för att generera exemplet.

---

## ✅ Vad gör exemplet bra?

### 1. **Balans mellan affärsspråk och konkret information**

**Exempel från `action` (bankProjectTestSteps):**
- ✅ Affärsspråk: "Kunden fyller i komplett ansökan"
- ✅ Feature Goal-namn: "(Application)"
- ✅ Subprocesser: "via internal-data-gathering", "(household)", "(stakeholder)", "(object)"
- ✅ Affärsspråk: "Systemet hämtar kunddata automatiskt"

**Kan Claude generera detta?**
- ✅ **JA** - Claude har `flowSteps`, `subprocesses`, `serviceTasks`, `userTasks` i inputen
- ✅ Prompten instruerar: "Inkludera Feature Goal-namn och viktiga aktiviteter på ett naturligt sätt"
- ✅ Exempel i prompten visar exakt detta mönster

### 2. **Konkret information som kan valideras**

**Exempel från `assertion` (bankProjectTestSteps):**
- ✅ Konkret data: "All data är insamlad (personuppgifter, inkomst, önskat lånebelopp, hushållsekonomi, objektinformation)"
- ✅ DMN-beslut: "Pre-screen Party DMN returnerar APPROVED"
- ✅ Affärsspråk: "Application är komplett och redo för kreditevaluering"

**Kan Claude generera detta?**
- ✅ **JA** - Claude har `userStories.acceptanceCriteria` och `businessRules` i inputen
- ✅ Prompten instruerar: "Inkludera viktiga beslut/resultat som ska valideras (t.ex. 'Pre-screen Party DMN returnerar APPROVED')"
- ✅ Exempel i prompten visar exakt detta mönster

### 3. **Feature Goal-namn i ordning**

**Exempel från `summary`:**
- ✅ "Processen går genom Application (ansökan), Credit Evaluation (kreditbedömning), Offer (erbjudande)..."

**Kan Claude generera detta?**
- ✅ **JA** - Claude har `path.featureGoals` i ordning i inputen
- ✅ Prompten instruerar: "Inkludera Feature Goal-namn i ordning (t.ex. 'Processen går genom Application, Credit Evaluation...')"
- ✅ Exempel i prompten visar exakt detta mönster

### 4. **SubprocessSteps med detaljerad information**

**Exempel från `when` (subprocessSteps för Application):**
- ✅ Feature Goal-namn: "(Application)"
- ✅ Subprocesser: "internal-data-gathering", "household", "stakeholder", "object"
- ✅ Service Tasks: "fetch-party-information", "fetch-engagements", "valuate-property"
- ✅ User Tasks: "register-household-economy-information", "confirm-application"
- ✅ DMN-beslut: "Pre-screen Party DMN", "Evaluate Bostadsrätt DMN", "Screen KALP DMN"

**Kan Claude generera detta?**
- ✅ **JA** - Claude har `subprocesses`, `serviceTasks`, `userTasks`, `businessRules` i inputen
- ✅ Prompten instruerar: "Inkludera Feature Goal-namn och viktiga aktiviteter på ett naturligt sätt"
- ⚠️ **MEN:** Prompten instruerar inte explicit att inkludera alla subprocesser/aktiviteter i `when`-fältet

---

## ⚠️ Potentiella utmaningar

### 1. **SubprocessSteps `when` kan bli för generell**

**Nuvarande exempel:**
> "Kunden går in i ansökningsflödet (Application). Systemet hämtar kund- och engagemangsdata automatiskt via internal-data-gathering (fetch-party-information, fetch-engagements). Kunden registrerar hushållets inkomster och utgifter (household - register-household-economy-information)."

**Risk:** Claude kan generera:
> "Kunden går in i ansökningsflödet. Systemet hämtar kunddata automatiskt. Kunden registrerar hushållsekonomi."

**Varför?**
- Prompten instruerar att använda `flowSteps`, men `flowSteps` kan vara generella
- Prompten instruerar inte explicit att inkludera alla subprocesser/aktiviteter i `when`-fältet
- Claude kan aggregera för mycket och tappa konkret information

**Lösning:**
- ✅ Lägg till explicit instruktion: "För `when` i `subprocessSteps`, inkludera subprocesser, Service Tasks, User Tasks och DMN-beslut på ett naturligt sätt"
- ✅ Lägg till exempel i prompten som visar detta

### 2. **SubprocessSteps `then` kan bli för generell**

**Nuvarande exempel:**
> "Alla relevanta steg i Application-processen har körts. Intern data är uppdaterad via internal-data-gathering. Hushållets ekonomi är registrerad via household. Stakeholder-information är komplett via stakeholder. Objektet är värderat via object. KALP-beräkning är klar och Screen KALP DMN returnerar APPROVED."

**Risk:** Claude kan generera:
> "Alla relevanta steg i Application-processen har körts. Ansökan är redo för kreditevaluering."

**Varför?**
- Prompten instruerar att använda `userStories.acceptanceCriteria`, men dessa kan vara generella
- Prompten instruerar inte explicit att inkludera konkret information om subprocesser/aktiviteter

**Lösning:**
- ✅ Lägg till explicit instruktion: "För `then` i `subprocessSteps`, inkludera konkret information om vilka subprocesser/aktiviteter som har körts"
- ✅ Lägg till exempel i prompten som visar detta

### 3. **Summary kan bli för generell**

**Nuvarande exempel:**
> "Processen går genom Application (ansökan), Credit Evaluation (kreditbedömning), Offer (erbjudande), Document Generation (dokumentgenerering), Disbursement (utbetalning) och Collateral Registration (panträttsregistrering)."

**Risk:** Claude kan generera:
> "Processen går genom hela flödet från ansökan till panträttsregistrering."

**Varför?**
- Prompten har exempel som visar detta, men Claude kan fortfarande vara för generell
- Claude kan aggregera för mycket om Feature Goal-namn inte är tydligt i inputen

**Lösning:**
- ✅ Prompten har redan exempel som visar detta
- ✅ Prompten instruerar: "Inkludera Feature Goal-namn i ordning"
- ⚠️ **Men:** Kanske behöver vi fler exempel eller tydligare instruktioner?

---

## 🎯 Bedömning: Kan Claude generera något liknande?

### **JA, med vissa förbättringar**

**Stödjande faktorer:**
1. ✅ Claude har **all nödvändig information** i inputen
2. ✅ Prompten har **tydliga instruktioner** om balans mellan affärsspråk och konkret information
3. ✅ Prompten har **exempel** som visar exakt vad som förväntas
4. ✅ **Structured output** säkerställer korrekt format
5. ✅ **Låg temperatur (0.3)** säkerställer mer konsistent output

**Utmaningar:**
1. ⚠️ Claude kan vara **för generell** i `subprocessSteps.when` och `subprocessSteps.then`
2. ⚠️ Claude kan **missa att inkludera** alla subprocesser/aktiviteter om prompten inte är explicit nog
3. ⚠️ Claude kan **aggregera för mycket** och tappa konkret information

**Förväntad kvalitet:**
- **70-85%** av exemplet - Claude kommer generera bra E2E-scenarios, men kan vara något mer generell i vissa fält
- **SubprocessSteps** kan behöva förbättringar (mer konkret information)
- **bankProjectTestSteps** kommer vara bra (tydliga instruktioner och exempel)

---

## 🔧 Förbättringsmöjligheter

### 1. **Tydligare instruktioner för subprocessSteps**

**Nuvarande instruktioner:**
> "För `when` i `subprocessSteps`: Använd `flowSteps` från Feature Goalet för att skapa when. Aggregera flera flowSteps till fullständiga meningar om det behövs. Inkludera Feature Goal-namn och viktiga aktiviteter på ett naturligt sätt."

**Förbättring:**
> "För `when` i `subprocessSteps`: Använd `flowSteps` från Feature Goalet för att skapa when. **VIKTIGT:** Inkludera subprocesser (t.ex. 'via internal-data-gathering'), Service Tasks (t.ex. 'fetch-party-information'), User Tasks (t.ex. 'register-household-economy-information') och DMN-beslut (t.ex. 'Pre-screen Party DMN') på ett naturligt sätt. Använd Feature Goal-dokumentationens `subprocesses`, `serviceTasks`, `userTasks` och `businessRules` för att inkludera konkret information."

### 2. **Tydligare instruktioner för subprocessSteps.then**

**Nuvarande instruktioner:**
> "För `then` i `subprocessSteps`: Använd `userStories.acceptanceCriteria` från Feature Goalet för att skapa then. Aggregera flera acceptanceCriteria till fullständiga meningar om det behövs. Inkludera konkret information som kan valideras."

**Förbättring:**
> "För `then` i `subprocessSteps`: Använd `userStories.acceptanceCriteria` från Feature Goalet för att skapa then. **VIKTIGT:** Inkludera konkret information om vilka subprocesser/aktiviteter som har körts (t.ex. 'Intern data är uppdaterad via internal-data-gathering', 'Hushållets ekonomi är registrerad via household'). Använd Feature Goal-dokumentationens `subprocesses`, `serviceTasks`, `userTasks` och `businessRules` för att inkludera konkret information som kan valideras."

### 3. **Fler exempel i prompten**

**Förslag:**
- Lägg till exempel på `subprocessSteps.when` som visar hur man inkluderar subprocesser/aktiviteter
- Lägg till exempel på `subprocessSteps.then` som visar hur man inkluderar konkret information

---

## 📋 Slutsats

### **Nuvarande status: 70-85% kvalitet**

**Vad fungerar bra:**
- ✅ Balans mellan affärsspråk och konkret information
- ✅ Feature Goal-namn ingår naturligt
- ✅ Konkret information som kan valideras
- ✅ Testbarhet

**Vad kan förbättras:**
- ⚠️ Tydligare instruktioner för `subprocessSteps.when` och `subprocessSteps.then`
- ⚠️ Fler exempel som visar hur man inkluderar subprocesser/aktiviteter
- ⚠️ Explicit instruktion om att använda `subprocesses`, `serviceTasks`, `userTasks`, `businessRules` från Feature Goal-dokumentation

**Rekommendation:**
- ✅ **Implementera förbättringarna** - Tydligare instruktioner och fler exempel kommer öka kvaliteten från 70-85% till 85-95%
- ✅ **Testa med riktig data** - Generera E2E-scenarios och se om Claude faktiskt följer instruktionerna
- ✅ **Iterera baserat på resultat** - Om Claude fortfarande är för generell, lägg till ännu tydligare instruktioner

**Bedömning:**
- Claude **kommer kunna generera något liknande**, men med vissa förbättringar i prompten kommer kvaliteten bli ännu bättre
- Exemplet är **realistiskt** och **uppnåbart** med nuvarande prompt + förbättringar

