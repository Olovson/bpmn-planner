# Snabbstart & Utveckling

Det här är en **koncis och korrekt** snabbstart som matchar nuvarande kodbas.

## Förutsättningar

- Node.js + npm
- Supabase lokalt (startas via script)

## Starta lokalt

```bash
npm install
npm run start:supabase
npm run dev
```

Appen körs på:
```
http://localhost:8080/
```

## Inloggning (lokal seed)

Standard‑seed (om seed är skapad):
```
seed-bot@local.test / Passw0rd!
```

## Test Environment

The project uses a separate Supabase test project for running tests safely without affecting production data.

### Test Database Setup

The test database is automatically seeded with baseline data:

```bash
npm run seed:test-db         # Seed test database with user + BPMN fixtures
npm run reset:test-db        # Reset and re-seed test database
```

**Test credentials:**
```
seed-bot@local.test / Passw0rd!
```

**What gets seeded:**
- Test user (seed-bot@local.test)
- 4 BPMN fixture files with subprocess relationships:
  - `mortgage.bpmn` (root process)
  - `mortgage-se-application.bpmn` (subprocess)
  - `mortgage-se-internal-data-gathering.bpmn` (subprocess)
  - `simple-process.bpmn` (simple test file)
- Storage bucket `bpmn-files`

### Running Tests

```bash
npm test                     # Vitest (unit + integration)
npm run dev:test             # Run dev server with test environment
npx playwright test          # Playwright E2E tests
```

**Environment separation:**
- **Production:** `.env.local` → production Supabase (for local dev)
- **Test:** `.env.test` → test Supabase (for all tests)

Both seed and reset scripts include safety checks to prevent accidentally running against production.

For more details, see [docs/analysis/TEST_ENVIRONMENT_PLAN.md](../../analysis/TEST_ENVIRONMENT_PLAN.md).

## Local Development Commands

```bash
npm run dev                  # Dev server (production Supabase)
npm run dev:test             # Dev server (test Supabase)
npm run check:db             # Kontrollera lokalt DB‑schema
npm run supabase:reset       # Reset local Supabase
```

## När något ser fel ut i DB

I dev‑läge gör appen en schema‑check. Om du ser varning om saknade kolumner:

```bash
npm run check:db
```

## Länkar vidare

- Testgenerering: `docs/testing/TEST_GENERATION.md`
- Validera nya BPMN‑filer: `docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`
- Arkitektur: `docs/architecture/ARCHITECTURE_OVERVIEW.md`
