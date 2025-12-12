# Validering för Målgrupper - PERMANENT REGEL

**⚠️ DETTA ÄR EN PERMANENT REGEL SOM ALDRIG FÅR GLÖMMAS**

## Syfte

Efter att ett feature goal dokument skapats eller förbättrats, MÅSTE det valideras för alla målgrupper för att säkerställa att varje målgrupp har all information de behöver för att utföra sitt arbete.

## Målgrupper

1. **🎯 Produktägare (Product Owner)**
2. **🧪 Test lead och Testare**
3. **💻 Utvecklare**
4. **🎨 Designer**
5. **👤 Handläggare**
6. **👥 Tvärfunktionellt team**
7. **🏗️ Arkitekt**
8. **📊 Business Analyst**

## Valideringsprocess

### Steg 1: Validera för varje målgrupp

För varje målgrupp, gå igenom checklistan och identifiera vad som saknas.

### Steg 2: Förbättra dokumentet

För varje saknad information, förbättra dokumentet genom att:
- Lägga till saknad information i relevanta sektioner
- Förtydliga befintlig information
- Organisera innehåll så att det är lätt att hitta

### Steg 3: Iterera

Upprepa steg 1-2 tills alla målgrupper har all information de behöver.

**⚠️ VIKTIGT:** Detta är en iterativ process. Fortsätt tills alla checklistor är kompletta.

## Checklistor per målgrupp

### 🎯 Produktägare (Product Owner)

**Vad de behöver förstå:**
- [ ] Vad ska byggas? (Beskrivning av FGoal, Omfattning)
- [ ] Varför ska det byggas? (Effekt)
- [ ] Vilket värde ger det? (Effekt, User stories)
- [ ] Vad ingår och vad ingår inte? (Omfattning, Avgränsning)

**Kapitel att validera:**
- [ ] **Beskrivning av FGoal** - Tydlig beskrivning av vad feature goalet gör och vem som utför aktiviteten
  - [ ] Använder affärstermer, inte tekniska termer
  - [ ] Beskriver syfte och värde
  - [ ] Beskriver vem som påverkas (kund, handläggare, system)
- [ ] **Effekt** - Konkreta affärseffekter med mätbara siffror
  - [ ] Innehåller konkreta siffror eller procent (t.ex. "minskar handläggningstid med 30-40%")
  - [ ] Beskriver vem som påverkas och hur
  - [ ] Fokuserar på affärsvärde, inte implementation
- [ ] **User stories** - Användarbehov och värde
  - [ ] Organiserade i kategorier (Kundperspektiv, Handläggarperspektiv)
  - [ ] Beskriver användarbehov och värde
  - [ ] Inkluderar acceptanskriterier i user stories (i kursiv stil)
- [ ] **Omfattning** - Vad som ingår i processen
  - [ ] Listar alla aktiviteter och steg
  - [ ] Beskriver vad som ingår tydligt
- [ ] **Avgränsning** - Vad som INTE ingår
  - [ ] Tydliga scope boundaries
  - [ ] Förklarar vad som är utanför scope

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

### 🧪 Test lead och Testare

**Vad de behöver förstå:**
- [ ] Hur ska feature goalet testas? (Testgenerering)
- [ ] Vilka scenarier behöver täckas? (Testscenarier)
- [ ] Vilka testdata behövs? (Testdata-referenser)
- [ ] Hur mappas BPMN till faktisk implementation? (Implementation Mapping)
- [ ] Vilka error events finns? (Processteg - Output, Omfattning)
- [ ] Vilka är acceptanskriterierna? (Acceptanskriterier)

**Kapitel att validera:**
- [ ] **Testgenerering** - Komplett med alla scenarier, UI Flow, testdata, implementation mapping
  - [ ] Alla scenariotyper finns (Happy, Error, Edge)
  - [ ] UI Flow är dokumenterat för varje scenario
  - [ ] Testdata-referenser finns
  - [ ] Implementation mapping finns (routes, endpoints, API:er)
- [ ] **Processteg - Output** - Alla möjliga utfall
  - [ ] Alla error events är dokumenterade
  - [ ] Förväntade resultat är tydliga
  - [ ] Felmeddelanden är dokumenterade
- [ ] **Omfattning** - Alla aktiviteter och steg
  - [ ] Alla aktiviteter är dokumenterade
  - [ ] Alla gateways är dokumenterade
  - [ ] Alla error events är dokumenterade
