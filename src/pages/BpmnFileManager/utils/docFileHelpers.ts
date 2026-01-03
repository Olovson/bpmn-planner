/**
 * Helper functions for extracting BPMN file information from document file names
 * and managing version hashes for documents
 */

import { getCurrentVersionHash } from '@/lib/bpmnVersioning';

/**
 * Extracts BPMN file name from a document file name
 * 
 * Handles different document types:
 * - Node docs: nodes/{bpmnFile}/{elementId}.html
 * - Feature goals: feature-goals/{...}.html (hierarchical or non-hierarchical)
 * - Combined file docs: {bpmnFile}.html
 * 
 * @param docFileName - The document file name (e.g., "feature-goals/mortgage-se-application.html")
 * @param filesIncluded - Optional list of BPMN files to match against
 * @returns The BPMN file name or null if not found
 */
export function extractBpmnFileFromDocFileName(
  docFileName: string,
  filesIncluded?: string[]
): string | null {
  // For node docs: nodes/{bpmnFile}/{elementId}.html
  const nodeMatch = docFileName.match(/^nodes\/([^\/]+)\/[^\/]+\.html$/);
  if (nodeMatch) {
    const baseName = nodeMatch[1];
    // If it doesn't have .bpmn, add it
    const bpmnFile = baseName.includes('.bpmn') ? baseName : `${baseName}.bpmn`;
    // Verify it's in filesIncluded if available
    if (filesIncluded && !filesIncluded.includes(bpmnFile)) {
      // Try without .bpmn extension
      if (filesIncluded.includes(baseName)) {
        return baseName;
      }
    }
    return bpmnFile;
  }
  
  // For feature goals: feature-goals/{...}.html
  // Feature goals can be:
  // 1. Hierarchical naming (parent-elementId) for callActivities: "mortgage-se-application-internal-data-gathering"
  // 2. Non-hierarchical naming for Process Feature Goals: "mortgage-se-internal-data-gathering"
  // VIKTIGT: För hierarchical naming måste vi hitta subprocess-filen, inte parent-filen
  // eftersom filen sparas under subprocess-filens version hash
  if (docFileName.startsWith('feature-goals/')) {
    const featureGoalName = docFileName.replace('feature-goals/', '').replace('.html', '');
    
    // FIRST: Check if featureGoalName matches a file directly (non-hierarchical Process Feature Goal)
    // For Process Feature Goals, the featureGoalName IS the baseName of the file
    if (filesIncluded && filesIncluded.length > 0) {
      const directMatch = filesIncluded.find(f => {
        const baseName = f.replace('.bpmn', '');
        return baseName === featureGoalName;
      });
      
      if (directMatch) {
        return directMatch;
      }
    }
    
    // Continue with hierarchical matching for callActivities
    if (filesIncluded && filesIncluded.length > 0) {
      // For hierarchical naming (parent-elementId), try to extract elementId
      // Pattern: "mortgage-se-application-internal-data-gathering" eller "test-{timestamp}-test-parent-call-activity-test-call-activity"
      // We want to find the subprocess file that matches the elementId part
      // VIKTIGT: Prioritera subprocess-filen (som slutar med elementId) över parent-filen
      
      // Special handling for test files with timestamps: extract timestamp prefix
      const testTimestampMatch = featureGoalName.match(/^(test-\d+-\d+-)/);
      if (testTimestampMatch) {
        const timestampPrefix = testTimestampMatch[1];
        // For test files, try to find subprocess file with same timestamp prefix
        // Pattern: "test-{timestamp}-{parent}-{elementId}" -> "test-{timestamp}-{subprocess}"
        const partsAfterTimestamp = featureGoalName.substring(timestampPrefix.length).split('-');
        
        // VIKTIGT: För hierarchical naming, elementId är vanligtvis de sista delarna
        // T.ex. "test-xxx-mortgage-se-application-internal-data-gathering" -> elementId = "internal-data-gathering"
        // Subprocess-filen är "test-xxx-mortgage-se-internal-data-gathering.bpmn"
        
        // Try to extract elementId from hierarchical name
        // Pattern: "mortgage-se-application-internal-data-gathering" -> elementId = "internal-data-gathering"
        // We need to find where "mortgage-se-application" ends and elementId begins
        const mortgageSeIndex = partsAfterTimestamp.indexOf('mortgage');
        if (mortgageSeIndex >= 0 && partsAfterTimestamp[mortgageSeIndex + 1] === 'se') {
          // Found "mortgage-se", now find where parent file name ends
          // Parent is typically "mortgage-se-{name}" (e.g., "mortgage-se-application")
          // ElementId starts after parent (e.g., "internal-data-gathering")
          const parentEndIndex = mortgageSeIndex + 3; // After "mortgage-se-{name}"
          if (parentEndIndex < partsAfterTimestamp.length) {
            const elementId = partsAfterTimestamp.slice(parentEndIndex).join('-');
            
            // Now try to find subprocess file that ends with this elementId
            for (const includedFile of filesIncluded) {
              const baseName = includedFile.replace('.bpmn', '');
              // Check if file starts with same timestamp prefix and ends with elementId
              if (baseName.startsWith(timestampPrefix)) {
                const baseNameWithoutPrefix = baseName.substring(timestampPrefix.length);
                // Check if baseName ends with elementId (subprocess file)
                // T.ex. "mortgage-se-internal-data-gathering" ends with "internal-data-gathering"
                if (baseNameWithoutPrefix.endsWith(`-${elementId}`) || 
                    baseNameWithoutPrefix === elementId ||
                    baseNameWithoutPrefix.endsWith(`mortgage-se-${elementId}`) ||
                    baseNameWithoutPrefix === `mortgage-se-${elementId}`) {
                  return includedFile;
                }
              }
            }
          }
        }
        
        // Fallback: try to find subprocess file using last 2-3 parts as elementId
        const possibleElementIds = [
          partsAfterTimestamp.slice(-3).join('-'), // Last 3 parts (e.g., "internal-data-gathering")
          partsAfterTimestamp.slice(-2).join('-'), // Last 2 parts (e.g., "data-gathering")
        ];
        
        for (const includedFile of filesIncluded) {
          const baseName = includedFile.replace('.bpmn', '');
          // Check if file starts with same timestamp prefix
          if (baseName.startsWith(timestampPrefix)) {
            const baseNameWithoutPrefix = baseName.substring(timestampPrefix.length);
            // Check if file ends with elementId (subprocess file)
            for (const elementId of possibleElementIds) {
              if (elementId && (
                baseNameWithoutPrefix.endsWith(`-${elementId}`) || 
                baseNameWithoutPrefix === elementId ||
                baseNameWithoutPrefix.endsWith(`mortgage-se-${elementId}`) ||
                baseNameWithoutPrefix === `mortgage-se-${elementId}`
              )) {
                return includedFile;
              }
            }
          }
        }
      }
      
      // Special handling for test files: if featureGoalName contains "parent", look for files with "subprocess"
      if (featureGoalName.includes('parent') && !featureGoalName.includes('subprocess')) {
        for (const includedFile of filesIncluded) {
          const baseName = includedFile.replace('.bpmn', '');
          // For test files, if parent file is in the name, look for corresponding subprocess file
          if (baseName.includes('subprocess') && !baseName.includes('parent')) {
            // Extract timestamp prefix if present (e.g., "test-{timestamp}-")
            const parentMatch = featureGoalName.match(/^(test-\d+-\d+-)/);
            if (parentMatch) {
              const timestampPrefix = parentMatch[1];
              // Check if subprocess file has the same timestamp prefix
              if (baseName.startsWith(timestampPrefix)) {
                return includedFile;
              }
            } else if (baseName.includes('subprocess') && baseName.includes('call-activity')) {
              // Fallback: if both have "call-activity" but one has "subprocess", use that
              return includedFile;
            }
          }
        }
      }
      
      const parts = featureGoalName.split('-');
      if (parts.length > 3) {
        // Likely hierarchical: try to match last 2-3 parts as elementId
        // E.g., "internal-data-gathering" -> "mortgage-se-internal-data-gathering.bpmn"
        const possibleElementId = parts.slice(-3).join('-'); // Last 3 parts (e.g., "internal-data-gathering")
        const possibleElementId2 = parts.slice(-2).join('-'); // Last 2 parts (e.g., "data-gathering")
        
        // PRIORITERA: Först sök efter filer som slutar med elementId (subprocess-filer)
        // Detta är viktigt för att undvika att matcha parent-filen
        const subprocessMatches: string[] = [];
        for (const includedFile of filesIncluded) {
          const baseName = includedFile.replace('.bpmn', '');
          // Check if baseName ends with the elementId (subprocess-fil)
          // T.ex. "mortgage-se-internal-data-gathering" ends with "internal-data-gathering"
          if (baseName.endsWith(`-${possibleElementId}`) || 
              baseName.endsWith(`-${possibleElementId2}`) ||
              baseName === `mortgage-se-${possibleElementId}` ||
              baseName === `mortgage-se-${possibleElementId2}`) {
            subprocessMatches.push(includedFile);
          }
        }
        
        // Om vi hittade subprocess-filer, returnera den första (bör bara finnas en)
        if (subprocessMatches.length > 0) {
          return subprocessMatches[0];
        }
        
        // VIKTIGT: För test-filer med hierarchical naming, kan vi behöva matcha mot filer
        // som innehåller elementId men inte nödvändigtvis slutar med det
        // T.ex. "test-xxx-mortgage-se-application-internal-data-gathering" -> "test-xxx-mortgage-se-internal-data-gathering.bpmn"
        for (const includedFile of filesIncluded) {
          const baseName = includedFile.replace('.bpmn', '');
          // Check if baseName contains elementId and is likely a subprocess file
          // (not the parent file, which would be shorter)
          if ((baseName.includes(`-${possibleElementId}`) || baseName.includes(`-${possibleElementId2}`)) &&
              !baseName.includes('application') && // Exclude parent file
              baseName.length > parts.slice(0, 3).join('-').length) { // Subprocess files are usually longer
            return includedFile;
          }
        }
      }
    }
    
    // FALLBACK for Process Feature Goals (non-hierarchical): 
    // If filesIncluded is empty or doesn't contain the file, construct the filename
    // For Process Feature Goals, featureGoalName IS the baseName of the file
    const constructedFileName = `${featureGoalName}.bpmn`;
    return constructedFileName;
  }
  
  // For combined file docs: {bpmnFile}.html (both root and subprocess files)
  // Pattern: "mortgage-se-application.bpmn.html" -> "mortgage-se-application.bpmn"
  if (docFileName.endsWith('.html') && !docFileName.includes('/')) {
    // Remove .html extension and check if it ends with .bpmn
    const withoutHtml = docFileName.replace('.html', '');
    if (withoutHtml.endsWith('.bpmn')) {
      return withoutHtml;
    }
    // If not .bpmn, assume it's a base name and add .bpmn
    return `${withoutHtml}.bpmn`;
  }
  
  return null;
}

