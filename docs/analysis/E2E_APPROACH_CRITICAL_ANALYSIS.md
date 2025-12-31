# Objektiv Analys: E2E Scenario Generation Approach

**Datum:** 2025-01-XX  
**Syfte:** Objektiv bedömning av vad vi försöker uppnå och om vår approach är realistisk

---

## 🎯 Vad Försöker Vi Uppnå?

### Primärt Mål
**Generera E2E-testscenarier från BPMN-filer med hjälp av LLM (Claude).**

### Specifika Krav
1. **Input:** BPMN-filer + dokumentation (Feature Goals, file-level docs)
2. **Process:** 
   - Parse BPMN → Build flow graph → Find paths → Load docs → Send to LLM → Validate → Save
3. **Output:** 
   - E2E-scenarios med `given/when/then` på root-nivå
   - `subprocessSteps` med `given/when/then` per Feature Goal
   - `bankProjectTestSteps` med `action/assertion` per Feature Goal
4. **Användning:**
   - Visas i UI (E2E Tests Overview, Test Coverage, Test Report)
   - Extraheras till Feature Goal-test scenarios i databasen

---

## ⚠️ Kritiska Problem Vi Har Stött På

### 1. **Token Budget Risk (KRITISKT)**
**Problem:**
- Uppskattad token-användning: **9116 tokens**
- Max tokens för `testscript`: **900 tokens**
- **Överskridning: 10x över budget**

**Varför detta är ett problem:**
- LLM kan inte generera komplett output om max_tokens är för lågt
- Risk för trunkerad JSON som misslyckas vid validering
- Kostnad ökar exponentiellt med token-användning

**Vad vi försökt:**
- Varningar när token budget risk upptäcks
- Men vi fortsätter ändå med generering

**Realitet:**
- **Detta är inte hållbart.** Vi kan inte generera kompletta E2E-scenarios med 900 tokens när vi behöver 9116.

### 2. **Dokumentationskvalitet**
**Problem:**
- Dokumentation saknar ofta `flowSteps` eller `userStories`
- File-level docs kan vara minimala (saknar flowSteps)
- Validering varnar men fortsätter ändå

**Vad vi försökt:**
- Dokumentationskvalitetsvalidering
- Varningar om saknade fält
- Partiell generering (generera för det som finns)

**Realitet:**
- **Detta är delvis hållbart** - vi kan generera med ofullständig dokumentation, men kvaliteten blir lägre.

### 3. **Valideringskomplexitet**
**Problem:**
- `validateE2eScenarioOutput` förväntar sig sträng, men får objekt
- Structured outputs returnerar redan parsad JSON
- Många edge cases i validering

**Vad vi försökt:**
- Fixa validering för att hantera både sträng och objekt
- Men detta skapar komplexitet och buggar

**Realitet:**
- **Detta är fixbart** - men det visar att vi har många lager av komplexitet.

### 4. **Komplexitet i Koden**
**Problem:**
- `e2eScenarioGenerator.ts`: 928 rader
- Många fallbacks och edge cases
- Svårt att följa flödet

**Realitet:**
- **Detta är ett tecken på att approachen är komplex** - kanske för komplex för vad vi försöker uppnå.

---

## 🤔 Är Vår Approach Realistisk?

### ✅ Vad Som Fungerar Bra

1. **Konceptuellt:**
   - Att generera E2E-scenarios från BPMN är ett rimligt mål
   - LLM kan definitivt hjälpa till med detta
   - Structured outputs är rätt approach för JSON-generering

2. **Infrastruktur:**
   - Vi har bra separation of concerns (generator, storage, validator)
   - UI-visning fungerar
   - Integration med testgenerering fungerar

3. **Dokumentation:**
   - Vi har bra dokumentation av vad som genereras
   - Användarguider finns

### ❌ Vad Som INTE Fungerar Bra

