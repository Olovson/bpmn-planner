# Analys: E2E-scenarion för Mortgage-processen

## Syfte
Identifiera vilka e2e-scenarion som bör etableras baserat på:
- BPMN-processstrukturen i `mortgage.bpmn`
- User stories i Feature Goal-dokumentationen
- Affärskritikalitet och kundflöde
- Realistiska testscenarion (inte generiska)

## Metod
1. Analysera huvudprocessen `mortgage.bpmn` och dess call activities
2. Identifiera Feature Goals med user stories för varje process
3. Prioritera scenarion baserat på:
   - **P0**: Kritiska happy path-flöden som kunder/handläggare använder dagligen
   - **P1**: Viktiga alternativa flöden och edge cases
   - **P2**: Mindre kritiska flöden och optimeringar
4. Föreslå scenariotyper: happy-path, alt-path, error

---

## Huvudprocess: mortgage.bpmn

### Call Activities i körordning (baserat på BPMN-flöde)

Från `bpmn-map.json`, huvudprocessen `mortgage` har följande call activities:

1. **application** → `mortgage-se-application.bpmn`
2. **kyc** → `mortgage-se-kyc.bpmn`
3. **credit-evaluation** → `mortgage-se-credit-evaluation.bpmn`
4. **credit-decision** → `mortgage-se-credit-decision.bpmn`
5. **offer** → `mortgage-se-offer.bpmn`
6. **signing** → `mortgage-se-signing.bpmn`
7. **disbursement** → `mortgage-se-disbursement.bpmn`
8. **collateral-registration** → `mortgage-se-collateral-registration.bpmn`
9. **mortgage-commitment** → `mortgage-se-mortgage-commitment.bpmn`
10. **manual-credit-evaluation** → `mortgage-se-manual-credit-evaluation.bpmn`
11. **object-valuation** → `mortgage-se-object-valuation.bpmn`
12. **appeal** → `mortgage-se-appeal.bpmn`
13. **document-generation** (flera instanser) → `mortgage-se-document-generation.bpmn`
14. **signing-advance** → `mortgage-se-signing.bpmn`
15. **disbursement-advance** → `mortgage-se-disbursement.bpmn`

---

## Analys per Process

### 1. Application (`mortgage-se-application.bpmn`)

**Status**: ✅ Redan implementerat (FG_APPLICATION_S1)

**Feature Goal**: `mortgage-application-v2.html`

**User Stories**: 
- Kundperspektiv: Fylla i ansökningsformulär, komplettera hushållsekonomi, stakeholder-information, objektinformation
- Systemperspektiv: Automatisk datainsamling, KALP-beräkning

**Befintligt scenario**:
- `FG_APPLICATION_S1`: Application – Normalflöde, komplett ansökan med en person (P0, happy-path)

**Föreslagna ytterligare scenarion**:
- **P1, alt-path**: Application med flera personer (multi-instance stakeholder)
- **P1, alt-path**: Application med skip av household (om inte relevant)
- **P2, error**: Application med valideringsfel och korrigering

---

### 2. KYC (`mortgage-se-kyc.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-kyc-v2.html`

**User Stories** (från feature goal):
- Kundperspektiv: Verifiera identitet, ladda upp dokumentation
- Systemperspektiv: Automatisk KYC-validering, integration med externa tjänster

**Föreslagna scenarion**:
- **P0, happy-path**: KYC – Normalflöde, automatisk verifiering godkänd
  - Given: Ansökan är komplett, kund har giltig identitet
  - When: Systemet genomför KYC-validering automatiskt
  - Then: KYC är godkänd, processen fortsätter till credit-evaluation

- **P1, alt-path**: KYC – Manuell granskning krävs
  - Given: Ansökan är komplett, men automatisk verifiering misslyckas
  - When: Handläggare granskar KYC manuellt
  - Then: KYC är godkänd efter manuell granskning

- **P1, error**: KYC – Verifiering misslyckas
  - Given: Ansökan är komplett, men identitet kan inte verifieras
  - When: Systemet försöker verifiera identitet
  - Then: KYC avvisas, processen avslutas eller går till appeal

