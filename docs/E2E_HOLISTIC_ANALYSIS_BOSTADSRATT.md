# Holistisk analys: E2E-scenarion för bostadsrättsköp i Sverige

**Genererad:** 2025-01-XX  
**Syfte:** Affärsperspektiv på kritiska E2E-scenarion för bostadsrättsköp, bortom BPMN-filer och user stories

**Fokus:** Köp av bostadsrätt (bostadsrättsförening) i Sverige

---

## Affärskontext: Bostadsrättsköp i Sverige

### Unika aspekter för bostadsrätt

1. **Bostadsrättsförening (BRF):**
   - Föreningsskuld per kvadratmeter (max 5000 SEK/m²)
   - Avgifter och föreningsavgifter
   - Föreningens ekonomi och hälsa
   - Bostadsrättsvärde (minimum 1.5M SEK)

2. **LTV-ratio (Loan-to-Value):**
   - Maximum 85% för bostadsrätt
   - Gränsvärden 80-85% kräver manuell granskning
   - Beräknas som: lånebelopp / bostadsrättsvärde

3. **Plats och riskområden:**
   - Bostadsrätter i riskområden avvisas automatiskt
   - Geografisk riskbedömning

4. **Timing och köpekontrakt:**
   - Köpekontrakt har deadline (ofta 30-60 dagar)
   - Tidskänsligt - kunden behöver snabbt beslut
   - Bostadsrätt kan säljas till annan köpare om processen tar för lång tid

5. **Befintlig fastighet:**
   - Många kunder behöver sälja befintlig bostadsrätt först
   - Detta påverkar cash flow och riskbedömning
   - Timing - när ska befintlig bostadsrätt säljas?

---

## Kritiska E2E-scenarion från affärsperspektiv

### Kategori 1: En sökande - Standardflöden

#### E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)
**Affärsscenario:** En person köper sin första bostadsrätt. Bostadsrätten uppfyller alla kriterier automatiskt.

**Kritiska aspekter:**
- Bostadsrättsvärde ≥ 1.5M SEK
- Föreningsskuld ≤ 5000 SEK/m²
- LTV-ratio ≤ 85%
- Plats är acceptabel (inte riskområde)
- En person - enklare bedömning

**BPMN-flöde:** Flöde B (Köp Happy Path) med is-purchase = Yes

**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ Finns
- `mortgage-mortgage-commitment-v2.html` (S1) - ⚠️ Saknas
- `mortgage-object-valuation-v2.html` (S1) - ⚠️ Saknas
- `mortgage-se-object-information-v2.html` (S1) - Bostadsrätt normalflöde - ⚠️ Saknas
- `mortgage-kyc-v2.html` (S1) - ⚠️ Saknas
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ Saknas
- `mortgage-se-credit-decision-v2.html` (S1) - ✅ Finns
- `mortgage-offer-v2.html` (S1) - ⚠️ Saknas
- `mortgage-se-document-generation-v2.html` (S1) - ⚠️ Saknas
- `mortgage-se-signing-v2.html` (S1) - ⚠️ Saknas
- `mortgage-se-disbursement-v2.html` (S1) - ⚠️ Saknas

**Prioritet:** **P0** - Detta är det vanligaste scenariot.

#### E2E-BR-002: En sökande - Bostadsrätt kräver manuell granskning (LTV 80-85%)
**Affärsscenario:** En person köper bostadsrätt. LTV-ratio är 80-85% (gränsvärden) - kräver manuell granskning men kan godkännas.

**Kritiska aspekter:**
- Bostadsrättsvärde ≥ 1.5M SEK
- Föreningsskuld ≤ 5000 SEK/m²
- LTV-ratio 80-85% (gränsvärden)
- Plats är acceptabel
- Kräver manuell granskning men kan godkännas

**BPMN-flöde:** Flöde B med manuell granskning i Object Information eller Credit Evaluation

**Feature Goals:**
- `mortgage-se-object-information-v2.html` (S2 eller S3) - Bostadsrätt kräver manuell granskning - ⚠️ Saknas
- `mortgage-se-credit-evaluation-v2.html` (S2 eller S3) - ⚠️ Saknas

**Prioritet:** **P0** - Vanligt scenario, kräver manuell granskning.

#### E2E-BR-003: En sökande - Bostadsrätt avvisad (hög föreningsskuld)
**Affärsscenario:** En person köper bostadsrätt. Föreningsskuld är > 5000 SEK/m² - avvisad automatiskt.

