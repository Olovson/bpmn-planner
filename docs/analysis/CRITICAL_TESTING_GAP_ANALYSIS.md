# KRITISK ANALYS: Komplett Testmiljö för Hela Projektet

## Datum: 2025-12-27

> **Se även:** [`HOW_OTHERS_HANDLE_TEST_ENVIRONMENTS.md`](./HOW_OTHERS_HANDLE_TEST_ENVIRONMENTS.md) för hur andra utvecklare löser detta problem.

## Problembeskrivning

**Det kritiska problemet:** Vi kan INTE testa den mest viktiga funktionaliteten i appen:
1. ✅ Filuppladdning (delvis testbart)
2. ❌ Korrekt hierarki-byggnad (INTE testbart)
3. ❌ Korrekt fil-lagring (INTE testbart)
4. ❌ Dokumentationsgenerering baserat på hierarki (INTE testbart)
5. ❌ Visning av dokumentation i appen (INTE testbart)

**Konsekvens:** Appen är instabil eftersom vi inte kan verifiera att ändringar faktiskt fungerar.

**Tidigare problem:** Tester skrev över produktionsfiler och korrumperade kritisk funktionalitet.

**Det verkliga problemet:** Det handlar INTE bara om Supabase - det handlar om en komplett testmiljö för hela projektet där vi kan:
- Ändra kod
- Testa ändringarna
- Validera att de fungerar
- INTE merga förrän vi är säkra

## Nuvarande Situation

### Vad som ÄR testbart (säkert)

1. **Unit-tester**
   - ✅ Testar isolerade funktioner
   - ✅ Använder temporära kataloger
   - ✅ Ingen risk för produktionsdata

2. **Integrationstester (delvis)**
   - ✅ Testar genereringslogik (mockad Storage)
   - ✅ Testar parsning och bearbetning
   - ⚠️ Mockar Storage (inte faktisk lagring)

3. **E2E-tester (begränsat)**
   - ✅ Testar UI-interaktioner
   - ✅ Testar navigation
   - ⚠️ Begränsad testning av kärnfunktionalitet

### Vad som INTE är testbart (kritiskt gap)

1. **Hela flödet: Upload → Hierarki → Generering → Visning**
   - ❌ Kan inte verifiera att filer faktiskt laddas upp korrekt
   - ❌ Kan inte verifiera att hierarki byggs korrekt
   - ❌ Kan inte verifiera att dokumentation genereras korrekt
   - ❌ Kan inte verifiera att dokumentation visas korrekt

2. **Storage-integration**
   - ❌ Kan inte verifiera att filer sparas korrekt i Storage
   - ❌ Kan inte verifiera att dokumentation sparas korrekt
   - ❌ Kan inte verifiera att paths är korrekta

3. **Hierarki-byggnad**
   - ❌ Kan inte verifiera att `bpmn-map.json` genereras korrekt
   - ❌ Kan inte verifiera att call activities mappas korrekt
   - ❌ Kan inte verifiera att subprocesses hittas korrekt

## Varför Detta Är Ett Problem

### 1. Instabilitet
- Ändringar kan bryta kärnfunktionalitet utan att vi vet det
- Buggar upptäcks först när användare rapporterar dem
- Ingen automatisk verifiering av kritiska flöden

### 2. Risk för Produktionsdata
- Tidigare: Tester skrev över produktionsfiler
- Tidigare: `bpmn-map.json` korrumperades
- Tidigare: Dokumentation förstördes

### 3. Utvecklingshastighet
- Utvecklare måste manuellt testa varje ändring
- Ingen säkerhet att ändringar fungerar
- Tidskrävande manuell verifiering

## Nuvarande Skyddsmekanismer

### 1. Test-fil Prefix
- ✅ Alla test-filer måste ha `test-` prefix
- ✅ Edge Function validerar prefix
- ✅ Cleanup rensar test-filer

**Problem:** Detta skyddar bara mot att test-filer skriver över produktionsfiler. Det skyddar INTE mot att test-logik korrumperar produktionsdata.

### 2. bpmn-map.json Mockning
- ✅ GET-anrop mockas
- ✅ POST/PUT-anrop mockas (sparas i minnet)
- ✅ Produktionsfilen skyddas

**Problem:** Detta förhindrar oss från att testa faktisk `bpmn-map.json` generering och lagring.

### 3. Storage Mockning (i integrationstester)
- ✅ Mockad Storage i integrationstester
- ✅ Ingen risk för produktionsdata

