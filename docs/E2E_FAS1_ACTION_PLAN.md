# Fas 1: Action Plan - Förbättra befintliga scenarion

**Datum:** 2025-01-XX  
**Status:** Pågående

---

## Sammanfattning

Kvalitetsvalideringen kommer att:
1. Läsa BPMN-filer och extrahera UserTasks, BusinessRuleTasks, ServiceTasks
2. Jämföra med dokumentationen i `bankProjectTestSteps`
3. Identifiera brister

**Viktigt:** UserTasks finns i subprocesserna (t.ex. `confirm-application` i Application subprocess), inte direkt i `bankProjectTestSteps`. Kvalitetsvalideringen hittar dem genom att läsa BPMN-filerna.

---

## Förväntade resultat från kvalitetsvalideringen

### E2E_BR001

**Potentiella brister:**
1. UserTasks i subprocesser som saknar UI-interaktioner i `bankProjectTestSteps`
2. BusinessRuleTasks som saknar DMN-beslut
3. ServiceTasks som saknar API-anrop eller mocks

**Vad som redan är bra:**
- Alla CallActivities har UI-interaktioner dokumenterade (Application, Mortgage Commitment, KYC, Offer, Signing, Collateral Registration)
- Alla Gateways har `dmnDecision` dokumenterat
- Alla ServiceTasks har `apiCall` dokumenterat

---

## Nästa steg

1. **Kör kvalitetsvalideringen** på `/e2e-quality-validation`
2. **Granska resultat** för E2E_BR001 och E2E_BR006
3. **Identifiera issues** (errors, warnings, info)
4. **Åtgärda kritiska brister** (errors först, sedan warnings)
5. **Validera igen** (målsättning: 90%+ score)

---

## Förväntade förbättringar

Baserat på tidigare analys:
- UserTasks i subprocesser kan sakna UI-interaktioner om de inte är dokumenterade i `bankProjectTestSteps`
- BusinessRuleTasks kan sakna DMN-beslut om de inte är dokumenterade
- ServiceTasks kan sakna API-anrop om de inte är dokumenterade

**Åtgärd:** Lägg till saknade fält i `bankProjectTestSteps` eller i `subprocessSteps` beroende på var de hör hemma.

