# BPMN Hierarchy – Architecture & Implementation Overview

## 1. Background

Applikationen låter användare ladda upp en eller flera BPMN‑filer. Utifrån dessa behöver vi bygga en **sammanhängande, rekursiv processhierarki** där:

- Call Activities i en process länkas till subprocess‑definitioner i samma eller andra filer.
- Original‑XML för BPMN ändras aldrig.
- Hierarkin används som grund för:
  - dokumentationsgenerering (Feature Goals, Epics, Business Rules),
  - testgenerering,
  - subprocess‑sync och diagnostik i UI.

Denna fil beskriver **hur hierarkin faktiskt är implementerad idag** – inte längre bara en target‑plan.

---

## 2. Översikt över implementationen

Hierarkikedjan kan förenklas till:

1. **XML → BpmnParser → BpmnMeta**
2. **BpmnMeta → ProcessDefinition[]**
3. **ProcessDefinition[] → buildProcessHierarchy → (roots, processes, links, diagnostics)**
4. **buildBpmnProcessGraph → BpmnProcessGraph**
5. **pickRootBpmnFile → välj “entry file” för UI**

Viktiga filer:

- Parser & meta:
  - `src/lib/bpmnParser.ts`
  - `src/types/bpmnMeta.ts`
  - `src/lib/bpmn/processDefinition.ts`
- Hierarkimotor:
  - `src/lib/bpmn/types.ts`
  - `src/lib/bpmn/SubprocessMatcher.ts`
  - `src/lib/bpmn/buildProcessHierarchy.ts`
- Processgraf för resten av appen:
  - `src/lib/bpmnProcessGraph.ts`
- Root‑val i UI:
  - `src/hooks/useRootBpmnFile.ts`

Utöver själva grafen används hierarkin också för att:

- skapa hierarkiska testfiler (Playwright) med kontextspårning,
- seeda tabellen `node_planned_scenarios` med bas‑scenarion per nod/provider (`local-fallback`),
- mata testrapportvyerna med coverage‑data per nod.

---

## 3. Datamodeller

### 3.1 BpmnMeta (parser‑output)

`BpmnParser` (`src/lib/bpmnParser.ts`) använder `bpmn-js` för att läsa XML och bygger ett normaliserat metadataobjekt (`BpmnMeta`, se `src/types/bpmnMeta.ts`) med bl.a.:

- `processId`, `name`
- `processes`: lista över alla `<process>` i filen
  - `id`, `name`
  - `callActivities` (id, name, calledElement) – idag baserat på `<bpmn:callActivity>`
  - `tasks` (id, name, type – UserTask, ServiceTask, BusinessRuleTask, …)
  - `parseDiagnostics`
- `callActivities` och `tasks` på filnivå (fallback).

### 3.2 ProcessDefinition

`collectProcessDefinitionsFromMeta` (`src/lib/bpmn/processDefinition.ts`) omvandlar `BpmnMeta` till den typ som hierarkimotorn använder:

```ts
export type ProcessDefinition = {
  id: string;
  name?: string;
  fileName: string;
  storagePath?: string;
  callActivities: Array<{
    id: string;
    name?: string;
    calledElement?: string;
  }>;
  tasks: Array<{
    id: string;
    name?: string;
    type?: string;
  }>;
  parseDiagnostics?: DiagnosticsEntry[];
};
```

Om `meta.processes` är tom används `meta.processId` + `meta.callActivities`/`meta.tasks` som fallback, så varje BPMN‑fil alltid ger minst en `ProcessDefinition`.

### 3.3 SubprocessLink & DiagnosticsEntry

Länk mellan Call Activity och kandidat‑subprocess:

```ts
export type DiagnosticsEntry = {
  severity: 'info' | 'warning' | 'error';
  code: string;              // t.ex. NO_MATCH, AMBIGUOUS_MATCH, LOW_CONFIDENCE_MATCH, CYCLE_DETECTED, NO_ROOT_DETECTED
  message: string;           // mänskligt läsbar text
  context?: Record<string, unknown>;
  timestamp: string;         // ISO‑tid
};

export type SubprocessLink = {
  callActivityId: string;
  callActivityName?: string;
  calledElement?: string;
  matchedProcessId?: string;
  matchedFileName?: string;
  matchStatus: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
  confidence: number;        // 0–1
  candidates: MatchCandidate[];
  diagnostics: DiagnosticsEntry[];
};
```

