# BPMN File Versioning Strategy - Analys och Rekommendationer

## Nuvarande Situation

### Vad vi har idag:
1. **Enkel versionshantering:**
   - `bpmn_files.previous_version_content` - sparar bara EN tidigare version
   - `bpmn_files.previous_version_meta` - sparar bara EN tidigare metadata
   - När ny version laddas upp, skrivs den gamla över

2. **Diff-spårning:**
   - `bpmn_file_diffs` tabell spårar ändringar mellan versioner
   - Identifierar added/removed/modified noder
   - Men bara jämför mot senaste versionen

3. **Artefakt-koppling:**
   - Dokumentation och tester kopplas till filnamn (`bpmn_file`, `bpmn_element_id`)
   - INGEN koppling till specifik version av BPMN-filen
   - När BPMN-fil uppdateras, kan artefakter bli föråldrade

4. **Storage-struktur:**
   - BPMN-filer sparas med filnamn (t.ex. `mortgage-se-application.bpmn`)
   - När ny version laddas upp, skrivs den gamla över
   - Dokumentation sparas i `docs/` med filnamn-baserade paths

## Problem

### 1. **Förlust av historik**
- Bara en tidigare version sparas
- Om användaren laddar upp flera versioner i rad, försvinner historiken
- Ingen möjlighet att gå tillbaka till äldre versioner

### 2. **Artefakt-föråldring**
- Dokumentation och tester är kopplade till filnamn, inte versioner
- När BPMN-fil uppdateras, kan gamla artefakter vara kopplade till fel version
- Ingen tydlig indikator på vilken version artefakten genererades från

### 3. **Diff-beräkning begränsad**
- Bara jämför mot senaste versionen
- Om användaren hoppar över versioner, försvinner diff-informationen

### 4. **Risk för dataförlust**
- Om användaren laddar upp fel version, finns ingen enkel återställning
- Manuellt redigerad dokumentation kan försvinna om BPMN-fil skrivs över

## Rekommenderad Lösning: Content-Based Versioning

### Koncept
Använd **content hash (SHA-256)** som versionsidentifierare, liknande Git. Varje unik innehåll får ett hash, och vi spårar vilken version som är "current".

### Fördelar
✅ **Immutable versions** - varje version är unik och kan inte ändras
✅ **Automatisk deduplicering** - samma innehåll = samma hash (sparar utrymme)
✅ **Full historik** - alla versioner sparas
✅ **Enkel återställning** - gå tillbaka till vilken version som helst
✅ **Tydlig artefakt-koppling** - artefakter kopplas till specifik hash-version

### Databasstruktur

#### Ny tabell: `bpmn_file_versions`
```sql
CREATE TABLE public.bpmn_file_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bpmn_file_id UUID NOT NULL REFERENCES public.bpmn_files(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- SHA-256 hash av BPMN XML-innehållet
  content TEXT NOT NULL, -- BPMN XML-innehållet
  meta JSONB NOT NULL, -- Parsed metadata
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  is_current BOOLEAN NOT NULL DEFAULT false, -- Endast en version per fil kan vara current
  version_number INTEGER, -- Sekventiellt nummer (1, 2, 3...) för enkel referens
  change_summary TEXT, -- Användarens beskrivning av ändringen (valfritt)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(bpmn_file_id, content_hash), -- Samma innehåll = samma version
  UNIQUE(bpmn_file_id, version_number) -- Sekventiellt nummer per fil
);

CREATE INDEX idx_bpmn_file_versions_file_id ON public.bpmn_file_versions(bpmn_file_id);
CREATE INDEX idx_bpmn_file_versions_hash ON public.bpmn_file_versions(content_hash);
CREATE INDEX idx_bpmn_file_versions_current ON public.bpmn_file_versions(bpmn_file_id, is_current) WHERE is_current = true;
```

#### Uppdatera `bpmn_files` tabell
```sql
ALTER TABLE public.bpmn_files 
ADD COLUMN current_version_hash TEXT, -- Hash för nuvarande version
ADD COLUMN current_version_number INTEGER, -- Sekventiellt nummer för nuvarande version
DROP COLUMN previous_version_content, -- Ersätts av bpmn_file_versions
DROP COLUMN previous_version_meta; -- Ersätts av bpmn_file_versions
```

#### Uppdatera `bpmn_file_diffs` tabell
```sql
ALTER TABLE public.bpmn_file_diffs
ADD COLUMN from_version_hash TEXT, -- Hash för versionen vi jämför från
ADD COLUMN to_version_hash TEXT NOT NULL, -- Hash för versionen vi jämför till
ADD COLUMN from_version_number INTEGER,
ADD COLUMN to_version_number INTEGER NOT NULL;
```

#### Koppla artefakter till versioner
```sql
-- Uppdatera node_test_links
ALTER TABLE public.node_test_links
ADD COLUMN bpmn_version_hash TEXT, -- Hash för BPMN-versionen när testet genererades
ADD COLUMN bpmn_version_number INTEGER;

-- Uppdatera generation_jobs
ALTER TABLE public.generation_jobs
ADD COLUMN bpmn_version_hash TEXT, -- Hash för BPMN-versionen som genererades från
ADD COLUMN bpmn_version_number INTEGER;
```

