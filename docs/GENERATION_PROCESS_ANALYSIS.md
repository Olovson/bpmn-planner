# Analys av Genereringsprocessen

## Översikt

Denna analys granskar hur appen hanterar generering av dokumentation och testinformation för BPMN-filer, identifierar problem och förvirring, samt föreslår förbättringar.

## Nuvarande Implementation

### 1. Genereringsknappar och Funktioner

Appen har **fyra separata knappar** för generering:

1. **"Generera information för vald fil"** → `handleGenerateSelectedFile()` → `handleGenerateArtifacts(file, mode, 'file')`
2. **"Generera information (alla filer)"** → `handleGenerateAllArtifacts()` → loopar över alla filer
3. **"Generera testinformation för vald fil"** → `handleGenerateTestsForSelectedFile()` → `generateTestsForFile()`
4. **"Generera testinformation (alla filer)"** → `handleGenerateTestsForAllFiles()` → `generateTestsForAllFiles()`

### 2. Hierarki vs Per-Fil Generering

#### För EN fil:
- **Om filen är root-fil** (`file.file_name === rootFileName`):
  - `useHierarchy = true`
  - Bygger graf med **alla BPMN-filer** (`existingBpmnFiles`)
  - Genererar dokumentation för alla noder i hela hierarkin
  - **Problem**: Genererar för ALLA filer även om användaren bara vill generera för EN fil

- **Om filen INTE är root-fil**:
  - `useHierarchy = false`
  - Bygger graf med **bara den valda filen** (`[file.file_name]`)
  - Genererar dokumentation endast för noder i den filen
  - **Problem**: Om filen är en subprocess som anropas från root, saknas kontext

#### För ALLA filer:
- Bygger hierarki först (om root-fil finns)
- Loopar sedan över **varje fil individuellt** med `useHierarchy = false` (utom root)
- **Problem**: Dubbelarbete - hierarkin byggs, men sedan genereras varje fil isolerat

### 3. Testgenerering

Testgenerering är nu **helt separerad** från dokumentationsgenerering:
- Använder `generateTestsForFile()` och `generateTestsForAllFiles()`
- Kräver att dokumentation redan finns (för att hämta kontext)
- **Problem**: Ingen tydlig indikation om dokumentation saknas

## Identifierade Problem

### Problem 1: Förvirring kring Hierarki vs Per-Fil

**Scenario**: Användaren laddar upp 5 BPMN-filer:
- `mortgage.bpmn` (root)
- `mortgage-se-application.bpmn`
- `mortgage-se-household.bpmn`
- `mortgage-se-credit-evaluation.bpmn`
- `mortgage-se-decision.bpmn`

**Vad händer när användaren klickar "Generera information för vald fil" på `mortgage.bpmn`?**
- ✅ Bygger graf med alla 5 filer
- ✅ Genererar dokumentation för ALLA noder i alla 5 filer
- ❌ **Användaren förväntar sig kanske bara `mortgage.bpmn`**

**Vad händer när användaren klickar "Generera information för vald fil" på `mortgage-se-household.bpmn`?**
- ✅ Bygger graf med bara `mortgage-se-household.bpmn`
- ✅ Genererar dokumentation endast för noder i den filen
- ❌ **Saknar kontext från parent-processer**

### Problem 2: Inkonsekvent Beteende för "Alla Filer"

**När användaren klickar "Generera information (alla filer)":**
1. Bygger hierarki (om root finns)
2. Loopar över varje fil
3. För root-fil: `useHierarchy = true` → genererar för ALLA filer igen
4. För övriga filer: `useHierarchy = false` → genererar isolerat

**Resultat:**
- Root-filens noder genereras **två gånger** (en gång i hierarkisk mode, en gång isolerat)
- Subprocess-filer genereras **utan kontext** från parent-processer
- **Dubbelarbete och inkonsekvent resultat**

### Problem 3: Otydlig Separation av Dokumentation och Tester

**Nuvarande flöde:**
1. Användaren genererar dokumentation
2. Användaren genererar tester (separat steg)
3. Tester kräver dokumentation för kontext

**Problem:**
- Ingen tydlig indikation om dokumentation saknas när testgenerering startar
- Ingen validering att dokumentation finns innan testgenerering
- Otydligt vad som händer om dokumentation saknas

