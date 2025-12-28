# Analys: Testa Dokumentationsgenerering utan Claude

## Datum: 2025-12-27

## Mål

Skapa ett test som validerar att dokumentationsgenereringen fungerar korrekt (filtrering, sortering, ordning) **utan att behöva anropa Claude API**.

---

## Vad Kan Testas Utan Claude?

### 1. Filtrering av Noder ✅
**Vad testas:**
- CallActivities med `missingDefinition = true` hoppas över
- CallActivities där `subprocessFile` inte finns i `existingBpmnFiles` hoppas över
- Endast noder från filer i `analyzedFiles` inkluderas

**Hur testas:**
- Använd `generateAllFromBpmnWithGraph` med `useLlm = false` (templates) eller mocka Claude API
- Spåra vilka noder som genereras via `progressCallback` eller `result.docs.keys()`
- Verifiera att callActivities med saknade subprocess-filer INTE genereras

**Exempel:**
```typescript
const progressEvents: Array<{ phase: string; detail?: string }> = [];
const progressCallback = (phase: string, label: string, detail?: string) => {
  if (phase === 'docgen:node') {
    progressEvents.push({ phase, detail });
  }
};

const result = await generateAllFromBpmnWithGraph(
  'mortgage-se-application.bpmn',
  ['mortgage-se-application.bpmn'], // INTE household, stakeholder
  [],
  false,
  false, // useLlm = false (templates)
  progressCallback
);

// Verifiera att INGA Feature Goals genererades för household/stakeholder
const householdFGs = Array.from(result.docs.keys()).filter(k => k.includes('household'));
expect(householdFGs.length).toBe(0);
```

---

### 2. Topologisk Sortering av Filer ✅
**Vad testas:**
- Subprocess-filer genereras FÖRE parent-filer
- Dependency-grafen byggs korrekt
- Filerna sorteras topologiskt (inte alfabetiskt)

**Hur testas:**
- Använd `progressCallback` för att spåra i vilken ordning filer bearbetas
- `reportProgress('docgen:file', 'Genererar dokumentation/testinstruktioner', file)` anropas för varje fil
- Verifiera att filordningen är korrekt (subprocess-filer före parent-filer)

**Exempel:**
```typescript
const fileOrder: string[] = [];
const progressCallback = (phase: string, label: string, detail?: string) => {
  if (phase === 'docgen:file' && detail) {
    fileOrder.push(detail); // detail = filnamn
  }
};

const result = await generateAllFromBpmnWithGraph(
  'mortgage.bpmn',
  [
    'mortgage.bpmn',
    'mortgage-se-application.bpmn',
    'mortgage-se-internal-data-gathering.bpmn',
  ],
  [],
  true, // useHierarchy = true
  false, // useLlm = false
  progressCallback
);

// Verifiera ordning: internal-data-gathering FÖRE application FÖRE mortgage
const internalIdx = fileOrder.indexOf('mortgage-se-internal-data-gathering.bpmn');
const applicationIdx = fileOrder.indexOf('mortgage-se-application.bpmn');
const mortgageIdx = fileOrder.indexOf('mortgage.bpmn');

expect(internalIdx).toBeLessThan(applicationIdx);
expect(applicationIdx).toBeLessThan(mortgageIdx);
```

---

### 3. Progress-Meddelanden för Noder ✅
**Vad testas:**
- Progress-meddelanden genereras i rätt ordning
- CallActivities med saknade subprocess-filer hoppas över i progress-meddelanden
- Rätt `subprocessFile` visas i progress-meddelanden

**Hur testas:**
- Använd `progressCallback` för att spåra alla progress-meddelanden
- `reportProgress('docgen:node', 'Genererar dokumentation', detailMessage)` anropas för varje nod
- `detailMessage` innehåller nodtyp, namn och subprocess-fil (för callActivities)
- Verifiera att progress-meddelanden är korrekta

