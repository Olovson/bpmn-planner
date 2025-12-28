# Analys: Dokumentationsgenereringsordning

## Problembeskrivning

Användaren observerade att epics för "internal-data-gathering" inte var genererade innan Feature Goal-dokumentationen skapades. Detta kan leda till att Feature Goals genereras utan child documentation (epics) från subprocess-filen.

---

## Nuvarande Genereringsordning

### 1. Fil-sortering (rad 1821-1830)

**Logik:**
```typescript
// Identifiera subprocess-filer (filer som anropas av callActivities)
const subprocessFiles = new Set<string>();
for (const node of nodesToGenerate) {
  if (node.type === 'callActivity' && node.subprocessFile) {
    subprocessFiles.add(node.subprocessFile);
  }
}

// Separera i subprocess-filer och root-filer
const subprocessFilesList = analyzedFiles.filter(file => subprocessFiles.has(file));
const rootFilesList = analyzedFiles.filter(file => !subprocessFiles.has(file));

// Sortera varje kategori alfabetiskt för determinism
subprocessFilesList.sort((a, b) => a.localeCompare(b));
rootFilesList.sort((a, b) => a.localeCompare(b));

// Subprocess-filer först, sedan root-filer
const sortedAnalyzedFiles = [...subprocessFilesList, ...rootFilesList];
```

**Resultat:**
- Subprocess-filer genereras FÖRE root-filer ✅
- Men subprocess-filer sorteras alfabetiskt ⚠️

**Problem:**
- Om `mortgage-se-application.bpmn` (parent) och `mortgage-se-internal-data-gathering.bpmn` (subprocess) båda är subprocess-filer
- De sorteras alfabetiskt: `application` kommer FÖRE `internal-data-gathering`
- Därför genereras Feature Goal för callActivity "internal-data-gathering" i `application.bpmn` FÖRE epics i `internal-data-gathering.bpmn` är genererade ❌

---

### 2. Node-sortering inom fil (rad 1865-1886)

**Logik:**
```typescript
const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
  const depthA = nodeDepthMap.get(a.id) ?? 0;
  const depthB = nodeDepthMap.get(b.id) ?? 0;
  
  // Primär sortering: lägre depth först (subprocesser före parent nodes)
  if (depthA !== depthB) {
    return depthA - depthB; // LÄGRE DEPTH FÖRST
  }
  
  // Sekundär sortering: orderIndex (exekveringsordning)
  const orderA = a.orderIndex ?? a.visualOrderIndex ?? 0;
  const orderB = b.orderIndex ?? b.visualOrderIndex ?? 0;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  
  // Tertiär sortering: alfabetiskt
  return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
});
```

**Resultat:**
- Noder med lägre depth genereras FÖRE noder med högre depth ✅
- Detta säkerställer att child nodes genereras före parent nodes **inom samma fil** ✅
- Men detta hjälper INTE när child nodes finns i **en annan fil** ❌

---

### 3. Child Documentation Collection (rad 1970-2070)

**Logik:**
När en Feature Goal genereras för en callActivity:
1. Systemet samlar child documentation från `node.children` (direkta children)
2. Men epics i subprocess-filen (`internal-data-gathering.bpmn`) är INTE children till callActivity-noden
3. De är children till process-noden i subprocess-filen
4. Systemet behöver hämta documentation från subprocess-filen, inte från callActivity-nodens children

**Problem:**
- `convertedChildDocs` samlas från `node.children` (rad 1970-2000)
- Men epics i `internal-data-gathering.bpmn` är INTE children till callActivity-noden i `application.bpmn`
- De är children till process-noden i `internal-data-gathering.bpmn`
- Därför saknas epics när Feature Goal genereras för callActivity ❌

---

## Exempel: "internal-data-gathering"

### Scenario:
1. **Fil 1:** `mortgage-se-application.bpmn`
   - Innehåller callActivity "internal-data-gathering" som pekar på `mortgage-se-internal-data-gathering.bpmn`
   - Sorteras alfabetiskt: `application` kommer FÖRE `internal-data-gathering`

