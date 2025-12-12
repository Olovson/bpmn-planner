# Extern Analys: Hur User Stories Bäst Bör Beskrivas

## Syfte
Analysera best practices för att skriva effektiva user stories i feature goal-dokumentation, baserat på branschstandarder och verkliga behov från olika målgrupper.

---

## 1. User Story-struktur (INVEST-principen)

### 1.1 Format: "Som [persona] vill jag [mål] så att [värde]"
**Krav:**
- ✅ **Persona måste vara specifik**: Inte bara "användare" utan "kund", "handläggare", "värderare", "systemadministratör"
- ✅ **Mål måste vara konkret**: Inte "hantera dokument" utan "ladda upp signerade dokument"
- ✅ **Värde måste vara tydligt**: Inte "för att det är bra" utan "för att processen kan fortsätta utan avbrott"

### 1.2 INVEST-principen
- **I**ndependent: Varje user story ska vara oberoende
- **N**egotiable: Kan diskuteras och förhandlas
- **V**aluable: Ger värde för användaren
- **E**stimable: Kan uppskattas
- **S**mall: Liten nog att implementeras i en iteration
- **T**estable: Kan verifieras med acceptanskriterier

---

## 2. Persona-specifikation

### 2.1 Persona-typer
**Vanliga personor i mortgage-processen:**
- **Kund/Stakeholder**: Personen som ansöker om lån
- **Handläggare/Caseworker**: Personen som hanterar ansökan
- **Värderare/Valuator**: Personen som värderar objekt
- **System/Systemadministratör**: Systemet som automatiskt hanterar processer
- **Test Lead**: Personen som skapar tester
- **Developer**: Personen som implementerar funktionalitet
- **Product Owner**: Personen som prioriterar funktionalitet

### 2.2 Persona-beskrivning
Varje persona ska ha:
- **Tydlig roll**: Vad gör denna persona?
- **Kontext**: I vilken situation använder de systemet?
- **Behov**: Vad behöver de för att kunna göra sitt jobb?

---

## 3. Mål-specifikation

### 3.1 Konkret och mätbart
**Bra:**
- "ladda upp signerade dokument"
- "automatiskt screena BRF-information"
- "begära lägenhetsutdrag direkt från stakeholder"

**Dåligt:**
- "hantera dokument" (för generiskt)
- "förbättra processen" (för vagt)
- "göra något" (för otydligt)

### 3.2 Koppling till BPMN
Målet ska kopplas till specifika BPMN-element:
- **User tasks**: Vad ska användaren göra?
- **Service tasks**: Vad ska systemet göra?
- **Business rule tasks**: Vilka beslut ska fattas?
- **Gateways**: Vilka val ska göras?
- **Call activities**: Vilka subprocesser anropas?

---

## 4. Värde-specifikation

### 4.1 Affärsvärde
Värdet ska beskriva:
- **Tidsbesparing**: "vilket sparar tid"
- **Kvalitetsförbättring**: "vilket minskar risken för fel"
- **Kundupplevelse**: "vilket förbättrar kundupplevelsen"
- **Automatisering**: "vilket eliminerar manuell intervention"

### 4.2 Mätbart värde (när möjligt)
**Bra:**
- "vilket sparar tid med upp till 50%"
- "vilket minskar risken för fel med upp till 30%"
- "vilket eliminerar manuell intervention"

**Dåligt:**
- "vilket är bra" (för generiskt)
- "vilket förbättrar processen" (för vagt)

---

## 5. Acceptanskriterier

### 5.1 Struktur
Varje user story ska ha acceptanskriterier som:
- ✅ **Är specifika**: Inte "systemet ska fungera" utan "systemet ska automatiskt screena BRF-information"
- ✅ **Är testbara**: Kan verifieras med tester
- ✅ **Är implementeringsklara**: Utvecklare kan implementera direkt
- ✅ **Kopplar till BPMN**: Refererar till specifika BPMN-element (gateways, tasks, events)

