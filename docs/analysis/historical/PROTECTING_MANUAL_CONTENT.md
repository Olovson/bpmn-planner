# Skydd för Manuellt Skapat Innehåll

## ✅ Ditt manuellt skapade V2-innehåll är skyddat!

### Var lagras manuellt innehåll?

Manuellt skapat innehåll lagras i:
- `public/local-content/feature-goals/` - Feature Goal HTML-filer
- `public/local-content/epics/` - Epic HTML-filer

Dessa är **statiska filer** i Git-repositoryt och skrivs **ALDRIG** över av genereringsprocessen.

### Var lagras Claude-genererat innehåll?

Claude-genererat innehåll sparas i:
- **Supabase Storage**: `docs/slow/chatgpt/<docFileName>`
- **INTE** i `public/local-content/`

### Hur fungerar skyddet?

1. **Genereringsprocessen skriver ENDAST till Supabase Storage**
   - Se `src/pages/BpmnFileManager.tsx` rad 1845-1851
   - Använder `supabase.storage.from('bpmn-files').upload()`
   - Skriver **ALDRIG** till `public/local-content/`

2. **Läsordning i DocViewer prioriterar manuellt innehåll**
   - Se `src/pages/DocViewer.tsx` rad 226-244
   - Försöker först ladda från `local-content/`
   - Sedan från Supabase Storage
   - **Manuellt innehåll visas alltid före Claude-genererat innehåll**

3. **Ingen kod kan radera `public/local-content/`**
   - Reset-funktioner raderar bara från Supabase Storage
   - Inga scripts raderar från `public/local-content/`
   - Filerna är i Git och kan återställas om de ändras

### Vad händer när du genererar med Claude?

1. Claude genererar dokumentation
2. Dokumentationen sparas i Supabase Storage: `docs/slow/chatgpt/<docFileName>`
3. **Ditt manuellt skapade innehåll i `public/local-content/` påverkas INTE**
4. DocViewer visar manuellt innehåll om det finns, annars Claude-genererat

### Säkerhetsåtgärder

- ✅ Genereringsprocessen skriver bara till Supabase Storage
- ✅ Inga funktioner kan radera `public/local-content/`
- ✅ Manuellt innehåll prioriteras vid läsning
- ✅ Filerna är i Git och kan återställas

### Rekommendationer

1. **Commit ditt manuellt skapade innehåll till Git**
   ```bash
   git add public/local-content/
   git commit -m "Manuellt skapat V2-innehåll"
   ```

2. **Använd Git för backup**
   - Ditt innehåll är säkert i Git
   - Kan återställas om något händer

3. **Generera med Claude utan oro**
   - Claude-genererat innehåll sparas separat
   - Ditt manuella innehåll påverkas inte

### Verifiering

För att verifiera att ditt innehåll är skyddat:

1. Generera med Claude för en nod som har manuellt innehåll
2. Kontrollera att `public/local-content/`-filen är oförändrad
3. Kontrollera att Claude-genererat innehåll finns i Supabase Storage
4. Öppna DocViewer - du ska se ditt manuella innehåll (om det finns)

---

**Slutsats**: Ditt manuellt skapade V2-innehåll är **100% skyddat** och kan **INTE** raderas eller skrivas över av appen.

