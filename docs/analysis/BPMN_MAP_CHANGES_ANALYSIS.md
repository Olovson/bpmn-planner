# Analys: Vad har ändrats med bpmn-map.json idag?

## Datum: 2025-12-26

## Ursprunglig Design (innan dagens ändringar)

### 1. Projektfilen som Source of Truth
**Enligt `BPMN_MAP_STORAGE_SAFETY_ANALYSIS.md`:**
- Projektfilen (`bpmn-map.json` i root) är **source of truth**
- Den innehåller ~23 produktionsprocesser (inga test-filer)
- Den är versionerad i Git
- **Storage-filen** är bara en cache för användarändringar

### 2. Merge-Strategi (Hybrid Approach)
**Enligt `BPMN_MAP_STORAGE_SAFETY_ANALYSIS.md`:**
- **Projektfilen** = source of truth för produktionsprocesser
- **Storage-filen** = cache för användarändringar (call_activities)
- **Merge säkert:**
  - Ta produktionsprocesser från projektfilen
  - Ta användarändringar från Storage (validerade)
  - Filtrera bort test-filer
- **Laddningsordning:**
  1. Försök ladda från Storage
  2. Om Storage saknas → skapa från projektfilen
  3. Om Storage är korrupt → fallback till projektfilen

### 3. Test-Isolering
**Enligt `bpmnMapTestHelper.ts`:**
- Tester startar **ALLTID med en tom map**
- Tester skapar sin egen test-version när test-filer laddas upp
- **INGA skrivningar går till Storage** - allt sparas bara i minnet
- Produktionsfilen är helt skyddad

### 4. Automatisk Generering
**Enligt `TEST_BPMN_MAP_ANALYSIS.md`:**
- När filer laddas upp → `analyzeAndSuggestMapUpdates()` anropas
- Automatiskt accepterar och sparar hög konfidens-matchningar
- När `bpmn-map.json` saknas → `generateBpmnMapFromFiles()` anropas automatiskt

## Vad har ändrats idag (2025-12-26)?

### 1. ✅ Normalisering av Korrupta Processer
**Vad:**
- Skapade `normalizeProcessIfCorrupt()` funktion
- Uppdaterade `mergeBpmnMaps()` att normalisera även befintliga processer från Storage
- Uppdaterade `generateUpdatedBpmnMap()` att normalisera befintliga processer

**Varför:**
- Förhindra att korruption sprids vidare
- Säkerställa att `bpmn-map.json` håller sig ren och korrekt strukturerad

**Är detta rätt väg?**
- ✅ **JA** - Detta är en förbättring som säkerställer datakvalitet
- ✅ Det är i linje med ursprunglig design (projektfilen som source of truth)
- ✅ Det förhindrar att korruption ackumuleras över tid

### 2. ⚠️ Kvalitetsvalidering och Automatisk Regenerering
**Vad:**
- Implementerade `isBpmnMapCorrupt()` för att detektera korruption
- Automatisk regenerering om filen är korrupt eller saknas
- Merge-funktionen normaliserar processer

**Varför:**
- Säkerställa att `bpmn-map.json` alltid är korrekt strukturerad
- Automatiskt fixa korruption när den upptäcks

**Är detta rätt väg?**
- ✅ **JA** - Detta är en förbättring som säkerställer datakvalitet
- ⚠️ **MEN** - Vi måste vara försiktiga med automatisk regenerering
- ⚠️ **VIKTIGT**: Automatisk regenerering kan förlora användarändringar om den körs för aggressivt

### 3. ⚠️ Projektfilen som Source of Truth - Förstärkt
**Vad:**
- Merge-funktionen tar alltid struktur från projektfilen
- Storage-filen ger bara användarändringar (call_activities)
- Normalisering av nya processer från Storage

**Varför:**
- Säkerställa att projektfilen alltid är source of truth
- Förhindra att korruption från Storage sprids

**Är detta rätt väg?**
- ✅ **JA** - Detta är i linje med ursprunglig design
- ⚠️ **MEN** - Vi måste se till att projektfilen hålls uppdaterad
- ⚠️ **PROBLEM**: Om projektfilen är gammal, kan den skapa orphaned processes

## Identifierade Problem

### 1. ⚠️ Projektfilen kan vara gammal
**Problem:**
- Projektfilen är statisk (versionerad i Git)
- Om nya filer läggs till i DB men inte i projektfilen → orphaned processes
- Om filer raderas från DB men finns kvar i projektfilen → orphaned processes

**Konsekvens:**
- Systemet försöker ladda filer som inte finns → 400 Bad Request errors
- Validering visar problem, men fixar inte dem automatiskt

**Lösning:**
- ✅ Validering upptäcker problem (redan implementerat)
- ⚠️ Användaren måste manuellt uppdatera projektfilen
- ⚠️ Automatisk cleanup kan förlora användarändringar

