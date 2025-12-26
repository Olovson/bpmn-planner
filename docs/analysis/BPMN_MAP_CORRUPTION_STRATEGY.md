# Strategi för att hantera bpmn-map.json korruption

## Problem

1. **bpmn-map.json kan bli korrupt** när den genereras automatiskt:
   - `id`/`process_id` innehåller hela sökvägar istället för process-ID
   - `alias`/`description` är samma som filnamn istället för process-namn
   - `root_process` är null
   - `note` är missvisande

2. **Vi uppdaterar den befintliga filen** istället för att alltid skapa en ny
   - Detta kan leda till ackumulerad korruption
   - Dåliga värden sprids vidare

3. **Merge-funktionen hjälper** men löser inte allt:
   - Den normaliserar nya processer
   - Men om filen redan är korrupt, behöver vi en tydlig strategi

## Nuvarande System

### När filer laddas upp:
1. `analyzeAndSuggestMapUpdates()` laddar current map
2. Genererar suggestions baserat på filer
3. Accepterar high-confidence matchningar automatiskt
4. Uppdaterar den befintliga filen

### När filen laddas:
1. `loadBpmnMapFromStorage()` laddar från Storage
2. Mergar med projektfilen (source of truth)
3. Normaliserar nya processer från Storage

## Rekommenderad Strategi

### Alternativ 1: Alltid generera från scratch (Enklast)
**Princip**: När filer laddas upp, generera alltid en ny fil från scratch baserat på alla BPMN-filer.

**Fördelar**:
- ✅ Ingen risk för ackumulerad korruption
- ✅ Alltid ren och korrekt struktur
- ✅ Enkel logik

**Nackdelar**:
- ❌ Förlorar användarändringar (manuella justeringar)
- ❌ Kan ta längre tid (måste parsa alla filer)

### Alternativ 2: Validera och regenerera vid korruption (Balanserad)
**Princip**: 
- Validera kvalitet när filen laddas
- Om korrupt → använd projektfilen
- När suggestions sparas → regenerera från scratch om filen var korrupt

**Fördelar**:
- ✅ Behåller användarändringar om filen är OK
- ✅ Regenererar automatiskt vid korruption
- ✅ Balanserad approach

**Nackdelar**:
- ❌ Mer komplex logik
- ❌ Kräver kvalitetsvalidering

### Alternativ 3: Projektfilen som source of truth, Storage som cache (Säkrast)
**Princip**:
- Projektfilen är alltid source of truth
- Storage-filen är bara en cache för användarändringar
- Merge säkert: Ta struktur från projektfilen, behåll call_activities från Storage
- Om Storage är korrupt → ignorera den och använd bara projektfilen

**Fördelar**:
- ✅ Projektfilen är alltid ren (versionerad i Git)
- ✅ Användarändringar bevaras (call_activities)
- ✅ Ingen risk för korruption (projektfilen kan inte bli korrupt)

**Nackdelar**:
- ❌ Kräver att projektfilen hålls uppdaterad
- ❌ Nya filer måste läggas till i projektfilen manuellt (eller via suggestions)

## Rekommendation

**Använd Alternativ 3** (Projektfilen som source of truth) eftersom:
1. Det är redan implementerat (merge-funktionen)
2. Det är säkrast (projektfilen kan inte bli korrupt)
3. Det bevarar användarändringar (call_activities från Storage)
4. Det normaliserar automatiskt (merge-funktionen gör detta)

## Implementation Plan

1. ✅ **Merge-funktionen** - Redan implementerad
   - Tar struktur från projektfilen
   - Behåller call_activities från Storage
   - Normaliserar nya processer

2. ✅ **Kvalitetsvalidering** - Redan implementerad
   - Detekterar korruption
   - Använder projektfilen om Storage är korrupt

3. ⚠️ **Förbättring behövs**: När suggestions sparas
   - Om filen är korrupt → regenerera från scratch
   - Annars → uppdatera normalt

4. ⚠️ **Förbättring behövs**: Normalisering av befintliga processer
   - När filen laddas, normalisera även befintliga processer (inte bara nya)
   - Detta säkerställer att korruption inte sprids

## Tydlig Implementation Plan

### Steg 1: Förbättra merge-funktionen (PRIORITET 1)
**Vad**: Normalisera ALLA processer från Storage (inte bara nya)
**Var**: `src/lib/bpmn/bpmnMapStorage.ts` - `mergeBpmnMaps()`
**Hur**: 
- När vi tar call_activities från Storage, normalisera även id/alias/description om de är korrupta
- Använd projektfilens värden som fallback om Storage-värdena är korrupta

### Steg 2: Förbättra generateUpdatedBpmnMap (PRIORITET 2)
**Vad**: Normalisera befintliga processer när suggestions sparas
**Var**: `src/lib/bpmn/bpmnMapSuggestions.ts` - `generateUpdatedBpmnMap()`
**Hur**:
- När vi uppdaterar en process, normalisera id/alias/description om de är korrupta
- Använd process-ID från BPMN-meta, inte filnamn

### Steg 3: Testa (PRIORITET 3)
**Vad**: Verifiera att korrupt fil hanteras korrekt
**Hur**: 
- Skapa en korrupt test-fil
- Verifiera att den normaliseras korrekt
- Verifiera att merge-funktionen fungerar

## Status

- ✅ Merge-funktionen - Implementerad (normaliserar nya processer)
- ✅ Kvalitetsvalidering - Implementerad (detekterar korruption)
- ⚠️ Normalisering av befintliga processer - Delvis implementerad (behöver förbättras)
- ⚠️ Automatisk regenerering - Delvis implementerad (behöver testas)

