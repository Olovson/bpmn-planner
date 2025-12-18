# Reviderad Strategi: UI Flow i Feature Goals

**Datum:** 2025-01-27  
**Syfte:** Analysera om UI Flow-tabeller i Feature Goals verkligen behövs

---

## 🔍 Analys: Vad behövs faktiskt?

### Nuvarande Situation

**Feature Goals (CallActivities/subprocesser):**
- `mortgage-se-application-stakeholder-v2.html` = CallActivity "stakeholder"
- Innehåller UI Flow-tabeller för hela subprocessen
- Många TODO:s i UI Flow-tabellerna

**E2E-scenarion:**
- Har redan mycket detaljerad `uiInteraction`-info
- Exempel: `"Navigate: application-start (nav-application). Verify: page-loaded... Fill: input-personal-income..."`
- Innehåller Page IDs, Locator IDs, Actions

**Epic-filer (UserTasks):**
- `consent-to-credit-check-v2.html` = UserTask
- `register-personal-economy-information-v2.html` = UserTask
- Har UI-beskrivningar i "Användarupplevelse"-sektionen

**Implementation Mapping i Feature Goals:**
- Har redan routes/endpoints för aktiviteter
- Exempel: `/application/stakeholder/consent` för `consent-to-credit-check`

---

## ❓ Kritiska Frågor

### 1. Varför finns UI Flow-tabeller i Feature Goals?

**Möjliga anledningar:**
- ✅ Referens för testare när de skapar E2E-tester
- ✅ Översikt över hela subprocessens UI-flöde
- ❌ Duplicering av information som redan finns i E2E-scenarion?

### 2. Används UI Flow-tabellerna faktiskt?

**Från kodanalys:**
- `exportReadyTestGenerator.ts` använder `uiFlow` för att generera Playwright-kod
- Men E2E-scenarion har redan `uiInteraction` som används direkt

**Slutsats:** UI Flow-tabellerna verkar vara för **testgenerering**, men E2E-scenarion har redan denna info.

### 3. Vad är skillnaden?

**UI Flow i Feature Goals:**
- Strukturerad tabell (Steg, Page ID, Action, Locator ID, Data Profile)
- Per scenario (S1, S2, S3)
- För hela subprocessen

**UI Interaction i E2E-scenarion:**
- Lång textsträng med alla steg
- Per BPMN-nod
- Mycket detaljerad

---

## 💡 Föreslagen Lösning

### Alternativ 1: Ta bort UI Flow-tabeller från Feature Goals (RADIKALT)

**Fördelar:**
- ✅ Ingen duplicering
- ✅ En källa till sanning (E2E-scenarion)
- ✅ Mindre underhåll

**Nackdelar:**
- ❌ Feature Goals blir mindre självständiga
- ❌ Svårare att se översikt i Feature Goal

**När detta fungerar:**
- Om E2E-scenarion alltid är uppdaterade
- Om Feature Goals bara är referens, inte primär källa

### Alternativ 2: Behåll UI Flow men gör dem enklare (PRAKTISKT)

**Fördelar:**
- ✅ Översiktlig referens i Feature Goal
- ✅ Mindre detaljerad än E2E-scenarion
- ✅ Fokus på huvudflöde, inte alla steg

**Struktur:**
- Bara huvudsteg (navigate till UserTask, submit, verify)
- Inte varje fill/click/verify-steg
- Referens till Epic-filer för detaljer

**Exempel:**
```
Steg 1: Navigera till /application/stakeholder/consent
Steg 2: Ge samtycke (se Epic: consent-to-credit-check)
Steg 3: Navigera till /application/stakeholder/personal-economy
Steg 4: Fyll i personlig ekonomi (se Epic: register-personal-economy-information)
```

### Alternativ 3: Bara för UserTasks i Feature Goal-processen (KOMPROMISS)

**Logik:**
- Feature Goals är CallActivities (subprocesser)
- UserTasks finns i subprocesserna (Epic-filer)
- UI Flow-tabeller behövs bara om Feature Goal-processen har egna UserTasks

