#!/usr/bin/env tsx

/**
 * Indexerar dokumentationsfiler i Chroma vektordatabas
 * 
 * SYFTE: Förbättra AI-assistentens minne, INTE för HTML-generering
 * - Indexerar konversationshistorik och projektinfo
 * - Förbättrar kontextförståelse över tid
 * - Minskar behovet av manuell dokumentation
 * 
 * Usage:
 *   tsx scripts/vector-db/index-docs.ts
 * 
 * Detta script:
 * 1. Läser alla .md filer från docs/
 * 2. Delar upp dem i chunks (för bättre sökning)
 * 3. Skapar embeddings med lokala embeddings (transformers.js)
 * 4. Indexerar i Chroma för minnesförbättring
 * 
 * Alternativ: Använd OpenAI embeddings genom att sätta OPENAI_API_KEY
 *   export OPENAI_API_KEY=your-key
 */

import { ChromaClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Konfiguration
const COLLECTION_NAME = 'bpmn-planner-docs';
const CHUNK_SIZE = 1000; // Antal tecken per chunk
const CHUNK_OVERLAP = 200; // Överlappning mellan chunks

// Initiera klienter
// För lokal Chroma-instans, använd lokal server (starta med: npx chroma run --path .chroma --port 8000)
// ChromaDB sparar automatiskt i .chroma mappen
// Vi använder DefaultEmbeddingFunction även om vi skapar embeddings själva
// (ChromaDB kräver en embedding function för att skapa collections)
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';

const chromaClient = new ChromaClient({
  host: CHROMA_HOST,
  port: parseInt(CHROMA_PORT),
});
const embeddingFunction = new DefaultEmbeddingFunction();

// Initiera embedding-modell (laddas första gången)
let embeddingModel: any = null;

/**
 * Hitta alla .md filer i docs/
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walkDir(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      // Hoppa över node_modules, .git, etc.
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

/**
 * Dela upp text i chunks
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    
    // Nästa chunk börjar med overlap
    start = end - overlap;
    
    // Om vi är vid slutet, stoppa
    if (end >= text.length) break;
  }
  
  return chunks;
}

/**
 * Initiera embedding-modell (laddas första gången)
 */
async function initEmbeddingModel() {
  if (!embeddingModel) {
    console.log('📥 Laddar embedding-modell (första gången kan det ta en stund)...');
    embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2', // Liten, snabb modell (~80MB)
      { quantized: true } // Använd kvantiserad version för snabbare laddning
    );
    console.log('   ✅ Modell laddad\n');
  }
  return embeddingModel;
}

/**
 * Skapa embedding för text
 */
async function createEmbedding(text: string): Promise<number[]> {
  const model = await initEmbeddingModel();
  
  // Skapa embedding
  const output = await model(text, {
    pooling: 'mean',
    normalize: true,
  });
  
  // Konvertera till array
  return Array.from(output.data);
}

/**
 * Huvudfunktion
 */
async function main() {
  console.log('🚀 Startar indexering av dokumentation...\n');
  
  const docsDir = path.join(projectRoot, 'docs');
  
  if (!fs.existsSync(docsDir)) {
    console.error(`❌ Kunde inte hitta docs/ mapp: ${docsDir}`);
    process.exit(1);
  }
  
  // Hitta alla .md filer
  console.log('🔍 Söker efter .md filer...');
  const files = findMarkdownFiles(docsDir);
  console.log(`   ✅ Hittade ${files.length} filer\n`);
  
  if (files.length === 0) {
    console.log('⚠️  Inga .md filer hittades');
    process.exit(0);
  }
  
  // Skapa eller hämta collection
  console.log('📦 Skapar/hämtar Chroma collection...');
  let collection;
  try {
    collection = await chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embeddingFunction,
      metadata: {
        description: 'BPMN Planner dokumentation',
        version: '1.0.0',
      },
    });
    console.log('   ✅ Collection klar\n');
  } catch (error) {
    console.error('❌ Fel vid skapande av collection:', error);
    process.exit(1);
  }
  
  // Rensa befintlig data (för re-indexering)
  console.log('🧹 Rensar befintlig data...');
  try {
    const existingCollection = await chromaClient.getCollection({ name: COLLECTION_NAME });
    if (existingCollection) {
      await chromaClient.deleteCollection({ name: COLLECTION_NAME });
      collection = await chromaClient.getOrCreateCollection({
        name: COLLECTION_NAME,
        embeddingFunction: embeddingFunction,
        metadata: {
          description: 'BPMN Planner dokumentation',
          version: '1.0.0',
        },
      });
      console.log('   ✅ Rensad\n');
    }
  } catch (error) {
    // Collection kanske inte finns, det är okej
    console.log('   ℹ️  Ingen befintlig data att rensa\n');
    // Skapa collection om den inte finns
    collection = await chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embeddingFunction,
      metadata: {
        description: 'BPMN Planner dokumentation',
        version: '1.0.0',
      },
    });
  }
  
  // Indexera varje fil
  console.log('📝 Indexerar filer...\n');
  let totalChunks = 0;
  let processedFiles = 0;
  
  for (const filePath of files) {
    try {
      const relativePath = path.relative(projectRoot, filePath);
      console.log(`   [${processedFiles + 1}/${files.length}] ${relativePath}`);
      
      // Läs fil
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Dela upp i chunks
      const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);
      console.log(`      → ${chunks.length} chunks`);
      
      // Skapa embeddings och metadata för varje chunk
      const ids: string[] = [];
      const embeddings: number[][] = [];
      const metadatas: Array<{
        file: string;
        chunkIndex: number;
        totalChunks: number;
        fileName: string;
      }> = [];
      const documents: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `${relativePath}-chunk-${i}`;
        
        // Skapa embedding
        const embedding = await createEmbedding(chunk);
        
        ids.push(chunkId);
        embeddings.push(embedding);
        metadatas.push({
          file: relativePath,
          chunkIndex: i,
          totalChunks: chunks.length,
          fileName: path.basename(filePath),
        });
        documents.push(chunk);
        
        // Liten delay för att undvika rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Lägg till i collection
      await collection.add({
        ids,
        embeddings,
        metadatas,
        documents,
      });
      
      totalChunks += chunks.length;
      processedFiles++;
      console.log(`      ✅ Indexerad\n`);
      
    } catch (error) {
      console.error(`      ❌ Fel: ${error instanceof Error ? error.message : error}\n`);
    }
  }
  
  console.log('='.repeat(60));
  console.log('✅ Indexering klar!');
  console.log(`   Filer: ${processedFiles}/${files.length}`);
  console.log(`   Chunks: ${totalChunks}`);
  console.log(`   Collection: ${COLLECTION_NAME}`);
  console.log('='.repeat(60));
}

main().catch(console.error);

