# Analys: Status Popup Node Counting - Files Sidan

## Datum: 2025-01-XX

## 🎯 Problem

Status-popupen på files-sidan visar felaktig räkning av hur många noder/dokument som behöver genereras. Specifikt:
- Räkningen visar fler noder än vad som faktiskt genereras
- Progress visar t.ex. "5 av 10 noder" när bara 5 noder faktiskt genereras
- Detta skapar förvirring och felaktiga förväntningar

---

## 📊 Nuvarande Implementation

### 1. `total:init` Räknar Noder (`bpmnGenerators.ts` rad 1777-1850)

**Logik:**
```typescript
// Räknar ALLA relevanta noder direkt från BPMN-filer
let totalNodesFromFiles = 0;
for (const file of analyzedFiles) {
  const parseResult = await parseBpmnFile(`/bpmn/${file}`);
  const relevantElements = parseResult.elements.filter(e => {
    return elementType === 'bpmn:UserTask' || 
           elementType === 'bpmn:ServiceTask' || 
           elementType === 'bpmn:BusinessRuleTask' ||
           elementType === 'bpmn:CallActivity';
  });
  totalNodesFromFiles += relevantElements.length;
}

// Räkna process nodes för subprocess-filer utan tasks/callActivities
let processNodesToGenerate = 0;
// ... logik för process nodes ...

const totalNodesToGenerate = totalNodesFromFiles + processNodesToGenerate;
await reportProgress('total:init', 'Initierar generering', JSON.stringify({
  files: analyzedFiles.length,
  nodes: totalNodesToGenerate,
}));
```

**Problem:**
- Räknar **ALLA** noder direkt från BPMN-filer
- Inkluderar noder som **hoppas över** i faktisk generering
- Matchar coverage-räkning, men **INTE** faktisk generering

---

### 2. Faktisk Generering Filtrerar Noder (`bpmnGenerators.ts` rad 1596-1630)

**Logik:**
```typescript
const nodesToGenerate = testableNodes.filter(node => {
  // Om nodeFilter finns, använd den först
  if (nodeFilter && !nodeFilter(node)) {
    return false;
  }
  
  // För call activities: inkludera BARA om subprocess-filen finns
  if (node.type === 'callActivity') {
    if (node.missingDefinition || !node.subprocessFile) {
      return false; // ❌ Hoppas över
    }
    if (!existingBpmnFiles.includes(node.subprocessFile)) {
      return false; // ❌ Hoppas över
    }
    if (!analyzedFiles.includes(node.bpmnFile)) {
      return false; // ❌ Hoppas över
    }
  }
  
  // För tasks: inkludera BARA om filen är i analyzedFiles
  if (!analyzedFiles.includes(node.bpmnFile)) {
    return false; // ❌ Hoppas över
  }
  
  // Hoppa över om dokumentation redan finns (om inte forceRegenerate)
  if (!forceRegenerate && /* dokumentation finns */) {
    return false; // ❌ Hoppas över
  }
  
  return true;
});
```

**Resultat:**
- `nodesToGenerate.length` kan vara **mycket mindre** än `totalNodesToGenerate`
- Exempel: 10 noder räknas, men bara 5 genereras (5 hoppas över)

---

### 3. Progress Uppdatering (`bpmnGenerators.ts` - dokumentationsgenerering)

**Logik:**
- `docgenProgress.completed` ökar bara när noder **faktiskt genereras**
- Noder som hoppas över räknas **INTE** som completed
- Men `docgenProgress.total` är satt till `totalNodesToGenerate` (alla noder)

**Resultat:**
- Progress visar t.ex. "5 av 10 noder" (50%)
- Men bara 5 noder genereras, så progress borde vara "5 av 5 noder" (100%)
- Användaren ser 50% när genereringen faktiskt är klar

---

### 4. UI Visar Progress (`TransitionOverlay.tsx` rad 58)

**Logik:**
```typescript
{docgenProgress.completed} av {Math.max(docgenProgress.total || 0, graphTotals.nodes)} noder
```

**Problem:**
- Använder `Math.max()` vilket kan ge fel värde
- Om `docgenProgress.total` är 0, används `graphTotals.nodes` istället
- Men `graphTotals.nodes` är också satt från `total:init` (alla noder)

---

## 🔍 Identifierade Problem

### Problem 1: `total:init` Räknar ALLA Noder, Inte Bara De Som Genereras

