# Test Files Storage Cleanup

## Problem

När testerna körs och genererar dokumentation, sparas dokumentationsfilerna i Supabase Storage under paths som innehåller testfilnamnet. När testfilerna sedan raderas via UI (via `cleanupTestFiles`), raderas bara BPMN-filerna från databasen, men dokumentationsfilerna i Storage raderas inte automatiskt.

**Exempel på testfiler i Storage:**
- `docs/claude/mortgage-se-object.bpmn/{versionHash}/feature-goals/test-1766756640384-113-test-parent-call-activity.bpmn`
- `test-1766756640384-113-test-parent-call-activity.bpmn` (BPMN-fil i root)

## Lösning

### Script för att rensa testfiler från Storage

Skapat `scripts/cleanup-test-files-from-storage.ts` som:

1. **Listar alla filer rekursivt** i:
   - `docs/claude/` (dokumentation)
   - `tests/` (tester)
   - `llm-debug/` (debug artifacts)
   - Root (BPMN-filer)

2. **Identifierar testfiler** baserat på mönster:
   - Filnamn eller path innehåller `test-{timestamp}-{random}-`
   - Exempel: `test-1766756640384-113-test-parent-call-activity.bpmn`

3. **Rensar testfiler** från Storage

### Användning

```bash
# Dry-run (visar vad som skulle raderas utan att faktiskt radera)
npm run cleanup:test-files:storage:dry

# Faktisk cleanup (raderar testfiler)
npm run cleanup:test-files:storage
```

### När ska detta köras?

- **Efter test-sessioner** - När du har kört många tester och vill rensa
- **Periodiskt** - För att hålla Storage ren
- **Innan produktion** - För att säkerställa att inga testfiler finns kvar

## Framtida Förbättringar

1. **Automatisk cleanup i `delete-bpmn-file` Edge Function** - Uppdatera `supabase/functions/delete-bpmn-file/index.ts` för att också rensa dokumentationsfiler från Storage när en BPMN-fil raderas. Detta skulle automatiskt rensa dokumentationsfiler för både produktions- och testfiler.

2. **Automatisk cleanup i `cleanupTestFiles`** - Uppdatera `tests/playwright-e2e/utils/testCleanup.ts` för att också rensa dokumentationsfiler från Storage när testfiler raderas via UI.

3. **Bättre identifiering** - Förbättra identifieringen av testfiler i Storage paths (t.ex. versioned paths som innehåller testfilnamn).

## Nuvarande Status

✅ **Script skapat:** `scripts/cleanup-test-files-from-storage.ts`
✅ **NPM-scripts tillagda:** `cleanup:test-files:storage` och `cleanup:test-files:storage:dry`
✅ **70 testfiler raderade från Storage**

⚠️ **Notera:** `delete-bpmn-file` Edge Function raderar bara BPMN-filen från Storage, inte dokumentationsfiler. Detta är varför testfiler kan lämnas kvar i Storage.

## Verifiering

Efter att ha kört cleanup-scriptet, verifiera att testfilerna är borta:

```bash
# Kör dry-run igen för att se om några testfiler finns kvar
npm run cleanup:test-files:storage:dry
```

