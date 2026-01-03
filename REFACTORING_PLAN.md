# Refaktoreringsplan: Förenkla Files-sidan och relaterade filer

## Mål
- Minska filstorlek till max ~1500 rader per fil
- Förbättra kodorganisation och läsbarhet
- Behålla all funktionalitet

## Nuvarande status

### Filer som behöver refaktorering:
1. **`useFileGeneration.ts`** - 1734 rader ❌
2. **`BpmnFileManager.tsx`** - 1015 rader ✅ (under gränsen men kan förbättras)
3. **`useTestGeneration.ts`** - 786 rader ✅ (under gränsen men kan förbättras)

## Plan för `useFileGeneration.ts` (1734 → ~1200 rader)

### Steg 1: Extrahera dokumentationsrelaterade helpers
**Ny fil:** `src/pages/BpmnFileManager/utils/docFileHelpers.ts`
- `extractBpmnFileFromDocFileName()` (~200 rader, rad 995-1200)
- `getVersionHashForDoc()` (~35 rader, rad 1202-1235)

**Fördelar:**
- Minskar useFileGeneration.ts med ~235 rader
- Gör funktionerna återanvändbara
- Förbättrar testbarhet

### Steg 2: Extrahera mapping-relaterade helpers
**Ny fil:** `src/pages/BpmnFileManager/utils/mappingHelpers.ts`
- `buildParentPath()` (~35 rader, rad 838-870)
- Mapping-byggnad logik (~150 rader, rad 814-970)

**Fördelar:**
- Minskar useFileGeneration.ts med ~185 rader
- Separerar mapping-logik från genereringslogik

### Steg 3: Extrahera dokumentuppladdningslogik
**Ny fil:** `src/pages/BpmnFileManager/utils/docUploadHelpers.ts`
- Dokumentuppladdningslogik (~100 rader, rad 1237-1330)
- Progress tracking för dokumentuppladdning

**Fördelar:**
- Minskar useFileGeneration.ts med ~100 rader
- Separerar uppladdningslogik från genereringslogik

### Steg 4: Förenkla huvudfunktioner
- Behåll endast huvudlogik i `handleGenerateArtifacts`
- Använd importerade helpers istället för inline-funktioner

**Förväntat resultat:**
- `useFileGeneration.ts`: ~1200 rader ✅

## Plan för `BpmnFileManager.tsx` (1015 → ~800 rader)

### Steg 1: Extrahera stora UI-sektioner
**Nya komponenter:**
- `FileManagerHeader.tsx` - Header med knappar och filter
- `FileManagerContent.tsx` - Huvudinnehåll med tabell och dialogs

**Fördelar:**
- Minskar huvudfilen med ~200 rader
- Förbättrar komponentstruktur

### Steg 2: Förenkla state management
- Gruppera relaterad state i custom hooks
- Använd reducer för komplex state

**Förväntat resultat:**
- `BpmnFileManager.tsx`: ~800 rader ✅

## Plan för `useTestGeneration.ts` (786 → ~600 rader)

### Steg 1: Extrahera helper-funktioner
**Ny fil:** `src/pages/BpmnFileManager/utils/testGenerationHelpers.ts`
- `resolveRootBpmnFile()` (~40 rader)
- Andra helper-funktioner

**Förväntat resultat:**
- `useTestGeneration.ts`: ~600 rader ✅

## Implementation ordning

1. ✅ Skapa plan (denna fil)
2. ⏳ Extrahera `docFileHelpers.ts` från `useFileGeneration.ts`
3. ⏳ Extrahera `mappingHelpers.ts` från `useFileGeneration.ts`
4. ⏳ Extrahera `docUploadHelpers.ts` från `useFileGeneration.ts`
5. ⏳ Uppdatera `useFileGeneration.ts` att använda nya helpers
6. ⏳ Förenkla `BpmnFileManager.tsx`
7. ⏳ Förenkla `useTestGeneration.ts`
8. ⏳ Verifiera att alla filer är < 1500 rader
9. ⏳ Testa att allt fungerar

## Risker och överväganden

- **Breaking changes:** Måste säkerställa att alla imports uppdateras
- **Testning:** Måste verifiera att all funktionalitet fungerar efter refaktorering
- **Dependencies:** Måste vara försiktig med circular dependencies

