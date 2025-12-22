# Analys: 406 Not Acceptable Fel vid Dubbelklick på Subprocesser

**Datum:** 2025-12-22  
**Problem:** 406 (Not Acceptable) fel när användaren dubbelklickar på subprocesser i BPMN-diagrammet.

---

## 1. Problem

### Symptom:
- Användaren kan inte dubbelklicka på subprocesser
- 406-fel i loggen: `GET .../node_test_links?... 406 (Not Acceptable)`
- Flera försök för samma element (t.ex. `mortgage.bpmn:application`)

### Fel i loggen:
```
GET http://127.0.0.1:54321/rest/v1/node_test_links?select=test_file_path&bpmn_file=eq.mortgage.bpmn&bpmn_element_id=eq.application&limit=1 406 (Not Acceptable)
[RightPanel] node_test_links 406 for mortgage.bpmn application
```

---

## 2. Orsak

### Problem: `.single()` ger 406 när ingen rad finns

**Kod i `RightPanel.tsx` (rad 84-90):**
```typescript
const { data, error, status } = await supabase
  .from('node_test_links')
  .select('test_file_path')
  .eq('bpmn_file', bpmnFile)
  .eq('bpmn_element_id', selectedElement)
  .limit(1)
  .single(); // ← PROBLEM: Ger 406 om ingen rad finns
```

**Vad händer:**
- `.single()` förväntar sig exakt 1 rad
- Om ingen rad finns → 406 (Not Acceptable)
- Om flera rader finns → 406 (Not Acceptable)
- Detta är standard-beteende för Supabase `.single()`

### Jämförelse med `NodeTestsPage.tsx`:

**Kod i `NodeTestsPage.tsx` (rad 89-95):**
```typescript
const { data, error, status } = await supabase
  .from('node_test_links')
  .select('test_file_path')
  .eq('bpmn_file', bpmnFile)
  .eq('bpmn_element_id', elementId)
  .limit(1)
  .maybeSingle(); // ← KORREKT: Returnerar null om ingen rad finns, ingen 406
```

**Skillnaden:**
- `.single()` → 406 om ingen rad finns
- `.maybeSingle()` → null om ingen rad finns (ingen 406)

---

## 3. Varför Detta Påverkar Dubbelklick

### Flöde:

1. **Användaren dubbelklickar på subprocess:**
   - `BpmnViewer.tsx` rad 750-794: `dblclickListener` triggas
   - `handleSubprocessNavigation()` anropas (rad 793)

2. **Element väljs:**
   - `setSelectedElement(target.id)` (rad 785)
   - Detta triggar `RightPanel` att ladda artifacts

3. **RightPanel försöker ladda test file:**
   - `useEffect` triggas när `selectedElement` ändras (rad 76-115)
   - `fetchTestFileUrl()` anropas (rad 114)
   - Query till `node_test_links` med `.single()` (rad 90)

4. **406-fel:**
   - Om ingen rad finns i `node_test_links` → 406
   - Detta händer för varje element som väljs
   - Felet loggas men hanteras (rad 93-96)

### Varför Detta Påverkar Dubbelklick:

**Möjliga orsaker:**
1. **JavaScript-fel blockerar navigation:**
   - Om 406-felet inte hanteras korrekt, kan det krascha navigation
   - Men koden hanterar 406 (rad 93-96), så detta borde inte vara problemet

2. **Många förfrågningar:**
   - Varje gång ett element väljs, görs en query
   - Om många element väljs snabbt, kan det skapa många 406-fel
   - Men detta borde inte blockera dubbelklick

3. **Timing-problem:**
   - Dubbelklick triggar både selection OCH navigation
   - Om selection triggar query som tar tid, kan navigation försenas
   - Men navigation borde inte blockeras av query

---

## 4. Lösning

### Fix 1: Använd `.maybeSingle()` Istället för `.single()`

**I `RightPanel.tsx` rad 84-90:**
```typescript
// FÖRE (FEL):
const { data, error, status } = await supabase
  .from('node_test_links')
  .select('test_file_path')
  .eq('bpmn_file', bpmnFile)
  .eq('bpmn_element_id', selectedElement)
  .limit(1)
  .single(); // ← Ger 406 om ingen rad finns

// EFTER (KORREKT):
const { data, error, status } = await supabase
  .from('node_test_links')
  .select('test_file_path')
  .eq('bpmn_file', bpmnFile)
  .eq('bpmn_element_id', selectedElement)
  .limit(1)
  .maybeSingle(); // ← Returnerar null om ingen rad finns, ingen 406
```

**Fördelar:**
- ✅ Ingen 406-fel om ingen rad finns
- ✅ Samma beteende som `NodeTestsPage.tsx`
- ✅ Renare loggar (inga 406-varningar)

### Fix 2: Ta Bort Onödig 406-Hantering

**Efter fix 1, kan vi ta bort:**
```typescript
if (error) {
  if (status === 406) {
    console.warn('[RightPanel] node_test_links 406 for', bpmnFile, selectedElement);
    setTestFilePath(null);
    return;
  }
  // ... resten av error-hantering
}
```

**Eftersom `.maybeSingle()` inte ger 406 om ingen rad finns, behövs inte denna check.**

---

## 5. Ytterligare Problem

### Problem: Många Förfrågningar

**I loggen ser vi:**
- Flera försök för samma element (t.ex. `mortgage.bpmn:application`)
- Flera försök för olika element (t.ex. `Participant_0kesuxg`)

**Orsak:**
- `useEffect` triggas varje gång `selectedElement` eller `bpmnFile` ändras
- Om element väljs flera gånger, görs flera queries
- Detta är normalt, men kan optimeras med debouncing eller caching

**Lösning (valfritt):**
- Lägg till debouncing för `fetchTestFileUrl()`
- Eller cache resultat per `bpmnFile:elementId` key

---

## 6. Slutsats

### Huvudproblem:
- ✅ `.single()` ger 406 om ingen rad finns i `node_test_links`
- ✅ Detta skapar onödiga fel i loggen
- ✅ Detta kan potentiellt påverka dubbelklick (om fel inte hanteras korrekt)

### Lösning:
- ✅ Ändra `.single()` till `.maybeSingle()` i `RightPanel.tsx`
- ✅ Ta bort onödig 406-hantering (efter fix)
- ✅ Detta matchar redan användningen i `NodeTestsPage.tsx`

### Ytterligare Förbättringar (valfritt):
- Lägg till debouncing för att minska antal queries
- Cache resultat för att undvika upprepade queries

---

## Relaterade Dokument

- `RightPanel.tsx` - Komponent som gör queryn
- `NodeTestsPage.tsx` - Exempel på korrekt användning av `.maybeSingle()`
- Supabase dokumentation om `.single()` vs `.maybeSingle()`
