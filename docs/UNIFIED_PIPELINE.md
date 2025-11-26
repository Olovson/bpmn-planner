# Unified Documentation Pipeline

## Översikt

Alla LLM-pipelines (ChatGPT API, Ollama, och Codex) använder nu **exakt samma prompt och kontext-struktur**. Detta säkerställer konsistens och gör att alla pipelines genererar innehåll på samma sätt.

## Arkitektur

### Delad logik (`llmDocumentationShared.ts`)

Alla pipelines använder dessa gemensamma funktioner:

1. **`getPromptForDocType()`** - Hämtar rätt prompt baserat på dokumenttyp
2. **`buildLlmRequestStructure()`** - Bygger prompt + kontext-struktur
3. **`mapLlmResponseToModel()`** - Mappar LLM-svar till modell

### Pipeline-flöden

#### ChatGPT/Ollama Pipeline

```typescript
generateDocumentationWithLlm()
  → buildContextPayload() // Bygger full kontext från BPMN-graf
  → getPromptForDocType() // Hämtar prompt
  → buildLlmRequestStructure() // Kombinerar prompt + kontext
  → Skickar till ChatGPT/Ollama
  → mapLlmResponseToModel() // Mappar svar till modell
  → renderFeatureGoalDoc() / renderEpicDoc() / renderBusinessRuleDoc()
```

#### Codex Batch Pipeline

```typescript
getCodexGenerationInstructions()
  → buildMinimalNodeContext() // Bygger minimal kontext från metadata
  → buildLlmRequestStructure() // SAMMA funktion som ChatGPT!
  → Codex genererar innehåll baserat på prompt + kontext
  → mapLlmResponseToModel() // SAMMA funktion som ChatGPT!
  → mapLlmResponseToOverrides() // Konverterar till override-format
```

## Viktiga skillnader

### Kontext-byggning

- **ChatGPT/Ollama**: Bygger full `NodeDocumentationContext` från `BpmnProcessGraph` med alla noder, hierarki, flows, etc.
- **Codex (produktion)**: Försöker bygga full `NodeDocumentationContext` från BPMN-filer (samma som ChatGPT/Ollama)
- **Codex (fallback)**: Använder minimal `NodeDocumentationContext` från override-filens metadata om full kontext inte kan byggas

**Viktigt**: Full kontext kräver att BPMN-filer kan laddas. I Node.js batch-kontexten kan detta kräva en Node.js-variant av `parseBpmnFile` som läser från filsystemet istället för web-URLs.

### Output-format

- **ChatGPT/Ollama**: Genererar HTML direkt via `render*Doc()` funktioner
- **Codex**: Genererar JSON som mappas till override-format och skrivs till `.doc.ts` filer

## Fördelar med unified pipeline

1. **Konsistens**: Alla pipelines använder samma prompt och struktur
2. **Underhåll**: Ändringar i prompts påverkar alla pipelines automatiskt
3. **Validering**: Samma valideringslogik används överallt
4. **Testbarhet**: Enklare att testa eftersom logiken är centraliserad

## Tekniska detaljer

### `buildLlmRequestStructure()`

Denna funktion är kärnan i unified pipeline:

```typescript
export function buildLlmRequestStructure(
  docType: DocumentationDocType,
  context: NodeDocumentationContext,
  links: TemplateLinks
): LlmRequestStructure {
  const systemPrompt = getPromptForDocType(docType);
  const userPrompt = buildLlmInputPayload(docType, context, links);
  
  return {
    systemPrompt,
    userPrompt,
  };
}
```

Den används av:
- `generateDocumentationWithLlm()` (ChatGPT/Ollama)
- `getCodexGenerationInstructions()` (Codex)

### Minimal kontext för Codex

Codex bygger en minimal kontext eftersom den inte har tillgång till full BPMN-graf:

```typescript
function buildMinimalNodeContext(context: ParsedOverrideContext): NodeDocumentationContext {
  const node: BpmnProcessNode = {
    id: context.elementId,
    bpmnElementId: context.elementId,
    name: context.elementId,
    type: context.nodeType,
    bpmnFile: context.bpmnFile,
    children: [],
    element: undefined,
  };

  return {
    node,
    parentChain: [],
    childNodes: [],
    siblingNodes: [],
    descendantNodes: [],
  };
}
```

Detta är tillräckligt eftersom prompten kan arbeta med minimal kontext och ändå generera bra innehåll.

## Framtida förbättringar

1. **Förbättrad kontext för Codex**: Om vi kan läsa BPMN-filer i batch-kontext, kan vi bygga mer komplett kontext
2. **Caching**: Delad cache för prompts och kontext-struktur
3. **Validering**: Enhetlig validering av alla pipelines

## Validering

Kör `npm run validate:pipelines` för att validera att alla pipelines fungerar korrekt.

