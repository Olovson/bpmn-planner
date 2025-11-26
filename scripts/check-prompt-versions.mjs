#!/usr/bin/env node

/**
 * Check Prompt Versions
 * 
 * Detta script kontrollerar vilka override-filer som använder gamla versioner av prompt-mallarna.
 * 
 * Användning:
 *   npm run check:prompt-versions
 * 
 * Detta kommer att:
 * 1. Läsa prompt-versioner från prompts/llm/*.md
 * 2. Kontrollera vilka override-filer som har gamla versioner
 * 3. Visa vilka filer som behöver uppdateras
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Extrahera version från prompt-fil
function getPromptVersion(promptPath) {
  if (!fs.existsSync(promptPath)) {
    return null;
  }

  const content = fs.readFileSync(promptPath, 'utf-8');
  
  // Sök efter version i kommentarer eller metadata
  const versionMatch = content.match(/version[:\s]+(\d+\.\d+\.\d+|\d+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  // Om ingen version hittas, använd filens ändringsdatum som hash
  const stats = fs.statSync(promptPath);
  const hash = stats.mtimeMs.toString(36).slice(-8);
  return `auto-${hash}`;
}

// Extrahera prompt-version från override-fil
function getOverridePromptVersion(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Sök efter prompt-version kommentar
  const versionMatch = content.match(/PROMPT[_\s-]?VERSION[:\s]+(\d+\.\d+\.\d+|\d+|auto-[a-z0-9]+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  return null;
}

// Hitta alla override-filer
function findOverrideFiles() {
  const nodeDocsRoot = path.join(projectRoot, 'src', 'data', 'node-docs');
  const results = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.doc.ts')) {
        const relativePath = path.relative(projectRoot, fullPath);
        const docType = path.relative(nodeDocsRoot, dir);
        results.push({
          filePath: fullPath,
          docType,
          relativePath,
        });
      }
    }
  }

  scanDirectory(nodeDocsRoot);
  return results;
}

// Huvudfunktion
function main() {
  console.log('🔍 Kontrollerar prompt-versioner...\n');

  // Hämta aktuella prompt-versioner
  const promptDir = path.join(projectRoot, 'prompts', 'llm');
  const featureEpicPrompt = path.join(promptDir, 'feature_epic_prompt.md');
  const businessRulePrompt = path.join(promptDir, 'dmn_businessrule_prompt.md');

  const currentVersions = {
    'feature-epic': getPromptVersion(featureEpicPrompt),
    'business-rule': getPromptVersion(businessRulePrompt),
  };

  console.log('📋 Aktuella prompt-versioner:');
  console.log(`   feature-epic: ${currentVersions['feature-epic'] || 'Okänd'}`);
  console.log(`   business-rule: ${currentVersions['business-rule'] || 'Okänd'}\n`);

  // Hitta alla override-filer
  const overrideFiles = findOverrideFiles();
  console.log(`📁 Hittade ${overrideFiles.length} override-filer\n`);

  // Kontrollera versioner
  const outdatedFiles = [];
  const noVersionFiles = [];

  for (const file of overrideFiles) {
    const overrideVersion = getOverridePromptVersion(file.filePath);
    
    // Bestäm vilken prompt som används
    let expectedVersion = null;
    if (file.docType === 'business-rule') {
      expectedVersion = currentVersions['business-rule'];
    } else {
      expectedVersion = currentVersions['feature-epic'];
    }

    if (!overrideVersion) {
      noVersionFiles.push({ ...file, expectedVersion });
    } else if (overrideVersion !== expectedVersion) {
      outdatedFiles.push({ ...file, currentVersion: overrideVersion, expectedVersion });
    }
  }

  // Visa resultat
  console.log('='.repeat(70));
  console.log('📊 Resultat:');
  console.log('='.repeat(70) + '\n');

  if (outdatedFiles.length === 0 && noVersionFiles.length === 0) {
    console.log('✅ Alla filer använder aktuella prompt-versioner!\n');
    return;
  }

  if (outdatedFiles.length > 0) {
    console.log(`⚠️  ${outdatedFiles.length} filer använder gamla prompt-versioner:\n`);
    for (const file of outdatedFiles.slice(0, 10)) {
      console.log(`   ${file.relativePath}`);
      console.log(`      Nuvarande: ${file.currentVersion}`);
      console.log(`      Förväntad: ${file.expectedVersion}\n`);
    }
    if (outdatedFiles.length > 10) {
      console.log(`   ... och ${outdatedFiles.length - 10} fler filer\n`);
    }
  }

  if (noVersionFiles.length > 0) {
    console.log(`📝 ${noVersionFiles.length} filer saknar prompt-version (genererade före versionering):\n`);
    for (const file of noVersionFiles.slice(0, 10)) {
      console.log(`   ${file.relativePath}`);
    }
    if (noVersionFiles.length > 10) {
      console.log(`   ... och ${noVersionFiles.length - 10} fler filer\n`);
    }
  }

  console.log('='.repeat(70));
  console.log('💡 Nästa steg:');
  console.log('='.repeat(70) + '\n');

  if (outdatedFiles.length > 0 || noVersionFiles.length > 0) {
    console.log('För att uppdatera filer med nya prompt-versioner:');
    console.log('1. Kör: npm run codex:batch:auto');
    console.log('2. Detta kommer att re-generera innehåll med nya prompt-versioner\n');
  }
}

main();

