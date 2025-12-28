# Jämförelse: Före vs Efter Commit 1f9574c8

## Översikt

Detta dokument jämför hur hierarki och ordning skapades **innan** commit `1f9574c8` (2025-12-26 10:24:58) med hur det fungerar **nu**.

---

## 1. Matchning av Call Activities till Subprocess-filer

### Före Commit 1f9574c8

**Primär metod:** `calledElement` från BPMN-filer

**Process:**
1. Läs `calledElement`-attribut från call activity i BPMN-filen
2. Matcha direkt mot `process_id` eller `process_name` i subprocess-filen
3. Konfidens: **1.0** (högsta konfidens) om `calledElement === process_id`
4. Konfidens: **0.96** om `calledElement === process_name`

**Fallback:** Automatisk matchning med heuristik
- Filnamnsheuristik (score: 0.8)
- Fuzzy-matchning (score: 0.0-0.7)
- Call Activity ID → Process ID (score: 0.9)

**Kod-referens:**
```typescript
// src/lib/bpmn/SubprocessMatcher.ts rad 280-291 (före)
equals(callActivity.calledElement, candidate.id) && MATCH_SCORES.calledElementProcessId
equals(callActivity.calledElement, candidate.name) && MATCH_SCORES.calledElementProcessName
```

---

### Nu (Efter Commit 1f9574c8)

**Primär metod:** `bpmn-map.json` (om tillgänglig)

**Process:**
1. **Först:** Försök matcha via `bpmn-map.json` (rad 44-116 i `SubprocessMatcher.ts`)
   - Sök i `bpmn-map.json` efter call activity baserat på:
     - Exakt match på `bpmn_id`
     - Normaliserad match på `bpmn_id`
     - Match på `name` (normaliserat, case-insensitive)
     - Match på `called_element` (normaliserat, case-insensitive)
   - Konfidens: **1.0** (högsta konfidens) när matchning kommer från `bpmn-map.json`
   - Match source: `'bpmn-map'`

2. **Fallback:** Om `bpmn-map.json` inte matchar:
   - Använd `calledElement` från BPMN-filen (samma som före)
   - Använd automatisk matchning med heuristik (samma som före)

**Kod-referens:**
```typescript
// src/lib/bpmn/SubprocessMatcher.ts rad 44-116 (nu)
// VIKTIGT: Försök först matcha via bpmn-map.json om det finns
if (config.bpmnMap && config.currentBpmnFile) {
  const mapMatch = matchCallActivityUsingMap(...);
  if (mapMatch.matchedFileName) {
    return { matchStatus: 'matched', matchSource: 'bpmn-map', confidence: 1.0 };
  }
}
// Fallback till automatisk matchning om bpmn-map.json inte matchade
const evaluatedCandidates = candidates.map(candidate => evaluateCandidate(...));
```

---

### Skillnad

| Aspekt | Före | Nu |
|--------|------|-----|
| **Primär källa** | `calledElement` från BPMN | `bpmn-map.json` (om tillgänglig) |
| **Fallback** | Heuristik | `calledElement` + heuristik |
| **Explicit kontroll** | ❌ Ingen | ✅ `bpmn-map.json` ger explicit kontroll |
| **Underhåll** | ✅ Automatisk | ⚠️ Kräver manuell uppdatering av `bpmn-map.json` |
| **Flexibilitet** | ⚠️ Begränsad till BPMN-struktur | ✅ Kan hantera komplexa mappningar |

---

## 2. Ordning och Sortering av Filer

### Före Commit 1f9574c8

**Metod:** Indegree-baserad sortering

**Process:**
1. Bygg dependency graph:
   ```typescript
   // src/lib/bpmn/buildProcessHierarchy.ts rad 79-81
   const indegree = new Map<string, number>();
   const adjacency = new Map<string, Set<string>>();
   ```
2. Beräkna `indegree` för varje process:
   - `indegree` = antal processer som anropar denna process
   - Root-processer har `indegree = 0`
   - Subprocesser har `indegree > 0`
3. Sortera processer:
   - Processer med lägre `indegree` kommer före processer med högre `indegree`
   - Om flera processer har samma `indegree`, sorteras de alfabetiskt

**Exempel:**
```
mortgage-se-internal-data-gathering.bpmn (indegree: 1)
mortgage-se-application.bpmn (indegree: 1)
mortgage.bpmn (indegree: 0) ← Root
```

**Ordning:** Subprocesser först (lägre indegree), root sist (indegree = 0)

---

### Nu (Efter Commit 1f9574c8)

**Metod:** Topologisk sortering (explicit dependency graph)

**Process:**
1. Bygg dependency graph från `graph.allNodes`:
   ```typescript
   // src/lib/bpmnGenerators.ts rad 1887-1915
   const fileDependencies = new Map<string, Set<string>>(); // file → [files it depends on]
   for (const node of graph.allNodes.values()) {
     if (node.type === 'callActivity' && node.subprocessFile && !node.missingDefinition) {
       const parentFile = node.bpmnFile;
       const subprocessFile = node.subprocessFile;
       fileDependencies.get(parentFile)!.add(subprocessFile);
     }
   }
   ```

