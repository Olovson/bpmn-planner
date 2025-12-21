# Uppdatering: Feature Goal-generering med Lane-information

**Datum:** 2025-01-XX  
**Status:** ✅ Implementerad

---

## 📊 Problem

När Feature Goals aggregerar information från child nodes (User Tasks, Service Tasks, etc.), kunde Claude inte korrekt identifiera om det var **kund** eller **handläggare** som gjorde något i subprocessen. Detta ledde till att Feature Goals kunde nämna användare inkorrekt.

**Exempel på problem:**
- Om en User Task i subprocessen är en "Kund"-uppgift (t.ex. "Register source of equity"), men Feature Goal nämnde "handläggaren" istället för "kunden"
- Om en User Task i subprocessen är en "Handläggare"-uppgift (t.ex. "Evaluate application"), men Feature Goal nämnde "kunden" istället för "handläggaren"

---

## ✅ Lösning

### 1. Lagt till Lane-information i `childrenDocumentation`

**Plats:** `src/lib/llmDocumentation.ts` (rad 731-743)

**Ändring:**
- Lagt till `lane`-fält i varje child node i `childrenDocumentation` för Feature Goals
- `lane` beräknas med `inferLane()` funktionen (samma logik som används för Epics)
- Möjliggör att Claude kan identifiera om en child node är "Kund", "Handläggare" eller "Regelmotor"

**Kod:**
```typescript
return {
  id: descendant.bpmnElementId,
  name: descendant.name,
  type: descendant.type,
  lane: lane, // ✅ Lägg till lane-information
  summary: descendantDoc.summary,
  flowSteps: descendantDoc.flowSteps,
  inputs: descendantDoc.inputs,
  outputs: descendantDoc.outputs,
  // ...
};
```

### 2. Uppdaterat Prompten med Tydliga Instruktioner

**Plats:** `prompts/llm/feature_epic_prompt.md`

**Ändringar:**
1. **Allmänna principer för aggregering:**
   - Lagt till varning om att använda `lane`-fältet för att korrekt identifiera användare
   - Instruktioner om att använda "kunden" för `lane: "Kund"`, "handläggaren" för `lane: "Handläggare"`, och "systemet" för `lane: "Regelmotor"`

2. **flowSteps-sektionen:**
   - Lagt till kritiskt avsnitt om att använda lane-information från child nodes
   - Instruktioner om att korrekt identifiera vem som gör vad i Feature Goal flowSteps

3. **epics-sektionen:**
   - Lagt till instruktioner om att använda lane-information för att korrekt identifiera användare i epic-descriptions

4. **Allmän varning:**
   - Lagt till varning om att alltid använda lane-information från child nodes för att korrekt identifiera vem som gör vad

**Prompt-version:** Uppdaterad från `1.7.0` till `1.8.0`

---

## 🔍 Teknisk Detalj

### Hur Lane-information Används

1. **När Feature Goal genereras:**
   - `buildContextPayload()` samlar in dokumentation från alla descendant nodes
   - För varje descendant node, beräknas `lane` med `inferLane()`
   - `lane` inkluderas i `childrenDocumentation` som skickas till Claude

2. **När Claude genererar Feature Goal:**
   - Claude får `childrenDocumentation` med `lane`-fält för varje child node
   - Claude använder `lane`-information för att korrekt identifiera vem som gör vad
   - Claude aggregerar information och använder korrekt användarbenämning baserat på `lane`

### Exempel

**Före:**
```json
{
  "id": "register-source-of-equity",
  "name": "Register source of equity",
  "type": "userTask",
  "summary": "Kunden registrerar källa till eget kapital...",
  "flowSteps": ["Kunden fyller i information om källa till eget kapital..."]
}
```

**Efter:**
```json
{
  "id": "register-source-of-equity",
  "name": "Register source of equity",
  "type": "userTask",
  "lane": "Kund", // ✅ Nytt fält
  "summary": "Kunden registrerar källa till eget kapital...",
  "flowSteps": ["Kunden fyller i information om källa till eget kapital..."]
}
```

**Claude kan nu:**
- Se att `lane: "Kund"` → använd "kunden" i Feature Goal flowSteps
- Se att `lane: "Handläggare"` → använd "handläggaren" i Feature Goal flowSteps
- Se att `lane: "Regelmotor"` → använd "systemet" i Feature Goal flowSteps

---

## ✅ Verifiering

### Test-scenario:
1. Feature Goal med både kund- och handläggare-uppgifter i subprocessen
2. Claude ska korrekt identifiera vem som gör vad baserat på `lane`-information
3. Feature Goal flowSteps ska använda korrekt användarbenämning

### Förväntat Resultat:
- Feature Goals nämner "kunden" när child nodes har `lane: "Kund"`
- Feature Goals nämner "handläggaren" när child nodes har `lane: "Handläggare"`
- Feature Goals nämner "systemet" när child nodes har `lane: "Regelmotor"`

---

## 📝 Nästa Steg

1. ✅ **Implementerat:** Lane-information i `childrenDocumentation`
2. ✅ **Implementerat:** Uppdaterad prompt med tydliga instruktioner
3. ⏸️ **Nästa gång Feature Goals genereras:** Claude kommer automatiskt att använda lane-information för att korrekt identifiera användare

**Rekommendation:**
- När User Task epics har regenererats med korrekt lane, kommer Feature Goals automatiskt att få korrekt lane-information från child nodes
- Feature Goals behöver inte regenereras omedelbart, men kommer att få korrekt information vid nästa fullständiga regenerering

---

## 🔧 Relaterade Filer

- `src/lib/llmDocumentation.ts` - Lagt till `lane`-fält i `childrenDocumentation`
- `prompts/llm/feature_epic_prompt.md` - Uppdaterad med instruktioner om lane-information (v1.8.0)



