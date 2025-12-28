# Analys: Hierarki och Ordning innan Commit 1f9574c8

## Syfte

Analysera hur hierarki och ordning skapades utifrån BPMN-filer baserat på hur processer kallades på enligt BPMN-filerna innan commit `1f9574c8` (2025-12-26 10:24:58).

---

## Översikt: Hur Hierarki Byggdes

### 1. CalledElement-baserad Matchning (Primär Metod)

**Källa:** `src/lib/bpmn/SubprocessMatcher.ts`

Systemet använde `calledElement`-attributet från BPMN-filerna som **primär källa** för att matcha call activities till subprocess-filer.

**Hur det fungerade:**

1. **Parsning av BPMN-filer:**
   - Varje call activity i BPMN-filen har ett `calledElement`-attribut
   - `calledElement` pekar på `process_id` i subprocess-filen
   - Exempel: `<bpmn:callActivity id="application" calledElement="mortgage-se-application" />`

2. **Matchning via SubprocessMatcher:**
   ```typescript
   // src/lib/bpmn/SubprocessMatcher.ts rad 280-291
   // Högsta konfidens (1.0): calledElement matchar processens ID
   equals(callActivity.calledElement, candidate.id) && MATCH_SCORES.calledElementProcessId
   
   // Hög konfidens (0.96): calledElement matchar processens namn
   equals(callActivity.calledElement, candidate.name) && MATCH_SCORES.calledElementProcessName
   ```

3. **Matchningsprioritet:**
   - **Högsta konfidens (1.0):** `calledElement` matchar `process_id` i subprocess-filen
   - **Hög konfidens (0.96):** `calledElement` matchar `process_name` i subprocess-filen
   - **Medium konfidens:** Call Activity ID matchar process ID
   - **Låg konfidens:** Filnamnsheuristik och fuzzy-matchning

---

## 2. Automatisk Matchning med Heuristik (Fallback)

**Källa:** `src/lib/bpmn/SubprocessMatcher.ts` rad 264-369

Om `calledElement` inte fanns eller inte matchade direkt, användes automatisk matchning med flera heuristiker:

### Matchningsheuristiker (i prioritetsordning):

1. **CalledElement → Process ID** (Score: 1.0)
   - Exakt match: `calledElement === candidate.id`
   - Används när BPMN-filen explicit pekar på process ID

2. **CalledElement → Process Name** (Score: 0.96)
   - Exakt match: `calledElement === candidate.name`
   - Används när BPMN-filen pekar på process namn

3. **Call Activity ID → Process ID** (Score: 0.9)
   - Exakt match: `callActivity.id === candidate.id`
   - Används när call activity ID matchar process ID

4. **Call Activity Name → Process Name** (Score: 0.85)
   - Normaliserad match: `normalize(callActivity.name) === normalize(candidate.name)`
   - Används när namn matchar (case-insensitive, normaliserat)

5. **Filnamnsheuristik** (Score: 0.8)
   - Matchar call activity namn eller calledElement mot filnamn
   - Exempel: `"internal-data-gathering"` → `"mortgage-se-internal-data-gathering.bpmn"`
   - Hanterar prefix (`mortgage-se-`, `mortgage-`)

6. **Fuzzy-matchning** (Score: 0.0-0.7)
   - Dice coefficient för likhetsmatchning
   - Används som sista utväg

---

## 3. Hierarki-byggande från Process Definitions

**Källa:** `src/lib/bpmn/buildProcessHierarchy.ts`

### Process:

