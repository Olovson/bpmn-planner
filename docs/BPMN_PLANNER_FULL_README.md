# 🚀 BPMN Planner – Full README

_BPMN Planner_ är ett verktyg för att ta **BPMN-/DMN-filer** för en komplex kreditprocess (t.ex. bolån), bygga en **deterministisk processmodell** över många filer, och sedan generera:

- 🌳 En **rekursiv Process Tree-modell** som är single source of truth  
- 📘 **Dokumentation** per nod (process, subprocess, task)  
- 🧪 **Testskript** och **testscenarion**  
- 📋 **DoR/DoD**, ledger/registry och projektplaneringsunderlag  

Allt detta hänger ihop genom en enda intern modell: `ProcessTreeNode`.

> Den här filen är en _full_ README / Solution Architecture för projektet.  
> Den kompletterar och konsoliderar tidigare README + arkitekturanteckningar.

---

## 1. Översikt

### 1.1 Problem som BPMN Planner löser

I större kreditprocesser (t.ex. bolån) där processen är:

- uppdelad över **många BPMN-filer**
- full av **subprocesser / callActivities**
- beroende av **sekvensflöden** (från vänster till höger) för att vara begripliga
- kopplad till en massor av kringmaterial: dokumentation, testfall, regler, DoR/DoD, projektplaner.

Det som ofta saknas är:

- en **sammanhängande modell** över alla filer  
- en **tydlig hierarki**: vad kallar vad, i vilken ordning, på vilken nivå  
- en koppling mellan **processmodellen** och alla hjälpartefakter (docs, tester, scenarios, DoR/DoD, mm).

_BPMN Planner_ bygger den här sammanhängande modellen och använder den som **enda sanning** för:

- Process Explorer (UI)  
- dokumentationsgenerator  
- testgenerator  
- registry/ledger  
- DoR/DoD  
- projektplanering  

---

### 1.2 Hög nivå – arkitektur

Den logiska arkitekturen kan beskrivas så här:

```text
BPMN-filer (.bpmn, .dmn) + bpmn-map.json
                │
                ▼
        [Parser & Loader Layer]
                │
                ▼
        [ProcessGraph (global graf)]
                │
                ▼
     [ProcessTree (rekursiv hierarki)]
                │
                ├──> Process Explorer (UI)
                ├──> Dokumentation (docs)
                ├──> Testskript & scenarier
                ├──> DoR/DoD
                ├──> Ledger/Registry
                └──> Projektplanering
```

Kortfattat:

- **Parser & Loader Layer** läser alla BPMN/DMN-filer + `bpmn-map.json`.  
- **ProcessGraph** är en rik graf över alla noder (process, callActivity, tasks, sequence flows, subprocess-länkar, cykler, missing deps, m.m.).  
- **ProcessTree** är en rekursiv, sekvensordnad vy över processen, byggd direkt från grafen.  
- Alla produkter (UI, dokument, tester, projektplan) genereras från **ProcessTree**.

---

## 2. Kärnmodell: Process Tree

### 2.1 En komplett Process Tree-modell

Den centrala modellen är `ProcessTreeNode`. En komplett Process Tree-modell har följande egenskaper:

1. **Rekursiv hierarki**  
   Innehåller alla processer, callActivities och tasks från alla BPMN-filer, organiserade i en rekursiv hierarki där varje callActivity expanderas till sin subprocess.

2. **Sekvensordning**  
   Varje nod har en tydlig position i sekvensordningen (`orderIndex`, `branchId`, `scenarioPath`) som reflekterar BPMN sequence flows över alla filer.

3. **Filinformation**  
   Varje nod vet vilken BPMN-fil den kommer från (`bpmnFile`, `bpmnElementId`), vilket är kritiskt för artefaktgenerering, navigering och traceability.

4. **Single Source of Truth**  
   En enda datastruktur (`ProcessTreeNode`) används av alla komponenter:
   - Process Explorer
   - Dokumentation
   - Testgenerering
   - Ledger/registry
   - DoR/DoD
   - Projektplanering

