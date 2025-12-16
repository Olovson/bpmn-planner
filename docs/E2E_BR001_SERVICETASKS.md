# ServiceTasks i E2E_BR001

**Genererad:** 2025-12-16T08:18:18.679Z
**Scenario:** E2E_BR001

## Totalt antal ServiceTasks: 24

## ServiceTasks per BPMN-fil

### mortgage-se-application.bpmn
**Process:** Application Mortgage (mortgage-se-application)

| ID | Name |
|----|------|
| `Activity_0p3rqyp` | KALP |
| `fetch-credit-information` | Fetch credit information |

### mortgage-se-internal-data-gathering.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `fetch-party-information` | Fetch party information |
| `fetch-engagements` | Fetch engagements |

### mortgage-se-object.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `valuate-property` | Valuate bostad |

### mortgage-se-stakeholder.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `fetch-personal-information` | Fetch personal information |

### mortgage-se-object-information.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `fetch-fastighets-information` | Fetch fastighets-information |
| `fetch-brf-information` | Fetch BRF information |

### mortgage-se-object-valuation.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `fetch-fastighets-valuation` | Fetch fastighets-valuation |
| `fetch-bostadsratts-valuation` | Fetch bostadsrätts-valuation |

### mortgage-se-credit-evaluation.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `fetch-price` | Fetch price |
| `fetch-risk-classification` | Fetch risk classification |
| `calculate-household-affordability` | Calculate household affordabilty |
| `fetch-credit-information` | Fetch credit information |

### mortgage-se-kyc.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `fetch-kyc` | Fetch KYC |
| `fetch-aml-kyc-risk` | Fetch AML / KYC risk score |
| `fetch-screening-and-sanctions` | Fetch sanctions and PEP |

### mortgage-se-document-generation.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `generate-documents` | Generate Document |
| `Activity_1qsvac1` | Prepare loan |

### mortgage-se-signing.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `store-signed-document` | Store signed documents |
| `upload-document` | Upload document |
| `create-signing-order` | Create sign order |

### mortgage-se-disbursement.bpmn
**Process:**  ()

| ID | Name |
|----|------|
| `handle-disbursement` | Handle disbursement |
| `archive-documents` | Archive documents |


## Alla ServiceTasks (alfabetiskt)

- **Archive documents** (`archive-documents`) - mortgage-se-disbursement.bpmn
- **Calculate household affordabilty** (`calculate-household-affordability`) - mortgage-se-credit-evaluation.bpmn
- **Create sign order** (`create-signing-order`) - mortgage-se-signing.bpmn
- **Fetch AML / KYC risk score** (`fetch-aml-kyc-risk`) - mortgage-se-kyc.bpmn
- **Fetch bostadsrätts-valuation** (`fetch-bostadsratts-valuation`) - mortgage-se-object-valuation.bpmn
- **Fetch BRF information** (`fetch-brf-information`) - mortgage-se-object-information.bpmn
- **Fetch credit information** (`fetch-credit-information`) - mortgage-se-application.bpmn
- **Fetch credit information** (`fetch-credit-information`) - mortgage-se-credit-evaluation.bpmn
- **Fetch engagements** (`fetch-engagements`) - mortgage-se-internal-data-gathering.bpmn
- **Fetch fastighets-information** (`fetch-fastighets-information`) - mortgage-se-object-information.bpmn
- **Fetch fastighets-valuation** (`fetch-fastighets-valuation`) - mortgage-se-object-valuation.bpmn
- **Fetch KYC** (`fetch-kyc`) - mortgage-se-kyc.bpmn
- **Fetch party information** (`fetch-party-information`) - mortgage-se-internal-data-gathering.bpmn
- **Fetch personal information** (`fetch-personal-information`) - mortgage-se-stakeholder.bpmn
- **Fetch price** (`fetch-price`) - mortgage-se-credit-evaluation.bpmn
- **Fetch risk classification** (`fetch-risk-classification`) - mortgage-se-credit-evaluation.bpmn
- **Fetch sanctions and PEP** (`fetch-screening-and-sanctions`) - mortgage-se-kyc.bpmn
- **Generate Document** (`generate-documents`) - mortgage-se-document-generation.bpmn
- **Handle disbursement** (`handle-disbursement`) - mortgage-se-disbursement.bpmn
- **KALP** (`Activity_0p3rqyp`) - mortgage-se-application.bpmn
- **Prepare loan** (`Activity_1qsvac1`) - mortgage-se-document-generation.bpmn
- **Store signed documents** (`store-signed-document`) - mortgage-se-signing.bpmn
- **Upload document** (`upload-document`) - mortgage-se-signing.bpmn
- **Valuate bostad** (`valuate-property`) - mortgage-se-object.bpmn
