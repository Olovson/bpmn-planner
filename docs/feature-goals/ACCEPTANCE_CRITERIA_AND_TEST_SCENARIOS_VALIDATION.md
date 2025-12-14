# Validering: Acceptanskriterier och Test-scenarier i mortgage-application-v2.html

## Syfte
Analysera de uppdaterade acceptanskriterierna och test-scenarierna för att identifiera förbättringsområden och säkerställa att de följer de nya riktlinjerna.

---

## 1. Övergripande bedömning

### ✅ Styrkor
- **Börjar med funktionalitet:** Acceptanskriterier och test-scenarier börjar nu med funktionalitet istället för BPMN-referenser
- **Fokus på användarupplevelse:** Beskriver vad användaren ser, hur användaren interagerar, UI/UX-detaljer
- **BPMN-referenser i slutet:** BPMN-ID:n, call activities, gateways, events är nu teknisk kontext i slutet
- **Given-When-Then struktur:** Test-scenarier har tydlig Given-When-Then struktur med BPMN-referenser i slutet
- **Funktionella detaljer:** Inkluderar validering, feedback, felmeddelanden, progress-indikatorer, statusindikatorer

### ⚠️ Identifierade förbättringsområden

#### 1.1 Acceptanskriterier - Sektion 1
**Nuvarande:**
- ✅ Börjar med funktionalitet
- ✅ Fokus på användarupplevelse
- ✅ BPMN-referenser i slutet
- ⚠️ **Problem:** För lång punkt (blandar flera acceptanskriterier i en punkt)

**Förbättring:**
- Dela upp i flera punkter för bättre läsbarhet
- Varje punkt ska fokusera på ett specifikt acceptanskriterium

#### 1.2 Acceptanskriterier - Sektion 3
**Nuvarande:**
- ✅ Börjar med funktionalitet
- ✅ Fokus på användarupplevelse
- ⚠️ **Problem:** För lång punkt med mycket BPMN-referenser i slutet

**Förbättring:**
- Dela upp i flera punkter
- Separera funktionella detaljer från BPMN-referenser

#### 1.3 Test-scenarier - S1
**Nuvarande:**
- ✅ Börjar med funktionalitet
- ✅ Fokus på användarupplevelse
- ✅ BPMN-referenser i slutet
- ✅ Given-When-Then struktur
- ⚠️ **Problem:** "Then"-sektionen är lite lång - kan vara svårt att skanna

**Förbättring:**
- Kortare "Then"-sektion med fokus på de viktigaste verifieringarna
- Behåll alla viktiga funktionella detaljer men strukturera bättre

#### 1.4 Test-scenarier - S6, S7
**Nuvarande:**
- ✅ Börjar med funktionalitet
- ⚠️ **Problem:** "When"-sektionen är lite kort - saknar några viktiga steg

**Förbättring:**
- Lägg till fler viktiga steg i "When"-sektionen
- Fokusera på vad användaren gör och vad systemet gör

---

## 2. Detaljerad analys

### 2.1 Acceptanskriterier - Struktur

**Sektion 1 (Intern datainsamling och pre-screening):**
- ✅ Börjar med funktionalitet: "Systemet ska automatiskt hämta och visa befintlig kunddata..."
- ✅ Fokus på användarupplevelse: "Kunden ska se hämtad information...", "UI ska visa tydlig progress-indikator..."
- ✅ BPMN-referenser i slutet: "[BPMN-referens: ...]"
- ⚠️ **Problem:** Första punkten är lång (blandar flera acceptanskriterier)

**Rekommendation:**
- Dela upp första punkten i 2-3 separata punkter:
  1. Datainsamling och visning
  2. Användarinteraktion (redigera, ändra)
  3. Progress-indikatorer och status

**Sektion 3 (Parallell datainsamling):**
- ✅ Börjar med funktionalitet: "Efter att intern data och objektinformation är insamlad..."
- ✅ Fokus på användarupplevelse: "Kunden ska kunna öppna både Household- och Stakeholders-formulären..."
- ⚠️ **Problem:** Första punkten är lång med mycket BPMN-referenser i slutet

**Rekommendation:**
- Dela upp första punkten i flera punkter
- Separera funktionella detaljer från BPMN-referenser

