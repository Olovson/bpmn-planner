# Prompt: Förbättra Testscenarion för Feature Goal

## Syfte
Systematiskt förbättra testscenarion i en feature goal HTML-fil genom att:
1. **Analysera** befintliga testscenarion mot BPMN-processen
2. **Identifiera** saknade, onödiga eller irrelevanta scenarion
3. **Förbättra** befintliga scenarion (kortare, lättläsbara, strukturerade)
4. **Lägga till** nya scenarion där det behövs
5. **Ta bort** scenarion som inte är relevanta

---

## Steg 1: Analysera BPMN-processen

### 1.1 Läs BPMN-filen
- Identifiera BPMN-filen från HTML-filens metadata eller `bpmn-map.json`
- Läs BPMN-filen för att förstå hela processflödet

### 1.2 Identifiera kritiska element
Dokumentera följande från BPMN:
- **Start events**: Hur processen startar
- **User tasks**: Kund- eller handläggarinteraktioner
- **Service tasks**: Systemanrop och externa tjänster
- **Business rule tasks (DMN)**: Beslutslogik och affärsregler
- **Gateways**: Beslutspunkter (exclusive, parallel, inclusive, event-based)
  - Vilka villkor finns?
  - Vilka flöden finns?
- **Call activities**: Anrop till subprocesser
- **Boundary events**: Error events, timer events, escalation events
  - Vilka fel kan inträffa?
  - Vilka timeouts finns?
- **End events**: Hur processen avslutas (normal, error, timeout)
- **Multi-instance loops**: Parallella eller sekventiella loopar
- **Data stores**: Vilka data sparas/läses?

### 1.3 Identifiera flöden
- **Happy path**: Normalflöde från start till normal end event
- **Error paths**: Alla felvägar (boundary events → error end events)
- **Timeout paths**: Timer events → timeout end events
- **Alternative paths**: Gateway-beslut som leder till olika flöden
- **Parallel paths**: Parallella flöden som måste sammanföras

---

## Steg 2: Analysera Befintliga Testscenarion

### 2.1 Läs befintliga testscenarion
- Läs alla testscenarion i HTML-filen
- Förstå vad varje scenario täcker

### 2.2 Validera mot BPMN
För varje befintligt scenario, kontrollera:
- ✅ **Täcker scenario rätt flöde?** (happy path, error path, timeout path, alternative path)
- ✅ **Är alla kritiska steg med?** (gateways, DMN-beslut, boundary events)
- ✅ **Är scenario relevant?** (tester verkligen något viktigt?)
- ✅ **Saknas viktiga detaljer?** (testdata-referenser, tekniska ID:n, timeout-värden)

### 2.3 Identifiera brister
Dokumentera:
- **Saknade scenarion**: Vilka flöden/beslut/fel saknas?
- **Onödiga scenarion**: Vilka scenarion är duplicerade eller irrelevanta?
- **Ofullständiga scenarion**: Vilka scenarion saknar viktiga detaljer?

---

## Steg 3: Identifiera Saknade Testscenarion

### 3.1 Happy path-variationer
- Olika typer av input (t.ex. olika ansökningstyper)
- Olika antal deltagare (t.ex. en person vs flera personer)
- Olika gateway-beslut (t.ex. skip vs inte skip)

### 3.2 Error scenarios
För varje boundary event i BPMN:
- **Error event**: Vad händer när detta fel inträffar?
- **Timer event**: Vad händer när timeout triggas?
- **Escalation event**: Vad händer när eskalering triggas?

### 3.3 Gateway-beslut
För varje gateway:
- **Exclusive gateway**: Ett scenario per utgående flöde
- **Parallel gateway**: Scenario för parallella flöden
- **Inclusive gateway**: Scenario för alla kombinationer av aktiva flöden
- **Event-based gateway**: Scenario per event-typ

### 3.4 Edge cases
- Multi-instance loops: Vad händer om en iteration misslyckas?
- Parallella flöden: Vad händer om ett flöde misslyckas?
- Data stores: Vad händer om data saknas eller är felaktig?
- Externa tjänster: Vad händer om extern tjänst svarar inte?

### 3.5 Olika ansökningstyper/kontexter
- Om processen hanterar olika typer (t.ex. köp vs flytt/omlåning)
- Om processen anropas från olika kontexter (t.ex. olika parent processes)

