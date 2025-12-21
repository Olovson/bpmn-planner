# Innehåll i Claude-genererade Feature Goal-mallar

## Översikt

Feature Goal-dokumentationen använder `FeatureGoalDocModel` och prompten `feature_epic_prompt.md` (v1.5.0) för att generera dokumentation för Feature Goals (callActivities/subprocesser) i kreditprocessen.

## FeatureGoalDocModel Struktur

```typescript
{
  summary: string;                    // 3-5 meningar om syfte och värde
  effectGoals: string[];              // 3-5 strängar om effektmål
  scopeIncluded: string[];            // 4-7 strängar om omfattning
  scopeExcluded: string[];            // 2-3 strängar om avgränsningar
  epics: EpicItem[];                  // 2-5 objekt om ingående epics
  flowSteps: string[];                // 4-8 strängar om flödessteg
  dependencies: string[];             // 3-6 formaterade strängar om beroenden
  relatedItems: string[];             // 2-4 strängar om relaterade items
}

interface EpicItem {
  id: string;                         // "E1", "E2", etc.
  name: string;                       // Epic-namn
  description: string;                // 1-2 meningar om epicens roll
  team: string;                       // "Risk & Kredit", etc.
}
```

## Detaljerad Beskrivning av Fält

### 1. Summary (Sammanfattning)

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

**Renderas som:** Paragraf (`<p>`)

---

### 2. EffectGoals (Effektmål)

**Innehåll:**
- 3-5 strängar, varje sträng en **full mening** som beskriver:
  - Automatisering (minskat manuellt arbete, kortare ledtider)
  - Förbättrad kvalitet/säkerhet i kreditbedömningar
  - Bättre kundupplevelse (tydligare besked, färre omtag)
  - Stärkt regelefterlevnad och riskkontroll
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att identifiera konkreta effektmål baserat på vad child nodes gör

**Exempel:**
- `"Minskar manuellt arbete genom automatisering av datainsamling från interna system."`
- `"Förbättrar kvaliteten på kreditbedömningar genom tillgång till komplett intern kunddata."`
- `"Påskyndar kreditprocessen genom snabbare tillgång till nödvändig information."`
- `"Stärker regelefterlevnad genom systematisk och spårbar datainsamling."`

**Viktigt:**
- Använd affärsspråk (t.ex. "Minskar manuellt arbete" istället för "Automatiserar API-anrop")
- Varje element ska vara en full mening som beskriver ett konkret effektmål

**Renderas som:** Lista (`<ul>`)

---

### 3. ScopeIncluded (Omfattning - Vad som ingår)

**Innehåll:**
- 4-7 strängar, varje sträng en **full mening**
- Varje "Ingår: …" ska vara ett **separat element** i arrayen
- Skriv inte flera "Ingår: …" på samma rad separerade med semikolon

**Exempel:**
- `"Ingår: insamling av intern kund- och engagemangsdata från bankens system."`
- `"Ingår: kvalitetssäkring och validering av insamlad data."`
- `"Ingår: berikning av data med metadata för kreditbeslut."`
- `"Ingår: tillgängliggörande av data för efterföljande processsteg."`

**Viktigt:**
- Börja med "Ingår:" om det är naturligt
- Varje element ska vara en full mening

**Renderas som:** Lista (`<ul>`)

---

### 4. ScopeExcluded (Avgränsningar - Vad som inte ingår)

**Innehåll:**
- 2-3 strängar, varje sträng en **full mening**
- Varje "Ingår inte: …" ska vara ett **separat element** i arrayen
- Skriv inte flera "Ingår inte: …" i samma sträng

**Exempel:**
- `"Ingår inte: externa kreditupplysningar (hanteras i separata steg)."`
- `"Ingår inte: slutgiltiga kreditbeslut (hanteras i beslutsteg)."`

**Viktigt:**
- Börja med "Ingår inte:" om det är naturligt
- Varje element ska vara en full mening

**Renderas som:** Lista (`<ul>`)

---

### 5. Epics (Ingående Epics)

**Innehåll:**
- 2-5 objekt med fälten:
  - `id`: kort ID (t.ex. `"E1"`, `"E2"`)
  - `name`: epic-namn
  - `description`: 1-2 meningar om epicens roll i flödet (använd affärsspråk)
  - `team`: vilket team som typiskt äger epiken (generellt namn, t.ex. `"Risk & Kredit"`)
- **OBS:** Om Feature Goalet har inga epics, använd tom array `[]`
- Använd `currentNodeContext.children` för att identifiera epics

**Exempel:**
```json
{
  "id": "E1",
  "name": "Insamling av intern kunddata",
  "description": "Hämtar och sammanställer intern kund- och engagemangsdata från bankens system för kreditbedömning.",
  "team": "Risk & Kredit"
}
```

