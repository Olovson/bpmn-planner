# Skillnader mellan CallActivity Feature Goal och Process Feature Goal

## Översikt

Vi genererar två typer av Feature Goals för subprocess-filer:
1. **CallActivity Feature Goal** - när subprocessen anropas från en parent-process
2. **Process Feature Goal** - när subprocessen betraktas som standalone

## Varför två filer?

### Användningsfall

**CallActivity Feature Goal:**
- Används när användaren klickar på en callActivity i parent-processen
- Visar subprocessen i kontext av parent-processen
- Har hierarkiskt namn: `feature-goals/{parent-file}-{elementId}.html`
- Exempel: `feature-goals/mortgage-se-application-internal-data-gathering.html`

**Process Feature Goal:**
- Används när användaren öppnar subprocess-filen direkt
- Visar subprocessen som standalone (utan parent-kontext)
- Har non-hierarkiskt namn: `feature-goals/{subprocess-file}.html`
- Exempel: `feature-goals/mortgage-se-internal-data-gathering.html`

## Vad skiljer dem åt i innehållet?

### 1. Kontext som skickas till LLM

#### CallActivity Feature Goal:
```typescript
// node = callActivity-noden i parent-processen
{
  node: {
    bpmnFile: "mortgage-se-application.bpmn",  // Parent-filen
    bpmnElementId: "internal-data-gathering",   // CallActivity elementId
    type: "callActivity",
    subprocessFile: "mortgage-se-internal-data-gathering.bpmn"
  },
  parentChain: [
    { bpmnFile: "mortgage-se-application.bpmn", type: "process", ... }  // Parent-processen
  ],
  childNodes: [],  // CallActivity har inga direkta children
  siblingNodes: [...],  // Andra callActivities i parent-processen
  descendantNodes: [...]  // Alla noder i subprocess-filen
}
```

#### Process Feature Goal:
```typescript
// node = process-noden i subprocess-filen
{
  node: {
    bpmnFile: "mortgage-se-internal-data-gathering.bpmn",  // Subprocess-filen
    bpmnElementId: "mortgage-se-internal-data-gathering",  // Process elementId
    type: "process",
    subprocessFile: undefined  // Ingen subprocess (detta ÄR processen)
  },
  parentChain: [],  // Tom (ingen parent)
  childNodes: [...],  // Tasks/epics i subprocess-filen
  siblingNodes: [],  // Inga siblings (detta är root-processen i filen)
  descendantNodes: [...]  // Alla noder i subprocess-filen
}
```

### 2. Vad LLM får se i `currentNodeContext`

#### CallActivity Feature Goal:
```json
{
  "hierarchy": {
    "trail": [
      { "name": "Application", "type": "process", "file": "mortgage-se-application.bpmn" },
      { "name": "Internal data gathering", "type": "callActivity", "file": "mortgage-se-application.bpmn" }
    ],
    "pathLabel": "Application → Internal data gathering",
    "depthFromRoot": 1,
    "featureGoalAncestor": null
  },
  "parents": [
    { "name": "Application", "type": "process", ... }
  ],
  "siblings": [
    { "name": "External data gathering", "type": "callActivity", ... },
    { "name": "Risk assessment", "type": "callActivity", ... }
  ],
  "childrenDocumentation": {
    // Dokumentation från subprocess-filens tasks/epics
    "fetch-party-information": { "summary": "...", "flowSteps": [...] },
    "pre-screen-party": { "summary": "...", "flowSteps": [...] },
    "fetch-engagements": { "summary": "...", "flowSteps": [...] }
  }
}
```

#### Process Feature Goal:
```json
{
  "hierarchy": {
    "trail": [
      { "name": "Internal data gathering", "type": "process", "file": "mortgage-se-internal-data-gathering.bpmn" }
    ],
    "pathLabel": "Internal data gathering",
    "depthFromRoot": 0,
    "featureGoalAncestor": null
  },
  "parents": [],  // Tom (ingen parent)
  "siblings": [],  // Tom (inga siblings)
  "childrenDocumentation": {
    // Samma dokumentation från subprocess-filens tasks/epics
    "fetch-party-information": { "summary": "...", "flowSteps": [...] },
    "pre-screen-party": { "summary": "...", "flowSteps": [...] },
    "fetch-engagements": { "summary": "...", "flowSteps": [...] }
  }
}
```

