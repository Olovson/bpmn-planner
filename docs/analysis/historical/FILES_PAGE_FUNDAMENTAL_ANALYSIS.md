# Grundläggande Analys: Files-sidan och Genereringsprocessen

## Syfte med denna analys

Denna analys görs från grunden för att förstå:
1. **Vad BPMN-filer faktiskt används till i appen**
2. **Vilka olika användningsscenarion som finns**
3. **Hur genereringsprocessen faktiskt borde fungera**
4. **Vad som är logiskt vs förvirrande**
5. **Hur jag har tolkat behoven**

---

## 1. Vad är BPMN Planner och vad gör den?

### Appens huvudsyfte (från README):
> **BPMN Planner** tar BPMN-/DMN-filer, bygger en deterministisk processhierarki, visualiserar processen (diagram, strukturträd, listvy) och genererar dokumentation, testunderlag och metadata för produkt- och utvecklingsteamet.

### Vad genereras:
1. **Dokumentation** (HTML-filer):
   - Feature Goals (CallActivities/subprocesser)
   - Epics (UserTasks, ServiceTasks)
   - Business Rules (BusinessRuleTasks/DMN)

2. **Testinformation**:
   - Testscenarion (sparas i databas)
   - Playwright-testfiler (.spec.ts)
   - Testrapporter

3. **Metadata**:
   - DoR/DoD-kriterier
   - Jira-typer/namn
   - BPMN-dependencies
   - Subprocess-mappningar

---

## 2. Vad används BPMN-filer till i appen?

### 2.1 BPMN-filer som källa till information

**BPMN-filer innehåller:**
- Processdefinitioner (processer)
- Noder (UserTasks, ServiceTasks, BusinessRuleTasks, CallActivities)
- Flöden (sequence flows)
- Subprocess-kopplingar (callActivity → subprocess-fil)

**Appen använder BPMN-filer för att:**
1. **Bygga ProcessTree** - en hierarkisk struktur av alla processer och noder
2. **Generera dokumentation** - för varje nod (Feature Goal, Epic, Business Rule)
3. **Generera tester** - testscenarion och Playwright-testfiler
4. **Visualisera processen** - i diagram, träd, listvy, timeline
5. **Skapa metadata** - Jira-namn, dependencies, DoR/DoD

### 2.2 BPMN-filer och hierarki

**Viktigt koncept:**
- BPMN-filer kan vara **root-filer** (t.ex. `mortgage.bpmn`) eller **subprocess-filer** (t.ex. `mortgage-se-application.bpmn`)
- Subprocess-filer länkas till root-filer via `callActivity`-noder
- Appen bygger en **hierarki** som visar hur alla filer hänger ihop

**Exempel:**
```
mortgage.bpmn (root)
├── Application (callActivity → mortgage-se-application.bpmn)
│   ├── Internal data gathering (callActivity → mortgage-se-internal-data-gathering.bpmn)
│   └── Confirm application (userTask)
└── Credit Evaluation (callActivity → mortgage-se-credit-evaluation.bpmn)
    └── Calculate affordability (serviceTask)
```

---

## 3. Användningsscenarion - Vad gör användaren faktiskt?

### Scenario A: Ny användare, första gången

**Vad användaren gör:**
1. Laddar upp BPMN-filer (t.ex. 5 filer: `mortgage.bpmn`, `mortgage-se-application.bpmn`, etc.)
2. Vill se processen visualiserad
3. Vill generera dokumentation för alla noder
4. Vill generera tester för alla noder

**Vad användaren förväntar sig:**
- Appen ska automatiskt förstå hur filerna hänger ihop
- En knapp "Generera allt" som gör allt
- Inga manuella steg som "bygg hierarki först"

**Vad som faktiskt händer nu:**
- ❌ Användaren måste manuellt bygga hierarki (om den inte är automatisk)
- ❌ Användaren måste välja mellan "vald fil" vs "alla filer"
- ❌ Otydligt vad som genereras

### Scenario B: Användaren uppdaterar en fil

**Vad användaren gör:**
1. Laddar upp en ny version av `mortgage-se-household.bpmn`
2. Vill bara regenerera dokumentation för den filen
3. Vill inte påverka andra filer

**Vad användaren förväntar sig:**
- Klicka på filen → "Generera för denna fil"
- Bara den filen genereras
- Andra filer påverkas inte

