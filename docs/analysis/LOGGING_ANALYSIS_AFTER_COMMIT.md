# Analys: Loggning Efter Commit 1f9574c8

## Problem
Användaren ser mycket i loggarna och undrar om sidor som files, node-matrix etc också borde ha reverserats till en äldre version innan commit 1f9574c8.

## Analys

### Sidor som Ändrades Efter Commit 1f9574c8

**Endast 3 sidor ändrades:**
1. `src/pages/BpmnFileManager.tsx` - 25 rader borttagna (tog bort oanvänd kod)
2. `src/pages/BpmnFileManager/components/GenerationControls.tsx` - 39 rader borttagna (tog bort oanvänd kod)
3. `src/pages/TimelinePage.tsx` - 43 rader ändrade (förbättringar av Gantt)

**Inga ändringar i:**
- `src/pages/NodeMatrix.tsx` - INGEN ändring efter commit 1f9574c8
- `src/pages/ProcessExplorer.tsx` - INGEN ändring efter commit 1f9574c8
- `src/pages/TestReport.tsx` - INGEN ändring efter commit 1f9574c8
- Andra sidor - INGA ändringar efter commit 1f9574c8

### Källa till Loggspam: `useFileArtifactCoverage.ts`

**VIKTIGT:** Den största källan till loggning är **INTE** i sidorna, utan i `src/hooks/useFileArtifactCoverage.ts` som används av Files-sidan.

**Ändringar efter commit 1f9574c8:**
- 439 rader ändrade (stor refaktorering)
- **Många nya console.log/console.warn/console.error statements tillagda**

**Nya logg-statements:**
```typescript
// Exempel på nya logg-statements:
console.warn(`[Coverage Debug] Error parsing ${file.file_name}:`, error);
console.warn(`[Coverage Debug] Error building graph for ${file.file_name}:`, graphError);
console.warn(`[Coverage Debug] Skipping coverage for ${file.file_name} due to missing graph.`);
console.error(`[Coverage Debug] Error checking docs for ${fileName}:`, error);
console.error(`[Coverage Debug] Error parsing ${file.file_name}:`, error);
console.error(`[Coverage Debug] Full error for household:`, error);
```

**Var används `useFileArtifactCoverage.ts`:**
- `src/pages/BpmnFileManager.tsx` - Files-sidan använder denna hook för att visa coverage
- Hooken körs automatiskt när Files-sidan laddas
- Hooken körs när filer ändras eller uppdateras

### Andra Källor till Loggning

#### 1. TimelinePage.tsx
**Ändringar efter commit 1f9574c8:**
- Lade till debug-logging för Gantt-sortering
- Console.log för att debugga tasks med missing parents
- Console.warn för tasks som inte lades till i sorted list

**Exempel:**
```typescript
console.log(`[TimelinePage] toGanttData sorting:`, {...});
console.warn(`[TimelinePage] Tasks not added to sorted list`, ...);
console.warn(`[TimelinePage] Tasks with missing parents`, ...);
```

#### 2. useFileArtifactCoverage.ts (Huvudkälla)
**Ändringar efter commit 1f9574c8:**
- Många `[Coverage Debug]` logg-statements tillagda
- Error handling med console.warn/console.error
- Debug-logging för coverage-beräkningar

**Var det används:**
- Files-sidan (`BpmnFileManager.tsx`) använder `useFileArtifactCoverage` hook
- Hooken körs för varje fil i listan
- Om det finns många filer, kan det generera mycket loggning

## Rekommendation

### ✅ BEHÅLL Ändringar i Sidorna
**Varför:**
- Bara 3 sidor ändrades, och ändringarna är små
- `BpmnFileManager.tsx` - Tog bort oanvänd kod (bra)
- `GenerationControls.tsx` - Tog bort oanvänd kod (bra)
- `TimelinePage.tsx` - Förbättringar (bra)

### ⚠️ ÖVERVÄG ÅTERSTÄLLA `useFileArtifactCoverage.ts`
**Varför:**
- Detta är huvudkällan till loggspam
- 439 rader ändrade med många nya logg-statements
- Hooken används av Files-sidan och körs automatiskt
- Om det finns många filer, kan det generera mycket loggning

**Men:**
- Ändringarna fixar ett viktigt problem (räknar bara noder i själva filen, inte subprocesses)
- Loggningen kan vara värdefull för debugging
- Vi kan behålla ändringarna men ta bort eller reducera loggningen

### Alternativ: Reducera Loggning Istället för Återställa

**Strategi 1: Behåll ändringarna, reducera loggning**
- Behåll coverage-fixarna (viktiga)
- Ta bort eller reducera `[Coverage Debug]` logg-statements
- Behåll bara kritiska error-loggar

**Strategi 2: Återställ `useFileArtifactCoverage.ts`**
- Återställ till commit 1f9574c8
- Förlorar coverage-fixarna (men de kan göras om mer försiktigt)

## Sammanfattning

| Komponent | Ändringar Efter 1f9574c8 | Orsakar Loggspam? | Rekommendation |
|-----------|---------------------------|-------------------|----------------|
| `BpmnFileManager.tsx` | 25 rader borttagna | ❌ Nej | ✅ Behåll |
| `GenerationControls.tsx` | 39 rader borttagna | ❌ Nej | ✅ Behåll |
| `TimelinePage.tsx` | 43 rader ändrade | ⚠️ Lite (debug-logging) | ✅ Behåll (eller reducera loggning) |
| `useFileArtifactCoverage.ts` | 439 rader ändrade | ✅ **JA** (många logg-statements) | ⚠️ **Överväg återställa eller reducera loggning** |
| `NodeMatrix.tsx` | Ingen ändring | ❌ Nej | ✅ Ingen åtgärd |
| Andra sidor | Inga ändringar | ❌ Nej | ✅ Ingen åtgärd |

## Nästa Steg

1. **Identifiera exakt vilka loggar som spammar:**
   - Öppna browser console
   - Gå till Files-sidan
   - Kolla vilka loggar som visas mest

2. **Om loggarna kommer från `[Coverage Debug]`:**
   - Överväg att återställa `useFileArtifactCoverage.ts` till commit 1f9574c8
   - ELLER reducera loggningen (ta bort eller kommentera ut `[Coverage Debug]` statements)

3. **Om loggarna kommer från Timeline:**
   - Reducera debug-logging i `TimelinePage.tsx`
   - Behåll funktionaliteten men ta bort onödig loggning

4. **Testa efter ändringar:**
   - Verifiera att Files-sidan fungerar
   - Verifiera att coverage-räkning fungerar
   - Kontrollera att loggningen är hanterbar

