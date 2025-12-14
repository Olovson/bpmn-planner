# Test: Aggregering av Effekt-data

## Syfte
Testa om aggregeringsprocessen fungerar korrekt genom att aggregera effekter från de tre förbättrade filerna:
1. `mortgage-application-v2.html` (huvudprocess)
2. `mortgage-appeal-v2.html` (subprocess)
3. `mortgage-offer-v2.html` (subprocess)

## Aggregerad sammanfattning

### Direkta effekter (kan aggregeras numeriskt)

#### 1. Automatisering och kostnadsbesparingar (från Application)
- **Automatisering (datainsamling + pre-screening):**
  - Volym: 30 000 ansökningar (återkommande kunder) + 5 000 ansökningar (avvisade vid pre-screening) = 35 000 ansökningar
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras

- **Automatisering (KALP + kreditupplysning):**
  - Volym: 60 000 ansökningar (köpansökningar) + 50 000 ansökningar (når kreditupplysning) = 110 000 ansökningar
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras

- **Kostnadsbesparingar (direkt automatisering):**
  - Volym: 100 000 ansökningar (baserat på total volym)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras
  - **Total kostnadsbesparing:** ~20 MSEK/år (≈22 FTE)

#### 2. Fler godkända ansökningar (från Appeal)
- **Fler godkända ansökningar (via accepterade överklaganden):**
  - Volym: Uppskattat 50-600 ansökningar/år (konservativ uppskattning: 50)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras
  - **Total fler godkända ansökningar:** ~50 ansökningar/år (konservativ uppskattning)

#### 3. Processeffektivitet (från Appeal)
- **Automatiserad timeout-hantering:**
  - Volym: 1 000-6 000 överklaganden/år (konservativ uppskattning: 1 000)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras

- **Automatiserad loop-mekanism:**
  - Volym: 1 000-6 000 överklaganden/år (konservativ uppskattning: 1 000)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras

#### 4. Processeffektivitet (från Offer)
- **Minskad felaktiga acceptanser:**
  - Volym: 50 000-70 000 ansökningar/år som når Offer-stadiet (konservativ uppskattning: 50 000)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras
  - **Förbättring:** 40-50% minskning (konservativ uppskattning: 40%)

- **Minskad avbrutna processer:**
  - Volym: 50 000-70 000 ansökningar/år som når Offer-stadiet (konservativ uppskattning: 50 000)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras
  - **Förbättring:** 30-40% minskning (konservativ uppskattning: 30%)

- **Minskad handläggningstid för köpekontrakt:**
  - Volym: 50 000-70 000 ansökningar/år som når Offer-stadiet (konservativ uppskattning: 50 000)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras
  - **Förbättring:** 50-60% minskning (konservativ uppskattning: 50%)

- **Minskad "zombie"-erbjudanden:**
  - Volym: 50 000-70 000 ansökningar/år som når Offer-stadiet (konservativ uppskattning: 50 000)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras
  - **Förbättring:** 90-95% minskning (konservativ uppskattning: 90%)

- **Minskad processavbrott:**
  - Volym: 50 000-70 000 ansökningar/år som når Offer-stadiet (konservativ uppskattning: 50 000)
  - Typ: Direkt, Aggregeringsbar: Ja
  - Status: ✅ Kan aggregeras
  - **Förbättring:** 40-50% minskning (konservativ uppskattning: 40%)

### Indirekta effekter (redan inkluderade i parent-processen)

#### 1. Parallellisering (från Application)
- **Parallellisering (household + stakeholder):**
  - Volym: 100 000 ansökningar
  - Typ: Indirekt
  - Redan inkluderad i parent: ✅ Ja (redan räknad i Application som total kapacitetsökning via 37.5% personalbesparing)
  - Status: ⚠️ SKA INTE aggregeras (redan inkluderad)

- **Kapacitetsökning (total inklusive parallellisering):**
  - Volym: 100 000 ansökningar
  - Typ: Indirekt
  - Redan inkluderad i parent: ✅ Ja (redan räknad i Application som 37.5% personalbesparing)
  - Status: ⚠️ SKA INTE aggregeras (redan inkluderad)

#### 2. Minskad kundservice-kontakter (från Appeal)
- **Minskad kundservice-kontakter:**
  - Volym: 5 000-15 000 automatiskt avvisade ansökningar/år (konservativ uppskattning: 5 000)
  - Typ: Indirekt
  - Aggregeringsbar: Ja
  - Redan inkluderad i parent: Nej
  - Status: ✅ Kan aggregeras (men är indirekt effekt)

### Kvalitativa effekter (kan inte aggregeras numeriskt)

#### 1. Kundupplevelse (från Application)
- **Kundupplevelse (snabbare svarstider):**
  - Volym: 100 000 ansökningar
  - Typ: Indirekt
  - Aggregeringsbar: ❌ Nej (kvalitativ effekt, kan inte aggregeras numeriskt)
  - Status: ⚠️ Kan inte aggregeras numeriskt

