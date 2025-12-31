# Exakt Genereringsordning

**Datum:** 2025-12-29

**Metod:** Topologisk sortering → visualOrderIndex/orderIndex från root
(Subprocesser genereras FÖRE parent-filer)

## EXAKT Genereringsordning - Varje Dokument En Per Rad

| # | Fil | Typ | Dokument |
|---|-----|-----|----------|
| 1 | mortgage-se-internal-data-gathering | Epic | fetch-party-information |
| 2 | mortgage-se-internal-data-gathering | Epic | pre-screen-party |
| 3 | mortgage-se-internal-data-gathering | Epic | fetch-engagements |
| 4 | mortgage-se-internal-data-gathering.bpmn | Combined | File-level documentation |
| 5 | mortgage.bpmn | Feature Goal | se-stakeholder-internal-data-gathering |
| 6 | mortgage-se-stakeholder | Epic | consent-to-credit-check |
| 7 | mortgage-se-stakeholder | Epic | fetch-personal-information |
| 8 | mortgage-se-stakeholder | Epic | screen-personal-information |
| 9 | mortgage-se-stakeholder | Epic | register-personal-economy-information |
| 10 | mortgage-se-stakeholder.bpmn | Combined | File-level documentation |
| 11 | mortgage-se-household | Epic | register-household-economy-information |
| 12 | mortgage-se-household.bpmn | Combined | File-level documentation |
| 13 | mortgage-se-object-information | Epic | fetch-fastighets-information |
| 14 | mortgage-se-object-information | Epic | evaluate-fastighet |
| 15 | mortgage-se-object-information | Epic | evaluate-bostadsratt |
| 16 | mortgage-se-object-information | Epic | fetch-brf-information |
| 17 | mortgage-se-object-information.bpmn | Combined | File-level documentation |
| 18 | mortgage.bpmn | Feature Goal | se-object-object-information |
| 19 | mortgage-se-object | Epic | register-source-of-equity |
| 20 | mortgage-se-object | Epic | register-loan-details |
| 21 | mortgage-se-object | Epic | valuate-property |
| 22 | mortgage-se-object.bpmn | Combined | File-level documentation |
| 23 | mortgage.bpmn | Feature Goal | se-application-internal-data-gathering |
| 24 | mortgage.bpmn | Feature Goal | se-application-stakeholder |
| 25 | mortgage.bpmn | Feature Goal | se-application-object |
| 26 | mortgage.bpmn | Feature Goal | se-application-household |
| 27 | mortgage-se-application | Epic | confirm-application |
| 28 | mortgage-se-application.bpmn | Combined | File-level documentation |
| 29 | mortgage-se-credit-evaluation | Epic | select-product |
| 30 | mortgage-se-credit-evaluation | Epic | fetch-price |
| 31 | mortgage-se-credit-evaluation | Epic | determine-amortisation |
| 32 | mortgage-se-credit-evaluation | Epic | fetch-risk-classification |
| 33 | mortgage-se-credit-evaluation | Epic | evaluate-application |
| 34 | mortgage-se-credit-evaluation | Epic | evaluate-credit-policies |
| 35 | mortgage-se-credit-evaluation | Epic | calculate-household-affordability |
| 36 | mortgage-se-credit-evaluation | Epic | evaluate-household |
| 37 | mortgage-se-credit-evaluation | Epic | evaluate-stakeholders |
| 38 | mortgage-se-credit-evaluation | Epic | fetch-credit-information |
| 39 | mortgage-se-credit-evaluation.bpmn | Combined | File-level documentation |
| 40 | mortgage-se-documentation-assessment | Epic | assess-documentation |
| 41 | mortgage-se-documentation-assessment | Epic | review-changes |
| 42 | mortgage-se-documentation-assessment | Epic | analyse-documentation |
| 43 | mortgage-se-documentation-assessment.bpmn | Combined | File-level documentation |
| 44 | mortgage.bpmn | Feature Goal | se-mortgage-commitment-credit-evaluation-1 |
| 45 | mortgage.bpmn | Feature Goal | se-mortgage-commitment-object-information |
| 46 | mortgage.bpmn | Feature Goal | se-mortgage-commitment-credit-evaluation-2 |
| 47 | mortgage.bpmn | Feature Goal | se-mortgage-commitment-documentation-assessment |
| 48 | mortgage-se-mortgage-commitment | Epic | decide-mortgage-commitment |
| 49 | mortgage-se-mortgage-commitment.bpmn | Combined | File-level documentation |
| 50 | mortgage-se-appeal | Epic | screen-appeal |
| 51 | mortgage-se-appeal | Epic | submit-appeal |
| 52 | mortgage-se-appeal.bpmn | Combined | File-level documentation |
| 53 | mortgage.bpmn | Feature Goal | se-manual-credit-evaluation-documentation-assessment |
| 54 | mortgage.bpmn | Feature Goal | se-manual-credit-evaluation-Activity_1gzlxx4 |
| 55 | mortgage-se-manual-credit-evaluation | Epic | upload-documentation |
| 56 | mortgage-se-manual-credit-evaluation | Epic | advanced-underwriting |
| 57 | mortgage-se-manual-credit-evaluation | Epic | auw-upload-documentation |
| 58 | mortgage-se-manual-credit-evaluation | Epic | fetch-credit-information |
| 59 | mortgage-se-manual-credit-evaluation.bpmn | Combined | File-level documentation |
| 60 | mortgage-se-kyc | Epic | fetch-kyc |
| 61 | mortgage-se-kyc | Epic | review-kyc |
| 62 | mortgage-se-kyc | Epic | fetch-aml-kyc-risk |
| 63 | mortgage-se-kyc | Epic | fetch-screening-and-sanctions |
| 64 | mortgage-se-kyc | Epic | assess-kyc-aml |
| 65 | mortgage-se-kyc | Epic | submit-self-declaration |
| 66 | mortgage-se-kyc.bpmn | Combined | File-level documentation |
| 67 | mortgage-se-credit-decision | Epic | determine-decision-escalation |
| 68 | mortgage-se-credit-decision | Epic | evaluate-application-board |
| 69 | mortgage-se-credit-decision | Epic | evaluate-application-committee |
| 70 | mortgage-se-credit-decision | Epic | evaluate-application-four-eyes |
| 71 | mortgage-se-credit-decision.bpmn | Combined | File-level documentation |
| 72 | mortgage.bpmn | Feature Goal | se-offer-credit-decision |
| 73 | mortgage.bpmn | Feature Goal | se-offer-documentation-assessment |
| 74 | mortgage.bpmn | Feature Goal | se-offer-sales-contract-credit-decision |
| 75 | mortgage-se-offer | Epic | advanced-underwriting |
| 76 | mortgage-se-offer | Epic | decide-offer |
| 77 | mortgage-se-offer | Epic | upload-sales-contract |
| 78 | mortgage-se-offer | Epic | sales-contract-advanced-underwriting |
| 79 | mortgage-se-offer.bpmn | Combined | File-level documentation |
| 80 | mortgage-se-document-generation | Epic | select-documents |
| 81 | mortgage-se-document-generation | Epic | generate-documents |
| 82 | mortgage-se-document-generation | Epic | Activity_1qsvac1 |
| 83 | mortgage-se-document-generation.bpmn | Combined | File-level documentation |
| 84 | mortgage-se-signing | Epic | distribute-manual-documents |
| 85 | mortgage-se-signing | Epic | upload-manual-document |
| 86 | mortgage-se-signing | Epic | store-signed-document |
| 87 | mortgage-se-signing | Epic | upload-document |
| 88 | mortgage-se-signing | Epic | create-signing-order |
| 89 | mortgage-se-signing.bpmn | Combined | File-level documentation |
| 90 | mortgage-se-disbursement | Epic | handle-disbursement |
| 91 | mortgage-se-disbursement | Epic | archive-documents |
| 92 | mortgage-se-disbursement.bpmn | Combined | File-level documentation |
| 93 | mortgage-se-collateral-registration | Epic | distribute-notice-of-pledge-to-brf |
| 94 | mortgage-se-collateral-registration | Epic | distribute-ansokan-till-inskrivningsmyndigheten |
| 95 | mortgage-se-collateral-registration | Epic | verify |
| 96 | mortgage-se-collateral-registration.bpmn | Combined | File-level documentation |
| 97 | mortgage.bpmn | Feature Goal | credit-evaluation |
| 98 | mortgage.bpmn | Feature Goal | credit-decision |
| 99 | mortgage.bpmn | Feature Goal | signing |
| 100 | mortgage.bpmn | Feature Goal | disbursement |
| 101 | mortgage.bpmn | Feature Goal | offer |
| 102 | mortgage.bpmn | Feature Goal | collateral-registration |
| 103 | mortgage.bpmn | Feature Goal | mortgage-commitment |
| 104 | mortgage.bpmn | Feature Goal | kyc |
| 105 | mortgage.bpmn | Feature Goal | signing-advance |
| 106 | mortgage.bpmn | Feature Goal | disbursement-advance |
| 107 | mortgage.bpmn | Feature Goal | document-generation |
| 108 | mortgage.bpmn | Feature Goal | document-generation-advance |
| 109 | mortgage.bpmn | Feature Goal | application |
| 110 | mortgage.bpmn | Feature Goal | appeal |
| 111 | mortgage.bpmn | Feature Goal | manual-credit-evaluation |
| 112 | mortgage.bpmn | Combined | File-level documentation |
| 113 | mortgage.bpmn | Feature Goal | Root Feature Goal (mortgage) |

