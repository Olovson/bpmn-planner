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
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'codex-batch-test-'));
    
    // Create directory structure
    const nodeDocsRoot = path.join(tempDir, 'src', 'data', 'node-docs');
    fs.mkdirSync(nodeDocsRoot, { recursive: true });
    fs.mkdirSync(path.join(nodeDocsRoot, 'feature-goal'), { recursive: true });
    fs.mkdirSync(path.join(nodeDocsRoot, 'epic'), { recursive: true });
    fs.mkdirSync(path.join(nodeDocsRoot, 'business-rule'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('findOverrideFiles', () => {
    it('should find override files and ignore non-doc.ts files', () => {
      const featureFile = path.join(tempDir, 'src', 'data', 'node-docs', 'feature-goal', 'test.doc.ts');
      fs.writeFileSync(featureFile, 'export const overrides = {};');
      fs.writeFileSync(path.join(tempDir, 'src', 'data', 'node-docs', 'feature-goal', 'test.ts'), 'export const test = {};');

      const files = findOverrideFiles(tempDir);
      
      // Safety check: ensure we're using tempDir, not production
      expect(tempDir).toContain('codex-batch-test-');
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some(f => f.docType === 'feature-goal')).toBe(true);
      // Verify all files are in tempDir, not production
      files.forEach(f => {
        expect(f.filePath).toContain(tempDir);
        expect(f.filePath).not.toContain(process.cwd());
      });
    });
  });

  describe('needsUpdate', () => {
    it('should detect files needing update (TODO, empty, old versions)', () => {
      const filePath = path.join(tempDir, 'test.doc.ts');
      const promptVersions = { featureEpic: '1.0.0', businessRule: '1.0.0' };

      fs.writeFileSync(filePath, `export const overrides = { summary: 'TODO' };`, 'utf-8');
      expect(needsUpdate(filePath, 'feature-goal', promptVersions)).toBe(true);

      fs.writeFileSync(filePath, `export const overrides = { effectGoals: [], };`, 'utf-8');
      expect(needsUpdate(filePath, 'feature-goal', promptVersions)).toBe(true);

      fs.writeFileSync(filePath, `/** PROMPT VERSION: 1.0.0 */\nexport const overrides = { summary: 'Content', effectGoals: ['Goal'], };`, 'utf-8');
      expect(needsUpdate(filePath, 'feature-goal', { featureEpic: '2.0.0', businessRule: '1.0.0' })).toBe(true);
      expect(needsUpdate(filePath, 'feature-goal', promptVersions)).toBe(false);
    });
  });

  describe('analyzeFile', () => {
    it('should extract context and identify fields needing update', () => {
      const filePath = path.join(tempDir, 'test.doc.ts');
      
      fs.writeFileSync(filePath, `/** bpmnFile: test.bpmn\nelementId: test-node\ntype: feature-goal */\nexport const overrides = {};`, 'utf-8');
      const analysis1 = analyzeFile(filePath);
      expect(analysis1.context?.bpmnFile).toBe('test.bpmn');

      fs.writeFileSync(filePath, `export const overrides = { summary: 'TODO', effectGoals: [], };`, 'utf-8');
      const analysis2 = analyzeFile(filePath);
      expect(analysis2.needsUpdate.length).toBeGreaterThan(0);
      expect(analysis2.needsUpdate.some(f => f.type === 'TODO' || f.type === 'empty array')).toBe(true);

      fs.writeFileSync(filePath, `export const overrides = { summary: 'Complete', effectGoals: ['Goal'], };`, 'utf-8');
      expect(analyzeFile(filePath).needsUpdate).toHaveLength(0);
    });
  });
});

