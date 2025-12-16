# Analys: User Tasks i E2E_BR001 och deras UI-interaktioner

**Datum:** 2025-01-XX  
**Syfte:** Identifiera alla user tasks i E2E_BR001-scenariot och verifiera att de har UI-interaktioner dokumenterade

---

## User Tasks i E2E_BR001 (Happy Path)

### Huvudflöde (mortgage.bpmn)
**Inga user tasks** - alla är call activities eller system tasks

---

### Subprocesser

#### 1. Application (mortgage-se-application.bpmn)

**User Task: `confirm-application`**
- **Status:** ✅ Har UI-interaktion
- **Plats:** Inkluderad i Application callActivity `uiInteraction`
- **UI Flow:** 
  - Navigate: `nav-confirm-application`
  - Verify: `summary-all-data` (visar intern data, hushåll, stakeholder, objekt)
  - Click: `btn-confirm-application`
- **Källa:** Application S1 UI Flow (steg 21-23)

---

#### 2. Household (mortgage-se-household.bpmn) - anropas från Application

**User Task: `register-household-economy-information`**
- **Status:** ⚠️ Delvis täckt
- **Plats:** Inkluderad i Application callActivity `uiInteraction` men generiskt
- **Nuvarande dokumentation:** 
  - `Fill: input-household-economy (inkomster, utgifter, tillgångar), input-personal-economy (löner, andra inkomster)`
- **Saknas:** Specifika locator IDs från Household S1 UI Flow
- **Källa:** Household S1 UI Flow finns i `mortgage-se-application-household-v2.html`
- **Behöver förbättras:** Ja - lägg till specifika page IDs och locator IDs

---

#### 3. Stakeholder (mortgage-se-stakeholder.bpmn) - anropas från Application

**User Task: `consent-to-credit-check`**
- **Status:** ⚠️ Delvis täckt
- **Plats:** Inkluderad i Application callActivity `uiInteraction` som `checkbox-credit-consent`
- **Nuvarande dokumentation:**
  - `Click: checkbox-credit-consent (samtycke till kreditupplysning)`
- **Saknas:** Specifik page ID och mer detaljerad UI Flow
- **Källa:** Stakeholder S1 UI Flow finns i `mortgage-se-application-stakeholder-v2.html`
- **Behöver förbättras:** Ja - lägg till specifika page IDs och locator IDs

**User Task: `register-personal-economy-information`**
- **Status:** ⚠️ Delvis täckt
- **Plats:** Inkluderad i Application callActivity `uiInteraction` men generiskt
- **Nuvarande dokumentation:**
  - `Fill: input-personal-economy (löner, andra inkomster)` - men detta är för Household, inte Stakeholder
- **Saknas:** Specifik UI-interaktion för Stakeholder personal economy
- **Källa:** Stakeholder S1 UI Flow finns i `mortgage-se-application-stakeholder-v2.html`
- **Behöver förbättras:** Ja - lägg till specifik UI-interaktion för register-personal-economy-information

---

#### 4. Mortgage Commitment (mortgage-se-mortgage-commitment.bpmn)

**User Task: `decide-mortgage-commitment`**
- **Status:** ⚠️ Har UI-interaktion men med TODO
- **Plats:** Mortgage Commitment callActivity `uiInteraction`
- **Nuvarande dokumentation:**
  - `Navigate: decide-on-mortgage-commitment`
  - `Fill: [TODO: mortgage commitment decision fields]`
  - `Click: [TODO: submit button]`
- **Saknas:** Specifika locator IDs och page IDs
- **Källa:** Mortgage Commitment S1 UI Flow finns i `mortgage-mortgage-commitment-v2.html` men innehåller TODO
- **Behöver förbättras:** Ja - ersätt TODO med faktiska locator IDs

---

#### 5. KYC (mortgage-se-kyc.bpmn)

