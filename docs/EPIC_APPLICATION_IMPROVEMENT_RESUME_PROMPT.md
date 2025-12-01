# Resume Prompt: Application Epic Improvements

**Använd denna prompt för att återuppta arbetet med Application Epic-förbättringar:**

---

## Prompt

```
Jag vill fortsätta förbättra dokumentationen för Application-epics enligt planen i docs/EPIC_APPLICATION_IMPROVEMENT_PLAN.md.

Kontrollera först status i docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md (skapa filen om den saknas) för att se vad som redan är klart.

Fortsätt sedan med nästa fas enligt planen:

**Fas 1: Processkontext & Översikt** (Prioritet: Hög)
- Lägg till sektion "Processkontext" efter "Syfte & Värde" för alla Application-epics
- Skapa Mermaid flowchart som visar:
  - Application-processen som övergripande kontext
  - Vilken subprocess epicen tillhör
  - Föregående steg (inputs)
  - Efterföljande steg (outputs)
  - Parallella steg (om relevant)

**Fas 2: API Dokumentation - Standardisering** (Prioritet: Hög)
- Standardisera och förbättra API-dokumentation för alla serviceTask och businessRuleTask epics
- Lägg till request/response scheman, autentisering, felkoder, externa API:er

**Fas 3: Beroenden & Relaterade Noder** (Prioritet: Medium)
- Förbättra "Relaterade noder" sektionen med visuellt beroendediagram (Mermaid flowchart)

**Fas 4: Felhantering & Edge Cases** (Prioritet: Medium)
- Strukturera felhantering bättre, eventuellt som egen sektion

**Alla Application-epics (19 st):**
1. fetch-party-information (internal-data-gathering)
2. fetch-engagements (internal-data-gathering)
3. pre-screen-party (internal-data-gathering)
4. consent-to-credit-check (stakeholder)
5. fetch-personal-information (stakeholder)
6. fetch-credit-information (stakeholder)
7. evaluate-personal-information (stakeholder)
8. assess-stakeholder (stakeholder)
9. register-personal-economy-information (stakeholder)
10. register-household-economy-information (household)
11. register-source-of-equity (object)
12. register-loan-details (object)
13. valuate-property (object)
14. fetch-fastighets-information (object-information)
15. evaluate-fastighet (object-information)
16. fetch-bostadsratts-information (object-information)
17. fetch-brf-information (object-information)
18. evaluate-bostadsratt (object-information)
19. confirm-application (application direkt)

**Viktigt:**
- Uppdatera status-filen efter varje epic som är klar
- Följ exempel-strukturen i planen
- Använd Mermaid för alla diagram
- Behåll befintlig struktur och styling
- Testa att diagrammen renderas korrekt

Börja med nästa ofullständiga fas och visa mig resultatet innan du fortsätter.
```

---

## Alternativ prompt för specifik fas

Om du vill fortsätta med en specifik fas:

### Fas 1: Processkontext

```
Jag vill lägga till "Processkontext" sektion för Application-epics enligt Fas 1 i docs/EPIC_APPLICATION_IMPROVEMENT_PLAN.md.

Kontrollera status i docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md och fortsätt med nästa epic som saknar Processkontext-sektion.

För varje epic:
1. Lägg till sektion "Processkontext" efter "Syfte & Värde"
2. Skapa Application Process Flow diagram (Mermaid)
3. Skapa Subprocess Flow diagram (om relevant)
4. Beskriv epicens position i processen
5. Lista föregående och efterföljande steg

Uppdatera status-filen efter varje epic som är klar.
```

### Fas 2: API Dokumentation

```
Jag vill standardisera och förbättra API-dokumentation för Application-epics enligt Fas 2 i docs/EPIC_APPLICATION_IMPROVEMENT_PLAN.md.

Kontrollera status i docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md och fortsätt med nästa serviceTask eller businessRuleTask epic som behöver förbättrad API-dokumentation.

För varje epic:
1. Lägg till "API Dokumentation" sektion (om saknas)
2. Dokumentera exponerade API-endpoints (request/response)
3. Dokumentera externa API:er som används
4. Lägg till felkoder och felhantering
5. Lägg till autentisering (om relevant)
6. Lägg till rate limiting (om relevant)

Uppdatera status-filen efter varje epic som är klar.
```

### Fas 3: Beroenden

```
Jag vill förbättra "Relaterade noder" sektionen för Application-epics enligt Fas 3 i docs/EPIC_APPLICATION_IMPROVEMENT_PLAN.md.

Kontrollera status i docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md och fortsätt med nästa epic som behöver förbättrad beroende-sektion.

För varje epic:
1. Lägg till beroendediagram (Mermaid flowchart)
2. Strukturera beroenden (Föregående, Efterföljande, Parallella)
3. Uppdatera textbeskrivning med tydligare struktur

Uppdatera status-filen efter varje epic som är klar.
```

### Fas 4: Felhantering

```
Jag vill strukturera felhantering bättre för Application-epics enligt Fas 4 i docs/EPIC_APPLICATION_IMPROVEMENT_PLAN.md.

Kontrollera status i docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md och fortsätt med nästa epic som behöver förbättrad felhantering.

För varje epic:
1. Flytta eller förbättra felhantering från "Funktionellt flöde"
2. Strukturera enligt kategorier (Tekniska, Affärsrelaterade, Edge cases)
3. Lägg till retry-strategier (om relevant)

Uppdatera status-filen efter varje epic som är klar.
```

---

## Tips för användning

1. **Börja med status-kontroll** - Läs status-filen först för att se vad som är klart
2. **En fas i taget** - Fokusera på en fas åt gången
3. **Uppdatera status** - Markera varje epic som klar i status-filen
4. **Visa resultat** - Visa resultatet för en epic innan du fortsätter med nästa
5. **Iterera** - Justera approach baserat på feedback

---

## Checklista innan du startar

- [ ] Läs igenom `docs/EPIC_APPLICATION_IMPROVEMENT_PLAN.md`
- [ ] Kontrollera eller skapa `docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md`
- [ ] Välj vilken fas du vill fortsätta med
- [ ] Använd rätt prompt ovan
- [ ] Var beredd på att iterera baserat på feedback

---

## Referensfiler

- **Plan:** `docs/EPIC_APPLICATION_IMPROVEMENT_PLAN.md`
- **Status:** `docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md` (skapa om saknas)
- **Analys:** `docs/EPIC_ANALYSIS_APPLICATION_EPICS.md`
- **Exempel:** Se planen för exempel-struktur

