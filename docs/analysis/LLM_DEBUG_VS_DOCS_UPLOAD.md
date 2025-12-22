# Analys: Varför Hamnar Filer i `llm-debug/docs` Istället för `docs/claude/...`?

**Datum:** 2025-12-22  
**Problem:** Filer sparas i `llm-debug/docs` med timestamp istället för `docs/claude/...` med version hash.

---

## 1. Två Olika Upload-Flöden

### A. Debug-Artifakter (`llm-debug/docs`)

**När sparas:**
- Under LLM-generering (innan HTML-rendering)
- Anropas från `saveLlmDebugArtifact('doc', identifier, llmResult.text)`

**Var sparas:**
- `llm-debug/docs/{identifier}-{timestamp}.txt`
- Exempel: `llm-debug/docs/mortgage-se-application.bpmn-activity_1mezc6h-2025-12-22T15-14-49-196Z.txt`

**Vad innehåller:**
- Raw LLM output (text från LLM, INTE HTML)
- Används för debugging, INTE för faktisk dokumentation

**Kod:**
- `src/lib/llmDebugStorage.ts` rad 10-43
- Anropas från:
  - `src/lib/bpmnGenerators.ts` rad 1064
  - `src/lib/llmDocumentation.ts` rad 521

### B. Dokumentationsfiler (HTML) (`docs/claude/...`)

**När sparas:**
- Efter generering, i upload-steget
- Anropas från `BpmnFileManager.tsx` rad 2059-2087

**Var sparas:**
- `docs/claude/{bpmnFileName}/{bpmnVersionHash}/{docFileName}` (versioned)
- `docs/claude/{docFileName}` (non-versioned fallback)

**Vad innehåller:**
- Faktiska HTML-dokumentationsfiler
- Används i appen för att visa dokumentation

**Kod:**
- `src/pages/BpmnFileManager.tsx` rad 2059-2087
- Använder `buildDocStoragePaths()` för att bygga path

---

## 2. Flöde

### Steg 1: LLM-Generering
```
renderDocWithLlm() 
  → generateDocumentationWithLlm()
    → LLM API call
    → saveLlmDebugArtifact('doc', identifier, llmResult.text)  ← DEBUG-ARTIFAKT
    → return llmResult.text
  → renderFeatureGoalDoc() / renderEpicDoc()
    → return HTML
  → result.docs.set(docFileName, HTML)
```

### Steg 2: Upload
```
BpmnFileManager.tsx
  → for (const [docFileName, docContent] of result.docs.entries())
    → buildDocStoragePaths(docFileName, ..., docVersionHash)
    → supabase.storage.upload(docPath, htmlBlob)  ← FAKTISK DOKUMENTATION
```

---

## 3. Problem: Varför Ser Användaren Filer i `llm-debug/docs`?

### Möjliga Orsaker:

#### A. Upload-Steget Körs Inte
**Symptom:** Filer finns bara i `llm-debug/docs`, inte i `docs/claude/...`
**Orsak:**
- Upload-loopen (rad 2059-2087) körs inte
- `result.docs.size === 0` (inga filer att ladda upp)
- Generering avbryts innan upload

**Verifiering:**
- Kolla loggar: `[BpmnFileManager] Uploading ${result.docs.size} docs for ${file.file_name}`
- Kolla om `result.docs` innehåller filer

#### B. Upload-Steget Misslyckas
**Symptom:** Filer finns i `llm-debug/docs`, men inte i `docs/claude/...`
**Orsak:**
- `upload()` misslyckas (fel i Supabase Storage)
- `buildDocStoragePaths()` returnerar fel path
- `docVersionHash` är `null` (använder non-versioned path, men upload misslyckas ändå)

**Verifiering:**
- Kolla loggar: `[BpmnFileManager] Error uploading ${docFileName} to ${docPath}:`
- Kolla om upload-fel loggas

#### C. Användaren Tittar på Fel Filer
**Symptom:** Filer finns i både `llm-debug/docs` OCH `docs/claude/...`
**Orsak:**
- Användaren tittar på debug-artifakter istället för dokumentation
- Debug-artifakter är raw LLM output (inte HTML)
- Dokumentationsfiler är HTML och ligger i `docs/claude/...`

**Verifiering:**
- Kolla om filer finns i `docs/claude/...`
- Jämför filnamn: debug-artifakter har timestamp, dokumentation har `.html`

---

## 4. Analys av Användarens Exempel

