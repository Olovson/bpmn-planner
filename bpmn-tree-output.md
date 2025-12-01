# BPMN Tree - Complete Hierarchy Sorted by Order

This document shows the complete BPMN tree with all nodes sorted in order.

**Sorting order**: `orderIndex` → `visualOrderIndex` → `branchId` → `label`

---

## BPMN Files

Found 19 BPMN files:
- mortgage.bpmn
- mortgage-se-appeal.bpmn
- mortgage-se-application.bpmn
- mortgage-se-collateral-registration.bpmn
- mortgage-se-credit-decision.bpmn
- mortgage-se-credit-evaluation.bpmn
- mortgage-se-disbursement.bpmn
- mortgage-se-document-generation.bpmn
- mortgage-se-documentation-assessment.bpmn
- mortgage-se-household.bpmn
- mortgage-se-internal-data-gathering.bpmn
- mortgage-se-kyc.bpmn
- mortgage-se-manual-credit-evaluation.bpmn
- mortgage-se-mortgage-commitment.bpmn
- mortgage-se-object-information.bpmn
- mortgage-se-object.bpmn
- mortgage-se-offer.bpmn
- mortgage-se-signing.bpmn
- mortgage-se-stakeholder.bpmn

## Tree Hierarchy

- 📋 **mortgage** [order:1, branch:entry-2] [mortgage]
  - 📦 **Application** [order:18, visual:0, branch:entry-18] [application] (mortgage.bpmn)
    - 📦 **Internal data gathering** [order:8, visual:0, branch:entry-8] [internal-data-gathering] (mortgage-se-application.bpmn)
      - ⚙️ **Fetch party information** [order:6, visual:0, branch:entry-6] [fetch-party-information] (mortgage-se-internal-data-gathering.bpmn)
      - 📜 **Pre-screen party** [order:7, visual:1, branch:entry-6] [pre-screen-party] (mortgage-se-internal-data-gathering.bpmn)
      - ⚙️ **Fetch engagements** [order:10, visual:2, branch:entry-6-branch-2] [fetch-engagements] (mortgage-se-internal-data-gathering.bpmn)
    - 📦 **Stakeholder** [order:17, visual:1, branch:entry-9] [stakeholder] (mortgage-se-application.bpmn)
      - 👤 **Consent to credit check** [order:10, visual:0, branch:entry-9] [consent-to-credit-check] (mortgage-se-stakeholder.bpmn)
      - ⚙️ **Fetch personal information** [order:13, visual:1, branch:entry-9] [fetch-personal-information] (mortgage-se-stakeholder.bpmn)
      - 📜 **Evaluate personal information** [order:14, visual:2, branch:entry-9] [evaluate-personal-information] (mortgage-se-stakeholder.bpmn)
      - ⚙️ **Fetch credit information** [order:16, visual:3, branch:entry-9] [fetch-credit-information] (mortgage-se-stakeholder.bpmn)
      - 📜 **Assess stakeholder** [order:17, visual:4, branch:entry-9] [assess-stakeholder] (mortgage-se-stakeholder.bpmn)
      - 👤 **Register personal economy information** [order:19, visual:5, branch:entry-9] [register-personal-economy-information] (mortgage-se-stakeholder.bpmn)
    - 📦 **Household** [order:11, visual:2, branch:entry-8] [household] (mortgage-se-application.bpmn)
      - 👤 **Register household economy infomation** [order:4, visual:0, branch:entry-4] [register-household-economy-information] (mortgage-se-household.bpmn)
    - 📦 **Object** [order:18, visual:3, branch:entry-9] [object] (mortgage-se-application.bpmn)
      - 👤 **Register source of equity** [order:8, visual:0, branch:entry-7] [register-source-of-equity] (mortgage-se-object.bpmn)
      - 👤 **Register loan details** [order:15, visual:1, branch:entry-7-branch-2] [register-loan-details] (mortgage-se-object.bpmn)
      - 📦 **Object information** [order:16, visual:2, branch:entry-7-branch-2] [object-information] (mortgage-se-object.bpmn)
        - ⚙️ **Fetch fastighets-information** [order:9, visual:0, branch:entry-8] [fetch-fastighets-information] (mortgage-se-object-information.bpmn)
        - ⚙️ **Fetch bostadsrätts-information** [order:13, visual:1, branch:entry-8-branch-2] [fetch-bostadsratts-information] (mortgage-se-object-information.bpmn)
        - ⚙️ **Fetch BRF-information** [order:14, visual:2, branch:entry-8-branch-2] [fetch-brf-information] (mortgage-se-object-information.bpmn)
        - 📜 **Screen fastighet** [order:10, visual:3, branch:entry-8] [evaluate-fastighet] (mortgage-se-object-information.bpmn)
        - 📜 **Screen bostadsrätt** [order:15, visual:4, branch:entry-8-branch-2] [evaluate-bostadsratt] (mortgage-se-object-information.bpmn)
      - ⚙️ **Valuate bostad** [order:13, visual:3, branch:entry-7-branch-2] [valuate-property] (mortgage-se-object.bpmn)
    - 👤 **Confirm application** [order:13, visual:4, branch:entry-8] [confirm-application] (mortgage-se-application.bpmn)
  - 📦 **Mortgage commitment** [order:53, visual:1, branch:entry-18-branch-2] [mortgage-commitment] (mortgage.bpmn)
    - 📦 **Automatic Credit Evaluation** [order:12, visual:0, branch:entry-9] [credit-evaluation-1] (mortgage-se-mortgage-commitment.bpmn)
      - 📜 **Fetch product** [order:17, visual:0, branch:entry-13] [fetch-product] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Fetch price** [order:18, visual:1, branch:entry-13] [fetch-price] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Amortisation** [order:19, visual:2, branch:entry-13] [evaluate-amortisation] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Calculate household affordabilty** [order:12, visual:3, branch:entry-12] [calculate-household-affordability] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate household** [order:13, visual:4, branch:entry-12] [evaluate-household] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate stakeholders** [order:14, visual:5, branch:entry-12] [evaluate-stakeholders] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Fetch risk classification** [order:21, visual:6, branch:entry-13] [fetch-risk-classification] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate application** [order:22, visual:7, branch:entry-13] [evaluate-application] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate credit policies** [order:23, visual:8, branch:entry-13] [evaluate-credit-policies] (mortgage-se-credit-evaluation.bpmn)
    - 📦 **Documentation assessment** [order:8, visual:1, branch:entry-8] [documentation-assessment] (mortgage-se-mortgage-commitment.bpmn)
      - ⚙️ **Analyse documentation** [order:5, visual:0, branch:entry-5] [analyse-documentation] (mortgage-se-documentation-assessment.bpmn)
      - 👤 **Assess documentation** [order:6, visual:1, branch:entry-5] [assess-documentation] (mortgage-se-documentation-assessment.bpmn)
    - 👤 **Decide on mortgage commitment** [order:16, visual:2, branch:entry-9] [decide-mortgage-commitment] (mortgage-se-mortgage-commitment.bpmn)
    - 📦 **Object information** [order:30, visual:3, branch:entry-9-branch-2-branch-2] [object-information] (mortgage-se-mortgage-commitment.bpmn)
      - ⚙️ **Fetch fastighets-information** [order:9, visual:0, branch:entry-8] [fetch-fastighets-information] (mortgage-se-object-information.bpmn)
      - ⚙️ **Fetch bostadsrätts-information** [order:13, visual:1, branch:entry-8-branch-2] [fetch-bostadsratts-information] (mortgage-se-object-information.bpmn)
      - ⚙️ **Fetch BRF-information** [order:14, visual:2, branch:entry-8-branch-2] [fetch-brf-information] (mortgage-se-object-information.bpmn)
      - 📜 **Screen fastighet** [order:10, visual:3, branch:entry-8] [evaluate-fastighet] (mortgage-se-object-information.bpmn)
      - 📜 **Screen bostadsrätt** [order:15, visual:4, branch:entry-8-branch-2] [evaluate-bostadsratt] (mortgage-se-object-information.bpmn)
    - 📦 **Automatic Credit Evaluation** [order:23, visual:4, branch:entry-9-branch-2] [credit-evaluation-2] (mortgage-se-mortgage-commitment.bpmn)
      - 📜 **Fetch product** [order:17, visual:0, branch:entry-13] [fetch-product] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Fetch price** [order:18, visual:1, branch:entry-13] [fetch-price] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Amortisation** [order:19, visual:2, branch:entry-13] [evaluate-amortisation] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Calculate household affordabilty** [order:12, visual:3, branch:entry-12] [calculate-household-affordability] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate household** [order:13, visual:4, branch:entry-12] [evaluate-household] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate stakeholders** [order:14, visual:5, branch:entry-12] [evaluate-stakeholders] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Fetch risk classification** [order:21, visual:6, branch:entry-13] [fetch-risk-classification] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate application** [order:22, visual:7, branch:entry-13] [evaluate-application] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate credit policies** [order:23, visual:8, branch:entry-13] [evaluate-credit-policies] (mortgage-se-credit-evaluation.bpmn)
  - 📦 **Automatic Credit Evaluation** [order:22, visual:2, branch:entry-18] [credit-evaluation] (mortgage.bpmn)
    - 📜 **Fetch product** [order:17, visual:0, branch:entry-13] [fetch-product] (mortgage-se-credit-evaluation.bpmn)
    - ⚙️ **Fetch price** [order:18, visual:1, branch:entry-13] [fetch-price] (mortgage-se-credit-evaluation.bpmn)
    - 📜 **Amortisation** [order:19, visual:2, branch:entry-13] [evaluate-amortisation] (mortgage-se-credit-evaluation.bpmn)
    - ⚙️ **Calculate household affordabilty** [order:12, visual:3, branch:entry-12] [calculate-household-affordability] (mortgage-se-credit-evaluation.bpmn)
    - 📜 **Evaluate household** [order:13, visual:4, branch:entry-12] [evaluate-household] (mortgage-se-credit-evaluation.bpmn)
    - 📜 **Evaluate stakeholders** [order:14, visual:5, branch:entry-12] [evaluate-stakeholders] (mortgage-se-credit-evaluation.bpmn)
    - ⚙️ **Fetch risk classification** [order:21, visual:6, branch:entry-13] [fetch-risk-classification] (mortgage-se-credit-evaluation.bpmn)
    - 📜 **Evaluate application** [order:22, visual:7, branch:entry-13] [evaluate-application] (mortgage-se-credit-evaluation.bpmn)
    - 📜 **Evaluate credit policies** [order:23, visual:8, branch:entry-13] [evaluate-credit-policies] (mortgage-se-credit-evaluation.bpmn)
  - 📦 **Appeal** [order:51, visual:3, branch:entry-18-branch-2-branch-2] [appeal] (mortgage.bpmn)
    - 👤 **Submit appeal** [order:6, visual:0, branch:entry-5] [submit-appeal] (mortgage-se-appeal.bpmn)
    - 👤 **Screen appeal** [order:7, visual:1, branch:entry-5] [screen-appeal] (mortgage-se-appeal.bpmn)
  - 📦 **Manual credit evaluation** [order:48, visual:4, branch:entry-18-branch-2] [manual-credit-evaluation] (mortgage.bpmn)
    - 📜 **Evaluate requirements** [order:23, visual:0, branch:entry-10] [evaluate-requirements] (mortgage-se-manual-credit-evaluation.bpmn)
    - 👤 **Determine object value** [order:26, visual:1, branch:entry-10] [decide-object-value] (mortgage-se-manual-credit-evaluation.bpmn)
    - 👤 **Upload documentation** [order:15, visual:2, branch:entry-9-branch-2] [upload-documentation] (mortgage-se-manual-credit-evaluation.bpmn)
    - 📦 **Documentation assessment** [order:16, visual:3, branch:entry-9-branch-2] [documentation-assessment] (mortgage-se-manual-credit-evaluation.bpmn)
      - ⚙️ **Analyse documentation** [order:5, visual:0, branch:entry-5] [analyse-documentation] (mortgage-se-documentation-assessment.bpmn)
      - 👤 **Assess documentation** [order:6, visual:1, branch:entry-5] [assess-documentation] (mortgage-se-documentation-assessment.bpmn)
    - 📦 **Automatic Credit Evaluation** [order:9, visual:4, branch:entry-9] [credit-evaluation] (mortgage-se-manual-credit-evaluation.bpmn)
      - 📜 **Fetch product** [order:17, visual:0, branch:entry-13] [fetch-product] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Fetch price** [order:18, visual:1, branch:entry-13] [fetch-price] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Amortisation** [order:19, visual:2, branch:entry-13] [evaluate-amortisation] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Calculate household affordabilty** [order:12, visual:3, branch:entry-12] [calculate-household-affordability] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate household** [order:13, visual:4, branch:entry-12] [evaluate-household] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate stakeholders** [order:14, visual:5, branch:entry-12] [evaluate-stakeholders] (mortgage-se-credit-evaluation.bpmn)
      - ⚙️ **Fetch risk classification** [order:21, visual:6, branch:entry-13] [fetch-risk-classification] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate application** [order:22, visual:7, branch:entry-13] [evaluate-application] (mortgage-se-credit-evaluation.bpmn)
      - 📜 **Evaluate credit policies** [order:23, visual:8, branch:entry-13] [evaluate-credit-policies] (mortgage-se-credit-evaluation.bpmn)
    - 👤 **Perform advanced underwriting** [order:19, visual:5, branch:entry-9-branch-2-branch-2] [advanced-underwriting] (mortgage-se-manual-credit-evaluation.bpmn)
  - 📦 **KYC** [order:28, visual:5, branch:entry-18] [kyc] (mortgage.bpmn)
    - 👤 **Submit self declaration** [order:8, visual:0, branch:entry-8] [submit-self-declaration] (mortgage-se-kyc.bpmn)
    - ⚙️ **Fetch AML / KYC risk score** [order:9, visual:1, branch:entry-8] [fetch-aml-kyc-risk] (mortgage-se-kyc.bpmn)
    - ⚙️ **Fetch sanctions and PEP** [order:10, visual:2, branch:entry-8] [fetch-screening-and-sanctions] (mortgage-se-kyc.bpmn)
    - 📜 **Evaluate KYC/AML** [order:11, visual:3, branch:entry-8] [assess-kyc-aml] (mortgage-se-kyc.bpmn)
    - 👤 **Review KYC** [order:15, visual:4, branch:entry-8-branch-2] [review-kyc] (mortgage-se-kyc.bpmn)
  - 📦 **Credit decision** [order:29, visual:6, branch:entry-18] [credit-decision] (mortgage.bpmn)
    - 📜 **Credit decision rules** [order:7, visual:0, branch:entry-7] [evaluate-credit-decision-rules] (mortgage-se-credit-decision.bpmn)
    - 👤 **Evaluate application** [order:15, visual:1, branch:entry-7-branch-2] [evaluate-application-board] (mortgage-se-credit-decision.bpmn)
    - 👤 **Evaluate application** [order:9, visual:2, branch:entry-7] [evaluate-application-committee] (mortgage-se-credit-decision.bpmn)
    - 👤 **Evaluate application** [order:16, visual:3, branch:entry-7-branch-4] [evaluate-application-four-eyes] (mortgage-se-credit-decision.bpmn)
  - 📦 **Offer** [order:33, visual:7, branch:entry-18] [offer] (mortgage.bpmn)
    - 👤 **Decide on offer** [order:7, visual:0, branch:entry-6] [decide-offer] (mortgage-se-offer.bpmn)
    - 👤 **Perform advanced underwriting** [order:11, visual:1, branch:entry-6-branch-4] [advanced-underwriting] (mortgage-se-offer.bpmn)
    - 📦 **Credit decision** [order:12, visual:2, branch:entry-6-branch-4] [credit-decision] (mortgage-se-offer.bpmn)
      - 📜 **Credit decision rules** [order:7, visual:0, branch:entry-7] [evaluate-credit-decision-rules] (mortgage-se-credit-decision.bpmn)
      - 👤 **Evaluate application** [order:15, visual:1, branch:entry-7-branch-2] [evaluate-application-board] (mortgage-se-credit-decision.bpmn)
      - 👤 **Evaluate application** [order:9, visual:2, branch:entry-7] [evaluate-application-committee] (mortgage-se-credit-decision.bpmn)
      - 👤 **Evaluate application** [order:16, visual:3, branch:entry-7-branch-4] [evaluate-application-four-eyes] (mortgage-se-credit-decision.bpmn)
  - 📦 **Document generation** [order:56, visual:8, branch:entry-19] [document-generation-advance] (mortgage.bpmn)
    - 📜 **Select documents** [order:5, visual:0, branch:entry-5] [select-documents] (mortgage-se-document-generation.bpmn)
    - ⚙️ **Generate Document** [order:6, visual:1, branch:entry-5] [generate-documents] (mortgage-se-document-generation.bpmn)
  - 📦 **Signing** [order:57, visual:9, branch:entry-19] [signing-advance] (mortgage.bpmn)
    - 👤 **Distribute documents** [order:14, visual:0, branch:entry-9] [distribute-manual-documents] (mortgage-se-signing.bpmn)
    - ⚙️ **Upload document** [order:8, visual:1, branch:entry-8] [upload-document] (mortgage-se-signing.bpmn)
    - 👤 **Upload document** [order:16, visual:2, branch:entry-9] [upload-manual-document] (mortgage-se-signing.bpmn)
    - ⚙️ **Create sign order** [order:9, visual:3, branch:entry-8] [create-signing-order] (mortgage-se-signing.bpmn)
    - ⚙️ **Store signed documents** [order:23, visual:4, branch:entry-9-branch-2] [store-signed-document] (mortgage-se-signing.bpmn)
  - 📦 **Document generation** [order:35, visual:10, branch:entry-18] [document-generation] (mortgage.bpmn)
    - 📜 **Select documents** [order:5, visual:0, branch:entry-5] [select-documents] (mortgage-se-document-generation.bpmn)
    - ⚙️ **Generate Document** [order:6, visual:1, branch:entry-5] [generate-documents] (mortgage-se-document-generation.bpmn)
  - 📦 **Disbursement** [order:58, visual:11, branch:entry-19] [disbursement-advance] (mortgage.bpmn)
    - 📜 **Evaluate disbursement rules** [order:9, visual:0, branch:entry-9] [evaluate-disbursement-rules] (mortgage-se-disbursement.bpmn)
    - 👤 **Disbursement control** [order:12, visual:1, branch:entry-9] [disbursement-control] (mortgage-se-disbursement.bpmn)
    - 👤 **Verify disbursement details** [order:22, visual:2, branch:entry-9-branch-2] [verify-disbursement-details] (mortgage-se-disbursement.bpmn)
    - 👤 **Control purchase disbusement requirements** [order:17, visual:3, branch:entry-9] [control-purchase-disbursement-requirements] (mortgage-se-disbursement.bpmn)
    - ⚙️ **Disburse loan** [order:19, visual:4, branch:entry-9] [disburse-loan] (mortgage-se-disbursement.bpmn)
    - ⚙️ **Archive documents** [order:20, visual:5, branch:entry-9] [archive-documents] (mortgage-se-disbursement.bpmn)
  - 📦 **Signing** [order:37, visual:12, branch:entry-18] [signing] (mortgage.bpmn)
    - 👤 **Distribute documents** [order:14, visual:0, branch:entry-9] [distribute-manual-documents] (mortgage-se-signing.bpmn)
    - ⚙️ **Upload document** [order:8, visual:1, branch:entry-8] [upload-document] (mortgage-se-signing.bpmn)
    - 👤 **Upload document** [order:16, visual:2, branch:entry-9] [upload-manual-document] (mortgage-se-signing.bpmn)
    - ⚙️ **Create sign order** [order:9, visual:3, branch:entry-8] [create-signing-order] (mortgage-se-signing.bpmn)
    - ⚙️ **Store signed documents** [order:23, visual:4, branch:entry-9-branch-2] [store-signed-document] (mortgage-se-signing.bpmn)
  - 📦 **Disbursement** [order:39, visual:13, branch:entry-18] [disbursement] (mortgage.bpmn)
    - 📜 **Evaluate disbursement rules** [order:9, visual:0, branch:entry-9] [evaluate-disbursement-rules] (mortgage-se-disbursement.bpmn)
    - 👤 **Disbursement control** [order:12, visual:1, branch:entry-9] [disbursement-control] (mortgage-se-disbursement.bpmn)
    - 👤 **Verify disbursement details** [order:22, visual:2, branch:entry-9-branch-2] [verify-disbursement-details] (mortgage-se-disbursement.bpmn)
    - 👤 **Control purchase disbusement requirements** [order:17, visual:3, branch:entry-9] [control-purchase-disbursement-requirements] (mortgage-se-disbursement.bpmn)
    - ⚙️ **Disburse loan** [order:19, visual:4, branch:entry-9] [disburse-loan] (mortgage-se-disbursement.bpmn)
    - ⚙️ **Archive documents** [order:20, visual:5, branch:entry-9] [archive-documents] (mortgage-se-disbursement.bpmn)
  - 📦 **Collateral registration** [order:44, visual:14, branch:entry-18-branch-2] [collateral-registration] (mortgage.bpmn)
    - 👤 **Distribute notice of pledge to BRF** [order:16, visual:0, branch:entry-6-branch-2] [distribute-notice-of-pledge-to-brf] (mortgage-se-collateral-registration.bpmn)
    - 👤 **Distribute Ansökan till inskrivningsmyndigheten** [order:7, visual:1, branch:entry-6] [distribute-ansokan-till-inskrivningsmyndigheten] (mortgage-se-collateral-registration.bpmn)
    - 👤 **Verify** [order:14, visual:2, branch:entry-6-branch-1] [verify] (mortgage-se-collateral-registration.bpmn)

