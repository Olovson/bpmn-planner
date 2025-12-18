# Feature Goal Dokumentations-Workflow

## 🎯 Syfte

Detta dokument beskriver processen för att förbättra Feature Goal HTML-dokumentation. **Endast innehållsförbättringar är manuellt** - allt annat är automatiskt.

**💡 Quick Start:** Om du bara behöver en snabb påminnelse, se `QUICK_START.md` för en kort guide.

**🤖 Auto-Improvement:** Om du vill att jag automatiskt förbättrar innehållet i alla filer, se `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` för exakt process. När du frågar mig om att uppdatera HTML-innehållet, kommer jag att:
1. Kortfattat förklara min approach
2. Fråga om jag ska göra det
3. Automatiskt förbättra innehållet i alla nödvändiga filer utan din involvering

**⚠️ KRITISK KVALITETSVARNING:** När jag automatiskt förbättrar innehållet:
- **INGA shortcuts är tillåtna** - Kvalitet är absolut nödvändigt
- **INGA filer, sektioner eller element hoppas över** - Allt måste vara perfekt
- **Jag tar den tid som behövs** - Även om det är 100 filer, kvalitet kommer först
- **Jag får ALDRIG defaulta till något annat** - Se `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` för detaljer

## 🤖 Automatiserat vs Manuellt

### ✅ Automatiskt (kör scripts)
- **Identifiera filer som behöver uppdateras** - `analyze-feature-goal-sync.ts`
- **Uppdatera filer med saknade aktiviteter** - `auto-update-feature-goal-docs.ts`
- **Generera status-lista** - `generate-feature-goal-status.ts`
- **Förbättra läsbarhet** (collapsible sections) - `improve-feature-goal-readability.ts`
- **Arkivera BPMN-filer** - `archive-bpmn-files.ts`
- **Validera E2E test scenarios** - `/e2e-quality-validation` (automatisk validering)
- **Visualisera test coverage** - `/test-coverage` (automatisk visualisering)

### ✏️ Manuellt (endast innehållsförbättringar)
- **Förbättra innehållet** - Ersätta tekniska ID:n, göra texten lättläst, affärsorienterad
- **Markera filer som klara** - Uppdatera checkboxar i status-listan (kan automatiseras i framtiden)
- **Uppdatera E2E test scenarios** - Lägg till saknade tasks i `E2eTestsOverviewPage.tsx` (använd valideringssystemet)
- **Uppdatera test scripts** - Uppdatera Playwright test scripts om processen ändrats
- **Uppdatera mocks** - Uppdatera `mortgageE2eMocks.ts` om API-endpoints ändrats

**Viktigt:** Allt utom innehållsförbättringar är automatiskt. Du behöver bara fokusera på att förbättra kvaliteten på texten.

**⚠️ NYTT:** Efter BPMN-uppdateringar, uppdatera även E2E test scenarios och valideringssystemet (se Steg 0.5 nedan).

## ✅ Status

**HTML-workflow är fullt implementerad och redo att användas!**

- ✅ 27 förbättrade HTML-filer i `public/local-content/feature-goals/`
- ✅ Badge "📄 Lokal version" visas automatiskt
- ✅ `DocViewer` prioriterar local-content för v2 Feature Goals
- ✅ Version switching (v1/v2) fungerar

## 📁 Filstruktur

```
public/local-content/feature-goals/
  ├── mortgage-se-application-v2.html
  ├── mortgage-se-kyc-v2.html
  ├── mortgage-se-credit-evaluation-v2.html
  └── ... (30+ filer totalt)
```

**Namngivning:** `{bpmnFile}-{elementId}-v2.html` eller `{bpmnFile}-v2.html` om elementId redan ingår i bpmnFile för att undvika upprepning.

**Exempel:**
- `mortgage-se-mortgage-commitment-v2.html` (elementId "mortgage-commitment" ingår redan i bpmnFile "mortgage-se-mortgage-commitment.bpmn", så upprepning undviks)
- `mortgage-se-application-v2.html` (elementId "application" ingår redan i bpmnFile "mortgage-se-application.bpmn", så upprepning undviks)
- `mortgage-se-application-stakeholder-v2.html` (elementId "stakeholder" ingår inte i bpmnFile "mortgage-se-application.bpmn", så båda delarna behövs)

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

### Steg 0: Automatisk identifiering och uppdatering (kör alla scripts)

**⚠️ NYTT: Efter BPMN-uppdateringar, uppdatera även E2E test scenarios och valideringssystemet**

När du har uppdaterat BPMN-filer, behöver du också uppdatera:

1. **E2E test scenarios** (`src/pages/E2eTestsOverviewPage.tsx`)
   - Använd valideringssystemet på `/e2e-quality-validation` för att identifiera vad som saknas
   - Se `docs/E2E_MAINTENANCE_GUIDE.md` för detaljerad guide
   - Valideringssystemet visar exakt vad som behöver läggas till med kopiera-knappar för exempel-kod

2. **Test scripts** (Playwright)
   - Uppdatera test scripts i `tests/playwright-e2e/scenarios/` om processen ändrats
   - Uppdatera mocks i `tests/playwright-e2e/fixtures/mortgageE2eMocks.ts` om API-endpoints ändrats

3. **Valideringssystemet** (`/e2e-quality-validation`)
   - Körs automatiskt och identifierar vad som saknas
   - Använd kopiera-knapparna för att kopiera exempel-kod direkt

4. **Test Coverage-sidan** (`/test-coverage`)
   - Uppdateras automatiskt baserat på BPMN-struktur
   - Test-information (Given/When/Then) behöver uppdateras manuellt i `E2eTestsOverviewPage.tsx`

**Se `docs/E2E_MAINTENANCE_GUIDE.md` för komplett guide om E2E test maintenance.**

### Steg 0: Automatisk identifiering och uppdatering (kör alla scripts)

**Kör dessa 3 scripts i ordning - allt är automatiskt:**

```bash
# 1. Analysera skillnader mellan BPMN-filer och dokumentation
npx tsx scripts/analyze-feature-goal-sync.ts

# 2. Uppdatera automatiskt filer med saknade aktiviteter
npx tsx scripts/auto-update-feature-goal-docs.ts

# 3. Generera status-lista över alla filer
npx tsx scripts/generate-feature-goal-status.ts
```

**Vad scripts gör automatiskt:**
- ✅ Identifierar filer som behöver uppdateras
- ✅ Lägger till saknade aktiviteter i "Omfattning"-sektionen
- ✅ Skapar/uppdaterar status-lista med alla filer
- ✅ Identifierar orphaned dokumentation

**Resultat:**
- Sync-rapport: `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/feature-goal-sync-report.md`
- Status-lista: `docs/feature-goals/FEATURE_GOAL_STATUS.md`

**Du behöver bara:**
- Öppna status-filen: `docs/feature-goals/FEATURE_GOAL_STATUS.md`
- Börja förbättra innehållet i filerna (se Steg 1-5 nedan)

### Steg 0.5: Uppdatera E2E test scenarios och valideringssystemet (efter BPMN-uppdateringar)

**⚠️ VIKTIGT:** När du har uppdaterat BPMN-filer, behöver du också uppdatera E2E test scenarios och relaterade komponenter.

**1. Identifiera ändringar:**
   - **NYTT**: Kör `npx tsx scripts/compare-bpmn-versions.ts` för att identifiera alla ändringar (given startpunkt)
   - Granska `bpmn-changes-report.md` för detaljerad analys av:
     - Ändrade task-ID:n (omnamngivna tasks)
     - Ändrade callActivity-ID:n (omnamngivna callActivities)
     - Borttagna tasks/callActivities
     - Nya tasks/callActivities
   
**2. Kör valideringssystemet:**
   - Gå till `/e2e-quality-validation` i appen
   - Systemet identifierar automatiskt vad som saknas:
     - ServiceTasks/UserTasks/BusinessRuleTasks som saknas i `bankProjectTestSteps`
     - Tasks som saknar API-anrop/UI-interaktion/DMN-beslut
     - Saknade mocks för dokumenterade API-anrop
     - Saknade fält i mock-responser
     - **NYTT**: Borttagna tasks/callActivities (finns i dokumentationen men inte i BPMN)

**3. Uppdatera E2E test scenarios (`src/pages/E2eTestsOverviewPage.tsx`):**
   - För varje saknad task som identifieras:
     - Klicka på "Visa exempel-kod" i valideringssystemet
     - Kopiera exempel-koden med "Kopiera kod"-knappen
     - Lägg till i `bankProjectTestSteps` eller `subprocessSteps` enligt förslaget
   - Uppdatera `subprocessSteps` för ändrade callActivities:
     - Lägg till/uppdatera `given`/`when`/`then` texter
     - Uppdatera `serviceTasksSummary`/`userTasksSummary`/`businessRulesSummary`

**4. Uppdatera mocks (`tests/playwright-e2e/fixtures/mortgageE2eMocks.ts`):**
   - För varje saknad mock som identifieras:
     - Klicka på "Visa exempel-kod" i valideringssystemet
     - Kopiera exempel-koden och lägg till i mock-filen
     - Se till att mock-response matchar `backendState` i scenarios

**5. Uppdatera test scripts (om processen ändrats):**
   - Uppdatera Playwright test scripts i `tests/playwright-e2e/scenarios/` om processen ändrats
   - Verifiera att test scripts matchar uppdaterade scenarios

**6. Verifiera:**
   - Kör validering igen på `/e2e-quality-validation`
   - Kontrollera att alla warnings/errors är åtgärdade
   - Testa test-coverage-sidan (`/test-coverage`) för att se att allt visas korrekt

**Se `docs/E2E_MAINTENANCE_GUIDE.md` för komplett guide om E2E test maintenance.**

### Steg 0.8: Systematisk batch-förbättring av alla filer

**⚠️ KRITISK RIKTLINJE - KVALITET FÖRE HASTIGHET:**

**VIKTIGT:** När du förbättrar filer systematiskt (eller när jag automatiskt förbättrar filer):
- ❌ **SLARVA INTE** - Varje fil ska uppdateras till perfektion
- ❌ **PRIORITERA INTE** - Alla filer är lika viktiga, ingen fil ska nedprioriteras
- ❌ **TA INGA SHORTCUTS** - Gå igenom varje fil grundligt och komplett
- ❌ **FUSKA INTE** - Hitta inte på saker för att snabba upp processen
- ❌ **HOPPA INTE ÖVER** - Inga steg, sektioner eller filer ska hoppas över
- ✅ **KVALITET ÄR ALLT** - Tid är inte viktigt, kvalitet är det enda som räknas
- ✅ **VARJE FIL TILL PERFEKTION** - Varje fil ska ha komplett, välstrukturerat innehåll
- ✅ **TA DEN TID SOM BEHÖVS** - Om det tar längre tid, även om det är 100 filer, måste vi ta den tiden
- ✅ **INGA SHORTCUTS ÄR TILLÅTNA** - Detta är absolut nödvändigt för att processen ska vara användbar

**När du vill förbättra alla filer i en batch:**

1. **Gå igenom hela listan** i `FEATURE_GOAL_STATUS.md` fil för fil, i ordning
2. **För varje fil (utan undantag):**
   - Läsa HTML-filen grundligt
   - Analysera ALLA relaterade BPMN-filer (enligt Steg 1) - INGEN fil ska hoppas över
   - Förbättra ALLA sektioner baserat på BPMN-data - INGEN sektion ska hoppas över
   - Ersätt ALLA tekniska ID:n med beskrivande namn - INGET tekniskt ID ska lämnas kvar
   - Gör texten lättläst och affärsorienterad - INGEN sektion ska vara svårläst
   - Spara filen
   - Markera med `[x]` i status-listan
   - Rapportera kortfattat i chatten (t.ex. "✅ Application: Förbättrad beskrivning, lagt till saknade aktiviteter")
3. **Fortsätt tills ALLA filer är klara** - INGEN fil ska hoppas över eller nedprioriteras
4. **För orphaned filer:** Identifiera åtgärd först, sedan hantera systematiskt (samma kvalitetskrav gäller)

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
   - **REKURSIVT: Nested subprocesses** (feature goals inuti feature goals - t.ex. Application → Object → Object Control)
   - Processer som feature goal går vidare till (via sequence flows i parent-processen)
   - Processer som kan trigga feature goal (via events/escalations)
   - **ALLA processer** som kan påverka feature goal (direkt och indirekt)

4. **Identifiera abstraktionsnivå**:
   - Är nested subprocess en del av feature goalet eller en separat feature goal?
   - Om del av feature goalet: Analysera dess innehåll som del av feature goalet
   - Om separat feature goal: Analysera hur den anropas och påverkar feature goalet
   - **REKURSIVT:** Gå igenom alla nivåer av nesting (t.ex. Application → Object → Object Control → Object Valuation)

#### 1.2 Analysera feature goal-processen (t.ex. mortgage-se-appeal.bpmn)