### 5.2 Format
```
<em>Acceptanskriterier: [Specifik beskrivning av vad som ska hända, med referenser till BPMN-element där relevant].</em>
```

**Exempel:**
```
<em>Acceptanskriterier: Systemet ska automatiskt screena BRF-information mot affärsregler via "BRF screening result" gateway, och endast BRF:er som kräver granskning ska dirigeras till "Review BRF" user task.</em>
```

---

## 6. Organisering efter perspektiv

### 6.1 Perspektiv-hierarki
Organisera user stories efter perspektiv:
1. **Systemperspektiv**: Automatiserade processer
2. **Handläggarperspektiv**: Caseworker-interaktioner
3. **Kundperspektiv**: Stakeholder/Customer-interaktioner
4. **Värderarperspektiv**: Valuator-interaktioner
5. **Andra perspektiv**: Test Lead, Developer, Product Owner (om relevant)

### 6.2 Prioritering inom perspektiv
- **P0**: Kritiska user stories (happy path, core functionality)
- **P1**: Viktiga user stories (edge cases, error handling)
- **P2**: Nice-to-have user stories (optimeringar, förbättringar)

---

## 7. Koppling till BPMN-processen

### 7.1 Täckning
Varje viktigt BPMN-element ska ha minst en user story:
- **User tasks**: Minst en user story per task
- **Service tasks**: Minst en user story per task (systemperspektiv)
- **Business rule tasks**: Minst en user story per task
- **Gateways**: Minst en user story per utgående flöde
- **Call activities**: Minst en user story per call activity
- **Boundary events**: Minst en user story per boundary event (om relevant)

### 7.2 Tekniska referenser
User stories ska inkludera:
- **BPMN-element-ID:n**: Gateway-ID:n, task-ID:n, event-ID:n där relevant
- **Datastore-ID:n**: Datastore-ID:n där relevant
- **Error codes**: Error codes där relevant
- **Timeout-värden**: Timeout-värden där relevant

---

## 8. Kvalitetskriterier

### 8.1 Läsbarhet
- ✅ **Kort och koncis**: ~20-40 ord per user story (exklusive acceptanskriterier)
- ✅ **Tydlig struktur**: "Som [persona] vill jag [mål] så att [värde]"
- ✅ **Lätt att skanna**: Tydlig formatering gör det lätt att hitta information
- ✅ **Inga repetitioner**: Ta bort onödiga repetitioner

### 8.2 Relevans
- ✅ **Relevant för målgruppen**: User story ger värde för den specifika personan
- ✅ **Relevant för processen**: User story kopplar till faktisk BPMN-process
- ✅ **Relevant för affären**: User story ger affärsvärde

### 8.3 Kompletthet
- ✅ **Täcker alla viktiga flöden**: Happy path, error paths, alternative paths
- ✅ **Täcker alla perspektiv**: System, handläggare, kund, värderare (om relevant)
- ✅ **Täcker alla BPMN-element**: User tasks, service tasks, gateways, events

---

## 9. Vanliga problem och lösningar

### 9.1 För generiska user stories
**Problem:** "Som användare vill jag hantera dokument så att processen fungerar"
**Lösning:** Gör mer specifik: "Som handläggare vill jag ladda upp signerade dokument via 'Upload document' user task så att processen kan fortsätta utan avbrott"

### 9.2 Saknade acceptanskriterier
**Problem:** User story saknar acceptanskriterier
**Lösning:** Lägg till specifika acceptanskriterier med referenser till BPMN-element

### 9.3 För många user stories
**Problem:** 50+ user stories för en process
**Lösning:** Konsolidera relaterade user stories, fokusera på viktiga flöden

### 9.4 För få user stories
**Problem:** Bara 2-3 user stories för en komplex process
**Lösning:** Identifiera alla viktiga BPMN-element och skapa user stories för varje

### 9.5 Saknade perspektiv
**Problem:** Bara systemperspektiv, saknar kund- och handläggarperspektiv
**Lösning:** Analysera BPMN-processen och identifiera alla personor som interagerar