### 2.2 Test-scenarier - Struktur

**S1 (Normalflöde):**
- ✅ Given-When-Then struktur
- ✅ Börjar med funktionalitet
- ✅ Fokus på användarupplevelse
- ✅ BPMN-referenser i slutet
- ⚠️ **Problem:** "Then"-sektionen är lite lång (många verifieringar i en lång text)

**Rekommendation:**
- Strukturera "Then"-sektionen bättre med bullet points eller kortare meningar
- Behåll alla viktiga verifieringar men gör dem lättare att skanna

**S6 (Bekräftelse hoppas över):**
- ✅ Börjar med funktionalitet
- ✅ Fokus på användarupplevelse
- ⚠️ **Problem:** "When"-sektionen är lite kort - saknar några viktiga steg

**Rekommendation:**
- Lägg till fler viktiga steg i "When"-sektionen
- Beskriv vad systemet gör automatiskt (KALP-beräkning, screening)

**S7 (KALP-beräkning godkänd):**
- ✅ Börjar med funktionalitet
- ⚠️ **Problem:** "When"-sektionen är lite kort - saknar några viktiga steg

**Rekommendation:**
- Lägg till fler viktiga steg i "When"-sektionen
- Beskriv vad kunden gör (ser sammanfattning, bekräftar)

---

## 3. Specifika förbättringar

### 3.1 Acceptanskriterier - Sektion 1

**Nuvarande (för lång punkt):**
```
Systemet ska automatiskt hämta och visa befintlig kunddata (part, engagemang, kreditinformation) för alla identifierade parter. Kunden ska se hämtad information i ett tydligt format med visuell markering av auto-ifyllda fält (t.ex. grön bockmarkering eller ikon), och kunna ändra information om den är felaktig via tydlig 'Redigera'-knapp per fält. UI ska visa tydlig progress-indikator för datainsamling (t.ex. progress bar eller spinner) och tydligt visa vilka parter som har hämtats med statusindikatorer (t.ex. 'Hämtad', 'Pågår', 'Fel'). Om datainsamling misslyckas för en part, ska systemet visa tydligt felmeddelande och tillåta kunden att manuellt fylla i informationen. Datainsamling och pre-screening ska ske separat för huvudansökande och medlåntagare. [BPMN-referens: ...]
```

**Förbättrad (delad i flera punkter):**
```
- Systemet ska automatiskt hämta och visa befintlig kunddata (part, engagemang, kreditinformation) för alla identifierade parter. Kunden ska se hämtad information i ett tydligt format med visuell markering av auto-ifyllda fält (t.ex. grön bockmarkering eller ikon), och kunna ändra information om den är felaktig via tydlig 'Redigera'-knapp per fält. [BPMN-referens: "Internal data gathering" call activity (internal-data-gathering) körs som multi-instance för varje identifierad part]

- UI ska visa tydlig progress-indikator för datainsamling (t.ex. progress bar eller spinner) och tydligt visa vilka parter som har hämtats med statusindikatorer (t.ex. 'Hämtad', 'Pågår', 'Fel'). Datainsamling och pre-screening ska ske separat för huvudansökande och medlåntagare.

- Om datainsamling misslyckas för en part, ska systemet visa tydligt felmeddelande och tillåta kunden att manuellt fylla i informationen.
```

### 3.2 Test-scenarier - S1

**Nuvarande (lång "Then"-sektion):**
```
**Then:** Kunden ser hämtad information med visuell markering av auto-ifyllda fält (grön bockmarkering eller ikon). Kunden kan ändra information om den är felaktig via tydlig 'Redigera'-knapp per fält. UI visar tydlig progress-indikator för datainsamling (progress bar eller spinner). Kunden kan öppna både Household- och Stakeholders-formulären samtidigt i separata flikar/fönster. Kunden ser en sammanfattning med tydliga rubriker (Intern data, Hushållsekonomi, Stakeholders, Objekt). Kunden bekräftar ansökan via tydlig 'Bekräfta'-knapp. Kreditinformation är hämtad för alla stakeholders. Processen avslutas normalt och ansökan är klar för kreditevaluering.
```

