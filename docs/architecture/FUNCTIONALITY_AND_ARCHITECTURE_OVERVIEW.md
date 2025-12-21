# Funktionalitet och Arkitektur - Översikt för BPMN Planner

**Skapad:** 2025-01-XX  
**Syfte:** Ge en komplett översikt över appens funktionalitet, logik och arkitektur innan testanalys

---

## 1. Appens Huvudsyfte

**BPMN Planner** är ett verktyg som:
- Tar BPMN-/DMN-filer som input
- Bygger en deterministisk processhierarki
- Visualiserar processen (diagram, strukturträd, listvy, timeline)
- Genererar dokumentation (Feature Goals, Epics, Business Rules)
- Genererar testunderlag (testscenarion, Playwright-testfiler)
- Skapar metadata (Jira-namn, DoR/DoD, dependencies)

---

## 2. Huvudfunktionalitet

### 2.1 BPMN-filhantering

**Funktionalitet:**
- Upload BPMN/DMN-filer till Supabase Storage
- Versioning (spåra versioner, välja specifik version)
- GitHub-synkronisering (sync från GitHub-repo)
- Filhantering (lista, ta bort, visa versioner)
- BPMN-diff (jämför versioner, identifiera ändringar)

**Komponenter:**
- `BpmnFileManager` - Huvudsida för filhantering
- `BpmnVersionHistoryPage` - Versionhistorik
- `BpmnDiffOverviewPage` - Diff-översikt
- `useBpmnFiles` - Hook för filhantering
- `useVersionControl` - Hook för versioning
- `useSyncFromGithub` - Hook för GitHub-synk

**Backend:**
- Supabase Storage (bpmn-files bucket)
- Edge Functions: `upload-bpmn-file`, `delete-bpmn-file`, `sync-bpmn-from-github`
- Tabeller: `bpmn_files`, `bpmn_file_versions`

### 2.2 Hierarki-byggnad

**Funktionalitet:**
- Bygga processhierarki från BPMN-filer
- Subprocess-matching (callActivity → subprocess-fil)
- BPMN-map hantering (automatisk generering, manuell redigering)
- Root-fil-detektion
- Missing dependencies-diagnostik
- Cykel-detektion

**Dataflöde:**
```
BPMN XML → BpmnParser → BpmnMeta
BpmnMeta → ProcessDefinition[]
ProcessDefinition[] → buildProcessHierarchy → (roots, processes, links, diagnostics)
buildBpmnProcessGraph → BpmnProcessGraph
BpmnProcessGraph → buildProcessTreeFromGraph → ProcessTreeNode
```

**Komponenter:**
- `buildProcessHierarchy` - Bygger hierarki från processdefinitioner
- `buildBpmnProcessGraph` - Bygger processgraf
- `buildProcessTreeFromGraph` - Bygger trädstruktur
- `SubprocessMatcher` - Matchar callActivities till subprocesser
- `bpmnMapAutoGenerator` - Genererar bpmn-map.json automatiskt
- `bpmnMapStorage` - Hanterar bpmn-map.json i storage

**Backend:**
- `bpmn-map.json` i Supabase Storage
- Tabeller: `bpmn_dependencies`, `bpmn_element_mappings`

### 2.3 Dokumentationsgenerering

**Funktionalitet:**
- Generera Feature Goals (callActivities/subprocesser)
- Generera Epics (userTasks, serviceTasks)
- Generera Business Rules (businessRuleTasks)
- Lokal generering (mallbaserad, utan LLM)
- LLM-generering (Claude/Ollama)
- Template versioning (v1/v2)
- Per-node overrides
- Combined file-level documentation (endast root-processer)

**Dataflöde:**
```
BpmnProcessGraph → generateAllFromBpmnWithGraph
→ För varje nod:
  → buildNodeDocumentationContext
  → renderFeatureGoalDoc / renderEpicDoc / renderBusinessRuleDoc
  → (med LLM: generateDocumentationWithLlm)
  → wrapLlmContentAsDocument
  → Spara till Supabase Storage
```

