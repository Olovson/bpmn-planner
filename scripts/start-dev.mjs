#!/usr/bin/env node

/**
 * Script som startar hela utvecklingsmiljön:
 * - Supabase (om den inte redan körs)
 * - Edge functions (llm-health och build-process-tree)
 * - Dev-server (npm run dev)
 * 
 * Användning:
 *   node scripts/start-dev.mjs
 *   eller
 *   npm run start:dev
 */

import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

function log(message) {
  console.log(`[Start Dev] ${message}`);
}

function error(message) {
  console.error(`[Start Dev] ERROR: ${message}`);
}

function checkSupabaseRunning() {
  try {
    const output = execSync('supabase status', { encoding: 'utf-8', stdio: 'pipe' });
    return output.includes('API URL:');
  } catch {
    return false;
  }
}

async function startSupabase() {
  log('Kontrollerar Supabase-status...');
  const isRunning = checkSupabaseRunning();

  if (isRunning) {
    log('✅ Supabase körs redan.');
    return true;
  }

  log('Supabase körs inte. Startar...');
  try {
    execSync('supabase start', { stdio: 'inherit', cwd: projectRoot });
    log('✅ Supabase startad.');
    
    // Vänta lite för att PostgREST ska hinna läsa schemat
    log('Väntar på att PostgREST ska läsa schemat...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    return true;
  } catch (err) {
    error(`Kunde inte starta Supabase: ${err.message}`);
    return false;
  }
}

function startEdgeFunction(name) {
  log(`Startar edge function: ${name}...`);
  
  const proc = spawn(
    'supabase',
    ['functions', 'serve', name, '--no-verify-jwt', '--env-file', 'supabase/.env'],
    {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  // Logga output
  proc.stdout.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });
  
  proc.stderr.on('data', (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  proc.on('error', (err) => {
    error(`Kunde inte starta ${name}: ${err.message}`);
  });

  // Låt processen köra i bakgrunden
  proc.unref();
  
  log(`✅ ${name} startad (PID: ${proc.pid})`);
  return proc.pid;
}

function startDevServer() {
  log('Startar dev-server...');
  
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  // Logga output
  proc.stdout.on('data', (data) => {
    process.stdout.write(`[Dev Server] ${data}`);
  });
  
  proc.stderr.on('data', (data) => {
    process.stderr.write(`[Dev Server] ${data}`);
  });

  proc.on('error', (err) => {
    error(`Kunde inte starta dev-server: ${err.message}`);
  });

  // Låt processen köra i bakgrunden
  proc.unref();
  
  log(`✅ Dev-server startad (PID: ${proc.pid})`);
  return proc.pid;
}

async function main() {
  console.log('');
  log('═══════════════════════════════════════════════════════════');
  log('Startar utvecklingsmiljö...');
  log('═══════════════════════════════════════════════════════════');
  console.log('');

  // 1. Starta Supabase
  const supabaseOk = await startSupabase();
  if (!supabaseOk) {
    error('Kunde inte starta Supabase. Avslutar.');
    process.exit(1);
  }

  // 2. Verifiera schema
  log('Verifierar schema...');
  try {
    execSync('npm run check:db-schema', { stdio: 'inherit', cwd: projectRoot });
    log('✅ Schema verifierat.');
  } catch (err) {
    error('Schema-verifiering misslyckades. Kör "npm run supabase:reset" för att fixa.');
    process.exit(1);
  }

  // 3. Starta edge functions
  console.log('');
  log('Startar edge functions...');
  const llmHealthPid = startEdgeFunction('llm-health');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  const buildProcessTreePid = startEdgeFunction('build-process-tree');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. Starta dev-server
  console.log('');
  log('Startar dev-server...');
  const devServerPid = startDevServer();

  // 5. Sammanfattning
  console.log('');
  log('═══════════════════════════════════════════════════════════');
  log('✅ Allt är igång!');
  log('═══════════════════════════════════════════════════════════');
  console.log('');
  log('Processer som körs:');
  log(`  - Supabase: körs`);
  log(`  - llm-health: PID ${llmHealthPid}`);
  log(`  - build-process-tree: PID ${buildProcessTreePid}`);
  log(`  - Dev-server: PID ${devServerPid}`);
  console.log('');
  log('🌐 Öppna http://localhost:8080/ i din webbläsare');
  console.log('');
  log('💡 För att stoppa processerna:');
  log(`   kill ${llmHealthPid} ${buildProcessTreePid} ${devServerPid}`);
  log('   eller stäng Cursor (processerna stängs automatiskt)');
  console.log('');
  
  // Vänta lite för att processerna ska starta
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  // Verifiera att edge functions svarar
  log('Verifierar edge functions...');
  try {
    const response = execSync('curl -s http://127.0.0.1:54321/functions/v1/llm-health', { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000
    });
    log('✅ llm-health svarar korrekt');
  } catch (err) {
    log('⚠️  llm-health svarar inte ännu (kan ta några sekunder att starta)');
  }
  
  console.log('');
  log('Klar! Processerna körs i bakgrunden.');
  log('Tryck Ctrl+C för att avsluta detta script (processerna fortsätter köra).');
  console.log('');
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  process.exit(1);
});
























