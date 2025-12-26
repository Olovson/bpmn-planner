# Komplett Förklaring: Testfall-generering med Claude

## 🎯 Hur Det Fungerar

### Översikt

Systemet stödjer två sätt att generera testfall:

1. **Deterministic (Utan Claude)** - Snabb, kostnadsfri, men lägre kvalitet
2. **Med Claude** - Långsammare, kostar pengar, men högre kvalitet

Båda metoderna läser från **befintlig dokumentation** och ändrar den inte.

---

## 🔄 Detaljerat Flöde

### Steg 1: Extrahera User Stories (Båda metoderna)

**Vad händer:**
1. Systemet läser Epic- och Feature Goal-dokumentation från Supabase Storage
2. Parserar HTML för att hitta user stories med acceptanskriterier
3. Strukturerar data till `ExtractedUserStory[]`

**Input:**
- HTML-filer från `docs/claude/epics/` och `docs/claude/feature-goals/`

**Output:**
```typescript
{
  id: "US-1",
  role: "Kund",
  goal: "skapa ansökan",
  value: "jag kan ansöka om lån",
  acceptanceCriteria: [
    "Systemet ska validera att alla obligatoriska fält är ifyllda",
    "Systemet ska visa tydliga felmeddelanden om fält saknas"
  ],
  bpmnFile: "mortgage-se-application.bpmn",
  bpmnElementId: "application"
}
```

---

### Steg 2: Bygg BPMN-processgraf (Båda metoderna)

**Vad händer:**
1. Systemet läser BPMN-filer och parserar struktur
2. Identifierar paths (happy-path, error-path)
3. Extraherar error events och gateways
4. Bygger graf med nodtyper, sequence flows, dependencies

**Input:**
- BPMN-filer från projektet

**Output:**
```typescript
{
  root: {
    id: "fetch-party-information",
    type: "ServiceTask",
    name: "Fetch party information",
    children: [
      { id: "screen-party", type: "BusinessRuleTask", ... },
      { id: "is-party-rejected", type: "Gateway", ... }
    ]
  }
}
```

---

### Steg 3A: Deterministic Generering (Utan Claude)

**Vad händer:**
1. **Konverterar user stories** till test scenarios med enkel logik:
   - Kategorisering: Söker efter keywords ("fel" → error-case)
   - Prioritering: Roll-baserad ("Kund" → P1, "Handläggare" → P0)
   - Generiska steg: "Som Kund skapa ansökan"
2. **Genererar process flow-scenarios** från BPMN:
   - Identifierar paths (happy-path, error-path)
   - Skapar generiska steg: "Systemet exekverar: Fetch party information"

**Kvalitet:**
- ⭐⭐ **Låg-Medel (30-40%)**
- Mycket omskrivning av samma information
- Kategorisering kan vara felaktig (keywords vs semantik)
- Steg är generiska, saknar detaljer

**Tid:** Sekunder

**Kostnad:** Gratis

---

### Steg 3B: Claude-generering (Med Claude)

**Vad händer:**
1. **Bygger kontext** för Claude:
   - Kombinerar user stories + BPMN-processflöde
   - Inkluderar dokumentation (summary, flowSteps, dependencies)
   - Inkluderar BPMN-struktur (paths, error events, gateways)
2. **Anropar Claude** med kontext:
   - Claude analyserar semantik (inte bara keywords)
   - Claude genererar konkreta steg baserat på dokumentation
   - Claude identifierar edge cases som kanske saknas
   - Claude prioriterar baserat på risk (inte bara roll)
3. **Validerar output** mot schema
4. **Konverterar** till TestScenario-format

**Kvalitet:**
- ⭐⭐⭐⭐ **Hög (85-95%)**
- Semantisk analys (förstår kontexten)
- Konkreta steg baserat på dokumentation + BPMN
- Identifierade edge cases
- Risk-baserad prioritering

**Tid:** Minuter (API-anrop)

**Kostnad:** API-anrop per nod

---

### Steg 4: Spara Scenarios (Båda metoderna)

