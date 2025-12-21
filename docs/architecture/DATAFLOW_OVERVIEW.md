# Dataflödesöversikt för BPMN Planner

**Skapad:** 2025-01-XX  
**Syfte:** Visualisera och dokumentera hur data flödar genom applikationen

> 📋 **Relaterade dokument:**
> - [`FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](./FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md) - Komplett funktionalitetsöversikt
> - [`bpmn-hierarchy-architecture.md`](./bpmn-hierarchy-architecture.md) - Detaljerad hierarki-arkitektur

---

## 1. Huvuddataflöden

### 1.1 BPMN-fil → Dokumentation

```
┌─────────────────┐
│  BPMN-fil       │ (XML i Supabase Storage)
│  (mortgage.bpmn)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  BpmnParser     │ parseBpmnFile()
│  → BpmnMeta    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ProcessDefinition[] │ collectProcessDefinitionsFromMeta()
│  (per fil)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  buildProcessHierarchy() │
│  → (roots, processes, links, diagnostics) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  buildBpmnProcessGraph() │
│  → BpmnProcessGraph │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  buildProcessTreeFromGraph() │
│  → ProcessTreeNode │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  generateAllFromBpmnWithGraph() │
│  För varje nod: │
│  ├─ buildNodeDocumentationContext() │
│  ├─ renderFeatureGoalDoc() / renderEpicDoc() / renderBusinessRuleDoc() │
│  ├─ (med LLM: generateDocumentationWithLlm()) │
│  └─ wrapLlmContentAsDocument() │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Storage │
│  docs/...       │
│  (HTML-filer)   │
└─────────────────┘
```

**Viktiga steg:**
1. **Parse** - XML → BpmnMeta (metadata om processer, noder, flöden)
2. **Build Hierarchy** - ProcessDefinition[] → hierarki med subprocess-länkar
3. **Build Graph** - Hierarki → BpmnProcessGraph (grafstruktur)
4. **Build Tree** - Graph → ProcessTreeNode (trädstruktur för UI)
5. **Generate** - För varje nod: bygg kontext → renderera template → (LLM) → spara

### 1.2 BPMN-fil → Tester

```
┌─────────────────┐
│  BPMN-fil       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  (Samma pipeline som dokumentation) │
│  Parse → Hierarchy → Graph → Tree │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  generateAllFromBpmnWithGraph() │
│  För varje nod: │
│  ├─ generateTestSpecWithLlm() │ (för scenarion)
│  ├─ generateExportReadyTest() │ (för testfiler)
│  └─ Spara scenarion till node_planned_scenarios │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Storage │
│  tests/...       │
│  (.spec.ts)      │
└─────────────────┘
```

**Viktiga steg:**
1. **Samma hierarki-byggnad** som dokumentation
2. **Generate Tests** - För varje nod: generera testscenarion och testfiler
3. **Save** - Spara till Storage och databas

### 1.3 Hierarki-byggnad (Detaljerat)

```
┌─────────────────┐
│  BPMN-filer     │ (flera filer)
│  (mortgage.bpmn,│
│   mortgage-se-  │
│   application...)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  För varje fil:  │
│  parseBpmnFile() │
│  → BpmnMeta     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  collectProcessDefinitionsFromMeta() │
│  → ProcessDefinition[] │
│  (en per process i filen) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  buildProcessHierarchy() │
│  ├─ SubprocessMatcher.matchCallActivityToProcesses() │
│  ├─ Skapa SubprocessLink[] med diagnostics │
│  └─ Identifiera roots │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  buildBpmnProcessGraph() │
│  ├─ buildProcessModelFromDefinitions() │
│  ├─ convertProcessModelChildren() │
│  └─ Skapa BpmnProcessGraph │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  buildProcessTreeFromGraph() │
│  → ProcessTreeNode │
│  (hierarkisk trädstruktur) │
└─────────────────┘
```

**Viktiga komponenter:**
- **SubprocessMatcher** - Matchar callActivities till subprocess-filer
- **bpmn-map.json** - Konfiguration för subprocess-mappningar
- **Diagnostics** - Information om matchningar (confidence, warnings, errors)

---

## 2. UI Dataflöden

### 2.1 Process Explorer

```
┌─────────────────┐
│  useProcessTree() │
│  (React hook)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  buildClientProcessTree() │
│  ├─ Ladda BPMN-filer från Storage │
│  ├─ Parse → Hierarchy → Graph → Tree │
│  └─ Returnera ProcessTreeNode │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ProcessExplorer │
│  (React component) │
│  ├─ ProcessTreeD3 (D3-visualisering) │
│  └─ Renderar träd │
└─────────────────┘
```

### 2.2 Node Matrix

```
┌─────────────────┐
│  useAllBpmnNodes() │
│  (React hook)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ladda ProcessTree │
│  → Flattena till lista │
│  → Sortera och filtrera │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NodeMatrix     │
│  (React component) │
│  ├─ Tabell med noder │
│  ├─ Filter och sortering │
│  └─ Länkar till dokumentation │
└─────────────────┘
```

### 2.3 Doc Viewer

```
┌─────────────────┐
│  URL: /doc-viewer/:docId │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DocViewer      │
│  (React component) │
│  ├─ Parse docId │
│  ├─ Bestäm variant (local/chatgpt/ollama) │
│  ├─ Bestäm version (v1/v2) │
│  └─ Ladda HTML från Storage │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Storage │
│  docs/...       │
│  (HTML-filer)   │
└─────────────────┘
```

### 2.4 Generation Dialog

```
┌─────────────────┐
│  BpmnFileManager │
│  handleGenerateArtifacts() │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  generateAllFromBpmnWithGraph() │
│  ├─ Progress callback │
│  ├─ För varje nod: │
│  │  ├─ Uppdatera progress │
│  │  └─ Generera dokumentation │
│  └─ Returnera resultat │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GenerationDialog │
│  (React component) │
│  ├─ Visar progress │
│  ├─ Visar steg │
│  └─ Visar resultat │
└─────────────────┘
```

---

## 3. Backend Dataflöden

### 3.1 Edge Function: generate-artifacts

```
┌─────────────────┐
│  POST /generate-artifacts │
│  (Edge Function) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ladda BPMN-filer från Storage │
│  → Parse → Hierarchy → Graph │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  generateAllFromBpmnWithGraph() │
│  (samma som client-side) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Spara till Storage │
│  docs/...       │
└─────────────────┘
```

### 3.2 Edge Function: upload-bpmn-file

```
┌─────────────────┐
│  POST /upload-bpmn-file │
│  (FormData med fil) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validera fil   │
│  (.bpmn eller .dmn) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse BPMN     │
│  → Extrahera metadata │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Upload till Storage │
│  bpmn-files/... │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sync till GitHub │
│  (om konfigurerat) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Spara metadata till DB │
│  bpmn_files, bpmn_file_versions │
└─────────────────┘
```

### 3.3 Edge Function: reset-generated-data

```
┌─────────────────┐
│  POST /reset-generated-data │
│  (Options: deleteDocs, deleteTests, etc.) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  För varje option: │
│  ├─ Ta bort från Storage │
│  ├─ Ta bort från DB │
│  └─ Rensa cache │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Returnera resultat │
└─────────────────┘
```

---

## 4. State Management

### 4.1 React Query (Data Fetching)

```
┌─────────────────┐
│  useBpmnFiles() │
│  (React Query hook) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query: bpmn_files │
│  ├─ Cache │
│  ├─ Invalidation │
│  └─ Refetch │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Client │
│  .from('bpmn_files') │
└─────────────────┘
```

### 4.2 Context Providers (Global State)

```
┌─────────────────┐
│  VersionSelectionProvider │
│  ├─ selectedVersion │
│  └─ setSelectedVersion() │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  BpmnSelectionProvider │
│  ├─ selectedBpmnFile │
│  └─ setSelectedBpmnFile() │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IntegrationProvider │
│  ├─ integrationStates │
│  └─ setUseStaccIntegration() │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GlobalProjectConfigProvider │
│  ├─ config │
│  └─ saveConfig() │
└─────────────────┘
```

---

## 5. Data Storage

### 5.1 Supabase Storage (Filer)

```
bpmn-files/
├── bpmn/
│   ├── mortgage.bpmn
│   ├── mortgage-se-application.bpmn
│   └── ...
├── dmn/
│   └── ...
├── docs/
│   ├── local/
│   │   └── mortgage.bpmn/
│   │       └── <version-hash>/
│   │           ├── feature-goals/
│   │           └── nodes/
│   ├── slow/
│   │   ├── chatgpt/
│   │   └── ollama/
│   └── ...
├── tests/
│   └── ...
└── bpmn-map.json
```

### 5.2 Supabase Database (Metadata)

```
bpmn_files
├── file_name
├── version_hash
└── ...

bpmn_file_versions
├── file_name
├── version_hash
├── content_hash
└── ...

bpmn_element_mappings
├── bpmn_file
├── element_id
├── jira_type
├── jira_name
└── ...

node_planned_scenarios
├── bpmn_file
├── element_id
├── provider
├── scenario_name
└── ...

generation_jobs
├── id
├── bpmn_file
├── mode
├── status
└── ...
```

---

## 6. Viktiga Data Transformationer

### 6.1 XML → BpmnMeta

**Input:** BPMN XML  
**Output:** BpmnMeta (normaliserad metadata)

**Transformation:**
- Parse XML med bpmn-js
- Extrahera processer, noder, flöden
- Normalisera till BpmnMeta-format

### 6.2 BpmnMeta → ProcessDefinition[]

**Input:** BpmnMeta  
**Output:** ProcessDefinition[] (en per process)

**Transformation:**
- Skapa ProcessDefinition för varje process
- Extrahera callActivities, tasks
- Behåll parseDiagnostics

### 6.3 ProcessDefinition[] → BpmnProcessGraph

**Input:** ProcessDefinition[]  
**Output:** BpmnProcessGraph (grafstruktur)

**Transformation:**
- Bygg process model
- Matcha subprocesser (callActivity → subprocess-fil)
- Skapa graf med länkar

### 6.4 BpmnProcessGraph → ProcessTreeNode

**Input:** BpmnProcessGraph  
**Output:** ProcessTreeNode (trädstruktur)

**Transformation:**
- Bygg hierarkisk trädstruktur
- Flattena subprocesser (om önskat)
- Sortera noder (orderIndex, visualOrderIndex)

---

## 7. Caching och Performance

### 7.1 React Query Cache

- **BPMN-filer** - Cachas per fil
- **Process Tree** - Cachas per root-fil
- **Artifact Availability** - Cachas per fil/version

### 7.2 bpmn-map.json Caching

- **Debouncing** - Förhindra flera samtidiga laddningar
- **lastLoadPromise** - Cache av senaste laddning
- **Error handling** - Graceful fallback om laddning misslyckas

### 7.3 Version Selection

- **Version hash** - Unik identifierare per version
- **Version selection** - Välj specifik version för generering
- **Fallback** - Använd current version om version saknas

---

## 8. Error Handling och Fallbacks

### 8.1 LLM Fallbacks

```
Claude API (cloud)
    │
    ├─ Success → Använd resultat
    │
    └─ Failure → Fallback till Ollama (local)
                    │
                    ├─ Success → Använd resultat
                    │
                    └─ Failure → Fallback till Local Template
                                    │
                                    └─ Använd mallbaserad generering
```

### 8.2 Document Loading Fallbacks

```
Försök ladda dokumentation:
1. Specifik variant (local/chatgpt/ollama)
2. Specifik version (v1/v2)
3. Fallback till annan variant
4. Fallback till annan version
5. Visa felmeddelande
```

### 8.3 Subprocess Matching Fallbacks

```
Match callActivity till subprocess:
1. Exact match (calledElement === processId)
2. Name-based match (confidence score)
3. Low confidence match (warning)
4. No match (error, unresolved)
```

---

## 9. Nästa Steg

### Förbättringar

1. **Visualisera dataflöden** - Skapa interaktiva diagram
2. **Dokumentera edge cases** - Vad händer vid fel?
3. **Performance-optimering** - Identifiera flaskhalsar
4. **Caching-strategier** - Förbättra cache-hantering

### Verktyg

- **Mermaid** - För att skapa diagram i markdown
- **PlantUML** - För mer avancerade diagram
- **Draw.io** - För interaktiva diagram