**Problem:** Detta förhindrar oss från att testa faktisk Storage-integration.

## Analys: Vad Behövs För Säker Testning

### Krav 1: Isolering från Produktionsdata
- ✅ Test-filer måste vara helt isolerade
- ✅ Test-dokumentation måste vara helt isolerad
- ✅ Test `bpmn-map.json` måste vara helt isolerad
- ✅ Inga test-data får påverka produktionsdata

### Krav 2: Faktisk Funktionalitet
- ✅ Måste använda faktisk produktionskod
- ✅ Måste använda faktisk Storage
- ✅ Måste använda faktisk databas
- ✅ Måste använda faktisk Edge Functions

### Krav 3: Verifiering
- ✅ Måste kunna verifiera att filer laddas upp korrekt
- ✅ Måste kunna verifiera att hierarki byggs korrekt
- ✅ Måste kunna verifiera att dokumentation genereras korrekt
- ✅ Måste kunna verifiera att dokumentation visas korrekt

### Krav 4: Säkerhet
- ✅ Måste vara omöjligt att skriva över produktionsfiler
- ✅ Måste vara omöjligt att korrumpera produktionsdata
- ✅ Måste vara omöjligt att radera produktionsdata
- ✅ Måste ha automatisk cleanup

## Möjliga Lösningar

### Lösning 1: Komplett Isolerad Test-Miljö (REKOMMENDERAD)

**Princip:** Skapa en helt isolerad test-miljö för hela projektet - kod, Supabase, och allt.

**Implementation:**
1. **Feature Branches + Test-Miljö**
   - Feature branch för varje större ändring
   - Isolerad test-miljö per branch (eller delad test-miljö)
   - Testa hela flödet innan merge

2. **Separata Supabase-projekt för tester**
   - Eget Supabase-projekt för test-miljö
   - Egen databas
   - Egen Storage
   - Helt isolerad från produktion

3. **Environment-baserad konfiguration**
   - `.env.test` för test-miljö
   - `.env.local` för lokal utveckling
   - `.env.production` för produktion
   - Vite mode: `development`, `test`, `production`

4. **Test-deployment**
   - Automatisk deployment av feature branch till test-miljö
   - Testa hela flödet i isolerad miljö
   - Validera innan merge till main

5. **Fördelar:**
   - ✅ Full isolering från produktion
   - ✅ Kan testa faktisk funktionalitet
   - ✅ Ingen risk för produktionsdata
   - ✅ Kan testa hela flödet
   - ✅ Kan testa kodändringar innan merge
   - ✅ Säker utvecklingsprocess

6. **Nackdelar:**
   - ⚠️ Kräver separat Supabase-projekt (kostnad?)
   - ⚠️ Kräver konfiguration
   - ⚠️ Kan vara långsammare
   - ⚠️ Kräver deployment-setup

**Säkerhet:** ⭐⭐⭐⭐⭐ (5/5) - Helt isolerad

### Lösning 2: Test-Bucket i Samma Supabase (ALTERNATIV)

**Princip:** Använd separata buckets/mappar i samma Supabase-projekt.

**Implementation:**
1. **Separata Storage-buckets**
   - `bpmn-files-test` bucket för test-filer
   - `bpmn-files` bucket för produktion
   - Separata buckets för dokumentation

2. **Test-prefix i paths**
   - Alla test-filer i `test/` mapp
   - Alla test-dokumentation i `test/docs/` mapp
   - Automatisk cleanup av test-mappar

3. **Fördelar:**
   - ✅ Isolerad från produktion
   - ✅ Kan testa faktisk funktionalitet
   - ✅ Ingen separat Supabase-instans behövs

4. **Nackdelar:**
   - ⚠️ Kräver kodändringar för att hantera test-paths
   - ⚠️ Risk för att test-paths glöms bort
   - ⚠️ Kan vara svårt att säkerställa isolering

**Säkerhet:** ⭐⭐⭐ (3/5) - Bättre än nu, men risk för läckage

### Lösning 3: Förbättrad Mockning med Verifiering (MINST SÄKER)

**Princip:** Förbättra nuvarande mockning för att verifiera beteende utan att faktiskt spara.

**Implementation:**
1. **Mock Storage med verifiering**
   - Mocka Storage-anrop
   - Verifiera att korrekta paths används
   - Verifiera att korrekt innehåll sparas
   - Verifiera att korrekt struktur används

