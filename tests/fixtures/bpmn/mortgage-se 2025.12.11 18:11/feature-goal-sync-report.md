# Feature Goal Dokumentationssynkronisering - Analysrapport

**Genererad:** 2025-12-11T18:41:18.344Z
**BPMN-källa:** mortgage-se 2025.12.11 18:11
**Dokumentationskälla:** exports/feature-goals

---

## 📊 Sammanfattning

- 🆕 **Nya feature goals (saknar dokumentation):** 0
- 🔄 **Potentiellt ändrade feature goals:** 18
- 🗑️  **Borttagna feature goals:** 0
- ✅ **Existerande dokumentation:** 26
- ⚠️  **Orphaned dokumentation (saknar feature goal):** 14

---

## 🔄 Potentiellt Ändrade Feature Goals

Dessa feature goals kan ha ändrats och dokumentationen bör granskas:

### Object (`object`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `local--Application-Object-v2.html`

**Identifierade ändringar:**
- Saknar 5 aktivitet(er) i dokumentationen: Register source of equity, Register loan details, Purposes? (+2 fler) (typer: userTask, inclusiveGateway, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `register-source-of-equity` | Register source of equity |
| User Task | `register-loan-details` | Register loan details |
| Gateway (Inclusive) | `purposes` | Purposes? |
| Gateway (Exclusive) | `needs-valuation` | Needs valuation? |
| Gateway (Exclusive) | `skip-register-source-of-equity` | Skip step? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Stakeholder (`stakeholder`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `local--Application-Stakeholder-v2.html`

**Identifierade ändringar:**
- Saknar 3 aktivitet(er) i dokumentationen: Consent to credit check, Has consented to credit check?, Did consent? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `consent-to-credit-check` | Consent to credit check |
| Gateway (Exclusive) | `has-consented-to-credit-check` | Has consented to credit check? |
| Gateway (Exclusive) | `did-consent-to-credit-check` | Did consent? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Object control (`object-control`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn
- **Befintlig dokumentation:** `local--mortgage-se-manual-credit-evaluation-object-control-v2.html`

**Identifierade ändringar:**
- Saknar 13 aktivitet(er) i dokumentationen: Register BRF information, Review BRF, Upload documentation (+10 fler) (typer: userTask, callActivity, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `register-brf-information` | Register BRF information |
| User Task | `review-brf` | Review BRF |
| User Task | `upload-documentation` | Upload documentation |
| User Task | `review-changes` | Review changes |
| Call Activity | `credit-evaluation-2` | Automatic Credit Evaluation |
| Gateway (Exclusive) | `has-brf-information` | Has updated BRF information |
| Gateway (Exclusive) | `changes-requires-rescoring` | Changes requires rescoring |
| Gateway (Exclusive) | `brf-screening-result` | BRF screening result |
| Gateway (Exclusive) | `brf-approved` | BRF approved |
| Gateway (Exclusive) | `is-bostadsratt` | Is bostadsrätt? |
| Gateway (Exclusive) | `needs-valuation` | Needs valuation? |
| Gateway (Exclusive) | `changes-accepted` | Changes accepted? |
| Gateway (Exclusive) | `stakeholder-review` | Stakeholder review? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn
- **Befintlig dokumentation:** `local--Manual-Credit-Evaluation-Documentation-assessment-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Review changes, Changes accepted? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `review-changes` | Review changes |
| Gateway (Exclusive) | `changes-accepted` | Changes accepted? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

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

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `local--Mortgage-Commitment-Documentation-assessment-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Review changes, Changes accepted? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `review-changes` | Review changes |
| Gateway (Exclusive) | `changes-accepted` | Changes accepted? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Object information (`object-information`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object-control.bpmn
- **Befintlig dokumentation:** `local--mortgage-se-object-control-object-information-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Screen fastighet, Screen bostadsrätt (typer: businessRuleTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Business Rule Task | `evaluate-fastighet` | Screen fastighet |
| Business Rule Task | `evaluate-bostadsratt` | Screen bostadsrätt |

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

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn
- **Befintlig dokumentation:** `local--mortgage-se-offer-documentation-assessment-v2.html`

**Identifierade ändringar:**
- Saknar 3 aktivitet(er) i dokumentationen: Review changes, Stakeholder review?, Changes accepted? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `review-changes` | Review changes |
| Gateway (Exclusive) | `stakeholder-review` | Stakeholder review? |
| Gateway (Exclusive) | `changes-accepted` | Changes accepted? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Internal data gathering (`internal-data-gathering`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-stakeholder.bpmn
- **Befintlig dokumentation:** `local--mortgage-se-stakeholder-internal-data-gathering-v2.html`

**Identifierade ändringar:**
- Saknar 4 aktivitet(er) i dokumentationen: Fetch party information, Fetch engagements, Screen party (+1 fler) (typer: serviceTask, businessRuleTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-party-information` | Fetch party information |
| Service Task | `fetch-engagements` | Fetch engagements |
| Business Rule Task | `screen-party` | Screen party |
| Gateway (Exclusive) | `is-party-rejected` | Party rejected? |

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

### KYC (`kyc`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `local--mortgage-kyc-v2.html`

**Identifierade ändringar:**
- Saknar 3 aktivitet(er) i dokumentationen: Fetch sanctions and PEP, Submit self declaration, Needs review? (typer: serviceTask, userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-screening-and-sanctions` | Fetch sanctions and PEP |
| User Task | `submit-self-declaration` | Submit self declaration |
| Gateway (Exclusive) | `needs-review` | Needs review? |

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
- Saknar 2 aktivitet(er) i dokumentationen: KALP, KALP OK? (typer: serviceTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `Activity_0p3rqyp` | KALP |
| Gateway (Exclusive) | `Gateway_0fhav15` | KALP OK? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

---

## ⚠️  Orphaned Dokumentation

Dessa dokumentationsfiler matchar inte längre någon feature goal i BPMN-filerna:

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
- `local--Mortgage-Commitment-Automatic-Credit-Evaluation-1-v2.html`
  - Senast ändrad: 2025-12-01T12:28:28.369Z
- `local--Mortgage-Commitment-Automatic-Credit-Evaluation-2-v2.html`
  - Senast ändrad: 2025-12-01T12:28:28.368Z
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

## ✅ Existerande Dokumentation (26 filer)

Dessa call activities har matchande dokumentation:

### Appeal

- `local--Appeal-v2.html`

### Application

- `local--Application-v2.html`

### Application-Household

- `local--Application-Household-v2.html`

### Application-Internal-data-gathering

- `local--Application-Internal-data-gathering-v2.html`

### Application-Object

- `local--Application-Object-v2.html`

### Application-Stakeholder

- `local--Application-Stakeholder-v2.html`

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

### Manual-Credit-Evaluation-Documentation-assessment

- `local--Manual-Credit-Evaluation-Documentation-assessment-v2.html`

### Mortgage-Commitment

- `local--Mortgage-Commitment-v2.html`

### Mortgage-Commitment-Documentation-assessment

- `local--Mortgage-Commitment-Documentation-assessment-v2.html`

### Mortgage-Commitment-Object-information

- `local--Mortgage-Commitment-Object-information-v2.html`

### Object-Object-information

- `local--Object-Object-information-v2.html`

### Offer-Credit-decision

- `local--Offer-Credit-decision-v2.html`

### Signing-Advance

- `local--Signing-Advance-v2.html`

### mortgage-kyc

- `local--mortgage-kyc-v2.html`

### mortgage-object-valuation

- `local--mortgage-object-valuation-v2.html`

### mortgage-se-manual-credit-evaluation-object-control

- `local--mortgage-se-manual-credit-evaluation-object-control-v2.html`

### mortgage-se-object-control-object-information

- `local--mortgage-se-object-control-object-information-v2.html`

### mortgage-se-offer-documentation-assessment

- `local--mortgage-se-offer-documentation-assessment-v2.html`

### mortgage-se-stakeholder-internal-data-gathering

- `local--mortgage-se-stakeholder-internal-data-gathering-v2.html`

---

*Rapporten genereras automatiskt av analyze-feature-goal-sync.ts*

**Nästa steg:**
1. Granska nya call activities och skapa dokumentation
2. Granska potentiellt ändrade call activities och uppdatera dokumentation
3. Granska orphaned dokumentation och ta beslut om borttagning