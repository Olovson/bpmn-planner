# Analys: "Användningsfall"-sektion i Process Feature Goal

## Översikt

Denna analys undersöker hur en "Användningsfall"-sektion kan läggas till i Process Feature Goal-dokumentationen för att:
1. Visa vilka parent-processer som anropar subprocessen
2. Identifiera skillnader i hur subprocessen anropas från olika parent-processer
3. Ge kontext om subprocessens roll i olika processer

---

## 1. Tillgänglig Data och Kontext

### 1.1 Hitta alla parent-processer som anropar en subprocess

**Kod-location:** `src/lib/bpmnGenerators.ts`, rad 380-381

```typescript
// Hitta alla callActivities som pekar på subprocess-filen
const hasCallActivityPointingToFile = Array.from(graph.allNodes.values()).some(
  node => node.type === 'callActivity' && node.subprocessFile === file
);
```

**Tillgänglig data från `graph.allNodes`:**
- `node.bpmnFile` - Parent-processens filnamn
- `node.bpmnElementId` - CallActivity elementId
- `node.name` - CallActivity namn
- `node.subprocessFile` - Subprocess-filen som anropas
- `node.parent` - Parent-process-noden (om tillgänglig)
- `node.siblingNodes` - Andra callActivities i samma parent-process
- `node.incoming` / `node.outgoing` - Flöde in/ut från callActivity

**Exempel:**
```typescript
// För mortgage-se-internal-data-gathering.bpmn
const parentCallActivities = Array.from(graph.allNodes.values())
  .filter(node => 
    node.type === 'callActivity' && 
    node.subprocessFile === 'mortgage-se-internal-data-gathering.bpmn'
  );

// Resultat:
[
  {
    bpmnFile: 'mortgage-se-application.bpmn',
    bpmnElementId: 'internal-data-gathering',
    name: 'Internal data gathering',
    // ... andra properties
  },
  // Om samma subprocess anropas från flera parent-processer:
  {
    bpmnFile: 'mortgage-se-refinancing.bpmn',
    bpmnElementId: 'internal-data-gathering',
    name: 'Internal data gathering',
    // ... andra properties
  }
]
```

### 1.2 Identifiera skillnader i anrop

**Skillnader som kan identifieras:**

1. **Position i processen:**
   - Var i parent-processen anropas subprocessen? (tidigt, mitt, sent)
   - Vilka noder kommer före/efter callActivity?

2. **Gateway-conditions:**
   - Finns det gateway-conditions som styr när subprocessen anropas?
   - Olika conditions från olika parent-processer?

3. **Input/Output:**
   - Olika input-data från olika parent-processer?
   - Olika output-förväntningar?

4. **Sibling-noder:**
   - Vilka andra callActivities finns i samma parent-process?
   - Ger detta kontext om subprocessens roll?

**Exempel på skillnader:**

```typescript
// Parent 1: mortgage-se-application.bpmn
{
  parentProcess: 'Application',
  callActivityName: 'Internal data gathering',
  position: 'Efter Application initiation, före External data gathering',
  siblings: ['External data gathering', 'Risk assessment'],
  incomingFlows: ['application-initiated'],
  outgoingFlows: ['data-gathered'],
  gatewayConditions: [] // Ingen condition
}

// Parent 2: mortgage-se-refinancing.bpmn
{
  parentProcess: 'Refinancing',
  callActivityName: 'Internal data gathering',
  position: 'Efter Customer verification, före Credit evaluation',
  siblings: ['Credit evaluation', 'Documentation review'],
  incomingFlows: ['customer-verified'],
  outgoingFlows: ['data-gathered'],
  gatewayConditions: ['customer-type === existing'] // Condition krävs
}
```

---

## 2. Förslag på "Användningsfall"-sektion

### 2.1 Principer

**VIKTIGT: Sektionen ska bara visas när det finns specifika skillnader som inte är uppenbara vid första anblicken.**

**Visa sektion ENDAST om:**
1. Subprocessen anropas från **flera parent-processer** OCH det finns **skillnader** mellan anropen
2. Det finns **gateway-conditions** eller andra villkor som styr när subprocessen anropas
3. Subprocessen anropas **olika** från olika parent-processer (t.ex. olika position, olika kontext)

