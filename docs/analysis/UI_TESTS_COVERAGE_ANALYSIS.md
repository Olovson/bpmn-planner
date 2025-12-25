# UI-tester Coverage Analysis

## Översikt

Detta dokument analyserar vilka UI-tester (Playwright E2E-tester) som finns för BPMN Planner-applikationen och identifierar vad som saknas.

## Primära sidor/vyer i appen

Baserat på `src/App.tsx` och `src/components/AppHeaderWithTabs.tsx`:

1. **Index (diagram)** - BPMN-diagramvisning (`/`)
2. **Process Explorer (tree)** - Trädvisualisering (`/process-explorer`)
3. **Node Matrix (listvy)** - Listvy (`/node-matrix`)
4. **Timeline** - Gantt-chart (`/timeline`)
5. **Test Report** - Testrapporter (`/test-report`)
6. **Test Scripts** - Test scripts (`/test-scripts`)
7. **Node Tests** - Nod-tester (`/node-tests`)
8. **Test Coverage Explorer** - Test coverage (`/test-coverage`)
9. **E2E Quality Validation** - E2E kvalitetsvalidering (`/e2e-quality-validation`)
10. **E2E Tests Overview** - E2E tests översikt (`/e2e-tests-overview`)
11. **Files (BpmnFileManager)** - Filhantering (`/files`)
12. **Configuration** - Projektkonfiguration (`/configuration`)
13. **Doc Viewer** - Dokumentationsvisning (`/doc-viewer`)
14. **BPMN Diff** - Diff-analys (`/bpmn-diff`)
15. **BPMN Folder Diff** - Mapp-diff (`/bpmn-folder-diff`)
16. **BPMN Version History** - Versionshistorik (`/bpmn-versions/:fileName`)
17. **Registry Status** - Registry status (`/registry-status`)

## Befintliga tester

### ✅ Har tester

1. **`bpmn-file-manager.spec.ts`** - BpmnFileManager-sidan (filhantering, hierarki-byggnad, generering)
2. **`process-explorer.spec.ts`** - Process Explorer-sidan (trädvisualisering, nod-interaktion)
3. **`doc-viewer.spec.ts`** - Doc Viewer-sidan (dokumentationsvisning, länkar, version selection)
4. **`full-generation-flow.spec.ts`** - Komplett genereringsflöde (upload → hierarki → generering)
5. **`node-matrix.spec.ts`** - Node Matrix-sidan (listvy, filter, sortering)
6. **`timeline-page.spec.ts`** - Timeline-sidan (Gantt-chart, filter, datum-redigering)
7. **`test-coverage-explorer.spec.ts`** - Test Coverage Explorer-sidan
8. **`e2e-quality-validation.spec.ts`** - E2E Quality Validation-sidan
9. **`e2e-tests-overview.spec.ts`** - E2E Tests Overview-sidan
10. **`file-upload-versioning.spec.ts`** - Fil-upload och versioning
11. **`claude-generation.spec.ts`** - Claude-generering för application-processen
12. **Scenarios (happy-path)** - Olika mortgage-scenarier

### ❌ Saknar tester

1. **Index (diagram)** - BPMN-diagramvisning (`/`)
   - Verifiera att diagrammet laddas
   - Verifiera att element kan väljas
   - Verifiera att RightPanel visar korrekt information
   - Verifiera navigation mellan filer
   - Verifiera version selection

2. **Test Report** - Testrapporter (`/test-report`)
   - Verifiera att sidan laddas
   - Verifiera filter-funktionalitet
   - Verifiera att testresultat visas
   - Verifiera länkar till nod-tester

3. **Test Scripts** - Test scripts (`/test-scripts`)
   - Verifiera att sidan laddas
   - Verifiera att test scripts visas
   - Verifiera länkar till externa test scripts

4. **Node Tests** - Nod-tester (`/node-tests`)
   - Verifiera att sidan laddas med nodeId/bpmnFile/elementId
   - Verifiera att planerade scenarion visas
   - Verifiera att körda tester visas
   - Verifiera provider-filter

5. **Configuration** - Projektkonfiguration (`/configuration`)
   - Verifiera att sidan laddas
   - Verifiera att konfiguration kan redigeras
   - Verifiera att ändringar sparas

6. **BPMN Diff** - Diff-analys (`/bpmn-diff`)
   - Verifiera att sidan laddas
   - Verifiera att diff-resultat visas
   - Verifiera selektiv regenerering

7. **BPMN Folder Diff** - Mapp-diff (`/bpmn-folder-diff`)
   - Verifiera att sidan laddas
   - Verifiera att mapp-diff fungerar

8. **BPMN Version History** - Versionshistorik (`/bpmn-versions/:fileName`)
   - Verifiera att sidan laddas
   - Verifiera att versioner visas
   - Verifiera diff mellan versioner
   - Verifiera återställning till tidigare version

9. **Registry Status** - Registry status (`/registry-status`)
   - Verifiera att sidan laddas
   - Verifiera att registry-status visas
   - Verifiera att saknade element identifieras

## Prioritering

### Hög prioritet (kritisk funktionalitet)
1. Index (diagram) - Huvudvy för appen
2. Test Report - Viktig för testöversikt
3. Node Tests - Viktig för nodspecifik testinformation

### Medel prioritet (viktig funktionalitet)
4. Test Scripts - Viktig för test script-översikt
5. Configuration - Viktig för projektkonfiguration
6. BPMN Diff - Viktig för diff-analys

### Låg prioritet (stödfunktionalitet)
7. BPMN Folder Diff - Stödfunktionalitet
8. BPMN Version History - Stödfunktionalitet
9. Registry Status - Debug/information

## Nästa steg

1. Skapa tester för alla saknade sidor
2. Uppdatera `tests/playwright-e2e/README.md` med nya tester
3. Verifiera att alla tester körs korrekt