2. **Mock bpmn-map.json med verifiering**
   - Mocka GET/POST/PUT
   - Verifiera att korrekt struktur genereras
   - Verifiera att call activities mappas korrekt

3. **Fördelar:**
   - ✅ Ingen risk för produktionsdata
   - ✅ Snabbt
   - ✅ Kan verifiera logik

4. **Nackdelar:**
   - ❌ Testar INTE faktisk Storage-integration
   - ❌ Testar INTE faktisk databas-integration
   - ❌ Kan missa integration-problem
   - ❌ Mockning kan bli komplex

**Säkerhet:** ⭐⭐⭐⭐⭐ (5/5) - Säker, men låg testrealism

**Testrealism:** ⭐⭐ (2/5) - Låg realism

### Lösning 4: Hybrid Approach (BALANSERAD)

**Princip:** Kombinera isolerad test-miljö för E2E med förbättrad mockning för integrationstester.

**Implementation:**
1. **E2E-tester: Isolerad test-miljö**
   - Separata Supabase-projekt eller buckets
   - Testar hela flödet
   - Full isolering

2. **Integrationstester: Förbättrad mockning**
   - Mocka Storage med verifiering
   - Testa logik och struktur
   - Snabbt och säkert

3. **Fördelar:**
   - ✅ Bästa av båda världar
   - ✅ E2E-tester testar faktisk funktionalitet
   - ✅ Integrationstester är snabba och säkra

4. **Nackdelar:**
   - ⚠️ Kräver både isolerad miljö OCH förbättrad mockning
   - ⚠️ Mer komplex setup

**Säkerhet:** ⭐⭐⭐⭐⭐ (5/5) - Hög säkerhet
**Testrealism:** ⭐⭐⭐⭐ (4/5) - Hög realism för E2E

## Rekommendation

### Kortsiktig lösning (Nuvarande situation)

**Förbättra nuvarande mockning med verifiering:**
1. ✅ Förbättra Storage-mockning för att verifiera paths och struktur
2. ✅ Förbättra bpmn-map.json mockning för att verifiera generering
3. ✅ Lägg till verifiering av hierarki-byggnad
4. ✅ Lägg till verifiering av dokumentationsgenerering

**Fördelar:**
- ✅ Kan implementeras snabbt
- ✅ Ingen risk för produktionsdata
- ✅ Förbättrar testtäckning

**Nackdelar:**
- ❌ Testar fortfarande inte faktisk Storage-integration
- ❌ Kan missa integration-problem

### Långsiktig lösning (Rekommenderad)

**Isolerad test-miljö:**
1. ✅ Skapa separat Supabase-projekt för E2E-tester
2. ✅ Konfigurera environment variables för test-miljö
3. ✅ Implementera automatisk cleanup
4. ✅ Testa hela flödet i isolerad miljö

**Fördelar:**
- ✅ Testar faktisk funktionalitet
- ✅ Full isolering från produktion
- ✅ Kan testa hela flödet
- ✅ Hög testrealism

**Nackdelar:**
- ⚠️ Kräver separat Supabase-projekt
- ⚠️ Kan vara långsammare
- ⚠️ Kräver konfiguration

## Implementeringsplan

### Fas 1: Förbättra Nuvarande Mockning (1-2 dagar)
1. Förbättra Storage-mockning med verifiering
2. Förbättra bpmn-map.json mockning med verifiering
3. Lägg till verifiering av hierarki-byggnad
4. Lägg till verifiering av dokumentationsgenerering

**Resultat:** Bättre testtäckning utan risk för produktionsdata

### Fas 2: Utvärdera Isolerad Test-Miljö (1 vecka)
1. Undersök kostnad för separat Supabase-projekt
2. Undersök alternativ (test-buckets, etc.)
3. Skapa proof-of-concept
4. Testa med ett enkelt E2E-test

**Resultat:** Beslut om långsiktig lösning

### Fas 3: Implementera Isolerad Test-Miljö (2-3 veckor)
1. Sätt upp separat Supabase-projekt (om beslutat)
2. Konfigurera environment variables
3. Implementera automatisk cleanup
4. Migrera E2E-tester till isolerad miljö
5. Verifiera att hela flödet fungerar

**Resultat:** Fullständig testning av kärnfunktionalitet i säker miljö

## Detaljerad Implementation: Komplett Test-Miljö

### Komponenter som Behövs

1. **Git Workflow**
   - Feature branches för varje större ändring
   - `main` = produktion (skyddad)
   - `test` eller `staging` = test-miljö
   - Feature branches → Test → Validera → Merge till main

