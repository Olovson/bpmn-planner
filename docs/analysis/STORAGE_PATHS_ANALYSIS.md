# Analys: Var Lagras Dokumentationsfiler i Supabase Storage?

**Datum:** 2025-12-22  
**Problem:** Användaren undrar om filerna ligger i `llm-debug/docs` och om de borde ha version hash/unik ID.

---

## 1. Två Olika Typer av Filer

### A. Debug-Artifakter (`llm-debug/docs` och `llm-debug/docs-raw`)

**Vad:** JSON-filer från LLM-anrop (för debugging)
**Var:** `llm-debug/docs` och `llm-debug/docs-raw`
**Format:** `llm-debug/{type}/{identifier}-{timestamp}.{extension}`
**Exempel:** `llm-debug/docs-raw/submit-appeal-2025-12-22T10-30-45-123Z.txt`

**Kod:**
- `src/lib/llmDebugStorage.ts` rad 25-27
- Sparas med timestamp i filnamnet (inte version hash)
- Används för debugging, INTE för faktisk dokumentation

### B. Dokumentationsfiler (HTML)

**Vad:** Faktiska HTML-dokumentationsfiler som används i appen
**Var:** `docs/claude/...`
**Format:**
- **Versioned:** `docs/claude/{bpmnFileName}/{bpmnVersionHash}/{docFileName}`
- **Non-versioned:** `docs/claude/{docFileName}`

**Exempel:**
- Versioned: `docs/claude/mortgage-se-application.bpmn/abc123def456/nodes/mortgage-se-application/submit-appeal.html`
- Non-versioned: `docs/claude/nodes/mortgage-se-application/submit-appeal.html`

---

## 2. Hur Filer Sparas

### Upload-Logik (rad 2059-2087 i `BpmnFileManager.tsx`)

```typescript
for (const [docFileName, docContent] of result.docs.entries()) {
  // Extract BPMN file from docFileName
  const docBpmnFile = extractBpmnFileFromDocFileName(docFileName, filesIncluded) || file.file_name;
  const docVersionHash = await getVersionHashForDoc(docBpmnFile);
  
  const { modePath: docPath } = buildDocStoragePaths(
    docFileName,
    effectiveLlmMode ?? null,
    llmProvider,
    docBpmnFile, // Use the extracted BPMN file, not the root file
    docVersionHash // Use the version hash for that specific file
  );
  
  await supabase.storage
    .from('bpmn-files')
    .upload(docPath, htmlBlob, {
      upsert: true,
      contentType: 'text/html; charset=utf-8',
    });
}
```

### `buildDocStoragePaths()` (rad 18-43 i `artifactPaths.ts`)

```typescript
export const buildDocStoragePaths = (
  docFileName: string,
  mode: ArtifactMode,
  provider?: ArtifactProvider,
  bpmnFileName?: string,
  bpmnVersionHash?: string | null
) => {
  // If BPMN version hash is provided, include it in the path
  if (bpmnVersionHash && bpmnFileName) {
    const basePath = `docs/${providerName}/${bpmnFileName}/${bpmnVersionHash}`;
    return { 
      modePath: `${basePath}/${docFileName}`
    };
  }

  // Non-versioned path (used when version hash is not available)
  return { 
    modePath: `docs/${providerName}/${docFileName}`
  };
};
```

**Logik:**
- Om `bpmnVersionHash` finns → versioned path
- Om `bpmnVersionHash` är `null` eller `undefined` → non-versioned path

---

## 3. När Används Version Hash?

### `getVersionHashForDoc()` (rad 1990-2000 i `BpmnFileManager.tsx`)

```typescript
const getVersionHashForDoc = async (bpmnFile: string): Promise<string | null> => {
  try {
    return await getCurrentVersionHash(bpmnFile);
  } catch (error) {
    console.warn(`[BpmnFileManager] Failed to get version hash for ${bpmnFile}:`, error);
    return null;
  }
};
```

**Problemet:**
- Om `getCurrentVersionHash()` misslyckas → returnerar `null`
- Om `null` returneras → används non-versioned path
- Detta betyder att filer kan sparas utan version hash om version-hämtning misslyckas

---

## 4. Vad Borde Hända?

### Rekommenderat Beteende:

1. **Alla dokumentationsfiler BORDE sparas med version hash:**
   - `docs/claude/{bpmnFileName}/{bpmnVersionHash}/{docFileName}`
   - Detta säkerställer att olika versioner av BPMN-filer har separata dokumentation

2. **Non-versioned paths BORDE bara användas som fallback:**
   - Om version hash inte kan hämtas (t.ex. filen finns inte i databasen ännu)
   - Men detta borde vara ett undantag, inte standard

3. **Debug-artifakter (`llm-debug/`) är separata:**
   - Dessa är INTE dokumentationsfiler
   - Dessa används bara för debugging
   - Dessa har timestamp i filnamnet (inte version hash)

---

## 5. Problem och Lösningar

### Problem 1: Filer Sparas Utan Version Hash

**Orsak:**
- `getCurrentVersionHash()` kan returnera `null` om:
  - Filen inte finns i databasen ännu
  - Version-hämtning misslyckas
  - Filen är ny och inte har version hash ännu

**Påverkan:**
- Filer sparas i non-versioned paths: `docs/claude/{docFileName}`
- När BPMN-filen uppdateras, kan gamla och nya dokumentation blandas
- Svårt att hålla reda på vilken version av dokumentation som gäller

**Lösning:**
- Säkerställ att `getCurrentVersionHash()` alltid returnerar en hash
- Om filen är ny, skapa en version hash innan generering
- Om version hash inte kan hämtas, logga varning och använd non-versioned path som fallback

### Problem 2: Filer i `llm-debug/docs` Förväxlas med Dokumentationsfiler

**Orsak:**
- Användaren ser filer i `llm-debug/docs` och tror att det är dokumentationsfiler
- Men dessa är debug-artifakter, inte faktiska dokumentation

**Lösning:**
- Tydliggör skillnaden mellan debug-artifakter och dokumentationsfiler
- Debug-artifakter borde INTE användas som dokumentation (de är bara för debugging)

---

## 6. Sammanfattning

### Var Filerna Faktiskt Lagras:

1. **Debug-Artifakter:**
   - `llm-debug/docs` - HTML från LLM (för debugging)
   - `llm-debug/docs-raw` - JSON från LLM (för debugging)
   - **Format:** `llm-debug/{type}/{identifier}-{timestamp}.{extension}`
   - **Användning:** Debugging, INTE dokumentation

2. **Dokumentationsfiler (HTML):**
   - `docs/claude/{bpmnFileName}/{bpmnVersionHash}/{docFileName}` (versioned)
   - `docs/claude/{docFileName}` (non-versioned, fallback)
   - **Format:** HTML-filer som används i appen
   - **Användning:** Faktisk dokumentation som visas för användare

### Version Hash:

- **BORDE användas:** Alla dokumentationsfiler borde sparas med version hash
- **När används:** När `getCurrentVersionHash()` returnerar en hash
- **När används INTE:** När `getCurrentVersionHash()` returnerar `null` (fallback till non-versioned)

### Rekommendation:

1. **Säkerställ att version hash alltid finns:**
   - Skapa version hash innan generering om filen är ny
   - Logga varning om version hash inte kan hämtas

2. **Tydliggör skillnaden:**
   - Debug-artifakter (`llm-debug/`) är INTE dokumentationsfiler
   - Dokumentationsfiler (`docs/claude/`) är de faktiska filerna

3. **Verifiera att filer sparas korrekt:**
   - Kolla att filer sparas i versioned paths när version hash finns
   - Kolla att filer sparas i non-versioned paths bara som fallback

---

## 7. Verifiering

### Hur Verifiera Var Filer Faktiskt Lagras:

1. **Kolla Supabase Storage:**
   - `docs/claude/` - dokumentationsfiler
   - `llm-debug/docs` - debug HTML
   - `llm-debug/docs-raw` - debug JSON

2. **Kolla om version hash används:**
   - Versioned: `docs/claude/{bpmnFileName}/{hash}/...`
   - Non-versioned: `docs/claude/...` (utan hash)

3. **Kolla loggar:**
   - `[BpmnFileManager] Uploading doc: {docFileName} -> {docPath}`
   - Detta visar exakt var filen sparas

---

## Relaterade Dokument

- `STORAGE_DOCUMENTATION_ANALYSIS.md` - Tidigare analys av storage-innehåll
- `artifactPaths.ts` - Path-building logik
- `bpmnVersioning.ts` - Version hash-hämtning
