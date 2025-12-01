# Prompt för att starta Epic Documentation Improvements

## Använd denna prompt för att starta arbetet:

```
Jag vill förbättra dokumentationen för våra epics enligt planen i docs/EPIC_DOCUMENTATION_IMPROVEMENT_PLAN.md.

Börja med Fas 1: Arkitektur-diagram (Prioritet: Hög).

För de första 3-4 epics som identifierats i planen, lägg till:

1. **C4 System Context Diagram** (för serviceTask med externa integrationer)
   - Använd Mermaid-format
   - Visa epic/systemet i centrum
   - Externa system (SPAR, UC, Lantmäteriet, etc.)
   - Interna system (Application DB, Data Stores)
   - Användare (Customer, Handler)
   - Lägg till som ny subsection "Arkitekturdiagram" i Arkitektur-sektionen

2. **Sekvensdiagram** (för epics med komplexa interaktioner)
   - Använd Mermaid-format
   - Visa tidslinje för interaktioner
   - API-anrop och svar
   - Event-flöden
   - Felhantering
   - Lägg till efter "Funktionellt flöde" eller i Arkitektur-sektionen

3. **Komponentdiagram** (för komplexa epics med flera komponenter)
   - Använd Mermaid-format
   - Visa huvudkomponenter (API, Service, DMN Engine, etc.)
   - Databaser
   - Externa tjänster
   - Lägg till i Arkitektur-sektionen

Epics att börja med:
- fetch-personal-information (serviceTask, extern integration SPAR/Skatteverket)
- fetch-credit-information (serviceTask, extern integration UC/Bisnode/Creditsafe)
- assess-stakeholder (businessRuleTask, DMN)
- valuate-property (serviceTask, extern integration Lantmäteriet/Mäklarstatistik/Booli)

För varje epic:
1. Analysera nuvarande Arkitektur-sektion
2. Skapa relevanta Mermaid-diagram baserat på faktisk information från BPMN-filer och dokumentation
3. Lägg till diagrammen i HTML-filen på rätt plats
4. Se till att diagrammen är läsbara och inte för komplexa
5. Använd collapsible sections om diagrammen blir stora

Viktigt:
- Använd endast faktisk information, inte spekulativt innehåll
- Håll diagrammen enkla och läsbara
- Se till att Mermaid-syntaxen är korrekt
- Testa att diagrammen renderas korrekt

Börja med fetch-personal-information-v2.html och visa mig resultatet innan du fortsätter med de andra.
```

---

## Alternativ prompt för Fas 2: DMN/Business Rules

Om du vill börja med DMN istället:

```
Jag vill förbättra dokumentationen för våra epics enligt planen i docs/EPIC_DOCUMENTATION_IMPROVEMENT_PLAN.md.

Börja med Fas 2: DMN/Business Rules (Prioritet: Hög).

För businessRuleTask-epics, lägg till:

1. **DMN Decision Table Visualisering**
   - Skapa HTML-tabell som visar:
     - Input-kolumner (årsinkomst, DTI-ratio, kreditscore, etc.)
     - Output-kolumner (beslut, riskkategori, motivering)
     - Regler (rader i tabellen)
     - Hit policy (FIRST, UNIQUE, etc.)
   - Lägg till som ny subsection "DMN Decision Table" i "Affärsregler & Beroenden" sektionen

2. **DMN-filreferens**
   - Lägg till metadata om DMN-fil (om tillgänglig)
   - DMN-filnamn och version
   - Besluts-ID från DMN
   - Länk till DMN-fil om tillgänglig

3. **Regelträd / Decision Tree** (för komplexa DMN)
   - Använd Mermaid flowchart
   - Visa beslutsnoder, villkor, resultat
   - Lägg till efter DMN Decision Table

4. **Regelprioritering och tröskelvärden**
   - Skapa tydlig tabell med:
     - Tröskelvärden (t.ex. min årsinkomst: 200k SEK)
     - Prioritering av regler
     - Edge cases och specialfall
   - Lägg till i "Affärsregler & Beroenden"

Epics att börja med:
- assess-stakeholder (businessRuleTask, borrower capacity evaluation)
- pre-screen-party (businessRuleTask, eligibility check)
- evaluate-personal-information (businessRuleTask, borrower profile validation)

För varje epic:
1. Analysera nuvarande "Affärsregler & Beroenden" sektion
2. Extrahera beslutslogik från dokumentationen
3. Skapa DMN Decision Table baserat på faktisk information
4. Lägg till regelträd om reglerna är komplexa
5. Skapa tabell med tröskelvärden och prioritering

Viktigt:
- Använd endast faktisk information från dokumentationen
- Om DMN-filer finns, använd dem som källa
- Håll tabellerna läsbara, dela upp i flera tabeller om de blir för stora
- Se till att reglerna är tydliga och spårbara

Börja med assess-stakeholder-v2.html och visa mig resultatet innan du fortsätter med de andra.
```

---

## Alternativ prompt för Fas 3: Användarupplevelse

Om du vill börja med UX istället:

```
Jag vill förbättra dokumentationen för våra epics enligt planen i docs/EPIC_DOCUMENTATION_IMPROVEMENT_PLAN.md.

Börja med Fas 3: Användarupplevelse (Prioritet: Medium).

För userTask-epics, lägg till:

1. **User Journey Map**
   - Använd Mermaid flowchart eller tabell
   - Visa användarens resa genom steget
   - Touchpoints, emotioner/pain points, tidslinje
   - Lägg till i "Användarupplevelse" sektionen

2. **Interaktionsflöde** (för komplexa userTask)
   - Använd Mermaid flowchart
   - Visa UI-skärmar/steg, användarinteraktioner, systemresponser
   - Valideringar och felhantering
   - Lägg till i "Användarupplevelse" sektionen

3. **Förbättra strukturering**
   - Förbättra rollbaserad vy (kund vs handläggare)
   - Lägg till UI-komponenter och mockup-referenser
   - Förtydliga skillnader mellan roller

Epics att börja med:
- confirm-application (userTask, bekräftelse av ansökan)
- consent-to-credit-check (userTask, samtycke till kreditupplysning)
- register-loan-details (userTask, registrering av lånedetaljer)

För varje epic:
1. Analysera nuvarande "Användarupplevelse" sektion
2. Skapa User Journey Map baserat på steg-beskrivningarna
3. Skapa Interaktionsflöde för komplexa userTask
4. Förbättra strukturering av rollbaserad vy

Viktigt:
- Använd endast faktisk information från dokumentationen
- Håll diagrammen enkla och läsbara
- Fokusera på användarens perspektiv
- Se till att diagrammen är tydliga och begripliga

Börja med confirm-application-v2.html och visa mig resultatet innan du fortsätter med de andra.
```

---

## Tips för användning

1. **Börja med en epic** - Testa approach på en epic först
2. **Visa resultat** - Låt mig se resultatet innan du fortsätter
3. **Iterera** - Justera approach baserat på feedback
4. **Skala upp** - När approach är validerad, skala upp till fler epics

---

## Checklista innan du startar

- [ ] Läs igenom `docs/EPIC_DOCUMENTATION_IMPROVEMENT_PLAN.md`
- [ ] Välj vilken fas du vill börja med (Fas 1, 2, eller 3)
- [ ] Välj vilken epic du vill börja med
- [ ] Använd rätt prompt ovan
- [ ] Var beredd på att iterera baserat på feedback