### Problem 4: Otydlig Scope-Hantering

**Kod i `handleGenerateArtifacts`:**
```typescript
const isRootFile = rootFileName && file.file_name === rootFileName;
const useHierarchy = isRootFile;
```

**Problem:**
- `scope`-parametern (`'file' | 'node'`) används inte alls
- Hierarki används automatiskt baserat på om filen är root
- Ingen tydlig kontroll över vad som genereras

### Problem 5: ProcessTree vs Generering

**ProcessTree byggs:**
- Automatiskt när appen laddas (`useProcessTree`)
- Parsar ALLA BPMN-filer
- Används för att visa noder i UI

**Generering:**
- Använder egen graf-byggning (`buildBpmnProcessGraph`)
- Kan använda hierarki eller inte
- **Problem**: Två separata system som kan ge olika resultat

### Problem 6: Versioning och Caching

**När filer genereras:**
- Version hashes används för att identifiera filversioner
- Men generering kan använda fel version om cache är gammal
- **Problem**: Otydligt vilken version som genereras

## Rekommenderade Förbättringar

### Förbättring 0: Automatisk Hierarki-Hantering (HÖGST PRIORITET)

**Föreslaget beteende:**

1. **Ta bort manuell "Bygg hierarki"-knapp** (eller göra den till en avancerad funktion)
2. **Automatisk hierarki-byggning**:
   - När användaren klickar "Generera information för vald fil":
     - Om filen är root: Bygg hierarki automatiskt (tyst, i bakgrunden)
     - Om filen är subprocess: Bygg hierarki automatiskt om den saknas
   - När användaren klickar "Generera information (alla filer)":
     - Bygg hierarki automatiskt (som nu, men gör det mer transparent)
3. **Tydlig feedback**:
   - Visa "Bygger hierarki..." som en del av genereringsprocessen (inte som separat steg)
   - Dölj tekniska detaljer om hierarki från användaren
   - Visa bara "Förbereder generering..." eller liknande

**Implementation:**
- Flytta `buildHierarchySilently()` till början av `handleGenerateArtifacts()`
- Ta bort beroende på `hierarchyBuilt` state
- Gör hierarki-byggning till en del av genereringsprocessen, inte ett separat steg

### Förbättring 1: Tydlig Scope-Kontroll

**Föreslaget beteende:**

1. **"Generera information för vald fil"** (EN fil):
   - **Alternativ A**: Generera ENDAST för den valda filen (isolat)
   - **Alternativ B**: Generera för filen + dess direkta subprocesser
   - **Alternativ C**: Visa dialog: "Generera isolerat" vs "Generera med hierarki"

2. **"Generera information (alla filer)"**:
   - Bygg hierarki först
   - Generera EN gång för hela hierarkin (root-fil med `useHierarchy = true`)
   - **Inte** loopa över varje fil individuellt

### Förbättring 2: Tydligare UI och Feedback

**Föreslaget:**
- Visa tydligt vad som kommer att genereras innan start
- Visa antal filer och noder som påverkas
- Visa om hierarki kommer att användas
- Visa om dokumentation saknas innan testgenerering

### Förbättring 3: Validering och Förberedelse

**Föreslaget:**
- Validera att dokumentation finns innan testgenerering
- Validera att hierarki är byggd innan hierarkisk generering
- Ge tydliga felmeddelanden om förutsättningar saknas

### Förbättring 4: Enhetlig Graf-Byggning

**Föreslaget:**
- Använd samma graf-byggning för ProcessTree och generering
- Cache grafen för att undvika dubbelarbete
- Synkronisera ProcessTree och generering

### Förbättring 5: Tydligare Separation

**Föreslaget:**
- Tydlig indikation att dokumentation och tester är separerade
- Automatisk validering att dokumentation finns
- Möjlighet att generera tester endast för filer med dokumentation

## Exempel på Förbättrat Flöde

### Scenario 1: Användaren vill generera för EN fil

**Nuvarande:**
```
Klickar "Generera information för vald fil" på mortgage-se-household.bpmn
→ useHierarchy = false (inte root)
→ Genererar isolerat
→ Saknar kontext
→ Användaren måste manuellt bygga hierarki först (om den vill ha kontext)
```

