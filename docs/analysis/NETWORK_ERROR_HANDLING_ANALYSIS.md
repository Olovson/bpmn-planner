# Analys: Nätverksfel och Genereringsavbrott

**Datum:** 2025-12-22  
**Syfte:** Analysera vad nätverksfel betyder och hur de påverkar generering

## Sammanfattning

Nätverksfel (`ERR_NETWORK_CHANGED`, `ERR_INTERNET_DISCONNECTED`) avbryter genereringen för den aktuella noden, men genereringen fortsätter med nästa nod. Det finns ingen automatisk retry-logik för nätverksfel.

---

## 1. Vad Felmeddelandena Betyder

### `ERR_NETWORK_CHANGED`
**Betydelse:**
- Nätverket ändrades under API-anropet
- Exempel: WiFi-byte, VPN-anslutning ändrades, nätverksinterface ändrades
- Browser/OS detekterade nätverksändring och avbröt anslutningen

**Vanliga orsaker:**
- WiFi-byte (från ett nätverk till ett annat)
- VPN-anslutning/disconnection
- Nätverksinterface ändrades (t.ex. Ethernet → WiFi)
- Mobil hotspot aktiverades/inaktiverades

### `ERR_INTERNET_DISCONNECTED`
**Betydelse:**
- Internet-anslutningen förlorades helt
- Exempel: WiFi förlorades, kabel lossnade, router restart
- Browser/OS detekterade att internet inte är tillgängligt

**Vanliga orsaker:**
- WiFi-signal försvann
- Ethernet-kabel lossnade
- Router/modem restartade
- ISP-problem
- Firewall/proxy blockerade anslutningen

---

## 2. Hur Appen Hanterar Dessa Fel

### Nuvarande Felhantering

**I `cloudLlmClient.ts` (rad 265-306):**
```typescript
catch (error: any) {
  // Hantera 429 Rate Limit fel
  if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
    // ... rate limit handling
  }
  
  // Hantera output_format-fel specifikt
  if (error?.status === 400 && ...) {
    // ... output_format handling
  }
  
  // Hantera andra fel
  console.error('Cloud LLM generation error:', error);
  return null; // ⚠️ Returnerar null för nätverksfel
}
```

**Problem:**
- Nätverksfel (`ERR_NETWORK_CHANGED`, `ERR_INTERNET_DISCONNECTED`) fångas som "andra fel"
- Returnerar `null` istället för att kasta fel
- Ingen retry-logik
- Ingen specifik hantering för nätverksfel

**I `renderDocWithLlm` (rad 1078-1088):**
```typescript
catch (error) {
  console.error(`[LLM Documentation] Failed to generate...`, error);
  // Kasta fel vidare - inga fallbacks
  throw error; // ⚠️ Kastar fel vidare
}
```

**Problem:**
- Om `generateDocumentationWithLlm` returnerar `null` (pga nätverksfel), kastas fel
- Genereringen för denna nod stoppas
- Men genereringen fortsätter med nästa nod

---

## 3. Vad Som Hände Med Din Generering

### Sannolikt Flöde

1. **Generering pågick:**
   - Appen genererade dokumentation för noder sekventiellt
   - Varje nod gör ett API-anrop till Claude

2. **Nätverksfel inträffade:**
   - Nätverket ändrades eller förlorades under ett API-anrop
   - Browser detekterade `ERR_NETWORK_CHANGED` eller `ERR_INTERNET_DISCONNECTED`
   - API-anropet misslyckades

3. **Felhantering:**
   - `cloudLlmClient.generateText()` fångade felet
   - Returnerade `null` (rad 305)
   - `generateDocumentationWithLlm()` fick `null` som resultat
   - Kastade fel (rad 1088)
   - Genereringen för denna nod stoppades

4. **Genereringen fortsatte:**
   - Om genereringen loopar genom noder, fortsätter den med nästa nod
   - Men den misslyckade noden får ingen dokumentation
   - Genereringen kan fortsätta tills alla noder är processade

### Vad Som Sparades

**Sparat:**
- Alla noder som genererades FÖRE nätverksfelet
- Dokumentation finns i Storage för dessa noder

**Inte sparat:**
- Noden som misslyckades pga nätverksfel
- Eventuella noder efter den misslyckade (om genereringen stoppades helt)

---

## 4. Problem med Nuvarande Hantering

### Problem 1: Ingen Retry-Logik

**Problem:**
- Nätverksfel är ofta tillfälliga
- Om internet återkommer direkt efter, skulle retry fungera
- Men appen försöker inte igen automatiskt

**Påverkan:**
- Noder misslyckas även om nätverket återkommer snabbt
- Användaren måste starta om hela genereringen
- Potentiellt slöseri med tid och kostnader

### Problem 2: Ingen Specifik Hantering

**Problem:**
- Nätverksfel behandlas som generiska fel
- Ingen skillnad mellan tillfälliga (nätverksfel) och permanenta (invalid API key) fel
- Samma hantering för alla feltyper

**Påverkan:**
- Svårt att veta vad som gick fel
- Ingen möjlighet att automatiskt retry för tillfälliga fel
- Användaren får inte tydlig feedback om vad som hände

### Problem 3: Ingen Resume-Funktionalitet

**Problem:**
- Om genereringen avbryts, måste användaren starta om från början
- Redan genererade noder genereras om (eller hoppas över om de finns i Storage)
- Ingen möjlighet att "resume" från där det stoppades

**Påverkan:**
- Slöseri med tid (genererar om redan genererade noder)
- Slöseri med kostnader (LLM-anrop för redan genererade noder)
- Sämre användarupplevelse

---

## 5. Rekommenderade Förbättringar

### Förbättring 1: Retry-Logik för Nätverksfel