**⚠️ VIKTIGT: Analysera helheten, inte bara isolerade delar**

**För varje call activity i feature goal-processen:**
- Identifiera om det är en nested subprocess (feature goal inuti feature goal)
- Om nested subprocess: Analysera dess innehåll och hur den integreras i feature goalet
- **REKURSIVT:** Gå igenom alla nivåer av nesting (t.ex. Application → Object → Object Control)

**Extrahera och dokumentera:**
- ✅ **Aktiviteter:** Alla steg i processen (kunduppgifter, systemuppgifter, affärsregler, anrop till andra processer)
  - **Kunduppgifter (userTask):** Vad kunden behöver göra (t.ex. "Registrera hushållsekonomi", "Bekräfta ansökan")
  - **Systemuppgifter (serviceTask):** Vad systemet gör automatiskt (t.ex. "Hämta kreditinformation", "Beräkna KALP")
  - **Affärsregler (businessRuleTask):** Beslutsregler som utvärderas (t.ex. "Screen KALP", "Pre-screen Party")
  - **Anrop till andra processer (callActivity):** Vilka andra processer som anropas (t.ex. "Household", "Stakeholder")
- ✅ **Beslutspunkter (gateways):** Alla ställen där processen tar beslut eller delar upp flödet
  - **Exklusiva beslut (exclusiveGateway):** Beslut där endast en väg väljs (t.ex. "KALP OK?", "Skip step?")
  - **Parallella flöden (parallelGateway):** Ställen där flera flöden körs samtidigt
  - **Inklusiva beslut (inclusiveGateway):** Beslut där flera vägar kan väljas
  - **Namnlösa gateways:** Gateways utan namn som samlar ihop flöden - dokumentera vad de gör i kontexten
- ✅ **Händelser (events):** Alla händelser som påverkar processen
  - **Start:** När processen startar
  - **Slut:** När processen avslutas (normalt eller med fel)
  - **Timeout:** Tidsgränser som avslutar processen om aktivitet inte slutförs
  - **Fel (error events):** Fel som kan avsluta processen (t.ex. "Pre-screen rejected", "Stakeholder rejected")
  - **Escalation:** Eskaleringar som kan trigga andra processer
  - **Meddelanden (message events):** Meddelanden som kan trigga eller avsluta processen
- ✅ **Roller (lanes):** Vilka aktiviteter som tillhör vilken roll (t.ex. Stakeholder, Compliance, System)
- ✅ **Flöde:** Hur processen flödar från steg till steg (använd beskrivande namn, inte tekniska ID:n)
- ✅ **Eskaleringar:** Definitioner av eskaleringar och när de används
- ✅ **Meddelanden:** Definitioner av meddelanden och när de används
- ✅ **Fel:** Definitioner av fel och när de används

#### 1.3 Analysera parent-processen (t.ex. mortgage.bpmn)

**Sök efter feature goal call activity och dokumentera:**
- ✅ **Hur anropas feature goal?** 
  - Vilken beslutspunkt eller händelse triggar anropet? (t.ex. "När ansökan är automatiskt avvisad", "Efter att kreditevaluering är klar")
  - Vilka villkor måste vara uppfyllda? (t.ex. "is-automatically-rejected = Yes")
- ✅ **Boundary events på call activity:**
  - **Timeout:** Finns det en tidsgräns för feature goal? Vad händer om tidsgränsen överskrids?
  - **Fel:** Vilka fel kan triggas från feature goal? (t.ex. "Pre-screen rejected", "Stakeholder rejected")
  - **Eskaleringar:** Finns det eskaleringar som kan triggas?
- ✅ **Flöde till/från feature goal:**
  - Vad händer innan feature goal anropas? (vilka steg måste vara klara?)
  - Vad händer efter att feature goal är klar? (vilken process går processen vidare till?)
- ✅ **Beslutspunkter som styr flödet:**
  - Vilka beslutspunkter avgör om feature goal anropas?
  - Vilka beslutspunkter avgör vad som händer efter feature goal?
- ✅ **Meddelanden och eskaleringar:**
  - Finns det meddelanden eller eskaleringar som kan trigga eller påverka feature goal?

**Exempel för Appeal:**
- Appeal anropas när en ansökan har blivit automatiskt avvisad (via en beslutspunkt i huvudprocessen)
- Appeal har en timeout-mekanism som avslutar processen om överklagan inte skickas in inom tidsgränsen
- Efter Appeal går processen vidare till manuell kreditevaluering (via en beslutspunkt i huvudprocessen)

#### 1.4 Analysera nästa processer (processer feature goal går vidare till)

**För varje process som feature goal går vidare till:**
- ✅ **Hur anropas processen?**
  - Vilken beslutspunkt eller händelse triggar anropet?
  - Vilka villkor måste vara uppfyllda?
- ✅ **Eskaleringar som kan gå tillbaka:**
  - Finns det eskaleringar från nästa process som kan trigga feature goal igen?
  - När och varför skulle detta hända?
- ✅ **Fel som kan påverka:**
  - Vilka fel kan triggas från nästa process som påverkar feature goal?
  - Hur hanteras dessa fel?
- ✅ **Loop-mekanismer:**
  - Kan processen trigga feature goal igen? (t.ex. om en eskalering triggas)
  - Hur fungerar loop-mekanismen? (vilka villkor måste vara uppfyllda?)

**Exempel för Appeal:**
- Appeal går till Manual credit evaluation
- Manual credit evaluation kan trigga "Automatically rejected" → tillbaka till Appeal

#### 1.5 Analysera nested subprocesses (feature goals inuti feature goals)

**⚠️ VIKTIGT: Analysera på rätt abstraktionsnivå**

**⚠️ VIKTIGT: Analysera på rätt abstraktionsnivå**

**För varje call activity i feature goal-processen:**

1. **Identifiera om det är en nested subprocess:**
   - Hitta motsvarande subprocess-fil från bpmn-map.json
   - Exempel: Application innehåller Object, som i sin tur innehåller Object Control och Object Valuation

2. **Identifiera abstraktionsnivå:**
   - **Om nested subprocess är en del av feature goalet:**
     - Analysera dess innehåll (aktiviteter, gateways, events) som del av feature goalet
     - Dokumentera hur nested subprocess integreras i feature goalet
     - Beskriv flöde och sekvens mellan feature goal och nested subprocess
   - **Om nested subprocess är en separat feature goal:**
     - Analysera hur den anropas från feature goalet
     - Analysera hur den påverkar feature goalet (output, events, eskaleringar)
     - Beskriv beroenden mellan feature goal och nested subprocess

3. **REKURSIVT: Gå igenom alla nivåer av nesting:**
   - För varje nested subprocess: Analysera dess call activities
   - Fortsätt rekursivt tills alla nivåer är analyserade
   - Exempel: Application → Object → Object Control → Object Valuation
     - Analysera Object Control och Object Valuation som delar av Object
     - Analysera Object som en del av Application
     - Dokumentera hela kedjan: Application → Object → Object Control/Object Valuation

4. **Dokumentera helhetsbilden:**
   - Beskriv hur alla nested subprocesses samverkar
   - Beskriv flöde och sekvens mellan alla nivåer
   - Beskriv beroenden och interaktioner mellan nested subprocesses

**Exempel för Application:**
- Application innehåller Object (nested subprocess)
- Object innehåller Object Control och Object Valuation (nested subprocesses i Object)
- Analysera Object Control och Object Valuation som delar av Object
- Analysera Object som en del av Application
- Dokumentera hela kedjan: Application → Object → Object Control/Object Valuation

#### 1.6 Analysera relaterade processer (event-driven dependencies)

**Sök efter och dokumentera:**
- ✅ **Meddelanden som kan trigga:**
  - Vilka meddelanden kan trigga feature goal? (t.ex. "Reminder", "Document verified")
  - När och varför skickas dessa meddelanden?
- ✅ **Eskaleringar som kan trigga:**
  - Vilka eskaleringar kan trigga feature goal? (t.ex. "credit-evaluation-automatically-rejected")
  - När och varför triggas dessa eskaleringar?
- ✅ **Fel som kan påverka:**
  - Vilka fel från andra processer kan påverka feature goal?
  - Hur hanteras dessa fel?
- ✅ **Event-driven arkitektur:**
  - Finns det en event bus eller pub/sub-system som feature goal är kopplad till?
  - Vilka events publiceras eller prenumereras feature goal på?

#### 1.7 Sammanställ analys (helhetsbild)

**Skapa en sammanställning med:**
- **Alla aktiviteter:** Lista alla steg i processen med beskrivande namn (inte tekniska ID:n)
  - Vad gör varje aktivitet? (t.ex. "Kunden registrerar hushållsekonomi" istället för "userTask register-household-economy-information")
  - Vem utför aktiviteten? (kund, handläggare, system)
- **Alla beslutspunkter:** Lista alla gateways med beskrivande namn och vad de avgör
  - Vad avgör beslutspunkten? (t.ex. "KALP OK?" istället för "Gateway_0fhav15")
  - Vilka vägar finns? (t.ex. "Ja" → bekräftelse, "Nej" → avvisning)
- **Alla händelser:** Lista alla events med beskrivande namn och vad de betyder
  - Vad triggar händelsen? (t.ex. "Timeout" istället för "Event_111g1im")
  - Vad händer när händelsen triggas?
- **Flödesbeskrivning:** Beskriv processflödet i affärstermer
  - Hur anropas feature goal? (beskriv i affärstermer, inte tekniska ID:n)
  - Vad händer efter feature goal? (beskriv i affärstermer)
- **Beroenden:** Lista alla processer, händelser och eskaleringar som feature goal är beroende av
- **Timeout/error-hantering:** Dokumentera alla tidsgränser och felhantering
  - Vilka tidsgränser finns? (t.ex. "30 dagar för överklagan")
  - Vilka fel kan uppstå? (t.ex. "Pre-screen rejected", "Stakeholder rejected")
  - Hur hanteras felen?
- **Loop-mekanismer:** Dokumentera om processen kan loopa
  - Kan processen triggas igen? När och varför?

### Steg 2: Jämför med HTML-dokumentationen

**Jämför analysen med befintlig HTML-dokumentation:**

1. **Aktiviteter:**
   - Vilka aktiviteter finns i BPMN men saknas i "Omfattning"?
   - Är aktiviteterna beskrivna med beskrivande namn och förklaringar, eller bara tekniska ID:n?
   - Vilka beslutspunkter (gateways) saknas eller är dåligt förklarade?
   - Är alla händelser (events) dokumenterade med beskrivande namn?

2. **Flödesbeskrivning:**
   - Är "Processteg - Input" korrekt och lättläst? (beskrivs det i affärstermer hur feature goal anropas, eller används tekniska ID:n?)
   - Är "Processteg - Output" korrekt och lättläst? (beskrivs det i affärstermer vad som händer efter, eller används tekniska ID:n?)
   - Är loop-mekanismer dokumenterade på ett sätt som är lätt att förstå?

3. **Beroenden:**
   - Är alla relaterade processer dokumenterade med beskrivande namn?
   - Är eskaleringar och felhändelser dokumenterade med beskrivande namn och förklaringar?
   - Är boundary events från parent-processen dokumenterade? (t.ex. timeout, fel)

4. **Lanes och roller:**
   - Är roller (lanes) korrekt dokumenterade?
   - Är det tydligt vilka aktiviteter som tillhör vilken roll?
   - Är det tydligt vem som utför varje aktivitet? (kund, handläggare, system)

### Steg 3: Identifiera förbättringsmöjligheter

**Baserat på jämförelsen, identifiera:**

1. **Saknade element:**
   - Aktiviteter som saknas i "Omfattning"
   - Beslutspunkter (gateways) som saknas eller är dåligt förklarade
   - Händelser (events) som saknas eller är dåligt förklarade

2. **Förbättringar i flödesbeskrivning:**
   - Uppdatera "Processteg - Input" med korrekt entry point i affärstermer (inte tekniska ID:n)
   - Uppdatera "Processteg - Output" med korrekt flöde i affärstermer (inte tekniska ID:n)
   - Lägg till information om loop-mekanismer på ett sätt som är lätt att förstå

3. **Förbättringar i beroenden:**
   - Lägg till boundary events från parent-processen med beskrivande namn och förklaringar
   - Lägg till eskaleringar och felhändelser med beskrivande namn och förklaringar
   - Förtydliga relaterade processer med beskrivande namn

4. **Förbättringar i roller:**
   - Förtydliga vilka aktiviteter som tillhör vilken roll
   - Förtydliga vem som utför varje aktivitet (kund, handläggare, system)
   - Använd affärstermer för roller (t.ex. "Kund" istället för "Stakeholder lane")

5. **Förbättringar i läsbarhet:**
   - Ersätt tekniska ID:n (t.ex. "Gateway_1v59ktc", "Event_111bwbu") med beskrivande namn och förklaringar
   - Använd affärstermer istället för tekniska termer där det är möjligt
   - Förklara vad varje element gör i affärstermer, inte bara tekniskt
   - Se till att texten är lättläst för människor utan teknisk BPMN-kunskap

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

