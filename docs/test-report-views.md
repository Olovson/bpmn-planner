## Test report-vyer i BPMN Planner

Det finns två olika testrapport‑vyer i applikationen med tydliga roller:

### 1. Global testrapport – `/test-report`

- Path: `#/test-report`
- Komponent: `src/pages/TestReport.tsx`
- Syfte: Ge en övergripande bild av test‑läget för hela systemet.
- Innehåll:
  - Aggregerade KPI:er (antal planerade scenarion, coverage, pass‑rate, senaste körning m.m.).
  - Planerade scenarion per nod och BPMN‑fil.
  - Körda tester från `test_results` med filter.
- Filter:
  - Provider: `all`, `local-fallback`, `chatgpt`, `ollama`.
  - Process/BPMN‑fil, status, typ m.m.
- Viktigt: sidan ska **inte** initialt filtreras på en specifik nod. Den kan visa ett scope per BPMN‑fil, men det är en global vy – nodspecifik drill‑down sker via `NodeTestsPage`.

### 2. Nodspecifik testrapport – `/node-tests`

- Path: `#/node-tests?bpmnFile=...&elementId=...` (eller `nodeId=...`)
- Komponent: `src/pages/NodeTestsPage.tsx`
- Syfte: Visa en detaljerad dashboard för **en specifik nod**.
- Innehåll:
  - Sammanfattning för noden (namn, BPMN‑fil, id).
  - Planerade scenarion per provider för just den noden.
  - Faktiska körda tester (Playwright) för noden.
  - Länkar tillbaka till den globala testrapporten.

### Navigation mellan vyerna

- Från diagram/dashboard/overlays kan man:
  - Gå till global rapport: `#/test-report` (utan att låsa vy:n till en nod).
  - Gå till nodspecifik rapport: `#/node-tests?...` för att se allt för den noden.
- `NodeTestsPage` har en knapp "Tillbaka till testrapport" som leder tillbaka till den globala vyn.

Genom att hålla isär dessa roller:

- `TestReport` används för **systemnivå**‑överblick och jämförelser.
- `NodeTestsPage` används för **drill‑down** på en enskild nod.