**Kritiska aspekter:**
- Föreningsskuld > 5000 SEK/m²
- Automatisk avvisning
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde B med error path i Object Information

**Feature Goals:**
- `mortgage-se-object-information-v2.html` (error scenario) - ⚠️ Saknas

**Prioritet:** **P0** - Viktig error path.

#### E2E-BR-004: En sökande - Bostadsrätt avvisad (riskområde)
**Affärsscenario:** En person köper bostadsrätt i riskområde - avvisad automatiskt oavsett andra kriterier.

**Kritiska aspekter:**
- Plats i riskområde
- Automatisk avvisning (kritisk regel)
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde B med error path i Object Information

**Feature Goals:**
- `mortgage-se-object-information-v2.html` (error scenario) - ⚠️ Saknas

**Prioritet:** **P0** - Kritisk regel (plats är kritisk).

#### E2E-BR-005: En sökande - Bostadsrätt avvisad (LTV > 85%)
**Affärsscenario:** En person köper bostadsrätt. LTV-ratio är > 85% - avvisad automatiskt.

**Kritiska aspekter:**
- LTV-ratio > 85%
- Automatisk avvisning
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde B med error path i Object Information eller Credit Evaluation

**Feature Goals:**
- `mortgage-se-object-information-v2.html` (error scenario) - ⚠️ Saknas
- `mortgage-se-credit-evaluation-v2.html` (error scenario) - ⚠️ Saknas

**Prioritet:** **P0** - Viktig error path.

---

### Kategori 2: Flera sökande (medsökare) - Standardflöden

#### E2E-BR-006: Två sökande (sökande + medsökare) - Bostadsrätt godkänd automatiskt
**Affärsscenario:** Två personer köper bostadsrätt tillsammans. Bostadsrätten uppfyller alla kriterier automatiskt. Kombinerad inkomst ger högre lånebelopp.

**Kritiska aspekter:**
- Två personer - multi-instance KYC och Stakeholder
- Kombinerad inkomst - högre lånebelopp möjligt
- Båda personer måste godkännas
- Bostadsrätt uppfyller alla kriterier

**BPMN-flöde:** Flöde B med multi-instance KYC och Stakeholder

**Feature Goals:**
- `mortgage-application-v2.html` (S2) - Flera personer - ⚠️ Saknas (användaren nämnde detta specifikt)
- `mortgage-kyc-v2.html` (S4-S8) - Multi-instance scenarion - ⚠️ Saknas
- `mortgage-se-application-stakeholder-v2.html` (multi-instance) - ⚠️ Saknas
- Samma som E2E-BR-001 för resten

**Prioritet:** **P0** - Användaren nämnde detta som viktigt. Vanligt scenario.

#### E2E-BR-007: Två sökande - En person avvisad i KYC
**Affärsscenario:** Två personer köper bostadsrätt tillsammans. En person avvisas i KYC - hela ansökan avvisas.

**Kritiska aspekter:**
- Två personer - multi-instance KYC
- En person avvisas i KYC
- Hela ansökan avvisas (båda måste godkännas)
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde B med multi-instance KYC, error path

**Feature Goals:**
- `mortgage-application-v2.html` (S2) - ⚠️ Saknas
- `mortgage-kyc-v2.html` (S3) - KYC avvisad - ⚠️ Saknas
- `mortgage-kyc-v2.html` (S4-S8) - Multi-instance scenarion - ⚠️ Saknas

**Prioritet:** **P0** - Viktig error path för multi-instance.

#### E2E-BR-008: Två sökande - En person avvisad i pre-screen
**Affärsscenario:** Två personer köper bostadsrätt tillsammans. En person avvisas i pre-screen - hela ansökan avvisas omedelbart.

**Kritiska aspekter:**
- Två personer - multi-instance pre-screen
- En person avvisas i pre-screen
- Hela ansökan avvisas omedelbart (innan KYC)
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde B med multi-instance pre-screen, error path

**Feature Goals:**
- `mortgage-application-v2.html` (S2) - ⚠️ Saknas
- `mortgage-application-v2.html` (S13) - Pre-screen avvisad för en av flera personer - ⚠️ Saknas
- `mortgage-se-internal-data-gathering-v2.html` (error scenario) - ⚠️ Saknas

**Prioritet:** **P0** - Viktig error path för multi-instance.

---

### Kategori 3: Befintlig fastighet - Timing och cash flow

#### E2E-BR-009: En sökande - Behöver sälja befintlig bostadsrätt först
**Affärsscenario:** En person köper ny bostadsrätt men behöver sälja befintlig bostadsrätt först. Cash flow är beroende av försäljningen.

