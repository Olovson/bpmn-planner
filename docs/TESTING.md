# Testing Guide

## Test Coverage

Detta projekt innehåller omfattande tester för BPMN-dokumentationsfunktionaliteten.

## Teststruktur

### Unit Tests (`tests/unit/`)

#### LLM Documentation Shared (`llmDocumentationShared.test.ts`)
Tester för delad abstraktion mellan ChatGPT API och Codex batch-generering:
- `getPromptForDocType()` - Hämtar rätt prompt för varje dokumenttyp
- `buildLlmInputPayload()` - Bygger JSON-payload för LLM
- `buildLlmRequestStructure()` - Bygger komplett request-struktur
- `mapLlmResponseToModel()` - Mappar LLM-svar till modeller

#### Prompt Versioning (`promptVersioning.test.ts`)
Tester för prompt-versionering:
- `getPromptVersion()` - Extraherar version från prompt-filer
- `getOverridePromptVersion()` - Extraherar version från override-filer
- Version-jämförelse - Identifierar gamla versioner

#### Codex Batch Override Helper (`codexBatchOverrideHelper.test.ts`)
Tester för batch-generering av overrides:
- `findOverrideFiles()` - Hittar override-filer
- `needsUpdate()` - Identifierar filer som behöver uppdateras
- `analyzeFile()` - Analyserar filer och extraherar metadata

### Integration Tests (`tests/integration/`)

#### LLM Real Smoke Tests (`llm.real.smoke.test.ts`)
Riktiga LLM-tester som kör mot ChatGPT/Ollama (opt-in):
- Feature Goal generering
- Epic generering
- Business Rule generering

## Köra Tester

### Alla tester
```bash
npm test
```

### Specifika testfiler
```bash
npm test -- tests/unit/llmDocumentationShared.test.ts
npm test -- tests/unit/promptVersioning.test.ts
npm test -- tests/unit/codexBatchOverrideHelper.test.ts
```

### LLM Smoke Tests (kräver API-nycklar)
```bash
npm run test:llm:smoke        # ChatGPT
npm run test:llm:smoke:cloud  # Strikt ChatGPT
npm run test:llm:smoke:local  # Ollama (lokal)
```

### Watch Mode
```bash
npm run test:watch
```

## Test Coverage för Ny Funktionalitet

### Prompt Versionering
- ✅ Extrahera version från prompt-filer
- ✅ Extrahera version från override-filer
- ✅ Identifiera filer med gamla versioner
- ✅ Automatisk versionering när ingen version finns

### Batch Generering
- ✅ Hitta override-filer i olika scope
- ✅ Identifiera filer som behöver uppdateras (TODO, tomma fält, gamla versioner)
- ✅ Analysera filer och extrahera metadata
- ✅ NODE CONTEXT parsing

### Shared Abstraktion
- ✅ Prompt-selektion per dokumenttyp
- ✅ Context payload building
- ✅ LLM request structure building
- ✅ Response mapping till modeller

## Best Practices

1. **Mocka externa beroenden** - Använd `vi.mock()` för LLM-klienter och filsystem
2. **Använd temporära kataloger** - Skapa temporära filer i `tmpdir()` för fil-tester
3. **Testa edge cases** - Inkludera tester för null, tomma värden, ogiltiga format
4. **Isolera tester** - Varje test ska vara oberoende och kunna köras i valfri ordning

## Debugging Tester

### Verbose Output
```bash
npm test -- --reporter=verbose
```

### Kör en specifik test
```bash
npm test -- -t "should extract version from prompt file"
```

### Debug med Node Inspector
```bash
node --inspect-brk node_modules/.bin/vitest run
```

