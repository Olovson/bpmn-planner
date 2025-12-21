# Funktioner och Funktionalitet

**Syfte:** Detaljerad beskrivning av appens funktioner

> 📋 **För komplett översikt, se `FUNCTIONALITY_AND_ARCHITECTURE_OVERVIEW.md`**

---

## ✨ Funktioner i korthet

- Deterministisk BPMN-hierarki  
- Subprocess-matchning med confidence score  
- Dokumentgenerering i två lägen (Local / Slow LLM)  
- Playwright-skapande automatiskt  
- **Design-scenarion** (`testMapping.ts`) för lokal testgenerering utan LLM
- **Integrationer-sida** (`#/integrations`) för hantering av Stacc vs. bankens integrationskällor
- **E2E Test Coverage** (`#/test-coverage`) - Visualisering av test-täckning med tre vyer (kondenserad, hierarkisk, fullständig)
- **E2E Quality Validation** (`#/e2e-quality-validation`) - Automatisk validering av test-scenarion mot BPMN
- Node Dashboard  
- SOT i Supabase Storage  
- Job queue för historik  
- Full diagnostik vid mismatch eller otydliga subprocesser  
- **Timeline / Planning View** - Gantt-chart för visualisering och redigering av tidsordning för subprocesser (använder orderIndex och visualOrderIndex för sortering)
- DMN-stöd (på väg)

---

## 📝 Vad som genereras

- Dokumentation per nod:
  - Feature Goals / Epics / Business Rules.
  - Effektmål, scenarier, inputs/outputs, beslutslogik, tekniska beroenden.
  - DoR/DoD-kriterier och övrig nodmetadata.
- Tester:
  - Playwright-skelett per nod eller gren.
  - Testscenarier via LLM i Slow LLM Mode (`generateTestSpecWithLlm`).
  - Design-scenarion från `testMapping.ts` för lokal generering (används när LLM är avstängt).
  - Node tests i UI (kopplade till `node_test_links`).
  - **Export-ready test scripts** för complete environment (se [Test Export](#-test-export) nedan).
- Övrig metadata:
  - Jira-typer/namn per nod (se [Jira-namngivning](#jira-namngivning) nedan).
  - Subprocess-mappningar (`bpmn_dependencies`) + diagnostik (`missingDependencies`).
  - Explicit BPMN-karta (`bpmn-map.json`) med kopplingar mellan BPMN-filer och subprocess-noder (både `callActivity` och vissa `subProcess`-noder) – används för att tydligt deklarera vilka delar av modellen som ska tolkas som externa subprocesser.

Alla artefakter lagras i Supabase (tabeller + storage) och kan regenereras från UI.

---

## 🛠️ Arbetsflöde i UI:t

1. **Files** – ladda upp BPMN/DMN eller synka GitHub.  
2. **Build hierarchy** – bygger deterministisk struktur.  
3. **Generate documentation** – välj Lokal fallback (ingen LLM), Claude (moln-LLM) eller Ollama (lokal LLM).  
4. Visa resultat i **Viewer / Tree / List / Timeline**.  
5. Justera metadata i **Node Matrix**.  
6. **Integrationer** (`#/integrations`) – hantera Stacc vs. bankens integrationskällor för Service Tasks.  
7. **Timeline** – visualisera och redigera tidsordning för subprocesser i Gantt-chart.  
8. **Test Coverage** (`#/test-coverage`) – visualisera E2E test-täckning och exportera till HTML/Excel.  
9. **E2E Quality Validation** (`#/e2e-quality-validation`) – validera test-scenarion och identifiera saknade komponenter.  
10. Öppna resultat i **Doc Viewer** eller **Node Tests**.  
11. **Återgenerera vid behov**.  
12. **Reset Registry** – rensa allt.

---

## 🧹 Återställning & städning

**Reset Registry** rensar:  
- dokument  
- tester  
- DoR/DoD  
- node-referenser  
- debugfiler  
- BPMN/DMN-filer  
- Auth-data

---

## 🆘 Support & felsökning

- `llm_generation_logs` i Supabase Studio  
- Rå-LLM finns i `llm-debug/docs` och `llm-debug/tests`  
- Process Tree 404 → starta edge-funktionen  
- Tomma dokument → kör Generate igen  
- Hierarki-problem → se diagnostics i Node Matrix
