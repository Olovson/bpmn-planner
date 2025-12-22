# Analys: Vad Borde Popupen Visa? (Noder vs Filer)

**Datum:** 2025-12-22  
**Problem:** Popupen visar 142 noder men bara 122 HTML-filer genererades. Vad är det relevanta att visa?

---

## 1. Vad Räknas i Progress?

### `totalNodesToGenerate` (rad 1695)
- `nodesToGenerate.length` - alla noder som ska genereras (tasks, callActivities)
- `processNodesToGenerate` - process nodes för subprocess-filer utan tasks/callActivities
- **Totalt:** `totalNodesToGenerate = nodesToGenerate.length + processNodesToGenerate`

### `docgenCompleted` (räknas i popupen)
- Räknas varje gång `docgen:file` anropas (rad 1312 i `BpmnFileManager.tsx`)
- Men nu filtrerar vi bort filer (rad 1314-1316)

---

## 2. Vad Genereras Faktiskt?

### Filer som genereras:

1. **Epics** (för tasks):
   - Path: `nodes/{bpmnFile}/{elementId}.html`
   - En fil per task (userTask, serviceTask, businessRuleTask)
   - Genereras från `nodesToGenerate` (tasks)

2. **Feature Goals** (för callActivities):
   - Path: `feature-goals/{parent}-{elementId}.html`
   - En fil per callActivity
   - Genereras från `nodesToGenerate` (callActivities)

3. **Feature Goals** (för process nodes):
   - Path: `feature-goals/{fileBaseName}.html`
   - En fil per subprocess-fil som har en process node men inga tasks/callActivities
   - Genereras från `processNodesToGenerate`

4. **Combined docs** (för root-filer):
   - Path: `{bpmnFile}.html`
   - En fil per BPMN-fil (root-filer)
   - Genereras UTAN att vara en "nod" i progress-räkningen

### Filer som INTE genereras:

- Om dokumentation redan finns i Storage och `forceRegenerate = false` (rad 1923-1945)
- Om noden hoppas över av `nodeFilter`
- Om noden redan processats globalt (för tasks/epics, men inte callActivities)

---

## 3. Skillnaden Mellan Noder och Filer

### Noder (i progress):
- **Tasks** (userTask, serviceTask, businessRuleTask) → genererar Epic
- **CallActivities** → genererar Feature Goal
- **Process nodes** (för subprocess-filer) → genererar Feature Goal

### Filer (i resultat):
- **Epics:** `nodes/{bpmnFile}/{elementId}.html`
- **Feature Goals:** `feature-goals/{parent}-{elementId}.html` eller `feature-goals/{fileBaseName}.html`
- **Combined docs:** `{bpmnFile}.html` (root-filer)

### Skillnaden:
- **En nod = 1 fil** (i de flesta fall)
- **Men:** Vissa noder genererar INTE filer (redan finns i Storage)
- **Men:** Vissa filer genereras UTAN att vara en "nod" (combined docs)

---

## 4. Vad Borde Popupen Visa?

### Alternativ 1: Antal Noder (nuvarande)
**Fördelar:**
- Visar exakt vad som bearbetas (varje nod som går genom LLM)
- Matchar `totalNodesToGenerate` (rad 1695)
- Visar progress för faktisk arbete (LLM-anrop)

**Nackdelar:**
- Kan skilja sig från antal faktiska filer (om vissa noder hoppas över)
- Användaren kan förvänta sig att antal filer = antal noder

### Alternativ 2: Antal Filer (förväntat)
**Fördelar:**
- Matchar vad användaren faktiskt får (122 HTML-filer)
- Mer intuitivt (användaren ser filer, inte noder)
- Matchar resultatet som visas i popupen ("122 HTML-filer")

**Nackdelar:**
- Svårare att räkna (måste förutse vilka filer som genereras)
- Kan ändras om filer redan finns i Storage
- Inkluderar inte combined docs (som genereras utan att vara en "nod")

### Alternativ 3: Både Noder och Filer
**Fördelar:**
- Visar både vad som bearbetas (noder) och vad som genereras (filer)
- Mer informativt

**Nackdelar:**
- Mer komplext att implementera
- Kan vara förvirrande för användaren

