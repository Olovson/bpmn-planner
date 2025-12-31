# Analys: Testinfo-generering vs Dokumentationsgenerering

## Datum: 2025-01-XX

## 🎯 Syfte

Validera att testinfo-generering fungerar konsekvent med hur resten av dokumentationen byggs i appen.

---

## 📊 Jämförelse: Dokumentation vs Testinfo

### 1. Storage Paths och Versioning

#### Dokumentation (File-level, Node-level, Feature Goals)

**Sparas som:**
- **Versioned path:** `docs/claude/{bpmnFile}/{versionHash}/{docFileName}`
- **Non-versioned fallback:** `docs/claude/{docFileName}`

**Exempel:**
- File-level: `docs/claude/mortgage-se-internal-data-gathering.bpmn/ffdfca04.../mortgage-se-internal-data-gathering.html`
- Node-level: `docs/claude/mortgage-se-internal-data-gathering.bpmn/ffdfca04.../nodes/mortgage-se-internal-data-gathering/{elementId}.html`
- Feature Goal: `docs/claude/mortgage-se-application.bpmn/abc123.../feature-goals/mortgage-se-application-internal-data-gathering.html`

**Använder:**
- `buildDocStoragePaths()` med `getCurrentVersionHash()`
- Version hash från `bpmn_file_versions` tabell

#### Testinfo (E2E Scenarios)

**Sparas som:**
- **Path:** `e2e-scenarios/{baseName}-scenarios.json`
- **INGEN version hash!**

**Exempel:**
- `e2e-scenarios/mortgage-se-internal-data-gathering-scenarios.json`

**Använder:**
- Enkel path utan version hash
- `saveE2eScenariosToStorage()` - ingen version hash parameter

**Problem:**
- ❌ E2E scenarios är INTE versioned
- ❌ När en BPMN-fil uppdateras, skrivs gamla scenarios över
- ❌ Inga fallback-paths för olika versioner
- ❌ Inkonsistent med dokumentationssystemet

---

### 2. Laddning av Data

#### Dokumentation

**File-level docs:**
- Använder `buildDocStoragePaths()` med version hash
- Försöker versioned path först, sedan fallback
- Använder `getCurrentVersionHash()` för att hitta rätt version

**Node-level docs:**
- Använder `getNodeDocStoragePath()` → `getNodeDocFileKey()`
- Använder `getEpicDocStoragePaths()` eller `getFeatureGoalDocStoragePaths()`
- Dessa funktioner returnerar array av paths med version hash

**Feature Goals:**
- Använder `getFeatureGoalDocStoragePaths()` med parent file
- Returnerar array av paths med version hash

#### Testinfo

**E2E Scenarios:**
- Använder enkel path: `e2e-scenarios/{baseName}-scenarios.json`
- Ingen version hash check
- Ingen fallback för olika versioner

**Feature Goal Tests:**
- Sparas i databas (`node_planned_scenarios`)
- Använder `upsert` med `onConflict: 'bpmn_file,bpmn_element_id,provider'`
- ✅ Detta är korrekt - databasen hanterar versioning via upsert

---

### 3. Genereringsprocess

#### Dokumentation

**Flow:**
1. `generateAllFromBpmnWithGraph()` genererar dokumentation
2. Lägger i `result.docs` Map med `docFileName` som key
3. `useFileGeneration.ts` itererar över `result.docs`
4. För varje doc:
   - Hämtar version hash för BPMN-filen
   - Bygger storage path med `buildDocStoragePaths()`
   - Uploadar till versioned path

**Version hash:**
- Hämtas per BPMN-fil via `getCurrentVersionHash()`
- Används för att bygga versioned path
- Säkerställer att dokumentation är kopplad till rätt version

#### Testinfo

**Flow:**
1. `generateTestsForFile()` anropar `generateE2eScenariosForProcess()`
2. E2E scenarios genereras med LLM
3. `saveE2eScenariosToStorage()` sparar till enkel path
4. Feature Goal tests extraheras från E2E scenarios
5. Sparas i databas via `savePlannedScenarios()`

