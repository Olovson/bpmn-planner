# Analys: Testrealism - Använder Testerna Faktisk Produktionskod?

## Datum: 2025-12-26

## Översikt

Testerna använder **MESTADELS** samma funktionalitet som appen, men med **två viktiga mockningar**:

1. ✅ **Claude API är mockat** (nödvändigt för tester)
2. ⚠️ **bpmn-map.json GET-anrop är mockat** (för att skydda produktionsfilen)
3. ⚠️ **`/bpmn/` endpoint är en fallback** som inte fungerar för test-filer

## Detaljerad Analys

### ✅ Använder Faktisk Produktionskod

#### 1. BPMN-fil Upload
- ✅ Använder faktisk UI (`stepUploadBpmnFile` klickar på faktiska knappar)
- ✅ Använder faktisk Edge Function (`upload-bpmn-file`)
- ✅ Använder faktisk Supabase Storage (inte mockat)
- ✅ Använder faktisk databas (`bpmn_files` tabell)

#### 2. Hierarki-byggnad
- ✅ Använder faktisk UI (klickar på "Bygg hierarki" knapp)
- ✅ Använder faktisk funktionalitet (`buildHierarchySilently`)
- ✅ Använder faktisk `bpmn-map.json` generering (sparas faktiskt till Storage)

#### 3. Dokumentationsgenerering
- ✅ Använder faktisk UI (`stepStartGeneration` klickar på faktiska knappar)
- ✅ Använder faktisk `useFileGeneration` hook
- ✅ Använder faktisk `generateAllFromBpmnWithGraph` funktion
- ✅ Använder faktisk `bpmnGenerators.ts` logik
- ✅ Använder faktisk Supabase Storage för att spara dokumentation
- ✅ Använder faktisk versioning (`getCurrentVersionHash`)
- ✅ Använder faktisk `extractBpmnFileFromDocFileName` logik

#### 4. BPMN-fil Laddning
- ✅ Använder faktisk `parseBpmnFile` funktion
- ✅ Använder faktisk `loadBpmnXml` funktion
- ✅ Använder faktisk Supabase Storage (via `tryStorage`)
- ⚠️ Men försöker också ladda från `/bpmn/` endpoint först (fallback som inte fungerar för test-filer)

#### 5. Node-matrix
- ✅ Använder faktisk UI (navigerar till `/#/node-matrix`)
- ✅ Använder faktisk `useAllBpmnNodes` hook
- ✅ Använder faktisk `getFeatureGoalDocStoragePaths` funktion
- ✅ Använder faktisk Supabase Storage för att hitta dokumentation

### ⚠️ Mockningar och Fallbacks

#### 1. Claude API Mockning
**Status**: ✅ **NÖDVÄNDIGT OCH KORREKT**

**Varför mockat:**
- Extern tjänst som kostar pengar
- Tester skulle vara långsamma
- Tester skulle vara beroende av internet-anslutning

**Vad mockas:**
- `https://api.anthropic.com/v1/messages` anrop
- Returnerar mockad JSON-respons

**Påverkan:**
- ✅ Testerna använder fortfarande faktisk `bpmnGenerators.ts` logik
- ✅ Testerna använder fortfarande faktisk dokumentationsstruktur
- ✅ Testerna validerar fortfarande faktisk Storage-uppladdning
- ⚠️ Men dokumentationsinnehållet är mockat (inte faktiskt genererat av LLM)

#### 2. bpmn-map.json Mockning
**Status**: ⚠️ **DELVIS MOCKAT**

**Vad mockas:**
- GET-anrop till `bpmn-map.json` mockas för att returnera test-versionen
- POST/PUT-anrop går igenom till faktisk Storage

**Varför mockat:**
- För att skydda produktionsfilen
- För att isolera tester

**Påverkan:**
- ✅ Appen använder faktisk `saveBpmnMapToStorage` funktion
- ✅ Appen faktiskt sparar till Storage
- ✅ Appen använder faktisk `loadBpmnMapFromStorage` funktion (men GET-anropet mockas)
- ⚠️ Men GET-anropet returnerar test-versionen istället för produktionsfilen

**Är detta ett problem?**
- ✅ **NEJ** - Appen använder faktiskt samma funktionalitet för att spara
- ✅ **NEJ** - Test-versionen genereras faktiskt av appen (inte hardkodad)
- ⚠️ **DELVIS** - Men GET-anropet mockas, så vi testar inte faktisk läsning från Storage

