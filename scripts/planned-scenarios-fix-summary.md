# Planned Scenarios Fix - Sammanfattning

**Datum:** 2025-01-XX  
**Status:** ✅ Fixad - Planned scenarios skapas inte längre vid dokumentationsgenerering

---

## Problem

**Användarobservation:**
- När man bara valde att generera dokumentation, så skapades ändå "E2E scenarios" i Supabase
- Detta var förvirrande eftersom man bara valde dokumentation, inte testinformation

**Orsak:**
- I `bpmnGenerators.ts` (rad 589-599) skapades alltid "planned scenarios" (fallback-scenarios) när dokumentation genererades
- Dessa sparas i `node_planned_scenarios` tabellen
- Kommentaren sa att de var "legacy - används inte längre", men de skapades ändå

**Vad är "planned scenarios"?**
- Fallback-scenarios från `testMapping` 
- Skapas via `createPlannedScenariosFromGraph()`
- Sparas i `node_planned_scenarios` tabellen
- **INTE** E2E scenarios - det är bara fallback-scenarios

---

## Lösning

**Ändring:**
- Kommenterade bort koden som skapar planned scenarios vid dokumentationsgenerering
- Lade till tydlig kommentar om varför detta hoppas över
- Planned scenarios ska bara skapas när man faktiskt genererar testinformation, inte när man bara genererar dokumentation

**Kodändring:**
- Fil: `src/lib/bpmnGenerators.ts`
- Rad: 589-607
- Ändring: Kommenterade bort `createPlannedScenariosFromGraph()` och `savePlannedScenarios()` anrop

---

## Relation till Version Hash-problemet

**Viktigt:** Detta är **INTE** relaterat till version hash-problemet.

- Version hash-problemet: Filen saknar version hash, så dokumentationen kan inte laddas upp
- Planned scenarios-problemet: Onödig databasaktivitet och förvirring när man bara genererar dokumentation

**Men:** Båda problemen kan uppstå samtidigt, vilket kan göra det svårt att identifiera vilket problem som orsakar vad.

---

## Rekommendationer

### Kortsiktigt
- ✅ Planned scenarios skapas inte längre vid dokumentationsgenerering
- ✅ Mindre förvirring för användaren
- ✅ Mindre onödig databasaktivitet

### Långsiktigt
1. **Om planned scenarios behövs:**
   - Skapa dem i testgenereringssteget istället
   - Eller skapa dem explicit när användaren väljer att generera testinformation

2. **Förbättra tydlighet:**
   - Tydligare skillnad mellan "planned scenarios" och "E2E scenarios"
   - Bättre dokumentation om vad som genereras när

---

## Testning

**För att testa fixen:**
1. Generera dokumentation för en fil
2. Kontrollera att inga planned scenarios skapas i `node_planned_scenarios` tabellen
3. Generera testinformation för samma fil
4. Kontrollera att planned scenarios skapas (om de behövs)

---

## Slutsats

✅ **Problemet är fixat** - Planned scenarios skapas inte längre vid dokumentationsgenerering.

⚠️ **Detta är INTE relaterat till version hash-problemet** - det är ett separat problem som också behöver fixas.