### 3.4 HierarchyNode

Intern representation av processhierarkin innan vi bygger en “graf”:

```ts
export type HierarchyNode = {
  nodeId: string;  // intern process-id eller "procId:callActivityId"
  bpmnType: 'process' | 'callActivity' | 'task' | 'userTask' |
            'serviceTask' | 'businessRuleTask' | 'gateway' | 'event' | 'group';
  displayName: string;
  processId?: string;        // för process‑noder
  parentId?: string;
  children: HierarchyNode[];
  link?: SubprocessLink;     // endast för Call Activities
  diagnostics?: DiagnosticsEntry[];
};
```

### 3.5 BpmnProcessGraph & BpmnProcessNode

Den representation som resten av appen använder (docs/testgenerering etc.) (`src/lib/bpmnProcessGraph.ts`):

```ts
export interface BpmnProcessNode {
  id: string;              // t.ex. "mortgage.bpmn:Task_1"
  name: string;
  type: BpmnNodeType;      // process, callActivity, userTask, ...
  bpmnFile: string;
  bpmnElementId: string;
  children: BpmnProcessNode[];
  element?: BpmnElement;   // bpmn-js element
  missingDefinition?: boolean;
  subprocessFile?: string;
  subprocessMatchStatus?: string;
  subprocessDiagnostics?: string[];
}

export interface BpmnProcessGraph {
  rootFile: string;
  root: BpmnProcessNode;
  allNodes: Map<string, BpmnProcessNode>;
  fileNodes: Map<string, BpmnProcessNode[]>;
  missingDependencies: { parent: string; childProcess: string }[];
}
```

---

## 4. Matchingstrategi & hierarkibyggnad

### 4.1 SubprocessMatcher – matchning av Call Activities

`matchCallActivityToProcesses` (`src/lib/bpmn/SubprocessMatcher.ts`) tar:

- Call Activity: `{ id, name?, calledElement? }`
- Lista av `ProcessDefinition`‑kandidater

och räknar fram en score per kandidat baserat på:

1. **Deterministiska träffar**
   - `calledElement === candidate.id` → högsta score.
   - `calledElement === candidate.name`.
   - `callActivity.id === candidate.id`.
   - `callActivity.name === candidate.name`.
2. **Filnamnsheuristik**
   - jämför callActivity‑namn/calledElement med filnamn/filbas (`mortgage-se-application` osv).
3. **Fuzzy‑matchning**
   - Dice‑koefficient på normaliserade strängar (namn/id/filbas).

Status sätts till:

- `'matched'` – bra träff, över fuzzy‑tröskel och tydligt bättre än tvåan.
- `'ambiguous'` – flera kandidater med liknande score.
- `'lowConfidence'` – bästa kandidat över 0 men under fuzzy‑tröskel.
- `'unresolved'` – ingen kandidat matchar.

Varje match får diagnostik (`DiagnosticsEntry`) med kod som `NO_MATCH`, `AMBIGUOUS_MATCH`, `LOW_CONFIDENCE_MATCH` osv.

### 4.2 buildProcessHierarchy

`buildProcessHierarchy` (`src/lib/bpmn/buildProcessHierarchy.ts`) tar en lista `ProcessDefinition[]` och (valfritt) `preferredRootProcessIds`, och returnerar:

- `processes: Map<string, NormalizedProcessDefinition>` – interna process‑ID:n (med deduplikerade IDs via suffix `__2`, `__3`, …).
- `links: Map<string, SubprocessLink>` – keys `"<procInternalId>:<callActivityId>"`.
- `roots: HierarchyNode[]` – processnoder på toppnivå.
- `diagnostics: DiagnosticsEntry[]`.

För varje process:

