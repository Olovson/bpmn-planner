# Snabb bedömning: Vad behövs för E2E-tester

**Datum:** 2025-01-XX  
**Syfte:** Snabb översikt över vad som finns vs vad som behövs för att etablera E2E-tester

---

## Status: Vad vi HAR

### ✅ Befintliga E2E-scenarion (i `E2eTestsOverviewPage.tsx`)
1. **FG_CREDIT_DECISION_TC01** - Credit Decision Happy Path (P0)
2. **FG_APPLICATION_S1** - Application Normalflöde, en person (P0)

### ✅ Dokumentation och strategi
- `E2E_REALISTIC_SCENARIOS_STRATEGY.md` - Strategi för realistiska scenarion
- `E2E_SCENARIO_CREATION_CHECKLIST.md` - Checklista för att skapa scenarion
- `E2E_DEEP_ANALYSIS_KYC.md` - Exempel på djup analys
- `E2E_BPMN_COMPLETE_OVERVIEW.md` - Översikt över alla BPMN-filer

### ✅ Feature Goals
- 26 Feature Goal HTML-filer i `public/local-content/feature-goals/`
- Många har testscenarion (S1, S2, etc.) och UI Flow

---

## Vad vi BEHÖVER göra

### 1. Snabb mappning: Feature Goals → Testscenarion

**Uppgift:** Gå igenom alla Feature Goal HTML-filer och identifiera:
- Vilka har testscenarion (S1, S2, etc.)?
- Vilka saknar testscenarion?
- Vilka testscenarion är relevanta för E2E (hela flöden)?

**Output:** `docs/E2E_FEATURE_GOAL_MAPPING.md`

### 2. Identifiera E2E-scenarion baserat på helheten

**Uppgift:** Baserat på `E2E_BPMN_COMPLETE_OVERVIEW.md` och Feature Goals, identifiera:
- **P0 Happy Path-scenarion:**
  - Refinansiering (inte köp): Application → KYC → Credit Evaluation → Credit Decision → Offer → Signing → Disbursement
  - Köp: Application → Mortgage Commitment → Object Valuation → Credit Evaluation → KYC → Credit Decision → Offer → Signing → Disbursement
  - Med medsökare (multi-instance KYC och Stakeholder)

- **P0 Error Path-scenarion:**
  - Application avvisad (pre-screen)
  - KYC avvisad
  - Credit Decision avvisad

- **P1 Alternative Path-scenarion:**
  - Appeal-flöde
  - Advance-flöde
  - Skip bekräftelse

**Output:** `docs/E2E_SCENARIOS_IDENTIFIED.md`

### 3. Prioritera och bygg scenarion

**Uppgift:** För varje identifierat scenario:
1. Använd `E2E_SCENARIO_CREATION_CHECKLIST.md`
2. Extrahera BPMN-noder från faktiska BPMN-filer
3. Extrahera testscenarion från Feature Goals
4. Bygg `E2eScenario`-objekt enligt befintlig struktur
5. Lägg till i `E2eTestsOverviewPage.tsx`

---

## Rekommendation: Nästa steg

### Steg 1: Snabb mappning (15-30 min)
- Gå igenom Feature Goal HTML-filer
- Identifiera vilka som har testscenarion
- Skapa `E2E_FEATURE_GOAL_MAPPING.md`

### Steg 2: Identifiera E2E-scenarion (30-60 min)
- Baserat på BPMN-översikt och Feature Goal-mappning
- Identifiera 5-10 kritiska scenarion
- Prioritera (P0, P1, P2)
- Skapa `E2E_SCENARIOS_IDENTIFIED.md`

### Steg 3: Bygg första E2E-scenario (30-60 min)
- Välj ett P0-scenario (t.ex. "Application med medsökare")
- Följ checklistan
- Bygg `E2eScenario`-objekt
- Uppdatera `E2eTestsOverviewPage.tsx`

---

## Frågor att besvara

1. **Vilka Feature Goals har testscenarion?** → Mappning
2. **Vilka E2E-scenarion täcker hela flödet?** → Identifiering
3. **Vilka är mest kritiska?** → Prioritering
4. **Vilket scenario ska vi bygga först?** → Implementation

---

## Beslutspunkt

**Är vi redo att börja bygga E2E-scenarion?**

**JA, om:**
- ✅ Vi har BPMN-översikt (KLAR)
- ✅ Vi har strategi och checklistor (KLAR)
- ⏳ Vi har Feature Goal-mappning (BEHÖVS)
- ⏳ Vi har identifierade E2E-scenarion (BEHÖVS)

**Rekommendation:** Gör snabb mappning först (15-30 min), sedan identifiera scenarion (30-60 min), sedan bygg första scenariot.