**Förbättrad (strukturerad med kortare meningar):**
```
**Then:**
- Kunden ser hämtad information med visuell markering av auto-ifyllda fält (grön bockmarkering eller ikon)
- Kunden kan ändra information om den är felaktig via tydlig 'Redigera'-knapp per fält
- UI visar tydlig progress-indikator för datainsamling (progress bar eller spinner)
- Kunden kan öppna både Household- och Stakeholders-formulären samtidigt i separata flikar/fönster
- Kunden ser en sammanfattning med tydliga rubriker (Intern data, Hushållsekonomi, Stakeholders, Objekt)
- Kunden bekräftar ansökan via tydlig 'Bekräfta'-knapp
- Kreditinformation är hämtad för alla stakeholders
- Processen avslutas normalt och ansökan är klar för kreditevaluering
```

---

## 4. Slutsats och rekommendationer

### 4.1 Acceptanskriterier
**Status:** ✅ Bra, men kan förbättras
- **Huvudproblem:** Vissa punkter är för långa (blandar flera acceptanskriterier)
- **Rekommendation:** Dela upp långa punkter i flera separata punkter för bättre läsbarhet

### 4.2 Test-scenarier
**Status:** ✅ Bra, men kan förbättras
- **Huvudproblem:** Vissa "Then"-sektioner är lite långa, vissa "When"-sektioner är lite korta
- **Rekommendation:** Strukturera "Then"-sektioner bättre med bullet points, lägg till fler steg i "When"-sektioner där det behövs

### 4.3 Övergripande kvalitet
**Status:** ✅ Mycket bra - följer de nya riktlinjerna
- **Struktur:** ✅ Börjar med funktionalitet, BPMN-referenser i slutet
- **Innehåll:** ✅ Fokus på användarupplevelse, funktionella detaljer
- **Konsistens:** ✅ Konsekvent genom hela dokumentet

### 4.4 Nästa steg
1. **Dela upp långa acceptanskriterier-punkter** i flera separata punkter
2. **Strukturera test-scenarier bättre** med bullet points i "Then"-sektioner
3. **Lägg till fler steg** i "When"-sektioner där det behövs
4. **Validera slutresultatet** mot checklistan

---

## 5. Checklista för validering

### Acceptanskriterier
- [x] Börjar med funktionalitet (vad systemet gör, vad användaren ser)
- [x] Fokus på användarupplevelse (UI/UX, visuella indikatorer, feedback)
- [x] Funktionella detaljer (validering, feedback, felmeddelanden, progress-indikatorer)
- [x] BPMN-referenser i slutet (som teknisk kontext)
- [ ] Varje punkt fokuserar på ett specifikt acceptanskriterium (vissa punkter är för långa)
- [x] Tydliga och testbara krav

### Test-scenarier
- [x] Given-When-Then struktur
- [x] Börjar med funktionalitet (vad användaren gör, vad systemet gör)
- [x] Fokus på användarupplevelse (UI/UX, visuella indikatorer, feedback)
- [x] Funktionella detaljer i "Then"-sektionen (validering, feedback, felmeddelanden)
- [x] BPMN-referenser i slutet (som teknisk kontext)
- [ ] "Then"-sektioner är strukturerade och lätta att skanna (vissa är lite långa)
- [ ] "When"-sektioner innehåller alla viktiga steg (vissa är lite korta)
- [x] Testdata-referenser inkluderade

---

## 6. Rekommenderade förbättringar

### 6.1 Acceptanskriterier
1. **Dela upp långa punkter** i flera separata punkter
2. **Separera funktionella detaljer** från BPMN-referenser
3. **Förbättra läsbarhet** med kortare meningar och tydligare struktur

### 6.2 Test-scenarier
1. **Strukturera "Then"-sektioner** med bullet points eller kortare meningar
2. **Lägg till fler steg** i "When"-sektioner där det behövs
3. **Förbättra läsbarhet** med tydligare struktur

### 6.3 Arbetsprocess
1. **Lägg till riktlinjer** för att dela upp långa acceptanskriterier-punkter
2. **Lägg till riktlinjer** för att strukturera test-scenarier bättre
3. **Lägg till checklista** för validering av längd och struktur