**Vad som faktiskt händer nu:**
- ✅ Om filen är root: Genererar för ALLA filer (hierarki)
- ❌ Om filen är subprocess: Genererar isolerat (saknar kontext)
- ❌ Otydligt vad som händer

### Scenario C: Användaren lägger till en ny fil

**Vad användaren gör:**
1. Har redan `mortgage.bpmn` och `mortgage-se-application.bpmn`
2. Lägger till `mortgage-se-household.bpmn` (ny subprocess)
3. Vill generera dokumentation för den nya filen

**Vad användaren förväntar sig:**
- Klicka på den nya filen → "Generera för denna fil"
- Den nya filen genereras med kontext från parent-processer
- Andra filer påverkas inte

**Vad som faktiskt händer nu:**
- ❌ Om filen är subprocess: Genererar isolerat (saknar kontext)
- ❌ Hierarki byggs inte automatiskt
- ❌ Otydligt om kontext från parent-processer inkluderas

### Scenario D: Användaren vill regenerera allt

**Vad användaren gör:**
1. Har många filer med dokumentation
2. Uppdaterar prompts eller mallar
3. Vill regenerera all dokumentation

**Vad användaren förväntar sig:**
- En knapp "Regenerera allt"
- Alla filer regenereras i rätt ordning
- Inga dubbelarbeten

**Vad som faktiskt händer nu:**
- ⚠️ "Generera information (alla filer)" loopar över varje fil
- ⚠️ Root-filen genereras två gånger (hierarkiskt + isolerat)
- ❌ Dubbelarbete och inkonsekvent resultat

---

## 4. Min tolkning av behoven (och var jag kan ha missförstått)

### 4.1 Vad jag trodde användaren ville ha:

**Min tolkning:**
- Användaren vill ha **flexibilitet** - kunna generera för en fil eller alla filer
- Användaren förstår **hierarki** - vet när hierarki behövs
- Användaren vill ha **kontroll** - välja exakt vad som genereras

**Varför jag trodde detta:**
- Jag såg kod som hade både "vald fil" och "alla filer"
- Jag såg manuell "Bygg hierarki"-knapp
- Jag antog att användaren ville ha kontroll

**Vad användaren faktiskt vill ha:**
- **Enkelhet** - appen ska automatiskt hantera allt
- **Transparens** - appen ska göra rätt sak automatiskt
- **Intuitivitet** - "bara fungera" utan att tänka

### 4.2 Vad jag trodde om hierarki:

**Min tolkning:**
- Hierarki är ett **separat steg** som användaren måste göra först
- Hierarki är **komplicerat** - användaren behöver förstå det
- Hierarki är **valfritt** - användaren kan välja att inte använda det

**Vad användaren faktiskt vill:**
- Hierarki ska byggas **automatiskt** när det behövs
- Hierarki ska vara **transparent** - användaren ska inte behöva tänka på det
- Hierarki ska **alltid** användas när det ger bättre resultat

### 4.3 Vad jag trodde om "vald fil" vs "alla filer":

**Min tolkning:**
- "Vald fil" = generera bara för den filen (isolat)
- "Alla filer" = generera för varje fil individuellt
- Användaren vill ha båda alternativen

**Vad användaren faktiskt vill:**
- "Vald fil" = generera för filen + dess kontext (hierarki om tillämpligt)
- "Alla filer" = generera EN gång för hela hierarkin (inte loopa)
- Användaren vill ha **logiskt beteende**, inte flexibilitet på bekostnad av förvirring

---

## 5. Vad är logiskt vs förvirrande?

### 5.1 Logiskt beteende (vad användaren förväntar sig)

#### För EN fil:
**Användaren tänker:**
- "Jag vill generera dokumentation för `mortgage-se-household.bpmn`"
- "Jag förväntar mig att få dokumentation för alla noder i den filen"
- "Jag förväntar mig att få kontext från parent-processer om det finns"

**Logiskt beteende:**
1. Identifiera om filen är root eller subprocess
2. Om root: Generera för hela hierarkin (alla filer)
3. Om subprocess: Generera för filen + dess kontext från parent-processer
4. Använd hierarki automatiskt när det ger bättre resultat

#### För ALLA filer:
**Användaren tänker:**
- "Jag vill generera dokumentation för alla mina BPMN-filer"
- "Jag förväntar mig att få dokumentation för alla noder i alla filer"
- "Jag förväntar mig att det sker i rätt ordning (root först, sedan subprocesser)"

