# BPMN-Planner: Analys och Lösningsförslag för Processmodell

## UPPGIFT A: Analys

---

## 1. Domänanalys

### 1.1 Vad BPMN-Planner försöker åstadkomma

BPMN-Planner är ett verktyg för att analysera, visualisera och generera artefakter från en distribuerad BPMN-processmodell. Systemet hanterar en komplex kreditprocess (t.ex. Mortgage) som är uppdelad över många BPMN-filer, där varje fil representerar en delprocess eller subprocess.

**Kärnfunktionalitet:**
- **Multi-fil-rekursion**: Systemet måste kunna läsa en rotprocess (t.ex. `mortgage.bpmn`) och rekursivt följa callActivities/subprocesser som pekar på andra BPMN-filer, vilket skapar en hierarkisk struktur över flera nivåer.
- **Processmodellering**: Bygga en sammanhängande modell av hela kreditprocessen som omfattar alla filer, där varje nod (process, callActivity, task) har en tydlig position i hierarkin.
- **Sekvensordning**: Beräkna i vilken ordning noderna inträffar baserat på BPMN sequence flows, vilket är kritiskt för projektplanering, testgenerering och dokumentation.
- **Single Source of Truth**: Skapa en enda, konsistent datastruktur (Process Tree) som används av alla komponenter: Process Explorer, dokumentation, testgenerering, ledger/registry, DoR/DoD, projektplanering.

### 1.2 Varför det är svårt att bygga en sammanhängande processmodell över flera filer

**Problem 1: Distribuerad modell utan explicit länkning**
- BPMN-filer är fristående XML-dokument. En callActivity i en fil refererar till en subprocess via `calledElement` eller namn, men det finns ingen garanti att den refererade processen finns i samma fil eller ens existerar.
- Det finns ingen inbyggd mekanism i BPMN-specifikationen för att explicit länka mellan filer. Systemet måste inferera dessa länkar baserat på namn, ID:n eller externa mappningar.

**Problem 2: Rekursiv hierarki med oklar djup**
- En process kan innehålla callActivities som pekar på andra processer, som i sin tur kan innehålla fler callActivities. Detta skapar en rekursiv struktur med okänt djup.
- Systemet måste hantera både direkt rekursion (process A → process A) och indirekt rekursion (process A → process B → process A), vilket kräver cykelhantering.

**Problem 3: Mångtydiga matchningar**
- När en callActivity refererar till en subprocess via namn eller ID kan det finnas flera kandidater som matchar delvis. Exempel: en callActivity med namnet "Credit Evaluation" kan matcha både `mortgage-se-credit-evaluation.bpmn` och `mortgage-se-manual-credit-evaluation.bpmn`.
- Nuvarande implementation använder fuzzy matching (Dice-koefficient), vilket kan ge osäkra resultat.

**Problem 4: Sekvensordning över filgränser**
- BPMN sequence flows definieras inom en fil, men när en callActivity pekar på en annan fil måste systemet kunna beräkna ordningen över filgränser.
- En nod i fil A kan ha `orderIndex: 5`, men när den är en del av en callActivity i fil B måste systemet veta om den ska köras före eller efter noder i fil B.

**Problem 5: Olika representationer och transformationer**
- Systemet har flera representationer: `BpmnMeta` (parser-output), `ProcessDefinition`, `HierarchyNode`, `ProcessNodeModel`, `BpmnProcessNode`, `ProcessTreeNode`. Varje transformation kan introducera förluster eller inkonsistenser.

### 1.3 Centrala begrepp och relationer

**Process (Process)**
- En BPMN-process representerad av en `<process>`-element i en BPMN-fil. Varje fil kan innehålla en eller flera processer. En process har ett ID, ett namn, och kan innehålla callActivities, tasks, och sequence flows.

**Subprocess / CallActivity**
- En callActivity är en nod i en process som refererar till en annan process (subprocess). Den kan peka på en process i samma fil eller i en annan fil. CallActivities är kritiska för att bygga hierarkin över flera filer.

**Tasks (UserTask, ServiceTask, BusinessRuleTask)**
- Löv-noder i hierarkin som representerar konkreta arbetssteg. De har ingen egen subprocesser, men de har en position i sekvensordningen.

**Sekvensflöde (Sequence Flow)**
- BPMN sequence flows definierar ordningen mellan noder inom en process. De är kritiska för att beräkna `orderIndex` och `scenarioPath`, vilket används för projektplanering och testgenerering.

**Rekursion**
- En process kan innehålla callActivities som pekar på sig själv (direkt rekursion) eller på processer som till slut pekar tillbaka (indirekt rekursion). Systemet måste detektera och hantera cykler.

**Mappning via bpmn-map.json**
- `bpmn-map.json` är en extern fil som explicit mappar callActivity-namn/ID:n till BPMN-filer. Den ger ingen hierarki eller sekvensordning, men den kan användas för att disambiguera matchningar. **Problemet**: Den används inte aktivt i nuvarande implementation – SubprocessMatcher använder fuzzy matching istället.

**Relationer:**
- **Process → CallActivity**: En process innehåller callActivities som pekar på subprocesser.
- **CallActivity → Process**: En callActivity länkar till en process (via matching).
- **Process → Task**: En process innehåller tasks som är löv-noder.
- **Sequence Flow → Order**: Sequence flows definierar ordningen mellan noder.
- **File → Process**: En BPMN-fil kan innehålla en eller flera processer.

---

## 2. Tekniska utmaningar

### 2.1 Multi-fil-rekursion och cykelhantering

**Problem:**
- Systemet måste rekursivt traversera processer över flera filer. När en callActivity matchar en process i en annan fil måste systemet ladda den filen och fortsätta rekursivt.
- Det finns ingen garanti att processerna bildar en DAG (Directed Acyclic Graph). Cykler måste detekteras och hanteras.

**Nuvarande implementation:**
- `buildProcessHierarchy` använder en `ancestorStack` för att detektera cykler, men det är inte helt robust. Om en process refereras från flera ställen kan det skapa problem.
- Cykelhanteringen är reaktiv (detekterar när det redan hänt) snarare än proaktiv (förhindrar rekursion).

**Misstag:**
- Ingen tydlig separation mellan "bygga grafen över alla filer" och "bygga hierarkin från en root". Systemet försöker göra båda samtidigt, vilket gör det svårt att hantera cykler korrekt.

### 2.2 Ordning och sequence flows

**Problem:**
- BPMN sequence flows definieras per fil, men systemet behöver en global ordning över alla filer. När en callActivity i fil A pekar på en process i fil B, måste systemet veta var noderna i fil B ska placeras i den globala sekvensen.

