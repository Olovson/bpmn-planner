# Vilka BPMN-filer använder appen?

## Svar: Inga statiska BPMN-filer i app-mapparna

Appen använder **INGA statiska BPMN-filer** som är lagrade i app-mapparna. Alla BPMN-filer laddas från **Supabase Storage**.

## Var BPMN-filer faktiskt lagras

### 1. Supabase Storage (Primär källa)
- **Plats**: `bpmn-files` bucket i Supabase Storage
- **Hur**: Filer laddas upp via `upload-bpmn-file` Edge Function
- **Databas**: Metadata lagras i `bpmn_files` tabellen
- **Användning**: Alla BPMN-filer som används i produktion

### 2. `public/bpmn/` (Fallback - TOM)
- **Status**: Mappen är **TOM** (inga filer)
- **Användning**: Fallback för filer som inte migrerats till Storage ännu
- **Kod**: `useDynamicBpmnFiles.ts` rad 101-102:
  ```typescript
  // Fallback to public folder (for files not yet migrated to storage)
  return `/bpmn/${fileName}`;
  ```
- **Reality**: Denna fallback används sällan eftersom alla filer finns i Storage

### 3. `tests/fixtures/bpmn/` (Endast för tester)
- **Plats**: `tests/fixtures/bpmn/` med olika versioner
- **Användning**: Endast för tester (Playwright, Vitest)
- **Filer**: ~107 BPMN-filer i olika versioner
- **Exempel**:
  - `mortgage-se 2025.12.11 18:11/` - 22 filer
  - `mortgage-se 2025.12.11 17:44/` - 22 filer
  - `mortgage-se 2025.12.08/` - 18 filer
  - etc.

## Hur appen laddar BPMN-filer

### Laddningsordning (enligt `getBpmnFileUrl()` och `loadBpmnXml()`)

1. **Supabase Storage** (primär)
   - Försök ladda från `bpmn_files` tabellen
   - Använd `storage_path` eller `file_name`
   - Ladda från `bpmn-files` bucket

2. **Versioned content** (om `versionHash` finns)
   - Ladda från `bpmn_file_versions` tabellen
   - Returnera som data URL

3. **Direct Storage URL** (fallback)
   - Bygg direkt URL till Storage
   - Använd filnamnet direkt

4. **`/bpmn/` endpoint** (sista fallback)
   - Endast för filer som inte migrerats till Storage
   - **VIKTIGT**: Test-filer hoppar över detta (rad 94-99)
   - Returnerar `/bpmn/${fileName}`

## Sammanfattning

| Plats | Status | Användning |
|-------|--------|------------|
| `public/bpmn/` | **TOM** | Fallback (används sällan) |
| `tests/fixtures/bpmn/` | ~107 filer | Endast för tester |
| **Supabase Storage** | **Alla produktionsfiler** | **Primär källa** |

## Konklusion

**Appen använder INGA statiska BPMN-filer i app-mapparna för produktion.**

- ✅ Alla produktionsfiler laddas från Supabase Storage
- ✅ `public/bpmn/` är tom och används bara som fallback
- ✅ `tests/fixtures/bpmn/` används endast för tester
- ✅ BPMN-filer laddas upp dynamiskt via UI och sparas i Storage

## Relevans för bpmn-map.json

Eftersom alla BPMN-filer laddas från Supabase Storage:
- `bpmn-map.json` måste matcha filerna i Storage
- Projektfilen (`bpmn-map.json` i root) är source of truth för strukturen
- Storage-filen innehåller användarändringar (call_activities)
- När filer laddas upp, genereras `bpmn-map.json` automatiskt från filerna i Storage







