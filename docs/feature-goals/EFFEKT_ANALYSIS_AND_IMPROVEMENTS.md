# Analys och förbättringsförslag: Effekt-kapitlet

## Kontext

**Nuvarande situation:**
- 100 000 ansökningar per år
- 200 handläggare
- Manuell process: kund matar in data → handläggare processerar manuellt i äldre system + telefonkontakt
- Genomsnittlig handläggningstid: ~5-7 dagar (uppskattat baserat på typiska manuella processer)

**Ny situation:**
- BPMN-definierat system med automatisering
- Parallellisering av steg
- Automatisk datainsamling och validering
- Automatisk routing och beslutsfattande

## Nuvarande struktur i Effekt-kapitlet

**Stärkor:**
- ✅ Kopplar effekter till specifika BPMN-mekanismer
- ✅ Använder procentuella förbättringar
- ✅ Organiserar i kategorier (automatisering, snabbare process, etc.)
- ✅ Nämner specifika processsteg

**Brister:**
- ❌ Saknar volym-baserade beräkningar (hur många ansökningar påverkas?)
- ❌ Saknar tidssparande i absoluta tal (minuter, timmar, dagar)
- ❌ Saknar kapacitetsökning (fler ansökningar per handläggare)
- ❌ Saknar kostnadsbesparingar (arbetstid i timmar/dagar)
- ❌ Saknar kundupplevelse-mätningar (väntetid, svarstid)
- ❌ Saknar jämförelse med nuvarande baseline
- ❌ Saknar kumulativa effekter (när flera feature goals kombineras)

## Ytterligare data som behövs för realistiska effektberäkningar

**Viktigt:** 
- **BPMN-filerna visar PROCESSEN, inte faktiska avslagsprocent eller effekter.** BPMN-filerna beskriver vilka steg som finns, vilka gateways som avgör beslut, och vilka error events som kan triggas, men de visar INTE hur många ansökningar som faktiskt avvisas eller vilka effekter som realiseras.
- **Specifika siffror är OK att använda, men måste markeras som spekulativa/uppskattningar när baseline-data saknas.** Använd kortfattat och koncist språk för att markera detta (t.ex. "uppskattat", "förväntat", "baserat på typiska värden").
- **Baseline-data krävs från bankens nuvarande process för realistiska beräkningar.** Utan denna data är siffrorna uppskattningar baserat på typiska värden för liknande processer.

**Viktigt:** Alla beräkningar i Effekt-kapitlet ska vara **konservativa** (använd lägre gränser) och **realistiska** i den mån det går. Om exakt baseline-data saknas, använd uppskattningar baserat på typiska värden för liknande processer och nämn kortfattat att siffrorna är spekulativa.

För att kunna göra mer precisa och realistiska effektberäkningar skulle följande baseline-data vara värdefullt:

### Baseline-data för nuvarande process

1. **Processdata:**
   - Genomsnittlig total handläggningstid per ansökan (dagar/timmar)
   - Genomsnittlig manuell arbetstid per ansökan (timmar)
   - Genomsnittlig väntetid mellan steg (dagar)
   - Genomsnittlig svarstid till kund (dagar)
   - Andel ansökningar som avvisas i olika steg (%)
   - Andel ansökningar som godkänns automatiskt vs manuellt (%)

2. **Tidsdata per aktivitet:**
   - Datainsamling: genomsnittlig tid (minuter/timmar)
   - Pre-screening: genomsnittlig tid (minuter/timmar)
   - KALP-beräkning: genomsnittlig tid (minuter/timmar)
   - Kreditupplysning: genomsnittlig tid (minuter/timmar)
   - Manuell granskning: genomsnittlig tid (timmar/dagar)
   - Dokumentation: genomsnittlig tid (minuter/timmar)

3. **Volymdata:**
   - Antal ansökningar per år (nuvarande: 100 000)
   - Antal handläggare (nuvarande: 200)
   - Andel återkommande kunder (%)
   - Andel lågrisk vs högrisk ansökningar (%)
   - Andel ansökningar per typ (köp, flytt, omlåning) (%)

4. **Kostnadsdata:**
   - Genomsnittlig handläggarlön (SEK/år)
   - Overhead-kostnader per handläggare (SEK/år)
   - Kostnad per ansökan (nuvarande) (SEK)
   - Kostnad per avvisad ansökan (SEK)