2. **Fil 2:** `mortgage-se-internal-data-gathering.bpmn`
   - Innehåller epics (UserTasks, ServiceTasks)
   - Sorteras alfabetiskt: `internal-data-gathering` kommer EFTER `application`

### Nuvarande Ordning:
1. ✅ `mortgage-se-application.bpmn` genereras FÖRST (alfabetisk ordning)
2. ❌ Feature Goal för callActivity "internal-data-gathering" genereras
3. ❌ **Epics i `internal-data-gathering.bpmn` finns INTE ännu** (filen genereras senare)
4. ✅ `mortgage-se-internal-data-gathering.bpmn` genereras EFTER
5. ✅ Epics genereras

### Problem:
- Feature Goal genereras utan child documentation (epics) från subprocess-filen
- Detta kan leda till Feature Goals med ofullständig information

---

## Rotorsak

**Huvudproblem:**
1. **Fil-sortering använder alfabetisk ordning** för subprocess-filer
2. **Parent-filer kan komma före subprocess-filer** om de sorteras alfabetiskt
3. **Child documentation samlas från `node.children`**, inte från subprocess-filen

**Exempel:**
- `mortgage-se-application.bpmn` (parent) → alfabetiskt före
- `mortgage-se-internal-data-gathering.bpmn` (subprocess) → alfabetiskt efter
- Feature Goal genereras FÖRE epics är genererade ❌

---

## Lösningsförslag

### Alternativ 1: Sortera filer efter hierarki (Rekommenderad)

**Idé:**
- Sortera filer baserat på hierarkisk ordning, inte alfabetiskt
- Subprocess-filer som anropas av andra subprocess-filer genereras FÖRE parent-filer

**Implementation:**
1. Bygg en dependency-graf för filer (vilka filer anropar vilka)
2. Sortera filer topologiskt (leaf nodes först, root sist)
3. Om två filer är på samma nivå, sortera alfabetiskt

**Fördel:**
- ✅ Säkerställer att subprocess-filer genereras FÖRE parent-filer
- ✅ Epics finns tillgängliga när Feature Goals genereras
- ✅ Mer robust än alfabetisk sortering

**Nackdel:**
- ⚠️ Kräver mer komplex sorteringslogik

---

### Alternativ 2: Samla child documentation från subprocess-filen

**Idé:**
- När Feature Goal genereras för callActivity, hämta documentation från subprocess-filen
- Inte bara från `node.children`, utan också från alla noder i subprocess-filen

**Implementation:**
1. När callActivity Feature Goal genereras, hitta subprocess-filen
2. Hämta alla genererade dokumentation från subprocess-filen
3. Inkludera dessa i `convertedChildDocs`

**Fördel:**
- ✅ Säkerställer att epics inkluderas även om de genereras senare
- ✅ Mindre ändringar i sorteringslogik

**Nackdel:**
- ⚠️ Kräver att subprocess-filen redan är genererad (samma problem)
- ⚠️ Komplexare child documentation collection

---

### Alternativ 3: Två-pass generering

**Idé:**
1. **Pass 1:** Generera alla epics först (alla tasks i alla filer)
2. **Pass 2:** Generera alla Feature Goals (med epics tillgängliga)

**Fördel:**
- ✅ Säkerställer att epics alltid finns när Feature Goals genereras
- ✅ Enkel logik

**Nackdel:**
- ⚠️ Kräver två pass genom alla filer
- ⚠️ Mer komplex implementation

---

## Rekommendation

**Alternativ 1: Sortera filer efter hierarki** är bäst eftersom:
1. Det löser problemet vid källan (sorteringsordning)
2. Det är mer robust än alfabetisk sortering
3. Det säkerställer att child documentation alltid finns tillgänglig

