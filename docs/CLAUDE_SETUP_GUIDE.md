# Setup Guide: Claude API + Cipher + ChromaDB

**Datum:** 2025-01-27  
**Syfte:** Konfigurera Claude API för dokumentationsgenerering och lokala embeddings för vektordatabas

---

## ⚠️ Viktigt: Claude API har INTE Embeddings API

**Claude API är en LLM (språkmodell), inte en embedding-modell.**

- ✅ Claude kan generera text, förklara, analysera
- ❌ Claude kan INTE skapa embeddings (vektorer) från text

**Därför använder vi:**
- **Claude API** - För dokumentationsgenerering (Feature Goals, Epics, etc.)
- **Lokala embeddings** (`@xenova/transformers`) - För vektordatabas (gratis, lokalt)

---

## 📋 Vad du behöver

### 1. Claude API Key

**Skaffa API-nyckel:**
1. Gå till https://console.anthropic.com/
2. Skapa konto eller logga in
3. Gå till API Keys
4. Skapa ny API-nyckel
5. Kopiera nyckeln

**Sätt miljövariabel:**
```bash
export ANTHROPIC_API_KEY=your-claude-api-key-here
```

**Eller lägg till i `.env` fil:**
```bash
ANTHROPIC_API_KEY=your-claude-api-key-here
```

### 2. Installera Dependencies

**Redan installerat:**
- ✅ `chromadb` - Vektordatabas
- ✅ `@xenova/transformers` - Lokala embeddings
- ✅ `@byterover/cipher` - MCP server för Cursor

**Om du behöver installera:**
```bash
npm install
```

---

## 🚀 Setup Steg

### Steg 1: Sätt Claude API Key

```bash
export ANTHROPIC_API_KEY=your-claude-api-key-here
```

**För permanent setup, lägg till i `.env`:**
```bash
echo "ANTHROPIC_API_KEY=your-claude-api-key-here" >> .env
```

### Steg 2: Testa Lokala Embeddings

**Indexera dokumentation:**
```bash
npm run vector:index
```

**Detta kommer:**
- Ladda ner embedding-modell första gången (~80MB)
- Indexera alla `.md` filer från `docs/`
- Skapa embeddings lokalt (ingen API-kostnad)
- Lagra i lokal Chroma-databas (`.chroma/`)

**Första gången kan det ta 2-3 minuter (laddar modell).**

### Steg 3: Testa Sökning

**Sök i dokumentation:**
```bash
npm run vector:search "hur fungerar BPMN hierarki?"
```

**Detta kommer:**
- Skapa embedding för sökfrågan
- Söka i vektordatabasen
- Visa top 5 resultat med relevans

### Steg 4: Konfigurera Cipher

**Installera Cipher globalt (om inte redan gjort):**
```bash
npm install -g @byterover/cipher
```

**Konfigurera Cipher i Cursor:**
1. Öppna Cursor settings
2. Gå till MCP/Extensions
3. Lägg till Cipher som MCP-server:

```json
{
  "mcpServers": {
    "cipher": {
      "command": "cipher",
      "args": ["--vector-db", "chroma", "--chroma-path", ".chroma"]
    }
  }
}
```

**Indexera med Cipher:**
```bash
cipher index --use-existing-vector-db
```

---

## 💰 Kostnad

### Lokala Embeddings (Nuvarande Setup)

**Kostnad:**
- ✅ **Gratis** - Inga API-kostnader
- ✅ **Lokalt** - Ingen data lämnar datorn
- ⚠️ **Första laddningen** - ~80MB modell laddas ner

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

2. **Uppdatera scripts:**
   - Scripts kommer automatiskt använda OpenAI om `OPENAI_API_KEY` är satt
   - Annars använder de lokala embeddings

**Kostnad:**
- För ~100 dokumentationsfiler: ~$0.01 (en gång)
- För sökningar: ~$0.0001 per sökning

**Kvalitet:**
- ✅ Bättre än lokala embeddings
- ✅ Mycket billigt

---

## 📝 Sammanfattning

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

## ✅ Nästa Steg

1. ✅ Sätt `ANTHROPIC_API_KEY`
2. ✅ Testa `npm run vector:index`
3. ✅ Testa `npm run vector:search "test"`
4. ✅ Konfigurera Cipher i Cursor
5. ✅ Börja generera dokumentation med Claude API!