5. **Kvalitetsdata:**
   - Andel felaktiga beslut (%)
   - Andel ansökningar som behöver omarbetas (%)
   - Genomsnittlig antal iterationer per ansökan
   - Kundnöjdhet (nuvarande) (%)

6. **Processdata:**
   - Andel ansökningar som fastnar i processen (%)
   - Genomsnittlig antal manuella steg per ansökan
   - Genomsnittlig antal systembyten per ansökan
   - Genomsnittlig antal telefonkontakter per ansökan

### Data för nya systemet (uppskattningar)

För att kunna jämföra behövs även uppskattningar för nya systemet:
- Förväntad automatisering (% av steg som automatiseras)
- Förväntad parallellisering (tidssparande i %)
- Förväntad förbättring i datakvalitet (%)
- Förväntad förbättring i svarstider (%)

### Kommentar om beräkningar

**Viktiga principer:**
1. **Var konservativ:** Använd alltid lägre gränser i uppskattningar (t.ex. "30-50%" → fokusera på 30% som konservativ uppskattning)
2. **Var realistisk:** Basera uppskattningar på typiska värden för liknande processer, inte på idealiserade scenarier
3. **Nämn vad som saknas:** Om exakt data saknas, nämn explicit vilken data som behövs för mer precisa beräkningar
4. **Använd intervall:** Använd intervall (t.ex. "30-50%") istället för exakta siffror när data saknas
5. **Fokusera på relativa förbättringar:** Procentuella förbättringar är mer robusta än absoluta siffror när baseline-data saknas

**Med ovanstående data skulle det vara möjligt att:**
- Göra mer precisa volym-baserade beräkningar (exakt antal ansökningar som påverkas)
- Beräkna exakta tidssparande i timmar/dagar (istället för uppskattningar)
- Beräkna exakta kostnadsbesparingar i SEK (istället för FTE-värde)
- Beräkna ROI med faktiska siffror
- Jämföra med exakt baseline (istället för uppskattningar)

**Utan denna data (nuvarande situation):**
- Använd uppskattningar baserat på typiska värden för liknande processer
- Använd procentuella förbättringar (som är mer robusta än absoluta siffror)
- Fokusera på relativa förbättringar (nuvarande vs nytt system)
- **Använd konservativa uppskattningar (lägre gränser)**
- **Nämn explicit vilken data som saknas för mer precisa beräkningar**

**Exempel på kommentar i Effekt-kapitlet:**
```html
<p class="muted"><em>Notera: Beräkningarna är konservativa uppskattningar baserat på typiska värden 
för liknande processer. För mer precisa beräkningar skulle följande baseline-data behövas: 
genomsnittlig handläggningstid per ansökan, exakt manuell arbetstid per aktivitet, andel 
återkommande kunder, faktiska löner och overhead-kostnader. Med denna data skulle exakta 
tidssparande i timmar/dagar, exakta kostnadsbesparingar i SEK, och ROI kunna beräknas.</em></p>
```

## Vanliga problem och hur undvika dem

### 1. Inkonsistens i avslagsprocent

**Problem:** Olika siffror används för samma sak i olika delar av kapitlet.

**Exempel på problem:**
- Översikt säger: "5-15% avvisas vid pre-screening"
- Detaljsektion säger: "30-50% avvisas tidigt"
- Tabell säger: "30-50% avvisas tidigt"

**Lösning:**
- **Använd samma siffror för samma sak genom hela kapitlet**
- **Förtydliga vad siffrorna avser:**
  - Pre-screening (grundläggande krav): 5-15% (vanligtvis låg)
  - Totalt avslag (pre-screening + objekt + stakeholder + KALP): X% (kräver baseline-data)
- **Separera tydligt mellan olika typer av avslag**
- **Kontrollera:** Gå igenom hela kapitlet och se till att samma siffror används för samma sak

### 2. Otydliga beräkningar

**Problem:** Totalt tidssparande visas utan att visa hur det beräknas.

**Exempel på problem:**
- "Total tidssparande: 12 500-36 667 timmar/år" (hur beräknas detta?)
- "Total: 40 000 timmar/år" (var kommer detta ifrån?)

