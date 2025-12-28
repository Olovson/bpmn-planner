# Komplett Fil-lista: Genereringsordning

## Datum: 2025-12-28

## 📋 Alla Filer i Genereringsordning

Med de nya ändringarna (topologisk fil-sortering + orderIndex-baserad sortering från root-processen) kommer filerna genereras i följande ordning:

**VIKTIGT:** Ordningen baseras på när filer anropas i root-processen (mortgage.bpmn), samma som test-coverage sidan visar från vänster till höger.

---

### 1. mortgage-se-application.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn (orderIndex: 1 - FÖRST!)
- **Noder:** 1 epic (Confirm application) + 4 Feature Goals (Household, Internal data gathering, Object, Stakeholder)

---

### 2. mortgage-se-credit-evaluation.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn (orderIndex: 2), mortgage-se-manual-credit-evaluation.bpmn
- **Noder:** 9 epics (Amortisation, Calculate household affordabilty, Evaluate application, Evaluate credit policies, Evaluate household, Evaluate stakeholders, Fetch price, Fetch product, Fetch risk classification)

---

### 3. mortgage-se-credit-decision.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn (orderIndex: 3), mortgage-se-offer.bpmn
- **Noder:** 4 epics (Credit decision rules, Evaluate application x3)

---

### 4. mortgage-se-mortgage-commitment.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn (orderIndex: 4)
- **Noder:** 1 epic (Decide on mortgage commitment) + 4 Feature Goals (Automatic Credit Evaluation x2, Documentation assessment, Object information)

---

### 5. mortgage-se-kyc.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn (orderIndex: 5)
- **Noder:** 5 epics (Evaluate KYC/AML, Fetch AML / KYC risk score, Fetch sanctions and PEP, Review KYC, Submit self declaration)

---

### 6. mortgage-se-offer.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn (orderIndex: 6)
- **Noder:** 2 epics (Decide on offer, Perform advanced underwriting) + 1 Feature Goal (Credit decision)

---

### 7. mortgage-se-signing.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn (orderIndex: 7)
- **Noder:** 5 epics (Create sign order, Distribute documents, Store signed documents, Upload document x2)

---

### 8. mortgage-se-disbursement.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn
- **Noder:** 6 epics (Archive documents, Control purchase disbusement requirements, Disburse loan, Disbursement control, Evaluate disbursement rules, Verify disbursement details)

---

### 2. mortgage-se-credit-decision.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn, mortgage-se-offer.bpmn
- **Noder:** 4 epics (Credit decision rules, Evaluate application x3)

---

### 3. mortgage-se-mortgage-commitment.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn
- **Noder:** 1 epic (Decide on mortgage commitment) + 4 Feature Goals (Automatic Credit Evaluation x2, Documentation assessment, Object information)

---

### 4. mortgage-se-application.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn
- **Noder:** 1 epic (Confirm application) + 4 Feature Goals (Household, Internal data gathering, Object, Stakeholder)

---

### 5. mortgage-se-document-generation.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn
- **Noder:** 2 epics (Generate Document, Select documents)

---

### 6. mortgage-se-documentation-assessment.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage-se-mortgage-commitment.bpmn, mortgage-se-manual-credit-evaluation.bpmn
- **Noder:** 2 epics (Analyse documentation, Assess documentation)

---

### 7. mortgage-se-offer.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn
- **Noder:** 2 epics (Decide on offer, Perform advanced underwriting) + 1 Feature Goal (Credit decision)

---

### 8. mortgage-se-signing.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage.bpmn
- **Noder:** 5 epics (Create sign order, Distribute documents, Store signed documents, Upload document x2)

---

### 9. mortgage.bpmn
- **Typ:** Root-process
- **Anropar:** Alla ovanstående subprocesser
- **Noder:** 15 Feature Goals (Appeal, Application, Automatic Credit Evaluation, Collateral registration, Credit decision, Disbursement x2, Document generation x2, KYC, Manual credit evaluation, Mortgage commitment, Offer, Signing x2)

---

### 15. mortgage-se-object.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage-se-application.bpmn
- **Noder:** 3 epics (Register loan details, Register source of equity, Valuate bostad) + 1 Feature Goal (Object information)

---

### 16. mortgage-se-household.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage-se-application.bpmn
- **Noder:** 1 epic (Register household economy infomation)

---

### 17. mortgage-se-object-information.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage-se-object.bpmn, mortgage-se-mortgage-commitment.bpmn
- **Noder:** 5 epics (Fetch bostadsrätts-information, Fetch BRF-information, Fetch fastighets-information, Screen bostadsrätt, Screen fastighet)

---

### 18. mortgage-se-stakeholder.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage-se-application.bpmn
- **Noder:** 6 epics (Assess stakeholder, Consent to credit check, Evaluate personal information, Fetch credit information, Fetch personal information, Register personal economy information)

---

### 19. mortgage-se-internal-data-gathering.bpmn
- **Typ:** Subprocess
- **Anropas av:** mortgage-se-application.bpmn
- **Noder:** 3 epics (Fetch engagements, Fetch party information, Pre-screen party)

---

## 📊 Sammanfattning

### Totalt:
- **Filer:** 19
- **Epics (tasks):** 64
- **Feature Goals (callActivities):** 27
- **Totala dokument:** 91

### Sorteringsprincip:
1. **Fil-sortering:** 
   - Först: Topologisk (subprocesser före parent)
   - Sedan: Baserat på orderIndex/visualOrderIndex från root-processen (mortgage.bpmn)
   - Detta matchar test-coverage sidan (från vänster till höger)
2. **Node-sortering:** OrderIndex → VisualOrderIndex → Node Type → Depth

### Viktiga Observationer:
- **Application kommer FÖRST** (orderIndex: 1 i mortgage.bpmn) - detta är korrekt!
- Subprocesser (t.ex. `mortgage-se-internal-data-gathering.bpmn`) genereras **FÖRE** parent-filer (t.ex. `mortgage-se-application.bpmn`)
- Epics i subprocess-filer genereras **FÖRE** Feature Goals för dessa subprocesser
- Feature Goals inkluderar epics från subprocess-filer via `graph.fileNodes.get(subprocessFile)`
- Filerna sorteras baserat på när de anropas i root-processen, inte alfabetiskt

