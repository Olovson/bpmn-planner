#!/usr/bin/env node

/**
 * Stoppar ChromaDB server
 * 
 * Usage:
 *   node scripts/stop-chroma-server.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PID_FILE = path.join(projectRoot, '.chroma-server.pid');

/**
 * Huvudfunktion
 */
function main() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('ℹ️  Ingen ChromaDB server hittades (ingen PID-fil)');
    return;
  }
  
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
    console.log(`🛑 Stoppar ChromaDB server (PID: ${pid})...`);
    
    try {
      process.kill(pid, 'SIGTERM');
      console.log('✅ ChromaDB server stoppad');
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log('ℹ️  Processen finns inte längre');
      } else {
        console.error(`❌ Fel vid stopp: ${error.message}`);
      }
    }
    
    // Ta bort PID-fil
    fs.unlinkSync(PID_FILE);
  } catch (error) {
    console.error(`❌ Fel: ${error.message}`);
  }
}

main();













