# Analys: Problem med Dokumentationsgenerering

## Datum: 2025-12-27

## Rapporterade Problem

### Problem 1: Feature Goals genereras för filer som inte är uppladdade
**Symptom:**
- "Household" (subprocess: mortgage-se-application.bpmn) genereras trots att `mortgage-se-household.bpmn` inte är uppladdad
- "Stakeholder" (subprocess: mortgage-se-internal-data-gathering.bpmn) genereras trots att `mortgage-se-stakeholder.bpmn` inte är uppladdad

**Förväntat beteende:**
- CallActivities med `missingDefinition = true` ska hoppas över
- CallActivities där `subprocessFile` inte finns i `existingBpmnFiles` ska hoppas över

**Nuvarande logik:**
1. `bpmnProcessGraph.ts` rad 390-392: Sätter `subprocessFile = undefined` om filen inte finns i `existingBpmnFiles`
2. `bpmnProcessGraph.ts` rad 497: Sätter `missingDefinition = !subprocessFile || !subprocessFileExists`
3. `bpmnGenerators.ts` rad 1607-1616: Filtrerar bort callActivities med `missingDefinition = true`
4. `bpmnGenerators.ts` rad 2027-2038: Hoppar över progress-meddelande för callActivities med `missingDefinition = true`

**Möjliga orsaker:**
- `missingDefinition` sätts inte korrekt i `bpmnProcessGraph.ts`
- `missingDefinition` ignoreras någonstans i flödet
- `subprocessFile` sätts felaktigt från `bpmn-map.json` även när filen saknas

---

### Problem 2: "Stakeholder" visar fel subprocess-fil
**Symptom:**
- Progress-meddelandet visar: "Genererar information för call activityn: Stakeholder (subprocess: mortgage-se-internal-data-gathering.bpmn)"
- `bpmn-map.json` rad 37-39 visar att "stakeholder" i `mortgage-se-application.bpmn` ska peka på `mortgage-se-stakeholder.bpmn`

**Möjliga orsaker:**
1. **Det finns flera callActivities med namnet "Stakeholder":**
   - En i `mortgage-se-application.bpmn` → pekar på `mortgage-se-stakeholder.bpmn` (korrekt)
   - En i `mortgage-se-internal-data-gathering.bpmn` → pekar på `mortgage-se-stakeholder.bpmn` eller något annat
   - Systemet visar fel callActivity (den från `internal-data-gathering` istället för `application`)

2. **`subprocessFile` sätts felaktigt:**
   - När callActivity "Stakeholder" i `internal-data-gathering` bearbetas, kan `subprocessFile` sättas felaktigt
   - Eller så är det en annan callActivity med samma namn som visar fel information

3. **Progress-meddelandet visar fel nod:**
   - `node.bpmnFile` kan vara fel när progress-meddelandet genereras
   - Eller så loopas noderna i fel ordning

**För att verifiera:**
- Kolla om det finns flera callActivities med namnet "Stakeholder" i olika filer
- Kolla vilken `node.bpmnFile` som används när progress-meddelandet genereras för "Stakeholder"

---

### Problem 3: Topological sorting fungerar inte
**Symptom:**
- Dokumentation genereras för "application" innan "internal-data-gathering"
- Förväntat: "internal-data-gathering" ska genereras FÖRE "application" (eftersom application anropar internal-data-gathering)

**Nuvarande logik:**
1. `bpmnGenerators.ts` rad 1886-1915: Bygger dependency-graf från `graph.allNodes`
2. Rad 1889: Inkluderar bara callActivities där `!node.missingDefinition`
3. Rad 1908: Inkluderar bara dependencies om båda filerna är i `analyzedFiles`
4. Rad 1919: Sorterar filerna topologiskt

**Möjliga orsaker:**
1. **Dependency-grafen byggs inte korrekt:**
   - Om `subprocessFile` är `undefined` eller `missingDefinition = true`, hoppas dependency över
   - Men om `subprocessFile` är satt men filen inte finns i `analyzedFiles`, inkluderas den inte i dependency-grafen
   - Detta kan leda till att dependencies saknas

2. **Filer sorteras alfabetiskt om det inte finns dependencies:**
   - Om dependency-grafen är tom, sorteras filerna alfabetiskt
   - "application" kommer före "internal-data-gathering" alfabetiskt

3. **`analyzedFiles` innehåller inte rätt filer:**
   - Om `internal-data-gathering` inte är i `analyzedFiles`, inkluderas den inte i dependency-grafen
   - Men den kan fortfarande genereras om den är i `graphFileScope`

**För att verifiera:**
- Kolla vad `analyzedFiles` innehåller
- Kolla vad `fileDependencies` innehåller efter att den byggts
- Kolla vad `sortedAnalyzedFiles` innehåller efter topological sorting

---

## Rotorsaker (Hypoteser)

### Hypotes 1: `missingDefinition` sätts inte korrekt
**Bevis:**
- Progress-meddelanden visas för callActivities med saknade subprocess-filer
- Detta tyder på att `missingDefinition` inte är `true` när den borde vara det

**Möjlig orsak:**
- `subprocessFile` sätts från `bpmn-map.json` även när filen inte finns i `existingBpmnFiles`
- `missingDefinition` beräknas felaktigt (rad 497 i `bpmnProcessGraph.ts`)

### Hypotes 2: Dependency-grafen byggs innan `missingDefinition` sätts korrekt
**Bevis:**
- Topological sorting fungerar inte
- Detta tyder på att dependency-grafen inte innehåller rätt dependencies

**Möjlig orsak:**
- Dependency-grafen byggs från `graph.allNodes` som kan innehålla noder med felaktiga `subprocessFile`-värden
- `missingDefinition` sätts först senare i flödet, så dependency-grafen byggs med felaktiga värden

### Hypotes 3: Det finns flera callActivities med samma namn
**Bevis:**
- "Stakeholder" visar fel subprocess-fil
- Detta tyder på att det finns flera callActivities med namnet "Stakeholder" i olika filer

**Möjlig orsak:**
- CallActivity "Stakeholder" i `mortgage-se-application.bpmn` → pekar på `mortgage-se-stakeholder.bpmn`
- CallActivity "Stakeholder" i `mortgage-se-internal-data-gathering.bpmn` → pekar på något annat (eller samma)
- Systemet visar fel callActivity när progress-meddelandet genereras

---

## Rekommendationer för Felsökning

1. **Lägg till debug-logging:**
   - Logga `missingDefinition` för varje callActivity när grafen byggs
   - Logga `subprocessFile` för varje callActivity när grafen byggs
   - Logga `fileDependencies` efter att den byggts
   - Logga `sortedAnalyzedFiles` efter topological sorting

2. **Verifiera `bpmn-map.json`:**
   - Kolla om det finns flera callActivities med namnet "Stakeholder"
   - Kolla vilka filer som faktiskt är uppladdade (`existingBpmnFiles`)

3. **Verifiera filtreringen:**
   - Kolla om `nodesToGenerate` innehåller callActivities med `missingDefinition = true`
   - Kolla om progress-meddelanden visas för noder som borde ha filtrerats bort

4. **Verifiera topological sorting:**
   - Kolla om `fileDependencies` innehåller rätt dependencies
   - Kolla om `sortedAnalyzedFiles` är korrekt sorterad

---

## Nästa Steg

1. Lägg till omfattande debug-logging för att identifiera exakt var problemet uppstår
2. Verifiera att `missingDefinition` sätts korrekt för alla callActivities
3. Verifiera att dependency-grafen byggs korrekt
4. Verifiera att topological sorting fungerar som förväntat
5. Fixa identifierade problem

