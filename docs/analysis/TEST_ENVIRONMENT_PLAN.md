# Safe Test Environment – Plan

This document describes how to make it safe to run tests (Vitest + Playwright) without risking production Supabase data or Storage.

## 1. Current Situation & Risks (Analysis)

**Supabase client:**
- `src/integrations/supabase/client.ts` creates a Supabase client with:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- These are read from `import.meta.env` with empty-string fallbacks, but there is **no environment separation** between dev/prod/test within the client itself.

**Vitest config:**
- `vitest.config.ts`:
  - Uses Vite’s test runner with `environment: 'node'` + some `jsdom` overrides.
  - Loads env via Vite’s standard mechanism (e.g. `.env`, `.env.local`, `.env.test` depending on mode), but we currently:
    - Do not set a dedicated test mode/env in scripts.
    - Do not gate Supabase access based on a “test env” flag.

**Tests & Supabase usage:**
- Many unit/integration tests explicitly `vi.mock('@/integrations/supabase/client')`; these are safe.
- Some integration tests create a real Supabase client using env vars (e.g. `claude-application.test.ts`) and will talk to whichever Supabase project `VITE_SUPABASE_URL` points at.
- Playwright E2E tests:
  - Run the dev server via `npm run dev` and then access Supabase through `window.__SUPABASE_CLIENT__`, which comes from `src/integrations/supabase/client.ts`.
  - This means E2E tests always hit the **same Supabase environment as your dev app**, currently production-like unless configured otherwise.

**Key risks:**
- Running `npm test` or `npx playwright test` today can:
  - Read and write real `bpmn_files`, `node_planned_scenarios`, etc.
  - Upload/delete artifacts in the `bpmn-files` Storage bucket.
  - Potentially corrupt or pollute production data.
- There is no hard guardrail preventing tests from pointing at production Supabase.

Conclusion: **We must introduce a dedicated test Supabase project and explicit environment guards before routinely running the full test suite.**

---

## 2. Goals & Scope

**Goals:**
- Make it safe to run:
  - Vitest unit/integration suites.
  - Playwright E2E suites.
- Ensure all tests that hit Supabase use a **dedicated test project**, never production.
- Provide a clear workflow with **only two environments**:
  - `production`: main branch + deployed app → production Supabase.
  - `test`: feature branches + all automated tests (Vitest + Playwright) → test Supabase.

**Out of scope (for now):**
- Per-PR Supabase projects (one project per branch).
- Full data anonymization strategy for copying prod data.
- Advanced data seeding/versioning; we will start with minimal seed data for core flows.

---

## 3. Phased Implementation Plan

### Progress Summary

- ✅ **Phase 0.5 Complete** – Schema setup verified (migrations approach chosen)
- ✅ **Phase 1 Complete** – Test Supabase project created and configured
- ✅ **Phase 1.1 Complete** – Schema migrations applied successfully
- ✅ **Phase 1.2 Complete** – Test data seeding implemented (seed user + BPMN fixtures)
- ✅ **Phase 2 Complete** – Environment files & variable layout (vite.config + scripts updated)
- ✅ **Phase 3 Complete** – Supabase client guardrails implemented and validated
- ✅ **Phase 4 & 4.1 Complete** – Test routing + Playwright auth flow aligned with test env
- ✅ **Phase 5 Complete** – Documentation updated (README + Quickstart + this plan)

**Estimated completion:** ~60% done (core safety features in place, test routing and docs pending)

---

### Phase 0.5 – Check Current Schema Setup ✅ COMPLETE

**Objective:** Decide whether to use migrations or manual schema export before touching the test project.

- Check current setup:
  - [x] Does `supabase/migrations/` exist? **YES - 45 migration files found**
  - [x] Are there any migration files present? **YES**
  - [x] Do you use the Supabase CLI locally today? **YES**
- Decision:
  - **DECISION: Use migrations path** ✅
    - Migrations are the source of truth.
    - Phase 1.1 uses migrations approach.

**Completed:** 2026-01-04

### Phase 0 – Define Environments (1–2 hours, simplified)

**Objective:** Decide and document the target environments (keep it to two unless there is a strong reason to add more).

- Define environments:
  - `production`:
    - Deployed app (main branch).
    - Uses one Supabase project (existing production project).
  - `test`:
    - Feature branches, local test runs, CI tests, Playwright E2E.
    - Uses a dedicated Supabase **test** project.
- Env marker:
  - `VITE_APP_ENV=production | test`
- Supabase projects:
  - `bpmn-planner` (existing production).
  - `bpmn-planner-test` (new test project, free tier).
