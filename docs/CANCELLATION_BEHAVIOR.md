# Avbrytning av Generering - Teknisk Dokumentation

## Nuvarande Beteende (Efter Förbättringar)

När användaren klickar på "Avbryt Körning":

1. ✅ **UI reagerar omedelbart** - Dialogen stängs och state återställs
2. ✅ **checkCancellation() kastar fel** - Stoppar framtida steg i genereringsflödet
3. ✅ **checkCancellation() anropas INNAN varje LLM-anrop** - Förhindrar nya LLM-anrop
4. ✅ **Local LLM-anrop kan avbrytas** - Använder AbortController för att avbryta pågående fetch-anrop
5. ⚠️ **Cloud LLM-anrop (Claude) kan inte avbrytas** - SDK stödjer inte AbortController, men kontrollerar avbrytning INNAN anropet
6. ⚠️ **Pågående Supabase-operationer fortsätter** - Kan inte avbrytas när de väl startats
7. ✅ **Framtida noder hoppas över** - checkCancellation() anropas före varje ny nod

## Vad händer vid avbrytning?

### ✅ Vad som STÄNGS/STOPPAS omedelbart:
- **UI-dialogen** - Stängs omedelbart
- **Framtida noder** - Hoppas över (checkCancellation() anropas före varje nod)
- **Framtida Supabase-operationer** - Hoppas över (checkCancellation() anropas före varje operation)
- **Jobb i databasen** - Markeras som "cancelled" (om det hinner)

### ⚠️ Vad som FORTSÄTTER köra:
- **Pågående Cloud LLM-anrop (Claude)** - Kan inte avbrytas när de väl startats (SDK stödjer inte AbortController)
  - Men: Kontrollerar avbrytning INNAN anropet görs, så nya anrop stoppas
- **Pågående Local LLM-anrop (Ollama)** - Kan nu avbrytas via AbortController
  - Fetch-anrop avbryts när användaren klickar "Avbryt"
- **Pågående Supabase-operationer** - Kan inte avbrytas när de väl startats
  - Database writes (INSERT/UPDATE)
  - Storage uploads
- **Pågående subprocesser** - Om en subprocess redan startat generering, fortsätter den

### 🔄 Vad som händer efter avbrytning:
- När pågående LLM-anrop är klara, kastar de ett fel som fångas upp
- När pågående Supabase-operationer är klara, slutförs de (men resultatet ignoreras)
- Genereringsflödet avslutas med ett "Avbrutet av användaren"-fel

## Begränsningar

### LLM-anrop (Claude/Ollama)
- **Cloud LLM (Claude)**: SDK stödjer inte AbortController direkt, så pågående API-anrop kan INTE avbrytas
  - Men: Kontrollerar avbrytning INNAN varje anrop, så nya anrop stoppas omedelbart
- **Local LLM (Ollama)**: Använder AbortController för både timeout OCH användaravbrytning
  - Fetch-anrop kan nu avbrytas när användaren klickar "Avbryt"
- **Konsekvens**: 
  - Local LLM-anrop kan avbrytas omedelbart
  - Cloud LLM-anrop som redan startat fortsätter, men nya anrop stoppas

### Supabase-operationer
- **Database writes**: Kan inte avbrytas när de väl startats
- **Storage uploads**: Kan inte avbrytas när de väl startats
- **Konsekvens**: Pågående Supabase-operationer kommer att slutföras även efter avbrytning

### Subprocesser
- Noder genereras **sekventiellt** (inte parallellt)
- `checkCancellation()` anropas **före** varje ny nod
- **Konsekvens**: Framtida noder hoppas över korrekt, men pågående noder slutförs

## Implementerade Förbättringar

### 1. ✅ AbortController-stöd för LLM-anrop
- ✅ AbortController skapas i `BpmnFileManager` vid start av generering
- ✅ AbortController abortas när användaren klickar "Avbryt"
- ✅ AbortSignal skickas till alla LLM-anrop via `generateAllFromBpmnWithGraph`
- ✅ Local LLM (Ollama) använder AbortSignal för att avbryta fetch-anrop
- ✅ Cloud LLM (Claude) kontrollerar abortSignal INNAN anropet görs

### 2. ✅ checkCancellation() före LLM-anrop
- ✅ `checkCancellation()` skickas till `generateAllFromBpmnWithGraph`
- ✅ `checkCancellation()` anropas INNAN varje LLM-anrop i `renderDocWithLlmFallback`
- ✅ `checkCancellation()` anropas INNAN varje LLM-anrop i `generateTestSpecWithLlm`

### 3. ⚠️ Supabase-operationer
- Supabase-operationer kan inte avbrytas, men de är vanligtvis snabba
- Jobbet markeras som "cancelled" i databasen när användaren avbryter

## Rekommendationer

1. **Kort sikt**: Behåll nuvarande beteende men dokumentera begränsningarna tydligt
2. **Medel sikt**: Implementera AbortController-stöd för LLM-anrop
3. **Lång sikt**: Överväg att flytta tunga operationer till server-side (Supabase Functions) där de kan avbrytas mer effektivt

## Sammanfattning

**Kort svar**: Nej, avbryt-knappen terminerar INTE alla pågående aktiviteter omedelbart.

**Vad som händer (Efter Förbättringar):**
- ✅ UI stängs omedelbart
- ✅ Framtida noder hoppas över
- ✅ Framtida LLM-anrop stoppas (checkCancellation() + abortSignal kontrolleras INNAN anropet)
- ✅ Pågående Local LLM-anrop (Ollama) avbryts omedelbart via AbortController
- ⚠️ Pågående Cloud LLM-anrop (Claude) fortsätter tills de är klara (SDK-begränsning)
- ⚠️ Pågående Supabase-operationer slutförs (kan inte avbrytas)
- ⚠️ Pågående subprocesser slutförs

**Varför vissa saker fortfarande fortsätter:**
- Cloud LLM (Claude SDK) stödjer inte AbortController direkt
- Supabase-operationer kan inte avbrytas när de väl startats
- Men: Nya anrop stoppas omedelbart tack vare checkCancellation() + abortSignal-kontroller

**Implementerade Förbättringar:**
1. ✅ `checkCancellation` skickas till `bpmnGenerators.ts` och vidare till alla LLM-anrop
2. ✅ `checkCancellation()` anropas INNAN varje LLM-anrop (i `renderDocWithLlmFallback` och `generateTestSpecWithLlm`)
3. ✅ AbortController-stöd implementerat för Local LLM (Ollama)
4. ✅ AbortSignal-kontroll implementerad för Cloud LLM (Claude) INNAN anropet



