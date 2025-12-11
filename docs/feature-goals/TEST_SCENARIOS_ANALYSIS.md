# Analys: Testscenarier för Application Feature Goal

## Sammanfattning

**Kort svar:** Testscenarierna är **bra start** men **saknar kritiska scenarier och detaljer** som behövs för att faktiskt testa systemet.

**Bedömning:**
- ✅ **Bra grund:** Scenarier finns, UI Flow finns, testdata-referenser finns
- ⚠️ **Saknar kritiska scenarier:** KALP, Application rejected, Timeout, Skip step, olika ansökningstyper
- ⚠️ **Saknar detaljer:** Konkreta testdata-värden, assertions per steg, timeout-värden, error handling
- ⚠️ **Saknar implementation mapping:** KALP, Screen KALP, gateways, Fetch credit information

---

## Vad som FINNS

### 1. Testscenarier-tabell ✅
- 6 scenarier (S1-S6)
- Metadata: ID, Namn, Typ, Persona, Risk Level, Assertion Type, Outcome, Status
- Täcker: Happy path, Error cases (pre-screen, stakeholder, object rejected), Edge case (komplettering)

### 2. UI Flow per Scenario ✅
- Expanderbara detaljer för varje scenario
- Steg med: Page ID, Action, Locator ID, Data Profile, Kommentar
- Täcker: Navigering, fyll i formulär, verifieringar

### 3. Testdata-referenser ✅
- 6 testdata-profiler beskrivna
- Täcker: Standard, multi-stakeholder, rejected cases, incomplete

### 4. Implementation Mapping ✅
- Mappning mellan BPMN-aktiviteter och routes/endpoints
- Täcker: UI routes, API endpoints, DMN endpoints

---

## Vad som SAKNAS

### 1. Kritiska scenarier saknas ❌

#### KALP-beräkning och screening
- **Saknas:** Scenario för när bekräftelsesteget hoppas över och KALP beräknas automatiskt
- **Behövs:** 
  - Scenario: "KALP-beräkning när bekräftelse hoppas över"
  - Scenario: "KALP OK - ansökan godkänd"
  - Scenario: "KALP OK - ansökan avvisad (Application rejected)"

#### Olika ansökningstyper
- **Saknas:** Scenarier för köp vs flytt/omlåning med olika KALP-regler
- **Behövs:**
  - Scenario: "Köpansökan - KALP justerar ansökt belopp till maximalt belopp"
  - Scenario: "Flytt/omlåning - KALP under ansökt belopp → avvisad"
  - Scenario: "Köpansökan - KALP under tröskelvärde → avvisad"

#### Timeout-hantering
- **Saknas:** Scenario för timeout på "Confirm application"
- **Behövs:**
  - Scenario: "Timeout på Confirm application - ansökan avslutas automatiskt"

#### Skip step gateway
- **Saknas:** Scenario för när bekräftelsesteget hoppas över
- **Behövs:**
  - Scenario: "Skip step - bekräftelse hoppas över, KALP beräknas direkt"

#### Fetch credit information
- **Saknas:** Scenario för kreditupplysning (multi-instance per stakeholder)
- **Behövs:**
  - Scenario: "Fetch credit information - multi-instance för flera stakeholders"

#### Multi-instance edge cases
- **Saknas:** Scenarier för flera hushåll, flera stakeholders med olika kombinationer
- **Behövs:**
  - Scenario: "Flera hushåll - multi-instance Household"
  - Scenario: "Flera stakeholders med olika objekt - multi-instance Stakeholder och Object"

### 2. UI Flow saknar detaljer ❌

#### Specifika testdata-värden
- **Saknas:** Konkreta värden för testdata (t.ex. kreditscore = 750, inkomst = 500 000 SEK)
- **Behövs:** Varje testdata-profil ska ha konkreta värden, inte bara beskrivningar

#### Förväntade resultat/assertions
- **Saknas:** Förväntade resultat för varje steg i UI Flow
- **Behövs:** 
  - "Verifiera att KALP-beräkningen visar maximalt lånebelopp = 2 500 000 SEK"
  - "Verifiera att Screen KALP returnerar 'APPROVED' för köpansökan"
  - "Verifiera att ansökt belopp justeras till 2 500 000 SEK när KALP visar lägre belopp"

#### Timeout-värden
- **Saknas:** Specifika timeout-värden (t.ex. "30 dagar för Confirm application")
- **Behövs:** Timeout-värden för varje steg som har timeout

#### Retry-logik
- **Saknas:** Retry-logik för API-anrop (t.ex. "Fetch credit information" vid API-fel)
- **Behövs:** Retry-steg i UI Flow för API-anrop som kan misslyckas

#### Error handling-steg
- **Saknas:** Steg för att verifiera felmeddelanden och error events
- **Behövs:**
  - "Verifiera att 'pre-screen rejected' error event triggas"
  - "Verifiera att felmeddelande visas: 'Ansökan avvisad: Maximalt lånebelopp (2 500 000 SEK) är under ansökt belopp (3 000 000 SEK)'"

#### KALP-relaterade steg
- **Saknas:** Steg för KALP-beräkning, Screen KALP, KALP OK gateway
- **Behövs:**
  - "Verifiera att KALP-beräkningen är klar"
  - "Verifiera att Screen KALP returnerar 'APPROVED' eller 'REJECTED'"
  - "Verifiera att KALP OK gateway avgör korrekt"

### 3. Testdata-referenser saknar detaljer ❌