**Scenario:**
- BPMN-fil har 10 noder (5 UserTasks, 5 CallActivities)
- 3 CallActivities har saknade subprocess-filer
- `total:init` räknar: **10 noder**
- `nodesToGenerate` innehåller: **7 noder** (5 UserTasks + 2 CallActivities med subprocess-filer)

**Resultat:**
- Progress visar: "7 av 10 noder" (70%)
- Men bara 7 noder genereras, så progress borde vara "7 av 7 noder" (100%)

---

### Problem 2: Process Nodes Räknas Dubbelt

**Scenario:**
- Subprocess-fil har process node men inga tasks/callActivities
- Process node räknas i `processNodesToGenerate`
- Men om filen har callActivities som pekar på den, räknas de också
- Resultat: Process node kan räknas dubbelt

---

### Problem 3: Redan Genererade Noder Räknas

**Scenario:**
- BPMN-fil har 10 noder
- 5 noder har redan dokumentation (inte `forceRegenerate`)
- `total:init` räknar: **10 noder**
- `nodesToGenerate` innehåller: **5 noder** (bara de som saknar dokumentation)

**Resultat:**
- Progress visar: "5 av 10 noder" (50%)
- Men bara 5 noder behöver genereras, så progress borde vara "5 av 5 noder" (100%)

---

### Problem 4: `nodeFilter` Ignoreras i `total:init`

**Scenario:**
- BPMN-fil har 10 noder
- `nodeFilter` filtrerar bort 5 noder
- `total:init` räknar: **10 noder** (ignorerar nodeFilter)
- `nodesToGenerate` innehåller: **5 noder** (filtrerade)

**Resultat:**
- Progress visar: "5 av 10 noder" (50%)
- Men bara 5 noder genereras, så progress borde vara "5 av 5 noder" (100%)

---

## 💡 Lösningsförslag

### Lösning 1: Använd `nodesToGenerate.length` Istället för `totalNodesFromFiles`

**Ändring i `bpmnGenerators.ts`:**
```typescript
// FÖRE: Räknar alla noder från BPMN-filer
const totalNodesToGenerate = totalNodesFromFiles + processNodesToGenerate;

// EFTER: Använd faktiskt antal noder som genereras
const totalNodesToGenerate = nodesToGenerate.length + processNodesToGenerate;
```

**Fördelar:**
- ✅ Matchar faktisk generering
- ✅ Exkluderar noder som hoppas över
- ✅ Exkluderar redan genererade noder (om inte forceRegenerate)
- ✅ Respekterar nodeFilter

**Nackdelar:**
- ⚠️ `nodesToGenerate` beräknas EFTER `total:init`, så vi måste flytta räkningen

---

### Lösning 2: Flytta `total:init` Efter `nodesToGenerate` Beräkning

**Ändring i `bpmnGenerators.ts`:**
```typescript
// FÖRE: total:init skickas innan nodesToGenerate beräknas
const totalNodesToGenerate = totalNodesFromFiles + processNodesToGenerate;
await reportProgress('total:init', ...);

// ... senare: nodesToGenerate beräknas
const nodesToGenerate = testableNodes.filter(...);

// EFTER: Beräkna nodesToGenerate först, sedan skicka total:init
const nodesToGenerate = testableNodes.filter(...);

// Räkna process nodes baserat på nodesToGenerate (inte alla filer)
let processNodesToGenerate = 0;
for (const file of analyzedFiles) {
  const nodesInFile = nodesToGenerate.filter(node => node.bpmnFile === file);
  if (isSubprocessFile && processNodeForFile && nodesInFile.length === 0) {
    processNodesToGenerate++;
  }
}

const totalNodesToGenerate = nodesToGenerate.length + processNodesToGenerate;
await reportProgress('total:init', 'Initierar generering', JSON.stringify({
  files: analyzedFiles.length,
  nodes: totalNodesToGenerate, // ✅ Använd faktiskt antal noder
}));
```

**Fördelar:**
- ✅ Matchar faktisk generering exakt
- ✅ Exkluderar alla noder som hoppas över
- ✅ Respekterar nodeFilter och forceRegenerate

**Nackdelar:**
- ⚠️ Kräver omstrukturering av koden
- ⚠️ `total:init` skickas senare (men det är OK, det är bara för progress)

---

### Lösning 3: Separera "Total Noder" från "Noder att Generera"

