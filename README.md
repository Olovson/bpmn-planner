# 🚀 BPMN Planner

**BPMN Planner** tar BPMN-/DMN-filer, bygger en deterministisk processhierarki, visualiserar processen (diagram, strukturträd, listvy) och genererar dokumentation, testunderlag och metadata för produkt- och utvecklingsteamet. Supabase används som backend och innehåll kan genereras både via mallar (utan LLM) och via LLM (Claude/Ollama).

> **📚 Dokumentation**: [`docs/README.md`](docs/README.md) - Översikt över all dokumentation  
> **🏗️ Funktionalitet & Arkitektur**: [`docs/architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](docs/architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md) - Komplett översikt  
> **🔄 Dataflöden**: [`docs/architecture/DATAFLOW_OVERVIEW.md`](docs/architecture/DATAFLOW_OVERVIEW.md) - Dataflödesöversikt  
> **⚙️ Snabbstart**: [`docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`](docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md) - Detaljerad utvecklingsguide

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

> 📋 **För detaljerad snabbstart och utvecklingsguide, se [`docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`](docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md)**

---

## 📚 Viktiga Länkar

### För Utvecklare
- **Snabbstart & Utveckling**: [`docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`](docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md)
- **Funktionalitet & Arkitektur**: [`docs/architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`](docs/architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md)
- **Dataflöden**: [`docs/architecture/DATAFLOW_OVERVIEW.md`](docs/architecture/DATAFLOW_OVERVIEW.md)
- **Arkitektur**: [`docs/architecture/bpmn-hierarchy-architecture.md`](docs/architecture/bpmn-hierarchy-architecture.md)
- **API Reference**: [`docs/architecture/guides/API_REFERENCE.md`](docs/architecture/guides/API_REFERENCE.md)

### För Test Lead
- **Test Lead Guide**: [`docs/guides/user/README_FOR_TESTLEAD.md`](docs/guides/user/README_FOR_TESTLEAD.md)
- **Test Export**: [`docs/testing/TEST_EXPORT.md`](docs/testing/TEST_EXPORT.md)
- **Test Coverage Guide**: [`docs/guides/user/TEST_COVERAGE_USER_GUIDE.md`](docs/guides/user/TEST_COVERAGE_USER_GUIDE.md)

### Funktioner & Funktionalitet
- **Funktioner**: [`docs/features/FEATURES_AND_FUNCTIONALITY.md`](docs/features/FEATURES_AND_FUNCTIONALITY.md)
- **Jira-namngivning**: [`docs/features/JIRA_NAMING.md`](docs/features/JIRA_NAMING.md)
- **Integrationer**: [`docs/features/INTEGRATIONS.md`](docs/features/INTEGRATIONS.md)
- **Test-scenarion**: [`docs/testing/TEST_SCENARIOS.md`](docs/testing/TEST_SCENARIOS.md)
- **Batch-generering**: [`docs/templates/BATCH_GENERATION.md`](docs/templates/BATCH_GENERATION.md)

### Testing
- **Teststrategi**: [`docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md`](docs/testing/strategy/TEST_OVERVIEW_AND_GAPS.md) | [`docs/testing/strategy/TEST_IMPLEMENTATION_PLAN.md`](docs/testing/strategy/TEST_IMPLEMENTATION_PLAN.md)
- **Testguide**: [`docs/testing/TESTING.md`](docs/testing/TESTING.md)
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

> 📋 **För alla kommandon, se [`docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`](docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md)**

---

## ✨ Huvudfunktioner

- Deterministisk BPMN-hierarki
- Dokumentgenerering (Feature Goals, Epics, Business Rules)
- Testgenerering (Playwright-testfiler)
- Visualisering (diagram, träd, listvy, timeline)
- LLM-integration (Claude/Ollama)
- Versioning och historik

> 📋 **För komplett lista, se [`docs/features/FEATURES_AND_FUNCTIONALITY.md`](docs/features/FEATURES_AND_FUNCTIONALITY.md)**

---

## 📍 Lokal URL
`http://localhost:8080/`

---

## 🧭 TODO & Framtida Förbättringar

Se [TODO.md](TODO.md) för en detaljerad, prioriterad lista över uppgifter och förbättringar.

Se [Feature Roadmap](docs/features/FEATURE_ROADMAP.md) för strategiska funktioner och långsiktiga visioner.

---

## 📦 Bygga för produktion

```bash
npm run build        # Produktionsbygg
npm run build:dev    # Utvecklingsbygg (med source maps)
```

Bygget lägger statiska filer under `dist/` som kan deployas bakom valfri reverse proxy.  
Se till att Supabase-URL/nycklar och edge-funktioner är korrekt konfigurerade i den miljö du deployar till.