1. Initialiseras `indegree`‑ och `adjacency`‑mappar baserat på lyckade länkar (matchStatus `'matched'`).
2. Roots väljs som de processer som inte har inkommande edges (indegree 0):
   - `preferredRootProcessIds` kan styra ordningen, men om en “preferred” inte är root behålls ändå verkliga roots.
3. För varje callActivity skapas en `HierarchyNode` med `bpmnType: 'callActivity'` + `link`.
   - Om `link.matchStatus === 'matched'` och ingen cykel → lägg in child process som child‑nod.
   - Om cykel → diagnostik `CYCLE_DETECTED`, och call‑noden får diagnostik men ingen ytterligare rekursion.
4. Tasks läggs in som barn‑noder (userTask/serviceTask/businessRuleTask/task).
5. Om inga roots kan hittas (alla har indegree > 0) väljs ändå en fallback‑root och diagnostik `NO_ROOT_DETECTED` läggs till.

Det här steget är **ren in‑memory logik** – ingen fetch/Supabase här.

### 4.3 buildBpmnProcessGraph

`buildBpmnProcessGraph(rootFile, existingBpmnFiles)` (`src/lib/bpmnProcessGraph.ts`):

1. Använder `parseBpmnFile` på alla filer i `existingBpmnFiles` (med cache).
2. Bygger `ProcessDefinition[]` via `collectProcessDefinitionsFromMeta`.
3. Kör `buildProcessModelFromDefinitions` (som internt använder `buildProcessHierarchy`) med `preferredRootFile = rootFile`.
4. Väljer root‑process (helst den som tillhör `rootFile`, annars första root).
5. Bygger en element‑index (`elementsByFile`) från `BpmnParseResult`.
6. Konverterar `ProcessModel` till en `BpmnProcessNode`‑graf:
   - Processnoder → `type: 'process'`, `bpmnFile = filnamn`, `bpmnElementId = processId`.
   - Call Activities → `type: 'callActivity'`, `subprocessFile` (upplöst via subprocess‑edge), `subprocessMatchStatus`, `missingDefinition`.
   - Task‑noder → `type: 'userTask' | 'serviceTask' | 'businessRuleTask'`.
7. Fyller `missingDependencies` när en Call Activity saknar matchad subprocessfil eller fått `matchStatus !== 'matched'`:

```ts
missingDependencies.push({
  parent: currentFile,
  childProcess: node.name, // t.ex. "Stakeholder", "Object", "Household"
});
```

För att undvika stack‑overflow på komplexa/loopiga processer använder `buildBpmnProcessGraph`
en **iterativ** traversal när `assignExecutionOrder` räknar ut `orderIndex`/`scenarioPath`
per nod, med ett begränsat antal besök per nod/branch.

Grafen används sedan i:

- dokumentationsgenerering,
- testgenerering,
- diagnostik (missingDependencies i UI),
- subprocess‑sync‑steget i pipelines.

---

## 5. Root‑val i UI (`pickRootBpmnFile`)

`useRootBpmnFile` (`src/hooks/useRootBpmnFile.ts`) hämtar BPMN‑filer och dependencies från Supabase och använder `pickRootBpmnFile` för att välja “root‑fil”:

```ts
export function pickRootBpmnFile(
  allFiles: { file_name: string }[] = [],
  dependencies: { parent_file: string; child_file?: string | null }[] = [],
): string | null {
  if (!allFiles.length) return null;

  const mortgageExists = allFiles.some((f) => f.file_name === 'mortgage.bpmn');
  const findPreferredRootFile = (candidates: string[]): string | undefined => {
    const patterns = [
      /(^|-)application\.bpmn$/i,
      /(^|-)main\.bpmn$/i,
      /(^|-)root\.bpmn$/i,
    ];
    for (const pattern of patterns) {
      const match = candidates.find((name) => pattern.test(name));
      if (match) return match;
    }
    return undefined;
  };

  if (!dependencies || dependencies.length === 0) {
    if (mortgageExists) return 'mortgage.bpmn';
    const preferred = findPreferredRootFile(allFiles.map((f) => f.file_name));
    return preferred ?? allFiles[0].file_name;
  }

  const parentFiles = new Set(dependencies.map((d) => d.parent_file));
  const childFiles = new Set(
    dependencies.map((d) => d.child_file).filter(Boolean) as string[],
  );

  const rootFiles = Array.from(parentFiles).filter((parent) => !childFiles.has(parent));
  if (rootFiles.length > 0) {
    const mortgageRoot = rootFiles.find((r) => r === 'mortgage.bpmn');
    if (mortgageRoot) return mortgageRoot;
    const preferredRoot = findPreferredRootFile(rootFiles);
    return preferredRoot ?? rootFiles[0];
  }

  return mortgageExists ? 'mortgage.bpmn' : allFiles[0].file_name;
}
```

