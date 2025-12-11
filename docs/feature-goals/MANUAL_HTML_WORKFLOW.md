# Manual HTML Workflow för Feature Goals

## 🎯 Syfte

Detta dokument beskriver hur du manuellt förbättrar Feature Goal HTML-dokumentation och ser till att appen visar dina förbättringar.

## ✅ Status

**HTML-workflow är fullt implementerad och redo att användas!**

- ✅ 27 förbättrade HTML-filer i `public/local-content/feature-goals/`
- ✅ Badge "📄 Lokal version" visas automatiskt
- ✅ `DocViewer` prioriterar local-content för v2 Feature Goals
- ✅ Version switching (v1/v2) fungerar

## 📁 Filstruktur

```
public/local-content/feature-goals/
  ├── mortgage-se-application-application-v2.html
  ├── mortgage-se-kyc-kyc-v2.html
  ├── mortgage-se-credit-evaluation-credit-evaluation-v2.html
  └── ... (27 filer totalt)
```

**Namngivning:** `{bpmnFile}-{elementId}-v2.html`

### 🔒 Skydd mot överskrivning

**VIKTIGT:** Filer i `public/local-content/feature-goals/` skrivs **ALDRIG** över av appen:

- ✅ Appen läser bara från denna mapp (via `fetchFeatureGoalHtml()`)
- ✅ Appen laddar upp genererade filer till **Supabase Storage**, inte till denna mapp
- ✅ `auto-update-feature-goal-docs.ts` skriver **TILL** denna mapp (efter uppdatering), men skriver bara över filer som den själv har skapat automatiskt
- ✅ Alla script som genererar innehåll skriver till Supabase Storage eller `public/local-content/`, inte till `exports/`

**Dina manuellt förbättrade filer är säkra!** Du kan redigera dem utan att oroa dig för att de ska skrivas över.

### 🔄 Hantera tidigare förbättrade filer (när du kör arbetsprocessen igen)

**När du kör arbetsprocessen igen** (t.ex. efter nya BPMN-filer eller när du vill förbättra fler filer):

1. **Befintliga förbättrade filer behålls:**
   - Filer i `public/local-content/feature-goals/` skrivs **ALDRIG** över automatiskt
   - Status-listan (`FEATURE_GOAL_STATUS.md`) behåller dina markerade checkboxar
   - När du kör `generate-feature-goal-status.ts` igen, behålls dina markerade filer

2. **Nya BPMN-filer kan skapa nya feature goals:**
   - Nya feature goals identifieras i sync-rapporten
   - `auto-update-feature-goal-docs.ts` skapar nya filer direkt i `public/local-content/feature-goals/` med rätt filnamnformat
   - Filerna skapas med grundläggande struktur och TODO-kommentarer som du kan förbättra

3. **Uppdatera befintliga filer:**
   - Om en befintlig feature goal har ändrats i BPMN-filerna, visas detta i sync-rapporten
   - `auto-update-feature-goal-docs.ts` uppdaterar automatiskt filer i `public/local-content/feature-goals/` genom att lägga till saknade aktiviteter
   - Du kan sedan manuellt förbättra innehållet ytterligare

4. **Backup-rekommendation:**
   - Innan du börjar en ny arbetsprocess, överväg att skapa en backup av `public/local-content/feature-goals/`
   - Eller committa ändringar till git innan du fortsätter

## 🔄 Workflow

### Steg 0: Identifiera filer som behöver uppdateras

1. **Kör sync-scriptet** för att analysera skillnader mellan BPMN-filer och dokumentation:
   ```bash
   npx tsx scripts/analyze-feature-goal-sync.ts
   ```
   
   Scriptet använder automatiskt den senaste BPMN-arkivmappen (t.ex. `mortgage-se YYYY.MM.DD HH:MM`).

2. **Kör auto-update-scriptet** för att automatiskt uppdatera filer med saknade aktiviteter:
   ```bash
   npx tsx scripts/auto-update-feature-goal-docs.ts
   ```
   
   Detta lägger automatiskt till saknade aktiviteter i "Omfattning"-sektionen.

