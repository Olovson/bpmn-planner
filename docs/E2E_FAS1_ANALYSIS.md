# Fas 1: Analys av brister i E2E_BR001 och E2E_BR006

**Datum:** 2025-01-XX  
**Syfte:** Identifiera och åtgärda brister i befintliga scenarion innan vi skapar nya

---

## Analysmetod

1. **Granska bankProjectTestSteps** för båda scenarion
2. **Identifiera brister:**
   - UserTasks som saknar `uiInteraction`
   - BusinessRuleTasks som saknar `dmnDecision`
   - ServiceTasks som saknar `apiCall`
   - Gateway-beslut som saknar `dmnDecision`
3. **Åtgärda kritiska brister**

---

## E2E_BR001 - Identifierade brister

### UserTasks

1. ✅ `confirm-application` - Har UI-interaktion
2. ✅ `register-household-economy-information` - Har UI-interaktion (förbättrad tidigare)
3. ✅ `register-personal-economy-information` - Har UI-interaktion (förbättrad tidigare)
4. ✅ `decide-mortgage-commitment` - Har UI-interaktion (förbättrad tidigare)
5. ✅ `submit-self-declaration` - Har UI-interaktion
6. ✅ `decide-offer` - Har UI-interaktion
7. ✅ Digital signing - Har UI-interaktion

### BusinessRuleTasks

1. ✅ `is-purchase` gateway - Har `dmnDecision`
2. ✅ `is-automatically-approved` gateway - Har `dmnDecision`
3. ✅ `is-credit-approved` gateway - Har `dmnDecision`
4. ✅ `needs-collateral-registration` gateway - Har `dmnDecision`

### ServiceTasks

Alla ServiceTasks verkar ha `apiCall` dokumenterat.

---

## E2E_BR006 - Identifierade brister

E2E_BR006 bygger på samma struktur som E2E_BR001, så bristerna är liknande.

---

## Nästa steg

1. Kör kvalitetsvalideringen för att få en automatisk lista över brister
2. Åtgärda identifierade brister
3. Validera igen