**Nuvarande implementation:**
- `assignExecutionOrder` i `bpmnProcessGraph.ts` beräknar ordning per fil separat. Det finns ingen explicit mekanism för att koppla ihop ordningen mellan filer.
- `orderIndex` och `scenarioPath` beräknas baserat på sequence flows inom en fil, men de reflekterar inte den globala ordningen.

**Misstag:**
- Sekvensordning beräknas EFTER att hierarkin är byggd, vilket gör det svårt att använda ordningen för att disambiguera matchningar eller validera hierarkin.

### 2.3 Filkopplingar och bpmn-map.json

**Problem:**
- `bpmn-map.json` innehåller explicit mappningar mellan callActivities och BPMN-filer, men den används inte aktivt i matchningsprocessen. SubprocessMatcher använder fuzzy matching istället, vilket kan ge osäkra resultat.

**Nuvarande implementation:**
- `bpmn-map.json` används endast för validering (`validate-bpmn-map.mjs`), inte för faktisk matching. Detta betyder att systemet kan missa explicit definierade länkar.

**Misstag:**
- `bpmn-map.json` borde vara den primära källan för matchningar, med fuzzy matching som fallback. Nu är det tvärtom.

### 2.4 Duplicering av logik

**Problem:**
- Det finns flera representationer och transformationer: `BpmnMeta` → `ProcessDefinition` → `HierarchyNode` → `ProcessNodeModel` → `BpmnProcessNode` → `ProcessTreeNode`. Varje steg kan introducera förluster eller inkonsistenser.

**Nuvarande implementation:**
- `buildProcessHierarchy` bygger `HierarchyNode[]`, som sedan konverteras till `ProcessNodeModel` i `buildProcessModelFromHierarchy`, som sedan konverteras till `BpmnProcessNode` i `convertProcessModelChildren`, som sedan konverteras till `ProcessTreeNode` i `buildProcessTreeFromGraph`. Detta är fyra transformationer, var och en med risk för förluster.

**Misstag:**
- För många abstraktionslager. Systemet borde ha en enda, tydlig representation som används genomgående, med tydliga transformationer endast där det behövs.

### 2.5 Olika modeller (meta, graf, träd)

**Problem:**
- Systemet har tre huvudsakliga modeller:
  1. **Meta-modell** (`BpmnMeta`): Parser-output, rå data från BPMN-filer.
  2. **Graf-modell** (`BpmnProcessGraph`): En graf över alla noder med länkar mellan filer.
  3. **Träd-modell** (`ProcessTreeNode`): Ett hierarkiskt träd för UI och artefaktgenerering.

**Nuvarande implementation:**
- Dessa modeller är inte helt konsistenta. En nod kan ha olika ID:n i olika modeller, vilket gör det svårt att spåra noder mellan modeller.

**Misstag:**
- Ingen tydlig mapping mellan modellerna. Systemet borde ha en enda "source of truth" (t.ex. ProcessNodeModel) och tydliga transformationer till andra representationer.

### 2.6 Felaktiga antaganden

**Antagande 1: En process per fil**
- Systemet antar ofta att varje BPMN-fil innehåller exakt en process, men BPMN-specifikationen tillåter flera processer per fil. Detta kan orsaka problem när systemet försöker matcha callActivities.

**Antagande 2: Determinism i matching**
- SubprocessMatcher använder fuzzy matching, vilket inte är deterministiskt. Två körningar kan ge olika resultat om kandidater har liknande scores.

**Antagande 3: Sekvensordning är lokal**
- Systemet beräknar sekvensordning per fil separat, men den globala ordningen är viktig för projektplanering och testgenerering.

**Antagande 4: Hierarki och sekvens är oberoende**
- Systemet bygger hierarkin först, sedan beräknar sekvensordning. Men sekvensordning kan påverka hierarkin (t.ex. om en callActivity ska expanderas eller inte baserat på ordning).

### 2.7 Arkitekturproblem i hierarkin

**Problem: Root-val**
- Systemet måste välja en root-process, men om alla processer har inkommande edges (indegree > 0) finns det ingen naturlig root. Systemet väljer en fallback, men det kan vara fel.

**Problem: Process-flattening**
- I `convertProcessModelChildren` i `bpmnProcessGraph.ts` flattenas process-noder: "Flatten process nodes beneath the current parent". Detta kan göra det svårt att spåra vilken fil en nod kommer från.

**Problem: Missing dependencies**
- Systemet spårar `missingDependencies`, men det är inte tydligt hur dessa ska hanteras. Bör systemet stoppa bygget, varna, eller fortsätta med partiell data?

---

## 3. Målet

### 3.1 Slutmålet i tekniska termer

**En komplett Process Tree-modell som:**
1. **Rekursiv hierarki**: Innehåller alla processer, callActivities och tasks från alla BPMN-filer, organiserade i en rekursiv hierarki där varje callActivity expanderas till sin subprocess.
2. **Sekvensordning**: Varje nod har en tydlig position i sekvensordningen (`orderIndex`, `branchId`, `scenarioPath`) som reflekterar BPMN sequence flows över alla filer.
3. **Filinformation**: Varje nod vet vilken BPMN-fil den kommer från (`bpmnFile`, `bpmnElementId`), vilket är kritiskt för artefaktgenerering och navigation.
4. **Single Source of Truth**: En enda datastruktur (`ProcessTreeNode`) som används av alla komponenter: Process Explorer, dokumentation, testgenerering, ledger/registry, DoR/DoD, projektplanering.

**Tekniska krav:**
- **Determinism**: Två körningar med samma input ska ge samma output.
- **Konsistens**: Alla komponenter använder samma modell, så det finns ingen drift.
- **Skalbarhet**: Systemet ska kunna hantera hundratals BPMN-filer och tusentals noder.
- **Robusthet**: Systemet ska hantera saknade filer, cykler, och osäkra matchningar utan att krascha.

### 3.2 Vad måste vara sant för att Process Explorer och resten av appen ska fungera korrekt

**Process Explorer:**
- Måste kunna visa en komplett hierarki från root till löv-noder.
- Måste kunna navigera mellan filer när användaren klickar på en callActivity.
- Måste kunna visa sekvensordning (t.ex. via `orderIndex`) för att användare ska förstå i vilken ordning noder körs.
- Måste kunna hantera saknade subprocesser (visa varningar, men inte krascha).

**Dokumentation:**
- Måste kunna generera dokumentation som reflekterar hierarkin (t.ex. Feature Goals → Epics).
- Måste kunna inkludera sekvensordning i dokumentationen (t.ex. "Steg 1: Application, Steg 2: Credit Evaluation").
- Måste kunna länka till rätt BPMN-filer och element.