**Kritiska aspekter:**
- Befintlig bostadsrätt måste säljas
- Timing - när ska befintlig bostadsrätt säljas?
- Cash flow - kunden behöver pengar från försäljningen
- Riskbedömning - vad händer om försäljningen fallerar?
- Kanske behöver bridge loan eller villkorat godkännande

**BPMN-flöde:** Flöde B med extra validering/bedömning

**Feature Goals:**
- `mortgage-se-application-object-v2.html` - "Register source of equity" user task
  - **Hittat:** "Om källan är försäljning av befintlig fastighet, måste fastighetsinformation tillhandahållas"
  - Detta är en del av Object-processen när kunden anger källa till eget kapital
  - Kunden kan välja "försäljning av befintlig fastighet" som källa
  - Systemet kräver då fastighetsinformation för befintlig fastighet
- Detta scenario finns **delvis** i Feature Goals men inte som explicit testscenario

**Prioritet:** **P0** - Mycket vanligt scenario i Sverige.

**Notering:** Detta hanteras i:
- **Object-processen** - "Register source of equity" user task (kunden anger att källan är försäljning av befintlig fastighet)
- **Credit Evaluation** - cash flow-beräkning tar hänsyn till försäljningen
- **Manual Credit Evaluation** - manuell bedömning av timing och risk

#### E2E-BR-010: Två sökande - Behöver sälja befintlig bostadsrätt först
**Affärsscenario:** Två personer köper ny bostadsrätt tillsammans men behöver sälja befintlig bostadsrätt först.

**Kritiska aspekter:**
- Två personer - multi-instance
- Befintlig bostadsrätt måste säljas
- Kombinerad cash flow-beräkning
- Timing och riskbedömning

**BPMN-flöde:** Flöde B med multi-instance och extra validering

**Feature Goals:**
- Kombination av E2E-BR-006 och E2E-BR-009

**Prioritet:** **P0** - Vanligt scenario.

---

### Kategori 4: Edge cases och komplexa scenarion

#### E2E-BR-011: En sökande - Bostadsrätt med ofullständig BRF-information
**Affärsscenario:** En person köper bostadsrätt. BRF-information är ofullständig - kräver manuell granskning eller komplettering.

**Kritiska aspekter:**
- BRF-information saknas eller är ofullständig
- Kräver manuell granskning
- Processen kan pausas för komplettering
- Timing - köpekontrakt har deadline

**BPMN-flöde:** Flöde B med error/timeout i Object Information

**Feature Goals:**
- `mortgage-se-object-information-v2.html` (S4 eller S5) - Timeout eller service error - ⚠️ Saknas

**Prioritet:** **P1** - Edge case men viktigt för kundupplevelse.

#### E2E-BR-012: En sökande - Bostadsrätt med osäker värdering
**Affärsscenario:** En person köper bostadsrätt. Värdering är osäker - kräver manuell granskning.

**Kritiska aspekter:**
- Bostadsrättsvärde är osäkert
- Kräver manuell värdering
- Processen kan pausas
- Timing - köpekontrakt har deadline

**BPMN-flöde:** Flöde B med manuell granskning i Object Valuation

**Feature Goals:**
- `mortgage-object-valuation-v2.html` (S2 eller S3) - Manuell värdering - ⚠️ Saknas

**Prioritet:** **P1** - Edge case.

#### E2E-BR-013: En sökande - Appeal-flöde (bostadsrätt avvisad → appeal → godkänd)
**Affärsscenario:** En person köper bostadsrätt. Bostadsrätten avvisas automatiskt men kunden överklagar. Efter manuell granskning godkänns ansökan.

**Kritiska aspekter:**
- Bostadsrätt avvisad automatiskt
- Kunden överklagar
- Manuell granskning
- Timing - köpekontrakt har deadline (30-60 dagar)

**BPMN-flöde:** Flöde F (Appeal-flöde)

**Feature Goals:**
- `mortgage-appeal-v2.html` (S1-S10) - ⚠️ Saknas
- `mortgage-manual-credit-evaluation-v2.html` (S1-S11) - ⚠️ Saknas

**Prioritet:** **P1** - Alternativt flöde, viktigt för kundupplevelse.

#### E2E-BR-014: En sökande - Advance-flöde (behöver pengar snabbt)
**Affärsscenario:** En person köper bostadsrätt. Kunden behöver pengar snabbt för att säkra köpet - advance-disbursement.

**Kritiska aspekter:**
- Kunden behöver pengar snabbt
- Advance-disbursement triggas
- Timing - köpekontrakt har deadline
- Riskbedömning - högre risk med advance