**Komponenter:**
- `generateAllFromBpmnWithGraph` - Huvudfunktion för generering
- `renderFeatureGoalDoc` - Feature Goal template
- `renderEpicDoc` - Epic template
- `renderBusinessRuleDoc` - Business Rule template
- `generateDocumentationWithLlm` - LLM-generering
- `documentationTemplates` - HTML-templates
- `nodeDocOverrides` - Per-node overrides

**Backend:**
- Supabase Storage (docs/...)
- Tabeller: `node_planned_scenarios` (sparar scenarion från dokumentation)

### 2.4 Testgenerering

**Funktionalitet:**
- Generera Playwright-testfiler
- Generera testscenarion (via LLM eller design-scenarion)
- Export-ready test scripts
- Test metadata (persona, riskLevel, etc.)

**Komponenter:**
- `generateTestSpecWithLlm` - LLM-generering av testscenarion
- `generateExportReadyTest` - Export-ready scripts
- `testGenerators` - Testfil-generering
- `testMapping` - Design-scenarion för lokal generering

**Backend:**
- Supabase Storage (tests/...)
- Tabeller: `node_planned_scenarios`, `node_test_links`

### 2.5 Visualisering

**Funktionalitet:**
- BPMN-diagram (bpmn-js viewer)
- Process Explorer (hierarkisk trädvy med D3)
- Node Matrix (listvy med filter och sortering)
- Timeline/Planning View (Gantt-chart)

**Komponenter:**
- `BpmnViewer` - BPMN-diagram viewer
- `ProcessExplorer` - Hierarkisk trädvy
- `NodeMatrix` - Listvy
- `TimelinePage` - Gantt-chart
- `ProcessTreeD3` - D3-baserad trädvisualisering

### 2.6 Dokumentationsvisning

**Funktionalitet:**
- Visa genererad dokumentation (Feature Goals, Epics, Business Rules)
- Version selection (v1/v2)
- Variant selection (local, chatgpt, ollama)
- Navigation mellan dokumentation

**Komponenter:**
- `DocViewer` - Huvudkomponent för dokumentationsvisning
- `getDocumentationUrl` - URL-generering
- `useDocVariantAvailability` - Hook för variant-tillgänglighet

### 2.7 Test Coverage och Quality Validation

**Funktionalitet:**
- Visualisera E2E test-täckning
- Validera test-scenarion mot BPMN
- Identifiera saknade komponenter
- Exportera till HTML/Excel

**Komponenter:**
- `TestCoverageExplorerPage` - Huvudsida för test coverage
- `E2eQualityValidationPage` - Quality validation
- `TestCoverageTable` - Coverage-tabell
- `useE2EScenarios` - Hook för E2E-scenarion

### 2.8 Metadata-hantering

**Funktionalitet:**
- Jira-namngivning (hierarkisk path-baserad)
- Jira-typer (feature-goal, epic)
- DoR/DoD-kriterier
- Jira-mappningar i databas

**Komponenter:**
- `buildJiraName` - Jira-namngivning
- `useBpmnMappings` - Hook för Jira-mappningar
- `useDorDodStatus` - Hook för DoR/DoD

**Backend:**
- Tabeller: `bpmn_element_mappings`, `dor_dod_criteria`

### 2.9 LLM-integration

**Funktionalitet:**
- Claude API (cloud)
- Ollama (local)
- Fallback-mekanismer
- LLM health checks
- LLM debug view

**Komponenter:**
- `cloudLlmClient` - Claude API client
- `localLlmClient` - Ollama client
- `llmClientAbstraction` - Abstraktion över LLM-clients
- `llmProviderResolver` - Provider resolution
- `llmFallback` - Fallback-mekanismer
- `LlmDebugView` - Debug view

**Backend:**
- Edge Functions: `llm-health`, `llm-events`

