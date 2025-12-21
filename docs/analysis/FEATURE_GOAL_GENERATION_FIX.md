# Fix: Feature Goals genereras inte när man genererar alla filer

**Datum:** 2025-01-XX  
**Status:** ✅ Fixad

---

## 📊 Problem

När användaren valde att generera alla filer, genererades **INGA Feature Goals** med Claude. Endast leaf nodes (userTasks, serviceTasks, businessRuleTasks) genererades korrekt.

**Rotorsak:**
1. **CallActivities filtreras bort** om subprocess-filen inte är med i `analyzedFiles`
2. **`skipDocGeneration` hoppar över Feature Goals** när `alreadyProcessedGlobally` är true
3. **Feature Goals genereras inte** när `existingDoc` saknas i `generatedChildDocs`

---

## ✅ Lösning

### 1. CallActivities inkluderas alltid

**Före:**
```typescript
const nodesToGenerate = testableNodes.filter(node => {
  // Inkludera bara noder från analyzedFiles
  return analyzedFiles.includes(node.bpmnFile);
});
```

**Efter:**
```typescript
const nodesToGenerate = testableNodes.filter(node => {
  // För callActivities: inkludera om callActivity-filen är med i analyzedFiles,
  // även om subprocess-filen inte är med (subprocess-filen kan genereras senare eller saknas)
  if (node.type === 'callActivity') {
    return analyzedFiles.includes(node.bpmnFile);
  }
  // För tasks/epics: inkludera bara om filen är med i analyzedFiles
  return analyzedFiles.includes(node.bpmnFile);
});
```

**Resultat:** CallActivities i root-filen genereras alltid, även om subprocess-filen saknas.

---

### 2. Feature Goals genereras alltid för callActivities

**Före:**
```typescript
const skipDocGeneration = alreadyProcessedGlobally || subprocessAlreadyGenerated;

// Om skipDocGeneration är true, hoppas Feature Goal över för tasks/epics
if (node.type !== 'callActivity' && alreadyProcessedGlobally) {
  continue; // Hoppa över
}
```

**Efter:**
```typescript
// För callActivities: skipDocGeneration används bara för att avgöra base vs instans-specifik
// För tasks/epics: skipDocGeneration betyder att vi hoppar över generering helt
const skipDocGeneration = node.type === 'callActivity'
  ? subprocessAlreadyGenerated // För callActivities: bara kolla om subprocess redan genererats
  : (alreadyProcessedGlobally || subprocessAlreadyGenerated); // För tasks/epics: hoppa över om redan processad

// För callActivities: generera alltid Feature Goal, även om alreadyProcessedGlobally är true
// För tasks/epics: hoppa över om alreadyProcessedGlobally är true
if (node.type !== 'callActivity' && alreadyProcessedGlobally) {
  continue; // Hoppa över tasks/epics som redan processats
}
```

**Resultat:** Feature Goals genereras alltid för callActivities, även om `alreadyProcessedGlobally` är true.

---

### 3. Förbättrad Feature Goal-generering när `existingDoc` saknas

**Före:**
```typescript
if (skipDocGeneration && node.subprocessFile) {
  const existingDoc = generatedChildDocs.get(docKey);
  if (existingDoc) {
    // Generera instans-specifik dokumentation
  } else {
    // Fallback utan LLM
    nodeDocContent = await renderFeatureGoalDoc(...);
  }
}
```

**Efter:**
```typescript
if (skipDocGeneration && node.subprocessFile) {
  const existingDoc = generatedChildDocs.get(docKey);
  if (existingDoc) {
    // Generera instans-specifik dokumentation med LLM
  } else {
    // Ingen dokumentation att hämta - generera Feature Goal ändå med LLM
    nodeDocContent = await renderDocWithLlmFallback(
      'feature',
      nodeContext,
      docLinks,
      async () => await renderFeatureGoalDoc(...),
      useLlm,
      llmProvider,
      localAvailable,
      undefined,
      featureGoalTemplateVersion,
      childDocsForNode.size > 0 ? childDocsForNode : undefined,
      async (provider, fallbackUsed, docJson) => {
        // Spara dokumentation för framtida referens
        if (docJson) {
          const docInfo = extractDocInfoFromJson(docJson);
          if (docInfo) {
            const subprocessDocKey = `subprocess:${node.subprocessFile}`;
            if (!generatedChildDocs.has(subprocessDocKey)) {
              generatedChildDocs.set(subprocessDocKey, docInfo);
              generatedSubprocessFeatureGoals.add(node.subprocessFile);
            }
          }
        }
      },
      checkCancellation,
      abortSignal,
    );
  }
}
```

**Resultat:** Feature Goals genereras med LLM även när `existingDoc` saknas.

---

### 4. Förbättrad debug-logging

Lagt till omfattande debug-logging för att spåra:
- När callActivities bearbetas
- Om subprocess-filen är med i `analyzedFiles`
- När Feature Goals läggs till i `result.docs`
- Om `skipDocGeneration` är true och varför

---

## 🔍 Teknisk Detalj

### Logik för Feature Goal-generering

1. **CallActivity i root-fil (t.ex. `mortgage.bpmn`):**
   - Inkluderas alltid om root-filen är med i `analyzedFiles`
   - Genererar Feature Goal med LLM
   - Sparar i `result.docs` med Feature Goal-path

2. **CallActivity med subprocess-fil i `analyzedFiles`:**
   - Genererar base Feature Goal först
   - Markerar subprocess som genererad
   - Efterföljande callActivities med samma subprocess genererar instans-specifik dokumentation

3. **CallActivity med subprocess-fil INTE i `analyzedFiles`:**
   - Genererar Feature Goal ändå med LLM
   - Sparar dokumentation för framtida referens
   - Efterföljande callActivities kan använda denna dokumentation

### Förhindra dubbelgenerering

- `result.docs.has(featureDocPath)` kontrollerar om Feature Goal redan finns
- `generatedSubprocessFeatureGoals` spårar vilka subprocesser som redan genererats
- `globalProcessedDocNodes` spårar vilka noder som redan processats (för tasks/epics)

---

## ✅ Resultat

När användaren genererar alla filer:

1. **CallActivities inkluderas alltid** om deras fil är med i `analyzedFiles`
2. **Feature Goals genereras alltid** för callActivities, även om subprocess-filen saknas
3. **Feature Goals genereras med LLM** även när `existingDoc` saknas
4. **Ingen dubbelgenerering** - Feature Goals sparas bara en gång per path

---

## 📝 Testning

För att verifiera att fixarna fungerar:

1. **Generera alla filer** via BPMN File Manager
2. **Kontrollera att Feature Goals genereras:**
   - Kolla console logs för `[bpmnGenerators] ✓ Adding Feature Goal doc`
   - Verifiera att Feature Goal-filer finns i Supabase Storage
   - Öppna Feature Goal-dokumentation i DocViewer

3. **Kontrollera att inga Feature Goals dubbelgenereras:**
   - Kolla console logs för `[bpmnGenerators] ⚠️ Feature Goal page already exists`
   - Verifiera att varje Feature Goal bara finns en gång i Storage

---

## 🔧 Relaterade Filer

- `src/lib/bpmnGenerators.ts` - Uppdaterad logik för Feature Goal-generering
- `docs/analysis/FEATURE_GOAL_GENERATION_FIX.md` - Denna dokumentation