1. **Samla alla process definitions:**
   ```typescript
   // Rad 56-66: Normalisera process definitions
   rawDefinitions.forEach((definition, index) => {
     const baseId = definition.id?.trim() || `${definition.fileName}#process-${index + 1}`;
     const internalId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
     processes.set(internalId, { ...definition, id, internalId });
   });
   ```

2. **Matcha call activities till subprocesser:**
   ```typescript
   // Rad 100-124: För varje call activity
   effectiveCallActivities.forEach((callActivity) => {
     const link = matchCallActivityToProcesses(
       {
         id: callActivity.id,
         name: callActivity.name,
         calledElement: (callActivity as any).calledElement, // VIKTIGT: Använder calledElement
         kind: (callActivity as any).kind,
       },
       matcherCandidates,
       { ...matcherConfig, currentBpmnFile: proc.fileName }
     );
   });
   ```

3. **Bygg dependency graph:**
   ```typescript
   // Rad 79-81: Skapa adjacency map och indegree
   const indegree = new Map<string, number>();
   const adjacency = new Map<string, Set<string>>();
   const links = new Map<string, SubprocessLink>();
   
   // Rad 166-170: Lägg till edges i dependency graph
   if (mappedLink.matchStatus === 'matched' && mappedLink.matchedProcessId) {
     adjacency.get(proc.internalId)!.add(mappedLink.matchedProcessId);
     indegree.set(mappedLink.matchedProcessId, (indegree.get(mappedLink.matchedProcessId) ?? 0) + 1);
   }
   ```

4. **Identifiera root-processer:**
   ```typescript
   // Rad 181-198: Root-processer är de med indegree = 0
   let roots = Array.from(processes.values())
     .filter((proc) => (indegree.get(proc.internalId) ?? 0) === 0)
     .sort((a, b) => {
       const aPreferred = preferredRoots.includes(a.internalId) ? -1 : 0;
       const bPreferred = preferredRoots.includes(b.internalId) ? -1 : 0;
       if (aPreferred !== bPreferred) return aPreferred - bPreferred;
       return a.name?.localeCompare(b.name ?? '') ?? 0;
     });
   ```

---

## 4. Ordning baserad på Indegree (Dependency Graph)

**Källa:** `src/lib/bpmn/buildProcessHierarchy.ts` rad 79-198

### Hur ordning bestämdes:

1. **Indegree-beräkning:**
   - Varje process får ett `indegree`-värde = antal processer som anropar den
   - Root-processer har `indegree = 0` (ingen anropar dem)
   - Subprocesser har `indegree > 0` (en eller flera anropar dem)

2. **Topologisk sortering:**
   - Processer sorterades baserat på `indegree`
   - Processer med lägre `indegree` kommer före processer med högre `indegree`
   - Detta säkerställer att subprocesser processas före parent-processer

3. **Fallback-sortering:**
   - Om flera processer har samma `indegree`, sorteras de alfabetiskt
   - Preferred root-processer prioriteras

### Exempel:

```
mortgage-se-internal-data-gathering.bpmn (indegree: 1)
  └─ anropas av: mortgage-se-application.bpmn

mortgage-se-application.bpmn (indegree: 1)
  └─ anropas av: mortgage.bpmn

