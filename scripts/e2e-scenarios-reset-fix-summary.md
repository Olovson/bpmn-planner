# E2E Scenarios Reset Fix - Sammanfattning

**Datum:** 2025-01-XX  
**Status:** ✅ Fixad - E2E scenarios raderas nu från Storage vid reset

---

## Problem

**Användarobservation:**
- När man kör "Reset registret" så tas inte E2E scenarios bort från Supabase Storage
- E2E scenarios finns kvar i `e2e-scenarios/` mappen även efter reset

**Orsak:**
- I `supabase/functions/reset-generated-data/index.ts` raderades E2E scenarios från databasen (`e2e_scenarios` tabellen)
- Men E2E scenarios sparas också i Storage i `e2e-scenarios/` mappen (med version hash)
- Reset-funktionen raderade bara `tests` och `tests/e2e` från Storage, men inte `e2e-scenarios/`

**Var sparas E2E scenarios?**
- **Databas:** `e2e_scenarios` tabellen (raderades korrekt)
- **Storage:** `e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json` (raderades INTE)

---

## Lösning

**Ändring:**
- Lade till `e2e-scenarios` till listan över storage-prefixes som ska raderas när `shouldDeleteTests` är `true`
- Detta gäller både för full reset (`!safeMode`) och safe mode (`safeMode`)

**Kodändring:**
- Fil: `supabase/functions/reset-generated-data/index.ts`
- Rad: 247-270
- Ändring: Lade till `'e2e-scenarios'` till `storagePrefixes` när `shouldDeleteTests` är `true`

---

## Testning

**För att testa fixen:**
1. Generera E2E scenarios för en fil
2. Verifiera att de finns i Storage (`e2e-scenarios/` mappen)
3. Kör "Reset registret"
4. Verifiera att:
   - E2E scenarios raderas från databasen (`e2e_scenarios` tabellen)
   - E2E scenarios raderas från Storage (`e2e-scenarios/` mappen)

---

## Slutsats

✅ **Problemet är fixat** - E2E scenarios raderas nu från både databasen och Storage när man kör "Reset registret".

⚠️ **OBS:** Detta är ett separat problem från version hash-problemet och planned scenarios-problemet, men alla tre kan uppstå samtidigt.

