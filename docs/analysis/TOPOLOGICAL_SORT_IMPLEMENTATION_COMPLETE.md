# Implementation: Topologisk Sortering - Komplett

## Status: ✅ Implementerad

---

## Vad Har Implementerats

### 1. `topologicalSortFiles` Funktion ✅

**Plats:** `src/lib/bpmnGenerators.ts` (rad 1374-1425)

**Funktionalitet:**
- Topologisk sortering baserat på dependency-grafen
- Cycle-detection och alfabetisk fallback
- Determinism (sekundär alfabetisk sortering för filer i cycles)
- Hanterar missing dependencies (ignoreras)

**Kod:**
```typescript
function topologicalSortFiles(
  files: string[],
  dependencies: Map<string, Set<string>>
): string[] {
  // Cycle-detection med alfabetisk fallback
  // Topologisk sortering: leaf nodes först
}
```

---

### 2. Dependency-Graf Byggning ✅

**Plats:** `src/lib/bpmnGenerators.ts` (rad 1887-1902)

**Funktionalitet:**
- Bygger dependency-graf från `graph.allNodes`
- Identifierar callActivities med `subprocessFile`
- Exkluderar `missingDefinition` noder
- Bara inkluderar dependencies om båda filerna är i `analyzedFiles`

**Kod:**
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

### 3. Ersättning av Alfabetisk Sortering ✅

**Plats:** `src/lib/bpmnGenerators.ts` (rad 1906)

**Före:**
```typescript
// Alfabetisk sortering
subprocessFilesList.sort((a, b) => a.localeCompare(b));
rootFilesList.sort((a, b) => a.localeCompare(b));
const sortedAnalyzedFiles = [...subprocessFilesList, ...rootFilesList];
```

**Efter:**
```typescript
// Topologisk sortering
const sortedAnalyzedFiles = topologicalSortFiles(analyzedFiles, fileDependencies);
```

---

## Förväntade Resultat

### Exempel: "internal-data-gathering"

**Före (Alfabetisk Sortering):**
1. `mortgage-se-application.bpmn` (alfabetiskt före)
2. `mortgage-se-internal-data-gathering.bpmn` (alfabetiskt efter)
3. Feature Goal genereras FÖRE epics ❌

**Efter (Topologisk Sortering):**
1. `mortgage-se-internal-data-gathering.bpmn` (inga dependencies)
2. `mortgage-se-application.bpmn` (beror på `internal-data-gathering`)
3. Feature Goal genereras EFTER epics ✅

---

## Hantering av Edge Cases

### 1. Cycles ✅
- **Hantering:** Identifiera cycles, sortera alfabetiskt som fallback
- **Kod:** `cycleFiles` Set, alfabetisk sortering för filer i cycles

### 2. Missing Dependencies ✅
- **Hantering:** Exkludera från dependency-grafen (`!node.missingDefinition`)
- **Kod:** Check `!node.missingDefinition` innan lägga till dependency

### 3. Filer utanför `analyzedFiles` ✅
- **Hantering:** Bara inkludera dependencies om båda filerna är i `analyzedFiles`
- **Kod:** `if (analyzedFiles.includes(parentFile) && analyzedFiles.includes(subprocessFile))`

### 4. Determinism ✅
- **Hantering:** Sekundär alfabetisk sortering för filer i cycles
- **Kod:** `cycleFilesList.sort((a, b) => a.localeCompare(b))`

---

## Nästa Steg

1. ✅ Implementera `topologicalSortFiles` funktion
2. ✅ Bygg dependency-graf från `graph.allNodes`
3. ✅ Ersätt alfabetisk sortering med topologisk sortering
4. ⏳ **Testa implementationen** med olika scenarion:
   - Normal hierarki
   - Flera callActivities till samma subprocess
   - Cycles
   - Missing dependencies
   - Tomma filer
5. ⏳ **Validera** att epics finns tillgängliga när Feature Goals genereras

---

## Implementation Detaljer

### Cycle-Detection

```typescript
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
  // ... rest of visit logic
}
```

### Topologisk Sortering

```typescript
visiting.add(file);
const deps = dependencies.get(file) || new Set();
for (const dep of deps) {
  if (files.includes(dep)) {
    visit(dep, [...path, file]); // Rekursivt besök dependencies först
  }
}
visiting.delete(file);
visited.add(file);
sorted.push(file); // Lägg till efter att dependencies är besökta
```

---

## Sammanfattning

**Status:** ✅ **Implementerad och klar för testning**

**Vad som ändrats:**
- ✅ Ny `topologicalSortFiles` funktion
- ✅ Dependency-graf byggs från `graph.allNodes`
- ✅ Alfabetisk sortering ersatt med topologisk sortering

**Vad som behövs:**
- ⏳ Testning med olika scenarion
- ⏳ Validering att epics finns tillgängliga när Feature Goals genereras