### 2. ⚠️ Automatisk Regenerering kan förlora Användarändringar
**Problem:**
- Om `bpmn-map.json` detekteras som korrupt → regenereras automatiskt
- Detta kan förlora användarändringar (manuellt skapade mappningar)

**Konsekvens:**
- Användare kan förlora viktig konfiguration
- Mappningar kan vara mer korrekta än vad auto-generering skulle skapa

**Lösning:**
- ✅ Merge-funktionen bevarar användarändringar (call_activities)
- ⚠️ Men om filen är helt korrupt, kan regenerering förlora ändringar
- ⚠️ Vi måste vara försiktiga med när vi regenererar

### 3. ✅ Normalisering är bra, men kan vara för aggressiv
**Problem:**
- Normalisering körs på alla processer från Storage
- Detta kan normalisera processer som faktiskt är korrekta

**Konsekvens:**
- Processer kan normaliseras även om de inte är korrupta
- Detta är okej eftersom normalisering bara fixar korruption

**Lösning:**
- ✅ Normalisering är idempotent (körs bara om korruption detekteras)
- ✅ Detta är en förbättring, inte ett problem

## Är vi på rätt väg?

### ✅ Vad som är bra:

1. **Normalisering av korrupta processer**
   - ✅ Förhindrar att korruption sprids
   - ✅ Säkerställer datakvalitet
   - ✅ I linje med ursprunglig design

2. **Kvalitetsvalidering**
   - ✅ Detekterar korruption automatiskt
   - ✅ Förhindrar att korrupta filer används
   - ✅ I linje med ursprunglig design

3. **Merge-funktionen**
   - ✅ Projektfilen är source of truth
   - ✅ Storage-filen ger användarändringar
   - ✅ Test-filer filtreras bort
   - ✅ I linje med ursprunglig design

### ⚠️ Vad som behöver förbättras:

1. **Projektfilen måste hållas uppdaterad**
   - ⚠️ Om projektfilen är gammal, kan den skapa orphaned processes
   - ⚠️ Användaren måste manuellt uppdatera projektfilen när nya filer läggs till
   - 💡 **Förslag**: Automatisk varning när projektfilen är gammal

2. **Automatisk regenerering måste vara försiktig**
   - ⚠️ Vi måste vara försiktiga med när vi regenererar
   - ⚠️ Vi måste bevara användarändringar
   - 💡 **Förslag**: Bara regenerera om filen är helt korrupt, annars merge

3. **Orphaned processes behöver hanteras**
   - ⚠️ Orphaned processes ackumuleras över tid
   - ⚠️ Validering visar problem, men fixar inte dem automatiskt
   - 💡 **Förslag**: Manuell rensning (redan rekommenderat i `BPMN_MAP_LOGICAL_ISSUES.md`)

## Rekommendationer

### ✅ Fortsätt med:
1. **Normalisering av korrupta processer** - Detta är en förbättring
2. **Kvalitetsvalidering** - Detta är en förbättring
3. **Merge-funktionen** - Detta är i linje med ursprunglig design

### ⚠️ Var försiktig med:
1. **Automatisk regenerering** - Bara regenerera om filen är helt korrupt
2. **Projektfilen måste hållas uppdaterad** - Varna användaren när den är gammal
3. **Orphaned processes** - Låt användaren manuellt rensa (redan rekommenderat)

### 💡 Förbättringar att överväga:
1. **Automatisk varning när projektfilen är gammal**
   - Jämför projektfilen med DB-filer
   - Visa varning om avvikelser
   - Föreslå uppdatering

2. **Förbättrad validering**
   - Visa tydliga varningar om orphaned processes
   - Föreslå rensning men låt användaren bestämma
   - Markera entries som "orphaned"

3. **Dokumentation**
   - Dokumentera att projektfilen måste hållas uppdaterad
   - Förklara hur orphaned processes hanteras
   - Förklara när automatisk regenerering körs

## Sammanfattning

**Är vi på rätt väg?**
- ✅ **JA** - Vi är på rätt väg
- ✅ Normalisering och kvalitetsvalidering är förbättringar
- ✅ Merge-funktionen är i linje med ursprunglig design
- ⚠️ **MEN** - Vi måste vara försiktiga med automatisk regenerering
- ⚠️ **OCH** - Projektfilen måste hållas uppdaterad

**Vad behöver vi göra?**
1. ✅ Fortsätt med normalisering och kvalitetsvalidering
2. ⚠️ Var försiktig med automatisk regenerering
3. 💡 Lägg till varningar när projektfilen är gammal
4. 💡 Förbättra validering för orphaned processes
5. 💡 Dokumentera beteendet tydligt