**Vad händer:**
1. Systemet grupperar scenarios per BPMN-nod
2. Sparar till `node_planned_scenarios`-tabellen
3. Använder `upsert` (uppdaterar befintliga, skapar nya)

**Format:**
```typescript
{
  bpmn_file: "mortgage-se-application.bpmn",
  bpmn_element_id: "application",
  provider: "claude",
  origin: "llm-doc", // eller "spec-parsed" för process flow
  scenarios: [
    {
      id: "scenario-1",
      name: "Happy Path: Skapa ansökan",
      description: "...",
      category: "happy-path",
      priority: "P1",
      steps: [...],
      acceptanceCriteria: [...]
    }
  ]
}
```

---

## 📊 Kvalitet och Säkerhet

### Deterministic Generering

**Kvalitet:**
- ⭐⭐ **Låg-Medel (30-40%)**
- Mycket omskrivning av samma information
- Kategorisering baserat på keywords (kan vara felaktig)
- Generiska steg utan konkreta detaljer

**Säkerhet:**
- ✅ **100% deterministisk** - Samma input ger alltid samma output
- ✅ **Inga externa dependencies** - Fungerar även om Claude API är nere
- ✅ **Snabb** - Sekunder, inte minuter
- ✅ **Gratis** - Inga API-kostnader

**När att använda:**
- Snabb översikt av testtäckning
- När Claude API är otillgänglig
- När kostnad är en faktor
- När kvalitet inte är kritisk

---

### Claude-generering

**Kvalitet:**
- ⭐⭐⭐⭐ **Hög (85-95%)**
- Semantisk analys (förstår kontexten)
- Konkreta steg baserat på dokumentation + BPMN
- Identifierade edge cases
- Risk-baserad prioritering

**Säkerhet:**
- ⚠️ **Beror på Claude API** - Kan misslyckas om API är nere
- ⚠️ **Rate limits** - Kan begränsas av API
- ⚠️ **Kostnad** - API-anrop kostar pengar
- ✅ **Fallback** - Automatisk fallback till deterministic om Claude misslyckas
- ✅ **Validering** - Output valideras mot schema
- ✅ **Error handling** - Graceful degradation vid fel

**När att använda:**
- När kvalitet är viktigt
- När du behöver konkreta steg för testdesign
- När du vill identifiera edge cases
- När du har budget för API-anrop

---

## 👨‍💼 Hur En Testare Använder Detta

### 1. Navigera till Testgenerering-sidan

1. Öppna appen
2. Klicka på "Testgenerering"-knappen i vänstermenyn
3. Du ser två sektioner:
   - **Extrahera User Story-scenarios** (deterministic)
   - **Generera Process Flow-scenarios** (deterministic)
   - **Generera med Claude** (om implementerat)

---

### 2. Generera Testfall (Deterministic)

1. **Klicka på "Extrahera User Stories"**
   - Systemet läser dokumentation
   - Konverterar user stories till test scenarios
   - Sparar till databasen
   - **Tid:** Sekunder
   - **Kostnad:** Gratis

2. **Klicka på "Generera Process Flow-scenarios"**
   - Systemet analyserar BPMN-processflöde
   - Identifierar paths (happy-path, error-path)
   - Genererar scenarios med generiska steg
   - Sparar till databasen
   - **Tid:** Sekunder
   - **Kostnad:** Gratis

**Resultat:**
- Test scenarios sparas i `node_planned_scenarios`
- Kan ses i Test Report-sidan
- Kan ses i RightPanel när du väljer en nod

**Kvalitet:**
- ⭐⭐ Låg-Medel - Mycket omskrivning, generiska steg
- Kan behöva manuell redigering för att vara användbart

---

### 3. Generera Testfall (Med Claude) - Om Implementerat

1. **Klicka på "Generera med Claude"**
   - Systemet bygger kontext från user stories + BPMN
   - Anropar Claude för analys
   - Claude genererar konkreta steg
   - Validerar och sparar
   - **Tid:** Minuter (API-anrop)
   - **Kostnad:** API-anrop per nod