#### 2. Kundupplevelse (från Appeal)
- **Förbättrad kundupplevelse (möjlighet att överklaga):**
  - Volym: 5 000-15 000 automatiskt avvisade ansökningar/år (konservativ uppskattning: 5 000)
  - Typ: Indirekt
  - Aggregeringsbar: ❌ Nej (kvalitativ effekt, kan inte aggregeras numeriskt)
  - Status: ⚠️ Kan inte aggregeras numeriskt

#### 3. Kundupplevelse (från Offer)
- **Förbättrad kundupplevelse (strukturerad erbjudandepresentation):**
  - Volym: 50 000-70 000 ansökningar/år som når Offer-stadiet (konservativ uppskattning: 50 000)
  - Typ: Indirekt
  - Aggregeringsbar: ❌ Nej (kvalitativ effekt, kan inte aggregeras numeriskt)
  - Status: ⚠️ Kan inte aggregeras numeriskt

## Aggregerad Executive Summary (för hela Mortgage-processen)

### Kostnadsbesparingar
- **~20 MSEK** kostnadsbesparingar per år (från Application: direkt automatisering)
- **≈22 FTE** elimineras genom direkt automatisering (från Application)
- **37.5%** personalbesparing möjlig vid samma volym (från Application: total kapacitetsökning inklusive parallellisering)

### Processeffektivitet
- **Fler godkända ansökningar:** ~50 ansökningar/år kan godkännas efter överklagan (från Appeal)
- **Minskad felaktiga acceptanser:** 40-50% minskning för ansökningar som når Offer-stadiet (från Offer)
- **Minskad avbrutna processer:** 30-40% minskning för ansökningar som når Offer-stadiet (från Offer)
- **Minskad handläggningstid för köpekontrakt:** 50-60% minskning (från Offer)
- **Minskad "zombie"-erbjudanden:** 90-95% minskning (från Offer)
- **Minskad processavbrott:** 40-50% minskning (från Offer)
- **Automatiserad timeout-hantering:** 100% minskning av manuellt arbete (från Appeal)
- **Automatiserad loop-mekanism:** 100% minskning av manuellt arbete (från Appeal)

### Kapacitetsökning
- **60%** fler ansökningar per handläggare (500 → 800 per år) (från Application)
- **60-100%** ökad total kapacitet med samma personal (100 000 → 160 000-200 000 ansökningar/år) (från Application)

### Kundupplevelse (kvalitativt)
- **Förbättrad** kundupplevelse genom snabbare svarstider (från Application)
- **Förbättrad** kundupplevelse genom möjlighet att överklaga (från Appeal)
- **Förbättrad** kundupplevelse genom strukturerad erbjudandepresentation (från Offer)
- **20%** minskning av kundservice-kontakter relaterade till avvisningar (från Appeal)

## Analys av aggregeringsprocessen

### ✅ Fungerar bra
1. **Tydlig struktur:** Alla filer har samma struktur för Aggregeringsinformation
2. **Tydlig markering:** Direkta vs indirekta effekter är tydligt markerade
3. **Volym-information:** Exakt volym anges för varje effekt
4. **Aggregeringsbar-markering:** Tydligt markerat om effekten kan aggregeras eller inte
5. **Redan inkluderad-markering:** Tydligt markerat om effekten redan är inkluderad i parent-processen

### ⚠️ Identifierade problem
1. **Volym-överlappning:** Vissa volymer överlappar (t.ex. 100 000 ansökningar i Application vs 50 000-70 000 i Offer). Detta är korrekt eftersom Offer är en subprocess, men det kan vara förvirrande.
2. **Indirekta effekter:** Vissa indirekta effekter är markerade som "Aggregeringsbar: Ja" men är indirekta (t.ex. "Minskad kundservice-kontakter" från Appeal). Detta är korrekt, men kan vara förvirrande.
3. **Kvalitativa effekter:** Kvalitativa effekter är markerade som "Aggregeringsbar: Nej", vilket är korrekt, men de kan fortfarande nämnas i en aggregerad sammanfattning (kvalitativt).

### 💡 Förbättringsförslag
1. **Tydligare volym-hierarki:** Förtydliga att volymer i subprocesser är en delmängd av volymer i huvudprocessen
2. **Kategorisering av indirekta effekter:** Separera indirekta effekter som kan aggregeras numeriskt från de som inte kan det
3. **Kvalitativ sammanfattning:** Inkludera kvalitativa effekter i en separat sektion i den aggregerade sammanfattningen

## Slutsats

✅ **Aggregeringsprocessen fungerar som tänkt!**

Strukturen är tydlig och konsekvent, och det är möjligt att aggregera effekter från subprocesser till huvudprocessen. De identifierade problemen är mindre och kan hanteras genom tydligare dokumentation och förtydliganden.

**Rekommendation:** Fortsätt med att uppdatera resterande filer med samma struktur.

