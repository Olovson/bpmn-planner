# Lösningsförslag: Diff-analys av Lokal Mapp

**Datum:** 2025-12-22  
**Syfte:** Möjliggöra diff-analys av BPMN-filer i en lokal mapp utan att ladda upp dem eller generera ny information.

---

## 1. Problem

**Nuvarande begränsning:**
- Diff-beräkning sker endast när filer laddas upp till Supabase
- Användaren kan inte förhandsgranska diffen innan uppladdning
- Ingen möjlighet att analysera en hel mapp med BPMN-filer på en gång
- Ingen "dry-run" funktion för att se vad som skulle ändras

**Användningsfall:**
- Användaren har en lokal mapp med uppdaterade BPMN-filer
- Användaren vill se vad som skulle ändras om filerna laddades upp
- Användaren vill analysera en hel mapp rekursivt
- Användaren vill jämföra lokala filer mot det som finns i systemet

---

## 2. Lösningsförslag

### 2.1. Översikt

**Ny funktion:** "Analysera Mapp" (eller "Diff Preview")

**Flöde:**
1. Användaren klickar på "Analysera Mapp" knapp
2. Systemet öppnar en mappväljare (directory picker)
3. Användaren väljer en mapp
4. Systemet hittar alla `.bpmn` filer rekursivt i mappen
5. För varje fil:
   - Läser filinnehållet
   - Parsar BPMN-filen
   - Jämför mot befintlig version i Supabase (om den finns)
   - Beräknar diff
6. Visar sammanfattning av alla diffs i en översikt
7. Användaren kan välja att:
   - Ladda upp alla filer
   - Ladda upp specifika filer
   - Bara se diffen (ingen uppladdning)

---

## 3. Teknisk Implementation

### 3.1. UI-komponenter

#### Ny Sida: `BpmnFolderDiffPage.tsx`
**Plats:** `src/pages/BpmnFolderDiffPage.tsx`

**Funktioner:**
- Mappväljare (directory picker)
- Lista över hittade BPMN-filer
- Diff-översikt per fil
- Knappar för att ladda upp (alla/specifika)
- Filtrering och sökning

**UI-struktur:**
```
┌─────────────────────────────────────────┐
│  Diff-analys av Lokal Mapp              │
├─────────────────────────────────────────┤
│  [Välj Mapp]                            │
│                                         │
│  Hittade filer: 12                      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ mortgage.bpmn                      │ │
│  │ ✓ 3 ändringar (2 added, 1 modified)│ │
│  │ [Visa Detaljer] [Ladda upp]        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ mortgage-se-application.bpmn       │ │
│  │ ⚠ 5 ändringar (1 removed, 4 modified)│ │
│  │ [Visa Detaljer] [Ladda upp]        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Ladda upp alla] [Ladda upp valda]     │
└─────────────────────────────────────────┘
```

#### Integration i BpmnDiffOverviewPage
**Alternativ:** Lägg till en knapp i `BpmnDiffOverviewPage.tsx`:
- "Analysera Lokal Mapp" knapp
- Öppnar modal eller navigerar till ny sida

### 3.2. API/Funktioner

#### Ny Funktion: `analyzeFolderDiff()`
**Plats:** `src/lib/bpmnDiffRegeneration.ts`

**Signatur:**
```typescript
export async function analyzeFolderDiff(
  folderHandle: FileSystemDirectoryHandle,
  options?: {
    recursive?: boolean; // Default: true
    fileFilter?: (fileName: string) => boolean; // Default: *.bpmn
  }
): Promise<FolderDiffResult>
```

**Returnerar:**
```typescript
interface FolderDiffResult {
  files: Array<{
    fileName: string;
    filePath: string;
    content: string;
    parseResult: BpmnParseResult;
    diffResult: BpmnDiffResult | null; // null om filen inte finns i systemet
    hasChanges: boolean;
    summary: {
      added: number;
      removed: number;
      modified: number;
      unchanged: number;
    };
  }>;
  totalFiles: number;
  totalChanges: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}
```

**Process:**
1. Rekursivt hitta alla `.bpmn` filer i mappen
2. För varje fil:
   - Läsa innehåll
   - Parsa BPMN
   - Hämta befintlig version från Supabase (om den finns)
   - Beräkna diff med `calculateBpmnDiff()`
   - Returnera resultat

#### Ny Funktion: `findBpmnFilesInDirectory()`
**Plats:** `src/lib/fileSystemUtils.ts` (ny fil)

**Signatur:**
```typescript
export async function findBpmnFilesInDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  recursive: boolean = true
): Promise<Array<{ fileName: string; filePath: string; handle: FileSystemFileHandle }>>
```

**Process:**
1. Iterera över entries i mappen
2. Om entry är en fil och slutar med `.bpmn` → Lägg till
3. Om entry är en mapp och `recursive === true` → Rekursivt sök
4. Returnera lista med filer

### 3.3. Browser API: File System Access API