**Implementation:**
1. Bygg dependency-graf: `file → [files it calls]`
2. Sortera topologiskt: leaf nodes (filer som inte anropas) först
3. Om två filer är på samma nivå, sortera alfabetiskt

---

## Ytterligare Problem

### Problem 2: Child Documentation Collection

Även om fil-sorteringen är korrekt, kan det finnas ett problem med hur child documentation samlas:

**Nuvarande logik (rad 1970-2000):**
- Samlar documentation från `node.children` (direkta children)
- Men epics i subprocess-filen är INTE children till callActivity-noden
- De är children till process-noden i subprocess-filen

**Lösning:**
- När callActivity Feature Goal genereras, hämta documentation från subprocess-filen
- Inte bara från `node.children`, utan också från alla noder i subprocess-filen
- Detta kräver att subprocess-filen redan är genererad (vilket fil-sorteringen säkerställer)

---

## Detaljerad Analys av Child Documentation Collection

### Nuvarande Logik (rad 2093-2111)

**För callActivities:**
```typescript
if (node.type === 'callActivity') {
  collectChildDocsRecursively(node);
}
```

**Vad `collectChildDocsRecursively` gör:**
1. Itererar över `node.children` (direkta children till callActivity-noden)
2. För varje child, letar efter dokumentation i `generatedChildDocs` Map
3. Rekursivt samlar från nested children

**Problem:**
- `node.children` innehåller bara direkta children till callActivity-noden
- För callActivity "internal-data-gathering" i `application.bpmn`:
  - `node.children` är tom eller innehåller bara process-noden från `internal-data-gathering.bpmn`
  - Epics (UserTasks, ServiceTasks) i `internal-data-gathering.bpmn` är INTE children till callActivity-noden
  - De är children till process-noden i `internal-data-gathering.bpmn`
- Därför hittas inte epics när Feature Goal genereras ❌

### Vad Borde Hända

**För callActivities som pekar på subprocess-filer:**
1. Hitta subprocess-filen (`internal-data-gathering.bpmn`)
2. Hitta alla noder i subprocess-filen (från `graph.fileNodes.get(subprocessFile)`)
3. Samla dokumentation från alla noder i subprocess-filen (epics, tasks)
4. Inkludera dessa i `convertedChildDocs`

**Nuvarande beteende:**
- Samlar bara från `node.children` (direkta children)
- Epics i subprocess-filen saknas ❌

---

## Sammanfattning

**Nuvarande problem:**
1. ❌ **Fil-sortering:** Alfabetisk ordning → parent kan komma före subprocess
   - `application.bpmn` genereras FÖRE `internal-data-gathering.bpmn`
   - Feature Goal genereras FÖRE epics är genererade

2. ❌ **Child documentation collection:** Samlas från `node.children` → epics i subprocess-filen saknas
   - `collectChildDocsRecursively(node)` itererar bara över `node.children`
   - Epics i `internal-data-gathering.bpmn` är INTE children till callActivity-noden
   - De är children till process-noden i subprocess-filen

3. ❌ **Resultat:** Feature Goals genereras utan epics från subprocess-filer

**Rekommenderad lösning:**
1. ✅ **Sortera filer efter hierarki** (topologisk sortering)
   - Bygg dependency-graf: vilka filer anropar vilka
   - Sortera topologiskt: leaf nodes (filer som inte anropas) först
   - Säkerställ att subprocess-filer genereras FÖRE parent-filer

2. ✅ **Samla child documentation från subprocess-filen**
   - När callActivity Feature Goal genereras, hitta subprocess-filen
   - Hämta alla noder i subprocess-filen från `graph.fileNodes.get(subprocessFile)`
   - Samla dokumentation från alla noder i subprocess-filen (epics, tasks)
   - Inkludera dessa i `convertedChildDocs`

3. ✅ **Säkerställ att subprocess-filer genereras FÖRE parent-filer**
   - Topologisk sortering säkerställer detta automatiskt