**Exempel:**
```typescript
const nodeProgress: string[] = [];
const progressCallback = (phase: string, label: string, detail?: string) => {
  if (phase === 'docgen:node' && detail) {
    nodeProgress.push(detail);
  }
};

const result = await generateAllFromBpmnWithGraph(
  'mortgage-se-application.bpmn',
  [
    'mortgage-se-application.bpmn',
    'mortgage-se-internal-data-gathering.bpmn', // EXISTS
    // INTE household, stakeholder (saknas)
  ],
  [],
  true,
  false,
  progressCallback
);

// Verifiera att INGA progress-meddelanden för household/stakeholder
const householdProgress = nodeProgress.filter(p => p.includes('Household'));
const stakeholderProgress = nodeProgress.filter(p => p.includes('Stakeholder'));
expect(householdProgress.length).toBe(0);
expect(stakeholderProgress.length).toBe(0);

// Verifiera att internal-data-gathering progress-meddelanden är korrekta
const internalProgress = nodeProgress.filter(p => 
  p.includes('Internal data gathering') && p.includes('mortgage-se-internal-data-gathering.bpmn')
);
expect(internalProgress.length).toBeGreaterThan(0);
```

---

### 4. Dependency-Graf Byggning ✅
**Vad testas:**
- Dependency-grafen byggs korrekt från `graph.allNodes`
- Dependencies inkluderas bara om båda filerna är i `analyzedFiles`
- Dependencies hoppas över om `subprocessFile` inte finns i `existingBpmnFiles`

**Hur testas:**
- Mocka eller extrahera `fileDependencies` från `generateAllFromBpmnWithGraph`
- Eller: Verifiera filordningen (topological sorting använder dependency-grafen)
- Om filordningen är korrekt, betyder det att dependency-grafen byggdes korrekt

**Exempel:**
```typescript
// Indirekt validering via filordning
// Om topological sorting fungerar, betyder det att dependency-grafen byggdes korrekt
const fileOrder: string[] = [];
const progressCallback = (phase: string, label: string, detail?: string) => {
  if (phase === 'docgen:file' && detail) {
    fileOrder.push(detail);
  }
};

// Test med filer som har dependencies
const result = await generateAllFromBpmnWithGraph(
  'mortgage.bpmn',
  [
    'mortgage.bpmn',
    'mortgage-se-application.bpmn',
    'mortgage-se-internal-data-gathering.bpmn',
  ],
  [],
  true,
  false,
  progressCallback
);

// Verifiera att internal-data-gathering kommer FÖRE application
// (eftersom application anropar internal-data-gathering)
const internalIdx = fileOrder.indexOf('mortgage-se-internal-data-gathering.bpmn');
const applicationIdx = fileOrder.indexOf('mortgage-se-application.bpmn');
expect(internalIdx).toBeLessThan(applicationIdx);
```

---

### 5. `missingDefinition` Sätts Korrekt ✅
**Vad testas:**
- `missingDefinition` sätts till `true` när `subprocessFile` saknas
- `missingDefinition` sätts till `true` när `subprocessFile` inte finns i `existingBpmnFiles`

**Hur testas:**
- Använd `buildBpmnProcessGraph` direkt för att bygga grafen
- Inspecta noderna i grafen och verifiera att `missingDefinition` är korrekt satt
- Eller: Verifiera indirekt genom att se att callActivities med saknade subprocess-filer INTE genereras

**Exempel:**
```typescript
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';

const graph = await buildBpmnProcessGraph(
  'mortgage-se-application.bpmn',
  ['mortgage-se-application.bpmn'], // INTE household
  undefined
);

// Hitta callActivity "household"
const householdNode = Array.from(graph.allNodes.values()).find(
  node => node.type === 'callActivity' && node.name === 'Household'
);

// Verifiera att missingDefinition är true
expect(householdNode?.missingDefinition).toBe(true);
expect(householdNode?.subprocessFile).toBeUndefined();
```

---

## Test-Strategi

