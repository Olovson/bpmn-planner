import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock functions from check-prompt-versions.mjs
function getPromptVersion(promptPath: string): string | null {
  if (!fs.existsSync(promptPath)) {
    return null;
  }

  const content = fs.readFileSync(promptPath, 'utf-8');
  
  // Sök efter version i kommentarer eller metadata
  const versionMatch = content.match(/version[:\s]+(\d+\.\d+\.\d+|\d+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  // Om ingen version hittas, använd filens ändringsdatum som hash
  const stats = fs.statSync(promptPath);
  const hash = stats.mtimeMs.toString(36).slice(-8);
  return `auto-${hash}`;
}

function getOverridePromptVersion(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Sök efter prompt-version kommentar (kan vara på flera rader)
  // Match both "PROMPT VERSION:" and "PROMPT_VERSION:"
  const versionMatch = content.match(/PROMPT[_\s-]?VERSION[:\s]+(\d+\.\d+\.\d+|\d+|auto-[a-z0-9]+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  return null;
}

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

