# Analys: Acceptanskriterier i mortgage-application-v2.html

## Syfte
Analysera acceptanskriterierna för att identifiera problem och förbättringsområden, särskilt i relation till de förbättrade user stories.

---

## 1. Övergripande bedömning

### ✅ Styrkor
- **Strukturerad:** Organiserad i kategorier (1-8) baserat på processsteg
- **Specifika BPMN-referenser:** Innehåller exakta BPMN-ID:n och element
- **Omfattande:** Täcker alla viktiga processsteg
- **Tekniskt korrekt:** Beskriver BPMN-flödet korrekt

### ❌ Problem
- **BPMN-centrerad istället för funktionell:** Beskriver BPMN-mekanik istället för funktionalitet
- **Börjar med BPMN-referenser:** Många acceptanskriterier börjar med BPMN-syntax (t.ex. "via 'X' call activity")
- **Saknar användarupplevelse:** Fokus på BPMN-flöde, inte vad användaren ser/upplever
- **Saknar funktionella detaljer:** UI/UX, validering, feedback, felmeddelanden är ofullständiga
- **Teknisk istället för affärsmässig:** Beskriver hur BPMN-processen fungerar, inte vad systemet gör för användaren

---

## 2. Detaljerad analys

### 2.1 Problem: BPMN-centrerad istället för funktionell

**Exempel från sektion 1:**
```
❌ "Systemet ska automatiskt hämta befintlig kunddata från interna system 
   (part, engagemang, kreditinformation) för alla identifierade parter i 
   ansökan via 'Internal data gathering' call activity"
```

**Problem:**
- Börjar med BPMN-referens ("via 'Internal data gathering' call activity")
- Fokus på BPMN-mekanik, inte funktionalitet
- Saknar användarupplevelse (vad ser kunden? hur visas informationen?)
- Saknar funktionella detaljer (hur markeras auto-ifyllda fält? kan kunden ändra?)

**Bör vara:**
```
✅ "Systemet ska automatiskt hämta och visa befintlig kunddata (part, 
   engagemang, kreditinformation) för alla identifierade parter. Kunden 
   ska se hämtad information i ett tydligt format med visuell markering 
   av auto-ifyllda fält, och kunna ändra information om den är felaktig. 
   UI ska visa progress-indikator för datainsamling och tydligt visa vilka 
   parter som har hämtats. [BPMN-referens: 'Internal data gathering' call 
   activity (internal-data-gathering) körs som multi-instance för varje 
   identifierad part]"
```

### 2.2 Problem: Börjar med BPMN-syntax

**Exempel från sektion 3:**
```
❌ "Systemet ska köra 'Household' och 'Stakeholders' parallellt efter att 
   intern data och objektinformation är insamlad, så att kunden kan fylla 
   i både hushållsekonomi och stakeholder-information samtidigt"
```

**Problem:**
- Börjar med BPMN-referens ("'Household' och 'Stakeholders'")
- Fokus på BPMN-mekanik (parallell körning), inte användarupplevelse
- Saknar funktionella detaljer (hur öppnas formulären? kan de sparas separat?)

**Bör vara:**
```
✅ "Kunden ska kunna öppna både Household- och Stakeholders-formulären 
   samtidigt i separata flikar/fönster, spara progress i varje formulär 
   oberoende av varandra, och systemet ska validera varje formulär separat 
   och visa tydligt vilka formulär som är kompletta med progress-indikatorer. 
   UI ska visa tydlig information om vilka steg som kan göras parallellt 
   med visuella indikatorer. [BPMN-referens: 'Household' call activity 
   (household) och 'Per stakeholder' subprocess (stakeholders) körs parallellt 
   via parallel gateway (Gateway_0n2ekt4)]"
```

### 2.3 Problem: Saknar användarupplevelse

**Exempel från sektion 4:**
```
❌ "'Screen KALP' DMN-beslutsregel ska utvärdera KALP-resultatet mot 
   affärsregler baserat på ansökningstyp"
```

**Problem:**
- Börjar med BPMN-referens ("'Screen KALP' DMN-beslutsregel")
- Fokus på BPMN-mekanik, inte vad användaren ser
- Saknar funktionella detaljer (vad händer när KALP inte är OK? vad ser kunden?)

