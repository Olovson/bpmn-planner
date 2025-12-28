# Ordning med Gamla Approachen (Före Commit 1f9574c8)

## Analys av BPMN-filer i `/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29`

### Metod

**Gamla approachen (indegree-baserad sortering):**
- Matchning baserad på `calledElement` från BPMN-filer (ingen `bpmn-map.json`)
- Beräkning av `indegree` (antal processer som anropar varje fil)
- Sortering: Lägre indegree → högre indegree → alfabetiskt vid samma indegree

---

## Resultat: Ordning med Gamla Approachen

### Observeringar

**Viktigt:** De flesta call activities i BPMN-filerna saknar `calledElement`-attribut. Detta betyder att:

1. **Matchning via `calledElement`:** Endast 3 call activities har explicit `calledElement`:
   - `mortgage.bpmn`: `offer` → `calledElement="offer"`
   - `mortgage.bpmn`: `signing-advance` → `calledElement="signing"`
   - `mortgage-se-manual-credit-evaluation.bpmn`: `credit-evaluation` → `calledElement="credit-evaluation"`

2. **Matchning via heuristik:** De flesta call activities skulle matchas via heuristik (filnamnsheuristik, fuzzy-matchning, etc.) eftersom `calledElement` saknas.

3. **Indegree:** Eftersom de flesta call activities saknar `calledElement`, kan systemet inte bygga en komplett dependency graph. Resultatet blir att de flesta filer får `indegree = 0` (alla är "root-processer").

---

## Ordning (Alfabetisk, eftersom indegree är 0 för de flesta)

Med den gamla approachen skulle filerna sorteras **alfabetiskt** eftersom de flesta har `indegree = 0`:

1. `mortgage-se-appeal.bpmn` (indegree: 0)
2. `mortgage-se-application.bpmn` (indegree: 0)
3. `mortgage-se-collateral-registration.bpmn` (indegree: 0)
4. `mortgage-se-credit-decision.bpmn` (indegree: 0)
5. `mortgage-se-disbursement.bpmn` (indegree: 0)
6. `mortgage-se-document-generation.bpmn` (indegree: 0)
7. `mortgage-se-documentation-assessment.bpmn` (indegree: 0)
8. `mortgage-se-household.bpmn` (indegree: 0)
9. `mortgage-se-internal-data-gathering.bpmn` (indegree: 0)
10. `mortgage-se-kyc.bpmn` (indegree: 0)
11. `mortgage-se-manual-credit-evaluation.bpmn` (indegree: 0)
12. `mortgage-se-mortgage-commitment.bpmn` (indegree: 0)
13. `mortgage-se-object-information.bpmn` (indegree: 0)
14. `mortgage-se-object.bpmn` (indegree: 0)
15. `mortgage-se-stakeholder.bpmn` (indegree: 0)
16. `mortgage.bpmn` (indegree: 0)
17. `mortgage-se-credit-evaluation.bpmn` (indegree: 1) ← Anropas av `mortgage-se-manual-credit-evaluation.bpmn`
18. `mortgage-se-offer.bpmn` (indegree: 1) ← Anropas av `mortgage.bpmn` via `calledElement="offer"`
19. `mortgage-se-signing.bpmn` (indegree: 1) ← Anropas av `mortgage.bpmn` via `calledElement="signing"`

---

## Call Activities och deras Matchningar

### Filer med Call Activities (utan `calledElement`)

**mortgage-se-application.bpmn:**
- `internal-data-gathering` → skulle matchas via heuristik till `mortgage-se-internal-data-gathering.bpmn`
- `stakeholder` → skulle matchas via heuristik till `mortgage-se-stakeholder.bpmn`
- `object` → skulle matchas via heuristik till `mortgage-se-object.bpmn`
- `household` → skulle matchas via heuristik till `mortgage-se-household.bpmn`

**mortgage-se-mortgage-commitment.bpmn:**
- `credit-evaluation-1` → skulle matchas via heuristik
- `documentation-assessment` → skulle matchas via heuristik
- `object-information` → skulle matchas via heuristik
- `credit-evaluation-2` → skulle matchas via heuristik

