# Feature Goals - Storage Paths och Namngivning

**Datum:** 2025-12-22  
**Status:** ✅ Verifierad - Feature Goals sparas och läses korrekt

## Sammanfattning

✅ **Feature Goals skapas med korrekt namn på korrekt ställe** och kan både genereras och nås i appen.

## Namngivning

### För Call Activities (hierarchical naming)

**Kod:** `src/lib/nodeArtifactPaths.ts` rad ~34-59

```typescript
const featureDocPath = getFeatureGoalDocFileKey(
  bpmnFileForFeatureGoal,        // subprocess-filen (t.ex. "mortgage-se-internal-data-gathering.bpmn")
  node.bpmnElementId,            // call activity element ID (t.ex. "internal-data-gathering")
  undefined,                      // no version suffix
  parentBpmnFile,                 // parent-filen (t.ex. "mortgage-se-application.bpmn")
);
```

**Resultat:**
- Filnamn: `feature-goals/mortgage-se-application-internal-data-gathering.html`
- Hierarchical naming: `{parent}-{elementId}`

**Exempel:**
- `mortgage-se-application.bpmn` → `internal-data-gathering` → `feature-goals/mortgage-se-application-internal-data-gathering.html`
- `mortgage.bpmn` → `application` → `feature-goals/mortgage-application.html`

### För Process Nodes (subprocess-filer)

**Kod:** `src/lib/bpmnGenerators.ts` rad ~2447-2452

```typescript
const subprocessFeatureDocPath = getFeatureGoalDocFileKey(
  file,                           // subprocess-filen (t.ex. "mortgage-se-application.bpmn")
  fileBaseName,                   // filens base name (t.ex. "mortgage-se-application")
  undefined,                      // no version suffix
  undefined,                      // ingen parent för process nodes
);
```

**Resultat:**
- Filnamn: `feature-goals/mortgage-se-application.html`
- Ingen parent: använder bara filens base name

## Storage Paths

### När Feature Goals sparas

**Kod:** `src/lib/bpmnGenerators.ts` rad ~1896-1910

```typescript
const { modePath } = buildDocStoragePaths(
  featureDocPath,                 // t.ex. "feature-goals/mortgage-se-application-internal-data-gathering.html"
  null,                           // mode
  'cloud',                        // provider
  bpmnFileName,                   // parent-filen för call activities (t.ex. "mortgage-se-application.bpmn")
  versionHash                     // version hash för parent-filen
);
```

**Storage paths:**
- **Versioned:** `docs/claude/{bpmnFileName}/{versionHash}/{featureDocPath}`
  - Exempel: `docs/claude/mortgage-se-application.bpmn/{hash}/feature-goals/mortgage-se-application-internal-data-gathering.html`
- **Non-versioned:** `docs/claude/{featureDocPath}`
  - Exempel: `docs/claude/feature-goals/mortgage-se-application-internal-data-gathering.html`

**VIKTIGT:** För call activities sparas filen under **parent-filens** version hash (där call activity är definierad), inte subprocess-filens.

### När DocViewer läser Feature Goals

**Kod:** `src/pages/DocViewer.tsx` rad ~237-298

```typescript
featureGoalPath = getFeatureGoalDocFileKey(
  featureGoalBpmnFile,            // subprocess-filen
  elementSegment,                 // elementId
  undefined,                      // no version suffix
  isProcessNode ? undefined : parentBpmnFile  // parent för call activities
);

// Versioned paths
const bpmnFileForVersion = isProcessNode 
  ? (baseName + '.bpmn')          // För process nodes: parent-filen
  : (parentBpmnFile || baseName + '.bpmn');  // För call activities: parent-filen

tryPaths.push(`docs/claude/${bpmnFileForVersion}/${versionHash}/${featureGoalPath}`);
```

**Storage paths som letas efter:**
1. **Versioned:** `docs/claude/{bpmnFileForVersion}/{versionHash}/{featureGoalPath}`
2. **Non-versioned:** `docs/claude/{featureGoalPath}`
3. **Legacy:** `docs/{featureGoalPath}`

**VIKTIGT:** DocViewer använder **samma logik** som genereringen:
- För call activities: `bpmnFileForVersion` = parent-filen
- För process nodes: `bpmnFileForVersion` = parent-filen (där processen refereras)

## Verifiering

### ✅ Namngivning är konsekvent

- **Generering:** Använder `getFeatureGoalDocFileKey` med parent för call activities
- **Läsning:** Använder `getFeatureGoalDocFileKey` med samma parametrar
- **Resultat:** Samma filnamn genereras och letas efter

### ✅ Storage paths matchar

- **Sparas under:** `docs/claude/{parentFile}/{versionHash}/feature-goals/{parent}-{elementId}.html`
- **Läses från:** `docs/claude/{parentFile}/{versionHash}/feature-goals/{parent}-{elementId}.html`
- **Resultat:** Paths matchar perfekt

### ✅ Hierarchical naming fungerar

- **Call activities:** `feature-goals/{parent}-{elementId}.html`
  - Exempel: `feature-goals/mortgage-se-application-internal-data-gathering.html`
- **Process nodes:** `feature-goals/{subprocessFile}.html`
  - Exempel: `feature-goals/mortgage-se-application.html`

### ✅ Versioning fungerar

- Feature Goals sparas under parent-filens version hash
- DocViewer letar efter samma version hash
- Non-versioned paths fungerar som fallback

## Exempel

### Call Activity: "internal-data-gathering" i "mortgage-se-application.bpmn"

**Generering:**
```typescript
getFeatureGoalDocFileKey(
  "mortgage-se-internal-data-gathering.bpmn",  // subprocess-filen
  "internal-data-gathering",                    // elementId
  undefined,
  "mortgage-se-application.bpmn"               // parent-filen
)
// → "feature-goals/mortgage-se-application-internal-data-gathering.html"
```

**Storage path:**
```
docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-application-internal-data-gathering.html
```

**DocViewer letar efter:**
```
docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-application-internal-data-gathering.html
```

✅ **Matchar perfekt!**

### Process Node: "mortgage-se-application.bpmn"

**Generering:**
```typescript
getFeatureGoalDocFileKey(
  "mortgage-se-application.bpmn",  // subprocess-filen
  "mortgage-se-application",        // fileBaseName
  undefined,
  undefined                        // ingen parent
)
// → "feature-goals/mortgage-se-application.html"
```

**Storage path:**
```
docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-application.html
```

**DocViewer letar efter:**
```
docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-application.html
```

✅ **Matchar perfekt!**

## Slutsats

✅ **Feature Goals skapas med korrekt namn på korrekt ställe**

- Namngivning är konsekvent mellan generering och läsning
- Storage paths matchar mellan sparande och läsning
- Hierarchical naming fungerar korrekt för call activities
- Process nodes använder filens base name
- Versioning fungerar med parent-filens version hash

**Feature Goals kan både genereras och nås i appen!** 🎉
