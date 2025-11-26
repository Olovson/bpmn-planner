import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock functions similar to codex-batch-auto.mjs
function findOverrideFiles(rootDir: string) {
  const nodeDocsRoot = path.join(rootDir, 'src', 'data', 'node-docs');
  const results: Array<{ filePath: string; docType: string; relativePath: string }> = [];

  if (!fs.existsSync(nodeDocsRoot)) {
    return results;
  }

  function scanDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.doc.ts')) {
        const relativePath = path.relative(rootDir, fullPath);
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

function needsUpdate(
  filePath: string,
  docType: string,
  promptVersions: { featureEpic: string; businessRule: string }
): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Kolla efter TODO-platshållare
  const hasTodo = (
    content.includes("'TODO'") ||
    content.includes('"TODO"') ||
    content.includes('TODO,') ||
    /:\s*\[\]\s*,/.test(content) ||
    /:\s*''\s*,/.test(content)
  );
  
  // Kolla efter gammal prompt-version
  const currentVersion = getOverridePromptVersion(filePath);
  const expectedVersion = docType === 'business-rule' 
    ? promptVersions.businessRule 
    : promptVersions.featureEpic;
  
  const hasOldVersion = currentVersion && currentVersion !== expectedVersion;
  
  return hasTodo || hasOldVersion;
}

function getOverridePromptVersion(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const versionMatch = content.match(/PROMPT[_\s-]?VERSION[:\s]+(\d+\.\d+\.\d+|\d+|auto-[a-z0-9]+)/i);
  return versionMatch ? versionMatch[1] : null;
}

function analyzeFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const needsUpdate: Array<{ field: string; type: string }> = [];
  
  // Extrahera NODE CONTEXT (kan vara på flera rader med kommentarer)
  // Match across multiple lines, allowing for whitespace and comments
  const contextMatch = content.match(
    /bpmnFile:\s*([^\n\r]+)[\s\S]*?elementId:\s*([^\n\r]+)[\s\S]*?type:\s*([^\n\r]+)/
  );
  
  const context = contextMatch ? {
    bpmnFile: contextMatch[1].trim(),
    elementId: contextMatch[2].trim(),
    type: contextMatch[3].trim(),
  } : null;
  
  // Hitta TODO-platshållare (kan vara 'TODO' eller "TODO")
  const todoMatches = [...content.matchAll(/(\w+):\s*['"]TODO['"]/g)];
  for (const match of todoMatches) {
    needsUpdate.push({ field: match[1], type: 'TODO' });
  }
  
  // Hitta tomma arrayer
  const emptyArrayMatches = [...content.matchAll(/(\w+):\s*\[\]\s*,/g)];
  for (const match of emptyArrayMatches) {
    needsUpdate.push({ field: match[1], type: 'empty array' });
  }
  
  // Hitta tomma strängar
  const emptyStringMatches = [...content.matchAll(/(\w+):\s*''\s*,/g)];
  for (const match of emptyStringMatches) {
    needsUpdate.push({ field: match[1], type: 'empty string' });
  }
  
  return { context, needsUpdate };
}

describe('Codex Batch Override Helper', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'codex-test-'));
    fs.mkdirSync(path.join(tempDir, 'src', 'data', 'node-docs', 'feature-goal'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should find files, detect updates, and analyze correctly', () => {
    const filePath = path.join(tempDir, 'src', 'data', 'node-docs', 'feature-goal', 'test.doc.ts');
    fs.writeFileSync(filePath, 'export const overrides = {};');
    expect(findOverrideFiles(tempDir).length).toBe(1);
    
    const promptVersions = { featureEpic: '1.0.0', businessRule: '1.0.0' };
    fs.writeFileSync(filePath, `export const overrides = { summary: 'TODO' };`, 'utf-8');
    expect(needsUpdate(filePath, 'feature-goal', promptVersions)).toBe(true);
    
    fs.writeFileSync(filePath, `/** bpmnFile: test.bpmn\nelementId: test\ntype: feature-goal */\nexport const overrides = { summary: 'TODO' };`, 'utf-8');
    const analysis = analyzeFile(filePath);
    expect(analysis.context?.bpmnFile).toBe('test.bpmn');
    expect(analysis.needsUpdate.length).toBeGreaterThan(0);
  });
});