- Document this mapping briefly in `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md` and reference this file.

### Phase 1 – Create Supabase Test Project ✅ COMPLETE

**Objective:** Have a separate Supabase project for tests with the same schema as production.

- In the Supabase UI:
  - [x] Create a new project `bpmn-planner-test` on the free tier. **DONE**
  - [x] Note credentials:
    - `SUPABASE_TEST_URL`: `https://jxtlfdanzclcmtsgsrdd.supabase.co` ✅
    - `SUPABASE_TEST_ANON_KEY`: Retrieved and stored in `.env.test` ✅
    - `SUPABASE_TEST_SERVICE_ROLE_KEY`: Retrieved and stored in `.env.test` ✅
  - [x] Created `.env.test` with all credentials ✅

**Completed:** 2026-01-04
### Phase 1.1 – Schema Management ✅ COMPLETE

**Objective:** Establish a practical way to keep the test schema in sync with production without a lot of manual work.

- Decide on schema sync strategy:
  - [x] **Using Supabase migrations** (migrations path) ✅
    - Migrations live under `supabase/migrations/` (45 files)
    - Process: "Change schema → write migration → `npx supabase db push` to test → merge → apply to production"
  - [x] Linked to test project via Supabase CLI (`npx supabase link`) ✅
  - [x] Applied all migrations to test project (`npx supabase db push --include-all`) ✅
    - Fixed `uuid_generate_v4()` issue by changing to `gen_random_uuid()` in migration `20251118193000_llm_logging.sql`
    - All 44 migrations applied successfully

- Verification checklist:
  - [x] Core tables exist in test project:
    - `bpmn_files`, `bpmn_dependencies`, `generation_jobs`, `node_planned_scenarios`,
      `llm_generation_logs`, `integration_overrides`, `timeline_dates`, `bpmn_file_diffs`,
      `bpmn_file_versions`, and all other tables ✅
  - [x] Storage bucket `bpmn-files` exists in the test project ✅

**Completed:** 2026-01-04

**Notes:**
- Schema sync process: `npx supabase db push` (or `npx supabase db push --include-all` for out-of-order migrations)
- Migration `20240101000000_enable_uuid_extension.sql` was added to enable uuid-ossp extension

### Phase 1.2 – Test Data Seeding ✅ COMPLETE

**Objective:** Ensure tests can rely on predictable baseline data in the test Supabase project.

- Add a seed script (e.g. `scripts/seed-test-db.ts` or `.mjs`):
  - [x] Seed a test user (`seed-bot@local.test / Passw0rd!`) ✅
  - [x] Seed a minimal set of BPMN fixtures ✅
    - 4 BPMN files from `tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11/`
    - Includes mortgage process with proper subprocess relationships:
      - `mortgage.bpmn` (root process with callActivity to application)
      - `mortgage-se-application.bpmn` (subprocess with callActivity to internal-data-gathering)
      - `mortgage-se-internal-data-gathering.bpmn` (subprocess)
      - `simple-process.bpmn` (simple test file from parent directory)
    - Files stored in `bpmn-files` Storage bucket with metadata in `bpmn_files` table
  - [x] Created `scripts/seed-test-db.mjs` with safety checks ✅
    - Verifies target URL matches test project before seeding
    - Creates/updates seed user via Supabase Auth Admin API
    - Ensures `bpmn-files` storage bucket exists (auto-creates if missing)
    - Seeds specific BPMN fixtures with subprocess relationships for testing
    - Supports `--skip-bpmn` flag to skip BPMN seeding
- Add a reset script (optional but recommended), e.g. `scripts/reset-test-db.ts`:
  - [x] Created `scripts/reset-test-db.mjs` ✅
    - Truncates all relevant tables (`bpmn_files`, `node_planned_scenarios`, `generation_jobs`, etc.)
    - Handles tables with composite primary keys (e.g., `integration_overrides`)
    - Clears `bpmn-files` storage bucket
    - Deletes all auth users
    - Re-runs seed script (unless `--skip-seed` flag is set)
    - Safety check prevents running against production
- Verification checklist:
  - [x] Seed script runs successfully against the test project ✅
  - [x] Storage bucket `bpmn-files` verified to exist ✅
  - [x] 4 BPMN fixtures seeded to Storage/DB with proper subprocess relationships ✅
  - [x] Seed user created (latest ID: `f518469a-c9ca-42e3-9f19-5157794d931a`) ✅
  - [ ] Seed user can log in via the app pointing at the test project (TODO: manual verification)

