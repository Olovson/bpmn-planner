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

### Nytt: Flattening av subprocesser
- Tidigare visades varje subprocess-fil som en egen “process”-nod i trädet (t.ex. `Automatic credit evaluation → mortgage-se-credit-evaluation → Fetch price`).
- Nu flätar vi in subprocessens barn direkt under CallActivityn:
  - `useProcessTree` håller ett `visited`-set så varje fil analyseras en gång.
  - När en CallActivity matchar en subprocessfil hämtar vi barnen från den filen och stoppar in dem direkt under CallActivityn.
  - Eventuella artefakter på subprocessnivån kopieras till CallActivityn.
  - Resultat: `Mortgage → Automatic credit evaluation → Fetch price…` utan extra fil-nod, men all metadata/artefakter finns kvar.

### Varför det fungerar
- Lokalgenerering/LLM använder samma graf; genom att hoppa över processnoder i UI:t undviker vi extra nivåer utan att tappa data.
- Eftersom analysering/rendering fortfarande sker per fil finns inga risker för missad dokumentation – flatteningen påverkar bara visualisering och parentPath‑presentationen.
- När vi genererar artefakter används samma noder för att:
  - skapa hierarkiska Playwright‑tester,
  - seeda bas‑scenarion för `local-fallback` i `node_planned_scenarios`,
  - räkna coverage i testrapporten.

### Så använder vi den i koden
- `useProcessTree` bygger klienthierarkin och flattenar subprocesser enligt ovan.
- `ProcessExplorer` och `ProcessTreeD3` renderar resultatet.
- `generateAllFromBpmnWithGraph` använder samma struktur (dock med egna in-memory set för att undvika dubbletter) när vi genererar dokumentation, tester, DoR/DoD och seedar planerade scenarion.
