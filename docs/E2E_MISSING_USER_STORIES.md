# Saknade User Stories för E2E-tester

**Syfte:** Notera när vi upptäcker att det saknas user stories i Feature Goals för att kunna bygga kompletta E2E-tester.

**Process:** När vi bygger E2E-tester och upptäcker att det saknas user stories för att täcka ett scenario eller funktionalitet, noterar vi det här så att Feature Goals kan förbättras senare.

---

## Noteringar

### 2025-01-XX - E2E_BR001

**E2E-scenario:** E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)  
**Feature Goal:** `public/local-content/feature-goals/mortgage-se-application-stakeholder-v2.html`  
**Saknas:** UI Flow-tabell för S1 (Normalflöde – komplett process) innehåller bara TODO. Specifika page IDs, locator IDs och navigationssteg saknas för:
- `consent-to-credit-check` user task
- `register-personal-economy-information` user task
- Navigationssteg mellan user tasks
**Varför:** Behövs för att kunna implementera faktiska Playwright-tester med specifika locators och page IDs.  
**Föreslagen user story:** Komplettera UI Flow-tabellen med specifika page IDs (t.ex. `/application/stakeholder/consent`, `/application/stakeholder/register-economy`), locator IDs (t.ex. `btn-consent-to-credit-check`, `input-personal-income`, `input-personal-expenses`), och navigationssteg.

---

### 2025-01-XX - E2E_BR001

**E2E-scenario:** E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)  
**Feature Goal:** `public/local-content/feature-goals/mortgage-mortgage-commitment-v2.html`  
**Saknas:** UI Flow-tabell för S1 innehåller TODO för locator IDs och testdata. Specifika locator IDs saknas för:
- `decide-mortgage-commitment` user task fält
- Submit-knapp locator
- Bekräftelsemeddelande locator
**Varför:** Behövs för att kunna implementera faktiska Playwright-tester med specifika locators.  
**Föreslagen user story:** Komplettera UI Flow-tabellen med specifika locator IDs (t.ex. `input-mortgage-commitment-decision`, `btn-submit-mortgage-commitment`, `success-message-mortgage-commitment`) och testdata-profil.

---

## Format för noteringar

När vi noterar saknade user stories, använder vi följande format:

```markdown
### [Datum] - [E2E-scenario ID]

**E2E-scenario:** [Namn på E2E-scenario]
**Feature Goal:** [Feature Goal-fil]
**Saknas:** [Beskrivning av vad som saknas]
**Varför:** [Varför behövs detta för E2E-testet]
**Föreslagen user story:** [Förslag på user story om möjligt]
```

---

## Status

- **Totalt antal noteringar:** 0
- **Senast uppdaterad:** [Datum när vi börjar implementera]