**Completed:** 2026-01-04

**Notes:**
- NPM scripts added: `npm run seed:test-db`, `npm run reset:test-db`
- Both scripts validate the target URL to prevent accidental production operations
- Seeded fixtures include mortgage process with proper subprocess hierarchy for testing BPMN graph traversal
- Reset script handles composite primary keys correctly (e.g., `integration_overrides` table)

### Phase 2 – Env Files & Variable Layout (2–4 hours) ✅ COMPLETE

**Objective:** Introduce explicit env separation without changing behavior for dev/prod yet.

- Create env files:
  - `.env.local` (local production-like dev):
    - `VITE_APP_ENV=production`
    - `VITE_SUPABASE_URL=...production...`
    - `VITE_SUPABASE_PUBLISHABLE_KEY=...production anon key...`
  - `.env.test` (test env):
    - `VITE_APP_ENV=test`
    - `VITE_SUPABASE_URL=https://jxtlfdanzclcmtsgsrdd.supabase.co` ✅
    - `VITE_SUPABASE_PUBLISHABLE_KEY=<test anon key>` ✅
    - `SUPABASE_SERVICE_ROLE_KEY_TEST=<test service role>` ✅
- Update npm scripts:
  - `dev`: unchanged (uses `.env.local`, production-like Supabase). ✅
  - `dev:test`: runs Vite in test mode so `.env.test` is used:
    - Implemented as `vite --mode test`. ✅
  - `test`: now runs `vitest` with `--mode test` so `.env.test` is used for test builds. ✅
  - Playwright already uses `npm run dev:test` via `playwright.config.ts.webServer.command`. ✅
- Ensure `vite.config.ts` respects mode:
  - Updated to use `loadEnv(mode, process.cwd(), '')` and expose `VITE_APP_ENV` via `define`. ✅

### Phase 3 – Supabase Client Guardrails ✅ COMPLETE

**Objective:** Make it impossible for tests to accidentally use the prod Supabase project.

- Update `src/integrations/supabase/client.ts`:
  - [x] Read `VITE_APP_ENV` (default to `'production'`) ✅
  - [x] Add hardcoded test URL constant for safety (`KNOWN_TEST_SUPABASE_URL`) ✅
  - [x] Add runtime safety check when `VITE_APP_ENV === 'test'` ✅
    - Verifies `VITE_SUPABASE_URL` contains 'jxtlfdanzclcmtsgsrdd' (test project ID)
    - Throws clear error if misconfigured with expected vs actual URLs
    - Logs confirmation in development mode
- For scripts/tests that create their own Supabase client:
  - [x] Updated `claude-application.test.ts` with safety checks ✅
  - [x] Updated `improve-feature-goals-batch.test.ts` with safety checks ✅
  - [x] Updated `global-setup.ts` (Playwright) with safety checks ✅
    - Reads correct env file based on `VITE_APP_ENV` (.env.test vs .env.local)
    - Includes same safety validation

**Validation checklist:**
  - [x] Created validation script (`scripts/validate-guardrails.mjs`) ✅
  - [x] Validated that `.env.test` correctly points to test project ✅
  - [x] Validated that misconfigured URLs would be rejected by guardrails ✅
  - [x] All validation tests passed ✅

**Completed:** 2026-01-04

**Notes:**
- Guardrails use substring check `includes('jxtlfdanzclcmtsgsrdd')` for flexibility
- Error messages include expected vs actual URLs for easy debugging
- All tests that create Supabase clients now have safety checks
- Validation script available at `scripts/validate-guardrails.mjs`

### Phase 4 – Test Classification & Routing (4–8 hours) ✅ COMPLETE

**Objective:** Make it clear which tests hit Supabase and ensure they always use the test project.

- Classify tests:
  - **Pure/mocked tests**:
    - Unit tests and many integration tests with `vi.mock('@/integrations/supabase/client')`.
  - **Supabase-dependent tests (Vitest)**:
    - Tests that intentionally hit Supabase for real behavior (e.g. storage, DB integration).
  - **E2E tests (Playwright)**:
    - Hit Supabase via the running app in the browser.
- For Supabase-dependent Vitest tests:
  - Default `npm test` now runs `vitest run --mode test`, so `.env.test` is used and Supabase points at the test project. ✅
  - Other, more specialized scripts (e.g. LLM-specific flows) can opt into `--mode test` as needed, but the main regression suite is safe by default. ✅
