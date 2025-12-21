# Guide: Regenerera User Task Epics

**Datum:** 2025-01-XX  
**Syfte:** Temporär fix för att regenerera endast User Task epics efter uppdatering av lane inference-logik

---

## 📋 Översikt

Efter att ha fixat `inferLane()` logiken i `llmDocumentation.ts` behöver vi regenerera dokumentationen för alla User Task epics för att säkerställa att de har korrekt användarbenämning (kund vs handläggare).

**Total User Task epics:** 35  
**BPMN-filer:** 15

---

## 🔧 Steg för Regenerering

### 1. Skapa lista över User Task epics

```bash
node scripts/list-all-user-task-epics.mjs
```

Detta skapar `user-task-epics-list.json` med alla User Task epics som behöver regenereras.

### 2. Regenerera dokumentation

**Option A: Använd TypeScript-scriptet (Rekommenderat för batch)**

```bash
npx tsx scripts/regenerate-user-task-epics.ts
```

Detta script:
- Läser `user-task-epics-list.json`
- Använder `generateAllFromBpmnWithGraph` med en `nodeFilter` som bara tillåter User Tasks från listan
- Genererar dokumentation för endast dessa epics
- Sparar till Supabase Storage

**Option B: Använd UI (BpmnFileManager)**

1. Öppna BpmnFileManager-sidan i appen
2. Välj en BPMN-fil som innehåller User Tasks
3. Klicka på "Generate Documentation"
4. Upprepa för varje BPMN-fil

**⚠️ OBS:** UI-generering genererar ALLA noder, inte bara User Tasks. För att bara generera User Tasks, använd TypeScript-scriptet.

---

## 📊 Lista över User Task Epics

Se `user-task-epics-list.json` för fullständig lista. Här är en sammanfattning:

### BPMN-filer med User Tasks:

1. **mortgage-se-appeal.bpmn** (2 User Tasks)
   - Screen appeal
   - Submit appeal

2. **mortgage-se-application.bpmn** (1 User Task)
   - Confirm application

3. **mortgage-se-collateral-registration.bpmn** (3 User Tasks)
   - Distribute Ansökan till inskrivningsmyndigheten
   - Distribute notice of pledge to BRF
   - Verify

4. **mortgage-se-credit-decision.bpmn** (3 User Tasks)
   - Evaluate application (board)
   - Evaluate application (committee)
   - Evaluate application (four-eyes)

5. **mortgage-se-documentation-assessment.bpmn** (2 User Tasks)
   - Assess documentation
   - Review changes

6. **mortgage-se-household.bpmn** (1 User Task)
   - Register household economy information

7. **mortgage-se-kyc.bpmn** (2 User Tasks)
   - Review KYC
   - Submit self declaration

8. **mortgage-se-manual-credit-evaluation.bpmn** (3 User Tasks)
   - Perform advanced underwriting
   - Upload documentation (auw)
   - Upload documentation

9. **mortgage-se-mortgage-commitment.bpmn** (1 User Task)
   - Decide on mortgage commitment

10. **mortgage-se-object-control.bpmn** (7 User Tasks)
    - Control lägenhets-utdrag
    - Determine object value
    - Register BRF information
    - Review BRF
    - Review changes
    - Upload documentation
    - Upload object valuation documentation

11. **mortgage-se-object.bpmn** (2 User Tasks)
    - Register loan details
    - Register source of equity

12. **mortgage-se-offer.bpmn** (4 User Tasks)
    - Perform advanced underwriting
    - Decide on offer
    - Perform advanced underwriting (sales contract)
    - Upload sales contract

13. **mortgage-se-signing.bpmn** (2 User Tasks)
    - Distribute documents
    - Upload document

14. **mortgage-se-stakeholder.bpmn** (2 User Tasks)
    - Consent to credit check
    - Register personal economy information

---

## ✅ Verifiering

Efter regenerering, kör:

```bash
node scripts/check-user-task-lanes-from-storage.mjs
```

Detta verifierar att alla User Task epics nu har korrekt användarbenämning.

---

## 💰 Kostnad och Tid

**Uppskattad kostnad:**
- 35 User Task epics × ~$0.01-0.02 per epic = ~$0.35-0.70

**Uppskattad tid:**
- ~2-5 sekunder per epic = ~1-3 minuter totalt

**Jämfört med full regenerering:**
- Full regenerering: ~75 noder = ~$0.75-1.50 och ~2-6 minuter
- Endast User Tasks: ~35 noder = ~$0.35-0.70 och ~1-3 minuter
- **Besparing:** ~50% kostnad och tid

---

## 🔍 Teknisk Detalj

### nodeFilter Implementation

Scriptet använder en `nodeFilter` funktion som:

```typescript
const nodeFilter = (node: BpmnProcessNode): boolean => {
  // Only process User Tasks
  if (node.type !== 'userTask') {
    return false;
  }
  
  // Check if this epic is in our list
  const key = `${node.bpmnFile}:${node.bpmnElementId}`;
  return epicKeys.has(key);
};
```

Detta säkerställer att endast User Tasks från vår lista genereras, inte alla noder.

### Uppdaterad Lane Inference

Efter fixen i `inferLane()`:
- Default för User Tasks = "Kund" (tidigare "Handläggare")
- "evaluate" lagt till i interna nyckelord för "evaluate-application-*" i credit decision
- Logiken är nu konsistent med process-explorer UI

---

## 📝 Noteringar

- Detta är en **temporär fix** för att snabbt åtgärda problemet med fel användarbenämning
- Framtida regenereringar kommer att använda den uppdaterade logiken automatiskt
- Överväg att automatisera detta i CI/CD eller som en del av dokumentationspipelinen



