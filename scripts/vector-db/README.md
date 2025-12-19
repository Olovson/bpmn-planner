# Vektordatabas - Proof of Concept

Detta är ett proof of concept för att använda Chroma vektordatabas + Cipher för att indexera och söka i projektets dokumentation.

## Cipher + Chroma Integration

**Cipher** är ett minneslager för AI-kodningsagenter (Cursor) via MCP. **Chroma** är vektordatabasen som Cipher använder som backend.

**Arkitektur:**
```
Cursor → Cipher (MCP) → Chroma (Vektordatabas)
```

**Cipher** hanterar:
- MCP-integration med Cursor
- Automatisk kontext-hämtning
- Konversationshistorik

**Chroma** hanterar:
- Vektordatabas för embeddings
- Semantisk sökning
- Indexerad dokumentation

**Tillsammans:**
- Cursor får automatiskt relevant kontext via Cipher
- Vi kan manuellt söka i Chroma
- Både automatisk och manuell sökning fungerar

## Setup

1. **Installera dependencies:**
   ```bash
   npm install
   ```

2. **Lokala embeddings (standard):**
   - Inga API-nycklar behövs!
   - Embedding-modellen laddas automatiskt första gången (~80MB)
   - Fungerar offline och gratis

3. **Alternativ: OpenAI embeddings (om du vill):**
   ```bash
   export OPENAI_API_KEY=your-key-here
   ```
   - Scripts använder automatiskt OpenAI om `OPENAI_API_KEY` är satt
   - Mycket billigt (~$0.01 för all dokumentation)

## Användning

### Indexera dokumentation

Indexerar alla `.md` filer från `docs/` mappen:

```bash
npm run vector:index
```

Detta kommer:
- Hitta alla `.md` filer i `docs/`
- Dela upp dem i chunks (1000 tecken per chunk, 200 tecken overlap)
- Skapa embeddings med lokala embeddings (`@xenova/transformers`)
- Indexera i lokal Chroma-instans (`.chroma/` mapp)
- **Första gången:** Laddar ner embedding-modell (~80MB, tar 2-3 minuter)

### Söka i dokumentation

Sök efter information:

```bash
npm run vector:search "hur fungerar BPMN hierarki?"
```

Detta kommer:
- Skapa embedding för sökfrågan
- Söka i vektordatabasen
- Visa top 5 resultat med relevans

## Teknisk Stack

- **Chroma:** Lokal vektordatabas (gratis, ingen data lämnar datorn)
- **Lokala embeddings:** `@xenova/transformers` med `Xenova/all-MiniLM-L6-v2` (gratis, lokalt)
- **Alternativ:** OpenAI embeddings om `OPENAI_API_KEY` är satt ($0.02 per 1M tokens)

## Kostnad

### Med Lokala Embeddings (Standard)
- **Indexering:** Gratis (ingen API-kostnad)
- **Sökningar:** Gratis (ingen API-kostnad)
- **Kvalitet:** Bra (sämre än OpenAI men fortfarande bra)

### Med OpenAI Embeddings (Alternativ)
För ~100 dokumentationsfiler (~500KB text):
- **Indexering:** ~$0.01 (en gång)
- **Sökningar:** ~$0.0001 per sökning
- **Kvalitet:** Bättre än lokala embeddings

## Cipher Integration

Efter att ha indexerat i Chroma, konfigurera Cipher att använda vår Chroma-instans:

1. **Installera Cipher globalt:**
   ```bash
   npm install -g @byterover/cipher
   ```

2. **Konfigurera Cipher i Cursor (MCP):**
   - Öppna Cursor settings
   - Gå till MCP/Extensions
   - Lägg till Cipher som MCP-server
   - Konfigurera Cipher att använda lokal Chroma-instans (`.chroma/`)

3. **Cursor använder automatiskt Cipher → Chroma:**
   - Cursor hämtar relevant kontext från Chroma via Cipher
   - Automatisk kontext-hämtning fungerar
   - Konversationshistorik sparas

Se `setup-cipher.md` för detaljerad konfiguration.

## Nästa Steg

1. **Testa proof of concept** - Se om det fungerar bra
2. **Utvärdera kvalitet** - Är sökresultaten relevanta?
3. **Konfigurera Cipher** - Sätt upp MCP-integration med Cursor
4. **Indexera konversationshistorik** - Om tillgänglig

## Filer

- `index-docs.ts` - Indexerar dokumentationsfiler
- `search.ts` - Söker i vektordatabasen
- `.chroma/` - Lokal Chroma-databas (skapas automatiskt)

