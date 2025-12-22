# Strategiska förbättringar: Testinformation generering

**Datum:** 2025-12-22  
**Fokus:** Strategiska förbättringar utöver kritiska buggar

## Översikt

Utöver de kritiska buggarna (som redan är dokumenterade i `TEST_INFORMATION_GENERATION_ANALYSIS.md`) finns flera strategiska förbättringar som skulle förbättra systemets användbarhet, konsistens och underhållbarhet.

## Prioriterade strategiska förbättringar

### 1. Enhetlig dataflöde och konsistens (Hög prioritet)

**Problem:**
- Två separata system (testfiler i Storage vs planned scenarios i Database) skapar förvirring
- Användare ser olika scenarios i olika delar av appen
- Ingen tydlig "single source of truth" för testinformation

**Förbättring:**
- **Unifiera testinformation:** Bestäm en primär källa för testscenarios
  - **Alternativ A:** `node_planned_scenarios` är primär källa, testfiler hämtar scenarios därifrån
  - **Alternativ B:** Testfiler är primär källa, scenarios extraheras och sparas i `node_planned_scenarios` för visning
  - **Rekommendation:** Alternativ A - databasen är bättre för querying, versioning, och konsistens

**Påverkan:**
- ✅ Konsistent data i hela appen
- ✅ Enklare underhåll
- ✅ Bättre möjlighet till versioning och historik

**Relaterade komponenter:**
- `src/lib/testGenerators.ts` - testgenerering
- `src/lib/bpmnGenerators.ts` - dokumentationsgenerering
- `src/hooks/useNodeTests.ts` - UI-hook för att visa testinformation
- `src/pages/NodeTestsPage.tsx` - UI för att visa tester
- `src/components/RightPanel.tsx` - visar planned scenarios

---

### 2. Bättre synkronisering mellan dokumentation och tester (Hög prioritet)

**Problem:**
- Epic user stories genereras i dokumentationen
- Testscenarios genereras separat via LLM
- Ingen garanti att de matchar eller är konsistenta

**Förbättring:**
- **Epic → Test pipeline:** När Epic genereras med user stories:
  1. Extrahera scenarios från user stories (`buildScenariosFromEpicUserStories()`)
  2. Spara till `node_planned_scenarios` med `origin: 'llm-doc'`
  3. Använd dessa scenarios som grund för testgenerering (istället för att generera nya via LLM)
  
- **Feature Goal → Test pipeline:** För call activities:
  - Använd scenarios från child epics som grund
  - Aggregera scenarios från subprocess-noder
  - Spara aggregerade scenarios för Feature Goal

**Påverkan:**
- ✅ Testscenarios matchar dokumentationen
- ✅ Mindre LLM-anrop (använder befintlig data)
- ✅ Bättre traceability från dokumentation till tester

**Relaterade komponenter:**
- `src/lib/bpmnGenerators.ts` - Epic-generering (rad 2286-2323)
- `src/lib/testGenerators.ts` - Testgenerering
- `src/lib/plannedScenariosHelper.ts` - Scenario-hantering

---

### 3. Versioning och historik för testscenarios (Medel prioritet)

**Problem:**
- Scenarios sparas utan versioning
- När dokumentationen uppdateras, finns inget sätt att se gamla scenarios
- Svårt att spåra när scenarios ändrades eller varför

**Förbättring:**
- **Versioning:** Koppla scenarios till BPMN-version (liknande dokumentation)
  - Spara scenarios med `bpmn_version_hash` eller `generated_at` timestamp
  - Behåll historik när scenarios uppdateras
  - Visa vilken version som används i UI

- **Change tracking:** Spåra när scenarios ändras
  - Vem ändrade (om manuell redigering)
  - Varför ändrades (automatisk från dokumentation, manuell, etc.)
  - Diff mellan versioner

**Påverkan:**
- ✅ Bättre spårbarhet
- ✅ Möjlighet att återställa gamla scenarios
- ✅ Förståelse för hur scenarios utvecklats över tid

**Relaterade komponenter:**
- `supabase/migrations/` - databasschema för `node_planned_scenarios`
- `src/lib/plannedScenariosHelper.ts` - scenario-hantering
- `src/pages/NodeTestsPage.tsx` - UI för att visa scenarios

---

### 4. Bättre UI för testinformation (Medel prioritet)

**Problem:**
- Testinformation visas på flera ställen (NodeTestsPage, RightPanel, TestReport)
- Olika vyer visar olika data
- Svårt att få en överblick över teststatus