---

### 3. Credit Evaluation (`mortgage-se-credit-evaluation.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-se-credit-evaluation-v2.html`

**User Stories**:
- Systemperspektiv: Automatisk kreditevaluering, produktval, prishämtning, amorteringsberäkning
- Handläggarperspektiv: Granska kreditevaluering, se riskbedömning

**Föreslagna scenarion**:
- **P0, happy-path**: Credit Evaluation – Normalflöde, automatisk evaluering godkänd
  - Given: Ansökan är komplett, KYC godkänd, all data finns
  - When: Systemet genomför automatisk kreditevaluering
  - Then: Kreditevaluering är godkänd, processen fortsätter till credit-decision

- **P1, alt-path**: Credit Evaluation – Manuell granskning krävs
  - Given: Ansökan är komplett, men automatisk evaluering ger osäkerhet
  - When: Systemet dirigerar till manuell granskning
  - Then: Handläggare granskar och godkänner evaluering

---

### 4. Credit Decision (`mortgage-se-credit-decision.bpmn`)

**Status**: ✅ Redan implementerat (FG_CREDIT_DECISION_TC01)

**Feature Goal**: `mortgage-se-credit-decision-v2.html`

**User Stories**:
- Handläggarperspektiv: Granska ansökningar på olika beslutsnivåer (Board, Committee, Four eyes, Straight through)
- Systemperspektiv: Automatisk beslutsnivåbestämning via DMN

**Befintligt scenario**:
- `FG_CREDIT_DECISION_TC01`: Mortgage SE – Credit Decision – Happy Path (P0, happy-path)

**Föreslagna ytterligare scenarion**:
- **P1, alt-path**: Credit Decision – Manuell bedömning (Four eyes)
  - Given: Ansökan kräver manuell bedömning
  - When: Handläggare bedömer ansökan manuellt
  - Then: Ansökan godkänns eller avvisas

- **P1, alt-path**: Credit Decision – Board-beslut
  - Given: Ansökan kräver Board-beslut (högt belopp)
  - When: Board granskar och fattar beslut
  - Then: Ansökan godkänns eller avvisas

- **P1, error**: Credit Decision – Avvisad
  - Given: Ansökan bedöms
  - When: Systemet/handläggare avvisar ansökan
  - Then: Ansökan avvisas, processen går till appeal eller avslutas

---

### 5. Offer (`mortgage-se-offer.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-offer-v2.html`

**User Stories** (från feature goal):
- Kundperspektiv: Få erbjudande, granska villkor, acceptera/avvisa erbjudande
- Handläggarperspektiv: Förbereda erbjudande, generera dokumentation

**Föreslagna scenarion**:
- **P0, happy-path**: Offer – Normalflöde, kund accepterar erbjudande
  - Given: Ansökan är godkänd, kreditbeslut är APPROVED
  - When: Systemet genererar erbjudande, kund granskar och accepterar
  - Then: Erbjudande är accepterat, processen fortsätter till signing

- **P1, alt-path**: Offer – Kund avvisar erbjudande
  - Given: Ansökan är godkänd, erbjudande är genererat
  - When: Kund granskar erbjudande och avvisar
  - Then: Processen avslutas eller går tillbaka för omförhandling

- **P1, alt-path**: Offer – Förberedelse med sales contract credit decision
  - Given: Ansökan är godkänd, sales contract finns
  - When: Systemet gör credit decision för sales contract
  - Then: Erbjudande inkluderar sales contract-villkor

---

### 6. Signing (`mortgage-se-signing.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-se-signing-v2.html`, `mortgage-se-signing-per-digital-document-package-v2.html`

**User Stories**:
- Kundperspektiv: Signera dokument digitalt, bekräfta signering
- Systemperspektiv: Generera signeringsdokument, validera signering

**Föreslagna scenarion**:
- **P0, happy-path**: Signing – Normalflöde, digital signering
  - Given: Erbjudande är accepterat, dokument är genererade
  - When: Kund signerar dokument digitalt
  - Then: Signering är bekräftad, processen fortsätter till disbursement

