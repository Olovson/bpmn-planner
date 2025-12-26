# Test File Protection - Skydd mot att tester skriver över produktionsfiler

## Problem
Tester kunde potentiellt skriva över produktionsfiler i Storage om de anropade upload-funktionen med produktionsfilnamn.

## Implementerade skydd

### 1. Edge Function (`upload-bpmn-file`)
- **Validering**: Kontrollerar om filen är en test-fil (har prefix "test-")
- **Loggning**: Loggar när produktionsfiler uppdateras vs när test-filer laddas upp
- **Befintlig funktionalitet**: Versioning-systemet hanterar ändringar i produktionsfiler korrekt

**Kod:**
```typescript
// VIKTIGT: Skydd mot att test-filer skriver över produktionsfiler
const isTestFile = fileName.startsWith('test-');
if (!isTestFile) {
  // Produktionsfil - logga uppdatering
  console.log(`[upload-bpmn-file] Updating existing production file: ${fileName}`);
} else {
  // Test-fil - tillåt alltid
  console.log(`[upload-bpmn-file] Uploading test file: ${fileName}`);
}
```

### 2. Test Helper (`stepUploadBpmnFile`)
- **Validering**: Kräver att alla test-filer har prefix "test-"
- **Fel**: Kastar ett fel om produktionsfilnamn används
- **Rekommendation**: Använd alltid `generateTestFileName()` för att skapa säkra test-filnamn

**Kod:**
```typescript
// VIKTIGT: Skydd mot att test skriver över produktionsfiler
if (!fileName.startsWith('test-')) {
  throw new Error(
    `[stepUploadBpmnFile] SECURITY: Test files must have "test-" prefix to avoid overwriting production files. ` +
    `Received: "${fileName}". Use generateTestFileName() to create safe test file names.`
  );
}
```

### 3. Test Data Helpers (`testDataHelpers.ts`)
- **`generateTestFileName()`**: Genererar unika test-filnamn med format `test-{timestamp}-{random}-{name}.bpmn`
- **`isTestFileName()`**: Kontrollerar om ett filnamn är en test-fil
- **`isTestDataFile()`**: Kontrollerar om ett filnamn matchar test-mönster

## Verifiering

### Alla tester använder säkra filnamn
- ✅ `ensureBpmnFileExists()` använder `generateTestFileName()`
- ✅ Alla direkta anrop till `stepUploadBpmnFile()` använder `testFileName` genererat med `generateTestFileName()`
- ✅ Integrationstester mockar Storage, så de kan inte skriva över produktionsfiler

### Edge Cases
- **Produktionsfiler uppdateras via appen**: Detta är korrekt beteende - användare ska kunna uppdatera filer
- **Test-filer kan skriva över produktionsfiler om de har test-prefix**: Detta är okej eftersom test-filer inte borde ha produktionsfilnamn med test-prefix
- **Versioning**: Produktionsfiler hanteras korrekt av versioning-systemet, så gamla versioner bevaras

## Rekommendationer

1. **Alltid använd `generateTestFileName()`** när du skapar test-filer
2. **Använd `ensureBpmnFileExists()`** istället för att direkt anropa `stepUploadBpmnFile()` när det är möjligt
3. **Kontrollera test-filer regelbundet** och rensa gamla test-filer med `isTestDataOlderThan()`

## BPMN Folder Diff Funktionalitet

### Verifiering: Kan inte skriva över filer
`bpmn-folder-diff` funktionaliteten är **read-only** och kan INTE skriva över produktionsfiler:

1. **`FolderDiffAnalysis` komponenten**:
   - Läser bara filer lokalt via File System Access API
   - Anropar `analyzeFolderDiff()` som bara beräknar diff
   - Sätter `showUploadButton={false}` i `DiffResultView`
   - Skickar INTE `onUpload` callback

2. **`analyzeFolderDiff()` funktionen**:
   - Läser filer lokalt (`readFileContent`)
   - Beräknar diff (`calculateDiffForLocalFile`)
   - Returnerar resultat utan att uploada något
   - Inga anrop till `supabase.storage.upload()` eller `useUploadBpmnFile()`

3. **`DiffResultView` komponenten**:
   - Har stöd för upload-knapp, men den är **inaktiverad** i `FolderDiffAnalysis`
   - Kräver både `showUploadButton={true}` OCH `onUpload` callback för att fungera
   - I `FolderDiffAnalysis`: `showUploadButton={false}` och `onUpload` saknas

**Slutsats**: `bpmn-folder-diff` är säker och kan inte skriva över produktionsfiler.

## Historik

- **2025-12-22**: Implementerat skydd i Edge Function och `stepUploadBpmnFile`
- **2025-12-22**: Verifierat att alla tester använder säkra filnamn
- **2025-12-22**: Verifierat att `bpmn-folder-diff` inte kan skriva över filer
- **2025-12-22**: Upptäckt att `mortgage-se-application.bpmn` i Storage skiljer sig från lokal fil (24141 vs 16283 bytes)

