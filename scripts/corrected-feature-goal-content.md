# Korrigerad Feature Goal Documentation (endast BPMN-faktisk information)

## Funktionellt flöde (korrigerad)

Baserat på BPMN-filen finns:
- DataStoreReference "Internal systems" (för fetch-party-information)
- DataStoreReference "Core System" (för fetch-engagements)
- TextAnnotation: "Fetch existing information: - id - other available personal information..."
- Gateway "is-approved" med "Yes/No" flows
- Business Rule Task "pre-screen-party"

**Korrigerade flowSteps (endast BPMN-faktisk information):**

1. Systemet startar automatiskt när ansökan är initierad och identifierar kunden i bankens interna system baserat på personnummer eller kundnummer.
2. Systemet hämtar partsinformation från Internal systems, inklusive id och annan tillgänglig personlig information (enligt TextAnnotation i BPMN-filen).
3. Systemet utför pre-screening av kunden via Business Rule Task "pre-screen-party".
4. Om pre-screening godkänns (Approved = Yes), hämtar systemet kundens befintliga engagemang från Core System.
5. Systemet sammanställer all hämtad data och gör den tillgänglig för efterföljande kreditbedömning.

**Vad jag TAR BORT (finns inte i BPMN-filen):**
- ❌ "folkbokföringsregister och kundregister" - finns inte i BPMN-filen
- ❌ "Valideringsmotor" - finns inte i BPMN-filen
- ❌ "UC-integration" - finns inte explicit i BPMN-filen (kan finnas i pre-screen-party, men det står inte där)
- ❌ Detaljerade beskrivningar av vad som hämtas från specifika system som inte nämns

---

## Beroenden (korrigerad)

**Korrigerade dependencies (endast BPMN-faktisk information):**

1. **Process: Ansökan måste vara initierad innan intern datainsamling kan starta.**
   - OK: Process-kontext är tillåten även om det inte står explicit i BPMN-filen

2. **System: Internal systems måste vara tillgängligt för att hämta partsinformation.**
   - ✅ RÄTT: DataStoreReference "Internal systems" finns i BPMN-filen

3. **System: Core System måste vara tillgängligt för att hämta engagemang.**
   - ✅ RÄTT: DataStoreReference "Core System" finns i BPMN-filen

**Vad jag TAR BORT (finns inte i BPMN-filen):**
- ❌ "System: Interna kunddatabaser måste vara tillgängliga. Systemet behöver tillgång till folkbokföringsregister och kundregister" - dessa system finns inte i BPMN-filen
- ❌ "System: UC-integration (Upplysningscentralen) måste vara tillgänglig" - finns inte i BPMN-filen
- ❌ "System: Valideringsmotor måste vara tillgänglig" - finns inte i BPMN-filen
- ❌ "Data: Personnummer eller kundnummer måste vara tillgängligt" - kan vara OK som process-kontext, men inte som specifik dependency

---

## Jämförelse: Min version vs Korrigerad version

### FlowSteps

**Min version (FEL - hittar på system):**
- "Systemet utför pre-screening av kunden baserat på grundläggande uppgifter från folkbokföringsregister och kundregister" ❌

**Korrigerad version (RÄTT - endast BPMN-faktisk information):**
- "Systemet utför pre-screening av kunden via Business Rule Task 'pre-screen-party'" ✅

### Dependencies

**Min version (FEL - hittar på system):**
- "System: Interna kunddatabaser måste vara tillgängliga. Systemet behöver tillgång till folkbokföringsregister och kundregister" ❌
- "System: UC-integration (Upplysningscentralen) måste vara tillgänglig" ❌
- "System: Valideringsmotor måste vara tillgänglig" ❌

**Korrigerad version (RÄTT - endast BPMN-faktisk information):**
- "System: Internal systems måste vara tillgängligt för att hämta partsinformation" ✅
- "System: Core System måste vara tillgängligt för att hämta engagemang" ✅

---

## Slutsats

**Problemet:** Både jag och Claude hittar på system som inte finns i BPMN-filen.

**Lösningen:** Prompten är nu uppdaterad med tydliga instruktioner om att endast använda BPMN-faktisk information, med konkreta exempel på FEL vs RÄTT.

**Förväntat resultat:** När dokumentationen regenereras bör Claude:
- ✅ Använda "Internal systems" och "Core System" (som faktiskt finns)
- ✅ INTE hitta på "folkbokföringsregister", "kundregister", "Valideringsmotor", "UC-integration" (som inte finns)
- ✅ Beskriva Business Rule Tasks generiskt (t.ex. "Systemet utför pre-screening") utan att hitta på specifika system