## Flat List (All Nodes in Order)

| # | Type | Label | Element ID | BPMN File | orderIndex | visualOrderIndex | branchId |
|---|------|-------|------------|-----------|-----------:|-----------------:|----------|
| 1 | process | mortgage | mortgage | mortgage.bpmn | 1 | — | entry-2 |
| 2 | callActivity | Application | application | mortgage.bpmn | 18 | 0 | entry-18 |
| 3 | callActivity | Internal data gathering | internal-data-gathering | mortgage-se-application.bpmn | 8 | 0 | entry-8 |
| 4 | serviceTask | Fetch party information | fetch-party-information | mortgage-se-internal-data-gathering.bpmn | 6 | 0 | entry-6 |
| 5 | businessRuleTask | Pre-screen party | pre-screen-party | mortgage-se-internal-data-gathering.bpmn | 7 | 1 | entry-6 |
| 6 | serviceTask | Fetch engagements | fetch-engagements | mortgage-se-internal-data-gathering.bpmn | 10 | 2 | entry-6-branch-2 |
| 7 | callActivity | Stakeholder | stakeholder | mortgage-se-application.bpmn | 17 | 1 | entry-9 |
| 8 | userTask | Consent to credit check | consent-to-credit-check | mortgage-se-stakeholder.bpmn | 10 | 0 | entry-9 |
| 9 | serviceTask | Fetch personal information | fetch-personal-information | mortgage-se-stakeholder.bpmn | 13 | 1 | entry-9 |
| 10 | businessRuleTask | Evaluate personal information | evaluate-personal-information | mortgage-se-stakeholder.bpmn | 14 | 2 | entry-9 |
| 11 | serviceTask | Fetch credit information | fetch-credit-information | mortgage-se-stakeholder.bpmn | 16 | 3 | entry-9 |
| 12 | businessRuleTask | Assess stakeholder | assess-stakeholder | mortgage-se-stakeholder.bpmn | 17 | 4 | entry-9 |
| 13 | userTask | Register personal economy information | register-personal-economy-information | mortgage-se-stakeholder.bpmn | 19 | 5 | entry-9 |
| 14 | callActivity | Household | household | mortgage-se-application.bpmn | 11 | 2 | entry-8 |
| 15 | userTask | Register household economy infomation | register-household-economy-information | mortgage-se-household.bpmn | 4 | 0 | entry-4 |
| 16 | callActivity | Object | object | mortgage-se-application.bpmn | 18 | 3 | entry-9 |
| 17 | userTask | Register source of equity | register-source-of-equity | mortgage-se-object.bpmn | 8 | 0 | entry-7 |
| 18 | userTask | Register loan details | register-loan-details | mortgage-se-object.bpmn | 15 | 1 | entry-7-branch-2 |
| 19 | callActivity | Object information | object-information | mortgage-se-object.bpmn | 16 | 2 | entry-7-branch-2 |
| 20 | serviceTask | Fetch fastighets-information | fetch-fastighets-information | mortgage-se-object-information.bpmn | 9 | 0 | entry-8 |
| 21 | serviceTask | Fetch bostadsrätts-information | fetch-bostadsratts-information | mortgage-se-object-information.bpmn | 13 | 1 | entry-8-branch-2 |
| 22 | serviceTask | Fetch BRF-information | fetch-brf-information | mortgage-se-object-information.bpmn | 14 | 2 | entry-8-branch-2 |
| 23 | businessRuleTask | Screen fastighet | evaluate-fastighet | mortgage-se-object-information.bpmn | 10 | 3 | entry-8 |
| 24 | businessRuleTask | Screen bostadsrätt | evaluate-bostadsratt | mortgage-se-object-information.bpmn | 15 | 4 | entry-8-branch-2 |
| 25 | serviceTask | Valuate bostad | valuate-property | mortgage-se-object.bpmn | 13 | 3 | entry-7-branch-2 |
| 26 | userTask | Confirm application | confirm-application | mortgage-se-application.bpmn | 13 | 4 | entry-8 |
| 27 | callActivity | Mortgage commitment | mortgage-commitment | mortgage.bpmn | 53 | 1 | entry-18-branch-2 |
| 28 | callActivity | Automatic Credit Evaluation | credit-evaluation-1 | mortgage-se-mortgage-commitment.bpmn | 12 | 0 | entry-9 |
| 29 | businessRuleTask | Fetch product | fetch-product | mortgage-se-credit-evaluation.bpmn | 17 | 0 | entry-13 |
| 30 | serviceTask | Fetch price | fetch-price | mortgage-se-credit-evaluation.bpmn | 18 | 1 | entry-13 |
| 31 | businessRuleTask | Amortisation | evaluate-amortisation | mortgage-se-credit-evaluation.bpmn | 19 | 2 | entry-13 |
| 32 | serviceTask | Calculate household affordabilty | calculate-household-affordability | mortgage-se-credit-evaluation.bpmn | 12 | 3 | entry-12 |
| 33 | businessRuleTask | Evaluate household | evaluate-household | mortgage-se-credit-evaluation.bpmn | 13 | 4 | entry-12 |
| 34 | businessRuleTask | Evaluate stakeholders | evaluate-stakeholders | mortgage-se-credit-evaluation.bpmn | 14 | 5 | entry-12 |
| 35 | serviceTask | Fetch risk classification | fetch-risk-classification | mortgage-se-credit-evaluation.bpmn | 21 | 6 | entry-13 |
| 36 | businessRuleTask | Evaluate application | evaluate-application | mortgage-se-credit-evaluation.bpmn | 22 | 7 | entry-13 |
| 37 | businessRuleTask | Evaluate credit policies | evaluate-credit-policies | mortgage-se-credit-evaluation.bpmn | 23 | 8 | entry-13 |
| 38 | callActivity | Documentation assessment | documentation-assessment | mortgage-se-mortgage-commitment.bpmn | 8 | 1 | entry-8 |
| 39 | serviceTask | Analyse documentation | analyse-documentation | mortgage-se-documentation-assessment.bpmn | 5 | 0 | entry-5 |
| 40 | userTask | Assess documentation | assess-documentation | mortgage-se-documentation-assessment.bpmn | 6 | 1 | entry-5 |
| 41 | userTask | Decide on mortgage commitment | decide-mortgage-commitment | mortgage-se-mortgage-commitment.bpmn | 16 | 2 | entry-9 |
| 42 | callActivity | Object information | object-information | mortgage-se-mortgage-commitment.bpmn | 30 | 3 | entry-9-branch-2-branch-2 |
| 43 | serviceTask | Fetch fastighets-information | fetch-fastighets-information | mortgage-se-object-information.bpmn | 9 | 0 | entry-8 |
| 44 | serviceTask | Fetch bostadsrätts-information | fetch-bostadsratts-information | mortgage-se-object-information.bpmn | 13 | 1 | entry-8-branch-2 |
| 45 | serviceTask | Fetch BRF-information | fetch-brf-information | mortgage-se-object-information.bpmn | 14 | 2 | entry-8-branch-2 |
| 46 | businessRuleTask | Screen fastighet | evaluate-fastighet | mortgage-se-object-information.bpmn | 10 | 3 | entry-8 |
| 47 | businessRuleTask | Screen bostadsrätt | evaluate-bostadsratt | mortgage-se-object-information.bpmn | 15 | 4 | entry-8-branch-2 |
| 48 | callActivity | Automatic Credit Evaluation | credit-evaluation-2 | mortgage-se-mortgage-commitment.bpmn | 23 | 4 | entry-9-branch-2 |
| 49 | businessRuleTask | Fetch product | fetch-product | mortgage-se-credit-evaluation.bpmn | 17 | 0 | entry-13 |
| 50 | serviceTask | Fetch price | fetch-price | mortgage-se-credit-evaluation.bpmn | 18 | 1 | entry-13 |
| 51 | businessRuleTask | Amortisation | evaluate-amortisation | mortgage-se-credit-evaluation.bpmn | 19 | 2 | entry-13 |
| 52 | serviceTask | Calculate household affordabilty | calculate-household-affordability | mortgage-se-credit-evaluation.bpmn | 12 | 3 | entry-12 |
| 53 | businessRuleTask | Evaluate household | evaluate-household | mortgage-se-credit-evaluation.bpmn | 13 | 4 | entry-12 |
| 54 | businessRuleTask | Evaluate stakeholders | evaluate-stakeholders | mortgage-se-credit-evaluation.bpmn | 14 | 5 | entry-12 |
| 55 | serviceTask | Fetch risk classification | fetch-risk-classification | mortgage-se-credit-evaluation.bpmn | 21 | 6 | entry-13 |
| 56 | businessRuleTask | Evaluate application | evaluate-application | mortgage-se-credit-evaluation.bpmn | 22 | 7 | entry-13 |
| 57 | businessRuleTask | Evaluate credit policies | evaluate-credit-policies | mortgage-se-credit-evaluation.bpmn | 23 | 8 | entry-13 |
| 58 | callActivity | Automatic Credit Evaluation | credit-evaluation | mortgage.bpmn | 22 | 2 | entry-18 |
| 59 | businessRuleTask | Fetch product | fetch-product | mortgage-se-credit-evaluation.bpmn | 17 | 0 | entry-13 |
| 60 | serviceTask | Fetch price | fetch-price | mortgage-se-credit-evaluation.bpmn | 18 | 1 | entry-13 |
| 61 | businessRuleTask | Amortisation | evaluate-amortisation | mortgage-se-credit-evaluation.bpmn | 19 | 2 | entry-13 |
| 62 | serviceTask | Calculate household affordabilty | calculate-household-affordability | mortgage-se-credit-evaluation.bpmn | 12 | 3 | entry-12 |
| 63 | businessRuleTask | Evaluate household | evaluate-household | mortgage-se-credit-evaluation.bpmn | 13 | 4 | entry-12 |
| 64 | businessRuleTask | Evaluate stakeholders | evaluate-stakeholders | mortgage-se-credit-evaluation.bpmn | 14 | 5 | entry-12 |
| 65 | serviceTask | Fetch risk classification | fetch-risk-classification | mortgage-se-credit-evaluation.bpmn | 21 | 6 | entry-13 |
| 66 | businessRuleTask | Evaluate application | evaluate-application | mortgage-se-credit-evaluation.bpmn | 22 | 7 | entry-13 |
| 67 | businessRuleTask | Evaluate credit policies | evaluate-credit-policies | mortgage-se-credit-evaluation.bpmn | 23 | 8 | entry-13 |
| 68 | callActivity | Appeal | appeal | mortgage.bpmn | 51 | 3 | entry-18-branch-2-branch-2 |
| 69 | userTask | Submit appeal | submit-appeal | mortgage-se-appeal.bpmn | 6 | 0 | entry-5 |
| 70 | userTask | Screen appeal | screen-appeal | mortgage-se-appeal.bpmn | 7 | 1 | entry-5 |
| 71 | callActivity | Manual credit evaluation | manual-credit-evaluation | mortgage.bpmn | 48 | 4 | entry-18-branch-2 |
| 72 | businessRuleTask | Evaluate requirements | evaluate-requirements | mortgage-se-manual-credit-evaluation.bpmn | 23 | 0 | entry-10 |
| 73 | userTask | Determine object value | decide-object-value | mortgage-se-manual-credit-evaluation.bpmn | 26 | 1 | entry-10 |
| 74 | userTask | Upload documentation | upload-documentation | mortgage-se-manual-credit-evaluation.bpmn | 15 | 2 | entry-9-branch-2 |
| 75 | callActivity | Documentation assessment | documentation-assessment | mortgage-se-manual-credit-evaluation.bpmn | 16 | 3 | entry-9-branch-2 |
| 76 | serviceTask | Analyse documentation | analyse-documentation | mortgage-se-documentation-assessment.bpmn | 5 | 0 | entry-5 |
| 77 | userTask | Assess documentation | assess-documentation | mortgage-se-documentation-assessment.bpmn | 6 | 1 | entry-5 |
| 78 | callActivity | Automatic Credit Evaluation | credit-evaluation | mortgage-se-manual-credit-evaluation.bpmn | 9 | 4 | entry-9 |
| 79 | businessRuleTask | Fetch product | fetch-product | mortgage-se-credit-evaluation.bpmn | 17 | 0 | entry-13 |
| 80 | serviceTask | Fetch price | fetch-price | mortgage-se-credit-evaluation.bpmn | 18 | 1 | entry-13 |
| 81 | businessRuleTask | Amortisation | evaluate-amortisation | mortgage-se-credit-evaluation.bpmn | 19 | 2 | entry-13 |
| 82 | serviceTask | Calculate household affordabilty | calculate-household-affordability | mortgage-se-credit-evaluation.bpmn | 12 | 3 | entry-12 |
| 83 | businessRuleTask | Evaluate household | evaluate-household | mortgage-se-credit-evaluation.bpmn | 13 | 4 | entry-12 |
| 84 | businessRuleTask | Evaluate stakeholders | evaluate-stakeholders | mortgage-se-credit-evaluation.bpmn | 14 | 5 | entry-12 |
| 85 | serviceTask | Fetch risk classification | fetch-risk-classification | mortgage-se-credit-evaluation.bpmn | 21 | 6 | entry-13 |
| 86 | businessRuleTask | Evaluate application | evaluate-application | mortgage-se-credit-evaluation.bpmn | 22 | 7 | entry-13 |
| 87 | businessRuleTask | Evaluate credit policies | evaluate-credit-policies | mortgage-se-credit-evaluation.bpmn | 23 | 8 | entry-13 |
| 88 | userTask | Perform advanced underwriting | advanced-underwriting | mortgage-se-manual-credit-evaluation.bpmn | 19 | 5 | entry-9-branch-2-branch-2 |
| 89 | callActivity | KYC | kyc | mortgage.bpmn | 28 | 5 | entry-18 |
| 90 | userTask | Submit self declaration | submit-self-declaration | mortgage-se-kyc.bpmn | 8 | 0 | entry-8 |
| 91 | serviceTask | Fetch AML / KYC risk score | fetch-aml-kyc-risk | mortgage-se-kyc.bpmn | 9 | 1 | entry-8 |
| 92 | serviceTask | Fetch sanctions and PEP | fetch-screening-and-sanctions | mortgage-se-kyc.bpmn | 10 | 2 | entry-8 |
| 93 | businessRuleTask | Evaluate KYC/AML | assess-kyc-aml | mortgage-se-kyc.bpmn | 11 | 3 | entry-8 |
| 94 | userTask | Review KYC | review-kyc | mortgage-se-kyc.bpmn | 15 | 4 | entry-8-branch-2 |
| 95 | callActivity | Credit decision | credit-decision | mortgage.bpmn | 29 | 6 | entry-18 |
| 96 | businessRuleTask | Credit decision rules | evaluate-credit-decision-rules | mortgage-se-credit-decision.bpmn | 7 | 0 | entry-7 |
| 97 | userTask | Evaluate application | evaluate-application-board | mortgage-se-credit-decision.bpmn | 15 | 1 | entry-7-branch-2 |
| 98 | userTask | Evaluate application | evaluate-application-committee | mortgage-se-credit-decision.bpmn | 9 | 2 | entry-7 |
| 99 | userTask | Evaluate application | evaluate-application-four-eyes | mortgage-se-credit-decision.bpmn | 16 | 3 | entry-7-branch-4 |
| 100 | callActivity | Offer | offer | mortgage.bpmn | 33 | 7 | entry-18 |
| 101 | userTask | Decide on offer | decide-offer | mortgage-se-offer.bpmn | 7 | 0 | entry-6 |
| 102 | userTask | Perform advanced underwriting | advanced-underwriting | mortgage-se-offer.bpmn | 11 | 1 | entry-6-branch-4 |
| 103 | callActivity | Credit decision | credit-decision | mortgage-se-offer.bpmn | 12 | 2 | entry-6-branch-4 |
| 104 | businessRuleTask | Credit decision rules | evaluate-credit-decision-rules | mortgage-se-credit-decision.bpmn | 7 | 0 | entry-7 |
| 105 | userTask | Evaluate application | evaluate-application-board | mortgage-se-credit-decision.bpmn | 15 | 1 | entry-7-branch-2 |
| 106 | userTask | Evaluate application | evaluate-application-committee | mortgage-se-credit-decision.bpmn | 9 | 2 | entry-7 |
| 107 | userTask | Evaluate application | evaluate-application-four-eyes | mortgage-se-credit-decision.bpmn | 16 | 3 | entry-7-branch-4 |
| 108 | callActivity | Document generation | document-generation-advance | mortgage.bpmn | 56 | 8 | entry-19 |
| 109 | businessRuleTask | Select documents | select-documents | mortgage-se-document-generation.bpmn | 5 | 0 | entry-5 |
| 110 | serviceTask | Generate Document | generate-documents | mortgage-se-document-generation.bpmn | 6 | 1 | entry-5 |
| 111 | callActivity | Signing | signing-advance | mortgage.bpmn | 57 | 9 | entry-19 |
| 112 | userTask | Distribute documents | distribute-manual-documents | mortgage-se-signing.bpmn | 14 | 0 | entry-9 |
| 113 | serviceTask | Upload document | upload-document | mortgage-se-signing.bpmn | 8 | 1 | entry-8 |
| 114 | userTask | Upload document | upload-manual-document | mortgage-se-signing.bpmn | 16 | 2 | entry-9 |
| 115 | serviceTask | Create sign order | create-signing-order | mortgage-se-signing.bpmn | 9 | 3 | entry-8 |
| 116 | serviceTask | Store signed documents | store-signed-document | mortgage-se-signing.bpmn | 23 | 4 | entry-9-branch-2 |
| 117 | callActivity | Document generation | document-generation | mortgage.bpmn | 35 | 10 | entry-18 |
| 118 | businessRuleTask | Select documents | select-documents | mortgage-se-document-generation.bpmn | 5 | 0 | entry-5 |
| 119 | serviceTask | Generate Document | generate-documents | mortgage-se-document-generation.bpmn | 6 | 1 | entry-5 |
| 120 | callActivity | Disbursement | disbursement-advance | mortgage.bpmn | 58 | 11 | entry-19 |
| 121 | businessRuleTask | Evaluate disbursement rules | evaluate-disbursement-rules | mortgage-se-disbursement.bpmn | 9 | 0 | entry-9 |
| 122 | userTask | Disbursement control | disbursement-control | mortgage-se-disbursement.bpmn | 12 | 1 | entry-9 |
| 123 | userTask | Verify disbursement details | verify-disbursement-details | mortgage-se-disbursement.bpmn | 22 | 2 | entry-9-branch-2 |
| 124 | userTask | Control purchase disbusement requirements | control-purchase-disbursement-requirements | mortgage-se-disbursement.bpmn | 17 | 3 | entry-9 |
| 125 | serviceTask | Disburse loan | disburse-loan | mortgage-se-disbursement.bpmn | 19 | 4 | entry-9 |
| 126 | serviceTask | Archive documents | archive-documents | mortgage-se-disbursement.bpmn | 20 | 5 | entry-9 |
| 127 | callActivity | Signing | signing | mortgage.bpmn | 37 | 12 | entry-18 |
| 128 | userTask | Distribute documents | distribute-manual-documents | mortgage-se-signing.bpmn | 14 | 0 | entry-9 |
| 129 | serviceTask | Upload document | upload-document | mortgage-se-signing.bpmn | 8 | 1 | entry-8 |
| 130 | userTask | Upload document | upload-manual-document | mortgage-se-signing.bpmn | 16 | 2 | entry-9 |
| 131 | serviceTask | Create sign order | create-signing-order | mortgage-se-signing.bpmn | 9 | 3 | entry-8 |
| 132 | serviceTask | Store signed documents | store-signed-document | mortgage-se-signing.bpmn | 23 | 4 | entry-9-branch-2 |
| 133 | callActivity | Disbursement | disbursement | mortgage.bpmn | 39 | 13 | entry-18 |
| 134 | businessRuleTask | Evaluate disbursement rules | evaluate-disbursement-rules | mortgage-se-disbursement.bpmn | 9 | 0 | entry-9 |
| 135 | userTask | Disbursement control | disbursement-control | mortgage-se-disbursement.bpmn | 12 | 1 | entry-9 |
| 136 | userTask | Verify disbursement details | verify-disbursement-details | mortgage-se-disbursement.bpmn | 22 | 2 | entry-9-branch-2 |
| 137 | userTask | Control purchase disbusement requirements | control-purchase-disbursement-requirements | mortgage-se-disbursement.bpmn | 17 | 3 | entry-9 |
| 138 | serviceTask | Disburse loan | disburse-loan | mortgage-se-disbursement.bpmn | 19 | 4 | entry-9 |
| 139 | serviceTask | Archive documents | archive-documents | mortgage-se-disbursement.bpmn | 20 | 5 | entry-9 |
| 140 | callActivity | Collateral registration | collateral-registration | mortgage.bpmn | 44 | 14 | entry-18-branch-2 |
| 141 | userTask | Distribute notice of pledge to BRF | distribute-notice-of-pledge-to-brf | mortgage-se-collateral-registration.bpmn | 16 | 0 | entry-6-branch-2 |
| 142 | userTask | Distribute Ansökan till inskrivningsmyndigheten | distribute-ansokan-till-inskrivningsmyndigheten | mortgage-se-collateral-registration.bpmn | 7 | 1 | entry-6 |
| 143 | userTask | Verify | verify | mortgage-se-collateral-registration.bpmn | 14 | 2 | entry-6-branch-1 |

---

## Metadata

- **Total nodes**: 143
- **ProcessGraph nodes**: 110
- **ProcessGraph edges**: 54
- **Root process**: mortgage

## Legend

| Icon | Type | Description |
|------|------|-------------|
| 📋 | Process | Root or subprocess container |
| 📦 | CallActivity | Subprocess call |
| 👤 | UserTask | User interaction task |
| ⚙️  | ServiceTask | Automated service task |
| 📜 | BusinessRuleTask | Business rule evaluation |

## Ordering Information

- **orderIndex**: Sequential order from sequence flows (primary sorting)
- **visualOrderIndex**: Visual order from BPMN DI coordinates (x, y) - used when orderIndex is missing
- **branchId**: Branch identifier for parallel flows
- **label**: Alphabetical fallback when no ordering information is available

---

*Generated: 2025-12-01T08:19:17.146Z*