**Koncept:**
- Identifiera nätverksfel specifikt
- Automatisk retry med exponential backoff
- Max 3-5 försök innan fel kastas

**Implementation:**
```typescript
// I cloudLlmClient.ts
catch (error: any) {
  // Identifiera nätverksfel
  const isNetworkError = 
    error?.message?.includes('ERR_NETWORK_CHANGED') ||
    error?.message?.includes('ERR_INTERNET_DISCONNECTED') ||
    error?.message?.includes('fetch failed') ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT';
  
  if (isNetworkError && retryCount < MAX_RETRIES) {
    // Exponential backoff: 1s, 2s, 4s, 8s
    const delay = Math.pow(2, retryCount) * 1000;
    await sleep(delay);
    return this.generateText({ ...args, retryCount: retryCount + 1 });
  }
  
  // ... annan felhantering
}
```

**Fördelar:**
- Automatisk återhämtning från tillfälliga nätverksfel
- Bättre användarupplevelse (ingen manuell återstart)
- Mindre slöseri med tid och kostnader

### Förbättring 2: Specifik Felhantering

**Koncept:**
- Skapa specifika error-klasser för olika feltyper
- Olika hantering för tillfälliga vs permanenta fel
- Tydlig feedback till användaren

**Implementation:**
```typescript
export class CloudLlmNetworkError extends Error {
  readonly isTemporary: boolean = true;
  readonly retryable: boolean = true;
  
  constructor(message: string) {
    super(`Network error: ${message}`);
    this.name = 'CloudLlmNetworkError';
  }
}

// I cloudLlmClient.ts
catch (error: any) {
  if (isNetworkError) {
    throw new CloudLlmNetworkError(error.message);
  }
  // ... annan felhantering
}
```

**Fördelar:**
- Tydligare felhantering
- Möjlighet att retry för tillfälliga fel
- Bättre feedback till användaren

### Förbättring 3: Resume-Funktionalitet

**Koncept:**
- Spara progress under generering
- Möjlighet att "resume" från där det stoppades
- Hoppa över redan genererade noder

**Implementation:**
- Spara genereringsstatus i database
- Track vilka noder som genererats
- Vid resume: hoppa över redan genererade noder
- Fortsätt från första misslyckade noden

**Fördelar:**
- Ingen slöseri med tid och kostnader
- Bättre användarupplevelse
- Möjlighet att återuppta efter avbrott

---

## 6. Vad Du Kan Göra Nu

### Omedelbart

1. **Kontrollera nätverksanslutning:**
   - Verifiera att internet fungerar
   - Testa att öppna https://api.anthropic.com i browser
   - Kontrollera att API-nyckel är korrekt

2. **Kontrollera genereringsstatus:**
   - Kolla vilka noder som genererades (finns i Storage)
   - Identifiera vilka noder som saknas
   - Notera var genereringen stoppade

3. **Återuppta generering:**
   - Starta om genereringen
   - Appen hoppar över noder som redan finns i Storage (om `forceRegenerate` är false)
   - Genererar bara saknade noder

### För Framtiden

1. **Överväg retry-logik:**
   - Implementera automatisk retry för nätverksfel
   - Exponential backoff för att undvika överbelastning

2. **Överväg resume-funktionalitet:**
   - Spara genereringsstatus
   - Möjlighet att återuppta från avbrott

3. **Förbättra felhantering:**
   - Specifika error-klasser för olika feltyper
   - Tydligare feedback till användaren

---

## 7. Tekniska Detaljer

### Hur Nätverksfel Detekteras

**Browser-nivå:**
- Browser detekterar nätverksändringar via OS-events
- `ERR_NETWORK_CHANGED`: Nätverksinterface ändrades
- `ERR_INTERNET_DISCONNECTED`: Ingen internet-anslutning

**Fetch API:**
- `fetch()` kastar `TypeError` med `ERR_NETWORK_CHANGED` eller `ERR_INTERNET_DISCONNECTED`
- Felet propageras till `cloudLlmClient.generateText()`
- Fångas i `catch`-blocket

### Nuvarande Felhantering-Flöde

```
API-anrop misslyckas (nätverksfel)
  ↓
cloudLlmClient.generateText() catch-block
  ↓
Returnerar null (rad 305)
  ↓
generateDocumentationWithLlm() får null
  ↓
Kastar fel (rad 1088)
  ↓
renderDocWithLlm() catch-block
  ↓
Kastar fel vidare
  ↓
bpmnGenerators.ts loop fortsätter med nästa nod
```

**Resultat:**
- Denna nod misslyckas
- Genereringen fortsätter med nästa nod
- Om alla noder misslyckas, stoppas genereringen

---

## 8. Slutsatser

### Vad Som Hände

1. **Nätverksfel inträffade:**
   - `ERR_NETWORK_CHANGED` eller `ERR_INTERNET_DISCONNECTED`
   - Under ett API-anrop till Claude

2. **Genereringen avbröts:**
   - För den aktuella noden
   - Men fortsätter med nästa nod (om loop inte stoppades)

3. **Ingen automatisk retry:**
   - Appen försöker inte igen automatiskt
   - Användaren måste starta om genereringen

### Rekommendationer

**Kort sikt:**
- Starta om genereringen (appen hoppar över redan genererade noder)
- Kontrollera nätverksanslutning innan generering

**Lång sikt:**
- Implementera retry-logik för nätverksfel
- Implementera resume-funktionalitet
- Förbättra felhantering med specifika error-klasser

---

## Relaterade dokument

- `CLAUDE_API_BATCH_ANALYSIS.md` - Batch API analys
- `STRATEGIC_IMPROVEMENTS_OVERVIEW.md` - Strategiska förbättringar
