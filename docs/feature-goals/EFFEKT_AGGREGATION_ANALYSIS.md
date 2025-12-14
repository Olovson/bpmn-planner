# Analys: Aggregering av Effekt-beskrivningar från subprocesser

## Syfte

Analysera hur vi kan summera effekter från flera subprocesser till en holistisk sammanfattning för huvudprocessen, och om den nuvarande strukturen ger rätt förutsättningar för detta.

## Nuvarande struktur

### Effekt-kapitlet i varje feature goal HTML-fil

**Struktur:**
1. **Executive Summary** (direktörsvänlig, kortfattad)
   - 3-4 kategorier: Kostnadsbesparingar, Kapacitetsökning, Kundupplevelse
   - Nyckeltal i fetstil
   - Inga tekniska detaljer

2. **Detaljerade sektioner** (efter Executive Summary)
   - **Kapitel 1: Automatisering och kostnadsbesparingar**
     - Tabell med kolumner: Aktivitet, Volym, Tid per ansökan, Total tidssparande/år, FTE-värde
   - **Kapitel 2: Snabbare processering och förbättrad kundupplevelse**
     - Tabell med kolumner: Aspekt, Nuvarande, Nytt system, Förbättring
   - **Kapitel 3: Kapacitetsökning**
     - Tabell med kolumner: Aspekt, Nuvarande, Nytt system, Förbättring

3. **Jämförelse med nuvarande process**
   - Tabell med kolumner: Aspekt, Nuvarande, Nytt system, Förbättring

## Processhierarki

### Exempel: Application-processen

**Huvudprocess:** `mortgage-se-application`
- Anropar subprocesser:
  - `internal-data-gathering` (multi-instance)
  - `household` (multi-instance)
  - `stakeholder` (multi-instance)
  - `object` (multi-instance)

**Varje subprocess har:**
- Egen feature goal HTML-fil
- Eget Effekt-kapitel med Executive Summary och detaljerade sektioner

## Analys: Är strukturen aggregeringsbar?

### ✅ Styrkor med nuvarande struktur

1. **Strukturerad data i tabeller:**
   - Tabeller gör det lättare att extrahera och aggregera data
   - Kolumner är konsekventa (Aktivitet, Volym, Tid, FTE-värde)
   - Numeriska värden är tydligt separerade

2. **Executive Summary med kategorier:**
   - 3-4 kategorier (Kostnadsbesparingar, Kapacitetsökning, Kundupplevelse)
   - Gör det möjligt att aggregera per kategori
   - Nyckeltal i fetstil är lätta att identifiera

3. **Konsekventa enheter:**
   - Timmar/år, FTE-värde, MSEK, procent
   - Gör det möjligt att summera värden

### ⚠️ Utmaningar med nuvarande struktur

1. **Volym-variation:**
   - Olika subprocesser påverkar olika volymer
   - T.ex. `internal-data-gathering` påverkar 30 000 ansökningar (återkommande kunder)
   - T.ex. `household` påverkar alla 100 000 ansökningar
   - **Problem:** Kan inte bara summera FTE-värden utan måste ta hänsyn till volym

2. **Dubbelräkning:**
   - Om `application` redan räknar effekter från `internal-data-gathering`, kan vi inte bara summera
   - Måste identifiera vilka effekter som redan är inkluderade i huvudprocessen

3. **Parallellisering:**
   - `household` och `stakeholder` körs parallellt
   - Effekten av parallellisering är redan räknad i `application`
   - **Problem:** Kan inte bara summera tidssparande från båda

4. **Kvalitativa effekter:**
   - Kundupplevelse, nöjdhet är svåra att aggregera
   - Kräver kvalitativ analys snarare än numerisk summering

5. **Saknad metadata:**
   - Ingen tydlig markering av vilka effekter som är "direkta" vs "indirekta"
   - Ingen markering av vilka effekter som redan är inkluderade i huvudprocessen

## Förslag på förbättringar för aggregering

### 1. Lägg till metadata i Effekt-kapitlet

**Förslag:** Lägg till en sektion med metadata för aggregering:

