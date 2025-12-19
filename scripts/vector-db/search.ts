#!/usr/bin/env tsx

/**
 * Söker i Chroma vektordatabas
 * 
 * Usage:
 *   tsx scripts/vector-db/search.ts "hur fungerar BPMN hierarki?"
 * 
 * Detta script:
 * 1. Skapar embedding för sökfrågan
 * 2. Söker i Chroma
 * 3. Visar resultat med relevans
 */

import { ChromaClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import { pipeline } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const COLLECTION_NAME = 'bpmn-planner-docs';

// Initiera klienter
// För lokal Chroma-instans, använd lokal server (starta med: npx chroma run --path .chroma --port 8000)
// ChromaDB sparar automatiskt i .chroma mappen
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
 * Initiera embedding-modell (laddas första gången)
 */
async function initEmbeddingModel() {
  if (!embeddingModel) {
    console.log('📥 Laddar embedding-modell...');
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
  const query = process.argv[2];
  
  if (!query) {
    console.error('Usage: tsx scripts/vector-db/search.ts "din sökfråga"');
    process.exit(1);
  }
  
  console.log(`🔍 Söker efter: "${query}"\n`);
  
  try {
    // Hämta collection
    const collection = await chromaClient.getCollection({ name: COLLECTION_NAME });
    
    // Skapa embedding för sökfrågan
    console.log('📊 Skapar embedding...');
    const queryEmbedding = await createEmbedding(query);
    console.log('   ✅ Embedding skapad\n');
    
    // Sök i collection
    console.log('🔎 Söker i vektordatabas...\n');
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 5, // Top 5 resultat
    });
    
    if (!results.documents || results.documents[0].length === 0) {
      console.log('❌ Inga resultat hittades');
      return;
    }
    
    // Visa resultat
    console.log('='.repeat(60));
    console.log('📋 SÖKRESULTAT\n');
    
    const documents = results.documents[0];
    const metadatas = results.metadatas[0];
    const distances = results.distances[0];
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const metadata = metadatas[i] as { file: string; fileName: string; chunkIndex: number; totalChunks: number };
      const distance = distances[i];
      const similarity = (1 - distance) * 100; // Konvertera distance till similarity %
      
      console.log(`\n[${i + 1}] ${metadata.fileName}`);
      console.log(`   Fil: ${metadata.file}`);
      console.log(`   Chunk: ${metadata.chunkIndex + 1}/${metadata.totalChunks}`);
      console.log(`   Relevans: ${similarity.toFixed(1)}%`);
      console.log(`   ──────────────────────────────────────────────────────`);
      console.log(`   ${doc.substring(0, 300)}${doc.length > 300 ? '...' : ''}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.error('❌ Collection finns inte. Kör först: tsx scripts/vector-db/index-docs.ts');
    } else {
      console.error('❌ Fel:', error);
    }
    process.exit(1);
  }
}

main().catch(console.error);

