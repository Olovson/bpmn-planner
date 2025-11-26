# ChatGPT Pipeline Validation Strategy

## Översikt

Detta dokument beskriver valideringsstrategin för ChatGPT-pipelinen för att säkerställa att den fungerar korrekt i olika scenarion innan man använder den i produktion (eftersom det kostar pengar).

## Kritiska Scenarion

### 1. Lokal dokumentation finns redan

**Scenario:** Användaren har redan skapat lokal dokumentation och vill nu generera med ChatGPT.

**Vad som måste fungera:**
- ✅ Override-filer ska läsas in korrekt
- ✅ LLM-innehåll ska mergas med befintliga overrides
- ✅ Befintligt innehåll ska inte skrivas över
- ✅ Hierarkin ska byggas korrekt även om lokal dokumentation finns

**Validering:**
```bash
node scripts/validate-chatgpt-scenarios.mjs
```

**Test:**
1. Skapa lokal dokumentation för en nod
2. Generera dokumentation med ChatGPT för samma nod
3. Verifiera att både lokal och LLM-innehåll finns i resultatet

### 2. Ingen lokal dokumentation finns

**Scenario:** Användaren genererar dokumentation för första gången.

**Vad som måste fungera:**
- ✅ LLM-anrop ska fungera korrekt
- ✅ Response ska valideras
- ✅ Dokumentation ska genereras korrekt
- ✅ Fallback ska fungera om LLM misslyckas

**Validering:**
```bash
node scripts/validate-chatgpt-scenarios.mjs
npm run test:llm:smoke
```

### 3. Override-filer har fel format

**Scenario:** Override-filer har syntaxfel eller saknar nödvändiga fält.

**Vad som måste fungera:**
- ✅ Systemet ska hantera fel gracefully
- ✅ Fel ska loggas tydligt
- ✅ Fallback ska aktiveras om override-filer är ogiltiga

**Validering:**
- Skapa en override-fil med fel format
- Försök generera dokumentation
- Verifiera att fel hanteras korrekt

### 4. BPMN-filer saknas eller är ogiltiga

**Scenario:** BPMN-filer som refereras finns inte eller är korrupta.

**Vad som måste fungera:**
- ✅ Parser ska hantera fel gracefully
- ✅ Missing dependencies ska loggas
- ✅ Systemet ska fortsätta med tillgängliga filer

**Validering:**
```bash
node scripts/validate-chatgpt-scenarios.mjs
```

### 5. Hierarki byggs om varje gång

**Scenario:** Hierarkin byggs om även om inget har ändrats.

**Vad som måste fungera:**
- ✅ Hierarkin ska alltid vara korrekt (byggs om varje gång)
- ✅ Detta är avsiktligt för att säkerställa korrekt kontext
- ⚠️ Detta kan vara ineffektivt men är korrekt

**Validering:**
- Generera dokumentation två gånger
- Verifiera att hierarkin byggs om båda gångerna
- Verifiera att resultatet är konsistent

### 6. LLM API-nyckel saknas eller är ogiltig

**Scenario:** `VITE_OPENAI_API_KEY` saknas eller är ogiltig.

**Vad som måste fungera:**
- ✅ Systemet ska inte försöka göra API-anrop
- ✅ `isLlmEnabled()` ska returnera false
- ✅ Fallback till lokal dokumentation ska aktiveras
- ✅ Inga API-anrop ska göras (sparar pengar)

**Validering:**
```bash
# Testa utan API-nyckel
unset VITE_OPENAI_API_KEY
npm run dev
# Försök generera dokumentation
# Verifiera att fallback aktiveras
```

### 7. Response-validering fungerar

**Scenario:** ChatGPT returnerar ogiltigt svar.

**Vad som måste fungera:**
- ✅ Response ska valideras mot JSON-schema
- ✅ HTML ska valideras
- ✅ Ogiltiga svar ska loggas
- ✅ Fallback ska aktiveras

**Validering:**
```bash
npm run test:llm:smoke
```

### 8. Error handling och fallback