---

## 5. Rekommendation

### Rekommendation: **Antal Filer (Förväntat)**

**Anledning:**
1. **Användaren ser filer, inte noder** - när genereringen är klar, ser användaren "122 HTML-filer", inte "142 noder"
2. **Matchar resultatet** - popupen visar redan "122 HTML-filer" i resultatet
3. **Mer intuitivt** - användaren förstår vad "122/122 filer" betyder

**Implementation:**
- Räkna faktiska filer som genereras (från `result.docs.size()`)
- Eller räkna förväntat antal filer baserat på `nodesToGenerate` + `processNodesToGenerate` + combined docs
- Men exkludera filer som redan finns i Storage (om `forceRegenerate = false`)

**Men vänta:** Om vi räknar filer, måste vi också hantera att vissa filer INTE genereras (redan finns i Storage). Detta gör det svårare.

### Alternativ: **Antal Noder (Nuvarande) + Förklaring**

**Anledning:**
1. **Enklare att implementera** - vi vet redan antal noder
2. **Matchar faktiskt arbete** - visar vad som faktiskt bearbetas
3. **Men:** Lägg till förklaring i popupen: "142 noder bearbetas, ~122 filer genereras"

**Implementation:**
- Behåll nuvarande räkning (noder)
- Men lägg till text som förklarar skillnaden: "Bearbetar noder (varje nod kan generera 1 fil)"
- Eller visa både: "142 noder bearbetas, ~122 filer genereras"

---

## 6. Vad Användaren Frågar

Användaren frågar:
- "vad är det den borde visa? det är väl antal filer som är det relevanta för popupen eller är det antal noder?"
- "jag tror den räknade 142 noder men verkar ha genererat 122 html filer"

**Svar:**
- **Antal filer är mer relevant** för användaren (de ser filer, inte noder)
- **Men:** Antal noder är enklare att räkna och matchar faktiskt arbete
- **Rekommendation:** Visa antal filer (förväntat), men med förklaring om skillnaden

---

## 7. Implementation

### Option A: Räkna Faktiska Filer (Svårare)
```typescript
// I bpmnGenerators.ts, efter generering:
const totalFilesToGenerate = result.docs.size(); // Faktiska filer som genereras
await reportProgress('total:init', 'Initierar generering', JSON.stringify({
  files: analyzedFiles.length,
  nodes: totalNodesToGenerate, // För bakåtkompatibilitet
  expectedFiles: totalFilesToGenerate, // Nya värdet
}));
```

**Problem:** Vi vet inte `result.docs.size()` innan generering är klar.

### Option B: Räkna Förväntat Antal Filer (Enklare)
```typescript
// I bpmnGenerators.ts, innan generering:
const expectedFiles = totalNodesToGenerate + combinedDocsCount; // +1 per root-fil
await reportProgress('total:init', 'Initierar generering', JSON.stringify({
  files: analyzedFiles.length,
  expectedFiles: expectedFiles, // Förväntat antal filer
}));
```

**Problem:** Detta inkluderar filer som redan finns i Storage (om `forceRegenerate = false`).

### Option C: Visa Både (Bäst)
```typescript
// I bpmnGenerators.ts:
await reportProgress('total:init', 'Initierar generering', JSON.stringify({
  files: analyzedFiles.length,
  nodes: totalNodesToGenerate, // Antal noder som bearbetas
  expectedFiles: totalNodesToGenerate, // Förväntat antal filer (≈ antal noder)
}));
```

**I popupen:**
```typescript
// Visa: "142 noder bearbetas (~122 filer genereras)"
// Eller: "142/142 noder (122 filer genererade)"
```

---

## 8. Slutsats

**Rekommendation:** Visa **antal filer (förväntat)** i popupen, men med förklaring om skillnaden.

**Implementation:**
1. Ändra `total:init` att skicka `expectedFiles` istället för `nodes`
2. Uppdatera popupen att visa "X filer" istället för "X noder"
3. Lägg till förklaring: "Varje nod genererar 1 fil (om den inte redan finns)"

**Alternativ:** Behåll "noder" men lägg till text: "142 noder bearbetas (~122 filer genereras)"
