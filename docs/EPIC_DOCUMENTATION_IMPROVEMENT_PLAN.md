# Epic Documentation Improvement Plan

## Analys av nuvarande struktur

### Nuvarande sektioner i Epic-dokumentation:
1. ✅ **Syfte & Värde** - Bra, specifika beskrivningar
2. ✅ **Användarupplevelse** - Textbeskrivningar, men kan förbättras med visuella element
3. ✅ **Funktionellt flöde** - Steg-för-steg, men saknar visuella flödesdiagram
4. ✅ **Inputs & Datakällor** - Bra tabeller
5. ✅ **Outputs** - Bra tabeller
6. ⚠️ **Arkitektur & Systeminteraktioner** - Textbaserad, saknar visuella diagram
7. ⚠️ **API Dokumentation** - Grundläggande tabell, kan förbättras
8. ⚠️ **Affärsregler & Beroenden** - Textbaserad, DMN-tabeller saknas
9. ✅ **Test Information** - Bra struktur
10. ✅ **Implementation Notes** - Bra, tekniska detaljer
11. ✅ **Relaterade noder** - Bra länkar

---

## Förbättringsmöjligheter

### 1. Arkitektur-sektionen (Prioritet: Hög)

#### Nuvarande innehåll:
- System som interagerar (lista)
- Integrationer (API, Event, Databas)
- Teknisk stack (lista)

#### Förbättringar:

**1.1 C4 System Context Diagram** (För serviceTask och komplexa epics)
- **När**: Epics med externa integrationer (t.ex. fetch-personal-information, fetch-credit-information, valuate-property)
- **Vad**: Visuellt diagram som visar:
  - Epic/systemet i centrum
  - Externa system (SPAR, UC, Lantmäteriet, etc.)
  - Interna system (Application DB, Data Stores)
  - Användare (Customer, Handler)
- **Format**: Mermaid diagram eller SVG
- **Placering**: Efter "System som interagerar" underlistan

**1.2 Komponentdiagram** (För komplexa epics)
- **När**: Epics med flera komponenter (t.ex. assess-stakeholder med DMN, register-loan-details med Payment Calculator)
- **Vad**: Visuellt diagram som visar:
  - Huvudkomponenter (API, Service, DMN Engine, etc.)
  - Databaser
  - Externa tjänster
- **Format**: Mermaid diagram
- **Placering**: Efter System Context Diagram

**1.3 Sekvensdiagram** (För viktiga flöden)
- **När**: Epics med komplexa interaktioner (t.ex. fetch-credit-information med retry-logik, assess-stakeholder med DMN-anrop)
- **Vad**: Visuellt diagram som visar:
  - Tidslinje för interaktioner
  - API-anrop och svar
  - Event-flöden
  - Felhantering
- **Format**: Mermaid diagram
- **Placering**: Efter "Funktionellt flöde" eller i Arkitektur-sektionen

**1.4 Data Flow Diagram** (För data-intensiva epics)
- **När**: Epics som hanterar mycket data (t.ex. register-household-economy-information med aggregering)
- **Vad**: Visuellt diagram som visar:
  - Datakällor
  - Datatransformationer
  - Datamål
- **Format**: Mermaid diagram
- **Placering**: I Arkitektur-sektionen eller efter "Inputs & Datakällor"

**Implementation:**
- Använd Mermaid för alla diagram (stödjs redan i många markdown-renderare)
- Lägg till en ny subsection "Arkitekturdiagram" i Arkitektur-sektionen
- Skapa diagram per epic-typ (serviceTask, userTask, businessRuleTask)

---

### 2. Business Rules / DMN-dokumentation (Prioritet: Hög)

#### Nuvarande innehåll:
- Textbeskrivningar av regler
- Några nämner DMN men ingen visualisering
- Ingen tydlig koppling till DMN-filer

#### Förbättringar:

**2.1 DMN Decision Table Visualisering** (För businessRuleTask)
- **När**: Alla epics av typ businessRuleTask (t.ex. assess-stakeholder, pre-screen-party)
- **Vad**: Visuell tabell som visar:
  - Input-kolumner (årsinkomst, DTI-ratio, kreditscore, etc.)
  - Output-kolumner (beslut, riskkategori, motivering)
  - Regler (rader i tabellen)
  - Hit policy (FIRST, UNIQUE, etc.)
- **Format**: HTML-tabell med styling eller Mermaid flowchart
- **Placering**: I "Affärsregler & Beroenden" eller ny sektion "DMN Decision Logic"

**2.2 DMN-filreferens**
- **När**: Alla epics av typ businessRuleTask
- **Vad**: 
  - Länk till DMN-fil (om tillgänglig)
  - DMN-filnamn och version
  - Besluts-ID från DMN
- **Format**: Metadata i "Affärsregler & Beroenden" sektionen

**2.3 Regelträd / Decision Tree** (För komplexa DMN)
- **När**: Epics med komplexa beslutslogiker (t.ex. assess-stakeholder med flera kriterier)
- **Vad**: Visuellt träd som visar:
  - Beslutsnoder
  - Villkor
  - Resultat
