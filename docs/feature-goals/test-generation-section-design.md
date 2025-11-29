# Design: Testgenerering-sektion för v2 Feature Goal-dokumentation

## Översikt

Ett nytt kapitel i slutet av v2 Feature Goal HTML-filerna för att samla information som behövs för testgenerering. Strukturen ska vara:
- ✅ **Läsbar** för människor (tydlig struktur)
- ✅ **Strukturerad** för automatiserad parsing
- ✅ **Delvis auto-genererbar** (vissa fält kan fyllas automatiskt)
- ✅ **Utökningsbar** (människor kan komplettera med detaljer)

---

## Föreslagen struktur

### 1. **Testscenarier** (Huvudtabell)

En tabell med alla testscenarier och deras metadata:

| ID | Namn | Typ | Persona | Risk Level | Assertion Type | Outcome | Status |
|---|---|---|---|---|---|---|---|
| S1 | Normalflöde – komplett ansökan | Happy | customer | P1 | functional | Ansökan bekräftad och går vidare | ✅ Planerad |
| S2 | Ofullständig information | Edge | customer | P2 | functional | Kunden styrs till komplettering | ⏳ TODO |
| S3 | Pre-screen rejected | Error | system | P0 | functional | Ansökan avvisas tidigt | ✅ Planerad |

**Fält:**
- **ID**: Scenario-ID (t.ex. "S1", "APP-CONFIRM-HAPPY")
- **Namn**: Kort scenarionamn
- **Typ**: Happy / Edge / Error
- **Persona**: customer / advisor / system / unknown
- **Risk Level**: P0 / P1 / P2
- **Assertion Type**: functional / regression / compliance / other
- **Outcome**: Förväntat resultat (1-2 meningar)
- **Status**: Planerad / TODO / Implementerad / Verifierad

**Auto-generering:**
- ✅ ID, Namn, Typ, Outcome kan genereras från befintliga scenarion i dokumentet
- ⚠️ Persona kan delvis härledas från "Omfattning" (User task → customer)
- ❌ Risk Level kräver affärsbedömning
- ⚠️ Assertion Type kan delvis härledas (KYC → compliance)

---

### 2. **UI Flow per Scenario** (Expandable sections)

För varje scenario, en expanderbar sektion med UI Flow-steg:

#### Scenario S1: Normalflöde – komplett ansökan

| Steg | Page ID | Action | Locator ID | Data Profile | Kommentar |
|---|---|---|---|---|---|
| 1 | application-form | navigate | - | - | Navigera till ansökningsformulär |
| 2 | application-form | fill | income-input | customer-high-income | Fyll i inkomst |
| 3 | application-form | fill | household-size-input | customer-standard-household | Fyll i hushållsstorlek |
| 4 | application-form | click | submit-button | - | Skicka ansökan |
| 5 | confirmation-page | verify | success-message | - | Verifiera bekräftelse |

**Fält:**
- **Steg**: Stegnummer
- **Page ID**: Sida/route (t.ex. "application-form", "/application/new")
- **Action**: navigate / fill / click / verify / wait / select
- **Locator ID**: CSS selector, test ID, eller beskrivning (t.ex. "#income-input", "[data-testid='income']")
- **Data Profile**: Referens till testdata (t.ex. "customer-high-income")
- **Kommentar**: Ytterligare information

**Auto-generering:**
- ✅ Steg kan genereras från "Processteg - Input/Output" och "Omfattning"
- ⚠️ Page ID kan delvis härledas från node-namn (men inte exakt route)
- ❌ Locator ID kräver faktisk implementation
- ❌ Data Profile kräver testdata-definitioner

---

### 3. **Testdata-referenser** (Lista)

En lista med testdata-profilerna som används:

- **customer-high-income**: Kund med hög inkomst (>600k SEK/år), låg skuldsättning (<30%), god kredithistorik
- **customer-standard-household**: Standard hushåll (2 vuxna, 2 barn), medianinkomst
- **customer-low-income**: Kund med låg inkomst (<300k SEK/år), hög skuldsättning (>50%)
- **stakeholder-primary**: Primär sökande med fullständig information
- **stakeholder-co-applicant**: Medsökande med kompletterande information

**Fält:**
- **ID**: Data profile ID (t.ex. "customer-high-income")
- **Beskrivning**: Vad testdata innehåller

**Auto-generering:**
- ⚠️ Data-typer kan härledas från "Processteg - Input" (behöver inkomst → customer-high-income)
- ❌ Faktiska testdata-definitioner kräver manuell input

---

### 4. **Implementation Mapping** (Tabell)

En tabell som mappar BPMN-aktiviteter till faktisk implementation:

| BPMN Aktivitet | Type | Route/Endpoint | Method | Base URL | Kommentar |
|---|---|---|---|---|---|
| Confirm application | UI | /application/confirm | - | https://mortgage-app.example.com | User task |
| Fetch party information | API | /api/v1/party-information | GET | https://api.mortgage.example.com | Service task |
| Evaluate KYC/AML | API | /api/v1/kyc/evaluate | POST | https://api.mortgage.example.com | Business rule task |