3. **Generera status-lista** för att få översikt över alla filer:
   ```bash
   npx tsx scripts/generate-feature-goal-status.ts
   ```
   
   Detta skapar/uppdaterar `docs/feature-goals/FEATURE_GOAL_STATUS.md` med:
   - Alla matchade feature goals (sorterade alfabetiskt)
   - Orphaned dokumentation (längst ner)
   - Checkboxar för att markera förbättrade filer

4. **Öppna status-filen** och arbeta systematiskt:
   ```
   docs/feature-goals/FEATURE_GOAL_STATUS.md
   ```
   
   - Markera filer med `[x]` när du har förbättrat dem
   - För orphaned filer: Först identifiera åtgärd (Ta bort/Uppdatera/Behåll), sedan markera när klar

### Steg 1: Fullständig BPMN-analys

**Viktigt:** Analysera ALLA BPMN-filer som kan påverka dokumentationen, inte bara själva feature goal-processen.

#### 1.1 Hitta BPMN-filer

1. **Hitta feature goal-processen** (subprocess-filen):
   - Status-listan visar Feature Goal-namnet och ID
   - BPMN-filerna ligger i: `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/`
   - Filnamnet hittas via `subprocess_bpmn_file` i bpmn-map.json
   - Exempel: `mortgage-se-appeal.bpmn` för Appeal

2. **Hitta parent-processen** (processen som anropar feature goal):
   - Hitta `parent_bpmn_file` i bpmn-map.json eller sync-rapporten
   - Exempel: `mortgage.bpmn` för Appeal

3. **Hitta relaterade processer**:
   - Processer som feature goal anropar (call activities i feature goal-processen)
   - Processer som feature goal går vidare till (via sequence flows i parent-processen)
   - Processer som kan trigga feature goal (via events/escalations)

#### 1.2 Analysera feature goal-processen (t.ex. mortgage-se-appeal.bpmn)

**Extrahera:**
- ✅ Alla aktiviteter (userTask, serviceTask, businessRuleTask, callActivity)
- ✅ Alla gateways (exclusive, inclusive, parallel) - inklusive namnlösa
- ✅ Alla events (start, end, boundary, timer, escalation, message)
- ✅ Lanes och vilka aktiviteter som tillhör vilken lane
- ✅ Sequence flows för att förstå flödet
- ✅ Escalation definitions
- ✅ Message definitions
- ✅ Error definitions

#### 1.3 Analysera parent-processen (t.ex. mortgage.bpmn)

**Sök efter feature goal call activity:**
- ✅ Hur anropas feature goal? (vilken gateway/flöde triggar det)
- ✅ Boundary events på call activity (timeout, errors, escalations)
- ✅ Sequence flows till/från feature goal
- ✅ Gatewayer som styr flödet till/från feature goal
- ✅ Message/escalation events relaterade till feature goal

**Exempel för Appeal:**
- Appeal anropas från `Gateway_0f1a2lu` när `is-automatically-rejected = Yes`
- Appeal har boundary event `event-appeal-timeout` i mortgage.bpmn
- Appeal går till `Gateway_1qiy2jr` → Manual credit evaluation

#### 1.4 Analysera nästa processer (processer feature goal går vidare till)

**För varje process som feature goal går vidare till:**
- ✅ Hur anropas processen? (vilken gateway/flöde)
- ✅ Escalation events som kan gå tillbaka till feature goal
- ✅ Error events som kan påverka feature goal
- ✅ Loop-mekanismer (kan processen trigga feature goal igen?)

**Exempel för Appeal:**
- Appeal går till Manual credit evaluation
- Manual credit evaluation kan trigga "Automatically rejected" → tillbaka till Appeal

#### 1.5 Analysera relaterade processer (event-driven dependencies)

**Sök efter:**
- ✅ Message events som kan trigga feature goal
- ✅ Escalation events som kan trigga feature goal
- ✅ Error events som kan påverka feature goal
- ✅ Event-driven arkitektur (pub/sub, event bus, etc.)

