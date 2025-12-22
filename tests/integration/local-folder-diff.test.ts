/**
 * @vitest-environment jsdom
 * 
 * Integration test for local folder diff analysis
 * 
 * Tests the same functionality as the "Analysera Lokal Mapp" feature in the app,
 * but using Node.js fs instead of File System Access API.
 * 
 * This test:
 * 1. Finds all BPMN files recursively in a directory
 * 2. Calculates diff against existing files in Supabase
 * 3. Verifies that the same logic works as in the app
 * 
 * Note: Uses jsdom environment to provide DOM for bpmn-js parser
 * 
 * To run this test:
 * ```bash
 * npm test -- tests/integration/local-folder-diff.test.ts
 * ```
 * 
 * To change the test directory, modify `testDirPath` constant in the describe block.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { analyzeFolderDiff, type FolderDiffResult } from '@/lib/bpmnDiffRegeneration';
import { parseBpmnFileContent } from '@/lib/bpmnParser';
import { calculateDiffForLocalFile } from '@/lib/bpmnDiffRegeneration';

// Mock File System Access API for Node.js environment
// This creates a compatibility layer between Node.js fs and browser File System Access API

interface MockFileSystemFileHandle {
  name: string;
  kind: 'file';
  getFile(): Promise<File>;
}

interface MockFileSystemDirectoryHandle {
  name: string;
  kind: 'directory';
  values(): AsyncIterableIterator<MockFileSystemFileHandle | MockFileSystemDirectoryHandle>;
}

/**
 * Create a mock FileSystemFileHandle from a file path
 * Note: This is only used for type compatibility, actual file reading is done via fs
 */
async function createMockFileHandle(filePath: string, fileName: string): Promise<MockFileSystemFileHandle> {
  // We don't actually need to read the file here since we read it directly in analyzeFolderDiffNode
  // But we create a minimal mock for type compatibility
  const blob = new Blob([], { type: 'application/xml' });
  const file = new File([blob], fileName, { type: 'application/xml' });

  return {
    name: fileName,
    kind: 'file',
    async getFile() {
      return file;
    },
  };
}

/**
 * Create a mock FileSystemDirectoryHandle from a directory path
 */
async function createMockDirectoryHandle(dirPath: string, dirName: string = ''): Promise<MockFileSystemDirectoryHandle> {
  const entries: Array<MockFileSystemFileHandle | MockFileSystemDirectoryHandle> = [];

  async function* getEntries(): AsyncIterableIterator<MockFileSystemFileHandle | MockFileSystemDirectoryHandle> {
    const items = await readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = join(dirPath, item.name);

      if (item.isFile() && item.name.endsWith('.bpmn')) {
        const fileHandle = await createMockFileHandle(itemPath, item.name);
        yield fileHandle;
      } else if (item.isDirectory()) {
        const subDirHandle = await createMockDirectoryHandle(itemPath, item.name);
        yield subDirHandle;
      }
    }
  }

  return {
    name: dirName || dirPath,
    kind: 'directory',
    values: getEntries,
  };
}

/**
 * Find a file by name recursively in a directory
 */
async function findFileInDirectory(dirPath: string, fileName: string): Promise<string> {
  async function search(currentPath: string): Promise<string | null> {
    const items = await readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = join(currentPath, item.name);
      if (item.isFile() && item.name === fileName) {
        return itemPath;
      } else if (item.isDirectory()) {
        const found = await search(itemPath);
        if (found) return found;
      }
    }
    return null;
  }

  const found = await search(dirPath);
  if (!found) {
    throw new Error(`File ${fileName} not found in ${dirPath}`);
  }
  return found;
}

/**
 * Node.js version of findBpmnFilesInDirectory
 * Uses fs instead of File System Access API
 * Returns both relative paths and absolute paths for file reading
 */