**Föreslaget (med automatisk hierarki):**
```
Klickar "Generera information för vald fil" på mortgage-se-household.bpmn
→ Appen bygger automatiskt hierarki (tyst, i bakgrunden)
→ Appen identifierar att filen är en subprocess
→ Appen genererar för filen + dess kontext från parent-processer
→ Användaren ser bara "Genererar dokumentation..." (hierarki är transparent)
```

**Alternativ (om användaren vill isolerat):**
```
Klickar "Generera information för vald fil" på mortgage-se-household.bpmn
→ Dialog: "Generera med full kontext (rekommenderat) eller isolerat?"
→ Default: "Med kontext" (hierarki används automatiskt)
→ Om isolerat: Genererar bara för den filen
```

### Scenario 2: Användaren vill generera för ALLA filer

**Nuvarande:**
```
Klickar "Generera information (alla filer)"
→ Bygger hierarki (visas som toast: "Bygger hierarki...")
→ Loopar över varje fil
→ Root genereras två gånger
→ Subprocesser genereras isolerat
→ Användaren ser hierarki som ett separat steg
```

**Föreslaget (med automatisk hierarki):**
```
Klickar "Generera information (alla filer)"
→ Appen bygger automatiskt hierarki (tyst, som del av processen)
→ Appen genererar EN gång för hela hierarkin (root med useHierarchy = true)
→ Alla filer inkluderas i en enda generering
→ Användaren ser bara "Genererar dokumentation för alla filer..."
→ Inga dubbelarbeten, ingen synlig hierarki-byggning
```

### Scenario 3: Användaren vill generera tester

**Nuvarande:**
```
Klickar "Generera testinformation för vald fil"
→ Startar direkt
→ Kan misslyckas om dokumentation saknas
```

**Föreslaget:**
```
Klickar "Generera testinformation för vald fil"
→ Validerar att dokumentation finns
→ Om saknas: Visa varning och erbjud att generera dokumentation först
→ Om finns: Starta testgenerering
```

## Ytterligare Problem: Manuell Hierarki-Byggning

### Problem 7: Användaren Måste Manuellt Bygga Hierarki

**Nuvarande beteende:**
- Det finns en manuell knapp "Bygg/uppdatera hierarki" som användaren måste klicka på
- För "Generera information (alla filer)" byggs hierarki automatiskt (men visas som toast)
- För "Generera information för vald fil" byggs INTE hierarki automatiskt (bara om filen är root)
- Kommentarer i koden säger: "Om jira_name behövs, använd 'Bygg/uppdatera hierarki från root' först"

**Användarens förväntning:**
- Appen ska automatiskt hantera hierarki-byggning
- Användaren ska inte behöva tänka på hierarki som ett separat steg
- Allt ska "bara fungera" när användaren klickar på generera

**Problem:**
- För abstrakt för användaren att förstå när hierarki behövs
- Manuellt steg som användaren kan glömma
- Otydligt vad som händer om hierarki inte är byggd

## Sammanfattning

### Huvudproblem:
1. **Otydlig scope**: Användaren vet inte vad som genereras
2. **Inkonsekvent beteende**: Root-fil vs subprocess-fil fungerar olika
3. **Dubbelarbete**: "Alla filer" genererar root två gånger
4. **Saknad validering**: Tester kan starta utan dokumentation
5. **Två separata system**: ProcessTree och generering använder olika grafer
6. **Manuell hierarki-byggning**: Användaren måste manuellt bygga hierarki (för abstrakt)

### Rekommendationer:
1. **Automatisk hierarki-hantering**: Appen ska alltid automatiskt bygga hierarki när det behövs, utan att användaren behöver tänka på det
2. **Tydlig scope-kontroll**: Låt användaren välja isolerat vs hierarki (men gör hierarki till default)
3. **Enhetlig generering**: "Alla filer" ska generera EN gång för hela hierarkin
4. **Validering**: Kontrollera förutsättningar innan generering
5. **Tydligare UI**: Visa vad som kommer att genereras (men dölj hierarki-detaljer)
6. **Enhetlig graf**: Använd samma graf för ProcessTree och generering

