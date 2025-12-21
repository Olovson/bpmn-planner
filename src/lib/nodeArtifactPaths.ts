export const sanitizeElementId = (elementId: string) =>
  elementId.replace(/[^a-zA-Z0-9_-]/g, '-');

const getBaseName = (bpmnFile: string) => bpmnFile.replace('.bpmn', '');

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
 * When parentBpmnFile is provided, generates hierarchical filenames that match Jira naming:
 * - Example: parent="mortgage-se-application.bpmn", elementId="internal-data-gathering"
 *   → "feature-goals/mortgage-se-application-internal-data-gathering.html"
 *   (matches Jira name: "Application - Internal data gathering")
 * 
 * When parentBpmnFile is not provided, falls back to legacy naming based on subprocess BPMN file.
 * 
 * @param bpmnFile - The subprocess BPMN file (e.g., "mortgage-se-internal-data-gathering.bpmn")
 * @param elementId - The call activity element ID (e.g., "internal-data-gathering")
 * @param templateVersion - Optional template version for backward compatibility with old files ('v1' or 'v2')
 * @param parentBpmnFile - Optional parent BPMN file for hierarchical naming (e.g., "mortgage-se-application.bpmn")
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
  
  // Fallback to legacy naming (based on subprocess BPMN file only)
  const baseName = getBaseName(bpmnFile);
  const normalizedBaseName = baseName.toLowerCase();
  const normalizedElementId = sanitizedId.toLowerCase();
  
  // Undvik upprepning: om elementId redan ingår i baseName (särskilt i slutet), använd bara baseName
  // T.ex. "mortgage-se-mortgage-commitment" + "mortgage-commitment" → "mortgage-se-mortgage-commitment"
  // T.ex. "mortgage-se-application" + "application" → "mortgage-se-application"
  const baseNameEndsWithElementId = normalizedBaseName.endsWith(`-${normalizedElementId}`) || 
                                      normalizedBaseName.endsWith(normalizedElementId);
  
  // Kolla också om baseName innehåller elementId som en del (t.ex. "mortgage-se-application" innehåller "application")
  const baseNameContainsElementId = normalizedBaseName.includes(`-${normalizedElementId}-`) ||
                                    normalizedBaseName.includes(`-${normalizedElementId}`);
  
  if (baseNameEndsWithElementId || baseNameContainsElementId) {
    // ElementId ingår redan i baseName, använd bara baseName
    return `feature-goals/${baseName}${versionSuffix}.html`;
  }
  
  // ElementId ingår inte, använd baseName-elementId
  return `feature-goals/${baseName}-${sanitizedId}${versionSuffix}.html`;
};
