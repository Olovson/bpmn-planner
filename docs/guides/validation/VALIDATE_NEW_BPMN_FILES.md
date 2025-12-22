# Guide: Validera Nya BPMN-filer från A till Ö

**Syfte:** Komplett guide för att validera nya BPMN-filer innan de laddas upp till appen. Denna guide säkerställer att alla delar av processen fungerar korrekt.

> ⚠️ **VIKTIGT:** Använd **befintliga tester** - skapa INTE nya duplicerade tester. Denna guide visar vilka tester som redan finns och hur de används.

## 🚀 Snabbstart

**Har du en ny mapp med BPMN-filer?** Kör dessa kommandon i ordning:

```bash
# 1. Hitta filer och analysera diff
npm test -- tests/integration/local-folder-diff.test.ts

# 2. Validera parsing, graph, tree och dokumentationsgenerering
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

**För detaljerad förklaring av varje steg, se nedan.**

## Översikt

När du har en ny mapp med BPMN-filer som du vill validera, följ dessa steg i ordning:

1. **Hitta alla BPMN-filer** (rekursivt)
2. **Analysera diff** mot befintliga filer
3. **Validera parsing** av alla filer
4. **Validera process graph building**
5. **Validera process tree building**
6. **Validera dokumentationsgenerering** (Feature Goals & Epics)
7. **Validera uppladdning** (valfritt, om du vill testa upload)

## Förutsättningar

- Du har en mapp med BPMN-filer som du vill validera
- Du har tillgång till projektet och kan köra tester
- Supabase är konfigurerad (för diff-analys)

## Steg 1: Hitta alla BPMN-filer (rekursivt)

**Test:** `tests/integration/local-folder-diff.test.ts`

Detta test hittar alla BPMN-filer rekursivt i en katalog och validerar att de kan läsas.

**Användning:**
```bash
# Redigera testet och ändra testDirPath konstanten (rad ~43) till din mapp
# Sedan kör:
npm test -- tests/integration/local-folder-diff.test.ts
```

**Alternativt:** Använd "Analysera Lokal Mapp"-funktionen i appen (`/bpmn-folder-diff`) - detta gör samma sak utan att behöva redigera testet.

**Vad det validerar:**
- ✅ Rekursiv sökning av `.bpmn` filer
- ✅ Filerna kan läsas och parsas
- ✅ Diff kan beräknas mot befintliga filer

**Alternativ:** Använd "Analysera Lokal Mapp"-funktionen i appen (`/bpmn-folder-diff`)

## Steg 2: Analysera Diff mot Befintliga Filer

**Test:** `tests/integration/local-folder-diff.test.ts`

**App-funktionalitet:** "Analysera Lokal Mapp" (`/bpmn-folder-diff`)

Detta steg visar vad som ändrats, lagts till eller tagits bort jämfört med befintliga filer i Supabase.

**Användning (i appen):**
1. Gå till `/bpmn-folder-diff`
2. Klicka på "Välj Mapp"
3. Välj din mapp med BPMN-filer
4. Granska diff-resultatet

**Användning (test):**
```bash
npm test -- tests/integration/local-folder-diff.test.ts
```

**Vad det validerar:**
- ✅ Diff-beräkning fungerar korrekt
- ✅ Nya filer identifieras
- ✅ Ändrade filer identifieras
- ✅ Borttagna filer identifieras
- ✅ Process-noder inkluderas i diff
- ✅ Cascade-diff-detection fungerar (call activities markeras som ändrade om subprocess ändras)

**Viktigt:** Detta är **read-only** - inga filer laddas upp eller ändras.

## Steg 3: Validera Parsing av Alla Filer

**Test:** `tests/integration/validate-feature-goals-generation.test.ts` (med `BPMN_TEST_DIR`)

Detta steg validerar att alla BPMN-filer kan parsas korrekt.

**Användning:**
```bash
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

**Vad det validerar:**
- ✅ Alla BPMN-filer kan parsas
- ✅ Metadata extraheras korrekt
- ✅ Processer, call activities, tasks identifieras

**Alternativt:** Använd `tests/integration/bpmnParser.real.test.ts` för mer detaljerad parsing-validering.

## Steg 4: Validera Process Graph Building