mortgage.bpmn (indegree: 0) ← Root-process
```

**Ordning:**
1. `mortgage-se-internal-data-gathering.bpmn` (lägst indegree bland subprocesser)
2. `mortgage-se-application.bpmn` (högre indegree)
3. `mortgage.bpmn` (root, indegree = 0)

---

## 5. CalledElement som Primär Källa

**Källa:** `src/lib/bpmn/SubprocessMatcher.ts` rad 264-291

### Varför CalledElement var viktigt:

1. **Explicit mappning i BPMN:**
   - `calledElement` är en explicit referens i BPMN-XML
   - Pekar direkt på `process_id` eller `process_name` i subprocess-filen
   - Ger högsta konfidens (1.0) vid matchning

2. **Exempel från BPMN-XML:**
   ```xml
   <bpmn:callActivity id="application" 
                      name="Application" 
                      calledElement="mortgage-se-application">
   ```
   - `calledElement="mortgage-se-application"` pekar på process med ID `mortgage-se-application`
   - Systemet matchar detta direkt mot `process_id` i `mortgage-se-application.bpmn`

3. **Fallback när calledElement saknas:**
   - Om `calledElement` saknas, används heuristik (filnamn, fuzzy-matchning)
   - Men `calledElement` var alltid förstahandsvalet

---

## 6. Dokumentation om Hierarki

**Källa:** `docs/confluence/hierarchy-architecture.md`

### Vad dokumentationen säger:

1. **Hierarki-nivåer:**
   ```
   Initiative (Root Process)
   ├── Feature Goal (CallActivity)
   │   ├── Epic (UserTask)
   │   ├── Epic (ServiceTask)
   │   └── Epic (BusinessRuleTask)
   └── Feature Goal (CallActivity)
   ```

2. **Bygg-process:**
   - Hierarkin byggs från BPMN-filer via `buildBpmnHierarchy()`
   - Använder `parseBpmnFile()` för att extrahera strukturen
   - Bygger trädstruktur rekursivt baserat på call activities

3. **Ordning:**
   - Dokumentationen nämner "topologisk sortering" (tillagd efter commit 1f9574c8)
   - Men innan det: alfabetisk sortering eller indegree-baserad sortering

---

## 7. Skillnader Före vs Efter Commit 1f9574c8

### Före Commit 1f9574c8:

1. **Primär matchning:** `calledElement` från BPMN-filer
2. **Fallback:** Automatisk matchning med heuristik (filnamn, fuzzy)
3. **Ordning:** Indegree-baserad sortering (dependency graph)
4. **Ingen bpmn-map.json:** Allt baserades på BPMN-filernas `calledElement` och automatisk matchning

### Efter Commit 1f9574c8:

1. **Primär matchning:** `bpmn-map.json` (om tillgänglig)
2. **Fallback:** `calledElement` + automatisk matchning
3. **Ordning:** Topologisk sortering (explicit dependency graph)
4. **bpmn-map.json:** Extern konfigurationsfil för mappningar

---

## 8. Sammanfattning: Hur Det Fungerade

### Steg-för-steg Process:

1. **Parsa BPMN-filer:**
   - Extrahera alla processer och deras call activities
   - Läsa `calledElement`-attribut från varje call activity

2. **Matcha call activities:**
   - För varje call activity, försök matcha via `calledElement`:
     - Först: `calledElement === process_id` (högsta konfidens)
     - Sedan: `calledElement === process_name` (hög konfidens)
   - Om ingen match: använd heuristik (filnamn, fuzzy-matchning)

3. **Bygg dependency graph:**
   - Skapa `adjacency` map: vilka processer anropar vilka
   - Beräkna `indegree`: hur många processer anropar varje process

4. **Identifiera root-processer:**
   - Root-processer = processer med `indegree = 0`
   - Sortera alfabetiskt om flera roots

5. **Sortera processer:**
   - Processer med lägre `indegree` kommer före processer med högre `indegree`
   - Detta säkerställer att subprocesser processas före parent-processer

6. **Bygg hierarki:**
   - Rekursivt bygg trädstruktur från root-processer
   - Varje call activity blir en child-node till sin parent-process

---

## 9. Viktiga Filer och Funktioner

### Kärnfiler:

1. **`src/lib/bpmn/SubprocessMatcher.ts`**
   - `matchCallActivityToProcesses()` - Matchar call activities till subprocesser
   - `evaluateCandidate()` - Utvärderar matchningskandidater med heuristik
   - Använder `calledElement` som primär källa

2. **`src/lib/bpmn/buildProcessHierarchy.ts`**
   - `buildProcessHierarchy()` - Bygger hierarki från process definitions
   - Använder `indegree` för att identifiera root-processer
   - Bygger dependency graph baserat på call activity-matchningar

3. **`src/lib/bpmnProcessGraph.ts`**
   - `buildBpmnProcessGraph()` - Bygger process graph från BPMN-filer
   - Använder `buildProcessHierarchy()` internt
   - Konverterar hierarki till `BpmnProcessGraph`

### Viktiga Funktioner:

- **`matchCallActivityToProcesses()`** - Matchar call activities (använder `calledElement`)
- **`evaluateCandidate()`** - Utvärderar matchningskandidater (heuristik)
- **`buildProcessHierarchy()`** - Bygger hierarki (använder indegree)
- **`buildBpmnProcessGraph()`** - Bygger process graph (använder hierarki)

---

## 10. Exempel: Hur En Matchning Fungerade

### Scenario: Application Process

**BPMN-fil:** `mortgage-se-application.bpmn`

**Call Activity i parent-fil (`mortgage.bpmn`):**
```xml
<bpmn:callActivity id="application" 
                   name="Application" 
                   calledElement="mortgage-se-application">
