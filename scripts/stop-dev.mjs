#!/usr/bin/env node

/**
 * Stops all development services.
 *
 * Usage:
 *   node scripts/stop-dev.mjs
 *   npm run stop:dev
 */

import { execSync } from 'child_process';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
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

function logWarning(message) {
  log(`○ ${message}`, colors.yellow);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function checkSupabaseRunning() {
  try {
    const output = execSync('supabase status', { encoding: 'utf-8', stdio: 'pipe' });
    return output.includes('API URL:');
  } catch {
    return false;
  }
}

async function main() {
  console.clear();
  logSection('Stopping Development Environment');

  // Stop edge functions
  log('Stopping edge functions...');
  try {
    execSync("pkill -f 'supabase functions serve'", { stdio: 'pipe' });
    logSuccess('Edge functions stopped');
  } catch {
    logWarning('No edge functions running');
  }

  // Stop Vite dev server
  log('Stopping Vite dev server...');
  try {
    execSync("pkill -f 'vite'", { stdio: 'pipe' });
    logSuccess('Dev server stopped');
  } catch {
    logWarning('No dev server running');
  }

  // Stop Supabase
  log('Stopping Supabase...');
  if (checkSupabaseRunning()) {
    try {
      execSync('supabase stop', { stdio: 'pipe' });
      logSuccess('Supabase stopped');
    } catch (err) {
      logError('Failed to stop Supabase');
    }
  } else {
    logWarning('Supabase not running');
  }

  // Final status
  console.log('');
  console.log(`${colors.bright}${colors.green}━━━ All Services Stopped ━━━${colors.reset}`);
  console.log('');
}

main().catch((err) => {
  logError(`Unexpected error: ${err.message}`);
  process.exit(1);
});