### 2.10 Versioning och Version Selection

**Funktionalitet:**
- Spåra BPMN-filversioner
- Välja specifik version för generering
- Version history
- Version hashes

**Komponenter:**
- `bpmnVersioning` - Versioning-logik
- `useVersionSelection` - Hook för version selection
- `VersionSelector` - UI-komponent
- `VersionHistoryDialog` - Version history dialog

**Backend:**
- Tabeller: `bpmn_file_versions`

---

## 3. UI-sidor och Routes

### 3.1 Publika Sidor

| Route | Komponent | Beskrivning |
|-------|-----------|-------------|
| `/` | `Index` | Huvudsida med BPMN-diagram |
| `/bpmn/:filename` | `Index` | BPMN-diagram för specifik fil |
| `/process-explorer` | `ProcessExplorer` | Hierarkisk trädvy |
| `/node-matrix` | `NodeMatrix` | Listvy med filter |
| `/test-report` | `TestReport` | Testrapport |
| `/test-scripts` | `TestScriptsPage` | Testscripts |
| `/node-tests` | `NodeTestsPage` | Nodspecifika tester |
| `/node-test-script` | `NodeTestScriptViewer` | Testscript-viewer |
| `/test-coverage` | `TestCoverageExplorerPage` | Test coverage-visualisering |
| `/e2e-quality-validation` | `E2eQualityValidationPage` | E2E quality validation |
| `/doc-viewer/:docId` | `DocViewer` | Dokumentationsvisning |
| `/styleguide` | `StyleGuidePage` | Style guide |
| `/auth` | `Auth` | Autentisering |

### 3.2 Skyddade Sidor (kräver inloggning)

| Route | Komponent | Beskrivning |
|-------|-----------|-------------|
| `/files` | `BpmnFileManager` | Filhantering och generering |
| `/bpmn-diff` | `BpmnDiffOverviewPage` | Diff-översikt |
| `/bpmn-versions/:fileName` | `BpmnVersionHistoryPage` | Versionhistorik |
| `/registry-status` | `RegistryStatus` | Registry status |
| `/llm-debug` | `LlmDebugView` | LLM debug view |
| `/graph-debug` | `ProcessGraphDebugPage` | Process graph debug |
| `/tree-debug` | `ProcessTreeDebugPage` | Process tree debug |
| `/jira-naming-debug` | `JiraNamingDebugPage` | Jira naming debug |
| `/timeline` | `TimelinePage` | Timeline/Planning view |
| `/configuration` | `ConfigurationPage` | Konfiguration |

---

## 4. Dataflöden

### 4.1 BPMN-fil → Dokumentation

```
1. Upload BPMN-fil → Supabase Storage
2. Parse BPMN → BpmnMeta
3. Build Hierarchy → ProcessDefinition[] → buildProcessHierarchy
4. Build Graph → BpmnProcessGraph
5. Build Tree → ProcessTreeNode
6. Generate Documentation → generateAllFromBpmnWithGraph
   → För varje nod:
     → buildNodeDocumentationContext
     → renderFeatureGoalDoc / renderEpicDoc / renderBusinessRuleDoc
     → (med LLM: generateDocumentationWithLlm)
     → wrapLlmContentAsDocument
     → Spara till Supabase Storage (docs/...)
```

### 4.2 BPMN-fil → Tester

```
1. Upload BPMN-fil → Supabase Storage
2. Parse BPMN → BpmnMeta
3. Build Hierarchy → ProcessDefinition[] → buildProcessHierarchy
4. Build Graph → BpmnProcessGraph
5. Build Tree → ProcessTreeNode
6. Generate Tests → generateAllFromBpmnWithGraph
   → generateTestSpecWithLlm (för scenarion)
   → generateExportReadyTest (för testfiler)
   → Spara till Supabase Storage (tests/...)
   → Spara scenarion till node_planned_scenarios
```

### 4.3 Hierarki-byggnad