**🎯 Målsättning:** Dokumentet ska vara användbart för alla i ett tvärfunktionellt utvecklingsteam:
- **Produktägare** ska förstå vad som ska byggas och förväntad effekt
- **Test lead** ska förstå hur feature goalet ska testas
- **Utvecklare** ska förstå hur lösningen ska byggas
- **Designer** ska förstå hur lösningen ska designas
- **Handläggare** ska förstå hur och var de påverkas
- **Alla** ska kunna läsa dokumentet och förstå sin del av jobbet

**Se nedan för detaljerad guide per kapitel med fokus på olika målgrupper.**

- **Beskrivning av FGoal** - Sammanfattning av vad Feature Goalet gör
- **Processteg - Input** - När processen startar (baserat på BPMN sequence flows)
- **Processteg - Output** - Förväntad utkomst (baserat på BPMN sequence flows)
- **Omfattning** - Vad som ingår (baserat på call activities, subprocesses, tasks)
- **Avgränsning** - Vad som inte ingår
- **Beroenden** - Externa beroenden (service tasks, integrations)
- **BPMN - Process** - Referens till BPMN-processen
- **Testgenerering** - Testscenarier, UI Flow, testdata-referenser, implementation mapping (se riktlinjer nedan)
- **Effekt** - Förväntad affärseffekt som uppnås med feature goalet (längst ned)
- **User stories** - Relevanta och realistiska user stories som kan kopplas till feature goalet (längst ned)
- **Tekniska krav** - Tekniska krav för implementation (timeout, retry, error codes, logging, skalbarhet, säkerhet) (längst ned)

**⚠️ VIKTIGT - Kvalitetschecklista för alla sektioner:**
- ✅ **Var specifik:** Nämn specifika processsteg, call activities, gateways, error events, datastores, och mekanismer från BPMN-processen
- ✅ **Undvik generiska beskrivningar:** Istället för "systemet hämtar data", skriv "systemet hämtar data via 'Internal data gathering' call activity"
- ✅ **Använd konkreta siffror:** I "Effekt"-sektionen, använd konkreta siffror eller procent (t.ex. "30-40%", "25-35%")
- ✅ **Koppla till processen:** Alla beskrivningar ska vara kopplade till faktiska BPMN-element, inte generiska beskrivningar
- ✅ **Organisera i kategorier:** För komplexa feature goals, organisera "User stories", "Effekt" och "Tekniska krav" i kategorier med underrubriker
- ✅ **Var koncis:** Håll varje sektion koncis och lättläst - undvik onödiga repetitioner och långa förklaringar
- ✅ **Separera affärs- och tekniska detaljer:** Affärsorienterat innehåll i Omfattning, tekniska detaljer i Tekniska krav

**⚠️ KRITISK REGEL - KONCIS OCH LÄTTLÄST:**
Dokumentationen ska vara **koncis och lättläst** för alla målgrupper. Följ dessa principer:
- **Undvik repetitioner:** Om samma information finns i flera sektioner, referera istället för att upprepa
- **Var koncis:** Håll varje sektion kortfattat - läsaren ska snabbt förstå huvudsaken
- **Separera detaljer:** Affärsorienterat innehåll i Omfattning, tekniska detaljer i Tekniska krav
- **Tydlig separation:** Funktionella acceptanskriterier (vad användaren ser/gör, UI/UX) i User stories, tekniska krav (timeout, retry, error codes) i Tekniska krav
- **Fokusera på viktigaste informationen:** Alla detaljer behövs inte i varje sektion - fokusera på vad som är viktigast för varje målgrupp

## 🎯 Målgrupper och vad de behöver från dokumentet

Feature Goal-dokumentationen ska vara användbar för alla i ett tvärfunktionellt utvecklingsteam. Varje kapitel har specifika målgrupper som behöver olika information:

### 📊 Översikt: Vem läser vad?

| Kapitel | Primär målgrupp | Vad de behöver förstå |
|---------|----------------|----------------------|
| **Beskrivning av FGoal** | Alla | Vad feature goalet gör, vem som utför aktiviteten, syfte och värde |
| **Processteg - Input** | Utvecklare, Test lead | När processen startar, vilka data som behövs, entry point |
| **Processteg - Output** | Alla | Förväntat resultat, vad som ska hända när processen är klar |
| **Omfattning** | Alla | Vad som ingår i processen, alla aktiviteter och steg |
| **Avgränsning** | Produktägare, Utvecklare | Vad som INTE ingår, scope boundaries |
| **Beroenden** | Utvecklare, Test lead | Externa system, API:er, integrationer som behövs |
| **BPMN - Process** | Utvecklare, Test lead | Processflöde, sekvens, gateways, error events |
| **Testgenerering** | Test lead, Testare | Testscenarier, UI Flow, testdata, implementation mapping |
| **Effekt** | Produktägare, Handläggare, Business Analyst | Affärsvärde, förväntade effekter, mätbara resultat |
| **User stories** | Produktägare, Designer, Utvecklare, Business Analyst | Användarbehov, funktionalitet, acceptanskriterier |
| **Tekniska krav** | Utvecklare, Arkitekt, DevOps, Compliance | Tekniska krav (timeout, retry, error codes, logging, skalbarhet, säkerhet) |

### 👥 Detaljerad guide per målgrupp

#### 🎯 Produktägare (Product Owner)

**Vad de behöver förstå:**
- Vad ska byggas? (Beskrivning av FGoal, Omfattning)
- Varför ska det byggas? (Effekt)
- Vilket värde ger det? (Effekt, User stories)
- Vad ingår och vad ingår inte? (Omfattning, Avgränsning)

**Kapitel att fokusera på:**
1. **Beskrivning av FGoal** - Tydlig beskrivning av vad feature goalet gör och vem som utför aktiviteten
2. **Effekt** - Konkreta affärseffekter med mätbara siffror (t.ex. "minskar handläggningstid med 30-40%")
3. **User stories** - Användarbehov och värde, organisera i kategorier (Kundperspektiv, Handläggarperspektiv)
4. **Omfattning** - Vad som ingår i processen, alla aktiviteter och steg
5. **Avgränsning** - Vad som INTE ingår, scope boundaries

**Riktlinjer för innehåll:**
- Använd affärstermer, inte tekniska termer
- Fokusera på värde och syfte, inte implementation
- Var konkret om affärseffekter (använd siffror där möjligt)
- Beskriv vem som påverkas och hur (kund, handläggare, system)

#### 🧪 Test lead och Testare

**Vad de behöver förstå:**
- Hur ska feature goalet testas? (Testgenerering)
- Vilka scenarier behöver täckas? (Testscenarier)
- Vilka testdata behövs? (Testdata-referenser)
- Hur mappas BPMN till faktisk implementation? (Implementation Mapping)
- Vilka error events finns? (Processteg - Output, Omfattning)
- Vilka är de tekniska kraven? (Tekniska krav)

**Kapitel att fokusera på:**
1. **Testgenerering** - Komplett med alla scenarier, UI Flow, testdata, implementation mapping
2. **Processteg - Output** - Alla möjliga utfall, inklusive error events
3. **Omfattning** - Alla aktiviteter och steg som behöver testas
4. **Beroenden** - Externa system och integrationer som behöver mockas/testas
5. **Tekniska krav** - Tekniska krav (timeout, retry, error codes, logging, skalbarhet, säkerhet)

**Riktlinjer för innehåll:**
- Täck alla processsteg (varje aktivitet, gateway, error event)
- Inkludera alla scenariotyper (Happy, Error, Edge)
- Specificera konkreta testdata-värden (inte bara beskrivningar)
- Inkludera förväntade resultat/assertions för varje steg i UI Flow
- Dokumentera timeout-värden, retry-logik, error handling
- Se `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` för checklista över vad som ofta saknas

#### 💻 Utvecklare

**Vad de behöver förstå:**
- Hur ska lösningen byggas? (Tekniska krav, Implementation Mapping)
- Vilka API:er och integrationer behövs? (Beroenden, Implementation Mapping)
- Vilka är tekniska kraven? (Tekniska krav)
- Hur fungerar processflödet? (BPMN - Process, Omfattning)
- Vilka error events ska hanteras? (Processteg - Output, Omfattning)

**Kapitel att fokusera på:**
1. **Acceptanskriterier** - Konkreta tekniska krav, timeout-värden, valideringsregler, error handling
2. **Implementation Mapping** - Routes, endpoints, API:er, datastores
3. **Beroenden** - Externa system, API:er, integrationer
4. **BPMN - Process** - Processflöde, sekvens, gateways, error events
5. **Omfattning** - Alla aktiviteter och steg som behöver implementeras
6. **Processteg - Input/Output** - Entry point, dataformat, förväntade resultat

**Riktlinjer för innehåll:**
- Var specifik om tekniska krav (timeout-värden, valideringsregler, error codes)
- Nämn specifika processsteg, call activities, gateways, error events
- Dokumentera API-endpoints, routes, datastores
- Beskriv error handling i detalj (vilka error events, när triggas de, vilka felmeddelanden)
- Inkludera multi-instance och parallellitet-mekanismer
- Se till att acceptanskriterier är testbara och konkreta

#### 🎨 Designer

**Vad de behöver förstå:**
- Vilka användare påverkas? (Beskrivning av FGoal, User stories)
- Vilka användaruppgifter finns? (Omfattning, User stories)
- Hur ser användarresan ut? (Omfattning, BPMN - Process)
- Vilka UI-komponenter behövs? (User stories - funktionella acceptanskriterier)
- Vilka felmeddelanden behövs? (Processteg - Output, User stories - funktionella acceptanskriterier)

**Kapitel att fokusera på:**
1. **Beskrivning av FGoal** - Vem som utför aktiviteten (kund, handläggare), vad de gör
2. **User stories** - Användarbehov, funktionalitet, UI/UX-krav
3. **Omfattning** - Alla user tasks och kundaktiviteter
4. **Processteg - Output** - Felmeddelanden, feedback till användare
5. **User stories** - Funktionella acceptanskriterier med UI/UX-krav (t.ex. "tydliga rubriker", "möjlighet att gå tillbaka")

**Riktlinjer för innehåll:**
- Fokusera på användarens perspektiv (kund, handläggare)
- Beskriv användaruppgifter konkret (t.ex. "kunden fyller i hushållsekonomi")
- Inkludera UI/UX-krav i acceptanskriterier (t.ex. "tydliga rubriker", "möjlighet att gå tillbaka")
- Beskriv felmeddelanden och feedback (vad ska användaren se vid fel?)
- Dokumentera användarresan (vilka steg går användaren igenom?)

#### 👤 Handläggare

**Vad de behöver förstå:**
- Hur påverkas jag? (Beskrivning av FGoal, Omfattning)
- Vilka uppgifter gör jag? (Omfattning, User stories)
- Vilket värde ger det mig? (Effekt, User stories)
- Vilka fel kan uppstå? (Processteg - Output, Omfattning)

**Kapitel att fokusera på:**
1. **Beskrivning av FGoal** - Tydlig beskrivning av vad feature goalet gör och vem som utför aktiviteten
2. **Effekt** - Hur feature goalet påverkar handläggarens arbete (t.ex. "minskar manuellt arbete med 30-40%")
3. **User stories** - Handläggarperspektiv (vad behöver handläggaren, vilket värde får de)
4. **Omfattning** - Handläggaraktiviteter och uppgifter
5. **Processteg - Output** - Vad händer när processen är klar, vilka fel kan uppstå

**Riktlinjer för innehåll:**
- Använd affärstermer, inte tekniska termer
- Fokusera på handläggarens perspektiv (vad gör de, vilket värde får de)
- Beskriv konkreta effekter (t.ex. "minskar antalet ansökningar som når handläggare med 30-50%")
- Förklara felmeddelanden i affärstermer (vad betyder felet för handläggaren?)

#### 👥 Tvärfunktionellt team

**Vad de behöver förstå:**
- Översikt av feature goalet (Beskrivning av FGoal)
- Vad ingår och vad ingår inte? (Omfattning, Avgränsning)
- Vilket värde ger det? (Effekt)
- Vilka är kraven? (User stories - funktionella acceptanskriterier, Tekniska krav)

**Kapitel att fokusera på:**
1. **Beskrivning av FGoal** - Översikt av vad feature goalet gör
2. **Omfattning** - Vad som ingår i processen
3. **Effekt** - Affärsvärde och förväntade effekter
4. **User stories** - Användarbehov och funktionalitet
5. **User stories** - Funktionella acceptanskriterier med konkreta krav och förväntningar

**Riktlinjer för innehåll:**
- Använd tydligt språk som alla kan förstå
- Undvik onödiga tekniska termer
- Fokusera på affärsvärde och syfte
- Var konkret om vad som ska byggas och varför

