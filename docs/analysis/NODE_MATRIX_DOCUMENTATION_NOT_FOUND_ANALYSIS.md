# Analys: Node-Matrix hittar inte Feature Goal-dokumentation

## Datum: 2025-12-26

## 🎯 Problem

Node-matrix visar "—" för dokumentation för call activity "Object information" (`object-information` i `mortgage-se-object.bpmn`), men "Visa docs" för tasks. Detta tyder på att Feature Goal-dokumentation inte hittas.

---

## 📊 Flöde: Generering → Upload → Sökning

### 1. När Feature Goal genereras (`bpmnGenerators.ts` rad 2317-2336)

**Input:**
- `node.bpmnFile` = `"mortgage-se-object.bpmn"` (parent-filen där call activity är definierad)
- `node.subprocessFile` = `"mortgage-se-object-information.bpmn"` (subprocess-filen)
- `node.bpmnElementId` = `"object-information"`

**Process:**
```typescript
const bpmnFileForFeatureGoal = node.subprocessFile; // "mortgage-se-object-information.bpmn"
const parentBpmnFile = node.bpmnFile; // "mortgage-se-object.bpmn"
const featureDocPath = getFeatureGoalDocFileKey(
  bpmnFileForFeatureGoal,  // "mortgage-se-object-information.bpmn"
  node.bpmnElementId,      // "object-information"
  undefined,
  parentBpmnFile,           // "mortgage-se-object.bpmn" (för hierarchical naming)
);
```

**Resultat:**
- `featureDocPath` = `"feature-goals/mortgage-se-object-object-information.html"`
- Detta är **hierarchical naming**: `parent-elementId`

---

### 2. När Feature Goal uploadas (`useFileGeneration.ts` rad 1155-1172)

**Input:**
- `docFileName` = `"feature-goals/mortgage-se-object-object-information.html"`
- `filesIncluded` = array med alla filer som ingår i genereringen

**Process:**
```typescript
const docBpmnFile = extractBpmnFileFromDocFileName(docFileName, filesIncluded) || file.file_name;
const docVersionHash = await getVersionHashForDoc(docBpmnFile);
const { modePath: docPath } = buildDocStoragePaths(
  docFileName,              // "feature-goals/mortgage-se-object-object-information.html"
  effectiveLlmMode,
  llmProvider,
  docBpmnFile,              // Resultat från extractBpmnFileFromDocFileName()
  docVersionHash            // Version hash för docBpmnFile
);
```

**Problem: `extractBpmnFileFromDocFileName()` logik (rad 1054-1133):**

För hierarchical naming (`mortgage-se-object-object-information`):

1. **Första försöket (rad 1078-1084):**
   - Kollar om någon fil i `filesIncluded` har baseName som exakt matchar `featureGoalName`
   - `"mortgage-se-object-object-information"` matchar INTE `"mortgage-se-object-information"` eller `"mortgage-se-object"`

2. **Andra försöket (rad 1086-1107):**
   - Försöker extrahera elementId från slutet av `featureGoalName`
   - `parts = ["mortgage", "se", "object", "object", "information"]`
   - `possibleElementId = "object-object-information"` (sista 3 delarna)
   - `possibleElementId2 = "object-information"` (sista 2 delarna)
   - Försöker matcha mot filer som slutar med dessa
   - Om `mortgage-se-object-information.bpmn` finns i `filesIncluded`, returnerar den det ✅
   - **MEN:** Om `mortgage-se-object.bpmn` också finns och matchar först, kan den returnera det ❌

3. **Tredje försöket (rad 1109-1115):**
   - Fallback: kollar om någon filnamn är innehållen i `featureGoalName`
   - `"mortgage-se-object-object-information"` innehåller `"mortgage-se-object"` ✅
   - **PROBLEM:** Detta kan returnera `"mortgage-se-object.bpmn"` (parent-filen) istället för `"mortgage-se-object-information.bpmn"` (subprocess-filen) ❌

4. **Fjärde försöket (rad 1118-1122):**
   - Fallback: försöker inferera från pattern
   - `"mortgage-se-object-object-information"` matchar pattern, returnerar `"mortgage-se-object-object-information.bpmn"` ❌ (denna fil finns inte)

**Resultat:**
- Om `extractBpmnFileFromDocFileName()` returnerar `"mortgage-se-object.bpmn"` (parent-filen):
  - `docBpmnFile` = `"mortgage-se-object.bpmn"`
  - `docVersionHash` = version hash för `mortgage-se-object.bpmn` (parent-filens version hash)
  - Filen sparas under: `docs/claude/mortgage-se-object.bpmn/{parentVersionHash}/feature-goals/mortgage-se-object-object-information.html` ❌

- Om `extractBpmnFileFromDocFileName()` returnerar `"mortgage-se-object-information.bpmn"` (subprocess-filen):
  - `docBpmnFile` = `"mortgage-se-object-information.bpmn"`
  - `docVersionHash` = version hash för `mortgage-se-object-information.bpmn` (subprocess-filens version hash)
  - Filen sparas under: `docs/claude/mortgage-se-object-information.bpmn/{subprocessVersionHash}/feature-goals/mortgage-se-object-object-information.html` ✅

---

### 3. När node-matrix söker (`useAllBpmnNodes.ts` rad 299-305)

**Input:**
- `node.bpmnFile` = `"mortgage-se-object.bpmn"` (parent-filen)
- `node.subprocessFile` = `"mortgage-se-object-information.bpmn"` (subprocess-filen)
- `node.elementId` = `"object-information"`

