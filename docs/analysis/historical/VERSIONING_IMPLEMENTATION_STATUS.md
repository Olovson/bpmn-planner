# BPMN File Versioning - Implementeringsstatus

## ✅ Fas 1: Grundläggande versionshantering - KLART

### Databas
- ✅ **Migration skapad**: `supabase/migrations/20251201000000_create_bpmn_file_versions.sql`
  - Skapar `bpmn_file_versions` tabell med content-based hashing
  - Uppdaterar `bpmn_files` med `current_version_hash` och `current_version_number`
  - Uppdaterar `bpmn_file_diffs` med version-hash kolumner
  - Automatiska triggers för version_number och is_current hantering

### Utility-funktioner
- ✅ **`src/lib/bpmnVersioning.ts`** - Skapad med:
  - `calculateContentHash()` - SHA-256 hash-beräkning (fungerar i browser och Node.js)
  - `getCurrentVersionHash()` - Hämta nuvarande version hash
  - `getCurrentVersion()` - Hämta nuvarande version-objekt
  - `getAllVersions()` - Hämta alla versioner för en fil
  - `getVersionByHash()` - Hämta specifik version
  - `createOrGetVersion()` - Skapa eller hämta version (med deduplicering)
  - `setVersionAsCurrent()` - Sätt version som current
  - `getPreviousVersion()` - Hämta tidigare version

### Upload-logik
- ✅ **`supabase/functions/upload-bpmn-file/index.ts`** - Uppdaterad:
  - Beräknar content hash vid uppladdning
  - Skapar ny version om innehållet är nytt
  - Sätter version som current automatiskt
  - Uppdaterar `bpmn_files.current_version_hash`

### Diff-beräkning
- ✅ **`src/lib/bpmnDiffRegeneration.ts`** - Uppdaterad:
  - Använder versioner istället för `previous_version_content`
  - Hämtar current och previous version från `bpmn_file_versions`
  - Sparar diff med `from_version_hash` och `to_version_hash`
  - Automatisk deduplicering (samma innehåll = samma version)

- ✅ **`src/lib/bpmnDiff.ts`** - Uppdaterad:
  - `diffResultToDbFormat()` accepterar nu version-hash parametrar
  - Sparar version-information i alla diff-rader

## ✅ Fas 2: Artefakt-versionering - DELVIS KLART

### Artefakt-paths
- ✅ **`src/lib/artifactPaths.ts`** - Uppdaterad:
  - `buildDocStoragePaths()` accepterar nu `bpmnFileName` och `versionHash`
  - Ny struktur: `docs/{mode}/{provider}/{bpmnFileName}/{versionHash}/{docFileName}`
  - Backward compatible - fallback till gammal struktur om ingen version-hash

### Artefakt-generering
- ✅ **`src/pages/BpmnFileManager.tsx`** - Uppdaterad:
  - Hämtar `currentVersionHash` innan generering
  - Skickar version-hash till `buildDocStoragePaths()`
  - Dokumentation sparas med version-hash i path

### Artefakt-läsning
- ⏳ **`src/pages/DocViewer.tsx`** - Behöver uppdateras:
  - Nuvarande logik försöker flera paths (fungerar för backward compatibility)
  - Bör uppdateras för att prioritera versionerade paths
  - Kan lägga till fallback-logik för att hitta dokumentation med current version hash

## ⏳ Fas 3: Versionshistorik-UI - PENDING

### Versionshistorik-sida
- ⏳ Skapa ny sida `/bpmn-versions/:fileName`
- ⏳ Visa lista över alla versioner för en fil
- ⏳ Visa diff mellan versioner
- ⏳ Möjlighet att "återställa" till tidigare version
- ⏳ Visa vilka artefakter som är kopplade till varje version

### UI-integration
- ⏳ Lägg till versionsindikator i BpmnFileManager
- ⏳ Varning när artefakter är kopplade till äldre versioner
- ⏳ Snabb länk till versionshistorik från fil-listan

## Migration-instruktioner

### Steg 1: Kör migration
```bash
npm run supabase:ensure-schema
```

Detta kommer att:
- Skapa `bpmn_file_versions` tabell
- Uppdatera `bpmn_files` med version-kolumner
- Uppdatera `bpmn_file_diffs` med version-kolumner
- Skapa triggers för automatisk version-hantering

### Steg 2: Migrera befintliga filer (valfritt)
Om du har befintliga BPMN-filer, kan du skapa initiala versioner:

```sql
-- Skapa versioner för alla befintliga BPMN-filer
-- Detta kan göras via en migration eller script
```

### Steg 3: Testa
1. Ladda upp en BPMN-fil - kontrollera att version skapas
2. Ladda upp samma fil igen - kontrollera att ingen ny version skapas (deduplicering)
3. Ladda upp modifierad fil - kontrollera att ny version skapas
4. Generera dokumentation - kontrollera att den sparas med version-hash i path

## Backward Compatibility

### Befintlig funktionalitet
- ✅ Alla befintliga artefakter fungerar fortfarande (legacy paths)
- ✅ Diff-beräkning fungerar även utan versioner (fallback)
- ✅ Upload fungerar även om versioning misslyckas (non-blocking)

### Migration-path
- Gamla artefakter behålls i legacy paths
- Nya artefakter sparas med version-hash
- DocViewer försöker både nya och gamla paths

## Nästa steg

1. **Testa grundläggande funktionalitet**
   - Verifiera att versioner skapas vid upload
   - Verifiera att diff-beräkning fungerar med versioner
   - Verifiera att dokumentation sparas med version-hash

2. **Uppdatera DocViewer** (Fas 2 - återstående)
   - Lägg till logik för att hitta dokumentation med current version hash
   - Prioritera versionerade paths över legacy paths

3. **Skapa versionshistorik-UI** (Fas 3)
   - Skapa `/bpmn-versions/:fileName` sida
   - Implementera diff-visning mellan versioner
   - Implementera "återställ till version" funktionalitet

## Tekniska detaljer

### Content Hash
- SHA-256 hash av normaliserad BPMN XML
- Normalisering: trim whitespace, normalisera line breaks
- Samma innehåll = samma hash (deduplicering)

### Version Number
- Sekventiellt nummer per fil (1, 2, 3...)
- Automatiskt tilldelat via trigger
- Används för enkel referens i UI

### Storage Structure
```
bpmn-files/
  {fileName}.bpmn  # Current version (för backward compatibility)
  
docs/
  {mode}/{provider}/{bpmnFileName}/{versionHash}/{docFileName}  # Ny struktur
  {docFileName}  # Legacy (backward compatibility)
```

### Database Structure
```
bpmn_file_versions
  - id (UUID)
  - bpmn_file_id (FK)
  - file_name (TEXT)
  - content_hash (TEXT, UNIQUE per file)
  - content (TEXT) - Full BPMN XML
  - meta (JSONB) - Parsed metadata
  - is_current (BOOLEAN) - Only one per file
  - version_number (INTEGER) - Sequential
  - uploaded_at, uploaded_by, change_summary

bpmn_files
  - current_version_hash (TEXT) - Reference to current version
  - current_version_number (INTEGER) - For quick access

bpmn_file_diffs
  - from_version_hash (TEXT)
  - to_version_hash (TEXT)
  - from_version_number (INTEGER)
  - to_version_number (INTEGER)
```

