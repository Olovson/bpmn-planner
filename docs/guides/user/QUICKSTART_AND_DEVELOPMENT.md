# Snabbstart & Utveckling

Det här är en **koncis och korrekt** snabbstart som matchar nuvarande kodbas.

## Förutsättningar

- **Node.js 20+** (rekommenderat: v20.18.1 LTS) + npm
- Supabase lokalt (startas via script)

**OBS:** Node.js 20+ krävs för att köra integration tests med jsdom och bpmn-js.

## Starta lokalt

```bash
# Om du använder nvm:
nvm use 20  # eller: nvm install 20

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
- BPMN‑fixturefiler för hela mortgage‑domänen (2026‑snapshot):
  - Alla `.bpmn`‑filer i `tests/fixtures/bpmn/mortgage-se 2026.01.04 16:30`
    (t.ex. `mortgage.bpmn`, `mortgage-se-application.bpmn`, `mortgage-se-object-information.bpmn`, m.fl.)
  - `simple-process.bpmn` (extra enkel testfil)
- Storage‑bucket `bpmn-files`
- En `bpmn-map.json` i storage baserad på den manuella mappen från 2025‑snapshoten

### Running Tests

```bash
npm test                     # Vitest (unit + integration)
npm run dev:test             # Run dev server with test environment
npx playwright test          # Playwright E2E tests
```

**Environment separation:**
- **Production (lokal):** `.env.local` → Supabase som körs lokalt via CLI (`npm run start:supabase`)
- **Test (moln):** `.env.test` → Supabase‑projektet i molnet (`bpmn-planner-test`) för alla tester

Both seed and reset scripts include safety checks to prevent accidentally running against production.

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