---

## 10. Exempel: Bra vs Dålig User Story

### Dålig User Story:
```
Som användare vill jag hantera signering så att processen fungerar.
```

**Problem:**
- ❌ För generisk persona ("användare")
- ❌ För vagt mål ("hantera signering")
- ❌ För vagt värde ("processen fungerar")
- ❌ Saknar acceptanskriterier
- ❌ Kopplar inte till BPMN-processen

### Bra User Story:
```
Som handläggare vill jag kunna skicka påminnelser till kunder om väntande signeringar via "Manual reminder" boundary event på "Upload document" user task så att kunder påminns om att signera dokument. 

<em>Acceptanskriterier: Handläggare ska kunna skicka påminnelser via "Manual reminder" boundary event (Event_1kyqkxc) på "Upload document" user task (upload-manual-document), och påminnelse ska skickas via "Send reminder" intermediate throw event (Event_1esbspy).</em>
```

**Fördelar:**
- ✅ Specifik persona ("handläggare")
- ✅ Konkret mål ("skicka påminnelser via boundary event")
- ✅ Tydligt värde ("kunder påminns")
- ✅ Specifika acceptanskriterier med BPMN-referenser
- ✅ Kopplar till faktisk BPMN-process

---

## 11. Checklista för kvalitet

För varje user story, kontrollera:
- [ ] Persona är specifik (inte "användare")
- [ ] Mål är konkret och mätbart
- [ ] Värde är tydligt och relevant
- [ ] Acceptanskriterier finns och är specifika
- [ ] Acceptanskriterier kopplar till BPMN-element
- [ ] User story är relevant för processen
- [ ] User story ger värde för personan
- [ ] User story är kort och lättläsbar (~20-40 ord)
- [ ] User story följer INVEST-principen

---

## 12. Rekommendationer

### 12.1 Antal user stories
- **Enkel process** (1-3 user tasks): 3-5 user stories
- **Medel process** (4-8 user tasks): 6-12 user stories
- **Komplex process** (9+ user tasks): 12-20 user stories

### 12.2 Fördelning per perspektiv
- **Systemperspektiv**: 30-40% av user stories
- **Handläggarperspektiv**: 20-30% av user stories
- **Kundperspektiv**: 20-30% av user stories
- **Andra perspektiv**: 10-20% av user stories

### 12.3 Prioritering
- **P0**: 40-50% av user stories (happy path, core functionality)
- **P1**: 30-40% av user stories (edge cases, error handling)
- **P2**: 10-20% av user stories (optimeringar, förbättringar)

---

## 13. Integration med BPMN-processen

### 13.1 Mapping till BPMN-element
Varje user story ska mappas till:
- **Primärt BPMN-element**: Den task/gateway/event som user story fokuserar på
- **Sekundära BPMN-element**: Relaterade tasks/gateways/events som påverkas

### 13.2 Tekniska referenser
User stories ska inkludera:
- **BPMN-ID:n**: Gateway-ID:n (t.ex. Gateway_0fhav15), task-ID:n (t.ex. upload-document), event-ID:n (t.ex. Event_0j4buhs)
- **Datastore-ID:n**: Datastore-ID:n (t.ex. DataStoreReference_0e9iwhm) där relevant
- **Error codes**: Error codes (t.ex. errorCode="pre-screen-rejected") där relevant
- **Timeout-värden**: Timeout-värden (t.ex. "30 dagar (P30D)") där relevant

---

## 14. Slutsats

En bra user story:
1. **Är specifik**: Tydlig persona, konkret mål, tydligt värde
2. **Är relevant**: Kopplar till faktisk BPMN-process och ger värde
3. **Är testbar**: Har specifika acceptanskriterier som kan verifieras
4. **Är implementeringsklar**: Utvecklare kan implementera direkt
5. **Är kort och lättläsbar**: ~20-40 ord, tydlig struktur
6. **Följer INVEST-principen**: Independent, Negotiable, Valuable, Estimable, Small, Testable

