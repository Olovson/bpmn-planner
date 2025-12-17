# Fas 1: Nästa steg

**Datum:** 2025-01-XX  
**Status:** Kvalitetsvalidering refaktorerad, redo för analys

---

## ✅ Genomförda steg

1. ✅ **Refaktorerat kvalitetsvalideringen** - Använder nu process tree istället för att läsa BPMN-filer igen
2. ✅ **Förbättrat validering** - UserTasks, BusinessRuleTasks och ServiceTasks valideras nu mot process tree

---

## 📋 Nästa steg (prioriterade)

### Steg 1: Testa kvalitetsvalideringen
**Syfte:** Verifiera att den refaktorerade kvalitetsvalideringen fungerar korrekt

**Åtgärder:**
1. Navigera till `/e2e-quality-validation` i webbläsaren
2. Verifiera att sidan laddas korrekt (inte BPMN-diagrammet)
3. Kontrollera att valideringen körs och visar resultat för E2E_BR001 och E2E_BR006
4. Verifiera att process tree används (ingen omparsing av BPMN-filer)

**Förväntat resultat:**
- Sidan visar valideringsresultat
- Process tree används (snabbare laddning)
- Resultat för båda scenarion visas

---

### Steg 2: Analysera valideringsresultat
**Syfte:** Identifiera kritiska brister i E2E_BR001 och E2E_BR006

**Åtgärder:**
1. Granska valideringsresultat för E2E_BR001:
   - Antal UserTasks som saknar UI-interaktioner
   - Antal ServiceTasks som saknar API-anrop eller mocks
   - Antal BusinessRuleTasks som saknar DMN-beslut
   - SubprocessSteps som saknar Given/When/Then
   
2. Granska valideringsresultat för E2E_BR006:
   - Samma kontroller som för E2E_BR001
   
3. Prioritera brister:
   - **Kritiska (error):** Måste åtgärdas för att scenarion ska vara användbara
   - **Varningar (warning):** Bör åtgärdas för bättre kvalitet
   - **Info (info):** Förbättringar som kan göras senare

**Förväntat resultat:**
- Lista över kritiska brister per scenario
- Prioriterad åtgärdslista

---

### Steg 3: Åtgärda kritiska brister i E2E_BR001
**Syfte:** Förbättra kvaliteten på E2E_BR001 till minst 90% score

**Åtgärder:**
1. För varje kritisk brist:
   - Identifiera var i koden den ska åtgärdas
   - Uppdatera `E2eTestsOverviewPage.tsx` med saknad information
   - Verifiera att valideringen nu visar förbättring
   
2. Exempel på åtgärder:
   - Lägg till `uiInteraction` för UserTasks som saknar det
   - Lägg till `apiCall` för ServiceTasks som saknar det
   - Lägg till `dmnDecision` för BusinessRuleTasks som saknar det
   - Förbättra `given/when/then` för subprocessSteps som saknar detaljer
   - Lägg till mocks för API-anrop som saknar det

**Förväntat resultat:**
- E2E_BR001 har minst 90% score
- Alla kritiska brister är åtgärdade
- Valideringen visar förbättring

---

### Steg 4: Åtgärda kritiska brister i E2E_BR006
**Syfte:** Förbättra kvaliteten på E2E_BR006 till minst 90% score

**Åtgärder:**
- Samma som Steg 3, men för E2E_BR006

**Förväntat resultat:**
- E2E_BR006 har minst 90% score
- Alla kritiska brister är åtgärdade

---

## 🎯 Mål för Fas 1

- ✅ Båda scenarion (E2E_BR001 och E2E_BR006) har minst 90% kvalitetsscore
- ✅ Alla kritiska brister är åtgärdade
- ✅ Kvalitetsvalideringen fungerar korrekt med process tree
- ✅ Dokumentation är uppdaterad med alla förbättringar

---

## 📝 Noteringar

- **Process tree:** Vi använder nu den befintliga process tree-strukturen istället för att läsa BPMN-filer igen. Detta gör valideringen snabbare och mer konsekvent.
- **Prioritering:** Fokusera på kritiska brister (errors) först, sedan varningar, sedan info.
- **Validering:** Använd kvalitetsvalideringssidan för att verifiera förbättringar efter varje ändring.