**Logiskt beteende:**
1. Bygg hierarki automatiskt
2. Identifiera root-fil
3. Generera EN gång för hela hierarkin (root med useHierarchy = true)
4. Alla filer inkluderas automatiskt
5. Inga dubbelarbeten

### 5.2 Förvirrande beteende (vad som händer nu)

#### För EN fil:
**Vad som händer nu:**
- Om root: Genererar för ALLA filer (ok, men otydligt)
- Om subprocess: Genererar isolerat (saknar kontext - dåligt)
- Hierarki byggs inte automatiskt (användaren måste göra det manuellt)

**Varför det är förvirrande:**
- Användaren vet inte vad som kommer att genereras
- Användaren måste förstå hierarki för att veta vad som händer
- Beteendet är inkonsekvent (root vs subprocess fungerar olika)

#### För ALLA filer:
**Vad som händer nu:**
- Bygger hierarki (bra, men visas som separat steg)
- Loopar över varje fil individuellt (dåligt)
- Root genereras två gånger (dubbelarbete)
- Subprocesser genereras isolerat (saknar kontext)

**Varför det är förvirrande:**
- Användaren ser "Bygger hierarki..." som separat steg
- Användaren förstår inte varför root genereras två gånger
- Användaren förstår inte varför subprocesser genereras isolerat

---

## 6. Föreslagen logisk arbetsprocess

### 6.1 Grundläggande princip

**Enkel regel:**
> **Appen ska alltid göra det logiskt rätta automatiskt, utan att användaren behöver tänka på det.**

### 6.2 Föreslagen arbetsprocess

#### Steg 1: Ladda upp BPMN-filer
- Användaren laddar upp BPMN-filer (en eller flera)
- Appen parsar filerna och extraherar metadata
- **Ingen hierarki byggs ännu** (det görs automatiskt vid generering)

#### Steg 2: Generera dokumentation

**För EN fil:**
- Användaren klickar "Generera information för vald fil"
- Appen:
  1. Bygger hierarki automatiskt (tyst, i bakgrunden)
  2. Identifierar om filen är root eller subprocess
  3. Om root: Genererar för hela hierarkin
  4. Om subprocess: Genererar för filen + dess kontext
  5. Visar tydligt vad som genereras (antal filer, antal noder)

**För ALLA filer:**
- Användaren klickar "Generera information (alla filer)"
- Appen:
  1. Bygger hierarki automatiskt (tyst, i bakgrunden)
  2. Identifierar root-fil
  3. Genererar EN gång för hela hierarkin (root med useHierarchy = true)
  4. Alla filer inkluderas automatiskt
  5. Visar tydligt vad som genereras (antal filer, antal noder)

#### Steg 3: Generera tester

**För EN fil:**
- Användaren klickar "Generera testinformation för vald fil"
- Appen:
  1. Bygger hierarki automatiskt (tyst, i bakgrunden)
  2. Validerar att dokumentation finns (visar varning om saknas)
  3. Genererar tester för alla noder i filen
  4. Använder dokumentation som kontext

**För ALLA filer:**
- Användaren klickar "Generera testinformation (alla filer)"
- Appen:
  1. Bygger hierarki automatiskt (tyst, i bakgrunden)
  2. Validerar att dokumentation finns för alla filer
  3. Genererar tester för alla noder i alla filer
  4. Använder dokumentation som kontext

### 6.3 Vad användaren ser

**Tydlig feedback:**
- "Förbereder generering..." (hierarki byggs automatiskt)
- "Genererar dokumentation för 3 filer, 15 noder..."
- "Klart! 15 dokumentationsfiler skapade."

**Inga tekniska detaljer:**
- Ingen "Bygger hierarki..."-toast
- Ingen förklaring om hierarki vs isolerat
- Bara tydlig feedback om vad som genereras

---

## 7. Identifierade problem i nuvarande implementation

### Problem 1: Hierarki är för abstrakt
- Användaren måste manuellt bygga hierarki
- Användaren förstår inte när hierarki behövs
- Hierarki visas som separat steg

**Lösning:** Automatisk hierarki-byggning (redan implementerat, men kan förbättras)

### Problem 2: Inkonsekvent beteende
- Root-fil vs subprocess-fil fungerar olika
- "Alla filer" loopar istället för att generera en gång
- Otydligt vad som genereras

