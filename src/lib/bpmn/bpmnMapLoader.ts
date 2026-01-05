export type BpmnMatchStatus = 'matched' | 'lowConfidence' | 'ambiguous' | 'unresolved';

export interface BpmnMapCallActivity {
  bpmn_id: string;
  name?: string;
  called_element?: string | null;
  subprocess_bpmn_file?: string;
  /**
   * JSON-fält: match_status: 'matched' | 'lowConfidence' | 'ambiguous' | 'unresolved'
   */
  match_status?: BpmnMatchStatus;
  needs_manual_review?: boolean;
  /**
   * JSON-fält: source: 'manual' | 'heuristic' | 'llm'
   */
  source?: 'manual' | 'heuristic' | 'llm';
}

export interface BpmnMapProcess {
  id: string;
  /**
   * JSON-fält: bpmn_file – kan innehålla path; vid jämförelser normaliseras till basename.
   */
  bpmn_file: string;
  /**
   * JSON-fält: process_id – kanoniskt ID för processen i mappen.
   * Internt kan detta mappas mot t.ex. internalId i ProcessDefinition.
   */
  process_id: string;
  call_activities: BpmnMapCallActivity[];
}

export interface BpmnMap {
  orchestration?: { root_process?: string | null };
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

export function resolveRootBpmnFileFromMap(bpmnMap: BpmnMap): string | null {
  const rootProcessId = bpmnMap.orchestration?.root_process?.trim();
  if (!rootProcessId) return null;

  const processMatch = bpmnMap.processes.find(
    (process) =>
      process.id === rootProcessId ||
      process.process_id === rootProcessId ||
      process.bpmn_file === rootProcessId ||
      process.bpmn_file === `${rootProcessId}.bpmn`,
  );

  if (processMatch?.bpmn_file) return processMatch.bpmn_file;
  if (rootProcessId.endsWith('.bpmn')) return rootProcessId;
  return `${rootProcessId}.bpmn`;
}

export function matchCallActivityUsingMap(
  callActivity: { id: string; name?: string; calledElement?: string },
  bpmnFile: string,
  bpmnMap: BpmnMap,
): { matchedFileName?: string; matchSource: 'bpmn-map' | 'none' } {
  // Hjälpfunktion för att extrahera bara filnamnet från en sökväg
  const getFileNameOnly = (pathOrName: string): string => {
    if (pathOrName.includes('/')) {
      return pathOrName.split('/').pop() || pathOrName;
    }
    return pathOrName;
  };

  // Försök först med exakt matchning
  let proc = bpmnMap.processes.find((p) => p.bpmn_file === bpmnFile);
  
  // Om ingen exakt match, försök med normaliserad matchning (bara filnamnet)
  if (!proc) {
    const bpmnFileNameOnly = getFileNameOnly(bpmnFile);
    proc = bpmnMap.processes.find((p) => {
      const mapFileNameOnly = getFileNameOnly(p.bpmn_file);
      return mapFileNameOnly === bpmnFileNameOnly;
    });
  }
  
  if (!proc) {
    // Inte logga här - detta är normalt när filer inte finns i map ännu.
    // Systemet faller tillbaka på automatisk matchning, vilket är korrekt beteende.
    return { matchSource: 'none' };
  }


  // Hjälpfunktion för att normalisera strängar för matchning (case-insensitive, trim)
  const normalizeForMatch = (str?: string | null): string => {
    return (str || '').toLowerCase().trim();
  };

  // Försök matcha call activity med flexibel matchning
  const entry = proc.call_activities.find((ca) => {
    // Exakt match på ID
    if (ca.bpmn_id === callActivity.id) return true;
    
    // Normaliserad match på ID (fallback)
    if (normalizeForMatch(ca.bpmn_id) === normalizeForMatch(callActivity.id)) return true;
    
    // Match på namn (normaliserat, case-insensitive)
    if (ca.name && callActivity.name) {
      if (normalizeForMatch(ca.name) === normalizeForMatch(callActivity.name)) return true;
    }
    
    // Match på calledElement (normaliserat, case-insensitive)
    if (ca.called_element && callActivity.calledElement) {
      if (normalizeForMatch(ca.called_element) === normalizeForMatch(callActivity.calledElement)) return true;
    }
    
    // Match på calledElement mot ID (om calledElement i map är tomt men callActivity har calledElement)
    if (!ca.called_element && callActivity.calledElement) {
      if (normalizeForMatch(ca.bpmn_id) === normalizeForMatch(callActivity.calledElement)) return true;
    }
    
    return false;
  });

  if (entry?.subprocess_bpmn_file) {
    // Normalisera filnamnet (extrahera bara filnamnet från mappsökvägar)
    // Detta säkerställer konsistens när filnamnet jämförs med kandidater
    const normalizedFileName = getFileNameOnly(entry.subprocess_bpmn_file);
    return { matchedFileName: normalizedFileName, matchSource: 'bpmn-map' };
  }

  // Inte logga här - detta är inte ett fel. Om call activity inte finns i map,
  // faller systemet tillbaka på automatisk matchning, vilket är korrekt beteende.
  // Loggning skulle bara skapa onödig loggbrus.
  return { matchSource: 'none' };
}

/**
 * Hitta parent BPMN-fil för en subprocess-fil och elementId från bpmn-map.
 * Används för att hitta parentBpmnFile när Feature Goals laddas.
 */
export function findParentBpmnFileForSubprocess(
  subprocessBpmnFile: string,
  elementId: string,
  bpmnMap: BpmnMap,
): string | null {
  const getFileNameOnly = (pathOrName: string): string => {
    if (pathOrName.includes('/')) {
      return pathOrName.split('/').pop() || pathOrName;
    }
    return pathOrName;
  };

  const normalizedSubprocessFile = getFileNameOnly(subprocessBpmnFile);

  for (const process of bpmnMap.processes) {
    for (const ca of process.call_activities || []) {
      const normalizedSubprocessInMap = ca.subprocess_bpmn_file
        ? getFileNameOnly(ca.subprocess_bpmn_file)
        : null;
      
      if (normalizedSubprocessInMap === normalizedSubprocessFile) {
        // Kolla om elementId matchar
        const normalizeForMatch = (str?: string | null): string => {
          return (str || '').toLowerCase().trim();
        };
        
        if (
          ca.bpmn_id === elementId ||
          normalizeForMatch(ca.bpmn_id) === normalizeForMatch(elementId) ||
          (ca.name && normalizeForMatch(ca.name) === normalizeForMatch(elementId))
        ) {
          return process.bpmn_file;
        }
      }
    }
  }

  return null;
}
