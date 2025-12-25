# Exempel: Given/When/Then på root-nivå (Mortgage Application-processen)

Detta exempel visar hur `given`, `when` och `then` på **scenario-nivå** (root-processen) ska se ut för ett E2E-scenario. Detta är en **introduktion/sammanfattning** till hela E2E-scenariot, inte bara för ett specifikt Feature Goal.

## Scenario: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)

### Root-process: Mortgage Application (mortgage.bpmn)

**Feature Goals i ordning:**
1. Application (mortgage-se-application.bpmn)
2. Credit Evaluation (mortgage-se-credit-evaluation.bpmn)
3. Offer (mortgage-se-offer.bpmn)
4. Document Generation (mortgage-se-document-generation.bpmn)
5. Disbursement (mortgage-se-disbursement.bpmn)
6. Collateral Registration (mortgage-se-collateral-registration.bpmn)

---

## ✅ Bra exempel - Given/When/Then på root-nivå

### Given (Förutsättningar för att hela Mortgage Application-processen ska kunna starta)

```
Mortgage Application-processen startar när en person köper sin första bostadsrätt. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening via Pre-screen Party DMN). Bostadsrätten uppfyller alla kriterier automatiskt: värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV-ratio ≤ 85%, plats är acceptabel (inte riskområde). Gateway-conditions: stakeholders.length === 1 (en sökande), propertyType === 'BOSTADSRATT' (bostadsrätt). Ingen befintlig fastighet att sälja. Grundläggande kunddata är tillgänglig och kunden är identifierad.
```

**Varför detta är bra:**
- ✅ Inkluderar root-processens namn ("Mortgage Application-processen startar")
- ✅ Beskriver förutsättningarna för att hela processen ska kunna starta
- ✅ Inkluderar gateway-conditions som avgör vilken path som används
- ✅ Inkluderar prerequisites från första Feature Goalet (Application)
- ✅ Ger kontext om vad som händer (person köper bostadsrätt)

---

### When (Vad som händer genom hela Mortgage Application-processen)

```
Mortgage Application-processen startar. Kunden fyller i komplett ansökan (Application) med personuppgifter, inkomst och önskat lånebelopp. Systemet hämtar kunddata från externa källor automatiskt. Credit Evaluation utvärderar kreditvärdigheten och godkänner automatiskt. KYC godkänns automatiskt med självdeklaration. Credit Decision godkänner. Kunden accepterar erbjudandet (Offer). Systemet genererar dokument (Document Generation). Kunden signerar digitalt. Systemet genomför utbetalning (Disbursement). Handläggaren registrerar säkerhet (Collateral Registration) och distribuerar meddelande om panträtt till BRF.
```

**Varför detta är bra:**
- ✅ Inkluderar root-processens namn ("Mortgage Application-processen startar")
- ✅ Beskriver vad som händer genom hela processen
- ✅ Inkluderar Feature Goal-namn i ordning (Application, Credit Evaluation, Offer, Document Generation, Disbursement, Collateral Registration)
- ✅ Beskriver VAD som händer i varje steg, inte bara att "processen körs"
- ✅ Inkluderar gateway-beslut (KYC godkänns, Credit Decision godkänner)
- ✅ Ger en översikt över hela flödet från start till slut

---

### Then (Förväntat resultat för hela Mortgage Application-processen)

```
Mortgage Application-processen slutförs framgångsrikt. Application är komplett med all nödvändig data (personuppgifter, inkomst, hushållsekonomi, objektinformation). Credit Evaluation godkänner automatiskt och riskbedömning är klar. Offer accepteras av kunden och innehåller korrekt lånebelopp, ränta och villkor. Document Generation genererar alla nödvändiga dokument och dokumenten är signerade av kunden. Disbursement genomförs framgångsrikt och beloppet är överfört till angiven mottagare. Collateral Registration registrerar säkerhet och meddelande om panträtt distribueras till BRF. Hela processen från Application till Collateral Registration slutförs utan fel. Alla relevanta DMN-beslut (Pre-screen Party DMN, Evaluate Bostadsrätt DMN, Screen KALP DMN) ger utfall som leder till godkännande.
```

**Varför detta är bra:**
- ✅ Inkluderar root-processens namn ("Mortgage Application-processen slutförs framgångsrikt")
- ✅ Beskriver förväntat resultat för hela processen
- ✅ Inkluderar slutstatus för varje Feature Goal i ordning (Application, Credit Evaluation, Offer, Document Generation, Disbursement, Collateral Registration)
- ✅ Inkluderar slutstatus för root-processen ("Hela processen från Application till Collateral Registration slutförs utan fel")
- ✅ Inkluderar DMN-beslut och deras resultat
- ✅ Beskriver konkret VAD som ska ha hänt, inte bara att "processen är klar"

