# Template: ChromaDB + Cipher Setup för Nya Projekt

Detta är en guide för att snabbt sätta upp ChromaDB + Cipher i nya projekt för att förbättra AI-assistentens minne och effektivitet.

## 🎯 Varför?

- **Snabbare svar:** 5-15 sekunder → ~1 sekund (manuell) → ~0.5 sekunder (automatisk)
- **Bättre kontext:** Semantisk sökning hittar relevant information direkt
- **Mindre dokumentation:** Ta bort onödiga MD-filer, allt finns i ChromaDB
- **Automatisk kontext:** Cipher ger kontext automatiskt via MCP

## 📦 Steg 1: Installera Dependencies

```bash
npm install --save-dev chromadb @xenova/transformers @chroma-core/default-embed
npm install -g @byterover/cipher
```

## 📁 Steg 2: Skapa Scripts

### `scripts/vector-db/index-docs.ts`

```typescript
#!/usr/bin/env tsx
import { ChromaClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

const COLLECTION_NAME = 'project-docs';
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';

const chromaClient = new ChromaClient({
  host: CHROMA_HOST,
  port: parseInt(CHROMA_PORT),
});
const embeddingFunction = new DefaultEmbeddingFunction();

let embeddingModel: any = null;

async function initEmbeddingModel() {
  if (!embeddingModel) {
    console.log('📥 Laddar embedding-modell...');
    embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    );
    console.log('   ✅ Modell laddad\n');
  }
  return embeddingModel;
}

async function createEmbedding(text: string): Promise<number[]> {
  const model = await initEmbeddingModel();
  const output = await model(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  function walkDir(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walkDir(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  walkDir(dir);
  return files;
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start = end - overlap;
    if (end >= text.length) break;
  }
  return chunks;
}

async function main() {
  console.log('🚀 Indexerar dokumentation i ChromaDB...\n');
  
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    console.error('❌ docs/ mappen finns inte!');
    process.exit(1);
  }

  const files = findMarkdownFiles(docsDir);
  console.log(`📁 Hittade ${files.length} MD-filer\n`);

  const collection = await chromaClient.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: embeddingFunction,
    metadata: {
      description: 'Projekt dokumentation',
      version: '1.0.0',
    },
  });

  // Rensa befintlig data
  await collection.delete({});
  console.log('🗑️  Rensade befintlig data\n');

  let totalChunks = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);
    const relativePath = path.relative(process.cwd(), file);

    console.log(`📄 ${relativePath} (${chunks.length} chunks)`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await createEmbedding(chunk);
      
      await collection.add({
        ids: [`${relativePath}:chunk:${i}`],
        embeddings: [embedding],
        documents: [chunk],
        metadatas: [{
          file: relativePath,
          chunk: i,
          totalChunks: chunks.length,
        }],
      });
      totalChunks++;
    }
  }

  console.log(`\n✅ Indexering klar! ${totalChunks} chunks indexerade.`);
}

main().catch(console.error);
```

### `scripts/vector-db/search.ts`

```typescript
#!/usr/bin/env tsx
import { ChromaClient } from 'chromadb';
import { pipeline } from '@xenova/transformers';

const COLLECTION_NAME = 'project-docs';
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';

const chromaClient = new ChromaClient({
  host: CHROMA_HOST,
  port: parseInt(CHROMA_PORT),
});

let embeddingModel: any = null;

async function initEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    );
  }
  return embeddingModel;
}

async function createEmbedding(text: string): Promise<number[]> {
  const model = await initEmbeddingModel();
  const output = await model(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

async function main() {
  const query = process.argv[2] || '';
  if (!query) {
    console.error('❌ Ange en sökfråga: npm run vector:search "din fråga"');
    process.exit(1);
  }

  console.log(`🔍 Söker efter: "${query}"\n`);
  console.log('📊 Skapar embedding...');
  const embedding = await createEmbedding(query);
  console.log('   ✅ Embedding skapad\n');

  const collection = await chromaClient.getCollection({
    name: COLLECTION_NAME,
  });

  console.log('🔎 Söker i vektordatabas...\n');
  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: 5,
  });

  console.log('='.repeat(60));
  console.log('📋 SÖKRESULTAT\n');
  
  if (results.ids[0].length === 0) {
    console.log('❌ Inga resultat hittades.');
    return;
  }

  for (let i = 0; i < results.ids[0].length; i++) {
    const id = results.ids[0][i];
    const metadata = results.metadatas[0][i];
    const document = results.documents[0][i];
    const distance = results.distances[0][i];
    const relevance = ((1 - distance) * 100).toFixed(1);

    console.log(`[${i + 1}] ${metadata.file}`);
    console.log(`   Chunk: ${metadata.chunk + 1}/${metadata.totalChunks}`);
    console.log(`   Relevans: ${relevance}%`);
    console.log('   ' + '-'.repeat(56));
    console.log(`   ${document.substring(0, 200)}...\n`);
  }
}

main().catch(console.error);
```