**Förbättring:**
- **Unifierad testvy:** En central plats för all testinformation
  - Visa alla scenarios för en nod (från alla källor)
  - Visa teststatus (passing/failing/pending)
  - Visa länkar till testfiler
  - Visa historik och versioning

- **Test coverage dashboard:** Överblick över teststatus
  - Antal scenarios per nod
  - Test coverage per BPMN-fil
  - Scenarios som saknar tester
  - Scenarios som behöver uppdateras

**Påverkan:**
- ✅ Bättre användarupplevelse
- ✅ Lättare att hitta och hantera testinformation
- ✅ Tydligare överblick över teststatus

**Relaterade komponenter:**
- `src/pages/NodeTestsPage.tsx` - nodspecifik testvy
- `src/pages/TestReport.tsx` - global testrapport
- `src/components/RightPanel.tsx` - sidebar med testinformation

---

### 5. Automatisk validering och konsistenscheckar (Låg prioritet)

**Problem:**
- Inga automatiska checkar att scenarios matchar dokumentationen
- Inga varningar när scenarios är inkonsistenta
- Svårt att upptäcka problem tidigt

**Förbättring:**
- **Konsistenscheckar:** Automatiska valideringar
  - Scenarios i dokumentationen matchar scenarios i `node_planned_scenarios`
  - Testfiler innehåller scenarios som finns i databasen
  - Inga dubbletter eller konflikter mellan källor

- **Varningar i UI:** Visa när problem upptäcks
  - "Scenarios i dokumentationen matchar inte databasen"
  - "Testfiler innehåller scenarios som inte finns i databasen"
  - "Scenarios saknas för denna nod"

**Påverkan:**
- ✅ Tidig upptäckt av problem
- ✅ Bättre dataquality
- ✅ Mindre manuellt arbete för att hitta inkonsistenser

**Relaterade komponenter:**
- `src/lib/testDataHelpers.ts` - data-hantering
- `src/hooks/useNodeTests.ts` - UI-hook
- `src/pages/NodeTestsPage.tsx` - UI för att visa varningar

---

### 6. Export och integration (Låg prioritet)

**Problem:**
- Testinformation är svår att exportera eller integrera med andra verktyg
- Ingen standardiserad format för testscenarios
- Svårt att använda testinformation utanför appen

**Förbättring:**
- **Standardiserat exportformat:** Exportera testscenarios
  - JSON-format för testscenarios
  - Excel-export för test coverage
  - Integration med testverktyg (t.ex. Playwright, Jest)

- **API för testinformation:** Exponera testdata via API
  - REST API för att hämta scenarios
  - Webhook för att notifiera när scenarios ändras
  - Integration med CI/CD-pipelines

**Påverkan:**
- ✅ Bättre integration med externa verktyg
- ✅ Möjlighet att använda testinformation i andra system
- ✅ Bättre workflow för testhantering

**Relaterade komponenter:**
- `src/lib/testExport.ts` - export-funktionalitet
- `supabase/functions/` - API-endpoints (om implementerat)

---

## Prioriteringsrekommendation

### Fas 1: Grundläggande fixar (Nuvarande fokus)
1. ✅ Fixa kritiska buggar (redan dokumenterade)
2. ✅ Implementera enhetlig dataflöde (#1)
3. ✅ Synkronisera dokumentation och tester (#2)

### Fas 2: Förbättringar (Nästa steg)
4. Versioning och historik (#3)
5. Bättre UI (#4)

### Fas 3: Avancerade funktioner (Framtida)
6. Automatisk validering (#5)
7. Export och integration (#6)

---

## Mätvärden för framgång

För att mäta om förbättringarna fungerar:

1. **Konsistens:**
   - % av noder där scenarios i dokumentationen matchar scenarios i databasen
   - % av noder där testfiler innehåller scenarios från databasen

2. **Användbarhet:**
   - Tid att hitta testinformation för en nod
   - Antal steg för att uppdatera testscenarios
   - Användarfeedback på testinformation-UI

3. **Underhållbarhet:**
   - Tid att fixa inkonsistenser
   - Antal buggar relaterade till testinformation
   - Kodkomplexitet för testinformation-hantering

---

## Relaterade dokument

- `TEST_INFORMATION_GENERATION_ANALYSIS.md` - Analys av nuvarande problem
- `TODO.md` - Prioriterad lista över uppgifter
- `FEATURE_ROADMAP.md` - Strategiska funktioner och visioner
