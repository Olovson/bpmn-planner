import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { getPromptVersion, getOverridePromptVersion } from '@/lib/promptVersioning';

describe('Prompt Versioning', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'prompt-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should extract versions correctly', () => {
    const promptFile = path.join(tempDir, 'prompt.md');
    const overrideFile = path.join(tempDir, 'override.doc.ts');
    
    fs.writeFileSync(promptFile, '<!-- PROMPT VERSION: 1.0.0 -->', 'utf-8');
    expect(getPromptVersion(promptFile)).toBe('1.0.0');
    
    fs.writeFileSync(overrideFile, `/** PROMPT VERSION: 1.0.0 */\nexport const overrides = {};`, 'utf-8');
    expect(getOverridePromptVersion(overrideFile)).toBe('1.0.0');
    
    fs.writeFileSync(promptFile, '<!-- PROMPT VERSION: 2.0.0 -->', 'utf-8');
    expect(getPromptVersion(promptFile)).not.toBe(getOverridePromptVersion(overrideFile));
  });
});

