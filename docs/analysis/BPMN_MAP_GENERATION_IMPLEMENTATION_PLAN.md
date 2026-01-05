# BPMN Map – Implementeringsplan

Detta dokument bryter ner designen i `docs/architecture/BPMN_MAP_GENERATION_DESIGN.md` till konkreta steg med status‑checkboxar, så att arbetet kan pausas/återupptas enkelt.

> **Legend:**  
> - `[ ]` = ej påbörjad  
> - `[~]` = pågår / delvis klar  
> - `[x]` = klar

---

## Översikt – Faser

- [ ] **Fas 1 – Datamodell & schema‑utökning**  
- [ ] **Fas 2 – Heuristik‑cleanup i bpmnMapAutoGenerator**  
- [ ] **Fas 3 – Orchestrator + CLI‑script**  
- [ ] **Fas 4 – LLM‑refinementlager**  
- [ ] **Fas 5 – Persistens, merge & skydd**  
- [ ] **Fas 6 – Validering (self‑check) & guldtester**  
- [ ] **Fas 7 – Dokumentation & TODO‑uppdatering**

> **Arbetsflöde (git/GitHub):**  
> För hela arbetet med denna plan gäller:
> - Arbeta på en separat feature‑branch (t.ex. `feature/bpmn-map-generation`) – inte direkt på `main`.  
> - När faserna du vill genomföra är klara och validerade: merg:a feature‑branchen till `main`.  
> - Push:a sedan `main` till GitHub så att både kod, tester och dokumentation är synkade.

---

## Fas 1 – Datamodell & schema‑utökning

**Mål:** Säkerställa att `bpmn-map.json` har all metadata vi behöver för merge/LLM (process‑ID, match_status, source, needs_manual_review).

**Steg:**
- [ ] Uppdatera TypeScript‑typer för `BpmnMap` (i `bpmnMapLoader.ts` eller separat types‑fil) så att:
  - [ ] `processes[].call_activities[]` inkluderar:
    - [ ] `process_id` (kanoniskt fält i JSON‑mappen för parent process; mappas konsekvent mot vald interna process‑identifierare, t.ex. `internalId` i `ProcessDefinition`).
    - [ ] `bpmn_id`, `name`, `called_element` (finns delvis redan).
    - [ ] `subprocess_bpmn_file` (som idag).
    - [ ] `match_status: 'matched' | 'lowConfidence' | 'ambiguous' | 'unresolved'` (snake_case i JSON; konvertering sker på ett ställe från/til l ev. interna camelCase‑fält).
    - [ ] `needs_manual_review: boolean`.
    - [ ] `source: 'manual' | 'heuristic' | 'llm'`.
- [ ] Säkerställa bakåtkompatibilitet:
  - [ ] När map läses in utan dessa fält:
    - [ ] defaulta `source = 'manual'` om det finns en `subprocess_bpmn_file`.
    - [ ] annars `source = 'heuristic'` / `match_status = 'unresolved'` etc.
- [ ] Centralisera JSON ↔ intern modell‑konvertering:
  - [ ] Håll JSON‑schema tydligt (snake_case för nya fält) och låt loader/serializer göra all konvertering.
  - [ ] Undvik att blanda både `matchStatus` och `match_status` eller både `id` och `process_id` i den interna BpmnMap‑typen.
- [ ] Uppdatera valideringen i `bpmnMapStorage.validateBpmnMapStructure` så att den accepterar de nya fälten (men inte kräver dem för legacy‑maps).

---

## Fas 2 – Heuristik‑cleanup i `bpmnMapAutoGenerator`

**Mål:** Se till att auto‑generatorn producerar en komplett, konsekvent `BpmnMap` med korrekta `match_status`, `source` och per‑process‑callActivities.

**Steg:**
- [ ] Tydliggör ansvarsfördelning:
  - [ ] Gör `generateBpmnMapFromFiles()` så ren som möjligt: inga direkta Storage‑anrop, bara in/ut‑data (BPMN‑filer/parseResults in, `BpmnMap` + diagnostics ut).
  - [ ] Låt orchestratorn (Fas 3) äga all IO (läsa/spara map, prata med Supabase).
- [x] Säkerställa per‑process kopppling:
  - [x] Justera loopen så att vi per process använder rätt callActivities (inte bara globala `parseResult.callActivities`).
  - [x] För varje callActivity fyller i `process_id` (processens id) i map‑entryn.
- [x] Integrera `SubprocessMatcher`‑status:
  - [x] Låt `processMatchResult` skriva ut både `match_status` och `needs_manual_review` enligt designen.
  - [x] Sätt `source = 'heuristic'` för alla mappningar som kommer från heuristiken.
