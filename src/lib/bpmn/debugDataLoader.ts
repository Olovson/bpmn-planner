import { supabase } from '@/integrations/supabase/client';
import { parseBpmnFile, type BpmnParseResult } from '@/lib/bpmnParser';
import type { BpmnMap } from './bpmnMapLoader';
import { loadBpmnMap as parseBpmnMap } from './bpmnMapLoader';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite/ts-node hanterar JSON-import enligt bundler-konfigurationen.
import rawBpmnMap from '../../../bpmn-map.json';

export async function loadAllBpmnParseResults(): Promise<
  Map<string, BpmnParseResult>
> {
  const results = new Map<string, BpmnParseResult>();

  const { data, error } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const fileName = row.file_name as string;
    // I klientmiljö kommer /bpmn/ att servas från public/.
    const parsed = await parseBpmnFile(`/bpmn/${fileName}`);
    results.set(fileName, parsed);
  }

  return results;
}

export async function loadBpmnMap(): Promise<BpmnMap | undefined> {
  try {
    return parseBpmnMap(rawBpmnMap);
  } catch {
    return undefined;
  }
}

