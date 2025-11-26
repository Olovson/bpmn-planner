#!/usr/bin/env node

/**
 * Validate Inputs Format
 * 
 * Detta script validerar att inputs-fält i Epic-filer följer rätt format.
 * 
 * Användning:
 *   npm run validate:inputs-format
 * 
 * Eller för en specifik fil:
 *   node scripts/validate-inputs-format.mjs src/data/node-docs/epic/file.doc.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Format som inputs ska följa för Epic
const REQUIRED_INPUT_FIELDS = ['Fält:', 'Datakälla:', 'Typ:', 'Obligatoriskt:', 'Validering:', 'Felhantering:'];

function validateInputsFormat(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: ['Filen finns inte'] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Kolla om det är en Epic-fil
  const isEpic = content.includes('type: epic') || content.includes('EpicDocOverrides');
  if (!isEpic) {
    return { valid: true, message: 'Inte en Epic-fil, inga inputs att validera' };
  }

  // Extrahera inputs-arrayen
  const inputsMatch = content.match(/inputs:\s*\[([\s\S]*?)\]/);
  if (!inputsMatch) {
    return { valid: true, message: 'Inga inputs hittades (kan vara tom array eller saknas)' };
  }

  const inputsContent = inputsMatch[1];
  
  // Hitta alla strängar i arrayen
  const stringMatches = [...inputsContent.matchAll(/"([^"]+)"/g)];
  
  if (stringMatches.length === 0) {
    return { valid: true, message: 'Inga inputs att validera (tom array)' };
  }

  const errors = [];
  const warnings = [];

  stringMatches.forEach((match, index) => {
    const inputString = match[1];
    
    // Kolla om det följer formatet
    const hasAllFields = REQUIRED_INPUT_FIELDS.every(field => inputString.includes(field));
    
    if (!hasAllFields) {
      errors.push(`Input ${index + 1}: Saknar nödvändiga fält. Format: "Fält: ...; Datakälla: ...; Typ: ...; Obligatoriskt: ...; Validering: ...; Felhantering: ..."`);
      errors.push(`  Nuvarande: "${inputString.substring(0, 80)}..."`);
    } else {
      // Validera att fälten är i rätt ordning (valfritt, men bra att kolla)
      const fieldOrder = REQUIRED_INPUT_FIELDS.map(field => inputString.indexOf(field)).filter(idx => idx !== -1);
      const isOrdered = fieldOrder.every((val, i, arr) => i === 0 || val > arr[i - 1]);
      
      if (!isOrdered) {
        warnings.push(`Input ${index + 1}: Fälten är inte i förväntad ordning (men formatet är korrekt)`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    inputCount: stringMatches.length,
  };
}

function findEpicFiles() {
  const epicDir = path.join(projectRoot, 'src', 'data', 'node-docs', 'epic');
  if (!fs.existsSync(epicDir)) {
    return [];
  }

  const files = fs.readdirSync(epicDir);
  return files
    .filter(file => file.endsWith('.doc.ts'))
    .map(file => path.join(epicDir, file));
}

function main() {
  const filePath = process.argv[2];
  
  if (filePath) {
    // Validera en specifik fil
    const result = validateInputsFormat(filePath);
    const relativePath = path.relative(projectRoot, filePath);
    
    console.log(`\n📄 Validerar: ${relativePath}\n`);
    
    if (result.message) {
      console.log(`ℹ️  ${result.message}\n`);
      process.exit(0);
    }
    
    if (result.valid) {
      console.log(`✅ Format korrekt (${result.inputCount} inputs validerade)`);
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Varningar:');
        result.warnings.forEach(w => console.log(`   ${w}`));
      }
    } else {
      console.log(`❌ Format fel:\n`);
      result.errors.forEach(e => console.log(`   ${e}`));
      process.exit(1);
    }
  } else {
    // Validera alla Epic-filer
    console.log('🔍 Validerar inputs-format i alla Epic-filer...\n');
    
    const epicFiles = findEpicFiles();
    let totalErrors = 0;
    let totalWarnings = 0;
    const filesWithErrors = [];
    
    for (const file of epicFiles) {
      const result = validateInputsFormat(file);
      const relativePath = path.relative(projectRoot, file);
      
      if (result.message) {
        // Skippa filer utan inputs
        continue;
      }
      
      if (!result.valid) {
        totalErrors += result.errors.length;
        filesWithErrors.push({ path: relativePath, errors: result.errors });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        totalWarnings += result.warnings.length;
      }
    }
    
    console.log('📊 Resultat:\n');
    console.log(`   Totalt antal Epic-filer: ${epicFiles.length}`);
    console.log(`   Filer med fel format: ${filesWithErrors.length}`);
    console.log(`   Totalt antal fel: ${totalErrors}`);
    console.log(`   Totalt antal varningar: ${totalWarnings}\n`);
    
    if (filesWithErrors.length > 0) {
      console.log('❌ Filer med fel format:\n');
      filesWithErrors.forEach(({ path, errors }) => {
        console.log(`   ${path}:`);
        errors.forEach(e => console.log(`     ${e}`));
        console.log('');
      });
      process.exit(1);
    } else {
      console.log('✅ Alla filer har korrekt format!\n');
      process.exit(0);
    }
  }
}

main();