**Lösning:**
- **Dela upp beräkningen per aktivitet:**
  - "Datainsamling: 30 000 ansökningar × 15 min = 7 500 timmar/år"
  - "Pre-screening: 5 000 ansökningar × 10 min = 833 timmar/år"
  - "Total: 8 333 timmar/år ≈ ~4.6 FTE"
- **Använd listor eller tabeller** för att visa uppdelningen tydligt
- **Kontrollera:** Räkna om alla beräkningar för att säkerställa att de stämmer

### 3. Svårtolkade siffror

**Problem:** Siffror som "100 000 dagar" är svåra att tolka.

**Exempel på problem:**
- "100 000-200 000 dagar processeringstid sparas per år" (vad betyder detta i praktiken?)
- "100 000 dagar" (är detta kalenderdagar eller arbetstimmar?)

**Lösning:**
- **Gör siffror tolkningsbara:**
  - "100 000 ansökningar × 1 dag = 100 000 dagar processeringstid sparas"
  - Eller konvertera till handläggartimmar: "≈ 200 000 handläggartimmar (baserat på 2 timmar handläggartid per dag)"
  - Eller använd relativa förbättringar: "1 dag snabbare per ansökan"
- **Förtydliga enheter:** Använd "kalenderdagar" eller "arbetstimmar" där det är relevant

### 4. Dubbel räkning av kapacitetsökning

**Problem:** Olika beräkningar av kapacitetsökning kan verka motstridiga.

**Exempel på problem:**
- "40 000 timmar/år ≈ ~22 FTE" (direkt tidssparande från automatisering)
- "37.5% personalbesparing" (75 handläggare) (total kapacitetsökning)
- Läsaren förstår inte relationen mellan dessa

**Lösning:**
- **Förtydliga relationen:**
  - "Direkt tidssparande från automatisering: 22 FTE (40 000 timmar/år)"
  - "Total kapacitetsökning inklusive parallellisering: 37.5% personalbesparing (75 handläggare)"
- **Förklara skillnaden:** Direkt automatisering vs total kapacitetsökning inklusive parallellisering

### 5. Inkonsistens i "manuell arbetstid per ansökan"

**Problem:** Översikten säger "25-50 minuter per ansökan" men detaljerna visar olika tider för olika ansökningstyper.

**Exempel på problem:**
- Översikt: "25-50 minuter manuellt arbete per ansökan"
- Detaljer: Datainsamling 15 min (30% av ansökningar), Pre-screening 10 min (5% av ansökningar), KALP 15 min (60% av ansökningar), Kreditupplysning 20 min (50% av ansökningar)
- Detta är inte 25-50 minuter per ansökan totalt, utan olika tider för olika ansökningar

**Lösning:**
- **Förtydliga att det är genomsnitt eller fördelning:**
  - "Genomsnittligt 25-50 minuter mindre manuellt arbete per ansökan (varierar beroende på ansökningstyp: återkommande kunder sparar 15 min datainsamling, köpansökningar sparar 15 min KALP, etc.)"
- **Eller visa fördelning per ansökningstyp:**
  - "Återkommande kunder: 15 min datainsamling"
  - "Köpansökningar: 15 min KALP"
  - "Ansökningar som når kreditupplysning: 20 min kreditupplysning"

### 6. Lång och oöversiktlig översikt

**Problem:** Översikten är för lång och innehåller för mycket information.

**Exempel på problem:**
- Lång punkt om automatisering med mycket information som borde vara i detaljsektionen
- Läsaren förlorar översikten

**Lösning:**
- **Kortare, mer fokuserad översikt:**
  - Fokusera på 3-5 viktigaste effekterna med nyckeltal
  - Hänvisa till detaljsektioner för mer information
  - Undvik långa förklaringar i översikten
- **Strukturera översikten:**
  - Använd korta punkter med nyckeltal
  - Separera olika typer av effekter (automatisering, tidssparande, kapacitet, kundupplevelse)

### 7. Tabellens värden stämmer inte med detaljerna

**Problem:** Tabellen visar värden som inte stämmer med detaljsektionerna.

**Exempel på problem:**
- Tabell: "1.5-3.5 timmar" manuell arbetstid i nytt system
- Detaljer: Visar specifika tider per aktivitet som inte direkt motsvarar detta intervall