**BPMN-flöde:** Flöde H (Advance-flöde)

**Feature Goals:**
- `mortgage-se-document-generation-document-generation-advance-v2.html` (S1-S7) - ⚠️ Saknas
- `mortgage-se-disbursement-disbursement-advance-v2.html` (S1-S5) - ⚠️ Saknas

**Prioritet:** **P1** - Alternativt flöde, viktigt för timing.

---

### Kategori 5: Timing och deadline-scenarion

#### E2E-BR-015: En sökande - Processen tar för lång tid (köpekontrakt deadline)
**Affärsscenario:** En person köper bostadsrätt. Processen tar för lång tid - köpekontrakt deadline närmar sig eller passerar.

**Kritiska aspekter:**
- Köpekontrakt har deadline (30-60 dagar)
- Processen tar för lång tid
- Kunden kan förlora bostadsrätten
- Kanske behöver prioriteras eller eskaleras

**BPMN-flöde:** Flöde B med timeout eller eskalering

**Feature Goals:**
- Detta scenario kanske inte finns explicit - behöver analyseras

**Prioritet:** **P1** - Viktigt för kundupplevelse och affär.

**Notering:** Detta är en viktig affärslogik som kanske hanteras i:
- Application (kunden anger deadline)
- Manual Credit Evaluation (prioritering)
- Systemet kan eskalera automatiskt

---

## Prioritering: Vad är viktigast för bostadsrättsköp?

### P0 - Måste implementeras (kritiska scenarion)

1. **E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt** ⚠️ **DELVIS**
   - Detta är det vanligaste scenariot
   - Saknas: Mortgage Commitment, Object Valuation, Object Information (bostadsrätt), KYC, Credit Evaluation, Offer, Document Generation, Signing, Disbursement

2. **E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt** ⚠️ **SAKNAS**
   - Användaren nämnde detta specifikt
   - Vanligt scenario
   - Saknas: Application S2, KYC multi-instance, Stakeholder multi-instance, resten

3. **E2E-BR-003: En sökande - Bostadsrätt avvisad (hög föreningsskuld)** ⚠️ **SAKNAS**
   - Viktig error path
   - Automatisk avvisning

4. **E2E-BR-004: En sökande - Bostadsrätt avvisad (riskområde)** ⚠️ **SAKNAS**
   - Kritisk regel (plats är kritisk)
   - Automatisk avvisning

5. **E2E-BR-005: En sökande - Bostadsrätt avvisad (LTV > 85%)** ⚠️ **SAKNAS**
   - Viktig error path
   - Automatisk avvisning

6. **E2E-BR-007: Två sökande - En person avvisad i KYC** ⚠️ **SAKNAS**
   - Viktig error path för multi-instance

7. **E2E-BR-008: Två sökande - En person avvisad i pre-screen** ⚠️ **SAKNAS**
   - Viktig error path för multi-instance

8. **E2E-BR-009: En sökande - Behöver sälja befintlig bostadsrätt först** ⚠️ **SAKNAS**
   - Mycket vanligt scenario i Sverige
   - Kanske inte explicit i BPMN?

### P1 - Bör implementeras (viktiga scenarion)

9. **E2E-BR-002: En sökande - Bostadsrätt kräver manuell granskning (LTV 80-85%)** ⚠️ **SAKNAS**
10. **E2E-BR-010: Två sökande - Behöver sälja befintlig bostadsrätt först** ⚠️ **SAKNAS**
11. **E2E-BR-011: En sökande - Bostadsrätt med ofullständig BRF-information** ⚠️ **SAKNAS**
12. **E2E-BR-013: En sökande - Appeal-flöde** ⚠️ **SAKNAS**
13. **E2E-BR-014: En sökande - Advance-flöde** ⚠️ **SAKNAS**
14. **E2E-BR-015: En sökande - Processen tar för lång tid** ⚠️ **SAKNAS**

---

## Jämförelse: BPMN-baserade vs affärsbaserade scenarion

### Vad BPMN-filerna täcker:
- ✅ Tekniska flöden (sequence flows, gateways, boundary events)
- ✅ Processstruktur (call activities, subprocesses)
- ✅ Error paths (boundary events, escalations)

### Vad BPMN-filerna INTE täcker explicit:
- ⚠️ **Befintlig fastighet** - behöver sälja först (E2E-BR-009, E2E-BR-010)
  - **Hittat:** Hanteras delvis i Object-processen ("Register source of equity" user task)
  - Kunden kan välja "försäljning av befintlig fastighet" som källa till eget kapital
  - Systemet kräver då fastighetsinformation för befintlig fastighet
  - Men: Ingen explicit testscenario för detta i Feature Goals