**Test:** `tests/integration/validate-feature-goals-generation.test.ts` (med `BPMN_TEST_DIR`)

Detta steg validerar att process-grafen kan byggas korrekt från alla filer.

**Användning:**
```bash
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

**Vad det validerar:**
- ✅ Process graph byggs korrekt
- ✅ Alla noder identifieras
- ✅ Hierarkier byggs korrekt
- ✅ Call activities mappas till subprocesser (via `bpmn-map.json`)

**Alternativt:** Använd `tests/integration/bpmnProcessGraph.mortgage.integration.test.ts` för mer detaljerad graph-validering.

## Steg 5: Validera Process Tree Building

**Test:** `tests/integration/buildProcessTreeFromGraph.mortgage.integration.test.ts`

Detta steg validerar att process-trädet kan byggas från grafen.

**Användning:**
```bash
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/buildProcessTreeFromGraph.mortgage.integration.test.ts
```

**Vad det validerar:**
- ✅ Process tree byggs korrekt från graph
- ✅ Hierarki är korrekt
- ✅ Alla noder finns med

## Steg 6: Validera Dokumentationsgenerering (Feature Goals & Epics)

**Test:** `tests/integration/validate-feature-goals-generation.test.ts` (med `BPMN_TEST_DIR`)

Detta är det viktigaste steget - det validerar att dokumentation genereras korrekt.

**Användning:**
```bash
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

**Vad det validerar:**
- ✅ Feature Goals genereras för call activities och process-noder
- ✅ Epics genereras för tasks (UserTask, ServiceTask, BusinessRuleTask)
- ✅ Inga tasks genereras som Feature Goals (kritiskt!)
- ✅ Hierarkisk generering fungerar (subprocesser före parent-filer)

**Förväntat resultat:**
- Feature Goals = antal subprocess process-noder + antal call activities (exklusive root-filens call activities)
- Epics = antal tasks i alla filer
- Inga duplicater
- Inga tasks genereras som Feature Goals

**Viktigt om antal:**
- Testet jämför mot `bpmn-map.json` som kan innehålla fler/färre call activities än vad som faktiskt finns i dina nya filer
- Detta är **normalt** - testet visar vad som faktiskt genereras vs. vad som förväntas baserat på `bpmn-map.json`
- Om dina nya filer har färre call activities än `bpmn-map.json`, kommer testet att visa detta i outputen
- Det viktiga är att **inga tasks genereras som Feature Goals** - detta är det kritiska valideringen
- Testet kan också hitta fler call activities i filerna än vad som finns i `bpmn-map.json` (dessa genereras också)

**Exempel output:**
```
📊 Faktiskt genererat:
  Subprocess process nodes: 21 (förväntat: 22)
  Call activity-instanser: 17 (förväntat: 21)
  Totalt feature goals: 55 (förväntat: 43)
```
Detta betyder att dina filer har 21 subprocess process-noder (1 saknas jämfört med `bpmn-map.json`) och 17 call activities (4 färre än i `bpmn-map.json`), men totalt 55 feature goals (fler än förväntat eftersom vissa call activities finns i filerna men inte i `bpmn-map.json`).

## Steg 7: Validera Uppladdning (Valfritt)

**Test:** `tests/integration/full-flow-generation-upload-read.test.ts`

Detta steg validerar att filer kan laddas upp och att dokumentation kan genereras från uppladdade filer.

**Användning:**
```bash
# Detta test använder fixtures, men du kan uppdatera det för att använda din mapp
npm test -- tests/integration/full-flow-generation-upload-read.test.ts
```

**Vad det validerar:**
- ✅ Filer kan laddas upp till Supabase Storage
- ✅ Dokumentation kan genereras från uppladdade filer
- ✅ Dokumentation kan läsas från Storage

**Viktigt:** Detta test använder mockad Storage, så det testar inte faktisk uppladdning till Supabase. För faktisk uppladdning, använd appen.

## Komplett Valideringsflöde

För att validera en hel mapp med nya BPMN-filer, kör dessa kommandon i ordning:

