# Innehåll i Claude-genererade Feature Goal-mallar

## Översikt

Feature Goal-dokumentationen använder `FeatureGoalDocModel` och prompten `feature_epic_prompt.md` för att generera dokumentation för Feature Goals (callActivities/subprocesser) i kreditprocessen.

## FeatureGoalDocModel Struktur

```typescript
{
  summary: string;                    // 3-5 meningar om syfte och värde (REQUIRED)
  flowSteps: string[];                // 4-8 strängar om flödessteg (REQUIRED)
  dependencies?: string[];            // 3-6 formaterade strängar om beroenden (OPTIONAL)
  userStories: Array<{                // 3-6 user stories med acceptanskriterier (REQUIRED)
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare';
    goal: string;
    value: string;
    acceptanceCriteria: string[];     // 2-4 acceptanskriterier per user story
  }>;
}
```

**Viktigt:** Detta är den faktiska modellen som används i koden. Alla fält utom `dependencies` är obligatoriska.

---

## Detaljerad Beskrivning av Fält

### 1. Summary (Sammanfattning) - REQUIRED

**Innehåll:**
- 3-5 meningar som tillsammans beskriver:
  - Huvudmålet med Feature Goalet (t.ex. intern datainsamling, pre-screening, helhetsbedömning)
  - Vilka kunder/segment som omfattas
  - Hur det stödjer bankens kreditstrategi, riskhantering och kundupplevelse
- Använd `processContext.phase` för att placera Feature Goalet i rätt fas i kreditprocessen
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att förstå vad child nodes gör och skapa en mer precis sammanfattning

**Exempel:**
> "Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut. Processen omfattar alla typer av kreditansökningar och stödjer bankens kreditstrategi genom att tillhandahålla komplett och kvalitetssäkrad data för riskbedömning."

**Viktigt:**
- Använd affärsspråk, undvik teknisk BPMN-terminologi
- Får inte lämnas tomt eller vara en ren upprepning av nodnamnet
- **Obligatoriskt fält** - måste alltid genereras

**Renderas som:** Paragraf (`<p>`) i sektion "Sammanfattning"

---

### 2. Ingående komponenter (Automatiskt genererad sektion)

**Vad det är:**
- En översiktlig lista över alla service tasks, user tasks, call activities och business rules som ingår i Feature Goalet
- Genereras automatiskt från `context.descendantNodes` (ingen LLM-generering)
- Visar bara namn och ID för varje komponent (inga detaljer för att undvika duplicering)

**Exempel:**
- Service Tasks (3)
  - Fetch party information (fetch-party-information)
  - Pre-screen party (pre-screen-party)
  - Fetch engagements (fetch-engagements)
- User Tasks (1)
  - Confirm application (confirm-application)

**Viktigt:**
- Denna sektion genereras automatiskt från BPMN-strukturen
- Visas endast om det finns minst en task/activity
- Inga detaljer (summary, flowSteps, etc.) för att undvika duplicering med Epic-dokumentationen

**Renderas som:** Lista med grupperade tasks per typ i sektion "Ingående komponenter"

---

### 3. FlowSteps (Flödessteg) - REQUIRED

**Innehåll:**
- 4-8 strängar, varje sträng en full mening som beskriver ett steg i flödet:
  - Kundens/handläggarens handlingar
  - Systemets respons
  - Viktiga beslutspunkter
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att skapa mer precisa flowSteps som reflekterar det faktiska flödet genom child nodes
- Använd `currentNodeContext.flows` för att förstå flödet in och ut från noden

**Exempel:**
- `"Processen startar när en kreditansökan har registrerats i systemet."`
- `"Systemet initierar automatiskt insamling av intern kund- och engagemangsdata från relevanta källor."`
- `"Den insamlade datan kvalitetssäkras och valideras mot förväntade format och regler."`
- `"Data berikas med metadata och flaggor som är relevanta för kreditbedömning."`
- `"Resultaten görs tillgängliga för efterföljande steg i kreditprocessen."`

**Viktigt:**
- Använd affärsspråk (t.ex. "Systemet initierar automatiskt" istället för "ServiceTask exekveras")
- Fokusera på kundens/handläggarens handlingar och systemets respons i affärstermer
- **Obligatoriskt fält** - måste alltid genereras (minst 1 steg)

