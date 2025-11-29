# Analys: Användning av v2 Feature Goal-dokumentation för testscenarier

## Sammanfattning

**Kort svar:** V2-dokumenten innehåller **mycket värdefull affärsinformation** som kan användas för att skapa testscenarier, men de saknar **test-specifik metadata** som behövs för automatiserad testgenerering.

**Bedömning:** 
- ✅ **Bra för manuell testdesign** (testare kan läsa och skapa scenarion)
- ⚠️ **Begränsat för automatiserad generering** (saknar strukturerad testmetadata)
- ✅ **Bra grund för LLM-generering** (LLM kan tolka text och generera testscenarier)

---

## Vad som FINNS i v2-dokumenten

### 1. **Affärsprocessbeskrivning** ✅
- **Beskrivning av FGoal**: Tydlig beskrivning av vad processen gör
- **Processteg - Input/Output**: Vad som kommer in och ut
- **Omfattning**: Detaljerad lista över alla aktiviteter (user tasks, service tasks, business rules)
- **Beroenden**: System, subprocesser, DMN-regler

**Exempel från Application:**
```
- Internal data gathering: Hämtar befintlig kunddata från interna system
- Household: Samlar in hushållsekonomi, personlig ekonomi
- Stakeholders: Samlar in information om alla involverade parter
- Confirm application: User task där kunden bekräftar information
```

**Värde för testscenarier:**
- ✅ Ger kontext för vad som ska testas
- ✅ Identifierar alla aktiviteter som behöver täckas
- ✅ Beskriver förväntade utfall (Output-sektionen)

### 2. **Processflöde och sekvens** ✅
- **BPMN - Process**: Beskrivning av flödet (start, gateway, loop, etc.)
- **Omfattning**: Beskriver sekvens och parallellitet

**Exempel från KYC:**
```
Processen startar med självdeklaration från stakeholder, 
hämtar AML/KYC riskpoäng, hämtar sanktions- och PEP-screening, 
utvärderar KYC/AML-compliance, avgör om manuell granskning behövs
```

**Värde för testscenarier:**
- ✅ Ger teststeg i rätt ordning
- ✅ Identifierar decision points (gateways)
- ✅ Identifierar felhantering (error events, escalations)

### 3. **Felhantering och edge cases** ✅
- **Processteg - Output**: Beskriver felutfall
- **Omfattning**: Nämner error events och boundary events

**Exempel från Application:**
```
Vid fel: Pre-screen rejected, Stakeholder rejected, eller Object rejected (error events)
```

**Värde för testscenarier:**
- ✅ Identifierar error-case scenarion
- ✅ Identifierar edge cases (t.ex. "manuell granskning behövs")

---

## Vad som SAKNAS för automatiserad testgenerering

### 1. **Test-specifik metadata** ❌

**Saknas:**
- `persona`: Vem interagerar? (customer, advisor, system, unknown)
- `riskLevel`: Testprioritet (P0, P1, P2)
- `assertionType`: Testtyp (functional, regression, compliance, other)

**Vad som kan härledas:**
- ⚠️ **Persona** kan delvis härledas från "Omfattning":
  - "User task (Stakeholder lane)" → `persona: 'customer'`
  - "User task (Compliance lane)" → `persona: 'advisor'`
  - "Service task (System lane)" → `persona: 'system'`
- ❌ **Risk level** kan inte härledas (kräver affärsbedömning)
- ⚠️ **Assertion type** kan delvis härledas:
  - KYC-process → `assertionType: 'compliance'`
  - Vanlig process → `assertionType: 'functional'`

### 2. **UI Flow-information** ❌

**Saknas:**
- `pageId`: Vilken sida/route används?
- `action`: Vilken åtgärd utförs? (click, fill, submit, etc.)
- `locatorId`: Var finns elementet? (CSS selector, test ID, etc.)
- `dataProfileId`: Vilken testdata används?

**Exempel på vad som behövs:**
```typescript
uiFlow: [
  { pageId: 'application-form', action: 'fill', locatorId: 'income-input', dataProfileId: 'customer-high-income' },
  { pageId: 'application-form', action: 'click', locatorId: 'submit-button' },
  { pageId: 'confirmation-page', action: 'verify', locatorId: 'success-message' }
]
```

**Vad som kan härledas:**
- ⚠️ **PageId** kan delvis härledas från node-namn:
  - "Confirm application" → `pageId: 'confirm-application'` (men inte exakt route)
- ❌ **LocatorId** kan inte härledas (kräver faktisk implementation)
- ❌ **DataProfileId** kan inte härledas (kräver testdata-definitioner)

### 3. **Strukturerade testscenarier** ⚠️

**Saknas:**
- Explicita scenarion med ID, namn, typ, utfall
- Teststeg i strukturerad form
- Förväntade resultat per scenario

**Vad som kan härledas:**
- ✅ **Scenarion** kan härledas från "Processteg - Output":
  - "Komplett ansökningsdata insamlad" → Happy path scenario
  - "Pre-screen rejected" → Error case scenario
  - "Manuell granskning behövs" → Edge case scenario