**Ändring i `bpmnGenerators.ts`:**
```typescript
// Skicka både totala antalet noder OCH antalet noder att generera
await reportProgress('total:init', 'Initierar generering', JSON.stringify({
  files: analyzedFiles.length,
  totalNodes: totalNodesFromFiles + processNodesToGenerate, // Alla noder (för coverage)
  nodesToGenerate: nodesToGenerate.length + processNodesToGenerate, // Noder att generera (för progress)
}));
```

**Ändring i `useFileGeneration.ts`:**
```typescript
case 'total:init':
  const parsed = JSON.parse(detail) as { 
    files?: number; 
    totalNodes?: number; 
    nodesToGenerate?: number; 
  };
  const nodesToGenerate = Number(parsed.nodesToGenerate) || Number(parsed.nodes) || 0;
  setGraphTotals({ 
    files: Number(parsed.files) || 0, 
    nodes: Number(parsed.totalNodes) || nodesToGenerate // Fallback till nodesToGenerate
  });
  setDocgenProgress({ completed: 0, total: nodesToGenerate }); // ✅ Använd nodesToGenerate
  break;
```

**Fördelar:**
- ✅ Bevarar information om totala antalet noder (för coverage)
- ✅ Använder korrekt antal noder för progress
- ✅ Mindre omstrukturering

**Nackdelar:**
- ⚠️ Kräver ändringar i både `bpmnGenerators.ts` och `useFileGeneration.ts`

---

## 📋 Rekommenderad Lösning

**Rekommendation: Lösning 2** (Flytta `total:init` efter `nodesToGenerate` beräkning)

**Anledning:**
- ✅ Enklast att implementera
- ✅ Matchar faktisk generering exakt
- ✅ Inga breaking changes i API
- ✅ Progress visar korrekt antal noder

**Implementation:**
1. Flytta `nodesToGenerate` beräkning FÖRE `total:init`
2. Använd `nodesToGenerate.length` istället för `totalNodesFromFiles`
3. Uppdatera `processNodesToGenerate` räkning att baseras på `nodesToGenerate`

---

## 🔧 Ytterligare Förbättringar

### 1. Uppdatera UI för att Visa Både Total och Genererade

**Ändring i `TransitionOverlay.tsx`:**
```typescript
// Visa både totala antalet noder och antalet noder att generera
{docgenProgress.completed} av {docgenProgress.total} noder
{graphTotals.nodes > docgenProgress.total && (
  <span className="text-xs text-muted-foreground">
    ({graphTotals.nodes - docgenProgress.total} hoppas över)
  </span>
)}
```

### 2. Logga Noder Som Hoppas Över

**Ändring i `bpmnGenerators.ts`:**
```typescript
const skippedNodes = testableNodes.filter(node => !nodesToGenerate.includes(node));
if (skippedNodes.length > 0) {
  console.log(`[bpmnGenerators] ⚠️ Hoppar över ${skippedNodes.length} noder:`, 
    skippedNodes.map(n => `${n.bpmnFile}::${n.bpmnElementId}`)
  );
}
```

---

## ✅ Testfall

### Test 1: Call Activities med Saknade Subprocess-filer
- **Input:** BPMN-fil med 5 CallActivities, 3 saknar subprocess-filer
- **Förväntat:** Progress visar "2 av 2 noder" (inte "2 av 5 noder")

### Test 2: Redan Genererade Noder
- **Input:** BPMN-fil med 10 noder, 5 har redan dokumentation
- **Förväntat:** Progress visar "5 av 5 noder" (inte "5 av 10 noder")

### Test 3: nodeFilter
- **Input:** BPMN-fil med 10 noder, nodeFilter filtrerar bort 5
- **Förväntat:** Progress visar "5 av 5 noder" (inte "5 av 10 noder")

### Test 4: Process Nodes
- **Input:** Subprocess-fil med process node men inga tasks/callActivities
- **Förväntat:** Progress visar "1 av 1 noder" (process node räknas korrekt)

---

## 📝 Sammanfattning

**Nuvarande Problem:**
- `total:init` räknar ALLA noder från BPMN-filer
- Faktisk generering hoppar över noder (saknade subprocesser, redan genererade, nodeFilter)
- Progress visar felaktigt antal noder (t.ex. "5 av 10" när bara 5 genereras)

**Rekommenderad Fix:**
- Flytta `total:init` efter `nodesToGenerate` beräkning
- Använd `nodesToGenerate.length` istället för `totalNodesFromFiles`
- Progress visar korrekt antal noder som faktiskt genereras

**Status:** 🔴 **KRITISKT** - Progress visar felaktig information för användaren

