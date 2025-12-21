# Testöversikt och Gap-analys för BPMN Planner

**Senast uppdaterad:** 2025-01-XX  
**Syfte:** Ge en tydlig översikt över vilka tester som finns, vad de täcker, och identifiera gaps i testtäckningen.

> 📋 **Viktigt:** Denna analys är baserad på funktionalitetsöversikten i [`FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](./FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md).  
> För att förstå vad appen faktiskt gör, läs funktionalitetsöversikten först.

---

## 1. Översikt över Teststruktur

### Testkategorier

#### 1.1 Unit Tests (`tests/unit/`)
**Antal testfiler:** ~43 filer  
**Fokus:** Isolerade funktioner och komponenter

**Huvudområden:**
- ✅ BPMN-parsing och metadata-extraktion
- ✅ Process graph building
- ✅ Process tree building
- ✅ LLM-mappers (Feature Goal, Epic, Business Rule)
- ✅ Dokumentationsrendering
- ✅ Schema-validering
- ✅ Sequence flow-extraktion
- ✅ Order index-beräkning
- ✅ Jira-namngivning
- ✅ Timeline scheduling
- ✅ LLM client abstraction
- ✅ Versioning-logik
- ✅ Artifact availability
- ✅ Node matrix filtering

#### 1.2 Integration Tests (`tests/integration/`)
**Antal testfiler:** ~40 filer  
**Fokus:** Flöden mellan komponenter och end-to-end pipelines

**Huvudområden:**
- ✅ Full pipeline: parse → graph → tree → artifacts
- ✅ Dokumentationsgenerering (Feature Goals, Epics, Business Rules)
- ✅ Genereringsordning och hierarki
- ✅ BPMN-map auto-generation
- ✅ BPMN-map storage
- ✅ LLM-integration (Claude API)
- ✅ Mortgage-specifika scenarion
- ✅ Subprocess-matching
- ✅ Aggregation-ordning
- ✅ Node generation order
- ✅ Snapshot-tester för artifacts

#### 1.3 E2E Tests (`tests/e2e/`)
**Antal testfiler:** 1 fil  
**Fokus:** UI-komponenter i isolerad miljö

**Huvudområden:**
- ✅ Process Explorer smoke test

#### 1.4 Playwright E2E Tests (`tests/playwright-e2e/`)
**Antal testfiler:** 7 filer  
**Fokus:** Fullständiga användarflöden i webbläsare

**Huvudområden:**
- ✅ Claude generation flows
- ✅ File upload och versioning
- ✅ Happy path-scenarion (mortgage application, credit decision, etc.)

---

## 2. Huvudfunktionalitet och Testtäckning

### 2.1 BPMN-filhantering

**Funktionalitet:**
- Upload BPMN/DMN-filer
- Versioning (spåra versioner, välja specifik version)
- Filhantering i Supabase Storage
- GitHub-synkronisering

**Testtäckning:**
- ✅ Unit: `bpmnVersioning.test.ts` - Versioning-logik
- ✅ Integration: `bpmnParser.real.test.ts`, `bpmnRealParse.mortgage.test.ts` - Parsing
- ✅ Playwright: `file-upload-versioning.spec.ts` - Upload och versioning i UI
- ⚠️ **GAP:** Ingen test för GitHub-synkronisering
- ⚠️ **GAP:** Begränsad testning av filhantering i UI (BpmnFileManager)

### 2.2 Hierarki-byggnad

**Funktionalitet:**
- Bygga processhierarki från BPMN-filer
- Subprocess-matching (callActivity → subprocess-fil)
- BPMN-map hantering (automatisk generering, manuell redigering)
- Root-fil-detektion
- Missing dependencies-diagnostik

**Testtäckning:**
- ✅ Unit: `bpmnHierarchy.integration.test.ts` - Hierarki-byggnad
- ✅ Unit: `processGraphBuilder.*.test.ts` - Graph building
- ✅ Unit: `buildProcessTreeFromGraph.*.test.ts` - Tree building
- ✅ Integration: `bpmn-map-auto-generation.test.ts` - Auto-generation
- ✅ Integration: `bpmnMapStorage.test.ts` - Storage
- ✅ Integration: `mortgage.tree-hierarchy.test.ts` - Mortgage-hierarki
- ✅ Integration: `mortgage.e2e.test.ts` - Full pipeline
- ⚠️ **GAP:** Begränsad testning av UI för hierarki-byggnad
- ⚠️ **GAP:** Begränsad testning av subprocess-matching edge cases

### 2.3 Dokumentationsgenerering

**Funktionalitet:**
- Generera Feature Goals (callActivities/subprocesser)
- Generera Epics (userTasks, serviceTasks)
- Generera Business Rules (businessRuleTasks)
- Lokal generering (mallbaserad)
- LLM-generering (Claude/Ollama)
- Template versioning (v1/v2)
- Per-node overrides
- Combined file-level documentation (endast root-processer)

**Testtäckning:**
- ✅ Unit: `renderFeatureGoalDocStructure.test.ts` - Feature Goal rendering
- ✅ Unit: `renderEpicDocStructure.test.ts` - Epic rendering
- ✅ Unit: `renderBusinessRuleDocStructure.test.ts` - Business Rule rendering
- ✅ Unit: `featureGoalLlmMapper.*.test.ts` - LLM-mappers
- ✅ Unit: `epicLlmMapper.*.test.ts` - LLM-mappers
- ✅ Unit: `businessRuleLlmMapper.*.test.ts` - LLM-mappers
- ✅ Integration: `application-documentation-generation.test.ts` - Application docs
- ✅ Integration: `household-documentation-generation.test.ts` - Household docs
- ✅ Integration: `mortgage-documentation-analysis.test.ts` - Full analysis
- ✅ Integration: `featureGoal.llm.e2e.test.ts` - LLM Feature Goals
- ✅ Integration: `epic.llm.e2e.test.ts` - LLM Epics
- ✅ Integration: `businessRule.llm.e2e.test.ts` - LLM Business Rules
- ✅ Integration: `generation-order-scenarios.test.ts` - Genereringsordning
- ⚠️ **GAP:** Begränsad testning av template versioning (v1 vs v2)
- ⚠️ **GAP:** Begränsad testning av per-node overrides
- ⚠️ **GAP:** Begränsad testning av combined file-level docs (root vs subprocess)

### 2.4 Testgenerering

**Funktionalitet:**
- Generera Playwright-testfiler
- Generera testscenarion (via LLM eller design-scenarion)
- Export-ready test scripts
- Test metadata (persona, riskLevel, etc.)

**Testtäckning:**
- ✅ Integration: `mortgage.artifacts.snapshot.test.ts` - Snapshot-tester
- ✅ Playwright: Happy path-scenarion
- ⚠️ **GAP:** Begränsad testning av testgenerering i UI
- ⚠️ **GAP:** Begränsad testning av export-ready scripts
- ⚠️ **GAP:** Begränsad testning av test metadata-generering

### 2.5 UI-sidor och Komponenter

**Huvudsidor:**
1. **BpmnFileManager** - Filhantering, generering
2. **ProcessExplorer** - Hierarkisk trädvy
3. **NodeMatrix** - Listvy med filter
4. **TimelinePage** - Gantt-chart för planering
5. **DocViewer** - Dokumentationsvisning
6. **TestCoverageExplorerPage** - Test coverage-visualisering
7. **E2eQualityValidationPage** - E2E quality validation
8. **BpmnDiffOverviewPage** - Diff-översikt
9. **ConfigurationPage** - Konfiguration
10. **ProjectConfigurationPage** - Projektkonfiguration

**Testtäckning:**
- ✅ E2E: `process-explorer.smoke.test.ts` - Process Explorer smoke test
- ⚠️ **GAP:** Ingen testning av BpmnFileManager UI
- ⚠️ **GAP:** Ingen testning av NodeMatrix UI
- ⚠️ **GAP:** Ingen testning av TimelinePage UI
- ⚠️ **GAP:** Ingen testning av DocViewer UI
- ⚠️ **GAP:** Ingen testning av TestCoverageExplorerPage UI
- ⚠️ **GAP:** Ingen testning av E2eQualityValidationPage UI
- ⚠️ **GAP:** Ingen testning av BpmnDiffOverviewPage UI
- ⚠️ **GAP:** Begränsad testning av ConfigurationPage UI

### 2.6 LLM-integration

**Funktionalitet:**
- Claude API (cloud)
- Ollama (local)
- Fallback-mekanismer
- LLM health checks
- LLM debug view

**Testtäckning:**
- ✅ Unit: `llmClientAbstraction.test.ts` - Client abstraction
- ✅ Unit: `llmProviderIntegration.test.ts` - Provider integration
- ✅ Unit: `llmProviderResolver.test.ts` - Provider resolution
- ✅ Unit: `llmFallback.cloudToLocal.test.ts` - Fallback
- ✅ Unit: `llmHealth.test.ts` - Health checks
- ✅ Integration: `claude-api-*.test.ts` - Claude API
- ✅ Integration: `llm.real.smoke.test.ts` - LLM smoke test
- ✅ Integration: `llm.health.local.test.ts` - Local health
- ⚠️ **GAP:** Begränsad testning av LLM debug view UI
- ⚠️ **GAP:** Begränsad testning av Ollama-integration

### 2.7 Versioning och Version Selection

**Funktionalitet:**
- Spåra BPMN-filversioner
- Välja specifik version för generering
- Version history
- Version hashes

**Testtäckning:**
- ✅ Unit: `bpmnVersioning.test.ts` - Versioning-logik
- ✅ Playwright: `file-upload-versioning.spec.ts` - Versioning i UI
- ⚠️ **GAP:** Begränsad testning av version selection i generering
- ⚠️ **GAP:** Begränsad testning av version history UI

### 2.8 Jira-integration

**Funktionalitet:**
- Jira-namngivning (hierarkisk path-baserad)
- Jira-typer (feature-goal, epic)
- Jira-mappningar i databas

**Testtäckning:**
- ✅ Unit: `pickRootBpmnFile.test.ts` - Root file selection
- ⚠️ **GAP:** Ingen dedikerad testning av Jira-namngivning
- ⚠️ **GAP:** Begränsad testning av Jira-mappningar i UI

### 2.9 Test Coverage och Quality Validation

**Funktionalitet:**
- Test coverage-visualisering
- E2E quality validation
- Test report filtering
- Test scenario validation

**Testtäckning:**
- ✅ Unit: `testReportFiltering.test.ts` - Report filtering
- ⚠️ **GAP:** Ingen testning av TestCoverageExplorerPage UI
- ⚠️ **GAP:** Ingen testning av E2eQualityValidationPage UI
- ⚠️ **GAP:** Begränsad testning av test coverage-logik

### 2.10 DoR/DoD

**Funktionalitet:**
- DoR/DoD-kriterier per nod
- DoR/DoD-templates
- DoR/DoD-status

**Testtäckning:**
- ✅ Unit: `dorDodTemplates.test.ts` - Templates
- ⚠️ **GAP:** Begränsad testning av DoR/DoD i UI
- ⚠️ **GAP:** Begränsad testning av DoR/DoD-status

---

## 3. Identifierade Gaps

### 3.1 Kritiska Gaps (Hög prioritet)

#### 3.1.1 UI-komponenter saknar tester
**Problem:** De flesta UI-sidor saknar tester
- BpmnFileManager (filhantering, generering)
- NodeMatrix (listvy, filter)
- TimelinePage (Gantt-chart)
- DocViewer (dokumentationsvisning)
- TestCoverageExplorerPage
- E2eQualityValidationPage
- BpmnDiffOverviewPage

**Rekommendation:** Skapa Playwright E2E-tester för kritiska användarflöden

#### 3.1.2 Genereringsprocessen i UI saknar tester
**Problem:** Ingen testning av fullständig genereringsprocess i UI
- Fil-upload → Hierarki-byggnad → Dokumentationsgenerering → Testgenerering

**Rekommendation:** Skapa end-to-end Playwright-test för fullständigt genereringsflöde

#### 3.1.3 Version selection i generering saknar tester
**Problem:** Begränsad testning av version selection när generering sker

**Rekommendation:** Lägg till integrationstester för version-aware generering

### 3.2 Viktiga Gaps (Medel prioritet)

#### 3.2.1 Template versioning (v1 vs v2)
**Problem:** Begränsad testning av template versioning

**Rekommendation:** Lägg till tester för v1 vs v2-generering

#### 3.2.2 Per-node overrides
**Problem:** Begränsad testning av per-node overrides

**Rekommendation:** Lägg till tester för override-hantering

#### 3.2.3 Combined file-level documentation
**Problem:** Nyligen ändrat beteende (endast root-processer) saknar omfattande tester

**Rekommendation:** Utöka tester för combined docs (root vs subprocess)

#### 3.2.4 GitHub-synkronisering
**Problem:** Ingen testning av GitHub-synkronisering

**Rekommendation:** Lägg till integrationstester för GitHub-synkronisering

#### 3.2.5 Testgenerering i UI
**Problem:** Begränsad testning av testgenerering i UI

**Rekommendation:** Lägg till Playwright-tester för testgenerering

### 3.3 Mindre Gaps (Låg prioritet)

#### 3.3.1 Jira-namngivning
**Problem:** Ingen dedikerad testning av Jira-namngivning

**Rekommendation:** Lägg till unit-tester för Jira-namngivning

#### 3.3.2 DoR/DoD i UI
**Problem:** Begränsad testning av DoR/DoD i UI

**Rekommendation:** Lägg till UI-tester för DoR/DoD

#### 3.3.3 Ollama-integration
**Problem:** Begränsad testning av Ollama-integration

**Rekommendation:** Utöka tester för Ollama (om det används aktivt)

---

## 4. Rekommenderad Teststrategi

### 4.1 Testpyramid

```
        /\
       /  \  E2E/Playwright (UI-flöden)
      /____\
     /      \  Integration (Flöden mellan komponenter)
    /________\
   /          \  Unit (Isolerade funktioner)
  /____________\
```

**Nuvarande status:**
- ✅ Unit: Bra täckning (~43 filer)
- ✅ Integration: Bra täckning (~40 filer)
- ⚠️ E2E: Begränsad täckning (1 smoke test)
- ⚠️ Playwright: Begränsad täckning (7 filer, fokuserar på scenarion)

### 4.2 Prioritering

#### Fas 1: Kritiska UI-flöden (Hög prioritet)
1. **BpmnFileManager** - Filhantering och generering
2. **ProcessExplorer** - Hierarkisk trädvy (utöka befintlig smoke test)
3. **DocViewer** - Dokumentationsvisning
4. **Fullständigt genereringsflöde** - Upload → Hierarki → Generering

#### Fas 2: Viktiga funktioner (Medel prioritet)
1. **NodeMatrix** - Listvy och filter
2. **TimelinePage** - Gantt-chart
3. **TestCoverageExplorerPage** - Test coverage
4. **Version selection** - I generering
5. **Template versioning** - v1 vs v2

#### Fas 3: Komplettering (Låg prioritet)
1. **E2eQualityValidationPage**
2. **BpmnDiffOverviewPage**
3. **ConfigurationPage**
4. **GitHub-synkronisering**
5. **Jira-namngivning**

---

## 5. Implementeringsplan

### 5.1 Skapa Testöversikt-dokument

**Fördelar:**
- Tydlig översikt över vad som testas
- Identifierar gaps
- Hjälper med prioritering
- Underlättar onboarding

**Innehåll:**
- Testkategorier och antal
- Huvudfunktionalitet och testtäckning (baserat på funktionalitetsöversikten)
- Identifierade gaps
- Rekommenderad teststrategi
- Implementeringsplan

**Status:** ✅ Skapad (detta dokument)

### 5.2 Förbättra befintlig teststruktur

**Åtgärder:**
1. Organisera tester i tydliga kategorier
2. Lägg till beskrivningar i testfiler
3. Skapa test utilities för återanvändning
4. Förbättra test-isolering

### 5.3 Lägg till kritiska UI-tester

**Åtgärder:**
1. Skapa Playwright-tester för BpmnFileManager
2. Utöka ProcessExplorer-tester
3. Skapa DocViewer-tester
4. Skapa fullständigt genereringsflöde-test

### 5.4 Förbättra integrationstester

**Åtgärder:**
1. Lägg till tester för version selection
2. Utöka tester för template versioning
3. Lägg till tester för per-node overrides
4. Förbättra tester för combined docs

---

## 6. Nästa Steg

### Omedelbart (Denna session)
1. ✅ Skapa testöversikt-dokument (detta dokument)
2. ⏳ Granska och validera analysen
3. ⏳ Prioritera gaps baserat på användarfeedback

### Kort sikt (Nästa iteration)
1. Skapa Playwright-tester för kritiska UI-flöden
2. Utöka integrationstester för version selection
3. Förbättra testdokumentation

### Lång sikt (Framtida iterationer)
1. Bygg ut komplett testtäckning för alla UI-sidor
2. Förbättra test-isolering och återanvändning
3. Automatisera testrapportering och coverage-tracking

---

## 7. Test Metrics och Tracking

### Rekommenderade Metrics

1. **Test Coverage**
   - Unit test coverage (%)
   - Integration test coverage (%)
   - E2E test coverage (antal kritiska flöden)

2. **Test Health**
   - Antal testfiler per kategori
   - Antal tester per huvudfunktionalitet
   - Test execution time
   - Test failure rate

3. **Gap Tracking**
   - Identifierade gaps
   - Prioritering
   - Status (öppen, pågående, stängd)

### Rekommenderade Verktyg

- **Vitest** - Unit och integration tests (redan i användning)
- **Playwright** - E2E tests (redan i användning)
- **Coverage tools** - För att spåra test coverage
- **Test reporting** - För att visualisera test results

---

## 8. Slutsats

**Nuvarande status:**
- ✅ Bra täckning av unit- och integrationstester
- ⚠️ Begränsad täckning av UI-tester
- ⚠️ Begränsad täckning av end-to-end användarflöden

**Rekommendation:**
- Fokusera på att lägga till Playwright E2E-tester för kritiska UI-flöden
- Utöka integrationstester för nyligen ändrade funktioner (version selection, combined docs)
- Förbättra testdokumentation och översikt

**Nästa steg:**
1. Granska denna analys
2. Prioritera gaps baserat på användarfeedback
3. Skapa implementeringsplan för prioriterade tester
4. Börja implementera kritiska UI-tester