**Testgenerering:**
- Måste kunna generera tester med hierarkisk struktur (nested describe blocks).
- Måste kunna använda sekvensordning för att generera test-scenarion i rätt ordning.
- Måste kunna spåra vilken fil och element varje test kommer från.

**Ledger/Registry:**
- Måste kunna spåra vilka noder som finns i systemet och deras status.
- Måste kunna validera att alla noder har korrekt metadata (fil, element, ordning).

**DoR/DoD:**
- Måste kunna generera Definition of Ready/Definition of Done baserat på hierarkin och sekvensordningen.
- Måste kunna spåra vilka noder som är klara och vilka som väntar.

**Projektplanering:**
- Måste kunna använda sekvensordning för att skapa en projektplan (t.ex. Gantt-diagram).
- Måste kunna identifiera kritiska vägar (längsta sekvens) och beroenden.

### 3.3 Vad innebär det att modellen ska vara "single source of truth"

**Definition:**
En "single source of truth" betyder att det finns en enda, auktoritativ datastruktur som är källan för all information om processmodellen. Alla andra komponenter (Process Explorer, dokumentation, testgenerering, etc.) använder denna datastruktur direkt eller via tydliga transformationer.

**Krav:**
1. **En enda modell**: `ProcessTreeNode` (eller en liknande struktur) är den enda modellen som används. Alla andra representationer är transformationer från denna modell.
2. **Determinism**: Två körningar med samma input ska ge samma modell. Detta kräver deterministisk matching (t.ex. använd `bpmn-map.json` först, sedan fuzzy matching som fallback).
3. **Konsistens**: Om modellen ändras (t.ex. en ny BPMN-fil läggs till), måste alla komponenter automatiskt uppdateras. Det ska inte finnas "cached" eller "stale" data.
4. **Validering**: Modellen måste kunna valideras (t.ex. alla callActivities har matchade subprocesser, alla sequence flows är giltiga, inga cykler).

**Fördelar:**
- **Ingen drift**: Alla komponenter ser samma data, så det finns ingen risk för inkonsistens.
- **Enkel underhåll**: Ändringar görs på ett ställe (modellen), och alla komponenter uppdateras automatiskt.
- **Testbarhet**: Modellen kan testas isolerat, och alla komponenter kan testas mot samma modell.

**Nuvarande problem:**
- Systemet har flera modeller (`BpmnProcessGraph`, `ProcessTreeNode`, etc.) som inte alltid är konsistenta.
- Matching är inte deterministisk (fuzzy matching), så två körningar kan ge olika resultat.
- Det finns ingen tydlig validering av modellen.

---

## UPPGIFT B: Lösningsförslag

---

## 1. Arkitektonisk lösning (high-level)

### 1.1 Systemstruktur

Systemet bör struktureras i fyra huvudlager:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Application Layer                               │
│ - Process Explorer, Documentation, Test Generation, etc.  │
│ - Använder Process Tree direkt                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Process Tree Builder                           │
│ - Bygger Process Tree från Process Graph                │
│ - Hanterar artefakter (test, doc, etc.)                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Process Graph Builder                          │
│ - Bygger graf över alla filer                           │
│ - Beräknar sekvensordning                                │
│ - Hanterar rekursion och cykler                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 1: BPMN Parser & File Loader                     │
│ - Läser BPMN-filer från disk/storage                    │
│ - Parsar XML till BpmnMeta                              │
│ - Läser bpmn-map.json                                   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 a) Läsa BPMN-filer

**Lösning:**
- Skapa en `BpmnFileLoader` som:
  1. Läser alla BPMN-filer från en given lista eller från storage.
  2. Parsar varje fil med `BpmnParser` till `BpmnMeta`.
  3. Cachar parse-resultat för att undvika omparsing.
  4. Returnerar en `Map<fileName, BpmnParseResult>`.

**Implementation:**
```typescript
interface BpmnFileLoader {
  loadFiles(fileNames: string[]): Promise<Map<string, BpmnParseResult>>;
  loadFile(fileName: string): Promise<BpmnParseResult>;
  clearCache(): void;
}
```

### 1.3 b) Bygga en graf över alla filer

**Lösning:**
- Skapa en `ProcessGraphBuilder` som:
  1. Tar alla `BpmnParseResult` från File Loader.
  2. Bygger en initial graf där varje process är en nod och callActivities är edges.
  3. Använder `bpmn-map.json` för att matcha callActivities till filer (deterministiskt).
  4. Om `bpmn-map.json` saknas eller är ofullständig, använd SubprocessMatcher som fallback.
  5. Detekterar och hanterar cykler (markerar dem, men stoppar inte bygget).
  6. Returnerar en `ProcessGraph` som innehåller alla noder och edges.

**ProcessGraph-struktur:**
```typescript
interface ProcessGraph {
  nodes: Map<string, ProcessGraphNode>;
  edges: Map<string, ProcessGraphEdge>;
  roots: string[]; // Node IDs för root-processer
  cycles: CycleInfo[]; // Information om detekterade cykler
  missingDependencies: MissingDependency[];
}

interface ProcessGraphNode {
  id: string;
  type: 'process' | 'callActivity' | 'task';
  bpmnFile: string;
  bpmnElementId: string;
  name: string;
  processId?: string; // För process-noder
  metadata: Record<string, unknown>;
}

interface ProcessGraphEdge {
  id: string;
  from: string; // Source node ID
  to: string; // Target node ID
  type: 'subprocess' | 'sequence' | 'hierarchy';
  metadata: Record<string, unknown>;
}
```

### 1.4 c) Generera en sekvensordnad processmodell

**Lösning:**
- Skapa en `SequenceOrderCalculator` som:
  1. Tar `ProcessGraph` och `BpmnParseResult`-map.
  2. För varje fil, bygger en sekvensgraf baserat på sequence flows.
  3. Beräknar `orderIndex` för varje nod baserat på topologisk sortering.
  4. Hanterar branches (gateways) genom att skapa `branchId` och `scenarioPath`.
  5. Kopplar ihop sekvensordning mellan filer (när en callActivity expanderas, måste noderna i subprocessen ha korrekt ordning relativt parent-processen).
  6. Returnerar en `ProcessGraph` med `orderIndex`, `branchId`, `scenarioPath` på varje nod.

**Algoritm:**
1. För varje fil, bygg en sekvensgraf från sequence flows.
2. Hitta start events (eller noder utan predecessors).
3. Gör en BFS/DFS-traversal från start events.
4. Tilldela `orderIndex` baserat på traversal-ordning.
5. För branches, skapa unika `branchId` och `scenarioPath`.
6. När en callActivity expanderas, justera `orderIndex` för noder i subprocessen relativt callActivityns position.