2. **Environment Variables**
   - `.env.local` = lokal utveckling (nuvarande)
   - `.env.test` = test-miljö (ny)
   - `.env.production` = produktion (ny)
   - Vite mode: `development`, `test`, `production`

3. **Supabase Setup**
   - Produktion: Nuvarande Supabase-projekt
   - Test: Separata Supabase-projekt ELLER test-buckets
   - Lokal: Supabase CLI (nuvarande)

4. **Deployment**
   - Produktion: Nuvarande deployment
   - Test: Separata deployment (Vercel preview, Netlify branch, etc.)
   - Eller: Lokal test-miljö med test-Supabase

5. **Test Process**
   - Feature branch → Deploy till test → Kör tester → Validera → Merge
   - Automatisk cleanup efter tester
   - Verifiera isolering

### Konkret Implementation

#### Steg 1: Environment Variables Struktur

```bash
# .env.local (lokal utveckling)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=...

# .env.test (test-miljö)
VITE_SUPABASE_URL=https://test-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_APP_ENV=test

# .env.production (produktion)
VITE_SUPABASE_URL=https://production-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_APP_ENV=production
```

#### Steg 2: Vite Mode Configuration

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const envFile = mode === 'test' ? '.env.test' : 
                  mode === 'production' ? '.env.production' : 
                  '.env.local';
  
  return {
    // ... existing config
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(mode),
    },
  };
});
```

#### Steg 3: Feature Branch Workflow

```bash
# 1. Skapa feature branch
git checkout -b feature/test-environment

# 2. Gör ändringar
# ... kodändringar ...

# 3. Deploy till test-miljö (eller kör lokalt med test-Supabase)
npm run build:test
# eller: npm run dev --mode test

# 4. Kör tester i test-miljö
npm run test:e2e:test

# 5. Validera att allt fungerar

# 6. Merge till main (när säker)
git checkout main
git merge feature/test-environment
```

#### Steg 4: Test-Supabase Setup

**Alternativ A: Separata Supabase-projekt**
- Skapa nytt Supabase-projekt för tester
- Kopiera schema från produktion
- Konfigurera `.env.test` med test-projekt credentials

**Alternativ B: Test-buckets i samma projekt**
- Skapa `bpmn-files-test` bucket
- Skapa `docs-test` bucket
- Modifiera kod för att använda test-buckets när `VITE_APP_ENV=test`

**Alternativ C: Lokal Supabase för tester**
- Använd Supabase CLI för lokal test-instans
- Separata portar eller databaser
- Konfigurera `.env.test` med lokal test-instans

## Kritiska Frågor att Besvara

1. **Kostnad:** 
   - Vad kostar ett separat Supabase-projekt för tester?
   - Alternativ: Kan vi använda lokal Supabase för tester?
   - Alternativ: Kan vi använda test-buckets i samma projekt?

2. **Deployment:**
   - Hur deployar vi test-miljön?
   - Vercel/Netlify för test-deployment?
   - Eller: Lokal test-miljö med test-Supabase?

3. **Workflow:**
   - Feature branches → Test-miljö → Validera → Merge?
   - Hur hanterar vi flera parallella feature branches?
   - Delad test-miljö eller separat per branch?

4. **Prestanda:**
   - Hur påverkar isolerad miljö test-hastighet?
   - Hur påverkar det utvecklingshastigheten?

5. **Underhåll:**
   - Hur mycket extra underhåll krävs?
   - Hur håller vi test-miljön synkad med produktion?

6. **Säkerhet:**
   - Är isolerad miljö verkligen 100% säker?
   - Hur förhindrar vi att test-data läcker till produktion?

## Slutsats

**Nuvarande situation:** Vi kan INTE testa kärnfunktionaliteten säkert, och vi kan INTE testa kodändringar innan merge.

**Kortsiktig lösning:** Förbättra mockning med verifiering (1-2 dagar)
- Förbättrar testtäckning
- Ingen risk för produktionsdata
- Men testar fortfarande inte faktisk Storage-integration

**Långsiktig lösning:** Komplett isolerad test-miljö för hela projektet (2-3 veckor)
- Testar faktisk funktionalitet
- Kan testa kodändringar innan merge
- Full isolering från produktion
- Säker utvecklingsprocess

**Rekommendation:** 
1. Börja med kortsiktig lösning (förbättra mockning)
2. Planera och utvärdera långsiktig lösning (komplett test-miljö)
3. Implementera långsiktig lösning när design är klar

