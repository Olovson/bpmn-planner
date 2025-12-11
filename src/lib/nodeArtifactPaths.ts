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

export const getFeatureGoalDocFileKey = (
  bpmnFile: string,
  elementId: string,
  templateVersion?: 'v1' | 'v2',
) => {
  const baseName = getBaseName(bpmnFile);
  const sanitizedId = sanitizeElementId(elementId);
  const versionSuffix = templateVersion ? `-${templateVersion}` : '';
  
  // Undvik upprepning: om elementId redan ingår i baseName (särskilt i slutet), använd bara baseName
  // T.ex. "mortgage-se-mortgage-commitment" + "mortgage-commitment" → "mortgage-se-mortgage-commitment"
  // T.ex. "mortgage-se-application" + "application" → "mortgage-se-application"
  const normalizedBaseName = baseName.toLowerCase();
  const normalizedElementId = sanitizedId.toLowerCase();
  
  // Kolla om elementId matchar slutet av baseName (med eller utan prefix)
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
