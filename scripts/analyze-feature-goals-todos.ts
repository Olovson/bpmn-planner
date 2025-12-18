#!/usr/bin/env tsx
/**
 * Analysera Feature Goals för TODO:s i UI Flow-tabeller och saknade aktiviteter i Implementation Mapping
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const FEATURE_GOALS_DIR = join(process.cwd(), 'public/local-content/feature-goals');

interface TodoAnalysis {
  file: string;
  uiFlowTodos: number;
  implementationMappingTodos: number;
  dataProfileTodos: number;
  totalTodos: number;
  uiFlowDetails: string[];
}

function analyzeFeatureGoal(filePath: string): TodoAnalysis {
  const content = readFileSync(filePath, 'utf-8');
  const fileName = filePath.split('/').pop() || '';

  // Räkna TODO:s i UI Flow-tabeller
  const uiFlowTodoPattern = /\[TODO:.*?\]/gi;
  const uiFlowMatches = content.match(uiFlowTodoPattern) || [];
  
  // Identifiera specifika TODO-typer
  const pageIdTodos = (content.match(/\[TODO:.*[Pp]age ID.*?\]/gi) || []).length;
  const locatorTodos = (content.match(/\[TODO:.*[Ll]ocator.*?\]/gi) || []).length;
  const navigationTodos = (content.match(/\[TODO:.*[Nn]avigationssteg.*?\]/gi) || []).length;
  const dataProfileTodos = (content.match(/\[TODO:.*[Dd]ata.*?[Pp]rofile.*?\]/gi) || []).length;
  
  // Räkna saknade aktiviteter i Implementation Mapping
  // Detta är svårare att automatisera, så vi fokuserar på UI Flow TODO:s först
  
  const uiFlowDetails: string[] = [];
  if (pageIdTodos > 0) uiFlowDetails.push(`${pageIdTodos} Page ID TODO:s`);
  if (locatorTodos > 0) uiFlowDetails.push(`${locatorTodos} Locator TODO:s`);
  if (navigationTodos > 0) uiFlowDetails.push(`${navigationTodos} Navigation TODO:s`);
  if (dataProfileTodos > 0) uiFlowDetails.push(`${dataProfileTodos} Data Profile TODO:s`);

  return {
    file: fileName,
    uiFlowTodos: uiFlowMatches.length,
    implementationMappingTodos: 0, // TODO: Implementera analys av Implementation Mapping
    dataProfileTodos,
    totalTodos: uiFlowMatches.length,
    uiFlowDetails,
  };
}

async function main() {
  console.log('🔍 Analyserar Feature Goals för TODO:s...\n');

  const files = readdirSync(FEATURE_GOALS_DIR)
    .filter((f) => f.endsWith('.html') && f.includes('v2'))
    .map((f) => join(FEATURE_GOALS_DIR, f));

  const analyses: TodoAnalysis[] = files.map(analyzeFeatureGoal);

  // Sortera efter antal TODO:s (högst först)
  analyses.sort((a, b) => b.totalTodos - a.totalTodos);

  console.log('📊 Sammanfattning:\n');
  console.log(`Totalt antal Feature Goals: ${analyses.length}`);
  console.log(`Feature Goals med TODO:s: ${analyses.filter((a) => a.totalTodos > 0).length}`);
  console.log(`Totalt antal TODO:s: ${analyses.reduce((sum, a) => sum + a.totalTodos, 0)}\n`);

  console.log('🎯 Prioritering (högsta antal TODO:s först):\n');
  analyses
    .filter((a) => a.totalTodos > 0)
    .forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.file}`);
      console.log(`   Total TODO:s: ${analysis.totalTodos}`);
      if (analysis.uiFlowDetails.length > 0) {
        console.log(`   Detaljer: ${analysis.uiFlowDetails.join(', ')}`);
      }
      console.log();
    });

  // Spara resultat till fil
  const outputPath = join(process.cwd(), 'docs/feature-goals-todo-analysis.json');
  const output = {
    generatedAt: new Date().toISOString(),
    totalFiles: analyses.length,
    filesWithTodos: analyses.filter((a) => a.totalTodos > 0).length,
    totalTodos: analyses.reduce((sum, a) => sum + a.totalTodos, 0),
    analyses: analyses.filter((a) => a.totalTodos > 0),
  };

  const { writeFileSync } = await import('fs');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Resultat sparade till: ${outputPath}`);
}

main();