```html
<h3>Aggregationsmetadata</h3>
<p class="muted">Denna sektion används för automatisk aggregering av effekter från subprocesser.</p>

<table>
  <thead>
    <tr>
      <th>Kategori</th>
      <th>Direkt/Indirekt</th>
      <th>Volym</th>
      <th>Aggregeringsbar</th>
      <th>Redan inkluderad i parent</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Automatisering (datainsamling)</td>
      <td>Direkt</td>
      <td>30 000 ansökningar (återkommande kunder)</td>
      <td>Ja</td>
      <td>Nej</td>
    </tr>
    <tr>
      <td>Parallellisering (household + stakeholder)</td>
      <td>Indirekt</td>
      <td>100 000 ansökningar</td>
      <td>Ja</td>
      <td>Ja (redan räknad i application)</td>
    </tr>
  </tbody>
</table>
```

**Problem:** Detta blir mycket arbete att underhålla manuellt.

### 2. Strukturera Executive Summary för aggregering

**Förslag:** Använd strukturerad data i Executive Summary:

```html
<h3>Executive Summary</h3>
<p>Application-processen automatisering och parallellisering ger betydande affärseffekter baserat på 100 000 ansökningar per år och 200 handläggare (konservativa uppskattningar):</p>

<h4>Kostnadsbesparingar</h4>
<ul>
  <li data-aggregate="true" data-category="cost" data-value="20000000" data-unit="SEK" data-volume="100000" data-direct="true">
    <strong>~20 MSEK</strong> kostnadsbesparingar per år (≈22 FTE elimineras genom direkt automatisering)
  </li>
  <li data-aggregate="false" data-category="capacity" data-value="37.5" data-unit="percent" data-direct="false">
    <strong>37.5%</strong> personalbesparing möjlig vid samma volym (200 → 125 handläggare) - total kapacitetsökning inklusive parallellisering
  </li>
</ul>
```

**Problem:** Detta gör HTML-filerna mer komplexa och svårare att underhålla.

### 3. Skapa separat aggregeringsdokument

**Förslag:** Skapa ett separat JSON/XML-dokument med strukturerad effektdata:

```json
{
  "process_id": "mortgage-se-application",
  "effects": {
    "cost_savings": {
      "direct": {
        "automation": {
          "value": 20000000,
          "unit": "SEK",
          "volume": 100000,
          "ftes": 22,
          "aggregatable": true,
          "included_in_parent": false
        }
      },
      "indirect": {
        "parallelization": {
          "value": 0,
          "unit": "SEK",
          "volume": 100000,
          "aggregatable": false,
          "included_in_parent": true,
          "note": "Redan räknad i application som total kapacitetsökning"
        }
      }
    },
    "capacity_increase": {
      "applications_per_caseworker": {
        "current": 500,
        "new": 800,
        "improvement_percent": 60,
        "aggregatable": true
      }
    },
    "customer_experience": {
      "response_time": {
        "current": "5-7 days",
        "new": "1-2 days",
        "improvement_percent": 60,
        "aggregatable": false,
        "note": "Kvalitativ effekt, kan inte aggregeras numeriskt"
      }
    }
  }
}
```

**Fördelar:**
- Strukturerad data som är lätt att aggregera
- Separerad från presentation (HTML)
- Kan valideras och aggregeras automatiskt

**Nackdelar:**
- Ytterligare fil att underhålla
- Risk för att data och HTML går isär

### 4. Förbättra nuvarande struktur (REKOMMENDERAT)

**Förslag:** Behåll nuvarande struktur men gör den mer aggregeringsbar genom:

1. **Konsekvent volym-referens:**
   - Alltid ange volym i Executive Summary
   - T.ex. "baserat på 100 000 ansökningar per år"
   - Gör det tydligt vilken volym som används

2. **Tydlig markering av direkta vs indirekta effekter:**
   - I Executive Summary: "≈22 FTE elimineras genom direkt automatisering"
   - I Executive Summary: "37.5% personalbesparing - total kapacitetsökning inklusive parallellisering"
   - Gör det tydligt vilka effekter som är direkta (kan aggregeras) vs indirekta (redan inkluderade)

3. **Strukturera tabeller för aggregering:**
   - Behåll nuvarande tabellstruktur
   - Se till att volym alltid är en kolumn
   - Se till att FTE-värde alltid är en kolumn
   - Gör det möjligt att extrahera och aggregera data

4. **Lägg till "Aggregeringsnotering" i varje sektion:**
   - Kort notering om vilka effekter som kan aggregeras
   - T.ex. "Denna effekt kan aggregeras till huvudprocessen"
   - T.ex. "Denna effekt är redan inkluderad i huvudprocessen"