**Lösning:**
- **Kontrollera att tabellens värden stämmer med detaljerna:**
  - Räkna om alla värden i tabellen baserat på detaljsektionerna
  - Uppdatera tabellen om värdena inte stämmer
  - Förtydliga om tabellen visar genomsnitt eller specifika värden

## Förbättringsförslag

### 1. Lägg till volym-baserade beräkningar

**Exempel:**
```
Baserat på 100 000 ansökningar per år:
- Automatisk pre-screening avvisar ansökningar tidigt (exakt andel kräver baseline-data)
  **NOTERA:** Exakt andel avvisade ansökningar kräver baseline-data från nuvarande process. 
  Pre-screening kontrollerar grundläggande krav (ålder ≥ 18, anställningsstatus, kreditscore ≥ 300), 
  så andelen avvisade är troligen låg (t.ex. 5-15%). Använd faktisk baseline-data.
- Straight-through processing för lågriskansökningar (exakt andel kräver baseline-data) → ansökningar godkänns automatiskt
- Parallell datainsamling minskar väntetid för 100% av ansökningar
```

### 2. Lägg till tidssparande i absoluta tal

**Exempel:**
```
Tidssparande per ansökan:
- Automatisk datainsamling: 15-30 minuter manuellt arbete → 0 minuter (automatiskt)
- Automatisk pre-screening: 10-20 minuter manuellt arbete → 0 minuter (automatiskt)
- Parallell datainsamling: 2-3 dagar sekventiell process → 1 dag parallell process
- Straight-through processing: 2-3 dagar manuell granskning → 0 dagar (automatiskt)

Total tidssparande per ansökan: 25-50 minuter manuellt arbete + 1-2 dagar processeringstid
```

### 3. Lägg till kapacitetsökning

**Exempel:**
```
Kapacitetsökning per handläggare:
- Nuvarande: ~500 ansökningar per handläggare per år (100 000 / 200)
- Med automatisering: ~800-1000 ansökningar per handläggare per år
- Ökning: 60-100% mer ansökningar per handläggare

Total kapacitet:
- Nuvarande: 100 000 ansökningar/år med 200 handläggare
- Med automatisering: 160 000-200 000 ansökningar/år med samma 200 handläggare
- Eller: 100 000 ansökningar/år med 100-125 handläggare (50-37.5% personalbesparing)
```

### 4. Lägg till kostnadsbesparingar

**Exempel:**
```
Kostnadsbesparingar (baserat på genomsnittlig handläggarlön):
- Automatisk datainsamling: 15-30 min/ansökan × 100 000 ansökningar = 25 000-50 000 timmar/år
- Automatisk pre-screening: 10-20 min/ansökan × 100 000 ansökningar = 16 667-33 333 timmar/år
- Straight-through processing: 2-3 dagar × 40 000-50 000 ansökningar = 80 000-150 000 handläggardagar/år

Total kostnadsbesparing: ~120 000-230 000 handläggartimmar/år
Värde: ~60-115 FTE (Full-Time Equivalent) per år
```

### 5. Lägg till kundupplevelse-mätningar

**Exempel:**
```
Kundupplevelse-förbättringar:
- Genomsnittlig svarstid: 5-7 dagar → 1-2 dagar (60-70% snabbare)
- Proof-of-finance (Mortgage Commitment): Dagars väntetid → Minuter (95-99% snabbare)
- Erbjudande: 2-3 dagar → 1 dag (50-67% snabbare)
- Signering: 3-5 dagar → 1-2 dagar (40-60% snabbare)

Kundnöjdhet: Förväntad ökning med 20-30% baserat på snabbare svarstider
```

### 6. Lägg till jämförelse med baseline

**Exempel:**
```
Jämförelse med nuvarande process:

Nuvarande:
- Manuell datainsamling: 15-30 min/ansökan
- Manuell pre-screening: 10-20 min/ansökan
- Sekventiell processering: 2-3 dagar
- Manuell granskning: 2-3 dagar
- Total: 5-7 dagar + 25-50 minuter manuellt arbete

Med nytt system:
- Automatisk datainsamling: 0 min/ansökan (automatiskt)
- Automatisk pre-screening: 0 min/ansökan (automatiskt)
- Parallell processering: 1 dag
- Automatisk granskning (lågrisk): 0 dagar (automatiskt)
- Total: 1-2 dagar + 0 minuter manuellt arbete (för lågrisk)

Förbättring: 60-70% snabbare processering + 100% minskning av manuellt arbete (för lågrisk)
```

