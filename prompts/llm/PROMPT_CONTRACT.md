# PROMPT_CONTRACT – LLM-dokumentations- och testkontrakt

Denna fil beskriver de kontrakt som alla LLM-promptar i `prompts/llm/` måste följa.  
Detta är **utvecklardokumentation** – inte en prompt som skickas till modellen.

## 1. Gemensamma principer för dokumentationspromptar

- Schema-first: alla dokumentationstyper bygger på `DocTemplateSchema` och `SECTION_RENDERERS`.
- LLM genererar **endast body-innehåll** för definierade sektioner, i exakt ordning.
- Rubriker, metadata, tabeller och full HTML-wrapper (`<html>`, `<head>`, `<body>`) skapas i koden.
- Allowed tags i LLM-output:
  - `<p>`, `<ul>`, `<ol>`, `<li>`, `<code>`
- Förbjudna element:
  - `<h1>`–`<h6>`, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
  - `<html>`, `<head>`, `<body>`, `<style>`, `<script>`, layouttaggar (`<section>`, `<header>`, `<footer>`, `<article>` …)
- Ingen metadata i LLM-output:
  - ingen titel, inget BPMN-id, inga Jira-nycklar, inga filnamn, inga versioner.
- Inga extra sektioner:
  - ingen avslutande “Sammanfattning”, “Övrigt”, “Appendix” eller text efter sista definierade sektionen.
- Vid osäkerhet:
  - **utelämna hellre en rad än att hitta på** specifika namn, ID:n eller policydetaljer.

### 1.1 processContext och currentNodeContext

- Alla dokumentationspromptar för Feature, Epic och Business Rule får idag en input payload med:
  - `processContext`: kondenserad översikt för hela processen:
    - `processName`, `fileName`,
    - `entryPoints[]`, `keyNodes[]` med minst: id, name, type, file,
    - samt grov fas (`phase`, t.ex. "Ansökan", "Datainsamling", "Riskbedömning", "Beslut") och lane/roll (`lane`, t.ex. "Kund", "Handläggare", "Regelmotor") per nyckelnod.
  - `currentNodeContext`: detaljer för aktuell BPMN‑nod:
    - `node` (id, name, type, file, jiraType, derivedJiraName),
    - `hierarchy` (trail/path, featureGoalAncestor, parentProcess),
    - `parents`, `siblings`, `children`, `descendantHighlights`, `flows`, `documentation`, `jiraGuidance`, `links`.

- Promptarna instruerar modellen att:
  - använda `processContext.phase` och `processContext.lane` för att placera noden i rätt fas/roll i kreditprocessen,
  - låta `summary`, `flowSteps`, `effectGoals`, `decisionLogic`, `scenarios` spegla denna fas/roll,
  - **inte hitta på** egna faser/roller eller system utanför det som går att härleda från dessa fält.

## 2. DocSectionId per dokumenttyp (ordning)

### 2.1 Feature Goal (type = "Feature")

DocSectionId-ordning:
1. `title-metadata` (renderas alltid centralt, ingen LLM-output)
2. `summary`
3. `scope`
4. `epics-overview`
5. `flow`
6. `dependencies`
7. `business-scenarios`
8. `test-linking`
9. `implementation-notes`
10. `related-items`

Feature-prompten i `feature_epic_prompt.md` fyller **endast** sektion 2–10, i denna ordning.

### 2.2 Epic (type = "Epic")

DocSectionId-ordning:
1. `title-metadata` (centralt)
2. `summary`
3. `inputs`
4. `flow`
5. `outputs`
6. `business-rules-policy`
7. `business-scenarios`
8. `test-linking`
9. `implementation-notes`
10. `related-items`

Epic-prompten i `feature_epic_prompt.md` fyller **endast** sektion 2–10, i denna ordning.

### 2.3 Business Rule / DMN

DocSectionId-ordning:
1. `title-metadata` (centralt)
2. `summary`
3. `inputs`
4. `decision-logic`
5. `outputs`
6. `business-rules-policy`
7. `business-scenarios`
8. `test-linking`
9. `implementation-notes`
10. `related-items`