#### 🏗️ Arkitekt

**Vad de behöver förstå:**
- Systemarkitektur och integrationer (Beroenden, BPMN - Process)
- Tekniska beslut och trade-offs (Tekniska krav, Beroenden)
- Processflöde och sekvens (BPMN - Process, Omfattning)
- Externa system och API:er (Beroenden, Implementation Mapping)

**Kapitel att fokusera på:**
1. **Beroenden** - Externa system, API:er, integrationer, tekniska beroenden
2. **BPMN - Process** - Processflöde, sekvens, gateways, error events
3. **Tekniska krav** - Tekniska krav, timeout-värden, valideringsregler
4. **Implementation Mapping** - Routes, endpoints, API:er, datastores
5. **Omfattning** - Alla aktiviteter och steg som påverkar arkitekturen

**Riktlinjer för innehåll:**
- Dokumentera tekniska beslut och trade-offs
- Beskriv integrationer i detalj (API:er, protokoll, dataformat)
- Nämn skalbarhets- och prestandakrav
- Dokumentera säkerhets- och compliance-krav
- Beskriv error handling och resilience-mekanismer

#### 📊 Business Analyst

**Vad de behöver förstå:**
- Affärslogik och regler (Omfattning, BPMN - Process)
- Processflöde och affärsbeslut (BPMN - Process, Omfattning)
- Affärsregler och DMN-beslutslogik (Omfattning, Beroenden)
- Affärsvärde och effekter (Effekt, User stories)

**Kapitel att fokusera på:**
1. **Omfattning** - Alla aktiviteter, affärsregler, DMN-beslutslogik
2. **BPMN - Process** - Processflöde, beslutspunkter, affärslogik
3. **Effekt** - Affärsvärde och förväntade effekter
4. **User stories** - Affärsbehov och funktionalitet
5. **Beroenden** - Externa system som påverkar affärslogik

**Riktlinjer för innehåll:**
- Beskriv affärslogik i detalj (inte bara teknik)
- Dokumentera DMN-beslutsregler och tröskelvärden
- Förklara affärsbeslut och deras konsekvenser
- Beskriv edge cases och specialfall
- Koppla affärslogik till affärsvärde

#### 🔧 DevOps/Infrastructure

**Vad de behöver förstå:**
- Deployment och infrastructure requirements (Beroenden, Tekniska krav)
- Monitoring och observability (Beroenden, Processteg - Output)
- Skalbarhet och prestanda (Tekniska krav, Beroenden)
- Error handling och resilience (Processteg - Output, Omfattning)

**Kapitel att fokusera på:**
1. **Beroenden** - Externa system, API:er, infrastructure requirements
2. **Tekniska krav** - Prestanda, skalbarhet, monitoring-krav
3. **Processteg - Output** - Error events, timeout-värden, retry-logik
4. **Omfattning** - Multi-instance, parallellitet, load patterns

**Riktlinjer för innehåll:**
- Dokumentera infrastructure requirements (t.ex. databaser, message queues)
- Beskriv monitoring och alerting-behov
- Nämn skalbarhets- och prestandakrav
- Dokumentera deployment dependencies
- Beskriv error handling och retry-strategier

#### ⚖️ Compliance/Legal

**Vad de behöver förstå:**
- Compliance-krav och regler (Tekniska krav, Omfattning)
- Datahantering och integritet (Omfattning, Beroenden)
- Felhantering och audit trails (Processteg - Output, Tekniska krav)
- Affärsregler och legal requirements (Omfattning, BPMN - Process)

**Kapitel att fokusera på:**
1. **Tekniska krav** - Compliance-krav, datahantering, audit trails
2. **Omfattning** - Datahantering, regler, compliance-aktiviteter
3. **Processteg - Output** - Felhantering, audit trails, data retention
4. **Beroenden** - Externa system som påverkar compliance

**Riktlinjer för innehåll:**
- Dokumentera compliance-krav explicit
- Beskriv datahantering och integritet
- Nämn audit trails och logging-krav
- Förklara legal requirements och konsekvenser
- Beskriv felhantering från compliance-perspektiv

#### 🎯 Scrum Master/Agile Coach

**Vad de behöver förstå:**
- Scope och dependencies (Omfattning, Avgränsning, Beroenden)
- Estimering och planering (Omfattning, Tekniska krav)
- Risk och blockers (Beroenden, Processteg - Output)
- Team coordination (Omfattning, Beroenden)

**Kapitel att fokusera på:**
1. **Omfattning** - Scope, aktiviteter, komplexitet
2. **Avgränsning** - Vad ingår INTE, scope boundaries
3. **Beroenden** - Externa dependencies, blockers, risk
4. **Tekniska krav** - Tekniska krav för Definition of Done

**Riktlinjer för innehåll:**
- Beskriv scope tydligt för estimering
- Dokumentera dependencies och blockers
- Nämn risk och komplexitet
- Förklara coordination-behov mellan team

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
- ✅ "Household är en kundaktivitet där kunden (Stakeholder) registrerar hushållens ekonomi, inkomster, utgifter och låneuppgifter. Detta är en viktig del av ansökningsprocessen där kunden fyller i ekonomisk information som används för att bedöma låneansökan."
- ✅ "Appeal hanterar överklaganden när en kreditansökan har blivit automatiskt avvisad. Processen möjliggör för kunden (Stakeholder) att skicka in en överklagan som sedan granskas av en handläggare (Caseworker). Om överklagan accepteras, går ansökan vidare till manuell kreditevaluering."
- ✅ "Efter att Household och Stakeholders är klara, avgörs om bekräftelsesteget ska hoppas över. Om bekräftelse hoppas över, beräknar systemet först maximalt lånebelopp baserat på hushållsaffordability (KALP) och screenar resultatet. Om screening visar att ansökan ska avvisas, avslutas processen med fel."

**Exempel på dålig beskrivning:**
- ❌ "Household anropas inuti stakeholders subprocess som är multi-instance via Gateway_1v59ktc..." (fokuserar på teknik och tekniska ID:n, inte syfte)
- ❌ "Processen hanterar information och går via gateway Event_111bwbu till Activity_1mezc6h..." (vagt, använder tekniska ID:n, nämner inte vem som gör vad)
- ❌ "Gateway_0fhav15 avgör om KALP OK" (använder tekniskt ID istället för beskrivande namn)

**Tips för alla sektioner:**
- Använd information från BPMN-filen för att fylla i faktiskt innehåll
- Var konkret och affärsnära
- Fokusera på vad som faktiskt händer i processen
- Kontrollera att beskrivningen är lättläst och tydlig
- **Undvik tekniska ID:n:** Använd alltid beskrivande namn och förklaringar
- **Förklara affärsmässiga konsekvenser:** Beskriv inte bara vad som händer, utan också varför det är viktigt
- **Använd exempel:** Ge konkreta exempel på när och varför processen används
- **Strukturera innehållet:** Använd rubriker, underrubriker och listor för att göra texten lättläst
- **Testa läsbarheten:** Läs igenom texten som om du inte känner till BPMN - är den lätt att förstå?

#### Riktlinjer för "Processteg - Input"

**Målgrupper som läser detta kapitel:**
- **Utvecklare** - Entry point, vilka data behövs, när startar processen
- **Test lead** - Testdata som behövs, entry conditions
- **Produktägare** - När används processen, vilka förutsättningar krävs

**Viktiga krav:**
1. **Var specifik:** Nämn specifika processsteg, call activities, gateways, och mekanismer från BPMN-processen
2. **Beskriv entry point:** Hur anropas processen? Vilken beslutspunkt eller händelse triggar den?
3. **Lista input-data:** Vilka data är tillgängliga vid start? (t.ex. ansöknings-ID, kund-ID, ansökningstyp)
4. **Beskriv förutsättningar:** Vilka villkor måste vara uppfyllda? (t.ex. "kund är identifierad", "ansökan är initierad")

**Exempel på bra input-beskrivning:**
- ✅ "Application-processen startar när en kund initierar en bolåneansökan i Mortgage huvudprocessen. Följande information är tillgänglig vid start: Ansöknings-ID, kund-ID, ansökningstyp (köp, flytt, omlåning), önskat belopp, löptid, och fastighetstyp"
- ✅ "Application anropas automatiskt från Mortgage huvudprocessen som första steg i kreditprocessen"

**Exempel på dålig input-beskrivning:**
- ❌ "Processen startar när data finns" (för vagt, nämner inte specifika data eller entry point)

#### Riktlinjer för "Processteg - Output"

**Målgrupper som läser detta kapitel:**
- **Alla** - Förväntat resultat, vad händer när processen är klar
- **Utvecklare** - Vilka data produceras, vilka error events kan triggas
- **Test lead** - Förväntade utfall, error cases som behöver testas
- **Handläggare** - Vad händer när processen är klar, vilka fel kan uppstå

**Viktiga krav:**
1. **Var specifik:** Nämn specifika processsteg, call activities, error events, datastores, och mekanismer från BPMN-processen
2. **Beskriv alla utfall:** Happy path, error cases, edge cases
3. **Lista output-data:** Vilka data produceras? (t.ex. "komplett ansökningsdata", "KALP-beräkning", "kreditinformation")
4. **Beskriv error events:** Vilka error events kan triggas? (t.ex. "pre-screen rejected", "stakeholder rejected", "application rejected", "timeout")
5. **Beskriv felmeddelanden:** Vad ska användaren se vid fel? (t.ex. "tydligt felmeddelande som förklarar orsaken")

**Exempel på bra output-beskrivning:**
- ✅ "När Application-processen är slutförd har följande resultat uppnåtts: Komplett ansökningsdata (intern data, hushåll, stakeholders, objekt), KALP-beräkning (maximalt lånebelopp), Ansökan bekräftad, Kreditinformation hämtad från externa källor (t.ex. UC3)"
- ✅ "Om något steg misslyckas, kan processen avslutas med följande fel: Pre-screen rejected (en eller flera parter uppfyller inte grundläggande krav), Application rejected (KALP-beräkningen visar att maximalt lånebelopp är under tröskelvärde), Timeout (kunden har inte bekräftat ansökan inom tidsgränsen)"

**Exempel på dålig output-beskrivning:**
- ❌ "Processen avslutas när den är klar" (för vagt, nämner inte specifika resultat eller error events)

#### Riktlinjer för "Omfattning"

**⚠️ KRITISK REGEL - FOKUS PÅ AFFÄRSORIENTERAT INNEHÅLL:**
Omfattning-sektionen ska fokusera på **affärsorienterat innehåll** - vad processen gör, vilka steg som ingår, och hur processen flödar. **Tekniska krav, skalbarhet och säkerhet ska flyttas till Tekniska krav-sektionen. Funktionella acceptanskriterier (UI/UX-krav) ska finnas i User stories-sektionen.**

**Målgrupper som läser detta kapitel:**
- **Alla** - Vad som ingår i processen, alla aktiviteter och steg
- **Produktägare** - Översikt av processen och huvudsteg
- **Handläggare** - Alla handläggaraktiviteter och uppgifter
- **Designer** - Alla user tasks och kundaktiviteter

**Viktiga krav:**
1. **Var specifik:** Nämn specifika processsteg, call activities, gateways, error events, datastores, och mekanismer från BPMN-processen
2. **Lista alla aktiviteter:** User tasks, service tasks, business rule tasks, call activities
3. **Beskriv sekvens och parallellitet:** Hur flödar processen? Vilka aktiviteter körs parallellt?
4. **Beskriv multi-instance:** Om processen har multi-instance-mekanismer, förklara hur de fungerar
5. **Beskriv gateways:** Vilka beslutspunkter finns? Vad avgör de?
6. **Beskriv error handling:** Vilka error events finns? När triggas de?
7. **Fokusera på affärsorienterat innehåll:** Beskriv vad processen gör, inte hur den implementeras tekniskt
8. **Undvik tekniska detaljer:** Tekniska krav (timeout, retry, error codes, logging) ska flyttas till Tekniska krav
9. **Undvik skalbarhets- och säkerhetsdetaljer:** Skalbarhet och säkerhet ska flyttas till Tekniska krav
10. **UI/UX-krav:** Funktionella acceptanskriterier (UI/UX-krav, vad användaren ser/gör) ska finnas i User stories-sektionen

**Strukturering:**
- **Huvudsteg:** Lista huvudsteg i processen (t.ex. "1. Intern datainsamling", "2. Objektinformation", "3. Parallell datainsamling")
- **Felhantering:** Kort beskrivning av vilka error events som finns och när de triggas
- **Undvik:** Tekniska krav, skalbarhet, säkerhet (flytta dessa till Tekniska krav)

**Exempel på bra omfattning-beskrivning:**
- ✅ "Application-processen omfattar följande huvudsteg: 1. Intern datainsamling (Internal data gathering - multi-instance per part, pre-screening via DMN), 2. Objektinformation (Object call activity), 3. Parallell datainsamling (Household och Stakeholders körs parallellt), 4. KALP-beräkning och bekräftelse (Skip step gateway, KALP service task, Screen KALP DMN, KALP OK gateway, Confirm application user task), 5. Kreditupplysning (Sammanför flöden gateway, Fetch credit information - multi-instance per stakeholder)"

