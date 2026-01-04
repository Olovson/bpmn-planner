# Test Coverage – användarguide

## Var hittar jag det?

Gå till `/test-coverage` i appen.

## Vad sidan visar

- **Process‑trädets täckning** per nod.
- **E2E‑scenarier** som laddas från Supabase Storage (versionerade paths).
- **Planerade testscenarier** från `node_planned_scenarios`.

## Viktiga funktioner

- **Scenario‑val:** välj vilket E2E‑scenario som ska användas som fokus.
- **View modes:** `condensed`, `hierarchical`, `full`.
- **Sökning:** filtrera noder efter namn/ID.
- **Export:** HTML och XLSX‑export av tabeller.

## Om något saknas

- Kör generering från `/files` (alla filer).
- Kontrollera att E2E‑scenarier finns i storage.
- Kontrollera `node_planned_scenarios` för Feature Goal‑scenarier (origin `claude-direct`).