/**
 * Gets version hash for a document's BPMN file
 * 
 * Tries multiple strategies:
 * 1. Use getVersionHashForFile (respects user's version selection)
 * 2. Use getCurrentVersionHash directly (bypasses version selection)
 * 3. Use root file's hash as fallback for subprocess files
 * 
 * @param bpmnFileName - The BPMN file name
 * @param rootFileName - The root file name (for fallback)
 * @param getVersionHashForFile - Function to get version hash (respects user selection)
 * @param versionHashCache - Cache to avoid duplicate lookups
 * @returns The version hash or null if not found
 */
export async function getVersionHashForDoc(
  bpmnFileName: string | null,
  rootFileName: string,
  getVersionHashForFile: (fileName: string) => Promise<string | null>,
  versionHashCache: Map<string, string | null>
): Promise<string | null> {
  const targetFile = bpmnFileName || rootFileName;
  if (versionHashCache.has(targetFile)) {
    return versionHashCache.get(targetFile) || null;
  }
  
  // Try 1: Use getVersionHashForFile (respects user's version selection)
  let hash = await getVersionHashForFile(targetFile);
  
  // Try 2: If null, try getCurrentVersionHash directly (bypasses version selection)
  if (!hash) {
    try {
      hash = await getCurrentVersionHash(targetFile);
      // Note: hash may be null if file doesn't exist
    } catch (error) {
      // Failed to get version hash - will try fallback
    }
  }
  
  // Try 3: If still null and it's a subprocess, try root file's hash as last resort
  if (!hash && targetFile !== rootFileName) {
    try {
      const rootHash = await getVersionHashForFile(rootFileName);
      if (rootHash) {
        hash = rootHash;
      }
    } catch (error) {
      // Failed to get root file's version hash - will use null
    }
  }
  
  versionHashCache.set(targetFile, hash);
  return hash;
}