- **P1, alt-path**: Signing – Manuell signering (fysisk)
  - Given: Erbjudande är accepterat, kund väljer fysisk signering
  - When: Kund signerar fysiskt, dokument skickas in
  - Then: Signering är bekräftad efter manuell validering

---

### 7. Disbursement (`mortgage-se-disbursement.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-se-disbursement-v2.html`, `mortgage-se-disbursement-disbursement-advance-v2.html`

**User Stories**:
- Systemperspektiv: Automatisk utbetalning, integration med banksystem
- Handläggarperspektiv: Manuell utbetalning vid behov

**Föreslagna scenarion**:
- **P0, happy-path**: Disbursement – Normalflöde, automatisk utbetalning
  - Given: Signering är bekräftad, all dokumentation är klar
  - When: Systemet genomför automatisk utbetalning
  - Then: Utbetalning är genomförd, processen avslutas

- **P1, alt-path**: Disbursement – Manuell utbetalning
  - Given: Signering är bekräftad, men automatisk utbetalning misslyckas
  - When: Handläggare genomför manuell utbetalning
  - Then: Utbetalning är genomförd

---

### 8. Mortgage Commitment (`mortgage-se-mortgage-commitment.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-mortgage-commitment-v2.html`

**User Stories** (från feature goal):
- Kundperspektiv: Få proof-of-finance snabbt, fatta beslut om engagemang
- Systemperspektiv: Automatisk kreditevaluering för engagemang

**Föreslagna scenarion**:
- **P0, happy-path**: Mortgage Commitment – Normalflöde, auto-approve
  - Given: Köpare behöver proof-of-finance för budgivning
  - When: Systemet genomför automatisk kreditevaluering för engagemang
  - Then: Engagemang är godkänt, kund får proof-of-finance

- **P1, alt-path**: Mortgage Commitment – Kund lägger till lånevillkor
  - Given: Engagemang är godkänt
  - When: Kund väljer att lägga till lånevillkor
  - Then: Processen fortsätter med objektutvärdering

- **P1, error**: Mortgage Commitment – Automatiskt avvisad
  - Given: Köpare ansöker om engagemang
  - When: Systemet genomför automatisk kreditevaluering
  - Then: Engagemang avvisas automatiskt

---

### 9. Manual Credit Evaluation (`mortgage-se-manual-credit-evaluation.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-manual-credit-evaluation-v2.html`

**User Stories**:
- Handläggarperspektiv: Manuell kreditevaluering, objektkontroll, dokumentationsbedömning

**Föreslagna scenarion**:
- **P1, alt-path**: Manual Credit Evaluation – Normalflöde
  - Given: Ansökan kräver manuell granskning
  - When: Handläggare genomför manuell kreditevaluering
  - Then: Kreditevaluering är klar, processen fortsätter

---

### 10. Object Valuation (`mortgage-se-object-valuation.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-object-valuation-v2.html`

**User Stories** (från feature goal):
- Handläggarperspektiv: Automatisk objektvärdering, integration med externa värderingstjänster

**Föreslagna scenarion**:
- **P1, happy-path**: Object Valuation – Normalflöde, automatisk värdering
  - Given: Objektinformation är komplett
  - When: Systemet hämtar värdering från extern tjänst
  - Then: Objektvärdering är klar, processen fortsätter

---

### 11. Appeal (`mortgage-se-appeal.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-appeal-v2.html`

**User Stories** (från feature goal):
- Kundperspektiv: Överklaga avvisad ansökan, skicka in motivering och dokumentation

**Föreslagna scenarion**:
- **P1, alt-path**: Appeal – Normalflöde, överklagan godkänd
  - Given: Ansökan är avvisad
  - When: Kund skickar in överklagan med motivering och dokumentation
  - Then: Överklagan granskas, ansökan godkänns eller avvisas igen

- **P1, alt-path**: Appeal – Överklagan avvisad, ny överklagan
  - Given: Första överklagan är avvisad
  - When: Kund skickar in ny överklagan med kompletterande information
  - Then: Processen loopar tillbaka för ny granskning

---

### 12. Collateral Registration (`mortgage-se-collateral-registration.bpmn`)

