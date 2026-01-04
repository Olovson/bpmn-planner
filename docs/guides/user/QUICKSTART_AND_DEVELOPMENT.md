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

## Vanliga kommandon

```bash
npm test                     # Vitest
npx playwright test          # Playwright E2E
npm run check:db             # Kontrollera lokalt DB‑schema
npm run supabase:reset        # Reset Supabase
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
