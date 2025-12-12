# Feature Goal Dokumentationssynkronisering - Analysrapport

**Genererad:** 2025-12-11T22:53:57.249Z
**BPMN-källa:** mortgage-se 2025.12.11 18:11
**Dokumentationskälla:** public/local-content/feature-goals

---

## 📊 Sammanfattning

- 🆕 **Nya feature goals (saknar dokumentation):** 0
- 🔄 **Potentiellt ändrade feature goals:** 3
- 🗑️  **Borttagna feature goals:** 0
- ✅ **Existerande dokumentation:** 19
- ⚠️  **Orphaned dokumentation (saknar feature goal):** 1

---

## 🔄 Potentiellt Ändrade Feature Goals

Dessa feature goals kan ha ändrats och dokumentationen bör granskas:

### Object (`object`)

- **Typ:** Call Activity
- **Parent Process:** mortgage-se-application.bpmn
- **Befintlig dokumentation:** `mortgage-se-object-control-v2.html`

**Identifierade ändringar:**
- Saknar 2 aktivitet(er) i dokumentationen: Valuate bostad, Purposes? (typer: serviceTask, inclusiveGateway)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `valuate-property` | Valuate bostad |
| Gateway (Inclusive) | `purposes` | Purposes? |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Document generation (`document-generation`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `mortgage-se-document-generation-document-generation-advance-v2.html`

**Identifierade ändringar:**
- Saknar 1 aktivitet(er) i dokumentationen: Prepare loan (typer: serviceTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `Activity_1qsvac1` | Prepare loan |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

### Document generation (`document-generation-advance`)

- **Typ:** Call Activity
- **Parent Process:** mortgage.bpmn
- **Befintlig dokumentation:** `mortgage-se-document-generation-document-generation-advance-v2.html`

**Identifierade ändringar:**
- Saknar 1 aktivitet(er) i dokumentationen: Prepare loan (typer: serviceTask)

**Saknade aktiviteter i dokumentationen:**

| Typ | ID | Namn |
|-----|----|------|
| Service Task | `Activity_1qsvac1` | Prepare loan |

**Åtgärd:** Granska och uppdatera dokumentationen om nödvändigt.

---

## ⚠️  Orphaned Dokumentation

Dessa dokumentationsfiler matchar inte längre någon feature goal i BPMN-filerna:

- `mortgage-Activity_17f0nvn-v2.html`
  - Senast ändrad: 2025-12-11T20:54:21.917Z

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