### 1.5 d) Skapa ett rekursivt Process Tree

**Lösning:**
- Skapa en `ProcessTreeBuilder` som:
  1. Tar `ProcessGraph` med sekvensordning.
  2. Väljer en root-process (baserat på `preferredRootFile` eller första root i grafen).
  3. Bygger ett rekursivt träd genom att:
     - Starta från root-processen.
     - För varje callActivity, expandera till subprocessen (rekursivt).
     - Lägg till tasks som löv-noder.
  4. Hanterar cykler genom att stoppa rekursion när en process redan besökts (markera med diagnostik).
  5. Returnerar en `ProcessTreeNode` som är root för trädet.

**ProcessTreeNode-struktur:**
```typescript
interface ProcessTreeNode {
  id: string;
  label: string;
  type: 'process' | 'callActivity' | 'userTask' | 'serviceTask' | 'businessRuleTask';
  bpmnFile: string;
  bpmnElementId?: string;
  orderIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];
  subprocessFile?: string; // För callActivities
  children: ProcessTreeNode[];
  artifacts?: NodeArtifact[];
  diagnostics?: DiagnosticsEntry[];
}
```

### 1.6 e) Undvika duplicering

**Lösning:**
- **En enda modell**: `ProcessGraph` är den enda "source of truth". Alla andra representationer (`ProcessTreeNode`, etc.) är transformationer från denna modell.
- **Tydliga transformationer**: Skapa explicita transformationer:
  - `ProcessGraph → ProcessTreeNode`: `buildProcessTreeFromGraph(graph, rootFile)`
  - `ProcessGraph → Documentation`: `generateDocumentationFromGraph(graph)`
  - `ProcessGraph → Tests`: `generateTestsFromGraph(graph)`
- **Ingen duplicering av logik**: All matching, cykelhantering, sekvensordning, etc. görs en gång i `ProcessGraphBuilder`. Alla andra komponenter använder resultatet.

### 1.7 f) Kunna fortsätta skala

**Lösning:**
- **Caching**: Cache `BpmnParseResult` och `ProcessGraph` för att undvika omparsing och ombyggnad.
- **Lazy loading**: Ladda endast de filer som behövs för den aktuella root-processen. Om användaren byter root, ladda nya filer.
- **Inkrementell uppdatering**: Om en BPMN-fil ändras, uppdatera endast den delen av grafen som påverkas.
- **Streaming**: För mycket stora processer, använd streaming för att bygga trädet inkrementellt.
- **Parallellisering**: Parsa flera BPMN-filer parallellt.

---

## 2. Datamodell & graph-engine

### 2.1 Representera processer

**ProcessGraphNode för processer:**
```typescript
interface ProcessGraphNode {
  id: string; // T.ex. "mortgage-se-application" (processId)
  type: 'process';
  bpmnFile: string; // T.ex. "mortgage-se-application.bpmn"
  bpmnElementId: string; // Process ID från BPMN (t.ex. "mortgage-se-application")
  name: string; // Process name från BPMN
  processId: string; // Samma som bpmnElementId för processer
  metadata: {
    callActivities: Array<{ id: string; name?: string; calledElement?: string }>;
    tasks: Array<{ id: string; name?: string; type: string }>;
    sequenceFlows: Array<{ id: string; sourceRef: string; targetRef: string }>;
  };
}
```

### 2.2 Representera callActivities och kopplingar mellan filer

**ProcessGraphNode för callActivities:**
```typescript
interface ProcessGraphNode {
  id: string; // T.ex. "mortgage.bpmn:application" (file:elementId)
  type: 'callActivity';
  bpmnFile: string; // T.ex. "mortgage.bpmn"
  bpmnElementId: string; // T.ex. "application"
  name: string; // T.ex. "Application"
  metadata: {
    calledElement?: string; // Från BPMN
    matchedProcessId?: string; // Matchad process ID
    matchedFileName?: string; // Matchad BPMN-fil
    matchStatus: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
    matchSource: 'bpmn-map' | 'fuzzy' | 'calledElement'; // Var matchningen kom från
  };
}
```

**ProcessGraphEdge för subprocess-länkar:**
```typescript
interface ProcessGraphEdge {
  id: string; // T.ex. "mortgage.bpmn:application -> mortgage-se-application"
  from: string; // CallActivity node ID
  to: string; // Process node ID
  type: 'subprocess';
  metadata: {
    callActivityId: string;
    matchStatus: string;
    diagnostics: DiagnosticsEntry[];
  };
}
```

### 2.3 Extrahera tasks

**ProcessGraphNode för tasks:**
```typescript
interface ProcessGraphNode {
  id: string; // T.ex. "mortgage-se-application.bpmn:Task_1"
  type: 'userTask' | 'serviceTask' | 'businessRuleTask';
  bpmnFile: string;
  bpmnElementId: string;
  name: string;
  metadata: {
    taskType: string; // UserTask, ServiceTask, etc.
  };
}
```

### 2.4 Bygga sequence-flöden

**ProcessGraphEdge för sequence flows:**
```typescript
interface ProcessGraphEdge {
  id: string; // T.ex. "mortgage.bpmn:Flow_1"
  from: string; // Source node ID
  to: string; // Target node ID
  type: 'sequence';
  metadata: {
    sequenceFlowId: string; // Från BPMN
    condition?: string; // Om det är en conditional flow
  };
}
```

**Algoritm för att bygga sequence-flöden:**
1. För varje `BpmnParseResult`, extrahera `sequenceFlows`.
2. För varje sequence flow, skapa en `ProcessGraphEdge` med `type: 'sequence'`.
3. Koppla edges till noder baserat på `sourceRef` och `targetRef`.

### 2.5 Hantera rekursion och cykler

**Cykeldetektering:**
```typescript
interface CycleInfo {
  nodes: string[]; // Node IDs som ingår i cykeln
  type: 'direct' | 'indirect'; // Direkt eller indirekt rekursion
  severity: 'error' | 'warning'; // Allvarlighetsgrad
}

function detectCycles(graph: ProcessGraph): CycleInfo[] {
  const cycles: CycleInfo[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      // Cykel detekterad
      const cycleStart = path.indexOf(nodeId);
      cycles.push({
        nodes: path.slice(cycleStart),
        type: path.length - cycleStart === 1 ? 'direct' : 'indirect',
        severity: 'warning',
      });
      return;
    }
    
    if (visited.has(nodeId)) return;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const node = graph.nodes.get(nodeId);
    if (node) {
      const subprocessEdges = Array.from(graph.edges.values())
        .filter(e => e.from === nodeId && e.type === 'subprocess');
      
      for (const edge of subprocessEdges) {
        dfs(edge.to, [...path, nodeId]);
      }
    }
    
    recursionStack.delete(nodeId);
  }
  
  for (const rootId of graph.roots) {
    dfs(rootId, []);
  }
  
  return cycles;
}
```

