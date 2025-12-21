# Analys: Call Activities Saknar Dokumentation i Node Matrix

**Datum:** 2025-01-XX  
**Problem:** Call activities visas i node-matrix men dokumentation visas inte, trots att den faktiskt genererats.

---

## 🔍 Problemidentifiering

### Vad Användaren Ser
- Call activities visas i node-matrix (`/node-matrix`)
- Kolumnen "Dokumentation" visar inget (eller fel indikator)
- Dokumentationen har faktiskt genererats (bekräftat av användaren)

### Rotorsak

**Problem i `useAllBpmnNodes.ts`:**

1. **Fel sökväg för call activities:**
   - Rad 186: `const docPath = getNodeDocStoragePath(bpmnFile, elementId);`
   - Detta använder `getNodeDocFileKey` som returnerar: `nodes/${bpmnFile}/${elementId}.html`
   - Men call activities sparas som Feature Goals med `getFeatureGoalDocFileKey` som returnerar: `feature-goals/${parentBaseName}-${elementId}-v2.html`

2. **Sökväg-mismatch:**
   - **Söker efter:** `docs/nodes/mortgage-se-application/household.html`
   - **Faktiskt sparas som:** `docs/feature-goals/mortgage-se-application-household-v2.html` (eller liknande)

3. **Saknar version/provider-variationer:**
   - Dokumentation kan sparas i olika paths beroende på version/provider:
     - `docs/local/feature-goals/...`
     - `docs/slow/chatgpt/feature-goals/...`
     - `docs/slow/ollama/feature-goals/...`
     - `docs/local/{bpmnFile}/{versionHash}/feature-goals/...`
   - `checkDocsAvailable` kollar bara en sökväg

---

## 📊 Nuvarande Implementation

### `useAllBpmnNodes.ts`

```typescript
// Rad 186
const docPath = getNodeDocStoragePath(bpmnFile, elementId);
// Returnerar: docs/nodes/${bpmnFile}/${elementId}.html

// Rad 230
const resolvedDocs = await checkDocsAvailable(
  node.confluenceUrl,
  docPathFromNode(node), // Använder getNodeDocStoragePath
  storageFileExists,
);
```

### `getNodeDocStoragePath`

```typescript
export const getNodeDocStoragePath = (bpmnFile: string, elementId: string) =>
  `docs/${getNodeDocFileKey(bpmnFile, elementId)}`;
  // Returnerar: docs/nodes/${bpmnFile}/${elementId}.html
```

### `getFeatureGoalDocFileKey` (används vid generering)

```typescript
export const getFeatureGoalDocFileKey = (
  bpmnFile: string,        // subprocess BPMN file
  elementId: string,       // call activity element ID
  templateVersion?: 'v1' | 'v2',
  parentBpmnFile?: string, // parent BPMN file (där call activity är definierad)
) => {
  // Returnerar: feature-goals/${parentBaseName}-${elementId}-v2.html
  // ELLER: feature-goals/${subprocessBaseName}-${elementId}-v2.html
}
```

---

## 🔧 Lösning

### Steg 1: Identifiera Call Activities

I `useAllBpmnNodes.ts`, när vi bygger `nodeData`:
- Om `node.type === 'callActivity'` → använd Feature Goal-sökväg
- Annars → använd vanlig node-sökväg

### Steg 2: Bygg Rätt Sökväg för Call Activities

För call activities behöver vi:
1. **Subprocess BPMN file:** `node.subprocessFile` (eller `node.bpmnFile` om subprocessFile saknas)
2. **Element ID:** `node.bpmnElementId`
3. **Parent BPMN file:** `node.bpmnFile` (där call activity är definierad)
4. **Template version:** `'v2'` (standard)

**Problemet:** Vi vet inte om subprocess-sidan redan finns eller inte, så vi behöver kolla flera möjliga sökvägar.

### Steg 3: Kolla Flera Möjliga Sökvägar

För call activities, kolla:
1. Hierarkisk naming (med parent): `feature-goals/${parent}-${elementId}-v2.html`
2. Legacy naming (utan parent): `feature-goals/${subprocess}-${elementId}-v2.html`
3. Med version hash: `docs/{mode}/{provider}/{bpmnFile}/{versionHash}/feature-goals/...`
4. Utan version hash: `docs/{mode}/{provider}/feature-goals/...`

### Steg 4: Uppdatera `checkDocsAvailable`

Utöka `checkDocsAvailable` för att:
- Acceptera flera möjliga sökvägar (array)
- Kolla alla sökvägar tills en hittas
- Returnera `true` om någon sökväg finns

---

## 💡 Implementation

### Ny funktion: `getFeatureGoalDocStoragePaths`

