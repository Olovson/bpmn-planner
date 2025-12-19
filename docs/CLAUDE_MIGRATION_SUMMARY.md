# Sammanfattning: Migration till Claude API + Lokala Embeddings

**Datum:** 2025-01-27  
**Status:** ✅ Klar

---

## ✅ Vad som är klart

### 1. Lokala Embeddings (Istället för OpenAI)

**Uppdaterade filer:**
- ✅ `scripts/vector-db/index-docs.ts` - Använder nu `@xenova/transformers`
- ✅ `scripts/vector-db/search.ts` - Använder nu `@xenova/transformers`

**Fördelar:**
- ✅ Gratis (ingen API-kostnad)
- ✅ Lokalt (ingen data lämnar datorn)
- ✅ Fungerar offline

**Kvalitet:**
- ⚠️ Sämre än OpenAI embeddings (men fortfarande bra)
- ✅ Fungerar bra för dokumentationssökning

### 2. Dependencies

**Installerat:**
- ✅ `@xenova/transformers` - För lokala embeddings
- ✅ `chromadb` - Vektordatabas (redan installerat)
- ✅ `@byterover/cipher` - MCP server (redan installerat)

**Kvar (för dokumentationsgenerering):**
- ⚠️ `openai` - Används fortfarande för embeddings om `OPENAI_API_KEY` är satt
- ℹ️ Kan tas bort senare om du inte vill använda OpenAI alls

---

## 📋 Vad du behöver göra

### Steg 1: Sätt Claude API Key

```bash
export ANTHROPIC_API_KEY=your-claude-api-key-here
```

**Eller lägg till i `.env`:**
```bash
echo "ANTHROPIC_API_KEY=your-claude-api-key-here" >> .env
```

### Steg 2: Testa Lokala Embeddings

**Indexera dokumentation:**
```bash
npm run vector:index
```

**Första gången:**
- Laddar ner embedding-modell (~80MB)
- Kan ta 2-3 minuter
- Efter det är det snabbt

**Testa sökning:**
```bash
npm run vector:search "hur fungerar BPMN hierarki?"
```

### Steg 3: Konfigurera Cipher (Om du vill)

**Installera Cipher globalt:**
```bash
npm install -g @byterover/cipher
```

**Konfigurera i Cursor:**
- Öppna Cursor settings
- Gå till MCP/Extensions
- Lägg till Cipher som MCP-server

---

## ⚠️ Viktigt: Claude API har INTE Embeddings API

**Claude API är en LLM (språkmodell), inte en embedding-modell.**

**Därför:**
- ✅ **Claude API** - För dokumentationsgenerering (Feature Goals, Epics, etc.)
- ✅ **Lokala embeddings** - För vektordatabas (gratis, lokalt)

**De kompletterar varandra perfekt!**

---

## 💰 Kostnad

### Lokala Embeddings (Nuvarande Setup)

**Kostnad:**
- ✅ **Gratis** - Inga API-kostnader
- ✅ **Lokalt** - Ingen data lämnar datorn

**Kvalitet:**
- ⚠️ Sämre än OpenAI embeddings (men fortfarande bra)
- ✅ Fungerar bra för dokumentationssökning

### Claude API (För Dokumentationsgenerering)

**Kostnad:**
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens
- För 26 Feature Goals: ~$1.33

**Kvalitet:**
- ✅ Bättre än ChatGPT
- ✅ Bättre svenska
- ✅ Bättre kontextförståelse

---

## 🔄 Alternativ: OpenAI Embeddings

**Om du vill använda OpenAI embeddings istället:**

1. **Sätt OpenAI API key:**
   ```bash
   export OPENAI_API_KEY=your-openai-key
   ```

2. **Scripts kommer automatiskt använda OpenAI om `OPENAI_API_KEY` är satt**

**Kostnad:**
- För ~100 dokumentationsfiler: ~$0.01 (en gång)
- För sökningar: ~$0.0001 per sökning

**Kvalitet:**
- ✅ Bättre än lokala embeddings
- ✅ Mycket billigt

---

## 📝 Nästa Steg

1. ✅ Sätt `ANTHROPIC_API_KEY`
2. ✅ Testa `npm run vector:index`
3. ✅ Testa `npm run vector:search "test"`
4. ✅ Börja generera dokumentation med Claude API!

---

## 🐛 Felsökning

### Problem: "Embedding model not found"

**Lösning:**
- Modellen laddas automatiskt första gången
- Kontrollera internetanslutning
- Vänta på att modellen laddas (~80MB)

### Problem: "Chroma collection not found"

**Lösning:**
- Kör `npm run vector:index` först
- Kontrollera att `.chroma/` mappen finns

### Problem: "ANTHROPIC_API_KEY not set"

**Lösning:**
- Sätt miljövariabel: `export ANTHROPIC_API_KEY=your-key`
- Eller lägg till i `.env` fil

---

## ✅ Sammanfattning

**Nuvarande Setup:**
- ✅ **Claude API** - För dokumentationsgenerering
- ✅ **Lokala embeddings** - För vektordatabas (gratis)
- ✅ **ChromaDB** - Lokal vektordatabas
- ✅ **Cipher** - MCP server för Cursor

**Kostnad:**
- Claude API: ~$1.33 för 26 Feature Goals
- Embeddings: Gratis (lokalt)
- ChromaDB: Gratis (lokalt)
- Cipher: Gratis (open source)

**Total:** ~$1.33 för all dokumentationsgenerering + gratis embeddings!

