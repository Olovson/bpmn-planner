# PERMANENT REGEL: Analysera Lanes i BPMN-filer

**⚠️ DETTA ÄR EN PERMANENT REGEL SOM ALDRIG FÅR GLÖMMAS**

## Problemet

**Vi har haft kvalitetsproblem där aktiviteter felaktigt klassificerats:**
- Household-processen klassificerades som "handläggaraktivitet" när den faktiskt är en "kundaktivitet" (Stakeholder lane)
- Detta skedde eftersom lanes inte analyserades systematisk

## Lösningen

**FÖR VARJE FEATURE GOAL, MÅSTE du:**

1. **Analysera lanes i BPMN-filen:**
   - Sök efter `<bpmn:lane` element i BPMN-filen
   - Identifiera vilka lanes som finns (t.ex. "Stakeholder", "Caseworker", "System")
   - Identifiera vilka aktiviteter som ligger i vilken lane

2. **Identifiera huvudaktiviteten:**
   - Vilken är huvudaktiviteten i processen? (t.ex. user task, service task)
   - I vilken lane ligger huvudaktiviteten?

3. **Klassificera processen korrekt:**
   - **Kundaktivitet/Stakeholder-aktivitet:** Om huvudaktiviteten ligger i "Stakeholder", "Customer", "Primary stakeholder" lane
   - **Handläggaraktivitet:** Om huvudaktiviteten ligger i "Caseworker", "Handläggare", "Compliance" lane
   - **Systemaktivitet:** Om huvudaktiviteten ligger i "System" lane eller är en service task/business rule task

4. **Använd korrekt terminologi i beskrivningen:**
   - **Kundaktivitet:** "Household är en kundaktivitet där stakeholder..."
   - **Handläggaraktivitet:** "Documentation assessment är en handläggaraktivitet där handläggare..."
   - **Systemaktivitet:** "Credit evaluation är en automatiserad process där systemet..."

## Exempel

### Household (Kundaktivitet)
**BPMN-analys:**
- Lane: "Stakeholder" (rad 21: `<bpmn:lane id="Lane_0h605mo" name="Stakeholder">`)
- Huvudaktivitet: "register-household-economy-information" (user task i Stakeholder lane)
- **Klassificering:** Kundaktivitet

**Korrekt beskrivning:**
> "Household är en kundaktivitet där stakeholder (t.ex. kund eller medsökande) registrerar hushållsekonomiinformation för sitt hushåll."

### Documentation Assessment (Handläggaraktivitet)
**BPMN-analys:**
- Lane: "Case worker" (t.ex. `<bpmn:lane name="Case worker">`)
- Huvudaktivitet: "assess-documentation" (user task i Case worker lane)
- **Klassificering:** Handläggaraktivitet

**Korrekt beskrivning:**
> "Documentation assessment är en handläggaraktivitet där handläggare bedömer och validerar uppladdad dokumentation..."

## Checklista

**För varje feature goal, kontrollera:**

- [ ] Har jag analyserat lanes i BPMN-filen?
- [ ] Har jag identifierat vilken lane huvudaktiviteten ligger i?
- [ ] Har jag klassificerat processen korrekt (kundaktivitet/handläggaraktivitet/systemaktivitet)?
- [ ] Använder jag korrekt terminologi i beskrivningen?
- [ ] Matchar beskrivningen med BPMN-filens lanes?

**Om något på listan inte är klart - FIXA DET INNAN DU GÅR VIDARE.**

## Varför detta är viktigt

- **Korrekt klassificering:** Användare behöver förstå vem som utför aktiviteten
- **Kvalitet:** Felaktig klassificering gör dokumentationen förvirrande
- **Konsekvens:** Alla feature goals ska klassificeras på samma sätt

## Hur säkerställer vi att detta aldrig glöms?

1. **PERMANENT regel i AUTO_IMPROVEMENT_EXECUTION_PLAN.md**
2. **Checklista:** Kvalitetschecklistan inkluderar lane-analys
3. **Tydlig dokumentation:** Detta dokument förklarar exakt hur lanes ska analyseras

**⚠️ LÄS DETTA VARJE GÅNG INNAN DU BÖRJAR FÖRBÄTTRA HTML-INNEHÅLL!**

