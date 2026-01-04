# Analys: Testinfo‑generering (uppdaterad)

## Mål

1. **E2E endast för true root**
   - Root definieras av `bpmn-map.json` (`orchestration.root_process`).
2. **Feature Goal‑tester för uppladdade filer**
   - Given/When/Then skapas för de BPMN‑filer som genereras.
   - Även filer utan callActivities ska kunna få Feature Goal‑tester.

## Hur systemet fungerar nu

### Root‑detektering

- Root hämtas primärt från `bpmn-map.json` (storage).
- Fallback: dependencies/heuristik om map saknas.

### E2E‑scenarier

- Genereras **endast** för root‑filen (enligt bpmn‑map).
- Subprocess‑filer får inga E2E‑scenarier.

### Feature Goal‑scenarier

- Genereras **direkt från Feature Goal‑dokumentation** (LLM).
- **Ingen extraktion från E2E**.
- För filer utan callActivities används processens Feature Goal‑doc:
  - `bpmn_element_id = {baseName}` (t.ex. `mortgage-se-household`).

## Konsekvens för uppladdningsscenarier

- **Endast subprocess‑fil uppladdad** → 0 E2E, **Feature Goal‑tester genereras**.
- **Root + subprocesser uppladdade** → E2E endast för root, Feature Goal för varje genererad fil.

## Status

- ✅ E2E endast för true root
- ✅ Feature Goal‑tester genereras per uppladdad fil
- ✅ Fungerar även för filer utan callActivities
