# ChromaDB Fix: Lokal Persistent Storage

**Problem:** ChromaDB försöker ansluta till en server istället för att använda lokal persistent storage.

**Lösning:** Vi behöver antingen:
1. Starta en lokal ChromaDB server
2. Eller använda en annan konfiguration

---

## Alternativ 1: Starta Lokal ChromaDB Server (Rekommenderat)

**Installera ChromaDB server:**
```bash
pip install chromadb
```

**Starta server:**
```bash
chroma run --path .chroma --port 8000
```

**Uppdatera scripts att använda server:**
```typescript
const chromaClient = new ChromaClient({
  host: 'localhost',
  port: 8000,
});
```

---

## Alternativ 2: Använd Docker (Om tillgängligt)

**Starta ChromaDB i Docker:**
```bash
docker run -p 8000:8000 -v $(pwd)/.chroma:/chroma/chroma chromadb/chroma
```

**Uppdatera scripts att använda server:**
```typescript
const chromaClient = new ChromaClient({
  host: 'localhost',
  port: 8000,
});
```

---

## Alternativ 3: Använd Annan Vektordatabas

**Alternativ:**
- **LanceDB** - Lokal, ingen server behövs
- **Qdrant** - Kan köras lokalt
- **Weaviate** - Self-hosted

---

## Rekommendation

**Starta en lokal ChromaDB server:**
- Enklast att implementera
- Fungerar med befintlig kod
- Lokal persistent storage

**Nästa steg:**
1. Installera ChromaDB server
2. Starta server
3. Uppdatera scripts att använda server

