# Analys: Var sparas genererade filer?

**Datum:** 2025-12-22  
**Syfte:** Förklara var genererade dokumentation sparas och varför de kanske inte syns i Storage

## Sammanfattning

Genererade filer sparas INTE automatiskt till Storage. De genereras i minnet och måste uploadas manuellt EFTER genereringen är klar. Om genereringen avbryts innan upload-steget, försvinner filerna.

---

## 1. Var Filerna Sparas

### Supabase Storage (INTE Database)

**Viktigt:**
- Filerna sparas i **Supabase Storage** (bucket: `bpmn-files`)
- **INTE** i databasen (PostgreSQL)
- Storage är ett filsystem, inte en databastabell

**Storage-struktur:**
```
bpmn-files/
  ├── docs/claude/
  │   ├── {bpmnFileName}/{versionHash}/
  │   │   ├── nodes/{bpmnFile}/{elementId}.html (Epics)
  │   │   └── feature-goals/{parent}-{elementId}.html (Feature Goals)
  │   └── nodes/{bpmnFile}/{elementId}.html (non-versioned fallback)
  └── tests/{bpmnFile}/{elementId}.spec.ts (Test files)
```

**Exempel:**
- Epic: `docs/claude/mortgage-se-application.bpmn/abc123/nodes/mortgage-se-application/submit-appeal.html`
- Feature Goal: `docs/claude/mortgage-se-application.bpmn/abc123/feature-goals/mortgage-se-application-internal-data-gathering.html`

---

## 2. Genererings- och Upload-Flöde

### Steg 1: Generering (i minnet)

**Vad som händer:**
1. `generateAllFromBpmnWithGraph()` genererar dokumentation
2. Varje genererad fil läggs i `result.docs` Map (i minnet)
3. Filerna finns INTE i Storage ännu

**Kod:**
```typescript
// I bpmnGenerators.ts
result.docs.set(docFileName, docContent); // Sparar i minnet
```

### Steg 2: Upload till Storage (EFTER generering)

**Vad som händer:**
1. När genereringen är klar, loopar `BpmnFileManager.tsx` genom `result.docs`
2. För varje fil: upload till Supabase Storage
3. Filerna sparas med versioned paths

**Kod (rad 2098-2154 i BpmnFileManager.tsx):**
```typescript
for (const [docFileName, docContent] of result.docs.entries()) {
  const { modePath: docPath } = buildDocStoragePaths(...);
  const htmlBlob = new Blob([docContent], { type: 'text/html; charset=utf-8' });
  const { error: uploadError } = await supabase.storage
    .from('bpmn-files')
    .upload(docPath, htmlBlob, { upsert: true });
}
```

---

## 3. Vad Som Hände Med Din Generering

### Scenario

1. **Generering startade:**
   - Noder började genereras
   - Vissa noder blev klara → sparade i `result.docs` (i minnet)

2. **Nätverksfel inträffade:**
   - `ERR_NETWORK_CHANGED` eller `ERR_INTERNET_DISCONNECTED`
   - Genereringen avbröts eller kastade fel

3. **Upload-steget kördes INTE:**
   - Om genereringen avbröts innan upload-steget
   - Filerna i `result.docs` försvann (de finns bara i minnet)
   - Inga filer uploadades till Storage

4. **Resultat:**
   - Inga filer i Storage
   - Alla genererade filer förlorade (de fanns bara i minnet)

---

## 4. Var Att Leta Efter Filerna

### Supabase Storage (INTE Database)

**Var att kolla:**
1. **Supabase Dashboard → Storage → bpmn-files bucket**
2. **Sökvägar att leta efter:**
   - `docs/claude/{bpmnFileName}/{versionHash}/nodes/...`
   - `docs/claude/{bpmnFileName}/{versionHash}/feature-goals/...`
   - `docs/claude/nodes/...` (non-versioned fallback)

**Hur man kollar:**
1. Öppna Supabase Dashboard
2. Gå till Storage
3. Välj `bpmn-files` bucket
4. Navigera till `docs/claude/`
5. Leta efter dina BPMN-filer och version hashes

### Om Inga Filer Finns

**Möjliga orsaker:**
1. **Genereringen avbröts innan upload:**
   - Filerna genererades i minnet men uploadades aldrig
   - Försvann när genereringen stoppades

2. **Upload misslyckades:**
   - Genereringen klarade sig, men upload-steget misslyckades
   - Kolla console för upload-fel

3. **Fel version hash:**
   - Filerna finns men under annan version hash
   - Leta efter alla version hashes för din BPMN-fil

---

## 5. Storage Path-format

### Versioned Paths (Rekommenderat)

**Format:**
```
docs/claude/{bpmnFileName}/{bpmnVersionHash}/{docFileName}
```

**Exempel:**
- `docs/claude/mortgage-se-application.bpmn/abc123def456/nodes/mortgage-se-application/submit-appeal.html`
- `docs/claude/mortgage-se-application.bpmn/abc123def456/feature-goals/mortgage-se-application-internal-data-gathering.html`

### Non-Versioned Paths (Fallback)

**Format:**
```
docs/claude/{docFileName}
```

**Exempel:**
- `docs/claude/nodes/mortgage-se-application/submit-appeal.html`
- `docs/claude/feature-goals/mortgage-se-application-internal-data-gathering.html`

---

## 6. Problem med Nuvarande Design

### Problem 1: Filerna Försvinner Vid Avbrott