2. Topologisk sortering:
   ```typescript
   // src/lib/bpmnGenerators.ts rad 1374-1430
   function topologicalSortFiles(files: string[], dependencies: Map<string, Set<string>>) {
     // Visit dependencies first (leaf nodes)
     // Then visit dependents (root nodes)
     // Handle cycles: sort alphabetically as fallback
   }
   ```

3. Hantera cycles:
   - Om cycles detekteras, sorteras filer i cycles alfabetiskt
   - Filerna läggs till sist i sorterad ordning

**Exempel:**
```
Dependency graph:
  mortgage.bpmn → mortgage-se-application.bpmn
  mortgage-se-application.bpmn → mortgage-se-internal-data-gathering.bpmn

Topologisk ordning:
  1. mortgage-se-internal-data-gathering.bpmn (leaf, inga dependencies)
  2. mortgage-se-application.bpmn (beroende av internal-data-gathering)
  3. mortgage.bpmn (root, beroende av application)
```

---

### Skillnad

| Aspekt | Före | Nu |
|--------|------|-----|
| **Metod** | Indegree-baserad sortering | Topologisk sortering |
| **Källa** | Process definitions (indegree) | Dependency graph från `graph.allNodes` |
| **Cycle-hantering** | ⚠️ Oklart (möjligen odefinierat) | ✅ Explicit: alfabetisk sortering som fallback |
| **Explicititet** | ⚠️ Indirekt (via indegree) | ✅ Explicit dependency graph |
| **Dokumentation** | ⚠️ Mindre explicit | ✅ Dokumenterad i `hierarchy-architecture.md` |

---

## 3. Hierarki-byggande

### Före Commit 1f9574c8

**Metod:** Bygg från process definitions med indegree

**Process:**
1. Samla alla process definitions från BPMN-filer
2. Matcha call activities till subprocesser via `calledElement`
3. Bygg dependency graph baserat på matchningar
4. Identifiera root-processer (indegree = 0)
5. Bygg hierarki rekursivt från root-processer

**Kod-referens:**
```typescript
// src/lib/bpmn/buildProcessHierarchy.ts rad 88-174
for (const proc of processes.values()) {
  effectiveCallActivities.forEach((callActivity) => {
    const link = matchCallActivityToProcesses(
      { id, name, calledElement, kind },
      matcherCandidates,
      { currentBpmnFile: proc.fileName }
    );
    // Bygg adjacency map och beräkna indegree
  });
}
```

---

### Nu (Efter Commit 1f9574c8)

**Metod:** Bygg från process graph med topological sort

**Process:**
1. Bygg process graph från BPMN-filer (`buildBpmnProcessGraph`)
2. Använd `bpmn-map.json` för matchning (om tillgänglig)
3. Bygg dependency graph från `graph.allNodes`
4. Sortera filer topologiskt
5. Bygg hierarki rekursivt från sorterade filer

**Kod-referens:**
```typescript
// src/lib/bpmnGenerators.ts rad 1887-1919
// Bygg dependency-graf från graph.allNodes
const fileDependencies = new Map<string, Set<string>>();
for (const node of graph.allNodes.values()) {
  if (node.type === 'callActivity' && node.subprocessFile && !node.missingDefinition) {
    fileDependencies.get(parentFile)!.add(subprocessFile);
  }
}
// Topologisk sortering
const sortedAnalyzedFiles = topologicalSortFiles(analyzedFiles, fileDependencies);
```

---

### Skillnad

| Aspekt | Före | Nu |
|--------|------|-----|
| **Källa** | Process definitions | Process graph (`graph.allNodes`) |
| **Matchning** | `calledElement` direkt | `bpmn-map.json` → `calledElement` → heuristik |
| **Sortering** | Indegree-baserad | Topologisk (explicit dependency graph) |
| **Explicititet** | ⚠️ Indirekt (indegree) | ✅ Explicit dependency graph |

---

## 4. Sammanfattning av Skillnader

### Matchning

**Före:**
- ✅ Enkel: Allt baserades på BPMN-filernas `calledElement`
- ✅ Automatisk: Ingen manuell konfiguration
- ❌ Begränsad: Kan inte hantera komplexa mappningar
- ❌ Felbenägen: Heuristik kan ge felaktiga matchningar

**Nu:**
- ✅ Explicit: `bpmn-map.json` ger manuell kontroll
- ✅ Flexibel: Kan hantera komplexa strukturer
- ✅ Validerbar: Kan validera mappningar mot faktiska filer
- ⚠️ Underhåll: Kräver manuell uppdatering av `bpmn-map.json`
- ✅ Fallback: Fortfarande använder `calledElement` + heuristik om `bpmn-map.json` saknas

---

### Ordning

**Före:**
- ✅ Fungerade: Indegree-baserad sortering säkerställde subprocesser före parent
- ⚠️ Oklart: Cycle-hantering var inte explicit dokumenterad
- ⚠️ Indirekt: Ordning baserades på indegree, inte explicit dependency graph

