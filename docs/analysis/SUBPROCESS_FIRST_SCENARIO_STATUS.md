# Status: Subprocess Först, Sedan Parent - Scenario

## Datum: 2025-12-29

## Scenario

1. **Steg 1:** Användaren laddar upp och genererar dokumentation för "internal data gathering" (subprocess) isolerat
2. **Steg 2:** Användaren laddar upp "application" (parent) och genererar dokumentation

---

## Vad Testet Validerar

### Test: `tests/integration/generation-order-scenarios.test.ts`

**Scenario 1: Subprocess genereras först, sedan parent**

**Test 1:** `should generate subprocess first, then parent, and verify no duplicates`
- ✅ Genererar subprocess först (isolated, `useHierarchy = false`)
- ✅ Genererar parent senare (med hierarki, `useHierarchy = true`)
- ✅ Validerar att Feature Goals finns i parent result
- ❌ **Validerar INTE att dokumentation laddas från Storage**
- ❌ **Använder `useHierarchy = true` vilket betyder att subprocess-filen är med i `analyzedFiles`, så dokumentation genereras på nytt, inte laddas från Storage**

**Test 2:** `should verify that subprocess documentation is reused when parent is generated`
- ✅ Genererar subprocess först
- ✅ Genererar parent senare
- ✅ Validerar att Feature Goals finns i parent result
- ❌ **Validerar INTE att dokumentation faktiskt laddas från Storage**
- ❌ **Använder `useHierarchy = true` vilket betyder att subprocess-filen är med i `analyzedFiles`, så dokumentation genereras på nytt**

### Problem med Testet

1. **Testet använder `useHierarchy = true`**:
   - När parent genereras med `useHierarchy = true`, inkluderas subprocess-filen i `analyzedFiles`
   - Detta betyder att dokumentation genereras på nytt, inte laddas från Storage
   - Testet validerar därför INTE det faktiska scenariot där subprocess laddas upp först och parent senare

2. **Testet validerar inte Storage-laddning**:
   - Testet kollar bara att dokumentation finns i `parentResult.docs`
   - Det validerar INTE att dokumentation faktiskt laddades från Storage
   - Det validerar INTE att dokumentation sparas korrekt i Storage i steg 1

3. **Testet använder in-memory resultat**:
   - `generateAllFromBpmnWithGraph` returnerar in-memory resultat
   - Testet validerar inte att dokumentation faktiskt sparas i Storage i steg 1
   - Testet validerar inte att dokumentation faktiskt laddas från Storage i steg 2

---

## Vad Dokumentationen Säger

### `docs/analysis/SCENARIO_STATUS_AFTER_FIXES.md`

**Scenario 5: Subprocess-fil Laddas Upp Efter Root-fil (Inkrementell)**
- Detta är **motsatt ordning** (root först, subprocess senare)
- Nämner INTE scenariot "subprocess först, parent senare"

**Status:** ❌ **Scenariot "Subprocess först, sedan parent" är INTE dokumenterat**

---

## Vad Koden Gör

### När Subprocess Laddas Upp Först (Steg 1)

1. ✅ Epic-dokumentation genereras och sparas i Storage
2. ✅ File-level documentation genereras och sparas i Storage
3. ✅ Sökvägar: `docs/claude/mortgage-se-internal-data-gathering.bpmn/{versionHash}/nodes/...` och `docs/claude/mortgage-se-internal-data-gathering.bpmn/{versionHash}/mortgage-se-internal-data-gathering.html`

### När Parent Laddas Upp Senare (Steg 2)

**Om parent genereras med `useHierarchy = true`:**
- Subprocess-filen inkluderas i `analyzedFiles`
- Dokumentation genereras på nytt (inte laddas från Storage)
- ❌ **Detta är INTE det faktiska scenariot**

