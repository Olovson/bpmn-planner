# Implementeringsplan: Förbättringar för Application Epics

**Datum:** 2024-12-19  
**Baserat på:** `docs/EPIC_ANALYSIS_APPLICATION_EPICS.md`

---

## Översikt

Detta dokument beskriver implementeringsplanen för att förbättra dokumentationen för alla 19 epics under Application-processen.

**Mål:** Förbättra kontext, API-dokumentation och beroenden för alla Application-epics.

---

## Fas 1: Processkontext & Översikt (Prioritet: Hög)

### Mål
Lägg till sektion "Processkontext" för alla 19 Application-epics som visar var epicen ligger i Application-processen.

### Epics att uppdatera
Alla 19 epics under Application-processen:
- **internal-data-gathering** (3 epics): fetch-party-information, fetch-engagements, pre-screen-party
- **stakeholder** (6 epics): consent-to-credit-check, fetch-personal-information, fetch-credit-information, evaluate-personal-information, assess-stakeholder, register-personal-economy-information
- **household** (1 epic): register-household-economy-information
- **object** (3 epics direkt): register-source-of-equity, register-loan-details, valuate-property
- **object-information** (5 epics): fetch-fastighets-information, evaluate-fastighet, fetch-bostadsratts-information, fetch-brf-information, evaluate-bostadsratt
- **confirm-application** (1 epic direkt): confirm-application

### Implementation
1. Lägg till ny sektion "Processkontext" efter "Syfte & Värde"
2. Skapa Mermaid flowchart som visar:
   - Application-processen som övergripande kontext
   - Vilken subprocess epicen tillhör
   - Föregående steg (inputs)
   - Efterföljande steg (outputs)
   - Parallella steg (om relevant)

### Exempel struktur
```html
<section class="doc-section">
  <h2>Processkontext</h2>
  <p class="muted">Var epicen befinner sig i Application-processen.</p>
  <div class="card">
    <p>Epiken <strong>fetch-personal-information</strong> är en del av <strong>stakeholder</strong> subprocessen i <strong>mortgage-se-application</strong> processen. Den körs efter <strong>consent-to-credit-check</strong> och före <strong>evaluate-personal-information</strong> och <strong>fetch-credit-information</strong>.</p>
    
    <details>
      <summary>Application Process Flow</summary>
      <div class="mermaid">
        flowchart TD
          Application[mortgage-se-application]
          InternalData[internal-data-gathering]
          Stakeholder[stakeholder subprocess]
          Household[household subprocess]
          Object[object subprocess]
          Confirm[confirm-application]
          
          Application --> InternalData
          InternalData -->|Parallel| Stakeholder
          InternalData -->|Parallel| Household
          Stakeholder --> Object
          Stakeholder -->|Parallel| Confirm
          Household -->|Parallel| Confirm
          Object -->|Parallel| Confirm
      </div>
    </details>
    
    <details>
      <summary>Stakeholder Subprocess Flow</summary>
      <div class="mermaid">
        flowchart LR
          Consent[consent-to-credit-check]
          FetchPersonal[fetch-personal-information]
          FetchCredit[fetch-credit-information]
          Evaluate[evaluate-personal-information]
          Assess[assess-stakeholder]
          Register[register-personal-economy-information]
          
          Consent --> FetchPersonal
          FetchPersonal --> FetchCredit
          FetchPersonal --> Evaluate
          FetchCredit --> Assess
          Evaluate --> Assess
          Assess -->|APPROVED| Register
      </div>
    </details>
  </div>
</section>
```

### Checklista per epic
- [ ] Lägg till "Processkontext" sektion efter "Syfte & Värde"
- [ ] Skapa Application Process Flow diagram
- [ ] Skapa Subprocess Flow diagram (om relevant)
- [ ] Beskriv epicens position i processen
- [ ] Lista föregående och efterföljande steg

---

## Fas 2: API Dokumentation - Standardisering (Prioritet: Hög)

### Mål
Standardisera och förbättra API-dokumentation för alla serviceTask och businessRuleTask epics.

### Epics att uppdatera
**ServiceTask epics (11 st):**
- fetch-party-information
- fetch-engagements
- fetch-personal-information
- fetch-credit-information
- valuate-property
- fetch-fastighets-information
- fetch-bostadsratts-information
- fetch-brf-information

**BusinessRuleTask epics (5 st):**
- pre-screen-party
- evaluate-personal-information
- assess-stakeholder
- evaluate-fastighet
- evaluate-bostadsratt