async function findBpmnFilesInDirectoryNode(
  dirPath: string,
  recursive: boolean = true
): Promise<Array<{ fileName: string; filePath: string; absolutePath: string; handle: MockFileSystemFileHandle }>> {
  const files: Array<{ fileName: string; filePath: string; absolutePath: string; handle: MockFileSystemFileHandle }> = [];

  async function* getFilesRecursively(
    currentPath: string,
    basePath: string = ''
  ): AsyncGenerator<{ fileName: string; filePath: string; absolutePath: string; handle: MockFileSystemFileHandle }> {
    const items = await readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = join(currentPath, item.name);
      const entryPath = basePath ? `${basePath}/${item.name}` : item.name;

      if (item.isFile() && item.name.endsWith('.bpmn')) {
        const fileHandle = await createMockFileHandle(itemPath, item.name);
        yield {
          fileName: item.name,
          filePath: entryPath,
          absolutePath: itemPath,
          handle: fileHandle,
        };
      } else if (item.isDirectory() && recursive) {
        yield* getFilesRecursively(itemPath, entryPath);
      }
    }
  }

  for await (const file of getFilesRecursively(dirPath)) {
    files.push(file);
  }

  return files;
}

/**
 * Node.js version of analyzeFolderDiff
 * Uses fs instead of File System Access API but calls the same core functions
 */
