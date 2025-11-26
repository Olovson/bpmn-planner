# Test Isolation & Safety

## Översikt

Detta dokument beskriver hur testerna säkerställer att de inte påverkar produktionsdata och att testdata kan skrivas över säkert.

## Säkerhetsmekanismer

### 1. Temporära Kataloger

Alla filsystem-operationer i testerna använder **temporära kataloger** som skapas i systemets `tmpdir()`:

```typescript
// tests/unit/promptVersioning.test.ts
beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(tmpdir(), 'prompt-version-test-'));
});

afterEach(() => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
```

**Säkerhet:**
- ✅ Testdata skapas i `/tmp/` (eller systemets motsvarighet)
- ✅ Testdata rensas automatiskt efter varje test
- ✅ Ingen risk för att skriva över produktionsfiler i `src/data/node-docs/`

### 2. Isolerade Testfunktioner

Testerna använder **kopierade funktioner** istället för att importera produktionskoden direkt:

```typescript
// tests/unit/codexBatchOverrideHelper.test.ts
// Mock functions similar to codex-batch-auto.mjs
function findOverrideFiles(rootDir: string) {
  const nodeDocsRoot = path.join(rootDir, 'src', 'data', 'node-docs');
  // ... test-implementation
}
```

**Säkerhet:**
- ✅ Testfunktioner tar `rootDir` som parameter
- ✅ Testfunktioner använder `tempDir` istället för `process.cwd()`
- ✅ Produktionskoden körs aldrig med testdata

### 3. Explicit Root Directory

Alla testfunktioner tar en explicit `rootDir` parameter:

```typescript
// Test använder tempDir
const files = findOverrideFiles(tempDir);

// Produktionskod använder process.cwd()
const files = findOverrideFiles(process.cwd());
```

**Säkerhet:**
- ✅ Tester kan aldrig av misstag använda produktionskataloger
- ✅ Tydlig separation mellan test och produktionsmiljö

## Validering

### Kör Testerna

```bash
npm test -- tests/unit/llmDocumentationShared.test.ts tests/unit/promptVersioning.test.ts tests/unit/codexBatchOverrideHelper.test.ts
```

**Förväntat resultat:**
- ✅ Alla tester passerar
- ✅ Inga filer skapas i `src/data/node-docs/`
- ✅ Inga filer skapas i `prompts/llm/`
- ✅ Alla temporära filer rensas efter tester

### Verifiera Säkerhet

1. **Kontrollera att inga produktionsfiler ändras:**
   ```bash
   git status
   # Ska inte visa ändringar i src/data/node-docs/ eller prompts/llm/
   ```

2. **Kontrollera temporära kataloger:**
   ```bash
   ls /tmp/prompt-version-test-* 2>/dev/null || echo "Inga temporära filer kvar"
   ls /tmp/codex-batch-test-* 2>/dev/null || echo "Inga temporära filer kvar"
   ```

3. **Kör testerna flera gånger:**
   ```bash
   for i in {1..5}; do
     npm test -- tests/unit/promptVersioning.test.ts
   done
   ```
   Ska alltid passa utan att lämna kvar filer.

## Produktionskod vs Testkod

### Produktionskod
- Använder `process.cwd()` eller explicit projekt-root
- Skriver till `src/data/node-docs/`
- Läser från `prompts/llm/`

### Testkod
- Använder `tmpdir()` för temporära kataloger
- Skriver till `/tmp/test-*/`
- Skapar mock-data i temporära kataloger
- Rensar upp automatiskt efter varje test

## Best Practices

1. **Använd alltid `tmpdir()` för testdata**
   ```typescript
   tempDir = fs.mkdtempSync(path.join(tmpdir(), 'test-prefix-'));
   ```

2. **Rensa alltid upp i `afterEach`**
   ```typescript
   afterEach(() => {
     if (fs.existsSync(tempDir)) {
       fs.rmSync(tempDir, { recursive: true, force: true });
     }
   });
   ```

3. **Använd explicit rootDir-parameter**
   ```typescript
   // Bra: explicit parameter
   findOverrideFiles(tempDir);
   
   // Dåligt: använder process.cwd()
   findOverrideFiles(); // Kan av misstag använda produktionskatalog
   ```

4. **Verifiera att produktionsfiler inte ändras**
   - Kör `git status` efter tester
   - Kontrollera att inga filer i `src/` ändras

## Troubleshooting

### Problem: Tester skapar filer i produktionskataloger

**Lösning:**
1. Kontrollera att alla testfunktioner tar `rootDir` som parameter
2. Verifiera att `tempDir` används istället för `process.cwd()`
3. Lägg till explicit kontroll:
   ```typescript
   expect(filePath).toContain(tempDir);
   expect(filePath).not.toContain(process.cwd());
   ```

### Problem: Temporära filer lämnas kvar

**Lösning:**
1. Verifiera att `afterEach` hook finns
2. Kontrollera att `fs.rmSync` anropas korrekt
3. Lägg till try-catch för robusthet:
   ```typescript
   afterEach(() => {
     try {
       if (fs.existsSync(tempDir)) {
         fs.rmSync(tempDir, { recursive: true, force: true });
       }
     } catch (err) {
       console.warn('Failed to cleanup temp dir:', err);
     }
   });
   ```