**Hantering:**
- När en cykel detekteras, markera den i `ProcessGraph.cycles`.
- I `ProcessTreeBuilder`, stoppa rekursion när en process redan besökts (men lägg till diagnostik).
- I UI, visa varningar för cykler men låt användaren fortsätta.

### 2.6 Bygga en processgraf som går att traversera

**Traversal-funktioner:**
```typescript
class ProcessGraphTraverser {
  constructor(private graph: ProcessGraph) {}
  
  // Traversera från root till löv
  traverseDepthFirst(
    startNodeId: string,
    visitor: (node: ProcessGraphNode, depth: number) => void
  ): void {
    const visited = new Set<string>();
    
    const dfs = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = this.graph.nodes.get(nodeId);
      if (!node) return;
      
      visitor(node, depth);
      
      // Traversera subprocess edges
      const subprocessEdges = Array.from(this.graph.edges.values())
        .filter(e => e.from === nodeId && e.type === 'subprocess');
      
      for (const edge of subprocessEdges) {
        dfs(edge.to, depth + 1);
      }
      
      // Traversera sequence edges (barn-noder i samma process)
      const sequenceEdges = Array.from(this.graph.edges.values())
        .filter(e => e.from === nodeId && e.type === 'sequence');
      
      for (const edge of sequenceEdges) {
        dfs(edge.to, depth);
      }
    };
    
    dfs(startNodeId, 0);
  }
  
  // Hitta alla noder i en fil
  getNodesInFile(fileName: string): ProcessGraphNode[] {
    return Array.from(this.graph.nodes.values())
      .filter(node => node.bpmnFile === fileName);
  }
  
  // Hitta alla callActivities som pekar på en process
  getCallActivitiesForProcess(processId: string): ProcessGraphNode[] {
    const processNode = Array.from(this.graph.nodes.values())
      .find(n => n.type === 'process' && n.processId === processId);
    
    if (!processNode) return [];
    
    return Array.from(this.graph.edges.values())
      .filter(e => e.to === processNode.id && e.type === 'subprocess')
      .map(e => this.graph.nodes.get(e.from))
      .filter(Boolean) as ProcessGraphNode[];
  }
}
```

---

## 3. Process Tree-lösning (det interna representationen)

### 3.1 ProcessTreeNode-struktur

```typescript
interface ProcessTreeNode {
  // Identifikation
  id: string; // Unikt ID (t.ex. "mortgage.bpmn:application" eller "mortgage-se-application")
  label: string; // Visningsnamn (t.ex. "Application")
  type: 'process' | 'callActivity' | 'userTask' | 'serviceTask' | 'businessRuleTask';
  
  // BPMN-referens
  bpmnFile: string; // BPMN-fil (t.ex. "mortgage.bpmn")
  bpmnElementId?: string; // BPMN element ID (t.ex. "application")
  processId?: string; // Process ID (för process-noder)
  
  // Sekvensordning
  orderIndex?: number; // Global ordning (0, 1, 2, ...)
  branchId?: string | null; // Branch ID (t.ex. "main", "main-branch-1")
  scenarioPath?: string[]; // Sökväg genom branches (t.ex. ["main", "main-branch-1"])
  
  // Subprocess-länk (för callActivities)
  subprocessFile?: string; // Matchad BPMN-fil (t.ex. "mortgage-se-application.bpmn")
  subprocessLink?: SubprocessLink; // Fullständig länkinformation
  
  // Hierarki
  children: ProcessTreeNode[]; // Barn-noder
  
  // Artefakter
  artifacts?: NodeArtifact[]; // Test, doc, DoR, DoD, etc.
  
  // Diagnostik
  diagnostics?: DiagnosticsEntry[]; // Varningar, fel, etc.
}
```

### 3.2 Algoritm för att bygga trädet rekursivt från grafen