**Version hash:**
- ❌ Används INTE för E2E scenarios
- ✅ Används INTE för Feature Goal tests (sparas i databas istället)

---

## 🔍 Identifierade Problem (Uppdaterad Status)

### Problem 1: E2E Scenarios är INTE Versioned ✅ LÖST

**Tidigare implementation:**
```typescript
// e2eScenarioStorage.ts
const storagePath = `e2e-scenarios/${baseName}-scenarios.json`;
```

**Nuvarande implementation:**
```typescript
// e2eScenarioStorage.ts
const storagePath = `e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json`;
```

**Status:**
- ✅ E2E scenarios använder nu version hash (konsistent med dokumentation)
- ✅ Inga fallback-paths (non-versioned) längre - strikt versioning
- ✅ Konsistent med dokumentationssystemet

### Problem 2: File-level Documentation Loading ✅ FÖRBÄTTRAT

**Nuvarande implementation:**
- `loadFileLevelDocFromStorage()` använder `buildDocStoragePaths()` ✅
- Förbättrad felhantering med tydlig feedback

**Status:**
- ✅ Tydlig feedback om vilka paths som hoppades över
- ✅ Partiell generering tillåts (genererar för paths med dokumentation)
- ⚠️ Processer utan dokumentation kan fortfarande inte generera E2E scenarios (medvetet val)

### Problem 3: Feature Goal Documentation Loading ✅ FUNGERAR

**Nuvarande implementation:**
- `loadFeatureGoalDocFromStorage()` använder `getFeatureGoalDocStoragePaths()`
- Returnerar versioned path med version hash ✅

**Status:**
- ✅ Fungerar korrekt
- ✅ Använder samma logik som dokumentationssystemet

### Problem 4: Processer utan CallActivities ✅ FÖRBÄTTRAT

**Nuvarande implementation:**
- Försöker ladda file-level documentation
- Om dokumentation saknas, hoppas path över med tydlig feedback
- Dokumentationskvalitet valideras innan generering

**Status:**
- ✅ Tydlig feedback om vilka paths som hoppades över
- ✅ Dokumentationskvalitetsvalidering förbättrar kvaliteten på genererade scenarios
- ⚠️ Processer utan dokumentation kan fortfarande inte generera E2E scenarios (medvetet val - kvalitet är viktigare)

---

## ✅ Vad Fungerar Bra

1. **Feature Goal Tests i Databas:**
   - Sparas med `upsert` och `onConflict`
   - ✅ Hanterar versioning korrekt via databas
   - ✅ Förhindrar dubbelgenerering
   - ✅ Kan regenereras från befintliga E2E scenarios

2. **Dokumentationssystemet:**
   - ✅ Konsekvent användning av version hash
   - ✅ Strikta versioned paths (inga fallback-paths längre)
   - ✅ Använder `buildDocStoragePaths()` konsekvent

3. **File-level Documentation Loading:**
   - ✅ Använder samma logik som när dokumentation sparas
   - ✅ Använder `buildDocStoragePaths()` med version hash
   - ✅ Tydlig feedback om misslyckade laddningar

4. **Nya Förbättringar (2025-01-XX):**
   - ✅ Partiell generering - tillåter generering för Feature Goals med dokumentation
   - ✅ Dokumentationskvalitetsvalidering - validerar att dokumentation innehåller nödvändiga fält
   - ✅ Förbättrad feedback - tydlig information om hoppade över paths
   - ✅ Regenerering av Feature Goal-tester - kan regenerera från befintliga E2E scenarios
   - ✅ LLM-tillgänglighetskontroll - kontrollerar LLM innan generering startar

---

## 🔧 Rekommenderade Förbättringar

### 1. Version E2E Scenarios