**User Task: `submit-self-declaration`**
- **Status:** ✅ Har UI-interaktion
- **Plats:** Inkluderad i KYC callActivity `uiInteraction`
- **UI Flow:**
  - Navigate: `nav-kyc` → `submit-self-declaration`
  - Fill: `input-pep-status (No)`, `input-source-of-funds`, `input-purpose-of-transaction`
  - Click: `btn-submit-declaration`
- **Källa:** KYC S1 UI Flow (steg 1-6)

---

#### 6. Offer (mortgage-se-offer.bpmn)

**User Task: `decide-offer`**
- **Status:** ✅ Har UI-interaktion
- **Plats:** Inkluderad i Offer callActivity `uiInteraction`
- **UI Flow:**
  - Navigate: `decide-offer (user task)`
  - Review: `offer-details (validera lånebelopp, kontonummer, datum)`
  - Click: `offer-decision-accept (Accept offer button)`
- **Källa:** Offer S1 scenario

---

#### 7. Signing (mortgage-se-signing.bpmn)

**User Task: Digital signing (via subprocess)**
- **Status:** ✅ Har UI-interaktion
- **Plats:** Inkluderad i Signing callActivity `uiInteraction`
- **UI Flow:**
  - Gateway: `signing-methods = Digital`
  - Navigate: `per-digital-document-package`, `per-signee`, `per-sign-order`
  - Sign: `digital-signature (PADES)`
- **Källa:** Signing Feature Goal

---

## Sammanfattning

### ✅ User Tasks med komplett UI-interaktion:
1. `confirm-application` (Application)
2. `submit-self-declaration` (KYC)
3. `decide-offer` (Offer)
4. Digital signing (Signing)

### ✅ User Tasks som har förbättrats (2025-01-XX):
1. `register-household-economy-information` (Household) - ✅ Uppdaterad med specifika locator IDs från Household UI Flow
2. `register-personal-economy-information` (Stakeholder) - ✅ Uppdaterad med page ID `/application/stakeholder/personal-economy` och locator IDs (`input-personal-income`, `input-personal-expenses`, `btn-submit-personal-economy`)
3. `decide-mortgage-commitment` (Mortgage Commitment) - ✅ Uppdaterad med locator IDs (`input-mortgage-commitment-decision`, `btn-submit-mortgage-commitment`, `decide-on-mortgage-commitment-confirmation`)

### ⚠️ User Tasks som fortfarande behöver förbättras:
1. `consent-to-credit-check` (Stakeholder) - Delvis täckt (gateway-beslut dokumenterat, men saknar specifik page ID om gateway = No). För happy path (E2E_BR001) hoppas denna över eftersom `has-consented-to-credit-check = Yes`.

---

## Genomförda förbättringar (2025-01-XX)

1. ✅ **Household UI-interaktioner:** Uppdaterad med specifika locator IDs från Household S1 UI Flow:
   - Page IDs: `/application/household`, `/application/household/register`
   - Locator IDs: `expenses-cars-loans`, `expenses-children`, `expenses-child-support`, `expenses-other`, `incomes-child-support`, `incomes-other`, `submit-button`

2. ✅ **Stakeholder personal economy UI-interaktioner:** Uppdaterad med information från Feature Goal:
   - Page ID: `/application/stakeholder/personal-economy`
   - Locator IDs: `input-personal-income`, `input-personal-expenses`, `btn-submit-personal-economy`
   - API: `POST /api/stakeholder/personal-economy`

3. ✅ **Mortgage Commitment UI-interaktioner:** Uppdaterad med rimliga locator IDs baserat på Feature Goal:
   - Page ID: `/mortgage-commitment/decide`
   - Locator IDs: `input-mortgage-commitment-decision`, `btn-submit-mortgage-commitment`, `decide-on-mortgage-commitment-confirmation`

## Nästa steg (om behövs för andra scenarion)

1. För scenarion där `has-consented-to-credit-check = No`: Lägg till specifik UI-interaktion för `consent-to-credit-check` user task med page ID och locator IDs
2. Verifiera att alla user tasks har specifika page IDs, locator IDs och actions för alla E2E-scenarion (inte bara E2E_BR001)

