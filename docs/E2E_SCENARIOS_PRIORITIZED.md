# Prioriterade E2E-scenarion för implementation

**Genererad:** 2025-01-XX  
**Syfte:** Tydlig prioritering av vilka E2E-scenarion som ska implementeras och i vilken ordning

---

## Sammanfattning

**Totalt identifierade E2E-scenarion:** 20+  
**Redan implementerade:** 2 (Application S1, Credit Decision)  
**Saknas (P0):** 8-10 kritiska scenarion  
**Saknas (P1):** 5-7 viktiga scenarion  

---

## Prioriterad implementation-ordning

### ✅ FÄRDIGA (redan implementerade)

1. **FG_APPLICATION_S1** - Application – Normalflöde, komplett ansökan med en person
   - **Status:** ✅ Implementerad
   - **Testfil:** `mortgage-application-happy.spec.ts`

2. **FG_CREDIT_DECISION_TC01** - Mortgage SE – Credit Decision – Happy Path
   - **Status:** ✅ Implementerad
   - **Testfil:** `mortgage-credit-decision-happy.spec.ts`

---

### 🔴 P0 - KRITISKA (måste implementeras först)

#### 1. E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)
**Prioritet:** **P0 - HÖGST** - Detta är det vanligaste scenariot och det enklaste.

**Beskrivning:**
- En person köper sin första bostadsrätt
- Bostadsrätten uppfyller alla kriterier automatiskt
- **INGEN befintlig fastighet att sälja** (enklare scenario)
- Bostadsrättsvärde ≥ 1.5M SEK
- Föreningsskuld ≤ 5000 SEK/m²
- LTV-ratio ≤ 85%
- Plats är acceptabel (inte riskområde)

**BPMN-flöde:** Flöde B (Köp Happy Path) med is-purchase = Yes

**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (redan implementerat)
- `mortgage-mortgage-commitment-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-object-valuation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-object-information-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-kyc-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-decision-v2.html` (S1) - ✅ **FINNS** (redan implementerat)
- `mortgage-offer-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-document-generation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-signing-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-disbursement-v2.html` (S1) - ⚠️ **SAKNAS**

**Status:** ⚠️ **DELVIS** - Endast Application och Credit Decision finns. Resten saknas.

**Varför först:** Detta är det enklaste och vanligaste scenariot - en person, ingen befintlig fastighet, allt godkänns automatiskt.

---

#### 2. E2E-005: Application avvisad (pre-screen)
**Prioritet:** **P0** - Viktig error path.

**Beskrivning:**
- En person ansöker om bolån men uppfyller INTE grundläggande krav
- Pre-screening avvisar ansökan automatiskt
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde C (Error Path - Application avvisad)

**Feature Goals:**
- `mortgage-application-v2.html` (S3) - ⚠️ **SAKNAS**
- `mortgage-se-internal-data-gathering-v2.html` (error scenario) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Varför näst:** Viktig error path som testar pre-screening.

---

#### 3. E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt
**Prioritet:** **P0** - Användaren nämnde detta specifikt.

**Beskrivning:**
- Två personer (huvudansökande + medsökare) köper bostadsrätt tillsammans
- Bostadsrätten uppfyller alla kriterier automatiskt
- **INGEN befintlig fastighet att sälja** (enklare scenario)
- Multi-instance hantering för KYC och Stakeholder

**BPMN-flöde:** Flöde B (Köp Happy Path) med multi-instance

**Feature Goals:**
- `mortgage-application-v2.html` (S2) - ⚠️ **SAKNAS** (användaren nämnde detta)
- `mortgage-mortgage-commitment-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-object-valuation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-kyc-v2.html` (S4-S8) - ⚠️ **SAKNAS** (multi-instance scenarion)
- Samma som E2E-BR-001 för resten

**Status:** ⚠️ **SAKNAS** - Inget av detta finns.

**Varför tredje:** Användaren nämnde detta specifikt, men det är mer komplext än E2E-BR-001.

---

#### 4. E2E-006: KYC avvisad
**Prioritet:** **P0** - Viktig error path.

**Beskrivning:**
- Ansökan passerar Application men KYC avvisar en person
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde D (Error Path - KYC avvisad)