**Användning:**
```typescript
// Öppna mappväljare
const directoryHandle = await window.showDirectoryPicker({
  mode: 'read'
});

// Läsa filer rekursivt
async function* getFilesRecursively(
  directoryHandle: FileSystemDirectoryHandle
): AsyncGenerator<FileSystemFileHandle> {
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.bpmn')) {
      yield entry;
    } else if (entry.kind === 'directory') {
      yield* getFilesRecursively(entry);
    }
  }
}
```

**Kompatibilitet:**
- ✅ Chrome/Edge (Chromium)
- ✅ Safari (från version 15.2)
- ⚠️ Firefox (stödjer inte `showDirectoryPicker` ännu, men kan använda fallback)

**Fallback för Firefox:**
- Använd `<input type="file" webkitdirectory multiple>` (begränsad funktionalitet)
- Eller visa varning att funktionen kräver Chrome/Edge/Safari

### 3.4. Diff-beräkning (utan att spara)

**Modifiera `calculateBpmnDiff()`:**
- Funktionen är redan "read-only" (beräknar bara diff, sparar inte)
- Kan användas direkt för folder analysis

**Ny wrapper-funktion:**
```typescript
export async function calculateDiffForLocalFile(
  fileName: string,
  localContent: string,
  localMeta: BpmnMeta
): Promise<BpmnDiffResult | null> {
  // Hämta befintlig version från Supabase
  const currentVersion = await getCurrentVersion(fileName);
  if (!currentVersion) {
    // Ny fil - alla noder är "added"
    const parseResult = await parseBpmnFileContent(localContent);
    return {
      added: extractNodeSnapshots(parseResult, fileName),
      removed: [],
      modified: [],
      unchanged: [],
    };
  }

  // Jämför mot befintlig version
  const oldMeta = currentVersion.meta as BpmnMeta;
  const oldParseResult = convertBpmnMetaToParseResult(oldMeta, fileName);
  const newParseResult = await parseBpmnFileContent(localContent);
  
  return calculateBpmnDiff(oldParseResult, newParseResult, fileName);
}
```

### 3.5. Integration med Befintlig Kod

**Använd befintliga funktioner:**
- `parseBpmnFile()` → Modifiera för att acceptera innehåll direkt
- `calculateBpmnDiff()` → Redan "read-only", kan användas direkt
- `extractNodeSnapshots()` → Redan implementerad
- `enrichCallActivitiesWithMapping()` → Kan användas för lokala filer

**Nya funktioner behövs:**
- `parseBpmnFileContent(content: string)` → Parsa BPMN från sträng (istället för att läsa från Storage)
- `findBpmnFilesInDirectory()` → Rekursivt hitta filer
- `analyzeFolderDiff()` → Huvudfunktion för folder analysis

---

## 4. Användarflöde

### 4.1. Steg-för-steg

1. **Användaren navigerar till Diff-sidan**
   - Klickar på "Analysera Lokal Mapp" knapp

2. **Systemet öppnar mappväljare**
   - Användaren väljer mapp
   - Systemet visar loading-indikator

3. **Systemet analyserar mappen**
   - Hittar alla `.bpmn` filer rekursivt
   - För varje fil:
     - Läser innehåll
     - Parsar BPMN
     - Jämför mot Supabase
     - Beräknar diff

4. **Systemet visar resultat**
   - Lista över alla filer med diff-sammanfattning
   - Totalsammanfattning (X filer, Y ändringar)
   - Filtrering och sökning

5. **Användaren kan:**
   - **Visa detaljer** → Expandera diff för specifik fil
   - **Ladda upp alla** → Ladda upp alla filer och spara diffs
   - **Ladda upp valda** → Välja specifika filer att ladda upp
   - **Bara se diffen** → Ingen uppladdning, bara analys

### 4.2. UI-komponenter

#### FolderDiffAnalysis Component
```typescript
interface FolderDiffAnalysisProps {
  onFilesAnalyzed?: (result: FolderDiffResult) => void;
  onUploadRequested?: (files: string[]) => void;
}

const FolderDiffAnalysis: React.FC<FolderDiffAnalysisProps> = ({
  onFilesAnalyzed,
  onUploadRequested,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FolderDiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const handleSelectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setSelectedFolder(handle);
      setLoading(true);
      
      const result = await analyzeFolderDiff(handle);
      setAnalysisResult(result);
      setSelectedFiles(new Set(result.files.map(f => f.fileName)));
      onFilesAnalyzed?.(result);
    } catch (error) {
      console.error('Error selecting folder:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
};
```

---

## 5. Tekniska Detaljer

### 5.1. Fil-läsning

**Problem:** Browser File System Access API är asynkron

**Lösning:**
```typescript
async function readFileContent(
  fileHandle: FileSystemFileHandle
): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}
```

### 5.2. Parsing av Lokala Filer

**Problem:** `parseBpmnFile()` läser från Supabase Storage

**Lösning:** Skapa ny funktion:
```typescript
async function parseBpmnFileContent(
  content: string
): Promise<BpmnParseResult> {
  const parser = new BpmnParser();
  return await parser.parse(content);
}
```

### 5.3. Metadata Extraction

**Problem:** Metadata behövs för diff-beräkning

**Lösning:** Använd samma parsing-logik som vid uppladdning:
```typescript
const parseResult = await parseBpmnFileContent(content);
const enrichedResult = await enrichCallActivitiesWithMapping(
  parseResult,
  fileName
);
```

