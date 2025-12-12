# Extern analys: Testscenarion för Application Feature Goal

## Syfte
Analysera testscenarion i `mortgage-application-v2.html` utifrån best practices för testscenario-beskrivningar, oberoende av andra filer vi producerat.

## Best Practices för Testscenarion

### 1. **Given-When-Then struktur**
Bra testscenarion bör ha en tydlig struktur:
- **Given**: Förutsättningar och initialt tillstånd
- **When**: Handlingar och händelser som triggar testet
- **Then**: Förväntade resultat och verifieringar

### 2. **Specifika förutsättningar**
- Tydligt vad som måste vara sant innan testet startar
- Vilka data som behövs (testdata-referenser)
- Systemtillstånd (t.ex. "ansökan är i bekräftelsesteget")

### 3. **Tydliga steg i rätt ordning**
- Sekventiella steg som är lätta att följa
- Tydlig ordning på handlingar
- Separera systemhandlingar från användarhandlingar

### 4. **Specifika assertions**
- Vad exakt ska verifieras?
- Vilka värden ska kontrolleras?
- Vilka felmeddelanden ska visas?

### 5. **Testdata-referenser**
- Vilka testdata-profiler ska användas?
- Vilka specifika värden behövs?

### 6. **Tekniska detaljer integrerade**
- Tekniska detaljer bör vara del av beskrivningen, inte separerade
- Gateway-beslut, events, etc. bör nämnas i kontext

---

## Analys av Nuvarande Testscenarion

### Problem identifierade

#### 1. **Saknar Given-When-Then struktur** ❌
**Nuvarande format:**
> "En person ansöker om bolån för köp. Alla grundläggande krav uppfylls: personen är godkänd vid pre-screening..."

**Problem:**
- Lång löpande text utan tydlig struktur
- Svårt att snabbt förstå förutsättningar vs handlingar vs resultat
- Test lead måste tolka texten manuellt

**Förbättring:**
```
**Given:**
- En person ansöker om bolån för köp
- Personen uppfyller alla grundläggande krav (godkänd vid pre-screening)
- Fastigheten uppfyller bankens krav (godkänd vid bedömning)
- Hushållsekonomi och personlig information är insamlad
- Testdata: customer-standard

**When:**
- Systemet beräknar maximalt lånebelopp (KALP)
- Kunden bekräftar ansökan
- Systemet hämtar kreditinformation

**Then:**
- KALP-beräkningen är högre än ansökt belopp
- Ansökan godkänns (Gateway_0fhav15 = Yes)
- Kreditinformation är hämtad för alla stakeholders
- Processen avslutas normalt (Event_0j4buhs)
- Ansökan är klar för kreditevaluering
```

#### 2. **Saknar specifika förutsättningar** ❌
**Nuvarande format:**
> "En person ansöker om bolån men uppfyller inte grundläggande krav (t.ex. för ung, för låg kreditscore, eller saknar anställning)."

**Problem:**
- "t.ex." gör det oklart vilka exakta förutsättningar som krävs
- Test lead vet inte vilka specifika värden som ska användas
- Svårt att skapa reproducerbara tester

**Förbättring:**
```
**Given:**
- En person ansöker om bolån
- Personen uppfyller INTE grundläggande krav (välj ett av följande):
  - Ålder < 18 år, ELLER
  - Kreditscore < minimumkrav, ELLER
  - Saknar anställning
- Testdata: customer-rejected (pre-screen)

**When:**
- Systemet hämtar kunddata från interna system
- Pre-screen Party DMN utvärderas

**Then:**
- Pre-screen Party DMN returnerar REJECTED
- Boundary event Event_03349px triggas
- Error_1vtortg (pre-screen-rejected) signaleras
- Processen avslutas med Event_1uj7wwd
- Tydligt felmeddelande visas som förklarar vilket krav som inte uppfylldes
```

#### 3. **Saknar tydliga steg i rätt ordning** ❌
**Nuvarande format:**
> "Systemet hämtar automatiskt kunddata från interna system och gör pre-screening (godkänd). Fastighetsinformation samlas in och bedöms (godkänd). Kunden fyller i hushållsekonomi..."

**Problem:**
- Alla steg i en lång mening
- Oklart vilken ordning stegen sker i
- Svårt att följa flödet

