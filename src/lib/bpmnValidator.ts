import { BpmnParseResult } from './bpmnParser';
import { supabase } from '@/integrations/supabase/client';
import { normalizeBpmnKey } from './utils';

export interface ValidationResult {
  newNodes: string[]; // Noder i BPMN som inte har DoR/DoD
  existingNodes: string[]; // Noder som har DoR/DoD och finns i BPMN
  orphanedCriteria: OrphanedCriterion[]; // DoR/DoD för noder som inte längre finns
}

export interface OrphanedCriterion {
  subprocess_name: string;
  count: number;
  criteria_keys: string[];
}

export async function validateBpmnWithDatabase(
  parseResults: BpmnParseResult[]
): Promise<ValidationResult> {
  // Get all normalized names from BPMN (all node types that can have DoR/DoD)
  const validNames = new Set<string>();
  const validFiles = new Set<string>();
  
  // Build union of all valid names and files across all parseResults
  for (const pr of parseResults) {
    validFiles.add(pr.fileName);

    // Subprocesses
    pr.subprocesses.forEach(subprocess => {
      if (subprocess.name) {
        validNames.add(normalizeBpmnKey(subprocess.name));
      }
    });

    // All other node types where we generate DoR/DoD
    const allDoRDoDNodes = [
      ...pr.serviceTasks,
      ...pr.userTasks,
      ...pr.businessRuleTasks,
      ...pr.callActivities,
    ];

    allDoRDoDNodes.forEach(el => {
      const rawName = el.name || el.id;
      validNames.add(normalizeBpmnKey(rawName));
    });
  }

  // Fetch all existing criteria from database
  const { data: existingCriteria, error } = await supabase
    .from('dor_dod_status')
    .select('subprocess_name, criterion_key, bpmn_file');

  if (error) {
    console.error('Error fetching criteria:', error);
    throw error;
  }

  // Filter criteria to only those belonging to project's BPMN files
  // (or where bpmn_file is null for legacy data)
  const filteredCriteria = (existingCriteria || []).filter(row =>
    !row.bpmn_file || validFiles.has(row.bpmn_file)
  );

  // Group criteria by subprocess
  const criteriaBySubprocess = new Map<string, string[]>();
  filteredCriteria.forEach(c => {
    if (!criteriaBySubprocess.has(c.subprocess_name)) {
      criteriaBySubprocess.set(c.subprocess_name, []);
    }
    criteriaBySubprocess.get(c.subprocess_name)!.push(c.criterion_key);
  });

  // Find new nodes (in BPMN but not in DB)
  const newNodes: string[] = [];
  validNames.forEach(name => {
    if (!criteriaBySubprocess.has(name)) {
      newNodes.push(name);
    }
  });

  // Find existing nodes (in both BPMN and DB)
  const existingNodes: string[] = [];
  validNames.forEach(name => {
    if (criteriaBySubprocess.has(name)) {
      existingNodes.push(name);
    }
  });

  // Find orphaned criteria (in DB but not in BPMN)
  // subprocessName is already normalized in the database
  const orphanedCriteria: OrphanedCriterion[] = [];
  criteriaBySubprocess.forEach((criteriaKeys, subprocessName) => {
    if (!validNames.has(subprocessName)) {
      orphanedCriteria.push({
        subprocess_name: subprocessName,
        count: criteriaKeys.length,
        criteria_keys: criteriaKeys,
      });
    }
  });

  return {
    newNodes,
    existingNodes,
    orphanedCriteria,
  };
}

export async function cleanupOrphanedCriteria(subprocessNames: string[]): Promise<number> {
  if (subprocessNames.length === 0) return 0;

  const { error, count } = await supabase
    .from('dor_dod_status')
    .delete()
    .in('subprocess_name', subprocessNames);

  if (error) {
    console.error('Error cleaning up criteria:', error);
    throw error;
  }

  return count || 0;
}
