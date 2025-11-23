#!/usr/bin/env node

/**
 * Safe Sync to GitHub Script
 * 
 * Synkar lokala ändringar till GitHub utan att någonsin skriva över lokala ändringar med remote.
 * Lokalt repo är alltid source of truth.
 * 
 * Om remote har något som inte finns lokalt rapporteras det, men inget försöker lösa det automatiskt.
 * 
 * Användning:
 *   node scripts/sync-to-github.mjs
 *   eller
 *   npm run sync:github
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Konfiguration
const PROJECT_PATH = '/Users/magnusolovson/Documents/Projects/bpmn-planner';
const REMOTE_REPO = 'https://github.com/Olovson/bpmn-planner.git';
const MAIN_BRANCH = 'main';

function log(message) {
  console.log(`[Git Sync] ${message}`);
}

function error(message) {
  console.error(`[Git Sync] ERROR: ${message}`);
}

function success(message) {
  console.log(`[Git Sync] ✅ ${message}`);
}

function runCommand(command, description, options = {}) {
  try {
    if (!options.silent) {
      log(description);
    }
    const result = execSync(command, { 
      cwd: PROJECT_PATH, 
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit'
    });
    return { 
      success: true, 
      output: options.silent ? result : null 
    };
  } catch (err) {
    const output = err.stdout ? err.stdout.toString() : '';
    const errorOutput = err.stderr ? err.stderr.toString() : '';
    return { 
      success: false, 
      error: err.message,
      output: output,
      errorOutput: errorOutput
    };
  }
}

function main() {
  console.log('');
  log('═══════════════════════════════════════════════════════════');
  log('Safe Sync to GitHub');
  log('═══════════════════════════════════════════════════════════');
  console.log('');

  // 1. Gå till projektmappen
  log(`Projektmapp: ${PROJECT_PATH}`);
  
  // 2. Visa git-status
  log('Kontrollerar git-status...');
  const statusResult = runCommand('git status', 'Git status', { silent: false });
  if (!statusResult.success) {
    error('Kunde inte köra git status. Kontrollera att du är i ett git-repo.');
    process.exit(1);
  }

  // 3. Verifiera branch & remote
  log('Verifierar branch och remote...');
  const branchResult = runCommand('git branch', 'Aktuell branch', { silent: true });
  const remoteResult = runCommand('git remote -v', 'Remote repositories', { silent: true });
  
  if (!branchResult.success || !branchResult.output) {
    error('Kunde inte hämta branch-information.');
    process.exit(1);
  }
  
  if (!remoteResult.success || !remoteResult.output) {
    error('Kunde inte hämta remote-information.');
    process.exit(1);
  }

  // Kontrollera att vi är på main branch
  const branchLines = (branchResult.output || '').trim().split('\n').filter(line => line.trim());
  const currentBranchLine = branchLines.find(line => line.startsWith('*'));
  const currentBranch = currentBranchLine ? currentBranchLine.replace('*', '').trim() : null;
  
  if (!currentBranch || currentBranch !== MAIN_BRANCH) {
    error(`Du är inte på ${MAIN_BRANCH} branch. Aktuell branch: ${currentBranch || 'okänd'}`);
    log('Växla till main branch med: git checkout main');
    process.exit(1);
  }
  success(`På branch: ${currentBranch}`);

  // Kontrollera att remote är korrekt
  if (!remoteResult.output || !remoteResult.output.includes(REMOTE_REPO)) {
    error(`Remote matchar inte förväntad repo: ${REMOTE_REPO}`);
    log('Aktuell remote:');
    console.log(remoteResult.output || 'Ingen remote hittades');
    process.exit(1);
  }
  success('Remote verifierad');

  // 4. Kolla divergence mot remote utan att ändra något
  console.log('');
  log('Kontrollerar divergence mot remote...');
  
  const fetchResult = runCommand('git fetch origin', 'Hämtar remote status', { silent: true });
  if (!fetchResult.success) {
    error('Kunde inte hämta remote status.');
    process.exit(1);
  }

  const statusSbResult = runCommand('git status -sb', 'Status mot remote', { silent: true });
  const divergenceResult = runCommand(
    `git rev-list --left-right --count origin/${MAIN_BRANCH}...${MAIN_BRANCH} || true`,
    'Divergence-check',
    { silent: true }
  );

  if (divergenceResult.success && divergenceResult.output && divergenceResult.output.trim()) {
    const [remoteAhead, localAhead] = divergenceResult.output.trim().split(/\s+/).map(Number);
    
    if (remoteAhead > 0) {
      error(`Remote ligger ${remoteAhead} commit(s) före lokalt.`);
      log('Lokal kod är source of truth - stoppar för säkerhets skull.');
      log('Om du vill synka remote till lokalt, gör det manuellt med försiktighet.');
      process.exit(1);
    }
    
    if (localAhead > 0) {
      log(`Lokalt ligger ${localAhead} commit(s) före remote.`);
    } else {
      success('Lokalt och remote är synkade.');
    }
  }

  // 5. Commit ocommittade ändringar
  console.log('');
  log('Kontrollerar ocommittade ändringar...');
  
  const porcelainResult = runCommand('git status --porcelain', 'Ocommittade ändringar', { silent: true });
  
  if (porcelainResult.success && porcelainResult.output && porcelainResult.output.trim()) {
    log('Hittade ocommittade ändringar. Committar...');
    
    const addResult = runCommand('git add .', 'Lägger till alla ändringar', { silent: false });
    if (!addResult.success) {
      error('Kunde inte lägga till ändringar.');
      process.exit(1);
    }

    const commitResult = runCommand(
      'git commit -m "chore: sync local changes to origin"',
      'Committar ändringar',
      { silent: false }
    );
    
    if (!commitResult.success) {
      // Det kan vara att det inte finns något att committa (t.ex. inga ändringar efter add)
      if (commitResult.errorOutput && commitResult.errorOutput.includes('nothing to commit')) {
        log('Inget att committa (inga ändringar efter staging).');
      } else {
        error('Kunde inte committa ändringar.');
        console.error(commitResult.errorOutput || commitResult.error);
        process.exit(1);
      }
    } else {
      success('Ändringar committade.');
    }
  } else {
    success('Inga ocommittade ändringar.');
  }

  // 6. Pusha lokala commits
  console.log('');
  log('Pusher till remote...');
  
  const pushResult = runCommand(`git push origin ${MAIN_BRANCH}`, 'Pushar till GitHub', { silent: false });
  
  if (!pushResult.success) {
    error('Kunde inte pusha till remote.');
    if (pushResult.errorOutput && pushResult.errorOutput.includes('no upstream branch')) {
      log('Försöker sätta upstream branch...');
      const setUpstreamResult = runCommand(
        `git push --set-upstream origin ${MAIN_BRANCH}`,
        'Sätter upstream branch',
        { silent: false }
      );
      if (!setUpstreamResult.success) {
        error('Kunde inte sätta upstream branch.');
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } else {
    success('Push lyckades!');
  }

  // Sammanfattning
  console.log('');
  log('═══════════════════════════════════════════════════════════');
  success('Synkning klar!');
  log('═══════════════════════════════════════════════════════════');
  console.log('');
  log('Lokala ändringar är nu synkade till GitHub.');
  log('Inga lokala ändringar har skrivits över.');
  console.log('');
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  console.error(err);
  process.exit(1);
});

