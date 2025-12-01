# Epic Documentation Improvement Checklist

## Alla epics i systemet (14 st)

### Kategorisering efter typ:

#### ServiceTask (6 epics) - Behöver: C4 System Context, Sekvensdiagram, Komponentdiagram
1. ✅ **fetch-personal-information** - Redan förbättrad med diagram
2. ⏳ **fetch-credit-information** - Behöver: C4, Sekvens, Komponent
3. ⏳ **fetch-party-information** - Behöver: C4, Sekvens, Komponent
4. ⏳ **fetch-engagements** - Behöver: C4, Sekvens, Komponent
5. ⏳ **valuate-property** - Behöver: C4, Sekvens, Komponent, Data Flow
6. ⏳ **evaluate-personal-information** - Behöver: C4, Sekvens, Komponent

#### UserTask (6 epics) - Behöver: User Journey Map, Interaktionsflöde, Process Flow
1. ⏳ **confirm-application** - Behöver: User Journey, Interaktionsflöde, Process Flow
2. ⏳ **consent-to-credit-check** - Behöver: User Journey, Interaktionsflöde, Process Flow
3. ⏳ **register-personal-economy-information** - Behöver: User Journey, Interaktionsflöde, Process Flow, Data Flow
4. ⏳ **register-household-economy-information** - Behöver: User Journey, Interaktionsflöde, Process Flow, Data Flow
5. ⏳ **register-source-of-equity** - Behöver: User Journey, Interaktionsflöde, Process Flow
6. ⏳ **register-loan-details** - Behöver: User Journey, Interaktionsflöde, Process Flow

#### BusinessRuleTask (2 epics) - Behöver: DMN Decision Table, Regelträd, Tröskelvärden, C4, Sekvens
1. ⏳ **assess-stakeholder** - Behöver: DMN Decision Table, Regelträd, Tröskelvärden, C4, Sekvens, Komponent
2. ⏳ **pre-screen-party** - Behöver: DMN Decision Table, Regelträd, Tröskelvärden, C4, Sekvens, Komponent

---

## Förbättringsplan per epic

### ServiceTask Epics

#### 1. fetch-credit-information
**Behöver:**
- ✅ C4 System Context Diagram (UC/Bisnode/Creditsafe, Application DB, Credit Data Store)
- ✅ Sekvensdiagram (API-anrop, retry-logik, felhantering)
- ✅ Komponentdiagram (API Service, REST Client, Validation Service)

#### 2. fetch-party-information
**Behöver:**
- ✅ C4 System Context Diagram (SPAR/Skatteverket, Application DB, Part Data Store)
- ✅ Sekvensdiagram (API-anrop, validering)
- ✅ Komponentdiagram (API Service, REST Client)

#### 3. fetch-engagements
**Behöver:**
- ✅ C4 System Context Diagram (Core Banking System, Application DB, Engagements Data Store)
- ✅ Sekvensdiagram (API-anrop, aggregering)
- ✅ Komponentdiagram (API Service, Aggregation Service)

#### 4. valuate-property
**Behöver:**
- ✅ C4 System Context Diagram (Lantmäteriet, Mäklarstatistik, Booli, Application DB, Valuation Data Store)
- ✅ Sekvensdiagram (API-anrop till flera källor, jämförelse, värdering)
- ✅ Komponentdiagram (Valuation Engine, REST Clients, Comparison Service)
- ✅ Data Flow Diagram (datakällor → transformation → värdering)

#### 5. evaluate-personal-information
**Behöver:**
- ✅ C4 System Context Diagram (Personal Data Store, Application DB)
- ✅ Sekvensdiagram (validering, DMN-anrop om relevant)
- ✅ Komponentdiagram (Validation Service, DMN Engine om relevant)

### UserTask Epics

#### 6. confirm-application
**Behöver:**
- ✅ User Journey Map (kundens resa genom bekräftelse)
- ✅ Interaktionsflöde (UI-skärmar, validering, bekräftelse)
- ✅ Process Flow Diagram (steg, gateways, felhantering)

#### 7. consent-to-credit-check
**Behöver:**
- ✅ User Journey Map (kundens resa genom samtycke)
- ✅ Interaktionsflöde (UI-skärmar, samtycke, bekräftelse)
- ✅ Process Flow Diagram (steg, gateways)

#### 8. register-personal-economy-information
**Behöver:**
- ✅ User Journey Map (kundens resa genom registrering)
- ✅ Interaktionsflöde (formulär, validering, sparning)
- ✅ Process Flow Diagram (steg, validering, draft/completed states)
- ✅ Data Flow Diagram (input → transformation → output)

#### 9. register-household-economy-information
**Behöver:**
- ✅ User Journey Map (kundens resa genom registrering)
- ✅ Interaktionsflöde (formulär, aggregering, validering)
- ✅ Process Flow Diagram (steg, aggregering, validering)
- ✅ Data Flow Diagram (personlig ekonomi → aggregering → hushållsekonomi)

#### 10. register-source-of-equity
**Behöver:**
- ✅ User Journey Map (kundens resa genom registrering)
- ✅ Interaktionsflöde (formulär, validering, beräkning)
- ✅ Process Flow Diagram (steg, validering, beräkning)

#### 11. register-loan-details
**Behöver:**
- ✅ User Journey Map (kundens resa genom registrering)
- ✅ Interaktionsflöde (formulär, lånealternativ, validering)
- ✅ Process Flow Diagram (steg, validering, beräkning)

### BusinessRuleTask Epics

#### 12. assess-stakeholder
**Behöver:**
- ✅ DMN Decision Table (årsinkomst, DTI-ratio, kreditscore → beslut, riskkategori)
- ✅ Regelträd / Decision Tree (beslutslogik)
- ✅ Tröskelvärden tabell (min årsinkomst, max DTI-ratio, etc.)
- ✅ C4 System Context Diagram (DMN Engine, Credit Data Store, Application DB)
- ✅ Sekvensdiagram (DMN-anrop, beslutslogik)
- ✅ Komponentdiagram (DMN Engine, Decision Service)

#### 13. pre-screen-party
**Behöver:**
- ✅ DMN Decision Table (eligibility criteria → APPROVED/REJECTED/REVIEW)
- ✅ Regelträd / Decision Tree (beslutslogik)
- ✅ Tröskelvärden tabell (eligibility criteria)
- ✅ C4 System Context Diagram (DMN Engine, Core Banking System, Application DB)
- ✅ Sekvensdiagram (DMN-anrop, beslutslogik)
- ✅ Komponentdiagram (DMN Engine, Eligibility Service)

---

## Prioritering

### Fas 1: ServiceTask med externa integrationer (Högsta prioritet)
1. fetch-credit-information
2. valuate-property
3. fetch-party-information
4. fetch-engagements
5. evaluate-personal-information

### Fas 2: BusinessRuleTask med DMN (Högsta prioritet)
1. assess-stakeholder
2. pre-screen-party

### Fas 3: UserTask med komplexa flöden (Medium prioritet)
1. register-household-economy-information (med aggregering)
2. register-loan-details (med beräkningar)
3. register-personal-economy-information
4. confirm-application
5. consent-to-credit-check
6. register-source-of-equity

---

## Status

- ✅ = Klar
- ⏳ = Pågående/Behöver förbättring
- ⬜ = Inte startad