**Förbättring:**
```
**Steg:**
1. Application anropas från Mortgage huvudprocessen
2. Internal data gathering startar automatiskt (multi-instance per part)
   - Systemet hämtar kunddata från interna system
   - Pre-screen Party DMN utvärderas → APPROVED
3. Object call activity körs
   - Fastighetsinformation samlas in
   - Evaluate Fastighet DMN utvärderas → APPROVED
4. Parallella flöden startar:
   a. Household: Kunden fyller i hushållsekonomi
   b. Per household subprocess: Household → Stakeholder → Object
5. Skip step? gateway utvärderas → No
6. KALP service task beräknar maximalt belopp
7. Screen KALP DMN utvärderas → APPROVED
8. KALP OK? gateway → Yes
9. Confirm application user task aktiveras
10. Kunden bekräftar ansökan
11. Gateway_1nszp2i samlar flöden
12. Fetch credit information körs (multi-instance per stakeholder)
13. Processen avslutas normalt (Event_0j4buhs)
```

#### 4. **Saknar specifika assertions** ❌
**Nuvarande format:**
> "Ansökan är klar för kreditevaluering."

**Problem:**
- För vagt - vad exakt ska verifieras?
- Test lead vet inte vilka assertions som behövs
- Svårt att skapa automatiserade tester

**Förbättring:**
```
**Assertions:**
- Pre-screen Party DMN returnerar "APPROVED"
- Evaluate Fastighet DMN returnerar "APPROVED"
- KALP-beräkning är slutförd och lagrad i KALP datastore
- Screen KALP DMN returnerar "APPROVED"
- Gateway_0fhav15 (KALP OK) = Yes
- Confirm application user task är aktiverad
- Kunden kan bekräfta ansökan
- Kreditinformation är hämtad för alla stakeholders
- Kreditinformation är sparad i "Personal credit information source" datastore
- Processen avslutas med Event_0j4buhs (normal end event)
- Ansökan är i tillstånd "klar för kreditevaluering"
```

#### 5. **Saknar testdata-referenser** ❌
**Nuvarande format:**
> Ingen referens till testdata

**Problem:**
- Test lead vet inte vilka data som ska användas
- Svårt att skapa reproducerbara tester
- Olika testare kan använda olika data

**Förbättring:**
```
**Testdata:**
- customer-standard (godkänd kund med god ekonomi)
- application-purchase (köpansökan)
- property-approved (godkänd fastighet)
```

#### 6. **Tekniska detaljer är separerade** ❌
**Nuvarande format:**
> "...processen fortsätter. **Tekniska detaljer:** Gateway skip-confirm-application = No..."

**Problem:**
- Tekniska detaljer är separerade från beskrivningen
- Svårt att se samband mellan affärslogik och teknik
- Test lead måste hoppa mellan sektioner

**Förbättring:**
Integrera tekniska detaljer i beskrivningen:
```
När bekräftelse inte hoppas över (Gateway skip-confirm-application = No), 
beräknar systemet automatiskt maximalt lånebelopp via KALP service task 
(Activity_0p3rqyp). Affärsregeln Screen KALP (Activity_1mezc6h) utvärderas 
och returnerar APPROVED. Gateway_0fhav15 (KALP OK) avgör att ansökan är 
godkänd (Yes), och processen fortsätter till Confirm application user task.
```

#### 7. **Saknar förväntade felmeddelanden** ❌
**Nuvarande format:**
> "Tydligt felmeddelande visas som förklarar vilket krav som inte uppfylldes."

**Problem:**
- För vagt - vad exakt ska meddelandet säga?
- Test lead kan inte verifiera att rätt meddelande visas
- Olika testare kan tolka olika

**Förbättring:**
```
**Förväntat felmeddelande:**
- "Ansökan avvisad: Du uppfyller inte grundläggande krav för bolån."
- Specifikt meddelande baserat på vilket krav som inte uppfylldes:
  - "Du måste vara minst 18 år för att ansöka om bolån" (om ålder < 18)
  - "Din kreditscore är under vårt minimumkrav" (om kreditscore < minimum)
  - "Du måste ha en anställning för att ansöka om bolån" (om saknar anställning)
```

#### 8. **Saknar timeout-värden** ❌
**Nuvarande format:**
> "Kunden bekräftar inte ansökan inom tidsgränsen."