async function analyzeFolderDiffNode(
  dirPath: string,
  options?: {
    recursive?: boolean;
    onProgress?: (current: number, total: number, fileName: string) => void;
  }
): Promise<FolderDiffResult> {
  // Find all BPMN files using Node.js fs
  const bpmnFiles = await findBpmnFilesInDirectoryNode(dirPath, options?.recursive !== false);

  const files: FolderDiffResult['files'] = [];
  let totalAdded = 0;
  let totalRemoved = 0;
  let totalModified = 0;
  let totalUnchanged = 0;

  // Process each file
  for (let i = 0; i < bpmnFiles.length; i++) {
    const file = bpmnFiles[i];
    options?.onProgress?.(i + 1, bpmnFiles.length, file.fileName);

    try {
      // Read file content directly from absolute path (Node.js)
      const content = await readFile(file.absolutePath, 'utf-8');

      // Parse BPMN
      const parseResult = await parseBpmnFileContent(content, file.fileName);

      // Calculate diff (same function as in app)
      const diffResult = await calculateDiffForLocalFile(
        file.fileName,
        content,
        parseResult.meta
      );

      if (diffResult) {
        const summary = {
          added: diffResult.added.length,
          removed: diffResult.removed.length,
          modified: diffResult.modified.length,
          unchanged: diffResult.unchanged.length,
        };

        const hasChanges = summary.added > 0 || summary.removed > 0 || summary.modified > 0;

        totalAdded += summary.added;
        totalRemoved += summary.removed;
        totalModified += summary.modified;
        totalUnchanged += summary.unchanged;

        files.push({
          fileName: file.fileName,
          filePath: file.filePath,
          content,
          parseResult,
          diffResult,
          hasChanges,
          summary,
          fileHandle: file.handle as any, // Store file handle
        });
      } else {
        // Error calculating diff
        files.push({
          fileName: file.fileName,
          filePath: file.filePath,
          content,
          parseResult,
          diffResult: null,
          hasChanges: false,
          summary: { added: 0, removed: 0, modified: 0, unchanged: 0 },
          error: 'Failed to calculate diff',
          fileHandle: file.handle as any,
        });
      }
    } catch (error) {
      console.error(`[analyzeFolderDiffNode] Error processing ${file.fileName}:`, error);
      files.push({
        fileName: file.fileName,
        filePath: file.filePath,
        content: '',
        parseResult: {} as any,
        diffResult: null,
        hasChanges: false,
        summary: { added: 0, removed: 0, modified: 0, unchanged: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    files,
    totalFiles: bpmnFiles.length,
    totalChanges: {
      added: totalAdded,
      removed: totalRemoved,
      modified: totalModified,
      unchanged: totalUnchanged,
    },
  };
}

describe('Local Folder Diff Analysis', () => {
  const testDirPath = '/Users/magnusolovson/Documents/Projects/mortgage-template-main/modules/mortgage-se';

  beforeAll(async () => {
    // Verify that the test directory exists
    try {
      const stats = await stat(testDirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path ${testDirPath} is not a directory`);
      }
    } catch (error) {
      throw new Error(`Test directory ${testDirPath} does not exist or is not accessible: ${error}`);
    }
  });

  it('should find all BPMN files recursively in the directory', async () => {
    const files = await findBpmnFilesInDirectoryNode(testDirPath, true);

    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.fileName.endsWith('.bpmn'))).toBe(true);

    console.log(`\nFound ${files.length} BPMN files:`);
    files.forEach(f => {
      console.log(`  - ${f.fileName} (${f.filePath})`);
    });
  });

  it('should analyze folder diff and calculate changes', async () => {
    const progressUpdates: Array<{ current: number; total: number; fileName: string }> = [];

    const result = await analyzeFolderDiffNode(testDirPath, {
      recursive: true,
      onProgress: (current, total, fileName) => {
        progressUpdates.push({ current, total, fileName });
        console.log(`Progress: ${current}/${total} - ${fileName}`);
      },
    });

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.files.length).toBe(result.totalFiles);
    expect(progressUpdates.length).toBe(result.totalFiles);

    // Log summary
    console.log(`\n=== Diff Analysis Summary ===`);
    console.log(`Total files: ${result.totalFiles}`);
    console.log(`Total changes:`);
    console.log(`  - Added: ${result.totalChanges.added}`);
    console.log(`  - Removed: ${result.totalChanges.removed}`);
    console.log(`  - Modified: ${result.totalChanges.modified}`);
    console.log(`  - Unchanged: ${result.totalChanges.unchanged}`);

    // Log files with changes
    const filesWithChanges = result.files.filter(f => f.hasChanges);
    console.log(`\nFiles with changes: ${filesWithChanges.length}`);
    filesWithChanges.forEach(file => {
      console.log(`\n  ${file.fileName}:`);
      console.log(`    - Added: ${file.summary.added}`);
      console.log(`    - Removed: ${file.summary.removed}`);
      console.log(`    - Modified: ${file.summary.modified}`);
      console.log(`    - Unchanged: ${file.summary.unchanged}`);

      if (file.diffResult) {
        // Log some example changes
        if (file.diffResult.added.length > 0) {
          console.log(`    Added nodes (first 3):`);
          file.diffResult.added.slice(0, 3).forEach(node => {
            console.log(`      - ${node.nodeName} (${node.nodeType})`);
          });
        }
        if (file.diffResult.modified.length > 0) {
          console.log(`    Modified nodes (first 3):`);
          file.diffResult.modified.slice(0, 3).forEach(({ node, changes }) => {
            console.log(`      - ${node.nodeName} (${node.nodeType})`);
            Object.entries(changes).slice(0, 2).forEach(([field, { old: oldValue, new: newValue }]) => {
              console.log(`        ${field}: ${oldValue} → ${newValue}`);
            });
          });
        }
      }
    });

    // Log files without changes
    const filesWithoutChanges = result.files.filter(f => !f.hasChanges);
    if (filesWithoutChanges.length > 0) {
      console.log(`\nFiles without changes: ${filesWithoutChanges.length}`);
      filesWithoutChanges.slice(0, 5).forEach(file => {
        console.log(`  - ${file.fileName}`);
      });
      if (filesWithoutChanges.length > 5) {
        console.log(`  ... and ${filesWithoutChanges.length - 5} more`);
      }
    }

    // Verify that we got results
    expect(result.files.length).toBeGreaterThan(0);
  }, 60000); // 60 second timeout for processing many files

  it('should use the same calculateDiffForLocalFile function as the app', async () => {
    // Find one file to test
    const files = await findBpmnFilesInDirectoryNode(testDirPath, true);
    expect(files.length).toBeGreaterThan(0);

    const testFile = files[0];
    const content = await readFile(testFile.absolutePath, 'utf-8');

    // Parse BPMN
    const parseResult = await parseBpmnFileContent(content, testFile.fileName);

    // Calculate diff using the same function as the app
    const diffResult = await calculateDiffForLocalFile(
      testFile.fileName,
      content,
      parseResult.meta
    );

    // Verify result
    expect(diffResult).toBeDefined();
    expect(diffResult).toHaveProperty('added');
    expect(diffResult).toHaveProperty('removed');
    expect(diffResult).toHaveProperty('modified');
    expect(diffResult).toHaveProperty('unchanged');

    console.log(`\nDiff result for ${testFile.fileName}:`);
    console.log(`  - Added: ${diffResult.added.length}`);
    console.log(`  - Removed: ${diffResult.removed.length}`);
    console.log(`  - Modified: ${diffResult.modified.length}`);
    console.log(`  - Unchanged: ${diffResult.unchanged.length}`);
  });
});