## Rekommenderad approach

### Steg 1: Förbättra nuvarande struktur

**Lägg till i varje Effekt-kapitel:**

```html
<h3>Aggregeringsinformation</h3>
<p class="muted">Denna information används för att aggregera effekter till huvudprocessen.</p>

<table>
  <thead>
    <tr>
      <th>Effekt</th>
      <th>Typ</th>
      <th>Volym</th>
      <th>Aggregeringsbar</th>
      <th>Redan inkluderad i parent</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Automatisering (datainsamling + pre-screening)</td>
      <td>Direkt</td>
      <td>30 000 ansökningar (återkommande kunder) + 5 000 ansökningar (avvisade)</td>
      <td>Ja</td>
      <td>Nej</td>
    </tr>
    <tr>
      <td>Parallellisering (household + stakeholder)</td>
      <td>Indirekt</td>
      <td>100 000 ansökningar</td>
      <td>Ja</td>
      <td>Ja (redan räknad i application som total kapacitetsökning)</td>
    </tr>
  </tbody>
</table>
```

### Steg 2: Skapa aggregeringsscript

**Skapa ett script som:**
1. Läser alla feature goal HTML-filer för subprocesser
2. Extraherar effektdata från tabeller
3. Aggregerar baserat på volym och typ
4. Genererar holistisk sammanfattning för huvudprocessen

**Exempel på aggregeringslogik:**

```typescript
interface EffectData {
  category: 'cost' | 'capacity' | 'customer_experience';
  type: 'direct' | 'indirect';
  value: number;
  unit: string;
  volume: number;
  aggregatable: boolean;
  includedInParent: boolean;
}

function aggregateEffects(subprocessEffects: EffectData[]): EffectData[] {
  // Filtrera bort effekter som redan är inkluderade i parent
  const directEffects = subprocessEffects.filter(
    e => e.aggregatable && !e.includedInParent && e.type === 'direct'
  );
  
  // Summera direkta effekter med samma kategori och enhet
  const aggregated = groupBy(directEffects, ['category', 'unit'])
    .map(group => ({
      ...group[0],
      value: sum(group.map(e => e.value)),
      volume: max(group.map(e => e.volume)), // Använd max volym
    }));
  
  return aggregated;
}
```

### Steg 3: Generera holistisk sammanfattning

**Skapa ett nytt kapitel i huvudprocessens Effekt-kapitel:**

```html
<h3>Holistisk sammanfattning (alla subprocesser)</h3>
<p>Denna sektion summerar effekter från alla subprocesser i Application-processen:</p>

<h4>Aggregerade kostnadsbesparingar</h4>
<table>
  <thead>
    <tr>
      <th>Subprocess</th>
      <th>Direkt tidssparande/år</th>
      <th>FTE-värde</th>
      <th>Kostnadsbesparing/år</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Internal data gathering</td>
      <td>8 333 timmar/år</td>
      <td>~4.6 FTE</td>
      <td>~4.1 MSEK</td>
    </tr>
    <tr>
      <td>Household</td>
      <td>X timmar/år</td>
      <td>~Y FTE</td>
      <td>~Z MSEK</td>
    </tr>
    <tr>
      <td><strong>Total (direkta effekter)</strong></td>
      <td><strong>X timmar/år</strong></td>
      <td><strong>~Y FTE</strong></td>
      <td><strong>~Z MSEK</strong></td>
    </tr>
  </tbody>
</table>

<p class="muted"><strong>Notera:</strong> Parallellisering och andra indirekta effekter är redan inkluderade i Application-processens totala kapacitetsökning (37.5% personalbesparing).</p>
```

## Observation: Inkonsistent struktur mellan huvudprocesser och subprocesser

### Problem identifierat

**Huvudprocesser (t.ex. `mortgage-application-v2.html`):**
- ✅ Executive Summary med strukturerade kategorier
- ✅ Tabeller för beräkningar (OBLIGATORISKT)
- ✅ Tydliga nyckeltal (MSEK, FTE, procent)
- ✅ Volym-baserade beräkningar

**Subprocesser (t.ex. `mortgage-se-internal-data-gathering-v2.html`):**
- ❌ Ingen Executive Summary
- ❌ Inga tabeller för beräkningar
- ❌ Textbaserade listor med kvalitativa beskrivningar
- ❌ Procentuella förbättringar (80-90%, 40-50%) men inga absoluta värden
- ❌ Ingen volym-information