```typescript
function buildProcessTreeFromGraph(
  graph: ProcessGraph,
  rootProcessId: string,
  artifactBuilder: ArtifactBuilder
): ProcessTreeNode {
  const rootNode = graph.nodes.get(rootProcessId);
  if (!rootNode || rootNode.type !== 'process') {
    throw new Error(`Root process ${rootProcessId} not found`);
  }
  
  const visitedProcesses = new Set<string>(); // För cykelhantering
  
  function buildNode(
    graphNode: ProcessGraphNode,
    parentPath: string[]
  ): ProcessTreeNode {
    const nodeId = graphNode.id;
    
    // För process-noder, kontrollera cykler
    if (graphNode.type === 'process') {
      if (visitedProcesses.has(nodeId)) {
        // Cykel detekterad - returnera en nod med diagnostik men inga barn
        return {
          id: nodeId,
          label: graphNode.name,
          type: 'process',
          bpmnFile: graphNode.bpmnFile,
          bpmnElementId: graphNode.bpmnElementId,
          processId: graphNode.processId,
          children: [],
          diagnostics: [{
            severity: 'error',
            code: 'CYCLE_DETECTED',
            message: `Cykel detekterad: ${graphNode.name} refereras redan i sökvägen`,
            context: { path: parentPath },
            timestamp: new Date().toISOString(),
          }],
        };
      }
      visitedProcesses.add(nodeId);
    }
    
    // Bygg barn-noder
    const children: ProcessTreeNode[] = [];
    
    // 1. Hitta callActivities i denna process
    const callActivityEdges = Array.from(graph.edges.values())
      .filter(e => {
        // Hitta edges som går från noder i samma fil och är subprocess-länkar
        const sourceNode = graph.nodes.get(e.from);
        return sourceNode?.bpmnFile === graphNode.bpmnFile && 
               e.type === 'subprocess';
      })
      .sort((a, b) => {
        // Sortera baserat på sequence order om det finns
        const aNode = graph.nodes.get(a.from);
        const bNode = graph.nodes.get(b.from);
        const aOrder = aNode?.metadata.orderIndex ?? Infinity;
        const bOrder = bNode?.metadata.orderIndex ?? Infinity;
        return aOrder - bOrder;
      });
    
    for (const edge of callActivityEdges) {
      const callActivityNode = graph.nodes.get(edge.from);
      const subprocessNode = graph.nodes.get(edge.to);
      
      if (!callActivityNode || !subprocessNode) continue;
      
      // Bygg callActivity-nod
      const callActivityTreeNode: ProcessTreeNode = {
        id: callActivityNode.id,
        label: callActivityNode.name,
        type: 'callActivity',
        bpmnFile: callActivityNode.bpmnFile,
        bpmnElementId: callActivityNode.bpmnElementId,
        orderIndex: callActivityNode.metadata.orderIndex,
        branchId: callActivityNode.metadata.branchId,
        scenarioPath: callActivityNode.metadata.scenarioPath,
        subprocessFile: subprocessNode.bpmnFile,
        subprocessLink: {
          callActivityId: callActivityNode.bpmnElementId,
          callActivityName: callActivityNode.name,
          matchedProcessId: subprocessNode.processId,
          matchedFileName: subprocessNode.bpmnFile,
          matchStatus: callActivityNode.metadata.matchStatus,
          // ... andra fält
        },
        children: [],
        artifacts: artifactBuilder(callActivityNode.bpmnFile, callActivityNode.bpmnElementId),
      };
      
      // Rekursivt bygg subprocessen
      if (subprocessNode.type === 'process') {
        const subprocessTree = buildNode(subprocessNode, [...parentPath, nodeId]);
        callActivityTreeNode.children.push(...subprocessTree.children);
        // Lägg till subprocessens process-nod som första barn (valfritt)
        // eller flattena den (beroende på design)
      }
      
      children.push(callActivityTreeNode);
    }
    
    // 2. Hitta tasks i denna process
    const taskNodes = Array.from(graph.nodes.values())
      .filter(n => 
        n.bpmnFile === graphNode.bpmnFile &&
        (n.type === 'userTask' || n.type === 'serviceTask' || n.type === 'businessRuleTask')
      )
      .sort((a, b) => {
        const aOrder = a.metadata.orderIndex ?? Infinity;
        const bOrder = b.metadata.orderIndex ?? Infinity;
        return aOrder - bOrder;
      });
    
    for (const taskNode of taskNodes) {
      const taskTreeNode: ProcessTreeNode = {
        id: taskNode.id,
        label: taskNode.name,
        type: taskNode.type as ProcessTreeNode['type'],
        bpmnFile: taskNode.bpmnFile,
        bpmnElementId: taskNode.bpmnElementId,
        orderIndex: taskNode.metadata.orderIndex,
        branchId: taskNode.metadata.branchId,
        scenarioPath: taskNode.metadata.scenarioPath,
        children: [],
        artifacts: artifactBuilder(taskNode.bpmnFile, taskNode.bpmnElementId),
      };
      
      children.push(taskTreeNode);
    }
    
    // 3. Bygg ProcessTreeNode
    const treeNode: ProcessTreeNode = {
      id: graphNode.id,
      label: graphNode.name,
      type: graphNode.type === 'process' ? 'process' : 'callActivity',
      bpmnFile: graphNode.bpmnFile,
      bpmnElementId: graphNode.bpmnElementId,
      processId: graphNode.processId,
      orderIndex: graphNode.metadata.orderIndex,
      branchId: graphNode.metadata.branchId,
      scenarioPath: graphNode.metadata.scenarioPath,
      children,
      artifacts: graphNode.type === 'process' 
        ? artifactBuilder(graphNode.bpmnFile, graphNode.processId)
        : undefined,
    };
    
    // Rensa visitedProcesses när vi lämnar process-noden
    if (graphNode.type === 'process') {
      visitedProcesses.delete(nodeId);
    }
    
    return treeNode;
  }
  
  return buildNode(rootNode, []);
}
```

### 3.3 Hur sekvensordning ska extraheras och appliceras

**Steg 1: Extrahera sequence flows per fil**
```typescript
function extractSequenceFlows(parseResult: BpmnParseResult): SequenceFlow[] {
  return parseResult.sequenceFlows.map(flow => ({
    id: flow.id,
    sourceRef: flow.sourceRef,
    targetRef: flow.targetRef,
    condition: flow.condition,
  }));
}
```

**Steg 2: Bygg sekvensgraf per fil**
```typescript
function buildSequenceGraph(
  nodes: ProcessGraphNode[],
  sequenceFlows: SequenceFlow[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  
  for (const node of nodes) {
    graph.set(node.id, []);
  }
  
  for (const flow of sequenceFlows) {
    const sourceNode = nodes.find(n => n.bpmnElementId === flow.sourceRef);
    const targetNode = nodes.find(n => n.bpmnElementId === flow.targetRef);
    
    if (sourceNode && targetNode) {
      const successors = graph.get(sourceNode.id) || [];
      successors.push(targetNode.id);
      graph.set(sourceNode.id, successors);
    }
  }
  
  return graph;
}
```

**Steg 3: Beräkna orderIndex med topologisk sortering**
```typescript
function calculateOrderIndex(
  sequenceGraph: Map<string, string[]>,
  startNodes: string[]
): Map<string, { orderIndex: number; branchId: string; scenarioPath: string[] }> {
  const result = new Map<string, { orderIndex: number; branchId: string; scenarioPath: string[] }>();
  const visited = new Set<string>();
  let globalOrder = 0;
  
  function dfs(nodeId: string, branchId: string, scenarioPath: string[]) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    result.set(nodeId, {
      orderIndex: globalOrder++,
      branchId,
      scenarioPath,
    });
    
    const successors = sequenceGraph.get(nodeId) || [];
    
    if (successors.length === 0) {
      // Löv-nod
      return;
    }
    
    if (successors.length === 1) {
      // Enkel sekvens
      dfs(successors[0], branchId, scenarioPath);
    } else {
      // Branch - skapa nya branches
      const [first, ...others] = successors;
      
      // Första branchen behåller samma branchId
      dfs(first, branchId, scenarioPath);
      
      // Andra branches får nya branchId
      others.forEach((target, idx) => {
        const newBranchId = `${branchId}-branch-${idx + 1}`;
        const newScenarioPath = [...scenarioPath, newBranchId];
        dfs(target, newBranchId, newScenarioPath);
      });
    }
  }
  
  // Starta från start-noder
  startNodes.forEach((startId, index) => {
    const branchId = index === 0 ? 'main' : `entry-${index + 1}`;
    const scenarioPath = [branchId];
    dfs(startId, branchId, scenarioPath);
  });
  
  return result;
}
```