Business Rule-prompten i `dmn_businessrule_prompt.md` fyller **endast** sektion 2–10, i denna ordning.

## 3. Radformatkontrakt (line formats)

Följande textmönster används i flera promptar och ska vara konsekventa:

### 3.1 Inputs

Används i Business Rule (`inputs`) och Epic (`inputs`).

- Varje inputfält representeras av **en rad** med exakt dessa nycklar och ordning:

```text
Fält: …; Datakälla: …; Typ: …; Obligatoriskt: Ja/Nej; Validering: …; Felhantering: …
```

- Typisk rendering: en `<ul>` med en `<li>` per rad.

### 3.2 Outputs

Används främst i Epic (`outputs`) och i Business Rule (`outputs`) i liknande stil.

Rekommenderat mönster:

```text
Output: …; Konsument: …; Typ: …; Innehåll: …; Användning: …
```

### 3.3 Dependencies

Används i Feature (`dependencies`) och kan återanvändas där beroenden listas.

```text
Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>.
```

### 3.4 Affärs-scenarion & testbarhet (docs)

Gemensamt för Feature / Epic / Business Rule (`business-scenarios`):

```text
Scenario: …; Typ: Happy/Edge/Error; Beskrivning: …; Förväntat utfall: …
```

- `Typ` använder alltid exakt värdena `Happy`, `Edge`, `Error`.
- Dessa scenarier är affärsnära och används som underlag för tester, men innehåller ingen teknisk testlogik.

### 3.5 Numeriska tröskelvärden

I dokumentationspromptarna (Feature/Epic/Business Rule) ska **konkreta numeriska tröskelvärden** (t.ex. kreditpoäng, belopp, belåningsgrad, skuldkvot, ålder) alltid markeras som exempel.

- När ett tal används som tröskel anges det med suffixet:

```text
(exempelvärde)
```

Exempel:

- `Skuldkvot över 6.0 (exempelvärde)`
- `Kreditvärdighet under 620 (exempelvärde)`
- `Belåningsgrad över 85 % (exempelvärde)`

Detta påverkar endast **textinnehållet** – JSON-strukturen och fältnamnen är oförändrade.

## 4. Testscript JSON-kontrakt

`testscript_prompt.md` styr **endast** generering av testscenarier i JSON, inte HTML.

Output **måste** vara ren JSON med följande struktur:

```json
{
  "scenarios": [
    {
      "name": "…",
      "description": "…",
      "expectedResult": "…",
      "type": "happy-path" | "error-case" | "edge-case",
      "steps": ["…", "…", "…"]
    }
  ]
}
```

Kontrakt:
- `scenarios` är alltid en array (typiskt 3–5 scenarier, styrs av JSON-schema i koden).
- Varje scenarioobjekt innehåller exakt fälten:
  - `name`, `description`, `expectedResult`, `type`, `steps`.
- `type` är alltid en av:
  - `"happy-path"`, `"error-case"`, `"edge-case"`.
- `steps` är 3–6 korta stegbeskrivningar (strängar).
- Ingen text före eller efter JSON, inga code fences, ingen HTML.

Semantisk koppling:
- Affärs-scenarion i dokumentationen använder `Typ: Happy/Edge/Error`.
- Testscenarier mappar detta till:
  - `Happy` → `happy-path`
  - `Edge` → `edge-case`
  - `Error` → `error-case`

## 5. Vad som inte får ändras utan konsekvensanalys

- DocSectionId-ordning per typ (Feature/Epic/Business Rule).
- Tillåtna HTML-taggar i dokumentationspromptar.
- Radformat för:
  - inputs,
  - outputs,
  - dependencies,
  - affärs-scenarion.
- JSON-kontraktet för testscript (`scenarios[]`-schema).

Ändringar i dessa kontrakt kräver:
- uppdatering av relevanta promptar,
- genomgång av SECTION_RENDERERS/renderFromSchema,
- uppdatering av tester och ev. regressionssnapshots.