- ❌ **Timing och deadline** - köpekontrakt deadline (E2E-BR-015)
- ⚠️ **Bostadsrättsspecifika regler** - föreningsskuld, LTV-ratio, plats (delvis täckt i Object Information)
- ⚠️ **Multi-instance scenarion** - medsökare (täckt i BPMN men inte explicit i hela flöden)

### Vad Feature Goals täcker:
- ✅ Bostadsrättsspecifika regler (Object Information, Evaluate Bostadsrätt)
- ✅ Multi-instance scenarion (Application S2, KYC S4-S8)
- ✅ Error scenarion (pre-screen, stakeholder, object rejected)

### Vad Feature Goals INTE täcker explicit:
- ⚠️ **Befintlig fastighet** - behöver sälja först
  - **Hittat:** Hanteras delvis i Object-processen ("Register source of equity")
  - Men: Ingen explicit testscenario för detta
- ❌ **Timing och deadline** - köpekontrakt deadline
- ❌ **Hela flöden** - endast delprocesser

---

## Rekommendation: Implementeringsordning för bostadsrättsköp

### Fas 1: P0 Happy Path-scenarion (högsta prioritet)

1. **E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt** (komplettera)
   - Bygg på befintliga Application S1 och Credit Decision
   - Lägg till: Mortgage Commitment S1, Object Valuation S1, Object Information (bostadsrätt) S1, KYC S1, Credit Evaluation S1, Offer S1, Document Generation S1, Signing S1, Disbursement S1

2. **E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt** (ny)
   - Användaren nämnde detta specifikt
   - Lägg till: Application S2, KYC multi-instance (S4-S8), Stakeholder multi-instance
   - Återanvänd resten från E2E-BR-001

### Fas 2: P0 Error Path-scenarion

3. **E2E-BR-003: En sökande - Bostadsrätt avvisad (hög föreningsskuld)**
4. **E2E-BR-004: En sökande - Bostadsrätt avvisad (riskområde)**
5. **E2E-BR-005: En sökande - Bostadsrätt avvisad (LTV > 85%)**
6. **E2E-BR-007: Två sökande - En person avvisad i KYC**
7. **E2E-BR-008: Två sökande - En person avvisad i pre-screen**

### Fas 3: P0 Befintlig fastighet-scenarion

8. **E2E-BR-009: En sökande - Behöver sälja befintlig bostadsrätt först**
   - Detta kanske inte finns explicit i BPMN - behöver analyseras
   - Kanske hanteras i Application eller Credit Evaluation?

9. **E2E-BR-010: Två sökande - Behöver sälja befintlig bostadsrätt först**

### Fas 4: P1 Edge cases och alternativa flöden

10. **E2E-BR-002: En sökande - Bostadsrätt kräver manuell granskning (LTV 80-85%)**
11. **E2E-BR-011: En sökande - Bostadsrätt med ofullständig BRF-information**
12. **E2E-BR-013: En sökande - Appeal-flöde**
13. **E2E-BR-014: En sökande - Advance-flöde**
14. **E2E-BR-015: En sökande - Processen tar för lång tid**

---

## Nästa steg

1. **Verifiera om "befintlig fastighet" hanteras i BPMN:**
   - Sök i Application, Credit Evaluation, Manual Credit Evaluation
   - Kanske hanteras som en del av hushållsekonomi eller cash flow-beräkning?

2. **Verifiera om "timing och deadline" hanteras:**
   - Sök i Application, Manual Credit Evaluation
   - Kanske hanteras som prioritet eller eskalering?

3. **Prioritera första scenariot att bygga:**
   - Rekommendation: **E2E-BR-001** (komplettera) eller **E2E-BR-006** (två sökande - användaren nämnde detta)

4. **Följ checklistan** i `E2E_SCENARIO_CREATION_CHECKLIST.md`

---

## Noteringar

- **Bostadsrättsspecifika regler** är viktiga (föreningsskuld, LTV-ratio, plats) - delvis täckt i Object Information
- **Multi-instance** är viktigt (medsökare) - användaren nämnde detta specifikt
- **Befintlig fastighet** är mycket vanligt i Sverige - kanske inte explicit i BPMN?
- **Timing och deadline** är viktigt för köpekontrakt - kanske inte explicit i BPMN?
- **Hela flöden** saknas - endast delprocesser finns

