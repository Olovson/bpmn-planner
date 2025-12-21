# Analys: Två-lagers versionering vs BPMN-fil versionering

## Nuvarande situation

### Vad som redan fungerar
- ✅ BPMN-fil versionering är implementerad och fungerar
- ✅ Användaren kan välja BPMN-fil version globalt
- ✅ Alla sidor respekterar vald BPMN-version
- ✅ Node-docs overrides finns redan för manuella förbättringar

### Vad som saknas för två-lagers versionering
- ⏳ Per-element artefakt-versionering (tabell skapad men inte integrerad)
- ⏳ UI för att välja artefakt-version per element
- ⏳ Storage paths med per-element version-hash
- ⏳ Versionshistorik-UI för artefakter

## Analys: Två-lagers versionering

### Fördelar

1. **Flexibilitet**
   - Kan regenerera specifik nod utan att påverka andra
   - Kan ha flera versioner av dokumentation för samma nod

2. **Historik**
   - Fullständig historik per element
   - Kan se alla versioner av dokumentation för en nod

3. **Spårbarhet**
   - Vet exakt vilken BPMN-version som användes för varje artefakt-version

### Nackdelar/Komplexitet

#### 1. UI-komplexitet
**Problem:**
- Användaren måste välja **två** versioner:
  - BPMN-fil version (redan implementerat)
  - Artefakt-version per element (ny)
- I DocViewer måste användaren:
  - Välja BPMN-version (globalt, redan finns)
  - Välja artefakt-version för just denna nod (ny UI)
- Risk för förvirring: "Vilken version ska jag använda?"

**Exempel scenario:**
```
Användaren öppnar dokumentation för "Object-information":
- BPMN-version: 3 (vald globalt)
- Artefakt-version: ? (måste väljas)
  - Version 1 (genererad från BPMN v1)
  - Version 2 (genererad från BPMN v2)
  - Version 3 (genererad från BPMN v1, manuellt regenererad)
```

**Frågor:**
- Vilken artefakt-version ska visas som default?
- Vad händer om BPMN-version 3 inte har någon artefakt-version?
- Hur förklarar vi för användaren vilken de ska välja?

#### 2. Storage path-komplexitet
**Nuvarande:**
```
docs/slow/chatgpt/application.bpmn/{bpmnVersionHash}/application-Object-information-v2.html
```

**Med per-element versionering:**
```
docs/slow/chatgpt/application.bpmn/{bpmnVersionHash}/{elementId}/{artifactVersionHash}/application-Object-information-v2.html
```

**Problem:**
- Längre paths = mer komplex path-resolution
- Fler fallback-paths att testa i DocViewer
- Svårare att debugga när filer inte hittas

#### 3. Användningsfall - är det verkligen nödvändigt?

**Vanliga användningsfall:**
1. ✅ Användaren laddar upp ny BPMN-version → genererar all dokumentation → använder ny version
2. ✅ Användaren vill förbättra dokumentation för en specifik nod → använder node-docs overrides (redan implementerat)

**Mindre vanliga användningsfall:**
3. ❓ Användaren vill regenerera en nod utan att uppdatera BPMN-filen
   - **Fråga**: Varför skulle man vilja detta?
   - **Svar**: Kanske om LLM-genereringen misslyckades eller gav dåligt resultat
   - **Alternativ**: Använd node-docs overrides istället

4. ❓ Användaren vill ha flera versioner av dokumentation för samma nod
   - **Fråga**: Varför skulle man vilja detta?
   - **Svar**: Kanske för att jämföra olika LLM-genereringar?
   - **Alternativ**: Använd node-docs overrides och spara olika versioner manuellt

#### 4. Inkonsistens-risk

**Problem:**
- Artefakt-version 3 kan vara genererad från BPMN-version 1
- Men användaren arbetar med BPMN-version 3
- Dokumentationen kan vara inkonsistent med nuvarande BPMN-struktur

**Exempel:**
```
BPMN v3: "Object-information" har nya fält
Artefakt v3: Genererad från BPMN v1, saknar nya fälten
Användaren väljer BPMN v3 + Artefakt v3 → Inkonsistent!
```

#### 5. Underhållskomplexitet

**Kod:**
- Mer kod att underhålla
- Mer edge cases att hantera
- Svårare att testa

**UI:**
- Mer UI-komponenter
- Mer state att hantera
- Mer buggar att fixa

**Dokumentation:**
- Svårare att förklara för användare
- Mer support-frågor

## Analys: Bara BPMN-fil versionering

### Fördelar

1. **Enkelhet**
   - En version per BPMN-fil
   - Tydligt: "Jag arbetar med version 2 av application.bpmn"
   - Lätt att förklara

2. **Konsistens**
   - Alla artefakter är alltid kopplade till en BPMN-version
   - Ingen risk för inkonsistens

3. **Mindre komplexitet**
   - Enklare UI (bara BPMN-version selector)
   - Enklare storage paths
   - Enklare kod

4. **Redan fungerar**
   - BPMN-versionering är implementerad
   - Node-docs overrides finns för manuella förbättringar

### Nackdelar

1. **Mindre flexibilitet**
   - Kan inte regenerera en nod utan att generera allt
   - **Men**: Node-docs overrides löser detta problem

2. **Ingen per-element historik**
   - Kan inte se alla versioner av en specifik nod
   - **Men**: Är detta verkligen nödvändigt?

## Rekommendation

### ✅ Rekommenderad lösning: Bara BPMN-fil versionering

**Anledningar:**

1. **Användningsfall täcks redan**
   - BPMN-versionering täcker 95% av användningsfallen
   - Node-docs overrides täcker behovet av manuella förbättringar

2. **Komplexitet vs värde**
   - Två-lagers versionering ger lite extra värde
   - Men ökar komplexiteten betydligt
   - ROI är låg

3. **Användarupplevelse**
   - Enklare UI = bättre UX
   - Mindre förvirring
   - Lättare att lära sig

4. **Underhåll**
   - Mindre kod = lättare att underhålla
   - Färre buggar
   - Snabbare utveckling

### Vad som behövs istället

1. **Förbättra node-docs overrides**
   - Tydligare dokumentation
   - Bättre tooling för att skapa/redigera overrides
   - UI för att se vilka noder som har overrides

2. **Förbättra BPMN-versionering**
   - Versionshistorik-UI (bara för BPMN-filer)
   - Diff-visning mellan BPMN-versioner
   - Möjlighet att "återställa" till tidigare BPMN-version

3. **Förbättra artefakt-generering**
   - Bättre feedback när generering misslyckas
   - Möjlighet att regenerera specifik nod (skapar ny BPMN-version om nödvändigt)
   - Tydligare indikatorer på vilken BPMN-version artefakter genererades från

## Slutsats

**Två-lagers versionering är för komplext för det värde det ger.**

**Rekommendation:**
- Behåll bara BPMN-fil versionering
- Förbättra node-docs overrides för manuella förbättringar
- Fokusera på att göra BPMN-versionering bättre (historik, diff, etc.)

**Om två-lagers versionering behövs i framtiden:**
- Kan läggas till senare när behovet är tydligare
- Men just nu är komplexiteten inte värd det

