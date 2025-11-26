# Codex Full Context Support

## Översikt

Codex försöker nu använda **full kontext** (samma som ChatGPT/Ollama) i produktion, men fallback till minimal kontext om det inte fungerar.

## Hur det fungerar

### Produktion (Full Kontext)

När `getCodexGenerationInstructions()` anropas med `useFullContext: true` (standard):

1. **Försöker bygga full kontext**:
   - Laddar alla BPMN-filer från projektet
   - Bygger `BpmnProcessGraph` med alla noder och hierarki
   - Hittar noden i grafen
   - Bygger `NodeDocumentationContext` med full information (parentChain, childNodes, siblingNodes, descendantNodes)

2. **Använder samma pipeline som ChatGPT/Ollama**:
   - Samma `buildLlmRequestStructure()`
   - Samma prompt
   - Samma kontext-struktur

### Fallback (Minimal Kontext)

Om full kontext inte kan byggas (t.ex. i tester eller om BPMN-filer inte kan laddas):

1. **Bygger minimal kontext**:
   - Använder bara metadata från override-filen (bpmnFile, elementId, nodeType)
   - Ingen hierarki, inga flows, inga relaterade noder

2. **Varning loggas**:
   ```
   [Codex] Using minimal context for <file>::<elementId>. Full context preferred for production.
   ```

## Begränsningar

### Nuvarande begränsning

`parseBpmnFile()` använder `fetch()` för att ladda BPMN-filer via web-URLs (`/bpmn/...`). Detta fungerar i web-miljön men inte direkt i Node.js batch-kontexten.

**Lösning**: För full kontext i Node.js batch-kontexten behöver vi antingen:
1. En Node.js-variant av `parseBpmnFile` som läser från filsystemet
2. Eller en adapter som konverterar filsystem-paths till web-URLs

### Temporär lösning

Just nu fallback till minimal kontext i Node.js batch-kontexten. Detta är acceptabelt för tester men inte idealiskt för produktion.

## Användning

### Standard (Full Kontext)

```typescript
const instructions = await getCodexGenerationInstructions(context);
// Försöker bygga full kontext, fallback till minimal om det inte fungerar
```

### Explicit Full Kontext

```typescript
const instructions = await getCodexGenerationInstructions(context, {
  useFullContext: true,
  projectRoot: '/path/to/project'
});
```

### Minimal Kontext (Tester)

```typescript
const instructions = await getCodexGenerationInstructions(context, {
  useFullContext: false
});
// Använder alltid minimal kontext
```

## Kontrollera vilken kontext som användes

```typescript
const instructions = await getCodexGenerationInstructions(context);
if (instructions._contextType === 'full') {
  console.log('✅ Full kontext används');
} else {
  console.log('⚠️ Minimal kontext används');
}
```

## Framtida förbättringar

1. **Node.js BPMN Parser**: Skapa en variant av `parseBpmnFile` som läser från filsystemet
2. **Caching**: Cache BPMN-grafer för snabbare batch-operationer
3. **Validering**: Validera att full kontext faktiskt fungerar i produktion

