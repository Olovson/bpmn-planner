# Guide: Manuell radering av testfiler

## Problem

Om cleanup-scriptet inte fungerar eller om du behöver radera filer manuellt, finns det flera alternativ.

## Metod 1: Via Supabase Dashboard (Rekommenderat)

### Steg 1: Öppna Supabase Dashboard
1. Gå till `http://localhost:54323` (lokalt) eller din Supabase-projekt URL
2. Logga in om nödvändigt

### Steg 2: Radera från Storage
1. Gå till **Storage** i vänstermenyn
2. Välj **bpmn-files** bucket
3. Bläddra till filerna du vill radera
4. Markera filerna (Ctrl/Cmd + klick för flera)
5. Klicka på **Delete** knappen

### Steg 3: Radera från Database
1. Gå till **Table Editor** i vänstermenyn
2. Välj **bpmn_files** tabellen
3. Filtrera på `file_name` som börjar med `test-`
4. Markera raderna du vill radera
5. Klicka på **Delete** knappen

## Metod 2: Via SQL Editor

### Radera testfiler från databasen
```sql
-- Se alla testfiler
SELECT file_name, created_at 
FROM bpmn_files 
WHERE file_name LIKE 'test-%'
ORDER BY created_at DESC;

-- Radera gamla testfiler (äldre än 10 minuter)
DELETE FROM bpmn_files 
WHERE file_name LIKE 'test-%' 
  AND created_at < NOW() - INTERVAL '10 minutes';
```

### Radera från Storage via SQL
Storage kan inte raderas direkt via SQL, men du kan se vilka filer som finns:
```sql
-- Detta fungerar inte direkt, men du kan se filer i databasen
SELECT storage_path, file_name 
FROM bpmn_files 
WHERE file_name LIKE 'test-%';
```

## Metod 3: Via Appen (UI)

### Radera en fil i taget
1. Gå till **Filer** i appen
2. Hitta filen du vill radera
3. Klicka på **Delete** knappen (trash-ikon) i raden
4. Bekräfta raderingen

**Begränsning:** Detta tar bort både från Storage och databasen, men du måste göra det en i taget.

## Metod 4: Förbättrat Cleanup Script

Om scriptet inte fungerar, försök:

### 1. Kör med dry-run först
```bash
npm run cleanup:test-files:storage -- --dry-run
```

Detta visar vilka filer som skulle raderas utan att faktiskt radera dem.

### 2. Kontrollera felmeddelanden
Om scriptet ger fel, kolla:
- Är Supabase igång? (`supabase status`)
- Är miljövariablerna korrekta? (`.env.local`)
- Har du rätt behörigheter? (service_role key)

### 3. Förbättrat script
Scriptet har nu förbättrad felhantering:
- Raderar filer en i taget (mer robust)
- Hanterar filer som redan är borttagna
- Visar detaljerade felmeddelanden

## Vanliga problem och lösningar

### Problem: "Permission denied"
**Lösning:** 
- Använd `SUPABASE_SERVICE_ROLE_KEY` istället för `VITE_SUPABASE_ANON_KEY`
- Eller ge användaren rätt behörigheter i Supabase Dashboard

### Problem: "File not found"
**Lösning:**
- Detta är normalt - filen kan redan vara borttagen
- Scriptet hanterar detta nu automatiskt

### Problem: "Too many files to delete"
**Lösning:**
- Scriptet raderar nu filer en i taget, vilket är långsammare men mer robust
- Om det fortfarande är för många, radera i mindre batchar manuellt

### Problem: "Database constraint error"
**Lösning:**
- Det kan finnas foreign key constraints
- Radera först från tabeller som refererar till `bpmn_files`:
  ```sql
  -- Radera från beroende tabeller först
  DELETE FROM bpmn_dependencies WHERE parent_file LIKE 'test-%' OR child_file LIKE 'test-%';
  DELETE FROM generation_jobs WHERE file_name LIKE 'test-%';
  DELETE FROM dor_dod_status WHERE bpmn_file LIKE 'test-%';
  DELETE FROM node_test_links WHERE bpmn_file LIKE 'test-%';
  
  -- Sedan från bpmn_files
  DELETE FROM bpmn_files WHERE file_name LIKE 'test-%';
  ```

## Automatisk cleanup

För att förhindra att testfiler ackumuleras:

### 1. Efter varje test
Testet `tests/playwright-e2e/feature-goal-documentation.spec.ts` rensar automatiskt efter varje test.

### 2. Manuellt
Kör cleanup-scriptet regelbundet:
```bash
npm run cleanup:test-files:storage
```

### 3. Via cron (för produktion)
Om du kör tester i CI/CD, lägg till cleanup efter varje test-suite.

## Ytterligare resurser

- **Cleanup script:** `scripts/cleanup-test-files-from-storage.ts`
- **Supabase docs:** https://supabase.com/docs/guides/storage
- **SQL reference:** https://supabase.com/docs/guides/database






