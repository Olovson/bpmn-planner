# Prompt: Förbättra User Stories för Feature Goal

## Syfte
Systematiskt förbättra user stories i en feature goal HTML-fil genom att:
1. **Analysera** befintliga user stories mot BPMN-processen
2. **Identifiera** saknade, onödiga eller irrelevanta user stories
3. **Förbättra** befintliga user stories (specifika, relevanta, strukturerade)
4. **Lägga till** nya user stories där det behövs
5. **Ta bort** user stories som inte är relevanta

---

## Steg 1: Analysera BPMN-processen

### 1.1 Läs BPMN-filen
- Identifiera BPMN-filen från HTML-filens metadata eller `bpmn-map.json`
- Läs BPMN-filen för att förstå hela processflödet

### 1.2 Identifiera kritiska element
Dokumentera följande från BPMN:
- **User tasks**: Kund- eller handläggarinteraktioner
  - Vilka personor interagerar? (kund, handläggare, värderare)
  - Vad gör de? (ladda upp dokument, bekräfta ansökan, värdera objekt)
- **Service tasks**: Systemanrop och externa tjänster
  - Vad gör systemet automatiskt?
  - Vilka externa tjänster anropas?
- **Business rule tasks (DMN)**: Beslutslogik och affärsregler
  - Vilka beslut fattas?
  - Vilka kriterier används?
- **Gateways**: Beslutspunkter
  - Vilka val görs?
  - Vilka personor påverkas?
- **Call activities**: Anrop till subprocesser
  - Vilka subprocesser anropas?
  - Vilka personor påverkas?
- **Boundary events**: Error events, timer events, escalation events
  - Vilka personor påverkas av fel/timeout?
- **Multi-instance loops**: Parallella eller sekventiella loopar
  - Vilka personor påverkas av multi-instance?

### 1.3 Identifiera personor
För varje BPMN-element, identifiera:
- **Vem interagerar?** (kund, handläggare, värderare, system)
- **Vad behöver de?** (information, funktionalitet, feedback)
- **Varför behöver de det?** (värde, affärsnytta)

---

## Steg 2: Analysera Befintliga User Stories

### 2.1 Läs befintliga user stories
- Läs alla user stories i HTML-filen
- Förstå vad varje user story täcker

### 2.2 Validera mot BPMN
För varje befintlig user story, kontrollera:
- ✅ **Täcker user story rätt BPMN-element?** (user task, service task, gateway, event)
- ✅ **Är persona korrekt?** (matchar BPMN lane eller task-assignment)
- ✅ **Är user story relevant?** (ger verkligen värde för personan?)
- ✅ **Saknas viktiga detaljer?** (BPMN-ID:n, acceptanskriterier, tekniska referenser)

### 2.3 Identifiera brister
Dokumentera:
- **Saknade user stories**: Vilka BPMN-element/personor saknas?
- **Onödiga user stories**: Vilka user stories är duplicerade eller irrelevanta?
- **Ofullständiga user stories**: Vilka user stories saknar viktiga detaljer?
- **För generiska user stories**: Vilka user stories är för generiska?

---

## Steg 3: Identifiera Saknade User Stories

### 3.1 Per BPMN-element
För varje viktigt BPMN-element, skapa minst en user story:
- **User tasks**: Minst en user story per task (från rätt persona)
- **Service tasks**: Minst en user story per task (systemperspektiv)
- **Business rule tasks**: Minst en user story per task (systemperspektiv)
- **Gateways**: Minst en user story per utgående flöde (från rätt persona)
- **Call activities**: Minst en user story per call activity (systemperspektiv)
- **Boundary events**: Minst en user story per boundary event (om relevant)

### 3.2 Per persona
För varje persona som interagerar med processen:
- **Kund/Stakeholder**: User stories för kundinteraktioner
- **Handläggare/Caseworker**: User stories för handläggarinteraktioner
- **Värderare/Valuator**: User stories för värderarinteraktioner
- **System/Systemadministratör**: User stories för automatiserade processer

### 3.3 Per flöde
För varje viktigt flöde:
- **Happy path**: User stories för normalflöde
- **Error paths**: User stories för felhantering (om relevant)
- **Alternative paths**: User stories för alternativa flöden
- **Edge cases**: User stories för edge cases (om relevant)

---

## Steg 4: Identifiera Onödiga User Stories