### 7. Lägg till kumulativa effekter

**Exempel:**
```
Kumulativa effekter när flera feature goals kombineras:

Application + Credit Evaluation + Credit Decision:
- Automatisk datainsamling + automatisk kreditevaluering + straight-through processing
- Total tidssparande: 3-5 dagar processeringstid + 40-60 minuter manuellt arbete per ansökan
- För 100 000 ansökningar: 300 000-500 000 dagar processeringstid + 66 667-100 000 timmar manuellt arbete

Mortgage Commitment (proof-of-finance):
- Automatisk kreditevaluering + automatisk godkännande
- Total tidssparande: Dagars väntetid → Minuter
- För 20 000-30 000 proof-of-finance per år: 20 000-30 000 dagar väntetid → 0 dagar
```

## Förbättrad struktur för Effekt-kapitlet

### Rekommenderad struktur (koncis - fokus på viktigaste effekterna):

**För de flesta feature goals - använd koncis struktur:**

```markdown
## Effekt

### Översikt
[Kort sammanfattning med 3-5 viktigaste effekterna med volym-baserade siffror]
[Kommentar om konservativa uppskattningar och saknad data]

### 1. Automatisering och minskad manuell hantering
[2-3 viktigaste BPMN-mekanismer med volym + tidssparande]

### 2. Snabbare processering och förbättrad kundupplevelse
[2-3 viktigaste BPMN-mekanismer med tidssparande + kundupplevelse]

### 3. Kapacitetsökning och kostnadsbesparingar
[Volym-baserade beräkningar + kapacitetsökning + FTE-värde + ROI-beräkning]

### 4. ROI, Time to Value och Riskhantering (valfritt för komplexa feature goals)
[ROI-beräkning, time to value, riskhantering, success metrics]

### Jämförelse med nuvarande process
[Kort tabell med viktigaste aspekterna: Nuvarande vs Nytt system]
```

**För komplexa feature goals - använd utökad struktur:**

```markdown
## Effekt

### Översikt
[Kort sammanfattning av totala effekter med volym-baserade siffror]
[Kommentar om konservativa uppskattningar och saknad data]

### 1. Automatisering och minskad manuell hantering
[Specifika BPMN-mekanismer + volym + tidssparande + kostnadsbesparingar]

### 2. Snabbare processering och minskad väntetid
[Specifika BPMN-mekanismer + absoluta tider + kundupplevelse]

### 3. Kapacitetsökning och skalbarhet
[Volym-baserade beräkningar + kapacitetsökning per handläggare]

### 4. Förbättrad kundupplevelse
[Svarstider + väntetider + nöjdhet - kvantifierat]

### 5. Kostnadsbesparingar
[Arbetstid i timmar/dagar + FTE-värde]

### 6. Time to Value (valfritt för komplexa feature goals)
[Fas 1 (0-3 månader), Fas 2 (3-6 månader), Fas 3 (6-12 månader)]

### 7. Success Metrics och KPI:er (valfritt för komplexa feature goals)
[Kvantitativa KPI:er (antal ansökningar/handläggare, handläggningstid, etc.) + Kvalitativa KPI:er (kundnöjdhet, kvalitet) + Målsättningar]

### 8. Kvalitativa effekter - kvantifierat (valfritt för komplexa feature goals)
[Riskminskning, compliance-förbättringar, kundnöjdhet - alla kvantifierade i MSEK eller procent]

### 9. Jämförelse med nuvarande process
[Baseline vs nytt system i tabellformat]

### 10. Kumulativa effekter (valfritt)
[När flera feature goals kombineras]
```

**Notera:** ROI-beräkningar och riskanalys görs för hela systemet i ett separat dokument, inte per feature goal.

**Riktlinjer för längd - anpassa efter komplexitet:**

**Hur avgöra komplexitet:**
- **Enkla processer:** Få aktiviteter (1-3), inga eller få call activities, enkla flöden
  - **Exempel:** appeal, object information, signing per digital document package
  - **Längd:** 100-200 ord, en lista med 2-3 viktigaste effekterna
  - **Struktur:** Ingen kategorisering, bara en kort lista
  - **Fokus:** Affärsmässigt och relevant, undvik onödiga detaljer

