# Identifierade Errors i E2E_BR001 och E2E_BR006

**Datum:** 2025-01-XX  
**Status:** Analys pågår

---

## 📊 Sammanfattning

Båda scenarion (E2E_BR001 och E2E_BR006) har **20 issues** var enligt valideringssidan.

### Analys av bankProjectTestSteps

✅ **Inga direkta errors i bankProjectTestSteps:**
- Alla steg är `CallActivity` eller `Gateway`
- Inga direkta `ServiceTask`, `UserTask` eller `BusinessRuleTask` som saknar information

### Analys av subprocessSteps

✅ **Alla subprocessSteps har Given/When/Then:**
- E2E_BR001: Alla 11 subprocessSteps har given, when och then
- E2E_BR006: Alla 11 subprocessSteps har given, when och then

---

## 🔍 Var kommer errors från?

Errors kommer troligen från **BPMN → Scenarios mapping-valideringen**:

1. **ServiceTasks i BPMN-filer som saknas i dokumentation:**
   - Tasks som finns i BPMN-filer men inte är dokumenterade i `bankProjectTestSteps` eller `subprocessSteps.serviceTasksSummary`

2. **UserTasks i BPMN-filer som saknas i dokumentation:**
   - Tasks som finns i BPMN-filer men inte är dokumenterade i `bankProjectTestSteps` eller `subprocessSteps.userTasksSummary`

3. **BusinessRuleTasks i BPMN-filer som saknas i dokumentation:**
   - Tasks som finns i BPMN-filer men inte är dokumenterade i `bankProjectTestSteps` eller `subprocessSteps.businessRulesSummary`

4. **Dokumenterade tasks som saknar information:**
   - ServiceTasks dokumenterade via summaries som saknar API-anrop
   - UserTasks dokumenterade via summaries som saknar UI-interaktion
   - BusinessRuleTasks dokumenterade via summaries som saknar DMN-beslut

---

## 📝 Nästa steg

### Steg 1: Identifiera specifika errors
1. Öppna `/e2e-quality-validation` i webbläsaren
2. Scrolla genom issues för E2E_BR001 och E2E_BR006
3. Identifiera specifika errors (inte warnings/info):
   - ServiceTasks som saknar API-anrop
   - UserTasks som saknar UI-interaktion
   - BusinessRuleTasks som saknar DMN-beslut
   - Tasks i BPMN som saknas i dokumentation

### Steg 2: Åtgärda errors
För varje error:
1. Identifiera vilken BPMN-fil och task som saknas
2. Lägg till task i `bankProjectTestSteps` eller uppdatera `subprocessSteps` summaries
3. Lägg till saknad information (API-anrop, UI-interaktion, DMN-beslut)

### Steg 3: Verifiera
1. Ladda om valideringssidan
2. Kontrollera att errors är åtgärdade
3. Målsättning: 0 errors, 90%+ overall score

---

## 🎯 Prioritering

**Prioritet 1 (Errors):**
- ServiceTasks som saknar API-anrop
- UserTasks som saknar UI-interaktion
- BusinessRuleTasks som saknar DMN-beslut

**Prioritet 2 (Warnings):**
- Tasks i BPMN som saknas i dokumentation (kan vara avsiktligt om de inte är relevanta för scenariot)

**Prioritet 3 (Info):**
- Mock-response fält (förbättringsförslag, inte kritiska)

---

## 📌 Noteringar

- Valideringen kollar nu också `subprocessSteps` summaries, så tasks dokumenterade via summaries räknas som dokumenterade
- Vissa tasks i BPMN-filer kan vara avsiktligt uteslutna från scenarion (t.ex. error paths, alternative paths)
- Fokusera på errors först, warnings kan vara acceptabla om de är avsiktliga

