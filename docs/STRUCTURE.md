# Dokumentationsstruktur

**Uppdaterad:** 2025-01-XX  
**Syfte:** Beskriver strukturen i `docs/`-mappen

---

## Mappstruktur

```
docs/
├── README.md                          # Huvudöversikt (start här!)
│
├── guides/                            # Användarguider
│   ├── user/
│   │   ├── README_FOR_TESTLEAD.md
│   │   ├── TEST_COVERAGE_USER_GUIDE.md
│   │   └── QUICKSTART_AND_DEVELOPMENT.md
│   └── ...
│
├── architecture/                      # Arkitekturdokumentation
│   ├── bpmn-hierarchy-architecture.md
│   ├── ARCHITECTURE_OVERVIEW.md
│   ├── DATAFLOW_OVERVIEW.md
│   ├── FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md
│   ├── hierarchy-overview.md
│   └── guides/
│       └── API_REFERENCE.md
│
├── features/                          # Funktionalitet och funktioner
│   ├── FEATURES_AND_FUNCTIONALITY.md
│   ├── JIRA_NAMING.md
│   ├── INTEGRATIONS.md
│   └── FEATURE_ROADMAP.md
│
├── testing/                           # Testdokumentation
│   ├── TESTING.md
│   ├── TEST_EXPORT.md
│   ├── TEST_SCENARIOS.md
│   ├── test-report-views.md
│   └── strategy/
│       ├── TEST_OVERVIEW_AND_GAPS.md
│       └── TEST_IMPLEMENTATION_PLAN.md
│
├── templates/                         # Mallar och templates
│   ├── BATCH_GENERATION.md
│   ├── CODEX_BATCH_AUTO.md
│   ├── PROMPT_VERSIONING.md
│   ├── FALLBACK_SAFETY.md
│   └── html/                          # HTML-mallar
│       ├── feature-goals/
│       ├── epics/
│       └── rules/
│
├── confluence/                        # Confluence-dokumentation
│   ├── README.md
│   ├── template.md
│   └── ...
│
├── project-organization/              # Projektorganisation
│   ├── README.md
│   └── ...
│
├── analysis/                          # Analysdokument (temporära)
│   └── historical/                    # Historiska analyser
│
└── scripts/                           # Script-dokumentation
    └── GENERATE_BPMN_DIAGRAMS.md
```

---

## Kategorier

### 1. Guider (guides/)
Användarguider och instruktioner för olika roller.

### 2. Arkitektur (architecture/)
Teknisk dokumentation om systemarkitektur, dataflöden, etc.

### 3. Funktioner (features/)
Beskrivningar av funktionalitet och funktioner.

### 4. Testing (testing/)
Testdokumentation, strategier och guider.

### 5. Templates (templates/)
Mallar, batch-generering, prompt-versionering.

### 6. Analysis (analysis/)
Temporära analyser och historiska dokument.

---

## Filnamnskonventioner

- **Huvuddokument**: `UPPERCASE_WITH_UNDERSCORES.md` (t.ex. `TEST_EXPORT.md`)
- **Guider**: `UPPERCASE_WITH_UNDERSCORES.md` (t.ex. `QUICKSTART_AND_DEVELOPMENT.md`)
- **Arkitektur**: `lowercase-with-hyphens.md` (t.ex. `bpmn-hierarchy-architecture.md`)
- **Analyser**: `UPPERCASE_ANALYSIS.md` eller flyttas till `analysis/historical/`