### `scripts/start-chroma-server.mjs`

```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '..');

const CHROMA_PATH = resolve(projectRoot, '.chroma');
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';

function startServer() {
  console.log(`Starting ChromaDB server on http://${CHROMA_HOST}:${CHROMA_PORT}`);
  try {
    execSync(`npx chroma run --path ${CHROMA_PATH} --host ${CHROMA_HOST} --port ${CHROMA_PORT}`, {
      stdio: 'inherit',
      cwd: projectRoot,
    });
  } catch (error) {
    console.error(`Failed to start ChromaDB server: ${error.message}`);
    process.exit(1);
  }
}

startServer();
```

### `scripts/stop-chroma-server.mjs`

```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';

try {
  execSync("pkill -f 'chroma run'", { stdio: 'ignore' });
  console.log('✅ ChromaDB server stopped.');
} catch (err) {
  console.log('⚠️  No ChromaDB server found to stop.');
}
```

## 📝 Steg 3: Lägg till i package.json

```json
{
  "scripts": {
    "vector:index": "tsx scripts/vector-db/index-docs.ts",
    "vector:search": "tsx scripts/vector-db/search.ts",
    "chroma:start": "node scripts/start-chroma-server.mjs",
    "chroma:stop": "node scripts/stop-chroma-server.mjs"
  }
}
```

## 🔧 Steg 4: Konfigurera Cipher i Cursor

Lägg till i `~/Library/Application Support/Cursor/User/settings.json`:

```json
{
  "mcpServers": {
    "cipher": {
      "command": "cipher",
      "args": [
        "--vector-db",
        "chroma",
        "--chroma-path",
        ".chroma"
      ]
    }
  }
}
```

**Viktigt:** Starta om Cursor efter konfiguration!

## 🚀 Steg 5: Indexera Dokumentation

```bash
# Starta ChromaDB server
npm run chroma:start

# I ett annat terminal-fönster:
npm run vector:index
```

## 🔍 Steg 6: Testa

```bash
npm run vector:search "din fråga"
```

## 📋 Steg 7: Lägg till i .gitignore

```
.chroma/
```

## 🎯 Användning i Utveckling

### Automatisk Start (valfritt)

Lägg till i `scripts/start-dev.mjs`:

```javascript
// Start ChromaDB server
const chromaPid = await startChromaServer();
```

### Rensa Onödiga MD-filer

Efter indexering kan du ta bort:
- Setup-guides
- Analys-filer
- Implementation plans
- How-to guides

**Behåll:**
- README.md
- API_REFERENCE.md
- Viktiga arkitektur-dokument
- Användarguides
- Templates

## ✅ Checklista för Nya Projekt

- [ ] Installera dependencies
- [ ] Skapa scripts (index-docs.ts, search.ts, start/stop-chroma-server.mjs)
- [ ] Lägg till scripts i package.json
- [ ] Konfigurera Cipher i Cursor settings.json
- [ ] Indexera dokumentation (`npm run vector:index`)
- [ ] Testa sökning (`npm run vector:search "test"`)
- [ ] Lägg till `.chroma/` i .gitignore
- [ ] Ta bort onödiga MD-filer
- [ ] Starta om Cursor och verifiera att Cipher fungerar

## 💡 Tips

- **Första gången:** Embedding-modellen laddas ner (~80MB, tar 2-3 minuter)
- **Lokalt:** Allt körs lokalt, ingen data lämnar datorn
- **Gratis:** Inga API-kostnader med lokala embeddings
- **Automatisk:** Cipher ger kontext automatiskt när det är konfigurerat

## 📚 Ytterligare Resurser

- Cipher GitHub: https://github.com/campfirein/cipher
- Chroma Documentation: https://docs.trychroma.com
- MCP Documentation: https://modelcontextprotocol.io