**Renderas som:** Numrerad lista (`<ol>`) i sektion "Funktionellt flöde"

---

### 4. Dependencies (Beroenden) - OPTIONAL

**Innehåll:**
- 3-6 strängar, varje sträng i EXAKT formatet:

```text
Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>.
```

**Exempel:**
- `"Beroende: Process; Id: application; Beskrivning: En kreditansökan måste ha registrerats i systemet med grundläggande kund- och ansökningsdata validerade."`
- `"Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik."`
- `"Beroende: Regelmotor; Id: data-validation-rules; Beskrivning: används för att validera och kvalitetssäkra insamlad data."`

**Viktigt:**
- Formatet måste vara exakt korrekt med semikolon-separerade fält
- Använd affärsspråk i beskrivningen (t.ex. "används för att fatta kreditbeslut" istället för "DMN-motorn körs")
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att identifiera dependencies baserat på vad child nodes behöver
- Dependencies inkluderar både process-kontext (vad måste vara klart före) och tekniska system (vad behövs för att köra)
- **Valfritt fält** - kan utelämnas om inga dependencies finns

**Renderas som:** Lista (`<ul>`) i sektion "Beroenden" (endast om dependencies finns)

---

### 5. User Stories (User Stories) - REQUIRED

**Innehåll:**
- 3-6 user stories, varje user story är ett objekt med:
  - `id`: Unikt ID (t.ex. "US-1", "US-2")
  - `role`: Roll - måste vara "Kund", "Handläggare" eller "Processägare"
  - `goal`: Vad användaren vill uppnå
  - `value`: Varför användaren vill uppnå detta
  - `acceptanceCriteria`: Array med 2-4 acceptanskriterier (strängar)

**Exempel:**
```json
{
  "id": "US-1",
  "role": "Kreditevaluator",
  "goal": "Få tillgång till komplett intern kunddata för kreditbedömning",
  "value": "Kunna fatta välgrundade kreditbeslut baserat på komplett information",
  "acceptanceCriteria": [
    "Systemet ska automatiskt samla in intern kund- och engagemangsdata från relevanta källor",
    "Systemet ska kvalitetssäkra och validera insamlad data mot förväntade format",
    "Systemet ska göra data tillgänglig för efterföljande steg i kreditprocessen"
  ]
}
```

**Viktigt:**
- **Använd ALDRIG "System" som roll** - systemet är verktyget, inte användaren
- För automatiserade processer (Service Tasks), tänk på vem som drar nytta av automatiseringen
- Varje acceptanskriterium ska vara konkret och testbart
- **Obligatoriskt fält** - måste alltid genereras (minst 3 user stories rekommenderas)

**Renderas som:** Kort med user story-information i sektion "User Stories" (alltid synlig, visar varning om tom)

---

## Formatkrav

### Dependencies-format
Varje dependency måste följa EXAKT formatet:
```
Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>.
```

**Typer kan vara:**
- `Process` - Process-kontext (vad måste vara klart före)
- `Kunddatabas`, `Regelmotor`, `Analysplattform`, etc. - Tekniska system

### User Stories-format
Varje user story måste ha:
- `id`: string (t.ex. "US-1")
- `role`: enum - måste vara "Kund", "Handläggare" eller "Processägare"
- `goal`: string (full mening)
- `value`: string (full mening)
- `acceptanceCriteria`: array of strings (2-4 kriterier)

---

## Exempel på Komplett JSON