**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-kyc-v2.html` (S3) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

---

#### 5. E2E-007: Credit Decision avvisad
**Prioritet:** **P0** - Viktig error path.

**Beskrivning:**
- Ansökan passerar Application och KYC men Credit Decision avvisar
- Tydligt felmeddelande till kunden

**BPMN-flöde:** Flöde E (Error Path - Credit Decision avvisad)

**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-kyc-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-decision-v2.html` (error scenario) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

---

### 🟡 P1 - VIKTIGA (implementeras efter P0)

#### 6. E2E-BR-002: En sökande - Bostadsrätt kräver manuell granskning (LTV 80-85%)
**Prioritet:** **P1** - Vanligt scenario, kräver manuell granskning.

**Beskrivning:**
- En person köper bostadsrätt
- LTV-ratio är 80-85% (gränsvärden)
- Kräver manuell granskning men kan godkännas

**BPMN-flöde:** Flöde B med manuell granskning

**Feature Goals:**
- `mortgage-se-object-information-v2.html` (S2 eller S3) - ⚠️ **SAKNAS**
- `mortgage-se-credit-evaluation-v2.html` (S2 eller S3) - ⚠️ **SAKNAS**

---

#### 7. E2E-008: Appeal-flöde
**Prioritet:** **P1** - Alternativt flöde.

**Beskrivning:**
- Automatiskt avvisad → appeal → manuell evaluering → godkänd

**BPMN-flöde:** Flöde F (Alternative Path - Appeal)

**Feature Goals:**
- `mortgage-appeal-v2.html` (S1-S10) - ⚠️ **SAKNAS**
- `mortgage-manual-credit-evaluation-v2.html` (S1-S11) - ⚠️ **SAKNAS**

---

#### 8. E2E-010: Advance-flöde
**Prioritet:** **P1** - Alternativt flöde.

**Beskrivning:**
- Kunden väljer advance (boundary event på offer)
- Advance document generation och disbursement

**BPMN-flöde:** Flöde H (Alternative Path - Advance)

**Feature Goals:**
- `mortgage-se-document-generation-document-generation-advance-v2.html` (S1-S7) - ⚠️ **SAKNAS**
- `mortgage-se-disbursement-disbursement-advance-v2.html` (S1-S5) - ⚠️ **SAKNAS**

---

### 🟢 P2 - MINDRE KRITISKA (implementeras senare)

#### 9. E2E-BR-009: En sökande - Behöver sälja befintlig bostadsrätt först
**Prioritet:** **P2** - Mer komplext scenario.

**Beskrivning:**
- En person köper bostadsrätt men behöver sälja befintlig bostadsrätt först
- Hanteras i Object-processen ("Register source of equity")
- Mer komplext än E2E-BR-001

**Varför senare:** Mer komplext - bör implementeras efter enklare scenarion.

---

#### 10. E2E-BR-010: Två sökande - Behöver sälja befintlig bostadsrätt först
**Prioritet:** **P2** - Mest komplext scenario.

**Beskrivning:**
- Två personer köper bostadsrätt tillsammans men behöver sälja befintlig bostadsrätt först
- Kombination av multi-instance och befintlig fastighet

**Varför senast:** Mest komplext - bör implementeras sist.

---

## Implementation-rekommendation

**Nästa steg:**
1. ✅ **E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt** (P0 - HÖGST)
   - Detta är det enklaste och vanligaste scenariot
   - En person, ingen befintlig fastighet, allt godkänns automatiskt
   - Bör implementeras FÖRE scenarion med medsökare eller befintlig fastighet

2. ⚠️ **E2E-005: Application avvisad (pre-screen)** (P0)
   - Viktig error path
   - Relativt enkelt att implementera

3. ⚠️ **E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt** (P0)
   - Användaren nämnde detta specifikt
   - Mer komplext än E2E-BR-001 (multi-instance)

---

## Noteringar

**Vad som implementerades fel:**
- ❌ Implementerade Application S2 (med medsökare) istället för E2E-BR-001 (en sökande)
- ❌ Började med mer komplext scenario istället för det enklaste

**Korrekt ordning:**
1. ✅ E2E-BR-001: En sökande, ingen befintlig fastighet (ENKLAST)
2. ⚠️ E2E-005: Application avvisad (error path)
3. ⚠️ E2E-BR-006: Två sökande, ingen befintlig fastighet (mer komplext)
4. ⚠️ E2E-BR-009: En sökande, behöver sälja befintlig fastighet (mer komplext)
5. ⚠️ E2E-BR-010: Två sökande, behöver sälja befintlig fastighet (MEST KOMPLEXT)

