# Feature Goal-dokumentation Fix

## Datum: 2025-12-26

## 🎯 Problem

Node-matrix visade "—" för dokumentation för call activities (Feature Goals), medan tasks visade "Visa docs". Detta tydde på att Feature Goal-dokumentation inte hittades korrekt.

## 🔍 Rotorsak

### Problem: `extractBpmnFileFromDocFileName()` returnerade fel fil

När Feature Goal-dokumentation uploadades:

1. **Generering skapar:** `feature-goals/mortgage-se-object-object-information.html` (hierarchical naming)

2. **Upload försöker extrahera BPMN-fil:**
   - `extractBpmnFileFromDocFileName()` analyserade `"mortgage-se-object-object-information"`
   - Fallback-logiken matchade `"mortgage-se-object"` (parent-filen) först
   - Returnerade `"mortgage-se-object.bpmn"` istället för `"mortgage-se-object-information.bpmn"` (subprocess-filen)

3. **Filen sparades under fel version hash:**
   - Om extract returnerade parent-filen → sparades under parent-filens version hash
   - Men enligt kommentarer ska den sparas under subprocess-filens version hash

4. **Node-matrix sökte under rätt version hash:**
   - Sökte under subprocess-filens version hash
   - Men filen var sparad under parent-filens version hash
   - **Resultat:** Filen hittades inte ❌

## ✅ Lösning

### Fix: Förbättrad `extractBpmnFileFromDocFileName()` logik

**Förändringar i `src/pages/BpmnFileManager/hooks/useFileGeneration.ts`:**

1. **Prioriterar subprocess-filer som slutar med elementId:**
   - För hierarchical naming (`mortgage-se-object-object-information`):
     - Extraherar elementId från slutet (`object-information`)
     - Matchar först mot filer som slutar med elementId (subprocess-filer)
     - Returnerar subprocess-filen istället för parent-filen

2. **Tar bort fallback som matchar parent-filen:**
   - Tog bort fallback-logiken som matchade parent-filen först
   - Förbättrad logik som matchar längre filer (subprocess-filer) istället för kortare (parent-filer)

**Kod-förändringar:**
- Rad 1086-1107: Förbättrad logik för att matcha subprocess-filer baserat på elementId
- Rad 1109-1115: Tog bort fallback som matchade parent-filen
- Rad 1118-1122: Förbättrad fallback som matchar längre filer (subprocess-filer)

## 🧪 Tester

### E2E-tester för Feature Goal-dokumentation

**Ny fil:** `tests/playwright-e2e/feature-goal-documentation.spec.ts`

**Test 1: Single file upload**
- Laddar upp parent-fil med call activity och subprocess-fil
- Genererar dokumentation
- Verifierar att node-matrix hittar dokumentation för call activity

**Test 2: Multiple file upload**
- Laddar upp parent-fil med flera call activities och flera subprocess-filer
- Genererar dokumentation
- Verifierar att node-matrix hittar dokumentation för alla call activities

**Säkerhet:**
- Alla testfiler använder `generateTestFileName()` som automatiskt prefixar med `test-{timestamp}-{random}-`
- Testerna kan inte skriva över produktionsfiler eftersom:
  1. `generateTestFileName()` garanterar "test-" prefix
  2. `stepUploadBpmnFile()` validerar att filnamn har "test-" prefix
  3. Edge Function blockerar uploads av icke-test-filer från tester

## 📋 Sammanfattning

| Komponent | Status | Beskrivning |
|-----------|--------|-------------|
| **Fix** | ✅ Klar | `extractBpmnFileFromDocFileName()` prioriterar nu subprocess-filer |
| **Test 1** | ✅ Klar | Single file upload med call activity |
| **Test 2** | ✅ Klar | Multiple file upload med flera call activities |
| **Säkerhet** | ✅ Klar | Alla testfiler använder "test-" prefix |

## 🚀 Kör Tester

```bash
npx playwright test tests/playwright-e2e/feature-goal-documentation.spec.ts
```

## 📚 Relaterad Dokumentation

- **Analys:** [`docs/analysis/NODE_MATRIX_DOCUMENTATION_NOT_FOUND_ANALYSIS.md`](./NODE_MATRIX_DOCUMENTATION_NOT_FOUND_ANALYSIS.md)
- **Genereringslogik:** [`docs/analysis/GENERATION_VS_COVERAGE_LOGIC_ANALYSIS.md`](./GENERATION_VS_COVERAGE_LOGIC_ANALYSIS.md)

---

**Datum:** 2025-12-26
**Status:** Fix klar och tester implementerade