**Status**: ❌ Saknas

**Feature Goal**: `mortgage-collateral-registration-v2.html`

**Föreslagna scenarion**:
- **P2, happy-path**: Collateral Registration – Normalflöde
  - Given: Lånet är godkänt, objekt är värderat
  - When: Systemet registrerar säkerhet
  - Then: Säkerhet är registrerad

---

## Sammanfattning: Föreslagna E2E-scenarion

### P0 (Kritiska happy path-flöden)

1. ✅ **Application** – Normalflöde (redan implementerat)
2. ✅ **Credit Decision** – Happy Path (redan implementerat)
3. ❌ **KYC** – Normalflöde, automatisk verifiering godkänd
4. ❌ **Credit Evaluation** – Normalflöde, automatisk evaluering godkänd
5. ❌ **Offer** – Normalflöde, kund accepterar erbjudande
6. ❌ **Signing** – Normalflöde, digital signering
7. ❌ **Disbursement** – Normalflöde, automatisk utbetalning
8. ❌ **Mortgage Commitment** – Normalflöde, auto-approve

### P1 (Viktiga alternativa flöden och edge cases)

1. ❌ **Application** – Multi-instance stakeholder
2. ❌ **KYC** – Manuell granskning krävs
3. ❌ **KYC** – Verifiering misslyckas
4. ❌ **Credit Decision** – Manuell bedömning (Four eyes)
5. ❌ **Credit Decision** – Board-beslut
6. ❌ **Credit Decision** – Avvisad
7. ❌ **Offer** – Kund avvisar erbjudande
8. ❌ **Signing** – Manuell signering
9. ❌ **Disbursement** – Manuell utbetalning
10. ❌ **Mortgage Commitment** – Kund lägger till lånevillkor
11. ❌ **Mortgage Commitment** – Automatiskt avvisad
12. ❌ **Manual Credit Evaluation** – Normalflöde
13. ❌ **Object Valuation** – Normalflöde
14. ❌ **Appeal** – Normalflöde, överklagan godkänd
15. ❌ **Appeal** – Överklagan avvisad, ny överklagan

### P2 (Mindre kritiska flöden)

1. ❌ **Application** – Valideringsfel och korrigering
2. ❌ **Collateral Registration** – Normalflöde

---

## Rekommendation: Implementeringsordning

### Fas 1: Komplettera P0 happy path-flöden (högsta prioritet)

1. **KYC** – Normalflöde (nästa logiska steg efter Application)
2. **Credit Evaluation** – Normalflöde (efter KYC)
3. **Offer** – Normalflöde (efter Credit Decision)
4. **Signing** – Normalflöde (efter Offer)
5. **Disbursement** – Normalflöde (efter Signing)
6. **Mortgage Commitment** – Normalflöde (parallellt flöde för köpare)

### Fas 2: Kritiska alternativa flöden (P1)

1. **Credit Decision** – Avvisad (viktigt för att testa appeal-flöde)
2. **Appeal** – Normalflöde (följer på avvisad ansökan)
3. **KYC** – Manuell granskning krävs
4. **Mortgage Commitment** – Automatiskt avvisad

### Fas 3: Övriga P1 och P2 (lägre prioritet)

Implementera resterande scenarion baserat på behov och komplexitet.

---

## Nästa steg

1. **Validera analysen**: Gå igenom BPMN-filerna och Feature Goals för att bekräfta att analysen stämmer
2. **Prioritera tillsammans**: Diskutera med teamet vilka scenarion som är viktigast
3. **Börja implementera**: Starta med Fas 1, ett scenario i taget
4. **Uppdatera E2eTestsOverviewPage**: Lägg till nya scenarion i `scenarios`-arrayen när de implementeras

---

## Noteringar

- Alla scenarion ska vara baserade på faktiska BPMN-noder och Feature Goals
- Varje scenario ska ha tydlig Given/When/Then baserat på user stories
- Teststeg ska inkludera faktiska BPMN-node-ID:n och typer
- Scenarion ska vara realistiska, inte generiska
- Implementera stegvis, ett scenario i taget, för att säkerställa kvalitet

