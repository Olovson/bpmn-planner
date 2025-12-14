# Analys: Test-scenarier efter förbättring av User Stories och Acceptanskriterier

## Syfte
Analysera test-scenarierna i `mortgage-application-v2.html` i relation till de förbättrade user stories och acceptanskriterierna för att identifiera förbättringsområden.

---

## 1. Övergripande bedömning

### ✅ Styrkor
- **Given-When-Then struktur:** Test-scenarierna har redan Given-When-Then struktur
- **Omfattande täckning:** 15 scenarion som täcker happy path, error cases, edge cases
- **Metadata:** Tydlig metadata (ID, Namn, Typ, Persona, Risk Level, Assertion Type, Outcome, Status)
- **Testdata-referenser:** Inkluderar testdata-referenser (t.ex. customer-standard, customer-rejected)

### ⚠️ Problem
- **BPMN-centrerade istället för funktionella:** Beskriver BPMN-flöde istället för funktionalitet
- **Saknar användarupplevelse:** Fokus på BPMN-mekanik, inte vad användaren ser/upplever
- **Saknar funktionella detaljer:** UI/UX, validering, feedback, felmeddelanden är ofullständiga
- **Inkonsistent med user stories:** User stories har förbättrats men test-scenarierna har inte följt med
- **Saknar koppling till acceptanskriterier:** Test-scenarierna refererar inte till acceptanskriterierna

---

## 2. Detaljerad analys

### 2.1 Problem: BPMN-centrerad istället för funktionell

**Exempel från S1 (Happy path):**
```
❌ "Processen körs genom alla steg: pre-screening → objekt → 
   hushåll/stakeholders → KALP-beräkning → bekräftelse → kreditupplysning"
```

**Problem:**
- Beskriver BPMN-flöde (pre-screening → objekt → ...)
- Fokus på BPMN-mekanik, inte funktionalitet
- Saknar användarupplevelse (vad ser kunden? hur interagerar kunden?)
- Saknar funktionella detaljer (hur fyller kunden i formulär? vad ser kunden?)

**Bör vara:**
```
✅ "Kunden fyller i ansökningsformulär med grundläggande information. 
   Systemet hämtar automatiskt befintlig kunddata och visar den för kunden 
   med visuell markering av auto-ifyllda fält. Kunden kan ändra information 
   om den är felaktig. Kunden fyller i hushållsekonomi och stakeholder-information 
   parallellt i separata formulär. Kunden ser en sammanfattning av all information 
   och bekräftar ansökan. Systemet hämtar kreditinformation automatiskt."
```

### 2.2 Problem: Saknar användarupplevelse

**Exempel från S3 (Pre-screen rejected):**
```
❌ "Pre-screen Party DMN utvärderas. DMN returnerar REJECTED. Boundary event 
   Event_03349px triggas. Error_1vtortg (pre-screen-rejected) signaleras."
```

**Problem:**
- Fokus på BPMN-mekanik (DMN utvärderas, boundary event triggas)
- Saknar användarupplevelse (vad ser kunden? hur visas felmeddelandet?)
- Saknar funktionella detaljer (hur ser felmeddelandet ut? vad kan kunden göra?)

**Bör vara:**
```
✅ "Systemet hämtar kunddata och gör pre-screening automatiskt. Pre-screening 
   avvisar ansökan eftersom kunden inte uppfyller grundläggande krav (t.ex. 
   ålder < 18 år eller kreditscore < 300). Kunden ser ett tydligt felmeddelande 
   som förklarar vilket krav som inte uppfylldes, vilken part som avvisades, 
   och att ansökan inte kan fortsätta. Meddelandet visas i en tydlig varningsruta 
   med ikon, tydlig rubrik ('Ansökan avvisad'), och strukturerad information 
   med bullet points. [BPMN-referens: Pre-screen Party DMN returnerar REJECTED, 
   boundary event Event_03349px triggas, Error_1vtortg signaleras]"
```

### 2.3 Problem: Saknar funktionella detaljer

**Exempel från S5 (Skip step):**
```
❌ "Gateway skip-confirm-application = Yes. KALP beräknas och screenas."
```

**Problem:**
- Fokus på BPMN-mekanik (gateway, KALP beräknas)
- Saknar funktionella detaljer (vad ser kunden? hur visas KALP-resultatet?)
- Saknar användarupplevelse (får kunden information om KALP? kan kunden se beräkningen?)

