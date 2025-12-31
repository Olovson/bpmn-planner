# Progress-räkning: Detaljerad Uppdelning

## Formel
```typescript
const totalNodesToGenerate = 
  nodesToGenerate.length +           // Epics/Tasks/CallActivities
  processNodesToGenerate +            // Process Feature Goals för subprocess-filer
  fileLevelDocsCount +                // File-level docs (en per fil)
  rootFeatureGoalCount;               // Root Process Feature Goal
```

## Vad Räknas i Varje Komponent?

### 1. `nodesToGenerate.length`
**Innehåller:**
- ✅ Service Tasks (Epics)
- ✅ User Tasks (Epics)
- ✅ Business Rule Tasks (Epics)
- ✅ CallActivities (om subprocess-filen finns)

**Filtreras bort:**
- ❌ CallActivities med saknade subprocess-filer (`missingDefinition = true`)
- ❌ Noder som inte är i `analyzedFiles`
- ❌ Noder som filtreras bort av `nodeFilter`

### 2. `processNodesToGenerate`
**Innehåller:**
- ✅ Process Feature Goals för subprocess-filer (en per subprocess-fil med process node)

**Räknas för:**
- Subprocess-filer i `analyzedFiles` som har en process node i grafen

### 3. `fileLevelDocsCount`
**Innehåller:**
- ✅ File-level docs (en per fil i `analyzedFiles`)

**Räknas:**
- `analyzedFiles.length` (3 filer = 3 file-level docs)

### 4. `rootFeatureGoalCount`
**Innehåller:**
- ✅ Root Process Feature Goal (1 om root-processen har process node)

**Räknas:**
- 1 om `useHierarchy && isActualRootFile && isRootFileGeneration` OCH root-processen har process node

## Exempel: 3 Filer, 4 Epics

### Förväntad Räkning:
- `nodesToGenerate.length`: 4 (4 epics)
- `processNodesToGenerate`: 2 (internal data gathering, application)
- `fileLevelDocsCount`: 3 (mortgage, application, internal data gathering)
- `rootFeatureGoalCount`: 1 (mortgage root)
- **Totalt**: 4 + 2 + 3 + 1 = **10 noder**

### Om Det Visar 26 Noder:
**Möjliga orsaker:**

1. **CallActivities räknas också:**
   - Om `mortgage.bpmn` har många CallActivities (t.ex. 20+)
   - Dessa räknas i `nodesToGenerate.length` om subprocess-filerna finns
   - Men användaren sa bara 4 epics, så detta är osannolikt

2. **Fler filer än förväntat:**
   - Om `analyzedFiles` innehåller fler filer än 3
   - T.ex. om `graphFileScope` innehåller fler filer

3. **Fler process nodes:**
   - Om fler subprocess-filer har process nodes än förväntat

4. **File-level docs räknas dubbelt:**
   - Om `fileLevelDocsCount` räknas felaktigt

## Rekommendation: Debug-logging

Lägg till debug-logging för att se exakt vad som räknas:

```typescript
if (import.meta.env.DEV) {
  console.log(`[bpmnGenerators] 📊 Progress breakdown:`, {
    nodesToGenerate: nodesToGenerate.length,
    nodesToGenerateDetails: nodesToGenerate.map(n => ({
      type: n.type,
      name: n.name,
      bpmnFile: n.bpmnFile,
    })),
    processNodesToGenerate,
    fileLevelDocsCount,
    rootFeatureGoalCount,
    totalNodesToGenerate,
    analyzedFiles,
  });
}
```

