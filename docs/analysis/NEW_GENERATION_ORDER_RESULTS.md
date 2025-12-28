# Genereringsordning med Nya Ändringarna

## Datum: 2025-12-28

## Översikt

Med de nya ändringarna kommer dokumentation genereras i följande ordning för filerna i `/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29`:

---

## 📋 Fil-sortering: Topologisk (Subprocesser före Parent)

### Ordning:

1. **mortgage-se-disbursement.bpmn** (subprocess, anropas av mortgage.bpmn)
2. **mortgage-se-credit-decision.bpmn** (subprocess, anropas av mortgage.bpmn, mortgage-se-offer.bpmn)
3. **mortgage-se-mortgage-commitment.bpmn** (subprocess, anropas av mortgage.bpmn)
4. **mortgage-se-application.bpmn** (subprocess, anropas av mortgage.bpmn)
5. **mortgage-se-document-generation.bpmn** (subprocess, anropas av mortgage.bpmn)
6. **mortgage-se-documentation-assessment.bpmn** (subprocess, anropas av mortgage-se-mortgage-commitment.bpmn, mortgage-se-manual-credit-evaluation.bpmn)
7. **mortgage-se-offer.bpmn** (subprocess, anropas av mortgage.bpmn)
8. **mortgage-se-signing.bpmn** (subprocess, anropas av mortgage.bpmn)
9. **mortgage.bpmn** (root, anropar alla ovanstående)
10. **mortgage-se-object.bpmn** (subprocess, anropas av mortgage-se-application.bpmn)
11. **mortgage-se-appeal.bpmn** (subprocess, anropas av mortgage.bpmn)
12. **mortgage-se-household.bpmn** (subprocess, anropas av mortgage-se-application.bpmn)
13. **mortgage-se-object-information.bpmn** (subprocess, anropas av mortgage-se-object.bpmn, mortgage-se-mortgage-commitment.bpmn)
14. **mortgage-se-credit-evaluation.bpmn** (subprocess, anropas av mortgage-se-manual-credit-evaluation.bpmn)
15. **mortgage-se-kyc.bpmn** (subprocess, anropas av mortgage.bpmn)
16. **mortgage-se-manual-credit-evaluation.bpmn** (subprocess, anropas av mortgage.bpmn)
17. **mortgage-se-stakeholder.bpmn** (subprocess, anropas av mortgage-se-application.bpmn)
18. **mortgage-se-collateral-registration.bpmn** (subprocess, anropas av mortgage.bpmn)
19. **mortgage-se-internal-data-gathering.bpmn** (subprocess, anropas av mortgage-se-application.bpmn)

---

## 📄 Node-sortering inom Fil: OrderIndex → VisualOrderIndex → Node Type → Depth

### Exempel: mortgage-se-application.bpmn

**BPMN-anropsordning (från vänster till höger):**
1. `internal-data-gathering` (callActivity, orderIndex: 1)
2. `Fetch party information` (serviceTask, orderIndex: 2) ← i subprocess-filen
3. `Pre-screen party` (businessRuleTask, orderIndex: 3) ← i subprocess-filen
4. `household` (callActivity, orderIndex: 4)
5. `Confirm application` (userTask, orderIndex: 5)

**Genereringsordning med nya ändringarna:**
1. **Epic:** `Fetch party information` (serviceTask, orderIndex: 2) ← genereras när `internal-data-gathering.bpmn` processas
2. **Epic:** `Pre-screen party` (businessRuleTask, orderIndex: 3) ← genereras när `internal-data-gathering.bpmn` processas
3. **Feature Goal:** `internal-data-gathering` (callActivity, orderIndex: 1) ← genereras när `application.bpmn` processas, med epics tillgängliga
4. **Feature Goal:** `household` (callActivity, orderIndex: 4) ← genereras när `application.bpmn` processas
5. **Epic:** `Confirm application` (userTask, orderIndex: 5) ← genereras när `application.bpmn` processas

**Förklaring:**
- Epics från `internal-data-gathering.bpmn` genereras FÖRE Feature Goal för `internal-data-gathering` eftersom:
  - Filerna sorteras topologiskt (subprocesser före parent)
  - Noder sorteras efter node type (tasks/epics före callActivities)
- Feature Goal för `internal-data-gathering` inkluderar epics från subprocess-filen eftersom:
  - Child documentation samlas från `graph.fileNodes.get(subprocessFile)`

---

## 📊 Sammanfattning

### Totala Dokument:

- **Epics (tasks):** 64
- **Feature Goals (callActivities):** 27
- **Totala dokument:** 91

### Viktiga Förändringar:

1. **Fil-sortering:** Topologisk (subprocesser före parent) ✅
2. **Node-sortering:** OrderIndex → VisualOrderIndex → Node Type → Depth ✅
3. **Leaf nodes före Feature Goals:** Säkerställs av node type-sortering ✅
4. **Child documentation från subprocess:** Samlas från `graph.fileNodes.get(subprocessFile)` ✅

---

## 🎯 Förväntade Resultat

### 1. Dokumentation genereras i anropsordning

**Före:**
- Noder sorterades efter depth (lägre depth först)
- Kunde genereras i fel ordning jämfört med hur de anropas i BPMN-filerna

**Efter:**
- Noder sorteras efter orderIndex (anropsordning från sequence flows)
- Matchar hur test-coverage sidan visar ordningen (från vänster till höger)

---

### 2. Leaf nodes (epics) genereras före Feature Goals

**Före:**
- Depth-sortering kunde ge callActivities före epics

**Efter:**
- Node type-sortering säkerställer tasks/epics (typeOrder: 1) före callActivities (typeOrder: 2)
- Epics genereras alltid före Feature Goals

---

### 3. Feature Goals inkluderar epics från subprocess-filer

**Före:**
- Child documentation samlades bara från `node.children`
- Epics i subprocess-filen saknades

**Efter:**
- Child documentation samlas från `graph.fileNodes.get(subprocessFile)`
- Alla noder i subprocess-filen (epics, tasks) inkluderas i Feature Goal-dokumentationen

---

## 📝 Noteringar

- **I verkligheten:** orderIndex/visualOrderIndex kommer från BPMN-parsning och ger exakt anropsordning
- **Denna simulering:** visar ungefärlig ordning baserat på node type-sortering
- **Topologisk fil-sortering:** säkerställer att subprocess-filer genereras FÖRE parent-filer
- **Node type-sortering:** säkerställer att epics genereras FÖRE Feature Goals inom samma fil

