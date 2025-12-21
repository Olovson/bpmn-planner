# Snabbguide: Regenerera User Task Epics via UI

**Datum:** 2025-01-XX  
**Syfte:** Regenerera endast User Task epics efter fix av lane inference-logik

---

## ⚡ Snabbmetod (Rekommenderat)

Eftersom TypeScript-scriptet kräver Vite-konfiguration, är det enklaste att använda UI:et. Här är en snabbguide:

### Steg 1: Öppna BpmnFileManager

1. Starta dev-servern: `npm run dev`
2. Gå till BpmnFileManager-sidan i appen

### Steg 2: Regenerera för varje BPMN-fil

För varje BPMN-fil som innehåller User Tasks:

1. **Hitta filen** i listan
2. **Klicka på "Generate Documentation"** (eller motsvarande knapp)
3. **Välj "LLM Generation"** (Cloud)
4. **Vänta tills genereringen är klar**

### Lista över filer att regenerera:

Följande 14 BPMN-filer innehåller User Tasks som behöver regenereras:

1. ✅ `mortgage-se-appeal.bpmn` (2 User Tasks)
2. ✅ `mortgage-se-application.bpmn` (1 User Task)
3. ✅ `mortgage-se-collateral-registration.bpmn` (3 User Tasks)
4. ✅ `mortgage-se-credit-decision.bpmn` (3 User Tasks)
5. ✅ `mortgage-se-documentation-assessment.bpmn` (2 User Tasks)
6. ✅ `mortgage-se-household.bpmn` (1 User Task)
7. ✅ `mortgage-se-kyc.bpmn` (2 User Tasks)
8. ✅ `mortgage-se-manual-credit-evaluation.bpmn` (3 User Tasks)
9. ✅ `mortgage-se-mortgage-commitment.bpmn` (1 User Task)
10. ✅ `mortgage-se-object-control.bpmn` (7 User Tasks)
11. ✅ `mortgage-se-object.bpmn` (2 User Tasks)
12. ✅ `mortgage-se-offer.bpmn` (4 User Tasks)
13. ✅ `mortgage-se-signing.bpmn` (2 User Tasks)
14. ✅ `mortgage-se-stakeholder.bpmn` (2 User Tasks)

**Total:** 35 User Task epics

---

## ⚠️ OBS: UI genererar ALLA noder

UI:et genererar dokumentation för **alla noder** i en fil, inte bara User Tasks. Detta betyder:

- **Kostnad:** ~$0.75-1.50 per fil (istället för ~$0.35-0.70 för bara User Tasks)
- **Tid:** ~2-6 minuter per fil (istället för ~1-3 minuter för bara User Tasks)

**Total uppskattad kostnad:** ~$10.50-21.00 (14 filer)  
**Total uppskattad tid:** ~28-84 minuter

---

## ✅ Verifiering efter regenerering

Efter att ha regenererat alla filer, kör:

```bash
node scripts/check-user-task-lanes-from-storage.mjs
```

Detta verifierar att alla User Task epics nu har korrekt användarbenämning.

---

## 🔧 Alternativ: Batch-regenerering (Framtida förbättring)

För att kunna regenerera endast User Tasks programmatiskt, behöver vi:

1. **Skapa en Supabase Edge Function** som kan anropa `generateAllFromBpmnWithGraph` med `nodeFilter`
2. **Eller** skapa en dedikerad batch-endpoint i UI:et som kan filtrera noder

Detta är en framtida förbättring som kan implementeras om batch-regenerering behövs ofta.

---

## 📝 Noteringar

- Den uppdaterade `inferLane()` logiken kommer automatiskt att användas när dokumentationen genereras
- User Tasks kommer nu default till "Kund" (istället för "Handläggare")
- "evaluate" är nu i interna nyckelord, så "evaluate-application-*" kommer att få "Handläggare"