**Visa INTE sektion om:**
- Subprocessen bara anropas från EN parent-process (uppenbart)
- Alla parent-processer anropar subprocessen på samma sätt (inga skillnader)
- Skillnaderna är triviala eller uppenbara

### 2.2 Struktur (kompakt, fokus på skillnader)

```markdown
## Användningsfall

Denna subprocess används i flera parent-processer med några skillnader:

**Application-processen:**
- Anropas alltid för alla kreditansökningar (inga villkor)
- Position: Efter Application initiation

**Refinancing-processen:**
- Anropas endast för befintliga kunder (villkor: `customer-type === existing`)
- Position: Efter Customer verification
- Data används specifikt för refinancing-bedömning
```

**Alternativ (om många skillnader):**

```markdown
## Användningsfall

Denna subprocess används i flera parent-processer med följande skillnader:

| Parent-process | Särskilda villkor | Notering |
|----------------|-------------------|----------|
| Application | Inga villkor | Anropas alltid |
| Refinancing | `customer-type === existing` | Endast för befintliga kunder |
| Credit limit increase | `existing-credit-ok === true` | Endast när befintlig kredit är godkänd |
```

---

## 3. Implementation

### 3.1 Data-samling i `bpmnGenerators.ts`

**När:** När Process Feature Goal genereras (rad 2221-2321)

**Steg:**

1. **Hitta alla parent callActivities:**
```typescript
// I shouldGenerateProcessFeatureGoal-blocket
const parentCallActivities = Array.from(graph.allNodes.values())
  .filter(node => 
    node.type === 'callActivity' && 
    node.subprocessFile === file
  );

// Samla information om varje parent callActivity
const usageCases = parentCallActivities.map(ca => {
  // Hitta parent-process-noden
  const parentProcessNode = graph.allNodes.get(ca.parent?.id || '');
  
  // Hitta siblings (andra callActivities i samma parent)
  const siblings = parentProcessNode?.children
    .filter(child => child.type === 'callActivity' && child.id !== ca.id)
    .map(child => ({ name: child.name, id: child.bpmnElementId })) || [];
  
  // Hitta incoming/outgoing flows
  const incomingFlows = extractFlowRefs(ca.element?.businessObject?.incoming, 'incoming');
  const outgoingFlows = extractFlowRefs(ca.element?.businessObject?.outgoing, 'outgoing');
  
  // Hitta gateway-conditions (från incoming flows)
  const gatewayConditions = findGatewayConditions(ca, graph);
  
  // Hitta position i processen (före/efter noder)
  const previousNodes = findPreviousNodes(ca, graph);
  const nextNodes = findNextNodes(ca, graph);
  
  return {
    parentBpmnFile: ca.bpmnFile,
    parentProcessName: parentProcessNode?.name || ca.bpmnFile.replace('.bpmn', ''),
    callActivityName: ca.name || ca.bpmnElementId,
    callActivityId: ca.bpmnElementId,
    siblings,
    incomingFlows,
    outgoingFlows,
    gatewayConditions,
    previousNodes,
    nextNodes,
  };
});
```

2. **Skicka till LLM som extra kontext:**
```typescript
// Lägg till usageCases i context som skickas till LLM
const enrichedContext = {
  ...subprocessContext,
  usageCases: usageCases.length > 0 ? usageCases : undefined,
};
```

### 3.2 LLM-generering

**Prompt-uppdatering:** `prompts/llm/feature_epic_prompt.md`

**Ny sektion i prompt:**
```markdown
### usageCases (endast för Process Feature Goals, endast om det finns skillnader)

⚠️ VIKTIGT: Generera "Användningsfall"-sektion ENDAST om:
1. Subprocessen anropas från flera parent-processer OCH det finns skillnader
2. Det finns gateway-conditions eller villkor som styr när subprocessen anropas
3. Subprocessen anropas olika från olika parent-processer

Om subprocessen bara anropas från EN parent-process, eller om alla anrop är identiska, generera INGEN usageCases-sektion.

**Format (kompakt, fokus på skillnader):**
- Kort sektion som bara tar upp specifika skillnader
- Fokusera på vad som INTE är uppenbart vid första anblicken
- Undvik att upprepa uppenbar information

**Exempel:**
Om subprocessen anropas från både Application (inga villkor) och Refinancing (villkor: customer-type === existing):
- Beskriv bara skillnaderna (villkor, olika användningsfall)
- Undvik att beskriva uppenbara saker som "båda använder subprocessen för datainsamling"
```

