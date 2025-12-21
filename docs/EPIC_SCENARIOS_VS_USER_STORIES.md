# Analys: Kan scenarios tas bort om vi har User Stories + Acceptanskriterier?

## Nuvarande användning av scenarios

### 1. Testgenerering
- `buildScenariosFromDocJson()` konverterar scenarios till `TestScenario[]`
- Sparas i `node_planned_scenarios` databasen
- Används för att generera Playwright-testfall

### 2. Kategorisering
- Scenarios har `type` (Happy/Edge/Error)
- Mappas till `category` (happy-path/edge-case/error-case)
- Används för testprioritering

### 3. Testscript-generering
- `buildTestSkeletonScenariosFromDocJson()` använder scenarios för att generera test-skelett
- Direkt mappning: scenario → testfall

## Jämförelse: Scenarios vs User Stories + Acceptanskriterier

### Scenarios (nuvarande):
```typescript
{
  id: "EPIC-S1",
  name: "Happy path",
  type: "Happy",  // ← Viktig för testgenerering
  description: "Kunden fyller i korrekta uppgifter",
  outcome: "Epiken slutförs utan avvikelser"
}
```

**Användning:**
- Direkt mappning till testfall
- Tydlig kategorisering (Happy/Edge/Error)
- Används för testgenerering

### User Stories + Acceptanskriterier (föreslaget):
```typescript
{
  id: "US-1",
  role: "Kund",
  goal: "Fylla i ansökningsinformation",
  value: "Kunna ansöka om lån",
  acceptanceCriteria: [
    "Systemet ska validera att alla obligatoriska fält är ifyllda",
    "Systemet ska visa tydliga felmeddelanden om fält saknas",
    "Systemet ska spara utkast automatiskt"
  ]
}
```

**Användning:**
- Användarcentrerad fokus
- Konkreta krav
- Men saknar tydlig kategorisering för testfall

## Kan scenarios tas bort?

### ✅ JA - Om vi gör acceptanskriterier test-orienterade

**Alternativ 1: Kategorisera acceptanskriterier**
```typescript
{
  userStories: [{
    role: "Kund",
    goal: "...",
    value: "...",
    acceptanceCriteria: [
      { category: "happy-path", criteria: "Systemet ska validera..." },
      { category: "edge-case", criteria: "Systemet ska hantera..." },
      { category: "error-case", criteria: "Systemet ska visa fel..." }
    ]
  }]
}
```

**Fördelar:**
- En struktur istället för två
- Acceptanskriterier blir test-orienterade
- Mindre komplexitet

**Nackdelar:**
- Mer komplex struktur för acceptanskriterier
- User stories blir mer tekniska

### ✅ JA - Om vi behåller scenarios men gör dem enklare

**Alternativ 2: Förenkla scenarios, behåll för testgenerering**
```typescript
{
  // User stories för användarcentrerad fokus
  userStories: [...],
  
  // Enkla scenarios endast för testgenerering
  testScenarios: [
    { id: "T1", name: "Happy path", category: "happy-path" },
    { id: "T2", name: "Valideringsfel", category: "edge-case" },
    { id: "T3", name: "Tekniskt fel", category: "error-case" }
  ]
}
```

**Fördelar:**
- Tydlig separation: User stories (användarcentrerat) vs Test scenarios (testbarhet)
- Enkla scenarios - bara för testgenerering
- User stories fokuserar på användarens behov

**Nackdelar:**
- Två strukturer (men med tydligt syfte)

### ❌ NEJ - Om vi behåller båda som de är nu

**Problem:**
- Redundans mellan scenarios och acceptanskriterier
- Två strukturer som fyller samma syfte
- Ökad komplexitet

## Rekommendation: Alternativ 2 - Förenkla scenarios

### Struktur:
```typescript
{
  // ... befintliga fält ...
  userStories?: Array<{
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[]; // Konkreta krav
  }>;
  
  // Enkla testscenarios - endast för testgenerering
  testScenarios?: Array<{
    id: string;
    name: string;
    category: "happy-path" | "edge-case" | "error-case";
    description?: string; // Opcional - kan härledas från user stories
  }>;
}
```

### Fördelar:
1. **Tydlig separation:**
   - User stories = Användarcentrerad fokus
   - Test scenarios = Testbarhet

2. **Enkla scenarios:**
   - Bara id, name, category
   - Beskrivning kan härledas från user stories
   - Fokuserar på testgenerering

3. **Mindre redundans:**
   - User stories ger detaljerad information
   - Scenarios ger bara testkategorisering

4. **Bakåtkompatibilitet:**
   - Kan mappa gamla scenarios till nya testScenarios
   - Testgenerering fungerar som tidigare

### Implementation:
1. Lägg till `userStories` (opcional)
2. Byt namn på `scenarios` → `testScenarios` (opcional, för tydlighet)
3. Förenkla `testScenarios` - bara id, name, category
4. Uppdatera testgenerering att använda `testScenarios`

## Slutsats

### ✅ JA - Ta bort detaljerade scenarios

**Men:**
- Behåll enkla testscenarios för testgenerering
- Lägg till user stories för användarcentrerad fokus
- Tydlig separation: User stories (användare) vs Test scenarios (tester)

**Resultat:**
- User stories ger användarcentrerad fokus och konkreta krav
- Test scenarios ger testbarhet och kategorisering
- Mindre redundans, tydligare syfte





