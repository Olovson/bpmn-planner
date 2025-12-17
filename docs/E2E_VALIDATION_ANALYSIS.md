# E2E Valideringsanalys - E2E_BR001 och E2E_BR006

**Datum:** 2025-01-XX  
**Status:** Analys av valideringsresultat

---

## 📊 Sammanfattning

Båda scenarion (E2E_BR001 och E2E_BR006) har **20 issues** var enligt valideringssidan.

### Issue-typer i valideringskoden:

1. **Errors (6 typer):**
   - ServiceTask saknar API-anrop
   - UserTask saknar UI-interaktion (2 ställen: direkt i bankProjectTestSteps + via BPMN mapping)
   - BusinessRuleTask saknar DMN-beslut (2 ställen: direkt i bankProjectTestSteps + via BPMN mapping)

2. **Warnings (7 typer):**
   - Subprocess saknar Given
   - Subprocess saknar When
   - Subprocess saknar Then
   - API-anrop saknar mock
   - BPMN → Scenarios mapping: saknad ServiceTask
   - BPMN → Scenarios mapping: saknad UserTask
   - BPMN → Scenarios mapping: saknad BusinessRuleTask

3. **Info (1 typ):**
   - Mock-response saknar fält (från backend state)

---

## 🔍 Nästa steg för att granska resultaten

### Steg 1: Öppna valideringssidan
1. Navigera till `/e2e-quality-validation` i webbläsaren
2. Vänta tills valideringen är klar (process tree laddas först)

### Steg 2: Granska issues per scenario
För varje scenario (E2E_BR001 och E2E_BR006):

1. **Filtrera på Errors först:**
   - Kolla vilka ServiceTasks som saknar API-anrop
   - Kolla vilka UserTasks som saknar UI-interaktion
   - Kolla vilka BusinessRuleTasks som saknar DMN-beslut

2. **Granska Warnings sedan:**
   - Kolla vilka subprocesser som saknar Given/When/Then
   - Kolla vilka API-anrop som saknar mocks
   - Kolla vilka BPMN-noder som saknas i dokumentation

3. **Info kan ignoreras för nu:**
   - Mock-response fält är förbättringsförslag, inte kritiska brister

### Steg 3: Prioritera åtgärder

**Prioritet 1 (Errors):**
- Åtgärda saknade API-anrop för ServiceTasks
- Åtgärda saknade UI-interaktioner för UserTasks
- Åtgärda saknade DMN-beslut för BusinessRuleTasks

**Prioritet 2 (Warnings):**
- Lägg till Given/When/Then för subprocesser som saknar dem
- Lägg till mocks för API-anrop som saknar dem
- Lägg till saknade BPMN-noder i dokumentation

**Prioritet 3 (Info):**
- Förbättra mock-responser med saknade fält (valfritt)

---

## 📝 Exempel på hur issues ser ut

### Error-exempel:
```
[ServiceTask Documentation] ServiceTask "fetch-party-information" (fetch-party-information) saknar API-anrop
📍 bankProjectTestSteps[0].apiCall
💡 Lägg till API-anrop baserat på Feature Goal eller BPMN-nodens syfte
```

### Warning-exempel:
```
[Subprocess Documentation] Subprocess "Application" (order 1) saknar Given
📍 subprocessSteps[0].given
💡 Lägg till Given-beskrivning baserat på Feature Goal
```

### Info-exempel:
```
[Mock Response Quality] Mock-response för **/api/party/information saknar fält "party.createdAt" (förväntat värde: "2025-01-XX")
📍 mortgageE2eMocks.ts → **/api/party/information
💡 Lägg till createdAt i mock-response
```

---

## 🎯 Mål

Efter åtgärder bör båda scenarion ha:
- ✅ **0 errors**
- ✅ **Minimala warnings** (endast för noder som inte är relevanta för scenariot)
- ✅ **90%+ overall score**

---

## 📌 Noteringar

- **BPMN → Scenarios mapping:** Valideringen kollar nu också `subprocessSteps` summaries, så tasks dokumenterade via summaries räknas som dokumenterade.
- **Mock-response parsing:** Har fortfarande problem med JavaScript-kod i mock-filer, men påverkar inte huvudvalideringen.
- **Process tree:** Valideringen använder nu den befintliga process tree-strukturen, vilket gör den snabbare och mer konsekvent.