1. **Token Budget:**
   - **KRITISKT:** Vi försöker generera för mycket med för lite tokens
   - 900 tokens räcker INTE för kompletta E2E-scenarios
   - Vi behöver antingen:
     - Öka maxTokens till minst 2000-3000
     - Eller förenkla output-strukturen
     - Eller dela upp genereringen i flera steg

2. **Dokumentationsberoende:**
   - Vi är för beroende av komplett dokumentation
   - Om dokumentation saknas, misslyckas generering
   - Detta gör systemet bräckligt

3. **Komplexitet:**
   - För många lager av validering, fallbacks, edge cases
   - Svårt att debugga när något går fel
   - Många "quick fixes" som skapar mer komplexitet

---

## 💡 Rekommendationer

### Kortsiktigt (För att få det att fungera nu)

1. **Öka maxTokens för testscript:**
   ```typescript
   testscript: {
     cloud: {
       maxTokens: 3000, // Öka från 900 till 3000
       temperature: 0.3,
     },
   }
   ```
   - **Risk:** Högre kostnad per anrop
   - **Fördel:** Kompletta scenarios kan genereras

2. **Förenkla validering:**
   - Ta bort dubbel parsning
   - Hantera structured outputs direkt som objekt

3. **Förbättra felhantering:**
   - Tydligare felmeddelanden
   - Bättre logging

### Långsiktigt (För att göra det hållbart)

1. **Överväg att dela upp genereringen:**
   - Generera root-level `given/when/then` först
   - Generera `subprocessSteps` separat
   - Kombinera sedan
   - **Fördel:** Mindre tokens per anrop, bättre kontroll

2. **Gör dokumentation valfritt:**
   - Generera scenarios även utan komplett dokumentation
   - Använd BPMN-struktur som fallback
   - **Fördel:** Mer robust system

3. **Förenkla output-strukturen:**
   - Kanske vi behöver inte ALLA fält i varje scenario?
   - Prioritera viktiga fält
   - **Fördel:** Mindre tokens, snabbare generering

4. **Överväg alternativ approach:**
   - Istället för att generera kompletta E2E-scenarios, generera:
     - Grundläggande scenario-struktur
     - Låt användaren komplettera
   - **Fördel:** Mindre beroende av LLM, mer kontroll

---

## 🎯 Slutsats

### Är Approachen Realistisk?

**JA, men med viktiga förbehåll:**

1. **Token budget måste fixas** - 900 tokens räcker inte för kompletta E2E-scenarios
2. **Komplexiteten måste reduceras** - för många lager av validering och fallbacks
3. **Dokumentationsberoendet måste minskas** - systemet måste fungera även med ofullständig dokumentation

### Vad Vi Bör Göra Nu

1. **Prioritet 1:** Öka maxTokens till minst 2000-3000 för testscript
2. **Prioritet 2:** Förenkla validering (ta bort dubbel parsning)
3. **Prioritet 3:** Förbättra felhantering och logging

### Vad Vi Bör Överväga Längre Fram

1. **Dela upp genereringen** i flera steg
2. **Göra dokumentation valfritt** - använd BPMN-struktur som fallback
3. **Förenkla output-strukturen** - prioritera viktiga fält

---

## 📊 Riskbedömning

| Risk | Sannolikhet | Påverkan | Prioritet |
|------|-------------|----------|-----------|
| Token budget för låg | **Hög** | **Hög** | **KRITISKT** |
| Dokumentation saknas | **Medel** | **Medel** | **Hög** |
| Validering misslyckas | **Låg** | **Medel** | **Medel** |
| Komplexitet ökar | **Hög** | **Medel** | **Medel** |

---

## ✅ Nästa Steg

1. **Omedelbart:** Öka maxTokens för testscript till 3000
2. **Kortsiktigt:** Förenkla validering och förbättra felhantering
3. **Långsiktigt:** Överväg att dela upp genereringen eller förenkla output-strukturen



