# Uppdatering: Användning av Faktiska BPMN Swimlanes för Lane Inference

**Datum:** 2025-01-XX  
**Status:** ✅ Implementerad

---

## 📊 Problem

Tidigare använde `inferLane()` bara heuristik baserat på task-namn för att avgöra om en User Task var kund eller handläggare. Men i BPMN kan en swimlane heta vad som helst (t.ex. "application"), och det betyder inte att alla User Tasks i den swimlanen är kund-uppgifter.

**Exempel:**
- I filen `mortgage-se-application.bpmn` kan det finnas en swimlane som heter "application"
- I den swimlanen kan det finnas både kund-uppgifter (t.ex. "Register source of equity") och handläggare-uppgifter
- Tidigare logik kunde inte skilja mellan dessa baserat på faktisk BPMN lane

---

## ✅ Lösning

### 1. Extrahera Faktisk BPMN Lane

**Ny funktion:** `extractLaneFromBpmnElement()`

- Går uppåt i BPMN businessObject-hierarkin för att hitta processen
- Söker igenom `laneSet` -> `lanes` -> `flowNodeRef` för att hitta vilken lane som innehåller denna task
- Returnerar lane-namnet om det hittas

### 2. Mappa BPMN Lane-namn till Interna Kategorier

**Ny funktion:** `mapBpmnLaneToInternalLane()`

- Mappar BPMN lane-namn (t.ex. "Stakeholder", "Caseworker", "System") till våra interna kategorier ("Kund", "Handläggare", "Regelmotor")
- Hanterar vanliga lane-namn i kreditprocesser

### 3. Uppdaterad `inferLane()` Logik

**Ny prioritetsordning:**
1. **Först:** Försök extrahera faktisk BPMN lane från elementet
2. **Om lane finns:** Mappa lane-namnet till våra interna kategorier
3. **Specialfall:** Om lane är "Kund" men task-namnet innehåller interna nyckelord (t.ex. "evaluate"), kan det vara en handläggare-uppgift
4. **Fallback:** Om lane saknas eller är otydlig, använd heuristik baserat på task-namn (samma logik som tidigare)

---

## 🔍 Teknisk Detalj

### BPMN Lane-struktur

I BPMN 2.0:
```xml
<bpmn:process>
  <bpmn:laneSet>
    <bpmn:lane name="Stakeholder">
      <bpmn:flowNodeRef>register-source-of-equity</bpmn:flowNodeRef>
    </bpmn:lane>
    <bpmn:lane name="Caseworker">
      <bpmn:flowNodeRef>evaluate-application</bpmn:flowNodeRef>
    </bpmn:lane>
  </bpmn:laneSet>
</bpmn:process>
```

### Lane-mappning

**Kund/stakeholder-lanes:**
- "Kund", "Customer", "Stakeholder", "Applicant", "Sökande"
- ⚠️ **Specialfall:** "Application" kan vara både kund och processnamn

**Handläggare/anställd-lanes:**
- "Handläggare", "Caseworker", "Valuator", "Employee", "Anställd", "Credit Evaluator", "Evaluator"

**System/regelmotor-lanes:**
- "System", "Regelmotor", "Backend", "Integration"

### Specialfall-hantering

Om lane heter "application" men task-namnet innehåller interna nyckelord (t.ex. "evaluate application"), kan det vara en handläggare-uppgift trots att lane är "application". Detta hanteras genom att kolla task-namnet även när lane finns.

---

## ✅ Resultat

När Feature Goals och Epics genereras kommer de nu att:
1. **Först försöka använda faktisk BPMN lane** om den finns
2. **Fallback till heuristik** om lane saknas eller är otydlig
3. **Hantera specialfall** där lane-namnet kan vara missvisande

Detta säkerställer att dokumentationen korrekt reflekterar vem som gör vad baserat på faktisk BPMN-struktur, inte bara gissningar baserat på task-namn.

---

## 📝 Exempel

### Före:
- Task: "Register source of equity" i lane "application"
- `inferLane()` → "Kund" (baserat på task-namn heuristik)
- ✅ Fungerade i detta fall, men kunde misslyckas om task-namnet var otydligt

### Efter:
- Task: "Register source of equity" i lane "Stakeholder"
- `extractLaneFromBpmnElement()` → "Stakeholder"
- `mapBpmnLaneToInternalLane()` → "Kund"
- `inferLane()` → "Kund" (baserat på faktisk lane)
- ✅ Fungerar även om task-namnet är otydligt

### Specialfall:
- Task: "Evaluate application" i lane "application"
- `extractLaneFromBpmnElement()` → "application"
- `mapBpmnLaneToInternalLane()` → "Kund"
- Men task-namnet innehåller "evaluate" (internt nyckelord)
- `inferLane()` → "Handläggare" (specialfall-hantering)
- ✅ Korrekt identifiering trots missvisande lane-namn

---

## 🔧 Relaterade Filer

- `src/lib/llmDocumentation.ts` - Uppdaterad `inferLane()` med lane-extraktion
- `docs/analysis/BPMN_LANE_EXTRACTION_UPDATE.md` - Denna dokumentation