---

## ❌ Dåliga exempel (för generella eller för tekniska)

### ❌ Dåligt - För generellt (Given)

```
En person köper en bostadsrätt. Personen uppfyller alla grundläggande krav. Bostadsrätten uppfyller alla kriterier automatiskt.
```

**Varför detta är dåligt:**
- ❌ Saknar root-processens namn
- ❌ Saknar gateway-conditions
- ❌ För generellt - saknar konkret information om vad som faktiskt händer

---

### ❌ Dåligt - För tekniskt (When)

```
Mortgage Application-processen startar. CallActivity application exekveras. ServiceTask fetch-party-information anropar API. BusinessRuleTask credit-evaluation kör DMN. CallActivity offer exekveras. EndEvent success nås.
```

**Varför detta är dåligt:**
- ❌ Använder teknisk BPMN-terminologi (CallActivity, ServiceTask, BusinessRuleTask, EndEvent)
- ❌ Beskriver HUR processen körs, inte VAD som händer
- ❌ Saknar affärsspråk och kontext

---

### ❌ Dåligt - För generellt (Then)

```
Hela processen slutförs utan fel. Alla relevanta beslut ger utfall som leder till godkännande. Utbetalning är slutförd och dokument är arkiverade.
```

**Varför detta är dåligt:**
- ❌ Saknar root-processens namn
- ❌ För generellt - saknar konkret information om vilka Feature Goals som har körts
- ❌ Saknar slutstatus för varje Feature Goal
- ❌ Saknar DMN-beslut och deras resultat

---

## Jämförelse: Root-nivå vs SubprocessSteps

### Root-nivå (scenario-nivå)
- **Syfte:** Introduktion/sammanfattning till hela E2E-scenariot
- **Nivå:** Översiktlig - beskriver hela Mortgage Application-processen
- **Innehåll:** Feature Goal-namn i ordning, gateway-beslut, slutstatus för hela processen
- **Längd:** 2-4 meningar per fält (given/when/then)

### SubprocessSteps (Feature Goal-nivå)
- **Syfte:** Detaljerad information för varje Feature Goal
- **Nivå:** Detaljerad - beskriver vad som händer i varje Feature Goal
- **Innehåll:** Subprocesser, Service Tasks, User Tasks, DMN-beslut, konkreta aktiviteter
- **Längd:** 3-5 meningar per fält (given/when/then)

### Exempel: Application Feature Goal

**Root-nivå (when):**
```
Kunden fyller i komplett ansökan (Application) med personuppgifter, inkomst och önskat lånebelopp. Systemet hämtar kunddata från externa källor automatiskt.
```

**SubprocessSteps (when) - mer detaljerat:**
```
Kunden går in i ansökningsflödet (Application). Systemet hämtar kund- och engagemangsdata automatiskt via internal-data-gathering (fetch-party-information, fetch-engagements). Kunden registrerar hushållets inkomster och utgifter (household - register-household-economy-information). Kunden kompletterar personlig information (stakeholder - register-personal-economy-information). Kunden fyller i bostadsrättens uppgifter och systemet värderar objektet (object - valuate-property). Systemet beräknar KALP och screenar resultatet via Screen KALP DMN. Kunden granskar sammanfattningen och bekräftar ansökan (confirm-application).
```

**Skillnaden:**
- Root-nivå: Översiktlig beskrivning av vad som händer i Application
- SubprocessSteps: Detaljerad beskrivning med subprocesser, Service Tasks, User Tasks och DMN-beslut

---

## Sammanfattning

**Given/When/Then på root-nivå ska:**
1. ✅ Inkludera root-processens namn (t.ex. "Mortgage Application-processen")
2. ✅ Beskriva hela flödet från start till slut
3. ✅ Inkludera Feature Goal-namn i ordning
4. ✅ Inkludera gateway-conditions och gateway-beslut
5. ✅ Beskriva VAD som händer i affärstermer, inte HUR det händer tekniskt
6. ✅ Ge en översikt/introduktion till hela E2E-scenariot

**Given/When/Then på root-nivå ska INTE:**
1. ❌ Vara för generellt (sakna konkret information)
2. ❌ Vara för tekniskt (använda BPMN-terminologi)
3. ❌ Sakna root-processens namn
4. ❌ Sakna Feature Goal-namn i ordning
5. ❌ Beskriva detaljer som hör hemma i SubprocessSteps