### 5.4. Performance

**Problem:** Många filer kan ta lång tid att analysera

**Lösning:**
- **Progress-indikator:** Visa progress per fil
- **Parallellisering:** Analysera flera filer parallellt (med begränsning)
- **Caching:** Cache parse-resultat för snabbare re-analys
- **Cancellation:** Möjlighet att avbryta analys

---

## 6. Alternativ: Fallback för Firefox

**Problem:** Firefox stödjer inte `showDirectoryPicker()`

**Lösning 1: File Input med `webkitdirectory`**
```typescript
<input
  type="file"
  webkitdirectory
  multiple
  accept=".bpmn"
  onChange={(e) => {
    const files = Array.from(e.target.files || []);
    // Process files
  }}
/>
```

**Begränsningar:**
- Kan bara välja en mapp (inte rekursivt i alla browsers)
- Ingen kontroll över mappstruktur
- Olika beteende i olika browsers

**Lösning 2: Drag & Drop**
- Användare drar mapp till webbläsaren
- Systemet läser alla filer i mappen
- Begränsningar: Kan inte läsa rekursivt i alla browsers

**Lösning 3: Varning**
- Visa varning att funktionen kräver Chrome/Edge/Safari
- Erbjud alternativ: Ladda upp filer manuellt

---

## 7. Integration med Befintlig Diff-sida

### 7.1. Lägg till i BpmnDiffOverviewPage

**Alternativ 1: Ny knapp**
```typescript
<Button onClick={handleAnalyzeFolder}>
  <FolderOpen className="mr-2" />
  Analysera Lokal Mapp
</Button>
```

**Alternativ 2: Ny sida**
- Skapa `BpmnFolderDiffPage.tsx`
- Lägg till länk i navigation
- Användare navigerar till sidan

**Alternativ 3: Modal**
- Öppna modal från Diff-sidan
- Visa resultat i modal
- Möjlighet att ladda upp direkt från modal

### 7.2. Delad Komponent: DiffResultView

**Skapa återanvändbar komponent:**
```typescript
interface DiffResultViewProps {
  diffResult: BpmnDiffResult;
  fileName: string;
  onUpload?: () => void;
}

const DiffResultView: React.FC<DiffResultViewProps> = ({
  diffResult,
  fileName,
  onUpload,
}) => {
  // Visa diff-detaljer
  // Knapp för uppladdning
};
```

**Använd i:**
- `BpmnDiffOverviewPage` (befintlig diff)
- `BpmnFolderDiffPage` (ny folder analysis)

---

## 8. Sammanfattning

### 8.1. Nya Komponenter

1. **`BpmnFolderDiffPage.tsx`** - Huvudsida för folder analysis
2. **`FolderDiffAnalysis.tsx`** - Komponent för folder selection och analysis
3. **`DiffResultView.tsx`** - Återanvändbar komponent för diff-visning

### 8.2. Nya Funktioner

1. **`analyzeFolderDiff()`** - Huvudfunktion för folder analysis
2. **`findBpmnFilesInDirectory()`** - Rekursivt hitta BPMN-filer
3. **`parseBpmnFileContent()`** - Parsa BPMN från sträng
4. **`calculateDiffForLocalFile()`** - Beräkna diff för lokal fil

### 8.3. Modifieringar

1. **`BpmnDiffOverviewPage.tsx`** - Lägg till knapp för folder analysis
2. **`bpmnParser.ts`** - Lägg till `parseBpmnFileContent()` (eller modifiera befintlig)

### 8.4. Browser-kompatibilitet

- ✅ Chrome/Edge: Fullt stöd
- ✅ Safari 15.2+: Fullt stöd
- ⚠️ Firefox: Fallback med file input eller varning

---

## 9. Nästa Steg (efter implementering)

1. **Testa med olika mappstrukturer**
2. **Optimera performance** för stora mappar
3. **Lägg till filtrering** (bara visa filer med ändringar)
4. **Export-funktion** (exportera diff-resultat till JSON/CSV)
5. **Batch-uppladdning** (ladda upp alla filer i en batch)

---

## 10. Exempel: Användningsfall

### Scenario 1: Användaren har uppdaterat flera filer
1. Användaren väljer mapp med uppdaterade filer
2. Systemet visar: "12 filer hittade, 8 har ändringar"
3. Användaren ser översikt: vilka filer har ändrats
4. Användaren väljer att ladda upp alla filer med ändringar
5. Systemet laddar upp och sparar diffs

### Scenario 2: Användaren vill bara se vad som skulle ändras
1. Användaren väljer mapp
2. Systemet analyserar och visar diff
3. Användaren granskar ändringar
4. Användaren väljer att **inte** ladda upp (bara analys)

### Scenario 3: Användaren har en helt ny mapp
1. Användaren väljer mapp med nya filer
2. Systemet visar: "15 nya filer hittade"
3. Användaren ser att alla filer är "added"
4. Användaren laddar upp alla filer

---

**Status:** Lösningsförslag klar, väntar på godkännande innan implementering.