```bash
# 1. Hitta filer och analysera diff
# Redigera testet och ändra testDirPath konstanten till din mapp
npm test -- tests/integration/local-folder-diff.test.ts

# 2. Validera parsing, graph, tree och dokumentationsgenerering
# Detta test använder BPMN_TEST_DIR environment variable
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts

# 3. (Valfritt) Validera uppladdning
npm test -- tests/integration/full-flow-generation-upload-read.test.ts
```

**Exempel med konkret sökväg:**
```bash
# Exempel: Validera filer från mortgage-template-main
BPMN_TEST_DIR=/Users/magnusolovson/Documents/Projects/mortgage-template-main/modules/mortgage-se npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

## Checklista för Nya BPMN-filer

Innan du laddar upp nya BPMN-filer, kontrollera:

- [ ] Alla filer hittas rekursivt
- [ ] Diff-analys visar korrekta ändringar
- [ ] Alla filer kan parsas utan fel
- [ ] Process graph byggs korrekt
- [ ] Process tree byggs korrekt
- [ ] Feature Goals genereras för alla call activities och process-noder
- [ ] Epics genereras för alla tasks
- [ ] Inga tasks genereras som Feature Goals
- [ ] Antal Feature Goals och Epics är rimligt (kan variera jämfört med `bpmn-map.json` eftersom filerna kan ha fler/färre call activities)
- [ ] `bpmn-map.json` är uppdaterad med nya call activities (om nödvändigt)

## Felsökning

### Problem: Filer hittas inte

**Lösning:** Kontrollera att `BPMN_TEST_DIR` pekar på rätt katalog och att filerna har `.bpmn`-ändelse.

### Problem: Parsing-fel

**Lösning:** Kontrollera att BPMN-filerna är giltiga XML. Använd `tests/integration/bpmnParser.real.test.ts` för detaljerad felinformation.

### Problem: Process graph byggs inte

**Lösning:** 
- Kontrollera att `bpmn-map.json` innehåller alla call activities
- Kontrollera att subprocess-filer finns och kan parsas
- Se `tests/integration/bpmnProcessGraph.mortgage.integration.test.ts` för mer detaljer

### Problem: Fel antal Feature Goals/Epics

**Lösning:**
- Kontrollera att `bpmn-map.json` är korrekt uppdaterad
- Kontrollera att inga tasks genereras som Feature Goals
- Se `tests/integration/validate-feature-goals-generation.test.ts` för detaljerad output
- **Notera:** Om dina nya filer har färre call activities än `bpmn-map.json`, kommer testet att visa detta. Detta är normalt - testet jämför mot `bpmn-map.json` som kan innehålla fler call activities än vad som faktiskt finns i dina filer.

### Problem: Call activities mappas inte korrekt

**Lösning:**
- Uppdatera `bpmn-map.json` med nya call activities
- Kontrollera att `bpmn_id` i `bpmn-map.json` matchar element-id i BPMN-filen
- Se `docs/guides/bpmn-map.md` för mer information

## Relaterade Tester

För mer detaljerad validering av specifika delar:

- **Parsing:** `tests/integration/bpmnParser.real.test.ts`
- **Graph Building:** `tests/integration/bpmnProcessGraph.mortgage.integration.test.ts`
- **Tree Building:** `tests/integration/buildProcessTreeFromGraph.mortgage.integration.test.ts`
- **Feature Goals:** `tests/integration/featureGoal.llm.e2e.test.ts`
- **Epics:** `tests/integration/epic.llm.e2e.test.ts`
- **Hierarkisk Generering:** `tests/integration/mortgage-se-batch-generation-hierarchy.test.ts`

## Nästa Steg

Efter validering:

1. Uppdatera `bpmn-map.json` om nödvändigt
2. Ladda upp filer via appen (`/files`)
3. Generera dokumentation via appen
4. Verifiera resultatet i appen

## Se även

- [`tests/TEST_INDEX.md`](../../tests/TEST_INDEX.md) - Komplett index över alla tester
- [`tests/README.md`](../../tests/README.md) - Test-dokumentation
- [`docs/guides/user/LOCAL_DIFF_ANALYSIS_GUIDE.md`](../user/LOCAL_DIFF_ANALYSIS_GUIDE.md) - Guide för lokal diff-analys i appen
- [`docs/guides/bpmn-map.md`](../bpmn-map.md) - Guide för `bpmn-map.json`
