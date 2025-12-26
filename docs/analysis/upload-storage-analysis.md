# Upload och Storage-struktur Analys

## Översikt

Denna analys dokumenterar hur BPMN/DMN filer sparas när de laddas upp, och hur dokumentation länkar till dem via versioning.

## Storage-struktur

### BPMN/DMN Filer
- **Bucket**: `bpmn-files`
- **Storage Path**: `${fileName}` (t.ex. `mortgage.bpmn`)
- **Metadata**: Tabell `bpmn_files` med:
  - `file_name`: Filnamnet (t.ex. `mortgage.bpmn`)
  - `storage_path`: Storage-sökvägen (samma som `file_name`)
  - `file_type`: `bpmn` eller `dmn`
  - `size_bytes`: Filstorlek
  - `github_synced`: Om filen synkats till GitHub
  - `meta`: Parsed BPMN metadata (JSONB)

### Versioning
- **Tabell**: `bpmn_file_versions`
- **Version Hash**: SHA-256 hash av filinnehållet (normaliserat)
- **Version Number**: Sekventiellt nummer (1, 2, 3...)
- **Current Version**: Endast en version per fil kan vara `is_current = true`
- **Content**: Fullständig BPMN XML sparas i tabellen

### Dokumentation Storage
- **Versioned Path**: `docs/claude/{bpmnFileName}/{versionHash}/{docFileName}`
  - Exempel: `docs/claude/mortgage.bpmn/abc123.../epics/mortgage-se-application.html`
- **Non-versioned Path** (fallback): `docs/claude/{docFileName}`
  - Exempel: `docs/claude/epics/mortgage-se-application.html`

## Upload Flow

### 1. Användaren laddar upp fil
- Via `FileUploadArea` komponent
- Använder `useUploadBpmnFile()` hook
- Anropar Supabase Edge Function: `upload-bpmn-file`

### 2. Edge Function (`supabase/functions/upload-bpmn-file/index.ts`)
1. Validerar fil (endast `.bpmn` eller `.dmn`)
2. Parsar BPMN XML för metadata
3. **Sparar fil i storage**: `storagePath = ${fileName}` (root av bucket)
4. Synkar till GitHub (om konfigurerat)
5. Sparar metadata i `bpmn_files` tabell
6. Skapar version i `bpmn_file_versions`:
   - Beräknar content hash (SHA-256)
   - Skapar ny version om hash inte finns
   - Sätter `is_current = true` för ny version
   - Sätter `is_current = false` för alla andra versioner av samma fil

### 3. Dokumentation Generation
- När dokumentation genereras används version hash från aktuell version
- Dokumentation sparas i: `docs/claude/{bpmnFileName}/{versionHash}/...`
- Detta säkerställer att dokumentation länkar till rätt version av BPMN-filen

## Tester som testar Upload

### 1. `file-upload-versioning.spec.ts`
- Testar att filer kan laddas upp utan 406 errors
- Testar att versioner skapas korrekt
- Testar att första versionen skapas (inte version 0)

### 2. `bpmn-file-manager.spec.ts`
- Testar att upload input finns tillgänglig
- Testar att filer kan visas i tabellen efter upload

### 3. `testSteps.ts` - `stepUploadBpmnFile()`
- Återanvändbar funktion för att ladda upp filer i tester
- Används av många andra tester

### 4. `testHelpers.ts` - `ensureBpmnFileExists()`
- Säkerställer att minst en BPMN-fil finns
- Använder `stepUploadBpmnFile()` om inga filer finns

## Verifiering

### ✅ Korrekt Implementation
1. **Filer sparas i root**: `${fileName}` - ✅ Korrekt
2. **Versioning fungerar**: Content hash + version number - ✅ Korrekt
3. **Dokumentation länkar till version**: Använder version hash i path - ✅ Korrekt
4. **Metadata sparas**: I `bpmn_files` tabell - ✅ Korrekt

### ✅ Verifierat och Fixat

1. **Storage Path Consistency** ✅
   - Upload funktionen sparar i root: `${fileName}`
   - Seed script (`seed-bpmn.mjs`) uppdaterat för att också spara i root: `${fileName}`
   - **Status**: Båda använder nu samma struktur (root level)
   - **Notera**: Koden använder `storage_path` från databasen, så även om filer sparas på olika platser fungerar det, men konsistens är bättre

2. **Version Hash i Dokumentation Path**
   - Dokumentation använder: `docs/claude/{bpmnFileName}/{versionHash}/...`
   - **VIKTIGT**: `bpmnFileName` måste inkludera `.bpmn` extension för versioned paths
   - Verifiera att `buildDocStoragePaths()` får korrekt `bpmnFileName` med extension

3. **Historik och Version Tracking**
   - Version history finns i `bpmn_file_versions` tabell
   - Men UI måste visa vilken version som användes när dokumentation genererades
   - **Förbättring**: Spara version hash i dokumentation metadata när den genereras

## Rekommendationer

### 1. Verifiera Storage Path Consistency
```typescript
// I upload-bpmn-file/index.ts (rad 184)
const storagePath = `${fileName}`; // ✅ Korrekt - root level

// I seed-bpmn.mjs (rad 38)
const storagePath = `${storagePrefix}/${fileName}`; // ⚠️ Använder prefix
```

**Åtgärd**: Verifiera att `storagePrefix` är tom sträng eller att seed script uppdateras.

### 2. Förbättra Version Tracking i Dokumentation
- När dokumentation genereras, spara version hash i metadata
- Detta gör det enkelt att se vilken BPMN-version som användes

### 3. Verifiera att Tester Använder Korrekt Struktur
- Alla tester som laddar upp filer bör verifiera att filer sparas korrekt
- Tester bör verifiera att versioner skapas korrekt

## Test Coverage

### Upload Tester
- ✅ `file-upload-versioning.spec.ts` - Testar upload och versioning
- ✅ `bpmn-file-manager.spec.ts` - Testar upload input
- ✅ `testSteps.ts` - Återanvändbar upload funktion
- ✅ `testHelpers.ts` - Helper för att säkerställa filer finns

### Versioning Tester
- ✅ `file-upload-versioning.spec.ts` - Testar version creation
- ⚠️ Saknas: Test för att verifiera att dokumentation länkar till rätt version

### Storage Path Tester
- ⚠️ Saknas: Test för att verifiera att filer sparas i korrekt mapp
- ⚠️ Saknas: Test för att verifiera storage path consistency

## Slutsats

Upload-funktionaliteten är korrekt implementerad:
- ✅ Filer sparas i root av `bpmn-files` bucket
- ✅ Versioning fungerar med content hash
- ✅ Dokumentation länkar till version via hash i path

**Rekommenderade förbättringar:**
1. Verifiera storage path consistency mellan upload och seed
2. Lägg till tester för storage path verification
3. Förbättra version tracking i dokumentation metadata

