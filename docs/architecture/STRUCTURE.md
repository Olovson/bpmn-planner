# Arkitektur – Struktur

Detta katalogträd innehåller den **faktiska** arkitekturdokumentationen baserad på nuvarande implementation.
Allt här ska kunna spåras tillbaka till verklig kod i `src/` och Supabase‑funktionerna i `supabase/functions/`.

## Filer

- `docs/architecture/ARCHITECTURE_OVERVIEW.md`
  - Systemöversikt: runtime, viktiga moduler, kärnflöden.
- `docs/architecture/DATAFLOW_OVERVIEW.md`
  - End‑to‑end dataflöden (BPMN → parse → graph → generering → storage/UI).
- `docs/architecture/FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`
  - Funktioner mappade till arkitektur: vilka delar som gör vad.

## Källor i kodbasen

Den här dokumentationen baseras främst på:
- UI & routing: `src/App.tsx`, `src/pages/*`, `src/components/*`
- BPMN parsing och graf: `src/lib/bpmnParser.ts`, `src/lib/bpmnProcessGraph.ts`, `src/lib/bpmn/*`
- Generering av dokumentation/test: `src/lib/bpmnGenerators.ts` och underkataloger
- Storage/DB: `src/integrations/supabase/*`, `src/hooks/*`, `src/lib/*` (främst storage/paths)
- Edge functions: `supabase/functions/*`

## Scope

Det här är en **arkitektur‑snapshot** av hur appen fungerar just nu.
Om något inte stämmer, uppdatera dokumentet och länka till exakt fil/sektion i koden.
