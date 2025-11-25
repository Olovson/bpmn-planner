# Analys: Sorteringsprioritet - Offer kommer före KYC

## Problem

I ProcessExplorer kommer Offer före KYC, men det borde vara tvärtom. Testet visar korrekt ordning där KYC kommer efter Manual credit evaluation men före Offer.

## Metadata för relevanta noder

Från `mortgage-order-debug` output:

**Noder med visualOrderIndex (inga sequence flows):**
- Appeal: `visualOrderIndex:3`, `orderIndex:N/A`
- Manual credit evaluation: `visualOrderIndex:4`, `orderIndex:N/A`
- Offer: `visualOrderIndex:5`, `orderIndex:N/A`

**Noder med orderIndex (del av sequence flows):**
- KYC: `orderIndex:0`, `visualOrderIndex:N/A`, `branchId:main`
- Credit decision: `orderIndex:1`, `visualOrderIndex:N/A`, `branchId:main`

## Nuvarande sorteringslogik

I `src/lib/ganttDataConverter.ts` → `sortCallActivities()`:

```typescript
const aVisual = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
const bVisual = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
if (aVisual !== bVisual) {
  return aVisual - bVisual;  // ← Första prioritet
}

const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
if (aOrder !== bOrder) {
  return aOrder - bOrder;  // ← Andra prioritet
}
```

**Prioritet:**
1. `visualOrderIndex` (först)
2. `orderIndex` (sedan)
3. `branchId` (sedan)
4. `label` (slutligen)

## Problemet

När vi jämför **Offer** (visualOrderIndex=5, orderIndex=MAX) med **KYC** (visualOrderIndex=MAX, orderIndex=0):

1. Jämför visualOrderIndex:
   - Offer: 5
   - KYC: MAX_SAFE_INTEGER
   - 5 < MAX → **Offer kommer först** ✗

2. orderIndex jämförs aldrig eftersom visualOrderIndex redan avgjorde sorteringen.

## Rotorsak

**Designintentionen var:**
- `visualOrderIndex` ska användas som **fallback** när `orderIndex` saknas
- När både `visualOrderIndex` och `orderIndex` finns, bör `orderIndex` ha högre prioritet eftersom det representerar faktisk exekveringsordning från sequence flows

**Nuvarande implementation:**
- `visualOrderIndex` prioriteras alltid först, även när `orderIndex` finns
- Detta gör att noder med bara visualOrderIndex (Offer) kommer före noder med orderIndex (KYC)

## Förväntad beteende

Noder med `orderIndex` (del av sequence flows) bör ha högre prioritet än noder med bara `visualOrderIndex` (visuell ordning utan sequence flows).

**Korrekt prioritet borde vara:**
1. Noder med `orderIndex` → sortera på `orderIndex`
2. Noder utan `orderIndex` men med `visualOrderIndex` → sortera på `visualOrderIndex`
3. Noder med både → `orderIndex` har prioritet (representerar faktisk exekveringsordning)

## Exempel

**Nuvarande sortering (fel):**
1. Appeal (visualOrderIndex:3)
2. Manual credit evaluation (visualOrderIndex:4)
3. Offer (visualOrderIndex:5) ← Fel plats
4. KYC (orderIndex:0) ← Borde komma här
5. Credit decision (orderIndex:1)

**Förväntad sortering (korrekt):**
1. Appeal (visualOrderIndex:3)
2. Manual credit evaluation (visualOrderIndex:4)
3. KYC (orderIndex:0) ← Korrekt plats
4. Credit decision (orderIndex:1)
5. Offer (visualOrderIndex:5) ← Borde komma här

## Lösning

Ändra sorteringslogiken så att:
1. Noder med `orderIndex` sorteras först (på `orderIndex`)
2. Noder utan `orderIndex` men med `visualOrderIndex` sorteras sedan (på `visualOrderIndex`)
3. Om båda finns, prioritera `orderIndex` (det representerar faktisk exekveringsordning)

**Alternativt:**
- Om en nod har `orderIndex`, ignorera `visualOrderIndex` för den noden
- Sortera först alla noder med `orderIndex` (på `orderIndex`)
- Sortera sedan alla noder utan `orderIndex` men med `visualOrderIndex` (på `visualOrderIndex`)