#### 1.6 Sammanställ analys

**Skapa en lista över:**
- Alla aktiviteter, gateways, events från alla relaterade BPMN-filer
- Flödesbeskrivning (hur feature goal anropas, vad som händer efter)
- Beroenden (vilka processer, events, escalations)
- Timeout/error-hantering (från både feature goal-processen och parent-processen)
- Loop-mekanismer

### Steg 2: Jämför med HTML-dokumentationen

**Jämför analysen med befintlig HTML-dokumentation:**

1. **Aktiviteter:**
   - Vilka aktiviteter finns i BPMN men saknas i "Omfattning"?
   - Vilka gateways saknas?
   - Är alla events dokumenterade?

2. **Flödesbeskrivning:**
   - Är "Processteg - Input" korrekt? (hur anropas feature goal)
   - Är "Processteg - Output" korrekt? (vad händer efter)
   - Är loop-mekanismer dokumenterade?

3. **Beroenden:**
   - Är alla relaterade processer dokumenterade?
   - Är escalation/error events dokumenterade?
   - Är boundary events från parent-processen dokumenterade?

4. **Lanes och roller:**
   - Är lanes korrekt dokumenterade?
   - Är det tydligt vilka aktiviteter som tillhör vilken lane?

### Steg 3: Identifiera förbättringsmöjligheter

**Baserat på jämförelsen, identifiera:**

1. **Saknade element:**
   - Aktiviteter som saknas i "Omfattning"
   - Gateways som saknas
   - Events som saknas

2. **Förbättringar i flödesbeskrivning:**
   - Uppdatera "Processteg - Input" med korrekt entry point
   - Uppdatera "Processteg - Output" med korrekt flöde
   - Lägg till information om loop-mekanismer

3. **Förbättringar i beroenden:**
   - Lägg till boundary events från parent-processen
   - Lägg till escalation/error events
   - Förtydliga relaterade processer

4. **Förbättringar i lanes:**
   - Förtydliga vilka aktiviteter som tillhör vilken lane
   - Förtydliga roller och ansvar

### Steg 4: Förberedelse för redigering

1. **Öppna befintlig HTML-fil**:
   ```bash
   # Exempel: Redigera Appeal Feature Goal
   # Filerna ligger i public/local-content/feature-goals/ (där appen läser dem)
   code public/local-content/feature-goals/mortgage-se-appeal-appeal-v2.html
   ```
   
   **Viktigt:** Filerna ska ligga i `public/local-content/feature-goals/` med formatet `{bpmnFile}-{elementId}-v2.html` (t.ex. `mortgage-se-appeal-appeal-v2.html`). Detta är där appen läser filerna från.

### Steg 5: Redigera HTML-filer

Uppdatera innehållet baserat på analysen från Steg 1. V2-templaten har följande sektioner:

- **Beskrivning av FGoal** - Sammanfattning av vad Feature Goalet gör
- **Confluence länk** - Länk till Confluence-sida (om tillgänglig)
- **Processteg - Input** - När processen startar (baserat på BPMN sequence flows)
- **Processteg - Output** - Förväntad utkomst (baserat på BPMN sequence flows)
- **Omfattning** - Vad som ingår (baserat på call activities, subprocesses, tasks)
- **Avgränsning** - Vad som inte ingår
- **Beroenden** - Externa beroenden (service tasks, integrations)
- **BPMN - Process** - Referens till BPMN-processen
- **Testgenerering** - Testscenarier, UI Flow, testdata-referenser, implementation mapping

#### Riktlinjer för "Beskrivning av FGoal"

**Viktiga krav:**
1. **Tydlighet och läsbarhet:**
   - Använd korta meningar
   - Undvik långa, komplexa meningar med många kommatecken
   - Dela upp information i tydliga punkter om det behövs