- [ ] **Beroenden** - Externa system och integrationer
  - [ ] Externa system är dokumenterade
  - [ ] Integrationer är dokumenterade
  - [ ] Mock/test-krav är dokumenterade
- [ ] **Acceptanskriterier** - Testbara krav
  - [ ] Konkreta värden (inte bara beskrivningar)
  - [ ] Testbara krav
  - [ ] Timeout-värden, retry-logik, error handling

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

### 💻 Utvecklare

**Vad de behöver förstå:**
- [ ] Hur ska lösningen byggas? (Acceptanskriterier, Implementation Mapping)
- [ ] Vilka API:er och integrationer behövs? (Beroenden, Implementation Mapping)
- [ ] Vilka är tekniska kraven? (Acceptanskriterier)
- [ ] Hur fungerar processflödet? (BPMN - Process, Omfattning)
- [ ] Vilka error events ska hanteras? (Processteg - Output, Omfattning)

**Kapitel att validera:**
- [ ] **Acceptanskriterier** - Konkreta tekniska krav
  - [ ] Timeout-värden är specificerade
  - [ ] Valideringsregler är dokumenterade
  - [ ] Error codes är dokumenterade
  - [ ] Error handling är dokumenterad i detalj
- [ ] **Implementation Mapping** - Routes, endpoints, API:er
  - [ ] Routes är dokumenterade
  - [ ] Endpoints är dokumenterade
  - [ ] API:er är dokumenterade
  - [ ] Datastores är dokumenterade
- [ ] **Beroenden** - Externa system, API:er, integrationer
  - [ ] Externa system är dokumenterade
  - [ ] API:er är dokumenterade
  - [ ] Integrationer är dokumenterade
- [ ] **BPMN - Process** - Processflöde, sekvens, gateways, error events
  - [ ] Processflöde är tydligt beskrivet
  - [ ] Sekvens är dokumenterad
  - [ ] Gateways är dokumenterade
  - [ ] Error events är dokumenterade
- [ ] **Omfattning** - Alla aktiviteter och steg
  - [ ] Alla aktiviteter är dokumenterade
  - [ ] Multi-instance och parallellitet är dokumenterade
- [ ] **Processteg - Input/Output** - Entry point, dataformat
  - [ ] Entry point är dokumenterad
  - [ ] Dataformat är dokumenterat
  - [ ] Förväntade resultat är dokumenterade

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

### 🎨 Designer

**Vad de behöver förstå:**
- [ ] Vilka användare påverkas? (Beskrivning av FGoal, User stories)
- [ ] Vilka användaruppgifter finns? (Omfattning, User stories)
- [ ] Hur ser användarresan ut? (Omfattning, BPMN - Process)
- [ ] Vilka UI-komponenter behövs? (User stories, Acceptanskriterier)
- [ ] Vilka felmeddelanden behövs? (Processteg - Output, Acceptanskriterier)

**Kapitel att validera:**
- [ ] **Beskrivning av FGoal** - Vem som utför aktiviteten
  - [ ] Tydligt vem som utför aktiviteten (kund, handläggare)
  - [ ] Vad de gör är tydligt
- [ ] **User stories** - Användarbehov, funktionalitet, UI/UX-krav
  - [ ] Användarbehov är dokumenterade
  - [ ] UI/UX-krav är dokumenterade
  - [ ] Användaruppgifter är konkreta (t.ex. "kunden fyller i hushållsekonomi")
- [ ] **Omfattning** - Alla user tasks och kundaktiviteter
  - [ ] Alla user tasks är dokumenterade
  - [ ] Alla kundaktiviteter är dokumenterade
- [ ] **Processteg - Output** - Felmeddelanden, feedback
  - [ ] Felmeddelanden är dokumenterade
  - [ ] Feedback till användare är dokumenterad
- [ ] **Acceptanskriterier** - UI/UX-krav
  - [ ] UI/UX-krav finns (t.ex. "tydliga rubriker", "möjlighet att gå tillbaka")
  - [ ] Användarresan är dokumenterad

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

### 👤 Handläggare

**Vad de behöver förstå:**
- [ ] Hur påverkas jag? (Beskrivning av FGoal, Omfattning)
- [ ] Vilka uppgifter gör jag? (Omfattning, User stories)
- [ ] Vilket värde ger det mig? (Effekt, User stories)
- [ ] Vilka fel kan uppstå? (Processteg - Output, Omfattning)

