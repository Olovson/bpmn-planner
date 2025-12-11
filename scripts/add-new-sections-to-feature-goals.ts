#!/usr/bin/env tsx

/**
 * Script to add three new sections to all feature goal HTML files:
 * - Effekt
 * - User stories
 * - Acceptanskriterier
 * 
 * These sections are added at the end of each file, before the closing </div> tag.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FEATURE_GOALS_DIR = path.join(__dirname, '../public/local-content/feature-goals');

// Template for the three new sections
const NEW_SECTIONS_TEMPLATE = `
    <section class="doc-section">
      <h2>Effekt</h2>
      <p class="muted">Förväntad affärseffekt som uppnås med feature goalet.</p>
      <p>[Beskriv specifikt hur detta feature goal bidrar till affärseffekter. T.ex. om feature goalet leder till ökad automatisering, beskriv hur specifikt detta feature goal bidrar till effekten. Var konkret och mätbar där det är möjligt.]</p>
    </section>

    <section class="doc-section">
      <h2>User stories</h2>
      <p class="muted">Relevanta och realistiska user stories som kan kopplas till feature goalet.</p>
      <ul>
        <li><strong>Som [roll]</strong> vill jag [mål] <strong>så att</strong> [värde]</li>
        <li><strong>Som [roll]</strong> vill jag [mål] <strong>så att</strong> [värde]</li>
        <li><strong>Som [roll]</strong> vill jag [mål] <strong>så att</strong> [värde]</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Acceptanskriterier</h2>
      <p class="muted">Relevanta och realistiska acceptanskriterier som kan kopplas till feature goalet.</p>
      <ul>
        <li>[Acceptanskriterium 1: t.ex. "Systemet ska automatiskt utvärdera ansökan mot affärsregler och avgöra beslutsnivå"]</li>
        <li>[Acceptanskriterium 2: t.ex. "Ansökningar med låg risk ska dirigeras till straight-through processing"]</li>
        <li>[Acceptanskriterium 3: t.ex. "Ansökningar med hög risk ska dirigeras till rätt beslutsnivå"]</li>
      </ul>
    </section>
`;

function addNewSectionsToFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if sections already exist
    if (content.includes('<h2>Effekt</h2>')) {
      console.log(`  ⏭️  Skipping ${path.basename(filePath)} - sections already exist`);
      return false;
    }
    
    // Try to find closing </div> before </body> (for files with doc-shell structure)
    const closingDivPattern = /(\s*)<\/div>\s*<\/body>/;
    const divMatch = content.match(closingDivPattern);
    
    if (divMatch) {
      // File has doc-shell structure
      const indent = divMatch[1] || '';
      const newContent = content.replace(
        closingDivPattern,
        `${NEW_SECTIONS_TEMPLATE}${indent}</div>\n  </body>`
      );
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✅ Updated ${path.basename(filePath)}`);
      return true;
    }
    
    // Try to find </body> directly (for simpler files without doc-shell)
    const bodyPattern = /(\s*)<\/body>/;
    const bodyMatch = content.match(bodyPattern);
    
    if (bodyMatch) {
      // File has simpler structure
      const indent = bodyMatch[1] || '';
      const newContent = content.replace(
        bodyPattern,
        `${NEW_SECTIONS_TEMPLATE}${indent}</body>`
      );
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✅ Updated ${path.basename(filePath)}`);
      return true;
    }
    
    console.error(`  ❌ Could not find closing </div> or </body> in ${path.basename(filePath)}`);
    return false;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  console.log('================================================================================');
  console.log('LÄGGER TILL NYA SEKTIONER TILL FEATURE GOAL-FILER');
  console.log('================================================================================\n');
  
  console.log(`📁 Mapp: ${FEATURE_GOALS_DIR}\n`);
  
  if (!fs.existsSync(FEATURE_GOALS_DIR)) {
    console.error(`❌ Mappen finns inte: ${FEATURE_GOALS_DIR}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(FEATURE_GOALS_DIR)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(FEATURE_GOALS_DIR, file));
  
  console.log(`🔍 Hittade ${files.length} HTML-filer\n`);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of files) {
    const result = addNewSectionsToFile(file);
    if (result === true) {
      updated++;
    } else if (result === false) {
      // Check if it was skipped or error
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('<h2>Effekt</h2>')) {
        skipped++;
      } else {
        errors++;
      }
    }
  }
  
  console.log('\n================================================================================');
  console.log('✅ KLAR');
  console.log('================================================================================\n');
  console.log(`📊 Sammanfattning:`);
  console.log(`   ✅ Uppdaterade filer: ${updated}`);
  console.log(`   ⏭️  Hoppade över (redan uppdaterade): ${skipped}`);
  console.log(`   ❌ Fel: ${errors}`);
  console.log(`   📝 Totalt: ${files.length} filer\n`);
}

main();

