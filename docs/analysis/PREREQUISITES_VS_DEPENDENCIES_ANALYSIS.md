# Analys: Prerequisites vs Dependencies i Feature Goals

**Datum:** 2025-12-28

## Översikt

Feature Goals har både `prerequisites` (Förutsättningar) och `dependencies` (Beroenden). Denna analys undersöker om dessa ger värde eller om de kan konsolideras som vi gjorde för Epics.

---

## 1. Vad Säger Prompten?

### Prerequisites (Förutsättningar)

**Syfte:**
> "Lista viktiga förutsättningar innan Feature Goalet kan starta."

**Innehåll:**
- **Minst 2–3 strängar** (helst 3), varje en full mening om:
  - data, kontroller eller beslut som måste vara uppfyllda,
  - vilken föregående process eller regel som måste ha körts,
  - system- eller datakrav som måste vara uppfyllda.
- Använd `currentNodeContext.flows.incoming` för att förstå vad som måste ha körts innan Feature Goalet.
- Använd affärsspråk (t.ex. "Ansökan måste vara komplett" istället för "UserTask måste vara klar").

**Format:**
- Enkla strängar, full mening
- Exempel:
  - "Triggas normalt efter att en kreditansökan har registrerats i systemet."
  - "Förutsätter att grundläggande kund- och ansökningsdata är validerade."
  - "Eventuella föregående KYC/AML- och identitetskontroller ska vara godkända."

**Status:** ⚠️ **OBLIGATORISKT FÄLT** - Måste alltid inkluderas!

---

### Dependencies (Beroenden)

**Syfte:**
> "Lista centrala beroenden för att Feature Goalet ska fungera."

**Innehåll:**
- **3–6 strängar**, varje sträng i EXAKT mönstret:
  ```
  Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>.
  ```
- **VIKTIGT**: Dependencies inkluderar både process-kontext (vad måste vara klart före) och tekniska system (vad behövs för att köra).

**Format:**
- Strukturerat format med typ, ID och beskrivning
- Exempel:
  - `"Beroende: Regelmotor/DMN; Id: kreditvärdighetsbedömning; Beskrivning: används för att fatta preliminära och slutliga kreditbeslut."`
  - `"Beroende: Kunddatabas; Id: customer-data; Beskrivning: tillhandahåller kund- och engagemangsdata för riskbedömning."`
  - `"Beroende: Process; Id: application; Beskrivning: Ansökningsprocessen måste vara slutförd med komplett kund- och ansökningsdata."`

**Status:** ⚠️ **OBLIGATORISKT FÄLT** - Måste alltid inkluderas!

---

## 2. Skillnader i Praktiken

### Prerequisites (Förutsättningar)
- **Fokus:** Process-kontext - vad måste ha hänt FÖRE Feature Goalet startar
- **Format:** Enkla meningar, affärsspråk
- **Exempel:**
  - "Triggas normalt efter att en kreditansökan har registrerats i systemet."
  - "Förutsätter att grundläggande kund- och ansökningsdata är validerade."
  - "Eventuella föregående KYC/AML- och identitetskontroller ska vara godkända."

### Dependencies (Beroenden)
- **Fokus:** Både process-kontext OCH tekniska system - vad behövs för att Feature Goalet ska fungera
- **Format:** Strukturerat med typ, ID och beskrivning
- **Exempel:**
  - `"Beroende: Process; Id: application; Beskrivning: Ansökningsprocessen måste vara slutförd med komplett kund- och ansökningsdata."`
  - `"Beroende: Regelmotor/DMN; Id: kreditvärdighetsbedömning; Beskrivning: används för att fatta preliminära och slutliga kreditbeslut."`
  - `"Beroende: Kunddatabas; Id: customer-data; Beskrivning: tillhandahåller kund- och engagemangsdata för riskbedömning."`

---

## 3. Överlappning

### Problem: Överlappning mellan Prerequisites och Dependencies

**Exempel från prompten:**

**Prerequisites:**
- "Triggas normalt efter att en kreditansökan har registrerats i systemet."
- "Förutsätter att grundläggande kund- och ansökningsdata är validerade."

**Dependencies:**
- `"Beroende: Process; Id: application; Beskrivning: Ansökningsprocessen måste vara slutförd med komplett kund- och ansökningsdata."`

**Analys:**
- Båda beskriver att "ansökan måste vara klar"
- Prerequisites: "Triggas normalt efter att en kreditansökan har registrerats"
- Dependencies: "Ansökningsprocessen måste vara slutförd"

**Detta är samma information, men i olika format!**

---

## 4. Jämförelse med Epic

### Epic (Efter Konsolidering)

**Struktur:**
- `dependencies` (optional) - inkluderar både process-kontext och tekniska system
- Format: `"Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>."`
- Exempel:
  - `"Beroende: Process; Id: application-initiation; Beskrivning: En ny kreditansökan måste ha initierats i systemet."`
  - `"Beroende: Kunddatabas; Id: customer-registry; Beskrivning: tillhandahåller grundläggande kundinformation för att förifylla formulärfält."`

**Status:** ✅ **Konsoliderat** - endast `dependencies`, inga `prerequisites`

---

## 5. Argument FÖR att Behålla Båda