- **Medelkomplexa processer:** Flera aktiviteter (4-8), några call activities, parallella flöden
  - **Exempel:** application, credit decision, disbursement
  - **Längd:** 200-400 ord, 3-4 kategorier
  - **Struktur:** Koncis struktur med kategorier
  - **Fokus:** Viktigaste effekterna per kategori, volym-baserade beräkningar där relevant

- **Komplexa processer:** Många aktiviteter (9+), många call activities, komplexa flöden
  - **Exempel:** root mortgage process (om det skulle dokumenteras)
  - **Längd:** 500-800 ord, 5-7 kategorier
  - **Struktur:** Utökad struktur med många kategorier
  - **Fokus:** Detaljerade effekter per kategori, omfattande beräkningar

**Viktigt:**
- **Håll det affärsmässigt och relevant** - fokusera på effekter som ger värde, inte tekniska detaljer
- **Undvik "halv novell"** - för enkla processer, håll det kortfattat (100-200 ord)
- **Anpassa detaljnivå** - mer komplex process = mer detaljer, enklare process = färre detaljer
- **Fokusera på:** De 2-3 viktigaste effekterna för enkla processer, 3-5 viktigaste per kategori för komplexa
- **Undvik:** Repetition, för detaljerade beräkningar för enkla processer, för många kategorier

**Riktlinjer för läsbarhet och översiktlighet:**

1. **Kortare översikt:**
   - ✅ **Gör:** Kortfattad översikt med 3-5 viktigaste effekterna och nyckeltal
   - ✅ **Gör:** Hänvisa till detaljsektioner för mer information
   - ❌ **Undvik:** Långa, detaljerade förklaringar i översikten

2. **Tydlig struktur:**
   - ✅ **Gör:** Använd tydliga rubriker och underrubriker
   - ✅ **Gör:** Separera olika typer av effekter i olika sektioner
   - ✅ **Gör:** Använd listor och tabeller för att organisera information
   - ❌ **Undvik:** Långa paragrafstycken utan struktur

3. **Visuell separation:**
   - ✅ **Gör:** Använd listor för att separera olika effekter
   - ✅ **Gör:** Använd tabeller för jämförelser
   - ✅ **Gör:** Använd underrubriker för att organisera innehåll
   - ❌ **Undvik:** Långa stycken med mycket information

4. **Mindre upprepning:**
   - ✅ **Gör:** Varje effekt ska nämnas max en gång
   - ✅ **Gör:** Hänvisa till tidigare sektioner istället för att upprepa
   - ❌ **Undvik:** Upprepa samma information i flera sektioner

5. **Tydlig separation mellan olika typer av effekter:**
   - ✅ **Gör:** Separera automatisering, tidssparande, kapacitet, kostnader, kundupplevelse
   - ✅ **Gör:** Använd olika sektioner för olika typer av effekter
   - ❌ **Undvik:** Blanda olika typer av effekter i samma sektion

## Kommentar om data och beräkningar

**Viktigt att notera:**
- **Alla beräkningar ska vara konservativa:** Använd lägre gränser i intervall (t.ex. "30-50%" → fokusera på 30% som konservativ uppskattning)
- **Var realistisk:** Basera uppskattningar på typiska värden för liknande processer, inte på idealiserade scenarier
- **Nämn vad som saknas:** Om exakt data saknas, nämn explicit vilken data som behövs för mer precisa beräkningar
- **Använd intervall:** Använd intervall (t.ex. "30-50%") istället för exakta siffror när data saknas
- **Fokusera på relativa förbättringar:** Procentuella förbättringar är mer robusta än absoluta siffror när baseline-data saknas
- **Nämn explicit när siffror är uppskattningar:** Använd "uppskattat", "förväntat", "baserat på typiska värden", "konservativ uppskattning"

**Med exakt baseline-data skulle det vara möjligt att:**
- Beräkna exakta tidssparande i timmar/dagar (istället för uppskattningar)
- Beräkna exakta kostnadsbesparingar i SEK (istället för FTE-värde)
- Beräkna ROI med faktiska siffror
- Jämföra med exakt baseline (istället för uppskattningar)
- Göra mer precisa volym-baserade beräkningar (exakt antal ansökningar som påverkas)

