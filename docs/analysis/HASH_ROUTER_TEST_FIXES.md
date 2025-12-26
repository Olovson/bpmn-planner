# HashRouter Test Fixes - Implementerade

## Problem

Playwright-tester navigerade till `/files` istället för `/#/files`, vilket inte fungerar i HashRouter.

## Fixar implementerade

1. **`stepLogin`** - Uppdaterad att navigera till `/#/files` istället för `/files`
2. **`stepNavigateToFiles`** - Uppdaterad att navigera till `/#/files`
3. **`stepNavigateToProcessExplorer`** - Uppdaterad att navigera till `/#/process-explorer`
4. **`stepNavigateToTestReport`** - Uppdaterad att navigera till `/#/test-report`
5. **`stepNavigateToTestCoverage`** - Uppdaterad att navigera till `/#/test-coverage`
6. **`stepNavigateToNodeMatrix`** - Uppdaterad att navigera till `/#/node-matrix`
7. **`stepNavigateToDocViewer`** - Uppdaterad att navigera till `/#/doc-viewer/...`
8. **`testHelpers.ts`** - Uppdaterad att navigera till `/#/files`
9. **`testCleanup.ts`** - Uppdaterad att navigera till `/#/files`

## Status

- ✅ Login fungerar nu korrekt - vi ser "✅ [stepLogin] Login verified! Current URL: http://localhost:8080/#/files"
- ⚠️ Vissa tester har fortfarande problem med login (test 2 i `documentation-generation-from-scratch.spec.ts`)
- ⚠️ Timeout-problem kvarstår för vissa navigations-anrop (t.ex. `process-explorer`)

## Nästa steg

1. Verifiera att alla navigations-anrop använder hash-format
2. Fixa login-problem i test 2
3. Undersöka timeout-problem för vissa routes

