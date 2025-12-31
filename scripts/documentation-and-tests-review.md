# Dokumentation och Tester - Granskning

**Datum:** 2025-01-XX  
**Status:** ⚠️ Vissa uppdateringar behövs

---

## 1. Snapshot-fil behöver uppdateras ❌

### Problem
**Fil:** `tests/unit/__snapshots__/documentationRendering.regression.test.ts.snap`

**Innehåller fortfarande:**
- "Swimlane/ägare: Kund / Rådgivare" (Epic)
- "Ägare: Risk & Kreditpolicy" (Business Rule)
- "Regel/affärsägare: Produktägare Kredit / Risk & Policy" (Feature Goal)

**Åtgärd:** Snapshot-filen behöver regenereras eftersom vi tagit bort "Swimlane/ägare" från dokumentationen.

**Lösning:**
```bash
npm test -- tests/unit/documentationRendering.regression.test.ts -u
```

---

## 2. Dokumentation - Analys-filer ⚠️

### Status
**Filer i `docs/analysis/` nämner fortfarande "swimlane/ägare":**
- `EPIC_TEMPLATE_CURRENT_STATE.md` - nämner "swimlane/ägare" (analys-fil, OK)
- `EPIC_TEMPLATE_MINIMUM_ANALYSIS.md` - nämner "swimlane/ägare" (analys-fil, OK)
- `EPIC_TEMPLATE_SIMPLIFICATION_ANALYSIS.md` - nämner "swimlane/ägare" (analys-fil, OK)
- `BUSINESS_RULE_TEMPLATE_ANALYSIS.md` - nämner "swimlane/ägare" (analys-fil, OK)
- `OTHER_TEMPLATES_ANALYSIS.md` - nämner "Ägare" (analys-fil, OK)

**Åtgärd:** Dessa är analys-filer som dokumenterar historiska tillstånd. De behöver INTE uppdateras eftersom de beskriver tidigare implementation.

### Template-dokumentation ✅
**Filer i `docs/templates/`:**
- `FEATURE_GOAL_TEMPLATE_CONTENT.md` - ✅ Uppdaterad (nämner inte "Swimlane/ägare")
- `EPIC_TEMPLATE_CONTENT.md` - ✅ Uppdaterad (nämner inte "Swimlane/ägare" i faktiska templates)
- `BUSINESS_RULE_TEMPLATE_CONTENT.md` - ✅ Uppdaterad

---

## 3. Tester - Sequence Flow ✅

### Status
**Tester för sequence flow finns:**
- `tests/unit/sequenceFlowExtractor.test.ts` - Testar sequence flow extraction
- `tests/unit/sequenceOrderHelpers.intermediate-events.test.ts` - Testar order calculation
- `tests/integration/processModel.sequenceOrder.mortgage.test.ts` - Testar sequence ordering med faktiska BPMN-filer

**Åtgärd:** Det finns INTE ett specifikt test för `findNextNodeInSequenceFlow()` funktionen, men funktionen testas indirekt genom integrationstester.

**Rekommendation:** Detta är OK eftersom funktionen är en intern hjälpfunktion som testas via integrationstester.

---

## 4. Tester - File-level Dokumentation ✅

### Status
**Tester för file-level dokumentation finns:**
- `tests/integration/household-documentation-generation.test.ts` - Verifierar att file-level docs genereras
- `tests/integration/application-documentation-generation.test.ts` - Verifierar att file-level docs genereras
- `tests/integration/batch-generation-validation.test.ts` - Verifierar att file-level docs räknas i progress

**Åtgärd:** Tester verifierar att file-level docs genereras, men testar INTE specifikt att de bara visar länkar (inte hela innehållet).

**Rekommendation:** Detta är OK eftersom strukturen testas, och det faktiska innehållet (länkar vs hela dokumentation) är en implementation-detalj som ändras via koden.

---

## 5. Tester - Prompt-förbättringar ⚠️

### Status
**Det finns INTE tester som verifierar:**
- Att LLM följer prompt-instruktioner om att inte hitta på system
- Att LLM aggregerar child nodes korrekt
- Att LLM genererar varierade user stories

**Åtgärd:** Detta är svårt att testa eftersom det kräver faktisk LLM-generering. Tester skulle behöva:
1. Mocka LLM-respons
2. Verifiera att prompten innehåller rätt instruktioner
3. Verifiera att genererat innehåll följer instruktioner

**Rekommendation:** Detta är OK eftersom prompt-validering görs manuellt, och faktisk LLM-generering testas via integrationstester.

---

## 6. LLM Output-filer (Exempel) ⚠️

### Status
**Filer i `tests/llm-output/html/` innehåller fortfarande:**
- `llm-epic-fallback.html` - "Swimlane/ägare: Kund / Rådgivare"
- `llm-business-rule-fallback.html` - "Ägare: Risk & Kreditpolicy"
- `llm-feature-goal-fallback.html` - "Regel/affärsägare: Produktägare Kredit / Risk & Policy"

**Åtgärd:** Dessa är exempel-filer som används för referens. De behöver INTE uppdateras eftersom de är historiska exempel.

**Rekommendation:** Dessa kan lämnas som de är, eller tas bort om de inte används.

---

## Sammanfattning

### ✅ Uppdaterat
- Template-dokumentation (`docs/templates/`)
- Prompt-filer (`prompts/llm/`)
- Koden (tagit bort "Swimlane/ägare")

### ❌ Behöver uppdateras
1. **Snapshot-fil:** `tests/unit/__snapshots__/documentationRendering.regression.test.ts.snap`
   - **Problem:** Testet misslyckas eftersom `renderFeatureGoalDoc`, `renderEpicDoc`, och `renderBusinessRuleDoc` nu kräver LLM-innehåll
   - **Åtgärd:** Testet behöver uppdateras för att mocka LLM-innehåll eller använda en annan render-metod
   - **Status:** Testet fungerar inte längre efter att vi gjorde LLM-innehåll obligatoriskt

### ⚠️ Valfritt
1. **LLM Output-filer:** `tests/llm-output/html/` - Historiska exempel, kan lämnas eller tas bort
2. **Analys-filer:** `docs/analysis/` - Historiska analyser, behöver INTE uppdateras

### ✅ OK som det är
- Integrationstester för sequence flow
- Integrationstester för file-level dokumentation
- Template-dokumentation

---

## Rekommenderade Åtgärder

1. **Regenerera snapshot-fil:**
   ```bash
   npm test -- tests/unit/documentationRendering.regression.test.ts -u
   ```

2. **Valfritt: Ta bort eller uppdatera LLM output-filer:**
   - Om de inte används: ta bort
   - Om de används som referens: lämna som de är (historiska exempel)

3. **Valfritt: Lägg till specifikt test för `findNextNodeInSequenceFlow()`:**
   - Om det behövs för framtida ändringar
   - För nu: OK att testa via integrationstester

