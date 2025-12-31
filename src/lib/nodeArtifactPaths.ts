export const sanitizeElementId = (elementId: string) =>
  elementId.replace(/[^a-zA-Z0-9_-]/g, '-');

// VIKTIGT: Hantera både med och utan .bpmn extension
const getBaseName = (bpmnFile: string) => {
  // Remove .bpmn extension if present
  if (bpmnFile.endsWith('.bpmn')) {
    return bpmnFile.slice(0, -5); // Remove '.bpmn' (5 characters)
  }
  return bpmnFile;
};

export const getNodeDocFileKey = (bpmnFile: string, elementId: string) =>
  `nodes/${getBaseName(bpmnFile)}/${sanitizeElementId(elementId)}.html`;

export const getNodeTestFileKey = (bpmnFile: string, elementId: string) =>
  `nodes/${getBaseName(bpmnFile)}/${sanitizeElementId(elementId)}.spec.ts`;

export const getNodeDocViewerPath = (bpmnFile: string, elementId: string) =>
  `nodes/${getBaseName(bpmnFile)}/${sanitizeElementId(elementId)}`;

export const getFileDocViewerPath = (bpmnFile: string) =>
  getBaseName(bpmnFile);

/**
 * Generates a feature goal documentation file key.
 * 
 * Uses hierarchical naming that matches Jira naming:
 * - Example: parent="mortgage-se-application.bpmn", elementId="internal-data-gathering"
 *   → "feature-goals/mortgage-se-application-internal-data-gathering.html"
 *   (matches Jira name: "Application - Internal data gathering")
 * 
 * VIKTIGT: Process Feature Goals genereras INTE längre (ersatta av file-level documentation).
 * Denna funktion används bara för CallActivity Feature Goals (hierarchical naming med parent).
 * parentBpmnFile bör alltid finnas för call activities.
 * 
 * @param bpmnFile - The subprocess BPMN file (e.g., "mortgage-se-internal-data-gathering.bpmn")
 * @param elementId - The call activity element ID (e.g., "internal-data-gathering")
 * @param templateVersion - Optional template version for backward compatibility with old files ('v1' or 'v2')
 * @param parentBpmnFile - Parent BPMN file for hierarchical naming (e.g., "mortgage-se-application.bpmn")
 *   Required for call activities (Process Feature Goals genereras inte längre)
 * @returns The file key path (e.g., "feature-goals/mortgage-se-application-internal-data-gathering.html")
 */
export const getFeatureGoalDocFileKey = (
  bpmnFile: string,
  elementId: string,
  templateVersion?: 'v1' | 'v2',
  parentBpmnFile?: string,
  isRootProcess?: boolean, // Required for root process Feature Goals
) => {
  const sanitizedId = sanitizeElementId(elementId);
  const versionSuffix = templateVersion ? `-${templateVersion}` : '';
  
  // If parent process is provided, use hierarchical naming (matches Jira naming)
  if (parentBpmnFile) {
    const parentBaseName = getBaseName(parentBpmnFile);
    const normalizedParent = parentBaseName.toLowerCase();
    const normalizedElementId = sanitizedId.toLowerCase();
    
    // Avoid repetition: if elementId already included in parentBaseName, use just parentBaseName
    // E.g., "mortgage-se-application" + "application" → "mortgage-se-application"
    if (normalizedParent.endsWith(`-${normalizedElementId}`) || 
        normalizedParent.endsWith(normalizedElementId) ||
        normalizedParent.includes(`-${normalizedElementId}-`) ||
        normalizedParent.includes(`-${normalizedElementId}`)) {
      return `feature-goals/${parentBaseName}${versionSuffix}.html`;
    }
    
    // Use hierarchical format: parent-elementId
    return `feature-goals/${parentBaseName}-${sanitizedId}${versionSuffix}.html`;
  }
  
  // Process Feature Goals för subprocesser genereras nu igen (användaren ska se Feature Goal-struktur)
  // Root process Feature Goals genereras också (root process har ingen parent)
  // VIKTIGT: Om parentBpmnFile saknas, kan det vara:
  // 1. Root Process Feature Goal (isRootProcess = true)
  // 2. Process Feature Goal för subprocess-fil (isRootProcess = false eller undefined)
  // Båda använder non-hierarchical naming (ingen parent)
  
  if (!parentBpmnFile) {
    // Non-hierarchical naming: använd baseName (ingen parent)
    // Detta gäller både Root Process Feature Goals och Process Feature Goals för subprocess-filer
    const baseName = getBaseName(bpmnFile);
    return `feature-goals/${baseName}${versionSuffix}.html`;
  }
  
  // Om vi når hit, borde parentBpmnFile finnas (för call activities)
  // Men om det inte finns, är det ett fel
  throw new Error(
    `getFeatureGoalDocFileKey: Unexpected state - parentBpmnFile should be provided for call activities. ` +
    `bpmnFile: ${bpmnFile}, elementId: ${elementId}`
  );
};
