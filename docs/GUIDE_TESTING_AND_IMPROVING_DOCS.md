# Guide: Testa och förbättra dokumentation med per-node overrides

Denna guide visar hur du börjar använda det nya override-systemet för att iterativt förbättra dokumentationen.

## Steg 1: Identifiera noder som behöver förbättring

1. **Generera dokumentation lokalt** (utan LLM):
   - Gå till sidan **Files** (`#/files`)
   - Välj **Local** som generation mode
   - Klicka på **"Generera artefakter för vald fil"** eller **"Generera dokumentation/tester (alla filer)"**
   - Vänta tills genereringen är klar

2. **Granska genererad dokumentation**:
   - Gå till **Process Explorer** (`#/process-explorer`)
   - Klicka på en nod för att se dess dokumentation
   - Identifiera noder där innehållet är:
     - För generiskt eller tomt
     - Saknar viktig information
     - Behöver mer detaljerade beskrivningar
     - Har felaktiga eller otydliga flow steps

3. **Prioritera**:
   - Börja med viktiga noder (t.ex. root process, huvudprocesser)
   - Fokusera på noder som används ofta eller är kritiska för förståelsen

## Steg 2: Skapa en override-fil

För varje nod du vill förbättra:

```bash
npm run create:node-doc <docType> <bpmnFile> <elementId>
```

**Exempel:**

```bash
# Feature Goal (Call Activity)
npm run create:node-doc feature-goal mortgage.bpmn application

# Epic (User Task eller Service Task)
npm run create:node-doc epic mortgage-se-application.bpmn confirm-application

# Business Rule
npm run create:node-doc business-rule mortgage-se-credit-evaluation.bpmn credit-decision
```

**Hur vet jag vilken docType?**
- **Feature Goal**: Call Activities (subprocesser)
- **Epic**: User Tasks och Service Tasks
- **Business Rule**: Business Rule Tasks

**Var hittar jag elementId?**
- I Process Explorer: klicka på en nod och titta på URL:en eller node-info
- I Node Matrix: kolumnen "Element ID"
- I BPMN-filen: elementets `id`-attribut

## Steg 3: Redigera override-filen

Filen skapas i `src/data/node-docs/<docType>/<bpmnBaseName>.<elementId>.doc.ts`

### Grundläggande exempel

```typescript
import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

export const overrides: FeatureGoalDocOverrides = {
  summary: "Förbättrad sammanfattning som förklarar vad denna process gör...",
  
  effectGoals: [
    "Mål 1: Förbättrad kundupplevelse",
    "Mål 2: Automatiserad validering",
  ],
  
  flowSteps: [
    {
      step: "Steg 1: Validera input",
      description: "Kontrollera att alla nödvändiga fält är ifyllda"
    },
    {
      step: "Steg 2: Processera data",
      description: "Kör valideringslogik och beräkningar"
    }
  ],
};
```

### Utöka arrayer istället för att ersätta dem

Om du vill **lägga till** till base-modellens arrayer istället för att ersätta dem:

```typescript
export const overrides: FeatureGoalDocOverrides = {
  scenarios: [
    "Nytt scenario: Edge case när användaren har flera konton"
  ],
  
  _mergeStrategy: {
    scenarios: 'extend' // Lägg till i base-modellens scenarios istället för att ersätta
  }
};
```

### Tillgängliga fält per typ

**Feature Goal:**
- `summary`, `effectGoals`, `scopeIncluded`, `scopeExcluded`
- `epics`, `flowSteps`, `dependencies`
- `scenarios`, `testDescription`, `implementationNotes`, `relatedItems`

**Epic:**
- `summary`, `prerequisites`, `inputs`, `flowSteps`
- `interactions`, `dataContracts`, `businessRulesPolicy`
- `scenarios`, `testDescription`, `implementationNotes`, `relatedItems`

**Business Rule:**
- `summary`, `inputs`, `decisionLogic`, `outputs`
- `businessRulesPolicy`, `scenarios`
- `testDescription`, `implementationNotes`, `relatedItems`

## Steg 4: Testa dina ändringar

1. **Generera dokumentation igen** (lokalt):
   - Gå tillbaka till **Files**-sidan
   - Välj **Local** mode
   - Generera för den specifika filen eller alla filer

2. **Kontrollera resultatet**:
   - Gå till **Process Explorer**
   - Klicka på noden du just förbättrade
   - Verifiera att dina ändringar visas korrekt

3. **Iterera**:
   - Om något inte ser rätt ut, redigera override-filen igen
   - Generera om och kontrollera igen
   - Upprepa tills du är nöjd

## Steg 5: Använd LLM för att generera innehåll (valfritt)

Om du vill använda ChatGPT eller Ollama för att generera innehåll:

1. **Generera med LLM**:
   - Välj **ChatGPT** eller **Ollama** på Files-sidan
   - Generera dokumentation för noden

2. **Kopiera LLM-innehållet till override-fil**:
   - Öppna den genererade dokumentationen i Doc Viewer
   - Kopiera relevanta delar (t.ex. summary, flowSteps, scenarios)
   - Klistra in i din override-fil och justera efter behov