### Storage-struktur

#### BPMN-filer
```
bpmn-files/
  versions/
    {content_hash}.bpmn  -- Immutable version (delas mellan filer med samma innehåll)
  current/
    {file_name}.bpmn     -- Symlink eller referens till current version
```

**Alternativ (enklare):**
- Spara versions i databasen (TEXT/JSONB)
- Storage behåller bara current version
- Historik i databasen

### Flöde vid uppladdning

1. **Beräkna hash:**
   ```typescript
   const contentHash = await sha256(bpmnXmlContent);
   ```

2. **Kolla om version redan finns:**
   ```sql
   SELECT id FROM bpmn_file_versions 
   WHERE bpmn_file_id = ? AND content_hash = ?
   ```

3. **Om ny version:**
   - Spara i `bpmn_file_versions` med nytt `version_number`
   - Markera som `is_current = true`
   - Markera tidigare version som `is_current = false`
   - Beräkna diff mot tidigare version
   - Spara diff i `bpmn_file_diffs` med `from_version_hash` och `to_version_hash`

4. **Om samma innehåll:**
   - Inga ändringar behövs (deduplicering)
   - Eventuellt uppdatera `uploaded_at` om användaren vill

### Artefakt-koppling

#### Dokumentation
```typescript
// När dokumentation genereras
const docPath = `docs/${bpmnFileName}/${contentHash}/${elementId}.html`;

// När dokumentation läses
const currentHash = await getCurrentVersionHash(bpmnFileName);
const docPath = `docs/${bpmnFileName}/${currentHash}/${elementId}.html`;
```

#### Tester
```typescript
// När test genereras
const testPath = `tests/${bpmnFileName}/${contentHash}/${elementId}.spec.ts`;

// När test läses
const currentHash = await getCurrentVersionHash(bpmnFileName);
const testPath = `tests/${bpmnFileName}/${currentHash}/${elementId}.spec.ts`;
```

### UI/UX

#### Versionshistorik-vy
- Lista alla versioner för en fil
- Visa diff mellan versioner
- Möjlighet att "gå tillbaka" till tidigare version
- Visa vilka artefakter som är kopplade till varje version

#### Varningar
- Varna när artefakter är kopplade till äldre versioner
- Visa tydligt vilken version som är "current"
- Indikera när dokumentation behöver regenereras

#### Återställning
- "Återställ till version X" - sätt tidigare version som current
- "Jämför versioner" - visa diff mellan två versioner
- "Regenerera från version X" - generera artefakter från specifik version

## Implementeringsstrategi

### Fas 1: Grundläggande versionshantering (Låg risk)
1. Skapa `bpmn_file_versions` tabell
2. Uppdatera upload-logik för att spara versioner
3. Behåll nuvarande diff-logik (jämför mot senaste versionen)
4. **Inga breaking changes** - befintlig funktionalitet fungerar som tidigare

### Fas 2: Artefakt-versionering (Medel risk)
1. Lägg till version-hash i artefakt-paths
2. Uppdatera artefakt-generering för att spara med version-hash
3. Uppdatera artefakt-läsning för att hitta rätt version
4. **Backward compatible** - gamla artefakter fungerar fortfarande

### Fas 3: Versionshistorik-UI (Låg risk)
1. Skapa versionshistorik-sida
2. Visa diff mellan versioner
3. Möjlighet att återställa versioner
4. **Nytt funktion** - påverkar inte befintlig funktionalitet

### Fas 4: Avancerad diff (Medel risk)
1. Uppdatera diff-logik för att jämföra mellan valfria versioner
2. Visa diff mellan icke-adjacenta versioner
3. **Förbättring** - befintlig diff fungerar fortfarande

## Alternativ: Enklare lösning (Om full versionshantering är för komplext)

### Minimal versionshantering
1. **Spara flera versioner i `bpmn_file_versions`** (max 10 senaste)
2. **Behåll current version i storage** (som idag)
3. **Koppla artefakter till `uploaded_at` timestamp** istället för hash
4. **Visa varning när BPMN-fil ändrats efter artefakt-generering**

**Fördelar:**
- Enklare att implementera
- Mindre ändringar i befintlig kod
- Fortfarande möjlighet att se historik

**Nackdelar:**
- Ingen deduplicering
- Timestamps kan vara oexakta
- Svårare att jämföra versioner

## Rekommendation

**Jag rekommenderar Content-Based Versioning (Fas 1-4)** eftersom:

1. **Långsiktigt bättre** - löser problemet grundläggande
2. **Säkerhet** - ingen risk för dataförlust
3. **Skalbarhet** - fungerar även med många versioner
4. **Flexibilitet** - möjlighet att jämföra valfria versioner
5. **Deduplicering** - sparar utrymme om samma innehåll laddas upp flera gånger

**Men:** Implementera i faser för att minimera risk och göra det hanterbart.

## Nästa steg

1. **Diskutera strategi** - är Content-Based Versioning rätt väg?
2. **Prioritera faser** - vilka faser är viktigast?
3. **Skapa migration** - börja med Fas 1 (grundläggande versionshantering)
4. **Testa noggrant** - säkerställ att inga data försvinner

