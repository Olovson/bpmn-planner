# Funktionalitet + Arkitektur – översikt

Detta dokument kopplar **funktioner i produkten** till **de arkitekturdelar som faktiskt driver dem**.

## Filhantering (BPMN/DMN)

**Funktion:** lista, ladda upp, ta bort, versionera.

- UI: `src/pages/BpmnFileManager.tsx`
- Hooks: `src/hooks/useBpmnFiles.ts`, `useUploadBpmnFile`, `useDeleteBpmnFile`
- Storage: Supabase bucket `bpmn-files`
- DB: tabell `bpmn_files`, `bpmn_file_versions`
- Edge functions: `list-bpmn-files`, `upload-bpmn-file`, `delete-bpmn-file`

## BPMN‑graf och hierarki

**Funktion:** bygga process‑graf, visa struktur i UI, stödja generering/coverage.

- Graf: `src/lib/bpmnProcessGraph.ts`
- Processmodel: `src/lib/bpmn/buildProcessModel.ts`, `src/lib/bpmn/processDefinition.ts`
- Map‑stöd: `src/lib/bpmn/bpmnMapStorage.ts`, `src/lib/bpmn/bpmnMapLoader.ts`
- UI‑vyer: `src/pages/ProcessExplorer.tsx`, `src/pages/ProcessGraphDebug.tsx`, `src/pages/ProcessTreeDebug.tsx`

## Dokumentationsgenerering

**Funktion:** skapa epics/feature goals‑dokumentation per nod och per fil.

- Orkestrering: `src/lib/bpmnGenerators.ts`
- Rendering: `src/lib/documentationTemplates.ts`, `src/lib/bpmnGenerators/docRendering.ts`
- Storage‑paths: `src/lib/artifactPaths.ts`
- UI: Doc Viewer (`src/pages/DocViewer.tsx`)

## Testgenerering & coverage

**Funktion:** E2E‑scenarier, test‑stommar, coverage‑vy.

- Generering: `src/lib/bpmnGenerators.ts`, `src/lib/bpmnGenerators/scenarioBuilders.ts`
- Testmapping: `src/data/testMapping.ts`
- Coverage‑hooks: `src/hooks/useFileArtifactCoverage.ts`, `src/hooks/useFileArtifactStatus.ts`
- UI‑vyer: `src/pages/TestCoverageExplorerPage.tsx`, `src/pages/E2eTestsOverviewPage.tsx`

## BPMN‑diff och versioner

**Funktion:** jämföra lokala ändringar, visa historik.

- Diff: `src/lib/bpmnDiff.ts`, `src/lib/bpmnDiffRegeneration.ts`
- UI: `src/pages/BpmnDiffOverviewPage.tsx`, `src/pages/BpmnFolderDiffPage.tsx`
- Versioner: `src/pages/BpmnVersionHistoryPage.tsx`, `src/lib/bpmnVersioning.ts`

## LLM‑integration

**Funktion:** generera text, analysera test‑scenarier, quality‑check.

- Client: `src/lib/llmClients/*`, `src/lib/llmDocumentation.ts`, `src/lib/llmTests.ts`
- Health check: `supabase/functions/llm-health`
- Loggning: tabell `llm_generation_logs`, debug‑artefakter i storage

## Övriga vyer

- Timeline/Gantt: `src/pages/TimelinePage.tsx` + `src/lib/ganttDataConverter.ts`
- Jira naming debug: `src/pages/JiraNamingDebug.tsx`, `src/lib/jiraNaming.ts`
- Registry status: `src/pages/RegistryStatus.tsx`