---

## Steg 4: Identifiera Onödiga Testscenarion

### 4.1 Duplicerade scenarion
- Är två scenarion i princip samma sak?
- Kan de kombineras till ett scenario?

### 4.2 Irrelevanta scenarion
- Tester scenario något som inte finns i BPMN-processen?
- Är scenario för specifikt och inte användbart för test lead?

### 4.3 För generiska scenarion
- Är scenario så generiskt att det inte ger värde?
- Kan det ersättas med ett mer specifikt scenario?

---

## Steg 5: Förbättra Befintliga Testscenarion

**⚠️ KRITISK REGEL - SAMMA PRINCIP SOM USER STORIES OCH ACCEPTANSKRITERIER:**
Test-scenarier ska följa samma princip som user stories och acceptanskriterier: **Börja med funktionalitet och användarupplevelse, lägg BPMN-referenser som teknisk kontext i slutet.**

### 5.1 Struktur: Given-When-Then
Varje scenario ska ha tydlig struktur:

```
**Given:** [Förutsättningar och initialt tillstånd]
- Vad måste vara sant innan testet startar?
- Vilka testdata behövs? (t.ex. customer-standard, application-purchase)
- Vilket systemtillstånd? (t.ex. "ansökan är i bekräftelsesteget")

**When:** [Handlingar och händelser]
- Vad gör användaren? (kortfattat, fokusera på kärnan)
- Vad gör systemet? (kortfattat, fokusera på kärnan)
- Vilka steg i processen? (inte alla detaljer, bara viktiga)

**Then:** [Förväntade resultat]
- Vad ser användaren? (kortfattat)
- Vilka verifieringar? (funktionella detaljer, UI/UX, feedback)
- Vilka tekniska detaljer? (event-ID:n, gateway-ID:n där relevant, i slutet)

**BPMN-referens:** [Teknisk kontext i slutet]
- BPMN-ID:n, call activities, gateways, events som teknisk referens
```

**Kritiska regler för att undvika BPMN-syntax:**
- ❌ **Undvik att börja med BPMN-referenser:** "Processen körs genom alla steg: pre-screening → objekt → hushåll/stakeholders..."
- ✅ **Börja med funktionalitet:** "Kunden fyller i ansökningsformulär. Systemet hämtar automatiskt befintlig kunddata och visar den för kunden..."
- ❌ **Undvik BPMN-syntax i början:** "Pre-screen Party DMN utvärderas. DMN returnerar REJECTED. Boundary event triggas..."
- ✅ **Fokusera på användarupplevelse:** "Systemet hämtar kunddata och gör pre-screening automatiskt. Pre-screening avvisar ansökan eftersom kunden inte uppfyller grundläggande krav. Kunden ser ett tydligt felmeddelande..."
- ❌ **Undvik att verifiera bara BPMN-mekanik:** "Alla DMN-beslut returnerar APPROVED. Processen avslutas normalt (Event_0j4buhs)."
- ✅ **Verifiera funktionella detaljer:** "Kunden ser hämtad information med visuell markering av auto-ifyllda fält. Kunden kan ändra information om den är felaktig. UI visar tydlig progress-indikator..."

### 5.2 Längd och läsbarhet
**Mål:** ~50-100 ord per scenario (inte ~500 ord)

**Regler:**
- ✅ **Kort och koncis**: Fokusera på kärnan i scenariot
- ✅ **Lätt att skanna**: Tydlig struktur gör det lätt att hitta information
- ✅ **Inga repetitioner**: Ta bort onödiga repetitioner
- ✅ **Funktionella detaljer**: Fokusera på användarupplevelse, UI/UX, feedback
- ✅ **BPMN-referenser i slutet**: Lägg BPMN-ID:n, call activities, gateways, events som teknisk kontext i slutet
- ✅ **Testdata-referenser**: Behåll (t.ex. customer-standard)
- ❌ **Inga långa beskrivningar**: Ta bort onödiga detaljer
- ❌ **Inga flera scenarion i ett**: Varje scenario ska fokusera på ett specifikt flöde
- ❌ **Inga BPMN-syntax i början**: Undvik att börja med BPMN-referenser

