# ChatGPT Prompt för Scenario Metadata

**VIKTIGT**: Scenarion beskriver tester för den **fiktiva appen** som BPMN-processerna representerar (t.ex. bolånesystemet), INTE för BPMN Planner själv. BPMN Planner är ett verktyg för att planera och dokumentera BPMN-processer, men själva processerna representerar en annan applikation som ska testas.

Kopiera denna prompt och använd med ChatGPT för att få förslag på `persona`, `riskLevel`, och `assertionType` för dina scenarion.

---

## Prompt att kopiera:

```
Jag arbetar med BPMN-processer för bolåneansökningar och behöver hjälp att fylla i metadata för test-scenarion.

För varje scenario, bestäm följande:

1. **persona** (vem interagerar med systemet):
   - 'customer' - om kunden gör något (t.ex. fyller i formulär, godkänner)
   - 'advisor' - om handläggare/rådgivare gör något (t.ex. granskar, godkänner)
   - 'system' - om det är automatiserat (serviceTask, ingen användarinteraktion)
   - 'unknown' - om det är oklart eller inte applicerbart

2. **riskLevel** (hur kritisk är scenariot):
   - 'P0' - Kritisk happy path som blockerar release om den inte fungerar
   - 'P1' - Viktigt flöde som ska testas regelbundet
   - 'P2' - Edge cases, felhantering, mindre kritiska scenarion

3. **assertionType** (vilken typ av test):
   - 'functional' - Vanlig funktionell testning
   - 'regression' - Regressionstest
   - 'compliance' - Regelverkskrav, compliance
   - 'other' - Annat

**Regler:**
- Happy paths (type: 'Happy') är ofta P0 och 'functional'
- Edge cases (type: 'Edge') är ofta P1 eller P2
- Error cases (type: 'Error') är ofta P1 eller P2
- User tasks är ofta 'customer' eller 'advisor'
- Service tasks är ofta 'system'

Här är scenarion jag behöver metadata för:

[Klistra in dina scenarion här - kopiera från scenarios-arrayen i din .doc.ts-fil]

Ge mig svaret i formatet:
Scenario ID: persona, riskLevel, assertionType

T.ex.:
EPIC-S1: customer, P0, functional
EPIC-S2: customer, P1, functional
EPIC-S3: system, P1, regression
```

---

## Exempel: Hur du använder prompten

1. **Öppna din `.doc.ts`-fil** (t.ex. `fetch-party-information.doc.ts`)

2. **Kopiera scenarion** från filen:
```typescript
scenarios: [
  {
    id: 'EPIC-S1',
    name: 'Normalflöde med komplett underlag',
    type: 'Happy',
    description: 'Kunden eller handläggaren har lämnat kompletta uppgifter',
    outcome: 'Epiken slutförs utan avvikelser',
  },
  {
    id: 'EPIC-S2',
    name: 'Delvis ofullständigt underlag',
    type: 'Edge',
    description: 'Enstaka uppgifter saknas',
    outcome: 'Epiken markerar behov av komplettering',
  },
  {
    id: 'EPIC-S3',
    name: 'Tekniskt fel',
    type: 'Error',
    description: 'Centrala data kan inte läsas in',
    outcome: 'Epiken avbryts, fel loggas',
  },
]
```

3. **Klistra in prompten ovan i ChatGPT** och ersätt `[Klistra in dina scenarion här]` med dina scenarion

4. **ChatGPT ger dig svar** i formatet:
```
EPIC-S1: customer, P0, functional
EPIC-S2: customer, P1, functional
EPIC-S3: system, P1, regression
```

5. **Uppdatera din fil** med de nya fälten:
```typescript
scenarios: [
  {
    id: 'EPIC-S1',
    name: 'Normalflöde med komplett underlag',
    type: 'Happy',
    description: 'Kunden eller handläggaren har lämnat kompletta uppgifter',
    outcome: 'Epiken slutförs utan avvikelser',
    persona: 'customer',        // ← Från ChatGPT
    riskLevel: 'P0',            // ← Från ChatGPT
    assertionType: 'functional', // ← Från ChatGPT
  },
  // ... osv
]
```

---

## Fylla i uiFlow (valfritt, mer avancerat)

**VIKTIGT**: `uiFlow` beskriver användarflöden i den **fiktiva appen** som BPMN-processerna representerar (t.ex. bolånesystemet), INTE i BPMN Planner själv.

`uiFlow` är en array som beskriver användarens steg genom UI:et i den app som ska testas. Det är mer komplext eftersom det kräver kunskap om den fiktiva appens sidor och navigationsflöden.

### Vad är uiFlow?

