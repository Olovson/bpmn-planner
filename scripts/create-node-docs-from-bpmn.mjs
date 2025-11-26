#!/usr/bin/env node

/**
 * Bulk generator for node documentation override stubs.
 *
 * Usage:
 *   node scripts/create-node-docs-from-bpmn.mjs <bpmnFile>
 *
 * Example:
 *   node scripts/create-node-docs-from-bpmn.mjs mortgage-se-application.bpmn
 *
 * Behaviour:
 * - Locates the BPMN file under common local folders (public/bpmn, tests/fixtures/bpmn, tests/fixtures/bpmn/analytics)
 * - Scans for relevant nodes:
 *     - bpmn:callActivity       → feature-goal overrides
 *     - bpmn:userTask           → epic overrides
 *     - bpmn:serviceTask        → epic overrides
 *     - bpmn:businessRuleTask   → business-rule overrides
 * - For each node without an existing override file, invokes the single-node generator:
 *     scripts/generate-node-doc-override.mjs
 * - Never overwrites existing override files.
 *
 * This script only creates stub files; it does not change the documentation pipeline.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const bpmnFile = process.argv[2];

if (!bpmnFile) {
  console.error('Usage: node scripts/create-node-docs-from-bpmn.mjs <bpmnFile>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/create-node-docs-from-bpmn.mjs mortgage-se-application.bpmn');
  process.exit(1);
}

// Sanitize elementId (same logic as sanitizeElementId in nodeArtifactPaths.ts)
const sanitizeElementId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

// Find BPMN file in common local folders
const candidateDirs = [
  path.join(projectRoot, 'public', 'bpmn'),
  path.join(projectRoot, 'tests', 'fixtures', 'bpmn'),
  path.join(projectRoot, 'tests', 'fixtures', 'bpmn', 'analytics'),
];

let resolvedPath = null;
for (const dir of candidateDirs) {
  const candidate = path.join(dir, bpmnFile);
  if (fs.existsSync(candidate)) {
    resolvedPath = candidate;
    break;
  }
}

if (!resolvedPath) {
  console.error(`Error: Could not find BPMN file "${bpmnFile}" in known local folders.`);
  console.error('Checked:');
  candidateDirs.forEach((dir) => console.error(`  - ${dir}`));
  process.exit(1);
}

console.log(`[create-node-docs-from-bpmn] Using BPMN file: ${resolvedPath}`);

const xml = fs.readFileSync(resolvedPath, 'utf-8');

// Simple regex-based scan for testable nodes
const nodeRegex =
  /<bpmn:(userTask|serviceTask|businessRuleTask|callActivity)\b[^>]*\bid="([^"]+)"[^>]*\bname="([^"]*)"[^>]*>/g;

/** @type {Array<{ type: string; id: string; name: string; docType: 'feature-goal' | 'epic' | 'business-rule' }>} */
const nodes = [];

let match;
while ((match = nodeRegex.exec(xml)) !== null) {
  const [, rawType, id, name] = match;
  /** @type {'feature-goal' | 'epic' | 'business-rule' | null} */
  let docType = null;

  if (rawType === 'callActivity') {
    docType = 'feature-goal';
  } else if (rawType === 'businessRuleTask') {
    docType = 'business-rule';
  } else if (rawType === 'userTask' || rawType === 'serviceTask') {
    docType = 'epic';
  }

  if (!docType) continue;

  nodes.push({
    type: rawType,
    id,
    name,
    docType,
  });
}

if (!nodes.length) {
  console.log(
    `[create-node-docs-from-bpmn] No relevant nodes found in ${bpmnFile} (callActivity/userTask/serviceTask/businessRuleTask).`
  );
  process.exit(0);
}

console.log(
  `[create-node-docs-from-bpmn] Found ${nodes.length} candidate nodes in ${bpmnFile}.`
);

const baseName = bpmnFile.replace('.bpmn', '');
let createdCount = 0;
let skippedExisting = 0;

for (const node of nodes) {
  const sanitized = sanitizeElementId(node.id);
  const overrideDir = path.join(
    projectRoot,
    'src',
    'data',
    'node-docs',
    node.docType
  );
  const overridePath = path.join(
    overrideDir,
    `${baseName}.${sanitized}.doc.ts`
  );

  if (fs.existsSync(overridePath)) {
    skippedExisting += 1;
    console.log(
      `[create-node-docs-from-bpmn] Skipping existing override (${node.docType}): ${bpmnFile}::${node.id}`
    );
    continue;
  }

  // Ensure directory exists (single-node generator will also do this, but this is cheap)
  fs.mkdirSync(overrideDir, { recursive: true });

  console.log(
    `[create-node-docs-from-bpmn] Creating override stub (${node.docType}): ${bpmnFile}::${node.id}`
  );

  const result = spawnSync(
    'node',
    [
      path.join(projectRoot, 'scripts', 'generate-node-doc-override.mjs'),
      node.docType,
      bpmnFile,
      node.id,
    ],
    {
      stdio: 'inherit',
    }
  );

  if (result.status === 0) {
    createdCount += 1;
  } else {
    console.warn(
      `[create-node-docs-from-bpmn] Failed to create override for ${bpmnFile}::${node.id} (exit code ${result.status}).`
    );
  }
}

console.log('');
console.log(
  `[create-node-docs-from-bpmn] Done. Created ${createdCount} override stub(s), skipped ${skippedExisting} existing file(s).`
);

