# Pipeline Validation Guide

## Validera innan stora körningar

Innan du kör batch-generering på 200+ noder, validera att pipelinen är redo:

```bash
npm run validate:codex-pipeline
```

Detta kontrollerar:
- ✅ Alla nödvändiga filer finns
- ✅ Prompt-versioner är korrekt satta
- ✅ NPM scripts är konfigurerade
- ✅ Tester finns och fungerar
- ✅ Dokumentation är komplett
- ✅ Moduler exporterar rätt funktioner

## Vad valideras?

### 1. Filer
- `scripts/codex-batch-auto.mjs`
- `scripts/check-prompt-versions.mjs`
- `src/lib/llmDocumentationShared.ts`
- `src/lib/codexBatchOverrideHelper.ts`
- `prompts/llm/*.md`

### 2. Prompt-versioner
- Feature/epic prompt har version-kommentar
- Business rule prompt har version-kommentar

### 3. NPM Scripts
- `codex:batch:auto`
- `check:prompt-versions`
- `create:all-node-docs`

### 4. Tester
- `llmDocumentationShared.test.ts`
- `promptVersioning.test.ts`
- `codexBatchOverrideHelper.test.ts`
- `fallbackSafety.test.ts`

### 5. Dokumentation
- `CODEX_BATCH_AUTO.md`
- `PROMPT_VERSIONING.md`
- `FALLBACK_SAFETY.md`

### 6. Moduler
- Exports i `llmDocumentationShared.ts`
- Exports i `codexBatchOverrideHelper.ts`

## Statusrapportering

När Codex bearbetar filer, uppdateras `.codex-batch-status.json` automatiskt:

```json
{
  "total": 200,
  "completed": [
    "src/data/node-docs/epic/file1.doc.ts",
    "src/data/node-docs/epic/file2.doc.ts"
  ],
  "current": "src/data/node-docs/epic/file3.doc.ts",
  "lastUpdated": "2024-11-26T20:00:00Z",
  "started": "2024-11-26T19:00:00Z"
}
```

**Följ progress:**
```bash
# Se status
cat .codex-batch-status.json | jq

# Se progress
cat .codex-batch-status.json | jq '.completed | length, .total'
```

## Felsökning

### Problem: Validering misslyckas

**Lösning:**
1. Kör `npm run validate:codex-pipeline` för detaljer
2. Åtgärda alla fel som listas
3. Kör validering igen tills alla kontroller passerar

### Problem: Statusfil uppdateras inte

**Lösning:**
1. Kontrollera att Codex har instruktioner att uppdatera statusfilen
2. Verifiera att `.codex-batch-status.json` finns
3. Kontrollera att Codex har skrivrättigheter

### Problem: Codex frågar om den ska fortsätta

**Lösning:**
1. Verifiera att instruktionerna i `.codex-batch-all.md` innehåller "Fråga INTE"
2. Ge Codex tydlig instruktion: "Fortsätt automatiskt utan att fråga"

## Best Practices

1. **Validera alltid innan stora körningar**
   ```bash
   npm run validate:codex-pipeline
   ```

2. **Kör tester**
   ```bash
   npm test -- tests/unit/llmDocumentationShared.test.ts tests/unit/promptVersioning.test.ts
   ```

3. **Kontrollera prompt-versioner**
   ```bash
   npm run check:prompt-versions
   ```

4. **Följ status under körning**
   ```bash
   watch -n 5 'cat .codex-batch-status.json | jq'
   ```

5. **Verifiera resultat efter körning**
   ```bash
   git diff src/data/node-docs/
   ```

