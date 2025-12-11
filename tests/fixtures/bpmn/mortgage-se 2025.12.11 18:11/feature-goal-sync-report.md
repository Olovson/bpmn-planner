# Feature Goal Dokumentationssynkronisering - Analysrapport

**Genererad:** 2025-12-11T21:18:29.555Z
**BPMN-källa:** mortgage-se 2025.12.11 18:11
**Dokumentationskälla:** public/local-content/feature-goals

---

## 📊 Sammanfattning

- 🆕 **Nya feature goals (saknar dokumentation):** 0
- 🔄 **Potentiellt ändrade feature goals:** 15
- 🗑️  **Borttagna feature goals:** 0
- ✅ **Existerande dokumentation:** 19
- ⚠️  **Orphaned dokumentation (saknar feature goal):** 13

---

## 🔄 Potentiellt Ändrade Feature Goals

Dessa feature goals kan ha ändrats och dokumentationen bör granskas:

### Object (`object`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `mortgage-se-object-control-v2.html`

**Identifierade ändringar:**
- Saknar 5 aktivitet(er) i dokumentationen: Valuate bostad, Register source of equity, Purposes? (+2 fler) (typer: serviceTask, userTask, inclusiveGateway, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `valuate-property` | Valuate bostad |
| User Task | `register-source-of-equity` | Register source of equity |
| Gateway (Inclusive) | `purposes` | Purposes? |
| Gateway (Exclusive) | `needs-valuation` | Needs valuation? |
| Gateway (Exclusive) | `skip-register-source-of-equity` | Skip step? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Stakeholder (`stakeholder`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `mortgage-se-stakeholder-v2.html`

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
- **Befintlig dokumentation:** `mortgage-se-object-control-v2.html`

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
- **Befintlig dokumentation:** `mortgage-se-documentation-assessment-v2.html`

**Identifierade ändringar:**
- Saknar 3 aktivitet(er) i dokumentationen: Review changes, Stakeholder review?, Changes accepted? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `review-changes` | Review changes |
| Gateway (Exclusive) | `stakeholder-review` | Stakeholder review? |
| Gateway (Exclusive) | `changes-accepted` | Changes accepted? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`Activity_1gzlxx4`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-manual-credit-evaluation.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`

**Identifierade ändringar:**
- Saknar 7 aktivitet(er) i dokumentationen: Fetch price, Select product, Evaluate application (+4 fler) (typer: serviceTask, businessRuleTask, subProcess)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |
| Business Rule Task | `evaluate-application` | Evaluate application |
| Business Rule Task | `evaluate-household` | Evaluate household |
| Business Rule Task | `evaluate-stakeholders` | Evaluate stakeholders |
| SubProcess | `loop-household` | For each household |
| SubProcess | `loop-stakeholder` | For each stakeholder |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-1`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`

**Identifierade ändringar:**
- Saknar 7 aktivitet(er) i dokumentationen: Fetch price, Select product, Evaluate application (+4 fler) (typer: serviceTask, businessRuleTask, subProcess)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |
| Business Rule Task | `evaluate-application` | Evaluate application |
| Business Rule Task | `evaluate-household` | Evaluate household |
| Business Rule Task | `evaluate-stakeholders` | Evaluate stakeholders |
| SubProcess | `loop-household` | For each household |
| SubProcess | `loop-stakeholder` | For each stakeholder |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-2`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`

**Identifierade ändringar:**
- Saknar 7 aktivitet(er) i dokumentationen: Fetch price, Select product, Evaluate application (+4 fler) (typer: serviceTask, businessRuleTask, subProcess)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |
| Business Rule Task | `evaluate-application` | Evaluate application |
| Business Rule Task | `evaluate-household` | Evaluate household |
| Business Rule Task | `evaluate-stakeholders` | Evaluate stakeholders |
| SubProcess | `loop-household` | For each household |
| SubProcess | `loop-stakeholder` | For each stakeholder |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-mortgage-commitment.bpmn
- **Befintlig dokumentation:** `mortgage-se-documentation-assessment-v2.html`

**Identifierade ändringar:**
- Saknar 3 aktivitet(er) i dokumentationen: Review changes, Stakeholder review?, Changes accepted? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `review-changes` | Review changes |
| Gateway (Exclusive) | `stakeholder-review` | Stakeholder review? |
| Gateway (Exclusive) | `changes-accepted` | Changes accepted? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation-2`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-object-control.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`

**Identifierade ändringar:**
- Saknar 7 aktivitet(er) i dokumentationen: Fetch price, Select product, Evaluate application (+4 fler) (typer: serviceTask, businessRuleTask, subProcess)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |
| Business Rule Task | `evaluate-application` | Evaluate application |
| Business Rule Task | `evaluate-household` | Evaluate household |
| Business Rule Task | `evaluate-stakeholders` | Evaluate stakeholders |
| SubProcess | `loop-household` | For each household |
| SubProcess | `loop-stakeholder` | For each stakeholder |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Credit decision (`credit-decision`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-decision-sales-contract-credit-decision-v2.html`

**Identifierade ändringar:**
- Saknar 1 aktivitet(er) i dokumentationen: Reevaluate? (typer: exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Gateway (Exclusive) | `reevaluate` | Reevaluate? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Documentation assessment (`documentation-assessment`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn
- **Befintlig dokumentation:** `mortgage-se-documentation-assessment-v2.html`

**Identifierade ändringar:**
- Saknar 3 aktivitet(er) i dokumentationen: Review changes, Stakeholder review?, Changes accepted? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `review-changes` | Review changes |
| Gateway (Exclusive) | `stakeholder-review` | Stakeholder review? |
| Gateway (Exclusive) | `changes-accepted` | Changes accepted? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Credit decision (`sales-contract-credit-decision`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-offer.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-decision-sales-contract-credit-decision-v2.html`

**Identifierade ändringar:**
- Saknar 1 aktivitet(er) i dokumentationen: Reevaluate? (typer: exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Gateway (Exclusive) | `reevaluate` | Reevaluate? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Automatic Credit Evaluation (`credit-evaluation`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`

**Identifierade ändringar:**
- Saknar 7 aktivitet(er) i dokumentationen: Fetch price, Select product, Evaluate application (+4 fler) (typer: serviceTask, businessRuleTask, subProcess)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `fetch-price` | Fetch price |
| Business Rule Task | `select-product` | Select product |
| Business Rule Task | `evaluate-application` | Evaluate application |
| Business Rule Task | `evaluate-household` | Evaluate household |
| Business Rule Task | `evaluate-stakeholders` | Evaluate stakeholders |
| SubProcess | `loop-household` | For each household |
| SubProcess | `loop-stakeholder` | For each stakeholder |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Credit decision (`credit-decision`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `mortgage-se-credit-decision-sales-contract-credit-decision-v2.html`

**Identifierade ändringar:**
- Saknar 1 aktivitet(er) i dokumentationen: Reevaluate? (typer: exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Gateway (Exclusive) | `reevaluate` | Reevaluate? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Offer preparation (`offer`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `mortgage-se-offer-v2.html`

**Identifierade ändringar:**
- Saknar 3 aktivitet(er) i dokumentationen: Upload sales contract, Sales contract assessed?, Sales contract uploaded? (typer: userTask, exclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| User Task | `upload-sales-contract` | Upload sales contract |
| Gateway (Exclusive) | `sales-contract-assessed` | Sales contract assessed? |
| Gateway (Exclusive) | `sales-contract-uploaded` | Sales contract uploaded? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

---

## ⚠️  Orphaned Dokumentation

Dessa dokumentationsfiler matchar inte längre någon feature goal i BPMN-filerna:

- `mortgage-Activity_17f0nvn-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.917Z
- `mortgage-se-credit-decision-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.936Z
- `mortgage-se-credit-evaluation-credit-evaluation-1-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.941Z
- `mortgage-se-credit-evaluation-credit-evaluation-2-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.942Z
- `mortgage-se-credit-evaluation-loop-household-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.947Z
- `mortgage-se-credit-evaluation-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.951Z
- `mortgage-se-disbursement-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.956Z
- `mortgage-se-document-generation-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.960Z
- `mortgage-se-object-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.970Z
- `mortgage-se-signing-per-sign-order-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.973Z
- `mortgage-se-signing-per-signee-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.974Z
- `mortgage-se-signing-signing-advance-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.975Z
- `mortgage-se-signing-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.976Z

**Åtgärd:** Granska om dokumentationen fortfarande är relevant eller bör tas bort.

---

## ✅ Existerande Dokumentation (19 filer)

Dessa call activities har matchande dokumentation:

### mortgage-se-appeal

- `mortgage-se-appeal-v2.html`

### mortgage-se-application

- `mortgage-se-application-v2.html`

### mortgage-se-collateral-registration

- `mortgage-se-collateral-registration-v2.html`

### mortgage-se-credit-decision-sales-contract-credit-decision

- `mortgage-se-credit-decision-sales-contract-credit-decision-v2.html`

### mortgage-se-credit-evaluation-Activity_1gzlxx4

- `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`

### mortgage-se-disbursement-disbursement-advance

- `mortgage-se-disbursement-disbursement-advance-v2.html`

### mortgage-se-document-generation-document-generation-advance

- `mortgage-se-document-generation-document-generation-advance-v2.html`

### mortgage-se-documentation-assessment

- `mortgage-se-documentation-assessment-v2.html`

### mortgage-se-household

- `mortgage-se-household-v2.html`

### mortgage-se-internal-data-gathering

- `mortgage-se-internal-data-gathering-v2.html`

### mortgage-se-kyc

- `mortgage-se-kyc-v2.html`

### mortgage-se-manual-credit-evaluation

- `mortgage-se-manual-credit-evaluation-v2.html`

### mortgage-se-mortgage-commitment

- `mortgage-se-mortgage-commitment-v2.html`

### mortgage-se-object-control

- `mortgage-se-object-control-v2.html`

### mortgage-se-object-information

- `mortgage-se-object-information-v2.html`

### mortgage-se-object-valuation

- `mortgage-se-object-valuation-v2.html`

### mortgage-se-offer

- `mortgage-se-offer-v2.html`

### mortgage-se-signing-per-digital-document-package

- `mortgage-se-signing-per-digital-document-package-v2.html`

### mortgage-se-stakeholder

- `mortgage-se-stakeholder-v2.html`

---

*Rapporten genereras automatiskt av analyze-feature-goal-sync.ts*

**Nästa steg:**
1. Granska nya call activities och skapa dokumentation
2. Granska potentiellt ändrade call activities och uppdatera dokumentation
3. Granska orphaned dokumentation och ta beslut om borttagning