**Lösning:** Enhetligt beteende baserat på logik, inte filtyp

### Problem 3: Otydlig scope
- Användaren vet inte vad som kommer att genereras
- Ingen tydlig feedback om antal filer/noder
- Otydligt om hierarki används

**Lösning:** Tydlig feedback innan och under generering

### Problem 4: Dubbelarbete
- Root genereras två gånger
- Hierarki byggs men används inte konsekvent
- Loopar över filer istället för att använda hierarki

**Lösning:** Generera EN gång för hela hierarkin

---

## 8. Föreslagen förbättrad arbetsprocess

### 8.1 Förenklad UI

**Knappar:**
1. **"Generera information för vald fil"**
   - Genererar dokumentation för filen + dess kontext
   - Bygger hierarki automatiskt
   - Visar tydligt vad som genereras

2. **"Generera information (alla filer)"**
   - Genererar dokumentation för hela hierarkin
   - Bygger hierarki automatiskt
   - Genererar EN gång (inte loop)

3. **"Generera testinformation för vald fil"**
   - Genererar tester för filen
   - Validerar att dokumentation finns
   - Bygger hierarki automatiskt

4. **"Generera testinformation (alla filer)"**
   - Genererar tester för alla filer
   - Validerar att dokumentation finns
   - Bygger hierarki automatiskt

### 8.2 Tydlig feedback

**Innan generering:**
- Visa dialog: "Kommer att generera dokumentation för 3 filer, 15 noder"
- Visa om hierarki används (men gör det transparent)

**Under generering:**
- "Förbereder generering..." (hierarki byggs)
- "Genererar dokumentation: 5/15 noder..."
- "Laddar upp filer: 3/15..."

**Efter generering:**
- "Klart! 15 dokumentationsfiler skapade för 3 filer"
- Visa länkar till resultat

### 8.3 Automatisk hantering

**Allt sker automatiskt:**
- Hierarki byggs automatiskt när det behövs
- Root vs subprocess hanteras automatiskt
- Kontext från parent-processer inkluderas automatiskt
- Validering sker automatiskt (t.ex. dokumentation finns innan tester)

---

## 9. Sammanfattning: Vad är logiskt?

### Logiskt:
✅ **Automatisk hierarki-hantering** - appen bygger hierarki när det behövs
✅ **Enhetligt beteende** - samma logik oavsett filtyp
✅ **Tydlig feedback** - användaren vet vad som genereras
✅ **Inga dubbelarbeten** - generera EN gång för hela hierarkin
✅ **Kontext inkluderas automatiskt** - subprocesser får kontext från parent-processer

### Förvirrande:
❌ **Manuell hierarki-byggning** - användaren måste göra det själv
❌ **Inkonsekvent beteende** - root vs subprocess fungerar olika
❌ **Otydlig scope** - användaren vet inte vad som genereras
❌ **Dubbelarbete** - root genereras två gånger
❌ **Isolerad generering** - subprocesser saknar kontext

---

## 10. Min tolkning vs verkliga behov

### Vad jag trodde:
- Användaren vill ha **flexibilitet** och **kontroll**
- Användaren förstår **hierarki** och vill hantera det manuellt
- Användaren vill välja mellan **isolat** vs **hierarki**

### Vad användaren faktiskt vill:
- Användaren vill ha **enkelhet** och **automatisering**
- Användaren vill **inte** behöva tänka på hierarki
- Appen ska **alltid** göra det logiskt rätta automatiskt

### Slutsats:
Jag har fokuserat på **flexibilitet** när användaren faktiskt vill ha **enkelhet**. Appen borde vara mer **automatisk** och **transparent**, inte mer **konfigurerbar**.

---

## 11. Nästa steg

### Föreslaget:
1. **Förenkla UI** - färre knappar, tydligare namn
2. **Automatisera allt** - hierarki, validering, kontext
3. **Tydlig feedback** - visa vad som genereras innan start
4. **Enhetligt beteende** - samma logik oavsett filtyp
5. **Inga dubbelarbeten** - generera EN gång för hela hierarkin

### Frågor till användaren:
1. Stämmer min analys av vad du faktiskt vill ha?
2. Är den föreslagna arbetsprocessen logisk?
3. Vad saknas eller är fel i min tolkning?

