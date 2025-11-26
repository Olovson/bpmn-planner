#!/usr/bin/env node

/**
 * Script to generate a template file for node documentation overrides.
 * 
 * Usage:
 *   node scripts/generate-node-doc-override.mjs <docType> <bpmnFile> <elementId>
 * 
 * Example:
 *   node scripts/generate-node-doc-override.mjs feature-goal mortgage.bpmn application
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const docType = process.argv[2];
const bpmnFile = process.argv[3];
const elementId = process.argv[4];

if (!docType || !bpmnFile || !elementId) {
  console.error('Usage: node scripts/generate-node-doc-override.mjs <docType> <bpmnFile> <elementId>');
  console.error('');
  console.error('Arguments:');
  console.error('  docType:    feature-goal | epic | business-rule');
  console.error('  bpmnFile:   e.g. mortgage.bpmn or mortgage-se-application.bpmn');
  console.error('  elementId:  e.g. application or confirm-application');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/generate-node-doc-override.mjs feature-goal mortgage.bpmn application');
  process.exit(1);
}

if (!['feature-goal', 'epic', 'business-rule'].includes(docType)) {
  console.error(`Error: docType must be one of: feature-goal, epic, business-rule`);
  console.error(`Got: ${docType}`);
  process.exit(1);
}

// Sanitize elementId (same logic as sanitizeElementId in nodeArtifactPaths.ts)
const sanitizeElementId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

const baseName = bpmnFile.replace('.bpmn', '');
const sanitized = sanitizeElementId(elementId);
const dir = path.join(projectRoot, 'src', 'data', 'node-docs', docType);
const filePath = path.join(dir, `${baseName}.${sanitized}.doc.ts`);

// Ensure directory exists
fs.mkdirSync(dir, { recursive: true });

// Check if file already exists
if (fs.existsSync(filePath)) {
  console.error(`Error: Override file already exists: ${filePath}`);
  console.error('Delete it first if you want to regenerate it.');
  process.exit(1);
}

// Determine type name based on docType
const typeName =
  docType === 'feature-goal'
    ? 'FeatureGoalDocOverrides'
    : docType === 'epic'
    ? 'EpicDocOverrides'
    : 'BusinessRuleDocOverrides';

// Generate template
const template = `import type { ${typeName} } from '@/lib/nodeDocOverrides';

/**
 * Documentation overrides for ${bpmnFile}::${elementId}
 * 
 * This file allows you to customize the generated documentation for this specific node.
 * Only include fields you want to override - all other fields will use the base model.
 * 
 * Array fields default to 'replace' behavior (completely override base array).
 * To extend arrays instead of replacing them, use _mergeStrategy:
 * 
 * export const overrides: ${typeName} = {
 *   summary: "Custom summary...",
 *   effectGoals: ["New goal 1", "New goal 2"],
 *   _mergeStrategy: {
 *     effectGoals: 'extend' // Will append to base model's effectGoals
 *   }
 * };
 * 
 * Available fields depend on the docType:
 * ${docType === 'feature-goal' ? '- Feature Goal: summary, effectGoals, scopeIncluded, scopeExcluded, epics, flowSteps, dependencies, scenarios, testDescription, implementationNotes, relatedItems' : ''}
 * ${docType === 'epic' ? '- Epic: summary, prerequisites, inputs, flowSteps, interactions, dataContracts, businessRulesPolicy, scenarios, testDescription, implementationNotes, relatedItems' : ''}
 * ${docType === 'business-rule' ? '- Business Rule: summary, inputs, decisionLogic, outputs, businessRulesPolicy, scenarios, testDescription, implementationNotes, relatedItems' : ''}
 */

export const overrides: ${typeName} = {
  // Add your overrides here
  // Example:
  // summary: "Custom summary for this node...",
};
`;

fs.writeFileSync(filePath, template, 'utf-8');
console.log(`✅ Created override file: ${filePath}`);
console.log('');
console.log('Next steps:');
console.log('1. Edit the file and add your custom documentation');
console.log('2. Generate documentation locally from the Files page');
console.log('3. Check the result in the Doc Viewer');
console.log('');
console.log('Tip: Use _mergeStrategy to extend arrays instead of replacing them:');
console.log('  _mergeStrategy: {');
console.log('    scenarios: "extend"');
console.log('  }');