**Om parent genereras med `useHierarchy = false` (isolated):**
- Subprocess-filen är INTE med i `analyzedFiles`
- Systemet försöker ladda epic-docs från Storage för subprocess-noder (via `loadChildDocFromStorage`)
- ✅ **Fix implementerad:** Systemet laddar nu epic-docs från Storage för subprocess-noder när subprocess-filen inte är med i `analyzedFiles` (rad 2317-2330 i `bpmnGenerators.ts`)
- ✅ Feature Goal genereras med korrekt child documentation

---

## Identifierade Gaps

### Gap 1: Testet Validerar Inte Storage-laddning

**Problem:**
- Testet använder `useHierarchy = true` vilket betyder att subprocess-filen är med i `analyzedFiles`
- Dokumentation genereras på nytt, inte laddas från Storage
- Testet validerar därför INTE det faktiska scenariot

**Lösning:**
- Skapa nytt test som:
  1. Genererar subprocess isolerat och sparar till Storage (mock Storage)
  2. Genererar parent isolerat (subprocess-filen INTE med i `analyzedFiles`)
  3. Validerar att dokumentation laddas från Storage
  4. Validerar att Feature Goal genereras med korrekt child documentation

### Gap 2: Dokumentation Saknas

**Problem:**
- `SCENARIO_STATUS_AFTER_FIXES.md` nämner INTE scenariot "Subprocess först, sedan parent"
- Det finns ingen dokumentation om hur scenariot hanteras

**Lösning:**
- Lägg till scenario i `SCENARIO_STATUS_AFTER_FIXES.md`
- Dokumentera vad som genereras, vad som sparas, och vad som laddas från Storage

### Gap 3: Testet Validerar Inte Sökvägar

**Problem:**
- Testet validerar INTE att dokumentation sparas med korrekta sökvägar
- Testet validerar INTE att dokumentation laddas från korrekta sökvägar

**Lösning:**
- Lägg till validering av Storage-sökvägar i testet
- Validera att dokumentation sparas under rätt version hash
- Validera att dokumentation laddas från rätt version hash

---

## Rekommendationer

### 1. Skapa Nytt Test

**Fil:** `tests/integration/subprocess-first-then-parent-storage.test.ts`

**Syfte:** Validera att dokumentation laddas från Storage när parent genereras efter subprocess

**Test-struktur:**
1. Mock Storage
2. Generera subprocess isolerat och spara till Storage
3. Generera parent isolerat (subprocess-filen INTE med i `analyzedFiles`)
4. Validera att dokumentation laddas från Storage
5. Validera att Feature Goal genereras med korrekt child documentation
6. Validera att sökvägar matchar korrekt

### 2. Uppdatera Dokumentation

**Fil:** `docs/analysis/SCENARIO_STATUS_AFTER_FIXES.md`

**Lägg till:** Scenario 6: Subprocess-fil Laddas Upp Först, Sedan Parent

**Innehåll:**
- Vad som genereras i steg 1
- Vad som sparas i Storage i steg 1
- Vad som laddas från Storage i steg 2
- Vad som genereras i steg 2
- Vad som visas i Node Matrix

### 3. Förbättra Befintligt Test

**Fil:** `tests/integration/generation-order-scenarios.test.ts`

**Förbättringar:**
- Lägg till test som använder `useHierarchy = false` för parent-generering
- Validera att dokumentation laddas från Storage (mock Storage)
- Validera att sökvägar matchar korrekt

---

## Status

**Aktuell Status:** ⚠️ **DELVIS VALIDERAT**

**Vad som fungerar:**
- ✅ Koden hanterar scenariot korrekt (fix implementerad)
- ✅ Systemet laddar epic-docs från Storage när subprocess-filen inte är med i `analyzedFiles`

**Vad som saknas:**
- ❌ Testet validerar INTE Storage-laddning
- ❌ Dokumentation saknas för scenariot
- ❌ Testet använder fel scenario (`useHierarchy = true` istället för `useHierarchy = false`)

**Rekommendation:** Skapa nytt test och uppdatera dokumentation för att validera att scenariot fungerar korrekt.