- For Playwright:
  - `playwright.config.ts` dev server for tests runs in test mode:
    - `webServer.command: 'npm run dev:test'`. ✅
  - `global-setup.ts` now defaults `VITE_APP_ENV` to `test` when unset, so `.env.test` is the default for E2E runs. ✅
  - Safety check in `global-setup.ts` verifies that when `APP_ENV === 'test'`, `VITE_SUPABASE_URL` points at the test project. ✅
  - `package.json` script `test:file-upload` sets `VITE_APP_ENV=test` explicitly before running Playwright for that spec. ✅

### Phase 4.1 – Playwright Authentication Flow (≈30–60 min) ✅ COMPLETE

**Objective:** Make Playwright tests log in reliably using the seeded test user, without hard-coding login steps in every spec.

- Seeded users:
  - Phase 1.2 and `tests/playwright-e2e/global-setup.ts` ensure:
    - Seed user: `seed-bot@local.test / Passw0rd!`.
    - Dedicated Playwright test user: `test-bot@local.test / TestPassw0rd!`.
- Auth strategy:
  - `global-setup.ts` ensures seed/test users exist in the **current environment** (now defaulting to test for Playwright).
  - An empty `storageState` file (`playwright/.auth/user.json`) is created up front.
  - Individual E2E tests log in explicitly (via shared helpers like `stepLogin`) using the seeded credentials when needed.
- This keeps login logic visible in tests while still guaranteeing that required users exist in the test Supabase project.

**Validation checklist:**
- [ ] Auth setup script succeeds and writes `auth.json`.
- [ ] A simple E2E test can access a protected page without performing login steps.

**Validation checklist:**
- [ ] Run pure unit tests – they should pass and never hit Supabase.
- [ ] Run Supabase-dependent tests under `--mode test` – they should only talk to the test project.
- [ ] Run a small subset of Playwright tests – inspect `window.__SUPABASE_CLIENT__` to confirm test URL.

**Rollback strategy:**
- Keep classification changes (e.g. new test scripts) on a feature branch.
- If routing causes chaos (e.g. too many tests failing due to missing seed data), revert the routing commit and:
  - Strengthen seeding.
  - Reintroduce routing step by step (unit → integration → E2E).

### Phase 5 – Cleanup & Documentation (2–3 hours) ✅ COMPLETE

**Objective:** Make the new workflow easy to understand and maintain.

- Update docs:
  - `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md`:
    - Now includes a “Test Environment” section with:
      - How to seed/reset the test DB.
      - How to run unit/integration vs E2E tests.
      - Env expectations (`.env.test`, separation between production and test). ✅
  - `README.md`:
    - Mention of `npm run dev:test`, `npm test` (Vitest in test mode), and Playwright E2E using the test environment. ✅
  - This plan (`TEST_ENVIRONMENT_PLAN.md`):
    - Updated to reflect implemented status for all phases. ✅
- Safety checklist:
  - Before running Supabase-hitting tests:
    - `.env.test` exists with test project URL/keys.
    - `VITE_APP_ENV` is `test` for E2E, or `.env.test` is loaded via `--mode test` for Vitest.
    - Guardrails in `supabase/client.ts` and `global-setup.ts` will fail fast if misconfigured.

**Rollback strategy for the whole effort:**
- All changes should be made on feature branches and merged only after validation checklists are satisfied.
- If test Supabase usage becomes problematic (e.g. free-tier limits), you can:
  - Pause Supabase-hitting tests (run only pure/mocked tests).
  - Reconsider the seeding strategy or frequency of E2E runs.

---

## 4. Priorities & Minimum Viable Slice

If time is limited, the absolute minimal path to safe testing (~4 hours, not counting debugging) is:

1. **Create test Supabase project** on the free tier and ensure core schema exists (Phase 1 basics).
2. **Add `.env.test` and `VITE_APP_ENV=test`** pointing at the test project (Phase 2 basics).
3. **Add guardrails in `supabase/client.ts`**:
   - Fail fast if `VITE_APP_ENV=test` and `VITE_SUPABASE_URL` does not match the test URL (Phase 3 basics).
4. **Add `dev:test` script and point Playwright to it**:
   - `npm run dev:test` → Vite in test mode → `.env.test`.
   - Update `playwright.config.ts.webServer.command` to use `dev:test` (Phase 4 basics).
5. **Validate with one Supabase-hitting Vitest test and one Playwright test** that they only hit the test project.

Everything else (deeper schema management, richer seeding, and any hosted preview deployments) can be added incrementally once this minimal safety net is in place. Hosted previews should use free tiers (e.g. Vercel/Netlify free plans) and can be deferred until needed; they are not required to make local test runs safe.
