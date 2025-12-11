# BPMN Ändringsöversikt: 2025.11.29 → 2025.12.08

Detta dokument innehåller en detaljerad översikt över alla ändringar i BPMN-filerna mellan versionerna.

**Genererad:** $(date)

## Sammanfattning

- 🆕 **Nya filer:** 2
- 🗑️ **Borttagna filer:** 0
- 🔄 **Filer med ändringar:** 14
- ✅ **Oförändrade filer:** 5

---

## 🆕 Nya Filer

### mortgage-se-object-control.bpmn
- **Process:** mortgage-se-object-control
- **CallActivities:** 2
- **SubProcesses:** 0
- **ServiceTasks:** 0
- **UserTasks:** 7
- **BusinessRuleTasks:** 0

### mortgage-se-object-valuation.bpmn
- **Process:** mortgage-se-object-valuation
- **CallActivities:** 0
- **SubProcesses:** 0
- **ServiceTasks:** 2
- **UserTasks:** 0
- **BusinessRuleTasks:** 0

---

## 🔄 Ändringar i Gemensamma Filer

### mortgage-se-application.bpmn

**SubProcesses:**
- 🔄 **Ändrade (1):**
  - `stakeholders`: namn ändrat från "Per stakeholder" → "Per household"

---

### mortgage-se-credit-decision.bpmn

**BusinessRuleTasks:**
- ➕ **Tillagda (1):**
  - Determine decision escalation (`determine-decision-escalation`)
- ➖ **Borttagna (1):**
  - Credit decision rules (`evaluate-credit-decision-rules`)

---

### mortgage-se-credit-evaluation.bpmn

**BusinessRuleTasks:**
- ➕ **Tillagda (2):**
  - Select product (`select-product`)
  - Determine amortisation (`determine-amortisation`)
- ➖ **Borttagna (2):**
  - Fetch product (`fetch-product`)
  - Amortisation (`evaluate-amortisation`)

---

### mortgage-se-disbursement.bpmn

**ServiceTasks:**
- ➕ **Tillagda (1):**
  - Handle disbursement (`handle-disbursement`)
- ➖ **Borttagna (1):**
  - Disburse loan (`disburse-loan`)

**UserTasks:**
- ➖ **Borttagna (3):**
  - Disbursement control (`disbursement-control`)
  - Verify disbursement details (`verify-disbursement-details`)
  - Control purchase disbusement requirements (`control-purchase-disbursement-requirements`)

**BusinessRuleTasks:**
- ➖ **Borttagna (1):**
  - Evaluate disbursement rules (`evaluate-disbursement-rules`)

---

### mortgage-se-document-generation.bpmn

**ServiceTasks:**
- ➕ **Tillagda (1):**
  - Prepare loan (`Activity_1qsvac1`)

---

### mortgage-se-documentation-assessment.bpmn

**UserTasks:**
- ➕ **Tillagda (1):**
  - Review changes (`review-changes`)

---

### mortgage-se-internal-data-gathering.bpmn

**BusinessRuleTasks:**
- ➕ **Tillagda (1):**
  - Screen party (`screen-party`)
- ➖ **Borttagna (1):**
  - Pre-screen party (`pre-screen-party`)

---

### mortgage-se-kyc.bpmn

**ServiceTasks:**
- ➕ **Tillagda (1):**
  - Fetch KYC (`fetch-kyc`)

---

### mortgage-se-manual-credit-evaluation.bpmn

**CallActivities:**
- ➕ **Tillagda (1):**
  - Object control (`object-control`) → `mortgage-se-object-control`

**UserTasks:**
- ➕ **Tillagda (1):**
  - Upload documentation (`auw-upload-documentation`)
- ➖ **Borttagna (1):**
  - Determine object value (`decide-object-value`)

**BusinessRuleTasks:**
- ➖ **Borttagna (1):**
  - Evaluate requirements (`evaluate-requirements`)

---

### mortgage-se-mortgage-commitment.bpmn

**SubProcesses:**
- ➕ **Tillagda (1):**
  - Activity_1xrvxr3 (`Activity_1xrvxr3`)

---

### mortgage-se-object-information.bpmn

**ServiceTasks:**
- ➖ **Borttagna (1):**
  - Fetch bostadsrätts-information (`fetch-bostadsratts-information`)
- 🔄 **Ändrade (1):**
  - `fetch-brf-information`: namn ändrat från "Fetch BRF-information" → "Fetch BRF information"

---

### mortgage-se-offer.bpmn

**CallActivities:**
- ➕ **Tillagda (2):**
  - Documentation assessment (`documentation-assessment`) → `mortgage-se-documentation-assessment`
  - Credit decision (`sales-contract-credit-decision`) → `mortgage-se-credit-decision`

**UserTasks:**
- ➕ **Tillagda (2):**
  - Upload sales contract (`upload-sales-contract`)
  - Perform advanced underwriting (`sales-contract-advanced-underwriting`)

---

### mortgage-se-stakeholder.bpmn

**BusinessRuleTasks:**
- ➕ **Tillagda (2):**
  - Screen personal information (`screen-personal-information`)
  - Screen stakeholder (`screen-stakeholder`)
- ➖ **Borttagna (2):**
  - Evaluate personal information (`evaluate-personal-information`)
  - Assess stakeholder (`assess-stakeholder`)

---

### mortgage.bpmn

**CallActivities:**
- ➕ **Tillagda (1):**
  - Object valuation (`object-valuation`) → `mortgage-se-object-valuation`
- 🔄 **Ändrade (1):**
  - `offer`: namn ändrat från "Offer" → "Offer preparation"

---

## 📊 Detaljerad Statistik

### Totalt antal element per typ

**CallActivities:**
- Tillagda: 4
- Borttagna: 0
- Ändrade: 1

**SubProcesses:**
- Tillagda: 2
- Borttagna: 0
- Ändrade: 1

**ServiceTasks:**
- Tillagda: 4
- Borttagna: 2
- Ändrade: 1

**UserTasks:**
- Tillagda: 4
- Borttagna: 4

**BusinessRuleTasks:**
- Tillagda: 6
- Borttagna: 6

---

## 🔍 Viktiga Observationer

1. **Nya processer:**
   - `mortgage-se-object-control` - Ny process för objektkontroll med 7 UserTasks
   - `mortgage-se-object-valuation` - Ny process för objektvärdering med 2 ServiceTasks

2. **Omstruktureringar:**
   - `mortgage-se-stakeholder`: BusinessRuleTasks omdöpta från "Evaluate/Assess" till "Screen"
   - `mortgage-se-credit-evaluation`: BusinessRuleTasks omdöpta från "Fetch/Evaluate" till "Select/Determine"
   - `mortgage-se-disbursement`: Flera UserTasks och BusinessRuleTasks borttagna, ersatta med en ServiceTask

3. **Nya kopplingar:**
   - `mortgage-se-manual-credit-evaluation` anropar nu `mortgage-se-object-control`
   - `mortgage.bpmn` anropar nu `mortgage-se-object-valuation`
   - `mortgage-se-offer` anropar nu `mortgage-se-documentation-assessment` och `mortgage-se-credit-decision`

---

*Detta dokument genereras automatiskt med `scripts/compare-bpmn-versions.ts`*
