# Varför behövs OpenAI med ChromaDB och Cipher?

## Kort svar

**OpenAI behövs för att skapa embeddings (vektorer) från text.** ChromaDB lagrar och söker i dessa embeddings, men kan inte skapa dem själv.

## Detaljerad förklaring

### Vad gör varje komponent?

1. **OpenAI Embeddings API** (`text-embedding-3-small`)
   - **Syfte:** Konverterar text → vektor (embedding)
   - **När:** Vid indexering (text → embedding → lagras i ChromaDB)
   - **När:** Vid sökning (sökfråga → embedding → söker i ChromaDB)
   - **Kostnad:** $0.02 per 1M tokens (mycket billigt)

2. **ChromaDB** (Vektordatabas)
   - **Syfte:** Lagrar embeddings och gör semantisk sökning
   - **När:** Lagrar embeddings från OpenAI
   - **När:** Söker efter liknande embeddings när du söker
   - **Kostnad:** Gratis (lokal installation)

3. **Cipher** (MCP Server)
   - **Syfte:** Integrerar ChromaDB med Cursor via MCP
   - **När:** Cursor behöver kontext → Cipher → ChromaDB → relevant dokumentation
   - **Kostnad:** Gratis (open source)

### Flöde

**Vid indexering:**
```
Text (dokumentation)
    ↓
OpenAI Embeddings API (text → vektor)
    ↓
Vektor (embedding)
    ↓
ChromaDB (lagrar vektorn)
```

**Vid sökning:**
```
Sökfråga ("hur fungerar BPMN?")
    ↓
OpenAI Embeddings API (text → vektor)
    ↓
Vektor (embedding)
    ↓
ChromaDB (söker efter liknande vektorer)
    ↓
Resultat (relevanta dokument)
```

**Med Cipher:**
```
Cursor (AI-assistent)
    ↓
Cipher (MCP) - "Vad behöver jag veta om BPMN?"
    ↓
ChromaDB (söker i embeddings)
    ↓
Relevant dokumentation
    ↓
Cursor (får kontext)
```

## Varför inte bara ChromaDB?

**ChromaDB kan:**
- ✅ Lagra embeddings
- ✅ Söka efter liknande embeddings
- ✅ Hantera metadata

**ChromaDB kan INTE:**
- ❌ Skapa embeddings från text
- ❌ Konvertera text → vektor

**Därför behöver vi OpenAI (eller annan embedding-modell) för att:**
- Skapa embeddings från dokumentation vid indexering
- Skapa embeddings från sökfrågor vid sökning

## Alternativ till OpenAI

Om du inte vill använda OpenAI kan du använda:

### 1. Lokala embedding-modeller

**Ollama** (gratis, lokalt):
```bash
# Installera Ollama
brew install ollama

# Ladda ner embedding-modell
ollama pull nomic-embed-text

# Uppdatera scripts att använda Ollama istället för OpenAI
```

**Fördelar:**
- ✅ Gratis
- ✅ Ingen data lämnar datorn
- ✅ Ingen API-nyckel behövs

**Nackdelar:**
- ❌ Sämre kvalitet än OpenAI
- ❌ Långsammare
- ❌ Kräver mer resurser

### 2. Andra embedding-API:er

- **Cohere** (`embed-english-v3.0`)
- **Hugging Face** (`sentence-transformers`)
- **Anthropic** (Claude embeddings - om tillgängligt)

## Kostnad med OpenAI

För ~100 dokumentationsfiler (~500KB text):
- **Indexering (en gång):** ~$0.01
- **Sökningar:** ~$0.0001 per sökning

**Det är mycket billigt!** $0.01 för att indexera all dokumentation.

## Rekommendation

**Använd OpenAI `text-embedding-3-small`:**
- ✅ Mycket billigt ($0.02 per 1M tokens)
- ✅ Bäst kvalitet
- ✅ Snabbt
- ✅ Enkel integration

**Om du vill undvika externa API:er:**
- Använd Ollama med `nomic-embed-text` (gratis, lokalt)
- Sämre kvalitet men fungerar

## Sammanfattning

**OpenAI behövs för att:**
1. Skapa embeddings från dokumentation (vid indexering)
2. Skapa embeddings från sökfrågor (vid sökning)

**ChromaDB behövs för att:**
1. Lagra embeddings
2. Göra semantisk sökning

**Cipher behövs för att:**
1. Integrera ChromaDB med Cursor via MCP
2. Automatisk kontext-hämtning

**Tillsammans:**
- OpenAI skapar embeddings
- ChromaDB lagrar och söker
- Cipher integrerar med Cursor

**Det är en pipeline, inte ett val!**

