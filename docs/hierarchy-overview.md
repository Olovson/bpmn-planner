## Hierarkiöversikt

### Vad hierarkin används till
- **Process Explorer & strukturträd**: visualiserar hur CallActivities hänger ihop med underliggande uppgifter.
- **Generering av dokumentation/tester**: samma struktur används när vi kör lokalt eller med LLM – alla noder i hierarkin renderas utifrån den här modellen.
- **DoR/DoD & Jira‑kopplingar**: parentPath och node‑metadata används för att namnge kriterier och Jira‑mappningar konsekvent.
- **Planerade scenarion & testrapporter**: hierarkin är underlag när generatorn seedar `node_planned_scenarios` per nod/provider och när coverage i testrapporten räknas ut.

### Hur den byggs
1. `buildBpmnProcessGraph` tar toppfilen och läser in alla subprocess‑beroenden (`bpmn_dependencies`).
2. Varje fil tolkas med `buildBpmnHierarchy` som skapar ett trädperspektiv:
   - Roten (`Process`) motsvarar filens initiativnamn.
   - CallActivities → “Feature Goals”.
   - User/Service/BusinessRule Tasks → epics/detaljerade noder.
3. När Process Explorer, dokumentationsgeneratorn eller lokalgenereringen körs byggs hela grafen först, därefter vandrar vi igenom noderna i samma struktur.

### Nytt: Processnoder + subprocesser i trädet
- ProcessExplorer‑trädet visar nu både CallActivities **och** subprocess‑processer:
  - Process‑noder får ett humaniserat namn baserat på processnamn/id/fil (t.ex. `mortgage-se-application.bpmn` → “Application”).
  - När en Call Activity matchar en subprocess läggs subprocessens processnod in som barn under CallActivityn.
  - Resultat: `Mortgage → Application → Internal data gathering → …` där flera steg kommer från olika BPMN‑filer men visas i ett sammanhängande träd.

### Varför det fungerar
- Lokalgenerering/LLM använder samma graf; sequence‑flow‑ordning sparas som metadata (orderIndex/scenarioPath) men hierarkin styr fortfarande struktur och artefakter.
- När vi genererar artefakter används samma noder för att:
  - skapa hierarkiska Playwright‑tester,
  - seeda bas‑scenarion för `local-fallback` i `node_planned_scenarios`,
  - räkna coverage i testrapporten.

### Så använder vi den i koden
- `useProcessTree` bygger klienthierarkin från `ProcessModel` (process + subprocess‑noder).
- `ProcessExplorer` och `ProcessTreeD3` renderar resultatet.
- `generateAllFromBpmnWithGraph` använder samma struktur när vi genererar dokumentation, tester, DoR/DoD och subprocess-mappningar.
