# Implementeringsplan: Test Data Isolation

## 🚨 Kritiskt Problem

**Testerna påverkar faktisk data i appen!**

- Tester skapar faktiska filer i `bpmn_files` tabellen
- Tester laddar upp faktiska filer till Supabase Storage
- Tester genererar faktisk dokumentation och tester
- Tester skapar faktiska generation jobs
- Tester bygger faktisk hierarki

**Risk:**
- Testdata blandas med produktionsdata
- Testdata kan synas i appen
- Testdata kan påverka andra tester
- Om tester körs mot produktionsdatabas kan de skriva över data!

## ✅ Implementerade Lösningar

### 1. Test Data Prefixing ✅

**Implementerat:**
- `tests/playwright-e2e/utils/testDataHelpers.ts` - Helper-funktioner för testdata
- Alla test-filer prefixas nu med `test-{timestamp}-{random}-{name}.bpmn`
- Exempel: `test-1704067200000-1234-test-doc-generation.bpmn`

**Funktioner:**
- `generateTestFileName()` - Genererar unikt test-filnamn
- `isTestDataFile()` - Kontrollerar om fil är testdata
- `extractTimestampFromTestFileName()` - Extraherar timestamp för cleanup

**Uppdaterade filer:**
- `testHelpers.ts` - `ensureBpmnFileExists()` använder nu prefixade filnamn
- `ensureFileCanBeSelected()` - Prioriterar test-filer

### 2. Test Data Cleanup ✅

**Implementerat:**
- `tests/playwright-e2e/utils/testCleanup.ts` - Cleanup-funktioner
- `cleanupTestFiles()` - Rensar testdata efter varje test
- `cleanupOldTestData()` - Rensar gamla testdata (valfritt)

**Uppdaterade tester:**
- Alla tester som skapar testdata har nu cleanup efter sig
- Cleanup körs med `testStartTime` för att bara rensa testets egna filer

**Uppdaterade test-filer:**
- `documentation-generation-from-scratch.spec.ts`
- `test-generation-from-scratch.spec.ts`
- `hierarchy-building-from-scratch.spec.ts`
- `bpmn-map-validation-workflow.spec.ts`
- `full-generation-flow.spec.ts`
- `flows/file-management-workflow.spec.ts`
- `flows/complete-workflow-a-to-z.spec.ts`
- `flows/generation-workflow.spec.ts`

## 📋 Checklista

### ✅ Implementerat

- [x] Test data prefixing (prefixa all testdata med "test-" och timestamp)
- [x] Test data cleanup (rensa testdata efter varje test)
- [x] Uppdatera `ensureBpmnFileExists()` att använda prefixade filnamn
- [x] Uppdatera `ensureFileCanBeSelected()` att prioritera test-filer
- [x] Lägg till cleanup i alla tester som skapar testdata
- [x] Skapa `testDataHelpers.ts` med helper-funktioner
- [x] Skapa `testCleanup.ts` med cleanup-funktioner

### ⚠️ Kvar att göra

- [ ] Uppdatera README filer med varningar om test data isolation
- [ ] Verifiera att alla tester använder prefixade filnamn
- [ ] Testa att cleanup fungerar korrekt
- [ ] Dokumentera hur man identifierar och rensar testdata manuellt

## 🔍 Har vi förstört produktionsdata?

### Analys av vad som kan ha hänt:

**Test-filer som kan ha skapats:**
- `test-default.bpmn` (från `ensureBpmnFileExists()`)
- `test-doc-generation.bpmn` (från dokumentationsgenerering-test)
- `test-generation.bpmn` (från testgenerering-test)
- `test-hierarchy.bpmn` (från hierarki-byggnad-test)
- `test-map-suggestions.bpmn` (från map-validering-test)
- `test-generation-flow.bpmn` (från full-generation-flow-test)
- `test-file-management.bpmn` (från file-management-workflow-test)
- `test-complete-workflow.bpmn` (från complete-workflow-test)