**Bör vara:**
```
✅ "Systemet bedömer automatiskt att bekräftelsesteget kan hoppas över för 
   återkommande kund med god kredithistorik. Systemet beräknar automatiskt 
   maximalt lånebelopp (KALP) och visar resultatet för kunden (om relevant). 
   Kunden behöver inte bekräfta ansökan manuellt. Processen fortsätter automatiskt 
   till kreditupplysning. [BPMN-referens: Gateway skip-confirm-application = Yes, 
   KALP service task beräknar maximalt belopp, Screen KALP DMN utvärderar resultatet]"
```

### 2.4 Problem: Inkonsistent med user stories

**User stories (efter förbättring):**
```
✅ "Som kund vill jag att systemet automatiskt hämtar min befintliga information 
   så att jag inte behöver fylla i information som banken redan har om mig."
   
   Acceptanskriterier: Systemet ska visa hämtad information i ett tydligt format, 
   markera fält som är auto-ifyllda med visuell indikator, och tillåta mig att 
   ändra information om den är felaktig. UI ska visa tydlig progress-indikator 
   för datainsamling.
```

**Test-scenarier (nuvarande):**
```
❌ "Internal data gathering körs (multi-instance per part), Pre-screen Party 
   DMN returnerar APPROVED."
```

**Problem:**
- Test-scenarierna beskriver BPMN-mekanik, inte funktionalitet från user stories
- Saknar koppling till acceptanskriterierna (visuell indikator, progress-indikator, etc.)
- Inkonsistent fokus (BPMN vs funktionalitet)

### 2.5 Problem: Saknar koppling till acceptanskriterier

**Acceptanskriterier (efter förbättring):**
```
✅ "Systemet ska automatiskt hämta och visa befintlig kunddata (part, engagemang, 
   kreditinformation) för alla identifierade parter. Kunden ska se hämtad information 
   i ett tydligt format med visuell markering av auto-ifyllda fält (t.ex. grön 
   bockmarkering eller ikon), och kunna ändra information om den är felaktig via 
   tydlig 'Redigera'-knapp per fält. UI ska visa tydlig progress-indikator för 
   datainsamling (t.ex. progress bar eller spinner) och tydligt visa vilka parter 
   som har hämtats med statusindikatorer."
```

**Test-scenarier (nuvarande):**
```
❌ "Internal data gathering körs (multi-instance per part), Pre-screen Party 
   DMN returnerar APPROVED."
```

**Problem:**
- Test-scenarierna verifierar inte acceptanskriterierna (visuell markering, progress-indikator, etc.)
- Saknar assertions för funktionella detaljer från acceptanskriterierna
- Fokus på BPMN-mekanik, inte funktionalitet

---

## 3. Jämförelse med förbättrade User Stories och Acceptanskriterier

### 3.1 User Stories (efter förbättring)

**Struktur:**
- ✅ Börjar med funktionalitet (vad användaren ser, vad systemet gör)
- ✅ Fokus på användarupplevelse (UI, visuella indikatorer, feedback)
- ✅ BPMN-referenser som teknisk kontext i slutet
- ✅ Funktionella detaljer (validering, feedback, felmeddelanden)

**Exempel:**
```
✅ "Som kund vill jag att systemet automatiskt hämtar min befintliga information 
   så att jag inte behöver fylla i information som banken redan har om mig.
   
   Acceptanskriterier: Systemet ska visa hämtad information i ett tydligt format, 
   markera fält som är auto-ifyllda med visuell indikator, och tillåta mig att 
   ändra information om den är felaktig. UI ska visa tydlig progress-indikator 
   för datainsamling. [BPMN-referens: 'Internal data gathering' call activity]"
```

### 3.2 Acceptanskriterier (efter förbättring)

**Struktur:**
- ✅ Börjar med funktionalitet (vad systemet gör, vad användaren ser)
- ✅ Fokus på användarupplevelse (UI/UX, visuella indikatorer, feedback)
- ✅ BPMN-referenser som teknisk kontext i slutet
- ✅ Funktionella detaljer (validering, feedback, felmeddelanden)

**Exempel:**
```
✅ "Systemet ska automatiskt hämta och visa befintlig kunddata för alla identifierade 
   parter. Kunden ska se hämtad information i ett tydligt format med visuell markering 
   av auto-ifyllda fält, och kunna ändra information om den är felaktig. UI ska visa 
   tydlig progress-indikator för datainsamling. [BPMN-referens: 'Internal data gathering' 
   call activity (internal-data-gathering) körs som multi-instance]"
```

### 3.3 Test-scenarier (nuvarande)

**Struktur:**
- ❌ Börjar med BPMN-referenser (pre-screening → objekt → ...)
- ❌ Fokus på BPMN-mekanik, inte funktionalitet
- ❌ Saknar användarupplevelse
- ❌ Saknar funktionella detaljer

