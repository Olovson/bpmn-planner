# Implementeringsplan: Topologisk Sortering för Dokumentationsgenerering

## Syfte

Implementera topologisk sortering baserat på dependency-grafer för att säkerställa att subprocess-filer genereras FÖRE parent-filer, så att child documentation (epics) finns tillgänglig när parent Feature Goals genereras.

---

## Implementeringssteg

### Steg 1: Skapa `topologicalSortFiles` Funktion ✅

**Plats:** `src/lib/bpmnGenerators.ts` (före `generateAllFromBpmnWithGraph`)

**Funktionalitet:**
- Tar `files: string[]` och `dependencies: Map<string, Set<string>>`
- Returnerar topologiskt sorterade filer
- Hanterar cycles (alfabetisk fallback)
- Hanterar missing dependencies (ignoreras)
- Determinism (sekundär alfabetisk sortering)

**Status:** ✅ Implementerad

---

### Steg 2: Bygg Dependency-Graf från `graph.allNodes` ✅

**Plats:** `src/lib/bpmnGenerators.ts` (rad 1815-1831)

**Funktionalitet:**
- Iterera över `graph.allNodes.values()`
- För callActivities med `subprocessFile` och `!missingDefinition`:
  - `parentFile = node.bpmnFile`
  - `subprocessFile = node.subprocessFile`
  - Lägg till dependency: `parentFile → subprocessFile`
- Bara inkludera dependencies om båda filerna är i `analyzedFiles`

**Status:** ✅ Implementerad

---

### Steg 3: Ersätt Alfabetisk Sortering med Topologisk Sortering ✅

**Plats:** `src/lib/bpmnGenerators.ts` (rad 1835)

**Funktionalitet:**
- Anropa `topologicalSortFiles(analyzedFiles, fileDependencies)`
- Ersätt `[...subprocessFilesList, ...rootFilesList]` med resultatet

**Status:** ✅ Implementerad

---

### Steg 4: Testa Implementationen ⏳

**Testscenarion:**
1. **Normal hierarki:** `mortgage.bpmn` → `application.bpmn` → `internal-data-gathering.bpmn`
   - Förväntat: `internal-data-gathering` först, sedan `application`, sedan `mortgage`

2. **Flera callActivities till samma subprocess:**
   - `fileA.bpmn` och `fileB.bpmn` anropar båda `subprocess.bpmn`
   - Förväntat: `subprocess.bpmn` först, sedan `fileA` och `fileB` (alfabetiskt)

3. **Cycles:**
   - `fileA.bpmn` anropar `fileB.bpmn`, `fileB.bpmn` anropar `fileA.bpmn`
   - Förväntat: Båda sorteras alfabetiskt (fallback)

4. **Missing dependencies:**
   - `fileA.bpmn` anropar `missing.bpmn` (saknas)
   - Förväntat: `fileA.bpmn` kan genereras när som helst (ingen dependency)

5. **Tomma filer:**
   - Filer utan callActivities eller tasks
   - Förväntat: Kan genereras när som helst (inga dependencies)

**Status:** ⏳ Väntar på testning

---

## Implementation Detaljer

### `topologicalSortFiles` Funktion

```typescript
function topologicalSortFiles(
  files: string[],
  dependencies: Map<string, Set<string>>
): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const cycleFiles = new Set<string>();
  
  function visit(file: string, path: string[] = []): void {
    if (visiting.has(file)) {
      // Cycle detected
      const cycleStart = path.indexOf(file);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart);
        cycle.push(file);
        cycle.forEach(f => cycleFiles.add(f));
      }
      return;
    }
    if (visited.has(file)) {
      return;
    }
    
    visiting.add(file);
    const deps = dependencies.get(file) || new Set();
    for (const dep of deps) {
      if (files.includes(dep)) {
        visit(dep, [...path, file]);
      }
    }
    visiting.delete(file);
    visited.add(file);
    sorted.push(file);
  }
  
  for (const file of files) {
    if (!visited.has(file)) {
      visit(file);
    }
  }
  
  // För filer i cycles, sortera alfabetiskt
  const nonCycleFiles = sorted.filter(f => !cycleFiles.has(f));
  const cycleFilesList = files.filter(f => cycleFiles.has(f)).sort((a, b) => a.localeCompare(b));
  
  return [...nonCycleFiles, ...cycleFilesList];
}
```

### Dependency-Graf Byggning

```typescript
const fileDependencies = new Map<string, Set<string>>();
for (const node of graph.allNodes.values()) {
  if (node.type === 'callActivity' && node.subprocessFile && !node.missingDefinition) {
    const parentFile = node.bpmnFile;
    const subprocessFile = node.subprocessFile;
    
    if (analyzedFiles.includes(parentFile) && analyzedFiles.includes(subprocessFile)) {
      if (!fileDependencies.has(parentFile)) {
        fileDependencies.set(parentFile, new Set());
      }
      fileDependencies.get(parentFile)!.add(subprocessFile);
    }
  }
}
```

---

## Risker och Hantering

### 1. Cycles ✅
- **Hantering:** Identifiera cycles, sortera alfabetiskt som fallback
- **Status:** Implementerad

### 2. Missing Dependencies ✅
- **Hantering:** Exkludera från dependency-grafen (`!node.missingDefinition`)
- **Status:** Implementerad

### 3. Filer utanför `analyzedFiles` ✅
- **Hantering:** Bara inkludera dependencies om båda filerna är i `analyzedFiles`
- **Status:** Implementerad

### 4. Determinism ✅
- **Hantering:** Sekundär alfabetisk sortering för filer i cycles
- **Status:** Implementerad

---

## Förväntade Resultat

### Före (Alfabetisk Sortering):
1. `mortgage-se-application.bpmn` (alfabetiskt före)
2. `mortgage-se-internal-data-gathering.bpmn` (alfabetiskt efter)
3. Feature Goal genereras FÖRE epics ❌

### Efter (Topologisk Sortering):
1. `mortgage-se-internal-data-gathering.bpmn` (inga dependencies)
2. `mortgage-se-application.bpmn` (beror på `internal-data-gathering`)
3. Feature Goal genereras EFTER epics ✅

---

## Nästa Steg

1. ✅ Implementera `topologicalSortFiles` funktion
2. ✅ Bygg dependency-graf från `graph.allNodes`
3. ✅ Ersätt alfabetisk sortering med topologisk sortering
4. ⏳ Testa implementationen med olika scenarion
5. ⏳ Validera att epics finns tillgängliga när Feature Goals genereras