### 2.2 Tekniska krav på modellen

För att modellen ska vara användbar och stabil ställs följande krav:

- **Determinism**  
  Två körningar med samma input ska ge samma output. Inga slumpiga matchningar eller icke-deterministiska LLM-val i själva processmodellen.

- **Konsistens**  
  Alla komponenter använder samma modell, så det finns ingen “drift” mellan UI, docs, tests, registry etc.

- **Skalbarhet**  
  Systemet ska kunna hantera hundratals BPMN-filer och tusentals noder utan att tappa prestanda eller överblick.

- **Robusthet**  
  Systemet ska hantera:
  - saknade filer  
  - cykler (direkt/indirekt rekursion)  
  - osäkra matchningar  
  …utan att krascha. Det ska istället generera tydlig diagnostik.

---

### 2.3 Vad måste vara sant för att appen ska fungera

#### Process Explorer (UI)

Process Explorer måste kunna:

- visa **en komplett hierarki** från root till löv-noder
- navigera mellan filer och subprocesser när användaren klickar på en callActivity
- visa **sekvensordning** (t.ex. via `orderIndex`) så att användaren förstår i vilken ordning noder körs
- hantera saknade subprocesser med **varningar** (diagnostik), inte krascher

#### Dokumentation

Dokumentationslagret måste:

- generera dokumentation som följer **hierarkin** (t.ex. _Feature Goals → Epics → Detaljerade steg_)
- inkludera **sekvensordning** (t.ex. “Steg 1: Application, Steg 2: Credit Evaluation”)
- kunna länka till rätt:
  - BPMN-filer
  - BPMN-element (ID)
  - genererade docs/tester för respektive nod

#### Testgenerering

Testlagret måste:

- generera tester med **hierarkisk struktur** (nested `describe`-block) som speglar ProcessTree
- använda **sekvensordning** för att generera test-scenarion i rätt ordning
- spåra exakt **vilken fil och element** varje test kommer från

#### Ledger/Registry

Registry/ledger måste:

- spåra alla noder (process, subprocess, tasks) och deras status
- validera att alla noder har korrekt metadata (fil, element, ordning, artifacts)
- fungera som “inventarielista” över hela kreditprocessen

#### DoR/DoD

DoR/DoD måste:

- genereras baserat på hierarkin och sekvensordningen  
- kunna spåra:
  - vilka noder som är klara (DoD uppfylld)
  - vilka som ännu inte är redo (DoR ej uppfylld)

#### Projektplanering

Projektplaneringslagret måste kunna:

- använda sekvensordning för att skapa **projektplaner** (t.ex. Gantt-liknande vyer)
- identifiera **kritiska vägar** (längsta sekvens av beroende noder)
- tydliggöra beroenden mellan subprocesser och tasks

---

## 3. Multi-fil BPMN, bpmn-map och ProcessGraph

### 3.1 Multi-fil BPMN-struktur

Kreditprocessen (t.ex. Mortgage) är uppdelad i:

- en **rot-BPMN-fil** (`mortgage.bpmn`)
- flera **subprocess-filer**:
  - `mortgage-se-application.bpmn`
  - `mortgage-se-object-information.bpmn`
  - `mortgage-se-signing.bpmn`
  - `mortgage-se-disbursement.bpmn`
  - osv.

`mortgage.bpmn` innehåller callActivities som pekar på dessa subprocesser. Varje subprocess-fil kan i sin tur innehålla fler callActivities som pekar vidare – det bygger upp en djup rekursiv struktur.

Processen är **logiskt linjär** (från vänster till höger i tid), men:

- kan förgrena sig (gateways, branches)
- kan ha parallella flöden
- kan innehålla loops/rekursion

All den här strukturen behöver:

- **rekonstrueras deterministiskt**  
- **representeras i en graf** innan den omvandlas till ett träd.

---

### 3.2 bpmn-map.json – explicit länkkarta

För att göra matchningen mellan callActivities och BPMN-filer deterministisk används:

- `bpmn-map.json` som explicit anger:
  - vilken BPMN-fil som är root-process
  - vilken callActivity i vilken fil som hör ihop med vilken subprocess-fil

Exempel (konceptuellt):

```json
{
  "orchestration": {
    "root_process": "mortgage.bpmn"
  },
  "processes": [
    {
      "id": "mortgage",
      "bpmn_file": "mortgage.bpmn",
      "process_id": "Mortgage",
      "call_activities": [
        {
          "bpmn_id": "Application",
          "subprocess_bpmn_file": "mortgage-se-application.bpmn"
        }
      ]
    }
  ]
}
```

`bpmn-map.json` är **primär källa** för hur filer hänger ihop. Fuzzy matching (t.ex. på namn) kan finnas som fallback, men inte som primär lösning.

---

### 3.3 ProcessGraph – global BPMN-graf

Intern representation:

- varje process, callActivity och task blir en **node** i `ProcessGraph`
- varje subprocess-länk (callActivity → process) blir en **subprocess edge**
- varje BPMN sequence flow blir en **sequence edge**

`ProcessGraph` innehåller också:

- cykler (CycleInfo)
- missing dependencies (saknade subprocesser eller filer)
- roots (möjliga root-processer)

Det är från grafen vi sedan bygger ProcessTree.

---

## 4. Artefakter per nod (docs, test, scenarion, DoR/DoD)

En central del av BPMN Planner är att varje nod i modellen (inte bara processen som helhet) får sin egen uppsättning artefakter.

### 4.1 Nivå: nodtyper

Följande nodtyper får artefakter:

- **Process**
- **Subprocess / CallActivity** (behandlas likvärdigt i vår app)
- **UserTask**
- **ServiceTask**
- **BusinessRuleTask**

### 4.2 NodeArtifact-modellen

Varje nod kan ha 0..N kopplade artefakter:

```ts
interface NodeArtifact {
  kind: 'doc' | 'test' | 'scenario' | 'dor' | 'dod' | 'custom';
  id: string;
  label?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}
```

Artefakter kopplas via:

```ts
type ArtifactBuilder = (bpmnFile: string, bpmnElementId?: string) => NodeArtifact[];
```

`artifactBuilder` anropas:

- när ProcessTree byggs
- när edge-functions (`generate-artifacts`) körs
- när generatorer vill uppdatera eller nygenerera artefakter

### 4.3 Dokumentation per nod

Varje nod får en dokumentationsfil som bl.a. beskriver:

- vad noden gör (business- och teknikperspektiv)
- inputs/outputs
- regler och beslutslogik
- externa system / integrationer
- beroenden upp och ned i hierarkin

Dokumentationen genereras via tre motorer:

1. **ChatGPT**  
   - rik, naturlig text  
   - bra på att syntetisera över hela ProcessTree

2. **Lokal fallback (regler/mallar)**  
   - används när LLM inte kan eller bör ta beslut  
   - deterministiskt, reproducerbart  
   - bygger på enkla mallar + nodmetadata

3. **OLAMA (lokal LLM)**  
   - privat/on-prem/offline  
   - samma input/output-kontrakt som för ChatGPT  
   - kan användas i CI eller i miljöer utan extern nätåtkomst

Det innebär att du alltid kan:

- generera dokumentation  
- reproducera den  
- uppdatera den när BPMN ändras  

…utan att vara låst till en enskild LLM-leverantör.

---

### 4.4 Testskript per nod

Varje nod får ett eller flera **testskript** som genereras från ProcessTree:

- **Process / Subprocess**:
  - “describe”-block för hela delprocessen
  - testfall för dess olika paths (scenarioPath)

- **UserTask / ServiceTask / BusinessRuleTask**:
  - specifika testfall för den uppgiften eller regeln
  - validering av inputs/outputs
  - edge cases & felhantering

Testskript genereras av samma tre motorer (ChatGPT, fallback, OLAMA) men är alltid:

- strukturerade enligt ProcessTree
- spårbara tillbaka till BPMN-element och fil
- körbara (eller nära körbara) efter viss manuell/automatisk wiring

---

### 4.5 Testscenarion per nod / gren

Testscenarier bygger på:

- `orderIndex`  
- `branchId`  
- `scenarioPath`  

och beskriver:

- **vilken väg** genom kreditprocessen som ett visst scenario representerar  
- **vilka noder** som ingår  
- **vilken sekvens** de ska ske i  

Scenarion används av:

- testgeneratorn (för ATT/BDD-liknande flöden)
- dokumentation (för processbeskrivningar)
- projektplanering (för att se kritiska vägar)
- ledger/registry (för att följa upp vilka scenarion som är implementerade/testade)

---

### 4.6 DoR/DoD per nod

DoR (Definition of Ready) och DoD (Definition of Done):

- genereras från nodens position i trädet  
- använder hierarki + sekvensordning för att:

  - definiera vad som måste vara sant före en nod kan implementeras/testas (DoR)  
  - definiera vad som måste vara uppfyllt för att en nod är färdig (DoD)  

Även detta kopplas som `NodeArtifact(kind: 'dor' | 'dod', ...)`.

---

## 5. Komponenter i appen

### 5.1 Process Explorer

UI-komponenten som:

- visar ProcessTree  
- låter användaren expandera/collapsa subprocesser  
- navigera genom kreditprocessens hierarki  
- se artifacts (docs/tests/scenarion/DoR/DoD) per nod  
- se diagnostik (missing subprocess, cycles, mismatch, etc.)

### 5.2 Dokumentationsvy

En vy (eller flera):

- som visar genererade texter per nod  
- med länkar tillbaka till BPMN-element  
- med möjlighet till regenerering (t.ex. byta LLM, eller uppdatera mallar)

### 5.3 Test- & Scenariovy

- lista över testfall per nod/scenario  
- koppling till faktiska testfiler  
- status: genererad, uppdaterad, körd, passerad/failed  

### 5.4 Registry / Ledger

- tabell över alla noder  
- länkar till artifacts  
- status per nod (design, implementering, test, produktionsstatus)  
- underlag för governance och spårbarhet

### 5.5 Debug- & utvecklarvyer

(specat i senare faser, men konceptuellt:)

- ProcessGraph Debug UI  
- ProcessTree Debug UI  
- CLI-kommandon (t.ex. `graph:inspect`)  
- logg/insyn i cycles, missing deps, matchningar

---

## 6. LLM-strategi (ChatGPT, fallback, OLAMA)

BPMN Planner är designad för att inte vara hårt kopplad till en enda LLM. I stället:

- definieras **kontrakt** för vilken input/output artefaktgeneratorerna använder  
- olika motorer kan pluggas in:
  - ChatGPT (moln)
  - OLAMA (lokal)
  - fallback-mallar

Principer:

- **Modellen (ProcessTree) är alltid deterministisk**  
- **LLM:er generar endast artefakter**, aldrig själva processmodellen  
- **Fallback** finns alltid, så systemet fungerar även utan LLM

---

## 7. Sammanfattning

BPMN Planner:

- tar **multi-fil BPMN/DMN-modeller** för komplexa processer (som bolån)  
- bygger en **ProcessGraph** som täcker alla processer, callActivities, tasks, flöden och kopplingar  
- bygger en **ProcessTree** som är den enda sanningen för hierarki, ordning, filer och noder  
- använder ProcessTree för att generera:
  - dokumentation
  - testskript
  - testscenarion
  - DoR/DoD
  - ledger/registry
  - projektplaneringsunderlag  
- är **LLM-agnostiskt**: fungerar med ChatGPT, OLAMA eller utan LLM (fallback)  
- är designat för **determinism, spårbarhet, skalbarhet och robusthet**.

Det här dokumentet ska ge en samlad förståelse för **vad** appen gör, **hur** den är uppbyggd, och **varför** ProcessTree-modellen och per-nod-artefakter är hjärtat i hela lösningen.
