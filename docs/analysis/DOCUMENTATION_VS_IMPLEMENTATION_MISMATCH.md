# Analys: Dokumentation vs Implementering - Fil-sortering

## Fråga

Användaren frågar: "Menar du verkligen att vi inte redan har dokumenterat att vi använder oss av dependency grafer för just detta ändamålet eller är det så att vår implementering inte följer vår dokumentation?"

---

## Vad Säger Koden?

### Kommentar i `bpmnGenerators.ts` (rad 1811-1812):

```typescript
// VIKTIGT: Sortera filer så att subprocess-filer genereras FÖRE parent-filer
// Detta säkerställer att child documentation finns tillgänglig när parent Feature Goals genereras
```

**Vad kommentaren säger:**
- ✅ Subprocess-filer ska genereras FÖRE parent-filer
- ✅ Syfte: Säkerställa att child documentation finns tillgänglig

**Vad implementeringen gör (rad 1815-1830):**
```typescript
// Identifiera subprocess-filer (filer som anropas av callActivities)
const subprocessFiles = new Set<string>();
for (const node of nodesToGenerate) {
  if (node.type === 'callActivity' && node.subprocessFile) {
    subprocessFiles.add(node.subprocessFile);
  }
}

// Separera i subprocess-filer och root-filer
const subprocessFilesList = analyzedFiles.filter(file => subprocessFiles.has(file));
const rootFilesList = analyzedFiles.filter(file => !subprocessFiles.has(file));

// Sortera varje kategori alfabetiskt för determinism
subprocessFilesList.sort((a, b) => a.localeCompare(b));
rootFilesList.sort((a, b) => a.localeCompare(b));

// Subprocess-filer först, sedan root-filer
const sortedAnalyzedFiles = [...subprocessFilesList, ...rootFilesList];
```

**Problem:**
- ✅ Identifierar subprocess-filer korrekt
- ✅ Separerar subprocess-filer från root-filer
- ✅ Subprocess-filer genereras FÖRE root-filer
- ❌ **Men sorterar alfabetiskt** → parent kan komma före subprocess om båda är subprocess-filer
- ❌ **Använder INTE dependency-grafer** för topologisk sortering

---

## Vad Säger Dokumentationen?

### 1. `DOCUMENTATION_GENERATION_ORDER_ANALYSIS.md`

**Typ:** Analys av problemet (skapad idag)

**Innehåll:**
- Beskriver problemet med alfabetisk sortering
- Rekommenderar topologisk sortering baserat på dependency-grafer
- **Men detta är en ANALYS, inte dokumentation av hur det fungerar**

**Status:** ❌ Inte dokumentation av nuvarande beteende, utan analys av problemet

---

### 2. `WHY_NOT_USING_EXISTING_DEPENDENCY_GRAPH.md`

**Typ:** Analys av varför dependency-grafer inte används (skapad idag)

**Innehåll:**
- Identifierar att dependency-grafer finns men inte används
- Förklarar varför alfabetisk sortering används istället
- **Men detta är en ANALYS, inte dokumentation av hur det fungerar**

**Status:** ❌ Inte dokumentation av nuvarande beteende, utan analys av problemet

---

### 3. Kommentarer i Koden

**Kommentar (rad 1811-1812):**
```typescript
// VIKTIGT: Sortera filer så att subprocess-filer genereras FÖRE parent-filer
// Detta säkerställer att child documentation finns tillgänglig när parent Feature Goals genereras
```

**Vad kommentaren säger:**
- ✅ Subprocess-filer ska genereras FÖRE parent-filer
- ✅ Syfte: Säkerställa att child documentation finns tillgänglig

**Vad implementeringen gör:**
- ✅ Subprocess-filer genereras FÖRE root-filer
- ❌ Men sorterar alfabetiskt → parent kan komma före subprocess om båda är subprocess-filer
- ❌ Använder INTE dependency-grafer för topologisk sortering

**Status:** ⚠️ Kommentaren beskriver INTENTIONEN, men implementeringen följer den inte helt

---

## Slutsats

### Vad Dokumentationen Säger:

1. **Kommentar i koden:**
   - ✅ Säger att subprocess-filer ska genereras FÖRE parent-filer
   - ✅ Säger att syftet är att säkerställa att child documentation finns tillgänglig
   - ⚠️ Nämner INTE dependency-grafer eller topologisk sortering
   - ⚠️ Beskriver INTENTIONEN, inte implementeringen

2. **Analys-dokument:**
   - ❌ Beskriver problemet, inte hur det fungerar
   - ❌ Rekommenderar topologisk sortering, men dokumenterar inte att det redan används

### Vad Implementeringen Gör:

1. **Identifierar subprocess-filer korrekt** ✅
2. **Separerar subprocess-filer från root-filer** ✅
3. **Subprocess-filer genereras FÖRE root-filer** ✅
4. **Men sorterar alfabetiskt** ❌
5. **Använder INTE dependency-grafer** ❌

---

## Svar på Användarens Fråga

**"Menar du verkligen att vi inte redan har dokumenterat att vi använder oss av dependency grafer för just detta ändamålet?"**

**Svar:** ❌ **Nej, vi har INTE dokumenterat att vi använder dependency-grafer för fil-sortering.**

**Vad vi HAR dokumenterat:**
- Kommentar i koden säger att subprocess-filer ska genereras FÖRE parent-filer
- Men kommentaren nämner INTE dependency-grafer eller topologisk sortering
- Kommentaren beskriver INTENTIONEN, inte implementeringen

**Vad vi HAR analyserat (idag):**
- Analys-dokument som beskriver problemet med alfabetisk sortering
- Analys-dokument som rekommenderar topologisk sortering
- Men detta är ANALYS, inte dokumentation av hur det fungerar

---

**"Eller är det så att vår implementering inte följer vår dokumentation?"**

**Svar:** ⚠️ **Delvis - implementeringen följer INTENTIONEN i kommentaren, men inte HELT.**

**Vad implementeringen gör korrekt:**
- ✅ Subprocess-filer genereras FÖRE root-filer (enligt kommentaren)
- ✅ Identifierar subprocess-filer korrekt

**Vad implementeringen gör FEL:**
- ❌ Sorterar alfabetiskt → parent kan komma före subprocess om båda är subprocess-filer
- ❌ Använder INTE dependency-grafer för topologisk sortering
- ❌ Följer INTE kommentarens syfte helt (child documentation kan saknas)

**Slutsats:**
- Implementeringen följer kommentarens INTENTION delvis
- Men implementeringen följer INTE kommentarens SYFTE helt (säkerställa att child documentation finns)
- Implementeringen använder INTE dependency-grafer (som inte nämns i kommentaren)

---

## Rekommendation

1. **Uppdatera kommentaren i koden** för att tydliggöra att topologisk sortering baserat på dependency-grafer ska användas
2. **Implementera topologisk sortering** baserat på `graph.allNodes` (som redan finns)
3. **Dokumentera** att dependency-grafer används för fil-sortering

