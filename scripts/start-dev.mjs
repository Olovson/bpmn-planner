#!/usr/bin/env node

/**
 * Script som startar hela utvecklingsmiljön:
 * - Supabase (om den inte redan körs)
 * - Edge functions (alla i en process)
 * - Dev-server (npm run dev)
 *
 * Ctrl+C stoppar alla processer.
 */

import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Track child processes for cleanup
const childProcesses = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = '') {
  const timestamp = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(`${colors.dim}${timestamp}${colors.reset} ${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  console.log(`${colors.bright}${colors.cyan}━━━ ${title} ━━━${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`  ${message}`, colors.dim);
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
  log('Checking Supabase status...');
  const isRunning = checkSupabaseRunning();

  if (!isRunning) {
    log('Starting Supabase (this may take 1-2 minutes on first run)...');
    try {
      // Use spawn instead of execSync to avoid timeout issues
      const result = await new Promise((resolve, reject) => {
        const proc = spawn('supabase', ['start'], {
          cwd: projectRoot,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            reject(new Error(stderr || `Exit code ${code}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      });

      logSuccess('Supabase containers started');
    } catch (err) {
      logError(`Failed to start Supabase: ${err.message}`);
      return false;
    }
  } else {
    logSuccess('Supabase already running');
  }

  // Verify API is responding (allow longer on first run / image pulls)
  log('Verifying Supabase API (this can take a while on first run)...');
  const maxRetries = 90;
  let warnedStoppedServices = false;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = execSync('supabase status', { encoding: 'utf-8', stdio: 'pipe' });
      if (status.includes('Stopped services') && !warnedStoppedServices) {
        warnedStoppedServices = true;
        logInfo('Supabase services are still starting (some services stopped). Waiting...');
      }
    } catch {
      // ignore status errors while starting
    }

    try {
      execSync('curl -s http://127.0.0.1:54321/rest/v1/', {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 2000
      });
      logSuccess('Supabase API responding');
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logError('Supabase API not responding after waiting. Check `supabase status` for stopped services.');
  return false;
}

function startEdgeFunctions() {
  log('Starting edge functions...');

  const proc = spawn(
    'supabase',
    ['functions', 'serve', '--no-verify-jwt', '--env-file', 'supabase/.env'],
    {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  childProcesses.push(proc);

  // Log edge output to show readiness + errors
  proc.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) log(`[Edge] ${msg}`, colors.dim);
  });
  proc.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) logError(`[Edge] ${msg}`);
  });

  proc.on('error', (err) => {
    logError(`Edge functions error: ${err.message}`);
  });

  return proc;
}

async function verifyEdgeFunctions() {
  const maxRetries = 10;
  const retryDelay = 500;

  for (let i = 0; i < maxRetries; i++) {
    try {
      execSync('curl -s http://127.0.0.1:54321/functions/v1/llm-health', {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 2000
      });
      logSuccess('Edge functions responding');
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  logError('Edge functions not responding (may still be starting)');
  return false;
}

function startDevServer() {
  log('Starting Vite dev server...');

  const proc = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  childProcesses.push(proc);

  let serverReady = false;

  proc.stdout.on('data', (data) => {
    const msg = data.toString().trimEnd();
    if (msg) {
      // Echo Vite output for visibility
      log(`[Vite] ${msg}`, colors.dim);
    }
    // Show the Vite ready message
    if (msg.includes('Local:') && !serverReady) {
      serverReady = true;
      logSuccess('Dev server ready');
      showFinalStatus();
    }
  });

  proc.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) logError(`[Vite] ${msg}`);
  });

  proc.on('error', (err) => {
    logError(`Dev server error: ${err.message}`);
  });

  return proc;
}

function showFinalStatus() {
  console.log('');
  console.log(`${colors.bright}${colors.green}━━━ Development Environment Ready ━━━${colors.reset}`);
  console.log('');
  console.log(`  ${colors.bright}App:${colors.reset}      http://localhost:8080`);
  console.log(`  ${colors.bright}Supabase:${colors.reset} http://127.0.0.1:54323 (Studio)`);
  console.log('');
  console.log(`  ${colors.dim}Press Ctrl+C to stop all services${colors.reset}`);
  console.log('');
}

function cleanup() {
  console.log('');
  log('Stopping services...');

  // Kill child processes
  for (const proc of childProcesses) {
    try {
      proc.kill('SIGTERM');
    } catch (e) {
      // Process might already be dead
    }
  }

  logSuccess('Services stopped');
  console.log('');
  process.exit(0);
}

// Handle Ctrl+C
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function main() {
  console.clear();
  logSection('BPMN Planner Dev Environment');

  // 1. Start Supabase
  const supabaseOk = await startSupabase();
  if (!supabaseOk) {
    logError('Could not start Supabase. Exiting.');
    process.exit(1);
  }

  // 2. Verify schema (quietly)
  log('Verifying database schema...');
  try {
    execSync('npm run check:db-schema', { stdio: 'pipe', cwd: projectRoot });
    logSuccess('Schema verified');
  } catch (err) {
    logError('Schema verification failed. Run: npm run supabase:reset');
    process.exit(1);
  }

  // 3. Start edge functions
  startEdgeFunctions();
  await verifyEdgeFunctions();

  // 4. Start dev server
  startDevServer();

  // Keep the process running
  await new Promise(() => {});
}

main().catch((err) => {
  logError(`Unexpected error: ${err.message}`);
  process.exit(1);
});





