**Steg 4: Applicera orderIndex på ProcessGraph-noder**
```typescript
function applyOrderIndexToGraph(
  graph: ProcessGraph,
  parseResults: Map<string, BpmnParseResult>
): void {
  // Gruppera noder per fil
  const nodesByFile = new Map<string, ProcessGraphNode[]>();
  for (const node of graph.nodes.values()) {
    const list = nodesByFile.get(node.bpmnFile) || [];
    list.push(node);
    nodesByFile.set(node.bpmnFile, list);
  }
  
  // För varje fil, beräkna orderIndex
  for (const [fileName, nodes] of nodesByFile.entries()) {
    const parseResult = parseResults.get(fileName);
    if (!parseResult) continue;
    
    const sequenceFlows = extractSequenceFlows(parseResult);
    const sequenceGraph = buildSequenceGraph(nodes, sequenceFlows);
    
    // Hitta start-noder (noder utan predecessors i sequence flows)
    const allTargets = new Set(sequenceFlows.map(f => f.targetRef));
    const startNodes = nodes
      .filter(n => !allTargets.has(n.bpmnElementId))
      .map(n => n.id);
    
    const orderMap = calculateOrderIndex(sequenceGraph, startNodes);
    
    // Applicera på noder
    for (const [nodeId, orderInfo] of orderMap.entries()) {
      const node = graph.nodes.get(nodeId);
      if (node) {
        node.metadata.orderIndex = orderInfo.orderIndex;
        node.metadata.branchId = orderInfo.branchId;
        node.metadata.scenarioPath = orderInfo.scenarioPath;
      }
    }
  }
}
```

### 3.4 Hur bpmn-map.json integreras i processen

**Steg 1: Ladda bpmn-map.json**
```typescript
interface BpmnMap {
  orchestration: {
    root_process: string;
  };
  processes: Array<{
    id: string;
    bpmn_file: string;
    process_id: string;
    call_activities: Array<{
      bpmn_id: string;
      name?: string;
      called_element?: string;
      subprocess_bpmn_file?: string;
    }>;
  }>;
}

function loadBpmnMap(filePath: string): BpmnMap {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}
```

**Steg 2: Använd bpmn-map.json för matching (prioritet 1)**
```typescript
function matchCallActivityUsingMap(
  callActivity: { id: string; name?: string; calledElement?: string },
  bpmnFile: string,
  bpmnMap: BpmnMap
): { matchedFileName?: string; matchSource: 'bpmn-map' | 'none' } {
  // Hitta processen i bpmn-map.json
  const process = bpmnMap.processes.find(p => p.bpmn_file === bpmnFile);
  if (!process) return { matchSource: 'none' };
  
  // Hitta callActivity i processens call_activities
  const mapEntry = process.call_activities.find(
    ca => ca.bpmn_id === callActivity.id ||
          ca.name === callActivity.name ||
          ca.called_element === callActivity.calledElement
  );
  
  if (mapEntry?.subprocess_bpmn_file) {
    return {
      matchedFileName: mapEntry.subprocess_bpmn_file,
      matchSource: 'bpmn-map',
    };
  }
  
  return { matchSource: 'none' };
}
```

**Steg 3: Integrera i ProcessGraphBuilder**
```typescript
class ProcessGraphBuilder {
  constructor(
    private bpmnMap?: BpmnMap
  ) {}
  
  matchCallActivity(
    callActivity: { id: string; name?: string; calledElement?: string },
    bpmnFile: string,
    candidateProcesses: ProcessDefinition[]
  ): SubprocessLink {
    // 1. Försök med bpmn-map.json först (deterministiskt)
    if (this.bpmnMap) {
      const mapMatch = matchCallActivityUsingMap(callActivity, bpmnFile, this.bpmnMap);
      if (mapMatch.matchedFileName) {
        // Hitta processen som matchar filen
        const matchedProcess = candidateProcesses.find(
          p => p.fileName === mapMatch.matchedFileName
        );
        
        if (matchedProcess) {
          return {
            callActivityId: callActivity.id,
            callActivityName: callActivity.name,
            calledElement: callActivity.calledElement,
            matchedProcessId: matchedProcess.id,
            matchedFileName: matchedProcess.fileName,
            matchStatus: 'matched',
            confidence: 1.0,
            matchSource: 'bpmn-map',
            candidates: [],
            diagnostics: [],
          };
        }
      }
    }
    
    // 2. Fallback till SubprocessMatcher (fuzzy matching)
    return matchCallActivityToProcesses(callActivity, candidateProcesses);
  }
}
```

---

## 4. Förslag på stegvis implementation

### Steg 1: Klargör graflager och datatyper

**Mål:** Definiera tydliga datatyper för ProcessGraph och relaterade strukturer.

**Aktiviteter:**
1. Skapa `src/lib/bpmn/processGraph.ts` med:
   - `ProcessGraph` interface
   - `ProcessGraphNode` interface
   - `ProcessGraphEdge` interface
   - `CycleInfo` interface
   - `MissingDependency` interface

2. Migrera befintlig kod till att använda dessa typer.

3. Skriv enhetstester för datatyperna.

**Kriterier för klar:**
- Alla datatyper är definierade och dokumenterade.
- TypeScript-kompilering lyckas utan fel.
- Enhetstester passerar.

**Tidsestimat:** 2-3 dagar

---

### Steg 2: Implementera sekvensflödes-extraktion

**Mål:** Extrahera och normalisera sequence flows från BPMN-filer.

**Aktiviteter:**
1. Skapa `src/lib/bpmn/sequenceFlowExtractor.ts` med:
   - `extractSequenceFlows(parseResult: BpmnParseResult): SequenceFlow[]`
   - `buildSequenceGraph(nodes, flows): Map<string, string[]>`
   - `findStartNodes(sequenceGraph): string[]`

2. Integrera med `BpmnParser` för att extrahera sequence flows.

3. Skriv enhetstester med verkliga BPMN-fixtures.

**Kriterier för klar:**
- Sequence flows extraheras korrekt från alla BPMN-filer.
- Start-noder identifieras korrekt.
- Enhetstester passerar.

**Tidsestimat:** 2-3 dagar

---

### Steg 3: Implementera callActivity → file lookup via bpmn-map.json

**Mål:** Använd `bpmn-map.json` som primär källa för matchningar.

**Aktiviteter:**
1. Skapa `src/lib/bpmn/bpmnMapLoader.ts` med:
   - `loadBpmnMap(filePath): BpmnMap`
   - `matchCallActivityUsingMap(callActivity, bpmnFile, bpmnMap): MatchResult`

2. Uppdatera `SubprocessMatcher` för att använda `bpmn-map.json` först, sedan fuzzy matching som fallback.

3. Skriv enhetstester som verifierar att `bpmn-map.json` används korrekt.

**Kriterier för klar:**
- `bpmn-map.json` används för matchningar när den finns.
- Fuzzy matching används som fallback.
- Enhetstester passerar.