```
1. Ladda alla BPMN-filer → parseBpmnFile (för varje fil)
2. Bygg ProcessDefinition[] → collectProcessDefinitionsFromMeta
3. Bygg hierarki → buildProcessHierarchy
   → SubprocessMatcher.matchCallActivityToProcesses
   → Skapa SubprocessLink[] med diagnostics
4. Bygg graf → buildBpmnProcessGraph
   → buildProcessModelFromDefinitions
   → convertProcessModelChildren
5. Bygg träd → buildProcessTreeFromGraph
   → Skapa ProcessTreeNode med hierarki
```

---

## 5. Viktiga Komponenter och Hooks

### 5.1 Hooks

**BPMN-hantering:**
- `useBpmnFiles` - Lista BPMN-filer
- `useBpmnParser` - Parse BPMN-filer
- `useProcessTree` - Bygg process tree
- `useProcessGraph` - Bygg process graph
- `useRootBpmnFile` - Välj root-fil
- `useAllBpmnNodes` - Hämta alla noder
- `useBpmnMappings` - Jira-mappningar

**Generering:**
- `useBpmnGenerator` - Generera dokumentation/tester
- `useGenerationJobs` - Job queue
- `useResetAndRegenerate` - Reset och regenerera

**Dokumentation:**
- `useDocVariantAvailability` - Variant-tillgänglighet
- `useFileArtifactCoverage` - Coverage-status
- `useFileArtifactStatus` - Artifact-status

**Tester:**
- `useNodePlannedScenarios` - Planerade scenarion
- `useNodeTestLinks` - Test-länkar
- `useTestResults` - Testresultat
- `useE2EScenarios` - E2E-scenarion

**Versioning:**
- `useVersionSelection` - Version selection
- `useVersionControl` - Version control
- `useDynamicBpmnFiles` - Dynamiska BPMN-filer

**Integrationer:**
- `useIntegrationChangeHandler` - Integration changes
- `useSyncFromGithub` - GitHub-synk

### 5.2 Komponenter

**UI-komponenter:**
- `AppHeaderWithTabs` - Huvudnavigering
- `BpmnViewer` - BPMN-diagram viewer
- `ProcessTreeD3` - D3-baserad trädvisualisering
- `NodeMatrix` - Listvy
- `DocViewer` - Dokumentationsvisning
- `GenerationDialog` - Genereringsdialog
- `RightPanel` - Höger panel med metadata

**Konfiguration:**
- `ConfigurationPage` - Konfiguration
- `ProjectConfigurationPage` - Projektkonfiguration
- `VersionSelector` - Version selector
- `VersionHistoryDialog` - Version history

---

## 6. Backend och Storage

### 6.1 Supabase Storage

**Buckets:**
- `bpmn-files` - BPMN/DMN-filer
  - `bpmn/` - BPMN-filer
  - `dmn/` - DMN-filer
  - `docs/` - Genererad dokumentation
    - `local/` - Lokal generering
    - `slow/chatgpt/` - Claude-generering
    - `slow/ollama/` - Ollama-generering
    - `feature-goals/` - Feature Goal-dokumentation
    - `nodes/` - Epic/Business Rule-dokumentation
  - `tests/` - Testfiler
  - `bpmn-map.json` - BPMN-map konfiguration

### 6.2 Supabase Tabeller

**BPMN-hantering:**
- `bpmn_files` - BPMN-filer
- `bpmn_file_versions` - Versioner
- `bpmn_dependencies` - Dependencies
- `bpmn_element_mappings` - Element-mappningar (Jira)

**Generering:**
- `generation_jobs` - Job queue
- `node_planned_scenarios` - Planerade scenarion
- `node_test_links` - Test-länkar

**Metadata:**
- `dor_dod_criteria` - DoR/DoD-kriterier
- `versions` - Versionshistorik

### 6.3 Edge Functions

