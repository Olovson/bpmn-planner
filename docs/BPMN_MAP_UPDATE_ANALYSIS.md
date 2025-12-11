# Analys: Uppdatering av bpmn-map.json

## Översikt
Baserat på jämförelsen mellan `mortgage-se 2025.11.29` och `mortgage-se 2025.12.08` behöver följande ändringar göras i `bpmn-map.json`:

## 1. Nya processer att lägga till

### mortgage-se-object-control
- **id:** `mortgage-se-object-control`
- **alias:** `Object Control`
- **bpmn_file:** `mortgage-se-object-control.bpmn`
- **process_id:** `mortgage-se-object-control`
- **description:** `mortgage-se-object-control`
- **call_activities:**
  - `object-information` → `mortgage-se-object-information.bpmn`
  - `credit-evaluation` (med `calledElement="credit-evaluation"`) → `mortgage-se-credit-evaluation.bpmn`

### mortgage-se-object-valuation
- **id:** `mortgage-se-object-valuation`
- **alias:** `Object Valuation`
- **bpmn_file:** `mortgage-se-object-valuation.bpmn`
- **process_id:** `mortgage-se-object-valuation`
- **description:** `mortgage-se-object-valuation`
- **call_activities:** [] (inga)

## 2. Uppdateringar i befintliga processer

### mortgage.bpmn
**Ändringar:**
- ➕ Lägg till call activity: `object-valuation` → `mortgage-se-object-valuation.bpmn`
- 🔄 Ändra namn på `offer`: "Offer" → "Offer preparation"

### mortgage-se-offer.bpmn
**Ändringar:**
- ➕ Lägg till call activity: `documentation-assessment` → `mortgage-se-documentation-assessment.bpmn`
- ➕ Lägg till call activity: `sales-contract-credit-decision` → `mortgage-se-credit-decision.bpmn`

### mortgage-se-manual-credit-evaluation.bpmn
**Ändringar:**
- ➕ Lägg till call activity: `object-control` → `mortgage-se-object-control.bpmn`

## 3. Verifiering

Alla ändringar kan verifieras genom:
- ✅ Jämförelsescriptet (`compare-bpmn-versions.ts`)
- ✅ Direkt läsning av BPMN-filerna
- ✅ Konsistent struktur i bpmn-map.json

## 4. Riskbedömning

**Låg risk:**
- Strukturen är tydlig och konsekvent
- Alla ändringar är dokumenterade
- Mönstret följer befintliga entries

**Åtgärder:**
- Lägg till nya processer i alfabetisk ordning
- Behåll befintlig struktur och format
- Uppdatera `generated_at` timestamp

