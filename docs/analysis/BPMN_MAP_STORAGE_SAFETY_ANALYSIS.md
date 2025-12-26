# Analys: Säker hantering av bpmn-map.json i Storage

## Problem

Storage-filen (`bpmn-files/bpmn-map.json`) kan innehålla:
- Test-filer som inte längre finns i databasen
- Korrupta eller ogiltiga processer
- Duplicerade processer
- Processer med felaktiga mappstrukturer

Om vi automatiskt rensar och skriver över Storage-filen riskerar vi:
- **Dataförlust**: Ta bort fungerande processer
- **Korruption**: Skriva över med en felaktig version
- **Ingen backup**: Ingen möjlighet att återställa

## Nuvarande System

### Source of Truth
- **Projektfilen** (`bpmn-map.json` i root) är source of truth
- Den innehåller ~23 produktionsprocesser (ingen test-filer)
- Den är versionerad i Git

### Storage-filen
- Uppdateras när användaren sparar i appen
- Kan innehålla test-filer (från automatisk generering)
- Används som primär källa när den finns

### Laddningsordning
1. Försök ladda från Storage
2. Om Storage saknas → skapa från projektfilen
3. Om Storage är korrupt → fallback till projektfilen

## Rekommenderad Lösning

### Strategi 1: Projektfilen som Source of Truth (Rekommenderad)

**Princip**: Projektfilen är alltid source of truth. Storage-filen är bara en cache.

**Fördelar**:
- Säker: Projektfilen är versionerad och kontrollerad
- Enkel: Ingen risk för dataförlust
- Förutsägbar: Alltid samma resultat

**Implementation**:
1. Ladda alltid från projektfilen först
2. Merge Storage-filens ändringar (om den finns och är giltig)
3. Filtrera bort test-filer från merged resultat
4. Använd merged resultat för analys

### Strategi 2: Backup + Validering (Alternativ)

**Princip**: Skapa backup innan ändringar, validera efter ändringar.

**Fördelar**:
- Behåller Storage som primär källa
- Ger möjlighet att återställa

**Nackdelar**:
- Mer komplex
- Kräver backup-hantering
- Risk för att backup också blir korrupt

### Strategi 3: Hybrid (Bästa av båda)

**Princip**: 
- Projektfilen = source of truth för produktionsprocesser
- Storage-filen = cache för användarändringar
- Merge dem säkert

**Implementation**:
1. Ladda projektfilen (source of truth)
2. Ladda Storage-filen (användarändringar)
3. Merge säkert:
   - Ta produktionsprocesser från projektfilen
   - Ta användarändringar från Storage (validerade)
   - Filtrera bort test-filer
4. Använd merged resultat

## Rekommendation

**Använd Strategi 3 (Hybrid)** eftersom:
- Projektfilen garanterar kvalitet
- Storage-filen tillåter användarändringar
- Merge-processen är säker och förutsägbar
- Test-filer filtreras bort automatiskt

## Implementation Plan

1. ✅ **Skapa merge-funktion** som säkert kombinerar projektfil + Storage
2. ✅ **Validera Storage-filen** innan merge
3. ✅ **Filtrera test-filer** från båda källor (processer OCH call_activities)
4. ✅ **Logga vad som händer** för transparens
5. ✅ **Tester startar med tom map** - skapar sin egen test-version från scratch

## Implementerad Lösning

### Produktion (bpmnMapStorage.ts)

1. **Merge-funktion** (`mergeBpmnMaps`):
   - Tar produktionsprocesser från projektfilen (source of truth)
   - Tar användarändringar (call_activities) från Storage
   - Filtrerar bort test-filer från Storage INNAN merge
   - Filtrerar bort test-filer även från call_activities

2. **Säker laddning**:
   - Laddar projektfilen (source of truth)
   - Laddar Storage-filen (användarändringar)
   - Mergar dem säkert
   - Rensar bort test-filer automatiskt
   - Skriver INTE över Storage automatiskt (säkrare)

### Tester (bpmnMapTestHelper.ts)

1. **Startar med tom map**:
   - Tester startar ALLTID med en tom map
   - Skapar sin egen test-version när test-filer laddas upp
   - Förhindrar att test-filer blandas med produktionsprocesser

2. **Mockning**:
   - Alla Storage-anrop mockas
   - Test-versionen sparas bara i minnet
   - Inga skrivningar går till produktionsfilen

## Resultat

- ✅ **Säker**: Projektfilen är alltid source of truth
- ✅ **Behåller användarändringar**: call_activities från Storage bevaras
- ✅ **Ingen dataförlust**: Skriver inte över Storage automatiskt
- ✅ **Automatisk rensning**: Test-filer filtreras bort
- ✅ **Test-isolering**: Tester startar med tom map och skapar sin egen version

