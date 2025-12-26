# Legacy Documentation Cleanup - Slutförd

## Datum: 2025-12-26

### Genomförda Åtgärder

#### 1. Borttagning av Legacy Filer från Storage
- **Totalt borttagna filer:** 39
- **Status:** ✅ Alla legacy filer har tagits bort från Supabase Storage

**Borttagna filer:**
- Alla legacy Feature Goal filer som inte använder hierarchical naming
- Filer som redan fanns i hierarchical format (dubletter)
- Filer som inte kunde migreras automatiskt (flera matchningar)

#### 2. Borttagning av Legacy Kod

##### `src/lib/testGenerators.ts`
- ✅ Tog bort legacy-fallback logik som sökte efter dokumentation utan parent prefix
- ✅ Nu använder systemet endast hierarchical naming för call activities

**Före:**
```typescript
// Check all possible paths (versioned and non-versioned)
for (const path of featureGoalPaths) {
  if (await storageFileExists(path)) {
    docExists = true;
    docPath = path;
    break;
  }
}

// If not found with hierarchical naming, try legacy naming (without parent prefix)
if (!docExists) {
  const legacyPaths = getFeatureGoalDocStoragePaths(
    node.subprocessFile,
    elementId,
    undefined, // no parent for legacy naming
    subprocessVersionHash,
    node.subprocessFile,
  );
  // ... legacy check
}
```

**Efter:**
```typescript
// Check all possible paths (versioned and non-versioned)
for (const path of featureGoalPaths) {
  if (await storageFileExists(path)) {
    docExists = true;
    docPath = path;
    break;
  }
}
```

##### `src/lib/nodeArtifactPaths.ts`
- ✅ Uppdaterade kommentarer för att ta bort referenser till "legacy naming" och "fallback"
- ✅ Klarifierade att process nodes (inte call activities) använder subprocess-filens base name

**Före:**
```typescript
/**
 * When parentBpmnFile is not provided, falls back to legacy naming based on subprocess BPMN file.
 */
```

**Efter:**
```typescript
/**
 * For call activities, parentBpmnFile should always be provided for hierarchical naming.
 * For process nodes (when subprocess file generates its own Feature Goal), parentBpmnFile is undefined.
 */
```

##### `src/lib/artifactUrls.ts`
- ✅ Tog bort kommentarer om legacy naming
- ✅ Klarifierade att hierarchical naming alltid används för call activities

**Före:**
```typescript
// Legacy naming (utan parent) har tagits bort - alla filer måste genereras om med hierarchical naming.
```

**Efter:**
```typescript
// VIKTIGT: För call activities använder vi ALLTID hierarchical naming (med parent)
// men filen sparas under subprocess-filens version hash (inte parent-filens).
```

##### `src/lib/bpmnGenerators.ts`
- ✅ Uppdaterade kommentarer för att ta bort referenser till legacy naming

#### 3. Scripts

##### Nytt Script: `scripts/cleanup-legacy-documentation.ts`
- Script för att ta bort legacy filer från Storage
- Stödjer `--dry-run` för att förhandsgranska ändringar
- Tar bort endast kända legacy filer (säkert)

**Användning:**
```bash
npm run cleanup:legacy-docs        # Ta bort legacy filer
npm run cleanup:legacy-docs:dry     # Förhandsgranska (dry-run)
```

### Kvarvarande Anrop utan Parent

Följande anrop till `getFeatureGoalDocStoragePaths` utan `parentBpmnFile` är **korrekta** eftersom de är för process nodes (inte call activities):

1. **`src/lib/e2eScenarioGenerator.ts`** - `loadFeatureGoalDocFromStorage`
   - Används för att ladda Feature Goal dokumentation för process nodes
   - Process nodes genererar sin egen Feature Goal-sida (utan parent)

2. **`src/lib/featureGoalTestGenerator.ts`** - `loadFeatureGoalDocFromStorage`
   - Samma som ovan

3. **`src/lib/testGeneration/userStoryExtractor.ts`** - `loadDocFromStorage`
   - Används för att ladda dokumentation (epic eller feature-goal)
   - För feature-goal: process nodes (inte call activities)

### Resultat

✅ **Alla legacy filer borttagna från Storage**
✅ **All legacy-fallback kod borttagen**
✅ **Kommentarer uppdaterade**
✅ **Build fungerar korrekt**

### Nästa Steg

1. **Generera dokumentation** för de 8 saknade filerna (se `MIGRATION_RESULT.md`)
2. **Verifiera** att all dokumentation fungerar korrekt med hierarchical naming
3. **Ta bort migration scripts** (om önskat) - de behövs inte längre

### Noteringar

- Process nodes (när subprocess-filen genererar sin egen Feature Goal-sida) använder fortfarande `getFeatureGoalDocStoragePaths` utan parent, vilket är korrekt.
- Call activities använder alltid hierarchical naming med parent.
- Alla legacy filer har tagits bort - systemet använder nu endast hierarchical naming.