**Ändra:**
```typescript
// e2eScenarioStorage.ts
export async function saveE2eScenariosToStorage(
  bpmnFile: string,
  scenarios: E2eScenario[]
): Promise<void> {
  const baseName = bpmnFile.replace('.bpmn', '');
  const versionHash = await getCurrentVersionHash(bpmnFile);
  
  // Versioned path
  const storagePath = versionHash
    ? `e2e-scenarios/${bpmnFile}/${versionHash}/${baseName}-scenarios.json`
    : `e2e-scenarios/${baseName}-scenarios.json`; // Fallback
  // ...
}
```

**Ladda:**
```typescript
export async function loadE2eScenariosFromStorage(
  bpmnFile: string
): Promise<E2eScenario[]> {
  const baseName = bpmnFile.replace('.bpmn', '');
  const versionHash = await getCurrentVersionHash(bpmnFile);
  
  // Try versioned path first
  if (versionHash) {
    const versionedPath = `e2e-scenarios/${bpmnFile}/${versionHash}/${baseName}-scenarios.json`;
    // Try to load...
  }
  
  // Fallback to non-versioned
  const fallbackPath = `e2e-scenarios/${baseName}-scenarios.json`;
  // ...
}
```

### 2. Förbättra File-level Documentation Loading

**Lägg till:**
- Bättre felhantering
- Loggning av vilka paths som testas
- Fallback för att extrahera grundläggande info från BPMN-struktur

### 3. Konsistenta Storage Paths

**Säkerställ att:**
- Alla artifacts använder samma versioning-strategi
- Alla artifacts har fallback-paths
- Alla artifacts använder `buildDocStoragePaths()` eller liknande logik

---

## 📋 Checklista för Validering (Status: ALLA KLARA)

- [x] E2E scenarios använder version hash (som dokumentation) ✅
- [x] E2E scenarios använder strikt versioning (inga fallback-paths) ✅
- [x] File-level documentation loading använder samma logik som när dokumentation sparas ✅
- [x] Feature Goal documentation loading använder samma logik som när dokumentation sparas ✅
- [x] Processer utan callActivities har förbättrad hantering (tydlig feedback, kvalitetsvalidering) ✅
- [x] Alla storage paths följer samma mönster: `{type}/{bpmnFile}/{versionHash}/{fileName}` ✅
- [x] Alla load-funktioner använder versioned paths (strikta, inga fallback) ✅
- [x] Partiell generering tillåts ✅
- [x] Dokumentationskvalitetsvalidering implementerad ✅
- [x] Förbättrad feedback om hoppade över paths ✅
- [x] Regenerering av Feature Goal-tester implementerad ✅
- [x] LLM-tillgänglighetskontroll implementerad ✅

---

## 🎯 Slutsats (Uppdaterad)

**Tidigare problem (nu lösta):**
1. ✅ E2E scenarios är nu versioned (konsistent med dokumentation)
2. ✅ File-level documentation loading har förbättrad felhantering och tydlig feedback
3. ✅ Processer utan callActivities har bättre hantering (tydlig feedback, kvalitetsvalidering)

**Vad fungerar bra:**
1. ✅ Feature Goal tests i databas (korrekt versioning via upsert, kan regenereras)
2. ✅ Dokumentationssystemet (konsekvent versioning, strikta paths)
3. ✅ File-level documentation loading (använder rätt logik, tydlig feedback)
4. ✅ Partiell generering (tillåter generering för Feature Goals med dokumentation)
5. ✅ Dokumentationskvalitetsvalidering (validerar nödvändiga fält)
6. ✅ Förbättrad feedback (tydlig information om hoppade över paths)
7. ✅ LLM-tillgänglighetskontroll (kontrollerar LLM innan generering)

**Status:**
- Alla tidigare identifierade problem är nu lösta eller förbättrade
- Systemet är nu mer robust och användarvänligt
- Tydlig feedback hjälper användare att förstå vad som händer

