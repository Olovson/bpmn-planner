# Konsolideringsplan: Enhetlig Informationsgenerering

## Datum: 2025-01-XX

## 🎯 Syfte

Ta bort all bakåtkompatibilitet och duplicerad funktionalitet från informationsgenereringsprocesser. Säkerställa ett gemensamt sätt att generera och spara information.

---

## 🔍 Identifierade Problem

### 1. Storage Path-funktioner med Bakåtkompatibilitet

#### `buildDocStoragePaths()` i `artifactPaths.ts`
- ❌ Returnerar non-versioned path om version hash saknas (rad 39-42)
- **Fix:** Kräv version hash, kasta fel om det saknas

#### `getFeatureGoalDocStoragePaths()` i `artifactUrls.ts`
- ❌ Returnerar både versioned och non-versioned paths (rad 138-146)
- **Fix:** Returnera bara versioned path, kräv version hash

#### `getNodeDocStoragePath()` i `artifactUrls.ts`
- ❌ Returnerar bara non-versioned path (rad 82-85)
- ❌ Använder inte `buildDocStoragePaths()` (duplicerad logik)
- **Fix:** Använd `buildDocStoragePaths()` med version hash

#### `getEpicDocStoragePaths()` - SAKNAS!
- ❌ Funktion används men är inte definierad
- **Fix:** Skapa funktion som använder `buildDocStoragePaths()` med version hash

### 2. Duplicerad Path-byggning

#### `DocViewer.tsx`
- ❌ Bygger paths manuellt med olika providers (claude, ollama)
- ❌ Har fallback paths för non-versioned
- ❌ Har fallback paths för olika providers
- **Fix:** Använd `buildDocStoragePaths()` konsekvent, bara claude, bara versioned

#### `bpmnGenerators.ts`
- ❌ Kollar både versioned och non-versioned paths (rad 928-944)
- **Fix:** Kolla bara versioned path, kräv version hash

### 3. Legacy Generator

#### `generateAllFromBpmn()` i `legacyGenerator.ts`
- ⚠️ Används som fallback när `generateAllFromBpmnWithGraph()` misslyckas
- **Fix:** Se till att den också använder versioned paths, eller ta bort fallback

### 4. Provider-hantering

#### Flera ställen
- ❌ Stöd för både 'claude' och 'ollama' providers
- ❌ Auto-mode som testar alla providers
- **Fix:** Bara 'claude', ta bort ollama-stöd

---

## ✅ Lösningsplan

### Steg 1: Uppdatera `buildDocStoragePaths()`
- Kräv version hash (kasta fel om saknas)
- Ta bort non-versioned fallback
- Bara 'claude' provider

### Steg 2: Skapa `getEpicDocStoragePaths()`
- Använd `buildDocStoragePaths()` med version hash
- Returnera bara versioned path

### Steg 3: Uppdatera `getNodeDocStoragePath()`
- Använd `buildDocStoragePaths()` istället för manuell path-byggning
- Kräv version hash

### Steg 4: Uppdatera `getFeatureGoalDocStoragePaths()`
- Ta bort non-versioned path
- Kräv version hash
- Returnera bara versioned path

### Steg 5: Förenkla `DocViewer.tsx`
- Ta bort alla fallback paths
- Ta bort ollama-stöd
- Använd `buildDocStoragePaths()` konsekvent
- Bara versioned paths

### Steg 6: Uppdatera `bpmnGenerators.ts`
- Ta bort non-versioned path checks
- Kräv version hash

### Steg 7: Uppdatera `legacyGenerator.ts`
- Se till att den använder versioned paths
- Eller ta bort fallback helt

---

## 📋 Checklista

- [ ] `buildDocStoragePaths()` - kräv version hash, bara claude
- [ ] `getEpicDocStoragePaths()` - skapa, använd buildDocStoragePaths
- [ ] `getNodeDocStoragePath()` - använd buildDocStoragePaths
- [ ] `getFeatureGoalDocStoragePaths()` - bara versioned, kräv version hash
- [ ] `DocViewer.tsx` - förenkla, bara versioned paths
- [ ] `bpmnGenerators.ts` - ta bort non-versioned checks
- [ ] `legacyGenerator.ts` - uppdatera eller ta bort fallback
- [ ] Alla andra ställen som bygger paths manuellt



