#!/usr/bin/env node

/**
 * Startar ChromaDB server i bakgrunden
 * 
 * Usage:
 *   node scripts/start-chroma-server.mjs
 * 
 * Detta script:
 * 1. Kontrollerar om ChromaDB server redan körs
 * 2. Startar servern om den inte körs
 * 3. Sparar PID för att kunna stoppa servern senare
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHROMA_PORT = process.env.CHROMA_PORT || '8000';
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PATH = path.join(projectRoot, '.chroma');
const PID_FILE = path.join(projectRoot, '.chroma-server.pid');

/**
 * Kontrollera om servern redan körs
 */
async function isServerRunning() {
  try {
    // Node.js 18+ har inbyggd fetch
    // Använd v2 API (v1 är deprecated)
    const response = await fetch(`http://${CHROMA_HOST}:${CHROMA_PORT}/api/v1/heartbeat`, {
      signal: AbortSignal.timeout(1000), // 1 sekund timeout
    });
    // v1 API returnerar error men servern körs ändå
    return response.status === 200 || response.status === 404 || response.status === 500;
  } catch {
    return false;
  }
}

/**
 * Hämta PID från fil
 */
function getStoredPid() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
      // Kontrollera om processen fortfarande körs
      try {
        process.kill(pid, 0); // Signal 0 = check if process exists
        return pid;
      } catch {
        // Processen finns inte längre
        fs.unlinkSync(PID_FILE);
        return null;
      }
    }
  } catch {
    // Ignorera fel
  }
  return null;
}

/**
 * Starta ChromaDB server
 */
function startServer() {
  console.log('🚀 Startar ChromaDB server...');
  console.log(`   Port: ${CHROMA_PORT}`);
  console.log(`   Path: ${CHROMA_PATH}`);
  
  // Skapa .chroma mapp om den inte finns
  if (!fs.existsSync(CHROMA_PATH)) {
    fs.mkdirSync(CHROMA_PATH, { recursive: true });
  }
  
  // Starta server
  const server = spawn('npx', ['chroma', 'run', '--path', CHROMA_PATH, '--port', CHROMA_PORT], {
    stdio: 'pipe',
    detached: false,
    shell: true,
  });
  
  // Spara PID
  fs.writeFileSync(PID_FILE, server.pid.toString());
  
  // Logga output
  server.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`[ChromaDB] ${message}`);
    }
  });
  
  server.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('WARNING')) {
      console.error(`[ChromaDB] ${message}`);
    }
  });
  
  // Hantera avslut
  server.on('close', (code) => {
    console.log(`[ChromaDB] Server avslutad med kod ${code}`);
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  });
  
  // Hantera fel
  server.on('error', (error) => {
    console.error(`[ChromaDB] Fel vid start: ${error.message}`);
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  });
  
  console.log(`✅ ChromaDB server startad (PID: ${server.pid})`);
  console.log(`   URL: http://${CHROMA_HOST}:${CHROMA_PORT}`);
  console.log(`   PID sparas i: ${PID_FILE}`);
  
  return server;
}

/**
 * Huvudfunktion
 */
async function main() {
  // Kontrollera om servern redan körs
  const running = await isServerRunning();
  if (running) {
    console.log('✅ ChromaDB server körs redan');
    return;
  }
  
  // Kontrollera om det finns en sparad PID
  const storedPid = getStoredPid();
  if (storedPid) {
    console.log(`⚠️  Hittade sparad PID (${storedPid}), men servern svarar inte`);
    console.log('   Startar ny server...');
  }
  
  // Starta server
  const server = startServer();
  
  // Vänta lite för att servern ska starta
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Kontrollera om servern startade korrekt
  const isRunning = await isServerRunning();
  if (isRunning) {
    console.log('✅ ChromaDB server är redo!');
  } else {
    console.log('⚠️  ChromaDB server startade, men svarar inte ännu');
    console.log('   Vänta några sekunder och försök igen');
  }
  
  // Behåll processen vid liv
  process.on('SIGINT', () => {
    console.log('\n🛑 Stoppar ChromaDB server...');
    if (server && !server.killed) {
      server.kill();
    }
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Stoppar ChromaDB server...');
    if (server && !server.killed) {
      server.kill();
    }
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    process.exit(0);
  });
}

main().catch(console.error);

