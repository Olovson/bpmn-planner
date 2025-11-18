import { SUBPROCESS_REGISTRY } from './subprocessRegistry';

// Mapping between BPMN elements and their related resources
// This is now automatically generated from the subprocess registry
export const elementResourceMapping: Record<string, {
  figmaUrl?: string;
  jiraUrl?: string;
  bpmnFile?: string; // Sub-process BPMN file name
}> = Object.fromEntries(
  SUBPROCESS_REGISTRY.map(sp => [
    sp.id,
    {
      figmaUrl: sp.figmaUrl,
      jiraUrl: sp.jiraUrl,
      bpmnFile: sp.bpmnFile
    }
  ])
);
