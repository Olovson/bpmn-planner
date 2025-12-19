#!/usr/bin/env node

/**
 * Chroma DB Auto Indexer
 * 
 * Lyssnar på events från appen och kör automatiskt Chroma DB indexering
 * när relevanta ändringar sker i projektet.
 * 
 * Usage:
 *   node scripts/chroma-auto-indexer.mjs
 * 
 * Detta script:
 * 1. Startar en lokal HTTP-server som lyssnar på indexering-requests
 * 2. När appen triggar indexering, körs `npm run vector:index` automatiskt
 * 3. Detta förbättrar AI-assistentens minne automatiskt
 */

import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PORT = 3001;

let isIndexing = false;
let pendingIndex = false;

async function runIndexing() {
  if (isIndexing) {
    pendingIndex = true;
    console.log('[ChromaAutoIndexer] Indexering pågår redan, kommer köra igen efter slutförande');
    return;
  }

  isIndexing = true;
  pendingIndex = false;

  console.log('[ChromaAutoIndexer] 🚀 Startar Chroma DB indexering...');
  
  try {
    const { stdout, stderr } = await execAsync('npm run vector:index', {
      cwd: process.cwd(),
      timeout: 300000, // 5 minuter timeout
    });
    
    if (stdout) {
      console.log('[ChromaAutoIndexer] Indexering output:', stdout);
    }
    if (stderr) {
      console.warn('[ChromaAutoIndexer] Indexering warnings:', stderr);
    }
    
    console.log('[ChromaAutoIndexer] ✅ Chroma DB indexering slutförd');
  } catch (error) {
    console.error('[ChromaAutoIndexer] ❌ Indexering misslyckades:', error.message);
  } finally {
    isIndexing = false;
    
    // Om det finns en pending indexering, kör den nu
    if (pendingIndex) {
      console.log('[ChromaAutoIndexer] Kör pending indexering...');
      setTimeout(() => runIndexing(), 2000);
    }
  }
}

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/index-chroma') {
    console.log('[ChromaAutoIndexer] 📥 Indexering request mottagen');
    
    // Returnera direkt så att appen inte behöver vänta
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Indexering startad' }));
    
    // Kör indexering i bakgrunden
    runIndexing();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 Chroma DB Auto Indexer');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Lyssnar på port ${PORT}`);
  console.log('   Indexerar automatiskt när appen triggar indexering');
  console.log('   Stoppa med Ctrl+C');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

// Hantera avslutning
process.on('SIGINT', () => {
  console.log('\n[ChromaAutoIndexer] Stoppar server...');
  server.close(() => {
    console.log('[ChromaAutoIndexer] ✅ Server stoppad');
    process.exit(0);
  });
});

