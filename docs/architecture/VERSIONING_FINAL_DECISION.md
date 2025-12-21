# Versionslösning - Slutgiltigt beslut

## Beslut: Bara BPMN-fil versionering

Efter analys har vi beslutat att **behålla bara BPMN-fil versionering** och inte implementera per-element artefakt-versionering.

### Anledningar

1. **Komplexitet vs värde**
   - Två-lagers versionering ger lite extra värde
   - Men ökar komplexiteten betydligt (UI, storage paths, kod)
   - ROI är låg

2. **Användningsfall täcks redan**
   - BPMN-versionering täcker 95% av användningsfallen
   - Node-docs overrides täcker behovet av manuella förbättringar

3. **Användarupplevelse**
   - Enklare UI = bättre UX
   - Mindre förvirring
   - Lättare att lära sig

4. **Underhåll**
   - Mindre kod = lättare att underhålla
   - Färre buggar
   - Snabbare utveckling

## Vad som är implementerat

### ✅ BPMN-fil versionering
- `bpmn_file_versions` tabell - spårar alla versioner av BPMN-filer
- Content-based hashing (SHA-256) för deduplicering
- Global version selector i UI
- Alla sidor respekterar vald BPMN-version
- Artefakter sparas med BPMN-version-hash i sökvägen

### ✅ Node-docs overrides
- Manuella förbättringar för specifika noder
- Sparas i `src/data/node-docs/`
- Mergas med LLM-genererad dokumentation

## Vad som är arkiverat

### 📦 Per-element artefakt-versionering
- `artifact_versions` tabell migration → `supabase/migrations/archived/`
- `artifactVersioning.ts` → `src/lib/archived/`
- Per-element version-hash parametrar i `buildDocStoragePaths` → borttagna

**Anledning:** För komplext för det värde det ger. Kan läggas till senare om behovet uppstår.

## Nästa steg - Förbättra BPMN-versionering

### 1. Versionshistorik-UI
- Skapa `/bpmn-versions/:fileName` sida
- Visa lista över alla versioner för en fil
- Visa metadata (datum, hash, change_summary)

### 2. Diff-visning
- Visa diff mellan BPMN-versioner
- Highlight ändringar i XML
- Visa vilka noder som ändrats/tillagts/tagits bort

### 3. Återställning
- Möjlighet att "återställa" till tidigare BPMN-version
- (Skapar ny version med samma innehåll som äldre version)

### 4. Artefakt-indikatorer
- Visa vilken BPMN-version artefakter genererades från
- Varning när artefakter är kopplade till äldre versioner
- Föreslå att regenerera artefakter när BPMN-version ändras

### 5. Förbättra node-docs overrides
- Bättre tooling för att skapa/redigera overrides
- UI för att se vilka noder som har overrides
- Tydligare dokumentation

## Storage-struktur (förenklad)

```
docs/
  {mode}/{provider}/{bpmnFileName}/{bpmnVersionHash}/{docFileName}  # BPMN-versionerad
  {docFileName}  # Legacy (backward compatibility)
```

**Ingen per-element versionering i paths** - mycket enklare!

## Referenser

- `docs/VERSIONING_COMPLEXITY_ANALYSIS.md` - Fullständig analys
- `docs/VERSIONING_TWO_LAYER_ARCHITECTURE.md` - Arkitektur (arkiverad)
- `docs/VERSIONING_IMPLEMENTATION_COMPLETE.md` - Implementeringsstatus