### 5.3 Tekniska detaljer
**Behåll (i slutet som teknisk kontext):**
- Event-ID:n (t.ex. Event_0j4buhs) där relevant
- Gateway-ID:n (t.ex. Gateway_0fhav15) där relevant
- Error codes (t.ex. errorCode="pre-screen-rejected") där relevant
- Timeout-värden (t.ex. "30 dagar (P30D)") där relevant
- **Men lägg dem i slutet som teknisk kontext, inte i början**

**Ta bort:**
- Onödiga tekniska detaljer som inte är relevanta för scenariot
- Repetitiva tekniska detaljer
- BPMN-syntax i början av scenariot

### 5.4 Testdata-referenser
- Behåll testdata-referenser (t.ex. `customer-standard`, `application-purchase`)
- Se till att de är relevanta för scenariot

### 5.5 Koppling till user stories och acceptanskriterier
- **Verifiera att user stories uppfylls:** Test-scenarier ska verifiera att user stories uppfylls
- **Verifiera att acceptanskriterier uppfylls:** Test-scenarier ska verifiera att acceptanskriterier uppfylls
- **Fokusera på funktionella detaljer:** Verifiera UI/UX, validering, feedback, felmeddelanden, progress-indikatorer, statusindikatorer

---

## Steg 6: Skapa Nya Testscenarion

### 6.1 För varje saknat scenario
Skapa ett nytt scenario enligt strukturen i Steg 5.1

### 6.2 Numrering
- Fortsätt numreringen från befintliga scenarion (t.ex. om S1-S5 finns, börja med S6)
- Eller omnumrera alla scenarion om det behövs

### 6.3 Metadata
För varje nytt scenario, ange:
- **ID**: S1, S2, S3, etc.
- **Namn**: Kort beskrivning (t.ex. "Normalflöde – komplett ansökan")
- **Typ**: Happy / Error / Edge
- **Persona**: customer / advisor / system / unknown
- **Risk Level**: P0 / P1 / P2
- **Assertion Type**: functional / regression / compliance / other
- **Outcome**: Kort beskrivning av förväntat resultat (1-2 meningar)
- **Status**: ✅ Planerad

---

## Steg 7: Ta Bort Onödiga Testscenarion

### 7.1 För varje onödigt scenario
- Ta bort scenariot från tabellen
- Omnumrera kvarvarande scenarion om det behövs

### 7.2 Uppdatera UI Flow
- Ta bort motsvarande UI Flow-sektion om den finns
- Uppdatera referenser i andra delar av dokumentet om det behövs

---

## Steg 8: Validera Slutresultat

### 8.1 Kompletthet
Kontrollera att alla följande är täckta:
- ✅ Happy path (minst ett scenario)
- ✅ Alla error paths (boundary events → error end events)
- ✅ Alla timeout paths (timer events → timeout end events)
- ✅ Alla viktiga gateway-beslut (minst ett scenario per utgående flöde)
- ✅ Edge cases (multi-instance loops, parallella flöden, externa tjänster)

### 8.2 Kvalitet
Kontrollera att alla scenarion:
- ✅ Har Given-When-Then struktur
- ✅ Börjar med funktionalitet och användarupplevelse (inte BPMN-mekanik)
- ✅ Fokuserar på användarupplevelse (UI/UX, visuella indikatorer, feedback)
- ✅ Verifierar funktionella detaljer (validering, feedback, felmeddelanden, progress-indikatorer)
- ✅ Lägger BPMN-referenser som teknisk kontext i slutet
- ✅ Kopplar till user stories och acceptanskriterier
- ✅ Är kortfattade (~50-100 ord)
- ✅ Är lättläsbara och lätta att skanna
- ✅ Innehåller testdata-referenser
- ✅ Är relevanta och användbara för test lead

### 8.3 Konsistens
Kontrollera att:
- ✅ Alla scenarion följer samma struktur
- ✅ Metadata är konsekvent (Typ, Persona, Risk Level, etc.)
- ✅ Numrering är konsekvent (S1, S2, S3, etc.)

---

## Exempel: Förbättrat Scenario

