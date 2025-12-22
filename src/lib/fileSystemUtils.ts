/**
 * File System Utilities for Local Folder Analysis
 * 
 * Utilities for working with the File System Access API to analyze
 * local BPMN files without uploading them.
 */

/**
 * Find all BPMN files recursively in a directory
 * 
 * @param directoryHandle - FileSystemDirectoryHandle from showDirectoryPicker()
 * @param recursive - Whether to search recursively (default: true)
 * @returns Array of file handles with their paths
 */
export async function findBpmnFilesInDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  recursive: boolean = true
): Promise<Array<{ fileName: string; filePath: string; handle: FileSystemFileHandle }>> {
  const files: Array<{ fileName: string; filePath: string; handle: FileSystemFileHandle }> = [];

  async function* getFilesRecursively(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string = ''
  ): AsyncGenerator<{ fileName: string; filePath: string; handle: FileSystemFileHandle }> {
    for await (const entry of dirHandle.values()) {
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file' && entry.name.endsWith('.bpmn')) {
        yield {
          fileName: entry.name,
          filePath: entryPath,
          handle: entry as FileSystemFileHandle,
        };
      } else if (entry.kind === 'directory' && recursive) {
        yield* getFilesRecursively(
          entry as FileSystemDirectoryHandle,
          entryPath
        );
      }
    }
  }

  for await (const file of getFilesRecursively(directoryHandle)) {
    files.push(file);
  }

  return files;
}

/**
 * Read file content from a FileSystemFileHandle
 */
export async function readFileContent(
  fileHandle: FileSystemFileHandle
): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

/**
 * Check if File System Access API is supported
 * 
 * Note: Brave browser may have this API but it might be disabled by default
 * or require user interaction. We check for both the method and that it's callable.
 */
export function isFileSystemAccessSupported(): boolean {
  // Check if the API exists
  if (!('showDirectoryPicker' in window)) {
    return false;
  }
  
  // Additional check: verify it's actually a function
  try {
    const picker = (window as any).showDirectoryPicker;
    return typeof picker === 'function';
  } catch {
    return false;
  }
}