**Bör vara:**
```
✅ "Systemet ska automatiskt beräkna maximalt lånebelopp baserat på 
   hushållsaffordability (KALP) och utvärdera resultatet mot affärsregler. 
   Om maximalt lånebelopp är under ansökt belopp, ska systemet visa ett 
   tydligt felmeddelande som förklarar orsaken (t.ex. 'Maximalt lånebelopp 
   (2 500 000 SEK) är under ansökt belopp (3 000 000 SEK)') och konkreta 
   steg för att förbättra situationen. Meddelandet ska vara på svenska, 
   tydligt och affärsorienterat med konkreta siffror. [BPMN-referens: 
   'KALP' service task (Activity_0p3rqyp) beräknar KALP, 'Screen KALP' 
   business rule task (Activity_1mezc6h) utvärderar resultatet, 'KALP OK?' 
   gateway (Gateway_0fhav15) avgör om ansökan avvisas]"
```

### 2.4 Problem: Saknar funktionella detaljer

**Exempel från sektion 5:**
```
❌ "Kunden ska kunna se en sammanfattning av all insamlad information 
   (intern data, hushåll, stakeholders, objekt) i 'Confirm application' 
   user task"
```

**Problem:**
- Börjar med BPMN-referens ("'Confirm application' user task")
- Saknar funktionella detaljer (hur ser sammanfattningen ut? kan kunden ändra? vad händer om något saknas?)

**Bör vara:**
```
✅ "Kunden ska kunna se en sammanfattning av all insamlad information 
   (intern data, hushåll, stakeholders, objekt) i ett strukturerat format 
   med tydliga rubriker, tillåta att gå tillbaka och ändra information via 
   tydliga länkar (t.ex. 'Redigera' knappar per sektion), och visa en tydlig 
   'Bekräfta'-knapp. Om någon information saknas, ska systemet visa en 
   varning med tydlig lista över vad som saknas och inte tillåta bekräftelse. 
   UI ska visa tydlig progress-indikator och tydligt visa vilka steg som är 
   klara med visuella indikatorer. [BPMN-referens: 'Confirm application' 
   user task (confirm-application) aktiveras när båda flödena är klara via 
   parallel gateway (Gateway_1960pk9)]"
```

---

## 3. Jämförelse med User Stories

### 3.1 User Stories (efter förbättring)

**Exempel:**
```
✅ "Som kund vill jag att systemet automatiskt hämtar min befintliga 
   information så att jag inte behöver fylla i information som banken 
   redan har om mig, särskilt viktigt för återkommande kunder.
   
   Acceptanskriterier: Systemet ska visa hämtad information (part, 
   engagemang, kreditinformation) i ett tydligt format, markera fält 
   som är auto-ifyllda med visuell indikator, och tillåta mig att ändra 
   information om den är felaktig. UI ska visa tydlig progress-indikator 
   för datainsamling och tydligt visa vilka parter som har hämtats. 
   [BPMN-referens: 'Internal data gathering' call activity (internal-data-gathering) 
   körs som multi-instance för varje identifierad part]"
```

**Stärkor:**
- ✅ Börjar med funktionalitet (vad användaren ser, vad systemet gör)
- ✅ Fokus på användarupplevelse (UI, visuella indikatorer, feedback)
- ✅ BPMN-referenser som teknisk kontext i slutet
- ✅ Funktionella detaljer (validering, feedback, felmeddelanden)

### 3.2 Acceptanskriterier (nuvarande)

**Exempel:**
```
❌ "Systemet ska automatiskt hämta befintlig kunddata från interna system 
   (part, engagemang, kreditinformation) för alla identifierade parter i 
   ansökan via 'Internal data gathering' call activity"
```

**Problem:**
- ❌ Börjar med BPMN-referens
- ❌ Fokus på BPMN-mekanik, inte funktionalitet
- ❌ Saknar användarupplevelse
- ❌ Saknar funktionella detaljer

---

## 4. Identifierade problem

### 4.1 Strukturella problem

1. **Börjar med BPMN-referenser:** Många acceptanskriterier börjar med "via 'X' call activity" eller "'X' gateway ska..."
2. **BPMN-syntax i början:** Fokus på BPMN-mekanik istället för funktionalitet
3. **Saknar funktionella detaljer:** UI/UX, validering, feedback, felmeddelanden är ofullständiga
4. **Saknar användarupplevelse:** Beskriver inte vad användaren ser/upplever

### 4.2 Innehållsproblem

1. **Teknisk istället för affärsmässig:** Beskriver hur BPMN-processen fungerar, inte vad systemet gör för användaren
2. **Saknar affärslogik:** Valideringar, felmeddelanden, edge cases är ofullständiga
3. **Saknar UI/UX-krav:** Visuella indikatorer, progress-bars, feedback är ofullständiga
4. **Saknar felhantering:** Felmeddelanden, error codes, timeout-hantering är ofullständiga

### 4.3 Konsistensproblem