### Argument 1: Olika Abstraktionsnivåer
- **Prerequisites:** Högnivå, affärsorienterat - "vad måste ha hänt"
- **Dependencies:** Detaljerat, strukturerat - "vad behövs för att köra"

**Motargument:**
- Dependencies kan inkludera process-kontext (enligt prompten: "Dependencies inkluderar både process-kontext och tekniska system")
- Dependencies-formatet är mer strukturerat och kan hantera både process och tekniska system

### Argument 2: Olika Format
- **Prerequisites:** Enkla meningar, lättlästa
- **Dependencies:** Strukturerat format med typ, ID och beskrivning

**Motargument:**
- Dependencies-formatet är mer strukturerat och kan hantera både process och tekniska system
- Prerequisites kan konverteras till dependencies-formatet

### Argument 3: Olika Syften
- **Prerequisites:** "Vad måste ha hänt FÖRE"
- **Dependencies:** "Vad behövs för att köra"

**Motargument:**
- Dependencies inkluderar process-kontext (enligt prompten)
- Process-kontext i dependencies = prerequisites

---

## 6. Argument MOT att Behålla Båda

### Argument 1: Överlappning
- Båda beskriver process-kontext (vad måste vara klart före)
- Exempel: "Ansökan måste vara klar" finns i båda

### Argument 2: Förvirring
- Användare kan bli förvirrade över skillnaden
- Claude kan generera duplicerad information

### Argument 3: Konsistens
- Epic använder endast `dependencies` (efter konsolidering)
- Feature Goal använder både `prerequisites` och `dependencies`
- Inkonsekvent mellan Epic och Feature Goal

### Argument 4: Dependencies-formatet är Mer Strukturerat
- Dependencies har strukturerat format med typ, ID och beskrivning
- Kan hantera både process-kontext och tekniska system
- Mer maskinläsbart och strukturerat

---

## 7. Vad Hände med Epic?

### Före Konsolidering
- Epic hade `prerequisites` och `dependencies`
- Konsoliderade till endast `dependencies`

### Efter Konsolidering
- Epic har endast `dependencies` (optional)
- Dependencies inkluderar både process-kontext och tekniska system
- Format: `"Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>."`

**Resultat:** ✅ Fungerar bra - dependencies kan hantera både process-kontext och tekniska system

---

## 8. Rekommendation

### ✅ Konsolidera till Endast Dependencies

**Anledningar:**

1. **Överlappning:** Båda beskriver process-kontext (vad måste vara klart före)
2. **Konsistens:** Epic använder endast `dependencies` - Feature Goal bör göra samma sak
3. **Struktur:** Dependencies-formatet är mer strukturerat och maskinläsbart
4. **Flexibilitet:** Dependencies kan hantera både process-kontext och tekniska system
5. **Förenkling:** Färre fält = enklare för Claude att generera korrekt

**Implementation:**
- Ta bort `prerequisites` från `FeatureGoalDocModel`
- Uppdatera prompten att endast använda `dependencies`
- Uppdatera validering att inte kolla `prerequisites`
- Uppdatera HTML-rendering att endast visa `dependencies`

**Format för Dependencies:**
- Process-kontext: `"Beroende: Process; Id: application; Beskrivning: Ansökningsprocessen måste vara slutförd med komplett kund- och ansökningsdata."`
- Tekniska system: `"Beroende: Regelmotor/DMN; Id: kreditvärdighetsbedömning; Beskrivning: används för att fatta preliminära och slutliga kreditbeslut."`

---

## 9. Riskanalys

### Risk: Förlorar Information
- **Risk:** Process-kontext kan försvinna om dependencies inte fylls i korrekt
- **Mitigering:** Prompten specificerar tydligt att dependencies inkluderar process-kontext
- **Sannolikhet:** Låg (dependencies-formatet är tydligt och strukturerat)

### Risk: Claude Genererar Mindre Information
- **Risk:** Claude kan generera färre dependencies än prerequisites + dependencies
- **Mitigering:** Prompten specificerar 3-6 dependencies (samma som tidigare total)
- **Sannolikhet:** Låg (dependencies-formatet är tydligt och strukturerat)

### Risk: Breaking Changes
- **Risk:** Befintlig dokumentation använder prerequisites
- **Mitigering:** All dokumentation kommer regenereras (enligt användaren)
- **Sannolikhet:** Ingen (dokumentation regenereras)

---

## 10. Slutsats

**Rekommendation:** ✅ **Konsolidera till Endast Dependencies**

**Anledningar:**
1. ✅ Överlappning mellan prerequisites och dependencies
2. ✅ Konsistens med Epic (som redan konsoliderat)
3. ✅ Dependencies-formatet är mer strukturerat och flexibelt
4. ✅ Förenkling - färre fält = enklare för Claude
5. ✅ Dependencies kan hantera både process-kontext och tekniska system

**Risks:** Låg risk - dependencies-formatet är tydligt och strukturerat, och kan hantera både process-kontext och tekniska system.

**Implementation:**
- Ta bort `prerequisites` från `FeatureGoalDocModel`
- Uppdatera prompten att endast använda `dependencies`
- Uppdatera validering och HTML-rendering