**Process:**
```typescript
const subprocessVersionHash = await getVersionHash(subprocessFile); // Subprocess-filens version hash
featureGoalPaths = getFeatureGoalDocStoragePaths(
  subprocessFile.replace('.bpmn', ''), // "mortgage-se-object-information"
  node.elementId,                      // "object-information"
  node.bpmnFile,                       // "mortgage-se-object.bpmn" (parent)
  subprocessVersionHash,                // Subprocess-filens version hash
  subprocessFile,                      // "mortgage-se-object-information.bpmn"
);
```

**Resultat från `getFeatureGoalDocStoragePaths()` (`artifactUrls.ts` rad 107-169):**
- `hierarchicalKey` = `getFeatureGoalDocFileKey("mortgage-se-object-information", "object-information", undefined, "mortgage-se-object.bpmn")`
- `hierarchicalKey` = `"feature-goals/mortgage-se-object-object-information.html"`
- **Versioned path:** `docs/claude/mortgage-se-object-information.bpmn/{subprocessVersionHash}/feature-goals/mortgage-se-object-object-information.html` ✅
- **Non-versioned path:** `docs/claude/feature-goals/mortgage-se-object-object-information.html` ✅

---

## 🔍 Identifierat Problem

### Problem 1: `extractBpmnFileFromDocFileName()` kan returnera fel fil

**Scenario:**
- `docFileName` = `"feature-goals/mortgage-se-object-object-information.html"`
- `filesIncluded` = `["mortgage-se-object.bpmn", "mortgage-se-object-information.bpmn"]`

**Vad händer:**
1. Första försöket: Ingen exakt match
2. Andra försöket: Försöker matcha `"object-information"` → hittar `mortgage-se-object-information.bpmn` ✅
3. **MEN:** Tredje försöket (fallback) körs också och kan matcha `"mortgage-se-object"` → hittar `mortgage-se-object.bpmn` ❌

**Konsekvens:**
- Om funktionen returnerar `"mortgage-se-object.bpmn"` (parent-filen):
  - Filen sparas under parent-filens version hash
  - Node-matrix söker under subprocess-filens version hash
  - **Filen hittas INTE** ❌

---

### Problem 2: Kommentarer i koden säger att filen ska sparas under subprocess-filens version hash

**I `bpmnGenerators.ts` rad 2318-2319:**
```typescript
// VIKTIGT: För call activities använder vi ALLTID hierarchical naming (med parent)
// eftersom filen alltid sparas under subprocess-filens version hash.
```

**I `artifactUrls.ts` rad 125-126:**
```typescript
// VIKTIGT: För call activities använder vi ALLTID hierarchical naming (med parent)
// men filen sparas under subprocess-filens version hash (inte parent-filens).
```

**Men i `useFileGeneration.ts`:**
- `extractBpmnFileFromDocFileName()` kan returnera parent-filen istället för subprocess-filen
- Detta leder till att filen sparas under parent-filens version hash (fel)

---

## 💡 Lösningsförslag

### Lösning 1: Förbättra `extractBpmnFileFromDocFileName()` för Feature Goals

**För hierarchical naming (`parent-elementId`):**
- Extrahera elementId från slutet av `featureGoalName`
- Matcha mot filer som slutar med elementId (prioritera detta)
- **Inte** använda fallback som matchar parent-filen

**Exempel:**
- `featureGoalName` = `"mortgage-se-object-object-information"`
- `elementId` = `"object-information"` (extraherat från slutet)
- Matcha mot filer som slutar med `"-object-information"` → `"mortgage-se-object-information.bpmn"` ✅

---

### Lösning 2: Använd subprocess-filen direkt vid upload

**Istället för att extrahera från `docFileName`:**
- När Feature Goal genereras, spara metadata om vilken subprocess-fil den tillhör
- Använd subprocess-filen direkt vid upload (inte `extractBpmnFileFromDocFileName()`)

**Exempel:**
- `result.docs` kan innehålla metadata: `Map<docFileName, { content, subprocessFile }>`
- Vid upload, använd `subprocessFile` direkt istället för att extrahera från `docFileName`

---

### Lösning 3: Validera att filen sparas under rätt version hash

**Vid upload:**
- Validera att `docBpmnFile` matchar subprocess-filen (inte parent-filen)
- Om det inte matchar, logga varning och använd subprocess-filen istället

---

## 📋 Sammanfattning

### Nuvarande Status:

| Steg | Vad som händer | Problem |
|------|----------------|---------|
| **Generering** | Skapar `feature-goals/mortgage-se-object-object-information.html` | ✅ Korrekt |
| **Upload** | `extractBpmnFileFromDocFileName()` kan returnera parent-filen | ❌ Fel |
| **Sparas under** | Parent-filens version hash (om extract returnerar parent) | ❌ Fel |
| **Söks under** | Subprocess-filens version hash | ✅ Korrekt |
| **Resultat** | Filen hittas INTE | ❌ Problem |

### Problem:

1. **`extractBpmnFileFromDocFileName()` logik:**
   - För hierarchical naming kan den returnera parent-filen istället för subprocess-filen
   - Fallback-logiken (rad 1109-1115) matchar parent-filen först

2. **Diskrepans mellan sparning och sökning:**
   - Filen sparas under parent-filens version hash (om extract returnerar parent)
   - Node-matrix söker under subprocess-filens version hash
   - Filen hittas INTE

3. **Kommentarer vs. faktisk implementation:**
   - Kommentarer säger att filen ska sparas under subprocess-filens version hash
   - Men `extractBpmnFileFromDocFileName()` kan returnera parent-filen, vilket leder till fel sparning

---

**Datum:** 2025-12-26
**Status:** Analys klar - Identifierat problem med `extractBpmnFileFromDocFileName()` som kan returnera parent-filen istället för subprocess-filen för Feature Goals




