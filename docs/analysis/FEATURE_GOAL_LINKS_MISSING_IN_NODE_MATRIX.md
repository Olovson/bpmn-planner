# Analys: Feature Goal-länkar saknas i Node Matrix

## Problembeskrivning

Användaren rapporterar att Feature Goal-dokumentation finns i Supabase Storage:
```
docs/claude/mortgage-se-application.bpmn/8569560e06d63ea5aa61a1a8fadd49e4233aaba35bdb5ec603350299d6eb06f0/feature-goals/mortgage-se-application.html
```

Men länkarna till dessa dokument saknas på node-matrix sidan (`http://localhost:8080/#/node-matrix`).

---

## Rotorsak

Systemet genererar **två typer av Feature Goal-dokumentation**:

### 1. **CallActivity Feature Goals** (för call activities)
- **Naming:** Hierarchical format: `feature-goals/{parentBaseName}-{elementId}.html`
- **Exempel:** `feature-goals/mortgage-se-application-internal-data-gathering.html`
- **Storage path:** `docs/claude/{subprocessBpmnFile}/{versionHash}/feature-goals/{hierarchicalKey}.html`
- **Hanteras av:** `useAllBpmnNodes.ts` rad 271-324 (för callActivities)

### 2. **Process Feature Goals** (för process-noder i subprocess-filer)
- **Naming:** Filens base name: `feature-goals/{baseName}.html`
- **Exempel:** `feature-goals/mortgage-se-application.html`
- **Storage path:** `docs/claude/{bpmnFileName}/{versionHash}/feature-goals/{baseName}.html`
- **Genereras av:** `bpmnGenerators.ts` rad 2581-2592
- **Hanteras av:** ❌ **INTE** av `useAllBpmnNodes.ts`

---

## Detaljerad Analys

### Vad som genereras

I `bpmnGenerators.ts` (rad 2581-2592):
```typescript
// Generera Feature Goal för subprocess-filer även om nodesInFile.length === 0
if (isSubprocessFileForSubprocess && processNodeForFileForSubprocess && processNodeForFileForSubprocess.type === 'process') {
  const fileBaseName = file.replace('.bpmn', '');
  const subprocessFeatureDocPath = getFeatureGoalDocFileKey(
    file,
    fileBaseName, // Använd filens base name istället för processNodeForFileForSubprocess.bpmnElementId
    undefined,
    undefined, // ❌ INGEN parentBpmnFile - detta är en Process Feature Goal
  );
  // ... genererar dokumentation ...
}
```

**Resultat:** Process Feature Goal sparas som:
- `feature-goals/mortgage-se-application.html` (utan hierarchical naming)
- Under `docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-application.html`

### Vad som letas efter

I `useAllBpmnNodes.ts` (rad 271-324):
```typescript
if (node.nodeType === 'CallActivity') {
  // ✅ Hanterar callActivities med hierarchical naming
  featureGoalPaths = getFeatureGoalDocStoragePaths(
    subprocessFile.replace('.bpmn', ''),
    node.elementId,
    parentBpmnFile, // ✅ Använder parent för hierarchical naming
    subprocessVersionHash,
    subprocessFile,
  );
} else {
  // ❌ För process nodes: Letar bara efter Epic-dokumentation, INTE Process Feature Goals
  epicDocPaths = [/* ... epic paths ... */];
}
```

**Problem:** Process Feature Goals letas **INTE** efter för process-noder.

---

## Varför Process Feature Goals inte visas

1. **Node Matrix visar bara callActivities, UserTasks, ServiceTasks, BusinessRuleTasks**
   - Process-noder filtreras bort (rad 152-157 i `useAllBpmnNodes.ts`)
   - Process-noder visas inte i tabellen

2. **Men Process Feature Goals är kopplade till process-noder, inte callActivities**
   - Process Feature Goal för `mortgage-se-application.bpmn` är kopplad till **process-noden** i filen
   - Inte till callActivity `application` i `mortgage.bpmn`

3. **Systemet förväntar sig att Feature Goals är kopplade till callActivities**
   - `getDocumentationUrl()` (rad 16-42 i `artifactUrls.ts`) använder hierarchical naming för subprocesses
   - Men Process Feature Goals använder **inte** hierarchical naming

---

## Konflikt mellan två Feature Goal-typer

