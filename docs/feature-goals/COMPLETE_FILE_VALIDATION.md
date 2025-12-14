# Komplett filvalidering - ALLA sektioner måste vara perfekta

## ⚠️ KRITISK REGEL

**VARJE FIL MÅSTE VARA PERFEKT FÖR ALLA SEKTIONER - INGA UNDANTAG**

## 📋 Komplett sektionslista som MÅSTE valideras för varje fil

### 1. Beskrivning av FGoal
- [ ] Tydlig beskrivning av vad feature goalet gör
- [ ] Vem som utför aktiviteten (kund, handläggare, system)
- [ ] Affärsorienterat språk (inte tekniskt)

### 2. Processteg - Input
- [ ] Alla förutsättningar dokumenterade
- [ ] Affärsorienterat (inte tekniskt)

### 3. Processteg - Output
- [ ] Alla möjliga utfall dokumenterade
- [ ] Felhantering dokumenterad (affärsorienterat)
- [ ] INGA tekniska krav (timeout, retry, error codes) - dessa ska vara i Tekniska krav

### 4. Omfattning
- [ ] Alla huvudsteg dokumenterade
- [ ] Felhantering dokumenterad (affärsorienterat)
- [ ] INGA tekniska krav (timeout, retry, error codes, logging, skalbarhet, säkerhet)
- [ ] Notis om att tekniska krav finns i Tekniska krav-sektionen
- [ ] Affärsorienterat språk

### 5. Avgränsning
- [ ] Tydligt vad som INTE ingår
- [ ] Affärsorienterat språk

### 6. Beroenden
- [ ] Alla externa system dokumenterade
- [ ] Integrationer dokumenterade
- [ ] Affärsorienterat språk

### 7. BPMN - Process
- [ ] Referens till BPMN-processen
- [ ] Tydlig beskrivning

### 8. Testgenerering
- [ ] Testscenarier med Given-When-Then struktur
- [ ] Alla scenariotyper (Happy, Error, Edge)
- [ ] UI Flow per scenario
- [ ] Testdata-referenser
- [ ] Implementation mapping (om relevant)

### 9. Effekt
- [ ] Executive Summary (direktörsvänlig, kortfattad, 3-4 kategorier)
- [ ] Volym-baserade beräkningar
- [ ] Detaljerade sektioner med tabeller (OBLIGATORISKT):
  - [ ] Sektion 1: Automatisering och kostnadsbesparingar (med tabell)
  - [ ] Sektion 2: Snabbare processering och förbättrad kundupplevelse (med tabell)
  - [ ] Sektion 3: Kapacitetsökning (med tabell)
- [ ] Jämförelse med nuvarande process (tabell)
- [ ] Aggregeringsinformation (OBLIGATORISKT - tabell med kolumner: Effekt, Typ, Volym, Aggregeringsbar, Redan inkluderad i parent)
- [ ] Alla siffror är konservativa uppskattningar och markeras som sådana

### 10. User stories
- [ ] Funktionella acceptanskriterier ingår (vad användaren ser/gör, UI/UX)
- [ ] INGA tekniska krav (timeout, retry, error codes)
- [ ] Notis om att tekniska krav finns i Tekniska krav-sektionen
- [ ] Koncisa och lättlästa
- [ ] Organiserade i kategorier (Kundperspektiv, Handläggarperspektiv, etc.)

### 11. Tekniska krav (tidigare Acceptanskriterier)
- [ ] Sektionen är döpt om till "Tekniska krav"
- [ ] INGA funktionella acceptanskriterier (dessa ska vara i User stories)
- [ ] Endast tekniska krav (timeout, retry, error codes, logging)
- [ ] Skalbarhet och prestanda
- [ ] Säkerhet och compliance
- [ ] Organiserade i kategorier: Tekniska krav, Skalbarhet och prestanda, Säkerhet och compliance
- [ ] Notis om att funktionella acceptanskriterier finns i User stories-sektionen

### 12. Process Diagram
- [ ] BPMN-diagram referens

## ✅ Valideringsprocess

För varje fil, gå igenom ALLA 12 sektioner ovan och verifiera att varje punkt är uppfylld.

**INGEN fil ska markeras som klar förrän ALLA 12 sektioner är validerade och uppfyllda.**

## 📊 Status för filer

### Filerna som behöver komplett validering (inklusive de jag redan "uppdaterat"):

1. [x] `mortgage-application-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
2. [x] `mortgage-appeal-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
3. [x] `mortgage-Activity_17f0nvn-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
4. [x] `mortgage-collateral-registration-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
5. [x] `mortgage-kyc-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
6. [x] `mortgage-manual-credit-evaluation-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
7. [x] `mortgage-mortgage-commitment-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
8. [x] `mortgage-object-valuation-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
9. [x] `mortgage-offer-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
10. [x] `mortgage-se-application-household-v2.html` - ✅ VALIDERAD OCH PERFEKT (alla sektioner)
11. [ ] `mortgage-se-application-object-v2.html`
12. [ ] `mortgage-se-application-stakeholder-v2.html`
13. [ ] `mortgage-se-credit-decision-sales-contract-credit-decision-v2.html`
14. [ ] `mortgage-se-credit-decision-v2.html`
15. [ ] `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`
16. [ ] `mortgage-se-credit-evaluation-v2.html`
17. [ ] `mortgage-se-disbursement-disbursement-advance-v2.html`
18. [ ] `mortgage-se-disbursement-v2.html`
19. [ ] `mortgage-se-document-generation-document-generation-advance-v2.html`
20. [ ] `mortgage-se-document-generation-v2.html`
21. [ ] `mortgage-se-documentation-assessment-v2.html`
22. [ ] `mortgage-se-internal-data-gathering-v2.html`
23. [ ] `mortgage-se-manual-credit-evaluation-object-control-v2.html`
24. [ ] `mortgage-se-object-information-v2.html`
25. [ ] `mortgage-se-signing-per-digital-document-package-v2.html`
26. [ ] `mortgage-se-signing-v2.html`

**Totalt: 26 filer - ALLA behöver komplett validering av ALLA sektioner**

