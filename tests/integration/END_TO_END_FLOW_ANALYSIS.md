# Analys: Validerar våra tester hela flödet?

## Appens faktiska flöde

### Steg 1: Filuppladdning
- Användaren laddar upp BPMN-fil via `BpmnFileManager`
- `useUploadBpmnFile` anropar `supabase.functions.invoke('upload-bpmn-file')`
- Filen sparas i Supabase Storage (`bpmn-files` bucket)
- Version hash skapas och sparas i `bpmn_file_versions` tabell
- Diff beräknas och sparas i `bpmn_file_diffs` tabell

### Steg 2: Dokumentationsgenerering
- Användaren klickar "Generera artefakter"
- `BpmnFileManager` anropar `generateAllFromBpmnWithGraph`
- Dokumentation genereras (Feature Goals, Epics, Combined docs)
- **VIKTIGT**: Dokumentationen uploadas till Storage via `supabase.storage.upload()`
- Upload sker i `BpmnFileManager.handleGenerateArtifacts` (rad 2014-2031)

### Steg 3: Dokumentationsläsning
- Användaren navigerar till DocViewer
- `DocViewer` anropar `storageFileExists` för att hitta dokumentation
- `DocViewer` laddar dokumentation från Storage via `supabase.storage.download()`
- HTML visas i iframe

## Vad våra integrationstester faktiskt testar

### ✅ Testade delar:
1. **Dokumentationsgenerering** (steg 2, del 1)
   - `generateAllFromBpmnWithGraph` fungerar
   - `forceRegenerate` logik
   - `nodeFilter` logik
   - Version hash-hantering
   - Parameter-kombinationer

### ❌ INTE testade delar:
1. **Filuppladdning** (steg 1)
   - `useUploadBpmnFile` anropar Supabase Edge Function
   - Filen sparas i Storage
   - Version hash skapas
   - Diff beräknas

2. **Upload av dokumentation** (steg 2, del 2)
   - `BpmnFileManager` uploadar genererade docs till Storage
   - Storage paths är korrekta
   - Upload fungerar med version hash

3. **Dokumentationsläsning** (steg 3)
   - `DocViewer` hittar dokumentation i Storage
   - `storageFileExists` fungerar korrekt
   - `supabase.storage.download()` laddar korrekt fil
   - HTML visas korrekt

## Gap-analys

### Kritiska gaps:
1. **Upload → Generering → Läsning** - Ingen test testar hela kedjan
2. **Storage paths** - Tester genererar docs men uploadar inte till Storage
3. **DocViewer integration** - Ingen test testar att DocViewer faktiskt kan läsa genererade docs

### Mindre kritiska gaps:
1. Filuppladdning testas bara i E2E-tester (Playwright)
2. Version hash-upload testas inte
3. Diff-beräkning testas inte

## Rekommendationer

### Prioritet 1: Kritiska gaps
1. **Skapa integrationstest för hela flödet:**
   - Mocka Supabase Storage (upload + download)
   - Testa: Upload BPMN → Generera docs → Upload docs → Läs docs
   - Verifiera att Storage paths är korrekta

2. **Testa DocViewer med faktiska docs:**
   - Generera docs (som nuvarande tester gör)
   - Mocka Storage att returnera genererade docs
   - Testa att DocViewer kan läsa och visa dem

### Prioritet 2: Viktiga gaps
3. **Testa Storage path-hantering:**
   - Verifiera att `buildDocStoragePaths` skapar korrekta paths
   - Testa versioned vs non-versioned paths
   - Testa att upload använder korrekta paths

4. **Testa upload-logik:**
   - Mocka `supabase.storage.upload()`
   - Verifiera att upload använder korrekta paths och content-type

## Nuvarande testtäckning

### Integrationstester (Vitest):
- ✅ Dokumentationsgenerering (steg 2, del 1)
- ❌ Upload av dokumentation (steg 2, del 2)
- ❌ Dokumentationsläsning (steg 3)
- ❌ Filuppladdning (steg 1)

### E2E-tester (Playwright):
- ✅ Filuppladdning (`file-upload-versioning.spec.ts`)
- ✅ Hela flödet (`full-generation-flow.spec.ts`)
- ✅ DocViewer (`doc-viewer.spec.ts`)

## Slutsats

### Uppdaterad status (efter nya tester):

**Delvis - våra integrationstester validerar nu flera delar av flödet:**

#### ✅ Testade delar:
1. **Dokumentationsgenerering** (steg 2, del 1) - ✅ Testat
2. **Upload av dokumentation** (steg 2, del 2) - ✅ Testat (nytt test: `full-flow-generation-upload-read.test.ts`)
3. **Läsning av dokumentation** (steg 3) - ✅ Testat (nytt test: `full-flow-generation-upload-read.test.ts`)
4. **Hela kedjan: Generera → Upload → Läs** - ✅ Testat (nytt test)

#### ❌ INTE testade delar:
1. **Filuppladdning** (steg 1)
   - `useUploadBpmnFile` anropar Supabase Edge Function
   - Filen sparas i Storage
   - Version hash skapas
   - Diff beräknas
   - **Detta testas bara i E2E-tester (Playwright)**

### Sammanfattning:

**Integrationstester validerar nu:**
- ✅ Dokumentationsgenerering (faktisk kod)
- ✅ Upload av dokumentation till Storage (faktisk upload-logik, mockad Storage)
- ✅ Läsning av dokumentation från Storage (faktisk download-logik, mockad Storage)
- ✅ Hela kedjan: Generera → Upload → Läs

**Integrationstester validerar INTE:**
- ❌ Filuppladdning (BPMN-filer) - testas bara i E2E-tester

**E2E-tester (Playwright) validerar:**
- ✅ Filuppladdning
- ✅ Hela flödet från uppladdning → generering → läsning
- ✅ Men kräver körande app och Supabase-instans