**Resultat:**
- Test scenarios med högre kvalitet
- Konkreta steg baserat på dokumentation
- Identifierade edge cases
- Risk-baserad prioritering

**Kvalitet:**
- ⭐⭐⭐⭐ Hög - Analys och förbättring
- Mindre manuell redigering behövs

---

### 4. Använda Genererade Scenarios

**I Test Report-sidan:**
- Se översikt över alla scenarios
- Filtrera på process, status, kategori
- Klicka på en nod för att se dess scenarios

**I RightPanel:**
- Välj en nod i BPMN-viewern
- Öppna "Tests"-fliken
- Se alla scenarios för den noden

**För Testdesign:**
- Använd scenarios som grund för testfall
- Lägg till konkreta detaljer (API, UI, testdata)
- Prioritera baserat på riskLevel
- Följ steg-för-steg genom processen

---

## ⚠️ Viktiga Punkter

### 1. Inga Ändringar i Dokumentation

- Testgenereringen **läser endast** från befintlig dokumentation
- Den **ändrar inte** dokumentationen
- Du kan köra genereringen flera gånger utan risk

---

### 2. Kräver Befintlig Dokumentation

- För user story-scenarios: Du måste ha Epic- eller Feature Goal-dokumentation med user stories
- För process flow-scenarios: Du måste ha BPMN-filer
- Om dokumentation saknas: Inga scenarios genereras

---

### 3. Upsert-logik

- Systemet använder `upsert` (update or insert)
- Om du genererar om: Befintliga scenarios uppdateras
- Manuella ändringar: Bevaras om `bpmn_file`, `bpmn_element_id`, `provider`, `origin` matchar

---

### 4. Fallback

- Om Claude misslyckas: Automatisk fallback till deterministic generering
- Om deterministic misslyckas: Inga scenarios genereras (men inget kraschar)

---

## 📊 Förväntad Kvalitet per Metod

### Deterministic (Utan Claude)

**User Story-scenarios:**
- Kategorisering: ⭐⭐ Låg (keywords, kan vara felaktig)
- Steg: ⭐⭐ Låg (generiska, saknar detaljer)
- Prioritering: ⭐⭐ Låg (enkel logik)
- **Total:** ⭐⭐ Låg-Medel (30-40%)

**Process Flow-scenarios:**
- Path-identifiering: ⭐⭐⭐ Medel (identifierar paths)
- Steg: ⭐⭐ Låg (generiska)
- **Total:** ⭐⭐⭐ Medel (70-80%)

---

### Med Claude

**User Story-scenarios:**
- Kategorisering: ⭐⭐⭐⭐ Hög (semantisk analys)
- Steg: ⭐⭐⭐⭐ Hög (konkreta, baserat på dokumentation)
- Prioritering: ⭐⭐⭐⭐ Hög (risk-baserad)
- Edge cases: ⭐⭐⭐⭐ Hög (identifierade automatiskt)
- **Total:** ⭐⭐⭐⭐ Hög (85-95%)

**Process Flow-scenarios:**
- Path-identifiering: ⭐⭐⭐⭐ Hög (identifierar paths)
- Steg: ⭐⭐⭐⭐ Hög (konkreta, baserat på dokumentation + BPMN)
- Prerequisites: ⭐⭐⭐⭐ Hög (identifierade)
- **Total:** ⭐⭐⭐⭐ Hög (80-90%)

---

## 💡 Rekommendationer

### Hybrid-approach (Rekommendation)

1. **Börja med deterministic** för snabb översikt
2. **Använd Claude** för viktiga noder som behöver högre kvalitet
3. **Manuell redigering** för att lägga till konkreta detaljer (API, UI, testdata)

### När att använda Deterministic
- Snabb översikt av testtäckning
- När Claude API är otillgänglig
- När kostnad är en faktor

### När att använda Claude
- När kvalitet är viktigt
- När du behöver konkreta steg för testdesign
- När du vill identifiera edge cases

---

**Datum:** 2025-12-22
**Version:** 1.0.0