**Viktigt:**
- Använd affärsspråk i description
- Om Feature Goalet har inga epics, använd tom array `[]`

**Renderas som:** Tabell eller lista med epic-information

---

### 6. FlowSteps (Flödessteg)

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

**Renderas som:** Numrerad lista (`<ol>`)

---

### 7. Dependencies (Beroenden)

**Innehåll:**
- 3-6 strängar, varje sträng i EXAKT formatet:

```text
Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>.
```

**Exempel:**
- `"Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik."`
- `"Beroende: Regelmotor; Id: data-validation-rules; Beskrivning: används för att validera och kvalitetssäkra insamlad data."`
- `"Beroende: Analysplattform; Id: data-enrichment-service; Beskrivning: berikar data med metadata för kreditbedömning."`

**Viktigt:**
- Formatet måste vara exakt korrekt med semikolon-separerade fält
- Använd affärsspråk i beskrivningen (t.ex. "används för att fatta kreditbeslut" istället för "DMN-motorn körs")
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att identifiera dependencies baserat på vad child nodes behöver

**Renderas som:** Lista (`<ul>`)

---

### 8. RelatedItems (Relaterade Items)

**Innehåll:**
- 2-4 strängar som beskriver relaterade:
  - Feature Goals
  - Epics/subprocesser
  - Business Rules/DMN (på beskrivningsnivå, utan hårdkodade IDs/paths)

**Exempel:**
- `"Relaterad Feature Goal: Extern datainsamling (hanterar datainsamling från externa källor som kreditupplysningar)."`
- `"Relaterad Feature Goal: Kreditbedömning (använder data från intern datainsamling för att fatta kreditbeslut)."`

**Viktigt:**
- Använd `currentNodeContext.siblings` för att identifiera relaterade epics i samma Feature Goal
- Använd `currentNodeContext.parents` för att identifiera relaterade Feature Goals eller processer
- Använd `currentNodeContext.hierarchy.trail` för att förstå sammanhanget
- Beskriv relaterade items på beskrivningsnivå, INTE med hårdkodade IDs eller filpaths
- Exempel på bra: "Relaterad Feature Goal: Intern datainsamling (hanterar datainsamling från interna källor)"
- Exempel på dåligt: "Relaterad Feature Goal: internal-data-gathering.bpmn"

**Renderas som:** Lista (`<ul>`)

---

## Formatkrav

### Dependencies-format
Varje dependency måste följa EXAKT formatet:
```
Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>.
```

### Epics-format
Varje epic måste vara ett objekt med fälten:
- `id`: string (t.ex. "E1")
- `name`: string
- `description`: string (1-2 meningar, affärsspråk)
- `team`: string (generellt namn)

### Numeriska Tröskelvärden
Alla numeriska tröskelvärden (kreditpoäng, belåningsgrad, inkomstnivåer, ålder) måste ha **"(exempelvärde)"** direkt efter värdet.

Exempel:
- `Skuldkvot över 6.0 (exempelvärde)`
- `Kreditvärdighet under 620 (exempelvärde)`

---

## Exempel på Komplett JSON

```json
{
  "summary": "Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut. Processen omfattar alla typer av kreditansökningar och stödjer bankens kreditstrategi genom att tillhandahålla komplett och kvalitetssäkrad data för riskbedömning.",
  "effectGoals": [
    "Minskar manuellt arbete genom automatisering av datainsamling från interna system.",
    "Förbättrar kvaliteten på kreditbedömningar genom tillgång till komplett intern kunddata.",
    "Påskyndar kreditprocessen genom snabbare tillgång till nödvändig information.",
    "Stärker regelefterlevnad genom systematisk och spårbar datainsamling."
  ],
  "scopeIncluded": [
    "Ingår: insamling av intern kund- och engagemangsdata från bankens system.",
    "Ingår: kvalitetssäkring och validering av insamlad data.",
    "Ingår: berikning av data med metadata för kreditbeslut.",
    "Ingår: tillgängliggörande av data för efterföljande processsteg."
  ],
  "scopeExcluded": [
    "Ingår inte: externa kreditupplysningar (hanteras i separata steg).",
    "Ingår inte: slutgiltiga kreditbeslut (hanteras i beslutsteg)."
  ],
  "epics": [
    {
      "id": "E1",
      "name": "Insamling av intern kunddata",
      "description": "Hämtar och sammanställer intern kund- och engagemangsdata från bankens system för kreditbedömning.",
      "team": "Risk & Kredit"
    },
    {
      "id": "E2",
      "name": "Kvalitetssäkring av data",
      "description": "Validerar och kvalitetssäkrar insamlad data för att säkerställa att den är komplett och korrekt.",
      "team": "Data & Analys"
    }
  ],
  "flowSteps": [
    "Processen startar när en kreditansökan har registrerats i systemet.",
    "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata från relevanta källor.",
    "Den insamlade datan kvalitetssäkras och valideras mot förväntade format och regler.",
    "Data berikas med metadata och flaggor som är relevanta för kreditbedömning.",
    "Resultaten görs tillgängliga för efterföljande steg i kreditprocessen."
  ],
  "dependencies": [
    "Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik.",
    "Beroende: Regelmotor; Id: data-validation-rules; Beskrivning: används för att validera och kvalitetssäkra insamlad data.",
    "Beroende: Analysplattform; Id: data-enrichment-service; Beskrivning: berikar data med metadata för kreditbedömning."
  ],
  "relatedItems": [
    "Relaterad Feature Goal: Extern datainsamling (hanterar datainsamling från externa källor som kreditupplysningar).",
    "Relaterad Feature Goal: Kreditbedömning (använder data från intern datainsamling för att fatta kreditbeslut)."
  ]
}
```