**Användarens fil:**
```
llm-debug/docs/mortgage-se-application.bpmn-activity_1mezc6h-2025-12-22T15-14-49-196Z.txt
```

**Detta är:**
- ✅ Debug-artifakt (sparad av `saveLlmDebugArtifact()`)
- ✅ Raw LLM output (inte HTML)
- ✅ Med timestamp i filnamnet
- ❌ INTE faktisk dokumentation

**Vad borde finnas:**
```
docs/claude/mortgage-se-application.bpmn/{versionHash}/nodes/mortgage-se-application/Activity_1mezc6h.html
```

**Eller (om version hash saknas):**
```
docs/claude/nodes/mortgage-se-application/Activity_1mezc6h.html
```

---

## 5. Möjliga Problem

### Problem 1: Upload-Steget Körs Inte

**Orsak:**
- `result.docs.size === 0` (inga filer genererades)
- Generering avbryts innan upload
- Upload-loopen hoppas över av någon anledning

**Lösning:**
- Verifiera att `result.docs` innehåller filer
- Kolla loggar för upload-meddelanden
- Verifiera att upload-loopen körs

### Problem 2: Upload-Steget Misslyckas

**Orsak:**
- `upload()` returnerar fel
- `buildDocStoragePaths()` returnerar fel path
- Supabase Storage permissions-problem

**Lösning:**
- Kolla upload-fel i loggar
- Verifiera att `docPath` är korrekt
- Kolla Supabase Storage permissions

### Problem 3: Version Hash Saknas

**Orsak:**
- `getCurrentVersionHash()` returnerar `null`
- Filen finns inte i databasen ännu
- Version-hämtning misslyckas

**Påverkan:**
- Filer sparas i non-versioned paths: `docs/claude/{docFileName}`
- Men detta borde fortfarande fungera (bara utan version hash)

**Lösning:**
- Säkerställ att version hash alltid finns
- Logga varning om version hash saknas

---

## 6. Verifiering

### Steg 1: Kolla Om Upload-Steget Körs

**I loggar, leta efter:**
```
[BpmnFileManager] Uploading ${result.docs.size} docs for ${file.file_name}
[BpmnFileManager] Uploading doc: ${docFileName} -> ${docPath}
[BpmnFileManager] ✓ Successfully uploaded ${docFileName} to ${docPath}
```

**Om dessa inte finns:**
- Upload-steget körs inte
- `result.docs.size === 0` eller generering avbryts

### Steg 2: Kolla Om Upload Misslyckas

**I loggar, leta efter:**
```
[BpmnFileManager] Error uploading ${docFileName} to ${docPath}: ${error}
```

**Om dessa finns:**
- Upload misslyckas
- Kolla felmeddelandet för orsak

### Steg 3: Kolla Om Filer Finns i `docs/claude/...`

**I Supabase Storage:**
- Lista filer i `docs/claude/`
- Jämför med filer i `llm-debug/docs`
- Debug-artifakter har timestamp, dokumentation har `.html`

---

## 7. Slutsats

### Vad Användaren Ser:

**Filer i `llm-debug/docs`:**
- ✅ Debug-artifakter (raw LLM output)
- ✅ Sparas under LLM-generering
- ✅ Med timestamp i filnamnet
- ❌ INTE faktisk dokumentation

### Vad Borde Finnas:

**Filer i `docs/claude/...`:**
- ✅ Faktiska HTML-dokumentationsfiler
- ✅ Sparas i upload-steget
- ✅ Med version hash (om tillgängligt)
- ✅ Används i appen

### Möjliga Problem:

1. **Upload-steget körs inte** - `result.docs` är tom eller generering avbryts
2. **Upload-steget misslyckas** - Fel i Supabase Storage eller path-building
3. **Användaren tittar på fel filer** - Debug-artifakter istället för dokumentation

### Rekommendation:

1. **Verifiera att upload-steget körs:**
   - Kolla loggar för upload-meddelanden
   - Verifiera att `result.docs` innehåller filer

2. **Verifiera att filer sparas korrekt:**
   - Kolla om filer finns i `docs/claude/...`
   - Jämför med filer i `llm-debug/docs`

3. **Tydliggör skillnaden:**
   - Debug-artifakter (`llm-debug/`) är INTE dokumentation
   - Dokumentationsfiler (`docs/claude/`) är de faktiska filerna

---

## Relaterade Dokument

- `STORAGE_PATHS_ANALYSIS.md` - Analys av storage paths
- `llmDebugStorage.ts` - Debug-artifakt-sparning
- `BpmnFileManager.tsx` - Upload-logik