**Utan denna data (nuvarande situation):**
- Använd konservativa uppskattningar (lägre gränser i intervall)
- Använd procentuella förbättringar (mer robusta än absoluta siffror)
- Fokusera på relativa förbättringar (nuvarande vs nytt system)
- **Nämn explicit vilken data som saknas för mer precisa beräkningar**

## Exempel på förbättrad effektbeskrivning

### Före (nuvarande):
```
Automatisk datainsamling via "Internal data gathering": Systemet hämtar automatiskt 
befintlig kunddata för alla identifierade parter (multi-instance). Detta kan minska 
handläggningstid med upp till 40% för kända kunder.
```

### Efter (förbättrad):
```
Automatisk datainsamling via "Internal data gathering" call activity (multi-instance):
Systemet hämtar automatiskt befintlig kunddata (part, engagemang, kreditinformation) 
från interna system för alla identifierade parter. 

Volym-baserad effekt:
- För återkommande kunder (ca 30-40% av ansökningar): Eliminerar 15-30 minuters 
  manuell datainmatning per ansökan
- Total tidssparande: 15-30 min × 30 000-40 000 ansökningar = 7 500-20 000 timmar/år
- Kostnadsbesparing: ~4-10 FTE per år

Processförbättring:
- Nuvarande: 15-30 minuter manuell datainmatning per ansökan
- Med nytt system: 0 minuter (automatiskt)
- Minskning: 100% av manuellt arbete för datainsamling

Kundupplevelse:
- Snabbare processstart: Omedelbar datainsamling vs 15-30 minuters väntetid
- Förbättrad noggrannhet: Automatisk datainsamling eliminerar manuella fel
```

## Uppdaterade riktlinjer för arbetsprocessen

### Lägg till i MANUAL_HTML_WORKFLOW.md:

```markdown
#### Ytterligare riktlinjer för "Effekt" (volym-baserade beräkningar)

**Baseline-data att använda:**
- Total volym: 100 000 ansökningar per år
- Antal handläggare: 200
- Genomsnittlig handläggningstid (nuvarande): 5-7 dagar
- Genomsnittlig manuell arbetstid per ansökan: 2-4 timmar

**Beräkningar att inkludera:**
1. **Volym-baserade effekter:**
   - Hur många ansökningar påverkas? (t.ex. "30 000-50 000 ansökningar per år")
   - Hur många ansökningar når inte handläggare? (t.ex. "30-50% avvisas tidigt")
   - Hur många ansökningar godkänns automatiskt? (t.ex. "40 000-50 000 straight-through")

2. **Tidssparande i absoluta tal:**
   - Minuter/timmar per ansökan (t.ex. "15-30 minuter manuellt arbete")
   - Dagar processeringstid (t.ex. "2-3 dagar → 1 dag")
   - Total tidssparande per år (t.ex. "25 000-50 000 timmar/år")

3. **Kapacitetsökning:**
   - Ansökningar per handläggare (t.ex. "500 → 800-1000 per år")
   - Total kapacitet (t.ex. "160 000-200 000 ansökningar/år med samma personal")
   - Personalbesparing (t.ex. "50-37.5% mindre personal behövs")

4. **Kostnadsbesparingar:**
   - Arbetstid i timmar/dagar (t.ex. "120 000-230 000 timmar/år")
   - FTE-värde (t.ex. "60-115 FTE per år")
   - ROI (valfritt, om data finns)

5. **Kundupplevelse:**
   - Svarstider (t.ex. "5-7 dagar → 1-2 dagar")
   - Väntetider (t.ex. "Dagars väntetid → Minuter")
   - Förväntad nöjdhetsökning (t.ex. "20-30%")

6. **Jämförelse med baseline:**
   - Tabellformat: Nuvarande vs Nytt system
   - Procentuell förbättring
   - Absoluta förbättringar

**Struktur:**
- Börja med volym-baserad översikt
- Följ med specifika BPMN-mekanismer
- Lägg till tidssparande, kapacitetsökning, kostnadsbesparingar
- Avsluta med kundupplevelse och jämförelse med baseline
```

## Exempel på komplett förbättrad Effekt-sektion

Se `EFFEKT_EXEMPEL_APPLICATION.md` för ett komplett exempel på hur 
mortgage-application-v2.html skulle kunna se ut med förbättrade effektbeskrivningar.

