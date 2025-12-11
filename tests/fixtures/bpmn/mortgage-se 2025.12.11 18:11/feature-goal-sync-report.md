# Feature Goal Dokumentationssynkronisering - Analysrapport

**Genererad:** 2025-12-11T17:42:02.645Z
**BPMN-källa:** mortgage-se 2025.12.11 18:11
**Dokumentationskälla:** exports/feature-goals

---

## 📊 Sammanfattning

- 🆕 **Nya feature goals (saknar dokumentation):** 4
- 🔄 **Potentiellt ändrade feature goals:** 30
- 🗑️  **Borttagna feature goals:** 0
- ✅ **Existerande dokumentation:** 16
- ⚠️  **Orphaned dokumentation (saknar feature goal):** 18

---

## 🆕 Nya Feature Goals (Saknar Dokumentation)

Dessa feature goals (call activities eller subprocesses) finns i BPMN-filerna men saknar dokumentation:

### Object control (`object-control`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn (Manual Credit Evaluation)
- **Subprocess File:** mortgage-se-object-control.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### KYC (`kyc`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn (Mortgage)
- **Subprocess File:** mortgage-se-kyc.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Application (`application`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn (Mortgage)
- **Subprocess File:** mortgage-se-application.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Object valuation (`object-valuation`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn (Mortgage)
- **Subprocess File:** mortgage-se-object-valuation.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

---

## 🔄 Potentiellt Ändrade Feature Goals

Dessa feature goals kan ha ändrats och dokumentationen bör granskas:

### Internal data gathering (`internal-data-gathering`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `local--Application-Internal-data-gathering-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Object (`object`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `local--Application-Object-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Household (`household`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `local--Application-Household-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Stakeholder (`stakeholder`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `local--Application-Stakeholder-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn
- **Befintlig dokumentation:** `local--Manual-Credit-Evaluation-Documentation-assessment-v2.html`

**Identifierade ändringar:**
- Dokumentation är 12 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`Activity_1gzlxx4`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-1`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Object information (`object-information`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `local--Mortgage-Commitment-Object-information-v2.html`

**Identifierade ändringar:**
- Dokumentation är 12 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-2`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `local--Manual-Credit-Evaluation-Documentation-assessment-v2.html`

**Identifierade ändringar:**
- Dokumentation är 12 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Object information (`object-information`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object-control.bpmn
- **Befintlig dokumentation:** `local--Mortgage-Commitment-Object-information-v2.html`

**Identifierade ändringar:**
- Dokumentation är 12 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-2`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object-control.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Object information (`object-information`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object.bpmn
- **Befintlig dokumentation:** `local--Mortgage-Commitment-Object-information-v2.html`

**Identifierade ändringar:**
- Dokumentation är 12 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Credit decision (`credit-decision`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn
- **Befintlig dokumentation:** `local--Credit-Decision-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn
- **Befintlig dokumentation:** `local--Manual-Credit-Evaluation-Documentation-assessment-v2.html`

**Identifierade ändringar:**
- Dokumentation är 12 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Credit decision (`sales-contract-credit-decision`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn
- **Befintlig dokumentation:** `local--Credit-Decision-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Internal data gathering (`internal-data-gathering`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-stakeholder.bpmn
- **Befintlig dokumentation:** `local--Application-Internal-data-gathering-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Credit decision (`credit-decision`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Credit-Decision-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Signing (`signing`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Signing-Advance-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Disbursement (`disbursement`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Disbursement-Advance-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Offer preparation (`offer`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Offer-Credit-decision-v2.html`

**Identifierade ändringar:**
- Dokumentation är 12 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Collateral registration (`collateral-registration`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Collateral-Registration-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Mortgage commitment (`mortgage-commitment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Mortgage-Commitment-Automatic-Credit-Evaluation-1-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Signing (`signing-advance`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Signing-Advance-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Disbursement (`disbursement-advance`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Disbursement-Advance-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Document generation (`document-generation`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Document-Generation-Advance-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Document generation (`document-generation-advance`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Document-Generation-Advance-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Appeal (`appeal`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Appeal-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Manual credit evaluation (`manual-credit-evaluation`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Manual-Credit-Evaluation-Automatic-Credit-Evaluation-v2.html`

**Identifierade ändringar:**
- Dokumentation är 10 dagar gammal och kan vara inaktuell

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

---

## ⚠️  Orphaned Dokumentation

Dessa dokumentationsfiler matchar inte längre någon feature goal i BPMN-filerna:

- `local--Application-Stakeholders-v2.html`
  - Senast ändrad: 2025-12-01T12:25:10.851Z
- `local--Application-v2.html`
  - Senast ändrad: 2025-12-01T11:20:58.860Z
- `local--Automatic-Credit-Evaluation-v2.html`
  - Senast ändrad: 2025-12-01T11:20:58.836Z
- `local--Disbursement-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.407Z
- `local--Document-Generation-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.411Z
- `local--KALP-kvar-att-leva-pa-v2.html`
  - Senast ändrad: 2025-12-01T12:54:46.192Z
- `local--KYC-v2.html`
  - Senast ändrad: 2025-12-01T11:20:58.836Z
- `local--Manual-Credit-Evaluation-v2.html`
  - Senast ändrad: 2025-12-01T11:20:58.836Z
- `local--Mortgage-Commitment-Automatic-Credit-Evaluation-2-v2.html`
  - Senast ändrad: 2025-12-01T12:28:28.368Z
- `local--Mortgage-Commitment-Documentation-assessment-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.749Z
- `local--Mortgage-Commitment-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.407Z
- `local--Object-Object-information-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.749Z
- `local--Offer-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.407Z
- `local--Signing-Per-digital-document-package-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.749Z
- `local--Signing-Per-sign-order-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.756Z
- `local--Signing-Per-signee-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.750Z
- `local--Signing-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.407Z
- `local--Update-party-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.427Z

**Åtgärd:** Granska om dokumentationen fortfarande är relevant eller bör tas bort.

---

## ✅ Existerande Dokumentation (16 filer)

Dessa call activities har matchande dokumentation:

### Appeal

- `local--Appeal-v2.html`

### Application-Household

- `local--Application-Household-v2.html`

### Application-Internal-data-gathering

- `local--Application-Internal-data-gathering-v2.html`

### Application-Object

- `local--Application-Object-v2.html`

### Application-Stakeholder

- `local--Application-Stakeholder-v2.html`

### Automatic-Credit-Evaluation-For-each-household

- `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

### Collateral-Registration

- `local--Collateral-Registration-v2.html`

### Credit-Decision

- `local--Credit-Decision-v2.html`

### Disbursement-Advance

- `local--Disbursement-Advance-v2.html`

### Document-Generation-Advance

- `local--Document-Generation-Advance-v2.html`

### Manual-Credit-Evaluation-Automatic-Credit-Evaluation

- `local--Manual-Credit-Evaluation-Automatic-Credit-Evaluation-v2.html`

### Manual-Credit-Evaluation-Documentation-assessment

- `local--Manual-Credit-Evaluation-Documentation-assessment-v2.html`

### Mortgage-Commitment-Automatic-Credit-Evaluation-1

- `local--Mortgage-Commitment-Automatic-Credit-Evaluation-1-v2.html`

### Mortgage-Commitment-Object-information

- `local--Mortgage-Commitment-Object-information-v2.html`

### Offer-Credit-decision

- `local--Offer-Credit-decision-v2.html`

### Signing-Advance

- `local--Signing-Advance-v2.html`

---

*Rapporten genereras automatiskt av analyze-feature-goal-sync.ts*

**Nästa steg:**
1. Granska nya call activities och skapa dokumentation
2. Granska potentiellt ändrade call activities och uppdatera dokumentation
3. Granska orphaned dokumentation och ta beslut om borttagning