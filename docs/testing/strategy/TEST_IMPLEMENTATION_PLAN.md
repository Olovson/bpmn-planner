# Test Implementation Plan för BPMN Planner

**Skapad:** 2025-01-XX  
**Syfte:** Konkret plan för att förbättra testtäckningen baserat på gap-analysen

---

## 1. Nuvarande Status (Sammanfattning)

### Testtäckning per kategori

| Kategori | Antal filer | Status | Prioritet för förbättring |
|----------|-------------|--------|---------------------------|
| Unit Tests | ~43 | ✅ Bra | Låg |
| Integration Tests | ~40 | ✅ Bra | Medel |
| E2E Tests (Vitest) | 1 | ⚠️ Begränsad | Hög |
| Playwright E2E | 7 | ⚠️ Begränsad | Hög |

### Huvudfunktionalitet och täckning

| Funktionalitet | Unit | Integration | E2E | Status |
|----------------|------|--------------|-----|--------|
| BPMN-parsing | ✅ | ✅ | ❌ | Bra |
| Hierarki-byggnad | ✅ | ✅ | ❌ | Bra |
| Dokumentationsgenerering | ✅ | ✅ | ⚠️ | Bra (men saknar UI-tester) |
| Testgenerering | ⚠️ | ⚠️ | ❌ | Begränsad |
| UI-sidor | ❌ | ❌ | ⚠️ | **Kritiskt gap** |
| LLM-integration | ✅ | ✅ | ⚠️ | Bra |
| Versioning | ✅ | ⚠️ | ⚠️ | Begränsad |
| GitHub-synk | ❌ | ❌ | ❌ | **Saknas** |

---

## 2. Prioriterade Gaps och Lösningar

### 2.1 Kritiska Gaps (Fas 1 - Hög prioritet)

#### Gap 1: UI-sidor saknar tester
**Problem:** De flesta UI-sidor har inga tester, vilket gör det svårt att validera att användarflöden fungerar.

**Lösning:** Skapa Playwright E2E-tester för kritiska användarflöden.

**Konkreta tester att skapa:**

1. **BpmnFileManager UI-test** (`tests/playwright-e2e/bpmn-file-manager.spec.ts`)
   - Upload BPMN-fil
   - Bygg hierarki
   - Generera dokumentation (lokal)
   - Verifiera att dokumentation skapas
   - Verifiera att filer visas i listan

2. **ProcessExplorer UI-test** (`tests/playwright-e2e/process-explorer.spec.ts`)
   - Ladda Process Explorer
   - Verifiera att trädet visas
   - Klicka på noder
   - Verifiera navigation
   - Verifiera filter-funktionalitet

3. **DocViewer UI-test** (`tests/playwright-e2e/doc-viewer.spec.ts`)
   - Öppna dokumentation för nod
   - Verifiera att innehåll visas
   - Verifiera länkar fungerar
   - Testa version selection
   - Verifiera Feature Goal vs Epic vs Business Rule rendering

4. **Fullständigt genereringsflöde** (`tests/playwright-e2e/full-generation-flow.spec.ts`)
   - Upload fil → Bygg hierarki → Generera dokumentation → Verifiera resultat
   - Testa både lokal och LLM-generering
   - Verifiera att alla artefakter skapas korrekt

**Estimerad tid:** 2-3 dagar

#### Gap 2: Version selection i generering saknar tester
**Problem:** När användaren väljer en specifik version för generering, finns det begränsad testning av att rätt version används.

**Lösning:** Lägg till integrationstester för version-aware generering.

**Konkreta tester att skapa:**

1. **Version-aware dokumentationsgenerering** (`tests/integration/version-aware-generation.test.ts`)
   - Generera dokumentation med specifik version
   - Verifiera att rätt version används
   - Verifiera att dokumentation sparas med version hash
   - Testa fallback till current version om version saknas

2. **Version selection i UI** (`tests/playwright-e2e/version-selection.spec.ts`)
   - Välj version i UI
   - Generera dokumentation
   - Verifiera att rätt version används

**Estimerad tid:** 1 dag

#### Gap 3: Combined file-level documentation (nyligen ändrat)
**Problem:** Nyligen ändrat beteende (endast root-processer får combined docs) saknar omfattande tester.

