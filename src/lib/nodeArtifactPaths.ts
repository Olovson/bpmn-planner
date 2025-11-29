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
  return `feature-goals/${baseName}-${sanitizedId}${versionSuffix}.html`;
};