**Problem:**
- Filerna genereras i minnet (`result.docs`)
- Upload sker EFTER genereringen
- Om genereringen avbryts, försvinner filerna

**Påverkan:**
- Allt arbete går förlorat vid avbrott
- Måste generera om allt från början
- Slöseri med tid och kostnader

### Problem 2: Ingen Partial Upload

**Problem:**
- Filerna uploadas bara när ALLA filer är genererade
- Om 50 av 100 noder genererades, uploadas inga
- Ingen möjlighet att spara delvis genererade resultat

**Påverkan:**
- Allt eller inget
- Ingen progress-sparning
- Måste starta om från början

### Problem 3: Ingen Resume-Funktionalitet

**Problem:**
- Om genereringen avbryts, måste starta om från början
- Redan genererade filer genereras om
- Ingen möjlighet att "resume" från avbrott

**Påverkan:**
- Slöseri med tid och kostnader
- Sämre användarupplevelse

---

## 7. Rekommenderade Förbättringar

### Förbättring 1: Upload Efter Varje Nod

**Koncept:**
- Upload varje fil direkt när den genereras
- Inte vänta tills alla är klara

**Fördelar:**
- ✅ Progress sparas direkt
- ✅ Mindre risk för dataförlust
- ✅ Möjlighet att resume från avbrott

**Nackdelar:**
- ⚠️ Fler Storage-anrop (men mindre risk)
- ⚠️ Litet mer komplexitet

### Förbättring 2: Partial Upload vid Avbrott

**Koncept:**
- Om genereringen avbryts, uploada redan genererade filer
- Spara progress innan avbrott

**Fördelar:**
- ✅ Inget arbete går förlorat
- ✅ Möjlighet att resume
- ✅ Bättre användarupplevelse

### Förbättring 3: Resume-Funktionalitet

**Koncept:**
- Spara genereringsstatus i database
- Track vilka noder som genererats
- Vid resume: hoppa över redan genererade noder

**Fördelar:**
- ✅ Ingen slöseri med tid och kostnader
- ✅ Bättre användarupplevelse
- ✅ Möjlighet att återuppta efter avbrott

---

## 8. Vad Du Kan Göra Nu

### Omedelbart

1. **Kolla Supabase Storage:**
   - Öppna Supabase Dashboard
   - Gå till Storage → `bpmn-files` bucket
   - Navigera till `docs/claude/`
   - Leta efter dina BPMN-filer

2. **Kolla Console:**
   - Öppna browser console (F12)
   - Leta efter loggar som:
     - `[BpmnFileManager] Uploading doc: ...`
     - `[BpmnFileManager] ✓ Successfully uploaded ...`
     - `[BpmnFileManager] Error uploading ...`

3. **Kolla Version Hashes:**
   - Filerna kan finnas under olika version hashes
   - Leta efter alla version hashes för din BPMN-fil

### Om Inga Filer Finns

**Sannolikt:**
- Genereringen avbröts innan upload-steget
- Filerna fanns bara i minnet och försvann
- Du behöver generera om

**Nästa steg:**
- Starta om genereringen
- Denna gång: se till att nätverket är stabilt
- Överväg att använda Batch API (asynkron, mindre risk för avbrott)

---

## 9. Tekniska Detaljer

### Storage Path-Bestämning

**Kod (rad 2109-2115 i BpmnFileManager.tsx):**
```typescript
const { modePath: docPath } = buildDocStoragePaths(
  docFileName,
  effectiveLlmMode ?? null,
  llmProvider,
  docBpmnFile, // BPMN-filen som dokumentet tillhör
  docVersionHash // Version hash för den BPMN-filen
);
```

**Resultat:**
- Om `docVersionHash` finns: `docs/claude/{bpmnFileName}/{versionHash}/{docFileName}`
- Om `docVersionHash` saknas: `docs/claude/{docFileName}`

### Upload-Logik

**Kod (rad 2120-2126):**
```typescript
const { error: uploadError } = await supabase.storage
  .from('bpmn-files')
  .upload(docPath, htmlBlob, {
    upsert: true, // Skriver över befintliga filer
    contentType: 'text/html; charset=utf-8',
    cacheControl: '3600',
  });
```

**Viktigt:**
- `upsert: true` betyder att befintliga filer skrivs över
- Om filen redan finns, uppdateras den
- Om filen saknas, skapas den

---

## 10. Slutsatser

### Var Filerna Sparas

1. **Under generering:** I minnet (`result.docs` Map)
2. **Efter generering:** I Supabase Storage (`bpmn-files` bucket)
3. **INTE i databasen:** PostgreSQL används bara för metadata

### Varför Du Inte Ser Något

**Sannolikt:**
- Genereringen avbröts innan upload-steget
- Filerna fanns bara i minnet och försvann
- Inga filer uploadades till Storage

**Var att leta:**
- Supabase Dashboard → Storage → `bpmn-files` → `docs/claude/`
- Leta efter dina BPMN-filer och version hashes

### Nästa Steg

1. **Kolla Storage:** Verifiera att inga filer finns
2. **Starta om generering:** Med stabil nätverksanslutning
3. **Övervaka upload:** Se till att upload-steget körs
4. **Överväg förbättringar:** Upload efter varje nod, resume-funktionalitet

---

## Relaterade dokument

- `NETWORK_ERROR_HANDLING_ANALYSIS.md` - Nätverksfel-hantering
- `STORAGE_DOCUMENTATION_ANALYSIS.md` - Storage-analys