**Lösning:** Utöka befintliga tester och lägg till nya.

**Konkreta tester att skapa/uppdatera:**

1. **Root vs subprocess combined docs** (`tests/integration/combined-docs-root-vs-subprocess.test.ts`)
   - Testa att root-processer får combined docs
   - Testa att subprocesser INTE får combined docs
   - Testa att länkar fungerar korrekt (Feature Goal för subprocesser)

2. **DocViewer fallback** (`tests/integration/doc-viewer-fallback.test.ts`)
   - Testa att DocViewer fallbackar till Feature Goal för subprocesser
   - Testa att DocViewer visar combined doc för root-processer

**Estimerad tid:** 0.5 dag (tester finns redan, behöver valideras)

### 2.2 Viktiga Gaps (Fas 2 - Medel prioritet)

#### Gap 4: Template versioning (v1 vs v2)
**Problem:** Begränsad testning av template versioning.

**Lösning:** Lägg till tester för v1 vs v2-generering.

**Konkreta tester att skapa:**

1. **Template versioning** (`tests/integration/template-versioning.test.ts`)
   - Generera med v1 template
   - Generera med v2 template
   - Verifiera att rätt template används
   - Verifiera att version selection fungerar

**Estimerad tid:** 0.5 dag

#### Gap 5: Per-node overrides
**Problem:** Begränsad testning av per-node overrides.

**Lösning:** Lägg till tester för override-hantering.

**Konkreta tester att skapa:**

1. **Per-node overrides** (`tests/integration/per-node-overrides.test.ts`)
   - Skapa override-fil
   - Generera dokumentation
   - Verifiera att override används
   - Verifiera merge-strategi

**Estimerad tid:** 0.5 dag

#### Gap 6: NodeMatrix UI
**Problem:** Ingen testning av NodeMatrix UI.

**Lösning:** Skapa Playwright-test för NodeMatrix.

**Konkreta tester att skapa:**

1. **NodeMatrix UI-test** (`tests/playwright-e2e/node-matrix.spec.ts`)
   - Ladda NodeMatrix
   - Verifiera att noder visas
   - Testa filter-funktionalitet
   - Testa sortering
   - Verifiera länkar fungerar

**Estimerad tid:** 1 dag

#### Gap 7: TimelinePage UI
**Problem:** Ingen testning av TimelinePage UI.

**Lösning:** Skapa Playwright-test för TimelinePage.

**Konkreta tester att skapa:**

1. **TimelinePage UI-test** (`tests/playwright-e2e/timeline-page.spec.ts`)
   - Ladda TimelinePage
   - Verifiera att Gantt-chart visas
   - Testa redigering av datum
   - Verifiera att ändringar sparas

**Estimerad tid:** 1 dag

### 2.3 Mindre Gaps (Fas 3 - Låg prioritet)

#### Gap 8: TestCoverageExplorerPage
**Problem:** Ingen testning av TestCoverageExplorerPage UI.

**Lösning:** Skapa Playwright-test.

**Estimerad tid:** 1 dag

#### Gap 9: E2eQualityValidationPage
**Problem:** Ingen testning av E2eQualityValidationPage UI.

**Lösning:** Skapa Playwright-test.

**Estimerad tid:** 1 dag

#### Gap 10: GitHub-synkronisering
**Problem:** Ingen testning av GitHub-synkronisering.

**Lösning:** Lägg till integrationstester (mock GitHub API).

**Estimerad tid:** 1 dag

---

## 3. Implementeringsplan

### Fas 1: Kritiska UI-flöden (Vecka 1-2)

**Mål:** Säkerställa att kritiska användarflöden fungerar korrekt.

**Tester att skapa:**
1. ✅ BpmnFileManager UI-test - **SKAPAD** (`tests/playwright-e2e/bpmn-file-manager.spec.ts`)
2. ✅ ProcessExplorer UI-test - **SKAPAD** (`tests/playwright-e2e/process-explorer.spec.ts`)
3. ✅ DocViewer UI-test - **SKAPAD** (`tests/playwright-e2e/doc-viewer.spec.ts`)
4. ✅ Fullständigt genereringsflöde - **SKAPAD** (`tests/playwright-e2e/full-generation-flow.spec.ts`)
5. ⏳ Version selection i generering - **PENDING** (kan läggas till i full-generation-flow.spec.ts)