```

**Matchning-process:**

1. **Läs `calledElement`:**
   - `calledElement = "mortgage-se-application"`

2. **Sök i kandidater:**
   - Hitta process med `process_id = "mortgage-se-application"`
   - Eller process med `process_name = "mortgage-se-application"`

3. **Matchning:**
   - ✅ Hittar `mortgage-se-application.bpmn` med `process_id = "mortgage-se-application"`
   - Konfidens: **1.0** (högsta konfidens)

4. **Bygg hierarki:**
   - `mortgage.bpmn` (root, indegree = 0)
   - └─ `mortgage-se-application.bpmn` (subprocess, indegree = 1)

5. **Ordning:**
   - `mortgage-se-application.bpmn` processas FÖRE `mortgage.bpmn`
   - (eftersom subprocesser ska processas före parent-processer)

---

## 11. Begränsningar med CalledElement-approach

### Problem som kunde uppstå:

1. **Saknad calledElement:**
   - Om `calledElement` saknas, måste systemet använda heuristik
   - Heuristik kan ge felaktiga matchningar vid tvetydiga namn

2. **Felaktig calledElement:**
   - Om `calledElement` pekar på fel process ID, får man fel matchning
   - Ingen validering att `calledElement` faktiskt finns

3. **Tvetydiga matchningar:**
   - Flera processer kan ha liknande namn
   - Fuzzy-matchning kan ge flera kandidater med liknande score

4. **Strukturella ändringar:**
   - Om call activities flyttas till subProcesses, detekteras inte automatiskt
   - Systemet ser bara call activities på root-nivå

---

## 12. Skillnad: Före vs Efter bpmn-map.json

### Före bpmn-map.json:

- ✅ **Enkel:** Allt baserades på BPMN-filernas `calledElement`
- ✅ **Automatisk:** Ingen manuell konfiguration behövs
- ❌ **Begränsad:** Kan inte hantera komplexa mappningar
- ❌ **Felbenägen:** Heuristik kan ge felaktiga matchningar

### Efter bpmn-map.json:

- ✅ **Explicit:** Manuell kontroll över mappningar
- ✅ **Flexibel:** Kan hantera komplexa strukturer
- ✅ **Validerbar:** Kan validera mappningar mot faktiska filer
- ❌ **Underhåll:** Kräver manuell uppdatering vid ändringar

---

## Slutsats

**Innan commit 1f9574c8:**

1. **Hierarki byggdes från `calledElement`:**
   - Varje call activity hade ett `calledElement`-attribut
   - `calledElement` pekade på `process_id` eller `process_name` i subprocess-filen
   - Systemet matchade direkt baserat på detta

2. **Ordning baserades på indegree:**
   - Processer sorterades baserat på hur många andra processer som anropade dem
   - Root-processer (indegree = 0) kom sist
   - Subprocesser (indegree > 0) kom först

3. **Fallback till heuristik:**
   - Om `calledElement` saknades eller inte matchade, användes heuristik
   - Filnamnsmatchning, fuzzy-matchning, etc.

4. **Ingen extern konfiguration:**
   - Allt baserades på BPMN-filernas innehåll
   - Ingen `bpmn-map.json` behövdes

**Dokumentationen beskriver detta i:**
- `docs/confluence/hierarchy-architecture.md` - Hierarki-struktur
- `src/lib/bpmn/SubprocessMatcher.ts` - Matchningslogik
- `src/lib/bpmn/buildProcessHierarchy.ts` - Hierarki-byggande

