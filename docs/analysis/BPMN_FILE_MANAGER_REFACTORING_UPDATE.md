# BpmnFileManager Refaktorering - Uppdaterad Analys

## Nuvarande Status (Jan 2025)

### ✅ Redan Genomfört

1. **Modulstruktur skapad**
   - `src/pages/BpmnFileManager/types.ts` - Alla typer och interfaces
   - `src/pages/BpmnFileManager/hooks/` - Custom hooks
   - `src/pages/BpmnFileManager/components/` - UI-komponenter
   - `src/pages/BpmnFileManager/utils/` - Helper-funktioner

2. **useFileUpload hook** (~200 rader)
   - ✅ Filuppladdning, drag & drop
   - ✅ Sequential upload
   - ✅ BPMN-map suggestions

3. **FileUploadArea komponent** (~100 rader)
   - ✅ Drag & drop UI
   - ✅ Filval UI
   - ✅ Pending files confirmation

4. **useFileGeneration hook** (~1650 rader)
   - ✅ `handleGenerateArtifacts()` - Generera artefakter för vald fil
   - ✅ `handleGenerateAllArtifacts()` - Generera för alla filer
   - ✅ `handleGenerateSelectedFile()` - Generera dokumentation

5. **useTestGeneration hook** (~300 rader)
   - ✅ `handleGenerateTestsForSelectedFile()` - Generera tester för vald fil
   - ✅ `handleGenerateTestsForAllFiles()` - Generera tester för alla filer
   - ✅ Test generation state management

6. **Helper-funktioner**
   - ✅ `hierarchyHelpers.ts` - buildHierarchySilently
   - ✅ `generationHelpers.ts` - Generation helper-funktioner
   - ✅ `jobHelpers.ts` - Job helper-funktioner

7. **Kodrensning**
   - ✅ Borttagen trasig och duplicerad kod (~1500 rader)
   - ✅ Borttagen gammal `handleGenerateArtifacts` implementation
   - ✅ Borttagen duplicerad `handleBuildHierarchy` funktion
   - ✅ Borttagen duplicerad `createUserTaskEpicFilter` funktion

### Resultat Hittills

- **Före:** 5424 rader
- **Nuvarande:** 3344 rader
- **Minskning:** 2080 rader (38%)
- **Nya filer:** 6 filer (~2500 rader totalt)

## Återstående Arbete

### Prioritet 1: Kritiskt (Gör nu) - ~1000 rader att extrahera

#### 1. **FileTable komponent** (~600-800 rader)
**Plats:** Rad ~4000-4800 (JSX för fil-tabellen)

Innehåll:
- Fil-tabell med sortering/filtrering
- Artifact status badges
- Action buttons (download, delete, generate)
- Version selector integration
- File type filtering
- Search functionality

**Props behövs:**
- `files`, `selectedFile`, `onSelectFile`
- `coverageMap`
- `onDownload`, `onDelete`, `onGenerate`
- `fileFilter`, `fileSortBy`, `onFilterChange`, `onSortChange`
- `formatFileSize`, `formatDate` (helper-funktioner)

**Förväntad effekt:** -700 rader

#### 2. **GenerationControls komponent** (~300-400 rader)
**Plats:** Rad ~3490-3785 (JSX för genereringskontroller)

Innehåll:
- LLM mode selector (Claude/Ollama)
- Generation buttons (selected file, all files)
- Test generation buttons
- User Task Epic regeneration button
- Advanced tools collapsible section

**Props behövs:**
- `generationMode`, `llmProvider`, `onModeChange`
- `generatingFile`, `isLoading`
- `selectedFile`, `files`, `rootFileName`
- `onGenerateSelected`, `onGenerateAll`
- `onGenerateTestsSelected`, `onGenerateTestsAll`
- `onRegenerateUserTaskEpics`
- `llmHealth`, `llmHealthLoading`
- `showAdvancedTools`, `onToggleAdvancedTools`
- `onValidateBpmnMap`, `onReset`, `onDeleteAll`

**Förväntad effekt:** -350 rader

### Prioritet 2: Viktigt (Gör snart) - ~800 rader att extrahera

#### 4. **useHierarchyBuilding hook** (~300 rader)
**Plats:** Rad 2755-3050

Funktioner att extrahera:
- `handleBuildHierarchy()` (~300 rader)
  - Validering
  - Graph building
  - Tree building
  - Planned scenarios creation
  - Result reporting

**State att flytta:**
- `hierarchyResult`
- `showHierarchyReport`
- `hierarchyBuilt`

**Förväntad effekt:** -300 rader

#### 5. **useBpmnMapManagement hook** (~250 rader)
**Plats:** Rad 569-630, 3171-3260

