# Analys: "Laddar..." Problem i Struktur och Artefakter-kolumnen

## Problem
"Struktur och artefakter"-kolumnen på Files-sidan visar "Laddar..." och laddar aldrig klart för filer med paths (t.ex. `mortgage-se/processes/appeal/diagrams/mortgage-se-appeal.bpmn`).

## Rotorsak

### 1. `useAllFilesArtifactCoverage` Query Hänger Sig

**Problemet:**
- `useAllFilesArtifactCoverage` loopar genom alla BPMN-filer
- För varje fil anropas:
  1. `getBpmnFileUrl(file.file_name)` - kan misslyckas för filer med paths
  2. `parseBpmnFile(fileUrl)` - kan misslyckas om filen inte finns
  3. `buildBpmnProcessGraph(...)` - kan misslyckas eller ta lång tid

**Om någon av dessa hänger sig eller tar för lång tid:**
- Query:n kommer att hänga sig
- `coverageMap` kommer att vara `undefined`
- FileTable visar "Laddar..." för alltid

### 2. Strukturella Förändringar Efter Commit 1f9574c8

**Före (commit 1f9574c8):**
```typescript
// Loopade genom alla filer i grafen
for (const fileInGraph of allFilesInGraph) {
  const versionHash = await getCurrentVersionHash(fileInGraph);
  // Check docs for each file...
}
```

**Efter (HEAD):**
```typescript
// Loopar bara genom själva filen
const versionHash = await getCurrentVersionHash(fileName);
// Check docs for THIS file only...
// Men använder getBpmnFileUrl som kan misslyckas för filer med paths
const { getBpmnFileUrl } = await import('./useDynamicBpmnFiles');
let fileUrl: string;
try {
  fileUrl = await getBpmnFileUrl(file.file_name);
} catch (urlError) {
  console.warn(`[Coverage Debug] Could not get URL for ${file.file_name}:`, urlError);
  continue; // Hoppar över filen
}
```

**Problemet:**
- `getBpmnFileUrl` kan misslyckas för filer med paths
- Om det misslyckas, hoppas filen över (`continue`)
- Men om `getBpmnFileUrl` hänger sig (timeout eller infinite loop), kommer query:n att hänga sig

### 3. Filnamn med Paths

**Exempel på problematiska filnamn:**
- `mortgage-se/processes/appeal/diagrams/mortgage-se-appeal.bpmn`
- `mortgage-se/processes/application/diagrams/mortgage-se-application.bpmn`
- `mortgage-se/process-config/mortgage/diagrams/mortgage.bpmn`

**Problemet:**
- Dessa filer har paths i filnamnet
- `getBpmnFileUrl` kan ha problem att hitta dessa filer i Storage
- Om `getBpmnFileUrl` tar lång tid eller hänger sig, kommer query:n att hänga sig

## Potentiella Orsaker

### 1. `getBpmnFileUrl` Hänger Sig
- Kan ta lång tid att hitta filer med paths
- Kan timeout eller infinite loop
- Kan misslyckas men inte kasta fel (returnerar `null` istället)

### 2. `parseBpmnFile` Hänger Sig
- Kan ta lång tid för stora filer
- Kan timeout om filen inte finns
- Kan misslyckas men inte kasta fel

### 3. `buildBpmnProcessGraph` Hänger Sig
- Kan ta lång tid för komplexa grafer
- Kan timeout om det finns cirkulära referenser
- Kan misslyckas men inte kasta fel

### 4. Query Timeout
- React Query har en default timeout
- Om query:n tar för lång tid, kan den timeout
- Men om query:n hänger sig (infinite loop), kommer den aldrig att timeout

## Lösningar

### Lösning 1: Återställ `useFileArtifactCoverage.ts` till Commit 1f9574c8

**Fördelar:**
- Återställer till en fungerande version
- Tar bort strukturella förändringar som kan orsaka problem
- Tar bort loggspam

**Nackdelar:**
- Förlorar coverage-fixarna (räknar bara noder i själva filen)
- Kan ge felaktiga coverage-siffror (inkluderar subprocesses)

### Lösning 2: Fixa `getBpmnFileUrl` för Filer med Paths

**Vad som behöver fixas:**
- Säkerställ att `getBpmnFileUrl` hanterar filer med paths korrekt
- Lägg till timeout för `getBpmnFileUrl`
- Lägg till bättre error handling

**Men:**
- Detta är en separat fix som inte är relaterad till commit 1f9574c8

### Lösning 3: Lägg till Timeout och Bättre Error Handling

**Vad som behöver fixas:**
- Lägg till timeout för `useAllFilesArtifactCoverage` query
- Lägg till bättre error handling för filer med paths
- Lägg till `isLoading` och `isError` i `BpmnFileManager.tsx`

**Men:**
- Detta är en separat fix som inte är relaterad till commit 1f9574c8

## Rekommendation

### ✅ ÅTERSTÄLL `useFileArtifactCoverage.ts` TILL COMMIT 1f9574c8

**Varför:**
1. Detta är den största strukturella förändringen
2. Ändringarna introducerar nya problem (filer med paths)
3. Query:n hänger sig för filer med paths
4. Coverage-siffrorna kan vara felaktiga

**Men:**
- Vi behöver också fixa problemet med filer med paths i den gamla versionen
- Detta kan vara ett separat problem som inte är relaterat till commit 1f9574c8

## Nästa Steg

1. **Återställ `useFileArtifactCoverage.ts` till commit 1f9574c8**
2. **Testa om problemet försvinner**
3. **Om problemet kvarstår:** Det är ett separat problem med filer med paths som behöver fixas
4. **Om problemet försvinner:** Bekräfta att coverage-fixarna var problematiska

