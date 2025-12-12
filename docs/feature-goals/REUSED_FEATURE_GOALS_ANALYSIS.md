# Analys av återkommande Feature Goals

**Genererad:** 2025-12-11T23:44:43.291Z

**Antal återkommande feature goals:** 8

---

## Sammanfattning

Följande feature goals anropas från flera ställen:

- **mortgage-se-credit-evaluation** (mortgage-se-credit-evaluation.bpmn): 5 anrop
- **mortgage-se-documentation-assessment** (mortgage-se-documentation-assessment.bpmn): 3 anrop
- **mortgage-se-object-information** (mortgage-se-object-information.bpmn): 3 anrop
- **mortgage-se-credit-decision** (mortgage-se-credit-decision.bpmn): 3 anrop
- **mortgage-se-internal-data-gathering** (mortgage-se-internal-data-gathering.bpmn): 2 anrop
- **mortgage-se-signing** (mortgage-se-signing.bpmn): 2 anrop
- **mortgage-se-disbursement** (mortgage-se-disbursement.bpmn): 2 anrop
- **mortgage-se-document-generation** (mortgage-se-document-generation.bpmn): 2 anrop

---

## Detaljerad analys

### mortgage-se-credit-evaluation

**BPMN-fil:** `mortgage-se-credit-evaluation.bpmn`

**Antal anrop:** 5

**Anropningskontexter:**

1. **Automatic Credit Evaluation** (`Activity_1gzlxx4`)
   - **Anropas från:** mortgage-se-manual-credit-evaluation (`mortgage-se-manual-credit-evaluation.bpmn`)
   - **Called element:** `credit-evaluation`

1. **Automatic Credit Evaluation** (`credit-evaluation-1`)
   - **Anropas från:** mortgage-se-mortgage-commitment (`mortgage-se-mortgage-commitment.bpmn`)

1. **Automatic Credit Evaluation** (`credit-evaluation-2`)
   - **Anropas från:** mortgage-se-mortgage-commitment (`mortgage-se-mortgage-commitment.bpmn`)

1. **Automatic Credit Evaluation** (`credit-evaluation-2`)
   - **Anropas från:** mortgage-se-object-control (`mortgage-se-object-control.bpmn`)
   - **Called element:** `credit-evaluation`

1. **Automatic Credit Evaluation** (`credit-evaluation`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 5 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

### mortgage-se-documentation-assessment

**BPMN-fil:** `mortgage-se-documentation-assessment.bpmn`

**Antal anrop:** 3

**Anropningskontexter:**

1. **Documentation assessment** (`documentation-assessment`)
   - **Anropas från:** mortgage-se-manual-credit-evaluation (`mortgage-se-manual-credit-evaluation.bpmn`)

1. **Documentation assessment** (`documentation-assessment`)
   - **Anropas från:** mortgage-se-mortgage-commitment (`mortgage-se-mortgage-commitment.bpmn`)

1. **Documentation assessment** (`documentation-assessment`)
   - **Anropas från:** mortgage-se-offer (`mortgage-se-offer.bpmn`)

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 3 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

### mortgage-se-object-information

**BPMN-fil:** `mortgage-se-object-information.bpmn`

**Antal anrop:** 3

**Anropningskontexter:**

1. **Object information** (`object-information`)
   - **Anropas från:** mortgage-se-mortgage-commitment (`mortgage-se-mortgage-commitment.bpmn`)

1. **Object information** (`object-information`)
   - **Anropas från:** mortgage-se-object-control (`mortgage-se-object-control.bpmn`)

1. **Object information** (`object-information`)
   - **Anropas från:** mortgage-se-object (`mortgage-se-object.bpmn`)

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 3 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

### mortgage-se-credit-decision

**BPMN-fil:** `mortgage-se-credit-decision.bpmn`

**Antal anrop:** 3

**Anropningskontexter:**

1. **Credit decision** (`credit-decision`)
   - **Anropas från:** mortgage-se-offer (`mortgage-se-offer.bpmn`)

1. **Credit decision** (`sales-contract-credit-decision`)
   - **Anropas från:** mortgage-se-offer (`mortgage-se-offer.bpmn`)

1. **Credit decision** (`credit-decision`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 3 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

### mortgage-se-internal-data-gathering

**BPMN-fil:** `mortgage-se-internal-data-gathering.bpmn`

**Antal anrop:** 2

**Anropningskontexter:**

1. **Internal data gathering** (`internal-data-gathering`)
   - **Anropas från:** mortgage-se-application (`mortgage-se-application.bpmn`)

1. **Internal data gathering** (`internal-data-gathering`)
   - **Anropas från:** mortgage-se-stakeholder (`mortgage-se-stakeholder.bpmn`)

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 2 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

### mortgage-se-signing

**BPMN-fil:** `mortgage-se-signing.bpmn`

**Antal anrop:** 2

**Anropningskontexter:**

1. **Signing** (`signing`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)
   - **Called element:** `signing`

1. **Signing** (`signing-advance`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)
   - **Called element:** `signing`

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 2 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

### mortgage-se-disbursement

**BPMN-fil:** `mortgage-se-disbursement.bpmn`

**Antal anrop:** 2

**Anropningskontexter:**

1. **Disbursement** (`disbursement`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)

1. **Disbursement** (`disbursement-advance`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 2 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

### mortgage-se-document-generation

**BPMN-fil:** `mortgage-se-document-generation.bpmn`

**Antal anrop:** 2

**Anropningskontexter:**

1. **Document generation** (`document-generation`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)

1. **Document generation** (`document-generation-advance`)
   - **Anropas från:** mortgage (`mortgage.bpmn`)

**Rekommendation:**
- Dokumentera generell funktionalitet i huvuddokumentationen
- Lägg till "Anropningskontexter" sektion som listar alla 2 anropningsställen
- Förklara varför processen anropas igen i varje kontext (vilken ny information har tillkommit)
- Uppdatera Input/Output sektioner med kontextspecifika krav

---