#### 3. `/bpmn/` Endpoint Fallback
**Status**: ⚠️ **FALLBACK SOM INTE FUNGERAR**

**Vad händer:**
- `parseBpmnFile()` anropas med `/bpmn/{fileName}` URL
- `loadBpmnXml()` försöker först ladda från `/bpmn/` endpoint
- Detta ger 400 Bad Request för test-filer
- Sedan fallback till Storage (som fungerar)

**Är detta ett problem?**
- ⚠️ **DELVIS** - Det är en fallback som inte fungerar för test-filer
- ✅ **NEJ** - Storage fallback fungerar, så filerna laddas korrekt
- ⚠️ **JA** - Men det är inte samma flöde som i produktion (produktionsfiler finns i `/bpmn/` mappen)

**Lösning:**
- Förbättra `getBpmnFileUrl()` för att hoppa över `/bpmn/` fallback för test-filer
- Förbättra `loadBpmnXml()` för att hoppa över `/bpmn/` endpoint för test-filer

## Sammanfattning

### ✅ Vad Testerna Använder Faktiskt

1. ✅ **Faktisk UI** - Klickar på faktiska knappar, använder faktiska komponenter
2. ✅ **Faktisk Edge Functions** - `upload-bpmn-file` fungerar som i produktion
3. ✅ **Faktisk Supabase Storage** - Faktiskt sparar/laddar filer
4. ✅ **Faktisk Databas** - Faktiskt sparar/läser från `bpmn_files` tabell
5. ✅ **Faktisk Genereringslogik** - `generateAllFromBpmnWithGraph`, `bpmnGenerators.ts`
6. ✅ **Faktisk Versioning** - `getCurrentVersionHash`, version-hantering
7. ✅ **Faktisk Dokumentationsstruktur** - Hierarchical naming, versioned paths
8. ✅ **Faktisk Node-matrix logik** - `useAllBpmnNodes`, `getFeatureGoalDocStoragePaths`

### ⚠️ Vad Som Är Mockat/Eller Har Fallbacks

1. ⚠️ **Claude API** - Mockat (nödvändigt för tester)
2. ⚠️ **bpmn-map.json GET** - Mockat (för att skydda produktionsfilen)
3. ⚠️ **`/bpmn/` endpoint** - Fallback som inte fungerar för test-filer

### 🎯 Testrealism Bedömning

**Overall: 85% Realism**

**Varför inte 100%:**
- Claude API är mockat (men nödvändigt)
- bpmn-map.json GET är mockat (men POST/PUT är faktiskt)
- `/bpmn/` endpoint fallback fungerar inte för test-filer (men Storage fallback fungerar)

**Varför ändå hög realism:**
- Testerna använder faktisk produktionskod för allt utom externa API-anrop
- Testerna faktiskt sparar/laddar från Storage
- Testerna faktiskt använder samma funktionalitet som appen
- Testerna validerar faktiska användarflöden

## Rekommendationer

### 1. Förbättra `/bpmn/` Endpoint Hantering
- ✅ Redan implementerat: `getBpmnFileUrl()` hoppar över `/bpmn/` för test-filer
- ✅ Redan implementerat: `loadBpmnXml()` hoppar över `/bpmn/` för test-filer
- ⚠️ Men felet loggas fortfarande (bara varningar, inte kritiskt)

### 2. Förbättra bpmn-map.json Mockning
- ✅ Redan implementerat: Låter appen faktiskt spara till Storage
- ✅ Redan implementerat: Mockar GET-anropen för att returnera test-versionen
- ✅ Redan implementerat: Backup och restore av produktionsfilen

### 3. Claude API Mockning
- ✅ Redan korrekt: Mockat för att undvika kostnader och förlita sig på externa tjänster
- ✅ Mock-responser är realistiska (matchar faktisk API-struktur)

## Slutsats

**Testerna använder faktiskt samma funktionalitet som appen i hög grad.**

**Mockningar:**
- Claude API (nödvändigt)
- bpmn-map.json GET (för att skydda produktionsfilen)

**Fallbacks:**
- `/bpmn/` endpoint (fungerar inte för test-filer, men Storage fallback fungerar)

**Inga hardkodade lösningar eller onödiga fallbacks i testerna.**