**I praktiken:**
- De flesta Feature Goals är bara CallActivities → inga UserTasks → ingen UI Flow behövs
- Bara Feature Goals med direkta UserTasks behöver UI Flow

---

## 🎯 Rekommendation

### **Alternativ 2: Behåll UI Flow men gör dem enklare**

**Anledning:**
1. Feature Goals ska vara självständiga dokument
2. UI Flow ger översikt, E2E-scenarion ger detaljer
3. Mindre arbete än att fylla i alla detaljer

**Implementation:**
1. **För varje UserTask i subprocessen:**
   - 1 steg: Navigera till sidan (Page ID från Implementation Mapping)
   - 1 steg: Utför uppgift (referens till Epic-fil)
   - 1 steg: Verifiera resultat

2. **Inte:**
   - Varje fill/click/verify-steg
   - Detaljerade Locator IDs (finns i Epic-filer)
   - Detaljerade Data Profile-värden (finns i E2E-scenarion)

3. **Länka till:**
   - Epic-filer för detaljerade UI-beskrivningar
   - E2E-scenarion för detaljerade teststeg

**Exempel för `mortgage-se-application-stakeholder-v2.html`:**

```html
<tr>
  <td>1</td>
  <td>/application/stakeholder/consent</td>
  <td>navigate</td>
  <td>nav-consent-to-credit-check</td>
  <td>stakeholder-primary</td>
  <td>Navigera till samtyckessidan. Se Epic: consent-to-credit-check för detaljerade UI-steg.</td>
</tr>
<tr>
  <td>2</td>
  <td>/application/stakeholder/consent</td>
  <td>complete</td>
  <td>-</td>
  <td>stakeholder-primary</td>
  <td>Ge samtycke till kreditupplysning. Se Epic: consent-to-credit-check för formulärfält och validering.</td>
</tr>
<tr>
  <td>3</td>
  <td>/application/stakeholder/personal-economy</td>
  <td>navigate</td>
  <td>nav-register-personal-economy</td>
  <td>stakeholder-primary</td>
  <td>Navigera till personlig ekonomi-sidan. Se Epic: register-personal-economy-information för detaljerade UI-steg.</td>
</tr>
<tr>
  <td>4</td>
  <td>/application/stakeholder/personal-economy</td>
  <td>complete</td>
  <td>-</td>
  <td>stakeholder-primary</td>
  <td>Fyll i och spara personlig ekonomi. Se Epic: register-personal-economy-information för formulärfält och validering.</td>
</tr>
```

**Resultat:**
- ✅ 4 steg istället för 14
- ✅ Översiktlig referens
- ✅ Länkar till Epic-filer för detaljer
- ✅ Mycket mindre arbete att underhålla

---

## 📋 Reviderad Implementationsplan

### Steg 1: Definiera standard för förenklad UI Flow
- [ ] Max 3-5 steg per UserTask
- [ ] Fokus på navigation och completion
- [ ] Länka till Epic-filer för detaljer

### Steg 2: Uppdatera befintliga UI Flow-tabeller
- [ ] Förenkla till huvudsteg
- [ ] Lägg till länkar till Epic-filer
- [ ] Ta bort detaljerade fill/click/verify-steg

### Steg 3: Validera mot E2E-scenarion
- [ ] Kontrollera att Page IDs matchar
- [ ] Kontrollera att länkar till Epic-filer fungerar
- [ ] Verifiera att översikten är korrekt

---

## 🎯 Slutsats

**UI Flow-tabeller i Feature Goals behövs, men:**
- ✅ Som **översiktlig referens**, inte detaljerad guide
- ✅ Med **länkar till Epic-filer** för detaljer
- ✅ **Förenklade** (3-5 steg per UserTask, inte 10-15)

**Detta ger:**
- ✅ Mycket mindre arbete (80% minskning)
- ✅ Mindre duplicering
- ✅ Tydligare struktur (översikt vs detaljer)
- ✅ Lättare att underhålla