### Implementation
1. Lägg till "API Dokumentation" sektion för alla serviceTask/businessRuleTask epics (om den saknas)
2. Förbättra befintlig API-dokumentation med:
   - Request/Response scheman (exempel)
   - Autentisering (API keys, tokens)
   - Felkoder och felhantering
   - Externa API:er som används (SPAR, UC, Lantmäteriet, etc.)
   - Rate limiting (om relevant)

### Exempel struktur
```html
<section class="doc-section">
  <h2>API Dokumentation</h2>
  <p class="muted">Beskrivning av API-endpoints som används eller exponeras.</p>
  
  <h3>API-endpoints (exponerade)</h3>
  <table>
    <tr>
      <th>Endpoint</th>
      <th>Metod</th>
      <th>Request</th>
      <th>Response</th>
      <th>Felkoder</th>
    </tr>
    <tr>
      <td>/api/fetch-personal-information</td>
      <td>POST</td>
      <td><code>{ "personnummer": "string", "applicationId": "uuid" }</code></td>
      <td><code>{ "personalInformation": {...}, "status": "success", "metadata": {...} }</code></td>
      <td>400 (Bad Request), 404 (Not Found), 500 (Server Error)</td>
    </tr>
  </table>
  
  <h3>Externa API:er (används)</h3>
  <table>
    <tr>
      <th>API</th>
      <th>Endpoint</th>
      <th>Autentisering</th>
      <th>Rate Limit</th>
      <th>Beskrivning</th>
    </tr>
    <tr>
      <td>SPAR/Skatteverket</td>
      <td>/api/person/{personnummer}</td>
      <td>API key</td>
      <td>100 requests/minut</td>
      <td>Offentligt register för personinformation</td>
    </tr>
  </table>
</section>
```

### Checklista per epic
- [ ] Lägg till "API Dokumentation" sektion (om saknas)
- [ ] Dokumentera exponerade API-endpoints (request/response)
- [ ] Dokumentera externa API:er som används
- [ ] Lägg till felkoder och felhantering
- [ ] Lägg till autentisering (om relevant)
- [ ] Lägg till rate limiting (om relevant)

---

## Fas 3: Beroenden & Relaterade Noder - Förbättring (Prioritet: Medium)

### Mål
Förbättra "Relaterade noder" sektionen med visuellt beroendediagram.

### Epics att uppdatera
Alla 19 Application-epics.

### Implementation
1. Förbättra befintlig "Relaterade noder" sektion
2. Lägg till Mermaid flowchart som visar:
   - Föregående epics (inputs/prerequisites)
   - Efterföljande epics (outputs/triggers)
   - Parallella epics (om relevant)
   - Gateway-beslut som påverkar flödet

### Exempel struktur
```html
<section class="doc-section">
  <h2>Relaterade noder</h2>
  <p class="muted">Länkar till relaterade epics, feature goals och business rules.</p>
  
  <details>
    <summary>Beroendediagram</summary>
    <div class="mermaid">
      flowchart LR
        Previous1[consent-to-credit-check]
        Current[fetch-personal-information]
        Next1[evaluate-personal-information]
        Next2[fetch-credit-information]
        
        Previous1 -->|Triggar| Current
        Current -->|Input till| Next1
        Current -->|Input till| Next2
    </div>
  </details>
  
  <ul>
    <li><strong>Föregående steg:</strong> consent-to-credit-check (userTask) – måste vara slutförd och samtycke måste ha givits</li>
    <li><strong>Efterföljande steg:</strong> evaluate-personal-information, fetch-credit-information</li>
    <li><strong>Parallella steg:</strong> fetch-party-information (körs parallellt i internal-data-gathering)</li>
    <li><strong>Business Rules:</strong> GDPR-policy, konsumentkreditlagen</li>
  </ul>
</section>
```

### Checklista per epic
- [ ] Lägg till beroendediagram (Mermaid flowchart)
- [ ] Strukturera beroenden (Föregående, Efterföljande, Parallella)
- [ ] Uppdatera textbeskrivning med tydligare struktur

---

## Fas 4: Felhantering & Edge Cases - Strukturering (Prioritet: Medium)

### Mål
Strukturera felhantering och edge cases bättre, eventuellt som egen sektion.

### Epics att uppdatera
Alla 19 Application-epics (främst serviceTask och businessRuleTask).