**Exempel:**
```
❌ "Processen körs genom alla steg: pre-screening → objekt → hushåll/stakeholders 
   → KALP-beräkning → bekräftelse → kreditupplysning. Alla DMN-beslut returnerar 
   APPROVED. KALP-beräkning är högre än ansökt belopp. Processen avslutas normalt 
   (Event_0j4buhs)."
```

---

## 4. Identifierade problem

### 4.1 Strukturella problem

1. **BPMN-centrerade istället för funktionella:** Beskriver BPMN-flöde, inte funktionalitet
2. **Saknar användarupplevelse:** Fokus på BPMN-mekanik, inte vad användaren ser/upplever
3. **Saknar funktionella detaljer:** UI/UX, validering, feedback, felmeddelanden är ofullständiga
4. **Inkonsistent med user stories:** User stories har förbättrats men test-scenarierna har inte följt med
5. **Saknar koppling till acceptanskriterier:** Test-scenarierna verifierar inte acceptanskriterierna

### 4.2 Innehållsproblem

1. **Teknisk istället för affärsmässig:** Beskriver hur BPMN-processen fungerar, inte vad systemet gör för användaren
2. **Saknar assertions för funktionalitet:** Verifierar BPMN-mekanik, inte funktionella detaljer
3. **Saknar UI/UX-verifieringar:** Verifierar inte visuella indikatorer, progress-bars, feedback
4. **Saknar felmeddelande-verifieringar:** Verifierar inte exakta felmeddelanden, bara att fel inträffar

### 4.3 Konsistensproblem

1. **Olika struktur:** User stories och acceptanskriterier börjar med funktionalitet, test-scenarier börjar med BPMN-referenser
2. **Olika fokus:** User stories och acceptanskriterier fokuserar på användarupplevelse, test-scenarier fokuserar på BPMN-mekanik
3. **Saknar koppling:** Test-scenarierna refererar inte till user stories eller acceptanskriterier

---

## 5. Förbättringsområden

### 5.1 Struktur

**Nuvarande struktur:**
```
❌ "Processen körs genom alla steg: pre-screening → objekt → hushåll/stakeholders 
   → KALP-beräkning → bekräftelse → kreditupplysning. Alla DMN-beslut returnerar 
   APPROVED."
```

**Rekommenderad struktur:**
```
✅ "Kunden fyller i ansökningsformulär. Systemet hämtar automatiskt befintlig 
   kunddata och visar den för kunden med visuell markering av auto-ifyllda fält. 
   Kunden kan ändra information om den är felaktig. Kunden fyller i hushållsekonomi 
   och stakeholder-information parallellt. Kunden ser en sammanfattning och bekräftar 
   ansökan. Systemet hämtar kreditinformation automatiskt.
   
   [BPMN-referens: pre-screening → objekt → hushåll/stakeholders → KALP-beräkning 
   → bekräftelse → kreditupplysning, alla DMN-beslut returnerar APPROVED]"
```

### 5.2 Innehåll

**Lägg till:**
- ✅ **Användarupplevelse:** Vad ser användaren? Hur interagerar användaren?
- ✅ **UI/UX-verifieringar:** Verifiera visuella indikatorer, progress-bars, feedback
- ✅ **Funktionella detaljer:** Verifiera validering, feedback, felmeddelanden
- ✅ **Koppling till acceptanskriterier:** Verifiera att acceptanskriterierna uppfylls
- ✅ **Koppling till user stories:** Verifiera att user stories uppfylls

**Flytta:**
- ✅ **BPMN-referenser:** Från huvudfokus till teknisk kontext i slutet
- ✅ **BPMN-syntax:** Från huvudfokus till teknisk referens

### 5.3 Assertions

**Nuvarande assertions:**
```
❌ "Alla DMN-beslut returnerar APPROVED. KALP-beräkning är högre än ansökt belopp. 
   Processen avslutas normalt (Event_0j4buhs)."
```

**Rekommenderade assertions:**
```
✅ "Kunden ser hämtad information med visuell markering av auto-ifyllda fält 
   (grön bockmarkering eller ikon). Kunden kan ändra information om den är felaktig 
   via tydlig 'Redigera'-knapp per fält. UI visar tydlig progress-indikator för 
   datainsamling (progress bar eller spinner). Kunden ser tydlig information om 
   vilka parter som har hämtats med statusindikatorer ('Hämtad', 'Pågår', 'Fel'). 
   Kunden ser en sammanfattning av all information med tydliga rubriker och kan 
   gå tillbaka och ändra information. Kunden bekräftar ansökan. Systemet hämtar 
   kreditinformation automatiskt. [BPMN-referens: Alla DMN-beslut returnerar APPROVED, 
   processen avslutas normalt (Event_0j4buhs)]"
```

