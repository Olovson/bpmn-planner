# 🚀 BPMN Planner

**BPMN Planner** tar BPMN-/DMN-filer, bygger en deterministisk processhierarki, visualiserar processen (diagram, strukturträd, listvy) och genererar dokumentation, testunderlag och metadata för produkt- och utvecklingsteamet. Supabase används som backend och innehåll kan genereras både via mallar (utan LLM) och via LLM (Claude/Ollama).

> **📚 Dokumentation**: [`docs/README.md`](docs/README.md) - Översikt över all dokumentation  
> **🏗️ Funktionalitet & Arkitektur**: [`docs/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](docs/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md) - Komplett översikt  
> **🔄 Dataflöden**: [`docs/DATAFLOW_OVERVIEW.md`](docs/DATAFLOW_OVERVIEW.md) - Dataflödesöversikt  
> **⚙️ Snabbstart**: [`docs/QUICKSTART_AND_DEVELOPMENT.md`](docs/QUICKSTART_AND_DEVELOPMENT.md) - Detaljerad utvecklingsguide

---

## 🚀 Snabbstart

```bash
git clone https://github.com/Olovson/bpmn-planner.git
cd bpmn-planner
npm install
npm run start:supabase  # Starta Supabase
npm run dev              # Starta dev-server (http://localhost:8080/)
```

**Inloggning:** `seed-bot@local.test / Passw0rd!`

> 📋 **För detaljerad snabbstart och utvecklingsguide, se [`docs/QUICKSTART_AND_DEVELOPMENT.md`](docs/QUICKSTART_AND_DEVELOPMENT.md)**

---

## 📚 Viktiga Länkar

### För Utvecklare
- **Snabbstart & Utveckling**: [`docs/QUICKSTART_AND_DEVELOPMENT.md`](docs/QUICKSTART_AND_DEVELOPMENT.md)
- **Funktionalitet & Arkitektur**: [`docs/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](docs/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md)
- **Dataflöden**: [`docs/DATAFLOW_OVERVIEW.md`](docs/DATAFLOW_OVERVIEW.md)
- **Arkitektur**: [`docs/bpmn-hierarchy-architecture.md`](docs/bpmn-hierarchy-architecture.md)
- **API Reference**: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)

### För Test Lead
- **Test Lead Guide**: [`docs/README_FOR_TESTLEAD.md`](docs/README_FOR_TESTLEAD.md)
- **Test Export**: [`docs/TEST_EXPORT.md`](docs/TEST_EXPORT.md)
- **Test Coverage Guide**: [`docs/TEST_COVERAGE_USER_GUIDE.md`](docs/TEST_COVERAGE_USER_GUIDE.md)

### Funktioner & Funktionalitet
- **Funktioner**: [`docs/FEATURES_AND_FUNCTIONALITY.md`](docs/FEATURES_AND_FUNCTIONALITY.md)
- **Jira-namngivning**: [`docs/JIRA_NAMING.md`](docs/JIRA_NAMING.md)
- **Integrationer**: [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md)
- **Test-scenarion**: [`docs/TEST_SCENARIOS.md`](docs/TEST_SCENARIOS.md)
- **Batch-generering**: [`docs/BATCH_GENERATION.md`](docs/BATCH_GENERATION.md)

### Testing
- **Teststrategi**: [`docs/TEST_OVERVIEW_AND_GAPS.md`](docs/TEST_OVERVIEW_AND_GAPS.md) | [`docs/TEST_IMPLEMENTATION_PLAN.md`](docs/TEST_IMPLEMENTATION_PLAN.md)
- **Testguide**: [`docs/TESTING.md`](docs/TESTING.md)
- **Test Suite**: [`tests/README.md`](tests/README.md)

### Projektorganisation
- **Projektorganisation**: [`docs/project-organization/`](docs/project-organization/) - Ways of working, teststrategi, roller

---

## 🛠️ Vanliga Kommandon

```bash
# Utveckling
npm run dev              # Starta dev-server
npm run build            # Bygg för produktion

# Supabase
npm run start:supabase   # Starta Supabase (guidad)
npm run supabase:reset   # Reset databas

# Tester
npm test                 # Kör alla Vitest-tester
npx playwright test      # Kör Playwright E2E-tester

# Verktyg
npm run print:bpmn-tree  # Exportera BPMN-träd
npm run check:db-schema  # Verifiera databas-schema
```

> 📋 **För alla kommandon, se [`docs/QUICKSTART_AND_DEVELOPMENT.md`](docs/QUICKSTART_AND_DEVELOPMENT.md)**

---

## ✨ Huvudfunktioner

- Deterministisk BPMN-hierarki
- Dokumentgenerering (Feature Goals, Epics, Business Rules)
- Testgenerering (Playwright-testfiler)
- Visualisering (diagram, träd, listvy, timeline)
- LLM-integration (Claude/Ollama)
- Versioning och historik

> 📋 **För komplett lista, se [`docs/FEATURES_AND_FUNCTIONALITY.md`](docs/FEATURES_AND_FUNCTIONALITY.md)**

---

## 📍 Lokal URL
`http://localhost:8080/`

---

## 🧭 TODO & Framtida Förbättringar

Se [TODO.md](TODO.md) för en detaljerad, prioriterad lista över uppgifter och förbättringar.

Se [Feature Roadmap](docs/FEATURE_ROADMAP.md) för strategiska funktioner och långsiktiga visioner.

---

## 📦 Bygga för produktion

```bash
npm run build        # Produktionsbygg
npm run build:dev    # Utvecklingsbygg (med source maps)
```

Bygget lägger statiska filer under `dist/` som kan deployas bakom valfri reverse proxy.  
Se till att Supabase-URL/nycklar och edge-funktioner är korrekt konfigurerade i den miljö du deployar till.