- [ ] Root‑processval:
  - [ ] Bygg root‑kandidater baserat på processer utan inbound `SubprocessLink`s.
  - [ ] Om `bpmn-map.json` redan har `orchestration.root_process`, bevara den som default.
  - [ ] Annars välj root enligt heuristik/regler i designen, och skriv till `orchestration.root_process`.
- [ ] Normalisera filnamn:
  - [ ] Säkerställa att `subprocess_bpmn_file` alltid är basename (utan mappstruktur).
  - [ ] Lägg ev. till hjälpfunktion om inte redan finns.
- [ ] Enkla tester:
  - [ ] Unit/integration‑test som kör `generateBpmnMapFromFiles` mot befintliga mortgage/household‑fixtures och kontrollerar:
    - [ ] att `match_status`/`needs_manual_review` fylls.
    - [ ] att `process_id` och `subprocess_bpmn_file` är rimliga.
    - [ ] Använd specifikt de två mortgage‑snapshot‑mapparna som huvudsakliga test‑fixtures:
      - [ ] `tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11`
      - [ ] `tests/fixtures/bpmn/mortgage-se 2026.01.04 16:30`

---

## Fas 3 – Orchestrator + CLI‑script

**Mål:** Ha ett centralt ställe som koordinerar läsning av befintlig map, heuristisk generering, LLM‑refinement och merge, samt ett script att köra.

**Steg:**
- [ ] Skapa ny modul `src/lib/bpmn/bpmnMapGenerationOrchestrator.ts` som:
  - [ ] Läser befintlig map (om den finns) via `loadBpmnMapFromStorage`.
  - [ ] Kör heuristisk `generateBpmnMapFromFiles()` som en ren funktion (ingen IO där inne).
  - [ ] Jämför befintlig map och heuristisk map:
    - [ ] identifierar nya callActivities (saknas i befintlig map),
    - [ ] identifierar konflikter (befintlig `subprocess_bpmn_file` ≠ ny heuristik).
  - [ ] Applicerar merge‑reglerna från designen (Fas 8.1):
    - [ ] `source = 'manual'` vinner alltid.
    - [ ] nya entries får `source = 'heuristic'`.
- [ ] Skapa CLI‑script `scripts/generate-bpmn-map.mjs`:
  - [ ] Läser flags (`--force`, `--no-llm`, `--preview`).
  - [ ] Initierar Supabase‑client via befintlig klient/guardrails (ingen specialväg): defaulta till test‑miljö (t.ex. `VITE_APP_ENV=test`), och var extra restriktiv vid `--force` i kombination med produktion.
  - [ ] Lägg till env‑safeguards:
    - [ ] Avbryt med tydlig varning om skriptet försöker overwrite:a map i en miljö som ser ut som “production” (enligt våra befintliga Supabase‑guardrails) utan explicit opt‑in.
  - [ ] Anropar orchestratorn och skriver ut en översiktlig rapport (stats, antal osäkra mappningar, ev. konflikter).

---

## Fas 4 – LLM‑refinementlager

**Mål:** Integrera Claude för svåra fall (lowConfidence/ambiguous/unresolved) på ett säkert och deterministiskt sätt.

**Steg:**
- [ ] Skapa ny modul `src/lib/bpmn/bpmnMapLlmRefinement.ts` som:
  - [ ] Tar in en `BpmnMap` + lista av callActivities att förfina (fil, process_id, bpmn_id, kandidater, heuristikstatus).
  - [ ] Bygger små, strukturerade prompts per callActivity (eller små batchar).
  - [ ] Använder befintlig LLM‑infrastruktur (abstraktionslager + provider‑resolver) med:
    - [ ] låg/0 temperatur,
    - [ ] tydligt JSON‑schema,  
    - [ ] robust JSON‑parsing med fallback (vid parse‑fel → ignorera LLM).
  - [ ] Returnerar en uppdaterad `BpmnMap` där:
    - [ ] callActivities med hög confidence får `subprocess_bpmn_file` uppdaterad + `source = 'llm'`.
    - [ ] övriga får behålla heuristikens status men ev. enriched diagnostics.
  - [ ] Koppla in LLM‑lagret i orchestratorn:
  - [ ] Respektera `--no-llm`‑flagga (hoppa över LLM).
  - [ ] Applicera beslutslogiken (confidence‑thresholds) enligt designen.
- [ ] Lägg till grundläggande tests:
  - [ ] En test som mockar LLM‑klienten och verifierar att:
    - [ ] endast callActivities med rätt status skickas.
    - [ ] hög confidence uppdaterar mappen enligt reglerna.
  - [ ] Återanvänd testmönster från befintliga LLM‑tester (mockad klient, snapshot/strukturella assertions) så vi inte uppfinner ett parallellt testsätt.
  - [ ] Lägg till minst ett manuellt integrationstest mot riktig Claude:
    - [ ] Använd en liten, representativ BPMN‑fixture och kör `bpmnMapLlmRefinement` med verklig LLM‑klient.
    - [ ] Spara svar/artefakter under t.ex. `tests/llm-output/` så att vi kan jämföra vid behov.
    - [ ] Kör detta test via ett separat npm‑script eller tagg (inte i vanlig CI‑körning) för att hålla kostnad/tid under kontroll.

