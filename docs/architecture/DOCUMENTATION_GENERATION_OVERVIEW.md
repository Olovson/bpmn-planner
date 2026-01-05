# Dokumentationspipline – Feature Goals, Epics och Business Rules

Detta dokument beskriver hur **Claude‑baserad dokumentation** genereras och lagras för:

- Feature Goals (callActivities / subprocesser)
- Epics (User Tasks / Service Tasks)
- Business Rules (BusinessRuleTasks)

Syftet är att undvika att vi tappar bort hur pipelinen fungerar vid framtida refaktoreringar.

## 1) Översikt

- Startpunkt: `generateAllFromBpmnWithGraph` i `src/lib/bpmnGenerators.ts`.
- LLM‑ och templatelager:
  - `src/lib/llmDocumentation.ts` – anropar LLM och returnerar `text + docJson`.
  - `src/lib/documentationTemplates.ts` – modeller (`*DocModel`), mapping och HTML‑rendering.
  - `src/lib/bpmnGenerators/docRendering.ts` – hjälpare (`renderDocWithLlm`) som kopplar ihop LLM + template.
- Lagring:
  - HTML sparas i Supabase Storage bucket `bpmn-files` enligt `artifactPaths.buildDocStoragePaths`.
  - JSON‑strukturen bäddas in i HTML (via `wrapDocument`) och används för E2E‑scenarier m.m.

## 2) Gemensam LLM‑pipeline

För alla tre dokumenttyper (`feature`, `epic`, `businessRule`) är pipen:

1. `generateDocumentationWithLlm(docType, context, links, ...)` hämtar **rå JSON** från Claude:
   - `FeatureGoalDocModel`, `EpicDocModel`, `BusinessRuleDocModel`.
2. `renderFeatureGoalDoc` / `renderEpicDoc` / `renderBusinessRuleDoc`:
   - bygger basmodell från `NodeDocumentationContext`,
   - läser overrides från `src/data/node-docs/*` (om de finns),
   - applicerar LLM‑patch (`map*LlmToSections` + `mergeLlmPatch`),
   - validerar modellen (`validate*ModelAfterMerge`),
   - renderar HTML‑body med respektive `build*DocHtmlFromModel`,
   - packar allt i `wrapDocument(title, body, llmMetadata)` som lägger på `<html>`, CSS och metadata.
3. Resultatet är ett **fullständigt HTML‑dokument** med inbäddad JSON som Doc Viewer visar direkt.

Hjälpfunktion: `renderDocWithLlm` i `src/lib/bpmnGenerators/docRendering.ts` kapslar in stegen ovan så att
`bpmnGenerators.ts` slipper känna till detaljer.

## 3) Feature Goal‑dokumentation

**Vad:** dokumenterar subprocesser (callActivities) på en högre nivå (Feature Goals).

- DocType: `feature`.
- Modell: `FeatureGoalDocModel` (se `docs/templates/FEATURE_GOAL_TEMPLATE_CONTENT.md`).
- Generering:
  - För root‑process och subprocesser anropas:
    - `renderDocWithLlm('feature', ...)` från `generateAllFromBpmnWithGraph`.
  - `childrenDocumentation` fylls med epics/business rules (sammanfattning + flowSteps) så att Feature Goal‑prompten
    får kontext om vad child‑noder gör.
- Lagring:
  - Process Feature Goals (non‑hierarkiska): `feature-goals/{subprocessBaseName}.html`.
  - CallActivity‑Feature Goals (hierarkiska, om/ när det används): `feature-goals/{parentFileBase}-{elementId}.html`.

Doc Viewer (`src/pages/DocViewer.tsx`) mappar `nodes/...` som är callActivities till motsvarande Feature Goal‑fil.

## 4) Epic‑dokumentation (User/Service Tasks)

**Problem vi just fixade:** Epics genererades tidigare via `llmService.generateNodeDocumentation` och sparades som
**rå LLM‑text utan template**, vilket gav ospännande / ostylad HTML och tappad JSON.

**Nuvarande beteende (korrekt pipeline):**

- DocType: `epic`.
- Modell: `EpicDocModel` (se `docs/templates/EPIC_TEMPLATE_CONTENT.md`).
- I `generateAllFromBpmnWithGraph`:
  - För `userTask`/`serviceTask`:
    - kallas nu `renderDocWithLlm('epic', ...)` i stället för `llmService.generateNodeDocumentation`.
    - `onLlmResult`‑callback:
      - sätter `llmFinalProvider` / `llmFallbackUsed`,
      - extraherar `summary`, `flowSteps`, `inputs`, `outputs`, `scenarios`, `userStories` från `docJson`
        och stoppar in i `generatedChildDocs`.
  - Resultatet:
    - HTML är ett komplett dokument via `wrapDocument` med samma shell som Feature Goals.
    - `generatedChildDocs` innehåller strukturerad epic‑data som används för:
      - Feature Goal‑dokumentation (ingående epics),
      - file‑level JSON (E2E‑generering).

Doc Viewer visar epics genom att hämta denna fulla HTML, så styling och struktur är nu samma nivå som Feature Goals.

## 5) Business Rule‑dokumentation

**Problem:** Samma som för epics – tidigare användes bara rå LLM‑text.

**Nuvarande beteende:**

- DocType: `businessRule`.
- Modell: `BusinessRuleDocModel` (se `docs/templates/BUSINESS_RULE_TEMPLATE_CONTENT.md`).
- I `generateAllFromBpmnWithGraph`:
  - För `businessRuleTask`:
    - kallas `renderDocWithLlm('businessRule', ...)`.
    - `onLlmResult` extraherar:
      - `summary`, `decisionLogic` (mappas till `flowSteps` i child‑docinfo),
      - `inputs`, `outputs`, ev. `userStories` / `scenarios`.
    - Dessa sparas i `generatedChildDocs` för Feature Goals och file‑level JSON.
    - Om ingen DMN‑länk finns läggs en enkel statisk förklarings‑text till i HTML.

## 6) Varför vissa dokument skrivs om

- Feature Goals: Process‑Feature‑Goal‑dokumentation **regenereras alltid** när du kör
  "Generera information (alla filer)". De använder den senaste epic/business rule‑JSON:en.
- Epics/Business Rules:
  - regenereras när noden ingår i `nodesToGenerate` (t.ex. vid diff‑baserad regenerering),
  - använder alltid aktuell Claude‑konfiguration och aktuella BPMN‑filer.

Det innebär att gamla, tidigare ser "bra" ut, kan bli omskrivna när du ändrar BPMN eller promptar – men
nu sker det konsekvent genom samma modellbaserade pipeline istället för blandad, rå HTML.

## 7) Relaterade dokument

- `docs/templates/FEATURE_GOAL_TEMPLATE_CONTENT.md` – exakt JSON‑modell + krav för Feature Goals.
- `docs/templates/EPIC_TEMPLATE_CONTENT.md` – modell + innehållskrav för epics.
- `docs/templates/BUSINESS_RULE_TEMPLATE_CONTENT.md` – modell + innehållskrav för business rules.
- `docs/architecture/DATAFLOW_OVERVIEW.md` – hög nivå över dataflöde (den här filen kompletterar sektion 5–7 där).