Funktioner att extrahera:
- `handleValidateBpmnMap()` (~60 rader)
- `handleSaveUpdatedMap()` (~40 rader)
- `handleRegenerateBpmnMap()` (~50 rader)
- `handleExportUpdatedMap()` (~30 rader)

**State att flytta:**
- `bpmnMapValidation`
- `regeneratingMap`
- `validatingMap`

**Förväntad effekt:** -250 rader

#### 6. **useFileOperations hook** (~150 rader)
**Plats:** Rad 3284-3345

Funktioner att extrahera:
- `handleDownload()` (~30 rader)
- `handleDeleteAllFiles()` (~30 rader)

**State att flytta:**
- `deleteFile`, `setDeleteFile`
- `showDeleteAllDialog`, `setShowDeleteAllDialog`
- `deletingAll`, `setDeletingAll`
- `deleteProgress`, `setDeleteProgress`

**Förväntad effekt:** -150 rader

#### 7. **useReset hook** (~100 rader)
**Plats:** Rad 3347-3382

Funktioner att extrahera:
- `handleReset()` (~35 rader)
  - Reset dialog state
  - Overlay state
  - Query invalidation

**State att flytta:**
- `showResetDialog`, `setShowResetDialog`
- `isResetting` (från useResetAndRegenerate)

**Förväntad effekt:** -100 rader

### Prioritet 3: Önskvärt (Gör senare) - ~500 rader att extrahera

#### 8. **useGitHubSync hook** (~150 rader)
**Plats:** Rad 987-992

Funktioner att extrahera:
- `handleSyncFromGithub()` (~5 rader - redan i useSyncFromGithub)
- Sync report UI (~100 rader JSX)

**State att flytta:**
- `syncResult`, `setSyncResult`
- `showSyncReport`, `setShowSyncReport`

**Förväntad effekt:** -150 rader

#### 9. **useUserTaskEpics hook** (~200 rader)
**Plats:** Rad 2455-2550

Funktioner att extrahera:
- `handleRegenerateUserTaskEpics()` (~100 rader)
- `createUserTaskEpicFilter()` (~30 rader)

**Förväntad effekt:** -200 rader

#### 10. **SyncReport komponent** (~150 rader)
**Plats:** Rad 3889-3977

Innehåll:
- Sync result display
- Added/updated/unchanged/orphaned files lists
- Error display

**Förväntad effekt:** -150 rader

## Förväntade Resultat Efter Alla Refaktoreringar

### Efter Prioritet 1 (Kritiskt)
- **Huvudkomponent:** ~2300 rader (från 3344)
- **Minskning:** ~1000 rader (30%)
- **Nya filer:** 2 komponenter

### Efter Prioritet 1-2 (Kritiskt + Viktigt)
- **Huvudkomponent:** ~1500 rader (från 3344)
- **Minskning:** ~1800 rader (54%)
- **Nya filer:** 4 hooks + 2 komponenter

### Efter Alla Refaktoreringar (Prioritet 1-3)
- **Huvudkomponent:** ~1000-1200 rader (från 3344)
- **Minskning:** ~2200-2300 rader (66-69%)
- **Nya filer:** 7 hooks + 3 komponenter

## Rekommenderad Ordning

### Steg 1: FileTable komponent (3-4 timmar)
**Varför:** Största UI-sektion (~700 rader)
**Svårighet:** Medium (många props att definiera)

### Steg 2: GenerationControls komponent (2-3 timmar)
**Varför:** Stor UI-sektion (~350 rader)
**Svårighet:** Low-Medium (tydlig separation)

### Steg 3: useHierarchyBuilding hook (2-3 timmar)
**Varför:** Stor funktion (~300 rader)
**Svårighet:** Medium

### Steg 4: useBpmnMapManagement hook (1-2 timmar)
**Varför:** Flera relaterade funktioner (~250 rader)
**Svårighet:** Low

### Steg 5: useFileOperations + useReset hooks (1-2 timmar)
**Varför:** Enkla funktioner (~250 rader totalt)
**Svårighet:** Low

**Total tid för Prioritet 1-2: ~9-12 timmar (1-1.5 dagar)**

## Ytterligare Förbättringar

### State Management Optimering
- Konsolidera relaterad state (t.ex. all generation state)
- Använd reducer för komplex state
- Optimera re-renders med useMemo/useCallback

### Code Splitting
- Lazy load stora komponenter
- Code split hooks som inte behövs direkt

### Testing
- Lägg till unit-tester för nya hooks
- Lägg till integrationstester för komponenter

## Rekommendation

**Fortsätt refaktorera!** 

Filen är nu betydligt mindre (3344 rader, ned från 5424). Prioritet 1-2 kommer ge:
- **54% total minskning** (till ~1500 rader)
- **Bättre separation of concerns**
- **Enklare att underhålla**
- **Snabbare utveckling**

**Börja med FileTable komponent** - det är största återstående UI-sektionen.