### Test 1: Validera Filtrering
**Syfte:** Verifiera att callActivities med saknade subprocess-filer hoppas över

**Steg:**
1. Skapa test med `mortgage-se-application.bpmn` men INTE `mortgage-se-household.bpmn`
2. Använd `generateAllFromBpmnWithGraph` med `useLlm = false`
3. Verifiera att INGA Feature Goals genereras för "household"
4. Verifiera att INGA progress-meddelanden visas för "household"

---

### Test 2: Validera Topologisk Sortering
**Syfte:** Verifiera att filerna sorteras topologiskt (subprocess-filer före parent-filer)

**Steg:**
1. Skapa test med `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-internal-data-gathering.bpmn`
2. Använd `progressCallback` för att spåra filordning
3. Verifiera att `internal-data-gathering` genereras FÖRE `application`
4. Verifiera att `application` genereras FÖRE `mortgage`

---

### Test 3: Validera Progress-Meddelanden
**Syfte:** Verifiera att progress-meddelanden är korrekta och att rätt `subprocessFile` visas

**Steg:**
1. Skapa test med filer som har callActivities
2. Använd `progressCallback` för att spåra alla progress-meddelanden
3. Verifiera att progress-meddelanden för callActivities innehåller rätt `subprocessFile`
4. Verifiera att callActivities med saknade subprocess-filer INTE får progress-meddelanden

---

### Test 4: Validera `missingDefinition`
**Syfte:** Verifiera att `missingDefinition` sätts korrekt i grafen

**Steg:**
1. Använd `buildBpmnProcessGraph` direkt
2. Inspecta noderna i grafen
3. Verifiera att callActivities med saknade subprocess-filer har `missingDefinition = true`
4. Verifiera att callActivities med existerande subprocess-filer har `missingDefinition = false`

---

## Implementation

### Mock Claude API
```typescript
vi.mock('@/lib/llmDocumentation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llmDocumentation')>();
  return {
    ...actual,
    generateDocumentationWithLlm: vi.fn(async () => ({
      text: JSON.stringify({
        summary: 'Test summary',
        prerequisites: [],
        flowSteps: [],
        userStories: []
      }),
      provider: 'cloud' as const,
      fallbackUsed: false,
      docJson: {
        summary: 'Test summary',
        prerequisites: [],
        flowSteps: [],
        userStories: []
      }
    })),
  };
});
```

### Eller: Använd Templates (`useLlm = false`)
```typescript
const result = await generateAllFromBpmnWithGraph(
  'mortgage-se-application.bpmn',
  ['mortgage-se-application.bpmn'],
  [],
  false,
  false, // useLlm = false (templates)
  progressCallback
);
```

---

## Fördelar med Detta Tillvägagångssätt

1. **Snabbare:** Inga API-anrop till Claude
2. **Mer deterministiskt:** Inga varierande LLM-svar
3. **Fokuserar på logik:** Testar filtrering, sortering, ordning (inte LLM-kvalitet)
4. **Lättare att debugga:** Tydliga assertions om vad som förväntas
5. **Kan köras offline:** Inga externa dependencies

---

## Begränsningar

1. **Testar inte LLM-kvalitet:** Validerar inte att dokumentationen är bra
2. **Testar inte faktiskt innehåll:** Bara strukturen och ordningen
3. **Kräver mockade BPMN-filer:** Eller faktiska BPMN-filer från fixtures

---

## Rekommendation

**Skapa ett omfattande test som validerar:**
1. ✅ Filtrering av noder (callActivities med saknade subprocess-filer hoppas över)
2. ✅ Topologisk sortering (subprocess-filer före parent-filer)
3. ✅ Progress-meddelanden (korrekta och i rätt ordning)
4. ✅ `missingDefinition` sätts korrekt

**Detta test kan köras:**
- Med `useLlm = false` (templates)
- Eller med mockad Claude API
- Använder faktiska BPMN-filer från fixtures
- Validerar logiken utan att behöva faktisk dokumentation