**Exempel på dålig omfattning-beskrivning:**
- ❌ "Processen innehåller olika steg" (för vagt, nämner inte specifika aktiviteter eller sekvens)
- ❌ "User tasks ska ha timeout på 30 dagar" (tekniskt krav, ska flyttas till Tekniska krav)
- ❌ "UI ska visa tydlig progress-indikator" (funktionellt acceptanskriterium, ska finnas i User stories)

#### Riktlinjer för "Avgränsning"

**Målgrupper som läser detta kapitel:**
- **Produktägare** - Vad ingår INTE, scope boundaries
- **Utvecklare** - Vad ska INTE implementeras i denna process
- **Alla** - Tydlighet om scope

**Viktiga krav:**
1. **Var specifik:** Lista tydligt vad som INTE ingår
2. **Förklara varför:** Varför ingår inte detta? (t.ex. "hanteras i annan process", "kommer i senare release")
3. **Beskriv gränser:** Var går gränsen mellan vad som ingår och vad som inte ingår?

#### Riktlinjer för "Beroenden"

**Målgrupper som läser detta kapitel:**
- **Utvecklare** - Externa system, API:er, integrationer som behövs
- **Test lead** - Externa system som behöver mockas/testas
- **Produktägare** - Externa beroenden som påverkar scope

**Viktiga krav:**
1. **Var specifik:** Nämn specifika system, API:er, integrationer
2. **Beskriv vad som behövs:** Vad behöver varje beroende tillhandahålla? (t.ex. "kreditinformation från UC3", "fastighetsvärdering från Lantmäteriet")
3. **Beskriv när det används:** När i processen används varje beroende? (t.ex. "Fetch credit information använder UC3 API för alla stakeholders")

#### Riktlinjer för "BPMN - Process"

**Målgrupper som läser detta kapitel:**
- **Utvecklare** - Processflöde, sekvens, gateways, error events
- **Test lead** - Processflöde för att förstå testscenarier
- **Alla** - Visuell översikt av processen

**Viktiga krav:**
1. **Beskriv processflödet:** Hur flödar processen? Vilka steg kommer i vilken ordning?
2. **Beskriv gateways:** Vilka beslutspunkter finns? Vad avgör de?
3. **Beskriv error events:** Vilka error events finns? När triggas de?
4. **Beskriv multi-instance och parallellitet:** Om processen har multi-instance eller parallella flöden, förklara hur de fungerar

#### Riktlinjer för "Effekt"

**Målgrupper som läser detta kapitel:**
- **Produktägare** - Affärsvärde, förväntade effekter, mätbara resultat
- **Controller/CFO** - Kostnadsbesparingar, kapacitetsökning, time to value
- **Handläggare** - Hur påverkas deras arbete, vilka förbättringar får de
- **Alla** - Varför bygger vi detta? Vilket värde ger det?

**Viktigt:**
- **BPMN-filerna visar PROCESSEN, inte faktiska avslagsprocent eller effekter.** BPMN-filerna beskriver vilka steg som finns, vilka gateways som avgör beslut, och vilka error events som kan triggas, men de visar INTE hur många ansökningar som faktiskt avvisas eller vilka effekter som realiseras.
- **Specifika siffror är OK att använda, men måste markeras som spekulativa/uppskattningar när baseline-data saknas.** Använd kortfattat och koncist språk (t.ex. "uppskattat", "förväntat", "baserat på typiska värden").
- **Baseline-data krävs från bankens nuvarande process för realistiska beräkningar.** Utan denna data är siffrorna uppskattningar baserat på typiska värden för liknande processer.

**Notera:** ROI-beräkningar och riskanalys görs för hela systemet i ett separat dokument, inte per feature goal.

**Viktiga krav:**
1. **Var specifik:** Beskriv exakt hur detta feature goal bidrar till affärseffekter genom att nämna specifika processsteg, call activities, gateways, error events, och mekanismer från BPMN-processen
2. **Var mätbar:** Använd konkreta siffror eller procent där det är möjligt (t.ex. "minskar manuellt arbete med 30-40%", "minskar handläggningstid med 25-35%")
3. **Var konservativ:** Använd alltid lägre gränser i intervall (t.ex. "30-50%" → fokusera på 30% som konservativ uppskattning) och realistiska värden baserat på typiska processer, inte idealiserade scenarier
4. **Var realistisk:** Basera uppskattningar på typiska värden för liknande processer, inte på idealiserade scenarier
5. **Nämn vad som saknas:** Om exakt baseline-data saknas, nämn explicit vilken data som behövs för mer precisa beräkningar
6. **Koppla till feature goalet:** Förklara specifikt hur detta feature goal bidrar till effekten genom att nämna specifika processsteg, inte bara generella effekter
7. **Fokusera på affärsvärde:** Beskriv effekter som är relevanta för verksamheten (t.ex. automatisering, snabbare processer, bättre kvalitet, minskade kostnader)
8. **Organisera i kategorier:** För komplexa feature goals, organisera effekter i kategorier med underrubriker (t.ex. "Ökad automatisering", "Förbättrad datakvalitet", "Snabbare beslutsprocess", "Förbättrad kundupplevelse", "Riskminskning")
9. **Nämn specifika mekanismer:** Koppla effekter till specifika mekanismer i processen (t.ex. multi-instance, parallellitet, error events, gateways, DMN-beslutsregler)

**Strukturering - anpassa efter komplexitet:**

**Hur avgöra komplexitet:**
- **Enkla processer:** Få aktiviteter (1-3), inga eller få call activities, enkla flöden (t.ex. appeal, object information)
  - **Struktur:** En lista med effekter (100-200 ord)
  - **Fokus:** 2-3 viktigaste effekterna, kortfattat och affärsmässigt
  - **Undvik:** Onödiga detaljer, långa förklaringar, många kategorier
  
- **Medelkomplexa processer:** Flera aktiviteter (4-8), några call activities, parallella flöden (t.ex. application, credit decision)
  - **Struktur:** Koncis struktur med 3-4 kategorier (200-400 ord) - **rekommenderat**
  - **Fokus:** Viktigaste effekterna per kategori, volym-baserade beräkningar där relevant
  
- **Komplexa processer:** Många aktiviteter (9+), många call activities, komplexa flöden med många gateways (t.ex. root mortgage process)
  - **Struktur:** Utökad struktur med 5-7 kategorier (500-800 ord) - endast när nödvändigt
  - **Fokus:** Detaljerade effekter per kategori, omfattande volym-baserade beräkningar

**Viktigt:** 
- **Håll det affärsmässigt och relevant** - fokusera på effekter som ger värde, inte tekniska detaljer
- **Undvik "halv novell"** - för enkla processer, håll det kortfattat (100-200 ord)
- **Anpassa detaljnivå** - mer komplex process = mer detaljer, enklare process = färre detaljer

**Koncis struktur (rekommenderat):**
```html
<h3>Executive Summary</h3>
[Kortfattad sammanfattning med nyckeltal - max 1-2 paragrafstycken eller kort lista]
[Fokus på affärsmässiga effekter, inga tekniska detaljer]
[Lätt att skanna - använd bullet points med konkreta siffror]
[Organisera i 3-4 kategorier: Kostnadsbesparingar, Kapacitetsökning, Kundupplevelse]
[Förtydliga relationen mellan olika beräkningar (t.ex. "22 FTE elimineras genom direkt automatisering" vs "37.5% personalbesparing - total kapacitetsökning inklusive parallellisering")]

<h3>1. Automatisering och kostnadsbesparingar</h3>
[Förklarar hur man kom fram till siffrorna i Executive Summary]
[Kort textbeskrivning av BPMN-mekanismen (1-2 meningar)]
[Tabell för beräkningar (OBLIGATORISKT) med kolumner: Aktivitet, Volym, Tid per ansökan, Total tidssparande/år, FTE-värde]
[Text för processförbättringar och noteringar]
[Innehåller tekniska detaljer (BPMN-mekanismer, processsteg)]
[Visar beräkningsmetodik (volym × tid = total tidssparande)]

<h3>2. Snabbare processering och förbättrad kundupplevelse</h3>
[Förklarar hur man kom fram till siffrorna i Executive Summary]
[Kort textbeskrivning av BPMN-mekanismen (1-2 meningar)]
[Tabell för beräkningar (OBLIGATORISKT) med kolumner: Aspekt, Nuvarande, Nytt system, Förbättring]
[Text för processförbättringar och noteringar]
[Innehåller tekniska detaljer (BPMN-mekanismer, processsteg)]
[Visar beräkningsmetodik]

<h3>3. Kapacitetsökning</h3>
[Förklarar hur man kom fram till siffrorna i Executive Summary]
[Kort textbeskrivning (1-2 meningar)]
[Tabell för beräkningar (OBLIGATORISKT) med kolumner: Aspekt, Nuvarande, Nytt system, Förbättring]
[Förtydliga relationen mellan 22 FTE (direkt automatisering) och 37.5% personalbesparing (total kapacitetsökning)]
[Text för processförbättringar och noteringar]
[Innehåller tekniska detaljer (BPMN-mekanismer, processsteg)]
[Visar beräkningsmetodik]

<h3>Jämförelse med nuvarande process</h3>
[Kort tabell med viktigaste aspekterna]
[Inkludera "Ansökningar som når handläggare" om relevant]

<h3>Aggregeringsinformation</h3>
[OBLIGATORISKT för alla feature goals - används för att aggregera effekter till huvudprocessen]
[Tabell med kolumner: Effekt, Typ, Volym, Aggregeringsbar, Redan inkluderad i parent]
[Förtydliga vilka effekter som är direkta (kan aggregeras) vs indirekta (redan inkluderade)]
```

**Se `EFFEKT_EXECUTIVE_SUMMARY_EXEMPEL.md` för komplett exempel på Executive Summary-struktur.**

**Riktlinjer för Executive Summary:**

**Syfte:** Ge en snabb översikt för beslutsfattare (produktägare, controller, CFO) som vill ha nyckeltal utan tekniska detaljer.

**Struktur:**
- ✅ **Kortfattad:** Max 1-2 paragrafstycken eller en kort lista med 5-7 nyckeltal
- ✅ **Fokus på affärsmässiga effekter:** Tidssparande, kostnadsbesparingar, kapacitetsökning, kundupplevelse
- ✅ **Konkreta siffror:** Använd absoluta tal (timmar, FTE, SEK) och procentuella förbättringar
- ✅ **Lätt att skanna:** Använd bullet points eller kortfattade meningar
- ✅ **Inga tekniska detaljer:** Ingen BPMN-terminologi, inga processsteg, inga förklaringar av hur det fungerar
- ✅ **Kategoriserad:** Organisera i 3-4 kategorier (t.ex. Automatisering, Tidssparande, Kapacitet, Kundupplevelse)

**Exempel på bra Executive Summary (direktörsvänlig):**
```html
<h3>Executive Summary</h3>
<p>Application-processen automatisering och parallellisering ger betydande affärseffekter baserat på 100 000 ansökningar per år och 200 handläggare (konservativa uppskattningar):</p>

<h4>Kostnadsbesparingar</h4>
<ul>
  <li><strong>~20 MSEK</strong> kostnadsbesparingar per år (≈22 FTE elimineras genom direkt automatisering)</li>
  <li><strong>37.5%</strong> personalbesparing möjlig vid samma volym (200 → 125 handläggare) - total kapacitetsökning inklusive parallellisering</li>
</ul>

<h4>Kapacitetsökning</h4>
<ul>
  <li><strong>60%</strong> fler ansökningar per handläggare (500 → 800 per år)</li>
  <li><strong>60-100%</strong> ökad total kapacitet med samma personal (100 000 → 160 000-200 000 ansökningar/år)</li>
</ul>

<h4>Kundupplevelse</h4>
<ul>
  <li><strong>60%</strong> snabbare svarstider (5-7 dagar → 1-2 dagar)</li>
  <li><strong>20%</strong> förväntad ökning i kundnöjdhet (konservativ uppskattning)</li>
</ul>

<p class="muted"><em>Notera: Beräkningarna är konservativa uppskattningar baserat på typiska värden för liknande processer. För mer precisa beräkningar krävs baseline-data från nuvarande process (genomsnittlig handläggningstid, exakt manuell arbetstid per aktivitet, andel återkommande kunder, faktiska löner och overhead-kostnader). Se detaljerade sektioner nedan för beräkningsmetodik och förtydliganden.</em></p>
```