## Genereringsordning per Fil

### 1. mortgage-se-internal-data-gathering.bpmn

**Combined:** File-level documentation

---

### 2. mortgage-se-stakeholder.bpmn

**Combined:** File-level documentation

---

### 3. mortgage-se-household.bpmn

**Combined:** File-level documentation

---

### 4. mortgage-se-object-information.bpmn

**Combined:** File-level documentation

---

### 5. mortgage-se-object.bpmn

**Combined:** File-level documentation

---

### 6. mortgage-se-application.bpmn

**Combined:** File-level documentation

---

### 7. mortgage-se-credit-evaluation.bpmn

**Combined:** File-level documentation

---

### 8. mortgage-se-documentation-assessment.bpmn

**Combined:** File-level documentation

---

### 9. mortgage-se-mortgage-commitment.bpmn

**Combined:** File-level documentation

---

### 10. mortgage-se-appeal.bpmn

**Combined:** File-level documentation

---

### 11. mortgage-se-manual-credit-evaluation.bpmn

**Combined:** File-level documentation

---

### 12. mortgage-se-kyc.bpmn

**Combined:** File-level documentation

---

### 13. mortgage-se-credit-decision.bpmn

**Combined:** File-level documentation

---

### 14. mortgage-se-offer.bpmn

**Combined:** File-level documentation