### 3. Vad LLM genererar (skillnader)

#### CallActivity Feature Goal:
- **Summary**: Kan nämna parent-processen och subprocessens roll i den större processen
  - Exempel: "Intern datainsamling är en del av Application-processen och säkerställer att intern kunddata hämtas..."
- **Dependencies**: Inkluderar parent-processen som dependency
  - Exempel: "Beroende: Process; Id: application; Beskrivning: Application-processen måste vara initierad..."
- **FlowSteps**: Kan referera till subprocessens roll i parent-processen
  - Exempel: "När Application-processen når callActivity 'Internal data gathering', startar subprocessen..."
- **User Stories**: Kan inkludera perspektiv från parent-processen
  - Exempel: "Som Handläggare vill jag att Application-processen automatiskt hämtar intern data..."

#### Process Feature Goal:
- **Summary**: Beskriver subprocessen som standalone
  - Exempel: "Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig..."
- **Dependencies**: Inkluderar bara dependencies som är relevanta för subprocessen själv
  - Exempel: "Beroende: Process; Id: application-initiation; Beskrivning: En kreditansökan måste ha initierats..."
- **FlowSteps**: Beskriver subprocessens interna flöde
  - Exempel: "Processen startar automatiskt när ansökan är initierad..."
- **User Stories**: Fokuserar på subprocessens värde som standalone
  - Exempel: "Som Handläggare vill jag få tillgång till komplett intern kunddata automatiskt..."

### 4. Kapitelstruktur (samma för båda)

Båda Feature Goals har samma kapitelstruktur:
1. **Header** (BPMN-element, Kreditprocess-steg, Genererat)
2. **Sammanfattning** (summary)
3. **Ingående komponenter** (Service Tasks, User Tasks, Business Rules)
4. **Funktionellt flöde** (flowSteps)
5. **Beroenden** (dependencies)
6. **User Stories** (userStories)

## När genereras vilken?

### Isolerad generering (bara subprocess-filen):
- ✅ **Process Feature Goal**: Genereras alltid
- ❌ **CallActivity Feature Goal**: Genereras INTE (ingen parent-process)

### Batch-generering (alla filer):
- ✅ **CallActivity Feature Goal**: Genereras för varje callActivity i parent-processen
- ✅ **Process Feature Goal**: Genereras för subprocess-filer utan callActivities

## Exempel: `mortgage-se-internal-data-gathering.bpmn`

### Isolerad generering:
1. **Process Feature Goal**: `feature-goals/mortgage-se-internal-data-gathering.html`
   - Beskriver subprocessen som standalone
   - Inga referenser till parent-processen

### Batch-generering (med `mortgage-se-application.bpmn`):
1. **CallActivity Feature Goal**: `feature-goals/mortgage-se-application-internal-data-gathering.html`
   - Beskriver subprocessen i kontext av Application-processen
   - Nämner parent-processen i dependencies och flowSteps

2. **Process Feature Goal**: `feature-goals/mortgage-se-internal-data-gathering.html`
   - Beskriver subprocessen som standalone
   - Samma innehåll som vid isolerad generering

## Sammanfattning

**Skillnaden är INTE i kapitelstrukturen** - båda har samma kapitel.

**Skillnaden är i PERSPEKTIVET:**
- **CallActivity Feature Goal**: Subprocessen i kontext av parent-processen
- **Process Feature Goal**: Subprocessen som standalone

**Skillnaden är i INNEHÅLLET:**
- **CallActivity Feature Goal**: Nämner parent-processen, inkluderar parent-kontext i dependencies
- **Process Feature Goal**: Fokuserar på subprocessen själv, inga referenser till parent-processen

**Skillnaden är i ANVÄNDNINGEN:**
- **CallActivity Feature Goal**: När användaren klickar på callActivity i parent-processen
- **Process Feature Goal**: När användaren öppnar subprocess-filen direkt