```typescript
// src/lib/artifactUrls.ts
export function getFeatureGoalDocStoragePaths(
  subprocessBpmnFile: string,
  elementId: string,
  parentBpmnFile?: string,
  templateVersion: 'v1' | 'v2' = 'v2',
): string[] {
  const paths: string[] = [];
  
  // Hierarkisk naming (med parent) - prioriteras
  if (parentBpmnFile) {
    const hierarchicalKey = getFeatureGoalDocFileKey(
      subprocessBpmnFile,
      elementId,
      templateVersion,
      parentBpmnFile,
    );
    paths.push(`docs/local/${hierarchicalKey}`);
    paths.push(`docs/slow/chatgpt/${hierarchicalKey}`);
    paths.push(`docs/slow/ollama/${hierarchicalKey}`);
    paths.push(`docs/slow/${hierarchicalKey}`);
    paths.push(`docs/${hierarchicalKey}`);
  }
  
  // Legacy naming (utan parent) - fallback
  const legacyKey = getFeatureGoalDocFileKey(
    subprocessBpmnFile,
    elementId,
    templateVersion,
    undefined, // Ingen parent
  );
  paths.push(`docs/local/${legacyKey}`);
  paths.push(`docs/slow/chatgpt/${legacyKey}`);
  paths.push(`docs/slow/ollama/${legacyKey}`);
  paths.push(`docs/slow/${legacyKey}`);
  paths.push(`docs/${legacyKey}`);
  
  return paths;
}
```

### Uppdatera `checkDocsAvailable`

```typescript
// src/lib/artifactAvailability.ts
export const checkDocsAvailable = async (
  confluenceUrl?: string | null,
  docStoragePath?: string | null,
  storageExists: StorageExistsFn = storageFileExists,
  additionalPaths?: string[], // ✅ Ny parameter för flera sökvägar
) => {
  if (confluenceUrl) return true;
  
  // Kolla huvud-sökvägen
  if (docStoragePath && await storageExists(docStoragePath)) {
    return true;
  }
  
  // Kolla ytterligare sökvägar (för call activities)
  if (additionalPaths && additionalPaths.length > 0) {
    for (const path of additionalPaths) {
      if (await storageExists(path)) {
        return true;
      }
    }
  }
  
  return false;
};
```

### Uppdatera `useAllBpmnNodes.ts`

```typescript
// I fetchAllNodes, när vi bygger nodeData:
const docPath = node.type === 'callActivity'
  ? null // Använd inte getNodeDocStoragePath för call activities
  : getNodeDocStoragePath(bpmnFile, elementId);

// För call activities, bygg Feature Goal-sökvägar
const featureGoalPaths = node.type === 'callActivity' && node.subprocessFile
  ? getFeatureGoalDocStoragePaths(
      node.subprocessFile, // subprocess BPMN file
      elementId,           // call activity element ID
      bpmnFile,            // parent BPMN file (där call activity är definierad)
      'v2',                // template version
    )
  : undefined;

// I enriched-loppet:
const resolvedDocs = await checkDocsAvailable(
  node.confluenceUrl,
  docPath,
  storageFileExists,
  featureGoalPaths, // ✅ Skicka med Feature Goal-sökvägar för call activities
);
```

---

## 🧪 Testning

### Testfall

1. **Call activity med hierarkisk naming:**
   - Parent: `mortgage-se-application.bpmn`
   - Element ID: `household`
   - Subprocess: `mortgage-se-household.bpmn`
   - Förväntad sökväg: `feature-goals/mortgage-se-application-household-v2.html`

2. **Call activity med legacy naming:**
   - Subprocess: `mortgage-se-internal-data-gathering.bpmn`
   - Element ID: `internal-data-gathering`
   - Förväntad sökväg: `feature-goals/mortgage-se-internal-data-gathering-internal-data-gathering-v2.html` (eller bara `mortgage-se-internal-data-gathering-v2.html` om elementId ingår i filnamnet)

3. **Vanlig node (inte call activity):**
   - Ska använda `getNodeDocStoragePath` som vanligt
   - Sökväg: `docs/nodes/${bpmnFile}/${elementId}.html`

---

## ✅ Checklista

- [ ] **Kör `scripts/check-call-activity-docs.ts`** för att verifiera att dokumentation faktiskt finns
- [ ] Skapa `getFeatureGoalDocStoragePaths()` funktion i `src/lib/artifactUrls.ts`
- [ ] Uppdatera `checkDocsAvailable()` för att acceptera flera sökvägar
- [ ] Uppdatera `useAllBpmnNodes.ts` för att använda Feature Goal-sökvägar för call activities
- [ ] Testa med call activities som har hierarkisk naming
- [ ] Testa med call activities som har legacy naming
- [ ] Testa med vanliga noder (inte call activities)
- [ ] Verifiera att dokumentation visas korrekt i node-matrix

## 🔍 Verifiering

**Först: Kör verifieringsscript**
```bash
npx tsx scripts/check-call-activity-docs.ts
```

Detta kommer:
- Lista alla call activities
- Kolla om dokumentation finns på rätt sökvägar
- Visa vilka sökvägar som faktiskt finns
- Visa vilka som saknas

**Förväntat resultat:**
- Om dokumentation finns → visas sökvägen
- Om dokumentation saknas → visas "NOT FOUND" och vilka sökvägar som kollades

---

## 📝 Ytterligare Överväganden

### Version Hash

Om version hash används, behöver vi också kolla:
- `docs/local/${bpmnFile}/${versionHash}/feature-goals/...`
- `docs/slow/chatgpt/${bpmnFile}/${versionHash}/feature-goals/...`

Men detta kan läggas till senare om det behövs.

### Performance

Kolla flera sökvägar kan vara långsamt. Överväg:
- Parallella `storageFileExists`-anrop
- Cache resultat
- Prioritera vanligaste sökvägar först