---

## 6. Rekommendationer

### 6.1 Kort sikt

1. **Uppdatera struktur:** Börja med funktionalitet, lägg BPMN-referenser i slutet
2. **Lägg till användarupplevelse:** Beskriv vad användaren ser/upplever
3. **Lägg till funktionella detaljer:** Verifiera UI/UX, validering, feedback, felmeddelanden
4. **Koppla till acceptanskriterier:** Verifiera att acceptanskriterierna uppfylls
5. **Koppla till user stories:** Verifiera att user stories uppfylls

### 6.2 Lång sikt

1. **Uppdatera arbetsprocess:** Lägg till riktlinjer för test-scenarier i `MANUAL_HTML_WORKFLOW.md`
2. **Skapa checklista:** Skapa en checklista för test-scenarier (liknande `USER_STORY_QUALITY_CHECKLIST.md`)
3. **Uppdatera alla filer:** Gå igenom alla filer och uppdatera test-scenarierna enligt nya riktlinjer

---

## 7. Exempel: Förbättrat test-scenario

### Före (nuvarande)
```
**Given:** En person ansöker om bolån för köp. Alla krav uppfylls (pre-screening 
godkänd, fastighet godkänd). Testdata: customer-standard.

**When:** Processen körs genom alla steg: pre-screening → objekt → hushåll/stakeholders 
→ KALP-beräkning → bekräftelse → kreditupplysning.

**Then:** Alla DMN-beslut returnerar APPROVED. KALP-beräkning är högre än ansökt 
belopp. Kunden bekräftar ansökan. Kreditinformation hämtas. Processen avslutas 
normalt (Event_0j4buhs). Ansökan är klar för kreditevaluering.
```

### Efter (förbättrad)
```
**Given:** En person ansöker om bolån för köp. Personen uppfyller alla grundläggande 
krav (godkänd vid pre-screening). Fastigheten uppfyller bankens krav (godkänd vid 
bedömning). Testdata: customer-standard.

**When:** 
- Kunden fyller i ansökningsformulär med grundläggande information
- Systemet hämtar automatiskt befintlig kunddata och visar den för kunden
- Kunden fyller i hushållsekonomi och stakeholder-information parallellt
- Systemet beräknar automatiskt maximalt lånebelopp (KALP)
- Kunden ser en sammanfattning av all information och bekräftar ansökan
- Systemet hämtar kreditinformation automatiskt

**Then:**
- Kunden ser hämtad information med visuell markering av auto-ifyllda fält 
  (grön bockmarkering eller ikon)
- Kunden kan ändra information om den är felaktig via tydlig 'Redigera'-knapp per fält
- UI visar tydlig progress-indikator för datainsamling (progress bar eller spinner)
- Kunden kan öppna både Household- och Stakeholders-formulären samtidigt i separata 
  flikar/fönster
- Kunden ser en sammanfattning med tydliga rubriker (Intern data, Hushållsekonomi, 
  Stakeholders, Objekt)
- Kunden kan gå tillbaka och ändra information via tydliga länkar (t.ex. 'Redigera' 
  knappar per sektion)
- Kunden bekräftar ansökan via tydlig 'Bekräfta'-knapp
- Kreditinformation är hämtad för alla stakeholders
- Processen avslutas normalt och ansökan är klar för kreditevaluering
  
**BPMN-referens:** Pre-screening → objekt → hushåll/stakeholders → KALP-beräkning 
→ bekräftelse → kreditupplysning. Alla DMN-beslut returnerar APPROVED. KALP-beräkning 
är högre än ansökt belopp. Processen avslutas normalt (Event_0j4buhs).
```

---

## 8. Slutsats

Test-scenarierna har **samma problem som user stories och acceptanskriterier hade innan förbättring:**
- BPMN-centrerade istället för funktionella
- Börjar med BPMN-referenser istället för funktionalitet
- Saknar användarupplevelse och funktionella detaljer
- Tekniska istället för affärsmässiga
- Inkonsistenta med de förbättrade user stories och acceptanskriterierna

**Rekommendation:** Uppdatera test-scenarierna enligt samma princip som user stories och acceptanskriterier:
1. Börja med funktionalitet (vad användaren ser, vad systemet gör)
2. Lägg till användarupplevelse (UI/UX, visuella indikatorer, feedback)
3. Lägg till funktionella detaljer (validering, feedback, felmeddelanden)
4. Lägg BPMN-referenser som teknisk kontext i slutet
5. Koppla till user stories och acceptanskriterier (verifiera att de uppfylls)
6. Fokusera på användarupplevelse och affärsvärde