**Kapitel att validera:**
- [ ] **Beskrivning av FGoal** - Tydlig beskrivning
  - [ ] Tydlig beskrivning av vad feature goalet gör
  - [ ] Vem som utför aktiviteten är tydligt
- [ ] **Effekt** - Hur feature goalet påverkar handläggaren
  - [ ] Konkreta effekter (t.ex. "minskar manuellt arbete med 30-40%")
  - [ ] Beskriver vad handläggaren får ut av det
- [ ] **User stories** - Handläggarperspektiv
  - [ ] Handläggarperspektiv finns
  - [ ] Beskriver vad handläggaren behöver
  - [ ] Beskriver vilket värde handläggaren får
- [ ] **Omfattning** - Handläggaraktiviteter
  - [ ] Handläggaraktiviteter är dokumenterade
  - [ ] Handläggaruppgifter är dokumenterade
- [ ] **Processteg - Output** - Vad händer när processen är klar
  - [ ] Vad händer när processen är klar är tydligt
  - [ ] Felmeddelanden är förklarade i affärstermer

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

### 👥 Tvärfunktionellt team

**Vad de behöver förstå:**
- [ ] Översikt av feature goalet (Beskrivning av FGoal)
- [ ] Vad ingår och vad ingår inte? (Omfattning, Avgränsning)
- [ ] Vilket värde ger det? (Effekt)
- [ ] Vilka är kraven? (Acceptanskriterier, User stories)

**Kapitel att validera:**
- [ ] **Beskrivning av FGoal** - Översikt
  - [ ] Tydlig översikt av vad feature goalet gör
  - [ ] Använder tydligt språk som alla kan förstå
- [ ] **Omfattning** - Vad som ingår
  - [ ] Vad som ingår är tydligt
- [ ] **Avgränsning** - Vad som INTE ingår
  - [ ] Vad som INTE ingår är tydligt
- [ ] **Effekt** - Affärsvärde
  - [ ] Affärsvärde är tydligt
  - [ ] Förväntade effekter är dokumenterade
- [ ] **User stories** - Användarbehov
  - [ ] Användarbehov är dokumenterade
- [ ] **Acceptanskriterier** - Konkreta krav
  - [ ] Konkreta krav är dokumenterade
  - [ ] Förväntningar är tydliga

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

### 🏗️ Arkitekt

**Vad de behöver förstå:**
- [ ] Systemarkitektur och integrationer (Beroenden, BPMN - Process)
- [ ] Tekniska beslut och trade-offs (Acceptanskriterier, Beroenden)
- [ ] Processflöde och sekvens (BPMN - Process, Omfattning)
- [ ] Externa system och API:er (Beroenden, Implementation Mapping)

**Kapitel att validera:**
- [ ] **Beroenden** - Externa system, API:er, integrationer
  - [ ] Externa system är dokumenterade
  - [ ] API:er är dokumenterade
  - [ ] Integrationer är dokumenterade i detalj (API:er, protokoll, dataformat)
  - [ ] Tekniska beroenden är dokumenterade
- [ ] **BPMN - Process** - Processflöde, sekvens, gateways, error events
  - [ ] Processflöde är dokumenterat
  - [ ] Sekvens är dokumenterad
  - [ ] Gateways är dokumenterade
  - [ ] Error events är dokumenterade
- [ ] **Acceptanskriterier** - Tekniska krav
  - [ ] Tekniska krav är dokumenterade
  - [ ] Timeout-värden är dokumenterade
  - [ ] Valideringsregler är dokumenterade
  - [ ] Skalbarhets- och prestandakrav är dokumenterade
  - [ ] Säkerhets- och compliance-krav är dokumenterade
- [ ] **Implementation Mapping** - Routes, endpoints, API:er, datastores
  - [ ] Routes är dokumenterade
  - [ ] Endpoints är dokumenterade
  - [ ] API:er är dokumenterade
  - [ ] Datastores är dokumenterade
- [ ] **Omfattning** - Alla aktiviteter och steg
  - [ ] Alla aktiviteter som påverkar arkitekturen är dokumenterade
  - [ ] Error handling och resilience-mekanismer är dokumenterade

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

### 📊 Business Analyst