**Scenario:** API-anrop misslyckas eller timeout.

**Vad som måste fungera:**
- ✅ Fel ska fångas och loggas
- ✅ Fallback till lokal/Ollama ska aktiveras
- ✅ Användaren ska informeras om vad som hände
- ✅ Inga pengar ska slösas på misslyckade anrop

**Validering:**
- Simulera API-fel
- Verifiera att fallback aktiveras
- Verifiera att fel loggas

### 9. Kontext-byggning fungerar korrekt

**Scenario:** Kontext byggs för ChatGPT-anrop.

**Vad som måste fungera:**
- ✅ `buildNodeDocumentationContext` ska fungera korrekt
- ✅ `buildContextPayload` ska inkludera all nödvändig information
- ✅ Hierarki, parent-chain, child-nodes ska inkluderas
- ✅ Kontext ska vara korrekt även om lokal dokumentation finns

**Validering:**
```bash
node scripts/validate-chatgpt-scenarios.mjs
```

### 10. Override-filer mergas korrekt med LLM-innehåll

**Scenario:** Både override-filer och LLM-innehåll finns.

**Vad som måste fungera:**
- ✅ Override-filer ska läsas in först
- ✅ LLM-innehåll ska läggas till över overrides
- ✅ Merge-strategin ska vara korrekt
- ✅ Inget innehåll ska försvinna

**Validering:**
1. Skapa override-fil med `summary: 'Lokal text'`
2. Generera dokumentation med ChatGPT
3. Verifiera att både lokal och LLM-innehåll finns

## Valideringskommandon

### Strukturell validering (gratis, snabb)
```bash
node scripts/validate-chatgpt-scenarios.mjs
```

Detta validerar strukturen utan att göra faktiska API-anrop.

### Pipeline-validering
```bash
npm run validate:pipelines
```

Detta validerar att alla pipelines fungerar korrekt.

### Faktiska API-anrop (kostar pengar, använd sparsamt)
```bash
npm run test:llm:smoke
```

Detta gör faktiska API-anrop och kostar pengar. Använd endast när du är säker på att strukturen är korrekt.

## Checklista innan produktion

- [ ] Kör strukturell validering: `node scripts/validate-chatgpt-scenarios.mjs`
- [ ] Kör pipeline-validering: `npm run validate:pipelines`
- [ ] Testa med lokal dokumentation: Skapa lokal dokumentation och generera med ChatGPT
- [ ] Testa utan API-nyckel: Verifiera att fallback fungerar
- [ ] Testa med override-filer: Skapa override-filer och generera
- [ ] Testa med saknade BPMN-filer: Verifiera error handling
- [ ] Testa faktiska API-anrop (valfritt): `npm run test:llm:smoke`

## Kostnadsoptimering

### Innan du genererar dokumentation:

1. **Validera strukturen först** (gratis):
   ```bash
   node scripts/validate-chatgpt-scenarios.mjs
   ```

2. **Kontrollera att API-nyckel är korrekt**:
   - Verifiera att `VITE_OPENAI_API_KEY` är satt
   - Verifiera att `VITE_USE_LLM=true`

3. **Testa med en liten fil först**:
   - Generera dokumentation för en enda nod
   - Verifiera att det fungerar
   - Generera sedan för fler noder

4. **Använd lokal dokumentation när möjligt**:
   - Skapa lokal dokumentation för enklare noder
   - Använd ChatGPT endast för komplexa noder

## Felsökning

### Problem: API-anrop görs trots att lokal dokumentation finns

**Lösning:** Detta är korrekt beteende. LLM-innehåll läggs till över lokal dokumentation.

### Problem: Hierarkin byggs om varje gång

**Lösning:** Detta är avsiktligt för att säkerställa korrekt kontext. Det kan optimeras med caching i framtiden.

### Problem: Override-filer ignoreras

**Lösning:** Kontrollera att override-filer har korrekt format och NODE CONTEXT.

---

**Datum:** 2025-11-26
**Status:** Valideringsstrategi implementerad

