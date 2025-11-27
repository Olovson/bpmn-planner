# Hur man fyller i Scenario Metadata (persona, riskLevel, etc.)

## Översikt

Efter att vi har utökat scenario-modellen med nya fält (`persona`, `riskLevel`, `assertionType`, `dataProfileId`, `uiFlow`) kan du nu fylla i dessa fält i befintliga dokumentationsfiler.

**VIKTIGT**: Scenarion beskriver tester för den **fiktiva appen** som BPMN-processerna representerar (t.ex. bolånesystemet), INTE för BPMN Planner själv. BPMN Planner är ett verktyg för att planera och dokumentera BPMN-processer, men själva processerna representerar en annan applikation som ska testas.

## Metod 1: Manuellt (för några filer)

Lägg till fälten direkt i `scenarios`-arrayen i din `.doc.ts`-fil:

```typescript
scenarios: [
  {
    id: 'EPIC-S1',
    name: 'Normalflöde med komplett underlag',
    type: 'Happy',
    description: '...',
    outcome: '...',
    persona: 'customer',        // ← Lägg till
    riskLevel: 'P0',            // ← Lägg till
    assertionType: 'functional', // ← Lägg till (valfritt)
  },
  // ...
]
```

### Värden för `persona`:
- `'customer'` - Kund interagerar med systemet
- `'advisor'` - Handläggare/rådgivare använder systemet
- `'system'` - Automatiserad process (serviceTask)
- `'unknown'` - Okänt/ej applicerbart

### Värden för `riskLevel`:
- `'P0'` - Kritisk (måste testas alltid, blockerar release)
- `'P1'` - Hög prioritet (testas i majoriteten av körningar)
- `'P2'` - Normal prioritet (testas vid behov)

### Värden för `assertionType`:
- `'functional'` - Funktionell testning
- `'regression'` - Regressionstest
- `'compliance'` - Compliance/regelverkskrav
- `'other'` - Annat

### Värden för `uiFlow` (valfritt, mer avancerat):
**VIKTIGT**: `uiFlow` beskriver användarflöden i den **fiktiva appen** som BPMN-processerna representerar (t.ex. bolånesystemet), INTE i BPMN Planner själv.

`uiFlow` är en array av steg som beskriver användarens navigering genom UI:et i den fiktiva appen:

```typescript
uiFlow: [
  {
    pageId: 'mortgage-application-form',  // Sida i den fiktiva appen (bolånesystemet)
    action: 'fill income field',           // Vad användaren gör
    locatorId: 'income-input',             // (valfritt) UI-element ID i den fiktiva appen
    dataProfileId: 'standard-customer'    // (valfritt) Testdata-profil
  },
  // ... fler steg
]
```

**Tips för uiFlow:**
- Börja med bara `pageId` och `action` - du kan lägga till `locatorId` senare
- Använd konsekventa `pageId`-namn (skapa en lista över sidor i den fiktiva appen)
- Service tasks behöver ofta inte `uiFlow` (de är automatiserade, ingen UI-interaktion)
- Fokusera på happy paths först där användaren faktiskt navigerar i den fiktiva appen
- Tänk på att `pageId` ska vara sidor i det system som BPMN-processen representerar, inte BPMN Planner

## Metod 2: Använd ChatGPT/LLM (för många filer)

Du kan be ChatGPT att hjälpa dig fylla i metadata för många filer samtidigt.

**OBS**: För `uiFlow` behöver du ge ChatGPT mer kontext om appens sidor och navigationsflöden. Se `CHATGPT_PROMPT_FOR_SCENARIO_METADATA.md` för detaljerade instruktioner.

### Steg 1: Förbered en prompt

Här är en exempel-prompt du kan använda:

```
Jag har BPMN-scenarion i TypeScript-filer som behöver fyllas i med metadata. 
För varje scenario, bestäm:

1. **persona**: Vem interagerar med systemet?
   - 'customer' om kunden gör något
   - 'advisor' om handläggare gör något  
   - 'system' om det är automatiserat (serviceTask)
   - 'unknown' om okänt

2. **riskLevel**: Hur kritisk är scenariot?
   - 'P0' för kritiska happy paths som blockerar release
   - 'P1' för viktiga flöden som ska testas regelbundet
   - 'P2' för edge cases och mindre kritiska scenarion

3. **assertionType**: Vilken typ av test?
   - 'functional' för vanlig funktionell testning
   - 'regression' för regressionstest
   - 'compliance' för regelverkskrav
   - 'other' för annat

Här är ett scenario-exempel:
- id: 'EPIC-S1'
- name: 'Normalflöde med komplett underlag'
- type: 'Happy'
- description: 'Kunden eller handläggaren har lämnat kompletta uppgifter'
- outcome: 'Epiken slutförs utan avvikelser'

För detta scenario skulle jag säga:
- persona: 'customer' (kunden lämnar uppgifter)
- riskLevel: 'P0' (happy path är kritisk)
- assertionType: 'functional'

Ge mig nu metadata för följande scenarion:
[Klistra in dina scenarion här]
```

### Steg 2: Använd ChatGPT

1. Öppna ChatGPT (eller din LLM)
2. Klistra in prompten ovan
3. Klistra in scenarion från din `.doc.ts`-fil
4. ChatGPT kommer att ge dig förslag på `persona`, `riskLevel`, och `assertionType`

### Steg 3: Uppdatera filen

Kopiera ChatGPT:s svar och lägg till fälten i din `.doc.ts`-fil.

## Metod 3: Batch-uppdatering med script (avancerat)

Om du har många filer kan du skapa ett script som hjälper till. Se `scripts/`-mappen för exempel.

## Exempel: Före och Efter

### Före:
```typescript
scenarios: [
  {
    id: 'EPIC-S1',
    name: 'Normalflöde med komplett underlag',
    type: 'Happy',
    description: 'Kunden eller handläggaren har lämnat kompletta uppgifter',
    outcome: 'Epiken slutförs utan avvikelser',
  },
]
```

### Efter:
```typescript
scenarios: [
  {
    id: 'EPIC-S1',
    name: 'Normalflöde med komplett underlag',
    type: 'Happy',
    description: 'Kunden eller handläggaren har lämnat kompletta uppgifter',
    outcome: 'Epiken slutförs utan avvikelser',
    persona: 'customer',        // ← Nytt
    riskLevel: 'P0',            // ← Nytt
    assertionType: 'functional', // ← Nytt
  },
]
```

## Tips

1. **Starta med viktiga filer**: Börja med de mest kritiska processerna
2. **Använd konsekvent logik**: 
   - Happy paths är ofta `P0`
   - Edge cases är ofta `P1` eller `P2`
   - User tasks är ofta `'customer'` eller `'advisor'`
   - Service tasks är ofta `'system'`
3. **Testa efter uppdatering**: Kör `node scripts/test-scenario-metadata.mjs` för att verifiera

## När LLM API:et är öppet igen

När du kan generera dokumentation med LLM igen, kan du uppdatera LLM-prompter för att instruera LLM att automatiskt generera dessa fält. Då behöver du inte fylla i dem manuellt.