### Implementation
1. Flytta eller förbättra felhantering från "Funktionellt flöde"
2. Strukturera enligt:
   - Tekniska fel (timeout, API-fel, databasfel)
   - Affärsrelaterade fel (validering, policy, regler)
   - Edge cases (unika scenarion, gränsvärden)
   - Retry-strategier (om relevant)

### Exempel struktur
```html
<section class="doc-section">
  <h2>Felhantering & Edge Cases</h2>
  <p class="muted">Beskrivning av felhantering och edge cases.</p>
  
  <h3>Tekniska fel</h3>
  <ul>
    <li><strong>API-timeout:</strong> Vid timeout från SPAR/Skatteverket ska systemet logga felet och implementera retry med exponentiell backoff (max 3 försök).</li>
    <li><strong>Databasfel:</strong> Vid databasfel ska processen flaggas för manuell hantering och felet loggas med detaljerad information.</li>
  </ul>
  
  <h3>Affärsrelaterade fel</h3>
  <ul>
    <li><strong>Validering:</strong> Om personnummer är ogiltigt ska processen flaggas för manuell verifiering.</li>
    <li><strong>Policy:</strong> Om samtycke saknas ska processen avbrytas med tydligt felmeddelande.</li>
  </ul>
  
  <h3>Edge cases</h3>
  <ul>
    <li><strong>Nya kunder:</strong> Kunder som inte finns i partregister kan kräva manuell registrering.</li>
    <li><strong>Historiska data:</strong> Data från olika källor kan vara inkonsistenta och kräva manuell granskning.</li>
  </ul>
  
  <h3>Retry-strategier</h3>
  <ul>
    <li><strong>Exponentiell backoff:</strong> Retry med växande intervall (1s, 2s, 4s) för tillfälliga fel.</li>
    <li><strong>Max retries:</strong> Max 3 försök innan processen flaggas för manuell hantering.</li>
  </ul>
</section>
```

### Checklista per epic
- [ ] Flytta eller förbättra felhantering från "Funktionellt flöde"
- [ ] Strukturera enligt kategorier (Tekniska, Affärsrelaterade, Edge cases)
- [ ] Lägg till retry-strategier (om relevant)

---

## Prioritering och ordning

### Steg 1: Processkontext (Fas 1)
- **Tid:** ~2-3 timmar
- **Epics:** Alla 19 epics
- **Värde:** Hög - ger bättre kontext och förståelse

### Steg 2: API Dokumentation (Fas 2)
- **Tid:** ~2-3 timmar
- **Epics:** 16 epics (serviceTask + businessRuleTask)
- **Värde:** Hög - tydligare för utvecklare

### Steg 3: Beroenden (Fas 3)
- **Tid:** ~1-2 timmar
- **Epics:** Alla 19 epics
- **Värde:** Medium - bättre översikt

### Steg 4: Felhantering (Fas 4)
- **Tid:** ~1-2 timmar
- **Epics:** Alla 19 epics (främst serviceTask/businessRuleTask)
- **Värde:** Medium - bättre struktur

**Total tid:** ~6-10 timmar för alla 4 faser

---

## Status tracking

Skapa en checklista-fil `docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md` för att spåra framsteg.

### Format
```markdown
## Fas 1: Processkontext
- [ ] fetch-party-information
- [ ] fetch-engagements
- [ ] pre-screen-party
- [ ] consent-to-credit-check
- [ ] fetch-personal-information
- [ ] fetch-credit-information
- [ ] evaluate-personal-information
- [ ] assess-stakeholder
- [ ] register-personal-economy-information
- [ ] register-household-economy-information
- [ ] register-source-of-equity
- [ ] register-loan-details
- [ ] valuate-property
- [ ] fetch-fastighets-information
- [ ] evaluate-fastighet
- [ ] fetch-bostadsratts-information
- [ ] fetch-brf-information
- [ ] evaluate-bostadsratt
- [ ] confirm-application
```

---

## Nästa steg

1. **Skapa status-fil** - `docs/EPIC_APPLICATION_IMPROVEMENT_STATUS.md`
2. **Börja med Fas 1** - Processkontext för alla epics
3. **Fortsätt med Fas 2** - API Dokumentation
4. **Fortsätt med Fas 3** - Beroenden
5. **Fortsätt med Fas 4** - Felhantering

**Använd prompt-filen** `docs/EPIC_APPLICATION_IMPROVEMENT_RESUME_PROMPT.md` för att starta om arbetet om det avbryts.

