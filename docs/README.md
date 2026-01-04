# BPMN Planner – Dokumentation (översikt)

Det här `docs/`‑trädet samlar **aktuell** dokumentation som är spårbar till koden.
Om något inte stämmer ska dokumenten uppdateras eller länkas om.

> 📋 **Struktur:** Se `docs/architecture/STRUCTURE.md` för aktuell dokumentationsstruktur.

---

## 🚀 Snabbstart

- **Snabbstart & Utveckling:** `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`
- **Arkitekturöversikt:** `docs/architecture/ARCHITECTURE_OVERVIEW.md`
- **Dataflöden:** `docs/architecture/DATAFLOW_OVERVIEW.md`

---

## 📚 Dokumentationskategorier

### 🎯 Användarguider (`guides/user/`)
- `QUICKSTART_AND_DEVELOPMENT.md` – Snabbstart och utvecklingsguide
- `README_FOR_TESTLEAD.md` – Guide för test lead
- `TEST_COVERAGE_USER_GUIDE.md` – Hur Test Coverage‑vyn fungerar
- `WHAT_IS_GENERATED_WHEN_GENERATING_TESTINFO.md` – Vad som genereras vid testinfo

### ✅ Validering (`guides/validation/`)
- `VALIDATE_NEW_BPMN_FILES.md` – Bas‑validering av nya BPMN‑filer

### 🏗️ Arkitektur (`architecture/`)
- `ARCHITECTURE_OVERVIEW.md` – Systemöversikt
- `DATAFLOW_OVERVIEW.md` – Dataflöden
- `FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md` – Funktioner mappade till kod

### 🧪 Testing (`testing/`)
- `TEST_GENERATION.md` – Hur testgenerering fungerar just nu

### 📝 Templates (`templates/`)
- Innehåller mallar och prompt‑stöd för dokumentationsgenerering

### 📋 Confluence (`confluence/`)
- Mallar och exempel på Confluence‑sidor (se `docs/confluence/`)

### 📁 Analysis (`analysis/`)
- Historiska analyser och utredningar. Dessa kan vara **utdaterade**.

---

## Nyckelidéer (nuvarande beteende)

- **Processgrafen är central**
  Processgrafen byggs client‑side och används för dokumentation, testinfo, UI‑hierarki och coverage.

- **Filordning för dokumentationsgenerering**
  Ordningen byggs via traversal av callActivities i UI‑ordning (inte en ren topologisk sort över dependency‑graph).
  Se `src/lib/bpmnGenerators.ts` för faktisk logik.

- **E2E‑scenarier**
  Genereras med LLM (om aktiverat) och sparas i versionerade storage‑paths:
  `e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json`.

- **Feature Goal‑tester**
  Genereras direkt från Feature Goal‑dokumentation med Claude och sparas i `node_planned_scenarios` (origin `claude-direct`).

- **Dokumentation i storage**
  HTML‑dokument sparas per BPMN‑version:
  `docs/claude/{bpmnFile}/{versionHash}/{docFileName}`.
