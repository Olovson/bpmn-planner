export interface BpmnMapCallActivity {
  bpmn_id: string;
  name?: string;
  called_element?: string;
  subprocess_bpmn_file?: string;
}

export interface BpmnMapProcess {
  id: string;
  bpmn_file: string;
  process_id: string;
  call_activities: BpmnMapCallActivity[];
}

export interface BpmnMap {
  orchestration?: { root_process?: string };
  processes: BpmnMapProcess[];
}

export function loadBpmnMap(raw: unknown): BpmnMap {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid bpmn-map.json');
  }

  const map = raw as BpmnMap;
  if (!Array.isArray(map.processes)) {
    throw new Error('Invalid map: processes missing');
  }

  // Normalisera tomma call_activities-array för säkerhets skull
  map.processes = map.processes.map((p) => ({
    ...p,
    call_activities: Array.isArray(p.call_activities) ? p.call_activities : [],
  }));

  return map;
}

export function matchCallActivityUsingMap(
  callActivity: { id: string; name?: string; calledElement?: string },
  bpmnFile: string,
  bpmnMap: BpmnMap,
): { matchedFileName?: string; matchSource: 'bpmn-map' | 'none' } {
  const proc = bpmnMap.processes.find((p) => p.bpmn_file === bpmnFile);
  if (!proc) {
    if (import.meta.env.DEV) {
      console.warn(
        `[matchCallActivityUsingMap] No process found in map for file: ${bpmnFile}`,
        `Available files: ${bpmnMap.processes.map(p => p.bpmn_file).join(', ')}`
      );
    }
    return { matchSource: 'none' };
  }


  const entry = proc.call_activities.find(
    (ca) =>
      ca.bpmn_id === callActivity.id ||
      (ca.name && ca.name === callActivity.name) ||
      (ca.called_element && ca.called_element === callActivity.calledElement),
  );

  if (entry?.subprocess_bpmn_file) {
    return { matchedFileName: entry.subprocess_bpmn_file, matchSource: 'bpmn-map' };
  }

  if (import.meta.env.DEV) {
    console.warn(`[matchCallActivityUsingMap] ✗ No match found for:`, {
      callActivityId: callActivity.id,
      callActivityName: callActivity.name,
      callActivityCalledElement: callActivity.calledElement,
      inFile: bpmnFile,
      availableCallActivities: proc.call_activities.map(ca => ({
        bpmn_id: ca.bpmn_id,
        name: ca.name,
        called_element: ca.called_element,
      })),
    });
  }

  return { matchSource: 'none' };
}