**mortgage-se-object.bpmn:**
- `object-information` → skulle matchas via heuristik till `mortgage-se-object-information.bpmn`

**mortgage-se-offer.bpmn:**
- `credit-decision` → skulle matchas via heuristik till `mortgage-se-credit-decision.bpmn`

**mortgage.bpmn:**
- 15 call activities, varav endast 2 har `calledElement`:
  - `offer` → `calledElement="offer"` → `mortgage-se-offer.bpmn`
  - `signing-advance` → `calledElement="signing"` → `mortgage-se-signing.bpmn`
- Övriga 13 skulle matchas via heuristik

---

## Problem med Gamla Approachen

### 1. Beroende av `calledElement`

**Problem:** Om `calledElement` saknas (vilket är fallet för de flesta call activities), kan systemet inte bygga en komplett dependency graph baserat på `calledElement`-matchning.

**Konsekvens:** De flesta filer får `indegree = 0`, vilket betyder att de sorteras alfabetiskt istället för baserat på faktiska dependencies.

### 2. Heuristik är Oklart

**Problem:** Heuristik-matchning (filnamnsheuristik, fuzzy-matchning) är inte deterministisk och kan ge felaktiga matchningar.

**Konsekvens:** Ordningen kan bli felaktig om heuristik-matchningen inte är korrekt.

### 3. Ingen Explicit Kontroll

**Problem:** Det finns ingen extern konfiguration (`bpmn-map.json`) för att manuellt åsidosätta eller korrigera automatiska matchningar.

**Konsekvens:** Om en matchning är felaktig, finns det ingen enkel mekanism för att korrigera den.

---

## Jämförelse: Gamla vs Nya Approachen

| Aspekt | Gamla (Före 1f9574c8) | Nya (Efter 1f9574c8) |
|--------|------------------------|----------------------|
| **Matchning** | `calledElement` → heuristik | `bpmn-map.json` → `calledElement` → heuristik |
| **Ordning** | Indegree-baserad (men ofta alfabetisk pga. saknad `calledElement`) | Topologisk sortering (explicit dependency graph) |
| **Dependency Graph** | Byggs från `calledElement` (ofta ofullständig) | Byggs från `bpmn-map.json` + `calledElement` (mer komplett) |
| **Kontroll** | Ingen extern konfiguration | `bpmn-map.json` ger explicit kontroll |
| **Robusthet** | ⚠️ Beroende av `calledElement` i BPMN-filer | ✅ Kan hantera komplexa strukturer |

---

## Slutsats

Med den gamla approachen skulle filerna i mappen `/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29` sorteras **primärt alfabetiskt** eftersom:

1. De flesta call activities saknar `calledElement`-attribut
2. Utan `calledElement` kan systemet inte bygga en komplett dependency graph
3. Resultatet blir att de flesta filer får `indegree = 0`
4. Vid samma indegree sorteras filerna alfabetiskt

**Endast 3 filer har högre indegree:**
- `mortgage-se-credit-evaluation.bpmn` (indegree: 1) - anropas av `mortgage-se-manual-credit-evaluation.bpmn`
- `mortgage-se-offer.bpmn` (indegree: 1) - anropas av `mortgage.bpmn` via `calledElement="offer"`
- `mortgage-se-signing.bpmn` (indegree: 1) - anropas av `mortgage.bpmn` via `calledElement="signing"`

Dessa 3 filer skulle komma **efter** de övriga 16 filerna (som har indegree 0) i sorterad ordning.

---

## Rekommendation

Den nya approachen (med `bpmn-map.json` och topologisk sortering) är **bättre** eftersom:

1. ✅ **Explicit kontroll:** `bpmn-map.json` ger manuell kontroll över mappningar
2. ✅ **Komplett dependency graph:** Byggs från `bpmn-map.json` + `calledElement`, inte bara `calledElement`
3. ✅ **Robustare:** Kan hantera komplexa strukturer och edge cases
4. ✅ **Dokumenterat:** Topologisk sortering är dokumenterad i `hierarchy-architecture.md`

**Nackdel:** Kräver manuell uppdatering av `bpmn-map.json`, men detta är en liten kostnad för den ökade robustheten och kontrollen.