2. **Nämn vem som utför aktiviteten:**
   - **Kundaktivitet:** "Kunden (Stakeholder) registrerar/fyller i..."
   - **Handläggaraktivitet:** "Handläggaren (Caseworker) granskar/bedömer..."
   - **Systemaktivitet:** "Systemet hämtar/beräknar..."
   - **Business Rule:** "DMN-regler bedömer/evaluerar..."

3. **Fokusera på VAD processen gör:**
   - Börja med syftet/resultatet (vad gör processen?)
   - Nämn vem som utför aktiviteten
   - Beskriv huvudaktiviteten konkret
   - Teknisk information (var den anropas, flöde) kan nämnas men ska inte dominera

4. **Affärsorienterat språk:**
   - Använd affärstermer, inte bara tekniska termer
   - Beskriv värde och syfte, inte bara mekanik
   - Var konkret om vad som händer (t.ex. "registrerar hushållsekonomi" istället för "hanterar information")

**Exempel på bra beskrivning:**
- ✅ "Household är en kundaktivitet där kunden (Stakeholder) registrerar hushållens ekonomi..."
- ✅ "Appeal hanterar överklaganden när en kreditansökan har blivit automatiskt avvisad. Processen möjliggör för kunden (Stakeholder) att skicka in en överklagan..."

**Exempel på dålig beskrivning:**
- ❌ "Household anropas inuti stakeholders subprocess som är multi-instance..." (fokuserar på teknik, inte syfte)
- ❌ "Processen hanterar information och går via gateway..." (vagt, nämner inte vem som gör vad)

**Tips:**
- Använd information från BPMN-filen för att fylla i faktiskt innehåll
- Var konkret och affärsnära
- Fokusera på vad som faktiskt händer i processen
- Kontrollera att beskrivningen är lättläst och tydlig

### Steg 6: Visa i appen

1. Starta appen: `npm run dev`
2. Navigera till Feature Goal i appen
3. Välj **"v2"** template version (om inte redan valt)
4. Appen visar automatiskt från `public/local-content/` om filen finns

### Steg 7: Badge visas automatiskt

Alla filer i `public/local-content/` har en "📄 Lokal version – Förbättrat innehåll" badge som visas längst upp i dokumentet.

### Steg 8: Markera filen som förbättrad i status-listan

**Viktigt:** Efter att du är klar med förbättringarna, markera alltid filen som förbättrad i status-listan.

1. **Öppna status-filen**: `docs/feature-goals/FEATURE_GOAL_STATUS.md`

2. **Hitta filen** i listan under "✅ Matchade Feature Goals"

3. **Markera checkboxen** med `[x]`:
   ```markdown
   - [x] `local--Appeal-v2.html` ✨ Förbättrad
   ```

4. **Uppdatera sammanfattningen** (om det behövs):
   - Öka antalet "Förbättrade" med 1
   - Minska antalet "Återstående" med 1

**Exempel:**
```markdown
- ✨ **Förbättrade:** 1
- 📋 **Återstående:** 39
```

Detta hjälper dig att hålla koll på vilka filer som är klara och vilka som återstår.

## 🎨 Badge-styling

Badgen har följande styling:
- **Bakgrund:** #e0f2fe (ljusblå)
- **Text:** #0369a1 (mörkblå)
- **Border:** #0284c7 (blå accent)
- **Position:** Längst upp i dokumentet, efter `<body>` tag

## 🔍 Verifiering

### Kontrollera att filen visas:

1. Öppna appen och navigera till en Feature Goal
2. Välj v2 template
3. Kontrollera att:
   - Badge "📄 Lokal version" visas längst upp
   - Innehållet matchar din redigering
   - URL i DevTools visar `/local-content/feature-goals/...`

### Felsökning:

**Problem:** Filen visas inte
- ✅ Kontrollera att filen finns i `public/local-content/feature-goals/`
- ✅ Kontrollera att filnamnet följer pattern: `{bpmnFile}-{elementId}-v2.html`
- ✅ Kontrollera att du valt "v2" template version i appen