1. **Inkonsistent med user stories:** User stories har förbättrats men acceptanskriterierna har inte följt med
2. **Olika struktur:** User stories börjar med funktionalitet, acceptanskriterier börjar med BPMN-referenser
3. **Olika fokus:** User stories fokuserar på användarupplevelse, acceptanskriterier fokuserar på BPMN-mekanik

---

## 5. Förbättringsområden

### 5.1 Struktur

**Nuvarande struktur:**
```
❌ "Systemet ska [funktionalitet] via 'X' call activity (x-id)"
```

**Rekommenderad struktur:**
```
✅ "Systemet ska [funktionalitet med funktionella detaljer]. 
   [UI/UX-krav]. [Validering och feedback]. [BPMN-referens som teknisk kontext i slutet]"
```

### 5.2 Innehåll

**Lägg till:**
- ✅ **Användarupplevelse:** Vad ser användaren? Hur visas informationen?
- ✅ **UI/UX-krav:** Visuella indikatorer, progress-bars, feedback
- ✅ **Validering:** Vad valideras? Vad händer vid fel?
- ✅ **Felmeddelanden:** Tydliga, affärsorienterade meddelanden
- ✅ **Affärslogik:** Valideringar, edge cases, timeout-hantering

**Flytta:**
- ✅ **BPMN-referenser:** Från början till slutet (som teknisk kontext)
- ✅ **BPMN-syntax:** Från huvudfokus till teknisk referens

### 5.3 Konsistens

**Säkerställ:**
- ✅ **Samma struktur som user stories:** Börja med funktionalitet, lägg BPMN-referenser i slutet
- ✅ **Samma fokus:** Användarupplevelse och funktionella detaljer
- ✅ **Samma kvalitet:** Funktionella, testbara, implementeringsklara

---

## 6. Rekommendationer

### 6.1 Kort sikt

1. **Uppdatera struktur:** Börja med funktionalitet, lägg BPMN-referenser i slutet
2. **Lägg till funktionella detaljer:** UI/UX, validering, feedback, felmeddelanden
3. **Förbättra användarupplevelse:** Beskriv vad användaren ser/upplever
4. **Gör konsistent med user stories:** Följ samma struktur och fokus

### 6.2 Lång sikt

1. **Uppdatera arbetsprocess:** Lägg till riktlinjer för acceptanskriterier i `MANUAL_HTML_WORKFLOW.md`
2. **Skapa checklista:** Skapa en checklista för acceptanskriterier (liknande `USER_STORY_QUALITY_CHECKLIST.md`)
3. **Uppdatera alla filer:** Gå igenom alla filer och uppdatera acceptanskriterierna enligt nya riktlinjer

---

## 7. Exempel: Förbättrad acceptanskriterium

### Före (nuvarande)
```
❌ "Systemet ska automatiskt hämta befintlig kunddata från interna system 
   (part, engagemang, kreditinformation) för alla identifierade parter i 
   ansökan via 'Internal data gathering' call activity"
```

### Efter (förbättrad)
```
✅ "Systemet ska automatiskt hämta och visa befintlig kunddata (part, 
   engagemang, kreditinformation) för alla identifierade parter. Kunden 
   ska se hämtad information i ett tydligt format med visuell markering 
   av auto-ifyllda fält (t.ex. grön bockmarkering eller ikon), och kunna 
   ändra information om den är felaktig via tydlig 'Redigera'-knapp per 
   fält. UI ska visa tydlig progress-indikator för datainsamling (t.ex. 
   progress bar eller spinner) och tydligt visa vilka parter som har 
   hämtats med statusindikatorer (t.ex. 'Hämtad', 'Pågår', 'Fel'). Om 
   datainsamling misslyckas för en part, ska systemet visa tydligt 
   felmeddelande och tillåta kunden att manuellt fylla i informationen. 
   
   [BPMN-referens: 'Internal data gathering' call activity (internal-data-gathering) 
   körs som multi-instance för varje identifierad part]"
```

---

## 8. Slutsats

Acceptanskriterierna har **samma problem som user stories hade innan förbättring:**
- BPMN-centrerade istället för funktionella
- Börjar med BPMN-referenser istället för funktionalitet
- Saknar användarupplevelse och funktionella detaljer
- Tekniska istället för affärsmässiga

**Rekommendation:** Uppdatera acceptanskriterierna enligt samma princip som user stories:
1. Börja med funktionalitet (vad användaren ser, vad systemet gör)
2. Lägg till funktionella detaljer (UI/UX, validering, feedback)
3. Lägg BPMN-referenser som teknisk kontext i slutet
4. Fokusera på användarupplevelse och affärsvärde



