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
│   └── user/
│       ├── QUICKSTART_AND_DEVELOPMENT.md
│       ├── README_FOR_TESTLEAD.md
│       └── TEST_COVERAGE_USER_GUIDE.md
│
├── architecture/                      # Arkitekturdokumentation
│   ├── bpmn-hierarchy-architecture.md
│   ├── ARCHITECTURE_OVERVIEW.md
│   ├── DATAFLOW_OVERVIEW.md
│   ├── FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md
│   ├── BPMN_VERSIONING_STRATEGY.md
│   ├── VERSIONING_FINAL_DECISION.md
│   ├── VERSIONING_IMPLEMENTATION_COMPLETE.md
│   ├── FUNCTIONALITY_ANALYSIS_SUMMARY.md
│   ├── DOCUMENTATION_STATUS.md
│   ├── STRUCTURE.md (denna fil)
│   └── guides/
│       └── API_REFERENCE.md
│
├── features/                          # Funktionalitet och funktioner
│   ├── FEATURES_AND_FUNCTIONALITY.md
│   ├── JIRA_NAMING.md
│   ├── INTEGRATIONS.md
│   ├── FEATURE_ROADMAP.md
│   ├── GANTT_TIMELINE_ANALYSIS.md
│   └── GANTT_TIMELINE_IMPLEMENTATION_SUMMARY.md
│
├── testing/                           # Testdokumentation
│   ├── TESTING.md
│   ├── TEST_EXPORT.md
│   ├── TEST_SCENARIOS.md
│   ├── test-report-views.md
│   ├── TEST_SCENARIO_GENERATION.md
│   ├── TEST_MAPPING_DESIGN_SCENARIOS.md
│   └── strategy/
│       ├── TEST_OVERVIEW_AND_GAPS.md
│       └── TEST_IMPLEMENTATION_PLAN.md
│
├── templates/                         # Mallar och templates
│   ├── BATCH_GENERATION.md
│   ├── CODEX_BATCH_AUTO.md
│   ├── PROMPT_VERSIONING.md
│   ├── FALLBACK_SAFETY.md
│   ├── BUSINESS_RULE_TEMPLATE_CONTENT.md
│   ├── EPIC_TEMPLATE_CONTENT.md
│   ├── FEATURE_GOAL_TEMPLATE_CONTENT.md
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
│       └── README.md
│
└── scripts/                           # Script-dokumentation
    └── GENERATE_BPMN_DIAGRAMS.md
```

---

## Kategorier

### 1. Guider (`guides/user/`)
Användarguider och instruktioner för olika roller (test lead, utvecklare, etc.).

### 2. Arkitektur (`architecture/`)
Teknisk dokumentation om systemarkitektur, dataflöden, versioning, etc.

### 3. Funktioner (`features/`)
Beskrivningar av funktionalitet, funktioner, Jira-namngivning, integrationer.

### 4. Testing (`testing/`)
Testdokumentation, strategier, guider och test-scenarion.

### 5. Templates (`templates/`)
Mallar, batch-generering, prompt-versionering, HTML-templates.

### 6. Analysis (`analysis/historical/`)
Temporära analyser och historiska dokument (arkiverade för referens).

---

## Filnamnskonventioner

- **Huvuddokument**: `UPPERCASE_WITH_UNDERSCORES.md` (t.ex. `TEST_EXPORT.md`)
- **Guider**: `UPPERCASE_WITH_UNDERSCORES.md` (t.ex. `QUICKSTART_AND_DEVELOPMENT.md`)
- **Arkitektur**: `lowercase-with-hyphens.md` eller `UPPERCASE.md` (t.ex. `bpmn-hierarchy-architecture.md`)
- **Analyser**: Flyttas till `analysis/historical/`

---

## Förbättringar

**Före:** 71+ filer i root, svårt att hitta rätt dokument  
**Efter:** Strukturerad i mappar, lätt att navigera

**Före:** Många temporära analyser blandade med viktiga dokument  
**Efter:** Historiska analyser arkiverade i `analysis/historical/`