**Konsekvens:**
- Det är omöjligt att aggregera effekter från subprocesser till huvudprocessen
- Subprocesser saknar strukturerad data som kan extraheras
- Ingen konsekvent struktur gör aggregering mycket svårt

## Slutsats

### ❌ Nuvarande struktur är INTE aggregeringsbar

**Vad som fungerar:**
- Tabeller i huvudprocesser gör det möjligt att extrahera strukturerad data
- Executive Summary med kategorier gör det möjligt att aggregera per kategori
- Konsekventa enheter (timmar, FTE, MSEK) gör det möjligt att summera

**Vad som saknas:**
- **KRITISKT:** Subprocesser har inte samma struktur som huvudprocesser
- **KRITISKT:** Subprocesser saknar tabeller och strukturerad data
- **KRITISKT:** Subprocesser saknar volym-information och absoluta värden
- Tydlig markering av direkta vs indirekta effekter
- Tydlig markering av vilka effekter som redan är inkluderade i huvudprocessen
- Metadata för aggregering

### Rekommendation

**KRITISKT:** Innan aggregering kan göras måste alla subprocesser uppdateras till samma struktur som huvudprocesser.

1. **Kortsiktigt (OBLIGATORISKT):**
   - Uppdatera ALLA subprocesser till samma struktur som huvudprocesser
   - Lägg till Executive Summary med kategorier (Kostnadsbesparingar, Kapacitetsökning, Kundupplevelse)
   - Lägg till tabeller för beräkningar (OBLIGATORISKT)
   - Lägg till volym-information och absoluta värden
   - Lägg till "Aggregeringsinformation"-sektion i varje Effekt-kapitel

2. **Medellång sikt:**
   - Skapa aggregeringsscript som extraherar data från tabeller
   - Validera att alla subprocesser har rätt struktur innan aggregering
   - Testa aggregering på Application-processen med dess subprocesser

3. **Långsiktigt:**
   - Överväg strukturerad dataformat (JSON/XML) för effekter
   - Automatisera aggregering som del av dokumentationsgenerering

### Nästa steg

1. **Uppdatera arbetsprocessen** för att inkludera:
   - Samma struktur för ALLA feature goals (huvudprocesser OCH subprocesser)
   - "Aggregeringsinformation"-sektion i varje Effekt-kapitel
   - Tydlig markering av direkta vs indirekta effekter

2. **Uppdatera alla subprocesser** till samma struktur:
   - Executive Summary med kategorier
   - Tabeller för beräkningar
   - Volym-information och absoluta värden

3. **Skapa aggregeringsscript:**
   - Extrahera data från tabeller
   - Validera struktur innan aggregering
   - Aggregera baserat på volym och typ

4. **Testa aggregering:**
   - Testa på Application-processen med dess subprocesser
   - Generera holistisk sammanfattning för huvudprocessen
   - Validera att aggregerade värden stämmer

## Ytterligare överväganden

### Volym-hantering vid aggregering

**Problem:**
- Olika subprocesser påverkar olika volymer
- T.ex. `internal-data-gathering` påverkar 30 000 ansökningar (återkommande kunder)
- T.ex. `household` påverkar alla 100 000 ansökningar

**Lösning:**
- Använd max volym för aggregering (100 000 ansökningar)
- Eller aggregera per volym-segment (återkommande kunder, köpansökningar, etc.)
- Tydliggör i aggregerad sammanfattning vilken volym som används

### Dubbelräkning

**Problem:**
- Om `application` redan räknar effekter från `internal-data-gathering`, kan vi inte bara summera
- Parallellisering är redan räknad i `application`

**Lösning:**
- Använd "Aggregeringsinformation"-sektionen för att markera vilka effekter som redan är inkluderade
- Filtrera bort dessa vid aggregering
- Tydliggör i aggregerad sammanfattning vilka effekter som är direkta vs indirekta

### Kvalitativa effekter

**Problem:**
- Kundupplevelse, nöjdhet är svåra att aggregera numeriskt

**Lösning:**
- Behåll kvalitativa effekter som text i aggregerad sammanfattning
- Eller använd genomsnitt/median för procentuella förbättringar
- Tydliggör att dessa är kvalitativa uppskattningar

