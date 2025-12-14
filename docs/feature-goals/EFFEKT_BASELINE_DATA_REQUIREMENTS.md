# Baseline-data krav för Effekt-kapitlet

## Kritiskt viktigt

**BPMN-filerna visar PROCESSEN, inte faktiska avslagsprocent eller effekter.**

BPMN-filerna beskriver:
- Vilka steg som finns i processen
- Vilka gateways som avgör beslut
- Vilka error events som kan triggas
- Vilka call activities och subprocesser som anropas

BPMN-filerna visar INTE:
- Hur många ansökningar som faktiskt avvisas vid varje steg
- Vilka faktiska effekter som realiseras
- Baseline-data från nuvarande process

**Alla siffror i Effekt-kapitlet är EXEMPEL/UPPSKATTNINGAR tills faktisk baseline-data finns från banken.**

## Vad som behövs för realistiska effektberäkningar

### 1. Avslagsprocent per steg (från nuvarande process)

För varje steg i BPMN-processen behövs data om hur många ansökningar som faktiskt avvisas:

**Exempel för Application-processen:**
- **Pre-screening (Internal data gathering → Screen party):** 
  - Hur många ansökningar avvisas p.g.a. grundläggande krav (ålder < 18, ingen anställning, kreditscore < 300)?
  - **Kräver baseline-data:** Andel ansökningar som avvisas vid pre-screening i nuvarande process
  - **BPMN visar:** Att pre-screening finns och kan avvisa, men INTE hur många som faktiskt avvisas

- **Object validation:**
  - Hur många ansökningar avvisas p.g.a. objekt som inte uppfyller krav?
  - **Kräver baseline-data:** Andel ansökningar som avvisas vid objekt-validering i nuvarande process

- **Stakeholder validation:**
  - Hur många ansökningar avvisas p.g.a. stakeholders som inte uppfyller krav?
  - **Kräver baseline-data:** Andel ansökningar som avvisas vid stakeholder-validering i nuvarande process

- **KALP screening:**
  - Hur många ansökningar avvisas p.g.a. KALP-resultat?
  - **Kräver baseline-data:** Andel ansökningar som avvisas vid KALP-screening i nuvarande process

### 2. Tidsdata per aktivitet (från nuvarande process)

För varje aktivitet i BPMN-processen behövs data om faktisk tid:

- **Datainsamling:** Genomsnittlig tid för manuell datainmatning per ansökan
- **Pre-screening:** Genomsnittlig tid för manuell initial validering per ansökan
- **KALP-beräkning:** Genomsnittlig tid för manuell KALP-beräkning per ansökan
- **Kreditupplysning:** Genomsnittlig tid för manuell kreditupplysning per ansökan
- **Total handläggningstid:** Genomsnittlig total tid från ansökan till beslut

### 3. Volymdata

- **Total volym:** Antal ansökningar per år (nuvarande: 100 000)
- **Andel återkommande kunder:** Hur många procent av ansökningar är från återkommande kunder?
- **Andel lågrisk vs högrisk:** Hur många procent av ansökningar är lågrisk vs högrisk?
- **Andel per ansökningstyp:** Hur många procent är köp, flytt, omlåning?

### 4. Kostnadsdata

- **Handläggarlöner:** Genomsnittlig lön per handläggare (SEK/år)
- **Overhead-kostnader:** Overhead-kostnader per handläggare (SEK/år)
- **Kostnad per ansökan:** Total kostnad per ansökan i nuvarande process (SEK)

### 5. Kvalitetsdata

- **Kundnöjdhet:** Nuvarande kundnöjdhet (%)
- **Handläggarnöjdhet:** Nuvarande handläggarnöjdhet (%)
- **Kvalitet på beslut:** Andel felaktiga beslut i nuvarande process (%)

## Hur få baseline-data

1. **Analysera nuvarande process:**
   - Gå igenom befintliga system och processer
   - Mät faktiska tider och volymer
   - Analysera historisk data om avslag

2. **Intervjua handläggare:**
   - Fråga om genomsnittlig tid per aktivitet
   - Fråga om typiska avslagsorsaker
   - Fråga om volymer och frekvens

3. **Analysera historisk data:**
   - Gå igenom tidigare ansökningar
   - Analysera avslagsprocent per steg
   - Analysera tidsdata från befintliga system

4. **Använd branschdata som referens:**
   - Om exakt data saknas, använd branschdata som referens
   - Men nämn explicit att det är branschdata, inte faktisk baseline-data
   - Använd konservativa värden (lägre gränser)

## Exempel på hur BPMN-filer används vs baseline-data

**BPMN-filen visar:**
```
Internal data gathering → Screen party → Party rejected? gateway
  - Om "Yes" → Party rejected error event
  - Om "No" → Fetch engagements
```

**Baseline-data visar:**
```
- 5% av ansökningar avvisas vid pre-screening (inte 30-50%!)
- Genomsnittlig tid för manuell pre-screening: 12 minuter per ansökan
- Genomsnittlig tid för manuell datainsamling: 20 minuter per ansökan för återkommande kunder
```

**Effekt-beräkning (med baseline-data):**
```
- 5% av ansökningar (5 000 per år) avvisas tidigt via automatisk pre-screening
- Eliminerar 12 minuters manuellt arbete per avvisad ansökan
- Total tidssparande: 12 min × 5 000 ansökningar = 1 000 timmar/år ≈ 0.6 FTE
```

## Rekommendation

**Tills baseline-data finns:**
1. Beskriv MÖJLIGA effekter baserat på BPMN-processen
2. Använd generiska exempel (inte specifika siffror)
3. Nämn explicit att baseline-data krävs för realistiska beräkningar
4. Undvik att använda specifika siffror (t.ex. "30-50% avslag") utan baseline-data

**När baseline-data finns:**
1. Uppdatera Effekt-kapitlet med faktiska siffror
2. Använd konservativa värden (lägre gränser i intervall)
3. Nämn explicit när siffror är uppskattningar vs faktiska data