**Nu:**
- ✅ Explicit: Topologisk sortering med explicit dependency graph
- ✅ Cycle-hantering: Explicit hantering (alfabetisk sortering som fallback)
- ✅ Dokumenterad: Beskrivet i `hierarchy-architecture.md`
- ✅ Robust: Hanterar edge cases (cycles, missing files) explicit

---

### Hierarki

**Före:**
- ✅ Fungerade: Byggdes från process definitions
- ⚠️ Indirekt: Använde indegree för att identifiera root-processer
- ⚠️ Begränsad: Bara baserat på BPMN-filernas innehåll

**Nu:**
- ✅ Explicit: Byggs från process graph med explicit dependency graph
- ✅ Flexibel: Kan använda `bpmn-map.json` för explicit mappningar
- ✅ Robust: Hanterar missing files, cycles, etc. explicit

---

## 5. Vad Som Är Kvar (Samma)

### CalledElement används fortfarande

**Både före och nu:**
- `calledElement` används för matchning (nu som fallback efter `bpmn-map.json`)
- `calledElement` matchar mot `process_id` eller `process_name` med hög konfidens
- Heuristik används fortfarande som sista utväg

**Kod-referens (samma i båda):**
```typescript
// src/lib/bpmn/SubprocessMatcher.ts rad 280-291 (samma logik)
equals(callActivity.calledElement, candidate.id) && MATCH_SCORES.calledElementProcessId
equals(callActivity.calledElement, candidate.name) && MATCH_SCORES.calledElementProcessName
```

---

### Hierarki-struktur är densamma

**Både före och nu:**
- Hierarki-nivåer: Initiative → Feature Goal → Epic
- Rekursiv byggning från root-processer
- Samma trädstruktur

---

## 6. Viktiga Förändringar

### 1. bpmn-map.json som Primär Källa

**Före:** Allt baserades på BPMN-filernas innehåll (`calledElement`)

**Nu:** `bpmn-map.json` är primär källa (om tillgänglig), `calledElement` är fallback

**Konsekvens:**
- ✅ Mer kontroll över mappningar
- ⚠️ Kräver manuell uppdatering av `bpmn-map.json`
- ✅ Kan hantera komplexa strukturer som inte kan matchas automatiskt

---

### 2. Topologisk Sortering istället för Indegree

**Före:** Indegree-baserad sortering (indirekt)

**Nu:** Topologisk sortering (explicit dependency graph)

**Konsekvens:**
- ✅ Mer explicit och förutsägbart
- ✅ Bättre cycle-hantering
- ✅ Dokumenterad i `hierarchy-architecture.md`

---

### 3. Explicit Dependency Graph

**Före:** Dependency graph byggdes indirekt via indegree

**Nu:** Dependency graph byggs explicit från `graph.allNodes`

**Konsekvens:**
- ✅ Tydligare och lättare att förstå
- ✅ Bättre för debugging
- ✅ Explicit cycle-detektering

---

## 7. Slutsats

### Vad Som Ändrats

1. **Matchning:** `bpmn-map.json` är nu primär källa (om tillgänglig), `calledElement` är fallback
2. **Ordning:** Topologisk sortering (explicit) istället för indegree-baserad (indirekt)
3. **Hierarki:** Byggs från explicit dependency graph istället för indirekt indegree

### Vad Som Är Kvar (Samma)

1. **CalledElement:** Används fortfarande (nu som fallback)
2. **Heuristik:** Används fortfarande som sista utväg
3. **Hierarki-struktur:** Samma trädstruktur (Initiative → Feature Goal → Epic)

### Fördelar med Nuvarande Approach

- ✅ **Explicit kontroll:** `bpmn-map.json` ger manuell kontroll över mappningar
- ✅ **Robustare:** Bättre hantering av edge cases (cycles, missing files)
- ✅ **Dokumenterat:** Topologisk sortering är dokumenterad i `hierarchy-architecture.md`
- ✅ **Flexibelt:** Kan hantera komplexa strukturer som inte kan matchas automatiskt

### Nackdelar med Nuvarande Approach

- ⚠️ **Underhåll:** Kräver manuell uppdatering av `bpmn-map.json`
- ⚠️ **Komplexitet:** Mer komplex än den enkla `calledElement`-approach
- ⚠️ **Beroende:** Systemet är nu beroende av `bpmn-map.json` för optimal funktion

---

## 8. Rekommendationer

### För Framtida Utveckling

1. **Behåll fallback:** Fortsätt använda `calledElement` + heuristik som fallback
2. **Automatisk generering:** Överväg automatisk generering av `bpmn-map.json` från BPMN-filer
3. **Validering:** Validera `bpmn-map.json` mot faktiska BPMN-filer regelbundet
4. **Dokumentation:** Fortsätt dokumentera topologisk sortering och dependency graphs

### För Användare

1. **Uppdatera bpmn-map.json:** Vid nya filer eller strukturella ändringar
2. **Validera mappningar:** Använd valideringsverktyg för att säkerställa korrekthet
3. **Förstå fallback:** Systemet fungerar fortfarande med `calledElement` om `bpmn-map.json` saknas