Detta gör att vi t.ex. för mortgage‑caset med endast:

- `mortgage-se-application.bpmn`
- `mortgage-se-internal-data-gathering.bpmn`

väljer `mortgage-se-application.bpmn` som root, oavsett i vilken ordning Supabase returnerar filerna.

---

## 6. Diagnostik & hur den används

Under hierarki‑ och grafbygge fylls diagnostik på flera nivåer:

- `SubprocessLink.diagnostics` – per Call Activity:
  - `NO_MATCH` – ingen subprocess hittades.
  - `AMBIGUOUS_MATCH` – flera kandidater matchade nästan lika bra.
  - `LOW_CONFIDENCE_MATCH` – bästa kandidat under tröskel.
- `buildProcessHierarchy.diagnostics` – globala problem:
  - `CYCLE_DETECTED` – process A/B/C refererar varandra cirkulärt.
  - `NO_ROOT_DETECTED` – alla processer har inkommande edges; en fallback‑root valdes.
  - `PROCESS_ASSIGNMENT_FAILED` (från parser) – Call Activity kunde inte kopplas till en specifik process.
- `BpmnProcessGraph.missingDependencies` – för subprocesser som:
  - saknar matchad process,
  - eller har matchStatus ≠ `'matched'`,
  - används i UI för t.ex. röd banner “ofullständig subprocess‑täckning”.

Diagnostik exponeras i:

- UI (Node Matrix, banners, m.m.),
- pipelines (loggar vid subprocess‑sync),
- tester (t.ex. `buildProcessHierarchy.test.ts`, `bpmnHierarchy.integration.test.ts`).

---

## 7. Teststrategi & fixtures

För att undvika regressions och falsk trygghet används både syntetiska och verkliga fixtures:

- **Syntetiska fixtures** (`tests/unit/...`):
  - Enkel process, process + subprocess, saknad subprocess, cykler, multi‑roots, reused subprocesses, mortgage‑lik multi‑fil‑kedja.
  - Testar direkt `buildProcessHierarchy`, `SubprocessMatcher`, `pickRootBpmnFile`, `createGraphSummary`.

- **Verkliga BPMN‑fixtures** (`tests/fixtures/bpmn/...` + `tests/integration/...`):
  - `simple-process.bpmn`
  - `process-with-subprocess.bpmn`
  - `process-with-missing-subprocess.bpmn`
  - `mortgage-se-application.bpmn`
  - `mortgage-se-internal-data-gathering.bpmn`

  Används i t.ex.:

  - `tests/integration/bpmnParser.real.test.ts` – verklig `BpmnParser` + jsdom.
  - `tests/integration/bpmnRealParse.mortgage.test.ts` – real XML‑struktur för mortgage‑processer.
  - `tests/integration/bpmnProcessGraph.mortgage.integration.test.ts` – real parse → `buildBpmnProcessGraph` → graf‑asserts (root, callActivities, missingDependencies).

LLM‑lager (`generateDocumentationWithLlm`) ligger **ovanpå** grafen och är avstängt i tester som rör hierarki/graf, så hierarkilogiken kan testas snabbt och deterministiskt utan nätverksanrop.  
Eventuella riktiga LLM‑smoke‑tester körs separat via `npm run test:llm:smoke` och använder samma graf som input. 
