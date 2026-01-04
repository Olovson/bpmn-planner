# 🚀 BPMN Planner

**BPMN Planner** tar BPMN-/DMN‑filer, bygger en processgraf, visualiserar processen och genererar dokumentation, testinfo och metadata. Supabase används som backend, och LLM‑stöd används för text- och scenariogenerering när det är aktiverat.

> **📚 Dokumentation**: `docs/README.md` – Översikt över dokumentation
> **🏗️ Arkitektur**: `docs/architecture/ARCHITECTURE_OVERVIEW.md`
> **🔄 Dataflöden**: `docs/architecture/DATAFLOW_OVERVIEW.md`
> **⚙️ Snabbstart**: `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`

---

## 🚀 Snabbstart

```bash
git clone https://github.com/Olovson/bpmn-planner.git
cd bpmn-planner
npm install
npm run start:supabase  # Starta Supabase
npm run dev             # Starta dev-server (http://localhost:8080/)
```

**Inloggning (lokal seed):** `seed-bot@local.test / Passw0rd!`

---

## 📚 Viktiga länkar

- **Snabbstart & utveckling**: `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`
- **Testgenerering**: `docs/testing/TEST_GENERATION.md`
- **Test Coverage‑guide**: `docs/guides/user/TEST_COVERAGE_USER_GUIDE.md`
- **Validera nya BPMN‑filer**: `docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`

---

## 🛠️ Vanliga kommandon

```bash
# Utveckling
npm run dev
npm run build

# Test-miljö (Supabase TEST-projekt)
npm run seed:test-db     # Seed test database (user + BPMN fixtures)
npm run reset:test-db    # Reset and re-seed test database
npm run dev:test         # Starta dev-server mot TEST-Supabase (http://localhost:8080/)

# Supabase (lokal)
npm run start:supabase
npm run supabase:reset

# Tester
npm test                 # Vitest (använder .env.test)
npx playwright test      # Playwright E2E (använder test environment)
```

---

## 📍 Lokal URL

`http://localhost:8080/`

---

## 🧭 TODO & Framtida förbättringar

Se `TODO.md` och `docs/status/*`.