- **Format**: Mermaid flowchart
- **Placering**: Efter DMN Decision Table

**2.4 Regelprioritering och tröskelvärden**
- **När**: Alla businessRuleTask
- **Vad**: Tydlig tabell med:
  - Tröskelvärden (t.ex. min årsinkomst: 200k SEK)
  - Prioritering av regler
  - Edge cases och specialfall
- **Format**: HTML-tabell
- **Placering**: I "Affärsregler & Beroenden"

**Implementation:**
- Skapa en ny subsection "DMN Decision Table" i "Affärsregler & Beroenden"
- Lägg till metadata om DMN-filreferens
- Generera decision tables från DMN-filer om möjligt, annars manuellt

---

### 3. Användarupplevelse (Prioritet: Medium)

#### Nuvarande innehåll:
- Textbeskrivningar
- Steg-listor
- Inga visuella element

#### Förbättringar:

**3.1 User Journey Map** (För userTask)
- **När**: Alla epics av typ userTask (t.ex. confirm-application, consent-to-credit-check)
- **Vad**: Visuellt diagram som visar:
  - Användarens resa genom steget
  - Touchpoints
  - Emotioner/pain points
  - Tidslinje
- **Format**: Mermaid flowchart eller tabell
- **Placering**: I "Användarupplevelse" sektionen

**3.2 UI Mockup-referenser**
- **När**: Alla userTask
- **Vad**: 
  - Länk till Figma-design (redan finns men kan förbättras)
  - Screenshot eller wireframe (om tillgängligt)
  - UI-komponenter som används
- **Format**: Bild eller länk
- **Placering**: I "Användarupplevelse" sektionen

**3.3 Interaktionsflöde** (För userTask)
- **När**: Komplexa userTask med flera steg (t.ex. register-loan-details)
- **Vad**: Visuellt diagram som visar:
  - UI-skärmar/steg
  - Användarinteraktioner
  - Systemresponser
  - Valideringar och felhantering
- **Format**: Mermaid flowchart
- **Placering**: I "Användarupplevelse" sektionen

**3.4 Rollbaserad vy** (För epics med flera roller)
- **När**: Epics som påverkar både kund och handläggare
- **Vad**: Tydlig separation av:
  - Kundens vy och steg
  - Handläggarens vy och steg
  - Skillnader och beroenden
- **Format**: Förbättrad strukturering av befintligt innehåll
- **Placering**: I "Användarupplevelse" sektionen (redan finns men kan förbättras)

**Implementation:**
- Förbättra strukturering av befintligt innehåll
- Lägg till User Journey Map för userTask
- Lägg till Interaktionsflöde för komplexa userTask

---

### 4. Funktionellt flöde (Prioritet: Medium)

#### Nuvarande innehåll:
- Steg-för-steg lista
- Textbeskrivningar av beslutslogik, felhantering, edge cases

#### Förbättringar:

**4.1 Process Flow Diagram** (För alla epics)
- **När**: Alla epics
- **Vad**: Visuellt diagram som visar:
  - Startpunkt
  - Steg (aktiviteter)
  - Gateways (beslutspunkter)
  - Slutpunkt
  - Felhantering
- **Format**: Mermaid flowchart
- **Placering**: Efter textbeskrivningen i "Funktionellt flöde"

**4.2 State Diagram** (För epics med tillstånd)
- **När**: Epics med tydliga tillstånd (t.ex. register-personal-economy-information med draft/completed)
- **Vad**: Visuellt diagram som visar:
  - Tillstånd (draft, in progress, completed, error)
  - Övergångar mellan tillstånd
  - Triggers för övergångar
- **Format**: Mermaid stateDiagram
- **Placering**: I "Funktionellt flöde" eller "Implementation Notes"

**Implementation:**
- Lägg till Process Flow Diagram för alla epics
- Lägg till State Diagram för epics med tillstånd

---

### 5. API Dokumentation (Prioritet: Low)

#### Nuvarande innehåll:
- Grundläggande tabell med endpoint, metod, syfte, länk

#### Förbättringar:

**5.1 OpenAPI/Swagger-referens**
- **När**: Epics med API-integrationer
- **Vad**: 
  - Länk till OpenAPI-specifikation
  - Request/Response-exempel
  - Felkoder och hantering
- **Format**: Länk eller inbäddad specifikation
- **Placering**: I "API Dokumentation" sektionen

**5.2 Request/Response-exempel**
- **När**: Epics med API-integrationer
- **Vad**: 
  - JSON-exempel för requests
  - JSON-exempel för responses
  - Felrespons-exempel
- **Format**: Code blocks med syntax highlighting
- **Placering**: I "API Dokumentation" sektionen

**Implementation:**
- Lägg till Request/Response-exempel för viktiga API:er
- Lägg till OpenAPI-referens om tillgängligt

---

## Implementeringsplan

### Fas 1: Arkitektur-diagram (Prioritet: Hög)
**Mål**: Lägg till visuella diagram för bättre förståelse av systemarkitektur

1. **C4 System Context Diagram**
   - Identifiera epics som behöver detta (serviceTask med externa integrationer)
   - Skapa Mermaid-diagram för varje relevant epic
   - Lägg till i Arkitektur-sektionen