#### Konkreta värden
- **Saknas:** Specifika värden för varje testdata-profil
- **Behövs:**
  - `customer-standard`: kreditscore = 750, årsinkomst = 500 000 SEK, anställningsstatus = "fast", ålder = 35
  - `customer-rejected`: kreditscore = 400, årsinkomst = 200 000 SEK, anställningsstatus = "osäker", ålder = 17

#### Olika ansökningstyper
- **Saknas:** Testdata för olika ansökningstyper (köp, flytt, omlåning)
- **Behövs:**
  - `customer-purchase`: ansökningstyp = "köp", ansökt belopp = 3 000 000 SEK
  - `customer-move`: ansökningstyp = "flytt", ansökt belopp = 2 500 000 SEK
  - `customer-refinance`: ansökningstyp = "omlåning", ansökt belopp = 2 000 000 SEK

#### KALP-relaterade testdata
- **Saknas:** Testdata för KALP-beräkning (inkomster, utgifter, befintliga lån)
- **Behövs:**
  - `customer-kalp-high`: årsinkomst = 800 000 SEK, månadsutgifter = 30 000 SEK, befintliga lån = 500 000 SEK → KALP = 3 500 000 SEK
  - `customer-kalp-low`: årsinkomst = 300 000 SEK, månadsutgifter = 25 000 SEK, befintliga lån = 1 000 000 SEK → KALP = 1 200 000 SEK

#### Timeout-scenarier
- **Saknas:** Testdata för timeout-scenarier
- **Behövs:**
  - `customer-timeout`: kund som inte bekräftar ansökan inom 30 dagar

#### Multi-instance edge cases
- **Saknas:** Testdata för flera hushåll, flera stakeholders med olika kombinationer
- **Behövs:**
  - `customer-multi-household`: två hushåll med olika ekonomi
  - `customer-multi-stakeholder-different-objects`: flera stakeholders med olika objekt

### 4. Implementation Mapping saknar aktiviteter ❌

#### KALP-relaterade aktiviteter
- **Saknas:** KALP service task, Screen KALP DMN, KALP OK gateway
- **Behövs:**
  - KALP service task: `/api/application/kalp` (POST) - beräknar maximalt lånebelopp
  - Screen KALP DMN: `/api/dmn/screen-kalp` (POST) - screener KALP-resultat mot affärsregler
  - KALP OK gateway: Logisk gateway (ingen endpoint, men behöver dokumenteras)

#### Gateways
- **Saknas:** Skip step gateway, KALP OK gateway, Sammanför flöden gateway
- **Behövs:**
  - Skip step gateway: Logisk gateway (avgör om bekräftelse hoppas över)
  - KALP OK gateway: Logisk gateway (avgör om KALP är OK)
  - Sammanför flöden gateway: Logisk gateway (samlar ihop bekräftelse- och skip-flöden)

#### Fetch credit information
- **Saknas:** Fetch credit information service task
- **Behövs:**
  - Fetch credit information: `/api/application/fetch-credit-information` (POST) - hämtar kreditinformation från externa källor (t.ex. UC3)

#### Timeout boundary event
- **Saknas:** Timeout boundary event på "Confirm application"
- **Behövs:**
  - Timeout boundary event: Triggas efter 30 dagar om kunden inte bekräftar ansökan

---

## Rekommendationer

### För test lead:
1. **Lägg till saknade scenarier:**
   - KALP-beräkning och screening (3 scenarier)
   - Olika ansökningstyper (3 scenarier)
   - Timeout (1 scenario)
   - Skip step (1 scenario)
   - Fetch credit information (1 scenario)
   - Multi-instance edge cases (2 scenarier)

2. **Förbättra UI Flow:**
   - Lägg till konkreta testdata-värden
   - Lägg till förväntade resultat/assertions för varje steg
   - Lägg till timeout-värden
   - Lägg till retry-logik
   - Lägg till error handling-steg
   - Lägg till KALP-relaterade steg

3. **Förbättra testdata-referenser:**
   - Lägg till konkreta värden för varje profil
   - Lägg till testdata för olika ansökningstyper
   - Lägg till KALP-relaterade testdata
   - Lägg till timeout-scenarier
   - Lägg till multi-instance edge cases

4. **Komplettera Implementation Mapping:**
   - Lägg till KALP service task
   - Lägg till Screen KALP DMN
   - Lägg till gateways (dokumentera logiska gateways)
   - Lägg till Fetch credit information service task
   - Lägg till Timeout boundary event

### För testare:
1. **Använd dokumentet som grund** men komplettera med:
   - Konkreta testdata-värden från testdata-katalog
   - Specifika assertions baserat på förväntade resultat
   - Error handling-steg baserat på error events
   - Retry-logik baserat på API-specifikationer

2. **Identifiera saknade scenarier** och dokumentera dem separat tills de läggs till i huvuddokumentet

3. **Verifiera Implementation Mapping** mot faktisk implementation och uppdatera om det finns avvikelser

---

## Prioritering

### P0 - Kritiska saknade scenarier (måste läggas till):
1. KALP-beräkning och screening (3 scenarier)
2. Application rejected (KALP under tröskelvärde eller under ansökt belopp)
3. Timeout på Confirm application
4. Olika ansökningstyper (köp vs flytt/omlåning)

### P1 - Viktiga saknade detaljer (bör läggas till):
1. Konkreta testdata-värden
2. Förväntade resultat/assertions per steg
3. KALP-relaterade steg i UI Flow
4. Implementation Mapping för KALP-aktiviteter

### P2 - Önskvärda förbättringar (kan läggas till senare):
1. Retry-logik
2. Multi-instance edge cases
3. Timeout-scenarier i testdata
4. Detaljerad error handling-steg