**Problem:** Badge visas inte
- ✅ Kontrollera att HTML-filen innehåller `<div class="local-version-badge">`
- ✅ Badge ska vara direkt efter `<body>` tag

## 📝 Exempel: Redigera Testgenerering-sektion

```html
<section class="doc-section">
  <h2>Testgenerering</h2>
  
  <h3>Testscenarier</h3>
  <table>
    <tbody>
      <tr>
        <td><strong>S1</strong></td>
        <td>Normalflöde – komplett ansökan</td>
        <td>Happy</td>
        <td>customer</td>
        <td>P1</td>
        <td>functional</td>
        <td>Kunden får ett tydligt besked</td>
        <td>✅ Klar</td>
      </tr>
    </tbody>
  </table>
  
  <!-- Lägg till UI Flow, testdata-referenser, implementation mapping -->
</section>
```

## 🚀 Systematiskt arbete genom alla filer

**Arbeta systematiskt igenom alla filer i status-listan, en i taget.**

### Arbetsflöde för varje fil

För **varje fil** i status-listan, följ Steg 1-8 ovan:

1. **Steg 1-3**: Fullständig BPMN-analys och identifiering av förbättringar
2. **Steg 4-5**: Förberedelse och redigering av HTML-filen
3. **Steg 6-7**: Verifiering i appen
4. **Steg 8**: Markera filen som förbättrad i status-listan

### Prioritering och ordning

1. **Börja med matchade Feature Goals** (under "✅ Matchade Feature Goals"):
   - Arbeta systematiskt genom listan, en fil i taget
   - Följ ordningen i listan (alfabetiskt sorterade)
   - Fokusera på filer med varningar (⚠️ saknade aktiviteter) först om du vill prioritera

2. **Slutligen orphaned docs** (under "⚠️ Orphaned Dokumentation"):
   - Arbeta igenom dessa sist
   - För varje fil: Först identifiera åtgärd (Ta bort | Uppdatera | Behåll)
   - Sedan utför åtgärden och markera när klar

### Iterativ process

**För varje fil i listan:**

1. **Öppna status-filen**: `docs/feature-goals/FEATURE_GOAL_STATUS.md`
2. **Välj nästa fil** i listan (den första som inte är markerad med `[x]`)
3. **Följ Steg 1-8** ovan för den filen
4. **Gå vidare till nästa fil** i listan
5. **Upprepa** tills alla filer är markerade som förbättrade

### Tips för effektivt arbete

- **Arbeta en fil i taget**: Fokusera på en fil tills den är helt klar (Steg 1-8)
- **Markera direkt**: Markera filen som förbättrad (Steg 8) direkt efter att du är klar
- **Håll koll på framsteg**: Status-listan visar tydligt hur många filer som är klara vs återstående
- **Uppdatera status-listan**: Kör `generate-feature-goal-status.ts` igen om nya BPMN-filer har lagts till

### När du är klar med alla filer

1. Kör `generate-feature-goal-status.ts` en sista gång för att uppdatera listan
2. Verifiera att alla filer är markerade med `[x]`
3. Kontrollera att sammanfattningen visar rätt antal förbättrade filer

## 📚 Relaterade verktyg

- **Sync-script:** `scripts/analyze-feature-goal-sync.ts` - Identifierar filer som behöver uppdateras
- **Auto-update-script:** `scripts/auto-update-feature-goal-docs.ts` - Uppdaterar automatiskt filer med saknade aktiviteter
- **Status-script:** `scripts/generate-feature-goal-status.ts` - Genererar status-lista över alla filer
- **Archive-script:** `scripts/archive-bpmn-files.ts` - Skapar nya BPMN-arkivmappar

## 📚 Relaterade dokument

- `docs/feature-goals/html-workflow-status.md` - Teknisk status
- `docs/feature-goals/json-export-import-implementation-plan.md` - JSON-pipeline plan
- `docs/feature-goals/test-generation-section-design.md` - Testgenerering design
- `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/feature-goal-sync-report.md` - Sync-rapport (genereras av scriptet)

