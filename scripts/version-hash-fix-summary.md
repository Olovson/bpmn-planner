# Version Hash Fix - Sammanfattning

**Datum:** 2025-01-XX  
**Status:** ✅ Förbättrad felhantering och fallback

---

## Problem

**Felmeddelande:**
```
[BpmnFileManager] Cannot upload doc nodes/mortgage-se-internal-data-gathering/fetch-party-information.html: missing version hash for mortgage-se-internal-data-gathering.bpmn. This should not happen - file should have a version hash.
```

**Orsak:**
- När dokumentation genereras för `mortgage-se-internal-data-gathering.bpmn`, saknas version hash för den filen
- `getVersionHashForFile()` returnerar `null` för filen
- Detta gör att dokumentationen inte kan laddas upp till Storage

**Möjliga orsaker:**
1. Filen är inte uppladdad korrekt (saknar version i `bpmn_file_versions`)
2. Filen har versioner men ingen är markerad som `is_current = true`
3. Version creation misslyckades vid uppladdning (men upload fortsatte ändå)

---

## Lösning

### 1. Förbättrad Fallback-logik

Lade till flera fallback-nivåer i `getVersionHashForDoc()`:

1. **Första försöket:** Använd `getVersionHashForFile()` (respekterar användarens version selection)
2. **Fallback 1:** Om null, använd `getCurrentVersionHash()` direkt (bypassar version selection)
3. **Fallback 2:** Om fortfarande null och filen är en subprocess, använd root-filens version hash som sista utväg

### 2. Förbättrad Diagnostik

- Loggar varningar i DEV-läge när fallbacks används
- Visar tydligare felmeddelanden med diagnostisk information
- Toast-notifikation till användaren om version hash saknas

### 3. Förbättrad Felhantering

- Visar användarvänligt felmeddelande via toast
- Loggar diagnostisk information för debugging
- Förhindrar spam av felmeddelanden (visar bara en gång per fil)

---

## Kodändringar

**Fil:** `src/pages/BpmnFileManager/hooks/useFileGeneration.ts`

**Ändringar:**
1. Förbättrad `getVersionHashForDoc()` funktion med flera fallback-nivåer
2. Förbättrad felhantering med diagnostisk information
3. Toast-notifikation för användaren

---

## Rekommendationer

### Kortsiktigt
- ✅ Fallback-logiken hjälper när filen saknar version
- ⚠️ Men det är en workaround - filen borde ha en version

### Långsiktigt
1. **Kontrollera att alla filer har versioner:**
   - Verifiera att `upload-bpmn-file` edge function alltid skapar en version
   - Kontrollera att version creation inte misslyckas tyst

2. **Förbättra error handling i upload:**
   - Om version creation misslyckas, kasta fel istället för att fortsätta
   - Eller åtminstone logga tydligt att version saknas

3. **Validera version innan generering:**
   - Kontrollera att alla filer i `filesIncluded` har versioner innan generering startar
   - Visa varning om någon fil saknar version

---

## Testning

**För att testa fixen:**
1. Ladda upp `mortgage-se-internal-data-gathering.bpmn` om den saknas
2. Verifiera att filen har en version i `bpmn_file_versions` tabellen
3. Generera dokumentation igen
4. Kontrollera att dokumentationen laddas upp korrekt

**För att testa fallback:**
1. Ta bort version för en fil (sätt `is_current = false` för alla versioner)
2. Försök generera dokumentation
3. Verifiera att fallback-logiken fungerar och att användaren får tydligt felmeddelande

---

## Slutsats

✅ **Felhanteringen är förbättrad** med fallback-logik och bättre diagnostik.

⚠️ **Men det underliggande problemet** (filen saknar version) bör undersökas och fixas i upload-processen.


