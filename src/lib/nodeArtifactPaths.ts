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
 * For call activities, parentBpmnFile should always be provided for hierarchical naming.
 * For process nodes (when subprocess file generates its own Feature Goal), parentBpmnFile is undefined.
 * 
 * @param bpmnFile - The subprocess BPMN file (e.g., "mortgage-se-internal-data-gathering.bpmn")
 * @param elementId - The call activity element ID (e.g., "internal-data-gathering")
 * @param templateVersion - Optional template version for backward compatibility with old files ('v1' or 'v2')
 * @param parentBpmnFile - Parent BPMN file for hierarchical naming (e.g., "mortgage-se-application.bpmn")
 *   Required for call activities, undefined for process nodes
 * @returns The file key path (e.g., "feature-goals/mortgage-se-application-internal-data-gathering.html")
 */
export const getFeatureGoalDocFileKey = (
  bpmnFile: string,
  elementId: string,
  templateVersion?: 'v1' | 'v2',
  parentBpmnFile?: string,
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
  
  // For process nodes (when subprocess file generates its own Feature Goal page)
  // Use subprocess BPMN file base name as the key
  const baseName = getBaseName(bpmnFile);
  const normalizedBaseName = baseName.toLowerCase();
  const normalizedElementId = sanitizedId.toLowerCase();
  
  // Avoid repetition: if elementId already included in baseName, use just baseName
  // E.g., "mortgage-se-mortgage-commitment" + "mortgage-commitment" → "mortgage-se-mortgage-commitment"
  // E.g., "mortgage-se-application" + "application" → "mortgage-se-application"
  const baseNameEndsWithElementId = normalizedBaseName.endsWith(`-${normalizedElementId}`) || 
                                      normalizedBaseName.endsWith(normalizedElementId);
  
  // Check if baseName contains elementId as a part
  const baseNameContainsElementId = normalizedBaseName.includes(`-${normalizedElementId}-`) ||
                                    normalizedBaseName.includes(`-${normalizedElementId}`);
  
  if (baseNameEndsWithElementId || baseNameContainsElementId) {
    // ElementId already included in baseName, use just baseName
    return `feature-goals/${baseName}${versionSuffix}.html`;
  }
  
  // ElementId not included, use baseName-elementId
  return `feature-goals/${baseName}-${sanitizedId}${versionSuffix}.html`;
};