### Före (för långt och svårläst):
```
**Given:** En person ansöker om bolån för köp. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening). Fastigheten uppfyller bankens krav (godkänd vid bedömning). Hushållsekonomi och personlig information är insamlad. Testdata: customer-standard, application-purchase, property-approved. **When:** Application anropas från Mortgage huvudprocessen. Internal data gathering körs (multi-instance per part), Pre-screen Party DMN returnerar APPROVED. Object call activity körs, Evaluate Fastighet DMN returnerar APPROVED. Parallella flöden: Household och Per household subprocess (Household → Stakeholder → Object). Gateway skip-confirm-application = No. KALP service task (Activity_0p3rqyp) beräknar maximalt belopp. Screen KALP DMN (Activity_1mezc6h) returnerar APPROVED. Gateway_0fhav15 (KALP OK) = Yes. Confirm application user task aktiveras. Kunden bekräftar ansökan. Gateway_1nszp2i samlar flöden. Fetch credit information körs (multi-instance per stakeholder). **Then:** Pre-screen Party DMN returnerar APPROVED. Evaluate Fastighet DMN returnerar APPROVED. KALP-beräkning är slutförd och lagrad i KALP datastore. Screen KALP DMN returnerar APPROVED. Gateway_0fhav15 (KALP OK) = Yes. Kunden kan bekräfta ansökan. Kreditinformation är hämtad för alla stakeholders. Kreditinformation är sparad i "Personal credit information source" datastore. Processen avslutas med Event_0j4buhs (normal end event). Ansökan är i tillstånd "klar för kreditevaluering".
```

### Efter (kort och lättläst, börjar med funktionalitet):
```
**Given:** En person ansöker om bolån för köp. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening). Fastigheten uppfyller bankens krav (godkänd vid bedömning). Testdata: customer-standard.

**When:** 
- Kunden fyller i ansökningsformulär med grundläggande information
- Systemet hämtar automatiskt befintlig kunddata och visar den för kunden
- Kunden fyller i hushållsekonomi och stakeholder-information parallellt
- Systemet beräknar automatiskt maximalt lånebelopp (KALP)
- Kunden ser en sammanfattning av all information och bekräftar ansökan
- Systemet hämtar kreditinformation automatiskt

**Then:**
- Kunden ser hämtad information med visuell markering av auto-ifyllda fält (grön bockmarkering eller ikon)
- Kunden kan ändra information om den är felaktig via tydlig 'Redigera'-knapp per fält
- UI visar tydlig progress-indikator för datainsamling (progress bar eller spinner)
- Kunden kan öppna både Household- och Stakeholders-formulären samtidigt i separata flikar/fönster
- Kunden ser en sammanfattning med tydliga rubriker (Intern data, Hushållsekonomi, Stakeholders, Objekt)
- Kunden bekräftar ansökan via tydlig 'Bekräfta'-knapp
- Kreditinformation är hämtad för alla stakeholders
- Processen avslutas normalt och ansökan är klar för kreditevaluering

**BPMN-referens:** Pre-screening → objekt → hushåll/stakeholders → KALP-beräkning → bekräftelse → kreditupplysning. Alla DMN-beslut returnerar APPROVED. KALP-beräkning är högre än ansökt belopp. Processen avslutas normalt (Event_0j4buhs).
```

---

## Checklista innan du är klar

- [ ] BPMN-processen är analyserad (start events, gateways, boundary events, end events, etc.)
- [ ] Befintliga testscenarion är analyserade mot BPMN
- [ ] Saknade scenarion är identifierade och dokumenterade
- [ ] Onödiga scenarion är identifierade och dokumenterade
- [ ] Befintliga scenarion är förbättrade (kortare, lättläsbara, Given-When-Then)
- [ ] Nya scenarion är skapade för saknade flöden/beslut/fel
- [ ] Onödiga scenarion är borttagna
- [ ] Alla scenarion är validerade (kompletthet, kvalitet, konsistens)
- [ ] HTML-filen är uppdaterad med alla ändringar
- [ ] Inga linter-fel introducerade

---

## Användning

När du får en fil att förbättra:

1. **Läs denna prompt** för att förstå processen
2. **Följ stegen systematiskt** (Steg 1-8)
3. **Dokumentera dina beslut** (varför lägger du till/ta bort scenarion?)
4. **Uppdatera HTML-filen** med alla ändringar
5. **Validera slutresultatet** mot checklistan

**Viktigt:** 
- Kvalitet är viktigare än kvantitet
- Kortare och lättläsbara scenarion är bättre än långa och svårläsbara
- Fokusera på kärnan i varje scenario
- Varje scenario ska testa något specifikt och viktigt