**Problem:**
- "tidsgränsen" är för vagt
- Test lead vet inte hur lång timeout är
- Svårt att testa timeout-scenariot

**Förbättring:**
```
**Given:**
- En kund har fyllt i all information för ansökan
- Confirm application user task är aktiv
- Timeout är satt till 30 dagar (P30D)

**When:**
- 30 dagar passerar utan att kunden bekräftat ansökan

**Then:**
- Boundary event Event_0ao6cvb (timer) triggas efter 30 dagar
- Error_1bicfvu (application-timeout) signaleras
- Processen avslutas med Event_111g1im
- Tydligt meddelande visas: "Ansökan avslutad: Du har inte bekräftat ansökan inom tidsgränsen (30 dagar). Vänligen starta en ny ansökan om du vill fortsätta."
```

#### 9. **Saknar verifieringar per steg** ❌
**Nuvarande format:**
> Ingen tydlig verifiering per steg

**Problem:**
- Test lead vet inte vad som ska verifieras i varje steg
- Svårt att skapa detaljerade tester
- Risk att missa viktiga verifieringar

**Förbättring:**
```
**Steg med verifieringar:**
1. Application anropas
   - **Verifiera:** Application-processen är startad
   - **Verifiera:** Start event Event_0isinbn är triggat

2. Internal data gathering körs
   - **Verifiera:** Multi-instance loop startar för alla parts
   - **Verifiera:** Data hämtas från interna system
   - **Verifiera:** Pre-screen Party DMN anropas för varje part
   - **Verifiera:** Pre-screen Party DMN returnerar APPROVED för alla parts

3. Object call activity körs
   - **Verifiera:** Object subprocess är startad
   - **Verifiera:** Fastighetsinformation samlas in
   - **Verifiera:** Evaluate Fastighet DMN anropas
   - **Verifiera:** Evaluate Fastighet DMN returnerar APPROVED
```

#### 10. **Saknar edge cases för multi-instance** ❌
**Nuvarande format:**
> "Flera personer ansöker tillsammans om bolån..."

**Problem:**
- Oklart hur systemet hanterar olika kombinationer
- Saknar scenarion för när vissa personer lyckas och andra misslyckas
- Saknar scenarion för olika antal personer/hushåll

**Förbättring:**
Lägg till fler scenarion:
- S16: Multi-instance - en person lyckas, en misslyckas (partial success)
- S17: Multi-instance - olika antal personer (1, 2, 3+)
- S18: Multi-instance - olika antal hushåll (1, 2, 3+)

---

## Rekommenderad Struktur för Förbättrade Testscenarion

### Format:
```
**Scenario ID:** S1
**Namn:** Normalflöde – komplett ansökan med en person
**Typ:** Happy
**Persona:** customer
**Risk Level:** P0
**Assertion Type:** functional

**Given:**
- [Tydliga förutsättningar med testdata-referenser]

**When:**
- [Tydliga steg i rätt ordning]

**Then:**
- [Specifika assertions och verifieringar]

**Testdata:**
- [Testdata-profiler som ska användas]

**Tekniska detaljer:**
- [Gateway-beslut, events, etc. integrerade i beskrivningen]

**Förväntade felmeddelanden:**
- [Om error scenario: specifika felmeddelanden]
```

---

## Sammanfattning

### Nuvarande status: ⚠️
- **Bra:** Täcker många viktiga flöden (15 scenarion)
- **Bra:** Affärsmässig kontext finns
- **Bra:** Tekniska detaljer finns (men separerade)

### Förbättringsområden: ❌
1. **Struktur:** Saknar Given-When-Then format
2. **Specifika förutsättningar:** För vagt, saknar testdata-referenser
3. **Tydliga steg:** Lång löpande text, svår att följa
4. **Assertions:** För vagt, saknar specifika verifieringar
5. **Felmeddelanden:** För vagt, saknar exakta meddelanden
6. **Timeout-värden:** För vagt, saknar specifika värden
7. **Verifieringar per steg:** Saknas helt
8. **Edge cases:** Kan utökas för multi-instance

### Prioritering:
1. **Hög prioritet:** Given-When-Then struktur, specifika assertions, testdata-referenser
2. **Medel prioritet:** Tydliga steg, förväntade felmeddelanden, timeout-värden
3. **Låg prioritet:** Verifieringar per steg, fler edge cases