**Fält:**
- **BPMN Aktivitet**: Namn på aktiviteten i BPMN
- **Type**: UI / API / Both
- **Route/Endpoint**: Faktisk route eller API endpoint
- **Method**: HTTP method (för API)
- **Base URL**: Base URL för miljön
- **Kommentar**: Ytterligare information

**Auto-generering:**
- ⚠️ BPMN Aktivitet kan extraheras från "Omfattning"
- ❌ Route/Endpoint kräver faktisk implementation
- ❌ Method kräver API-dokumentation

---

## HTML-struktur (föreslag)

```html
<section class="doc-section">
  <h2>Testgenerering</h2>
  <p class="muted">Information för att generera automatiserade tester. Delar kan auto-genereras, men kompletteras manuellt med implementation-specifik information.</p>

  <!-- Testscenarier tabell -->
  <h3>Testscenarier</h3>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Namn</th>
        <th>Typ</th>
        <th>Persona</th>
        <th>Risk Level</th>
        <th>Assertion Type</th>
        <th>Outcome</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>S1</td>
        <td>Normalflöde – komplett ansökan</td>
        <td>Happy</td>
        <td>customer</td>
        <td>P1</td>
        <td>functional</td>
        <td>Ansökan bekräftad och går vidare till kreditevaluering</td>
        <td>✅ Planerad</td>
      </tr>
      <!-- Fler rader -->
    </tbody>
  </table>

  <!-- UI Flow per scenario (expandable) -->
  <h3>UI Flow per Scenario</h3>
  
  <details>
    <summary><strong>S1: Normalflöde – komplett ansökan</strong> (Klicka för att expandera)</summary>
    <table style="margin-top: 12px;">
      <thead>
        <tr>
          <th>Steg</th>
          <th>Page ID</th>
          <th>Action</th>
          <th>Locator ID</th>
          <th>Data Profile</th>
          <th>Kommentar</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>application-form</td>
          <td>navigate</td>
          <td>-</td>
          <td>-</td>
          <td>Navigera till ansökningsformulär</td>
        </tr>
        <!-- Fler rader -->
      </tbody>
    </table>
  </details>

  <!-- Testdata-referenser -->
  <h3>Testdata-referenser</h3>
  <ul>
    <li><strong>customer-high-income</strong>: Kund med hög inkomst (>600k SEK/år), låg skuldsättning (<30%), god kredithistorik</li>
    <li><strong>customer-standard-household</strong>: Standard hushåll (2 vuxna, 2 barn), medianinkomst</li>
    <!-- Fler items -->
  </ul>

  <!-- Implementation Mapping -->
  <h3>Implementation Mapping</h3>
  <table>
    <thead>
      <tr>
        <th>BPMN Aktivitet</th>
        <th>Type</th>
        <th>Route/Endpoint</th>
        <th>Method</th>
        <th>Base URL</th>
        <th>Kommentar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Confirm application</td>
        <td>UI</td>
        <td>/application/confirm</td>
        <td>-</td>
        <td>https://mortgage-app.example.com</td>
        <td>User task</td>
      </tr>
      <!-- Fler rader -->
    </tbody>
  </table>
</section>
```

---

## Auto-generering vs manuell input

### ✅ Kan auto-genereras:
- Testscenarier (ID, Namn, Typ, Outcome) från befintliga scenarion
- UI Flow-steg (högnivå) från "Processteg - Input/Output" och "Omfattning"
- BPMN Aktiviteter från "Omfattning"
- Persona (delvis) från "User task (Stakeholder lane)" → customer
- Assertion Type (delvis) från process-typ (KYC → compliance)

### ⚠️ Kan delvis härledas:
- Page ID från node-namn (men inte exakt route)
- Data Profile-typer från "Processteg - Input" (behöver inkomst → customer-high-income)

### ❌ Kräver manuell input:
- Risk Level (kräver affärsbedömning)
- Exakta routes/endpoints (kräver faktisk implementation)
- Locator ID (kräver faktisk implementation)
- Testdata-definitioner (kräver testdata-set)
- HTTP methods (kräver API-dokumentation)
- Base URLs (kräver miljökonfiguration)

---

## Fördelar med denna struktur

1. **Läsbar**: Tabeller är lätta att läsa och redigera
2. **Strukturerad**: Kan parsas automatiskt (HTML → JSON)
3. **Utökningsbar**: Människor kan lägga till detaljer
4. **Delvis auto-genererbar**: Grundläggande information kan fyllas automatiskt
5. **Flexibel**: Expandable sections för UI Flow gör det hanterbart

---

## Nästa steg

1. Implementera HTML-strukturen i `buildFeatureGoalDocHtmlFromModelV2()`
2. Auto-generera grundläggande information från befintliga scenarion
3. Lägg till placeholder-värden för fält som kräver manuell input
4. Uppdatera alla befintliga v2-filer med denna sektion

