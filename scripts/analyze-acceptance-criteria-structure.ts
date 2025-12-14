#!/usr/bin/env tsx
/**
 * Script to analyze acceptance criteria structure in user stories
 * Identifies files where acceptance criteria start with BPMN references instead of functionality
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const FEATURE_GOALS_DIR = 'public/local-content/feature-goals';

// Patterns that indicate acceptance criteria starting with BPMN references
const BPMN_START_PATTERNS = [
  /^Efter ['"]/i,
  /^När ['"]/i,
  /^Om ['"]/i,
  /^Efter .* gateway/i,
  /^När .* gateway/i,
  /^Om .* gateway/i,
  /^Efter .* call activity/i,
  /^När .* call activity/i,
  /^Om .* call activity/i,
  /^Efter .* boundary event/i,
  /^När .* boundary event/i,
  /^Om .* boundary event/i,
  /^Efter .* subprocess/i,
  /^När .* subprocess/i,
  /^Om .* subprocess/i,
  /^Efter .* intermediate throw event/i,
  /^När .* intermediate throw event/i,
  /^Om .* intermediate throw event/i,
  /^Efter .* end event/i,
  /^När .* end event/i,
  /^Om .* end event/i,
  /^Efter .* service task/i,
  /^När .* service task/i,
  /^Om .* service task/i,
  /^Efter .* user task/i,
  /^När .* user task/i,
  /^Om .* user task/i,
  /^Efter .* business rule task/i,
  /^När .* business rule task/i,
  /^Om .* business rule task/i,
];

interface FileAnalysis {
  filename: string;
  needsUpdate: boolean;
  issues: string[];
  userStoryCount: number;
  problematicCount: number;
}

function analyzeFile(filePath: string): FileAnalysis {
  const content = readFileSync(filePath, 'utf-8');
  const filename = filePath.split('/').pop() || '';
  
  // Extract user stories section
  const userStoriesMatch = content.match(/<summary>User stories<\/summary>[\s\S]*?<\/details>/i);
  if (!userStoriesMatch) {
    return {
      filename,
      needsUpdate: false,
      issues: ['No user stories section found'],
      userStoryCount: 0,
      problematicCount: 0,
    };
  }

  const userStoriesSection = userStoriesMatch[0];
  
  // Extract all acceptance criteria (in <em> tags after user stories)
  const acceptanceCriteriaMatches = userStoriesSection.matchAll(/<em>Acceptanskriterier:\s*([^<]+)<\/em>/gi);
  
  const issues: string[] = [];
  let userStoryCount = 0;
  let problematicCount = 0;
  
  for (const match of acceptanceCriteriaMatches) {
    userStoryCount++;
    const criteria = match[1].trim();
    
    // Check if it starts with BPMN reference
    const startsWithBPMN = BPMN_START_PATTERNS.some(pattern => pattern.test(criteria));
    
    if (startsWithBPMN) {
      problematicCount++;
      // Extract first sentence for context
      const firstSentence = criteria.split(/[.!?]/)[0].trim();
      if (firstSentence.length > 0 && firstSentence.length < 150) {
        issues.push(`Starts with BPMN: "${firstSentence}..."`);
      }
    }
  }
  
  return {
    filename,
    needsUpdate: problematicCount > 0,
    issues,
    userStoryCount,
    problematicCount,
  };
}

function main() {
  const files = readdirSync(FEATURE_GOALS_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => join(FEATURE_GOALS_DIR, f))
    .sort();

  console.log(`Analyzing ${files.length} files...\n`);
  
  const results: FileAnalysis[] = [];
  
  for (const file of files) {
    const analysis = analyzeFile(file);
    results.push(analysis);
  }
  
  const needsUpdate = results.filter(r => r.needsUpdate);
  const alreadyGood = results.filter(r => !r.needsUpdate && r.userStoryCount > 0);
  
  console.log('='.repeat(80));
  console.log('FILES THAT NEED UPDATE');
  console.log('='.repeat(80));
  console.log(`\nTotal: ${needsUpdate.length} files\n`);
  
  for (const result of needsUpdate) {
    console.log(`\n📄 ${result.filename}`);
    console.log(`   User stories: ${result.userStoryCount}, Problematic: ${result.problematicCount}`);
    if (result.issues.length > 0) {
      console.log(`   Issues:`);
      result.issues.slice(0, 3).forEach(issue => {
        console.log(`     - ${issue}`);
      });
      if (result.issues.length > 3) {
        console.log(`     ... and ${result.issues.length - 3} more`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('FILES THAT ARE ALREADY GOOD');
  console.log('='.repeat(80));
  console.log(`\nTotal: ${alreadyGood.length} files\n`);
  
  for (const result of alreadyGood) {
    console.log(`✅ ${result.filename} (${result.userStoryCount} user stories)`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files: ${files.length}`);
  console.log(`Files with user stories: ${results.filter(r => r.userStoryCount > 0).length}`);
  console.log(`Files needing update: ${needsUpdate.length}`);
  console.log(`Files already good: ${alreadyGood.length}`);
  console.log(`Files without user stories: ${results.filter(r => r.userStoryCount === 0).length}`);
  
  // Generate markdown list
  console.log('\n' + '='.repeat(80));
  console.log('MARKDOWN LIST FOR UPDATES');
  console.log('='.repeat(80));
  console.log('\n## Files that need acceptance criteria updates\n');
  for (const result of needsUpdate) {
    console.log(`- [ ] ${result.filename} (${result.problematicCount}/${result.userStoryCount} user stories need update)`);
  }
}

main();