- ⚠️ **Teststeg** kan härledas från "Omfattning" och "Processteg - Input/Output", men inte i strukturerad form

### 4. **Testdata-referenser** ❌

**Saknas:**
- `dataProfileId`: Referens till testdata-set
- Testdata-definitioner (fixtures, seed data)
- Data generation-strategi

**Vad som kan härledas:**
- ⚠️ **Data-typer** kan härledas från "Processteg - Input":
  - "Grundläggande ansökningsdata" → behöver testdata för ansökan
  - "Kund-ID" → behöver testdata för kund
- ❌ **Faktiska testdata** kan inte härledas (kräver data-definitioner)

---

## Hur väl skulle det fungera rakt av?

### ✅ **Vad som fungerar bra:**

1. **Manuell testdesign:**
   - Testare kan läsa v2-dokumenten och skapa testscenarier manuellt
   - All nödvändig affärsinformation finns tillgänglig
   - Processflöde och sekvens är tydligt beskrivna

2. **LLM-genererad testgenerering:**
   - LLM kan tolka v2-dokumenten och generera testscenarier
   - LLM kan härleda persona, risk level, assertion type från text
   - LLM kan skapa strukturerade scenarion baserat på beskrivningar

3. **Grund för testplanering:**
   - Identifierar alla aktiviteter som behöver testas
   - Identifierar felhantering och edge cases
   - Ger kontext för testprioritering

### ⚠️ **Vad som kräver extra arbete:**

1. **Automatiserad testgenerering:**
   - UI flow måste mappas manuellt eller via implementation mapping
   - Locators måste extraheras från faktisk implementation
   - Testdata måste definieras separat

2. **Testmetadata:**
   - Persona, risk level, assertion type måste läggas till (manuellt eller via LLM)
   - UI flow måste kompletteras med faktiska routes/locators

3. **Testdata:**
   - Testdata-set måste definieras separat
   - Data generation-strategi måste implementeras

---

## Rekommendationer

### 1. **För manuell testdesign:**
✅ **Fungerar bra rakt av** - v2-dokumenten ger all nödvändig information

### 2. **För LLM-genererad testgenerering:**
✅ **Fungerar relativt bra** - LLM kan tolka text och generera strukturerade scenarion
⚠️ **Men kräver:** 
- LLM-prompt som extraherar information från v2-dokumenten
- Post-processing för att lägga till testmetadata

### 3. **För automatiserad testgenerering:**
❌ **Fungerar inte rakt av** - kräver:
- **Implementation mapping** (BPMN node → UI route/API endpoint)
- **Locator-mapping** (UI element → test selector)
- **Testdata-definitioner** (data profiles, fixtures)
- **Testmetadata** (persona, risk level, assertion type)

### 4. **Hybrid-approach (rekommenderat):**
1. **Använd v2-dokumenten som grund** för LLM-genererad testgenerering
2. **LLM genererar strukturerade scenarion** med metadata (persona, risk level, etc.)
3. **Implementation mapping** kompletterar med UI flow och locators
4. **Testdata-definitioner** läggs till separat

---

## Exempel: Hur skulle Application-dokumentet användas?

### Input från v2-dokument:
```
- Omfattning: "Confirm application: User task där kunden bekräftar att all information är korrekt"
- Processteg - Output: "Ansökan bekräftad av kunden via 'Confirm application' user task"
- Beroenden: "Kundportal: För att kunden ska kunna fylla i information och bekräfta ansökan"
```

### Genererat testscenario (via LLM):
```typescript
{
  id: "APP-CONFIRM-HAPPY",
  name: "Kund bekräftar ansökan med korrekt information",
  type: "Happy",
  persona: "customer",  // Härleds från "User task" och "Kundportal"
  riskLevel: "P1",      // Kräver affärsbedömning eller LLM-inferens
  assertionType: "functional",  // Härleds från process-typ
  description: "Kunden fyller i all information och bekräftar ansökan",
  outcome: "Ansökan bekräftad och går vidare till kreditevaluering",
  uiFlow: [  // Kräver implementation mapping
    { pageId: "application-form", action: "fill", locatorId: "income-input" },
    { pageId: "application-form", action: "click", locatorId: "confirm-button" },
    { pageId: "confirmation-page", action: "verify", locatorId: "success-message" }
  ]
}
```

### Vad som saknas:
- ❌ Exakta routes (`/application/form` vs `application-form`)
- ❌ Faktiska locators (`#income-input` vs `[data-testid="income"]`)
- ❌ Testdata (`dataProfileId: "customer-high-income"`)

---

## Slutsats

**V2-dokumenten är en utmärkt grund för testscenarier**, men de saknar test-specifik metadata som behövs för automatiserad generering. 

**Rekommendation:**
- ✅ Använd v2-dokumenten som **input till LLM** för att generera strukturerade testscenarier
- ✅ Komplettera med **implementation mapping** för UI flow och locators
- ✅ Lägg till **testdata-definitioner** separat
- ✅ Använd **hybrid-approach**: v2-dokument → LLM → implementation mapping → testdata → testscenarier

**Detta skulle fungera relativt bra**, men kräver extra steg för att få fullständiga, körbara testscenarier.

