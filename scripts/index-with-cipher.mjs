#!/usr/bin/env node

/**
 * Indexerar projektet med Cipher (använder befintlig ChromaDB)
 * 
 * Usage:
 *   node scripts/index-with-cipher.mjs
 * 
 * Detta script:
 * 1. Kontrollerar om ChromaDB är indexerad
 * 2. Indexerar projektet med Cipher (om ChromaDB finns)
 * 3. Cipher använder befintlig ChromaDB-databas
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

function log(message) {
  console.log(`[Cipher Index] ${message}`);
}

function error(message) {
  console.error(`[Cipher Index] ERROR: ${message}`);
}

async function checkChromaIndexed() {
  const chromaPath = resolve(projectRoot, '.chroma');
  if (!fs.existsSync(chromaPath)) {
    return false;
  }
  
  // Kontrollera om det finns en SQLite-databas
  const sqlitePath = resolve(chromaPath, 'chroma.sqlite3');
  return fs.existsSync(sqlitePath);
}

async function main() {
  log('Kontrollerar ChromaDB-indexering...');
  
  const isIndexed = await checkChromaIndexed();
  if (!isIndexed) {
    log('⚠️  ChromaDB är inte indexerad ännu.');
    log('   Kör först: npm run vector:index');
    log('   Sedan kan Cipher använda ChromaDB.');
    return;
  }
  
  log('✅ ChromaDB är indexerad och redo för Cipher!');
  log('');
  log('💡 Cipher är en MCP-server som körs via Cursor:');
  log('   - Cipher startar INTE som en separat process');
  log('   - Cursor startar Cipher automatiskt när den behövs');
  log('   - Cipher använder ChromaDB för kontext-hämtning');
  log('');
  log('📋 För att aktivera Cipher i Cursor:');
  log('   1. Installera: npm install -g @byterover/cipher');
  log('   2. Konfigurera i Cursor MCP settings');
  log('   3. Cipher använder automatiskt ChromaDB');
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  process.exit(1);
});

