/**
 * Topologically sort files based on their dependencies
 * Files that are dependencies of others come first
 */
export function topologicalSortFiles(
  files: string[],
  dependencies: Map<string, Set<string>>
): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const cycleFiles = new Set<string>();
  
  function visit(file: string, path: string[] = []): void {
    if (visiting.has(file)) {
      // Cycle detected - markera filer i cycle
      const cycleStart = path.indexOf(file);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart);
        cycle.push(file);
        cycle.forEach(f => cycleFiles.add(f));
      }
      return; // Don't add to sorted yet, will be handled separately
    }
    if (visited.has(file)) {
      return;
    }
    
    visiting.add(file);
    const deps = dependencies.get(file) || new Set();
    for (const dep of deps) {
      if (files.includes(dep)) {
        visit(dep, [...path, file]);
      }
    }
    visiting.delete(file);
    visited.add(file);
    sorted.push(file);
  }
  
  // Visit all files
  for (const file of files) {
    if (!visited.has(file)) {
      visit(file);
    }
  }
  
  // För filer i cycles, sortera alfabetiskt och lägg till sist
  // (de är beroende av varandra ändå, så ordningen spelar mindre roll)
  const nonCycleFiles = sorted.filter(f => !cycleFiles.has(f));
  const cycleFilesList = files.filter(f => cycleFiles.has(f)).sort((a, b) => a.localeCompare(b));
  
  if (cycleFiles.size > 0 && import.meta.env.DEV) {
    console.warn(
      `[bpmnGenerators] ⚠️ Cycles detected in file dependencies. ` +
      `Files in cycles will be sorted alphabetically: ${Array.from(cycleFiles).join(', ')}`
    );
  }
  
  return [...nonCycleFiles, ...cycleFilesList];
}