**Viktiga principer för Executive Summary:**
- ✅ **Fokusera på affärsvärde:** Kostnader, kapacitet, kundnöjdhet - inte tekniska detaljer
- ✅ **Tydliga nyckeltal:** Använd absoluta tal (MSEK, FTE, procent) som är lätta att förstå
- ✅ **Undvik tekniska termer:** Ingen BPMN-terminologi, inga processsteg, inga tekniska detaljer
- ✅ **Konsekventa siffror:** Se till att siffrorna stämmer (t.ex. 22 FTE × 900 000 SEK/år = ~20 MSEK, inte 1.4 MSEK)
- ✅ **Förenklad struktur:** 3-4 kategorier (Kostnadsbesparingar, Kapacitetsökning, Kundupplevelse)
- ✅ **Undvik svårtolkade siffror:** "100 000 dagar" är svårt att tolka - använd istället relativa förbättringar eller konvertera till handläggartimmar

**Exempel på dålig Executive Summary:**
```html
<h3>Översikt</h3>
<p>Application-processen bidrar till betydande affärseffekter genom automatisering, parallellisering och tidig avvisning. Via "Internal data gathering" call activity (multi-instance) hämtas automatiskt befintlig kunddata för alla identifierade parter. Via DMN-beslutsregel utförs automatiskt pre-screening som avvisar uppskattat 5-15% av ansökningar tidigt. Via parallel gateway (Gateway_0n2ekt4) körs "Household" och "Stakeholders" parallellt, vilket minskar total processeringstid...</p>
```
❌ **Problem:** För lång, innehåller tekniska detaljer (BPMN-termer, processsteg), svårt att skanna, ingen tydlig struktur med nyckeltal.

**Viktigt:**
- **Fokusera på viktigaste effekterna** - inte alla möjliga effekter
- **Undvik repetition** - varje effekt ska nämnas max en gång
- **Håll det koncist** - läsaren ska snabbt förstå huvudeffekterna
- **Var konservativ** - använd lägre gränser i intervall och realistiska värden
- **Inkludera kommentar** om att beräkningarna är konservativa uppskattningar och vilken data som saknas för mer precisa beräkningar
- **Var konsekvent** - använd samma siffror för samma sak genom hela kapitlet (t.ex. om pre-screening avvisar 5-15%, använd samma siffra överallt)
- **Förtydliga avslagsprocent** - separera tydligt mellan:
  - Pre-screening avslag (grundläggande krav: ålder, anställningsstatus, kreditscore) - vanligtvis låg (5-15%)
  - Totalt avslag (pre-screening + objekt + stakeholder + KALP) - kräver baseline-data
- **Förtydliga beräkningar** - visa hur totalt tidssparande beräknas (dela upp per aktivitet) så läsaren kan förstå siffrorna
- **Gör siffror tolkningsbara** - undvik svårtolkade siffror som "100 000 dagar". Använd istället "100 000 ansökningar × 1 dag" eller konvertera till handläggartimmar

**Kritiska riktlinjer för läsbarhet och konsekvens:**

1. **Konsekvent användning av siffror:**
   - ❌ **Undvik:** Olika siffror för samma sak i olika delar av kapitlet
   - ✅ **Gör:** Använd samma siffror för samma sak genom hela kapitlet
   - ✅ **Gör:** Om översikten säger "5-15%", använd samma siffra i detaljsektioner och tabeller
   - ✅ **Gör:** Om detaljsektionen säger "30 000 ansökningar", använd samma siffra i översikten

2. **Förtydliga beräkningar:**
   - ❌ **Undvik:** "Total tidssparande: 12 500-36 667 timmar/år" (läsaren förstår inte hur det beräknas)
   - ✅ **Gör:** Visa uppdelning per aktivitet:
     - "Datainsamling: 30 000 ansökningar × 15 min = 7 500 timmar/år"
     - "Pre-screening: 5 000 ansökningar × 10 min = 833 timmar/år"
     - "Total: 8 333 timmar/år ≈ ~4.6 FTE"

3. **Gör siffror tolkningsbara:**
   - ❌ **Undvik:** "100 000 dagar processeringstid sparas" (svårt att tolka)
   - ✅ **Gör:** "100 000 ansökningar × 1 dag = 100 000 dagar processeringstid sparas" eller "≈ 200 000 handläggartimmar"
   - ✅ **Gör:** Konvertera till handläggartimmar eller relativa förbättringar där det är relevant

4. **Separera olika typer av avslag:**
   - ❌ **Undvik:** "30-50% avvisas tidigt" utan att förtydliga vad det avser
   - ✅ **Gör:** Separera tydligt:
     - "Pre-screening (grundläggande krav): 5-15% avvisas"
     - "Totalt avslag (pre-screening + objekt + stakeholder + KALP): X% (kräver baseline-data)"

5. **Kortare översikt:**
   - ❌ **Undvik:** Långa, detaljerade punkter i översikten
   - ✅ **Gör:** Kortfattad översikt med 3-5 viktigaste effekterna, hänvisa till detaljsektioner för mer information
   - ✅ **Gör:** Fokusera på nyckeltal och huvudeffekter i översikten

6. **Förtydliga relationen mellan olika beräkningar:**
   - ❌ **Undvik:** Dubbel räkning som kan verka motstridig (t.ex. "22 FTE" och "37.5% personalbesparing" utan förklaring)
   - ✅ **Gör:** Förtydliga relationen i Executive Summary:
     - "≈22 FTE elimineras genom direkt automatisering"
     - "37.5% personalbesparing möjlig vid samma volym (total kapacitetsökning inklusive parallellisering)"
   - ✅ **Gör:** I detaljsektion 3, lägg till förtydligande:
     - "22 FTE (från sektion 1) är direkt tidssparande från automatisering. 37.5% personalbesparing (75 handläggare) är total kapacitetsökning inklusive parallellisering och processförbättringar. Dessa är olika beräkningar baserade på olika mekanismer."

7. **Förtydliga "manuell arbetstid per ansökan":**
   - ❌ **Undvik:** "25-50 minuter manuellt arbete per ansökan" när det egentligen varierar per ansökningstyp
   - ✅ **Gör:** Visa genomsnitt eller fördelning:
     - "Genomsnittligt 25-50 minuter mindre manuellt arbete per ansökan (varierar beroende på ansökningstyp: återkommande kunder sparar 15 min datainsamling, köpansökningar sparar 15 min KALP, etc.)"

8. **Strukturera för läsbarhet:**
   - ✅ **Gör:** Använd tydliga rubriker och underrubriker
   - ✅ **Gör:** Använd listor och tabeller för att organisera information
   - ✅ **Gör:** Separera olika typer av effekter i olika sektioner
   - ✅ **Gör:** Undvik långa paragrafstycken - dela upp i korta, fokuserade stycken

**Exempel på bra effektbeskrivning (specifik och kopplad till processsteg):**
- ✅ "Automatisk datainsamling via 'Internal data gathering': Systemet hämtar automatiskt befintlig kunddata (part, engagemang, kreditinformation) från interna system för alla identifierade parter (multi-instance). För återkommande kunder elimineras detta behovet av manuell datainmatning, vilket kan minska handläggningstid med upp till 40% för kända kunder jämfört med manuell process."
- ✅ "Automatisk pre-screening via DMN-beslutsregel: Systemet utför automatiskt pre-screening för varje part (ålder, anställningsstatus, kreditvärdighet) och avvisar ansökningar där parter inte uppfyller grundläggande krav via 'pre-screen rejected' error event. Uppskattat 5-15% av ansökningar avvisas vid pre-screening (konservativ uppskattning: 5%, exakt andel kräver baseline-data)."
- ✅ "Tidig avvisning via automatisk screening: Genom automatisk pre-screening, stakeholder-validering, objekt-validering och KALP-screening kan ansökningar som inte uppfyller grundläggande krav avvisas tidigt i processen (innan kreditevaluering). Totalt avslag (alla steg kombinerat) kräver baseline-data för exakt beräkning. Detta sparar tid och resurser genom att eliminera onödig handläggning av osannolika ansökningar."

**Viktiga riktlinjer för konsekvens:**
- **Använd samma siffror för samma sak:** Om pre-screening avvisar 5-15% i översikten, använd samma siffra i detaljsektionen och tabellen
- **Förtydliga vad siffrorna avser:** 
  - "Pre-screening avvisar 5-15%" (bara grundläggande krav)
  - "Totalt avslag (pre-screening + objekt + stakeholder + KALP) = X%" (alla steg, kräver baseline-data)
- **Förtydliga beräkningar:** Visa hur totalt tidssparande beräknas:
  - "Datainsamling: 30 000 ansökningar × 15 min = 7 500 timmar/år"
  - "Pre-screening: 5 000 ansökningar × 10 min = 833 timmar/år"
  - "Total: 8 333 timmar/år ≈ ~4.6 FTE"
- **Gör siffror tolkningsbara:** 
  - ❌ "100 000 dagar processeringstid sparas" (svårt att tolka)
  - ✅ "100 000 ansökningar × 1 dag = 100 000 dagar processeringstid sparas" eller "≈ 200 000 handläggartimmar" (tydligare)

**Exempel på dålig effektbeskrivning:**
- ❌ "Ökad automatisering" (för generellt, nämner inte hur feature goalet bidrar eller specifika processsteg)
- ❌ "Bättre process" (för vagt, ingen konkret effekt, nämner inte processsteg)
- ❌ "Systemet automatiskt hämtar data så att processen fungerar" (nämner inte affärsvärde eller konkreta siffror)

**Volym-baserade beräkningar (rekommenderat för stora volymer):**

För system med stora volymer (t.ex. 100 000+ ansökningar per år), inkludera volym-baserade beräkningar:

**Baseline-data att använda:**
- Total volym: 100 000 ansökningar per år
- Antal handläggare: 200
- Genomsnittlig handläggningstid (nuvarande): 5-7 dagar
- Genomsnittlig manuell arbetstid per ansökan: 2-4 timmar

**Beräkningar att inkludera (konservativa uppskattningar):**

1. **Volym-baserade effekter:**
   - Hur många ansökningar påverkas? (t.ex. "30 000-50 000 ansökningar per år" - använd 30 000 som konservativ uppskattning)
   - Hur många ansökningar når inte handläggare? (t.ex. "X% avvisas tidigt" - använd faktisk baseline-data)
     **VIKTIGT:** Pre-screening kontrollerar bara grundläggande krav (ålder ≥ 18, anställningsstatus, kreditscore ≥ 300). 
     Andelen avvisade är troligen låg (t.ex. 5-15%, INTE 30-50%). Använd faktisk baseline-data från nuvarande process 
     (andel ansökningar som avvisas p.g.a. grundläggande krav) för realistiska siffror.
   - Hur många ansökningar godkänns automatiskt? (t.ex. "40 000-50 000 straight-through" - använd faktisk baseline-data)
   - **Notera:** Om exakt volym-data saknas, nämn vilken data som behövs (t.ex. "exakt andel lågrisk vs högrisk ansökningar", "andel ansökningar som avvisas p.g.a. grundläggande krav i nuvarande process")

2. **Tidssparande i absoluta tal:**
   - Minuter/timmar per ansökan (t.ex. "15-30 minuter manuellt arbete" - använd 15 minuter som konservativ uppskattning)
   - Dagar processeringstid (t.ex. "2-3 dagar → 1 dag" - använd 2 dagar som konservativ uppskattning)
   - Total tidssparande per år (t.ex. "25 000-50 000 timmar/år" - använd 25 000 timmar som konservativ uppskattning)
   - **Notera:** Om exakt tidsdata saknas, nämn vilken data som behövs (t.ex. "exakt manuell arbetstid per aktivitet")

3. **Kapacitetsökning:**
   - Ansökningar per handläggare (t.ex. "500 → 800-1000 per år" - använd 800 som konservativ uppskattning)
   - Total kapacitet (t.ex. "160 000-200 000 ansökningar/år med samma personal" - använd 160 000 som konservativ uppskattning)
   - Personalbesparing (t.ex. "50-37.5% mindre personal behövs" - använd 37.5% som konservativ uppskattning)
   - **Notera:** Om exakt kapacitetsdata saknas, nämn vilken data som behövs (t.ex. "genomsnittlig handläggningstid per ansökan")

4. **Kostnadsbesparingar:**
   - Arbetstid i timmar/dagar (t.ex. "120 000-230 000 timmar/år" - använd 120 000 timmar som konservativ uppskattning)
   - FTE-värde (t.ex. "60-115 FTE per år" - använd 60 FTE som konservativ uppskattning, baserat på 1 800 arbetstimmar/år per FTE)
   - **Notera:** Om exakt kostnadsdata saknas, nämn vilken data som behövs (t.ex. "faktiska löner och overhead-kostnader per handläggare")
   - **Notera:** ROI-beräkningar görs för hela systemet i ett separat dokument, inte per feature goal