**Status:** Fas 1 kritiska UI-tester är skapade och redo för testning
**Estimerad tid:** 3-4 dagar (implementerat)

### Fas 2: Viktiga funktioner (Vecka 3-4)

**Mål:** Förbättra testtäckning för viktiga funktioner.

**Tester att skapa:**
1. ✅ Template versioning - **SKAPAD** (`tests/integration/template-versioning.test.ts`)
2. ✅ Per-node overrides - **SKAPAD** (`tests/integration/per-node-overrides.test.ts`)
3. ✅ NodeMatrix UI-test - **SKAPAD** (`tests/playwright-e2e/node-matrix.spec.ts`)
4. ✅ TimelinePage UI-test - **SKAPAD** (`tests/playwright-e2e/timeline-page.spec.ts`)

**Status:** Fas 2 viktiga funktioner är skapade och redo för testning
**Estimerad tid:** 3 dagar (implementerat)

### Fas 3: Komplettering (Vecka 5+)

**Mål:** Komplettera testtäckning för övriga funktioner.

**Tester att skapa:**
1. TestCoverageExplorerPage
2. E2eQualityValidationPage
3. GitHub-synkronisering
4. Ytterligare edge cases

**Estimerad tid:** 3+ dagar

---

## 4. Test Utilities och Best Practices

### 4.1 Test Utilities att skapa/förbättra

1. **UI Test Helpers** (`tests/playwright-e2e/utils/uiHelpers.ts`)
   - Login helpers
   - Navigation helpers
   - File upload helpers
   - Generation helpers

2. **Mock Data** (`tests/playwright-e2e/fixtures/`)
   - BPMN-filer
   - Mock responses
   - Test data

3. **Test Setup** (`tests/playwright-e2e/global-setup.ts`)
   - Förbättra befintlig setup
   - Lägg till cleanup

### 4.2 Best Practices

1. **Test Isolation**
   - Varje test ska vara oberoende
   - Använd beforeEach/afterEach för cleanup
   - Mock externa dependencies

2. **Test Naming**
   - Tydliga, beskrivande namn
   - Följ mönster: `should [action] when [condition]`

3. **Test Organization**
   - Organisera efter funktionalitet
   - Använd describe-blocks för gruppering
   - Separera smoke tests från full tests

---

## 5. Success Metrics

### Kort sikt (Efter Fas 1)
- ✅ 4-5 nya Playwright E2E-tester för kritiska flöden
- ✅ Alla kritiska användarflöden har minst smoke tests
- ✅ Version selection testas i generering

### Medel sikt (Efter Fas 2)
- ✅ 8-10 Playwright E2E-tester totalt
- ✅ Alla huvudfunktioner har tester
- ✅ Template versioning testas

### Lång sikt (Efter Fas 3)
- ✅ Komplett testtäckning för alla UI-sidor
- ✅ Alla funktioner har minst smoke tests
- ✅ Test coverage > 80% för kritiska komponenter

---

## 6. Nästa Steg

### Omedelbart
1. ✅ Granska gap-analysen
2. ✅ Validera prioriteringar
3. ✅ Börja implementera Fas 1-tester - **KLART**
4. ⏳ Testa de nya testerna och verifiera att de fungerar

### Kort sikt
1. Implementera kritiska UI-tester (Fas 1)
2. Förbättra test utilities
3. Uppdatera testdokumentation

### Lång sikt
1. Komplettera testtäckning (Fas 2-3)
2. Förbättra test automation
3. Implementera test coverage tracking

---

## 7. Anteckningar

### Testmiljö
- Använd Supabase local development
- Mock externa APIs (GitHub, etc.)
- Använd test fixtures för BPMN-filer

### Test Data
- Använd befintliga fixtures i `tests/fixtures/bpmn/`
- Skapa nya fixtures vid behov
- Behåll test data isolerad

### CI/CD
- Kör alla tester i CI
- Fail fast på kritiska tester
- Rapportera test coverage