**Vad som kan ha skapats:**
1. **Filer i `bpmn_files` tabellen** - Med filnamn som börjar med "test-"
2. **Filer i Supabase Storage** - BPMN-filer i `bpmn-files/` bucket
3. **Dokumentation** - HTML-filer i `docs/claude/` om generering kördes
4. **Test scenarios** - I `node_planned_scenarios` tabellen
5. **Hierarki-data** - I `bpmn_dependencies`, `bpmn_element_mappings` tabeller
6. **Generation jobs** - I `generation_jobs` tabellen

### Hur identifiera testdata:

**SQL-query för att hitta test-filer:**
```sql
SELECT * FROM bpmn_files 
WHERE file_name LIKE 'test-%'
ORDER BY created_at DESC;
```

**SQL-query för att hitta testdata i andra tabeller:**
```sql
-- Test scenarios
SELECT * FROM node_planned_scenarios 
WHERE bpmn_file LIKE 'test-%';

-- Generation jobs för test-filer
SELECT * FROM generation_jobs 
WHERE file_name LIKE 'test-%';

-- Dependencies för test-filer
SELECT * FROM bpmn_dependencies 
WHERE parent_file LIKE 'test-%' OR child_file LIKE 'test-%';
```

### Hur rensa testdata:

**Manuell rensning:**
1. Kör `cleanupOldTestData()` funktionen (kan köras manuellt)
2. Använd SQL-queries ovan för att identifiera testdata
3. Ta bort test-filer via UI (filerna börjar med "test-")

**Automatisk rensning:**
- Cleanup körs nu automatiskt efter varje test
- Gamla testdata kan rensas med `cleanupOldTestData(page, maxAgeMinutes)`

## 📝 Uppdateringar som behövs

### README-filer att uppdatera:

1. `tests/playwright-e2e/README.md`
   - Lägg till varning om test data isolation
   - Dokumentera att testdata prefixas automatiskt
   - Dokumentera cleanup-funktionalitet

2. `tests/playwright-e2e/utils/README.md`
   - Dokumentera `testDataHelpers.ts`
   - Dokumentera `testCleanup.ts`
   - Förklara hur testdata isoleras

3. `docs/analysis/UI_E2E_TEST_DATA_ISOLATION_ANALYSIS.md`
   - Uppdatera med implementerade lösningar
   - Markera vad som är fixat

## 🎯 Nästa Steg

1. ✅ Test data prefixing - **KLART**
2. ✅ Test data cleanup - **KLART**
3. ⚠️ Uppdatera README filer - **PÅGÅENDE**
4. ⚠️ Verifiera att alla tester använder prefixade filnamn - **PÅGÅENDE**
5. ⚠️ Testa att cleanup fungerar - **TODO**

## ⚠️ Viktiga Varningar

### För Utvecklare:

1. **ALDRIG kör tester mot produktionsdatabas!**
   - Kontrollera att `VITE_SUPABASE_URL` i `.env.local` pekar på lokal Supabase
   - Default: `http://127.0.0.1:54321` (lokal Supabase)

2. **Testdata prefixas automatiskt**
   - Alla test-filer börjar nu med `test-{timestamp}-{random}-`
   - Testdata kan identifieras och rensas enkelt

3. **Cleanup körs automatiskt**
   - Testdata rensas efter varje test
   - Gamla testdata kan rensas manuellt med `cleanupOldTestData()`

4. **Om testdata syns i appen:**
   - Testdata börjar med "test-" och kan filtreras bort
   - Cleanup körs automatiskt, men kan misslyckas om testet crashar

### För Testare:

1. **Kontrollera att testdata inte påverkar produktionsdata**
   - Verifiera att test-filer börjar med "test-"
   - Verifiera att cleanup körs efter tester

2. **Om testdata inte rensas:**
   - Kör `cleanupOldTestData()` manuellt
   - Ta bort test-filer via UI (filerna börjar med "test-")

## 📊 Status

**Implementering:** ✅ **KLART**
**Testning:** ⚠️ **PÅGÅENDE**
**Dokumentation:** ⚠️ **PÅGÅENDE**

**Nästa steg:** Uppdatera README filer och verifiera att allt fungerar.

