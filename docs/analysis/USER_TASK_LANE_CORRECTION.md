# Analys: Korrigering av User Task Lane/Användare

**Datum:** 2025-01-XX  
**Problem:** User Tasks har fel användare/stakeholder i genererad dokumentation. Claude tror att handläggaren gör uppgifter som faktiskt ska göras av primary stakeholder (kunden).

---

## 🔍 Problemidentifiering

### Vad Användaren Ser
- "Register source of equity" visas som att handläggaren gör det i dokumentationen
- Men det ska göras av primary stakeholder (kunden)
- Process-explorer-sidan har logik som fungerar bra (utom för "Evaluate application" i credit decision)

### Rotorsak

**Problem i `inferLane()` i `llmDocumentation.ts`:**

1. **Fel default för User Tasks:**
   - Rad 976: `if (node.type === 'userTask') { return 'Handläggare'; }`
   - Default sätter alla User Tasks till "Handläggare"
   - Men process-explorer använder `isCustomerFacingUserTask()` som default är kund/stakeholder

2. **Mismatch mellan process-explorer och dokumentation:**
   - **Process-explorer** (`ProcessTreeD3.tsx`): Default = kund/stakeholder, undantag för interna nyckelord
   - **Dokumentation** (`llmDocumentation.ts`): Default = handläggare, undantag för kund-nyckelord

3. **Exempel:**
   - "Register source of equity" → `inferLane()` returnerar "Handläggare" (fel)
   - "Register source of equity" → `isCustomerFacingUserTask()` returnerar `true` (korrekt)
   - "Evaluate application" (i credit decision) → ska vara "Handläggare" (korrekt med ny logik)

---

## 📊 Nuvarande Implementation

### `inferLane()` (FÖRE fix)

```typescript
function inferLane(node: BpmnProcessNode): string {
  const name = (node.name || '').toLowerCase();

  // Kund-centrerade aktiviteter (endast om namnet innehåller specifika ord)
  if (
    name.includes('kund') ||
    name.includes('customer') ||
    name.includes('applicant') ||
    name.includes('ansökan') ||
    name.includes('stakeholder') ||
    name.includes('household')
  ) {
    return 'Kund';
  }

  // Användaruppgifter hamnar normalt hos handläggare (DEFAULT)
  if (node.type === 'userTask') {
    return 'Handläggare'; // ❌ FEL: Default är handläggare
  }

  return 'Handläggare';
}
```

### `isCustomerFacingUserTask()` (process-explorer)

```typescript
const isCustomerFacingUserTask = (node: ProcessTreeNode): boolean => {
  if (node.type !== 'userTask') return false;
  const label = (node.label || '').toLowerCase();

  // Nyckelord som tydligt indikerar interna/handläggar-uppgifter
  const internalKeywords = [
    'review', 'granska', 'assess', 'utvärdera',
    'advanced-underwriting', 'board', 'committee',
    'four eyes', 'four-eyes', 'manual', 'distribute',
    'distribuera', 'archive', 'arkivera', 'verify', 'handläggare',
  ];

  // Om den matchar interna ord → behandla som intern/backoffice
  if (internalKeywords.some((keyword) => label.includes(keyword))) {
    return false; // Intern/Handläggare
  }

  // Default: kund- eller stakeholder-interaktion ✅
  return true; // Kund/Stakeholder
};
```

---

## 🔧 Lösning

### Uppdatera `inferLane()` för att använda samma logik

**Ändringar:**
1. ✅ Använd samma `internalKeywords`-lista som process-explorer
2. ✅ Default för User Tasks = "Kund" (inte "Handläggare")
3. ✅ Om namnet innehåller interna nyckelord → "Handläggare"
4. ✅ Lägg till "evaluate" i interna nyckelord (för "evaluate-application-*" i credit decision)

**Resultat:**
- "Register source of equity" → "Kund" ✅
- "Evaluate application" (i credit decision) → "Handläggare" ✅
- "Consent to credit check" → "Kund" ✅
- "Review KYC" → "Handläggare" ✅

---

## ✅ Implementation

### Uppdaterad `inferLane()`

```typescript
function inferLane(node: BpmnProcessNode): string {
  const name = (node.name || '').toLowerCase();

  // Regelmotor / system
  if (node.type === 'businessRuleTask' || node.type === 'serviceTask' || node.type === 'dmnDecision') {
    return 'Regelmotor';
  }

  // User Tasks: använd samma logik som process-explorer
  if (node.type === 'userTask') {
    // Nyckelord som tydligt indikerar interna/handläggar-uppgifter
    const internalKeywords = [
      'review', 'granska', 'assess', 'utvärdera',
      'evaluate', // ✅ För evaluate-application-* i credit decision
      'advanced-underwriting', 'board', 'committee',
      'four eyes', 'four-eyes', 'manual', 'distribute',
      'distribuera', 'archive', 'arkivera', 'verify', 'handläggare',
    ];

    // Om den matchar interna ord → behandla som intern/backoffice (Handläggare)
    if (internalKeywords.some((keyword) => name.includes(keyword))) {
      return 'Handläggare';
    }

    // Default: kund- eller stakeholder-interaktion ✅
    return 'Kund';
  }

  // Call activities utan tydlig signal behandlas som system/regelmotor
  if (node.type === 'callActivity') {
    return 'Regelmotor';
  }

  return 'Handläggare';
}
```

---

## 🧪 Testfall

### Förväntade Resultat

1. **"Register source of equity"** (User Task)
   - `inferLane()` → "Kund" ✅
   - `isCustomerFacingUserTask()` → `true` ✅
   - Matchar process-explorer ✅

2. **"Evaluate application"** (User Task i credit decision)
   - `inferLane()` → "Handläggare" ✅ (p.g.a. "evaluate" i namnet)
   - `isCustomerFacingUserTask()` → `false` ✅
   - Matchar process-explorer ✅

3. **"Consent to credit check"** (User Task)
   - `inferLane()` → "Kund" ✅
   - `isCustomerFacingUserTask()` → `true` ✅
   - Matchar process-explorer ✅

4. **"Review KYC"** (User Task)
   - `inferLane()` → "Handläggare" ✅ (p.g.a. "review" i namnet)
   - `isCustomerFacingUserTask()` → `false` ✅
   - Matchar process-explorer ✅

---

## 📝 Ytterligare Överväganden

### Konsistens mellan process-explorer och dokumentation

Nu använder både process-explorer och dokumentationsgenerering samma logik:
- ✅ Default för User Tasks = kund/stakeholder
- ✅ Undantag för interna nyckelord = handläggare
- ✅ Konsistent beteende i hela appen

### Framtida Förbättringar

Om det behövs mer exakt kontroll kan vi:
1. Lägga till explicit mapping i `node-docs/` overrides
2. Lägga till metadata i BPMN-filerna (t.ex. lane/role)
3. Skapa databas-tabell för user task → persona mapping

---

## ✅ Checklista

- [x] Uppdatera `inferLane()` för att använda samma logik som `isCustomerFacingUserTask()`
- [x] Lägg till "evaluate" i interna nyckelord
- [x] Ändra default för User Tasks från "Handläggare" till "Kund"
- [ ] Testa med "Register source of equity" → ska vara "Kund"
- [ ] Testa med "Evaluate application" → ska vara "Handläggare"
- [ ] Verifiera att dokumentation genereras med rätt användare
- [ ] Verifiera att process-explorer och dokumentation är konsistenta