---

### 15. mortgage-se-document-generation.bpmn

**Combined:** File-level documentation

---

### 16. mortgage-se-signing.bpmn

**Combined:** File-level documentation

---

### 17. mortgage-se-disbursement.bpmn

**Combined:** File-level documentation

---

### 18. mortgage-se-collateral-registration.bpmn

**Combined:** File-level documentation

---

### 19. mortgage.bpmn

**Feature Goals (31):**
- 1. se-stakeholder-internal-data-gathering
- 2. se-object-object-information
- 3. se-application-internal-data-gathering
- 4. se-application-stakeholder
- 5. se-application-object
- 6. se-application-household
- 7. se-mortgage-commitment-credit-evaluation-1
- 8. se-mortgage-commitment-object-information
- 9. se-mortgage-commitment-credit-evaluation-2
- 10. se-mortgage-commitment-documentation-assessment
- 11. se-manual-credit-evaluation-documentation-assessment
- 12. se-manual-credit-evaluation-Activity_1gzlxx4
- 13. se-offer-credit-decision
- 14. se-offer-documentation-assessment
- 15. se-offer-sales-contract-credit-decision
- 16. credit-evaluation
- 17. credit-decision
- 18. signing
- 19. disbursement
- 20. offer
- 21. collateral-registration
- 22. mortgage-commitment
- 23. kyc
- 24. signing-advance
- 25. disbursement-advance
- 26. document-generation
- 27. document-generation-advance
- 28. application
- 29. appeal
- 30. manual-credit-evaluation
- 31. Root Feature Goal (mortgage)

**Combined:** File-level documentation

---

## Sammanfattning

- **Totala filer:** 19
- **Totala Feature Goals:** 31
- **Totala Epics:** 63
- **Totala Combined:** 19
- **Totala dokument:** 113