```json
{
  "summary": "Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut. Processen omfattar alla typer av kreditansökningar och stödjer bankens kreditstrategi genom att tillhandahålla komplett och kvalitetssäkrad data för riskbedömning.",
  "flowSteps": [
    "Processen startar när en kreditansökan har registrerats i systemet.",
    "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata från relevanta källor.",
    "Den insamlade datan kvalitetssäkras och valideras mot förväntade format och regler.",
    "Data berikas med metadata och flaggor som är relevanta för kreditbedömning.",
    "Resultaten görs tillgängliga för efterföljande steg i kreditprocessen."
  ],
  "dependencies": [
    "Beroende: Process; Id: application; Beskrivning: En kreditansökan måste ha registrerats i systemet med grundläggande kund- och ansökningsdata validerade, eventuella föregående KYC/AML- och identitetskontroller ska vara godkända.",
    "Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik.",
    "Beroende: Regelmotor; Id: data-validation-rules; Beskrivning: används för att validera och kvalitetssäkra insamlad data.",
    "Beroende: Analysplattform; Id: data-enrichment-service; Beskrivning: berikar data med metadata för kreditbedömning."
  ],
  "userStories": [
    {
      "id": "US-1",
      "role": "Kreditevaluator",
      "goal": "Få tillgång till komplett intern kunddata för kreditbedömning",
      "value": "Kunna fatta välgrundade kreditbeslut baserat på komplett information",
      "acceptanceCriteria": [
        "Systemet ska automatiskt samla in intern kund- och engagemangsdata från relevanta källor",
        "Systemet ska kvalitetssäkra och validera insamlad data mot förväntade format",
        "Systemet ska göra data tillgänglig för efterföljande steg i kreditprocessen"
      ]
    },
    {
      "id": "US-2",
      "role": "Handläggare",
      "goal": "Få systemet att automatiskt hantera datainsamling och kvalitetssäkring",
      "value": "Spara tid genom automatisering så att jag kan fokusera på komplexa bedömningar istället för manuell datainsamling",
      "acceptanceCriteria": [
        "Systemet ska automatiskt initiera datainsamling när en ansökan registreras",
        "Systemet ska hantera fel och timeouts på ett kontrollerat sätt",
        "Systemet ska logga alla viktiga steg för spårbarhet"
      ]
    }
  ]
}
```

---

## Jämförelse med Epic och Business Rule

### Likheter
- Samma grundläggande struktur (summary, flowSteps, userStories)
- Samma krav på affärsspråk och undvikande av teknisk terminologi
- Användning av kontextinformation (processContext, currentNodeContext)

### Skillnader
- **Feature Goal** fokuserar på högre nivå (subprocesser, övergripande flöde)
- **Epic** fokuserar på specifika tasks och har `interactions` (för User Tasks)
- **Business Rule** har fält för beslutslogik (`decisionLogic`, `inputs`, `outputs`, `businessRulesPolicy`)
- **Feature Goal** har `dependencies` (optional) som inkluderar både process-kontext och tekniska system

---

## Viktiga Noteringar

1. **Obligatoriska fält:** `summary`, `flowSteps`, `userStories` måste ALLTID genereras
2. **Valfria fält:** `dependencies` kan utelämnas om inga dependencies finns
3. **Formatkrav:** Dependencies har strikt formatkrav som måste följas exakt
4. **Kontextanvändning:** Prompten instruerar att använda `processContext.phase` och `processContext.lane` för att placera Feature Goalet i rätt kontext
5. **childrenDocumentation:** Om den finns, används den för att skapa mer precisa `summary`, `flowSteps`, `dependencies` och `userStories`

---

## Förväntat Innehåll per Fält

| Fält | Antal Items | Format | Exempel |
|------|-------------|--------|---------|
| summary | 1 sträng (3-5 meningar) | Ren text | "Intern datainsamling säkerställer..." |
| ingående komponenter | Automatisk (från BPMN) | Lista med namn och ID | Se exempel ovan |
| flowSteps | 4-8 strängar | Full mening per steg | "Processen startar när..." |
| dependencies | 3-6 strängar (optional) | Exakt format med semikolon | "Beroende: ...; Id: ...; Beskrivning: ..." |
| userStories | 3-6 objekt | Objekt med id, role, goal, value, acceptanceCriteria | Se exempel ovan |

---

## Unika Aspekter för Feature Goals

### childrenDocumentation
Om `currentNodeContext.childrenDocumentation` finns, används den för att:
- Skapa mer precisa `summary` baserat på vad child nodes gör
- Skapa mer precisa `flowSteps` som reflekterar det faktiska flödet genom child nodes
- Identifiera `dependencies` baserat på vad child nodes behöver
- Identifiera `userStories` baserat på vem som drar nytta av Feature Goalet

### Hierarkisk Struktur
- Feature Goals är ofta överordnade subprocesser som innehåller epics/tasks
- Feature Goals kan vara hierarkiska (subprocesser inuti subprocesser)