**Vad de behöver förstå:**
- [ ] Affärslogik och regler (Omfattning, BPMN - Process)
- [ ] Processflöde och affärsbeslut (BPMN - Process, Omfattning)
- [ ] Affärsregler och DMN-beslutslogik (Omfattning, Beroenden)
- [ ] Affärsvärde och effekter (Effekt, User stories)

**Kapitel att validera:**
- [ ] **Omfattning** - Alla aktiviteter, affärsregler, DMN-beslutslogik
  - [ ] Alla aktiviteter är dokumenterade
  - [ ] Affärsregler är dokumenterade
  - [ ] DMN-beslutslogik är dokumenterad
- [ ] **BPMN - Process** - Processflöde, beslutspunkter, affärslogik
  - [ ] Processflöde är dokumenterat
  - [ ] Beslutspunkter är dokumenterade
  - [ ] Affärslogik är dokumenterad i detalj (inte bara teknik)
- [ ] **Effekt** - Affärsvärde och förväntade effekter
  - [ ] Affärsvärde är dokumenterat
  - [ ] Förväntade effekter är dokumenterade
- [ ] **User stories** - Affärsbehov och funktionalitet
  - [ ] Affärsbehov är dokumenterade
  - [ ] Funktionalitet är dokumenterad
- [ ] **Beroenden** - Externa system som påverkar affärslogik
  - [ ] Externa system som påverkar affärslogik är dokumenterade
  - [ ] DMN-beslutsregler och tröskelvärden är dokumenterade
  - [ ] Affärsbeslut och deras konsekvenser är dokumenterade
  - [ ] Edge cases och specialfall är dokumenterade

**Om något saknas:** Förbättra dokumentet och iterera igenom checklistan igen.

## Implementation

### Automatisk validering

Efter att ett dokument skapats eller förbättrats:

1. **Gå igenom varje målgrupp:**
   - Läs checklistan för målgruppen
   - Identifiera vad som saknas i dokumentet
   - Markera saknade punkter

2. **Förbättra dokumentet:**
   - För varje saknad punkt, lägg till eller förbättra informationen
   - Uppdatera relevanta sektioner

3. **Iterera:**
   - Upprepa steg 1-2 tills alla checklistor är kompletta
   - Fortsätt tills alla målgrupper har all information de behöver

### Manuell validering

Om automatisk validering inte är möjlig:

1. **Gå igenom varje målgrupp manuellt:**
   - Läs checklistan för målgruppen
   - Läs dokumentet från målgruppens perspektiv
   - Identifiera vad som saknas

2. **Förbättra dokumentet:**
   - För varje saknad punkt, lägg till eller förbättra informationen
   - Uppdatera relevanta sektioner

3. **Iterera:**
   - Upprepa tills alla checklistor är kompletta

## Kvalitetskrav

**⚠️ VIKTIGT:** Ett dokument är INTE klart förrän alla målgrupper har all information de behöver.

**Kriterier för "klart":**
- ✅ Alla checklistor är kompletta
- ✅ Alla målgrupper kan utföra sitt arbete baserat på dokumentationen
- ✅ Inga viktiga delar saknas för någon målgrupp

## Exempel

### Exempel: Household-processen

**Validering för Produktägare:**
- ✅ Beskrivning av FGoal: Tydlig beskrivning av vad processen gör (kundaktivitet)
- ✅ Effekt: Konkreta effekter (t.ex. "minskar manuell datainmatning")
- ✅ User stories: Organiserade i kategorier (Kundperspektiv)
- ✅ Omfattning: Alla aktiviteter är dokumenterade
- ✅ Avgränsning: Tydliga scope boundaries

**Validering för Testare:**
- ✅ Testgenerering: Alla scenariotyper finns (Happy, Error, Edge)
- ✅ Processteg - Output: Alla error events är dokumenterade
- ✅ Omfattning: Alla aktiviteter är dokumenterade
- ✅ Beroenden: Externa system är dokumenterade
- ✅ Acceptanskriterier: Testbara krav med konkreta värden

**Osv. för alla målgrupper...**

## Permanent regel

**⚠️ DETTA ÄR EN PERMANENT REGEL SOM ALDRIG FÅR GLÖMMAS**

Efter att ett feature goal dokument skapats eller förbättrats, MÅSTE det valideras för alla målgrupper enligt processen ovan.

**Detta är en tidskrävande process men den är essentiell för att kvaliteten skall vara bra nog.**