### CallActivity Feature Goal (hierarchical)
- **För:** CallActivity `application` i `mortgage.bpmn`
- **Namn:** `feature-goals/mortgage-application.html` (eller `mortgage-se-application.html` beroende på implementation)
- **Storage:** `docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-application.html`

### Process Feature Goal (non-hierarchical)
- **För:** Process-nod i `mortgage-se-application.bpmn`
- **Namn:** `feature-goals/mortgage-se-application.html`
- **Storage:** `docs/claude/mortgage-se-application.bpmn/{versionHash}/feature-goals/mortgage-se-application.html`

**Konflikt:** Båda kan ha samma filnamn (`mortgage-se-application.html`) men olika syften!

---

## Lösningsförslag

### Alternativ 1: Visa Process Feature Goals för callActivities
- När en callActivity har en subprocess-fil, kolla också efter Process Feature Goal för subprocess-filen
- Lägg till Process Feature Goal-sökvägar i `featureGoalPaths` för callActivities
- **Fördel:** Enklare implementation, använder befintlig callActivity-logik
- **Nackdel:** Process Feature Goals visas under callActivities (kan vara förvirrande)

### Alternativ 2: Lägg till Process-noder i Node Matrix
- Inkludera process-noder i Node Matrix (med egen typ: `Process`)
- Lägg till Process Feature Goal-sökvägar för process-noder
- **Fördel:** Tydligare separation mellan callActivity Feature Goals och Process Feature Goals
- **Nackdel:** Kräver ändringar i UI och filtrering

### Alternativ 3: Konsolidera Feature Goals
- Ta bort Process Feature Goals helt
- Använd bara CallActivity Feature Goals (hierarchical naming)
- **Fördel:** Enklare modell, en Feature Goal per callActivity
- **Nackdel:** Kräver omgenerering av befintlig dokumentation

---

## Rekommendation

**Alternativ 1** är mest praktisk eftersom:
1. Process Feature Goals redan genereras och finns i Storage
2. Användaren förväntar sig att se Feature Goals för subprocess-filer
3. Minimal kodändring (lägg till Process Feature Goal-sökvägar i `featureGoalPaths` för callActivities)

**Implementation:**
- I `useAllBpmnNodes.ts` rad 313-319, lägg till Process Feature Goal-sökvägar för callActivities:
  ```typescript
  if (node.subprocessFile) {
    // ... existing callActivity Feature Goal paths ...
    
    // ✅ LÄGG TILL: Process Feature Goal paths för subprocess-filen
    const subprocessBaseName = subprocessFile.replace('.bpmn', '');
    const processFeatureGoalKey = getFeatureGoalDocFileKey(
      subprocessFile,
      subprocessBaseName,
      undefined, // No parent for Process Feature Goals
      undefined,
    );
    const processFeatureGoalPaths = [
      `docs/claude/${subprocessFile}/${subprocessVersionHash}/${processFeatureGoalKey}`,
      `docs/claude/${processFeatureGoalKey}`,
    ];
    featureGoalPaths = [...featureGoalPaths, ...processFeatureGoalPaths];
  }
  ```

---

## Ytterligare Observationer

1. **`getDocumentationUrl()` behöver också uppdateras**
   - För callActivities med subprocess-filer, bör den också kolla Process Feature Goals
   - Eller använda samma logik som `useAllBpmnNodes.ts`

2. **Dokumentationens syfte**
   - CallActivity Feature Goal: Dokumenterar callActivity från parent-processens perspektiv
   - Process Feature Goal: Dokumenterar subprocess-processen från subprocess-filens perspektiv
   - Dessa kan ha olika innehåll och syfte

3. **Namngivningskonflikt**
   - Om både CallActivity Feature Goal och Process Feature Goal har samma namn (`mortgage-se-application.html`), kan det bli förvirrande
   - Överväg att använda olika namngivning eller prioritera en typ

---

## Testfall

Efter fix, verifiera att:
1. ✅ CallActivity `application` i `mortgage.bpmn` visar länk till Process Feature Goal för `mortgage-se-application.bpmn`
2. ✅ CallActivity `internal-data-gathering` i `mortgage-se-application.bpmn` visar länk till Process Feature Goal för `mortgage-se-internal-data-gathering.bpmn`
3. ✅ Epic-dokumentation för tasks/epics fungerar fortfarande korrekt
4. ✅ CallActivity Feature Goals (hierarchical) fungerar fortfarande korrekt