### 4.1 Duplicerade user stories
- Är två user stories i princip samma sak?
- Kan de kombineras till en user story?

### 4.2 Irrelevanta user stories
- Täcker user story något som inte finns i BPMN-processen?
- Är user story för specifik och inte användbar?
- Ger user story inget värde för personan?

### 4.3 För generiska user stories
- Är user story så generisk att den inte ger värde?
- Kan den ersättas med en mer specifik user story?

---

## Steg 5: Förbättra Befintliga User Stories

### 5.1 Struktur: "Som [persona] vill jag [mål] så att [värde]"
Varje user story ska ha tydlig struktur:

```
**Som [specifik persona]** vill jag [konkret mål med BPMN-referens] **så att** [tydligt värde/affärsnytta].

<em>Acceptanskriterier: [Specifik beskrivning med referenser till BPMN-element (gateway-ID:n, task-ID:n, event-ID:n) där relevant].</em>
```

### 5.2 Persona-specifikation
**Regler:**
- ✅ **Specifik persona**: Inte "användare" utan "kund", "handläggare", "värderare", "systemadministratör"
- ✅ **Matchar BPMN**: Persona ska matcha BPMN lane eller task-assignment
- ❌ **Inga generiska personor**: Undvik "användare", "slutanvändare", "person"

### 5.3 Mål-specifikation
**Regler:**
- ✅ **Konkret och mätbart**: Inte "hantera dokument" utan "ladda upp signerade dokument via 'Upload document' user task"
- ✅ **Kopplar till BPMN**: Inkludera BPMN-element-ID:n där relevant (t.ex. "via 'Upload document' user task (upload-document)")
- ✅ **Specifik funktionalitet**: Beskriv exakt vad som ska hända
- ❌ **Inga generiska mål**: Undvik "hantera", "förbättra", "göra något"

### 5.4 Värde-specifikation
**Regler:**
- ✅ **Tydligt värde**: Inte "för att det är bra" utan "vilket sparar tid" eller "vilket minskar risken för fel"
- ✅ **Affärsnytta**: Beskriv varför detta är värdefullt
- ✅ **Mätbart värde** (när möjligt): "vilket sparar tid med upp till 50%"
- ❌ **Inga generiska värden**: Undvik "för att det är bra", "för att processen fungerar"

### 5.5 Acceptanskriterier
**Regler:**
- ✅ **Specifika**: Inte "systemet ska fungera" utan "systemet ska automatiskt screena BRF-information via 'BRF screening result' gateway"
- ✅ **Testbara**: Kan verifieras med tester
- ✅ **Implementeringsklara**: Utvecklare kan implementera direkt
- ✅ **Kopplar till BPMN**: Refererar till specifika BPMN-element (gateways, tasks, events) med ID:n
- ✅ **Tekniska detaljer**: Inkludera gateway-ID:n, task-ID:n, event-ID:n, datastore-ID:n, error codes, timeout-värden där relevant

### 5.6 Längd och läsbarhet
**Mål:** ~20-40 ord per user story (exklusive acceptanskriterier)

**Regler:**
- ✅ **Kort och koncis**: Fokusera på kärnan
- ✅ **Lätt att skanna**: Tydlig struktur gör det lätt att hitta information
- ✅ **Inga repetitioner**: Ta bort onödiga repetitioner
- ❌ **Inga långa beskrivningar**: Ta bort onödiga detaljer

---

## Steg 6: Skapa Nya User Stories

### 6.1 För varje saknad user story
Skapa ett nytt user story enligt strukturen i Steg 5.1

### 6.2 Organisering
Organisera user stories efter perspektiv:
1. **Systemperspektiv**: Automatiserade processer
2. **Handläggarperspektiv**: Caseworker-interaktioner
3. **Kundperspektiv**: Stakeholder/Customer-interaktioner
4. **Värderarperspektiv**: Valuator-interaktioner
5. **Andra perspektiv**: Test Lead, Developer, Product Owner (om relevant)

### 6.3 Prioritering
För varje user story, ange prioritering:
- **P0**: Kritiska user stories (happy path, core functionality)
- **P1**: Viktiga user stories (edge cases, error handling)
- **P2**: Nice-to-have user stories (optimeringar, förbättringar)

---

## Steg 7: Ta Bort Onödiga User Stories

### 7.1 För varje onödig user story
- Ta bort user story från HTML-filen
- Uppdatera referenser i andra delar av dokumentet om det behövs

