# ChromaDB Setup: Lokal Server

**Datum:** 2025-01-27  
**Syfte:** Starta lokal ChromaDB server för minnesförbättring

---

## 🎯 Syfte

**ChromaDB är för minnesförbättring, INTE för HTML-generering.**

- ✅ Indexerar konversationshistorik och projektinfo
- ✅ Förbättrar AI-assistentens minne
- ✅ Minskar behovet av manuell dokumentation

---

## 🚀 Snabbstart

### Steg 1: Starta ChromaDB Server

**I en terminal, starta servern:**
```bash
npm run vector:server
```

**Eller direkt:**
```bash
npx chroma run --path .chroma --port 8000
```

**Servern körs nu på:** `http://localhost:8000`

### Steg 2: Indexera Dokumentation

**I en annan terminal, indexera:**
```bash
npm run vector:index
```

**Detta kommer:**
- Hitta alla `.md` filer i `docs/`
- Skapa embeddings lokalt
- Indexera i ChromaDB

### Steg 3: Testa Sökning

**Sök i dokumentation:**
```bash
npm run vector:search "hur fungerar BPMN hierarki?"
```

---

## 📋 Detaljerad Setup

### 1. Starta Server

**Starta ChromaDB server i bakgrunden:**
```bash
npm run vector:server
```

**Server körs på:**
- Host: `localhost`
- Port: `8000`
- Data: `.chroma/` mappen

### 2. Indexera Dokumentation

**Indexera alla dokumentationsfiler:**
```bash
npm run vector:index
```

**Första gången:**
- Laddar ner embedding-modell (~80MB)
- Kan ta 2-3 minuter
- Efter det är det snabbt

### 3. Konfigurera Cipher (Valfritt)

**Efter indexering, konfigurera Cipher:**
1. Installera Cipher globalt: `npm install -g @byterover/cipher`
2. Konfigurera i Cursor MCP settings
3. Cipher använder automatiskt ChromaDB

---

## 🔧 Konfiguration

### Miljövariabler

**Anpassa server-inställningar:**
```bash
export CHROMA_HOST=localhost
export CHROMA_PORT=8000
```

**Scripts använder automatiskt dessa värden.**

### Anpassa Port

**Om port 8000 är upptagen:**
```bash
# Starta server på annan port
npx chroma run --path .chroma --port 8001

# Sätt miljövariabel
export CHROMA_PORT=8001
npm run vector:index
```

---

## 🐛 Felsökning

### Problem: "Failed to connect to chromadb"

**Lösning:**
- Kontrollera att servern körs: `npm run vector:server`
- Kontrollera port: Standard är 8000
- Kontrollera att `.chroma/` mappen finns

### Problem: "Port already in use"

**Lösning:**
- Använd annan port: `npx chroma run --path .chroma --port 8001`
- Eller stoppa processen som använder porten

### Problem: "Embedding model not found"

**Lösning:**
- Modellen laddas automatiskt första gången
- Kontrollera internetanslutning
- Vänta på att modellen laddas (~80MB)

---

## 📝 Sammanfattning

**Workflow:**
1. Starta server: `npm run vector:server` (i en terminal)
2. Indexera: `npm run vector:index` (i en annan terminal)
3. Sök: `npm run vector:search "fråga"`

**Syfte:**
- Minnesförbättring för AI-assistenten
- INTE för HTML-generering

**Kostnad:**
- Gratis (lokala embeddings)
- Ingen API-kostnad

