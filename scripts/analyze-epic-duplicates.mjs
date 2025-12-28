#!/usr/bin/env node

/**
 * Analysera potentiella dubbelgenererade epics från dokumentationsgenerering.
 * 
 * Detta script identifierar:
 * 1. Epics med samma elementId i olika filer
 * 2. Epics med samma namn i olika filer
 * 3. Skillnader i kontext (parent-processer, dependencies, etc.)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Läs testresultat från EXACT_GENERATION_ORDER.md eller generera från test
const exactOrderPath = resolve(process.cwd(), 'docs/analysis/EXACT_GENERATION_ORDER.md');

let exactOrderContent = '';
try {
  exactOrderContent = readFileSync(exactOrderPath, 'utf-8');
} catch (error) {
  console.warn('Could not read EXACT_GENERATION_ORDER.md, will need to run test first');
}

// Extrahera alla epics från testresultat
const epicPattern = /\| \d+ \| ([^|]+) \| Epic \| ([^|]+) \|/g;
const epics = [];
let match;
while ((match = epicPattern.exec(exactOrderContent)) !== null) {
  const file = match[1].trim();
  const name = match[2].trim();
  epics.push({ file, name });
}

// Gruppera epics efter namn (för att identifiera potentiella dubbelgenereringar)
const epicsByName = new Map();
epics.forEach(({ file, name }) => {
  if (!epicsByName.has(name)) {
    epicsByName.set(name, []);
  }
  epicsByName.get(name).push(file);
});

// Identifiera potentiella dubbelgenereringar (samma namn i olika filer)
const duplicates = Array.from(epicsByName.entries())
  .filter(([name, files]) => files.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log('=== Analys: Potentiella Dubbelgenererade Epics ===\n');
console.log(`Totala epics: ${epics.length}`);
console.log(`Unika epic-namn: ${epicsByName.size}`);
console.log(`Potentiella dubbelgenereringar: ${duplicates.length}\n`);

if (duplicates.length > 0) {
  console.log('=== Potentiella Dubbelgenereringar ===\n');
  duplicates.forEach(([name, files]) => {
    console.log(`📋 ${name} (används i ${files.length} filer):`);
    files.forEach(file => {
      console.log(`   - ${file}`);
    });
    console.log('');
  });
} else {
  console.log('✅ Inga potentiella dubbelgenereringar hittades (alla epics har unika namn)');
}

// Analysera per task-typ (Service Task, User Task, Business Rule Task)
// Detta kräver att vi läser BPMN-filerna för att identifiera task-typ
console.log('\n=== Rekommendation ===\n');
console.log('För att analysera om dubbelgenerering är nödvändig:');
console.log('1. Identifiera task-typ för varje epic (Service Task, User Task, Business Rule Task)');
console.log('2. Jämför kontext (parent-processer, dependencies, flowSteps)');
console.log('3. Om kontexten är identisk → onödig dubbelgenerering');
console.log('4. Om kontexten skiljer sig → dubbelgenerering är nödvändig');