**Tidsestimat:** 3-4 dagar

---

### Steg 4: Implementera rekursion och cykelskydd

**Mål:** Bygga ProcessGraph rekursivt med korrekt cykelhantering.

**Aktiviteter:**
1. Skapa `src/lib/bpmn/processGraphBuilder.ts` med:
   - `buildProcessGraph(parseResults, bpmnMap): ProcessGraph`
   - `detectCycles(graph): CycleInfo[]`
   - `buildGraphRecursively(rootProcessId, visited): void`

2. Implementera cykelhantering:
   - Detektera cykler med DFS.
   - Markera cykler i `ProcessGraph.cycles`.
   - Stoppa rekursion vid cykler (men lägg till diagnostik).

3. Skriv enhetstester med cykliska fixtures.

**Kriterier för klar:**
- ProcessGraph byggs korrekt för icke-cykliska processer.
- Cykler detekteras och hanteras korrekt.
- Enhetstester passerar.

**Tidsestimat:** 4-5 dagar

---

### Steg 5: Implementera ProcessTree builder

**Mål:** Bygga ProcessTree från ProcessGraph.

**Aktiviteter:**
1. Skapa `src/lib/bpmn/processTreeBuilder.ts` med:
   - `buildProcessTreeFromGraph(graph, rootProcessId, artifactBuilder): ProcessTreeNode`
   - `buildNodeRecursively(graphNode, visitedProcesses): ProcessTreeNode`

2. Implementera rekursiv trädbyggnad:
   - Starta från root-process.
   - För varje callActivity, expandera till subprocessen.
   - Lägg till tasks som löv-noder.
   - Hantera cykler genom att stoppa rekursion.

3. Integrera sekvensordning (`orderIndex`, `branchId`, `scenarioPath`).

4. Skriv enhetstester med verkliga mortgage-fixtures.

**Kriterier för klar:**
- ProcessTree byggs korrekt från ProcessGraph.
- Sekvensordning appliceras korrekt.
- Enhetstester passerar.

**Tidsestimat:** 5-6 dagar

---

### Steg 6: Koppla modellerna till Process Explorer

**Mål:** Uppdatera Process Explorer för att använda den nya ProcessTree-modellen.

**Aktiviteter:**
1. Uppdatera `src/pages/ProcessExplorer.tsx` för att använda `buildProcessTreeFromGraph`.

2. Uppdatera `src/components/ProcessTreeD3.tsx` för att visa den nya strukturen.

3. Testa med verkliga BPMN-filer.

**Kriterier för klar:**
- Process Explorer visar korrekt hierarki.
- Navigation mellan filer fungerar.
- Sekvensordning visas korrekt.

**Tidsestimat:** 3-4 dagar

---

### Steg 7: Lägg till tester

**Mål:** Omfattande testtäckning för alla nya komponenter.

**Aktiviteter:**
1. Skriv enhetstester för:
   - `processGraphBuilder.ts`
   - `processTreeBuilder.ts`
   - `sequenceFlowExtractor.ts`
   - `bpmnMapLoader.ts`

2. Skriv integrationstester med verkliga mortgage-fixtures.

3. Skriv regressionstester för kända problem.

**Kriterier för klar:**
- Testtäckning > 80% för nya komponenter.
- Alla tester passerar.
- Integrationstester verifierar end-to-end-flöde.

**Tidsestimat:** 4-5 dagar

---

### Steg 8: Lägg till debug-vyer

**Mål:** Debug-verktyg för att inspektera ProcessGraph och ProcessTree.

**Aktiviteter:**
1. Skapa `src/pages/ProcessGraphDebug.tsx` med:
   - Visa ProcessGraph som en graf (t.ex. med vis.js eller D3).
   - Visa cykler, missing dependencies, etc.
   - Visa matchningsinformation för callActivities.

2. Skapa `src/pages/ProcessTreeDebug.tsx` med:
   - Visa ProcessTree som ett träd.
   - Visa sekvensordning (`orderIndex`, `branchId`, `scenarioPath`).
   - Visa artefakter per nod.

**Kriterier för klar:**
- Debug-vyer visar korrekt information.
- Användare kan navigera och inspektera modellerna.

**Tidsestimat:** 3-4 dagar

---

## Kritiska delar och ordning

### Kritiska delar (måste göras i rätt ordning):

1. **Steg 1 (Graf-lager) → Steg 2 (Sekvensflöden) → Steg 3 (bpmn-map.json) → Steg 4 (Rekursion) → Steg 5 (ProcessTree)**
   - Dessa steg är sekventiella eftersom varje steg bygger på föregående.

2. **Steg 3 (bpmn-map.json) måste göras före Steg 4 (Rekursion)**
   - Rekursionen behöver korrekta matchningar för att fungera.

3. **Steg 2 (Sekvensflöden) kan göras parallellt med Steg 3 (bpmn-map.json)**
   - Dessa är oberoende av varandra.

4. **Steg 6 (Process Explorer) måste göras efter Steg 5 (ProcessTree)**
   - Process Explorer behöver ProcessTree för att fungera.

5. **Steg 7 (Tester) och Steg 8 (Debug-vyer) kan göras parallellt**
   - Dessa är oberoende av varandra.

### Rekommenderad ordning:

**Fas 1: Grundläggande infrastruktur (vecka 1-2)**
- Steg 1: Klargör graflager och datatyper
- Steg 2: Implementera sekvensflödes-extraktion
- Steg 3: Implementera callActivity → file lookup via bpmn-map.json

**Fas 2: Graf och träd (vecka 3-4)**
- Steg 4: Implementera rekursion och cykelskydd
- Steg 5: Implementera ProcessTree builder

**Fas 3: Integration och testning (vecka 5-6)**
- Steg 6: Koppla modellerna till Process Explorer
- Steg 7: Lägg till tester
- Steg 8: Lägg till debug-vyer

**Total tidsestimat:** 6-8 veckor (beroende på teamstorlek och komplexitet)

---

## Sammanfattning

Detta dokument presenterar en omfattande analys av BPMN-Planner-projektet och detaljerade lösningsförslag för att bygga en robust, skalbar processmodell. Lösningen bygger på en tydlig separation mellan lager (Parser → Graph → Tree) och använder `bpmn-map.json` som primär källa för matchningar, med fuzzy matching som fallback. ProcessGraph fungerar som "single source of truth", och ProcessTree är en transformation från denna graf.

Genom att följa den stegvisa implementation-planen kan systemet byggas upp på ett kontrollerat sätt, med tydliga kriterier för varje steg och omfattande testning.