---

## Jämförelse med Epic och Business Rule

### Likheter
- Samma grundläggande struktur (summary, relatedItems)
- Samma krav på affärsspråk och undvikande av teknisk terminologi
- Samma krav på numeriska tröskelvärden med "(exempelvärde)"
- Användning av kontextinformation (processContext, currentNodeContext)

### Skillnader
- **Feature Goal** har specifika fält för omfattning (`scopeIncluded`, `scopeExcluded`, `effectGoals`, `epics`, `dependencies`)
- **Epic** har fält för processflöde (`flowSteps`, `prerequisites`, `userStories`, `interactions`)
- **Business Rule** har fält för beslutslogik (`decisionLogic`, `inputs`, `outputs`, `businessRulesPolicy`)
- **Feature Goal** fokuserar på högre nivå (subprocesser, epics, omfattning), medan **Epic** fokuserar på specifika tasks och **Business Rule** fokuserar på beslut
- **Feature Goal** har INTE längre `implementationNotes` (borttaget i v1.5.0), medan **Epic** fortfarande har det

---

## Viktiga Noteringar

1. **Prompt-version:** Feature Goal-prompten är v1.5.0 (implementationNotes borttaget)
2. **Formatkrav:** Dependencies har strikt formatkrav som måste följas exakt
3. **Numeriska värden:** Alla numeriska tröskelvärden måste ha "(exempelvärde)" efter värdet
4. **Kontextanvändning:** Prompten instruerar att använda `processContext.phase` och `processContext.lane` för att placera Feature Goalet i rätt kontext
5. **childrenDocumentation:** Om den finns, används den för att skapa mer precisa `summary`, `effectGoals`, `flowSteps`, `dependencies` och `relatedItems`

---

## Förväntat Innehåll per Fält

| Fält | Antal Items | Format | Exempel |
|------|-------------|--------|---------|
| summary | 1 sträng (3-5 meningar) | Ren text | "Intern datainsamling säkerställer..." |
| effectGoals | 3-5 strängar | Full mening per element | "Minskar manuellt arbete..." |
| scopeIncluded | 4-7 strängar | Full mening, börja med "Ingår:" | "Ingår: insamling av intern kunddata..." |
| scopeExcluded | 2-3 strängar | Full mening, börja med "Ingår inte:" | "Ingår inte: externa kreditupplysningar..." |
| epics | 2-5 objekt | Objekt med id, name, description, team | `{ "id": "E1", "name": "...", ... }` |
| flowSteps | 4-8 strängar | Full mening per steg | "Processen startar när..." |
| dependencies | 3-6 strängar | Exakt format med semikolon | "Beroende: ...; Id: ...; Beskrivning: ..." |
| relatedItems | 2-4 strängar | Relaterade items | "Relaterad Feature Goal: ..." |

---

## Unika Aspekter för Feature Goals

### childrenDocumentation
- Om `currentNodeContext.childrenDocumentation` finns, används den för att:
  - Skapa mer precisa `summary` baserat på vad child nodes gör
  - Identifiera konkreta `effectGoals` baserat på child nodes funktionalitet
  - Skapa mer precisa `flowSteps` som reflekterar det faktiska flödet genom child nodes
  - Identifiera `dependencies` baserat på vad child nodes behöver
  - Skapa mer relevanta `relatedItems` baserat på child nodes

### Hierarkisk Struktur
- Feature Goals är ofta överordnade subprocesser som innehåller epics
- `epics`-fältet listar de viktigaste epics som ingår i Feature Goalet
- Feature Goals kan vara hierarkiska (subprocesser inuti subprocesser)

### Omfattning och Avgränsning
- Feature Goals har både `scopeIncluded` och `scopeExcluded` för att tydligt definiera omfattning
- Detta är unikt för Feature Goals (Epic och Business Rule har inte samma fokus på scope)