`uiFlow` är en array av steg som beskriver:
- **pageId**: Vilken sida/vy användaren är på (t.ex. `'application-form'`, `'confirmation-page'`)
- **action**: Vad användaren gör (t.ex. `'fill income field'`, `'click submit button'`)
- **locatorId**: (valfritt) ID för UI-elementet (t.ex. `'income-input'`, `'submit-btn'`)
- **dataProfileId**: (valfritt) Referens till testdata-profil (t.ex. `'standard-customer'`)

### Prompt för uiFlow

**VIKTIGT**: Detta handlar om den **fiktiva appen** som BPMN-processerna representerar (t.ex. bolånesystemet), INTE BPMN Planner.

Om du vill att ChatGPT ska hjälpa dig fylla i `uiFlow`, behöver du ge mer kontext om den fiktiva appens struktur:

```
Jag behöver hjälp att skapa uiFlow (användarflöde) för BPMN-scenarion.

VIKTIGT: Detta handlar om den fiktiva appen som BPMN-processerna representerar 
(t.ex. bolånesystemet), INTE BPMN Planner.

uiFlow är en array av steg som beskriver hur användaren navigerar genom den fiktiva appen.
Varje steg har:
- pageId: Vilken sida/vy i den fiktiva appen (t.ex. 'mortgage-application-form', 'confirmation-page', 'customer-dashboard')
- action: Vad användaren gör (t.ex. 'fill income field', 'click submit', 'navigate to next step')
- locatorId: (valfritt) ID för UI-elementet i den fiktiva appen
- dataProfileId: (valfritt) Referens till testdata-profil

Här är information om den fiktiva appens sidor:
[Beskriv sidor/views i den fiktiva appen här, t.ex.:
- mortgage-application-form: Formulär för bolåneansökan i bolånesystemet
- confirmation-page: Bekräftelsesida efter ansökan
- customer-dashboard: Kundens översiktssida
- advisor-review-page: Handläggarens granskningssida
]

Här är BPMN-scenariot:
[Klistra in scenario-beskrivningen här]

Skapa uiFlow-arrayen som beskriver användarens steg genom den fiktiva appen för detta scenario.
Ge mig svaret i JSON-format:
{
  "uiFlow": [
    { "pageId": "...", "action": "...", "locatorId": "..." },
    ...
  ]
}
```

### Exempel på uiFlow

**OBS**: Detta exempel beskriver flöden i den **fiktiva appen** (bolånesystemet), inte BPMN Planner.

```typescript
{
  id: 'EPIC-S1',
  name: 'Normalflöde med komplett underlag',
  // ... andra fält ...
  uiFlow: [
    {
      pageId: 'mortgage-application-form',  // Sida i den fiktiva appen
      action: 'fill personal information',
      locatorId: 'personal-info-section',
      dataProfileId: 'standard-customer'
    },
    {
      pageId: 'mortgage-application-form',  // Sida i den fiktiva appen
      action: 'fill income information',
      locatorId: 'income-input',
      dataProfileId: 'standard-customer'
    },
    {
      pageId: 'mortgage-application-form',  // Sida i den fiktiva appen
      action: 'click submit button',
      locatorId: 'submit-btn'
    },
    {
      pageId: 'application-confirmation-page',  // Sida i den fiktiva appen
      action: 'verify confirmation message',
      locatorId: 'confirmation-message'
    }
  ]
}
```

### Tips för uiFlow

- **Starta enkelt**: Du kan börja med bara `pageId` och `action`, och lägga till `locatorId` senare
- **Använd konsekventa pageId**: Skapa en lista över dina sidor och använd samma namn konsekvent
- **Fokusera på happy paths först**: `uiFlow` är viktigast för happy paths där användaren faktiskt navigerar
- **Service tasks behöver ofta inte uiFlow**: Om det är automatiserat (serviceTask) kan `uiFlow` vara tom eller undefined

### När ska du fylla i uiFlow?

- **Nu**: Om du redan har en tydlig bild av appens sidor och flöden
- **Senare**: Om du vill fokusera på `persona`, `riskLevel` först och `uiFlow` när du har mer information
- **Tillsammans med Page Objects**: När du börjar bygga Page Objects för Playwright kan du fylla i `uiFlow` samtidigt

## Tips

- Du kan be ChatGPT att ge förklaringar för varje val om du vill förstå resonemanget
- Du kan be ChatGPT att ge förslag på flera filer samtidigt
- Om du är osäker, fråga ChatGPT "varför valde du X för detta scenario?"
- För `uiFlow`: Ge ChatGPT så mycket kontext om appens struktur som möjligt