| Function | Syfte | Används av |
|----------|-------|------------|
| `upload-bpmn-file` | Upload BPMN/DMN-fil till Storage och GitHub | BpmnFileManager |
| `delete-bpmn-file` | Ta bort BPMN-fil från Storage och GitHub | BpmnFileManager |
| `sync-bpmn-from-github` | Synka BPMN-filer från GitHub-repo | BpmnFileManager |
| `update-github-file` | Uppdatera fil i GitHub | BpmnFileManager |
| `generate-artifacts` | Generera dokumentation/tester (server-side) | BpmnFileManager (alternativ till client-side) |
| `build-process-tree` | Bygg process tree (server-side) | Process Explorer (alternativ till client-side) |
| `list-bpmn-files` | Lista BPMN-filer med usage stats | BpmnFileManager |
| `reset-generated-data` | Reset genererad data (dokumentation, tester, etc.) | BpmnFileManager |
| `llm-health` | LLM health check (Claude/Ollama) | useLlmHealth |
| `llm-events` | LLM events (för debug) | LlmDebugView |
| `submit-test-results` | Submit test results från Playwright | CI/CD |

---

## 7. Arkitektur och Design Patterns

### 7.1 Dataflöde

**Single Source of Truth:**
- BPMN-filer i Supabase Storage
- `bpmn-map.json` för subprocess-mappningar
- ProcessTree som grund för allt (dokumentation, tester, UI)

**Hierarki-modell:**
- En hierarki, många konsumenter
- ProcessTree används av:
  - UI (Process Explorer, Node Matrix, Timeline)
  - Dokumentationsgenerator
  - Testgenerator
  - Jira-namngivning
  - Test coverage

### 7.2 Design Patterns

**Hooks Pattern:**
- React hooks för state management
- Custom hooks för data fetching
- Query invalidation för cache

**Provider Pattern:**
- Context providers för global state
- `VersionSelectionProvider` - Version selection state
- `BpmnSelectionProvider` - BPMN selection state
- `IntegrationProvider` - Integration overrides (Stacc vs bank)
- `GlobalProjectConfigProvider` - Global projektkonfiguration
- `ProjectConfigurationProvider` - Projektkonfiguration (legacy?)

**Template Pattern:**
- Dokumentations-templates (v1/v2)
- LLM-mappers för JSON → HTML
- Fallback-mekanismer

---

## 8. Identifierade Områden som Behöver Dokumentation

### 8.1 Saknas eller Behöver Uppdateras

1. **Funktionalitetsöversikt** - ✅ Skapad (detta dokument)
2. **Arkitekturöversikt** - Delvis finns (`bpmn-hierarchy-architecture.md`)
3. **Dataflödesdiagram** - ✅ Skapad (`DATAFLOW_OVERVIEW.md`)
4. **Komponentöversikt** - Delvis finns (`guides/API_REFERENCE.md`)
5. **Hook-översikt** - Saknas
6. **Backend-översikt** - Delvis finns (migrations, functions)

### 8.2 Rekommenderade Förbättringar

1. **Skapa dataflödesdiagram** - Visualisera hur data flödar
2. **Uppdatera arkitekturöversikt** - Inkludera alla komponenter
3. **Skapa hook-översikt** - Dokumentera alla hooks
4. **Förbättra API Reference** - Inkludera alla komponenter
5. **Skapa backend-översikt** - Dokumentera tabeller och functions

---

## 9. Nästa Steg

### Omedelbart
1. ✅ Granska funktionalitetsöversikten
2. ⏳ Identifiera vad som saknas eller behöver uppdateras
3. ⏳ Prioritera dokumentationsförbättringar

### Kort sikt
1. Uppdatera testanalysen baserat på funktionalitetsöversikten
2. Skapa dataflödesdiagram
3. Förbättra arkitekturöversikten

### Lång sikt
1. Komplettera dokumentation för alla komponenter
2. Skapa interaktiva diagram
3. Förbättra onboarding-dokumentation