5. **Kundupplevelse:**
   - Svarstider (t.ex. "5-7 dagar → 1-2 dagar" - använd 5 dagar → 2 dagar som konservativ uppskattning)
   - Väntetider (t.ex. "Dagars väntetid → Minuter" - använd realistiska värden)
   - Förväntad nöjdhetsökning (t.ex. "20-30%" - använd 20% som konservativ uppskattning)
   - **Notera:** Om exakt kunddata saknas, nämn vilken data som behövs (t.ex. "nuvarande kundnöjdhet, genomsnittlig svarstid")

6. **Jämförelse med baseline:**
   - Tabellformat: Nuvarande vs Nytt system
   - Procentuell förbättring (använd lägre gränser som konservativa uppskattningar)
   - Absoluta förbättringar (använd lägre gränser som konservativa uppskattningar)
   - **Notera:** Om exakt baseline-data saknas, nämn vilken data som behövs för exakt jämförelse

**Förbättrad struktur för komplexa feature goals:**

```html
<h3>Översikt</h3>
[Kort sammanfattning med volym-baserade siffror]

<h3>1. Automatisering och minskad manuell hantering</h3>
[Specifika BPMN-mekanismer + volym + tidssparande + kostnadsbesparingar]

<h3>2. Snabbare processering och minskad väntetid</h3>
[Specifika BPMN-mekanismer + absoluta tider + kundupplevelse]

<h3>3. Kapacitetsökning och skalbarhet</h3>
[Volym-baserade beräkningar + kapacitetsökning per handläggare]

<h3>4. Förbättrad kundupplevelse</h3>
[Svarstider + väntetider + nöjdhet]

<h3>5. Kostnadsbesparingar</h3>
[Arbetstid i timmar/dagar + FTE-värde]

<h3>6. Time to Value (valfritt för komplexa feature goals)</h3>
[Fas 1 (0-3 månader), Fas 2 (3-6 månader), Fas 3 (6-12 månader)]

<h3>7. Success Metrics och KPI:er (valfritt för komplexa feature goals)</h3>
[Kvantitativa KPI:er + Kvalitativa KPI:er + Målsättningar]

<h3>8. Kvalitativa effekter - kvantifierat (valfritt för komplexa feature goals)</h3>
[Riskminskning, compliance-förbättringar, kundnöjdhet - alla kvantifierade]

<h3>9. Jämförelse med nuvarande process</h3>
[Tabellformat: Nuvarande vs Nytt system]
```

**Exempel på förbättrad effektbeskrivning med volym-baserade beräkningar:**

✅ **Före:**
```
Automatisk datainsamling via "Internal data gathering": Systemet hämtar automatiskt 
befintlig kunddata för alla identifierade parter (multi-instance). Detta kan minska 
handläggningstid med upp till 40% för kända kunder.
```

✅ **Efter:**
```
Automatisk datainsamling via "Internal data gathering" call activity (multi-instance):
Systemet hämtar automatiskt befintlig kunddata (part, engagemang, kreditinformation) 
från interna system för alla identifierade parter.

Volym-baserad effekt:
- För återkommande kunder (ca 30-40% av ansökningar = 30 000-40 000 ansökningar): 
  Eliminerar 15-30 minuters manuell datainmatning per ansökan
- Total tidssparande: 15-30 min × 30 000-40 000 ansökningar = 7 500-20 000 timmar/år
- Kostnadsbesparing: ~4-10 FTE per år (baserat på 1 800 arbetstimmar/år per FTE)

Processförbättring:
- Nuvarande: 15-30 minuter manuell datainmatning per ansökan
- Med nytt system: 0 minuter (automatiskt)
- Minskning: 100% av manuellt arbete för datainsamling

Kundupplevelse:
- Snabbare processstart: Omedelbar datainsamling vs 15-30 minuters väntetid
- Förbättrad noggrannhet: Automatisk datainsamling eliminerar manuella fel
```

**Aggregeringsinformation (OBLIGATORISKT för ALLA feature goals):**

Lägg till en sektion i slutet av Effekt-kapitlet med aggregeringsinformation:

```html
<h3>Aggregeringsinformation</h3>
<p class="muted">Denna information används för att aggregera effekter från subprocesser till huvudprocessen.</p>

<table>
  <thead>
    <tr>
      <th>Effekt</th>
      <th>Typ</th>
      <th>Volym</th>
      <th>Aggregeringsbar</th>
      <th>Redan inkluderad i parent</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Beskrivning av effekten, t.ex. "Automatisering (datainsamling + pre-screening)"]</td>
      <td>[Direkt eller Indirekt]</td>
      <td>[Exakt volym, t.ex. "30 000 ansökningar (återkommande kunder)"]</td>
      <td>[Ja eller Nej]</td>
      <td>[Ja eller Nej, med förklaring om Ja]</td>
    </tr>
  </tbody>
</table>
```

**Riktlinjer för aggregeringsinformation:**
- **Typ:** "Direkt" = effekt från denna process, "Indirekt" = effekt från subprocesser eller parallellisering
- **Volym:** Ange exakt volym (t.ex. "30 000 ansökningar (återkommande kunder)") - detta är kritiskt för aggregering
- **Aggregeringsbar:** "Ja" om effekten kan aggregeras numeriskt (t.ex. timmar, FTE, MSEK), "Nej" om den är kvalitativ (t.ex. kundnöjdhet)
- **Redan inkluderad i parent:** "Ja" om effekten redan är räknad i huvudprocessen (t.ex. parallellisering), "Nej" om den är unik för denna process
- **För huvudprocesser:** Markera effekter som kommer från subprocesser som "Indirekt" och "Redan inkluderad i parent: Ja"

**VIKTIGT: Strukturen ovan gäller för ALLA feature goals:**
- ✅ Huvudprocesser (t.ex. `mortgage-application-v2.html`)
- ✅ Subprocesser (t.ex. `mortgage-se-internal-data-gathering-v2.html`)
- ✅ Alla feature goals måste ha samma struktur för att aggregering ska fungera

**Se även:**
- `EFFEKT_ANALYSIS_AND_IMPROVEMENTS.md` - Detaljerad analys och förbättringsförslag
- `EFFEKT_EXEMPEL_APPLICATION.md` - Komplett exempel på förbättrad Effekt-sektion
- `EFFEKT_AGGREGATION_ANALYSIS.md` - Analys av hur effekter kan aggregeras från subprocesser

#### Riktlinjer för "User stories"

**⚠️ KRITISK REGEL - TYDLIG SEPARATION MELLAN FUNKTIONELLA OCH TEKNISKA KRAV:**
User stories ska innehålla **funktionella acceptanskriterier** (vad användaren ser/gör, UI/UX, användarupplevelse). Acceptanskriterier-sektionen ska innehålla **tekniska krav** (timeout, retry, error codes, logging, skalbarhet, säkerhet). Detta ger tydlig separation mellan användarfunktionalitet och tekniska detaljer.

**Viktiga krav:**
1. **Använd standardformat:** "Som [roll] vill jag [mål] så att [värde]"
2. **Var realistisk:** User stories ska vara relevanta och uppnåbara för feature goalet
3. **Fokusera på användarens perspektiv:** Beskriv vad användaren vill uppnå, inte vad systemet gör
4. **Koppla till feature goalet:** User stories ska vara direkt relaterade till feature goalets funktionalitet
5. **Organisera i kategorier:** För komplexa feature goals, organisera user stories i kategorier (t.ex. "Kundperspektiv", "Handläggarperspektiv", "Systemperspektiv", "Ytterligare kundscenarier")
6. **Inkludera flera user stories:** För komplexa feature goals kan det vara relevant att inkludera 10-30+ user stories för att täcka olika roller, scenarier och ansökningstyper
7. **Var specifik:** Nämn specifika processsteg, call activities, gateways, error events, och mekanismer från BPMN-processen
8. **Inkludera funktionella acceptanskriterier:** För viktiga user stories, lägg till funktionella acceptanskriterier (vad användaren ser/gör, UI/UX, användarupplevelse) direkt i user story:n (i kursiv stil) för att göra dem implementeringsklara
9. **Fokusera på användarupplevelse:** Acceptanskriterier i User stories ska fokusera på vad användaren ser, hur användaren interagerar, UI/UX-krav, och användarupplevelse - INTE tekniska detaljer (timeout, retry, error codes)
10. **Var koncis:** Håll user stories och deras acceptanskriterier koncisa - fokusera på viktigaste funktionella kraven

**Strukturering:**
- För enkla feature goals: En lista med user stories
- För komplexa feature goals: Organisera i kategorier med underrubriker (t.ex. `<h3>Kundperspektiv</h3>`, `<h3>Handläggarperspektiv</h3>`)

**Exempel på bra user story (koncis och lättläst):**
- ✅ "Som kund vill jag att systemet automatiskt hämtar min befintliga information (part, engagemang, kreditinformation) så att jag inte behöver fylla i information som banken redan har om mig, särskilt viktigt för återkommande kunder."
- ✅ "Som kund vill jag att systemet automatiskt gör pre-screening för mig och mina medlåntagare så att jag får tidig feedback om någon av oss inte uppfyller grundläggande krav (ålder, anställningsstatus, kreditvärdighet)."
- ✅ "Som handläggare vill jag att systemet automatiskt gör pre-screening för alla parter så att ansökningar där parter inte uppfyller grundläggande krav avvisas automatiskt innan de når mig."
- ✅ "Som kund vill jag kunna fylla i information om hushållsekonomi och stakeholders-information parallellt så att jag kan slutföra ansökan snabbare än om jag måste göra det sekventiellt."

**Exempel på dålig user story (för lång, innehåller tekniska krav):**
- ❌ "Som kund vill jag att systemet automatiskt hämtar min befintliga information via 'Internal data gathering' (part, engagemang, kreditinformation) så att jag inte behöver fylla i information som banken redan har om mig, särskilt viktigt för återkommande kunder. <em>Acceptanskriterier: Systemet ska visa hämtad information i ett tydligt format, markera fält som är auto-ifyllda, och tillåta mig att ändra information om den är felaktig. UI ska visa tydlig progress-indikator för datainsamling och tydligt visa vilka parter som har hämtats med statusindikatorer. Timeout: 30 dagar. Retry: 3 försök. [BPMN-referens: 'Internal data gathering' call activity körs som multi-instance för varje identifierad part]</em>" (för lång, innehåller tekniska krav som ska finnas i Tekniska krav-sektionen)

**Exempel på dålig user story:**
- ❌ "Som kund vill jag att systemet hämtar information så att det fungerar" (för vagt, nämner inte specifika processsteg)
- ❌ "Som system vill jag utvärdera ansökan så att processen fungerar" (fokuserar på system, inte användare)
- ❌ "Som användare vill jag att allt fungerar så att det är bra" (för vagt, ingen konkret värde, nämner inte processsteg)

**Exempel på strukturerad user stories-sektion:**
```html
<section class="doc-section">
  <h2>User stories</h2>
  <p class="muted">Relevanta och realistiska user stories som kan kopplas till feature goalet.</p>
  
  <h3>Kundperspektiv</h3>
  <ul>
    <li><strong>Som kund</strong> vill jag [mål] <strong>så att</strong> [värde]</li>
    <!-- Fler user stories -->
  </ul>

  <h3>Handläggarperspektiv</h3>
  <ul>
    <li><strong>Som handläggare</strong> vill jag [mål] <strong>så att</strong> [värde]</li>
    <!-- Fler user stories -->
  </ul>
</section>
```

#### Riktlinjer för "Tekniska krav"

**⚠️ KRITISK REGEL - FOKUS PÅ TEKNISKA KRAV:**
Tekniska krav-sektionen ska innehålla **endast tekniska krav** (timeout, retry, error codes, logging, skalbarhet, säkerhet). **Funktionella acceptanskriterier** (vad användaren ser/gör, UI/UX, användarupplevelse) ska finnas i User stories-sektionen. Detta ger tydlig separation mellan användarfunktionalitet och tekniska detaljer.

**Viktiga krav:**
1. **Fokusera på tekniska krav:** Tekniska krav-sektionen ska innehålla endast tekniska krav:
   - **Timeout-värden:** User tasks, service tasks, business rule tasks
   - **Retry-logik:** Automatisk retry med exponential backoff
   - **Error codes:** Specifika error codes för olika feltyper
   - **Logging:** Vad som ska loggas, när, och hur
   - **Skalbarhet och prestanda:** Parallellisering, load balancing, caching
   - **Säkerhet och compliance:** Dataskydd, GDPR-efterlevnad, audit trails
2. **Undvik funktionella detaljer:** Funktionella acceptanskriterier (vad användaren ser, UI/UX, användarupplevelse) ska finnas i User stories-sektionen, inte här
3. **Var specifik och testbar:** Tekniska krav ska vara konkreta och möjliga att verifiera
4. **Använd "ska"-formuleringar:** Formulera som krav (t.ex. "Systemet ska...")
5. **Organisera i kategorier:** Organisera tekniska krav i kategorier (t.ex. "Tekniska krav", "Skalbarhet och prestanda", "Säkerhet och compliance")
6. **Var koncis:** Gör varje punkt mer koncis - fokusera på viktigaste tekniska kraven