---

## Steg 8: Validera Slutresultat

### 8.1 Kompletthet
Kontrollera att alla följande är täckta:
- ✅ Alla user tasks har minst en user story (från rätt persona)
- ✅ Alla service tasks har minst en user story (systemperspektiv)
- ✅ Alla business rule tasks har minst en user story (systemperspektiv)
- ✅ Alla viktiga gateways har minst en user story per utgående flöde
- ✅ Alla call activities har minst en user story (systemperspektiv)
- ✅ Alla viktiga boundary events har minst en user story (om relevant)

### 8.2 Kvalitet
Kontrollera att alla user stories:
- ✅ Har tydlig struktur: "Som [persona] vill jag [mål] så att [värde]"
- ✅ Är kortfattade (~20-40 ord, exklusive acceptanskriterier)
- ✅ Är lättläsbara och lätta att skanna
- ✅ Har specifika acceptanskriterier
- ✅ Kopplar till BPMN-element med ID:n
- ✅ Är relevanta och användbara för målgruppen

### 8.3 Konsistens
Kontrollera att:
- ✅ Alla user stories följer samma struktur
- ✅ Persona-namn är konsekventa (t.ex. "handläggare" vs "caseworker")
- ✅ BPMN-ID:n är korrekta och konsekventa
- ✅ Acceptanskriterier följer samma format

### 8.4 Antal user stories
Kontrollera att antalet user stories är rimligt:
- **Enkel process** (1-3 user tasks): 3-5 user stories
- **Medel process** (4-8 user tasks): 6-12 user stories
- **Komplex process** (9+ user tasks): 12-20 user stories

---

## Exempel: Förbättrad User Story

### Före (för generisk):
```
Som användare vill jag hantera signering så att processen fungerar.
```

**Problem:**
- ❌ För generisk persona ("användare")
- ❌ För vagt mål ("hantera signering")
- ❌ För vagt värde ("processen fungerar")
- ❌ Saknar acceptanskriterier
- ❌ Kopplar inte till BPMN-processen

### Efter (specifik och relevant):
```
Som handläggare vill jag kunna skicka påminnelser till kunder om väntande signeringar via "Manual reminder" boundary event (Event_1kyqkxc) på "Upload document" user task (upload-manual-document) så att kunder påminns om att signera dokument.

<em>Acceptanskriterier: Handläggare ska kunna skicka påminnelser via "Manual reminder" boundary event (Event_1kyqkxc) på "Upload document" user task (upload-manual-document), och påminnelse ska skickas via "Send reminder" intermediate throw event (Event_1esbspy) med escalation code "send-reminder".</em>
```

**Fördelar:**
- ✅ Specifik persona ("handläggare")
- ✅ Konkret mål med BPMN-referenser ("skicka påminnelser via boundary event")
- ✅ Tydligt värde ("kunder påminns")
- ✅ Specifika acceptanskriterier med BPMN-ID:n
- ✅ Kopplar till faktisk BPMN-process

---

## Checklista innan du är klar

- [ ] BPMN-processen är analyserad (user tasks, service tasks, gateways, events, personor)
- [ ] Befintliga user stories är analyserade mot BPMN
- [ ] Saknade user stories är identifierade och dokumenterade
- [ ] Onödiga user stories är identifierade och dokumenterade
- [ ] Befintliga user stories är förbättrade (specifika, relevanta, strukturerade)
- [ ] Nya user stories är skapade för saknade BPMN-element/personor
- [ ] Onödiga user stories är borttagna
- [ ] Alla user stories är validerade (kompletthet, kvalitet, konsistens)
- [ ] HTML-filen är uppdaterad med alla ändringar
- [ ] Inga linter-fel introducerade

---

## Användning

När du får en fil att förbättra:

1. **Läs denna prompt** för att förstå processen
2. **Läs USER_STORY_ANALYSIS.md** för att förstå best practices
3. **Följ stegen systematiskt** (Steg 1-8)
4. **Dokumentera dina beslut** (varför lägger du till/ta bort user stories?)
5. **Uppdatera HTML-filen** med alla ändringar
6. **Validera slutresultatet** mot checklistan

**Viktigt:** 
- Kvalitet är viktigare än kvantitet
- Specifika och relevanta user stories är bättre än generiska
- Fokusera på värde för personan
- Varje user story ska koppla till faktisk BPMN-process

