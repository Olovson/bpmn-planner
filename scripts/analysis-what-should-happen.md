# Analys: Vad Ska Faktiskt Hända?

## Problem
Användaren går till `/doc-viewer/mortgage-se-internal-data-gathering` och ser:
- Bara ackumulerad Epic-information (file-level documentation)
- INTE Feature Goal-struktur med summary, flowSteps, userStories, dependencies

## Nuvarande System (Enligt Dokumentation)

### För `mortgage-se-internal-data-gathering.bpmn` (subprocess-fil utan callActivities):

**Genereras:**
1. ✅ Epic-dokumentation för varje task (fetch-party-information, pre-screen-party, fetch-engagements)
2. ✅ File-level documentation: `mortgage-se-internal-data-gathering.html`
   - Innehåll: Combined Epic-dokumentation (combinedBody)
   - INTE Feature Goal-struktur

**Genereras INTE:**
- ❌ Process Feature Goal (ersatt av file-level documentation)
- ❌ CallActivity Feature Goal (ingen callActivity i filen)

### File-Level Documentation Syfte (Enligt Kod)
- "Samla all dokumentation för alla noder i en fil"
- "Enkel combined documentation (ingen Feature Goal-struktur)"
- "Ersätter Process Feature Goals för subprocesser"

## Vad Användaren Förväntar Sig

När användaren går till `/doc-viewer/mortgage-se-internal-data-gathering` förväntar de sig:
- Feature Goal-struktur med:
  - Summary
  - Ingående komponenter
  - Funktionellt flöde (flowSteps)
  - Beroenden (dependencies)
  - User Stories

## Möjliga Lösningar

### Lösning 1: Återställ Process Feature Goals
- Generera Process Feature Goals för subprocess-filer (utan callActivities)
- Behåll file-level documentation som separat (för E2E-scenarier)
- Process Feature Goal: `feature-goals/mortgage-se-internal-data-gathering.html`
- File-level doc: `mortgage-se-internal-data-gathering.html`

**Fördelar:**
- Användaren får Feature Goal-struktur
- Matchar historisk design

**Nackdelar:**
- Två separata dokumentationer för samma fil
- Process Feature Goals togs bort av en anledning

### Lösning 2: File-Level Docs med Feature Goal-struktur
- Behåll file-level documentation som primär dokumentation
- Men använd Feature Goal-mallen för att rendera den
- En dokumentation med Feature Goal-struktur

**Fördelar:**
- En dokumentation per fil
- Användaren får Feature Goal-struktur

**Nackdelar:**
- Strider mot nuvarande design (file-level docs ska vara "enkel combined documentation")
- Kan förvirra skillnaden mellan Feature Goals och file-level docs

### Lösning 3: Process Feature Goals för Subprocess-filer
- Generera Process Feature Goals för subprocess-filer (utan callActivities)
- Ta bort file-level documentation för subprocess-filer
- Behåll file-level documentation för root-filer

**Fördelar:**
- Tydlig separation: Feature Goals för processer, file-level docs för root
- Användaren får Feature Goal-struktur

**Nackdelar:**
- File-level docs används av E2E-scenariogenerering (behöver JSON-data)

## Rekommendation

**Lösning 3 med modifiering:**
- Generera Process Feature Goals för subprocess-filer (utan callActivities)
- Behåll file-level documentation men gör den minimal (bara JSON-data för E2E)
- Process Feature Goal är primär dokumentation för subprocess-filer
- File-level doc är bara för E2E-scenarier (kan vara minimal)

ELLER

**Lösning 2 (min ändring var rätt riktning, men fel implementation):**
- File-level docs ska ha Feature Goal-struktur för subprocess-filer
- Men behåll file-level docs som "enkel combined" för root-filer
- Uppdatera dokumentationen för att reflektera detta

## Frågor till Användaren

1. Vill du ha Process Feature Goals tillbaka för subprocess-filer?
2. Eller vill du att file-level docs ska ha Feature Goal-struktur?
3. Vad är skillnaden mellan Feature Goals och file-level docs i din vision?