2. **Sekvensdiagram**
   - Identifiera epics med komplexa interaktioner
   - Skapa Mermaid-diagram för viktiga flöden
   - Lägg till i Arkitektur-sektionen eller efter "Funktionellt flöde"

3. **Komponentdiagram**
   - Identifiera komplexa epics med flera komponenter
   - Skapa Mermaid-diagram
   - Lägg till i Arkitektur-sektionen

**Epics att börja med:**
- fetch-personal-information (serviceTask, extern integration)
- fetch-credit-information (serviceTask, extern integration)
- assess-stakeholder (businessRuleTask, DMN)
- valuate-property (serviceTask, extern integration)

### Fas 2: DMN/Business Rules (Prioritet: Hög)
**Mål**: Förbättra dokumentation av DMN-beslutslogik

1. **DMN Decision Table Visualisering**
   - Identifiera alla businessRuleTask
   - Skapa decision tables (manuellt eller från DMN-filer)
   - Lägg till i "Affärsregler & Beroenden" eller ny sektion

2. **DMN-filreferens**
   - Lägg till metadata om DMN-filer
   - Länka till DMN-filer om tillgängliga

3. **Regelträd**
   - Skapa decision trees för komplexa regler
   - Lägg till i "Affärsregler & Beroenden"

**Epics att börja med:**
- assess-stakeholder (businessRuleTask)
- pre-screen-party (businessRuleTask)
- evaluate-personal-information (businessRuleTask)

### Fas 3: Användarupplevelse (Prioritet: Medium)
**Mål**: Förbättra dokumentation av användarupplevelse

1. **User Journey Map**
   - Skapa för alla userTask
   - Lägg till i "Användarupplevelse" sektionen

2. **Interaktionsflöde**
   - Skapa för komplexa userTask
   - Lägg till i "Användarupplevelse" sektionen

3. **Förbättra strukturering**
   - Förbättra rollbaserad vy
   - Lägg till UI-komponenter och mockup-referenser

**Epics att börja med:**
- confirm-application (userTask)
- consent-to-credit-check (userTask)
- register-loan-details (userTask)

### Fas 4: Process Flow Diagram (Prioritet: Medium)
**Mål**: Lägg till visuella flödesdiagram

1. **Process Flow Diagram**
   - Skapa för alla epics
   - Lägg till i "Funktionellt flöde" sektionen

2. **State Diagram**
   - Skapa för epics med tillstånd
   - Lägg till i "Funktionellt flöde" eller "Implementation Notes"

### Fas 5: API Dokumentation (Prioritet: Low)
**Mål**: Förbättra API-dokumentation

1. **Request/Response-exempel**
   - Lägg till för viktiga API:er
   - Lägg till i "API Dokumentation" sektionen

2. **OpenAPI-referens**
   - Lägg till om tillgängligt

---

## Prioritering och rekommendationer

### Högsta prioritet (Bör implementeras först):
1. **C4 System Context Diagram** - Ger snabb överblick över systemarkitektur
2. **DMN Decision Table Visualisering** - Kritiskt för businessRuleTask
3. **Sekvensdiagram** - Viktigt för att förstå komplexa flöden

### Medium prioritet (Bör implementeras efter högsta):
4. **Process Flow Diagram** - Förbättrar förståelse av funktionellt flöde
5. **User Journey Map** - Viktigt för userTask
6. **Komponentdiagram** - För komplexa epics

### Låg prioritet (Kan implementeras senare):
7. **API Request/Response-exempel** - Bra att ha men inte kritiskt
8. **State Diagram** - Endast för epics med tydliga tillstånd

---

## Tekniska överväganden

### Mermaid-diagram
- **Fördelar**: 
  - Stödjs av många markdown-renderare
  - Textbaserat, lätt att versionera
  - Kan renderas till SVG/PNG
- **Nackdelar**: 
  - Kan bli komplexa för stora diagram
  - Begränsad styling

### HTML-tabeller för DMN
- **Fördelar**: 
  - Full kontroll över styling
  - Kan göras interaktiva
  - Lätt att läsa
- **Nackdelar**: 
  - Mer arbete att underhålla
  - Kan bli stora för komplexa tabeller

### Rekommendation:
- Använd **Mermaid** för alla diagram (process flow, sekvens, C4, etc.)
- Använd **HTML-tabeller** för DMN decision tables (bättre läsbarhet)
- Lägg till **collapsible sections** för stora diagram

---

## Nästa steg

1. **Review och godkännande** av denna plan
2. **Prioritera** vilka förbättringar som ska implementeras först
3. **Skapa exempel** för 2-3 epics för att validera approach
4. **Iterera** baserat på feedback
5. **Skala upp** till alla epics

---

## Anteckningar

- **Inte komplicera i onödan**: Lägg bara till diagram där de ger värde
- **Inte spekulativt**: Använd endast faktisk information från BPMN/DMN-filer
- **Läsbarhet**: Se till att dokumentationen inte blir för lång eller svårläst
- **Underhåll**: Överväg hur diagram ska underhållas när processer ändras


