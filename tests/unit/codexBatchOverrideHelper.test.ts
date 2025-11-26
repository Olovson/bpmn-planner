import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { findOverrideFiles, needsUpdate, analyzeFile } from '@/lib/codexBatchOverrideHelper';

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
    // File must match format: <bpmnBaseName>.<elementId>.doc.ts
    const filePath = path.join(tempDir, 'src', 'data', 'node-docs', 'feature-goal', 'test.bpmn.node1.doc.ts');
    fs.writeFileSync(filePath, 'export const overrides = {};');
    
    // Use production code with tempDir as projectRoot
    const files = findOverrideFiles('src/data/node-docs/feature-goal', tempDir);
    expect(files.length).toBe(1);
    
    const promptVersions = { featureEpic: '1.0.0', businessRule: '1.0.0' };
    fs.writeFileSync(filePath, `export const overrides = { summary: 'TODO' };`, 'utf-8');
    expect(needsUpdate(filePath, 'feature-goal', promptVersions)).toBe(true);
    
    fs.writeFileSync(filePath, `/** bpmnFile: test.bpmn\nelementId: node1\ntype: feature-goal */\nexport const overrides = { summary: 'TODO' };`, 'utf-8');
    const analysis = analyzeFile(filePath);
    expect(analysis.context?.bpmnFile).toBe('test.bpmn');
    expect(analysis.needsUpdate.length).toBeGreaterThan(0);
  });
});