**LLM-output (JSON) - endast om det finns skillnader:**
```json
{
  "usageCases": [
    {
      "parentProcess": "Application",
      "conditions": [],
      "differences": "Anropas alltid för alla ansökningar (inga villkor)"
    },
    {
      "parentProcess": "Refinancing",
      "conditions": ["customer-type === existing"],
      "differences": "Anropas endast för befintliga kunder (villkor: customer-type === existing)"
    }
  ]
}
```

**Om ingen skillnad finns, returnera tom array eller undefined:**
```json
{
  "usageCases": undefined
}
```

### 3.3 HTML-rendering

**Location:** `src/lib/documentationTemplates.ts`, `buildFeatureGoalDocHtmlFromModel`

**Lägg till efter "Beroenden"-sektionen:**
```typescript
${model.usageCases && model.usageCases.length > 0 ? `
<section class="doc-section" data-source-usage-cases="llm">
  <h2>Användningsfall</h2>
  <p class="muted">Denna subprocess används i följande parent-processer:</p>
  
  ${model.usageCases.map((usageCase, index) => `
    <div style="margin-bottom: 2rem;">
      <h3 style="margin-bottom: 0.5rem; font-size: 1.1rem; font-weight: 600;">
        ${index + 1}. ${usageCase.parentProcess}-processen
      </h3>
      <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Parent-process:</strong> ${usageCase.parentProcess} (<code>${usageCase.parentBpmnFile}</code>)</li>
        <li><strong>CallActivity:</strong> ${usageCase.callActivityName} (<code>${usageCase.callActivityId}</code>)</li>
        <li><strong>Position:</strong> ${usageCase.position}</li>
        ${usageCase.conditions && usageCase.conditions.length > 0 ? `
          <li><strong>Särskilda villkor:</strong> ${usageCase.conditions.join(', ')}</li>
        ` : ''}
        <li><strong>Kontext:</strong> ${usageCase.context}</li>
        ${usageCase.differences ? `
          <li><strong>Skillnader:</strong> ${usageCase.differences}</li>
        ` : ''}
      </ul>
    </div>
  `).join('')}
  
  ${model.commonAspects && model.commonAspects.length > 0 ? `
    <div style="margin-top: 1.5rem; padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem;">
      <h4 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">Gemensamma aspekter:</h4>
      <ul style="margin-top: 0; padding-left: 1.5rem;">
        ${model.commonAspects.map(aspect => `<li>${aspect}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
</section>
` : ''}
```

---

## 4. Data-struktur

### 4.1 TypeScript-interface

**Location:** `src/lib/featureGoalLlmTypes.ts` (eller liknande)

```typescript
export interface UsageCase {
  parentProcess: string;
  parentBpmnFile: string;
  callActivityName: string;
  callActivityId: string;
  position: string;
  context: string;
  conditions?: string[];
  differences?: string;
}

export interface FeatureGoalDocModel {
  summary: string;
  flowSteps: string[];
  dependencies: string[];
  userStories: Array<{
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>;
  usageCases?: UsageCase[];  // NYTT
  commonAspects?: string[];  // NYTT
}
```

### 4.2 Context-data som skickas till LLM

**Location:** `src/lib/llmDocumentation.ts`, `buildContextPayload`

```typescript
// I currentNodeContext
const usageCases = context.usageCases ? context.usageCases.map(uc => ({
  parentProcess: uc.parentProcessName,
  parentBpmnFile: uc.parentBpmnFile,
  callActivityName: uc.callActivityName,
  callActivityId: uc.callActivityId,
  position: `${uc.previousNodes.map(n => n.name).join(', ')} → [subprocess] → ${uc.nextNodes.map(n => n.name).join(', ')}`,
  siblings: uc.siblings.map(s => s.name),
  gatewayConditions: uc.gatewayConditions,
  incomingFlows: uc.incomingFlows,
  outgoingFlows: uc.outgoingFlows,
})) : undefined;

currentNodeContext.usageCases = usageCases;
```

---

## 5. Exempel på genererat innehåll

### 5.1 Scenario: En parent-process

**Input:**
- Subprocess: `mortgage-se-internal-data-gathering.bpmn`
- Parent: `mortgage-se-application.bpmn`
- CallActivity: `internal-data-gathering`

**Genererat innehåll:**
```markdown
(INGEN "Användningsfall"-sektion genereras - uppenbart att subprocessen anropas från Application-processen)
```

### 5.2 Scenario: Flera parent-processer med skillnader

**Input:**
- Subprocess: `mortgage-se-internal-data-gathering.bpmn`
- Parent 1: `mortgage-se-application.bpmn` (inga conditions)
- Parent 2: `mortgage-se-refinancing.bpmn` (condition: customer-type === existing)

**Genererat innehåll (kompakt, fokus på skillnader):**
```markdown
## Användningsfall

Denna subprocess används i flera parent-processer med följande skillnader:

**Application-processen:**
- Anropas alltid för alla kreditansökningar (inga villkor)

**Refinancing-processen:**
- Anropas endast för befintliga kunder (villkor: `customer-type === existing`)
- Data används specifikt för refinancing-bedömning
```

**Alternativ (om många skillnader):**
```markdown
## Användningsfall

Denna subprocess används i flera parent-processer med följande skillnader:

| Parent-process | Särskilda villkor |
|----------------|-------------------|
| Application | Inga villkor - anropas alltid |
| Refinancing | `customer-type === existing` - endast för befintliga kunder |
```

### 5.3 Scenario: Flera parent-processer, inga skillnader

**Input:**
- Subprocess: `mortgage-se-internal-data-gathering.bpmn`
- Parent 1: `mortgage-se-application.bpmn` (inga conditions)
- Parent 2: `mortgage-se-credit-limit-increase.bpmn` (inga conditions, samma användning)

**Genererat innehåll:**
```markdown
(INGEN "Användningsfall"-sektion genereras - alla parent-processer anropar subprocessen på samma sätt, inga skillnader)
```

---

## 6. Implementation-steg

### Steg 1: Samla usage cases-data
- [ ] Lägg till logik i `bpmnGenerators.ts` för att samla parent callActivities
- [ ] Extrahera conditions, siblings, flows
- [ ] Identifiera skillnader mellan anropen
- [ ] Skapa `usageCases`-array ENDAST om det finns skillnader

### Steg 2: Skicka till LLM
- [ ] Uppdatera `NodeDocumentationContext` för att inkludera `usageCases`
- [ ] Uppdatera `buildContextPayload` för att inkludera usage cases i LLM-input
- [ ] Uppdatera prompt för att instruera LLM om usage cases

### Steg 3: LLM-generering
- [ ] Uppdatera `FeatureGoalDocModel` för att inkludera `usageCases` och `commonAspects`
- [ ] Uppdatera prompt med exempel och instruktioner
- [ ] Testa LLM-generering med usage cases

### Steg 4: HTML-rendering
- [ ] Lägg till HTML-rendering för usage cases i `buildFeatureGoalDocHtmlFromModel`
- [ ] Styling och struktur
- [ ] Testa rendering

### Steg 5: Edge cases
- [ ] Hantera fall där ingen parent-process finns (isolerad generering) → INGEN sektion
- [ ] Hantera fall där bara EN parent-process finns → INGEN sektion (uppenbart)
- [ ] Hantera fall där flera parent-processer anropar på samma sätt → INGEN sektion (inga skillnader)
- [ ] Hantera fall där samma parent-process anropar subprocessen flera gånger → Visa skillnader om de finns
- [ ] Hantera fall där gateway-conditions saknas → Visa sektion endast om det finns andra skillnader

---

## 7. Fördelar och Nackdelar

### Fördelar:
- ✅ Ger kontext om specifika skillnader som inte är uppenbara
- ✅ Identifierar gateway-conditions och villkor
- ✅ Förbättrar förståelsen för när subprocessen anropas olika
- ✅ Kort och fokuserad sektion (bara skillnader)

### Nackdelar:
- ⚠️ Kräver logik för att identifiera skillnader
- ⚠️ Kräver extra data-samling från graph
- ⚠️ Kräver LLM-uppdateringar

### Rekommendation:
**Implementera** - Men bara visa sektionen när det finns faktiska skillnader. Kort och fokuserad på det som inte är uppenbart.

