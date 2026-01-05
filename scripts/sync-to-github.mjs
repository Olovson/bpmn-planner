#!/usr/bin/env node

/**
 * Sync to GitHub Script
 * 
 * Synkar lokala ändringar till GitHub. Lokalt repo är facit och remote kan skrivas över.
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

async function main() {
  console.log('');
  log('═══════════════════════════════════════════════════════════');
  log('Sync to GitHub (lokalt är facit)');
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
      log(`Remote ligger ${remoteAhead} commit(s) före lokalt.`);
      log('Lokalt är facit - remote kommer att skrivas över vid push.');
    }
    
    if (localAhead > 0) {
      log(`Lokalt ligger ${localAhead} commit(s) före remote.`);
    } else if (remoteAhead === 0) {
      success('Lokalt och remote är synkade.');
    }
  }

  // 5. Commit ocommittade ändringar
  console.log('');
  log('Kontrollerar ocommittade ändringar...');
  
  const porcelainResult = runCommand('git status --porcelain', 'Ocommittade ändringar', { silent: true });
  
  if (porcelainResult.success && porcelainResult.output && porcelainResult.output.trim()) {
    log('Hittade ocommittade ändringar.');
    
    // Visa sammanfattning av ändringar
    console.log('');
    log('═══════════════════════════════════════════════════════════');
    log('Sammanfattning av ändringar:');
    log('═══════════════════════════════════════════════════════════');
    
    // Visa diff-statistik
    const diffStatResult = runCommand('git diff --stat', 'Diff-statistik', { silent: true });
    if (diffStatResult.success && diffStatResult.output) {
      console.log(diffStatResult.output);
    }
    
    // Visa ändrade filer
    const changedFiles = porcelainResult.output.trim().split('\n').map(line => {
      const status = line.substring(0, 2).trim();
      const file = line.substring(3).trim();
      return { status, file };
    });
    
    const added = changedFiles.filter(f => f.status.startsWith('A') || f.status.startsWith('??'));
    const modified = changedFiles.filter(f => f.status.startsWith('M'));
    const deleted = changedFiles.filter(f => f.status.startsWith('D'));
    
    if (added.length > 0) {
      console.log(`\n📝 Nya filer (${added.length}):`);
      added.forEach(f => console.log(`   + ${f.file}`));
    }
    
    if (modified.length > 0) {
      console.log(`\n✏️  Modifierade filer (${modified.length}):`);
      modified.forEach(f => console.log(`   ~ ${f.file}`));
    }
    
    if (deleted.length > 0) {
      console.log(`\n🗑️  Borttagna filer (${deleted.length}):`);
      deleted.forEach(f => console.log(`   - ${f.file}`));
    }
    
    console.log('');
    log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    log('Committar ändringar...');
    
    const addResult = runCommand('git add .', 'Lägger till alla ändringar', { silent: false });
    if (!addResult.success) {
      error('Kunde inte lägga till ändringar.');
      process.exit(1);
    }

    // Skapa bättre commit-meddelande baserat på ändringar
    let commitMessage = 'chore: sync local changes to origin';
    const totalChanges = added.length + modified.length + deleted.length;
    
    if (totalChanges > 0) {
      const parts = [];
      if (added.length > 0) parts.push(`${added.length} ny(a)`);
      if (modified.length > 0) parts.push(`${modified.length} modifierad(e)`);
      if (deleted.length > 0) parts.push(`${deleted.length} borttagen(a)`);
      commitMessage = `chore: sync local changes (${parts.join(', ')})`;
    }

    const commitResult = runCommand(
      `git commit -m "${commitMessage}"`,
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
      success(`Ändringar committade: ${commitMessage}`);
    }
  } else {
    success('Inga ocommittade ändringar.');
  }

  // 6. Pusha lokala commits (force push om remote ligger före)
  console.log('');
  log('Pusher till remote...');
  
  // Kontrollera om vi behöver force push
  const needsForcePush = divergenceResult.success && divergenceResult.output && divergenceResult.output.trim();
  let remoteAhead = 0;
  if (needsForcePush) {
    const [ahead] = divergenceResult.output.trim().split(/\s+/).map(Number);
    remoteAhead = ahead || 0;
  }
  
  let pushCommand = `git push origin ${MAIN_BRANCH}`;
  if (remoteAhead > 0) {
    log(`Remote ligger före lokalt - använder force push för att skriva över remote.`);
    pushCommand = `git push --force-with-lease origin ${MAIN_BRANCH}`;
  }
  
  const pushResult = runCommand(pushCommand, 'Pushar till GitHub', { silent: false });
  
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
  
  // Visa senaste commit om det skapades en
  const lastCommitResult = runCommand('git log -1 --oneline', 'Senaste commit', { silent: true });
  if (lastCommitResult.success && lastCommitResult.output) {
    log(`Senaste commit: ${lastCommitResult.output.trim()}`);
  }
  
  console.log('');
  log('Lokala ändringar är nu synkade till GitHub.');
  log('Lokalt repo är facit - remote har uppdaterats därefter.');
  console.log('');
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  console.error(err);
  process.exit(1);
});

