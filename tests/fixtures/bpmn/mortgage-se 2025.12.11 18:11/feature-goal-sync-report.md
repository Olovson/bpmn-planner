# Feature Goal Dokumentationssynkronisering - Analysrapport

**Genererad:** 2025-12-11T18:22:50.437Z
**BPMN-källa:** mortgage-se 2025.12.11 18:11
**Dokumentationskälla:** exports/feature-goals

---

## 📊 Sammanfattning

- 🆕 **Nya feature goals (saknar dokumentation):** 14
- 🔄 **Potentiellt ändrade feature goals:** 9
- 🗑️  **Borttagna feature goals:** 0
- ✅ **Existerande dokumentation:** 12
- ⚠️  **Orphaned dokumentation (saknar feature goal):** 22

---

## 🆕 Nya Feature Goals (Saknar Dokumentation)

Dessa feature goals (call activities eller subprocesses) finns i BPMN-filerna men saknar dokumentation:

### Internal data gathering (`internal-data-gathering`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn (Application)
- **Subprocess File:** mortgage-se-internal-data-gathering.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Object (`object`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn (Application)
- **Subprocess File:** mortgage-se-object.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Household (`household`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn (Application)
- **Subprocess File:** mortgage-se-household.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Stakeholder (`stakeholder`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn (Application)
- **Subprocess File:** mortgage-se-stakeholder.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Object control (`object-control`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn (Manual Credit Evaluation)
- **Subprocess File:** mortgage-se-object-control.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn (Manual Credit Evaluation)
- **Subprocess File:** mortgage-se-documentation-assessment.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Object information (`object-information`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn (Commitment)
- **Subprocess File:** mortgage-se-object-information.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn (Commitment)
- **Subprocess File:** mortgage-se-documentation-assessment.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Object information (`object-information`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object-control.bpmn (Object Control)
- **Subprocess File:** mortgage-se-object-information.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Object information (`object-information`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object.bpmn (Object)
- **Subprocess File:** mortgage-se-object-information.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn (Offer)
- **Subprocess File:** mortgage-se-documentation-assessment.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### Internal data gathering (`internal-data-gathering`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-stakeholder.bpmn (Stakeholder)
- **Subprocess File:** mortgage-se-internal-data-gathering.bpmn
- **Called Element:** Ej specificerad

**Åtgärd:** Skapa ny feature goal dokumentation för denna feature goal.

### KYC (`kyc`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn (Mortgage)
- **Subprocess File:** mortgage-se-kyc.bpmn
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

### Automatic Credit Evaluation (`Activity_1gzlxx4`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Select product, Determine amortisation (typer: businessRuleTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Business Rule Task | `select-product` | Select product |
| Business Rule Task | `determine-amortisation` | Determine amortisation |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-1`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Fetch price, Select product (typer: serviceTask, businessRuleTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-2`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Fetch price, Select product (typer: serviceTask, businessRuleTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-2`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object-control.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Select product, Determine amortisation (typer: businessRuleTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Business Rule Task | `select-product` | Select product |
| Business Rule Task | `determine-amortisation` | Determine amortisation |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Automatic-Credit-Evaluation-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Fetch price, Select product (typer: serviceTask, businessRuleTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Signing (`signing`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Signing-Advance-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Per signee, Per sign order (typer: subProcess)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| SubProcess | `per-signee` | Per signee |
| SubProcess | `per-sign-order` | Per sign order |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Offer preparation (`offer`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Offer-Credit-decision-v2.html`

**Identifierade ändringar:**
- Saknar 4 aktivitet(er) i dokumentationen: Upload sales contract, Documentation assessment, Sales contract assessed? (+1 fler) (typer: userTask, callActivity, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `upload-sales-contract` | Upload sales contract |
| Call Activity | `documentation-assessment` | Documentation assessment |
| Gateway (Exclusive) | `sales-contract-assessed` | Sales contract assessed? |
| Gateway (Exclusive) | `sales-contract-uploaded` | Sales contract uploaded? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Signing (`signing-advance`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Signing-Advance-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Per signee, Per sign order (typer: subProcess)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| SubProcess | `per-signee` | Per signee |
| SubProcess | `per-sign-order` | Per sign order |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Application (`application`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--Application-v2.html`

**Identifierade ändringar:**
- Saknar 1 aktivitet(er) i dokumentationen: KALP OK? (typer: exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Gateway (Exclusive) | `Gateway_0fhav15` | KALP OK? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

---

## ⚠️  Orphaned Dokumentation

Dessa dokumentationsfiler matchar inte längre någon feature goal i BPMN-filerna:

- `local--Application-Household-v2.html`
  - Senast ändrad: 2025-12-01T12:25:10.851Z
- `local--Application-Internal-data-gathering-v2.html`
  - Senast ändrad: 2025-12-01T12:25:10.851Z
- `local--Application-Object-v2.html`
  - Senast ändrad: 2025-12-01T12:25:10.851Z
- `local--Application-Stakeholder-v2.html`
  - Senast ändrad: 2025-12-01T12:25:10.851Z
- `local--Application-Stakeholders-v2.html`
  - Senast ändrad: 2025-12-01T12:25:10.851Z
- `local--Disbursement-Advance-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.427Z
- `local--Document-Generation-Advance-v2.html`
  - Senast ändrad: 2025-12-01T11:28:50.427Z
- `local--KALP-kvar-att-leva-pa-v2.html`
  - Senast ändrad: 2025-12-01T12:54:46.192Z
- `local--KYC-v2.html`
  - Senast ändrad: 2025-12-01T11:20:58.836Z
- `local--Manual-Credit-Evaluation-Automatic-Credit-Evaluation-v2.html`
  - Senast ändrad: 2025-12-01T12:28:28.368Z
- `local--Manual-Credit-Evaluation-Documentation-assessment-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.749Z
- `local--Mortgage-Commitment-Automatic-Credit-Evaluation-1-v2.html`
  - Senast ändrad: 2025-12-01T12:28:28.369Z
- `local--Mortgage-Commitment-Automatic-Credit-Evaluation-2-v2.html`
  - Senast ändrad: 2025-12-01T12:28:28.368Z
- `local--Mortgage-Commitment-Documentation-assessment-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.749Z
- `local--Mortgage-Commitment-Object-information-v2.html`
  - Senast ändrad: 2025-11-29T14:15:36.749Z
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

## ✅ Existerande Dokumentation (12 filer)

Dessa call activities har matchande dokumentation:

### Appeal

- `local--Appeal-v2.html`

### Application

- `local--Application-v2.html`

### Automatic-Credit-Evaluation

- `local--Automatic-Credit-Evaluation-v2.html`

### Automatic-Credit-Evaluation-For-each-household

- `local--Automatic-Credit-Evaluation-For-each-household-v2.html`

### Collateral-Registration

- `local--Collateral-Registration-v2.html`

### Credit-Decision

- `local--Credit-Decision-v2.html`

### Disbursement

- `local--Disbursement-v2.html`

### Document-Generation

- `local--Document-Generation-v2.html`

### Manual-Credit-Evaluation

- `local--Manual-Credit-Evaluation-v2.html`

### Mortgage-Commitment

- `local--Mortgage-Commitment-v2.html`

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