3. **Commit till version control**:
   - Nu har du förbättrat innehåll som sparas i Git
   - Andra utvecklare får automatiskt dina förbättringar
   - Du kan iterativt förbättra filerna över tid

## Tips och bästa praxis

### 1. Börja smått
- Börja med att förbättra `summary` för några viktiga noder
- Lägg sedan till `flowSteps` eller `scenarios` när du känner dig bekväm

### 2. Använd beskrivande texter
- Undvik generiska beskrivningar som "Processerar data"
- Var specifik: "Validerar kundens inkomst mot kreditvärdighet baserat på UC-data"

### 3. Strukturera flowSteps
- Varje steg ska vara tydligt och åtgärdsorienterat
- Beskriv både **vad** som händer och **varför** (om relevant)

### 4. Lägg till relevanta scenarios
- Happy path: Normal flöde när allt fungerar
- Error cases: Vad händer vid fel?
- Edge cases: Särskilda situationer

### 5. Använd _mergeStrategy för att bygga vidare
- Om base-modellen redan har bra scenarios, använd `extend` för att lägga till fler
- Om base-modellen är för generisk, använd `replace` (default) för att ersätta helt

### 6. Testa regelbundet
- Efter varje större ändring, generera om och kontrollera
- Se till att HTML-renderingen ser bra ut
- Kontrollera att länkar och referenser fungerar

## Debugging

### Override-filen laddas inte
- Kontrollera filnamnet: `<bpmnBaseName>.<elementId>.doc.ts`
- Kontrollera att `bpmnFile` och `elementId` stämmer exakt
- Kolla konsolen för felmeddelanden

### Ändringar visas inte
- Generera om dokumentationen (override-filer laddas vid generering)
- Kontrollera att filen exporterar `overrides` korrekt
- Kolla TypeScript-fel i konsolen

### Syntax-fel i override-filen
- TypeScript kommer att visa fel i IDE:n
- Kontrollera att alla arrayer har rätt struktur
- Se till att `_mergeStrategy` bara används för array-fält

## Exempel: Komplett override-fil

```typescript
import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * Documentation overrides for mortgage.bpmn::application
 * 
 * This process handles the initial mortgage application submission,
 * including validation, stakeholder assessment, and initial data gathering.
 */
export const overrides: FeatureGoalDocOverrides = {
  summary: "Ansökningsprocessen för bolån där kunden lämnar in sin initiala ansökan. Processen validerar grundläggande information, bedömer intressenter, och samlar in initial data för vidare bearbetning.",
  
  effectGoals: [
    "Säkerställa att alla nödvändiga grundläggande uppgifter är ifyllda",
    "Identifiera och bedöma relevanta intressenter (sökande, medsökande, garant)",
    "Samla in initial data för kreditvärdering och riskbedömning",
    "Skapa en komplett ansökningsbas för vidare bearbetning"
  ],
  
  flowSteps: [
    {
      step: "1. Ansökningsinlämning",
      description: "Kunden lämnar in sin ansökan via digital kanal eller fysiskt kontor. Systemet registrerar ansökan och skapar en ny processinstans."
    },
    {
      step: "2. Grundläggande validering",
      description: "Systemet validerar att alla obligatoriska fält är ifyllda (personnummer, inkomst, lånebelopp, etc.). Om validering misslyckas, returneras ansökan till kunden för komplettering."
    },
    {
      step: "3. Intressentbedömning",
      description: "Systemet identifierar och bedömer relevanta intressenter (sökande, eventuell medsökande, garant). Detta avgör vilka personuppgifter som behöver samlas in."
    },
    {
      step: "4. Intern datainsamling",
      description: "Systemet samlar in initial data från interna system (tidigare lån, kundrelation, etc.) för att bygga en komplett bild av ansökan."
    },
    {
      step: "5. Vidarebefordran",
      description: "När all initial data är samlad, vidarebefordras ansökan till nästa steg i processen (t.ex. kreditvärdering)."
    }
  ],
  
  scenarios: [
    {
      name: "Happy path: Komplett ansökan",
      description: "Kunden lämnar in en komplett ansökan med alla nödvändiga fält ifyllda. Systemet validerar, identifierar intressenter, samlar in data, och vidarebefordrar till nästa steg."
    },
    {
      name: "Error case: Ofullständig ansökan",
      description: "Kunden lämnar in en ansökan med saknade obligatoriska fält. Systemet validerar och returnerar ansökan till kunden med tydlig information om vad som saknas."
    },
    {
      name: "Edge case: Flera medsökande",
      description: "Ansökan innehåller flera medsökande. Systemet identifierar alla intressenter korrekt och samlar in data för alla relevanta personer."
    }
  ],
  
  // Utöka base-modellens scenarios istället för att ersätta dem
  _mergeStrategy: {
    scenarios: 'extend'
  }
};
```

## Nästa steg

1. **Börja med en viktig nod** (t.ex. root process `mortgage.bpmn::application`)
2. **Skapa override-fil** med `npm run create:node-doc`
3. **Förbättra summary och flowSteps** först
4. **Testa och iterera** tills du är nöjd
5. **Lägg till fler noder** gradvis
6. **Commit och push** dina förbättringar

Lycka till! 🚀


