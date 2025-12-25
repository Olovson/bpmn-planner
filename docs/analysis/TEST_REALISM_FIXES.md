# Fixar för testrealism

## Kritiska problem

### 1. Testgenerering kräver dokumentation - men vi genererar inte dokumentation först

**Problem:**
- `generateTestsForFile` kastar Error om dokumentation saknas (testGenerators.ts:143-149)
- Men i `test-generation-from-scratch.spec.ts` genererar vi INTE dokumentation först
- Testet kan passera även om dokumentation saknas (vilket är fel)

**Fix:**
- Lägg till steg för att generera dokumentation FÖRST
- Verifiera att dokumentation faktiskt genererades
- Verifiera att tester faktiskt genererades

### 2. För många try/catch som döljer fel

**Problem:**
- Många tester använder `try { ... } catch { console.log('⚠️  ...') }` 
- Detta döljer faktiska fel

**Fix:**
- Ta bort onödiga try/catch
- Verifiera att operationer faktiskt slutfördes
- Faila med tydliga felmeddelanden om något saknas

### 3. Vi verifierar inte att saker faktiskt hände

**Problem:**
- Vi verifierar inte att dokumentation faktiskt genererades
- Vi verifierar inte att tester faktiskt genererades
- Vi verifierar inte att hierarki faktiskt byggdes

**Fix:**
- Lägg till verifieringssteg
- Verifiera att dokumentation finns i Doc Viewer
- Verifiera att tester finns i Test Report och Test Coverage
- Verifiera att hierarki finns i Process Explorer

