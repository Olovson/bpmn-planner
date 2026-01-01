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
- **VIKTIGT:** Om `nodeFilter` används, räknas bara filer som faktiskt har noder som ska genereras

### 3. `fileLevelDocsCount`
**Innehåller:**
- ✅ File-level docs (en per fil)

**Räknas:**
- **Utan `nodeFilter`:** `analyzedFiles.length` (alla filer i `analyzedFiles`)
- **Med `nodeFilter`:** Antal unika filer som faktiskt har noder som ska genereras (från `nodesToGenerate`) + filer som behöver Process Feature Goals + root-filen om Root Process Feature Goal ska genereras
- Detta säkerställer att progress-räknaren visar korrekt antal när bara vissa filer genereras (t.ex. diff-baserad regenerering)

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

### Om Det Visar Fler Noder Än Förväntat:
**Möjliga orsaker:**

1. **CallActivities räknas också:**
   - Om `mortgage.bpmn` har många CallActivities (t.ex. 20+)
   - Dessa räknas i `nodesToGenerate.length` om subprocess-filerna finns

2. **Fler filer än förväntat:**
   - Om `analyzedFiles` innehåller fler filer än förväntat
   - T.ex. om `graphFileScope` innehåller fler filer än de som faktiskt ska genereras
   - **FIXAT:** När `nodeFilter` används, räknas bara filer med faktiska noder som ska genereras

3. **Fler process nodes:**
   - Om fler subprocess-filer har process nodes än förväntat

4. **File-level docs räknas felaktigt:**
   - **FIXAT:** När `nodeFilter` används, räknas bara filer som faktiskt får dokumentation genererad

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