---

## Fas 5 – Persistens, merge & skydd

**Mål:** Spara mapen på ett säkert sätt utan att tyst skriva över manuella ändringar.

**Steg:**
- [ ] Utöka `saveBpmnMapToStorage` eller lägg till wrapper i orchestratorn:
  - [ ] Vid normal körning utan `--force`:
    - [ ] Spara ny map som “preview” (t.ex. `bpmn-map.generated.json`) **eller** bara skriva ut rapport.
    - [ ] Aldrig overwrite:a `bpmn-map.json` direkt.
  - [ ] Vid `--force`:
    - [ ] Skriv explicit logg om overwrite.
    - [ ] Skriv både till Storage och (valfritt) till GitHub via befintlig edge function.
- [ ] Implementera `source`‑logiken i merge:
  - [ ] `manual` blockerar overwrite.
  - [ ] `heuristic` kan konverteras till `llm` om LLM säger samma/förbättrat.
- [ ] Definiera relationen mellan Storage och lokala map‑filer:
  - [ ] Dokumentera vilken källa som är primär “source of truth” (t.ex. Storage i kombination med `bpmnMapStorage`‑fallback till repo‑fil).
  - [ ] Säkerställ att CLI/orchestrator använder samma prioriteringslogik som runtime så att vi inte får två olika sanningar.

---

## Fas 6 – Validering & guldtester

**Mål:** Ha ett automatiskt self‑check‑steg för genererade maps, plus ett litet set guldtester.

**Steg:**
- [ ] Lägg till valideringsfunktion, t.ex. `validateBpmnMap(map: BpmnMap, parseResults: Map<string,BpmnParseResult>)` som:
  - [ ] Kör `buildBpmnProcessGraphFromParseResults(rootFile, parseResults, map)`.
  - [ ] Kontrollerar:
    - [ ] att root/processgrafen kan byggas utan fel,
    - [ ] att `missingDependencies` bara består av verkligt saknade filer (inte uppenbara stavfel),
    - [ ] att orkestrationsroot:en finns i `processes`.
- [ ] Integrera valideringen i CLI‑scriptet:
  - [ ] Vid valideringsfel:
    - [ ] skriv tydlig rapport,
    - [ ] returnera felkod,  
    - [ ] skriv inte över befintlig map.
- [ ] Lägg till 1‑2 guldtester:
  - [ ] Ett integrationstest för mortgage‑caset som:
    - [ ] genererar mapen,
    - [ ] bygger graf,
    - [ ] kontrollerar förväntade callActivity → subprocess‑kopplingar.
    - [ ] Kör samma testscenario mot båda mortgage‑snapshot‑mapparna (`mortgage-se 2025.12.11 18:11` och `mortgage-se 2026.01.04 16:30`) för att säkerställa att heuristik/merge fungerar även när strukturen förändras över tid.
  - [ ] Inventera befintliga tester/helpers kring bpmn‑map/hierarki (t.ex. Playwright‑flöden och unit‑tester) och bygg vidare på dem istället för att duplicera testlogik.
  - [ ] Håll `validateBpmnMap` tunn: använd befintliga graf‑API:er för tunga beräkningar och lägg bara på lätta konsistenskontroller här.

---

## Fas 7 – Dokumentation & TODO‑uppdatering

**Mål:** Göra det enkelt att förstå och underhålla bpmn‑map‑flödet.

**Steg:**
- [ ] Uppdatera `docs/architecture/BPMN_MAP_GENERATION_DESIGN.md` löpande vid avvikelser.
- [ ] Lägg till en kort sektion i `docs/guides/user/QUICKSTART_AND_DEVELOPMENT.md` eller en separat admin‑guide:
  - [ ] “Hur du regenererar bpmn-map.json med scriptet”.
  - [ ] “Hur du tolkar match_status/needs_manual_review i UI”.
- [ ] Uppdatera `TODO.md`:
  - [ ] Markera delarna av “🤖 bpmn-map.json generering” som klara allteftersom faserna slutförs.
  - [ ] Om UI‑flöden uppdateras (t.ex. vyer som visar `needs_manual_review`), länka kort från TODO/guide till dessa så att utvecklare hittar rätt plats att justera vid framtida ändringar.

---

Den här planen är avsedd att vara den praktiska checklistan för implementation. När du vill återuppta arbetet börjar du helt enkelt i Fas 1 eller där checkboxarna sist slutade. 