**Strukturering:**
- För enkla feature goals: En lista med tekniska krav
- För komplexa feature goals: Organisera i kategorier med underrubriker (t.ex. `<h3>Tekniska krav</h3>`, `<h3>Skalbarhet och prestanda</h3>`, `<h3>Säkerhet och compliance</h3>`)

**Exempel på bra tekniskt krav:**
- ✅ "User tasks ska ha timeout på 30 dagar för kundaktiviteter. Service tasks och business rule tasks ska ha timeout på 60 sekunder"
- ✅ "Service tasks och business rule tasks ska ha automatisk retry med exponential backoff (max 3 försök) vid tekniska fel"
- ✅ "Systemet ska returnera specifika error codes: APPLICATION_PRE_SCREEN_REJECTED, APPLICATION_STAKEHOLDER_REJECTED, APPLICATION_OBJECT_REJECTED, APPLICATION_REJECTED, APPLICATION_TIMEOUT"
- ✅ "Alla ansökningssteg, multi-instance bearbetningar och fel ska loggas med ansöknings-ID, tidsstämplar och resultat för spårbarhet"
- ✅ "Multi-instance subprocesses ska kunna köras parallellt för att förbättra prestanda"
- ✅ "All känslig ansökningsinformation ska krypteras i vila och under överföring (TLS 1.3). Åtkomst till ansökningsdata ska loggas för audit trail"

**Målgrupper som läser detta kapitel:**
- **Utvecklare** - Konkreta tekniska krav, timeout-värden, retry-logik, error codes, logging
- **Arkitekt** - Tekniska beslut, skalbarhet, säkerhet
- **DevOps** - Infrastructure requirements, monitoring, deployment
- **Compliance** - Säkerhet, GDPR-efterlevnad, audit trails

**Exempel på dåligt tekniskt krav:**
- ❌ "Systemet ska fungera bra" (för vagt, inte testbart)
- ❌ "Systemet ska vara säkert" (för vagt, saknar konkreta krav)
- ❌ "UI ska visa tydlig progress-indikator" (funktionellt acceptanskriterium, ska finnas i User stories)
- ❌ "Kunden ska kunna se hämtad information" (funktionellt acceptanskriterium, ska finnas i User stories)

### Steg 6: Verifiera i appen (valfritt - automatiskt)

**Detta är valfritt - du kan hoppa över detta steg om du vill.**

1. Starta appen: `npm run dev`
2. Navigera till Feature Goal i appen
3. Välj **"v2"** template version (om inte redan valt)
4. Appen visar automatiskt från `public/local-content/` om filen finns
5. Badge "📄 Lokal version – Förbättrat innehåll" visas automatiskt längst upp

### Steg 8: Markera filen som förbättrad i status-listan

**Viktigt:** Efter att du är klar med förbättringarna, markera filen som förbättrad i status-listan.

1. **Öppna status-filen**: `docs/feature-goals/FEATURE_GOAL_STATUS.md`

2. **Hitta filen** i listan under "✅ Matchade Feature Goals"

3. **Markera checkboxen** med `[x]`:
   ```markdown
   - [x] `mortgage-se-appeal-v2.html` ✨ Förbättrad
   ```

**💡 Framtida förbättring:** Detta kan automatiseras baserat på git commits eller filändringar, men för nu är det manuellt.

**Detta hjälper dig att hålla koll på vilka filer som är klara och vilka som återstår.**

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

Se riktlinjer för "Testgenerering" ovan för detaljerade instruktioner.

#### Riktlinjer för "Testscenarier"

**⚠️ KRITISK REGEL - SAMMA PRINCIP SOM USER STORIES OCH ACCEPTANSKRITERIER:**
Test-scenarier ska följa samma princip som user stories och acceptanskriterier: **Börja med funktionalitet och användarupplevelse, lägg BPMN-referenser som teknisk kontext i slutet.**

**Viktiga krav:**
1. **Börja med funktionalitet:** Beskriv vad användaren gör, vad användaren ser, hur användaren interagerar - INTE BPMN-mekanik
2. **Fokusera på användarupplevelse:** Beskriv UI/UX, visuella indikatorer, feedback, felmeddelanden
3. **Lägg till funktionella detaljer:** Verifiera UI/UX, validering, feedback, felmeddelanden, progress-indikatorer, statusindikatorer
4. **Lägg BPMN-referenser i slutet:** BPMN-ID:n, call activities, gateways, events ska vara teknisk kontext, inte huvudfokus
5. **Given-When-Then struktur:** Varje scenario ska ha tydlig Given-When-Then struktur
6. **Koppla till user stories och acceptanskriterier:** Verifiera att user stories och acceptanskriterier uppfylls
7. **Specifika assertions:** Verifiera funktionella detaljer, inte bara BPMN-mekanik
8. **Testdata-referenser:** Inkludera testdata-profiler (t.ex. customer-standard, customer-rejected)

**Kritiska regler för att undvika BPMN-syntax:**
- ❌ **Undvik att börja med BPMN-referenser:** "Processen körs genom alla steg: pre-screening → objekt → hushåll/stakeholders..."
- ✅ **Börja med funktionalitet:** "Kunden fyller i ansökningsformulär. Systemet hämtar automatiskt befintlig kunddata och visar den för kunden..."
- ❌ **Undvik BPMN-syntax i början:** "Pre-screen Party DMN utvärderas. DMN returnerar REJECTED. Boundary event triggas..."
- ✅ **Fokusera på användarupplevelse:** "Systemet hämtar kunddata och gör pre-screening automatiskt. Pre-screening avvisar ansökan eftersom kunden inte uppfyller grundläggande krav. Kunden ser ett tydligt felmeddelande..."
- ❌ **Undvik att verifiera bara BPMN-mekanik:** "Alla DMN-beslut returnerar APPROVED. Processen avslutas normalt (Event_0j4buhs)."
- ✅ **Verifiera funktionella detaljer:** "Kunden ser hämtad information med visuell markering av auto-ifyllda fält. Kunden kan ändra information om den är felaktig. UI visar tydlig progress-indikator..."

**Given-When-Then struktur:**
```
**Given:** [Förutsättningar och initialt tillstånd]
- Vad måste vara sant innan testet startar?
- Vilka testdata behövs? (t.ex. customer-standard, application-purchase)
- Vilket systemtillstånd? (t.ex. "ansökan är i bekräftelsesteget")

**When:** [Handlingar och händelser]
- Vad gör användaren? (kortfattat, fokusera på kärnan)
- Vad gör systemet? (kortfattat, fokusera på kärnan)
- Vilka steg i processen? (inkludera alla viktiga steg - inte bara några)
- Fokusera på funktionalitet och användarupplevelse, inte BPMN-mekanik

**Then:** [Förväntade resultat]
- Vad ser användaren? (kortfattat)
- Vilka verifieringar? (funktionella detaljer, UI/UX, feedback)
- Strukturera med korta meningar för bättre läsbarhet
- Vilka tekniska detaljer? (event-ID:n, gateway-ID:n där relevant, i slutet)

**BPMN-referens:** [Teknisk kontext i slutet]
- BPMN-ID:n, call activities, gateways, events som teknisk referens
```

**Viktiga regler för struktur:**
- **"When"-sektioner:** Inkludera alla viktiga steg - inte bara några. Beskriv vad användaren gör OCH vad systemet gör automatiskt.
- **"Then"-sektioner:** Strukturera med korta meningar för bättre läsbarhet. Varje verifiering ska vara tydlig och lätt att skanna.

**Kritiska scenarier som ofta saknas (kontrollera att dessa finns):**
- ✅ KALP-beräkning och screening (när bekräftelse hoppas över)
- ✅ Application rejected (KALP under tröskelvärde eller under ansökt belopp)
- ✅ Timeout på user tasks
- ✅ Skip step gateway (om processen har sådan)
- ✅ Olika ansökningstyper (om processen hanterar olika typer)
- ✅ Multi-instance edge cases (flera instanser med olika kombinationer)
- ✅ Error handling för alla error events
- ✅ Parallellitet (om processen har parallella flöden)

**Exempel på komplett testscenario (börjar med funktionalitet, BPMN-referens i slutet):**

```html
<section class="doc-section">
  <h2>Testgenerering</h2>
  
  <h3>Testscenarier</h3>
  <table>
    <tbody>
      <tr>
        <td><strong>S1</strong></td>
        <td>Normalflöde – komplett ansökan med en person</td>
        <td>Happy</td>
        <td>customer</td>
        <td>P0</td>
        <td>functional</td>
        <td><strong>Given:</strong> En person ansöker om bolån för köp. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening). Fastigheten uppfyller bankens krav (godkänd vid bedömning). Testdata: customer-standard. <strong>When:</strong> Kunden fyller i ansökningsformulär med grundläggande information. Systemet hämtar automatiskt befintlig kunddata och visar den för kunden. Kunden fyller i hushållsekonomi och stakeholder-information parallellt. Systemet beräknar automatiskt maximalt lånebelopp (KALP). Kunden ser en sammanfattning av all information och bekräftar ansökan. Systemet hämtar kreditinformation automatiskt. <strong>Then:</strong> Kunden ser hämtad information med visuell markering av auto-ifyllda fält (grön bockmarkering eller ikon). Kunden kan ändra information om den är felaktig via tydlig 'Redigera'-knapp per fält. UI visar tydlig progress-indikator för datainsamling (progress bar eller spinner). Kunden kan öppna både Household- och Stakeholders-formulären samtidigt i separata flikar/fönster. Kunden ser en sammanfattning med tydliga rubriker (Intern data, Hushållsekonomi, Stakeholders, Objekt). Kunden bekräftar ansökan via tydlig 'Bekräfta'-knapp. Kreditinformation är hämtad för alla stakeholders. Processen avslutas normalt och ansökan är klar för kreditevaluering. <strong>BPMN-referens:</strong> Pre-screening → objekt → hushåll/stakeholders → KALP-beräkning → bekräftelse → kreditupplysning. Alla DMN-beslut returnerar APPROVED. KALP-beräkning är högre än ansökt belopp. Processen avslutas normalt (Event_0j4buhs).</td>
        <td>✅ Planerad</td>
      </tr>
    </tbody>
  </table>
  
  <!-- UI Flow, testdata-referenser, implementation mapping -->
</section>
```

**Se `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` och `docs/feature-goals/TEST_SCENARIOS_IMPROVEMENT_ANALYSIS.md` för detaljerad analys av vad som saknas i testscenarier.**

## 🚀 Systematiskt arbete genom alla filer

**Arbeta systematiskt igenom alla filer i status-listan, en i taget.**

### Arbetsflöde för varje fil

För **varje fil** i status-listan, följ Steg 0-8 ovan:

1. **Steg 0**: Automatisk identifiering och uppdatering (kör scripts - görs en gång för alla filer)
2. **Steg 1-3**: Fullständig BPMN-analys och identifiering av förbättringar
3. **Steg 4-5**: Förberedelse och redigering av HTML-innehåll (endast manuellt steg)
4. **Steg 6**: Verifiering i appen (valfritt)
5. **Steg 8**: Markera filen som förbättrad i status-listan

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

- `docs/feature-goals/QUICK_START.md` - **Snabb påminnelse-guide** (använd denna om du glömt processen!)
- `docs/feature-goals/AUTO_IMPROVEMENT_EXECUTION_PLAN.md` - **Auto-improvement execution plan** (hur jag automatiskt förbättrar innehållet)
- `docs/feature-goals/html-workflow-status.md` - Teknisk status
- `docs/feature-goals/json-export-import-implementation-plan.md` - JSON-pipeline plan
- `docs/feature-goals/test-generation-section-design.md` - Testgenerering design
- `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` - Checklista för testscenarier
- `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/feature-goal-sync-report.md` - Sync-rapport (genereras av scriptet)

## 📖 Förbättra läsbarhet för långa dokument

Alla Feature Goal-dokument har nu automatisk läsbarhetsförbättring via `scripts/improve-feature-goal-readability.ts`:

- **Collapsible sections** - Alla sektioner är collapsible/expandable för bättre navigering
- **"Beskrivning av FGoal" öppen som standard** - Den första sektionen är alltid öppen när dokumentet öppnas
- **Alla andra sektioner stängda som standard** - Minskar scrollning och ger bättre översikt
- **Standalone-kompatibelt** - Dokumenten fungerar perfekt som standalone-filer (kan skickas via e-post, öppnas direkt i webbläsare)
- **Förbättrad visuell hierarki** - Tydligare spacing, typografi och visuell feedback

**Viktigt:** 
- **Confluence-sektionen är borttagen** - Denna sektion finns inte längre i dokumenten
- **Ingen sidebar-menyn** - Dokumenten använder collapsible sections istället för sidebar-navigation
- Scriptet körs automatiskt när dokumenten uppdateras, men kan köras manuellt: `npx tsx scripts/improve-feature-goal-readability.ts`

